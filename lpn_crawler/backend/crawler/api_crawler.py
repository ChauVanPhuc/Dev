# -*- coding: utf-8 -*-
import os
import json
import time
import requests
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from playwright.sync_api import Page, BrowserContext
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from lpn_crawler.backend.config.settings import settings
from lpn_crawler.backend.models.models import (
    LpnCrawlJob, LpnContainer, LpnJobContainer, LpnItem, LpnImage, LpnAiOcrResult
)
from lpn_crawler.backend.services.storage import download_images_parallel
from lpn_crawler.backend.worker.manager import crawl_job_manager
from lpn_crawler.backend.crawler.parser import (
    validate_template_api_payload,
    process_template_nested_datasets,
    process_api_row_data
)


class CrawlerApiMixin:
    """
    Mixin phụ trách xử lý chiến lược Fast-Path: Gọi trực tiếp Template API của AppSheet,
    phân tích dữ liệu NestedDataSets/API JSON payload, lưu DB và tải ảnh đa luồng.
    """

    def _enqueue_images_for_sync_ocr(self, img_meta_list, items_data, c_num, image_tasks):
        """Nếu đang ở chế độ Đồng bộ Realtime (auto_ocr=True), đẩy ảnh tải về vào hàng đợi OCR."""
        if not (getattr(self, "auto_ocr", False) and hasattr(self, "ocr_queue")):
            return
        item_map = {}
        for t in (image_tasks or []):
            item_map[t.get("lpn_item_id")] = {
                "suffix_key": t.get("suffix_key"),
                "image_type": t.get("image_type", "Pallet")
            }

        valid_entries = []
        for item in (img_meta_list or []):
            if isinstance(item, dict):
                img_id = item.get("image_id")
                lp = item.get("local_path")
                i_id = item.get("lpn_item_id")
                img_type = item.get("image_type", "Pallet")
            elif isinstance(item, (list, tuple)) and len(item) == 2:
                db_img_obj, r_data = item
                try:
                    img_id = getattr(db_img_obj, "id", None)
                except Exception:
                    img_id = None
                lp = r_data.get("local_path") if isinstance(r_data, dict) else None
                i_id = r_data.get("lpn_item_id") if isinstance(r_data, dict) else None
                img_type = r_data.get("image_type", "Pallet") if isinstance(r_data, dict) else "Pallet"
            else:
                continue

            if lp:
                valid_entries.append((img_id, lp, i_id, img_type))

        total_cnt_imgs = len(valid_entries)
        total_cnt_items = len(items_data) if items_data else total_cnt_imgs

        for idx, (img_id, lp, i_id, img_type) in enumerate(valid_entries, 1):
            s_key = item_map.get(i_id, {}).get("suffix_key")
            matched_it = next((it for it in (items_data or []) if it.get("suffix_key") == s_key), None)
            self.ocr_queue.put({
                "image_id": img_id,
                "lpn_item_id": i_id,
                "container_number": c_num,
                "local_path": lp,
                "image_type": img_type,
                "expected_lpn": matched_it.get("lpn") if matched_it else None,
                "expected_sku": matched_it.get("sku") if matched_it else None,
                "suffix_key": matched_it.get("suffix_key") if matched_it else None,
                "container_img_idx": idx,
                "container_img_total": total_cnt_imgs,
                "container_total_items": total_cnt_items
            })

    def fetch_appsheet_template_api_direct(self, page: Page, context: Any, force_fresh: bool = False) -> Optional[Dict[str, Any]]:
        """
        Trích xuất Session Cookie từ Playwright Context và chủ động gọi AppSheet Template API.
        """
        try:
            if not force_fresh and getattr(self, "captured_template_payload", None):
                self.log("Sử dụng gói dữ liệu Template API đã bắt được từ trình duyệt.")
                return self.captured_template_payload

            cookie_dict = {}
            if os.path.exists(settings.STORAGE_STATE_FILE):
                try:
                    with open(settings.STORAGE_STATE_FILE, "r", encoding="utf-8") as sf:
                        st_data = json.load(sf)
                        for c in st_data.get("cookies", []):
                            if "name" in c and "value" in c:
                                cookie_dict[c["name"]] = c["value"]
                except Exception:
                    pass

            if context and hasattr(context, "cookies"):
                try:
                    for c in context.cookies():
                        if "name" in c and "value" in c:
                            cookie_dict[c["name"]] = c["value"]
                except Exception:
                    pass

            cookie_header = "; ".join([f"{k}={v}" for k, v in cookie_dict.items()])

            api_url = f"https://www.appsheet.com/api/template/{settings.APPSHEET_TEMPLATE_ID}/"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
                "Origin": "https://www.appsheet.com",
                "Referer": f"https://www.appsheet.com/start/{settings.APPSHEET_TEMPLATE_ID}?platform=desktop",
                "X-Requested-With": "XMLHttpRequest",
                "Cookie": cookie_header
            }

            post_body = {
                "apiLevel": 2,
                "appStartTime": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "build": "aaaaaaaaaaaaaaaaaaaa-1787094624596-808056b8",
                "clientId": "31661d0f-a70d-401a-b01c-4a72a9711144",
                "dataStamp": "",
                "getAllTables": True,
                "hasValidPlan": True,
                "initiatedBy": "AppStart",
                "isBackgroundSync": False,
                "isPreview": False,
                "lastSyncTime": "",
                "localVersion": "1.000396",
                "locale": "vi-VN",
                "location": "0.000000, 0.000000",
                "perTableParams": {},
                "settings": "{\"_RowNumber\":\"0\",\"_EMAIL\":\"\",\"_NAME\":\"\",\"_LOCATION\":\"\",\"Options Heading\":\"\",\"Option 1\":\"\",\"Option 2\":\"\",\"Country Option\":\"\",\"Language Option\":\"\",\"Option 5\":\"\",\"Option 6\":\"\",\"Option 7\":\"\",\"Option 8\":\"\",\"Option 9\":\"\",\"_THISUSER\":\"onlyvalue\"}",
                "supportsJsonDataSets": True,
                "syncToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6IjYwMDY4NmRiLTY2MjItNGI5OC1hMjc2LTAyY2RiM2UwYWIyYiIsImFwcFZlcnNpb24iOiIxLjAwMDM5NiIsInVzZXJJZCI6IjU0MTU4MDQ3NSIsImlhdCI6MTc4NzUzOTUzOSwiZXhwIjoxNzk1MzE1NTM5LCJpc3MiOiJodHRwczovL3d3dy5hcHBzaGVldC5jb20iLCJhdWQiOiJodHRwczovL3d3dy5hcHBzaGVldC5jb20ifQ.dmEi4z0pPwY2l-W7THidu0SOcDUhaRZ91OJI5v90d2A",
                "syncUI": "Blocking",
                "syncsOnConsent": True,
                "tzOffset": -420,
                "userConsentedScopes": "amp_email,data_input,device_identity,device_io,location,profile,usage"
            }

            self.log("Đang gửi request trích xuất dữ liệu trực tiếp tới AppSheet Template API...")
            payload = None

            # TIER 1: Pooled HTTP Socket Session với GZIP decompression trực tiếp (phản hồi ~5 giây)
            try:
                session = requests.Session()
                adapter = HTTPAdapter(
                    pool_connections=10, pool_maxsize=10,
                    max_retries=Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
                )
                session.mount("https://", adapter)
                session.headers.update(headers)
                resp = session.post(api_url, json=post_body, timeout=(15, 60))
                if resp.status_code == 200:
                    payload = resp.json()
                else:
                    self.last_api_fail_reason = f"AppSheet Template API phản hồi HTTP {resp.status_code}"
                    self.log(f"AppSheet Template API phản hồi HTTP {resp.status_code}", level="WARNING")
            except Exception as sess_err:
                self.last_api_fail_reason = f"Lỗi socket/kết nối mạng ({sess_err})"
                self.log(f"Socket session gặp ngoại lệ ({sess_err}), chuyển sang trình duyệt fetch...", level="WARNING")

            # TIER 2: Fallback qua trình duyệt Playwright page.evaluate
            if not payload and page:
                try:
                    payload_str = page.evaluate("""async ({ url, body }) => {
                        try {
                            const resp = await fetch(url, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-Requested-With': 'XMLHttpRequest'
                                },
                                body: JSON.stringify(body)
                            });
                            if (resp.ok) {
                                return await resp.text();
                            } else {
                                return JSON.stringify({ error: `HTTP ${resp.status}` });
                            }
                        } catch (e) {
                            return JSON.stringify({ error: e.toString() });
                        }
                    }""", {"url": api_url, "body": post_body})

                    if payload_str:
                        data_eval = json.loads(payload_str)
                        if isinstance(data_eval, dict) and "error" not in data_eval:
                            payload = data_eval
                        elif isinstance(data_eval, dict) and "error" in data_eval:
                            self.last_api_fail_reason = f"Trình duyệt fetch báo lỗi: {data_eval.get('error')}"
                except Exception as eval_err:
                    self.last_api_fail_reason = f"Trình duyệt fetch gặp ngoại lệ ({eval_err})"
                    self.log(f"Trình duyệt fetch gặp ngoại lệ ({eval_err})", level="WARNING")

            if payload:
                is_valid, reason = validate_template_api_payload(payload)
                if is_valid:
                    self.log(f"Fast-Path API: Nhận dữ liệu thành công ({reason}).")
                    return payload
                else:
                    self.last_api_fail_reason = f"Dữ liệu API không đạt kiểm tra cấu trúc ({reason})"
                    self.log(f"Fast-Path API Validation không đạt: {reason}", level="WARNING")
                    return None
            return None
        except Exception as e:
            self.log(f"Ngoại lệ khi gọi Fast-Path API: {e}", level="WARNING")
            return None

    def crawl_all_from_template_payload(self, page: Page, browser: Any, job: LpnCrawlJob, payload: Dict[str, Any]) -> bool:
        """
        Fast-Path API: Xử lý dữ liệu trích xuất từ AppSheet Template API (NestedDataSets),
        kết hợp lưu CSDL và tải ảnh đa luồng Connection Pooling có thể cấu hình.
        """
        try:
            self.active_crawl_mode = "Fast-Path API"
            parsed_containers = process_template_nested_datasets(payload, app_name=self.app_name, table_name=self.table_name)
            if not parsed_containers:
                self.log("Không tìm thấy Container hợp lệ trong dữ liệu Template API, chuyển sang UI Fallback...", level="WARNING")
                return False

            total_q = len(parsed_containers)
            job.total_containers_found = total_q
            self.db.commit()
            self.log(f"Fast-Path API: Đã phát hiện tổng cộng {total_q} Container trong dữ liệu AppSheet.")

            processed_count = 0
            success_count = 0
            failed_count = 0
            total_items_count = 0
            total_images_count = 0
            total_sku_count = 0
            consecutive_duplicate_count = 0
            last_activity_time = time.time()
            freeze_retry_done = False
            break_to_realtime = False

            # Sắp xếp container theo date_loading mới nhất trước
            sorted_containers = sorted(
                parsed_containers.items(),
                key=lambda itm: (itm[1]["header"].get("date_loading") or date.min, itm[1]["header"].get("timestamp_val") or datetime.min),
                reverse=True
            )

            # Xác định các ngày tải hàng gần nhất cho chế độ quét nhanh (incremental)
            distinct_loading_dates = []
            for _, pdata in sorted_containers:
                d = pdata["header"].get("date_loading")
                if d and d not in distinct_loading_dates:
                    distinct_loading_dates.append(d)

            target_recent_days = 4
            if len(distinct_loading_dates) >= target_recent_days:
                recent_dates_set = set(distinct_loading_dates[:target_recent_days])
                cutoff_date = distinct_loading_dates[target_recent_days - 1]
                date_range_str = f"{cutoff_date.strftime('%d/%m/%Y')} -> {distinct_loading_dates[0].strftime('%d/%m/%Y')}"
            elif distinct_loading_dates:
                recent_dates_set = set(distinct_loading_dates)
                cutoff_date = distinct_loading_dates[-1]
                date_range_str = f"toàn bộ {len(distinct_loading_dates)} ngày có sẵn ({cutoff_date.strftime('%d/%m/%Y')} -> {distinct_loading_dates[0].strftime('%d/%m/%Y')})"
            else:
                recent_dates_set = set()
                cutoff_date = None
                date_range_str = "không xác định"

            # Tập hợp các Container duy nhất thuộc phạm vi 4 ngày gần nhất
            recent_target_containers = set()
            if recent_dates_set:
                for c_n, pdata in sorted_containers:
                    d = pdata["header"].get("date_loading")
                    if d in recent_dates_set:
                        recent_target_containers.add(c_n)

            total_recent_target_count = len(recent_target_containers)
            completed_recent_containers = set()
            seen_consecutive_unique_containers = set()

            if self.mode == "incremental" and total_recent_target_count > 0:
                display_total_q = total_recent_target_count
                job.total_containers_found = display_total_q
                self.db.commit()
            else:
                display_total_q = total_q

            if self.mode == "incremental":
                if total_recent_target_count > 0:
                    self.log(
                        f"[ĐỒNG BỘ CẬP NHẬT 4 NGÀY GẦN NHẤT] Bắt đầu rà soát dữ liệu 4 ngày tải hàng gần nhất ({date_range_str}) "
                        f"gồm {total_recent_target_count} tủ (container). Khi toàn bộ tủ và ảnh của 4 ngày này đã cào xong, có đầy đủ 100% trong CSDL, "
                        f"hệ thống sẽ tự động chuyển sang chế độ THƯỜNG TRỰC ĐỒNG BỘ THỜI GIAN THỰC (Real-time Listening 24/7)...",
                        level="INFO"
                    )
                else:
                    self.log(
                        f"[ĐỒNG BỘ CẬP NHẬT] Đang rà soát dữ liệu container mới nhất để đồng bộ...",
                        level="INFO"
                    )

            for c_num, parsed_data in sorted_containers:
                c_start_t = time.time()
                if crawl_job_manager.is_cancelled(self.job_id):
                    self.log("Nhận được tín hiệu HỦY JOB (Cancelled by user).", level="WARNING")
                    job.status = "cancelled"
                    job.end_time = datetime.utcnow()
                    self.db.commit()
                    if browser:
                        try:
                            browser.close()
                        except Exception:
                            pass
                    return True

                # Cơ chế Watchdog giám sát đứng mạng 15 phút (Freeze Watchdog)
                if (time.time() - last_activity_time) > 900:
                    if not freeze_retry_done:
                        freeze_retry_done = True
                        last_activity_time = time.time()
                        self.log("[CẢNH BÁO WATCHDOG] Phát hiện tiến trình bị đứng quá 15 phút. Đang tự động thử kết nối lại Fast-Path API 1 lần...", level="WARNING")
                    else:
                        stop_fail_msg = "Tiến trình cào đã bị dừng hoàn toàn do kết nối mạng/máy chủ bị đứng quá 15 phút sau khi thử lại."
                        self.log(stop_fail_msg, level="ERROR")
                        job.status = "failed"
                        job.error_message = stop_fail_msg
                        job.end_time = datetime.utcnow()
                        self.db.commit()
                        self.send_progress("", "FAILED", processed_count, total_q, total_items_count, total_images_count, current_action=stop_fail_msg)
                        if browser:
                            try:
                                browser.close()
                            except Exception:
                                pass
                        return False

                last_activity_time = time.time()

                self.check_paused(page, c_num, "Đang xử lý container")

                header_data = parsed_data["header"]
                items_data = parsed_data["items"]
                fingerprint = header_data["record_fingerprint"]
                content_hash = header_data["content_hash"]

                # Kiểm tra trùng lặp siêu nhanh (Dedup check)
                existing_cont = None
                for retry_i in range(3):
                    try:
                        existing_cont = self.db.query(LpnContainer).filter(
                            (LpnContainer.record_fingerprint == fingerprint) | (LpnContainer.container_number == c_num)
                        ).first()
                        break
                    except Exception:
                        self.db.rollback()
                        time.sleep(0.1)

                # Kiểm tra xem container đã có và đã ĐỦ 100% ẢNH THẬT TRÊN ĐĨA chưa (Cơ chế Tự Động Bù Đắp Ảnh Thiếu - Self-Healing)
                existing_img_count = 0
                if existing_cont:
                    try:
                        existing_img_count = self.db.query(LpnImage).filter(
                            LpnImage.container_id == existing_cont.id,
                            LpnImage.local_path.isnot(None),
                            LpnImage.local_path != 'None',
                            LpnImage.local_path != ''
                        ).count()
                    except Exception:
                        existing_img_count = 0

                total_expected_pics = sum(len(itm.get("image_urls", [])) for itm in items_data)
                has_all_images = (existing_img_count >= total_expected_pics) if total_expected_pics > 0 else True
                is_truly_complete = bool(existing_cont and existing_cont.content_hash == content_hash and has_all_images)

                if is_truly_complete:
                    processed_count += 1
                    skip_sku = sum(1 for itm in items_data if itm.get("sku"))
                    total_sku_count += skip_sku
                    total_items_count += len(items_data)
                    total_images_count += existing_img_count
                    dur = max(0.001, time.time() - c_start_t)
                    self.record_container_time(dur, container_type="skip")

                    tot_items_n = len(items_data)
                    missing_pics_n = max(0, tot_items_n - existing_img_count)
                    if missing_pics_n > 0:
                        prefix_tag = f"[NGUỒN THIẾU {missing_pics_n} ẢNH]"
                        status_note = f"Có {existing_img_count}/{tot_items_n} ảnh theo kiện (Nguồn AppSheet để trống {missing_pics_n} ảnh)"
                    else:
                        prefix_tag = "[ĐÃ ĐỦ 100%]"
                        status_note = f"Đã đủ {existing_img_count}/{tot_items_n} ảnh theo kiện"

                    if self.mode == "incremental":
                        if c_num in recent_target_containers:
                            completed_recent_containers.add(c_num)
                        seen_consecutive_unique_containers.add(c_num)

                        curr_loading_date = header_data.get("date_loading")

                        # Điều kiện hoàn tất rà soát 4 ngày gần nhất:
                        # 1. Đã kiểm tra và có đủ 100% tất cả các tủ duy nhất trong 4 ngày gần nhất
                        # 2. Hoặc con trỏ đã duyệt xong toàn bộ container của 4 ngày gần nhất và bắt đầu sang ngày cũ hơn (curr_loading_date < cutoff_date)
                        is_recent_sync_done = False
                        if total_recent_target_count > 0:
                            if len(completed_recent_containers) >= total_recent_target_count:
                                is_recent_sync_done = True
                            elif curr_loading_date and cutoff_date and curr_loading_date < cutoff_date:
                                is_recent_sync_done = True

                        if is_recent_sync_done:
                            synced_n = len(completed_recent_containers)
                            if getattr(self, "auto_ocr", False):
                                stop_msg = (
                                    f"[HOÀN TẤT ĐỒNG BỘ 4 NGÀY GẦN NHẤT] Toàn bộ {synced_n}/{total_recent_target_count} tủ và ảnh của 4 ngày tải hàng gần nhất ({date_range_str}) "
                                    f"đã được rà soát và có đầy đủ 100% trong CSDL! Tự động chuyển ngay sang chế độ THƯỜNG TRỰC ĐỒNG BỘ THỜI GIAN THỰC (Real-time Listening 24/7)..."
                                )
                                self.log(stop_msg, level="SUCCESS")
                                break_to_realtime = True
                                break
                            else:
                                stop_msg = (
                                    f"[HOÀN TẤT ĐỒNG BỘ 4 NGÀY GẦN NHẤT] Toàn bộ {synced_n}/{total_recent_target_count} tủ và ảnh của 4 ngày tải hàng gần nhất ({date_range_str}) "
                                    f"đã có đầy đủ 100% trên hệ thống. Hoàn tất cập nhật!"
                                )
                                self.log(stop_msg, level="SUCCESS")
                                job.status = "completed"
                                job.error_message = stop_msg
                                job.end_time = datetime.utcnow()
                                self.db.commit()
                                if browser:
                                    try:
                                        browser.close()
                                    except Exception:
                                        pass
                                return True

                        # Fallback: Nếu không phân biệt được ngày tải hàng, dùng 5 tủ khác nhau liên tiếp đã có đủ 100%
                        if total_recent_target_count == 0 and len(seen_consecutive_unique_containers) >= 5:
                            if getattr(self, "auto_ocr", False):
                                stop_msg = f"[HOÀN TẤT ĐỒNG BỘ CẬP NHẬT] Đã rà soát 5 tủ khác nhau liên tiếp ({c_num}) đã có đầy đủ 100% trong CSDL. Tự động chuyển ngay sang chế độ THƯỜNG TRỰC ĐỒNG BỘ THỜI GIAN THỰC..."
                                self.log(stop_msg, level="SUCCESS")
                                break_to_realtime = True
                                break
                            else:
                                stop_msg = f"Dữ liệu đã có trên hệ thống! Đã quét đến vùng dữ liệu cũ ({c_num}). Hoàn tất cập nhật."
                                self.log(stop_msg, level="SUCCESS")
                                job.status = "completed"
                                job.error_message = stop_msg
                                job.end_time = datetime.utcnow()
                                self.db.commit()
                                if browser:
                                    try:
                                        browser.close()
                                    except Exception:
                                        pass
                                return True

                        # Nếu chưa xong 4 ngày gần nhất, ghi nhận log tiến độ
                        if total_recent_target_count > 0:
                            self.log(
                                f"[{processed_count}/{display_total_q}] {prefix_tag} Container '{c_num}' ({status_note}). "
                                f"Tiến độ 4 ngày gần nhất: {len(completed_recent_containers)}/{total_recent_target_count} tủ đã đủ.",
                                container_number=c_num,
                                level="SKIP"
                            )
                        else:
                            self.log(
                                f"[{processed_count}/{display_total_q}] {prefix_tag} Container '{c_num}' ({status_note}). Bỏ qua (Trùng #{len(seen_consecutive_unique_containers)}/5 tủ khác nhau).",
                                container_number=c_num,
                                level="SKIP"
                            )
                        continue
                    else:
                        # Chế độ Đồng bộ (auto_ocr=True) trong Full Mode: Kiểm tra xem container đã có sẵn nhưng có ảnh nào CHƯA QUÉT OCR không
                        if getattr(self, "auto_ocr", False) and hasattr(self, "ocr_queue"):
                            wait_start_ocr = time.time()
                            while hasattr(self, "ocr_queue") and self.ocr_queue.qsize() > 25:
                                if crawl_job_manager.is_cancelled(self.job_id):
                                    break
                                self.check_paused(page, c_num, "Chờ giải phóng hàng đợi AI OCR")
                                last_activity_time = time.time()
                                if time.time() - wait_start_ocr > 15:
                                    self.log(f"[AI OCR Queue] Hàng đợi đang bận ({self.ocr_queue.qsize()} ảnh). Tiếp tục xử lý container để chống nghẽn luồng...", level="INFO")
                                    break
                                self.send_progress(
                                    c_num, "CRAWLING", processed_count, display_total_q,
                                    total_items_count, total_images_count,
                                    current_action=f"Đang bóc tách AI OCR ({self.ocr_queue.qsize()} ảnh trong hàng đợi)...",
                                    sku_crawled=total_sku_count
                                )
                                time.sleep(1.0)

                            unscanned_imgs = self.db.query(LpnImage, LpnItem).join(
                                LpnItem, LpnImage.lpn_item_id == LpnItem.id
                            ).outerjoin(
                                LpnAiOcrResult, LpnAiOcrResult.image_id == LpnImage.id
                            ).filter(
                                LpnImage.container_id == existing_cont.id,
                                LpnImage.local_path.isnot(None),
                                LpnImage.local_path != 'None',
                                LpnImage.local_path != '',
                                LpnAiOcrResult.id.is_(None)
                            ).all()

                            if unscanned_imgs:
                                q_now = self.ocr_queue.qsize() if hasattr(self, "ocr_queue") else 0
                                self.log(
                                    f"[{processed_count}/{display_total_q}] [ĐÃ CÓ DỮ LIỆU] Xếp vào hàng đợi AI OCR: Container '{c_num}' ({len(unscanned_imgs)} ảnh). Hàng đợi: ~{q_now + len(unscanned_imgs)} ảnh chờ xử lý.",
                                    container_number=c_num,
                                    level="INFO"
                                )
                                total_u = len(unscanned_imgs)
                                for u_idx, (img_obj, itm_obj) in enumerate(unscanned_imgs, 1):
                                    self.ocr_queue.put({
                                        "image_id": img_obj.id,
                                        "lpn_item_id": itm_obj.id,
                                        "container_number": c_num,
                                        "local_path": img_obj.local_path,
                                        "image_type": img_obj.image_type or "Pallet",
                                        "expected_lpn": itm_obj.lpn,
                                        "expected_sku": itm_obj.sku,
                                        "suffix_key": itm_obj.suffix_key,
                                        "container_img_idx": u_idx,
                                        "container_img_total": total_u,
                                        "container_total_items": total_u
                                    })
                                self.send_progress(
                                    c_num, "CRAWLING", processed_count, display_total_q,
                                    total_items_count, total_images_count,
                                    current_action=f"[BỔ SUNG OCR] {c_num} ({len(unscanned_imgs)} ảnh chưa quét)",
                                    sku_crawled=total_sku_count
                                )
                                continue

                        # Nếu đã có đủ dữ liệu VÀ toàn bộ ảnh đều đã được quét OCR rồi -> Bỏ qua
                        if processed_count % 15 == 0 or processed_count == display_total_q or consecutive_duplicate_count <= 1:
                            self.log(
                                f"[{processed_count}/{display_total_q}] [ĐÃ CÓ TRONG DB & ĐÃ QUÉT ĐỦ] Container '{c_num}' ({status_note}). Bỏ qua.",
                                container_number=c_num,
                                level="SKIP"
                            )
                        self.send_progress(
                            c_num, "CRAWLING", processed_count, display_total_q,
                            total_items_count, total_images_count,
                            current_action=f"[ĐÃ CÓ SẴN & ĐỦ OCR] {c_num} ({status_note})",
                            sku_crawled=total_sku_count
                        )
                        continue

                consecutive_duplicate_count = 0
                seen_consecutive_unique_containers.clear()

                is_rehealing = bool(existing_cont)
                if is_rehealing:
                    missing_img_n = max(0, total_expected_pics - existing_img_count)
                    self.log(
                        f"[{processed_count + 1}/{display_total_q}] [CŨ - BỔ SUNG DỮ LIỆU] Container '{c_num}' đã có trong DB nhưng thiếu {missing_img_n} ảnh. Đang tự động bù đắp...",
                        container_number=c_num,
                        level="RECOVERY"
                    )
                    action_msg = f"Đang bổ sung {missing_img_n} ảnh: {c_num} ({processed_count + 1}/{display_total_q})"
                else:
                    self.log(
                        f"[{processed_count + 1}/{display_total_q}] [CONTAINER MỚI] Phát hiện Container mới '{c_num}' (chưa có trong DB). Bắt đầu cào dữ liệu và tải {total_expected_pics} ảnh...",
                        container_number=c_num
                    )
                    action_msg = f"Đang tải {total_expected_pics} ảnh mới: {c_num} ({processed_count + 1}/{display_total_q})"

                # Cập nhật ngay lập tức lên giao diện để hiển thị đúng Container và trạng thái Đang tải ảnh
                self.send_progress(
                    c_num, "CRAWLING", processed_count, display_total_q,
                    total_items_count, total_images_count,
                    current_action=action_msg,
                    sku_crawled=total_sku_count,
                    is_active_download=True
                )

                try:
                    db_cont = self.db.query(LpnContainer).filter(
                        (LpnContainer.record_fingerprint == fingerprint) | (LpnContainer.container_number == c_num)
                    ).first()
                    is_updated = False

                    if db_cont:
                        db_cont.last_seen_at = datetime.utcnow()
                        db_cont.last_crawl_job_id = self.job_id
                        db_cont.crawl_count = (db_cont.crawl_count or 1) + 1
                        if db_cont.content_hash != content_hash or db_cont.record_fingerprint != fingerprint:
                            db_cont.record_fingerprint = fingerprint
                            db_cont.content_hash = content_hash
                            db_cont.factory = header_data["factory"]
                            db_cont.date_loading_raw = header_data["date_loading_raw"]
                            db_cont.date_loading = header_data["date_loading"]
                            db_cont.timestamp_raw = header_data["timestamp_raw"]
                            db_cont.timestamp_val = header_data["timestamp_val"]
                            db_cont.operator_name = header_data["operator_name"]
                            is_updated = True
                    else:
                        db_cont = LpnContainer(
                            record_fingerprint=fingerprint,
                            container_number=header_data["container_number"],
                            factory=header_data["factory"],
                            date_loading_raw=header_data["date_loading_raw"],
                            date_loading=header_data["date_loading"],
                            timestamp_raw=header_data["timestamp_raw"],
                            timestamp_val=header_data["timestamp_val"],
                            operator_name=header_data["operator_name"],
                            content_hash=content_hash,
                            last_crawl_job_id=self.job_id
                        )
                        self.db.add(db_cont)
                        self.db.flush()
                        is_updated = True

                    job_link = LpnJobContainer(
                        crawl_job_id=self.job_id,
                        container_id=db_cont.id,
                        is_data_updated=is_updated
                    )
                    self.db.add(job_link)
                    self.db.commit()

                    # Xoá toàn bộ items/images cũ của container này trước khi lưu bộ items mới (ngăn chặn chèn trùng lặp)
                    self.db.query(LpnImage).filter(LpnImage.container_id == db_cont.id).delete()
                    self.db.query(LpnItem).filter(LpnItem.container_id == db_cont.id).delete()
                    self.db.commit()

                    # Lưu items & chuẩn bị image download tasks
                    image_tasks = []
                    c_sku = 0
                    for idx, item in enumerate(items_data, start=1):
                        db_item = LpnItem(
                            container_id=db_cont.id,
                            record_type=item["record_type"],
                            suffix_key=item["suffix_key"],
                            item_index=idx,
                            batch_original=item["batch_original"],
                            batch_resolved=item["batch_resolved"],
                            lpn=item["lpn"],
                            sku=item["sku"],
                            raw_group_key=item["raw_group_key"]
                        )
                        self.db.add(db_item)
                        self.db.flush()

                        if item.get("sku"):
                            c_sku += 1

                        for sort_idx, u in enumerate(item.get("image_urls", []), start=1):
                            image_tasks.append({
                                "source_url": u,
                                "container_number": db_cont.container_number,
                                "suffix_key": item["suffix_key"],
                                "sort_order": sort_idx,
                                "lpn_item_id": db_item.id,
                                "container_id": db_cont.id,
                                "image_type": item["record_type"]
                            })

                    # Tải ảnh song song có connection pooling và check cancellation
                    downloaded_imgs = 0
                    created_db_imgs = []
                    if image_tasks:
                        effective_workers = getattr(settings, "IMAGE_DOWNLOAD_WORKERS", 30)
                        img_results = download_images_parallel(
                            page, image_tasks,
                            max_workers=effective_workers,
                            job_id=self.job_id
                        )
                        for r in img_results:
                            db_img = LpnImage(
                                lpn_item_id=r.get("lpn_item_id"),
                                container_id=r.get("container_id"),
                                image_type=r.get("image_type", "Pallet"),
                                sort_order=r.get("sort_order", 1),
                                source_url=r.get("source_url"),
                                local_path=r.get("local_path"),
                                image_hash=r.get("image_hash"),
                                file_mime=r.get("file_mime"),
                                file_size=r.get("file_size", 0)
                            )
                            self.db.add(db_img)
                            created_db_imgs.append((db_img, r))
                            if r.get("local_path"):
                                downloaded_imgs += 1

                        seen_task_keys = {(r.get("lpn_item_id"), r.get("sort_order", 1)) for r in img_results}
                        for task in image_tasks:
                            t_key = (task.get("lpn_item_id"), task.get("sort_order", 1))
                            if t_key not in seen_task_keys:
                                db_img = LpnImage(
                                    lpn_item_id=task.get("lpn_item_id"),
                                    container_id=task.get("container_id"),
                                    image_type=task.get("image_type", "Pallet"),
                                    sort_order=task.get("sort_order", 1),
                                    source_url=task.get("source_url"),
                                    local_path=None,
                                    file_size=0
                                )
                                self.db.add(db_img)

                    self.db.flush()
                    queued_img_meta = []
                    for db_img_inst, r in created_db_imgs:
                        queued_img_meta.append({
                            "image_id": getattr(db_img_inst, "id", None),
                            "lpn_item_id": r.get("lpn_item_id"),
                            "local_path": r.get("local_path"),
                            "image_type": r.get("image_type", "Pallet")
                        })
                    self.db.commit()
                    self._enqueue_images_for_sync_ocr(queued_img_meta, items_data, c_num, image_tasks)

                    success_count += 1
                    total_items_count += len(items_data)
                    total_images_count += downloaded_imgs
                    total_sku_count += c_sku

                    job.containers_success = success_count
                    job.total_items_crawled = total_items_count
                    job.total_images_downloaded = total_images_count
                    self.db.commit()

                    if is_rehealing:
                        self.log(
                            f"[{processed_count + 1}/{display_total_q}] [BỔ SUNG THÀNH CÔNG] Hoàn tất cập nhật bổ sung: {c_num} | Items: {len(items_data)} | SKU: {c_sku} | Đã bù đắp: {downloaded_imgs}/{total_expected_pics} ảnh",
                            container_number=c_num,
                            level="SUCCESS"
                        )
                    else:
                        self.log(
                            f"[{processed_count + 1}/{display_total_q}] [LƯU MỚI THÀNH CÔNG] Hoàn tất container mới: {c_num} | Items: {len(items_data)} | SKU: {c_sku} | Ảnh: {downloaded_imgs}/{total_expected_pics}",
                            container_number=c_num,
                            level="SUCCESS"
                        )

                    if self.sse_callback:
                        try:
                            self.sse_callback({
                                "type": "data_updated",
                                "container_number": c_num,
                                "items_count": len(items_data),
                                "sku_count": c_sku,
                                "processed": processed_count + 1,
                                "total": total_q
                            })
                        except Exception:
                            pass

                    if c_num in recent_target_containers:
                        completed_recent_containers.add(c_num)

                    # Kiểm tra xem sau khi tải bù/cào xong container này thì 4 ngày gần nhất đã đủ hết 100% chưa
                    if self.mode == "incremental" and total_recent_target_count > 0:
                        curr_loading_date = header_data.get("date_loading")
                        is_recent_sync_done = False
                        if len(completed_recent_containers) >= total_recent_target_count:
                            is_recent_sync_done = True
                        elif curr_loading_date and cutoff_date and curr_loading_date < cutoff_date:
                            is_recent_sync_done = True

                        if is_recent_sync_done:
                            synced_n = len(completed_recent_containers)
                            if getattr(self, "auto_ocr", False):
                                stop_msg = (
                                    f"[HOÀN TẤT ĐỒNG BỘ 4 NGÀY GẦN NHẤT] Toàn bộ {synced_n}/{total_recent_target_count} tủ và ảnh của 4 ngày tải hàng gần nhất ({date_range_str}) "
                                    f"đã được cào và cập nhật đầy đủ 100% trong CSDL! Tự động chuyển ngay sang chế độ THƯỜNG TRỰC ĐỒNG BỘ THỜI GIAN THỰC (Real-time Listening 24/7)..."
                                )
                                self.log(stop_msg, level="SUCCESS")
                                break_to_realtime = True
                                break
                            else:
                                stop_msg = (
                                    f"[HOÀN TẤT ĐỒNG BỘ 4 NGÀY GẦN NHẤT] Toàn bộ {synced_n}/{total_recent_target_count} tủ và ảnh của 4 ngày tải hàng gần nhất ({date_range_str}) "
                                    f"đã có đầy đủ 100% trên hệ thống. Hoàn tất cập nhật!"
                                )
                                self.log(stop_msg, level="SUCCESS")
                                job.status = "completed"
                                job.error_message = stop_msg
                                job.end_time = datetime.utcnow()
                                self.db.commit()
                                if browser:
                                    try:
                                        browser.close()
                                    except Exception:
                                        pass
                                return True

                except Exception as row_err:
                    failed_count += 1
                    job.containers_failed = failed_count
                    self.db.commit()
                    self.log(f"Lỗi khi xử lý Container {c_num}: {row_err}", level="ERROR", container_number=c_num)

                processed_count += 1
                job.containers_processed = processed_count
                self.db.commit()
                try:
                    self.db.expunge_all()
                except Exception:
                    pass
                dur = max(0.001, time.time() - c_start_t)
                c_type = "heal" if is_rehealing else "new"
                self.record_container_time(dur, container_type=c_type, image_count=downloaded_imgs)
                self.send_progress(
                    c_num, "CRAWLING", processed_count, total_q,
                    total_items_count, total_images_count,
                    current_action=f"Đã xử lý {c_num} ({processed_count}/{total_q})",
                    sku_crawled=total_sku_count
                )

            # Luồng AI OCR tiếp tục chạy song song trong suốt thời gian đồng bộ
            if getattr(self, "auto_ocr", False) and hasattr(self, "ocr_queue"):
                q_size = self.ocr_queue.qsize()
                if q_size > 0:
                    self.log(f"Luồng AI OCR đang tiếp tục nhận diện {q_size} ảnh trong hàng đợi...", level="INFO")

            # Nếu đang ở chế độ Đồng bộ Thời gian thực (auto_ocr=True), KHÔNG kết thúc job mà chuyển sang vòng lặp THƯỜNG TRỰC LẮNG NGHE
            if getattr(self, "auto_ocr", False):
                if not break_to_realtime:
                    self.log(
                        f"Đã rà soát xong toàn bộ {total_q} Container hiện có! "
                        f"Hệ thống chuyển sang chế độ THƯỜNG TRỰC ĐỒNG BỘ THỜI GIAN THỰC (Đang lắng nghe container và ảnh mới từ AppSheet)...",
                        level="SUCCESS"
                    )
                self.send_progress(
                    "", "LISTENING", total_q, total_q,
                    total_items_count, total_images_count,
                    current_action="Đang thường trực đồng bộ thời gian thực (Sẵn sàng nhận dữ liệu mới)...",
                    sku_crawled=total_sku_count
                )

                poll_count = 0
                while not crawl_job_manager.is_cancelled(self.job_id):
                    poll_count += 1
                    # Chờ 25 giây giữa các chu kỳ thăm dò (kiểm tra dừng / tạm dừng mỗi giây)
                    for _ in range(25):
                        if crawl_job_manager.is_cancelled(self.job_id):
                            break
                        self.check_paused(page, "", "Đang tạm dừng chế độ thường trực đồng bộ")
                        time.sleep(1)

                    if crawl_job_manager.is_cancelled(self.job_id):
                        break

                    self.send_progress(
                        "", "LISTENING", total_q, total_q,
                        total_items_count, total_images_count,
                        current_action=f"Đang kiểm tra dữ liệu mới từ AppSheet (Chu kỳ #{poll_count})...",
                        sku_crawled=total_sku_count
                    )

                    try:
                        latest_payload = self.fetch_appsheet_template_api_direct(page, getattr(page, 'context', None), force_fresh=True)
                        if not latest_payload:
                            continue
                        latest_containers = process_template_nested_datasets(latest_payload, app_name=self.app_name, table_name=self.table_name)
                        if not latest_containers:
                            continue

                        self.log(
                            f"[REAL-TIME LISTENING #{poll_count}] Đang trích xuất và đối soát {len(latest_containers)} container từ AppSheet Template API...",
                            level="INFO"
                        )

                        sorted_latest = sorted(
                            latest_containers.items(),
                            key=lambda itm: (itm[1]["header"].get("date_loading") or date.min, itm[1]["header"].get("timestamp_val") or datetime.min),
                            reverse=True
                        )

                        consecutive_synced_rt = 0
                        found_new = False
                        for c_num_new, c_data_new in sorted_latest:
                            if crawl_job_manager.is_cancelled(self.job_id):
                                break

                            c_h = c_data_new["header"]
                            c_its = c_data_new["items"]
                            c_fp = c_h["record_fingerprint"]
                            c_hsh = c_h["content_hash"]

                            db_c = self.db.query(LpnContainer).filter(
                                (LpnContainer.record_fingerprint == c_fp) | (LpnContainer.container_number == c_num_new)
                            ).first()

                            tot_pics = sum(len(itm.get("image_urls", [])) for itm in c_its)
                            ex_pics = 0
                            if db_c:
                                ex_pics = self.db.query(LpnImage).filter(
                                    LpnImage.container_id == db_c.id,
                                    LpnImage.local_path.isnot(None),
                                    LpnImage.local_path != 'None',
                                    LpnImage.local_path != ''
                                ).count()

                            c_complete = bool(db_c and db_c.content_hash == c_hsh and (ex_pics >= tot_pics if tot_pics > 0 else True))
                            if c_complete:
                                consecutive_synced_rt += 1
                                if consecutive_synced_rt >= 10:
                                    # Đã gặp 10 container liên tiếp đã đồng bộ đầy đủ, các container cũ hơn không thay đổi
                                    break
                            else:
                                consecutive_synced_rt = 0
                                found_new = True
                                self.log(f"[PHÁT HIỆN DỮ LIỆU MỚI] Container '{c_num_new}'! Đang tải dữ liệu và bóc tách AI OCR...", level="SUCCESS", container_number=c_num_new)

                                if db_c:
                                    db_c.last_seen_at = datetime.utcnow()
                                    db_c.last_crawl_job_id = self.job_id
                                    db_c.crawl_count = (db_c.crawl_count or 1) + 1
                                    db_c.content_hash = c_hsh
                                    db_c.record_fingerprint = c_fp
                                else:
                                    db_c = LpnContainer(
                                        record_fingerprint=c_fp,
                                        container_number=c_h["container_number"],
                                        factory=c_h["factory"],
                                        date_loading_raw=c_h["date_loading_raw"],
                                        date_loading=c_h["date_loading"],
                                        timestamp_raw=c_h["timestamp_raw"],
                                        timestamp_val=c_h["timestamp_val"],
                                        operator_name=c_h["operator_name"],
                                        content_hash=c_hsh,
                                        last_crawl_job_id=self.job_id
                                    )
                                    self.db.add(db_c)
                                self.db.flush()

                                self.db.query(LpnImage).filter(LpnImage.container_id == db_c.id).delete()
                                self.db.query(LpnItem).filter(LpnItem.container_id == db_c.id).delete()
                                self.db.commit()

                                c_sku_new = 0
                                new_img_tasks = []
                                for idx, itm in enumerate(c_its, start=1):
                                    db_item = LpnItem(
                                        container_id=db_c.id,
                                        record_type=itm["record_type"],
                                        suffix_key=itm["suffix_key"],
                                        item_index=idx,
                                        batch_original=itm["batch_original"],
                                        batch_resolved=itm["batch_resolved"],
                                        lpn=itm["lpn"],
                                        sku=itm["sku"],
                                        raw_group_key=itm["raw_group_key"]
                                    )
                                    self.db.add(db_item)
                                    self.db.flush()
                                    if itm.get("sku"):
                                        c_sku_new += 1
                                    for sort_idx, u in enumerate(itm.get("image_urls", []), start=1):
                                        new_img_tasks.append({
                                            "source_url": u,
                                            "container_number": db_c.container_number,
                                            "suffix_key": itm["suffix_key"],
                                            "sort_order": sort_idx,
                                            "lpn_item_id": db_item.id,
                                            "container_id": db_c.id,
                                            "image_type": itm["record_type"]
                                        })

                                downloaded_n = 0
                                if new_img_tasks:
                                    img_results = download_images_parallel(page, new_img_tasks, max_workers=getattr(settings, "IMAGE_DOWNLOAD_WORKERS", 30), job_id=self.job_id)
                                    queued_meta = []
                                    for r in img_results:
                                        db_img = LpnImage(
                                            lpn_item_id=r.get("lpn_item_id"),
                                            container_id=r.get("container_id"),
                                            image_type=r.get("image_type", "Pallet"),
                                            sort_order=r.get("sort_order", 1),
                                            source_url=r.get("source_url"),
                                            local_path=r.get("local_path"),
                                            image_hash=r.get("image_hash"),
                                            file_mime=r.get("file_mime"),
                                            file_size=r.get("file_size", 0)
                                        )
                                        self.db.add(db_img)
                                        self.db.flush()
                                        if r.get("local_path"):
                                            downloaded_n += 1
                                        queued_meta.append({
                                            "image_id": db_img.id,
                                            "lpn_item_id": r.get("lpn_item_id"),
                                            "local_path": r.get("local_path"),
                                            "image_type": r.get("image_type", "Pallet")
                                        })
                                    self.db.commit()
                                    self._enqueue_images_for_sync_ocr(queued_meta, c_its, c_num_new, new_img_tasks)

                                success_count += 1
                                total_images_count += downloaded_n
                                total_items_count += len(c_its)
                                total_sku_count += c_sku_new
                                job.containers_success = success_count
                                job.total_images_downloaded = total_images_count
                                self.db.commit()

                                if self.sse_callback:
                                    try:
                                        self.sse_callback({
                                            "type": "data_updated",
                                            "container_number": c_num_new,
                                            "items_count": len(c_its),
                                            "sku_count": c_sku_new,
                                            "processed": processed_count,
                                            "total": total_q
                                        })
                                    except Exception:
                                        pass

                        if not found_new:
                            now_time_str = datetime.now().strftime("%H:%M:%S")
                            self.log(
                                f"[{now_time_str}] [CHU KỲ #{poll_count} HOÀN TẤT] Đã đối soát {len(latest_containers)} container từ AppSheet -> Toàn bộ dữ liệu 100% đã đồng bộ (Chưa có container/ảnh mới). Sẽ rà soát lại sau 25s...",
                                level="INFO"
                            )
                            self.send_progress(
                                "", "LISTENING", total_q, total_q,
                                total_items_count, total_images_count,
                                current_action=f"Đã đối soát {len(latest_containers)} container lúc {now_time_str} (Khớp 100% CSDL). Sẽ kiểm tra lại sau 25s...",
                                sku_crawled=total_sku_count
                            )
                    except Exception as poll_e:
                        self.log(f"Lỗi khi thăm dò chu kỳ #{poll_count}: {poll_e}", level="WARNING")

                # Khi người dùng bấm Dừng Đồng Bộ (Cancelled by user)
                job.status = "cancelled"
                job.end_time = datetime.utcnow()
                self.db.commit()
                self.log(f"Đã dừng chế độ đồng bộ thời gian thực theo yêu cầu người dùng (Job #{self.job_id}).", level="INFO")
                if browser:
                    try:
                        browser.close()
                    except Exception:
                        pass
                return True

            # Hoàn tất Fast-Path thông thường (không phải Sync Mode)
            job.status = "completed_with_errors" if failed_count > 0 else "completed"
            job.end_time = datetime.utcnow()
            self.db.commit()
            skip_count = max(0, processed_count - success_count - failed_count)
            self.log(f"Job #{self.job_id} hoàn tất! Đã lưu mới/bổ sung: {success_count}, Đã có sẵn (Bỏ qua): {skip_count}, Lỗi: {failed_count} (Tổng: {total_q} Container).", level="SUCCESS")
            self.send_progress(
                "", "COMPLETED", total_q, total_q,
                total_items_count, total_images_count,
                current_action=f"Hoàn tất quét dữ liệu! Đã kiểm tra toàn bộ {total_q} container. Lưu mới: {success_count}, Bỏ qua: {skip_count}.",
                sku_crawled=total_sku_count
            )
            if getattr(self, "sse_callback", None):
                try:
                    self.sse_callback({
                        "type": "status",
                        "status": job.status,
                        "job_id": self.job_id
                    })
                except Exception:
                    pass

            if browser:
                try:
                    browser.close()
                except Exception:
                    pass
            return True

        except Exception as fast_err:
            self.log(f"Lỗi trong quá trình thực thi Fast-Path: {fast_err}", level="ERROR")
            return False

    def crawl_all_from_api_payload(self, page: Page, browser: Any, job: LpnCrawlJob) -> bool:
        """
        Fast-Path: Xử lý trực tiếp toàn bộ dữ liệu từ AppSheet API JSON payload,
        kết hợp tải ảnh đa luồng song song.
        """
        try:
            self.active_crawl_mode = "Fast-Path (Network Hook)"
            # 1. Gom nhóm các bản ghi theo Container Number (Hỗ trợ cả bảng ngang và bảng dọc nhiều dòng/container)
            containers_map: Dict[str, Dict[str, Any]] = {}
            for row in self.captured_api_rows:
                c_num = ""
                for k, v in row.items():
                    k_lower = str(k).lower().strip()
                    if k_lower in ("container number", "containernumber", "container_number", "so container", "container #", "container"):
                        c_num = str(v).strip().upper()
                        break
                if not c_num:
                    continue
                if c_num not in containers_map:
                    containers_map[c_num] = {}
                
                # Merge các fields cho cùng container (không bị ghi đè mất dữ liệu)
                for fk, fv in row.items():
                    if fv is not None and str(fv).strip():
                        # Nếu là trường Picture và đã có trong dict -> gộp danh sách URL
                        if str(fk).lower().startswith("picture") and fk in containers_map[c_num]:
                            existing_val = containers_map[c_num][fk]
                            if isinstance(existing_val, list):
                                if isinstance(fv, list):
                                    existing_val.extend([x for x in fv if x not in existing_val])
                                elif fv not in existing_val:
                                    existing_val.append(fv)
                            else:
                                containers_map[c_num][fk] = [existing_val, fv] if existing_val != fv else existing_val
                        else:
                            containers_map[c_num][fk] = fv

            if not containers_map:
                self.log("Không tìm thấy Container hợp lệ trong dữ liệu API, chuyển sang chế độ quét UI...", level="WARNING")
                return False

            total_q = len(containers_map)
            job.total_containers_found = total_q
            self.db.commit()
            self.log(f"Fast-Path: Đã phát hiện tổng cộng {total_q} Container trong dữ liệu AppSheet.")

            processed_count = 0
            success_count = 0
            failed_count = 0
            total_items_count = 0
            total_images_count = 0
            total_sku_count = 0
            consecutive_duplicate_count = 0
            last_activity_time = time.time()
            freeze_retry_done = False
            break_to_realtime_api = False

            # Sắp xếp container theo date_loading mới nhất trước
            sorted_api_containers = []
            for c_n, r_row in containers_map.items():
                p_data = process_api_row_data(r_row, app_name=self.app_name, table_name=self.table_name)
                sorted_api_containers.append((c_n, r_row, p_data))

            sorted_api_containers.sort(
                key=lambda itm: (itm[2]["header"].get("date_loading") or date.min, itm[2]["header"].get("timestamp_val") or datetime.min),
                reverse=True
            )

            distinct_loading_dates_api = []
            for _, _, pdata in sorted_api_containers:
                d = pdata["header"].get("date_loading")
                if d and d not in distinct_loading_dates_api:
                    distinct_loading_dates_api.append(d)

            target_recent_days_api = 4
            if len(distinct_loading_dates_api) >= target_recent_days_api:
                recent_dates_api = set(distinct_loading_dates_api[:target_recent_days_api])
                cutoff_date_api = distinct_loading_dates_api[target_recent_days_api - 1]
                date_range_str_api = f"{cutoff_date_api.strftime('%d/%m/%Y')} -> {distinct_loading_dates_api[0].strftime('%d/%m/%Y')}"
            elif distinct_loading_dates_api:
                recent_dates_api = set(distinct_loading_dates_api)
                cutoff_date_api = distinct_loading_dates_api[-1]
                date_range_str_api = f"toàn bộ {len(distinct_loading_dates_api)} ngày có sẵn ({cutoff_date_api.strftime('%d/%m/%Y')} -> {distinct_loading_dates_api[0].strftime('%d/%m/%Y')})"
            else:
                recent_dates_api = set()
                cutoff_date_api = None
                date_range_str_api = "không xác định"

            recent_target_containers_api = set()
            if recent_dates_api:
                for c_n, _, pdata in sorted_api_containers:
                    d = pdata["header"].get("date_loading")
                    if d in recent_dates_api:
                        recent_target_containers_api.add(c_n)

            total_recent_target_count_api = len(recent_target_containers_api)
            completed_recent_containers_api = set()
            seen_consecutive_unique_containers_api = set()

            if self.mode == "incremental" and total_recent_target_count_api > 0:
                display_total_q = total_recent_target_count_api
                job.total_containers_found = display_total_q
                self.db.commit()
            else:
                display_total_q = total_q

            if self.mode == "incremental":
                if total_recent_target_count_api > 0:
                    self.log(
                        f"[ĐỒNG BỘ CẬP NHẬT 4 NGÀY GẦN NHẤT] Bắt đầu rà soát dữ liệu 4 ngày tải hàng gần nhất ({date_range_str_api}) "
                        f"gồm {total_recent_target_count_api} tủ (container)...",
                        level="INFO"
                    )

            for c_num, raw_row, parsed_data in sorted_api_containers:
                c_start_t = time.time()
                if crawl_job_manager.is_cancelled(self.job_id):
                    self.log("Nhận được tín hiệu HỦY JOB (Cancelled by user).", level="WARNING")
                    job.status = "cancelled"
                    job.end_time = datetime.utcnow()
                    self.db.commit()
                    if browser:
                        try:
                            browser.close()
                        except Exception:
                            pass
                    return True

                # Cơ chế Watchdog giám sát đứng mạng 15 phút (Freeze Watchdog)
                if (time.time() - last_activity_time) > 900:
                    if not freeze_retry_done:
                        freeze_retry_done = True
                        last_activity_time = time.time()
                        self.log("[CẢNH BÁO WATCHDOG] Phát hiện tiến trình bị đứng quá 15 phút. Đang tự động thử kết nối lại Fast-Path API 1 lần...", level="WARNING")
                    else:
                        stop_fail_msg = "Tiến trình cào đã bị dừng hoàn toàn do kết nối mạng/máy chủ bị đứng quá 15 phút sau khi thử lại."
                        self.log(stop_fail_msg, level="ERROR")
                        job.status = "failed"
                        job.error_message = stop_fail_msg
                        job.end_time = datetime.utcnow()
                        self.db.commit()
                        self.send_progress("", "FAILED", processed_count, total_q, total_items_count, total_images_count, current_action=stop_fail_msg)
                        if browser:
                            try:
                                browser.close()
                            except Exception:
                                pass
                        return False

                last_activity_time = time.time()

                self.check_paused(page, c_num, "Đang xử lý container")

                try:
                    header_data = parsed_data["header"]
                    items_data = parsed_data["items"]

                    if not header_data.get("container_number"):
                        header_data["container_number"] = c_num

                    fingerprint = header_data["record_fingerprint"]
                    content_hash = header_data["content_hash"]

                    # Kiểm tra trùng lặp
                    existing_cont = None
                    for retry_i in range(3):
                        try:
                            existing_cont = self.db.query(LpnContainer).filter(
                                (LpnContainer.record_fingerprint == fingerprint) | (LpnContainer.container_number == c_num)
                            ).first()
                            break
                        except Exception:
                            self.db.rollback()
                            time.sleep(0.1)

                    existing_img_count = 0
                    if existing_cont:
                        try:
                            existing_img_count = self.db.query(LpnImage).filter(
                                LpnImage.container_id == existing_cont.id,
                                LpnImage.local_path.isnot(None),
                                LpnImage.local_path != 'None',
                                LpnImage.local_path != ''
                            ).count()
                        except Exception:
                            existing_img_count = 0

                    total_expected_pics = sum(len(itm.get("image_urls", [])) for itm in items_data)
                    has_all_images = (existing_img_count >= total_expected_pics) if total_expected_pics > 0 else True
                    is_truly_complete = bool(existing_cont and existing_cont.content_hash == content_hash and has_all_images)

                    if is_truly_complete:
                        processed_count += 1
                        job.containers_processed = processed_count
                        self.db.commit()
                        skip_sku = sum(1 for itm in items_data if itm.get("sku"))
                        total_sku_count += skip_sku
                        total_items_count += len(items_data)
                        total_images_count += existing_img_count
                        dur = max(0.001, time.time() - c_start_t)
                        self.record_container_time(dur, container_type="skip")

                        tot_items_n = len(items_data)
                        missing_pics_n = max(0, tot_items_n - existing_img_count)
                        if missing_pics_n > 0:
                            prefix_tag = f"[NGUỒN THIẾU {missing_pics_n} ẢNH]"
                            status_note = f"Có {existing_img_count}/{tot_items_n} ảnh theo kiện (Nguồn AppSheet để trống {missing_pics_n} ảnh)"
                        else:
                            prefix_tag = "[ĐÃ ĐỦ 100%]"
                            status_note = f"Đã đủ {existing_img_count}/{tot_items_n} ảnh theo kiện"

                        if self.mode == "incremental":
                            if c_num in recent_target_containers_api:
                                completed_recent_containers_api.add(c_num)
                            seen_consecutive_unique_containers_api.add(c_num)

                            curr_loading_date = header_data.get("date_loading")
                            is_recent_sync_done = False
                            if total_recent_target_count_api > 0:
                                if len(completed_recent_containers_api) >= total_recent_target_count_api:
                                    is_recent_sync_done = True
                                elif curr_loading_date and cutoff_date_api and curr_loading_date < cutoff_date_api:
                                    is_recent_sync_done = True

                            if is_recent_sync_done:
                                synced_n = len(completed_recent_containers_api)
                                if getattr(self, "auto_ocr", False):
                                    stop_msg = (
                                        f"[HOÀN TẤT ĐỒNG BỘ 4 NGÀY GẦN NHẤT] Toàn bộ {synced_n}/{total_recent_target_count_api} tủ và ảnh của 4 ngày tải hàng gần nhất ({date_range_str_api}) "
                                        f"đã được rà soát và có đầy đủ 100% trong CSDL! Tự động chuyển ngay sang chế độ THƯỜNG TRỰC ĐỒNG BỘ THỜI GIAN THỰC (Real-time Listening 24/7)..."
                                    )
                                    self.log(stop_msg, level="SUCCESS")
                                    break_to_realtime_api = True
                                    break
                                else:
                                    stop_msg = (
                                        f"[HOÀN TẤT ĐỒNG BỘ 4 NGÀY GẦN NHẤT] Toàn bộ {synced_n}/{total_recent_target_count_api} tủ và ảnh của 4 ngày tải hàng gần nhất ({date_range_str_api}) "
                                        f"đã có đầy đủ 100% trên hệ thống. Hoàn tất cập nhật!"
                                    )
                                    self.log(stop_msg, level="SUCCESS")
                                    job.status = "completed"
                                    job.error_message = stop_msg
                                    job.end_time = datetime.utcnow()
                                    self.db.commit()
                                    if browser:
                                        try:
                                            browser.close()
                                        except Exception:
                                            pass
                                    return True

                            if total_recent_target_count_api == 0 and len(seen_consecutive_unique_containers_api) >= 5:
                                if getattr(self, "auto_ocr", False):
                                    stop_msg = f"[HOÀN TẤT ĐỒNG BỘ CẬP NHẬT] Đã rà soát 5 tủ khác nhau liên tiếp ({c_num}) đã có đầy đủ 100% trong CSDL. Tự động chuyển ngay sang chế độ THƯỜNG TRỰC ĐỒNG BỘ THỜI GIAN THỰC..."
                                    self.log(stop_msg, level="SUCCESS")
                                    break_to_realtime_api = True
                                    break
                                else:
                                    stop_msg = f"Dữ liệu đã có trên hệ thống! Đã quét đến vùng dữ liệu cũ ({c_num}). Hoàn tất cập nhật."
                                    self.log(stop_msg, level="SUCCESS")
                                    job.status = "completed"
                                    job.error_message = stop_msg
                                    job.end_time = datetime.utcnow()
                                    self.db.commit()
                                    if browser:
                                        try:
                                            browser.close()
                                        except Exception:
                                            pass
                                    return True

                            if total_recent_target_count_api > 0:
                                self.log(
                                    f"[{processed_count}/{total_q}] {prefix_tag} Container '{c_num}' ({status_note}). "
                                    f"Tiến độ 4 ngày gần nhất: {len(completed_recent_containers_api)}/{total_recent_target_count_api} tủ đã đủ.",
                                    container_number=c_num,
                                    level="SKIP"
                                )
                            else:
                                self.log(
                                    f"[{processed_count}/{total_q}] {prefix_tag} Container '{c_num}' ({status_note}). Bỏ qua (Trùng #{len(seen_consecutive_unique_containers_api)}/5 tủ khác nhau).",
                                    container_number=c_num,
                                    level="SKIP"
                                )
                            continue
                        else:
                            # Chế độ Đồng bộ (auto_ocr=True) trong Full Mode: Kiểm tra xem container đã có sẵn nhưng có ảnh nào CHƯA QUÉT OCR không
                            if getattr(self, "auto_ocr", False) and hasattr(self, "ocr_queue"):
                                wait_start_ocr = time.time()
                                while hasattr(self, "ocr_queue") and self.ocr_queue.qsize() > 25:
                                    if crawl_job_manager.is_cancelled(self.job_id):
                                        break
                                    self.check_paused(page, c_num, "Chờ giải phóng hàng đợi AI OCR")
                                    last_activity_time = time.time()
                                    if time.time() - wait_start_ocr > 15:
                                        self.log(f"[AI OCR Queue] Hàng đợi đang bận ({self.ocr_queue.qsize()} ảnh). Tiếp tục xử lý container để chống nghẽn luồng...", level="INFO")
                                        break
                                    self.send_progress(
                                        c_num, "CRAWLING", processed_count, total_q,
                                        total_items_count, total_images_count,
                                        current_action=f"Đang bóc tách AI OCR ({self.ocr_queue.qsize()} ảnh trong hàng đợi)...",
                                        sku_crawled=total_sku_count
                                    )
                                    time.sleep(1.0)

                                unscanned_imgs = self.db.query(LpnImage, LpnItem).join(
                                    LpnItem, LpnImage.lpn_item_id == LpnItem.id
                                ).outerjoin(
                                    LpnAiOcrResult, LpnAiOcrResult.image_id == LpnImage.id
                                ).filter(
                                    LpnImage.container_id == existing_cont.id,
                                    LpnImage.local_path.isnot(None),
                                    LpnImage.local_path != 'None',
                                    LpnImage.local_path != '',
                                    LpnAiOcrResult.id.is_(None)
                                ).all()

                                if unscanned_imgs:
                                    q_now = self.ocr_queue.qsize() if hasattr(self, "ocr_queue") else 0
                                    self.log(
                                        f"[{processed_count}/{total_q}] [ĐÃ CÓ DỮ LIỆU] Xếp vào hàng đợi AI OCR: Container '{c_num}' ({len(unscanned_imgs)} ảnh). Hàng đợi: ~{q_now + len(unscanned_imgs)} ảnh chờ xử lý.",
                                        container_number=c_num,
                                        level="INFO"
                                    )
                                    total_u = len(unscanned_imgs)
                                    for u_idx, (img_obj, itm_obj) in enumerate(unscanned_imgs, 1):
                                        self.ocr_queue.put({
                                            "image_id": img_obj.id,
                                            "lpn_item_id": itm_obj.id,
                                            "container_number": c_num,
                                            "local_path": img_obj.local_path,
                                            "image_type": img_obj.image_type or "Pallet",
                                            "expected_lpn": itm_obj.lpn,
                                            "expected_sku": itm_obj.sku,
                                            "suffix_key": itm_obj.suffix_key,
                                            "container_img_idx": u_idx,
                                            "container_img_total": total_u,
                                            "container_total_items": total_u
                                        })
                                    self.send_progress(
                                        c_num, "CRAWLING", processed_count, total_q,
                                        total_items_count, total_images_count,
                                        current_action=f"[BỔ SUNG OCR] {c_num} ({len(unscanned_imgs)} ảnh chưa quét)",
                                        sku_crawled=total_sku_count
                                    )
                                    continue

                            # Nếu đã có đủ dữ liệu VÀ toàn bộ ảnh đều đã được quét OCR rồi -> Bỏ qua
                            if processed_count % 15 == 0 or processed_count == total_q or consecutive_duplicate_count <= 1:
                                self.log(
                                    f"[{processed_count}/{total_q}] [ĐÃ CÓ TRONG DB & ĐÃ QUÉT ĐỦ] Container '{c_num}' ({status_note}). Bỏ qua.",
                                    container_number=c_num,
                                    level="SKIP"
                                )
                            self.send_progress(
                                c_num, "CRAWLING", processed_count, total_q,
                                total_items_count, total_images_count,
                                current_action=f"[ĐÃ CÓ SẴN & ĐỦ OCR] {c_num} ({status_note})",
                                sku_crawled=total_sku_count
                            )
                            continue

                    consecutive_duplicate_count = 0
                    seen_consecutive_unique_containers_api.clear()

                    is_rehealing = bool(existing_cont)
                    if is_rehealing:
                        missing_img_n = max(0, total_expected_pics - existing_img_count)
                        self.log(
                            f"[{processed_count + 1}/{display_total_q}] [CŨ - BỔ SUNG DỮ LIỆU] Container '{c_num}' đã có trong DB nhưng thiếu {missing_img_n} ảnh. Đang tự động bù đắp...",
                            container_number=c_num,
                            level="RECOVERY"
                        )
                        action_msg = f"Đang bổ sung {missing_img_n} ảnh: {c_num} ({processed_count + 1}/{display_total_q})"
                    else:
                        self.log(
                            f"[{processed_count + 1}/{display_total_q}] [CONTAINER MỚI] Phát hiện Container mới '{c_num}' (chưa có trong DB). Bắt đầu cào dữ liệu và tải {total_expected_pics} ảnh...",
                            container_number=c_num
                        )
                        action_msg = f"Đang tải {total_expected_pics} ảnh mới: {c_num} ({processed_count + 1}/{display_total_q})"

                    # Cập nhật ngay lập tức lên giao diện để hiển thị đúng Container và trạng thái Đang tải ảnh
                    self.send_progress(
                        c_num, "CRAWLING", processed_count, display_total_q,
                        total_items_count, total_images_count,
                        current_action=action_msg,
                        sku_crawled=total_sku_count,
                        is_active_download=True
                    )

                    # Lưu hoặc cập nhật LpnContainer
                    db_cont = self.db.query(LpnContainer).filter(
                        (LpnContainer.record_fingerprint == fingerprint) | (LpnContainer.container_number == c_num)
                    ).first()
                    is_updated = False

                    if db_cont:
                        db_cont.last_seen_at = datetime.utcnow()
                        db_cont.last_crawl_job_id = self.job_id
                        db_cont.crawl_count = (db_cont.crawl_count or 1) + 1
                        if db_cont.content_hash != content_hash or db_cont.record_fingerprint != fingerprint:
                            db_cont.record_fingerprint = fingerprint
                            db_cont.content_hash = content_hash
                            db_cont.factory = header_data["factory"]
                            db_cont.date_loading_raw = header_data["date_loading_raw"]
                            db_cont.date_loading = header_data["date_loading"]
                            db_cont.timestamp_raw = header_data["timestamp_raw"]
                            db_cont.timestamp_val = header_data["timestamp_val"]
                            db_cont.operator_name = header_data["operator_name"]
                            is_updated = True
                    else:
                        db_cont = LpnContainer(
                            record_fingerprint=fingerprint,
                            container_number=header_data["container_number"],
                            factory=header_data["factory"],
                            date_loading_raw=header_data["date_loading_raw"],
                            date_loading=header_data["date_loading"],
                            timestamp_raw=header_data["timestamp_raw"],
                            timestamp_val=header_data["timestamp_val"],
                            operator_name=header_data["operator_name"],
                            content_hash=content_hash,
                            last_crawl_job_id=self.job_id
                        )
                        self.db.add(db_cont)
                        self.db.flush()
                        is_updated = True

                    job_link = LpnJobContainer(
                        crawl_job_id=self.job_id,
                        container_id=db_cont.id,
                        is_data_updated=is_updated
                    )
                    self.db.add(job_link)
                    self.db.commit()

                    # Xoá toàn bộ items/images cũ của container này trước khi lưu bộ items mới (ngăn chặn chèn trùng lặp)
                    self.db.query(LpnImage).filter(LpnImage.container_id == db_cont.id).delete()
                    self.db.query(LpnItem).filter(LpnItem.container_id == db_cont.id).delete()
                    self.db.commit()

                    # Lưu items & chuẩn bị tasks tải ảnh song song
                    image_tasks = []
                    c_sku = 0
                    for idx, item in enumerate(items_data, start=1):
                        db_item = LpnItem(
                            container_id=db_cont.id,
                            record_type=item["record_type"],
                            suffix_key=item["suffix_key"],
                            item_index=idx,
                            batch_original=item["batch_original"],
                            batch_resolved=item["batch_resolved"],
                            lpn=item["lpn"],
                            sku=item["sku"],
                            raw_group_key=item["raw_group_key"]
                        )
                        self.db.add(db_item)
                        self.db.flush()

                        if item.get("sku"):
                            c_sku += 1

                        for sort_idx, u in enumerate(item.get("image_urls", []), start=1):
                            image_tasks.append({
                                "source_url": u,
                                "container_number": db_cont.container_number,
                                "suffix_key": item["suffix_key"],
                                "sort_order": sort_idx,
                                "lpn_item_id": db_item.id,
                                "container_id": db_cont.id,
                                "image_type": item["record_type"]
                            })

                    # Tải ảnh song song
                    downloaded_imgs = 0
                    created_db_imgs = []
                    if image_tasks:
                        effective_workers = getattr(settings, "IMAGE_DOWNLOAD_WORKERS", 30)
                        img_results = download_images_parallel(
                            page, image_tasks,
                            max_workers=effective_workers,
                            job_id=self.job_id
                        )
                        for r in img_results:
                            db_img = LpnImage(
                                lpn_item_id=r.get("lpn_item_id"),
                                container_id=r.get("container_id"),
                                image_type=r.get("image_type", "Pallet"),
                                sort_order=r.get("sort_order", 1),
                                source_url=r.get("source_url"),
                                local_path=r.get("local_path"),
                                image_hash=r.get("image_hash"),
                                file_mime=r.get("file_mime"),
                                file_size=r.get("file_size", 0)
                            )
                            self.db.add(db_img)
                            created_db_imgs.append((db_img, r))
                            if r.get("local_path"):
                                downloaded_imgs += 1

                    self.db.flush()
                    queued_img_meta = []
                    for db_img_inst, r in created_db_imgs:
                        queued_img_meta.append({
                            "image_id": getattr(db_img_inst, "id", None),
                            "lpn_item_id": r.get("lpn_item_id"),
                            "local_path": r.get("local_path"),
                            "image_type": r.get("image_type", "Pallet")
                        })
                    self.db.commit()
                    self._enqueue_images_for_sync_ocr(queued_img_meta, items_data, c_num, image_tasks)

                    success_count += 1
                    total_items_count += len(items_data)
                    total_images_count += downloaded_imgs
                    total_sku_count += c_sku

                    job.containers_success = success_count
                    job.total_items_crawled = total_items_count
                    job.total_images_downloaded = total_images_count
                    self.db.commit()

                    if is_rehealing:
                        self.log(
                            f"[{processed_count + 1}/{display_total_q}] [BỔ SUNG THÀNH CÔNG] Hoàn tất cập nhật bổ sung: {c_num} | Items: {len(items_data)} | SKU: {c_sku} | Đã bù đắp: {downloaded_imgs}/{total_expected_pics} ảnh",
                            container_number=c_num,
                            level="SUCCESS"
                        )
                    else:
                        self.log(
                            f"[{processed_count + 1}/{display_total_q}] [LƯU MỚI THÀNH CÔNG] Hoàn tất container mới: {c_num} | Items: {len(items_data)} | SKU: {c_sku} | Ảnh: {downloaded_imgs}/{total_expected_pics}",
                            container_number=c_num,
                            level="SUCCESS"
                        )

                    if c_num in recent_target_containers_api:
                        completed_recent_containers_api.add(c_num)

                    if self.mode == "incremental" and total_recent_target_count_api > 0:
                        curr_loading_date = header_data.get("date_loading")
                        is_recent_sync_done = False
                        if len(completed_recent_containers_api) >= total_recent_target_count_api:
                            is_recent_sync_done = True
                        elif curr_loading_date and cutoff_date_api and curr_loading_date < cutoff_date_api:
                            is_recent_sync_done = True

                        if is_recent_sync_done:
                            synced_n = len(completed_recent_containers_api)
                            if getattr(self, "auto_ocr", False):
                                stop_msg = (
                                    f"[HOÀN TẤT ĐỒNG BỘ 4 NGÀY GẦN NHẤT] Toàn bộ {synced_n}/{total_recent_target_count_api} tủ và ảnh của 4 ngày tải hàng gần nhất ({date_range_str_api}) "
                                    f"đã được cào và cập nhật đầy đủ 100% trong CSDL! Tự động chuyển ngay sang chế độ THƯỜNG TRỰC ĐỒNG BỘ THỜI GIAN THỰC (Real-time Listening 24/7)..."
                                )
                                self.log(stop_msg, level="SUCCESS")
                                break_to_realtime_api = True
                                break
                            else:
                                stop_msg = (
                                    f"[HOÀN TẤT ĐỒNG BỘ 4 NGÀY GẦN NHẤT] Toàn bộ {synced_n}/{total_recent_target_count_api} tủ và ảnh của 4 ngày tải hàng gần nhất ({date_range_str_api}) "
                                    f"đã có đầy đủ 100% trên hệ thống. Hoàn tất cập nhật!"
                                )
                                self.log(stop_msg, level="SUCCESS")
                                job.status = "completed"
                                job.error_message = stop_msg
                                job.end_time = datetime.utcnow()
                                self.db.commit()
                                if browser:
                                    try:
                                        browser.close()
                                    except Exception:
                                        pass
                                return True

                except Exception as row_err:
                    failed_count += 1
                    job.containers_failed = failed_count
                    self.db.commit()
                    self.log(f"Lỗi khi xử lý Container {c_num}: {row_err}", level="ERROR", container_number=c_num)

                processed_count += 1
                job.containers_processed = processed_count
                self.db.commit()
                dur = max(0.001, time.time() - c_start_t)
                c_type = "heal" if is_rehealing else "new"
                self.record_container_time(dur, container_type=c_type, image_count=downloaded_imgs)
                self.send_progress(
                    c_num, "CRAWLING", processed_count, total_q,
                    total_items_count, total_images_count,
                    current_action=f"Đã xử lý {c_num} ({processed_count}/{total_q})",
                    sku_crawled=total_sku_count
                )

            # Luồng AI OCR tiếp tục chạy song song trong suốt thời gian đồng bộ
            if getattr(self, "auto_ocr", False) and hasattr(self, "ocr_queue"):
                q_size = self.ocr_queue.qsize()
                if q_size > 0:
                    self.log(f"Luồng AI OCR đang tiếp tục nhận diện {q_size} ảnh trong hàng đợi...", level="INFO")

            # Hoàn tất Fast-Path
            job.status = "completed_with_errors" if failed_count > 0 else "completed"
            job.end_time = datetime.utcnow()
            self.db.commit()
            skip_count = max(0, processed_count - success_count - failed_count)
            self.log(f"Job #{self.job_id} hoàn tất! Đã lưu mới/bổ sung: {success_count}, Đã có sẵn (Bỏ qua): {skip_count}, Lỗi: {failed_count} (Tổng: {total_q} Container).", level="SUCCESS")
            self.send_progress(
                "", "COMPLETED", total_q, total_q,
                total_items_count, total_images_count,
                current_action=f"Hoàn tất đồng bộ! Đã kiểm tra toàn bộ {total_q} container. Lưu mới: {success_count}, Bỏ qua: {skip_count}.",
                sku_crawled=total_sku_count
            )
            if getattr(self, "sse_callback", None):
                try:
                    self.sse_callback({
                        "type": "status",
                        "status": job.status,
                        "job_id": self.job_id
                    })
                except Exception:
                    pass

            if browser:
                try:
                    browser.close()
                except Exception:
                    pass
            return True

        except Exception as e:
            self.log(f"Lỗi trong Fast-Path ({e}), chuyển sang Fallback UI...", level="WARNING")
            return False
