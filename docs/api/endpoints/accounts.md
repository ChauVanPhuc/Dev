# Accounts & Users Endpoints

Tài liệu này mô tả chi tiết các endpoint liên quan đến quản lý tài khoản và người dùng.

---

## GET /accounts/

Lấy danh sách tài khoản.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (int, optional): Số bản ghi bỏ qua (default: 0)
- `limit` (int, optional): Số bản ghi lấy (default: 100)
- `search` (string, optional): Tìm kiếm theo username/full_name

### Response (200 OK)

```json
{
  "total": 100,
  "skip": 0,
  "limit": 100,
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

---

## POST /accounts/

Tạo tài khoản mới.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
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

### Response (201 Created)

```json
{
  "id": 2,
  "username": "newuser",
  "full_name": "New User",
  "email": "newuser@smartflow.cloud",
  "status": "Đang sử dụng"
}
```

### Error Responses

**422 Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "username": "Username đã tồn tại"
    }
  }
}
```

---

## PUT /accounts/{id}

Cập nhật tài khoản.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "full_name": "Updated Name",
  "email": "updated@smartflow.cloud",
  "status": "Đang sử dụng"
}
```

### Response (200 OK)

```json
{
  "id": 2,
  "username": "newuser",
  "full_name": "Updated Name",
  "email": "updated@smartflow.cloud",
  "status": "Đang sử dụng"
}
```

---

## DELETE /accounts/{id}

Xóa tài khoản.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "message": "Account deleted successfully"
}
```

---

**Last Updated:** 2026-06-03
