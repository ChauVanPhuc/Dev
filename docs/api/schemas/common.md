# Common Schemas

Tài liệu này mô tả các schemas dùng chung cho API.

---

## Paginated Response Schema

```json
{
  "total": 100,
  "skip": 0,
  "limit": 20,
  "items": []
}
```

**Fields:**
- `total` (int): Tổng số bản ghi
- `skip` (int): Số bản ghi bỏ qua
- `limit` (int): Số bản ghi mỗi trang
- `items` (array): Danh sách dữ liệu

---

## Error Response Schema

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  }
}
```

**Fields:**
- `error.code` (string): Mã lỗi
- `error.message` (string): Thông báo lỗi
- `error.details` (object): Chi tiết lỗi (optional)

---

## Success Response Schema

```json
{
  "data": {},
  "message": "Success"
}
```

**Fields:**
- `data` (object/array): Dữ liệu trả về
- `message` (string): Thông báo thành công

---

**Last Updated:** 2026-06-03
