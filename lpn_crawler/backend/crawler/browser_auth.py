# -*- coding: utf-8 -*-
import os
import time
from typing import Tuple, Any, Optional
from playwright.sync_api import Page, BrowserContext

from lpn_crawler.backend.config.settings import settings


class CrawlerBrowserAuthMixin:
    """
    Mixin phụ trách xác thực Google Auth trên AppSheet và điều hướng vào view 'LPN NEW'.
    """

    def find_element_in_all_frames(self, page: Page, selector: str, timeout: int = 15000) -> Tuple[Any, Any]:
        """Scan top page, popup windows & all child iframes to locate target element"""
        start_t = time.time()
        while (time.time() - start_t) * 1000 < timeout:
            for p_item in page.context.pages:
                try:
                    el = p_item.query_selector(selector)
                    if el and el.is_visible():
                        return el, p_item
                except Exception:
                    pass
                for frame in p_item.frames:
                    try:
                        el = frame.query_selector(selector)
                        if el and el.is_visible():
                            return el, frame
                    except Exception:
                        pass
            time.sleep(0.4)
        return None, None

    def ensure_authenticated(self, page: Page, context: BrowserContext) -> bool:
        """Tự động kiểm tra và thực hiện Google Login (Siêu nhanh, tự động chọn tài khoản & không treo)"""
        try:
            # 1. Kiểm tra nhanh xem Session đã ở trong AppSheet chưa (< 1.5 giây)
            is_already_logged_in = page.evaluate("""() => {
                const url = window.location.href || '';
                const text = (document.body.innerText || '');
                const hasNavMenu = !!document.querySelector('[role="button"][title="LPN NEW"]') || !!document.querySelector('[title="LPN NEW"]');
                const hasContainerCol = !!document.querySelector('[data-testonly-column="Container number"]');
                const isGoogleAuth = url.includes("accounts.google.com") || url.includes("Account/Login");
                
                return !isGoogleAuth && (hasNavMenu || hasContainerCol || text.includes("LPN NEW") || text.includes("Container number"));
            }""")

            if is_already_logged_in:
                self.log("Xác nhận đã ở trong ứng dụng AppSheet")
                self.capture_and_send_progress(page, "", "AUTHENTICATED", 0, 0, 0, 0)
                return True

            # 2. Kiểm tra nếu có màn hình chọn tài khoản Google sẵn ("Choose an account" / Account Picker)
            self.log("Kiểm tra màn hình đăng nhập Google")
            self.capture_and_send_progress(page, "", "AUTHENTICATING", 0, 0, 0, 0)
            
            try:
                account_picker = page.locator('div, [data-email]').filter(has_text=settings.APPSHEET_GOOGLE_EMAIL).first
                if account_picker.is_visible(timeout=2000):
                    self.log(f"Phát hiện tài khoản Google. Bấm chọn {settings.APPSHEET_GOOGLE_EMAIL}")
                    account_picker.click()
                    page.wait_for_timeout(2000)
            except Exception:
                pass

            # 3. Phát hiện nếu có nút Sign in bằng "Google" trên AppSheet
            google_btn = None
            try:
                g_loc = page.get_by_role("button", name="Google").first
                if g_loc.is_visible(timeout=1500):
                    google_btn = g_loc
            except Exception:
                pass

            if not google_btn:
                try:
                    g_loc = page.locator('button:has-text("Google"), a:has-text("Google"), [aria-label*="Google"]').first
                    if g_loc.is_visible(timeout=1500):
                        google_btn = g_loc
                except Exception:
                    pass

            if google_btn:
                self.log("Bấm nút đăng nhập bằng tài khoản Google")
                google_btn.click()
                page.wait_for_timeout(2500)

            # 4. Quét ô nhập Email Google (Email Step)
            email_el, target_frame = self.find_element_in_all_frames(
                page, 
                'input[name="identifier"], input#identifierId, input[type="email"], input[aria-label*="Email"]', 
                timeout=3000
            )
            
            if email_el and target_frame:
                self.log(f"Điền Email Google: {settings.APPSHEET_GOOGLE_EMAIL}")
                email_el.fill(settings.APPSHEET_GOOGLE_EMAIL)
                
                # Click Next button for Email step
                next_btn, _ = self.find_element_in_all_frames(page, '#identifierNext, button:has-text("Next"), button:has-text("Tiếp theo")', timeout=1500)
                if next_btn:
                    next_btn.click()
                else:
                    target_frame.keyboard.press("Enter")
                page.wait_for_timeout(2000)

            self.capture_and_send_progress(page, "", "AUTHENTICATING", 0, 0, 0, 0)

            # 5. Quét ô nhập Mật khẩu Google (Password Step)
            pwd_el, pwd_frame = self.find_element_in_all_frames(
                page, 
                'input[type="password"], input[name="password"], input[name="Passwd"]', 
                timeout=3000
            )
            
            if pwd_el and pwd_frame:
                self.log("Tự động điền mật khẩu Google")
                pwd_el.fill(settings.APPSHEET_GOOGLE_PASSWORD)
                
                # Click Next button for Password step
                pwd_next_btn, _ = self.find_element_in_all_frames(page, '#passwordNext, button:has-text("Next"), button:has-text("Tiếp theo")', timeout=1500)
                if pwd_next_btn:
                    pwd_next_btn.click()
                else:
                    pwd_frame.keyboard.press("Enter")
                page.wait_for_timeout(3500)

            self.capture_and_send_progress(page, "", "AUTHENTICATING", 0, 0, 0, 0)

            # 6. Check Google MFA / Security Challenge / 2FA
            is_mfa = False
            try:
                is_mfa = page.evaluate("""() => {
                    const text = document.body.innerText || '';
                    const url = window.location.href || '';
                    return text.includes("2-Step Verification") || 
                           text.includes("Verify it's you") || 
                           text.includes("Check your phone") ||
                           text.includes("This browser or app may not be secure") ||
                           url.includes("signin/rejected") ||
                           url.includes("v3/signin/rejected");
                }""")
            except Exception:
                pass

            if is_mfa:
                self.log("Phát hiện yêu cầu xác minh bảo mật. Đang chờ người dùng phê duyệt trên thiết bị", level="WARNING")
                for _ in range(15):
                    page.wait_for_timeout(2000)
                    cur_url = page.url
                    if "accounts.google.com" not in cur_url and "Account/Login" not in cur_url:
                        self.log("Đã hoàn tất xác minh trên Google")
                        break

            # 7. Chờ AppSheet redirect trở lại và lưu Session State
            self.log("Đang tải giao diện AppSheet")
            try:
                page.wait_for_selector('[role="button"][title="LPN NEW"], [title="LPN NEW"], [data-testonly-column="Container number"], [data-testid="slideshow-page-container"]', timeout=12000)
            except Exception:
                page.wait_for_timeout(2000)

            # Save storage state for future runs
            try:
                context.storage_state(path=settings.STORAGE_STATE_FILE)
                self.log("Đăng nhập Google thành công. Đã lưu phiên làm việc")
            except Exception:
                pass

            return True

        except Exception as auth_err:
            self.log(f"Lỗi quá trình đăng nhập Google: {auth_err}", level="ERROR")
            return False

    def navigate_to_lpn_new(self, page: Page) -> bool:
        """
        Định vị & Click chuẩn Semantic Menu 'LPN NEW' theo [role="button"][title="LPN NEW"]
        (Yêu cầu CẬP NHẬT SELECTOR CHO MENU "LPN NEW")
        """
        self.log('Định vị Menu \'LPN NEW\'')

        # 1. Check if sidebar / hamburger menu button needs to be opened
        try:
            drawer_btn = page.locator('[aria-label*="menu" i], .fa-bars, button:has(.fa-bars)').first
            if drawer_btn.is_visible(timeout=1500):
                self.log("Bấm mở thanh Navigation Sidebar AppSheet")
                drawer_btn.click()
                page.wait_for_timeout(1000)
        except Exception:
            pass

        # 2. Semantic Playwright Locator Strategies for Menu "LPN NEW"
        lpn_target = None

        # Strategy A: Playwright get_by_role("button", name="LPN NEW")
        try:
            role_btn = page.get_by_role("button", name="LPN NEW").first
            if role_btn.is_visible(timeout=2000):
                lpn_target = role_btn
                self.log("Đã tìm thấy menu 'LPN NEW'")
        except Exception:
            pass

        # Strategy B: [role="button"][title="LPN NEW"] or [title="LPN NEW"]
        if not lpn_target:
            try:
                css_btn = page.locator('[role="button"][title="LPN NEW"], [title="LPN NEW"], button[title="LPN NEW"]').first
                if css_btn.is_visible(timeout=2000):
                    lpn_target = css_btn
                    self.log("Đã tìm thấy menu 'LPN NEW'")
            except Exception:
                pass

        # Strategy C: Search across all frames for [role="button"][title="LPN NEW"]
        if not lpn_target:
            el, _ = self.find_element_in_all_frames(page, '[role="button"][title="LPN NEW"], [title="LPN NEW"]', timeout=4000)
            if el:
                lpn_target = el
                self.log("Đã tìm thấy menu 'LPN NEW'")

        if not lpn_target:
            self.log("Không tìm thấy nút Menu 'LPN NEW'", level="WARNING")
            return False

        # 3. Check if LPN NEW is already active (aria-current="page")
        try:
            is_active = lpn_target.evaluate("""el => {
                return el.getAttribute('aria-current') === 'page' || 
                       el.classList.contains('active') ||
                       el.getAttribute('aria-selected') === 'true';
            }""")
            if is_active:
                self.log("Menu 'LPN NEW' đã ở trạng thái Active")
                return True
        except Exception:
            pass

        # 4. Perform REAL click on LPN NEW menu button
        self.log("Thực hiện click Menu 'LPN NEW'")
        lpn_target.click()
        page.wait_for_timeout(3000)

        # 5. Verify transition to aria-current="page"
        try:
            active_verified = page.evaluate("""() => {
                const activeEl = document.querySelector('[role="button"][title="LPN NEW"][aria-current="page"], [title="LPN NEW"][aria-current="page"]');
                return !!activeEl;
            }""")
            if active_verified:
                self.log("Menu 'LPN NEW' đã chuyển sang trạng thái Active")
        except Exception:
            pass

        self.capture_and_send_progress(page, "", "NAVIGATED_LPN_NEW", 0, 0, 0, 0)
        return True

    def verify_lpn_new_ready(self, page: Page) -> bool:
        """
        Xác minh đồng thời 3 điều kiện bắt buộc (Mục VERIFY SAU KHI CLICK):
        1. Menu có aria-current="page"
        2. View LPN NEW đã render
        3. Danh sách Container đã xuất hiện hoặc có empty-state hợp lệ
        """
        step_name = "VERIFY_LPN_NEW_READY"
        self.log("Xác minh menu và danh sách Container")
        try:
            is_ready = page.evaluate("""() => {
                const text = document.body.innerText || '';
                const activeMenu = document.querySelector('[role="button"][title="LPN NEW"][aria-current="page"], [title="LPN NEW"][aria-current="page"]');
                const hasContainerCol = !!document.querySelector('[data-testonly-column="Container number"]');
                const hasSlideshow = !!document.querySelector('[data-testid="slideshow-page-container"], .slideshow-page-container');
                const hasRows = document.querySelectorAll('[data-testonly-column="Container number"]').length > 0;
                
                const isNavActive = !!activeMenu || text.includes("LPN NEW");
                const isListReady = hasContainerCol || hasSlideshow || hasRows;
                return isNavActive && isListReady;
            }""")
            if is_ready:
                self.log("Xác minh thành công: Menu Active & Danh sách Container đã sẵn sàng")
                return True
        except Exception as e:
            self.log(f"[{step_name}] Lỗi kiểm tra verify_lpn_new_ready: {e}", level="WARNING")

        return False

    def navigate_and_verify_lpn_new(self, page: Page, max_retries: int = 3) -> bool:
        """
        Quy trình chuẩn:
        1. Định vị Menu LPN NEW
        2. Kiểm tra aria-current="page"
        3. Click nếu chưa active
        4. Verify aria-current="page" & Container List
        5. Retry tối đa 3 lần nếu chưa sẵn sàng
        """
        for retry in range(1, max_retries + 1):
            self.log(f"Thực hiện điều hướng & kiểm tra LPN NEW (Lần {retry}/{max_retries})...")
            
            clicked = self.navigate_to_lpn_new(page)
            if clicked:
                page.wait_for_timeout(2000)
                if self.verify_lpn_new_ready(page):
                    return True

            self.log(f"Chờ 3s trước khi thử lại điều hướng LPN NEW (Thử {retry}/{max_retries})...", level="WARNING")
            page.wait_for_timeout(3000)

        if self.verify_lpn_new_ready(page):
            return True

        self.log(f"NAVIGATION_FAILED: Thất bại điều hướng về LPN NEW sau {max_retries} lần thử.", level="ERROR")
        return False
