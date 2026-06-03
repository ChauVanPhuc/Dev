# 🏭 ERP G7 - Hệ thống Điều hành Sản xuất Thông minh

ERP G7 là hệ thống quản lý sản xuất toàn diện, kết nối từ đơn hàng đến từng công đoạn tại xưởng (Shopfloor) thông qua nền tảng Web và Mobile.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan dự án](#-tổng-quánự án)
2. [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
3. [Tính năng nổi bật](#-tính-năng-nổi-bật)
4. [Hướng dẫn cài đặt](#-hướng-dẫn-cài-ặt)
5. [Hướng dẫn sử dụng](#-hướng-dẫn-sử-dụng)
6. [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
7. [Quy tắc phát triển](#-quy-tắc-phát-triển)
8. [Triển khai sản xuất](#-triển-khai-sản-xuất)
9. [Giải quyết sự cố](#-giải-quyết-sự-cố)
10. [Nhật ký thay đổi](#-nhật-ký-thay-đổi)

---

## 🎯 Tổng quan dự án (Project Overview)

ERP G7 là hệ thống ERP (Enterprise Resource Planning) được thiết kế đặc biệt cho nhà máy sản xuất nội thất G7, giúp:

- **Quản lý đơn hàng**: Từ khi nhận đơn đến khi giao hàng thành công
- **Theo dõi sản xuất**: Theo dõi tiến độ từng công đoạn (Định hình → Lắp ráp → Sơn → Đóng gói)
- **Bàn giao nội bộ**: Quản lý quá trình bàn giao giữa các công đoạn sản xuất
- **Kiểm tra chất lượng (QC)**: Tích hợp quy trình kiểm tra chất lượng tại từng bước
- **Thông báo thời gian thực**: Cập nhật tức thời cho công nhân và quản lý
- **Quản lý kho**: Theo dõi tồn kho và vị trí hàng hóa

### Công nghệ sử dụng (Tech Stack)

| Phần | Công nghệ | Phiên bản | Mô tả |
|------|-----------|----------|-------|
| **Backend** | Python (FastAPI) | 3.13+ | API RESTful, WebSocket, Authentication |
| **Database** | SQL Server | 2019+ | Lưu trữ dữ liệu sản xuất, đơn hàng, QC |
| **Web Admin** | React + Vite | 18+ | Dashboard quản lý cho khối văn phòng |
| **Mobile App** | React Native + Capacitor | 6+ | Ứng dụng cho công nhân tại xưởng |
| **Authentication** | JWT (HS256) | - | Token-based authentication |
| **Real-time** | WebSocket + FCM | - | Thông báo thời gian thực |
| **Deployment** | Cloudflare Tunnel | - | Truy cập từ xa an toàn |

---

## 🏗️ Kiến trúc hệ thống (System Architecture)

### 1. Mô hình Client-Server

```
┌─────────────────────────────────────────────────────────────┐
│                     CLOUD INFRASTRUCTURE                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Cloudflare Tunnel (smartflowg7.cloud)               │  │
│  │  - SSL/HTTPS                                          │  │
│  │  - DDoS Protection                                    │  │
│  │  - Global Access                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER (FastAPI)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Layer (/api/v1)                                  │  │
│  │  - Authentication (JWT)                               │  │
│  │  - Business Logic                                     │  │
│  │  - Data Validation                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WebSocket Server (/ws/{user_id})                    │  │
│  │  - Real-time Notifications                            │  │
│  │  - Live Updates                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Database Layer (SQL Server)                         │  │
│  │  - SQLAlchemy ORM                                      │  │
│  │  - Connection Pooling                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐         ┌──────────────────┐
│   WEB ADMIN      │         │   MOBILE APP     │
│  (React + Vite)  │         │ (React Native)   │
│                  │         │                  │
│  - Dashboard     │         │  - Login         │
│  - Orders        │         │  - Plan Tracking │
│  - Production    │         │  - Delivery      │
│  - QC Reports    │         │  - Inspection    │
│  - Reports       │         │  - QR Scan       │
└──────────────────┘         └──────────────────┘
```

### 2. Luồng dữ liệu chính (Data Flow)

```
Đơn Hàng (Order)
    │
    ▼
Kế Hoạch Sản Xuất (Product Plan)
    │
    ▼
Lệnh Sản Xuất (Production Order)
    │
    ├─► Công đoạn Định hình (Stage 1)
    │       │
    │       ├─► Tạo Phiếu Giao (Delivery)
    │       │       │
    │       │       ├─► Công đoạn Lắp ráp (Stage 2) nhận hàng
    │       │       │       │
    │       │       │       ├─► QC Kiểm tra chất lượng
    │       │       │       │       │
    │       │       │       │       ├─► Đạt: Tiếp tục
    │       │       │       │       └─► Lỗi: Trả hàng (Return)
    │       │       │       │
    │       │       │       └─► Tạo Phiếu Giao tiếp theo
    │       │       │
    │       │       └─► Công đoạn Sơn (Stage 3)
    │       │               │
    │       │               └─► Công đoạn Đóng gói (Stage 4)
    │       │
    │       └─► Hoàn thành sản phẩm
    │
    └─► Kho (Warehouse)
            │
            └─► Giao hàng cho khách hàng
```

---

## ⚡ Tính năng nổi bật (Key Features)

### 1. Tối ưu hóa Hiệu suất Dashboard (High Performance)

**Thuật toán FIFO 2-Pass:**
- Xử lý logic tính toán tiến độ sản xuất phức tạp
- Giảm độ trễ từ >10 giây xuống <0.1 giây cho 53k+ bản ghi
- Tối ưu hóa truy vấn SQL Server với proper indexing

**SKU Deduplication:**
- Gộp nhóm BOM theo SKU thay vì ID sản phẩm đơn lẻ
- Giảm tải dữ liệu xử lý lên đến 80%
- Tăng tốc độ load Dashboard đáng kể

### 2. Thông báo thời gian thực (Real-time Notifications)

**Push Notifications:**
- Firebase Cloud Messaging (FCM) cho Mobile App
- WebSocket cho Web Admin
- Tự động thông báo khi:
  - Có phiếu giao mới
  - QC hoàn thành kiểm tra
  - Có hàng trả về
  - Cập nhật tiến độ

**Tương tác đa kênh:**
- Công nhân nhận lệnh sản xuất ngay lập tức
- QC nhận thông báo kết quả kiểm tra
- Quản lý theo dõi tiến độ real-time

### 3. Hệ thống Định danh & Quét mã (QR Code System)

**Truy xuất nhanh:**
- Quét mã QR để nhận diện:
  - Lệnh sản xuất (PO)
  - Kiện hàng (Pallet)
  - Vị trí kho
- Tốc độ quét: <1 giây

**Dữ liệu chuẩn xác:**
- Loại bỏ sai sót nhập liệu thủ công
- Tích hợp camera native của thiết bị
- Hỗ trợ nhiều loại mã: QR, Barcode

### 4. Hạ tầng & Tên miền (Cloud Infrastructure)

**Global Access:**
- Tên miền riêng: `smartflowg7.cloud`
- Bảo mật SSL/HTTPS
- Truy cập từ bất kỳ đâu

**Cloudflare Tunnel:**
- Kết nối ổn định
- Tốc độ cao
- Bảo mật tuyệt đối
- Không cần mở port public

### 5. Hệ thống Cập nhật Tự động (OTA Update)

**Cơ chế hoạt động:**
- Tự động kiểm tra phiên bản
- Thông báo cập nhật trong app
- Tải và cài đặt APK trực tiếp
- Không cần qua trình duyệt

**Lợi ích:**
- Đảm bảo tất cả user dùng phiên bản mới nhất
- Giảm thời gian triển khai
- Tăng trải nghiệm người dùng

### 6. Quản lý Mã QR Dự phòng (Backup QR System)

**Cấp phát thông minh:**
- Tự động gán mã QR dự phòng khi QR chính bị hư
- Mỗi kiện hàng có 1 QR chính + 1 QR dự phòng

**Giải phóng đúng thời điểm:**
- Chỉ giải phóng sau khi QC hoàn tất xác nhận
- Đảm bảo truy xuất nguồn gốc liên tục
- Tránh mất dữ liệu trong quá trình kiểm tra

### 7. Lọc Đơn hàng Chính xác trên Mobile (Exact Order Filter)

**Lọc theo PO:**
- Chọn chính xác 1 đơn hàng (PO)
- Chỉ hiển thị đơn đó thay vì toàn bộ kế hoạch
- Giảm tải dữ liệu cho Mobile App

**Anti-stale closure:**
- Khắc phục React closure cũ
- Đảm bảo bộ lọc luôn truyền giá trị mới nhất
- Fix 3 bug: stale closure, dropdown mất dữ liệu, reset PO

### 8. Màn hình Phiếu Ngoại lệ Nâng cao (Exception Delivery Enhancement)

**Hiển thị Tỷ lệ %:**
- Cột Lệch/Trả → Tỷ lệ phần trăm
- Dễ dàng đánh giá mức độ ngoại lệ

**Phân loại ngoại lệ:**
- "Đặc trưng ngoại lệ" → "Loại ngoại lệ"
- Rõ ràng, dễ hiểu hơn

### 9. Tài khoản Đa Công đoạn (Multi-Stage Account)

**Gộp công đoạn:**
- Gán nhiều công đoạn cho 1 tài khoản
- Ví dụ: Lắp ráp + Chà nhám dùng chung 1 tài khoản
- Giảm số lượng tài khoản cần quản lý

**Selector công đoạn:**
- Hiển thị thanh chọn công đoạn
- Chuyển đổi nhanh giữa các công đoạn
- Tự động lọc dữ liệu theo công đoạn đang chọn

### 10. Màn hình Kế hoạch Bàn giao (Delivery Plan)

**Tính năng:**
- Hiển thị danh sách chi tiết cần giao
- Số lượng kế hoạch vs thực tế
- Trạng thái giao/nhận
- Lọc theo công đoạn
- Xuất Excel/PDF báo cáo

---

## 🚀 Hướng dẫn cài đặt (Installation Guide)

### Yêu cầu hệ thống (Prerequisites)

| Yêu cầu | Phiên bản tối thiểu | Ghi chú |
|---------|-------------------|---------|
| Python | 3.13+ | Backend |
| Node.js | 18+ | Frontend |
| SQL Server | 2019+ | Database |
| Git | Latest | Version control |
| Capacitor CLI | 6+ | Mobile build |

### 1. Clone Repository

```bash
git clone https://github.com/mynd02work-bit/SmartFlow.git
cd SmartFlow
git checkout test_v1
```

### 2. Cài đặt Backend

```bash
# Tạo virtual environment
cd BackEnd
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt

# Cấu hình database
# Mở file config/database.py và cập nhật:
# - DATABASE_URL: Chuỗi kết nối SQL Server
# - SECRET_KEY: Key cho JWT

# Chạy migration (nếu có)
python database/migrations/run_migrations.py

# Khởi động server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Cài đặt Web Admin

```bash
# Di chuyển đến thư mục FrontEnd
cd ../FrontEnd

# Cài đặt dependencies
npm install

# Cấu hình API URL (nếu cần)
# Mở file shared/services/api.js và cập nhật getBaseURL()

# Chạy development server
npm run dev

# Hoặc build cho production
npm run build
```

### 4. Cài đặt Mobile App

```bash
# Di chuyển đến thư mục Mobile
cd Mobile

# Cài đặt dependencies
npm install

# Cấu hình API URL (nếu cần)
# Mở file shared/services/api.js và cập nhật getBaseURL()

# Chạy development server
npm run dev

# Build cho Android
npm run build:android

# Build cho iOS
npm run build:ios
```

### 5. Cấu hình SQL Server

```sql
-- Tạo database
CREATE DATABASE SmartFlowDB;

-- Tạo user (nếu cần)
CREATE LOGIN smartflow_user WITH PASSWORD = 'your_password';
CREATE USER smartflow_user FOR LOGIN smartflow_user;
ALTER ROLE db_owner ADD MEMBER smartflow_user;

-- Chạy script tạo bảng (nếu có)
-- Xem file BackEnd/docs/DATABASE.md
```

### 6. Chạy toàn bộ hệ thống

Sử dụng script `run_project.bat` (Windows):

```batch
@echo off
echo Chọn chế độ chạy:
echo 1. Chạy Backend Server
echo 2. Chạy Web Admin
echo 3. Chạy Mobile App
echo 4. Chạy tất cả
echo 5. Build tất cả cho production

set /p choice="Nhập lựa chọn (1-5): "

if "%choice%"=="1" (
    cd BackEnd
    uvicorn app.main:app --host 0.0.0.0 --port 8000
)
if "%choice%"=="2" (
    cd FrontEnd
    npm run dev
)
if "%choice%"=="3" (
    cd FrontEnd/Mobile
    npm run dev
)
if "%choice%"=="4" (
    start cmd /k "cd BackEnd && uvicorn app.main:app --host 0.0.0.0 --port 8000"
    start cmd /k "cd FrontEnd && npm run dev"
    start cmd /k "cd FrontEnd/Mobile && npm run dev"
)
if "%choice%"=="5" (
    cd FrontEnd && npm run build
    cd FrontEnd/Mobile && npm run build
)
```

---

## 📖 Hướng dẫn sử dụng (User Guide)

### 1. Đăng nhập (Login)

**Web Admin:**
- Truy cập: `http://localhost:3000/login`
- Nhập username và password
- Chọn vai trò (Admin, Manager, QC)

**Mobile App:**
- Mở app trên điện thoại
- Nhập username và password
- Chọn công đoạn (nếu có nhiều)

### 2. Quản lý Đơn hàng (Order Management)

**Tạo đơn hàng mới:**
1. Vào menu "Đơn hàng"
2. Nhấn "Tạo đơn hàng mới"
3. Nhập thông tin:
   - Mã đơn hàng (PO)
   - Tên khách hàng
   - Số lượng
   - Ngày giao hàng
4. Nhấn "Lưu"

**Theo dõi đơn hàng:**
- Xem danh sách tất cả đơn hàng
- Lọc theo trạng thái
- Xem chi tiết từng đơn

### 3. Quản lý Kế hoạch Sản xuất (Production Plan)

**Tạo kế hoạch:**
1. Vào menu "Kế hoạch sản xuất"
2. Nhấn "Tạo kế hoạch mới"
3. Chọn đơn hàng liên quan
4. Chia nhỏ thành các lệnh sản xuất
5. Gán cho từng công đoạn

**Theo dõi tiến độ:**
- Xem Dashboard tổng quan
- Biểu đồ tiến độ theo tuần
- Biểu đồ tiến độ theo công đoạn
- Danh sách lệnh sản xuất

### 4. Tạo Phiếu Giao (Delivery Create)

**Trên Mobile App:**
1. Vào màn hình "Thông tin kế hoạch"
2. Chọn lệnh sản xuất đang thực hiện
3. Nhấn "Tạo phiếu giao"
4. Chọn linh kiện/chi tiết cần giao
5. Nhập số lượng giao
6. Chụp ảnh minh chứng (tối đa 3 ảnh)
7. Nhập ghi chú (nếu có)
8. Nhấn "Xác nhận"
9. Nhận mã QR Giao Nhận

**Chi tiết:** Xem file [docs/delivery_create_guide.md](./docs/delivery_create_guide.md)

### 5. Nhận Phiếu Giao (Delivery Receive)

**Trên Mobile App:**
1. Quét mã QR Giao Nhận
2. Hoặc vào menu "Phiếu giao"
3. Chọn phiếu cần nhận
4. Kiểm tra thông tin:
   - Tên chi tiết
   - Số lượng
   - Ảnh minh chứng
5. Nhấn "Nhận hàng"
6. QC sẽ kiểm tra chất lượng

### 6. Kiểm tra Chất lượng (QC Inspection)

**Kiểm tra đầu vào:**
1. Vào menu "Kiểm tra đầu vào"
2. Chọn phiếu giao cần kiểm
3. Kiểm tra:
   - Số lượng nhận
   - Số lượng lỗi
   - Ảnh lỗi (nếu có)
4. Nhập kết quả:
   - Đạt: Tiếp tục
   - Lỗi: Trả hàng

**Kiểm tra theo công đoạn:**
1. Vào menu "Kiểm tra công đoạn"
2. Chọn công đoạn
3. Kiểm tra từng chi tiết
4. Đánh giá chất lượng

**Chi tiết:** Xem file [docs/qc_inspection_guide.md](./docs/qc_inspection_guide.md)

### 7. Quét mã QR (QR Scan)

**Sử dụng:**
1. Mở camera trong app
2. Quét mã QR trên kiện hàng
3. Hiển thị thông tin:
   - Lệnh sản xuất
   - Chi tiết
   - Số lượng
   - Vị trí

**Chi tiết:** Xem file [docs/qr_scan_guide.md](./docs/qr_scan_guide.md)

---

## 📁 Cấu trúc thư mục (Directory Structure)

```
SmartFlow_v2/
├── BackEnd/                          # Backend API (FastAPI)
│   ├── app/                          # Main application
│   │   ├── main.py                   # Entry point
│   │   ├── routes.py                 # API routes
│   │   └── dependencies.py           # Dependencies
│   ├── modules/                      # Business logic modules
│   │   ├── auth/                     # Authentication
│   │   ├── production/               # Production management
│   │   ├── delivery/                 # Delivery management
│   │   ├── inspection/               # QC inspection
│   │   ├── notification/             # Notifications
│   │   ├── equipment/                # Equipment management
│   │   ├── kpi/                      # KPI tracking
│   │   ├── capa/                     # CAPA management
│   │   └── system/                   # System settings
│   ├── config/                       # Configuration
│   │   └── database.py               # Database connection
│   ├── database/                     # Database scripts
│   │   ├── migrations/               # Migration scripts
│   │   └── seeders/                  # Seed data
│   ├── docs/                         # Documentation
│   │   ├── DATABASE.md               # Database schema
│   │   ├── AUTH_SYSTEM.md            # Auth system
│   │   └── API_FLOWS.md              # API flows
│   ├── tests/                        # Unit tests
│   └── requirements.txt              # Python dependencies
│
├── FrontEnd/                         # Frontend Applications
│   ├── Web/                          # Web Admin (React)
│   │   ├── app/                      # App entry
│   │   ├── Dashboard/                # Dashboard views
│   │   ├── Plan/                     # Plan management
│   │   ├── Order/                    # Order management
│   │   ├── Delivery/                 # Delivery management
│   │   ├── Product/                  # Product management
│   │   ├── Auth/                     # Authentication
│   │   ├── System/                   # System settings
│   │   ├── Shared/                   # Shared components
│   │   │   ├── Views/                # Shared views
│   │   │   ├── Services/             # API services
│   │   │   ├── Store/                # State management
│   │   │   └── Hooks/                # Custom hooks
│   │   ├── assets/                   # Static assets
│   │   ├── styles/                   # CSS styles
│   │   ├── package.json              # Node dependencies
│   │   └── vite.config.js            # Vite config
│   │
│   ├── Mobile/                       # Mobile App (React Native)
│   │   ├── src/                      # Source code
│   │   │   ├── views/                # Screen views
│   │   │   ├── components/           # UI components
│   │   │   ├── services/             # API services
│   │   │   ├── store/                # State management
│   │   │   └── hooks/                # Custom hooks
│   │   ├── app/                      # Capacitor config
│   │   ├── assets/                   # Static assets
│   │   ├── package.json              # Node dependencies
│   │   └── vite.config.js            # Vite config
│   │
│   ├── shared/                       # Shared between Web & Mobile
│   │   ├── hooks/                    # Shared hooks
│   │   ├── services/                 # Shared services
│   │   ├── store/                    # Shared store
│   │   └── constants/                # Shared constants
│   │
│   ├── package.json                  # Root package.json
│   ├── vite.config.js                # Root Vite config
│   └── index.html                    # Entry HTML
│
├── docs/                             # Documentation
│   ├── delivery_create_guide.md      # Delivery create guide
│   ├── delivery_info_guide.md        # Delivery info guide
│   ├── handover_tracking_guide.md    # Handover tracking guide
│   ├── login_guide.md                # Login guide
│   ├── plan_tracking_guide.md         # Plan tracking guide
│   ├── qc_inspection_guide.md        # QC inspection guide
│   ├── qc_return_guide.md            # QC return guide
│   └── qr_scan_guide.md              # QR scan guide
│
├── run_project.bat                   # Run script
├── start_server.bat                  # Start backend server
├── README.md                         # This file
├── SETUP_GUIDE.md                    # Setup guide
└── MIGRATION_GUIDE.md                # Migration guide
```

---

## 🛠️ Quy tắc phát triển (Development Standards)

### 1. Quy tắc đặt tên (Naming Conventions)

**Python (Backend):**
- Biến/Hàm: `snake_case` (ví dụ: `get_user_by_id`)
- Class: `PascalCase` (ví dụ: `UserService`)
- Constant: `UPPER_SNAKE_CASE` (ví dụ: `MAX_RETRY_COUNT`)
- File: `snake_case.py` (ví dụ: `user_service.py`)

**JavaScript/React (Frontend):**
- Biến/Hàm: `camelCase` (ví dụ: `getUserById`)
- Component: `PascalCase` (ví dụ: `UserProfileCard`)
- Constant: `UPPER_SNAKE_CASE` (ví dụ: `MAX_RETRY_COUNT`)
- File: `PascalCase.jsx` (component), `camelCase.js` (utility)

### 2. Quy tắc commit (Commit Messages)

**Format:**
```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: Thêm tính năng mới
- `fix`: Sửa lỗi
- `docs`: Thêm/sửa tài liệu
- `style`: Đổi format code (không ảnh hưởng logic)
- `refactor`: Refactor code
- `test`: Thêm/sửa test
- `chore`: Thay đổi cấu hình, tool

**Ví dụ:**
```
feat: thêm chức năng lọc đơn hàng theo PO

- Thêm dropdown chọn PO trên màn hình Plan Tracking
- Fix bug stale closure khi đổi PO
- Cập nhật API endpoint hỗ trợ filter by PO

Closes #123
```

### 3. Quy tắc code (Code Standards)

**Python:**
- Sử dụng type hints
- Docstring cho mọi function/class
- Maximum line length: 100 characters
- Sử dụng PEP 8

**JavaScript/React:**
- Sử dụng ESLint
- Component functional với hooks
- Props validation với PropTypes
- Maximum line length: 100 characters

### 4. Quy tắc review (Review Process)

1. Tạo branch từ `test_v1`
2. Implement feature
3. Self-test
4. Create Pull Request
5. Code review
6. Merge vào `test_v1`

---

## 🚢 Triển khai sản xuất (Production Deployment)

### 1. Backend Deployment

```bash
# Build Docker image
docker build -t smartflow-backend .

# Run container
docker run -d -p 8000:8000 --name smartflow-backend smartflow-backend

# Hoặc sử dụng systemd service
sudo systemctl start smartflow-backend
sudo systemctl enable smartflow-backend
```

### 2. Web Admin Deployment

```bash
# Build for production
cd FrontEnd
npm run build

# Deploy dist/ folder to web server
# Nginx config example:
server {
    listen 80;
    server_name smartflowg7.cloud;
    
    location / {
        root /var/www/smartflow/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
    }
    
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3. Mobile App Deployment

```bash
# Build Android APK
cd FrontEnd/Mobile
npm run build:android

# Build iOS IPA
npm run build:ios

# Upload to distribution platform
# - Google Play Store
# - Apple App Store
# - Internal distribution (Firebase App Distribution)
```

### 4. Database Migration

```bash
# Run migration
cd BackEnd
python database/migrations/run_migrations.py

# Backup database
sqlcmd -S localhost -U sa -P password -Q "BACKUP DATABASE SmartFlowDB TO DISK='C:\backup\SmartFlowDB.bak'"

# Restore database
sqlcmd -S localhost -U sa -P password -Q "RESTORE DATABASE SmartFlowDB FROM DISK='C:\backup\SmartFlowDB.bak'"
```

---

## 🔧 Giải quyết sự cố (Troubleshooting)

### 1. Backend không khởi động

**Lỗi:** `ModuleNotFoundError: No module named 'fastapi'`

**Giải pháp:**
```bash
cd BackEnd
pip install -r requirements.txt
```

### 2. Database connection failed

**Lỗi:** `Cannot connect to SQL Server`

**Giải pháp:**
- Kiểm tra SQL Server đang chạy
- Kiểm tra connection string trong `config/database.py`
- Kiểm tra firewall cho phép port 1433

### 3. Frontend build failed

**Lỗi:** `Cannot resolve import`

**Giải pháp:**
- Kiểm tra import path
- Kiểm tra vite.config.js aliases
- Chạy `npm install` để cài đặt dependencies

### 4. WebSocket connection failed

**Lỗi:** `WebSocket connection closed`

**Giải pháp:**
- Kiểm tra backend đang chạy
- Kiểm tra WebSocket URL (không có `/api/v1` prefix)
- Kiểm tra firewall cho phép port 8000

### 5. Mobile app không nhận thông báo

**Lỗi:** `Push notification not received`

**Giải pháp:**
- Kiểm tra FCM configuration
- Kiểm tra device token
- Kiểm tra notification permission

---

## 📅 Nhật ký thay đổi (Changelog)

### Version 1.2.0 (2026-05-20)

**New Features:**
- Hỗ trợ tài khoản đa công đoạn — gộp Lắp ráp & Chà nhám vào cùng 1 tài khoản với selector công đoạn
- Sửa luồng giải phóng Mã QR dự phòng — chỉ giải phóng sau khi QC xác nhận (không phải khi SX nhận hàng)
- Nâng cấp trang Phiếu ngoại lệ: cột Tỷ lệ (%), Loại ngoại lệ, nút Xác minh
- Thêm bộ lọc chính xác theo Mã đơn hàng (PO) trên Mobile Plan Tracking

**Bug Fixes:**
- Ẩn mục "Kích thước" trên màn hình Kiểm tra đầu vào (MB2.4)
- Đổi "SL Loại" → "SL Lỗi" với giá trị mặc định 0
- Fix 3 bug stale closure, dropdown mất dữ liệu, reset PO khi đổi kế hoạch

### Version 1.1.5 (2026-05-07)

**New Features:**
- Triển khai thuật toán FIFO 2-Pass tối ưu Dashboard (giảm 99% thời gian load)
- Hoàn thiện hệ thống "Sticky Header & Filter" cho trang Theo dõi kế hoạch
- Ra mắt bộ công cụ `ONE_CLICK_PUBLISH.bat` giúp tự động hóa quy trình phát hành

**Bug Fixes:**
- Sửa lỗi đường dẫn tiếng Việt khi build APK bằng cơ chế `subst` ổ đĩa ảo

### Version 1.1.0 (2026-04-27)

**New Features:**
- Xây dựng hệ thống tài liệu toàn diện (Wiki)
- Thêm logic tự động tính số lượng thực nhận và x2 giới hạn
- Tích hợp WebSocket cho thông báo thời gian thực

**Bug Fixes:**
- Sửa lỗi import paths trong Mobile App
- Sửa lỗi import paths trong Web Admin
- Sửa lỗi backend router imports

### Version 1.0.0 (2026-04-01)

**Initial Release:**
- Hệ thống ERP cơ bản
- Quản lý đơn hàng
- Quản lý kế hoạch sản xuất
- Tạo/Nhận phiếu giao
- Kiểm tra chất lượng
- Quét mã QR
- Thông báo thời gian thực

---

## 📞 Hỗ trợ (Support)

### Liên hệ

- **Email:** support@smartflowg7.cloud
- **GitHub:** https://github.com/mynd02work-bit/SmartFlow/issues
- **Documentation:** https://github.com/mynd02work-bit/SmartFlow/wiki

### Tài liệu tham khảo

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [SQL Server Documentation](https://docs.microsoft.com/en-us/sql/)

---

## 📜 License

Dự án ERP G7 - Phát triển bởi Đội ngũ Công nghệ G7.

© 2026 G7 Manufacturing. All rights reserved.

---

**Last Updated:** 2026-06-03
**Branch:** test_v1
**Version:** 1.2.1
