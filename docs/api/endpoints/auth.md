# Authentication Endpoints

Tài liệu này mô tả chi tiết các endpoint liên quan đến authentication.

---

## POST /accounts/login

Đăng nhập hệ thống.

### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

### Response (200 OK)

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

### Error Responses

**401 Unauthorized:**
```json
{
  "error": {
    "code": "AUTH_FAILED",
    "message": "Username hoặc password sai"
  }
}
```

**429 Too Many Requests:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Quá nhiều lần đăng nhập sai, vui lòng thử lại sau",
    "retry_after": 60
  }
}
```

---

## POST /accounts/logout

Đăng xuất hệ thống.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "message": "Successfully logged out"
}
```

---

## POST /accounts/refresh

Refresh access token.

### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "refresh_token": "refresh_token_here"
}
```

### Response (200 OK)

```json
{
  "access_token": "new_access_token_here",
  "token_type": "bearer"
}
```

---

## GET /accounts/me

Lấy thông tin tài khoản hiện tại.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "id": 1,
  "username": "admin",
  "full_name": "Administrator",
  "email": "admin@smartflow.cloud",
  "employee_id": "EMP001",
  "role": "admin",
  "stages": [
    {"code": "STAGE_1", "name": "Định hình"},
    {"code": "STAGE_2", "name": "Lắp ráp"}
  ]
}
```

### Error Responses

**401 Unauthorized:**
```json
{
  "error": {
    "code": "AUTH_FAILED",
    "message": "Token không hợp lệ hoặc đã hết hạn"
  }
}
```

---

**Last Updated:** 2026-06-03
