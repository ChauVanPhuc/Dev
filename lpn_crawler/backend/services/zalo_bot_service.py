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
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("zalo_bot_service")

# Đảm bảo import được Zalo từ thư mục Zalo ở PROJECT_ROOT hoặc package zlapi
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", ".."))
ZALO_DIR = os.path.join(PROJECT_ROOT, "Zalo")
if ZALO_DIR not in sys.path:
    sys.path.insert(0, ZALO_DIR)

try:
    from zlapi import ZaloAPI
    from zlapi.models import Message, ThreadType
    ZLAPI_AVAILABLE = True
except Exception as e:
    logger.warning(f"Chua the import zlapi: {e}")
    ZALO_AVAILABLE = False
    ZaloAPI = None
    Message = None
    ThreadType = None

from app.core.database import SessionLocal
from lpn_crawler.backend.models.models import (
    LpnContainer,
    LpnItem,
    LpnImage,
    LpnAiOcrResult,
    LpnZaloConfig,
    LpnZaloLog
)
from lpn_crawler.backend.config.settings import settings

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
            bot_name = getattr(info, "displayName", None) or getattr(info, "name", None) or cfg.bot_name
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
                "user_id": getattr(info, "userId", None) or getattr(info, "uid", None),
                "avatar": getattr(info, "avatar", None)
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
            res = client.send(msg, thread_id=user_id, thread_type=ThreadType.USER)
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

        # Map item_id -> ocr_result
        ocr_map = {r.item_id: r for r in ocr_results}

        for item in items:
            ocr = ocr_map.get(item.id)
            is_match = False
            if ocr and (ocr.is_lpn_match or ocr.status == "success"):
                is_match = True
            elif item.resolution_status == "resolved":
                is_match = True

            if is_match:
                matched_items += 1
            else:
                det_lpn = ocr.detected_lpn if ocr else item.lpn
                reason = "Không quét được mã LPN/Barcode"
                if det_lpn and item.lpn and det_lpn != item.lpn:
                    reason = f"Lệch LPN (Dự kiến: {item.lpn} | Quét: {det_lpn})"
                elif ocr and not ocr.is_sku_match and item.sku:
                    reason = f"Lệch SKU (Dự kiến: {item.sku} | Quét: {ocr.detected_sku or 'N/A'})"
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
            f"https://smartflowg7.cloud/admin/lpn-crawler?container={c_num.replace(' ', '')}",
            "━━━━━━━━━━━━━━━━━━━━",
            "Hệ thống Tự động SmartFlow ERP v3"
        ])

        return "\n".join(lines)

    @classmethod
    def send_container_report(
        cls,
        container_id: int,
        target_phone: Optional[str] = None,
        send_image: bool = True
    ) -> Dict[str, Any]:
        """
        Tổng hợp toàn bộ kết quả quét của 1 Container và tự động gửi tin nhắn Zalo
        tới số điện thoại yêu cầu. Nếu gặp sự cố, tự động chuyển tiếp tới số Quản lý dự phòng.
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

            client = cls.get_client(db)
            if not client:
                logger.warning("Zalo Client chua san sang (chua co Cookies/IMEI).")
                return {"success": False, "message": "Zalo Bot chưa được kết nối. Vui lòng cập nhật Cookies/IMEI."}

            items = db.query(LpnItem).filter(LpnItem.container_id == container_id).all()
            item_ids = [it.id for it in items]
            ocr_results = db.query(LpnAiOcrResult).filter(LpnAiOcrResult.item_id.in_(item_ids)).all() if item_ids else []

            # 1. Xác định số điện thoại nhận tin
            phone_to_use = target_phone or cont.operator_phone or cfg.default_recipient_phone
            clean_phone = normalize_vietnam_phone(phone_to_use)

            # 2. Biên tập nội dung tin nhắn
            report_msg = cls.build_report_message(cont, items, ocr_results)

            # 3. Tra cứu người nhận
            user_data = cls.lookup_user_by_phone(clean_phone, client) if clean_phone else None
            sent_success = False
            recipient_uid = None
            recipient_name = None
            error_reason = None

            if user_data:
                recipient_uid = user_data["userId"]
                recipient_name = user_data["displayName"]
                sent_success = cls.send_text_message(client, recipient_uid, report_msg)
                
                # Gửi kèm ảnh cont nếu có
                if sent_success and send_image and cont.container_image:
                    abs_cont_img = os.path.join(settings.PROJECT_ROOT, cont.container_image.lstrip("/\\"))
                    if os.path.exists(abs_cont_img):
                        cls.send_image_message(client, recipient_uid, abs_cont_img, caption=f"Ảnh Container {cont.container_number}")
            else:
                error_reason = f"Không tìm thấy tài khoản Zalo cho số điện thoại: {phone_to_use}"

            # 4. Ghi log lần gửi
            log_status = "SUCCESS" if sent_success else "FAILED"
            log_entry = LpnZaloLog(
                container_id=cont.id,
                container_number=cont.container_number,
                recipient_phone=clean_phone or "UNKNOWN",
                recipient_zalo_id=recipient_uid,
                recipient_name=recipient_name,
                message_content=report_msg,
                status=log_status,
                error_reason=error_reason,
                sent_at=datetime.utcnow()
            )
            db.add(log_entry)

            # 5. Nếu thất bại -> Chuyển tiếp (Fallback) tới các SĐT Quản lý dự phòng
            if not sent_success:
                fallback_phones = []
                try:
                    if cfg.fallback_manager_phones:
                        fallback_phones = json.loads(cfg.fallback_manager_phones)
                except Exception:
                    pass

                for fb_phone in fallback_phones:
                    fb_clean = normalize_vietnam_phone(fb_phone)
                    if fb_clean and fb_clean != clean_phone:
                        fb_user = cls.lookup_user_by_phone(fb_clean, client)
                        if fb_user:
                            fb_notice = f"⚠️ [CHUYỂN TIẾP DO KHÔNG GỬI ĐƯỢC CHO {clean_phone}]\n\n" + report_msg
                            if cls.send_text_message(client, fb_user["userId"], fb_notice):
                                db.add(LpnZaloLog(
                                    container_id=cont.id,
                                    container_number=cont.container_number,
                                    recipient_phone=fb_clean,
                                    recipient_zalo_id=fb_user["userId"],
                                    recipient_name=fb_user["displayName"],
                                    message_content=fb_notice,
                                    status="FALLBACK_SENT",
                                    error_reason=f"Chuyển tiếp do không gửi được cho {clean_phone}: {error_reason}",
                                    sent_at=datetime.utcnow()
                                ))

            # 6. Cập nhật trạng thái thông báo trên Container
            cont.zalo_notify_status = "SENT" if sent_success else "FAILED"
            cont.zalo_notified_at = datetime.utcnow()
            db.commit()

            return {
                "success": sent_success,
                "recipient_phone": clean_phone,
                "recipient_name": recipient_name,
                "error_reason": error_reason,
                "message": "Đã gửi thông báo Zalo thành công" if sent_success else f"Gửi tin thất bại: {error_reason}"
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
