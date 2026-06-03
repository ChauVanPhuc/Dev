# Database Documentation - SmartFlow v2

Tài liệu này cung cấp tổng quan về database của SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan](#-tổng-quánverview)
2. [Database Information](#-database-information)
3. [Table Groups](#-table-groups)
4. [Connection String](#-connection-string)
5. [Backup & Restore](#-backup--restore)

---

## 🎯 Tổng quan (Overview)

SmartFlow v2 sử dụng Microsoft SQL Server làm database chính với các đặc điểm:

- **Database Name**: SmartFlowDB
- **Database Type**: Relational Database
- **Collation**: Vietnamese_CI_AS
- **Character Set**: Unicode (NVARCHAR)

---

## 📊 Database Information

### Connection Details

| Property | Value |
|----------|-------|
| **Server** | localhost\SQLEXPRESS (dev) |
| **Database** | SmartFlowDB |
| **Port** | 1433 |
| **Driver** | ODBC Driver 17 for SQL Server |
| **Authentication** | SQL Server Authentication |

### Connection String

**Development:**
```
DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost\SQLEXPRESS;DATABASE=SmartFlowDB;UID=sa;PWD=YourPassword
```

**Production:**
```
DRIVER={ODBC Driver 17 for SQL Server};SERVER=your-server;DATABASE=SmartFlowDB;UID=smartflow_user;PWD=YourSecurePassword
```

---

## 📑 Table Groups

### 1. Authentication & Authorization

- `accounts` - Tài khoản người dùng
- `roles` - Vai trò người dùng
- `permissions` - Quyền hạn
- `role_permission` - Quan hệ role-permission
- `permission_stage` - Quan hệ permission-stage
- `departments` - Phòng ban
- `stages` - Công đoạn sản xuất

### 2. Production Management

- `product_plans` - Kế hoạch sản xuất
- `orders` - Đơn hàng
- `order_items` - Chi tiết đơn hàng
- `products` - Sản phẩm thực tế
- `categories` - Danh mục sản phẩm
- `bom_details` - Chi tiết BOM

### 3. Delivery & Logistics

- `deliveries` - Phiếu bàn giao
- `delivery_details` - Chi tiết bàn giao
- `delivery_images` - Ảnh minh chứng
- `delivery_qc` - Kết quả QC
- `delivery_returns` - Phiếu trả hàng
- `pallet_cards` - Thẻ Pallet

### 4. Quality Control

- `input_inspection` - Kiểm tra đầu vào
- `stage_inspection` - Kiểm tra công đoạn
- `daily_inspection` - Kiểm tra hàng ngày
- `checklists` - Checklist kiểm tra
- `defect_types` - Loại lỗi

### 5. Equipment & Assets

- `equipment` - Thiết bị
- `equipment_maintenance` - Bảo trì thiết bị

### 6. KPI & Evaluation

- `kpi` - KPI nhân sự
- `staff_evaluation` - Đánh giá nhân sự
- `award_discipline` - Khen thưởng/Kỷ luật

### 7. CAPA

- `capa_occurrences` - Sự cố CAPA
- `capa` - Hành động khắc phục
- `capa_evaluation` - Đánh giá CAPA

### 8. System Configuration

- `system_screens` - Màn hình hệ thống
- `system_components` - Component hệ thống
- `backup_qr` - Mã QR dự phòng

---

## 💾 Backup & Restore

### Backup

```sql
-- Full backup
BACKUP DATABASE SmartFlowDB 
TO DISK = 'C:\Backups\SmartFlowDB_Full.bak'
WITH FORMAT, MEDIANAME = 'SmartFlowDB_Backup';
```

### Restore

```sql
-- Restore from backup
RESTORE DATABASE SmartFlowDB 
FROM DISK = 'C:\Backups\SmartFlowDB_Full.bak'
WITH REPLACE;
```

---

## 📚 Chi tiết Database

Xem thêm chi tiết trong các file khác:

- [Schema](./schema.md) - Schema chi tiết các bảng
- [ERD](./erd.md) - Entity Relationship Diagram
- [Migrations](./migrations.md) - Migration guide
- [Queries](./queries.md) - Common queries
- [Backup/Restore](./backup-restore.md) - Backup và restore procedures

---

**Last Updated:** 2026-06-03
**Version:** 2.0
