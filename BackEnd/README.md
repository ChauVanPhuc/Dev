# 🚀 Hướng dẫn Kiến trúc Backend - ERP G7

Chào mừng bạn đến với hệ thống API của ERP G7. Hệ thống được xây dựng để cung cấp dữ liệu cho cả nền tảng Web (FrontEnd) và Ứng dụng di động (Mobile).

## 🛠 Công nghệ cốt lõi
- **Language**: Python 3.10+
- **Framework**: FastAPI (High performance, Auto Swagger/OpenAPI)
- **Database**: SQL Server (MSSQL)
- **ORM**: SQLAlchemy
- **Authentication**: JWT (JSON Web Tokens)

## 📂 Cấu trúc thư mục (Directory Structure)

```txt
SmartFlow_v2/
├── BackEnd/        # Backend API (FastAPI)
│   ├── app/        # Main application
│   │   ├── main.py # Entry point
│   │   ├── routes.py # API routes
│   │   └── dependencies.py # Dependencies
│   ├── modules/     # Business logic modules
│   │   ├── auth/    # Authentication
│   │   ├── production/ # Production management
│   │   ├── delivery/ # Delivery management
│   │   ├── inspection/ # QC inspection
│   │   ├── notification/ # Notifications
│   │   ├── equipment/ # Equipment management
│   │   ├── kpi/     # KPI tracking
│   │   ├── capa/    # CAPA management
│   │   └── system/  # System settings
│   ├── config/      # Configuration
│   │   └── database.py # Database connection
│   ├── database/    # Database scripts
│   │   ├── migrations/ # Migration scripts
│   │   └── seeders/ # Seed data
│   └── docs/        # Documentation
│       ├── DATABASE.md # Database schema
│       └── AUTH_SYSTEM.md # Auth system
```

Kiến trúc Backend của SmartFlow v2 được tổ chức theo mô hình **Modular MVC (Domain-Driven)**. Mỗi module nghiệp vụ nằm trong thư mục `modules/` đều tự đóng gói các thành phần riêng biệt:
- **`routes/`**: Định nghĩa các API endpoints cho module đó.
- **`models/`**: Khai báo cấu trúc bảng cơ sở dữ liệu qua SQLAlchemy.
- **`schemas/`**: Định nghĩa các Pydantic Models để validate dữ liệu đầu vào/đầu ra.
- **`controllers/`**: Chứa toàn bộ logic nghiệp vụ thực thi của module.

## 📝 Quy trình phát triển (Dev Flow)
1. **Thay đổi DB**: Cập nhật file trong `models/` -> Chạy migrations.
2. **Tạo API mới**: Định nghĩa Schema trong `schemas/` -> Viết Route trong `api/` -> Xử lý logic trong `controllers/`.
3. **Tài liệu API**: Truy cập `/docs` trên trình duyệt sau khi chạy server để xem Swagger UI.

## ⚡ Tối ưu hóa hiệu năng (High-Performance Optimizations)

### 1. Chế độ Tải nhanh Kế hoạch sản xuất (`simple=true` ở `/plans/{id}`)
Nhằm tối ưu hóa trải nghiệm trên thiết bị di động khi mở xem nhanh danh sách PO/Sản phẩm của một Kế hoạch lớn (với hàng trăm POs/Sản phẩm):
- **Cơ chế hoạt động**: Bỏ qua toàn bộ luồng xử lý phân tích BOM/FIFO cực kỳ nặng nề (vốn chỉ cần cho việc theo dõi tiến độ chi tiết của Web).
- **Kỹ thuật áp dụng**: Sử dụng cơ chế nạp eager loading (`selectinload(Order.products)`) để gom nạp toàn bộ sản phẩm của hàng trăm PO trong đúng **1 câu lệnh SQL duy nhất**, loại bỏ triệt để lỗi thắt nút cổ chai **N+1 Queries** của SQLAlchemy ORM.
- **Hiệu quả thực tế**: Giảm thời gian phản hồi API của Kế hoạch lớn từ **2.000ms+ xuống dưới 85ms** (Nhanh gấp hơn **24 lần**).

### 2. Thuật toán FIFO 2-Pass (Tính toán tiến độ sản xuất)
Xử lý logic tính toán tiến độ sản xuất phức tạp với độ trễ cực thấp:
- **Vấn đề**: Tính toán tiêu thụ linh kiện cho 53k+ bản ghi deliveries/bom_details mất >10 giây.
- **Giải pháp**: Thuật toán 2-Pass với hash map lookup O(1) thay vì nested loops O(n²).
- **Hiệu quả thực tế**: Giảm thời gian xử lý từ **>10 giây xuống <0.1 giây** (Nhanh gấp hơn **100 lần**).
- **Áp dụng**: Endpoint `/product-progress/{product_id}` và các query tính toán tiến độ sản xuất.

### 3. SKU Deduplication (Gộp nhóm BOM theo SKU)
Giảm tải dữ liệu xử lý bằng cách gộp nhóm BOM theo SKU thay vì ID sản phẩm đơn lẻ:
- **Vấn đề**: Query BOM theo product_id tạo ra quá nhiều bản ghi trùng lặp.
- **Giải pháp**: Gom nhóm theo SKU và sử dụng aggregation functions.
- **Hiệu quả thực tế**: Giảm số lượng bản ghi xử lý từ **hàng triệu xuống hàng nghìn**.
- **Áp dụng**: Query BOM details trong `/plans/{id}` và các endpoint liên quan.

### 4. Database Indexing (Tối ưu hóa truy vấn database)
Thêm index cho các cột thường được query để tránh full table scan:
- **Index được thêm**:
  - `bom_details`: input_stage, output_stage (factory filtering)
  - `deliveries`: plan_id, part_name, specification, status, (plan_id, status), (plan_id, part_name)
  - `input_inspections`: plan_id, stage, part_name, (plan_id, stage)
  - `orders`: plan_id
  - `products`: order_id
  - `delivery_details`: delivery_id, order_id
- **Hiệu quả thực tế**: Giảm thời gian query từ **5-8 giây xuống <100ms** (Nhanh gấp **50-80 lần**).
- **Cách chạy**: `python migrations/add_bom_details_stage_indexes.py`
- **Rebuild định kỳ**: Chạy option 7 trong `run_project.bat` mỗi 6-12 tháng.

---
*Lưu ý: Luôn đóng kết nối DB (Session) sau khi hoàn thành request bằng cách sử dụng `Depends(get_db)`.*
