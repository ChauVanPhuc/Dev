# Orders Endpoints

Tài liệu này mô tả chi tiết các endpoint liên quan đến quản lý đơn hàng.

---

## GET /orders/

Lấy danh sách đơn hàng.

### Request

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

### Response (200 OK)

```json
{
  "total": 100,
  "skip": 0,
  "limit": 100,
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

---

## POST /orders/

Tạo đơn hàng mới.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
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

### Response (201 Created)

```json
{
  "id": 2,
  "order_code": "PO-2026-002",
  "customer": "Khách hàng B",
  "status": 0,
  "created_at": "2026-06-03T10:00:00"
}
```

---

## GET /orders/{id}

Lấy chi tiết đơn hàng.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

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

---

## PUT /orders/{id}

Cập nhật đơn hàng.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "customer": "Khách hàng A (Cập nhật)",
  "delivery_date": "2026-07-05T00:00:00",
  "is_priority": 1
}
```

### Response (200 OK)

```json
{
  "id": 1,
  "order_code": "PO-2026-001",
  "customer": "Khách hàng A (Cập nhật)",
  "is_priority": 1,
  "updated_at": "2026-06-03T10:30:00"
}
```

---

## DELETE /orders/{id}

Xóa đơn hàng.

### Request

**Headers:**
```
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "message": "Order deleted successfully"
}
```

---

**Last Updated:** 2026-06-03
