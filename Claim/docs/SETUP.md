# Hướng Dẫn Cài Đặt & Vận Hành SmartFlow Claim_v2

Tài liệu này hướng dẫn thiết lập môi trường và khởi chạy ứng dụng **SmartFlow Claim_v2 (Quanly_Claim)**.

---

## ⚡ 1. Khởi chạy Nhanh Nhất (1-Click)

Chỉ cần double-click file tại thư mục gốc:
```cmd
run_project.bat
```
Script này tự động:
- Kiểm tra môi trường Python và Node.js.
- Khởi động Backend FastAPI (`app.main:app`) tại cổng `8000`.
- Khởi động Frontend Vite tại cổng `5173`.
- Mở 2 cửa sổ terminal riêng biệt để theo dõi logs.

---

## 2. Yêu cầu môi trường
- **Python**: 3.10+ (Đã kiểm thử trên Python 3.14)
- **Node.js**: 18+ (kèm npm)
- **Database**: Microsoft SQL Server (MSSQL) với ODBC Driver 17 for SQL Server.

---

## 3. Cài đặt Backend Thủ công

1. Di chuyển vào thư mục `BackEnd/`:
   ```bash
   cd BackEnd
   ```

2. Tạo và kích hoạt môi trường ảo (tùy chọn nhưng khuyến nghị):
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   ```

3. Cài đặt các thư viện phụ thuộc:
   ```bash
   pip install -r requirements.txt
   ```

4. Cấu hình biến môi trường `.env`:
   Tạo file `.env` tại thư mục `BackEnd/.env` dựa trên `.env.example`:
   ```ini
   DB_SERVER=localhost
   DB_NAME=SmartFlow_Claim
   DB_USER=sa
   DB_PASSWORD=your_password
   SECRET_KEY=your_secret_key_here
   ```
   *(Nếu dùng Windows Authentication/Trusted Connection, để trống DB_USER và DB_PASSWORD)*

5. Khởi động Backend API Server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - Swagger API Docs: `http://localhost:8000/docs`
   - Health Check: `http://localhost:8000/health`

---

## 3. Cài đặt Frontend

1. Di chuyển vào thư mục `FrontEnd/`:
   ```bash
   cd FrontEnd
   ```

2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```

3. Khởi chạy máy chủ phát triển (Dev Server):
   ```bash
   npm run dev
   ```
   Truy cập giao diện: `http://localhost:5173`

4. Đóng gói cho môi trường Production:
   ```bash
   npm run build
   ```
   File đầu ra tĩnh sẽ nằm tại `FrontEnd/dist/`.

---

## 4. Các tuyến đường giao diện chính (Routes)
- `/admin/claims` : Quản lý khiếu nại khách hàng, import PDF & xuất Excel.
- `/admin/defects` : Quản lý danh mục lỗi G7, lỗi khách hàng & bảng phân loại.
- `/admin/prices` : Quản lý đơn giá tủ & cấu hình bảng giá.
