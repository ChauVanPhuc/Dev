# -*- coding: utf-8 -*-
import time
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from playwright.sync_api import Page

from lpn_crawler.backend.models.models import LpnCrawlLog
from lpn_crawler.backend.worker.manager import crawl_job_manager

logger = logging.getLogger("lpn_crawler.telemetry")


class CrawlerTelemetryMixin:
    """
    Mixin phụ trách toàn bộ việc theo dõi tiến độ (telemetry), ghi log DB/SSE,
    tính toán rolling ETA và xử lý cơ chế tạm dừng/tiếp tục (pause/resume).
    """

    def record_container_time(self, duration: float, container_type: str = "new", is_skipped: Optional[bool] = None, image_count: int = 0):
        """
        Ghi nhận thời gian xử lý thực tế của container và tốc độ tải ảnh chi tiết theo số lượng ảnh:
        - 'skip': Container cũ đã đủ 100% dữ liệu & ảnh (0.001s)
        - 'heal': Container cũ nhưng thiếu ảnh, tự động tải bù (tùy số lượng ảnh thiếu)
        - 'new': Container mới hoàn toàn, tải toàn bộ ảnh & lưu items (15s - 50s tùy số lượng 20-80 ảnh)
        """
        if not hasattr(self, "recent_durations"):
            self.recent_durations = []
        if not hasattr(self, "skip_durations"):
            self.skip_durations = []
        if not hasattr(self, "heal_durations"):
            self.heal_durations = []
        if not hasattr(self, "new_durations"):
            self.new_durations = []
        if not hasattr(self, "active_durations"):
            self.active_durations = []
        if not hasattr(self, "skip_count"):
            self.skip_count = 0
        if not hasattr(self, "heal_count"):
            self.heal_count = 0
        if not hasattr(self, "new_count"):
            self.new_count = 0
        if not hasattr(self, "total_downloaded_images_tracked"):
            self.total_downloaded_images_tracked = 0
        if not hasattr(self, "total_image_download_time_tracked"):
            self.total_image_download_time_tracked = 0.0

        if is_skipped is True:
            container_type = "skip"
        elif is_skipped is False and container_type == "new":
            container_type = "heal" if getattr(self, "last_container_is_rehealing", False) else "new"

        dur = max(0.001, float(duration))
        self.recent_durations.append(dur)
        if len(self.recent_durations) > 25:
            self.recent_durations.pop(0)

        self.last_container_type = container_type
        self.last_is_skipped = (container_type == "skip")

        if image_count > 0:
            self.total_downloaded_images_tracked += image_count
            self.total_image_download_time_tracked += dur

        if container_type == "skip":
            self.skip_count += 1
            self.skip_durations.append(dur)
            if len(self.skip_durations) > 50:
                self.skip_durations.pop(0)
        elif container_type == "heal":
            self.heal_count += 1
            self.heal_durations.append(dur)
            self.active_durations.append(dur)
            if len(self.heal_durations) > 25:
                self.heal_durations.pop(0)
            if len(self.active_durations) > 25:
                self.active_durations.pop(0)
        else: # "new"
            self.new_count += 1
            self.new_durations.append(dur)
            self.active_durations.append(dur)
            if len(self.new_durations) > 25:
                self.new_durations.pop(0)
            if len(self.active_durations) > 25:
                self.active_durations.pop(0)

    def log(self, message: str, level: str = "INFO", container_number: Optional[str] = None, details: Optional[str] = None, source: Optional[str] = None):
        """Lưu log vào DB và gửi SSE event"""
        safe_msg = message[:450] if message else ""
        src = source or ("ai_ocr" if ("[AI OCR" in (message or "")) else "crawler")
        try:
            log_entry = LpnCrawlLog(
                crawl_job_id=self.job_id,
                container_number=container_number,
                level=level,
                message=safe_msg,
                details=details,
                created_at=datetime.now()
            )
            self.db.add(log_entry)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to save log: {e}")

        if getattr(self, "sse_callback", None):
            try:
                self.sse_callback({
                    "type": "log",
                    "level": level,
                    "message": message,
                    "container_number": container_number,
                    "source": src,
                    "timestamp": datetime.now().strftime("%H:%M:%S")
                })
            except Exception:
                pass

    def send_progress(
        self, current_container: str, current_status: str, processed: int, total: int, 
        items_crawled: int, images_downloaded: int, current_action: str = "", 
        sku_crawled: int = 0, is_active_download: bool = False
    ):
        """Gửi tiến độ SSE kèm trạng thái thao tác, thời gian đã chạy, ETA ước tính mượt mà và tốc độ tức thời/toàn trình"""
        if current_container:
            self.current_container = current_container
        self.current_processed = processed
        self.current_total = total
        self.current_items = items_crawled
        self.current_images = images_downloaded
        self.current_sku = sku_crawled
        
        now = time.time()
        elapsed_sec = max(0, int(now - getattr(self, "job_start_time", now)))
        eta_seconds = None
        speed_str = "—"
        
        if total > 0 and processed > 0:
            remaining_cont = max(0, total - processed)
            
            # Tốc độ trung bình thực tế toàn trình
            overall_pace = max(0.005, elapsed_sec / processed)
            
            is_skipped = getattr(self, "last_is_skipped", False)
            last_type = getattr(self, "last_container_type", "skip" if is_skipped else "new")
            tot_imgs = getattr(self, "total_downloaded_images_tracked", 0)
            tot_img_time = getattr(self, "total_image_download_time_tracked", 0.0)
            
            # Tính Median (Trung vị) từ log thực tế để loại bỏ outlier và phản ánh đúng 50% số container điển hình
            import statistics
            skip_durations = getattr(self, "skip_durations", [])
            heal_durations = getattr(self, "heal_durations", [])
            new_durations = getattr(self, "new_durations", [])
            active_durations = getattr(self, "active_durations", [])

            is_dom_mode = "DOM" in getattr(self, "active_crawl_mode", "") or "UI" in getattr(self, "active_crawl_mode", "")
            default_skip_seed = 0.8 if is_dom_mode else 0.002
            default_heal_seed = 28.0 if is_dom_mode else 18.5
            default_new_seed = 55.0 if is_dom_mode else 42.0

            # 1. Median cho nhóm Container Bỏ qua (Skip)
            if len(skip_durations) >= 3:
                median_skip_sec = float(statistics.median(skip_durations))
            else:
                median_skip_sec = default_skip_seed

            # 2. Median cho nhóm Container Bổ sung / Bù ảnh (Heal)
            if len(heal_durations) >= 3:
                median_heal_sec = float(statistics.median(heal_durations))
            elif len(active_durations) >= 1:
                median_heal_sec = float(statistics.median(active_durations))
            else:
                median_heal_sec = default_heal_seed

            # 3. Median cho nhóm Container MỚI HOÀN TOÀN (chưa từng crawl - tải toàn bộ 30-80 ảnh)
            if len(new_durations) >= 3:
                median_new_sec = float(statistics.median(new_durations))
            elif len(new_durations) >= 1:
                median_new_sec = float(new_durations[-1])
            elif len(active_durations) >= 1:
                multiplier = 1.8 if is_dom_mode else 2.1
                median_new_sec = max(default_new_seed * 0.85, float(statistics.median(active_durations)) * multiplier)
            else:
                median_new_sec = default_new_seed
            
            # Hiển thị Tốc độ (Speed) trực quan theo đúng phân loại Median
            if is_active_download or last_type in ("heal", "new"):
                if last_type == "heal":
                    speed_str = f"{median_heal_sec:.1f}s/cont (Bù ảnh)"
                elif last_type == "new":
                    speed_str = f"{median_new_sec:.1f}s/cont (Mới)"
                elif active_durations:
                    med_act = float(statistics.median(active_durations))
                    speed_str = f"{med_act:.1f}s/cont (Đang tải)"
                else:
                    speed_str = "Đang tải ảnh..."
            elif last_type == "skip" or is_skipped:
                speed_str = "<0.1s/cont (Fast-Skip)"
            else:
                speed_str = f"{overall_pace:.1f}s/cont"

            # 2. Tính Dự kiến còn lại (ETA) CHUẨN XÁC THEO TỪNG CHẾ ĐỘ
            if getattr(self, "mode", "full") == "incremental":
                # Chế độ Cập nhật nhanh: Tự động dừng ngay khi gặp 4 container cũ liên tiếp (không quét hết 3378 cont)
                consec_dup = getattr(self, "consecutive_duplicate_count", 0)
                rem_checks = max(1, 4 - consec_dup)
                if is_active_download or last_type in ("heal", "new"):
                    active_dur = median_new_sec if last_type == "new" else median_heal_sec
                    eta_seconds = max(10, int(active_dur + rem_checks * 2))
                else:
                    eta_seconds = max(5, rem_checks * 3)
            else:
                if remaining_cont == 0:
                    eta_seconds = 0
                else:
                    # Kiểm tra số lượng container đã có trong DB từ đầu job
                    if not hasattr(self, "_db_existing_containers_count") or self._db_existing_containers_count == 0:
                        try:
                            from lpn_crawler.backend.models.models import LpnContainer
                            self._db_existing_containers_count = self.db.query(LpnContainer.id).count()
                        except Exception:
                            try:
                                from app.core.database import SessionLocal
                                from lpn_crawler.backend.models.models import LpnContainer
                                tmp_db = SessionLocal()
                                self._db_existing_containers_count = tmp_db.query(LpnContainer.id).count()
                                tmp_db.close()
                            except Exception:
                                self._db_existing_containers_count = 1750
                    
                    db_existing = getattr(self, "_db_existing_containers_count", 1750)
                    
                    # 1. Nhóm 3: Container MỚI HOÀN TOÀN (chưa từng crawl bao giờ)
                    total_expected_new = max(0, total - db_existing)
                    cur_new_done = getattr(self, "new_count", 0)
                    rem_new = min(remaining_cont, max(0, total_expected_new - cur_new_done))
                    
                    # 2. Nhóm 1 & 2: Container CŨ ĐÃ CÓ TRONG DB (gồm Skip và Heal)
                    rem_old = max(0, remaining_cont - rem_new)
                    
                    cur_heal_done = getattr(self, "heal_count", 0)
                    cur_skip_done = getattr(self, "skip_count", 0)
                    old_done = cur_heal_done + cur_skip_done
                    if old_done > 0:
                        heal_rate = max(0.01, min(0.20, cur_heal_done / old_done))
                    else:
                        heal_rate = 0.02
                    
                    rem_heal = rem_old * heal_rate
                    rem_skip = rem_old * (1.0 - heal_rate)
                    
                    # Tổng khối lượng thời gian thực tế tính theo MEDIAN:
                    # - rem_new * median_new_sec (Nhóm mới hoàn toàn)
                    # - rem_heal * median_heal_sec (Nhóm cũ bù ảnh thiếu)
                    # - rem_skip * median_skip_sec (Nhóm cũ 100% Fast-Skip)
                    raw_target_eta = (rem_new * median_new_sec) + (rem_heal * median_heal_sec) + (rem_skip * median_skip_sec)
                    
                    # Chặn sàn bảo vệ: Chừng nào remaining_cont > 0 thì ETA không bao giờ được tụt về 0
                    min_floor_eta = max(5, int(remaining_cont * 0.05))
                    raw_target_eta = max(float(min_floor_eta), float(raw_target_eta))
                    
                    if not hasattr(self, "_last_eta_sec") or self._last_eta_sec is None:
                        self._last_eta_sec = float(raw_target_eta)
                        self._last_eta_time = now
                    else:
                        dt = max(0.0, now - getattr(self, "_last_eta_time", now))
                        self._last_eta_time = now
                        
                        decayed_eta = max(float(min_floor_eta), self._last_eta_sec - dt)
                        smoothed_eta = (0.85 * decayed_eta) + (0.15 * raw_target_eta)
                        self._last_eta_sec = max(float(min_floor_eta), smoothed_eta)
                    
                    eta_seconds = max(min_floor_eta, int(self._last_eta_sec))
                    
        elif total > 0 and processed == 0:
            eta_seconds = int(total * 1.5) if getattr(self, "active_crawl_mode", "") and "Fast-Path" in getattr(self, "active_crawl_mode", "") else int(total * 10.0)
            speed_str = "—"

        if getattr(self, "sse_callback", None):
            try:
                percent = int((processed / total * 100)) if total > 0 else 0
                self.sse_callback({
                    "type": "progress",
                    "job_id": self.job_id,
                    "current_container": self.current_container,
                    "current_status": current_status,
                    "current_action": current_action,
                    "processed": processed,
                    "total": total,
                    "percent": percent,
                    "items_crawled": items_crawled,
                    "images_downloaded": images_downloaded,
                    "sku_crawled": sku_crawled,
                    "elapsed_seconds": elapsed_sec,
                    "eta_seconds": eta_seconds,
                    "speed_str": speed_str,
                    "crawl_mode": getattr(self, "active_crawl_mode", "Fast-Path API"),
                    "ocr_queue_size": self.ocr_queue.qsize() if hasattr(self, "ocr_queue") else 0
                })
            except Exception:
                pass

    def snap(self, page: Page, action: str = "", container: str = "", processed: int = 0, total: int = 0, items: int = 0, images: int = 0, sku: int = 0):
        """Cập nhật tiến độ nhanh mà không chụp màn hình để tiết kiệm 100% CPU"""
        self.send_progress(container, "CRAWLING", processed, total, items, images, current_action=action, sku_crawled=sku)

    def capture_and_send_progress(self, page: Optional[Page], current_container: str, current_status: str, processed: int, total: int, items_crawled: int, images_downloaded: int, current_action: str = "", sku_crawled: int = 0):
        """Gửi tiến độ SSE nhẹ nhàng mà không chụp màn hình"""
        self.send_progress(current_container, current_status, processed, total, items_crawled, images_downloaded, current_action=current_action, sku_crawled=sku_crawled)

    def _start_screenshot_stream(self, page: Page):
        pass

    def _stop_screenshot_stream(self):
        pass

    def check_paused(self, page: Optional[Page] = None, target_num: str = "", action_context: str = ""):
        """Kiểm tra và giữ tiến trình tạm dừng ngay lập tức khi bấm Tạm Dừng"""
        if not crawl_job_manager.is_paused(self.job_id):
            return

        c_num = target_num or getattr(self, "current_container", "")
        paused_action = f"Tiến trình đang TẠM DỪNG ({action_context or c_num or 'chờ tiếp tục'}). Bấm 'Tiếp Tục' để chạy lại..."

        self.log(
            f"[TẠM DỪNG] Tiến trình crawl đã tạm dừng ({c_num or action_context}). Đang chờ người dùng bấm 'Tiếp Tục'...",
            level="ACTION",
            container_number=c_num
        )

        while crawl_job_manager.is_paused(self.job_id):
            if crawl_job_manager.is_cancelled(self.job_id):
                break
            self.capture_and_send_progress(
                page, c_num, "PAUSED",
                getattr(self, "current_processed", 0), getattr(self, "current_total", 0),
                getattr(self, "current_items", 0), getattr(self, "current_images", 0),
                current_action=paused_action,
                sku_crawled=getattr(self, "current_sku", 0)
            )
            time.sleep(0.4)

        if not crawl_job_manager.is_cancelled(self.job_id):
            self.log(
                f"[TIẾP TỤC] Nhận lệnh Tiếp Tục. Tiếp tục tiến trình crawl {c_num}...",
                level="ACTION",
                container_number=c_num
            )
            self.send_progress(
                c_num, "CRAWLING",
                getattr(self, "current_processed", 0), getattr(self, "current_total", 0),
                getattr(self, "current_items", 0), getattr(self, "current_images", 0),
                current_action=f"Đang tiếp tục crawl {c_num}...",
                sku_crawled=getattr(self, "current_sku", 0)
            )
