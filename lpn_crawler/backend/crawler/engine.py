# -*- coding: utf-8 -*-
import os
import time
import base64
import logging
import queue
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from playwright.sync_api import sync_playwright

from app.core.database import SessionLocal
from lpn_crawler.backend.config.settings import settings
from lpn_crawler.backend.models.models import (
    LpnCrawlJob, LpnContainer, LpnItem, check_item_missing_fields
)
from lpn_crawler.backend.worker.manager import crawl_job_manager
from lpn_crawler.backend.crawler.telemetry import CrawlerTelemetryMixin
from lpn_crawler.backend.crawler.browser_auth import CrawlerBrowserAuthMixin
from lpn_crawler.backend.crawler.api_crawler import CrawlerApiMixin
from lpn_crawler.backend.crawler.dom_crawler import CrawlerDomMixin

logger = logging.getLogger("lpn_crawler.engine")


class AppSheetCrawlerEngine(
    CrawlerTelemetryMixin,
    CrawlerBrowserAuthMixin,
    CrawlerApiMixin,
    CrawlerDomMixin
):
    """
    Engine điều phối chính quá trình Crawl dữ liệu AppSheet LPN.
    Thừa kế toàn bộ các Mixin chuyên biệt:
    - CrawlerTelemetryMixin: Quản lý telemetry, log DB/SSE, ETA và pause/resume.
    - CrawlerBrowserAuthMixin: Quản lý khởi động Playwright, Google Auth và điều hướng 'LPN NEW'.
    - CrawlerApiMixin: Xử lý Fast-Path trích xuất trực tiếp từ Template API / Network Hook.
    - CrawlerDomMixin: Xử lý Fallback quét DOM khi không có API payload.
    """

    def __init__(self, job_id: int, sse_callback: Optional[Callable[[Dict[str, Any]], None]] = None, mode: str = "full", auto_ocr: bool = False):
        self.job_id = job_id
        self.sse_callback = sse_callback
        self.mode = mode or "full"
        self.auto_ocr = auto_ocr
        self.active_crawl_mode = "Fast-Path API"
        self.db = SessionLocal()
        self.latest_screenshot = None
        self.current_container = ""
        self.current_processed = 0
        self.current_total = 0
        self.current_items = 0
        self.current_images = 0
        self.current_sku = 0
        self.job_start_time = time.time()
        self.recent_durations: List[float] = []
        self.captured_api_rows: List[Dict[str, Any]] = []
        self.captured_template_payload = None
        self.app_name = "600686db-6622-4b98-a276-02cdb3e0ab2b"
        self.table_name = "LPN NEW"

        if self.auto_ocr:
            self.ocr_queue = queue.Queue()
            self.ocr_stop_event = threading.Event()
            self.ocr_thread = None
            self.ocr_stats = {
                "total_scanned": 0,
                "matched_count": 0,
                "total_ms": 0.0,
                "avg_ms": 0.0
            }

    def _ocr_worker_loop(self):
        """Worker loop ngầm tiêu thụ ảnh từ ocr_queue, xử lý AI OCR và broadcast SSE."""
        import json
        from app.core.database import SessionLocal
        from lpn_crawler.backend.models.models import LpnAiOcrResult
        from lpn_crawler.ai_ocr_train.core.pipeline import get_default_pipeline
        from lpn_crawler.ai_ocr_train.core.parser import LabelDataParser
        from lpn_crawler.ai_ocr_train.api.router import save_to_pipeline_cache
        from lpn_crawler.backend.api.routes.images import resolve_image_file_path

        ocr_db = SessionLocal()
        pipeline = get_default_pipeline()
        best_model_id = pipeline.ocr_engine.get_best_model_id()
        active_model_meta = pipeline.ocr_engine.get_model_metadata(best_model_id)
        active_model_name = active_model_meta.get("model_name", "Dual-Engine: Epoch 19 - Acc 99.1%")
        active_model_id = active_model_meta.get("model_id", best_model_id)
        print(f"[Live OCR Engine] Khởi động với mô hình độ chính xác cao nhất: {active_model_name}")

        if self.sse_callback:
            try:
                self.sse_callback({
                    "type": "log",
                    "level": "INFO",
                    "message": f"[Live OCR Engine] Khởi động động cơ nhận diện: {active_model_name}",
                    "source": "ai_ocr",
                    "timestamp": datetime.now().strftime("%H:%M:%S")
                })
            except Exception:
                pass

        try:
            while not self.ocr_stop_event.is_set():
                try:
                    task = self.ocr_queue.get(timeout=1.0)
                except Exception:
                    continue

                if task is None:
                    self.ocr_queue.task_done()
                    break

                img_id = task.get("image_id")
                item_id = task.get("lpn_item_id")
                c_num = task.get("container_number", "")
                local_p = task.get("local_path")
                exp_lpn = task.get("expected_lpn")
                exp_sku = task.get("expected_sku")
                suffix_k = task.get("suffix_key")
                img_type = task.get("image_type", "Pallet")

                abs_p = resolve_image_file_path(local_p) if local_p else None
                if not abs_p or not os.path.isfile(abs_p):
                    self.ocr_queue.task_done()
                    continue

                t0 = time.time()
                try:
                    pipeline_res = pipeline.process(
                        image_input=abs_p,
                        model_id=active_model_id,
                        auto_crop=True,
                        auto_rotate=True,
                        apply_super_res=True,
                        return_images_base64=True,
                        expected_skus=[exp_sku] if exp_sku else None,
                        expected_lpn=exp_lpn
                    )
                    pipeline_total_ms = pipeline_res.get("time_metrics", {}).get("total_ms")
                    dur_ms = float(pipeline_total_ms) if pipeline_total_ms else round((time.time() - t0) * 1000, 1)

                    det_lpn = pipeline_res.get("lpn")
                    det_sku = pipeline_res.get("sku")
                    det_barcodes = pipeline_res.get("barcodes", [])
                    conf = pipeline_res.get("confidence", 0.0)
                    extracted_info = pipeline_res.get("extracted", {}) or {}
                    all_lpns = [str(l).strip() for l in (extracted_info.get("all_lpns") or []) if l is not None]
                    all_skus = [str(s).strip() for s in (extracted_info.get("all_skus") or []) if s is not None]
                    roi_details = pipeline_res.get("roi_details") or []

                    # LPN matching
                    exp_lpn_clean = str(exp_lpn).strip().upper() if exp_lpn else ""
                    is_lpn_match = bool(exp_lpn_clean and (
                        (det_lpn and str(det_lpn).strip().upper() == exp_lpn_clean) or
                        any((r.get("extracted_lpn") or "").strip().upper() == exp_lpn_clean for r in roi_details) or
                        any(l.upper() == exp_lpn_clean for l in all_lpns)
                    ))
                    if is_lpn_match and det_lpn != exp_lpn:
                        det_lpn = exp_lpn

                    # SKU matching & optical calibration
                    exp_sku_clean = str(exp_sku).strip().upper() if exp_sku else ""
                    if exp_sku_clean:
                        if det_sku:
                            det_sku = LabelDataParser.calibrate_sku_with_expected(det_sku, [exp_sku_clean])
                        all_skus = [LabelDataParser.calibrate_sku_with_expected(s, [exp_sku_clean]) for s in all_skus if s]

                    is_sku_match = bool(exp_sku_clean and (
                        (det_sku and str(det_sku).strip().upper() == exp_sku_clean) or
                        any((r.get("extracted_sku") or "").strip().upper() == exp_sku_clean for r in roi_details) or
                        any((s or "").strip().upper() == exp_sku_clean for s in all_skus)
                    ))
                    if is_sku_match and det_sku != exp_sku:
                        det_sku = exp_sku

                    is_success = bool(det_lpn or det_sku or det_barcodes)
                    status_val = "success" if is_success else "failed"

                    raw_ocr_str = json.dumps({
                        "all_lpns": all_lpns,
                        "all_skus": all_skus,
                        "roi_details_count": len(roi_details)
                    }, ensure_ascii=False)

                    # Save LpnAiOcrResult to DB
                    existing = None
                    if item_id:
                        q = ocr_db.query(LpnAiOcrResult).filter(LpnAiOcrResult.item_id == item_id)
                        if img_id:
                            q = q.filter(LpnAiOcrResult.image_id == img_id)
                        existing = q.first()

                    if not existing and item_id:
                        existing = LpnAiOcrResult(
                            item_id=item_id,
                            image_id=img_id,
                            container_number=c_num,
                            suffix_key=suffix_k,
                            model_id=active_model_id,
                            detected_lpn=det_lpn,
                            detected_sku=det_sku,
                            detected_barcodes=json.dumps(det_barcodes, ensure_ascii=False),
                            confidence=float(conf),
                            is_lpn_match=is_lpn_match,
                            is_sku_match=is_sku_match,
                            status=status_val,
                            raw_ocr_text=raw_ocr_str,
                            processing_time_ms=dur_ms,
                            scanned_at=datetime.utcnow()
                        )
                        ocr_db.add(existing)
                    elif existing:
                        existing.detected_lpn = det_lpn
                        existing.detected_sku = det_sku
                        existing.detected_barcodes = json.dumps(det_barcodes, ensure_ascii=False)
                        existing.confidence = float(conf)
                        existing.is_lpn_match = is_lpn_match
                        existing.is_sku_match = is_sku_match
                        existing.status = status_val
                        existing.raw_ocr_text = raw_ocr_str
                        existing.processing_time_ms = dur_ms
                        existing.scanned_at = datetime.utcnow()
                    ocr_db.commit()

                    # Save to pipeline cache
                    cached_full = pipeline_res.get("full_result")
                    if cached_full:
                        cached_full["meta_info"] = {
                            "gt_lpn": exp_lpn,
                            "gt_sku": exp_sku,
                            "expected_lpn": exp_lpn,
                            "expected_sku": exp_sku,
                            "suffix_key": suffix_k,
                            "item_id": item_id,
                            "container_number": c_num
                        }
                        cache_keys = [f"item_{item_id}"]
                        if img_id:
                            cache_keys.append(f"img_{img_id}")
                        if abs_p:
                            cache_keys.append(f"path_{abs_p}")
                        save_to_pipeline_cache(cache_keys, cached_full)

                    self.ocr_stats["total_scanned"] += 1
                    if is_lpn_match or is_sku_match:
                        self.ocr_stats["matched_count"] += 1
                    self.ocr_stats["total_ms"] += dur_ms
                    self.ocr_stats["avg_ms"] = round(self.ocr_stats["total_ms"] / max(1, self.ocr_stats["total_scanned"]), 1)

                    if self.sse_callback:
                        thumb_b64 = None
                        full_res = pipeline_res.get("full_result") or {}
                        img_dict = full_res.get("images") or {}
                        thumb_b64 = img_dict.get("detected_label_preview") or img_dict.get("roi_preview") or img_dict.get("original_preview")

                        if not thumb_b64 and abs_p and os.path.isfile(abs_p):
                            try:
                                import cv2
                                im_src = cv2.imread(abs_p)
                                if im_src is not None:
                                    h_s, w_s = im_src.shape[:2]
                                    sc = 160.0 / max(h_s, w_s)
                                    if sc < 1.0:
                                        im_thumb = cv2.resize(im_src, (int(w_s * sc), int(h_s * sc)), interpolation=cv2.INTER_AREA)
                                    else:
                                        im_thumb = im_src
                                    _, buf = cv2.imencode('.jpg', im_thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
                                    thumb_b64 = base64.b64encode(buf).decode('ascii')
                            except Exception:
                                pass

                        self.sse_callback({
                            "type": "sync_ocr",
                            "data": {
                                "container_number": c_num,
                                "container_img_idx": task.get("container_img_idx"),
                                "container_img_total": task.get("container_img_total"),
                                "container_total_items": task.get("container_total_items"),
                                "item_id": item_id,
                                "image_id": img_id,
                                "image_type": img_type,
                                "local_path": local_p,
                                "thumbnail": thumb_b64,
                                "expected_lpn": exp_lpn,
                                "detected_lpn": det_lpn,
                                "is_lpn_match": is_lpn_match,
                                "expected_sku": exp_sku,
                                "detected_sku": det_sku,
                                "is_sku_match": is_sku_match,
                                "confidence": conf,
                                "duration_ms": dur_ms,
                                "stats": {
                                    "total_scanned": self.ocr_stats["total_scanned"],
                                    "matched_count": self.ocr_stats["matched_count"],
                                    "avg_ms": self.ocr_stats["avg_ms"]
                                },
                                "timestamp": datetime.now().strftime("%H:%M:%S"),
                                "active_model": active_model_name,
                                "model_id": active_model_id
                            }
                        })

                    match_tag = "KHỚP" if (is_lpn_match and is_sku_match) else ("KHỚP LPN" if is_lpn_match else ("KHỚP SKU" if is_sku_match else "CHƯA KHỚP"))
                    ocr_log_msg = f"[{active_model_name}] [{c_num}] LPN: {det_lpn or '—'} | SKU: {det_sku or '—'} | {match_tag} ({dur_ms}ms)"
                    if self.sse_callback:
                        try:
                            self.sse_callback({
                                "type": "log",
                                "level": "SUCCESS" if (is_lpn_match or is_sku_match) else "INFO",
                                "message": ocr_log_msg,
                                "container_number": c_num,
                                "source": "ai_ocr",
                                "timestamp": datetime.now().strftime("%H:%M:%S")
                            })
                        except Exception:
                            pass

                except Exception as ocr_err:
                    try:
                        ocr_db.rollback()
                    except Exception:
                        pass
                    err_msg = f"[AI OCR Lỗi] {c_num} - {ocr_err}"
                    if self.sse_callback:
                        try:
                            self.sse_callback({
                                "type": "log",
                                "level": "WARNING",
                                "message": err_msg,
                                "container_number": c_num,
                                "source": "ai_ocr",
                                "timestamp": datetime.now().strftime("%H:%M:%S")
                            })
                        except Exception:
                            pass
                finally:
                    self.ocr_queue.task_done()

        finally:
            try:
                ocr_db.close()
            except Exception:
                pass

    def run(self):
        """Luồng cào chính cho 1 Crawl Job"""
        job = self.db.query(LpnCrawlJob).filter(LpnCrawlJob.id == self.job_id).first()
        if not job:
            return

        job.status = "running"
        job.start_time = datetime.utcnow()
        self.db.commit()

        self.log("Bắt đầu crawl dữ liệu")

        if self.auto_ocr:
            self.ocr_thread = threading.Thread(target=self._ocr_worker_loop, name=f"SyncOcrWorker-{self.job_id}", daemon=True)
            self.ocr_thread.start()
            self.log("[AI OCR Sync] Đã kích hoạt luồng nhận diện AI OCR thời gian thực.")

        browser = None
        try:
            with sync_playwright() as p:
                # 1. Khởi tạo Browser & Context với Anti-Bot Stealth Flag
                launch_args = [
                    "--headless=new",
                    "--window-position=-2400,-2400",
                    "--disable-gpu",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                    "--no-default-browser-check",
                    "--no-first-run",
                    "--deny-permission-prompts",
                    "--disable-notifications"
                ]
                
                self.log("Đang khởi động trình duyệt Playwright Chromium ngầm")
                browser = p.chromium.launch(
                    headless=True,
                    args=launch_args,
                    timeout=20000
                )
                self.log("Khởi động trình duyệt Chromium ngầm thành công")

                context_kwargs = {
                    "viewport": {"width": 1400, "height": 900},
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "permissions": []
                }

                # Tái sử dụng storage_state nếu có (Kiểm tra JSON hợp lệ)
                if os.path.exists(settings.STORAGE_STATE_FILE):
                    try:
                        import json
                        with open(settings.STORAGE_STATE_FILE, "r", encoding="utf-8") as st_f:
                            json.load(st_f)
                        context_kwargs["storage_state"] = settings.STORAGE_STATE_FILE
                        self.log("Phát hiện phiên đăng nhập cũ. Đang tái sử dụng phiên làm việc.")
                    except Exception as st_err:
                        self.log(f"File session cũ bị lỗi ({st_err}). Tự động dọn dẹp để đăng nhập mới.", level="WARNING")
                        try:
                            os.remove(settings.STORAGE_STATE_FILE)
                        except Exception:
                            pass

                context = browser.new_context(**context_kwargs)

                # Mask navigator.webdriver bot detection flag
                context.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                """)

                page = context.new_page()
                self._start_screenshot_stream(page)

                # Gắn hook bắt gói tin API / Table payload của AppSheet ngầm
                def on_network_response(resp):
                    try:
                        u = resp.url.lower()
                        if "appsheet.com" in u and ("api/template" in u or "template" in u):
                            try:
                                payload = resp.json()
                                if isinstance(payload, dict) and "NestedDataSets" in payload:
                                    from lpn_crawler.backend.crawler.parser import validate_template_api_payload
                                    is_v, msg_v = validate_template_api_payload(payload)
                                    if is_v:
                                        self.captured_template_payload = payload
                                        self.log(f"Đã tự động bắt được gói dữ liệu Template API từ trình duyệt ({msg_v}).")
                            except Exception:
                                pass

                        if "appsheet.com" in u and any(k in u for k in ["loadtable", "find", "gettabledata", "downloadtable", "tabledata", "api/v2", "action/find", "getdata", "sync"]):
                            ct = (resp.headers.get("content-type") or "").lower()
                            if "json" in ct or "text" in ct:
                                try:
                                    payload = resp.json()
                                    raw_rows = []
                                    if isinstance(payload, list):
                                        raw_rows = payload
                                    elif isinstance(payload, dict):
                                        raw_rows = payload.get("Rows") or payload.get("rows") or payload.get("data") or payload.get("values") or payload.get("RowsList") or []
                                    if raw_rows and isinstance(raw_rows, list):
                                        valid_dicts = [r for r in raw_rows if isinstance(r, dict)]
                                        if valid_dicts:
                                            first_k = [str(k).lower() for k in valid_dicts[0].keys()]
                                            if any("container" in k or "lpn" in k or "batch" in k or "factory" in k for k in first_k):
                                                self.log(f"Bắt được gói dữ liệu API AppSheet ({len(valid_dicts)} bản ghi).")
                                                self.captured_api_rows.extend(valid_dicts)
                                except Exception:
                                    pass
                    except Exception:
                        pass

                page.on("response", on_network_response)

                # 2. Mở AppSheet URL
                self.log("Đang mở trang ứng dụng AppSheet")
                page.goto(settings.APPSHEET_URL, wait_until="domcontentloaded", timeout=60000)
                self.capture_and_send_progress(page, "", "LOADING", 0, 0, 0, 0, current_action="Đang tải giao diện Web AppSheet...")
                page.wait_for_timeout(3000)
                self.capture_and_send_progress(page, "", "LOADING", 0, 0, 0, 0, current_action="Đang mở trang AppSheet...")

                # 3. Check Authentication & Auto Google Login (Mục 25)
                self.log("Đang xác minh phiên làm việc và đăng nhập tài khoản Google")
                login_success = self.ensure_authenticated(page, context)
                if not login_success:
                    self.log("Yêu cầu xác minh tài khoản Google hoặc 2FA trên cửa sổ Chrome.", level="WARNING")
                    job.status = "auth_required"
                    job.error_message = "Yêu cầu xác minh tài khoản Google hoặc 2FA trên cửa sổ Chrome."
                    job.end_time = datetime.utcnow()
                    self.db.commit()
                    self.send_progress("", "FAILED", 0, 0, 0, 0, current_action="Job thất bại: Yêu cầu xác minh tài khoản Google hoặc 2FA.")
                    if browser:
                        try:
                            browser.close()
                        except Exception:
                            pass
                    crawl_job_manager.release_job_lock_sync(self.job_id)
                    return

                # 4. FAST-PATH: Chủ động gọi trực tiếp AppSheet Template API ngay khi phiên xác thực sẵn sàng
                if getattr(settings, "USE_DIRECT_API_FASTPATH", True):
                    self.active_crawl_mode = "Fast-Path API"
                    self.capture_and_send_progress(
                        page, "", "CRAWLING", 0, 0, 0, 0,
                        current_action="Đang trích xuất toàn bộ dữ liệu qua Fast-Path AppSheet Template API..."
                    )
                    
                    template_payload = None
                    self.last_api_fail_reason = "Chưa nhận được phản hồi từ máy chủ AppSheet"
                    
                    # Thử Fast-Path API tối đa 3 lần, mỗi lần chờ 30 giây
                    for retry_fast in range(1, 4):
                        self.log(f"[FAST-PATH (Lần {retry_fast}/3)] Đang kết nối và trích xuất dữ liệu qua AppSheet Template API ngầm...")
                        template_payload = self.fetch_appsheet_template_api_direct(page, context)
                        if template_payload:
                            break
                        if retry_fast < 3:
                            reason_msg = getattr(self, "last_api_fail_reason", "Chưa nhận được phản hồi từ API")
                            self.log(
                                f"[FAST-PATH THỬ LẠI {retry_fast}/3] Chưa lấy được dữ liệu ({reason_msg}). Đang tạm dừng chờ 30 giây trước khi thử lại lần {retry_fast + 1}...",
                                level="WARNING"
                            )
                            # Chờ 30 giây (có kiểm tra hủy job)
                            for _ in range(30):
                                if crawl_job_manager.is_cancelled(self.job_id):
                                    break
                                time.sleep(1)

                    if template_payload:
                        self.log("[FAST-PATH THÀNH CÔNG] Đã nhận dữ liệu từ AppSheet API. Bắt đầu xử lý các Container...")
                        fast_success = self.crawl_all_from_template_payload(page, browser, job, template_payload)
                        if fast_success:
                            crawl_job_manager.release_job_lock_sync(self.job_id)
                            return
                        else:
                            self.active_crawl_mode = "UI Playwright"
                            self.log(
                                "[TỰ ĐỘNG CHUYỂN ĐỔI] Lý do: Quá trình xử lý gói tin Fast-Path gặp lỗi gián đoạn. "
                                "Hệ thống tự động kích hoạt chế độ cào giao diện 'UI Playwright' để tiếp tục hoàn tất các container còn lại.",
                                level="WARNING"
                            )
                    else:
                        self.active_crawl_mode = "UI Playwright"
                        reason_msg = getattr(self, "last_api_fail_reason", "Không nhận được phản hồi sau 3 lần thử")
                        self.log(
                            f"[TỰ ĐỘNG CHUYỂN ĐỔI] Lý do: Đã thử kết nối AppSheet Fast-Path Template API 3 lần liên tiếp (mỗi lần chờ 30 giây) "
                            f"nhưng không thành công ({reason_msg}). "
                            f"Hệ thống tự động kích hoạt chế độ cào giao diện 'UI Playwright' để tiếp tục cào dữ liệu.",
                            level="WARNING"
                        )

                # 4b. Bắt buộc Điều Hướng & Xác Minh Menu "LPN NEW" (Chỉ khi Fast-Path không khả dụng)
                self.active_crawl_mode = "UI Playwright"
                self.log("Đang mở bảng dữ liệu Menu 'LPN NEW' (UI Fallback)")
                nav_success = self.navigate_and_verify_lpn_new(page)
                if not nav_success:
                    self.log("Điều hướng Menu 'LPN NEW' thất bại. Dừng toàn bộ job.", level="ERROR")
                    job.status = "failed"
                    job.error_message = "Điều hướng Menu 'LPN NEW' thất bại."
                    job.end_time = datetime.utcnow()
                    self.db.commit()
                    self.send_progress("", "FAILED", 0, 0, 0, 0, current_action="Job thất bại: Điều hướng Menu 'LPN NEW' thất bại.")
                    if browser:
                        try:
                            browser.close()
                        except Exception:
                            pass
                    crawl_job_manager.release_job_lock_sync(self.job_id)
                    return

                # FAST-PATH DỰ PHÒNG: Nếu bắt được dữ liệu từ Network Listener
                if self.captured_api_rows and len(self.captured_api_rows) > 0:
                    self.active_crawl_mode = "Fast-Path (Network Hook)"
                    self.log(f"Kích hoạt Fast-Path (Network Hook): Xử lý trực tiếp {len(self.captured_api_rows)} bản ghi từ API payload...")
                    fast_success = self.crawl_all_from_api_payload(page, browser, job)
                    if fast_success:
                        crawl_job_manager.release_job_lock_sync(self.job_id)
                        return

                # 5. PHASE A: DISCOVERY QUEUE (Mục 26.6)
                self.active_crawl_mode = "UI Playwright"
                self.log("Bắt đầu giai đoạn 1: Quét và thu thập danh sách Container (UI Fallback)")
                container_queue = self.discover_container_list(page)

                job.total_containers_found = len(container_queue)
                self.db.commit()
                self.log(f"Giai đoạn 1 hoàn tất: Đã tìm thấy tổng cộng {len(container_queue)} Container.")

                if not container_queue:
                    self.log("Không phát hiện Container nào trong danh sách. Kết thúc job.", level="WARNING")
                    job.status = "completed"
                    job.end_time = datetime.utcnow()
                    self.db.commit()
                    return

                # 5. PHASE B: DETAIL CRAWLING
                self.log("Bắt đầu giai đoạn 2: Cào chi tiết dữ liệu và ảnh của từng Container")
                
                processed_count = 0
                success_count = 0
                failed_count = 0
                total_items_count = 0
                total_images_count = 0
                total_sku_count = 0
                consecutive_duplicate_count = 0

                for item_info in container_queue:
                    target_num = item_info["container_number"]
                    q_total = len(container_queue)

                    self.check_paused(page, target_num, "Chuẩn bị chuyển sang container tiếp theo")

                    if crawl_job_manager.is_cancelled(self.job_id):
                        self.log("Nhận được tín hiệu HỦY JOB (Cancelled by user).", level="WARNING")
                        job.status = "cancelled"
                        job.end_time = datetime.utcnow()
                        self.db.commit()
                        if browser:
                            browser.close()
                        return

                    target_num = item_info["container_number"]
                    q_total = len(container_queue)

                    # Auto Memory Recycle: Làm mới trang sau mỗi 30 Container để giải phóng RAM
                    if processed_count > 0 and processed_count % 30 == 0:
                        import gc
                        gc.collect()
                        self.log(
                            f"[AUTO MEMORY RECYCLE] Đã xử lý {processed_count} Containers. Đang tự động làm mới trang AppSheet để giải phóng 100% bộ nhớ RAM...",
                            level="INFO"
                        )
                        self.capture_and_send_progress(
                            page, target_num, "RECYCLING", processed_count, q_total,
                            total_items_count, total_images_count,
                            current_action=f"Đang giải phóng RAM trình duyệt ({processed_count}/{q_total})...",
                            sku_crawled=total_sku_count
                        )
                        try:
                            # F5 / Reload trang AppSheet để dọn sạch rác RAM trong Chromium
                            page.reload(wait_until="domcontentloaded", timeout=60000)
                            page.wait_for_timeout(3000)
                            # Xác nhận và điều hướng lại Menu 'LPN NEW'
                            self.navigate_to_lpn_new(page)
                            self.verify_lpn_new_ready(page)
                            self.log(f"[AUTO MEMORY RECYCLE] Giải phóng bộ nhớ RAM thành công! Tiếp tục cào container {target_num}.", level="INFO")
                        except Exception as rec_err:
                            self.log(f"Cảnh báo khi làm mới trang giải phóng RAM: {rec_err}", level="WARNING")

                    # 1. KIỂM TRA DUPLICATE: Container này đã có trong Database và ĐẦY ĐỦ 100% dữ liệu chưa?
                    from sqlalchemy.orm import joinedload
                    
                    existing_cont = None
                    for retry_i in range(3):
                        try:
                            existing_cont = self.db.query(LpnContainer).options(
                                joinedload(LpnContainer.items).joinedload(LpnItem.images)
                            ).filter(
                                LpnContainer.container_number == target_num
                            ).first()
                            break
                        except Exception as db_ex:
                            self.db.rollback()
                            if retry_i == 2:
                                self.log(f"Lỗi kiểm tra DB duplicate ({target_num}): {db_ex}", level="WARNING")
                            time.sleep(0.3)

                    is_truly_complete = False
                    if existing_cont and existing_cont.items and len(existing_cont.items) > 0:
                        has_missing = False
                        for itm in existing_cont.items:
                            m_fields = check_item_missing_fields(itm, existing_cont)
                            if m_fields:
                                has_missing = True
                                break
                        if not has_missing:
                            is_truly_complete = True

                    # Chỉ bỏ qua nếu Container đã có và đã ĐẦY ĐỦ 100% dữ liệu (không dở dang)
                    if is_truly_complete:
                        processed_count += 1
                        self.record_container_time(0.001, container_type="skip")
                        if self.mode == "incremental":
                            consecutive_duplicate_count += 1
                            self.log(
                                f"[{processed_count}/{q_total}] Container '{target_num}' đã tồn tại và đầy đủ 100% dữ liệu ({len(existing_cont.items)} items). Bỏ qua (Trùng #{consecutive_duplicate_count}/4).",
                                container_number=target_num
                            )

                            self.capture_and_send_progress(
                                page, target_num, "SKIPPED_EXISTING", processed_count, q_total,
                                total_items_count, total_images_count,
                                current_action=f"Container '{target_num}' đã đầy đủ dữ liệu (Bỏ qua - Trùng #{consecutive_duplicate_count}/4)...",
                                sku_crawled=total_sku_count
                            )

                            # ĐIỀU KIỆN DỪNG: Chỉ tự động dừng khi chạy ở chế độ Cào nhanh/Cập nhật (incremental)
                            if consecutive_duplicate_count >= 4:
                                stop_msg = f"Dữ liệu đã có trên hệ thống! Phát hiện 4 Container liên tiếp ({target_num}) đã có đầy đủ dữ liệu. Tự động dừng crawl để tránh duplicate dữ liệu."
                                self.log(stop_msg)

                                job.status = "completed"
                                job.error_message = stop_msg
                                job.end_time = datetime.utcnow()
                                self.db.commit()

                                self.capture_and_send_progress(
                                    page, target_num, "COMPLETED_DUPLICATE_STOP", processed_count, q_total,
                                    total_items_count, total_images_count,
                                    current_action=stop_msg,
                                    sku_crawled=total_sku_count
                                )

                                if browser:
                                    try:
                                        browser.close()
                                    except Exception:
                                        pass
                                return

                            continue
                        else:
                            # Full mode: Fast-Skip 0.001s
                            self.log(
                                f"[{processed_count}/{q_total}] [ĐÃ ĐỦ TRONG DB] Container '{target_num}' đã có đầy đủ 100% dữ liệu ({len(existing_cont.items)} items). Bỏ qua.",
                                container_number=target_num
                            )
                            self.capture_and_send_progress(
                                page, target_num, "SKIPPED_EXISTING", processed_count, q_total,
                                total_items_count, total_images_count,
                                current_action=f"Đã bỏ qua (Đủ 100%): {target_num} ({processed_count}/{q_total})...",
                                sku_crawled=total_sku_count
                            )
                            continue

                    # Nếu Container chưa tồn tại hoặc bị dở dang/thiếu dữ liệu -> Reset counter trùng liên tiếp về 0
                    consecutive_duplicate_count = 0
                    is_rehealing = bool(existing_cont)
                    if is_rehealing:
                        self.log(
                            f"[{processed_count + 1}/{q_total}] [CŨ - THIẾU DỮ LIỆU/ẢNH] Container '{target_num}' đã có trong DB nhưng chưa đầy đủ dữ liệu/ảnh. Đang cào lại để cập nhật/bổ sung hoàn tất...",
                            container_number=target_num,
                            level="WARNING"
                        )
                    else:
                        self.log(
                            f"[{processed_count + 1}/{q_total}] [CONTAINER MỚI] Phát hiện Container mới '{target_num}' (chưa có trong DB). Bắt đầu cào...",
                            container_number=target_num
                        )

                    c_start_t = time.time()
                    self.capture_and_send_progress(
                        page, target_num, "CRAWLING", processed_count, q_total,
                        total_items_count, total_images_count,
                        current_action=f"Bắt đầu xử lý Container: {target_num}",
                        sku_crawled=total_sku_count,
                        is_active_download=True
                    )

                    try:
                        c_items, c_imgs, is_updated = self.crawl_single_container(
                            page, target_num, item_info,
                            processed=processed_count, total=q_total,
                            total_items=total_items_count, total_images=total_images_count,
                            total_sku=total_sku_count
                        )

                        c_sku = 0
                        try:
                            cont_obj = self.db.query(LpnContainer).filter(
                                LpnContainer.container_number == target_num
                            ).order_by(LpnContainer.id.desc()).first()
                            if cont_obj:
                                c_sku = self.db.query(LpnItem).filter(
                                    LpnItem.container_id == cont_obj.id,
                                    LpnItem.sku != None,
                                    LpnItem.sku != ""
                                ).count()
                        except Exception:
                            pass

                        success_count += 1
                        total_items_count += c_items
                        total_images_count += c_imgs
                        total_sku_count += c_sku
                        
                        job.containers_success = success_count
                        job.total_items_crawled = total_items_count
                        job.total_images_downloaded = total_images_count
                        self.db.commit()

                        if is_rehealing:
                            self.log(
                                f"[{processed_count + 1}/{q_total}] [BỔ SUNG THÀNH CÔNG] Hoàn tất cập nhật bổ sung: {target_num} | Pallet/Box: {c_items} | SKU: {c_sku} | Picture: {c_imgs}",
                                container_number=target_num
                            )
                        else:
                            self.log(
                                f"[{processed_count + 1}/{q_total}] [LƯU MỚI THÀNH CÔNG] Hoàn tất container mới: {target_num} | Pallet/Box: {c_items} | SKU: {c_sku} | Picture: {c_imgs}",
                                container_number=target_num
                            )

                        if self.sse_callback:
                            try:
                                self.sse_callback({
                                    "type": "data_updated",
                                    "container_number": target_num,
                                    "items_count": c_items,
                                    "sku_count": c_sku,
                                    "processed": processed_count + 1,
                                    "total": q_total
                                })
                            except Exception:
                                pass

                    except Exception as c_err:
                        failed_count += 1
                        job.containers_failed = failed_count
                        self.db.commit()
                        self.log(f"Lỗi khi crawl Container {target_num}: {c_err}", level="ERROR", container_number=target_num)

                    processed_count += 1
                    job.containers_processed = processed_count
                    self.db.commit()
                    try:
                        self.db.expunge_all()
                    except Exception:
                        pass
                    dur = max(0.001, time.time() - c_start_t)
                    self.record_container_time(dur, container_type="heal" if is_rehealing else "new")
                    self.capture_and_send_progress(
                        page, target_num, "DONE", processed_count, q_total,
                        total_items_count, total_images_count,
                        current_action="Đang chuyển sang Container tiếp theo...",
                        sku_crawled=total_sku_count
                    )

                if self.auto_ocr and hasattr(self, "ocr_queue") and self.ocr_thread:
                    self.log("Đang đợi hoàn tất các ảnh còn lại trong hàng đợi AI OCR...")
                    self.ocr_queue.put(None)
                    self.ocr_thread.join(timeout=45)

                # Job Completed
                job.status = "completed_with_errors" if failed_count > 0 else "completed"
                job.end_time = datetime.utcnow()
                self.db.commit()
                skip_count = max(0, processed_count - success_count - failed_count)
                self.log(f"Job #{self.job_id} hoàn tất! Đã lưu mới/bổ sung: {success_count}, Đã có sẵn (Bỏ qua): {skip_count}, Lỗi: {failed_count} (Tổng: {len(container_queue)} Container).")

                if browser:
                    browser.close()

        except Exception as main_err:
            import traceback
            err_type = type(main_err).__name__
            err_msg = str(main_err).strip() if str(main_err).strip() else f"{err_type}: Lỗi không xác định trong luồng crawler."
            tb_str = traceback.format_exc()

            job.status = "failed"
            job.error_message = f"[{err_type}] {err_msg}\n{tb_str}"
            job.end_time = datetime.utcnow()
            self.db.commit()

            self.log(f"Job #{self.job_id} thất bại do ngoại lệ [{err_type}]: {err_msg}", level="ERROR", details=tb_str)
            self.send_progress("", "FAILED", 0, 0, 0, 0, current_action=f"Job thất bại do lỗi [{err_type}]: {err_msg}")
            
            if browser:
                try:
                    browser.close()
                except Exception:
                    pass
        finally:
            if getattr(self, "auto_ocr", False) and hasattr(self, "ocr_stop_event"):
                self.ocr_stop_event.set()
                if hasattr(self, "ocr_queue"):
                    try:
                        while not self.ocr_queue.empty():
                            self.ocr_queue.get_nowait()
                            self.ocr_queue.task_done()
                    except Exception:
                        pass
            try:
                self.db.close()
            except Exception:
                pass
            crawl_job_manager.release_job_lock_sync(self.job_id)
