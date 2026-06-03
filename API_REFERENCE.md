# 📚 API Reference - SmartFlow v2

Tài liệu này cung cấp danh sách đầy đủ tất cả API endpoints của SmartFlow v2, bao gồm request/response examples, error codes, và authentication requirements.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan](#-tổng-quánverview)
2. [Authentication](#-authentication)
3. [Accounts & Users](#-accounts--users)
4. [Roles & Permissions](#-roles--permissions)
5. [Production Plans](#-production-plans)
6. [Orders](#-orders)
7. [Products](#-products)
8. [Deliveries](#-deliveries)
9. [Inspections](#-inspections)
10. [Notifications](#-notifications)
11. [Error Codes](#-error-codes)

---

## 🎯 Tổng quan (Overview)

### Base URL

```
Development: http://localhost:8000/api/v1
Production: https://smartflowg7.cloud/api/v1
```

### Authentication

Tất cả endpoints (trừ login) yêu cầu JWT token trong header:

```
Authorization: Bearer <access_token>
```

### Response Format

**Success Response:**
```json
{
  "data": { ... },
  "message": "Success"
}
```

**Error Response:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

---

## 🔐 Authentication

### POST /accounts/login

Đăng nhập hệ thống.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "Administrator",
    "email": "admin@smartflow.cloud",
    "role": "admin",
    "stages": [
      {"code": "STAGE_1", "name": "Định hình"},
      {"code": "STAGE_2", "name": "Lắp ráp"}
    ]
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Username hoặc password sai
- `429 Too Many Requests`: Quá nhiều lần đăng nhập sai

### POST /accounts/logout

Đăng xuất hệ thống.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Successfully logged out"
}
```

### POST /accounts/refresh

Refresh access token.

**Request Body:**
```json
{
  "refresh_token": "refresh_token_here"
}
```

**Response (200 OK):**
```json
{
  "access_token": "new_access_token_here",
  "token_type": "bearer"
}
```

---

## 👤 Accounts & Users

### GET /accounts/

Lấy danh sách tài khoản.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (int, optional): Số bản ghi bỏ qua (default: 0)
- `limit` (int, optional): Số bản ghi lấy (default: 100)
- `search` (string, optional): Tìm kiếm theo username/full_name

**Response (200 OK):**
```json
{
  "total": 100,
  "items": [
    {
      "id": 1,
      "username": "admin",
      "full_name": "Administrator",
      "email": "admin@smartflow.cloud",
      "employee_id": "EMP001",
      "status": "Đang sử dụng",
      "role": "admin",
      "created_at": "2026-01-01T00:00:00"
    }
  ]
}
```

### POST /accounts/

Tạo tài khoản mới.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "username": "newuser",
  "password": "Password123!",
  "full_name": "New User",
  "email": "newuser@smartflow.cloud",
  "employee_id": "EMP002",
  "role_id": 2
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "username": "newuser",
  "full_name": "New User",
  "email": "newuser@smartflow.cloud",
  "status": "Đang sử dụng"
}
```

### PUT /accounts/{id}

Cập nhật tài khoản.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "full_name": "Updated Name",
  "email": "updated@smartflow.cloud",
  "status": "Đang sử dụng"
}
```

**Response (200 OK):**
```json
{
  "id": 2,
  "username": "newuser",
  "full_name": "Updated Name",
  "email": "updated@smartflow.cloud",
  "status": "Đang sử dụng"
}
```

### DELETE /accounts/{id}

Xóa tài khoản.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Account deleted successfully"
}
```

### GET /accounts/me

Lấy thông tin tài khoản hiện tại.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "admin",
  "full_name": "Administrator",
  "email": "admin@smartflow.cloud",
  "role": "admin",
  "stages": [
    {"code": "STAGE_1", "name": "Định hình"},
    {"code": "STAGE_2", "name": "Lắp ráp"}
  ]
}
```

---

## 👥 Roles & Permissions

### GET /roles/

Lấy danh sách vai trò.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "name": "admin",
      "description": "Quản trị viên toàn quyền",
      "permissions": [
        {"id": 1, "name": "view_dashboard"},
        {"id": 2, "name": "manage_users"}
      ]
    }
  ]
}
```

### POST /roles/

Tạo vai trò mới.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "supervisor",
  "description": "Giám sát sản xuất",
  "permission_ids": [1, 2, 3, 4]
}
```

**Response (201 Created):**
```json
{
  "id": 4,
  "name": "supervisor",
  "description": "Giám sát sản xuất"
}
```

### GET /roles/{id}/permissions

Lấy quyền hạn theo vai trò.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "role_id": 1,
  "role_name": "admin",
  "permissions": [
    {"id": 1, "name": "view_dashboard"},
    {"id": 2, "name": "manage_users"}
  ]
}
```

### POST /roles/{id}/permissions

Gán quyền hạn cho vai trò.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "permission_ids": [1, 2, 3, 4, 5]
}
```

**Response (200 OK):**
```json
{
  "message": "Permissions assigned successfully"
}
```

### GET /permissions/

Lấy danh sách quyền hạn.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "name": "view_dashboard",
      "description": "Xem dashboard"
    },
    {
      "id": 2,
      "name": "manage_users",
      "description": "Quản lý người dùng"
    }
  ]
}
```

---

## 📋 Production Plans

### GET /plans/

Lấy danh sách kế hoạch sản xuất.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (int, optional): Số bản ghi bỏ qua (default: 0)
- `limit` (int, optional): Số bản ghi lấy (default: 100)
- `status` (int, optional): Lọc theo trạng thái
- `month` (int, optional): Lọc theo tháng
- `year` (int, optional): Lọc theo năm

**Response (200 OK):**
```json
{
  "total": 50,
  "items": [
    {
      "id": 1,
      "code": "KHSX-06-2026",
      "name": "Kế hoạch tháng 6",
      "month": 6,
      "year": 2026,
      "status": 1,
      "created_at": "2026-06-01T00:00:00",
      "estimated_date": "2026-06-30T00:00:00",
      "orders_count": 10
    }
  ]
}
```

### POST /plans/

Tạo kế hoạch sản xuất mới.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "code": "KHSX-07-2026",
  "name": "Kế hoạch tháng 7",
  "month": 7,
  "year": 2026,
  "estimated_date": "2026-07-31T00:00:00"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "code": "KHSX-07-2026",
  "name": "Kế hoạch tháng 7",
  "status": 0,
  "created_at": "2026-06-03T10:00:00"
}
```

### GET /plans/{id}

Lấy chi tiết kế hoạch sản xuất.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "code": "KHSX-06-2026",
  "name": "Kế hoạch tháng 6",
  "month": 6,
  "year": 2026,
  "status": 1,
  "created_at": "2026-06-01T00:00:00",
  "estimated_date": "2026-06-30T00:00:00",
  "finished_date": null,
  "orders": [
    {
      "id": 1,
      "order_code": "PO-2026-001",
      "customer": "Khách hàng A",
      "status": 1
    }
  ]
}
```

### PUT /plans/{id}

Cập nhật kế hoạch sản xuất.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Kế hoạch tháng 6 (Cập nhật)",
  "estimated_date": "2026-07-05T00:00:00",
  "status": 2
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "code": "KHSX-06-2026",
  "name": "Kế hoạch tháng 6 (Cập nhật)",
  "status": 2,
  "updated_at": "2026-06-03T10:30:00"
}
```

### DELETE /plans/{id}

Xóa kế hoạch sản xuất.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Plan deleted successfully"
}
```

### GET /plans/{id}/progress

Lấy tiến độ kế hoạch sản xuất.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "plan_id": 1,
  "total_orders": 10,
  "completed_orders": 3,
  "in_progress_orders": 5,
  "pending_orders": 2,
  "overall_progress": 50,
  "stage_progress": [
    {"stage": "Định hình", "progress": 80},
    {"stage": "Lắp ráp", "progress": 50},
    {"stage": "Sơn", "progress": 30},
    {"stage": "Đóng gói", "progress": 10}
  ]
}
```

---

## 📦 Orders

### GET /orders/

Lấy danh sách đơn hàng.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (int, optional): Số bản ghi bỏ qua (default: 0)
- `limit` (int, optional): Số bản ghi lấy (default: 100)
- `plan_id` (int, optional): Lọc theo kế hoạch
- `status` (int, optional): Lọc theo trạng thái
- `search` (string, optional): Tìm kiếm theo order_code/customer

**Response (200 OK):**
```json
{
  "total": 100,
  "items": [
    {
      "id": 1,
      "order_code": "PO-2026-001",
      "production_code": "SX-2026-001",
      "customer": "Khách hàng A",
      "customer_code": "CUST001",
      "partner_po": "PO-001",
      "order_status": 1,
      "delivery_date": "2026-07-01T00:00:00",
      "estimated_date": "2026-06-25T00:00:00",
      "plan_id": 1,
      "is_priority": 1,
      "priority_score": 100
    }
  ]
}
```

### POST /orders/

Tạo đơn hàng mới.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "order_code": "PO-2026-002",
  "production_code": "SX-2026-002",
  "customer": "Khách hàng B",
  "customer_code": "CUST002",
  "partner_po": "PO-002",
  "delivery_date": "2026-07-15T00:00:00",
  "estimated_date": "2026-07-10T00:00:00",
  "plan_id": 1,
  "is_priority": 0
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "order_code": "PO-2026-002",
  "customer": "Khách hàng B",
  "status": 0,
  "created_at": "2026-06-03T10:00:00"
}
```

### GET /orders/{id}

Lấy chi tiết đơn hàng.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "order_code": "PO-2026-001",
  "customer": "Khách hàng A",
  "order_status": 1,
  "delivery_date": "2026-07-01T00:00:00",
  "estimated_date": "2026-06-25T00:00:00",
  "plan_id": 1,
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "quantity": 100,
      "unit_price": 500000
    }
  ],
  "products": [
    {
      "id": 1,
      "sku": "PROD-001",
      "name": "Sản phẩm A",
      "quantity": 100
    }
  ]
}
```

### PUT /orders/{id}

Cập nhật đơn hàng.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "customer": "Khách hàng A (Cập nhật)",
  "delivery_date": "2026-07-05T00:00:00",
  "is_priority": 1
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "order_code": "PO-2026-001",
  "customer": "Khách hàng A (Cập nhật)",
  "is_priority": 1,
  "updated_at": "2026-06-03T10:30:00"
}
```

### DELETE /orders/{id}

Xóa đơn hàng.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Order deleted successfully"
}
```

---

## 🏭 Products

### GET /products/

Lấy danh sách sản phẩm.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (int, optional): Số bản ghi bỏ qua (default: 0)
- `limit` (int, optional): Số bản ghi lấy (default: 100)
- `category_id` (int, optional): Lọc theo danh mục
- `order_id` (int, optional): Lọc theo đơn hàng

**Response (200 OK):**
```json
{
  "total": 200,
  "items": [
    {
      "id": 1,
      "sku": "PROD-001",
      "name": "Sản phẩm A",
      "category_id": 1,
      "price": 500000,
      "material": "Gỗ sồi",
      "color": "Nâu",
      "status": "Active",
      "quantity": 100,
      "unit": "Bộ"
    }
  ]
}
```

### POST /products/

Tạo sản phẩm mới.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "sku": "PROD-002",
  "name": "Sản phẩm B",
  "category_id": 1,
  "price": 600000,
  "material": "Gỗ thông",
  "color": "Trắng",
  "unit": "Bộ"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "sku": "PROD-002",
  "name": "Sản phẩm B",
  "status": "Active",
  "created_at": "2026-06-03T10:00:00"
}
```

### GET /products/{id}

Lấy chi tiết sản phẩm.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "sku": "PROD-001",
  "name": "Sản phẩm A",
  "category_id": 1,
  "price": 500000,
  "material": "Gỗ sồi",
  "color": "Nâu",
  "length": 100,
  "width": 50,
  "height": 30,
  "weight": 15,
  "status": "Active",
  "quantity": 100,
  "order_qty": 100,
  "production_qty": 105,
  "loss_qty": 5,
  "total_qty": 105,
  "unit": "Bộ",
  "specification": "100x50x30cm",
  "bom_details": [
    {
      "id": 1,
      "part_name": "Chân ghế",
      "quantity": 4,
      "unit": "Cái"
    }
  ]
}
```

### PUT /products/{id}

Cập nhật sản phẩm.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Sản phẩm A (Cập nhật)",
  "price": 550000,
  "quantity": 95
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "sku": "PROD-001",
  "name": "Sản phẩm A (Cập nhật)",
  "price": 550000,
  "quantity": 95,
  "updated_at": "2026-06-03T10:30:00"
}
```

### DELETE /products/{id}

Xóa sản phẩm.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Product deleted successfully"
}
```

---

## 🚚 Deliveries

### GET /deliveries/

Lấy danh sách phiếu giao.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (int, optional): Số bản ghi bỏ qua (default: 0)
- `limit` (int, optional): Số bản ghi lấy (default: 100)
- `plan_id` (int, optional): Lọc theo kế hoạch
- `delivery_stage` (string, optional): Lọc theo công đoạn giao
- `receiving_stage` (string, optional): Lọc theo công đoạn nhận
- `status` (string, optional): Lọc theo trạng thái

**Response (200 OK):**
```json
{
  "total": 500,
  "items": [
    {
      "id": 1,
      "delivery_stage": "Định hình",
      "receiving_stage": "Lắp ráp",
      "part_name": "Chân ghế",
      "quantity_total": 100,
      "quantity_received": 98,
      "quantity_error": 2,
      "status": "Hoàn thành",
      "plan_id": 1,
      "created_at": "2026-06-03T10:00:00",
      "qr_code": "DLV-20260603-001"
    }
  ]
}
```

### POST /deliveries/

Tạo phiếu giao mới.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```
plan_id: 1
delivery_stage: "Định hình"
receiving_stage: "Lắp ráp"
part_name: "Chân ghế"
quantity_total: 100
specification: "Gỗ sồi, 50x50mm"
note: "Giao buổi sáng"
files: [image1.jpg, image2.jpg, image3.jpg]
```

**Response (201 Created):**
```json
{
  "id": 123,
  "qr_code": "DLV-20260603-001",
  "backup_qr": "DLV-BACKUP-001",
  "status": "Chờ xác nhận",
  "created_at": "2026-06-03T10:30:00"
}
```

### GET /deliveries/{id}

Lấy chi tiết phiếu giao.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "delivery_stage": "Định hình",
  "receiving_stage": "Lắp ráp",
  "part_name": "Chân ghế",
  "specification": "Gỗ sồi, 50x50mm",
  "quantity_total": 100,
  "quantity_received": 98,
  "quantity_error": 2,
  "quantity_returned": 0,
  "status": "Hoàn thành",
  "note": "Giao buổi sáng",
  "plan_id": 1,
  "order_id": 1,
  "created_at": "2026-06-03T10:00:00",
  "qr_code": "DLV-20260603-001",
  "details": [
    {
      "id": 1,
      "part_name": "Chân ghế",
      "quantity": 100,
      "order_code": "PO-2026-001"
    }
  ],
  "images": [
    {
      "id": 1,
      "image_url": "/static/uploads/deliveries/img1.jpg"
    }
  ]
}
```

### PUT /deliveries/{id}/receive

Công đoạn nhận xác nhận nhận hàng.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "quantity_received": 98,
  "note": "Nhận đủ, 2 bị hỏng"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "status": "Đã nhận",
  "quantity_received": 98,
  "received_at": "2026-06-03T11:00:00"
}
```

### POST /deliveries/{id}/qc

QC kiểm tra chất lượng.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "result": "Đạt",
  "quantity_error": 2,
  "quantity_returned": 0,
  "note": "2 cái bị sước nhẹ, vẫn dùng được"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "status": "Hoàn thành",
  "qc_result": "Đạt",
  "qc_at": "2026-06-03T11:30:00"
}
```

### GET /deliveries/{plan_id}

Lấy danh sách phiếu giao theo kế hoạch.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "plan_id": 1,
  "deliveries": [
    {
      "id": 1,
      "delivery_stage": "Định hình",
      "receiving_stage": "Lắp ráp",
      "status": "Hoàn thành"
    }
  ]
}
```

---

## 🔬 Inspections

### GET /input-inspection/

Lấy danh sách kiểm tra đầu vào.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (int, optional): Số bản ghi bỏ qua (default: 0)
- `limit` (int, optional): Số bản ghi lấy (default: 100)
- `delivery_id` (int, optional): Lọc theo phiếu giao

**Response (200 OK):**
```json
{
  "total": 300,
  "items": [
    {
      "id": 1,
      "delivery_id": 1,
      "checklist_id": 1,
      "quantity_checked": 98,
      "quantity_error": 2,
      "result": "Lỗi",
      "note": "2 cái bị sước",
      "inspected_at": "2026-06-03T11:30:00"
    }
  ]
}
```

### POST /input-inspection/

Tạo kiểm tra đầu vào.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "delivery_id": 123,
  "checklist_id": 1,
  "quantity_checked": 98,
  "quantity_error": 2,
  "defect_type_id": 5,
  "result": "Lỗi",
  "note": "2 cái bị sước"
}
```

**Response (201 Created):**
```json
{
  "id": 456,
  "delivery_id": 123,
  "result": "Lỗi",
  "inspected_at": "2026-06-03T11:30:00"
}
```

### GET /checklists/

Lấy danh sách checklist.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` (string, optional): Loại checklist (Input, Stage, Daily)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Checklist Kiểm Tra Đầu Vào",
      "type": "Input",
      "items": [
        "Kiểm tra kích thước",
        "Kiểm tra bề mặt",
        "Kiểm tra màu sắc"
      ]
    }
  ]
}
```

### GET /defect-types/

Lấy danh sách loại lỗi.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Sước bề mặt",
      "code": "SCRATCH",
      "description": "Bề mặt bị sước"
    },
    {
      "id": 2,
      "name": "Vết nứt",
      "code": "CRACK",
      "description": "Có vết nứt"
    }
  ]
}
```

---

## 🔔 Notifications

### GET /notifications/

Lấy danh sách thông báo.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (int, optional): Số bản ghi bỏ qua (default: 0)
- `limit` (int, optional): Số bản ghi lấy (default: 20)
- `unread_only` (boolean, optional): Chỉ thông báo chưa đọc

**Response (200 OK):**
```json
{
  "total": 50,
  "unread_count": 5,
  "items": [
    {
      "id": 1,
      "title": "Phiếu giao mới",
      "message": "Bạn có 1 phiếu giao mới cần xác nhận",
      "type": "delivery",
      "created_at": "2026-06-03T10:30:00",
      "is_read": false
    }
  ]
}
```

### PUT /notifications/{id}/seen

Đánh dấu đã xem thông báo.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "is_read": true,
  "seen_at": "2026-06-03T10:35:00"
}
```

### POST /notifications/fcm-token

Cập nhật FCM token.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "fcm_token": "new_fcm_token_here"
}
```

**Response (200 OK):**
```json
{
  "message": "FCM token updated successfully"
}
```

---

## ❌ Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_FAILED` | 401 | Authentication failed |
| `PERMISSION_DENIED` | 403 | Permission denied |
| `RESOURCE_NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Validation error |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "quantity",
      "message": "Quantity must be greater than 0"
    }
  }
}
```

---

## 📞 Hỗ trợ (Support)

Nếu bạn có câu hỏi về API:

1. Kiểm tra **Swagger UI**: http://localhost:8000/docs
2. Kiểm tra **API Flows**: ./BackEnd/docs/API_FLOWS.md
3. Liên hệ **Backend Team**: backend@smartflowg7.cloud

---

**Last Updated:** 2026-06-03
**Version:** 2.0
**Branch:** test_v1
