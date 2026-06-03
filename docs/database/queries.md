# Common Database Queries

Tài liệu này cung cấp các query thường dùng cho database SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [Queries cho Plans](#-queries-cho-plans)
2. [Queries cho Orders](#-queries-cho-orders)
3. [Queries cho Deliveries](#-queries-cho-deliveries)
4. [Queries cho QC](#-queries-cho-qc)
5. [Queries cho Reports](#-queries-cho-reports)

---

## 📋 Queries cho Plans

### Lấy danh sách kế hoạch theo tháng

```sql
SELECT 
    id,
    code,
    name,
    month,
    year,
    status,
    created_at
FROM product_plans
WHERE month = 6 AND year = 2026
ORDER BY created_at DESC;
```

### Lấy tiến độ kế hoạch

```sql
SELECT 
    p.id,
    p.code,
    p.name,
    COUNT(DISTINCT o.id) as total_orders,
    SUM(CASE WHEN o.order_status = 2 THEN 1 ELSE 0 END) as completed_orders,
    SUM(CASE WHEN o.order_status = 1 THEN 1 ELSE 0 END) as in_progress_orders
FROM product_plans p
LEFT JOIN orders o ON p.id = o.plan_id
WHERE p.id = 1
GROUP BY p.id, p.code, p.name;
```

---

## 📦 Queries cho Orders

### Lấy đơn hàng theo kế hoạch

```sql
SELECT 
    o.id,
    o.order_code,
    o.customer,
    o.delivery_date,
    o.estimated_date,
    o.order_status,
    o.is_priority,
    o.priority_score
FROM orders o
WHERE o.plan_id = 1
ORDER BY o.priority_score DESC, o.delivery_date ASC;
```

### Lấy đơn hàng ưu tiên

```sql
SELECT 
    o.id,
    o.order_code,
    o.customer,
    o.delivery_date,
    o.priority_score
FROM orders o
WHERE o.is_priority = 1 AND o.order_status != 2
ORDER BY o.priority_score DESC;
```

---

## 🚚 Queries cho Deliveries

### Lấy phiếu giao theo kế hoạch

```sql
SELECT 
    d.id,
    d.delivery_stage,
    d.receiving_stage,
    d.part_name,
    d.quantity_total,
    d.quantity_received,
    d.quantity_error,
    d.status,
    d.created_at,
    a.full_name as delivery_person
FROM deliveries d
LEFT JOIN accounts a ON d.sx_delivery = a.id
WHERE d.plan_id = 1
ORDER BY d.created_at DESC;
```

### Lấy thống kê theo công đoạn

```sql
SELECT 
    d.delivery_stage,
    d.receiving_stage,
    COUNT(*) as total_deliveries,
    SUM(d.quantity_total) as total_quantity,
    SUM(d.quantity_received) as received_quantity,
    SUM(d.quantity_error) as error_quantity
FROM deliveries d
WHERE d.plan_id = 1
GROUP BY d.delivery_stage, d.receiving_stage
ORDER BY d.delivery_stage;
```

### Lấy phiếu giao chờ xác nhận

```sql
SELECT 
    d.id,
    d.part_name,
    d.quantity_total,
    d.delivery_stage,
    d.receiving_stage,
    d.created_at,
    a.full_name as delivery_person
FROM deliveries d
LEFT JOIN accounts a ON d.sx_delivery = a.id
WHERE d.status = 'Chờ xác nhận'
ORDER BY d.created_at DESC;
```

---

## 🔬 Queries cho QC

### Lấy kết quả QC theo đơn hàng

```sql
SELECT 
    o.order_code,
    d.id as delivery_id,
    d.part_name,
    dq.result,
    dq.note,
    dq.checked_at,
    a.full_name as qc_person
FROM deliveries d
INNER JOIN orders o ON d.order_id = o.id
LEFT JOIN delivery_qc dq ON d.id = dq.delivery_id
LEFT JOIN accounts a ON dq.qc_user_id = a.id
WHERE o.id = 1
ORDER BY dq.checked_at DESC;
```

### Lấy thống kê lỗi theo loại

```sql
SELECT 
    dt.name as defect_type,
    COUNT(*) as occurrence_count,
    SUM(ii.quantity_error) as total_error_quantity
FROM input_inspection ii
INNER JOIN defect_types dt ON ii.defect_type_id = dt.id
WHERE ii.inspected_at >= DATEADD(month, -1, GETDATE())
GROUP BY dt.name
ORDER BY occurrence_count DESC;
```

---

## 📊 Queries cho Reports

### Lấy KPI nhân sự theo tháng

```sql
SELECT 
    a.full_name,
    a.employee_id,
    k.month,
    k.year,
    k.score,
    k.target,
    k.achievement,
    (k.score / k.target * 100) as achievement_percentage
FROM kpi k
INNER JOIN accounts a ON k.account_id = a.id
WHERE k.month = 6 AND k.year = 2026
ORDER BY k.score DESC;
```

### Lấy danh sách CAPA mở

```sql
SELECT 
    co.id,
    co.description,
    co.severity,
    co.date as occurrence_date,
    c.action,
    c.due_date,
    c.status,
    a.full_name as responsible_person
FROM capa_occurrences co
LEFT JOIN capa c ON co.id = c.occurrence_id
LEFT JOIN accounts a ON c.responsible = a.id
WHERE co.status = 'Open' OR c.status = 'Open'
ORDER BY co.date DESC;
```

---

## 🔍 Utility Queries

### Kiểm tra column tồn tại

```sql
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'deliveries'
ORDER BY ORDINAL_POSITION;
```

### Kiểm tra foreign key constraints

```sql
SELECT 
    fk.name AS ForeignKey,
    OBJECT_NAME(fk.parent_object_id) AS TableName,
    COL_NAME(fc.parent_object_id, fc.parent_column_id) AS ColumnName,
    OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
    COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS ReferencedColumn
FROM sys.foreign_keys AS fk
INNER JOIN sys.foreign_key_columns AS fc ON fk.object_id = fc.constraint_object_id
WHERE OBJECT_NAME(fk.parent_object_id) = 'deliveries';
```

---

**Last Updated:** 2026-06-03
