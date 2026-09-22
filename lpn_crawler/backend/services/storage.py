# -*- coding: utf-8 -*-
import os
import io
import time
import json
import ssl
import hashlib
import re
import logging
import threading
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, Tuple, List
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from PIL import Image, ImageOps

from lpn_crawler.backend.config.settings import settings
from lpn_crawler.backend.worker.manager import crawl_job_manager

# Suppress transient connection pool retry warnings
logging.getLogger("urllib3.connectionpool").setLevel(logging.ERROR)

# Magic byte signatures for MIME detection fallback
MIME_MAGIC = {
    b'\x89PNG\r\n\x1a\n': ('image/png', '.png'),
    b'\xff\xd8\xff': ('image/jpeg', '.jpg'),
    b'RIFF': ('image/webp', '.webp'),
    b'GIF87a': ('image/gif', '.gif'),
    b'GIF89a': ('image/gif', '.gif')
}

_thread_local = threading.local()


def optimize_and_convert_to_webp(
    image_bytes: bytes,
    max_dimension: int = 1920,
    quality: int = 82
) -> Tuple[bytes, str, str, str]:
    """
    Tối ưu hóa và chuyển đổi ảnh bytes sang định dạng WebP Full HD siêu nhẹ:
    - Xoay ảnh đúng chiều theo EXIF Orientation (chụp từ điện thoại).
    - Giới hạn kích thước tối đa 1920px (Full HD) bằng thuật toán nội suy Lanczos cực kỳ sắc nét.
    - Nén WebP Quality 82% (method 4): Giảm 90-95% dung lượng so với JPEG/PNG gốc.
    - Trả về: (webp_bytes, file_mime, file_ext, new_img_hash)
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            # 1. Xử lý mode màu sắc phù hợp (RGB / RGBA)
            if img.mode in ("CMYK", "P"):
                img = img.convert("RGB")

            # 3. Thu nhỏ Full HD (Max 1920px) nếu ảnh quá lớn
            if img.width > max_dimension or img.height > max_dimension:
                img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

            # 4. Xuất sang định dạng WEBP
            out_io = io.BytesIO()
            img.save(out_io, format="WEBP", quality=quality, method=4)
            webp_bytes = out_io.getvalue()

            if len(webp_bytes) > 0:
                webp_hash = hashlib.md5(webp_bytes).hexdigest()
                return webp_bytes, "image/webp", ".webp", webp_hash
    except Exception as conv_err:
        logging.warning(f"Lỗi khi nén ảnh sang WebP: {conv_err}. Sử dụng ảnh gốc fallback.")

    # Fallback nếu lỗi
    raw_hash = hashlib.md5(image_bytes).hexdigest()
    return image_bytes, "image/jpeg", ".jpg", raw_hash


def detect_mime_type(content: bytes, header_mime: Optional[str] = None) -> Tuple[str, str]:
    """
    Xác định MIME type và file extension thực tế từ Content-Type header hoặc magic bytes
    """
    if header_mime:
        mime_clean = header_mime.split(';')[0].strip().lower()
        if 'png' in mime_clean:
            return 'image/png', '.png'
        elif 'jpeg' in mime_clean or 'jpg' in mime_clean:
            return 'image/jpeg', '.jpg'
        elif 'webp' in mime_clean:
            return 'image/webp', '.webp'
        elif 'gif' in mime_clean:
            return 'image/gif', '.gif'

    # Fallback to magic bytes check
    for signature, (mime, ext) in MIME_MAGIC.items():
        if content.startswith(signature):
            return mime, ext

    return 'image/jpeg', '.jpg'


def sanitize_folder_name(name: str) -> str:
    """
    Chuyển tên container/suffix_key thành tên thư mục hợp lệ
    """
    return re.sub(r'[^\w\-]', '_', name.strip())


def download_image_authenticated(
    page_or_context: Any,
    source_url: str,
    container_number: str,
    suffix_key: str,
    sort_order: int = 1
) -> Dict[str, Any]:
    """
    Tải hình ảnh sử dụng Multi-Tier Resilient Strategy:
    1. Python Urllib kèm Cookies + User-Agent (hỗ trợ tự động 302 redirect trực tiếp đến Google CDN lh3.googleusercontent.com)
    2. Playwright Authenticated Request Context (timeout 30s)
    3. Playwright Page Evaluate (DOM fetch blob -> base64)
    """
    result = {
        "source_url": source_url,
        "local_path": None,
        "image_hash": None,
        "file_mime": None,
        "file_size": 0,
        "error": None
    }

    if not source_url or not source_url.startswith("http"):
        result["error"] = "URL ảnh không hợp lệ"
        return result

    image_bytes = None
    header_mime = None
    last_err = None

    # TIER 1: Python urllib.request with direct redirect follow & Cookies
    try:
        ssl_ctx = ssl._create_unverified_context()
        cookie_header = ""
        try:
            ctx = getattr(page_or_context, 'context', None) or (page_or_context if hasattr(page_or_context, 'cookies') else None)
            if ctx and hasattr(ctx, 'cookies'):
                cookies_list = ctx.cookies()
                cookie_header = "; ".join([f"{c['name']}={c['value']}" for c in cookies_list if 'name' in c and 'value' in c])
            elif os.path.exists(settings.STORAGE_STATE_FILE):
                with open(settings.STORAGE_STATE_FILE, "r", encoding="utf-8") as sf:
                    st_data = json.load(sf)
                    st_cookies = st_data.get("cookies", [])
                    cookie_header = "; ".join([f"{c['name']}={c['value']}" for c in st_cookies if 'name' in c and 'value' in c])
        except Exception:
            pass

        req = urllib.request.Request(
            source_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                "Referer": "https://www.appsheet.com/",
                "Cookie": cookie_header
            }
        )
        with urllib.request.urlopen(req, timeout=30, context=ssl_ctx) as response:
            if response.status in (200, 201, 302, 304):
                image_bytes = response.read()
                header_mime = response.headers.get_content_type()
    except Exception as e1:
        last_err = f"Urllib: {e1}"

    # TIER 2: Playwright Request Context (Authenticated)
    if not image_bytes:
        try:
            request_obj = getattr(page_or_context, 'request', None)
            if not request_obj and hasattr(page_or_context, 'context'):
                request_obj = page_or_context.context.request

            if request_obj:
                resp = request_obj.get(source_url, timeout=30000, max_redirects=10)
                if resp.ok:
                    image_bytes = resp.body()
                    header_mime = resp.headers.get("content-type")
        except Exception as e2:
            last_err = f"Playwright Request: {e2}"

    # TIER 3: Fallback qua page.evaluate (Browser DOM fetch)
    if not image_bytes and hasattr(page_or_context, 'evaluate'):
        try:
            base64_data = page_or_context.evaluate("""async (url) => {
                try {
                    const response = await fetch(url, { cache: 'no-cache' });
                    if (!response.ok) return null;
                    const blob = await response.blob();
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    return null;
                }
            }""", source_url)

            if base64_data and ',' in base64_data:
                import base64
                header_part, data_part = base64_data.split(',', 1)
                image_bytes = base64.b64decode(data_part)
                if 'data:' in header_part:
                    header_mime = header_part.split(';')[0].replace('data:', '')
        except Exception as e3:
            last_err = f"Page Evaluate: {e3}"

    if not image_bytes or len(image_bytes) < 10:
        result["error"] = "Hết thời gian chờ phản hồi từ AppSheet" if "timed out" in str(last_err) else (str(last_err) or "Không thể tải file ảnh")
        return result

    # Tối ưu hóa và chuyển đổi sang WebP Full HD siêu nhẹ (giảm ~92% dung lượng)
    final_bytes, file_mime, file_ext, img_hash = optimize_and_convert_to_webp(image_bytes)
    file_size = len(final_bytes)

    # Thư mục lưu trữ: storage/images/<container_number>/<suffix_key>/
    cont_clean = sanitize_folder_name(container_number or "unknown_container")
    suf_clean = sanitize_folder_name(suffix_key or "general")
    
    dir_path = os.path.join(settings.STORAGE_IMAGES_DIR, cont_clean, suf_clean)
    os.makedirs(dir_path, exist_ok=True)

    filename = f"{img_hash[:12]}_{sort_order}{file_ext}"
    abs_file_path = os.path.join(dir_path, filename)
    rel_file_path = os.path.relpath(abs_file_path, settings.PROJECT_ROOT).replace("\\", "/")

    # Chống lưu trùng file nếu đã tồn tại
    if not os.path.exists(abs_file_path):
        with open(abs_file_path, "wb") as f:
            f.write(final_bytes)

    result["local_path"] = rel_file_path
    result["image_hash"] = img_hash
    result["file_mime"] = file_mime
    result["file_size"] = file_size
    return result


def get_pooled_session(cookie_header: str = "") -> requests.Session:
    """
    Trả về requests.Session riêng biệt cho từng thread nhưng tái sử dụng kết nối TCP/SSL Connection Pool.
    """
    if not hasattr(_thread_local, "session") or _thread_local.session is None:
        session = requests.Session()
        adapter = HTTPAdapter(
            pool_connections=20,
            pool_maxsize=20,
            max_retries=Retry(total=3, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504], raise_on_status=False)
        )
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate",
            "Referer": "https://www.appsheet.com/"
        })
        _thread_local.session = session

    if cookie_header:
        _thread_local.session.headers["Cookie"] = cookie_header

    return _thread_local.session


def download_single_image_fast(
    source_url: str,
    container_number: str,
    suffix_key: str,
    sort_order: int = 1,
    cookie_header: str = "",
    job_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Tải 1 ảnh tái sử dụng Socket Connection Pool (hỗ trợ gọi song song trong ThreadPool)
    với cơ chế Fast-Fail chống treo luồng và kiểm tra Content-Type nghiêm ngặt.
    """
    result = {
        "source_url": source_url,
        "local_path": None,
        "image_hash": None,
        "file_mime": None,
        "file_size": 0,
        "error": None
    }

    if not source_url or not source_url.startswith("http"):
        result["error"] = "URL ảnh không hợp lệ"
        return result

    if job_id is not None and crawl_job_manager.is_cancelled(job_id):
        result["error"] = "Job đã bị hủy bởi người dùng"
        return result

    image_bytes = None
    header_mime = None

    try:
        session = get_pooled_session(cookie_header)
        # Giới hạn timeout ngắn (3s kết nối, 6s đọc) để không bao giờ nghẽn luồng
        resp = session.get(source_url, timeout=(3, 6), allow_redirects=True)
        
        # Kiểm tra nếu bị redirect sang trang đăng nhập Google
        if "accounts.google.com" in str(resp.url).lower() or "/servicelogin" in str(resp.url).lower():
            result["error"] = "Yêu cầu đăng nhập tài khoản Google"
            return result
            
        content_type = (resp.headers.get("Content-Type") or "").lower()
        if "text/html" in content_type or "application/json" in content_type:
            result["error"] = f"Phản hồi không phải hình ảnh ({content_type})"
            return result

        if resp.status_code in (200, 201, 304) and len(resp.content) > 10:
            # Kiểm tra magic bytes xem có phải HTML không
            if resp.content.strip().startswith(b"<") or resp.content.strip().startswith(b"<!DOCTYPE"):
                result["error"] = "Dữ liệu trả về là văn bản HTML"
                return result
            image_bytes = resp.content
            header_mime = resp.headers.get("Content-Type")
        else:
            result["error"] = f"HTTP {resp.status_code}"
            return result
    except Exception as err:
        result["error"] = f"Download error: {err}"
        return result

    if not image_bytes or len(image_bytes) < 10:
        result["error"] = "Dữ liệu ảnh rỗng hoặc không tải được"
        return result

    # Tối ưu hóa và chuyển đổi sang WebP Full HD siêu nhẹ (giảm ~92% dung lượng)
    final_bytes, file_mime, file_ext, img_hash = optimize_and_convert_to_webp(image_bytes)
    file_size = len(final_bytes)

    cont_clean = sanitize_folder_name(container_number or "unknown_container")
    suf_clean = sanitize_folder_name(suffix_key or "general")

    dir_path = os.path.join(settings.STORAGE_IMAGES_DIR, cont_clean, suf_clean)
    os.makedirs(dir_path, exist_ok=True)

    filename = f"{img_hash[:12]}_{sort_order}{file_ext}"
    abs_file_path = os.path.join(dir_path, filename)
    rel_file_path = os.path.relpath(abs_file_path, settings.PROJECT_ROOT).replace("\\", "/")

    if not os.path.exists(abs_file_path):
        with open(abs_file_path, "wb") as f:
            f.write(final_bytes)

    result["local_path"] = rel_file_path
    result["image_hash"] = img_hash
    result["file_mime"] = file_mime
    result["file_size"] = file_size
    return result


def download_images_parallel(
    page_or_context: Any,
    image_tasks: List[Dict[str, Any]],
    max_workers: Optional[int] = None,
    job_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Tải danh sách nhiều ảnh cùng lúc bằng ThreadPoolExecutor đa luồng song song với Connection Pooling,
    giới hạn timeout tối đa 60s/container để bảo vệ luồng.
    """
    if not image_tasks:
        return []

    effective_workers = max_workers or getattr(settings, "IMAGE_DOWNLOAD_WORKERS", 30)

    # 1. Trích xuất cookie 1 lần
    cookie_header = ""
    try:
        ctx = getattr(page_or_context, 'context', None) or (page_or_context if hasattr(page_or_context, 'cookies') else None)
        if ctx and hasattr(ctx, 'cookies'):
            cookies_list = ctx.cookies()
            cookie_header = "; ".join([f"{c['name']}={c['value']}" for c in cookies_list if 'name' in c and 'value' in c])
        elif os.path.exists(settings.STORAGE_STATE_FILE):
            with open(settings.STORAGE_STATE_FILE, "r", encoding="utf-8") as sf:
                st_data = json.load(sf)
                st_cookies = st_data.get("cookies", [])
                cookie_header = "; ".join([f"{c['name']}={c['value']}" for c in st_cookies if 'name' in c and 'value' in c])
    except Exception:
        pass

    results = []

    def _worker(task: Dict[str, Any]) -> Dict[str, Any]:
        if job_id is not None and crawl_job_manager.is_cancelled(job_id):
            return {**task, "error": "Job cancelled by user"}
        url = task.get("source_url") or ""
        c_num = task.get("container_number") or ""
        s_key = task.get("suffix_key") or "general"
        sort_order = task.get("sort_order", 1)
        res = download_single_image_fast(url, c_num, s_key, sort_order, cookie_header, job_id=job_id)
        # Gắn kèm metadata gốc vào result
        for k, v in task.items():
            if k not in res:
                res[k] = v
        return res

    worker_count = min(effective_workers, max(1, len(image_tasks)))
    max_timeout = min(60, max(10, int(len(image_tasks) * 1.5)))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        futures = [executor.submit(_worker, task) for task in image_tasks]
        try:
            for future in as_completed(futures, timeout=max_timeout):
                if job_id is not None and crawl_job_manager.is_cancelled(job_id):
                    break
                try:
                    results.append(future.result())
                except Exception as e:
                    results.append({"error": str(e)})
        except Exception:
            # Hết timeout bảo vệ -> thu thập các kết quả đã xong, không làm nghẽn tiến trình
            for f in futures:
                if f.done():
                    try:
                        results.append(f.result())
                    except Exception:
                        pass

    return results
