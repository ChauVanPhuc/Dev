# Database Schema

Tài liệu này mô tả chi tiết schema của database SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [Authentication Tables](#-authentication-tables)
2. [Production Tables](#-production-tables)
3. [Delivery Tables](#-delivery-tables)
4. [QC Tables](#-qc-tables)
5. [System Tables](#-system-tables)

---

## 👤 Authentication Tables

### accounts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID tự tăng |
| username | NVARCHAR(50) | Unique, Not Null, Index | Tên đăng nhập |
| email | NVARCHAR(100) | Unique, Index | Email |
| hashed_password | NVARCHAR(255) | Not Null | Mật khẩu đã băm |
| full_name | NVARCHAR(100) | | Họ tên đầy đủ |
| employee_id | NVARCHAR(20) | Unique, Index | Mã nhân viên |
| status | NVARCHAR(50) | Default: "Đang sử dụng" | Trạng thái |
| created_at | NVARCHAR(50) | | Ngày tạo |
| fcm_token | NVARCHAR(MAX) | Nullable | FCM token |
| last_notif_seen_id | INT | Default: 0 | ID thông báo đã xem |
| failed_login_attempts | INT | Default: 0 | Số lần đăng nhập sai |
| is_active | BOOLEAN | Default: True | Tài khoản hoạt động |

### roles

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID vai trò |
| name | NVARCHAR(50) | Unique, Not Null | Tên vai trò |
| description | NVARCHAR(255) | | Mô tả |

### permissions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID quyền |
| name | NVARCHAR(100) | Not Null | Tên quyền |
| description | NVARCHAR(255) | | Mô tả |

### stages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID công đoạn |
| name | NVARCHAR(50) | Not Null | Tên công đoạn |
| code | NVARCHAR(50) | Unique | Mã công đoạn |
| order | INT | Default: 0 | Thứ tự |

---

## 🏭 Production Tables

### product_plans

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID kế hoạch |
| code | NVARCHAR(100) | Unique, Index | Mã kế hoạch |
| name | NVARCHAR(255) | | Tên kế hoạch |
| month | INT | | Tháng |
| year | INT | | Năm |
| created_at | DATETIME | Default: GETDATE() | Ngày lập |
| updated_at | DATETIME | Default: GETDATE() | Ngày cập nhật |
| estimated_date | DATETIME | | Ngày dự kiến |
| finished_date | DATETIME | | Ngày hoàn thành |
| status | INT | Default: 0 | Trạng thái |
| account_id | INT | FK(accounts.id) | ID người lập |

### orders

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID đơn hàng |
| order_code | NVARCHAR(50) | Index, Not Null | Mã đơn hàng |
| production_code | NVARCHAR(50) | Index | Lệnh SX |
| partner_po | NVARCHAR(100) | | Số PO |
| customer_code | NVARCHAR(100) | | Mã KH |
| customer | NVARCHAR(255) | | Tên KH |
| account_id | INT | FK(accounts.id) | ID người tạo |
| create_date | DATETIME | Default: GETDATE() | Ngày tạo |
| delivery_date | DATETIME | | Ngày giao |
| start_date | DATETIME | | Ngày bắt đầu |
| end_white_date | DATETIME | | Ngày kết thúc trắng |
| finished_date | DATETIME | | Ngày hoàn thành |
| estimated_date | DATETIME | | Ngày dự kiến |
| order_status | INT | Default: 0 | Trạng thái |
| note | NVARCHAR(MAX) | | Ghi chú |
| plan_id | INT | FK(product_plans.id) | ID kế hoạch |
| product_id | INT | FK(products.id) | ID sản phẩm |
| is_priority | INT | Default: 0 | Đánh dấu ưu tiên |
| priority_score | INT | Default: 0 | Điểm ưu tiên |

### products

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID sản phẩm |
| sku | NVARCHAR(50) | Index | Mã SKU |
| name | NVARCHAR(255) | Not Null | Tên sản phẩm |
| order_id | INT | FK(orders.id) | ID đơn hàng |
| category_id | INT | FK(categories.id) | ID danh mục |
| price | FLOAT | Default: 0.0 | Giá bán |
| material | NVARCHAR(255) | | Chất liệu |
| color | NVARCHAR(100) | | Màu sắc |
| length | FLOAT | Default: 0.0 | Chiều dài |
| width | FLOAT | Default: 0.0 | Chiều rộng |
| height | FLOAT | Default: 0.0 | Chiều cao |
| weight | FLOAT | Default: 0.0 | Trọng lượng |
| status | NVARCHAR(50) | Default: "Active" | Trạng thái |
| quantity | FLOAT | Default: 0.0 | Số lượng |
| order_qty | FLOAT | Default: 0.0 | Số lượng đơn hàng |
| production_qty | FLOAT | Default: 0.0 | Số lượng vào lệnh |
| loss_qty | FLOAT | Default: 0.0 | Số lượng bù hao |
| total_qty | FLOAT | Default: 0.0 | Tổng số lượng |
| net_weight | FLOAT | Default: 0.0 | Tổng trọng lượng tinh |
| total_foreign_currency | FLOAT | Default: 0.0 | Tổng tiền ngoại tệ |
| total_vnd | FLOAT | Default: 0.0 | Tổng tiền VNĐ |
| unit | NVARCHAR(50) | Default: "Bộ" | Đơn vị |
| specification | NVARCHAR(255) | | Quy cách |
| description | NVARCHAR(500) | | Mô tả |
| created_at | DATETIME | Default: GETDATE() | Ngày tạo |

---

## 🚚 Delivery Tables

### deliveries

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID phiếu giao |
| delivery_stage | NVARCHAR(50) | | Công đoạn giao |
| receiving_stage | NVARCHAR(50) | | Công đoạn nhận |
| note | NVARCHAR(500) | | Ghi chú |
| created_at | DATETIME | Default: GETDATE() | Thời gian tạo |
| residual | INT | Default: 0 | Số lượng dư |
| status | NVARCHAR(50) | | Trạng thái |
| plan_id | INT | FK(product_plans.id) | ID kế hoạch |
| sx_delivery | INT | FK(accounts.id) | ID người giao |
| qc_receipt | INT | FK(accounts.id) | ID người QC |
| sx_receipt | INT | FK(accounts.id) | ID người nhận |
| part_name | NVARCHAR(250) | Nullable | Tên chi tiết |
| specification | NVARCHAR(250) | Nullable | Quy cách |
| order_id | INT | FK(orders.id) | Nullable | ID đơn hàng |
| backup_qr | NVARCHAR(100) | Nullable | Mã QR dự phòng |
| quantity_total | INT | Default: 0 | Số lượng tổng |
| quantity_received | INT | Default: 0 | Số lượng nhận |
| quantity_error | INT | Default: 0 | Số lượng lỗi |
| quantity_returned | INT | Default: 0 | Số lượng trả |
| quantity_inspection | INT | Default: 0 | Số lượng kiểm |
| moisture_min | FLOAT | Nullable | Độ ẩm tối thiểu |
| moisture_max | FLOAT | Nullable | Độ ẩm tối đa |

### delivery_details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID chi tiết |
| delivery_id | INT | FK(deliveries.id) | ID phiếu giao |
| part_name | NVARCHAR(50) | | Tên linh kiện |
| quantity | INT | Default: 0 | Số lượng |
| order_id | INT | FK(orders.id) | Nullable | ID đơn hàng |
| element_name | NVARCHAR(100) | Nullable | Tên bộ phận |

---

## 🔬 QC Tables

### input_inspection

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID kiểm tra |
| delivery_id | INT | FK(deliveries.id) | ID phiếu giao |
| checklist_id | INT | FK(checklists.id) | ID checklist |
| defect_type_id | INT | FK(defect_types.id) | Nullable | ID loại lỗi |
| quantity_checked | INT | Default: 0 | Số lượng kiểm |
| quantity_error | INT | Default: 0 | Số lượng lỗi |
| result | NVARCHAR(50) | | Kết quả |
| note | NVARCHAR(500) | | Ghi chú |
| inspector_id | INT | FK(accounts.id) | ID người kiểm |
| inspected_at | DATETIME | Default: GETDATE() | Thời gian kiểm |

### checklists

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID checklist |
| name | NVARCHAR(100) | Not Null | Tên checklist |
| type | NVARCHAR(50) | | Loại checklist |
| items | NVARCHAR(MAX) | | Danh sách items (JSON) |

### defect_types

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID loại lỗi |
| name | NVARCHAR(100) | Not Null | Tên loại lỗi |
| code | NVARCHAR(50) | Unique | Mã loại lỗi |
| description | NVARCHAR(500) | | Mô tả |

---

## ⚙️ System Tables

### system_screens

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID màn hình |
| name | NVARCHAR(100) | Not Null | Tên màn hình |
| code | NVARCHAR(50) | Unique | Mã màn hình |
| route | NVARCHAR(200) | | Route URL |
| icon | NVARCHAR(100) | | Icon |
| order | INT | Default: 0 | Thứ tự |

### backup_qr

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, Identity | ID QR |
| qr_code | NVARCHAR(100) | Unique | Mã QR |
| status | NVARCHAR(50) | Default: "Available" | Trạng thái |
| assigned_delivery_id | INT | FK(deliveries.id) | Nullable | ID phiếu giao |
| created_at | DATETIME | Default: GETDATE() | Ngày tạo |

---

**Last Updated:** 2026-06-03
