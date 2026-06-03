# Notifications Endpoints

Tài liệu này mô tả chi tiết các endpoint liên quan đến quản lý thông báo.

---

## GET /notifications/

Lấy danh sách thông báo.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (int, optional): Số bản ghi bỏ qua (default: 0)
- `limit` (int, optional): Số bản ghi lấy (default: 20)
- `unread_only` (boolean, optional): Chỉ thông báo chưa đọc

### Response (200 OK)

```json
{
  "total": 50,
  "skip": 0,
  "limit": 20,
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

---

## PUT /notifications/{id}/seen

Đánh dấu đã xem thông báo.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "id": 1,
  "is_read": true,
  "seen_at": "2026-06-03T10:35:00"
}
```

---

## POST /notifications/fcm-token

Cập nhật FCM token.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "fcm_token": "new_fcm_token_here"
}
```

### Response (200 OK)

```json
{
  "message": "FCM token updated successfully"
}
```

---

**Last Updated:** 2026-06-03
