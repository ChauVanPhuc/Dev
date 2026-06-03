# Inspections Endpoints

Tài liệu này mô tả chi tiết các endpoint liên quan đến kiểm tra chất lượng (QC).

---

## GET /input-inspection/

Lấy danh sách kiểm tra đầu vào.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `skip` (int, optional): Số bản ghi bỏ qua (default: 0)
- `limit` (int, optional): Số bản ghi lấy (default: 100)
- `delivery_id` (int, optional): Lọc theo phiếu giao

### Response (200 OK)

```json
{
  "total": 300,
  "skip": 0,
  "limit": 100,
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

---

## POST /input-inspection/

Tạo kiểm tra đầu vào.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
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

### Response (201 Created)

```json
{
  "id": 456,
  "delivery_id": 123,
  "result": "Lỗi",
  "inspected_at": "2026-06-03T11:30:00"
}
```

---

## GET /checklists/

Lấy danh sách checklist.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` (string, optional): Loại checklist (Input, Stage, Daily)

### Response (200 OK)

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

---

## GET /defect-types/

Lấy danh sách loại lỗi.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

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

**Last Updated:** 2026-06-03
