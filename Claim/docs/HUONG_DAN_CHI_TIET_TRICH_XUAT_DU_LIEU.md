# HƯỚNG DẪN CHI TIẾT TỪ A-Z: HỆ THỐNG TRÍCH XUẤT DỮ LIỆU APPSHEET & WEB DASHBOARD LOCAL (0MS LATENCY)

> **Tác giả:** Antigravity AI Engineering Team  
> **Dự án:** LPN ATLAS CONTROL SYSTEM  
> **Cập nhật:** 24/08/2026  

---

## 📌 TỔNG QUAN KIẾN TRÚC HỆ THỐNG

### 1. Bài toán ban đầu:
- Dữ liệu gốc nằm trên AppSheet Cloud với **116,586 bức ảnh** kiểm hàng Pallet/Box.
- Truy cập trực tiếp từ trình duyệt bị giới hạn bởi: **Token hết hạn (Expired Signatures)**, **Lỗi CORS**, **Độ trễ tải ảnh cực lớn (1-3s/ảnh)**.

### 2. Giải pháp kiến trúc Local-First:
```
┌────────────────────────┐      ┌──────────────────────────────┐      ┌─────────────────────────────┐
│  AppSheet Cloud API    │ ────>│  Python Extractor & Cookie   │ ────>│  containers.json & lpn.json │
└────────────────────────┘      └──────────────────────────────┘      └─────────────────────────────┘
                                                                                     │
                                                                                     ▼
┌────────────────────────┐      ┌──────────────────────────────┐      ┌─────────────────────────────┐
│ Web Dashboard (Port 8085)│ <────│ Python Server & Image Proxy  │ <────│ 250 Workers Downloader      │
│  Instant 0ms Latency   │      │  (server.py & sync-status)   │      │  images/[Container]/...     │
└────────────────────────┘      └──────────────────────────────┘      └─────────────────────────────┘
```

---

## 🛠️ BƯỚC 1: LẤY COOKIE XÁC THỰC VÀ TRÍCH XUẤT DỮ LIỆU THÔ (RAW DATA)

### 1.1 Lấy Cookie từ Trình Duyệt:
1. Đăng nhập vào AppSheet trên trình duyệt (đăng nhập bằng Google Account).
2. Nhấn `F12` mở **Developer Tools** ➔ Chuyển qua Tab **Network**.
3. Thực hiện thao tác tải lại trang hoặc xem dữ liệu.
4. Tìm Request gửi tới `www.appsheet.com/api/template/...`, click phải chọn **Copy as cURL (cmd)** hoặc copy giá trị chuỗi `Cookie`.
5. Chuỗi Cookie chứa các Token quan trọng: `.JEENEEATH`, `.JEENEEATH-3P`, `.AspNetCore.Antiforgery...`.

### 1.2 Python Script Trích Xuất JSON (`extract_appsheet_data.py`):
```python
import requests
import json
import os

APP_TEMPLATE_ID = "600686db-6622-4b98-a276-02cdb3e0ab2b"
API_URL = f"https://www.appsheet.com/api/template/{APP_TEMPLATE_ID}/"

COOKIE_STRING = "DÁN_CHUỖI_COOKIE_CỦA_BẠN_VÀO_ĐÂY"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Cookie": COOKIE_STRING
}

def fetch_data():
    print("⏳ Đang tải dữ liệu từ AppSheet API...")
    r = requests.get(API_URL, headers=headers, timeout=30)
    if r.status_code == 200:
        data = r.json()
        os.makedirs("data", exist_ok=True)
        
        # Tách dữ liệu thành từng file JSON chức năng
        nested = data.get("NestedDataSets", [])
        for item in nested:
            name = item.get("Name")
            rows = item.get("Rows", [])
            
            if name == "CONTAINER_09_05":
                with open("data/containers.json", "w", encoding="utf-8") as f:
                    json.dump(rows, f, ensure_ascii=False, indent=2)
                print(f"✅ Đã lưu {len(rows)} Containers vào data/containers.json")
                
            elif name == "LPN_11_04":
                with open("data/lpn_details.json", "w", encoding="utf-8") as f:
                    json.dump(rows, f, ensure_ascii=False, indent=2)
                print(f"✅ Đã lưu {len(rows)} LPN Details vào data/lpn_details.json")
                
            elif name == "USERS":
                with open("data/users.json", "w", encoding="utf-8") as f:
                    json.dump(rows, f, ensure_ascii=False, indent=2)
                print(f"✅ Đã lưu {len(rows)} Users vào data/users.json")
    else:
        print(f"❌ Lỗi truy cập API: HTTP {r.status_code}")

if __name__ == "__main__":
    fetch_data()
```

---

## 📁 BƯỚC 2: CẤU TRÚC THƯ MỤC CÂY LƯU TRỮ ẢNH LOCAL

Tất cả ảnh được tổ chức theo tiêu chuẩn Container-centric:
```text
d:\data\appsheet_dashboard\
├── images/
│   ├── NYKU4806734/
│   │   ├── Container_Picture_row0.jpg
│   │   ├── Picture_Pallet_1_row0.jpg
│   │   ├── Picture_Box_1A_row0.jpg
│   │   ├── Picture_Pallet_2_row0.jpg
│   │   └── ... (36-48 ảnh Pallet/Box)
│   ├── GESU_6626125/
│   └── ... (1,815+ Thư mục Container)
├── data/
│   ├── containers.json
│   ├── lpn_details.json
│   ├── users.json
│   └── image_map.json   <-- Bảng tra cứu đường dẫn Local
├── server.py
├── download_all_images.py
├── rewrite_json_to_local.py
├── index.html
├── css/style.css
└── js/app.js
```

---

## 🚀 BƯỚC 3: BỘ TẢI ẢNH SIÊU TỐC 250 LUỒNG (`download_all_images.py`)

Kỹ thuật cốt lõi: **`ThreadPoolExecutor(max_workers=250)`** kết hợp **`urllib3 HTTPAdapter`** tái sử dụng socket TCP và ghi nhận tiến độ `image_map.json` thời gian thực.

```python
import os
import json
import re
import sys
import threading
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from concurrent.futures import ThreadPoolExecutor, as_completed

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = "d:\\data\\appsheet_dashboard"
IMAGES_DIR = os.path.join(BASE_DIR, "images")
DATA_DIR = os.path.join(BASE_DIR, "data")

COOKIE_STRING = "DÁN_COOKIE_CỦA_BẠN_VÀO_ĐÂY"

# Socket Session tái sử dụng kết nối TCP siêu tốc
thread_local = threading.local()

def get_session():
    if not hasattr(thread_local, "session"):
        session = requests.Session()
        adapter = HTTPAdapter(pool_connections=300, pool_maxsize=300, max_retries=Retry(total=2, backoff_factor=0.1))
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Cookie": COOKIE_STRING
        })
        thread_local.session = session
    return thread_local.session

def clean_name(name):
    return re.sub(r'[^a-zA-Z0-9_\-]', '_', str(name).strip())

def download_image_task(args):
    cont_num, field_name, row_idx, url = args
    clean_cont = clean_name(cont_num) or "UNASSIGNED"
    clean_field = clean_name(field_name)
    
    folder = os.path.join(IMAGES_DIR, clean_cont)
    os.makedirs(folder, exist_ok=True)
    
    filename = f"{clean_field}_row{row_idx}.jpg"
    filepath = os.path.join(folder, filename)
    relative_path = f"images/{clean_cont}/{filename}"
    
    # Bỏ qua nếu đã tải trước đó
    if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
        return (url, relative_path, True, "Skipped")
        
    session = get_session()
    try:
        r = session.get(url, timeout=8)
        if r.status_code == 200 and len(r.content) > 500:
            with open(filepath, "wb") as f:
                f.write(r.content)
            return (url, relative_path, True, "Downloaded")
        else:
            return (url, None, False, f"HTTP {r.status_code}")
    except Exception as e:
        return (url, None, False, str(e))

def main():
    print("🔥 KHỞI ĐỘNG X2 CÔNG SUẤT: 250 LUỒNG SONG SONG...")
    os.makedirs(IMAGES_DIR, exist_ok=True)

    with open(os.path.join(DATA_DIR, "containers.json"), "r", encoding="utf-8") as f:
        containers = json.load(f)

    with open(os.path.join(DATA_DIR, "lpn_details.json"), "r", encoding="utf-8") as f:
        lpns = json.load(f)

    download_tasks = []

    # Quét ảnh Container
    for idx, c in enumerate(containers):
        cont_num = c.get("Container number")
        img_url = c.get("Container picture")
        if cont_num and img_url and isinstance(img_url, str) and img_url.startswith("http"):
            download_tasks.append((cont_num, "Container_Picture", idx, img_url))

    # Quét ảnh LPN Chi Tiết (Pallet 1..16, Box 1A..16A)
    for idx, l in enumerate(lpns):
        cont_num = l.get("Container number") or "NO_CONTAINER"
        for k, v in l.items():
            if v and isinstance(v, str) and v.startswith("http") and ("getimageurl" in v or ".jpg" in v or ".png" in v):
                download_tasks.append((cont_num, k, idx, v))

    print(f"🚀 Tổng số ảnh cần tải: {len(download_tasks)}")

    success_cnt = 0
    skipped_cnt = 0
    failed_cnt = 0
    url_mapping = {}

    mapping_path = os.path.join(DATA_DIR, "image_map.json")
    if os.path.exists(mapping_path):
        try:
            with open(mapping_path, "r", encoding="utf-8") as f:
                url_mapping = json.load(f)
        except Exception:
            pass

    # Chạy 250 Workers đa luồng
    with ThreadPoolExecutor(max_workers=250) as executor:
        futures = [executor.submit(download_image_task, task) for task in download_tasks]
        for i, future in enumerate(as_completed(futures), 1):
            url, local_rel_path, success, status = future.result()
            if success:
                if status == "Skipped":
                    skipped_cnt += 1
                else:
                    success_cnt += 1
                url_mapping[url] = local_rel_path
            else:
                failed_cnt += 1

            if i % 500 == 0 or i == len(download_tasks):
                print(f"🔥 [250 THREADS] [{i}/{len(download_tasks)}] | Tải mới: {success_cnt} | Đã có: {skipped_cnt} | Lỗi: {failed_cnt}")
                
                # Lưu đồng bộ định kỳ cho Web Dashboard
                if i % 1000 == 0 or i == len(download_tasks):
                    try:
                        with open(mapping_path, "w", encoding="utf-8") as f:
                            json.dump(url_mapping, f, ensure_ascii=False)
                    except Exception:
                        pass

    print("\n🎉 HOÀN THÀNH TẢI VỀ LOCAL!")

if __name__ == "__main__":
    main()
```

---

## 🌐 BƯỚC 4: SERVER TĨNH & PROXY TỰ ĐỘNG (`server.py`)

Cung cấp 2 tính năng quan trọng:
1. **API `/api/sync-status`**: Cung cấp số đếm ảnh đã tải về cho Widget ở Header web.
2. **Proxy `/proxy-image`**: Đóng vai trò tunnel vượt rào cản CORS & Cookie cho các ảnh chưa tải xong.

```python
import http.server
import socketserver
import urllib.parse
import requests
import os
import sys
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8085
DIRECTORY = "d:\\data\\appsheet_dashboard"
IMAGES_DIR = os.path.join(DIRECTORY, "images")
COOKIE_STRING = "DÁN_COOKIE_CỦA_BẠN_VÀO_ĐÂY"
TOTAL_EXPECTED_IMAGES = 116586

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # Endpoint 1: Trả về tiến độ tải ảnh Live
        if parsed.path == "/api/sync-status":
            downloaded = 0
            if os.path.exists(IMAGES_DIR):
                for root, dirs, files in os.walk(IMAGES_DIR):
                    for f in files:
                        if f.endswith(".jpg") or f.endswith(".png") or f.endswith(".jpeg"):
                            downloaded += 1
            
            pct = round((downloaded / TOTAL_EXPECTED_IMAGES) * 100, 2) if TOTAL_EXPECTED_IMAGES > 0 else 0
            payload = {
                "downloaded": downloaded,
                "total": TOTAL_EXPECTED_IMAGES,
                "percentage": pct
            }
            body = json.dumps(payload).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return

        # Endpoint 2: Proxy ảnh khi chưa có ở Local
        if parsed.path == "/proxy-image":
            query = urllib.parse.parse_qs(parsed.query)
            target_url = query.get("url", [None])[0]
            if not target_url:
                self.send_error(400, "Missing url parameter")
                return
            
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Cookie": COOKIE_STRING
                }
                r = requests.get(target_url, headers=headers, timeout=15)
                if r.status_code == 200:
                    self.send_response(200)
                    self.send_header("Content-Type", r.headers.get("Content-Type", "image/jpeg"))
                    self.send_header("Content-Length", str(len(r.content)))
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(r.content)
                else:
                    self.send_error(r.status_code, f"AppSheet status {r.status_code}")
            except Exception as e:
                self.send_error(500, str(e))
        else:
            super().do_GET()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"🚀 Dashboard Server running on http://localhost:{PORT}")
        httpd.serve_forever()
```

---

## 🎨 BƯỚC 5: FRONTEND WEB DASHBOARD THÔNG MINH (`js/app.js`)

Logic hiển thị ảnh ưu tiên 3 cấp độ:
1. **Cấp 1**: Nếu đường dẫn ảnh đã có ở Local ➔ Mở trực tiếp với **độ trễ 0ms**.
2. **Cấp 2**: Nếu file Local lỗi ➔ Tự động fallback sang `/proxy-image?url=...` để tải qua Proxy xác thực.
3. **Cấp 3**: Nếu Proxy lỗi ➔ Hiển thị Card `NO IMAGE` / `Mở link gốc`.

### Đoạn mã hiển thị ảnh đại diện thông minh:
```javascript
// Helper giải mã ảnh tối ưu
function getResolvedImageUrl(imgStr) {
  if (!imgStr) return '';
  if (imgStr.startsWith('images/')) return imgStr; // Link local sẵn có
  if (state.imageMap && state.imageMap[imgStr]) {
    return state.imageMap[imgStr]; // Bảng tra cứu image_map
  }
  return imgStr;
}

// Global Image Fallback Error Handler
function onImageError(img) {
  const originalUrl = img.dataset.originalUrl;
  
  if (!img.dataset.proxied && originalUrl && !img.src.includes('/proxy-image')) {
    img.dataset.proxied = "true";
    img.src = `/proxy-image?url=${encodeURIComponent(originalUrl)}`;
    return;
  }

  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent) {
    const errorBox = parent.querySelector('.img-error-box');
    if (errorBox) errorBox.style.display = 'flex';
  }
}
```

---

## ⚡ BƯỚC 6: CHUYỂN ĐỔI CHÍNH THỨC SANG LOCAL HOÀN TOÀN (`rewrite_json_to_local.py`)

Sau khi bộ tải ảnh chạy xong 100%, chạy script này để biến tất cả link Cloud thành đường dẫn Local cố định vĩnh viễn:

```python
import os
import json
import re

DATA_DIR = "d:\\data\\appsheet_dashboard\\data"

def clean_name(name):
    return re.sub(r'[^a-zA-Z0-9_\-]', '_', str(name).strip())

def main():
    print("🔄 Chuyển đổi link trong JSON sang Local...")
    with open(os.path.join(DATA_DIR, "containers.json"), "r", encoding="utf-8") as f:
        containers = json.load(f)

    with open(os.path.join(DATA_DIR, "lpn_details.json"), "r", encoding="utf-8") as f:
        lpns = json.load(f)

    # Chuyển containers.json
    for idx, c in enumerate(containers):
        cont_num = c.get("Container number")
        img_url = c.get("Container picture")
        if cont_num and img_url and isinstance(img_url, str) and img_url.startswith("http"):
            c["Container picture"] = f"images/{clean_name(cont_num)}/Container_Picture_row{idx}.jpg"

    # Chuyển lpn_details.json
    for idx, l in enumerate(lpns):
        clean_cont = clean_name(l.get("Container number") or "NO_CONTAINER")
        for k, v in l.items():
            if v and isinstance(v, str) and v.startswith("http") and ("getimageurl" in v or ".jpg" in v or ".png" in v):
                l[k] = f"images/{clean_cont}/{clean_name(k)}_row{idx}.jpg"

    with open(os.path.join(DATA_DIR, "containers.json"), "w", encoding="utf-8") as f:
        json.dump(containers, f, ensure_ascii=False, indent=2)

    with open(os.path.join(DATA_DIR, "lpn_details.json"), "w", encoding="utf-8") as f:
        json.dump(lpns, f, ensure_ascii=False, indent=2)

    print("✅ Đã cập nhật 100% link sang Local!")

if __name__ == "__main__":
    main()
```

---

## 📋 TÓM TẮT QUY TRÌNH VẬN HÀNH HẰNG NGÀY

1. **Khởi động Dashboard Server**:
   ```cmd
   python d:\data\appsheet_dashboard\server.py
   ```
2. **Khởi động Bộ Tải Ảnh 250 Luồng (Chạy ngầm)**:
   ```cmd
   python d:\data\appsheet_dashboard\download_all_images.py
   ```
3. **Mở Trình Duyệt Web**:
   Truy cập `http://localhost:8085` ➔ Thỏa thích xem toàn bộ Container & Bộ sưu tập 116k+ hình ảnh với tốc độ **0ms instant load**!
