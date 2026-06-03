# cURL Examples

Ví dụ sử dụng API với cURL.

---

## Login

```bash
curl -X POST "http://localhost:8000/api/v1/accounts/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

---

## Get Plans

```bash
curl -X GET "http://localhost:8000/api/v1/plans/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Create Delivery

```bash
curl -X POST "http://localhost:8000/api/v1/deliveries/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "plan_id=1" \
  -F "delivery_stage=Định hình" \
  -F "receiving_stage=Lắp ráp" \
  -F "part_name=Chân ghế" \
  -F "quantity_total=100" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg"
```

---

## Get Notifications

```bash
curl -X GET "http://localhost:8000/api/v1/notifications/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -G -d "skip=0" -d "limit=20"
```

---

**Last Updated:** 2026-06-03
