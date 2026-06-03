# Deliveries Endpoints

Tài liệu này mô tả chi tiết các endpoint liên quan đến quản lý phiếu giao.

---

## GET /deliveries/

Lấy danh sách phiếu giao.

### Request

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

### Response (200 OK)

```json
{
  "total": 500,
  "skip": 0,
  "limit": 100,
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

---

## POST /deliveries/

Tạo phiếu giao mới.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
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

### Response (201 Created)

```json
{
  "id": 123,
  "qr_code": "DLV-20260603-001",
  "backup_qr": "DLV-BACKUP-001",
  "status": "Chờ xác nhận",
  "created_at": "2026-06-03T10:30:00"
}
```

---

## GET /deliveries/{id}

Lấy chi tiết phiếu giao.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

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

---

## PUT /deliveries/{id}/receive

Công đoạn nhận xác nhận nhận hàng.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "quantity_received": 98,
  "note": "Nhận đủ, 2 bị hỏng"
}
```

### Response (200 OK)

```json
{
  "id": 1,
  "status": "Đã nhận",
  "quantity_received": 98,
  "received_at": "2026-06-03T11:00:00"
}
```

---

## POST /deliveries/{id}/qc

QC kiểm tra chất lượng.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "result": "Đạt",
  "quantity_error": 2,
  "quantity_returned": 0,
  "note": "2 cái bị sước nhẹ, vẫn dùng được"
}
```

### Response (200 OK)

```json
{
  "id": 1,
  "status": "Hoàn thành",
  "qc_result": "Đạt",
  "qc_at": "2026-06-03T11:30:00"
}
```

---

## GET /deliveries/{plan_id}

Lấy danh sách phiếu giao theo kế hoạch.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

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

**Last Updated:** 2026-06-03
