# -*- coding: utf-8 -*-
"""
Zalo Bot Service cho SmartFlow ERP v3 - Phân hệ LPN Crawler
Tích hợp thư viện zlapi (từ thư mục Zalo/zlapi hoặc package zlapi)
Hỗ trợ:
- Quản lý cấu hình & Phiên kết nối Zalo (Session Cookies, IMEI)
- Tra cứu tài khoản theo Số điện thoại (fetchPhoneNumber)
- Tự động tổng hợp & gửi Báo cáo Kết quả Quét LPN Container
- Gửi ảnh Container / Tem nhãn lỗi đính kèm
- Cơ chế Fallback an toàn (chuyển tiếp tới SĐT Quản lý nếu người nhận chặn tin nhắn)
"""

import os
import sys
import re
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger("zalo_bot_service")

# Đảm bảo import được Zalo từ thư mục Zalo ở PROJECT_ROOT hoặc package zlapi
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", ".."))
ZALO_DIR = os.path.join(PROJECT_ROOT, "Zalo")
BACKEND_DIR = os.path.join(PROJECT_ROOT, "BackEnd")

for p in [ZALO_DIR, BACKEND_DIR, PROJECT_ROOT]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from zlapi import ZaloAPI
    from zlapi.models import Message, ThreadType
    ZLAPI_AVAILABLE = True
except Exception as e:
    logger.warning(f"Chua the import zlapi: {e}")
    ZLAPI_AVAILABLE = False

    class _ThreadTypeStub:
        USER = 0
        GROUP = 1

    ThreadType = _ThreadTypeStub  # type: ignore

    class _MessageStub:
        def __init__(self, text: Optional[str] = None, **kwargs):
            self.text = text

    Message = _MessageStub  # type: ignore
    ZaloAPI = object  # type: ignore

from app.core.database import SessionLocal  # noqa: E402
from lpn_crawler.backend.models.models import (  # noqa: E402
    LpnContainer,
    LpnItem,
    LpnAiOcrResult,
    LpnZaloConfig,
    LpnZaloLog
)
from lpn_crawler.backend.config.settings import settings  # noqa: E402

# Bộ nhớ tạm (In-Memory Cache) ánh xạ SĐT -> Zalo UID để tránh gọi API Zalo liên tục
_PHONE_UID_CACHE: Dict[str, Dict[str, Any]] = {}
_CLIENT_INSTANCE: Optional[Any] = None
_CLIENT_CONFIG_HASH: Optional[str] = None


def normalize_vietnam_phone(phone_str: Optional[str]) -> str:
    """Chuẩn hóa số điện thoại Việt Nam về định dạng 10 chữ số (bắt đầu bằng 0)"""
    if not phone_str:
        return ""
    clean = re.sub(r'[^0-9+]', '', str(phone_str).strip())
    if clean.startswith("+84"):
        clean = "0" + clean[3:]
    elif clean.startswith("84") and len(clean) >= 11:
        clean = "0" + clean[2:]
    return clean


class ZaloBotService:
    @staticmethod
    def get_or_create_config(db) -> LpnZaloConfig:
        """Lấy bản ghi cấu hình Zalo Bot từ CSDL (tự động tạo nếu chưa có)"""
        cfg = db.query(LpnZaloConfig).first()
        if not cfg:
            cfg = LpnZaloConfig(
                bot_phone="0888187044",
                bot_name="SmartFlow Zalo Bot",
                imei="",
                session_cookies="{}",
                default_recipient_phone="0981206221",
                fallback_manager_phones=json.dumps(["0981206221", "0888187044"]),
                is_auto_send_enabled=True,
                is_connected=False
            )
            db.add(cfg)
            db.commit()
            db.refresh(cfg)
        return cfg

    @classmethod
    def get_client(cls, db, force_reload: bool = False):
        """Khởi tạo và trả về client ZaloAPI dựa trên cấu hình trong CSDL"""
        global _CLIENT_INSTANCE, _CLIENT_CONFIG_HASH

        if not ZLAPI_AVAILABLE or ZaloAPI is None:
            logger.error("Thu vien zlapi khong kha dung tren he thong.")
            return None

        cfg = cls.get_or_create_config(db)
        raw_cookies = cfg.session_cookies or "{}"
        imei = (cfg.imei or "").strip()
        phone = (cfg.bot_phone or "").strip()

        # Parse session cookies
        cookies_dict = {}
        try:
            if isinstance(raw_cookies, str):
                if raw_cookies.strip().startswith("{"):
                    cookies_dict = json.loads(raw_cookies)
                else:
                    # Hỗ trợ dạng Header Cookie string "key1=val1; key2=val2"
                    for item in raw_cookies.split(";"):
                        if "=" in item:
                            k, v = item.split("=", 1)
                            cookies_dict[k.strip()] = v.strip()
            elif isinstance(raw_cookies, dict):
                cookies_dict = raw_cookies
        except Exception as parse_err:
            logger.warning(f"Loi parse cookies: {parse_err}")

        current_hash = f"{phone}_{imei}_{len(str(cookies_dict))}"
        if not force_reload and _CLIENT_INSTANCE is not None and _CLIENT_CONFIG_HASH == current_hash:
            return _CLIENT_INSTANCE

        if not cookies_dict and not (phone and imei):
            logger.warning("Zalo Bot chua duoc cau hinh Cookies hoac IMEI.")
            return None

        try:
            client = ZaloAPI(
                phone=phone or "0",
                password="",
                imei=imei,
                session_cookies=cookies_dict if cookies_dict else None,
                auto_login=True
            )
            _CLIENT_INSTANCE = client
            _CLIENT_CONFIG_HASH = current_hash
            logger.info("Khoi tao client ZaloAPI thanh cong.")
            return client
        except Exception as e:
            logger.error(f"Khong the khoi tao ZaloAPI client: {e}")
            return None

    @classmethod
    def check_connection(cls, db) -> Dict[str, Any]:
        """Kiểm tra tình trạng sống của phiên đăng nhập Zalo Bot"""
        cfg = cls.get_or_create_config(db)
        now = datetime.utcnow()

        client = cls.get_client(db, force_reload=True)
        if not client:
            cfg.is_connected = False
            cfg.last_checked_at = now
            db.commit()
            return {
                "success": False,
                "is_connected": False,
                "message": "Chưa thể khởi tạo kết nối Zalo. Vui lòng kiểm tra lại Cookies và IMEI.",
                "bot_name": cfg.bot_name,
                "bot_phone": cfg.bot_phone
            }

        try:
            info = client.fetchAccountInfo()
            profile = getattr(info, "profile", info)
            bot_name = getattr(profile, "displayName", None) or getattr(profile, "name", None) or cfg.bot_name
            cfg.is_connected = True
            cfg.last_connected_at = now
            cfg.last_checked_at = now
            if bot_name:
                cfg.bot_name = bot_name
            db.commit()
            return {
                "success": True,
                "is_connected": True,
                "message": f"Kết nối Zalo Bot thành công! Tài khoản: {bot_name}",
                "bot_name": bot_name,
                "bot_phone": cfg.bot_phone,
                "user_id": getattr(profile, "userId", None) or getattr(profile, "uid", None) or getattr(client, "uid", None),
                "avatar": getattr(profile, "avatar", None)
            }
        except Exception as e:
            err_msg = str(e)
            cfg.is_connected = False
            cfg.last_checked_at = now
            db.commit()
            logger.error(f"Kiem tra ket noi Zalo Bot that bai: {err_msg}")
            return {
                "success": False,
                "is_connected": False,
                "message": f"Phiên đăng nhập Zalo đã hết hạn hoặc không hợp lệ: {err_msg}",
                "bot_name": cfg.bot_name,
                "bot_phone": cfg.bot_phone
            }

    @classmethod
    def lookup_user_by_phone(cls, phone: str, client) -> Optional[Dict[str, Any]]:
        """Tra cứu userId Zalo theo số điện thoại (tận dụng cache in-memory)"""
        clean_phone = normalize_vietnam_phone(phone)
        if not clean_phone or len(clean_phone) < 9:
            return None

        # 1. Kiểm tra cache
        if clean_phone in _PHONE_UID_CACHE:
            return _PHONE_UID_CACHE[clean_phone]

        # 2. Gọi zlapi fetchPhoneNumber
        try:
            user_info = client.fetchPhoneNumber(clean_phone)
            if not user_info:
                return None

            uid = getattr(user_info, "userId", None) or getattr(user_info, "uid", None) or getattr(user_info, "id", None)
            if uid:
                d_name = getattr(user_info, "displayName", None) or getattr(user_info, "zaloName", None) or clean_phone
                data = {
                    "userId": str(uid),
                    "displayName": str(d_name),
                    "phone": clean_phone
                }
                _PHONE_UID_CACHE[clean_phone] = data
                return data
        except Exception as e:
            logger.warning(f"Loi tra cuu SĐT Zalo {clean_phone}: {e}")
        return None

    @classmethod
    def send_text_message(cls, client, user_id: str, text: str) -> bool:
        """Gửi tin nhắn văn bản tới một userId Zalo"""
        try:
            msg = Message(text=text)
            client.send(msg, thread_id=user_id, thread_type=ThreadType.USER)
            return True
        except Exception as e:
            logger.error(f"Loi khi gui tin nhan Zalo toi UID {user_id}: {e}")
            return False

    @classmethod
    def send_image_message(cls, client, user_id: str, image_abs_path: str, caption: str = "") -> bool:
        """Gửi ảnh đính kèm tới một userId Zalo"""
        if not os.path.exists(image_abs_path):
            return False
        try:
            msg = Message(text=caption) if caption else None
            client.sendLocalImage(
                imagePath=image_abs_path,
                thread_id=user_id,
                thread_type=ThreadType.USER,
                message=msg
            )
            return True
        except Exception as e:
            logger.error(f"Loi khi gui anh Zalo toi UID {user_id}: {e}")
            return False

    @classmethod
    def build_report_message(cls, cont: LpnContainer, items: List[LpnItem], ocr_results: List[LpnAiOcrResult]) -> str:
        """Định dạng bản tin báo cáo kết quả quét chuẩn đẹp với emoji và cấu trúc khoa học"""
        c_num = cont.container_number or "N/A"
        factory = cont.factory or "Chưa rõ"
        operator = cont.operator_name or "N/A"
        phone = cont.operator_phone or "N/A"
        date_str = cont.date_loading_raw or datetime.now().strftime("%d/%m/%Y")
        now_str = datetime.now().strftime("%H:%M:%S %d/%m/%Y")

        total_items = len(items)
        matched_items = 0
        unmatched_list = []

        # Gom nhóm kết quả OCR theo item_id
        ocr_by_item: Dict[int, List[LpnAiOcrResult]] = {}
        for r in ocr_results:
            ocr_by_item.setdefault(r.item_id, []).append(r)

        for item in items:
            item_ocrs = ocr_by_item.get(item.id, [])
            is_match = False

            # 1. Nếu kiện đã được người dùng xác nhận Đạt thủ công (resolved)
            if item.resolution_status == "resolved":
                is_match = True
            else:
                # 2. Tiêu chuẩn NGHIỆM THU: Khớp LPN và Khớp SKU (nếu có yêu cầu SKU)
                exp_sku = str(item.sku or "").strip()
                has_sku_req = exp_sku.lower() not in ["", "none", "0", "—", "null"]

                for ocr in item_ocrs:
                    if ocr.status == "success":
                        lpn_ok = bool(ocr.is_lpn_match)
                        sku_ok = bool(ocr.is_sku_match) if has_sku_req else True
                        if lpn_ok and sku_ok:
                            is_match = True
                            break

            if is_match:
                matched_items += 1
            else:
                latest_ocr = item_ocrs[-1] if item_ocrs else None
                det_lpn = latest_ocr.detected_lpn if latest_ocr else None
                det_sku = latest_ocr.detected_sku if latest_ocr else None
                exp_sku = str(item.sku or "").strip()
                has_sku_req = exp_sku.lower() not in ["", "none", "0", "—", "null"]

                if not latest_ocr:
                    reason = "Chưa có ảnh hoặc chưa quét AI OCR"
                elif latest_ocr.status != "success":
                    reason = f"Lỗi quét ảnh OCR ({latest_ocr.error_reason or 'Không đọc được'})"
                elif not latest_ocr.is_lpn_match:
                    if det_lpn and item.lpn and str(det_lpn).strip() != str(item.lpn).strip():
                        reason = f"Lệch LPN (Dự kiến: {item.lpn} | Quét: {det_lpn})"
                    else:
                        reason = f"Không đọc được mã LPN (Dự kiến: {item.lpn or '—'})"
                elif has_sku_req and not latest_ocr.is_sku_match:
                    if det_sku and item.sku and str(det_sku).strip() != str(item.sku).strip():
                        reason = f"Lệch SKU (Dự kiến: {item.sku} | Quét: {det_sku})"
                    else:
                        reason = f"Không đọc được mã SKU (Dự kiến: {item.sku or '—'})"
                else:
                    reason = "Không đạt tiêu chuẩn kiểm tra"

                unmatched_list.append(f"• {item.suffix_key}: {reason}")

        issue_count = total_items - matched_items

        lines = [
            "📦 BÁO CÁO KẾT QUẢ QUÉT LPN CONTAINER",
            "━━━━━━━━━━━━━━━━━━━━",
            f"🚚 Container: {c_num}",
            f"🏭 Nhà máy: {factory}",
            f"📅 Ngày đóng hàng: {date_str}",
            f"👤 Người phụ trách: {operator} ({phone})",
            f"⏰ Hoàn tất quét: {now_str}",
            "",
            "📊 THỐNG KÊ QUÉT:",
            f"• Tổng số kiện: {total_items} Kiện",
            f"• ✅ Số kiện ĐẠT (Khớp 100%): {matched_items}",
            f"• ⚠️ Số kiện CẦN XỬ LÝ: {issue_count}",
        ]

        if issue_count > 0:
            lines.append("")
            lines.append("🚨 DANH SÁCH KIỆN CẦN RÀ SOÁT:")
            for issue_line in unmatched_list[:8]:  # Giới hạn hiển thị 8 kiện lỗi để tránh quá dài
                lines.append(issue_line)
            if len(unmatched_list) > 8:
                lines.append(f"... và còn {len(unmatched_list) - 8} kiện khác cần kiểm tra.")

        lines.extend([
            "",
            "🔗 Xem chi tiết & Ảnh quét trên SmartFlow:",
            f"https://dashboard.smartflowg7.cloud/admin/lpn-crawler?container={c_num.replace(' ', '')}",
            "━━━━━━━━━━━━━━━━━━━━",
            "Hệ thống Tự động SmartFlow ERP v3"
        ])

        return "\n".join(lines)

    @classmethod
    def get_preview_recipients(cls, container_id: int) -> Dict[str, Any]:
        """Lấy danh sách người sẽ nhận tin nhắn báo cáo cho Container cụ thể"""
        db = SessionLocal()
        try:
            cont = db.query(LpnContainer).filter(LpnContainer.id == container_id).first()
            if not cont:
                return {"success": False, "message": "Container không tồn tại"}

            cfg = cls.get_or_create_config(db)
            recipients = []

            # 1. Người phụ trách cont (hoặc SĐT mặc định)
            primary_phone = normalize_vietnam_phone(cont.operator_phone or cfg.default_recipient_phone or "")
            if primary_phone:
                recipients.append({
                    "phone": primary_phone,
                    "name": cont.operator_name or ("Người phụ trách cont" if cont.operator_phone else "Số mặc định hệ thống"),
                    "role": "Người phụ trách cont" if cont.operator_phone else "SĐT nhận mặc định",
                    "is_primary": True,
                    "is_selected": True
                })

            # 2. Danh sách Quản lý / Người cùng nhận
            manager_list = []
            try:
                if cfg.fallback_manager_phones:
                    raw = json.loads(cfg.fallback_manager_phones)
                    if isinstance(raw, list):
                        manager_list = raw
            except Exception:
                pass

            for item in manager_list:
                p = item.get("phone") if isinstance(item, dict) else str(item)
                clean_p = normalize_vietnam_phone(p)
                if not clean_p or clean_p == primary_phone:
                    continue
                name = item.get("name") if isinstance(item, dict) else ""
                role = item.get("role") if isinstance(item, dict) else "Quản lý nhận đồng thời"
                mode = item.get("mode") if isinstance(item, dict) else "always"
                recipients.append({
                    "phone": clean_p,
                    "name": name or f"Quản lý ({clean_p})",
                    "role": role or "Quản lý nhận đồng thời",
                    "is_primary": False,
                    "is_selected": True if mode == "always" else False,
                    "mode": mode
                })

            return {
                "success": True,
                "container_id": cont.id,
                "container_number": cont.container_number,
                "operator_name": cont.operator_name,
                "recipients": recipients
            }
        finally:
            db.close()

    @classmethod
    def send_container_report(
        cls,
        container_id: int,
        target_phone: Optional[str] = None,
        target_phones: Optional[List[str]] = None,
        send_image: bool = True
    ) -> Dict[str, Any]:
        """
        Tổng hợp toàn bộ kết quả quét của 1 Container và tự động gửi tin nhắn Zalo
        tới danh sách người nhận (Người phụ trách + Danh sách Quản lý nhận đồng thời).
        """
        db = SessionLocal()
        try:
            cont = db.query(LpnContainer).filter(LpnContainer.id == container_id).first()
            if not cont:
                return {"success": False, "message": f"Không tìm thấy Container ID {container_id}"}

            cfg = cls.get_or_create_config(db)
            if not cfg.is_auto_send_enabled:
                logger.info(f"Tinh nang tu dong gui Zalo dang tat. Bo qua Container {cont.container_number}")
                return {"success": False, "message": "Tính năng tự động gửi Zalo đang tắt trong cấu hình"}

            items = db.query(LpnItem).filter(LpnItem.container_id == container_id).all()
            if not items:
                logger.info(f"[Zalo Bot] Container {cont.container_number} chua co kien hang nao (0 items). Bo qua gui Zalo.")
                return {"success": False, "message": f"Container {cont.container_number} chưa có kiện hàng nào, không gửi Zalo"}

            item_ids = [it.id for it in items]
            ocr_results = db.query(LpnAiOcrResult).filter(LpnAiOcrResult.item_id.in_(item_ids)).all() if item_ids else []

            report_msg = cls.build_report_message(cont, items, ocr_results)

            client = cls.get_client(db)
            if not client:
                err_reason = "Zalo Bot chưa được kết nối. Vui lòng cập nhật Cookies/IMEI trong cấu hình Zalo Bot."
                logger.warning(f"[Zalo Bot] {err_reason}")
                cont.zalo_notify_status = "FAILED"
                cont.zalo_notified_at = datetime.utcnow()
                db.commit()
                return {"success": False, "message": err_reason}

            # 1. Xác định danh sách số điện thoại cần gửi
            phones_to_send: List[str] = []
            if target_phones:
                for tp in target_phones:
                    c = normalize_vietnam_phone(tp)
                    if c and c not in phones_to_send:
                        phones_to_send.append(c)
            elif target_phone:
                c = normalize_vietnam_phone(target_phone)
                if c:
                    phones_to_send.append(c)
            else:
                # Mặc định: Người phụ trách / SĐT mặc định
                primary_phone = normalize_vietnam_phone(cont.operator_phone or cfg.default_recipient_phone or "")
                if primary_phone and primary_phone not in phones_to_send:
                    phones_to_send.append(primary_phone)

                # Và bổ sung danh sách Quản lý nhận đồng thời (Broadcast)
                try:
                    if cfg.fallback_manager_phones:
                        raw = json.loads(cfg.fallback_manager_phones)
                        if isinstance(raw, list):
                            for it in raw:
                                p = it.get("phone") if isinstance(it, dict) else str(it)
                                mode = it.get("mode", "always") if isinstance(it, dict) else "always"
                                if mode == "always":
                                    c_p = normalize_vietnam_phone(p)
                                    if c_p and c_p not in phones_to_send:
                                        phones_to_send.append(c_p)
                except Exception:
                    pass

            if not phones_to_send:
                return {"success": False, "message": "Không có số điện thoại nào được chỉ định để nhận tin."}

            results_summary = []
            overall_success = False

            abs_cont_img = None
            if send_image and cont.container_image:
                abs_cont_img = os.path.join(settings.PROJECT_ROOT, cont.container_image.lstrip("/\\"))
                if not os.path.exists(abs_cont_img):
                    abs_cont_img = None

            for phone in phones_to_send:
                user_data = cls.lookup_user_by_phone(phone, client)
                sent_ok = False
                u_id = None
                display_name = None
                err = None

                if user_data:
                    u_id = user_data["userId"]
                    display_name = user_data["displayName"]
                    sent_ok = cls.send_text_message(client, u_id, report_msg)
                    if sent_ok and abs_cont_img:
                        cls.send_image_message(client, u_id, abs_cont_img, caption=f"Ảnh Container {cont.container_number}")
                else:
                    err = f"Không tìm thấy tài khoản Zalo cho số điện thoại: {phone}"

                log_entry = LpnZaloLog(
                    container_id=cont.id,
                    container_number=cont.container_number,
                    recipient_phone=phone,
                    recipient_zalo_id=u_id,
                    recipient_name=display_name,
                    message_content=report_msg,
                    status="SUCCESS" if sent_ok else "FAILED",
                    error_reason=err if not sent_ok else None,
                    sent_at=datetime.utcnow()
                )
                db.add(log_entry)

                if sent_ok:
                    overall_success = True

                results_summary.append({
                    "phone": phone,
                    "name": display_name,
                    "status": "SUCCESS" if sent_ok else "FAILED",
                    "error": err
                })

            cont.zalo_notify_status = "SENT" if overall_success else "FAILED"
            cont.zalo_notified_at = datetime.utcnow()
            db.commit()

            success_count = sum(1 for r in results_summary if r["status"] == "SUCCESS")
            return {
                "success": overall_success,
                "total_sent": len(phones_to_send),
                "success_count": success_count,
                "results": results_summary,
                "message": f"Đã gửi báo cáo Zalo cho {success_count}/{len(phones_to_send)} người nhận."
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Loi xu ly gui bao cao Zalo cho Container {container_id}: {e}")
            return {"success": False, "message": f"Lỗi hệ thống khi gửi Zalo: {e}"}
        finally:
            db.close()

    @classmethod
    def send_test_message(cls, phone: str, custom_text: Optional[str] = None) -> Dict[str, Any]:
        """Gửi tin nhắn mẫu thử nghiệm tới một số điện thoại chỉ định"""
        clean_phone = normalize_vietnam_phone(phone)
        if not clean_phone or len(clean_phone) < 9:
            return {"success": False, "message": "Số điện thoại không hợp lệ"}

        db = SessionLocal()
        try:
            client = cls.get_client(db)
            if not client:
                return {"success": False, "message": "Zalo Bot chưa được kết nối. Vui lòng cập nhật Cookies/IMEI trước."}

            user_data = cls.lookup_user_by_phone(clean_phone, client)
            if not user_data:
                return {
                    "success": False,
                    "message": f"Không tìm thấy tài khoản Zalo gắn với số điện thoại {clean_phone}. Người dùng có thể chưa đăng ký hoặc đang bật chế độ chặn người lạ."
                }

            uid = user_data["userId"]
            d_name = user_data["displayName"]
            text = custom_text or (
                "🔔 THÔNG BÁO THỬ NGHIỆM TỪ SMARTFLOW ERP v3\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                f"Xin chào {d_name}!\n"
                "Đây là tin nhắn kiểm tra kết nối từ hệ thống SmartFlow Zalo Bot.\n"
                f"Thời gian: {datetime.now().strftime('%H:%M:%S %d/%m/%Y')}\n"
                "Tính năng gửi kết quả quét LPN Container đã sẵn sàng hoạt động!"
            )

            success = cls.send_text_message(client, uid, text)
            if success:
                db.add(LpnZaloLog(
                    recipient_phone=clean_phone,
                    recipient_zalo_id=uid,
                    recipient_name=d_name,
                    message_content=text,
                    status="SUCCESS",
                    sent_at=datetime.utcnow()
                ))
                db.commit()
                return {
                    "success": True,
                    "message": f"Đã gửi tin nhắn thử nghiệm thành công tới {d_name} ({clean_phone})!",
                    "displayName": d_name,
                    "userId": uid
                }
            else:
                return {
                    "success": False,
                    "message": f"Không thể gửi tin nhắn tới {d_name}. Có thể người dùng đang chặn tin nhắn từ người lạ."
                }
        finally:
            db.close()
