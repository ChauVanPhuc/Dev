# Production Plans Endpoints

Tài liệu này mô tả chi tiết các endpoint liên quan đến quản lý kế hoạch sản xuất.

---

## GET /plans/

Lấy danh sách kế hoạch sản xuất.

### Request

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

### Response (200 OK)

```json
{
  "total": 50,
  "skip": 0,
  "limit": 100,
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

---

## POST /plans/

Tạo kế hoạch sản xuất mới.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "code": "KHSX-07-2026",
  "name": "Kế hoạch tháng 7",
  "month": 7,
  "year": 2026,
  "estimated_date": "2026-07-31T00:00:00"
}
```

### Response (201 Created)

```json
{
  "id": 2,
  "code": "KHSX-07-2026",
  "name": "Kế hoạch tháng 7",
  "status": 0,
  "created_at": "2026-06-03T10:00:00"
}
```

---

## GET /plans/{id}

Lấy chi tiết kế hoạch sản xuất.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

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

---

## PUT /plans/{id}

Cập nhật kế hoạch sản xuất.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Kế hoạch tháng 6 (Cập nhật)",
  "estimated_date": "2026-07-05T00:00:00",
  "status": 2
}
```

### Response (200 OK)

```json
{
  "id": 1,
  "code": "KHSX-06-2026",
  "name": "Kế hoạch tháng 6 (Cập nhật)",
  "status": 2,
  "updated_at": "2026-06-03T10:30:00"
}
```

---

## DELETE /plans/{id}

Xóa kế hoạch sản xuất.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "message": "Plan deleted successfully"
}
```

---

## GET /plans/{id}/progress

Lấy tiến độ kế hoạch sản xuất.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

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

**Last Updated:** 2026-06-03
