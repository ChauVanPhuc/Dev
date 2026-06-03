# API Documentation - SmartFlow v2

Tài liệu này cung cấp tổng quan về API của SmartFlow v2, bao gồm base URL, authentication, và cấu trúc endpoints.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan](#-tổng-quánverview)
2. [Base URL](#-base-url)
3. [Authentication](#-authentication)
4. [Response Format](#-response-format)
5. [Error Handling](#-error-handling)
6. [Rate Limiting](#-rate-limiting)
7. [Endpoints Overview](#-endpoints-overview)

---

## 🎯 Tổng quan (Overview)

SmartFlow v2 API được xây dựng trên FastAPI và tuân theo RESTful principles. API hỗ trợ:

- JSON request/response
- JWT authentication
- WebSocket cho real-time notifications
- Multipart/form-data cho file uploads
- Pagination cho large datasets

---

## 🔗 Base URL

### Development
```
http://localhost:8000/api/v1
```

### Production
```
https://smartflowg7.cloud/api/v1
```

---

## 🔐 Authentication

### JWT Token

Tất cả endpoints (trừ login) yêu cầu JWT token trong header:

```
Authorization: Bearer <access_token>
```

### Token Lifecycle

- **Access Token**: 8 hours (480 minutes)
- **Refresh Token**: 7 days
- **Algorithm**: HS256

### Login Endpoint

```
POST /api/v1/accounts/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "Administrator",
    "role": "admin"
  }
}
```

---

## 📦 Response Format

### Success Response

```json
{
  "data": { ... },
  "message": "Success"
}
```

### Paginated Response

```json
{
  "total": 100,
  "skip": 0,
  "limit": 20,
  "items": [ ... ]
}
```

---

## ❌ Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 🚦 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /accounts/login | 5 requests | 1 minute |
| POST /deliveries/ | 10 requests | 1 minute |
| POST /input-inspection/ | 20 requests | 1 minute |
| GET /notifications/ | 30 requests | 1 minute |
| Other endpoints | 100 requests | 1 minute |

---

## 📑 Endpoints Overview

### Authentication
- `POST /accounts/login` - Đăng nhập
- `POST /accounts/logout` - Đăng xuất
- `POST /accounts/refresh` - Refresh token
- `GET /accounts/me` - Lấy thông tin user hiện tại

### Accounts & Users
- `GET /accounts/` - Danh sách tài khoản
- `POST /accounts/` - Tạo tài khoản mới
- `PUT /accounts/{id}` - Cập nhật tài khoản
- `DELETE /accounts/{id}` - Xóa tài khoản

### Roles & Permissions
- `GET /roles/` - Danh sách vai trò
- `POST /roles/` - Tạo vai trò mới
- `GET /roles/{id}/permissions` - Lấy quyền hạn theo vai trò
- `POST /roles/{id}/permissions` - Gán quyền hạn
- `GET /permissions/` - Danh sách quyền hạn

### Production Plans
- `GET /plans/` - Danh sách kế hoạch
- `POST /plans/` - Tạo kế hoạch mới
- `GET /plans/{id}` - Chi tiết kế hoạch
- `PUT /plans/{id}` - Cập nhật kế hoạch
- `DELETE /plans/{id}` - Xóa kế hoạch
- `GET /plans/{id}/progress` - Tiến độ kế hoạch

### Orders
- `GET /orders/` - Danh sách đơn hàng
- `POST /orders/` - Tạo đơn hàng mới
- `GET /orders/{id}` - Chi tiết đơn hàng
- `PUT /orders/{id}` - Cập nhật đơn hàng
- `DELETE /orders/{id}` - Xóa đơn hàng

### Products
- `GET /products/` - Danh sách sản phẩm
- `POST /products/` - Tạo sản phẩm mới
- `GET /products/{id}` - Chi tiết sản phẩm
- `PUT /products/{id}` - Cập nhật sản phẩm
- `DELETE /products/{id}` - Xóa sản phẩm

### Deliveries
- `GET /deliveries/` - Danh sách phiếu giao
- `POST /deliveries/` - Tạo phiếu giao mới
- `GET /deliveries/{id}` - Chi tiết phiếu giao
- `PUT /deliveries/{id}/receive` - Xác nhận nhận hàng
- `POST /deliveries/{id}/qc` - QC kiểm tra

### Inspections
- `GET /input-inspection/` - Danh sách kiểm tra đầu vào
- `POST /input-inspection/` - Tạo kiểm tra đầu vào
- `GET /checklists/` - Danh sách checklist
- `GET /defect-types/` - Danh sách loại lỗi

### Notifications
- `GET /notifications/` - Danh sách thông báo
- `PUT /notifications/{id}/seen` - Đánh dấu đã xem
- `POST /notifications/fcm-token` - Cập nhật FCM token

---

## 📚 Chi tiết Endpoints

Xem thêm chi tiết từng endpoint trong thư mục `endpoints/`:

- [Authentication](./endpoints/auth.md)
- [Accounts](./endpoints/accounts.md)
- [Plans](./endpoints/plans.md)
- [Orders](./endpoints/orders.md)
- [Deliveries](./endpoints/deliveries.md)
- [Inspections](./endpoints/inspections.md)
- [Notifications](./endpoints/notifications.md)

---

## 📝 Schemas

Xem request/response schemas trong thư mục `schemas/`:

- [Common Schemas](./schemas/common.md)
- [Auth Schemas](./schemas/auth.md)
- [Delivery Schemas](./schemas/delivery.md)

---

## 💡 Examples

Xem ví dụ sử dụng API trong thư mục `examples/`:

- [cURL Examples](./examples/curl.md)
- [JavaScript Examples](./examples/javascript.md)
- [Python Examples](./examples/python.md)

---

**Last Updated:** 2026-06-03
**Version:** 2.0
**Branch:** test_v1
