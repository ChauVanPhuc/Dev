# Hướng dẫn Thiết lập và Chạy Dự án ERP_G7 Lần đầu tiên



Tài liệu này hướng dẫn bạn từng bước để cài đặt môi trường và khởi chạy toàn bộ hệ thống ERP_G7 (bao gồm Backend, Frontend và Mobile) trên máy tính mới.



---



## 1. Yêu cầu Tiên quyết (Prerequisites)



Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:



1.  **Node.js (Bản LTS):** [Tải tại đây](https://nodejs.org/). (Dùng cho Frontend và Mobile).

2.  **Python (3.10 trở lên):** [Tải tại đây](https://www.python.org/). (Dùng cho Backend).

3.  **Microsoft SQL Server:** (Bản Express hoặc Standard).

4.  **ODBC Driver 17 for SQL Server:** [Tải tại đây](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server). (Bắt buộc để Python kết nối được DB).



---



## 2. Thiết lập Backend (Python / FastAPI)



Di chuyển vào thư mục `BackEnd/`:



### Bước 2.1: Tạo môi trường ảo (Virtual Environment)

```powershell

python -m venv venv

.\venv\Scripts\activate

```



### Bước 2.2: Cài đặt các thư viện phụ thuộc

```powershell

pip install -r requirements.txt

```



### Bước 2.3: Cấu hình Biến môi trường

Tạo file `.env` trong thư mục `BackEnd/` với nội dung sau:

```env

DB_SERVER=TEN_MAY_TINH\TEN_INSTANCE (Ví dụ: DESKTOP-ABC\SQLEXPRESS)

DB_NAME=ERP_G7_v2

DB_USER=sa

DB_PASSWORD=MatKhauCuaBan



SECRET_KEY=mot_chuoi_ky_tu_bat_ky_dai

ALGORITHM=HS256

ACCESS_TOKEN_EXPIRE_MINUTES=480

```



### Bước 2.4: Chạy Backend

```powershell

uvicorn src.app.main:app --reload

```

-   **API sẽ chạy tại:** `http://127.0.0.1:8000`

-   **Tài liệu API:** `http://127.0.0.1:8000/docs`



## 3. Thiết lập Frontend (Web Admin & Mobile App qua Workspaces)

Từ nay, dự án sử dụng **npm Workspaces** để quản lý thư viện tập trung. Toàn bộ thư viện của cả bản Web và bản Mobile đều được cài đặt và lưu chung tại duy nhất thư mục gốc `FrontEnd/node_modules/`.

### Bước 3.1: Cài đặt thư viện (Dùng chung cho cả Web và Mobile)

Di chuyển vào thư mục `FrontEnd/`:
```powershell
npm install
```

> [!IMPORTANT]
> **KHÔNG** di chuyển vào thư mục `FrontEnd/Mobile/` để chạy `npm install`. Lệnh cài đặt ở thư mục gốc `FrontEnd/` sẽ tự động cài đặt đầy đủ thư viện cho cả hai bên.

### Bước 3.2: Chạy Frontend (Web Admin)

Tại thư mục `FrontEnd/`:
```powershell
npm run dev
```
-   **Ứng dụng sẽ chạy tại:** `http://localhost:5173`

---

## 4. Thiết lập Mobile App (Web-based Mobile UI)

### Bước 4.1: Chạy Mobile UI

Di chuyển vào thư mục `FrontEnd/Mobile/`:
```powershell
npm run dev
```
-   **Ứng dụng sẽ chạy tại:** `http://localhost:3000` (Xem thông tin cụ thể trong terminal).
-   **Lưu ý:** Mobile UI dùng lệnh `vite --host` để bạn có thể truy cập từ điện thoại trong cùng mạng LAN bằng địa chỉ IP của máy tính.

---



## 5. Kiểm tra Kết nối (Verification)



1.  Mở trình duyệt truy cập vào **Frontend** (`localhost:5173`).

2.  Thử đăng nhập bằng tài khoản trong cơ sở dữ liệu.

3.  Nếu đăng nhập thành công và thấy dữ liệu, nghĩa là Frontend đã kết nối thông suốt với Backend.

4.  Thực hiện tương tự với **Mobile UI**.



---



## 6. Các lỗi thường gặp (Troubleshooting)



-   **Lỗi "ODBC Driver not found":** Bạn chưa cài đặt ODBC Driver 17 cho SQL Server.

-   **Lỗi kết nối Database:** Kiểm tra lại `DB_SERVER` và `DB_PASSWORD` trong file `.env`. Đảm bảo dịch vụ SQL Server đang chạy.

-   **Lỗi "Port already in use":** Một ứng dụng khác đang dùng port 8000 hoặc 5173. Hãy tắt ứng dụng đó hoặc đổi port trong file cấu hình.



---

*Chúc bạn thiết lập dự án thành công!*

