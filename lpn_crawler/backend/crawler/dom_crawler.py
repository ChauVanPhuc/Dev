# -*- coding: utf-8 -*-
import time
from datetime import datetime
from typing import Dict, Any, List, Tuple
from playwright.sync_api import Page

from lpn_crawler.backend.models.models import (
    LpnContainer, LpnJobContainer, LpnItem, LpnImage
)
from lpn_crawler.backend.services.storage import download_images_parallel
from lpn_crawler.backend.worker.manager import crawl_job_manager
from lpn_crawler.backend.crawler.parser import process_raw_container_data


class CrawlerDomMixin:
    """
    Mixin phụ trách chiến lược Fallback: Quét DOM qua giao diện người dùng Playwright
    để khám phá danh sách container và cào chi tiết từng container khi không có API payload.
    """

    def discover_container_list(self, page: Page) -> List[Dict[str, Any]]:
        """Phase A: Scroll danh sách Container bên trái để thu thập queue"""
        self.active_crawl_mode = "UI Playwright"
        discovered_containers: Dict[str, Dict[str, Any]] = {}
        no_new_count = 0

        for scroll_step in range(1, 10000):
            if crawl_job_manager.is_cancelled(self.job_id):
                break
            self.check_paused(page, "", f"Khám phá danh sách Container (bước {scroll_step})")

            # STEP A1: Collect visible containers from DOM
            visible_rows = []
            try:
                visible_rows = page.evaluate("""() => {
                    const rows = [];
                    const elements = document.querySelectorAll('[data-testonly-column="Container number"], [data-testid="deck-row-container"], [role="button"]');
                    elements.forEach(el => {
                        const text = (el.textContent || '').trim();
                        const match = text.match(/([A-Z]{4}\\s*\\d{7})/);
                        if (match) {
                            rows.push(match[1].replace(/\\s+/g, ' '));
                        }
                    });
                    return Array.from(new Set(rows));
                }""")
            except Exception as eval_err:
                self.log(f"[PHASE_A_DISCOVER_COLLECT_ROWS] Lỗi khi thu thập hàng Container: {eval_err}", level="WARNING")

            new_found = 0
            for c_num in visible_rows:
                c_num_clean = c_num.strip().upper()
                if c_num_clean and c_num_clean not in discovered_containers:
                    discovered_containers[c_num_clean] = {
                        "container_number": c_num_clean,
                        "discovery_order": len(discovered_containers) + 1
                    }
                    new_found += 1

            if new_found == 0:
                no_new_count += 1
            else:
                no_new_count = 0

            # Cập nhật tiến độ Live cho Phase A
            if scroll_step % 3 == 0 or new_found > 0:
                self.send_progress("—", "DISCOVERING", 0, len(discovered_containers), 0, 0, current_action=f"Đang quét danh sách Container (Đã tìm thấy {len(discovered_containers)} container)...")

            # STEP A2: Scroll left panel down
            scroll_res = {"scrolled": False, "isAtBottom": False}
            try:
                scroll_res = page.evaluate("""() => {
                    const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
                        return el.scrollHeight > el.clientHeight && el.clientHeight > 200 && el.getBoundingClientRect().left < 400;
                    });
                    if (scrollables.length > 0) {
                        const container = scrollables[0];
                        const prevTop = container.scrollTop;
                        container.scrollTop += 1000;
                        const isAtBottom = (container.scrollTop + container.clientHeight >= container.scrollHeight - 5);
                        return { scrolled: container.scrollTop > prevTop, isAtBottom: isAtBottom };
                    }
                    return { scrolled: false, isAtBottom: true };
                }""")
            except Exception as eval_err:
                self.log(f"[PHASE_A_DISCOVER_SCROLL] Lỗi scroll danh sách trái: {eval_err}", level="WARNING")

            page.wait_for_timeout(60)

            # Chỉ dừng khi đã chạm đáy thực tế và không còn dòng mới sau 12 lần kiểm tra
            if (not scroll_res.get("scrolled") and scroll_res.get("isAtBottom")) or no_new_count >= 12:
                break

        return list(discovered_containers.values())

    def crawl_single_container(
        self, page: Page, container_number: str, item_info: Dict[str, Any],
        processed: int = 0, total: int = 0, total_items: int = 0,
        total_images: int = 0, total_sku: int = 0
    ) -> Tuple[int, int, bool]:
        """Phase B: Crawl chi tiết 1 Container — lifecycle bắt buộc đầy đủ"""
        self.active_crawl_mode = "UI Playwright"
        clean_num = container_number.strip().upper()
        clean_num_no_space = clean_num.replace(" ", "")
        idx_label = f"[{processed + 1}/{total}]"
        self.check_paused(page, clean_num)

        # STEP B1: Định vị hàng trong danh sách bên trái
        self.log(f"{idx_label} LOCATING_ROW: {clean_num}", container_number=clean_num)
        self.snap(page, action=f"Đang tìm row: {clean_num}", container=clean_num,
                  processed=processed, total=total, items=total_items, images=total_images, sku=total_sku)

        row_found = False
        row_locator = None
        used_search_box = False

        # TIER 1: Kiểm tra xem hàng đã hiển thị ngay trong viewport hiện tại chưa (Fast Check)
        try:
            for selector in ['[data-testid="deck-row-container"]', '[data-testonly-column="Container number"]']:
                loc = page.locator(selector).filter(has_text=clean_num)
                if loc.count() > 0:
                    row_locator = loc.first
                    row_found = True
                    break
                loc_ns = page.locator(selector).filter(has_text=clean_num_no_space)
                if loc_ns.count() > 0:
                    row_locator = loc_ns.first
                    row_found = True
                    break
        except Exception:
            pass

        # TIER 2: Tìm kiếm nhanh qua AppSheet Search Box nếu có (Siêu nhanh & chính xác)
        if not row_found:
            try:
                search_btn = page.locator('button[aria-label*="Search" i], [data-testid="search-button"], .fa-search, button:has(.fa-search)').first
                if search_btn.is_visible(timeout=1000):
                    search_btn.click()
                    page.wait_for_timeout(300)

                s_inputs = page.locator('input[type="search"], input[placeholder*="Search" i], input[aria-label*="Search" i], .search-input')
                if s_inputs.count() > 0 and s_inputs.first.is_visible(timeout=1000):
                    s_input = s_inputs.first
                    self.log(f"{idx_label} Lọc trực tiếp qua Search Box: {clean_num}", container_number=clean_num)
                    s_input.fill("")
                    s_input.fill(clean_num)
                    page.keyboard.press("Enter")
                    page.wait_for_timeout(700)
                    used_search_box = True

                    for selector in ['[data-testid="deck-row-container"]', '[data-testonly-column="Container number"]']:
                        loc = page.locator(selector).filter(has_text=clean_num)
                        if loc.count() > 0:
                            row_locator = loc.first
                            row_found = True
                            break
                        loc_ns = page.locator(selector).filter(has_text=clean_num_no_space)
                        if loc_ns.count() > 0:
                            row_locator = loc_ns.first
                            row_found = True
                            break
            except Exception:
                pass

        # TIER 3: Cuộn tiếp diễn từ vị trí hiện tại (Sequential Continuous Scroll)
        if not row_found:
            for scroll_step in range(12):
                if crawl_job_manager.is_cancelled(self.job_id):
                    break
                self.check_paused(page, clean_num, f"Cuộn tìm dòng Container (bước {scroll_step+1}/12)")
                try:
                    for selector in ['[data-testid="deck-row-container"]', '[data-testonly-column="Container number"]']:
                        loc = page.locator(selector).filter(has_text=clean_num)
                        if loc.count() > 0:
                            row_locator = loc.first
                            row_found = True
                            break
                        loc_ns = page.locator(selector).filter(has_text=clean_num_no_space)
                        if loc_ns.count() > 0:
                            row_locator = loc_ns.first
                            row_found = True
                            break
                    if row_found:
                        break
                except Exception:
                    pass

                try:
                    page.evaluate("""() => {
                        const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
                            const rect = el.getBoundingClientRect();
                            return el.scrollHeight > el.clientHeight && el.clientHeight > 200 && rect.left < 400;
                        });
                        if (scrollables.length > 0) scrollables[0].scrollTop += 350;
                    }""")
                    page.wait_for_timeout(300)
                except Exception:
                    break

        # TIER 4: Cuộn sâu toàn diện từ đỉnh danh sách (Deep Scroll from Top up to 120 attempts)
        if not row_found:
            self.log(f"{idx_label} Cuộn sâu tìm kiếm Container: {clean_num}...", container_number=clean_num)
            # Reset về đầu
            try:
                page.evaluate("""() => {
                    const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
                        const rect = el.getBoundingClientRect();
                        return el.scrollHeight > el.clientHeight && el.clientHeight > 200 && rect.left < 400;
                    });
                    if (scrollables.length > 0) scrollables[0].scrollTop = 0;
                }""")
                page.wait_for_timeout(300)
            except Exception:
                pass

            for scroll_attempt in range(120):
                if crawl_job_manager.is_cancelled(self.job_id):
                    break
                self.check_paused(page, clean_num, f"Cuộn sâu tìm Container (lần {scroll_attempt+1}/120)")
                try:
                    for selector in ['[data-testid="deck-row-container"]', '[data-testonly-column="Container number"]']:
                        loc = page.locator(selector).filter(has_text=clean_num)
                        if loc.count() > 0:
                            row_locator = loc.first
                            row_found = True
                            break
                        loc_ns = page.locator(selector).filter(has_text=clean_num_no_space)
                        if loc_ns.count() > 0:
                            row_locator = loc_ns.first
                            row_found = True
                            break
                    if row_found:
                        break
                except Exception:
                    pass

                # Scroll danh sách trái xuống
                scrolled = False
                try:
                    scrolled = page.evaluate("""() => {
                        const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
                            const rect = el.getBoundingClientRect();
                            return el.scrollHeight > el.clientHeight && el.clientHeight > 200 && rect.left < 400;
                        });
                        if (scrollables.length > 0) {
                            const c = scrollables[0];
                            const prev = c.scrollTop;
                            c.scrollTop += 350;
                            return c.scrollTop > prev;
                        }
                        return false;
                    }""")
                    page.wait_for_timeout(300)
                    if not scrolled and scroll_attempt > 10:
                        break
                except Exception:
                    break

        if not row_found or row_locator is None:
            self.log(f"{idx_label} ERROR: ROW_NOT_FOUND '{clean_num}'", level="ERROR", container_number=clean_num)
            raise RuntimeError(f"ROW_NOT_FOUND: {clean_num}")

        self.log(f"{idx_label} Đã tìm thấy row: {clean_num}", container_number=clean_num)

        # STEP B2: Cuộn đến hàng và click chọn
        self.log(f"{idx_label} CLICKING_ROW: {clean_num}", container_number=clean_num)
        click_success = False

        for click_attempt in range(3):
            try:
                row_locator.scroll_into_view_if_needed(timeout=5000)
                page.wait_for_timeout(300)

                self.snap(page, action=f"Đang click row (lần {click_attempt+1}): {clean_num}",
                          container=clean_num, processed=processed, total=total,
                          items=total_items, images=total_images, sku=total_sku)

                row_locator.click(timeout=5000)
                click_success = True
                self.log(f"{idx_label} Đã click row: {clean_num}", container_number=clean_num)
                break
            except Exception as click_err:
                self.log(f"{idx_label} Click lần {click_attempt+1} thất bại ({clean_num}): {click_err}", level="WARNING", container_number=clean_num)
                page.wait_for_timeout(1000)

        if not click_success:
            self.log(f"{idx_label} ERROR: CLICK_FAILED '{clean_num}'", level="ERROR", container_number=clean_num)
            raise RuntimeError(f"CLICK_FAILED: {clean_num}")

        # Dọn dẹp Search Box nếu đã dùng để chuẩn bị cho các container sau
        if used_search_box:
            try:
                s_inputs = page.locator('input[type="search"], input[placeholder*="Search" i], input[aria-label*="Search" i], .search-input')
                if s_inputs.count() > 0 and s_inputs.first.is_visible():
                    s_inputs.first.fill("")
                    page.keyboard.press("Enter")
            except Exception:
                pass

        # STEP B3: Chờ mở panel chi tiết bên phải và xác thực số Container
        self.log(f"{idx_label} WAITING_DETAIL: {clean_num}", container_number=clean_num)
        page.wait_for_timeout(300)

        self.snap(page, action=f"Đang chờ Detail: {clean_num}",
                  container=clean_num, processed=processed, total=total,
                  items=total_items, images=total_images, sku=total_sku)
        page.wait_for_timeout(200)

        detail_verified = False
        detail_num_found = ""

        for verify_attempt in range(5):
            if crawl_job_manager.is_cancelled(self.job_id):
                break
            self.check_paused(page, clean_num, f"Chờ mở Detail (lần {verify_attempt+1}/5)")
            try:
                detail_num_found = page.evaluate("""() => {
                    // Chỉ lấy [data-testonly-column="Container number"] ở Detail panel bên phải
                    const els = Array.from(document.querySelectorAll('[data-testonly-column="Container number"]'));
                    const detailEl = els.find(el => {
                        const rect = el.getBoundingClientRect();
                        return rect.left >= 350 && rect.width > 0 && rect.height > 0;
                    });
                    return detailEl ? (detailEl.textContent || '').trim() : '';
                }""")
            except Exception as eval_err:
                self.log(f"{idx_label} Lỗi verify Detail lần {verify_attempt+1}: {eval_err}", level="WARNING", container_number=clean_num)

            if detail_num_found:
                d_clean_ns = detail_num_found.upper().replace(' ', '')
                if clean_num_no_space in d_clean_ns or d_clean_ns in clean_num_no_space:
                    detail_verified = True
                    self.log(f"{idx_label} DETAIL_VERIFIED: {detail_num_found}", container_number=clean_num)
                    self.snap(page, action=f"Detail verified: {detail_num_found}",
                              container=clean_num, processed=processed, total=total,
                              items=total_items, images=total_images, sku=total_sku)
                    break

            self.log(f"{idx_label} Detail chưa đúng (lần {verify_attempt+1}): '{detail_num_found}'", level="WARNING", container_number=clean_num)

            if verify_attempt < 2:
                try:
                    row_locator.scroll_into_view_if_needed(timeout=3000)
                    row_locator.click(timeout=3000)
                    self.log(f"{idx_label} Retry click lần {verify_attempt+2}", container_number=clean_num)
                except Exception:
                    pass

            page.wait_for_timeout(400)

        if not detail_verified:
            self.log(f"{idx_label} ERROR: DETAIL_NOT_OPENED '{clean_num}' (got: '{detail_num_found}')", level="ERROR", container_number=clean_num)
            raise RuntimeError(f"DETAIL_NOT_OPENED: {clean_num} (got: '{detail_num_found}')")

        # STEP B4: Đưa thanh cuộn panel chi tiết về đầu trang
        self.log(f"{idx_label} READING_HEADER: {clean_num}", container_number=clean_num)
        try:
            page.evaluate("""() => {
                const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
                    const rect = el.getBoundingClientRect();
                    return el.scrollHeight > el.clientHeight && rect.left >= 300 && rect.width > 100;
                });
                if (scrollables.length > 0) scrollables[0].scrollTop = 0;
            }""")
        except Exception as eval_err:
            self.log(f"{idx_label} Lỗi reset Detail scroll: {eval_err}", level="WARNING", container_number=clean_num)

        page.wait_for_timeout(100)
        self.snap(page, action=f"Đang đọc Header: {clean_num}",
                  container=clean_num, processed=processed, total=total,
                  items=total_items, images=total_images, sku=total_sku)

        # STEP B5: Cuộn chạm đáy để đọc toàn bộ danh sách Pallet/Box
        accumulated_raw_fields: Dict[str, Any] = {}
        accumulated_raw_images: Dict[str, List[str]] = {}
        no_new_detail_count = 0
        current_sku_this_container = 0

        for d_step in range(1, 100):
            if crawl_job_manager.is_cancelled(self.job_id):
                break
            self.check_paused(page, clean_num, f"Đọc chi tiết Detail (bước {d_step})")

            visible_data = {"fields": {}, "images": {}}
            try:
                visible_data = page.evaluate("""({ appName, tableName }) => {
                    const fields = {};
                    const images = {};

                    // Lấy toàn bộ element từ Detail panel bên phải (left >= 300px)
                    const cols = Array.from(document.querySelectorAll('[data-testonly-column]')).filter(el => {
                        const rect = el.getBoundingClientRect();
                        return rect.left >= 300 && rect.width > 0;
                    });

                    cols.forEach(el => {
                        const colName = (el.getAttribute('data-testonly-column') || '').trim();
                        if (colName) {
                            let val = '';
                            const valEl = el.querySelector('.SlideshowPage__value, [data-testid$="-display-span"], [data-testid="base-type-display"]');
                            if (valEl) {
                                val = (valEl.textContent || '').trim();
                            } else {
                                val = (el.textContent || '').trim();
                            }

                            if (val && colName && val.toLowerCase().startsWith(colName.toLowerCase())) {
                                const stripped = val.slice(colName.length).trim();
                                if (stripped) val = stripped;
                            }

                            if (val || !(colName in fields)) {
                                fields[colName] = val;
                            }

                            // Trích xuất triệt để URL hình ảnh (Lazy-Load + Data attributes + AppSheet Resolver)
                            const isPicCol = colName.toLowerCase().startsWith('picture') || colName.toLowerCase().startsWith('ảnh') || colName.toLowerCase().startsWith('image');
                            const urls = [];

                            const imgEls = el.querySelectorAll('img, [data-testid*="image"], .SlideshowPage__image, a[href*="http"], a[href*="gettablefileurl"]');
                            imgEls.forEach(img => {
                                const candidates = [
                                    img.src,
                                    img.getAttribute('src'),
                                    img.getAttribute('data-src'),
                                    img.getAttribute('data-image-url'),
                                    img.getAttribute('data-original-src'),
                                    img.getAttribute('data-url'),
                                    img.currentSrc,
                                    img.href
                                ];
                                candidates.forEach(src => {
                                    if (src && typeof src === 'string' && src.startsWith('http') && !src.includes('ajax-loader') && !src.includes('loading') && !src.startsWith('data:') && src.length > 20) {
                                        if (!urls.includes(src)) urls.push(src);
                                    }
                                });

                                if (img.style && img.style.backgroundImage) {
                                    const match = img.style.backgroundImage.match(/url\\(['"]?(.*?)['"]?\\)/);
                                    if (match && match[1] && match[1].startsWith('http') && !urls.includes(match[1])) {
                                        urls.push(match[1]);
                                    }
                                }
                            });

                            const testSrc = el.getAttribute('data-testonly-src');
                            if (testSrc && testSrc.startsWith('http') && !urls.includes(testSrc)) {
                                urls.push(testSrc);
                            }

                            // Nếu là cột Picture nhưng DOM chưa tải xong img tag mà text là file ảnh -> Tự resolve URL
                            if (isPicCol && urls.length === 0 && val) {
                                const lowerVal = val.toLowerCase();
                                if (lowerVal.endsWith('.jpg') || lowerVal.endsWith('.jpeg') || lowerVal.endsWith('.png') || lowerVal.endsWith('.webp') || lowerVal.includes('images/') || lowerVal.includes('lpn_images/')) {
                                    if (val.startsWith('http')) {
                                        urls.push(val);
                                    } else if (appName) {
                                        urls.push(`https://www.appsheet.com/template/gettablefileurl?appName=${appName}&tableName=${encodeURIComponent(tableName || 'LPN NEW')}&fileName=${encodeURIComponent(val)}`);
                                    }
                                }
                            }

                            if (urls.length > 0) {
                                images[colName] = urls;
                            }
                        }
                    });

                    return { fields, images };
                }""", {"appName": self.app_name, "tableName": self.table_name or "LPN NEW"})
            except Exception as eval_err:
                self.log(f"{idx_label} Lỗi collect Detail fields: {eval_err}", level="ERROR", container_number=clean_num)

            new_fields = 0
            for k, v in visible_data.get("fields", {}).items():
                if k not in accumulated_raw_fields or accumulated_raw_fields[k] != v:
                    accumulated_raw_fields[k] = v
                    new_fields += 1

            for k, img_list in visible_data.get("images", {}).items():
                if k not in accumulated_raw_images:
                    accumulated_raw_images[k] = []
                for img_url in img_list:
                    if img_url not in accumulated_raw_images[k]:
                        accumulated_raw_images[k].append(img_url)
                        new_fields += 1

            if new_fields == 0:
                no_new_detail_count += 1
            else:
                no_new_detail_count = 0

            sku_fields = {k: v for k, v in accumulated_raw_fields.items()
                          if k.lower().startswith("sku") and v and v.strip()}
            current_sku_this_container = len(sku_fields)

            # Cuộn Detail panel xuống 350px để kích hoạt mượt Lazy-Loading của React
            scroll_status = {"moved": False, "isBottom": False}
            try:
                scroll_status = page.evaluate("""() => {
                    const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
                        const rect = el.getBoundingClientRect();
                        return el.scrollHeight > el.clientHeight && rect.left >= 300;
                    });
                    if (scrollables.length > 0) {
                        const c = scrollables[0];
                        const prev = c.scrollTop;
                        c.scrollTop += 350;
                        const moved = c.scrollTop > prev;
                        const isBottom = (c.scrollTop + c.clientHeight >= c.scrollHeight - 8);
                        return { moved, isBottom };
                    }
                    return { moved: false, isBottom: true };
                }""")
            except Exception:
                pass

            if not scroll_status.get("moved"):
                try:
                    page.mouse.move(700, 400)
                    page.mouse.wheel(0, 350)
                except Exception:
                    pass

            page.wait_for_timeout(180)

            # ĐIỀU KIỆN DỪNG ĐỘNG: Đã thực sự chạm đáy 100% VÀ không còn trường mới phát sinh
            if scroll_status.get("isBottom") and no_new_detail_count >= 2:
                break

        # STEP B5b: FAST BATCH IMAGE EXTRACTION (Quét toàn bộ ô ảnh trong 1 lượt cuối)
        try:
            batch_imgs = page.evaluate("""({ appName, tableName }) => {
                const res = {};
                const cols = Array.from(document.querySelectorAll('[data-testonly-column]')).filter(el => {
                    const rect = el.getBoundingClientRect();
                    const cName = (el.getAttribute('data-testonly-column') || '').toLowerCase();
                    return rect.left >= 300 && (cName.startsWith('picture') || cName.startsWith('ảnh') || cName.startsWith('image'));
                });
                cols.forEach(el => {
                    const colName = el.getAttribute('data-testonly-column');
                    const urls = [];
                    el.querySelectorAll('img, [data-testid*="image"], a[href*="http"]').forEach(img => {
                        const candidates = [img.src, img.getAttribute('src'), img.getAttribute('data-src'), img.getAttribute('data-image-url'), img.currentSrc, img.href];
                        candidates.forEach(src => {
                            if (src && typeof src === 'string' && src.startsWith('http') && !src.includes('loading') && !src.startsWith('data:') && src.length > 20) {
                                if (!urls.includes(src)) urls.push(src);
                            }
                        });
                    });
                    const testSrc = el.getAttribute('data-testonly-src');
                    if (testSrc && testSrc.startsWith('http') && !urls.includes(testSrc)) urls.push(testSrc);

                    if (urls.length === 0) {
                        const val = (el.textContent || '').trim();
                        const lowerVal = val.toLowerCase();
                        if (lowerVal.endsWith('.jpg') || lowerVal.endsWith('.jpeg') || lowerVal.endsWith('.png') || lowerVal.endsWith('.webp') || lowerVal.includes('images/')) {
                            if (val.startsWith('http')) urls.push(val);
                            else if (appName) urls.push(`https://www.appsheet.com/template/gettablefileurl?appName=${appName}&tableName=${encodeURIComponent(tableName || 'LPN NEW')}&fileName=${encodeURIComponent(val)}`);
                        }
                    }

                    if (urls.length > 0) res[colName] = urls;
                });
                return res;
            }""", {"appName": self.app_name, "tableName": self.table_name or "LPN NEW"})
            for k, urls in (batch_imgs or {}).items():
                if k not in accumulated_raw_images:
                    accumulated_raw_images[k] = []
                for u in urls:
                    if u not in accumulated_raw_images[k]:
                        accumulated_raw_images[k].append(u)
        except Exception:
            pass

        total_pic_detected = sum(len(v) for v in accumulated_raw_images.values())
        self.log(f"{idx_label} Hoàn tất đọc dữ liệu | SKU: {current_sku_this_container} | Ảnh: {total_pic_detected}", container_number=clean_num)

        # STEP B6: Bóc tách và chuẩn hóa dữ liệu
        parsed_data = process_raw_container_data(accumulated_raw_fields, accumulated_raw_images)
        header_data = parsed_data["header"]
        items_data = parsed_data["items"]

        for item in items_data:
            sk = item.get("suffix_key", "")
            sku_val = item.get("sku", "") or ""
            pics = len(item.get("image_urls", []))
            self.log(f"{idx_label} Phát hiện item: {sk} | SKU: '{sku_val}' | Picture: {pics}", container_number=clean_num)

        if not header_data["container_number"]:
            header_data["container_number"] = container_number

        # STEP B7: Kiểm tra trùng lặp và lưu vào Database
        self.log(f"{idx_label} SAVING_DATABASE: {clean_num} | Items: {len(items_data)}", container_number=clean_num)
        self.snap(page, action=f"Đang lưu Database: {clean_num}",
                  container=clean_num, processed=processed, total=total,
                  items=total_items, images=total_images, sku=total_sku + current_sku_this_container)

        fingerprint = header_data["record_fingerprint"]
        content_hash = header_data["content_hash"]

        existing_cont = self.db.query(LpnContainer).filter(LpnContainer.record_fingerprint == fingerprint).first()
        is_updated = False

        if existing_cont:
            existing_cont.last_seen_at = datetime.utcnow()
            existing_cont.last_crawl_job_id = self.job_id
            existing_cont.crawl_count = (existing_cont.crawl_count or 1) + 1

            if existing_cont.content_hash != content_hash:
                existing_cont.content_hash = content_hash
                existing_cont.factory = header_data["factory"]
                existing_cont.date_loading_raw = header_data["date_loading_raw"]
                existing_cont.date_loading = header_data["date_loading"]
                existing_cont.timestamp_raw = header_data["timestamp_raw"]
                existing_cont.timestamp_val = header_data["timestamp_val"]
                existing_cont.operator_name = header_data["operator_name"]
                is_updated = True

            db_cont = existing_cont
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

        # STEP B8: Lưu danh sách Items và tải hình ảnh
        downloaded_imgs_count = 0

        if existing_cont:
            self.db.query(LpnImage).filter(LpnImage.container_id == db_cont.id).delete()
            self.db.query(LpnItem).filter(LpnItem.container_id == db_cont.id).delete()
            self.db.commit()

        image_tasks = []
        item_objects = []

        for idx, item in enumerate(items_data, start=1):
            if crawl_job_manager.is_cancelled(self.job_id):
                break

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
            item_objects.append((db_item, item))

            img_urls = item.get("image_urls", [])
            for sort_idx, url in enumerate(img_urls, start=1):
                image_tasks.append({
                    "source_url": url,
                    "container_number": db_cont.container_number,
                    "suffix_key": item["suffix_key"],
                    "sort_order": sort_idx,
                    "lpn_item_id": db_item.id,
                    "container_id": db_cont.id,
                    "image_type": item["record_type"]
                })

        # Tải toàn bộ ảnh của container bằng cơ chế song song (Parallel)
        created_db_imgs = []
        if image_tasks:
            self.check_paused(page, clean_num, f"Tải đồng thời {len(image_tasks)} ảnh")
            img_results = download_images_parallel(page, image_tasks, max_workers=10)
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
                    downloaded_imgs_count += 1
                else:
                    err_msg = str(r.get("error", "Lỗi tải ảnh"))
                    self.log(
                        f"{idx_label} Cảnh báo: Không thể tải ảnh {r.get('suffix_key', '')} #{r.get('sort_order', 1)} ({err_msg})",
                        level="WARNING", container_number=clean_num
                    )

        # Log tổng kết từng item
        for db_item, item in item_objects:
            pic_detected = len(item.get("image_urls", []))
            if pic_detected > 0:
                self.log(
                    f"{idx_label} {item['suffix_key']} | LPN: {item.get('lpn','—')} | SKU: {item.get('sku','—')} | Ảnh: {pic_detected} ảnh",
                    container_number=clean_num
                )
            else:
                self.log(
                    f"{idx_label} {item['suffix_key']} | LPN: {item.get('lpn','—')} | SKU: {item.get('sku','—')} | Không có ảnh",
                    container_number=clean_num
                )

        self.db.flush()
        queued_img_meta = []
        for db_img_inst, r in created_db_imgs:
            queued_img_meta.append({
                "image_id": getattr(db_img_inst, "id", None),
                "lpn_item_id": r.get("lpn_item_id") if isinstance(r, dict) else getattr(db_img_inst, "lpn_item_id", None),
                "local_path": r.get("local_path") if isinstance(r, dict) else getattr(db_img_inst, "local_path", None),
                "image_type": r.get("image_type", "Pallet") if isinstance(r, dict) else getattr(db_img_inst, "image_type", "Pallet")
            })
        self.db.commit()
        if hasattr(self, "_enqueue_images_for_sync_ocr"):
            self._enqueue_images_for_sync_ocr(queued_img_meta, items_data, clean_num, image_tasks)

        self.log(f"{idx_label} Saved DB: {clean_num}", container_number=clean_num)

        # COMPLETED
        item_count = len(items_data)
        return item_count, downloaded_imgs_count, is_updated
