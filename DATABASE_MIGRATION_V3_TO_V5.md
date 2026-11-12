# TÀI LIỆU HƯỚNG DẪN NÂNG CẤP CƠ SỞ DỮ LIỆU SMARTFLOW ERP (V3 ➔ V5)
**Dành cho Đội ngũ Product / DevOps / Triển khai Production khi Git Pull Code Mới**

---

## 📌 1. TỔNG QUAN (OVERVIEW)

Phiên bản cập nhật mới nhất của SmartFlow ERP bổ sung toàn diện các phân hệ:
1. **Defect Management & Defect Dashboard V2** (4 trang: *Tổng quan chất lượng, Phân tích lỗi Pareto/Heatmap, Kiểm soát CAPA & năng suất QC, Khiếu nại khách hàng*).
2. **Khiếu nại khách hàng & Bảng giá tủ xuất khẩu (Customer Claims & Cabinet Prices)**.
3. **Quản lý Container xuất khẩu & Lịch trình vận chuyển (Container Shipments)**.
4. **AI Vision & Worker quét tự động mã tem Pallet LPN (LPN OCR Jobs)**.
5. **Cơ chế Xóa mềm (Soft Delete `is_deleted`) cho Kiểm tra chất lượng hàng ngày**.
6. **Phân hệ Quản lý Kho Toàn Diện (Warehouse)**: *Nhập kho (`goods_receipts`), Xuất kho (`goods_issues`), Báo cáo Xuất-Nhập-Tồn & FIFO (`warehouse_materials`), Hàng loại/Trả về (`rejected_goods`), 6 Kho chuẩn (`warehouses`) và Quản lý Đơn vị tính (`units_of_measure`)*.

> [!IMPORTANT]
> Khi máy chủ **Production** hoặc môi trường **Staging / Developer** thực hiện `git pull` bản code mới về, bắt buộc phải cập nhật CSDL SQL Server theo tài liệu này để tránh gặp lỗi `500 Internal Server Error (Invalid column name / Invalid object name)`.
>
> Toàn bộ script trong tài liệu này được thiết kế theo chuẩn **Idempotent** (có kiểm tra `IF NOT EXISTS` cho từng bảng và từng cột). Bạn có thể chạy script nhiều lần liên tục mà **không sợ bị lỗi và tuyệt đối không làm mất dữ liệu hiện có**.

---

## 🚀 2. PHƯƠNG PHÁP THỰC HIỆN (CHỌN 1 TRONG 2 CÁCH)

### CÁCH 1: Chạy Tự Động 1-Click bằng Python (Khuyến nghị)
Sau khi `git pull`, mở Terminal PowerShell tại thư mục gốc dự án và chạy lệnh:
```powershell
python BackEnd/database/migrations/run_production_v5_migration.py
```
*Script sẽ tự động đọc chuỗi kết nối từ file `BackEnd/config/.env`, kiểm tra và bổ sung toàn bộ bảng/cột còn thiếu chỉ trong 2-5 giây.*

---

### CÁCH 2: Chạy Thủ Công trên SQL Server Management Studio (SSMS)
Mở SSMS, kết nối tới Database của hệ thống (ví dụ `SmartFlow_v5` hoặc Database Production của bạn), mở cửa sổ New Query và chạy toàn bộ khối lệnh T-SQL ở **Mục 3** dưới đây.

---

## 📜 3. TOÀN BỘ SCRIPT T-SQL IDEMPOTENT (CHUẨN SQL SERVER)

```sql
-- =========================================================================================
-- MASTER DATABASE MIGRATION SCRIPT FOR SMARTFLOW ERP (V3 -> V5)
-- An toàn: Tự động kiểm tra trước khi tạo bảng hoặc thêm cột. Không xóa/sửa dữ liệu cũ.
-- =========================================================================================

PRINT N'>>> BẮT ĐẦU NÂNG CẤP CƠ SỞ DỮ LIỆU SMARTFLOW ERP V5...';
BEGIN TRANSACTION;

BEGIN TRY

    -- =====================================================================================
    -- PHẦN 1: TẠO CÁC BẢNG MỚI (NEW TABLES)
    -- =====================================================================================

    -- 1.1. Bảng defect_categories (Danh mục nhóm lỗi: Ngoại quan, Sơn, Kết cấu, Nguyên liệu...)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'defect_categories')
    BEGIN
        CREATE TABLE defect_categories (
            id INT IDENTITY(1,1) PRIMARY KEY,
            code NVARCHAR(50) NOT NULL UNIQUE,
            name NVARCHAR(250) NOT NULL,
            prefix NVARCHAR(20) NOT NULL,
            default_departments NVARCHAR(500) NULL,
            description NVARCHAR(500) NULL,
            color NVARCHAR(50) NULL,
            order_index INT NULL DEFAULT 0,
            is_active BIT NULL DEFAULT 1,
            created_at DATETIME NULL DEFAULT GETDATE(),
            updated_at DATETIME NULL DEFAULT GETDATE()
        );
        PRINT N'[OK] Đã tạo bảng defect_categories';

        -- Nạp dữ liệu mẫu chuẩn ban đầu
        INSERT INTO defect_categories (code, name, prefix, color, order_index, is_active)
        VALUES 
            (N'visual', N'Ngoại quan', N'NQ', N'#C45A1A', 1, 1),
            (N'paint', N'Sơn & Bề mặt', N'SON', N'#4D2612', 2, 1),
            (N'structure', N'Kết cấu', N'KC', N'#8C4318', 3, 1),
            (N'material', N'Nguyên liệu', N'NL', N'#8B5E3C', 4, 1),
            (N'other', N'Khác', N'KH', N'#6B584C', 5, 1);
        PRINT N'[OK] Đã nạp 5 nhóm lỗi mặc định vào defect_categories';
    END

    -- 1.2. Bảng customer_claims (Quản lý khiếu nại khách hàng xuất khẩu)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'customer_claims')
    BEGIN
        CREATE TABLE customer_claims (
            id INT IDENTITY(1,1) PRIMARY KEY,
            claim_code NVARCHAR(50) NOT NULL UNIQUE,
            customer_name NVARCHAR(100) NULL,
            product_name NVARCHAR(150) NOT NULL,
            order_code NVARCHAR(50) NULL,
            company_error_code NVARCHAR(50) NULL,
            description NVARCHAR(1000) NULL,
            severity NVARCHAR(20) NULL DEFAULT 'Medium',
            status NVARCHAR(50) NULL DEFAULT 'Received',
            lpn NVARCHAR(50) NULL,
            container_no NVARCHAR(50) NULL,
            action NVARCHAR(200) NULL,
            period NVARCHAR(20) NULL,
            image_paths NVARCHAR(MAX) NULL,
            image_captions NVARCHAR(MAX) NULL,
            created_at DATETIME NULL DEFAULT GETDATE(),
            resolved_at DATETIME NULL
        );
        CREATE INDEX IX_customer_claims_claim_code ON customer_claims(claim_code);
        CREATE INDEX IX_customer_claims_period ON customer_claims(period);
        PRINT N'[OK] Đã tạo bảng customer_claims';
    END

    -- 1.3. Bảng cabinet_prices (Bảng đơn giá chuẩn các dòng tủ gỗ)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cabinet_prices')
    BEGIN
        CREATE TABLE cabinet_prices (
            id INT IDENTITY(1,1) PRIMARY KEY,
            cabinet_code NVARCHAR(50) NOT NULL UNIQUE,
            cabinet_name NVARCHAR(150) NOT NULL,
            material NVARCHAR(100) NULL,
            dimensions NVARCHAR(50) NULL,
            base_price FLOAT NOT NULL,
            sale_price FLOAT NOT NULL,
            status NVARCHAR(50) NULL DEFAULT 'Active',
            last_updated DATETIME NULL DEFAULT GETDATE()
        );
        CREATE INDEX IX_cabinet_prices_code ON cabinet_prices(cabinet_code);
        PRINT N'[OK] Đã tạo bảng cabinet_prices';
    END

    -- 1.4. Bảng container_shipments (Theo dõi container xuất khẩu)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'container_shipments')
    BEGIN
        CREATE TABLE container_shipments (
            id INT IDENTITY(1,1) PRIMARY KEY,
            shipment_code NVARCHAR(50) NOT NULL UNIQUE,
            container_number NVARCHAR(50) NOT NULL,
            seal_number NVARCHAR(50) NULL,
            destination_port NVARCHAR(100) NOT NULL,
            etd DATETIME NULL,
            eta DATETIME NULL,
            status NVARCHAR(50) NULL DEFAULT 'Planning',
            total_value FLOAT NULL,
            created_at DATETIME NULL DEFAULT GETDATE()
        );
        CREATE INDEX IX_container_shipments_container ON container_shipments(container_number);
        PRINT N'[OK] Đã tạo bảng container_shipments';
    END

    -- 1.5. Bảng user_defect_trackings (Theo dõi lỗi đánh dấu của kiểm tra viên)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_defect_trackings')
    BEGIN
        CREATE TABLE user_defect_trackings (
            id INT IDENTITY(1,1) PRIMARY KEY,
            user_id INT NOT NULL,
            defect_id INT NOT NULL,
            created_at DATETIME NULL DEFAULT GETDATE()
        );
        CREATE INDEX IX_user_defect_trackings_user ON user_defect_trackings(user_id);
        PRINT N'[OK] Đã tạo bảng user_defect_trackings';
    END

    -- 1.6. Bảng lpn_ocr_jobs (Hàng đợi & nhật ký tác vụ nhận diện OCR tem LPN)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lpn_ocr_jobs')
    BEGIN
        CREATE TABLE lpn_ocr_jobs (
            id BIGINT IDENTITY(1,1) PRIMARY KEY,
            container_id BIGINT NOT NULL,
            container_number VARCHAR(100) NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
            attempts INT NOT NULL DEFAULT 0,
            total_items INT NULL DEFAULT 0,
            processed_items INT NULL DEFAULT 0,
            matched_items INT NULL DEFAULT 0,
            payload_json NVARCHAR(MAX) NULL,
            target_phone VARCHAR(50) NULL,
            worker_id VARCHAR(100) NULL,
            last_error NVARCHAR(MAX) NULL,
            created_at DATETIME NULL DEFAULT GETDATE(),
            started_at DATETIME NULL,
            heartbeat_at DATETIME NULL,
            finished_at DATETIME NULL
        );
        CREATE INDEX IX_lpn_ocr_jobs_status ON lpn_ocr_jobs(status);
        PRINT N'[OK] Đã tạo bảng lpn_ocr_jobs';
    END

    -- 1.7. Bảng units_of_measure (Danh mục Đơn vị tính dùng chung cho Kho & BOM)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'units_of_measure')
    BEGIN
        CREATE TABLE units_of_measure (
            id INT IDENTITY(1,1) PRIMARY KEY,
            code NVARCHAR(50) NOT NULL UNIQUE,
            full_name NVARCHAR(150) NULL DEFAULT N'',
            precision INT NOT NULL DEFAULT 0,
            status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            created_at DATETIME NULL DEFAULT GETDATE(),
            updated_at DATETIME NULL DEFAULT GETDATE()
        );
        CREATE INDEX IX_units_of_measure_code ON units_of_measure(code);
        PRINT N'[OK] Đã tạo bảng units_of_measure';
    END

    -- 1.8. Bảng warehouses (Danh mục 6 Kho chuẩn nhà máy)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'warehouses')
    BEGIN
        CREATE TABLE warehouses (
            id INT IDENTITY(1,1) PRIMARY KEY,
            code NVARCHAR(20) NOT NULL UNIQUE,
            name NVARCHAR(150) NOT NULL,
            description NVARCHAR(500) NULL,
            sort_order INT NOT NULL DEFAULT 0,
            is_active BIT NOT NULL DEFAULT 1,
            created_at DATETIME NULL DEFAULT GETDATE()
        );
        INSERT INTO warehouses (code, name, description, sort_order, is_active) VALUES
            ('KTP', N'Kho thành phẩm', N'Bàn, ghế, tủ, giường đồ gỗ hoàn thiện', 1, 1),
            ('KDG', N'Đóng gói - bao bì', N'Thùng carton, màng PE, pallet, xốp bảo vệ', 2, 1),
            ('KHH', N'Kho hàng hóa', N'Hàng hóa mua ngoài, thiết bị phụ trợ lắp ráp', 3, 1),
            ('KNLC', N'Kho nguyên liệu chính', N'Gỗ Sồi, Tần bì, Óc chó, ván MDF, Plywood', 4, 1),
            ('KVT', N'Kho vật tư', N'Bản lề, ray trượt, ốc vít, keo ghép, nhám', 5, 1),
            ('KSON', N'Kho sơn - dầu màu', N'Sơn PU, sơn lót, chất đóng rắn, dung môi', 6, 1);
        PRINT N'[OK] Đã tạo & nạp 6 kho chuẩn vào warehouses';
    END

    -- 1.9. Bảng warehouse_materials (Danh mục Vật tư & Tồn đầu kỳ gốc tại từng Kho)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'warehouse_materials')
    BEGIN
        CREATE TABLE warehouse_materials (
            id INT IDENTITY(1,1) PRIMARY KEY,
            warehouse_code NVARCHAR(20) NOT NULL,
            warehouse_name NVARCHAR(150) NOT NULL,
            item_code NVARCHAR(100) NOT NULL,
            item_name NVARCHAR(250) NOT NULL,
            category NVARCHAR(50) NULL DEFAULT 'OTHER',
            unit_main NVARCHAR(50) NOT NULL DEFAULT N'Cái',
            unit_conversion NVARCHAR(50) NULL,
            conversion_rate FLOAT NOT NULL DEFAULT 1.0,
            opening_main FLOAT NOT NULL DEFAULT 0.0,
            initial_receipt_date DATE NULL,
            image_url NVARCHAR(500) NULL,
            is_active BIT NOT NULL DEFAULT 1,
            created_at DATETIME NULL DEFAULT GETDATE(),
            updated_at DATETIME NULL DEFAULT GETDATE()
        );
        CREATE UNIQUE INDEX IX_warehouse_materials_wh_item ON warehouse_materials(warehouse_code, item_code);
        PRINT N'[OK] Đã tạo bảng warehouse_materials';
    END

    -- 1.10. Bảng goods_receipts (Chứng từ Phiếu Nhập Kho - Header)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'goods_receipts')
    BEGIN
        CREATE TABLE goods_receipts (
            id INT IDENTITY(1,1) PRIMARY KEY,
            voucher_no NVARCHAR(50) NOT NULL UNIQUE,
            warehouse_code NVARCHAR(20) NULL,
            warehouse_name NVARCHAR(150) NOT NULL,
            receipt_date DATE NOT NULL,
            deliverer_name NVARCHAR(150) NULL,
            customer_code NVARCHAR(50) NULL,
            customer_name NVARCHAR(200) NULL,
            department_name NVARCHAR(150) NULL,
            content NVARCHAR(500) NULL,
            receipt_type NVARCHAR(100) NULL DEFAULT N'Nhập mua hàng',
            status NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
            ctgs NVARCHAR(100) NULL,
            total_lines INT NOT NULL DEFAULT 0,
            total_quantity FLOAT NOT NULL DEFAULT 0.0,
            created_by NVARCHAR(100) NULL,
            created_channel NVARCHAR(20) NOT NULL DEFAULT N'Web',
            confirmed_by NVARCHAR(100) NULL,
            confirmed_at DATETIME NULL,
            images_json NVARCHAR(MAX) NULL,
            created_at DATETIME NULL DEFAULT GETDATE(),
            updated_at DATETIME NULL DEFAULT GETDATE(),
            is_deleted BIT NOT NULL DEFAULT 0
        );
        CREATE INDEX IX_goods_receipts_date ON goods_receipts(receipt_date);
        PRINT N'[OK] Đã tạo bảng goods_receipts';
    END

    -- 1.11. Bảng goods_receipt_items (Chi tiết dòng hàng Nhập Kho)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'goods_receipt_items')
    BEGIN
        CREATE TABLE goods_receipt_items (
            id INT IDENTITY(1,1) PRIMARY KEY,
            receipt_id INT NOT NULL CONSTRAINT FK_goods_receipt_items_receipt FOREIGN KEY REFERENCES goods_receipts(id) ON DELETE CASCADE,
            line_no INT NOT NULL DEFAULT 1,
            item_code NVARCHAR(100) NOT NULL,
            item_name NVARCHAR(250) NOT NULL,
            image_url NVARCHAR(500) NULL,
            unit1 NVARCHAR(50) NOT NULL,
            quantity1 FLOAT NOT NULL DEFAULT 0.0,
            unit2 NVARCHAR(50) NULL,
            quantity2 FLOAT NULL DEFAULT 0.0,
            conversion_rate FLOAT NOT NULL DEFAULT 1.0,
            lsx NVARCHAR(100) NULL,
            package_split NVARCHAR(150) NULL,
            notes NVARCHAR(500) NULL
        );
        CREATE INDEX IX_goods_receipt_items_receipt_id ON goods_receipt_items(receipt_id);
        PRINT N'[OK] Đã tạo bảng goods_receipt_items';
    END

    -- 1.12. Bảng goods_issues (Chứng từ Phiếu Xuất Kho - Header)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'goods_issues')
    BEGIN
        CREATE TABLE goods_issues (
            id INT IDENTITY(1,1) PRIMARY KEY,
            voucher_no NVARCHAR(50) NOT NULL UNIQUE,
            warehouse_code NVARCHAR(20) NULL,
            warehouse_name NVARCHAR(150) NOT NULL,
            issue_date DATE NOT NULL,
            deliverer_name NVARCHAR(150) NULL,
            customer_code NVARCHAR(50) NULL,
            customer_name NVARCHAR(200) NULL,
            department_name NVARCHAR(150) NULL,
            factory_id INT NULL,
            factory_name NVARCHAR(100) NULL,
            content NVARCHAR(500) NULL,
            issue_type NVARCHAR(100) NULL DEFAULT N'Xuất sản xuất',
            status NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
            ctgs NVARCHAR(100) NULL,
            total_lines INT NOT NULL DEFAULT 0,
            total_quantity FLOAT NOT NULL DEFAULT 0.0,
            total_amount FLOAT NOT NULL DEFAULT 0.0,
            created_by NVARCHAR(100) NULL,
            created_channel NVARCHAR(20) NOT NULL DEFAULT N'Web',
            receiver_name NVARCHAR(150) NULL,
            confirmed_by NVARCHAR(100) NULL,
            confirmed_at DATETIME NULL,
            images_json NVARCHAR(MAX) NULL,
            created_at DATETIME NULL DEFAULT GETDATE(),
            updated_at DATETIME NULL DEFAULT GETDATE(),
            is_deleted BIT NOT NULL DEFAULT 0
        );
        CREATE INDEX IX_goods_issues_date ON goods_issues(issue_date);
        PRINT N'[OK] Đã tạo bảng goods_issues';
    END

    -- 1.13. Bảng goods_issue_items (Chi tiết dòng hàng Xuất Kho)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'goods_issue_items')
    BEGIN
        CREATE TABLE goods_issue_items (
            id INT IDENTITY(1,1) PRIMARY KEY,
            issue_id INT NOT NULL CONSTRAINT FK_goods_issue_items_issue FOREIGN KEY REFERENCES goods_issues(id) ON DELETE CASCADE,
            line_no INT NOT NULL DEFAULT 1,
            item_code NVARCHAR(100) NOT NULL,
            item_name NVARCHAR(250) NOT NULL,
            image_url NVARCHAR(500) NULL,
            unit1 NVARCHAR(50) NOT NULL,
            quantity1 FLOAT NOT NULL DEFAULT 0.0,
            unit2 NVARCHAR(50) NULL,
            quantity2 FLOAT NULL DEFAULT 0.0,
            conversion_rate FLOAT NOT NULL DEFAULT 1.0,
            unit_price FLOAT NOT NULL DEFAULT 0.0,
            amount FLOAT NOT NULL DEFAULT 0.0,
            lsx NVARCHAR(100) NULL,
            package_split NVARCHAR(150) NULL,
            notes NVARCHAR(500) NULL
        );
        CREATE INDEX IX_goods_issue_items_issue_id ON goods_issue_items(issue_id);
        PRINT N'[OK] Đã tạo bảng goods_issue_items';
    END

    -- 1.14. Bảng rejected_goods (Quản lý Hàng loại / Hàng trả về)
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'rejected_goods')
    BEGIN
        CREATE TABLE rejected_goods (
            id INT IDENTITY(1,1) PRIMARY KEY,
            voucher_no NVARCHAR(50) NOT NULL UNIQUE,
            created_date DATE NOT NULL,
            source_type NVARCHAR(30) NOT NULL DEFAULT 'QC_INCOMING',
            origin_voucher_id INT NULL,
            origin_voucher_no NVARCHAR(50) NULL,
            origin_line_id INT NULL,
            warehouse_code NVARCHAR(20) NULL,
            warehouse_name NVARCHAR(150) NULL,
            item_code NVARCHAR(100) NOT NULL,
            item_name NVARCHAR(250) NOT NULL,
            unit_main NVARCHAR(50) NULL,
            unit_conversion NVARCHAR(50) NULL,
            conversion_rate FLOAT NOT NULL DEFAULT 1.0,
            quantity_main FLOAT NOT NULL DEFAULT 0.0,
            quantity_conv FLOAT NOT NULL DEFAULT 0.0,
            defect_category NVARCHAR(150) NULL,
            defect_reason NVARCHAR(500) NULL,
            resolution NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
            status NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
            resolution_date DATE NULL,
            resolution_notes NVARCHAR(500) NULL,
            created_by NVARCHAR(100) NULL,
            created_channel NVARCHAR(20) NOT NULL DEFAULT N'Web',
            department_name NVARCHAR(150) NULL,
            factory_id INT NULL,
            factory_name NVARCHAR(100) NULL,
            return_mode NVARCHAR(30) NOT NULL DEFAULT N'DEFECTIVE',
            returned_by NVARCHAR(100) NULL,
            received_by NVARCHAR(100) NULL,
            received_at DATETIME NULL,
            images_json NVARCHAR(MAX) NULL,
            is_demo BIT NOT NULL DEFAULT 0,
            created_at DATETIME NULL DEFAULT GETDATE(),
            updated_at DATETIME NULL DEFAULT GETDATE(),
            is_deleted BIT NOT NULL DEFAULT 0
        );
        CREATE INDEX IX_rejected_goods_date ON rejected_goods(created_date);
        PRINT N'[OK] Đã tạo bảng rejected_goods';
    END

    -- =====================================================================================
    -- PHẦN 2: BỔ SUNG CÁC CỘT MỚI VÀO BẢNG HIỆN CÓ (NEW COLUMNS)
    -- =====================================================================================

    -- 2.1. Cột cho bảng daily_inspection_records (Kiểm tra hàng ngày)
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'daily_inspection_records')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'is_deleted')
        BEGIN
            ALTER TABLE daily_inspection_records ADD is_deleted BIT NULL CONSTRAINT DF_daily_inspection_records_is_deleted DEFAULT 0;
            UPDATE daily_inspection_records SET is_deleted = 0 WHERE is_deleted IS NULL;
            PRINT N'[OK] Đã thêm cột is_deleted vào daily_inspection_records';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'pallet_code')
        BEGIN
            ALTER TABLE daily_inspection_records ADD pallet_code NVARCHAR(100) NULL;
            PRINT N'[OK] Đã thêm cột pallet_code vào daily_inspection_records';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'data_json')
        BEGIN
            ALTER TABLE daily_inspection_records ADD data_json NVARCHAR(MAX) NULL;
            PRINT N'[OK] Đã thêm cột data_json vào daily_inspection_records';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'batch_no')
        BEGIN
            ALTER TABLE daily_inspection_records ADD batch_no NVARCHAR(100) NULL;
            PRINT N'[OK] Đã thêm cột batch_no vào daily_inspection_records';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'is_confirmed')
        BEGIN
            ALTER TABLE daily_inspection_records ADD is_confirmed BIT NULL DEFAULT 1;
            PRINT N'[OK] Đã thêm cột is_confirmed vào daily_inspection_records';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'status')
        BEGIN
            ALTER TABLE daily_inspection_records ADD status NVARCHAR(50) NULL DEFAULT N'Đã hoàn thành';
            PRINT N'[OK] Đã thêm cột status vào daily_inspection_records';
        END
    END

    -- 2.2. Cột cho bảng defect_types (Danh mục lỗi QC)
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'defect_types')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'images')
        BEGIN
            ALTER TABLE defect_types ADD images NVARCHAR(MAX) NULL;
            PRINT N'[OK] Đã thêm cột images vào defect_types';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'qc_tracking')
        BEGIN
            ALTER TABLE defect_types ADD qc_tracking BIT NULL DEFAULT 0;
            UPDATE defect_types SET qc_tracking = 0 WHERE qc_tracking IS NULL;
            PRINT N'[OK] Đã thêm cột qc_tracking vào defect_types';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'aql_class')
        BEGIN
            ALTER TABLE defect_types ADD aql_class NVARCHAR(50) NULL DEFAULT 'Minor';
            PRINT N'[OK] Đã thêm cột aql_class vào defect_types';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'root_cause')
        BEGIN
            ALTER TABLE defect_types ADD root_cause NVARCHAR(1000) NULL;
            PRINT N'[OK] Đã thêm cột root_cause vào defect_types';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'solution')
        BEGIN
            ALTER TABLE defect_types ADD solution NVARCHAR(1000) NULL;
            PRINT N'[OK] Đã thêm cột solution vào defect_types';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'capa_reference')
        BEGIN
            ALTER TABLE defect_types ADD capa_reference NVARCHAR(250) NULL;
            PRINT N'[OK] Đã thêm cột capa_reference vào defect_types';
        END
    END

    -- 2.3. Cột cho bảng client_defects (Mã lỗi theo tiêu chuẩn khách hàng)
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'client_defects')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'last_updated')
        BEGIN
            ALTER TABLE client_defects ADD last_updated DATETIME NULL DEFAULT GETDATE();
            UPDATE client_defects SET last_updated = GETDATE() WHERE last_updated IS NULL;
            PRINT N'[OK] Đã thêm cột last_updated vào client_defects';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'detection_method')
        BEGIN
            ALTER TABLE client_defects ADD detection_method NVARCHAR(250) NULL;
            PRINT N'[OK] Đã thêm cột detection_method vào client_defects';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'minor_criteria')
        BEGIN
            ALTER TABLE client_defects ADD minor_criteria NVARCHAR(500) NULL;
            PRINT N'[OK] Đã thêm cột minor_criteria vào client_defects';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'major_criteria')
        BEGIN
            ALTER TABLE client_defects ADD major_criteria NVARCHAR(500) NULL;
            PRINT N'[OK] Đã thêm cột major_criteria vào client_defects';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'critical_criteria')
        BEGIN
            ALTER TABLE client_defects ADD critical_criteria NVARCHAR(500) NULL;
            PRINT N'[OK] Đã thêm cột critical_criteria vào client_defects';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'g7_code')
        BEGIN
            ALTER TABLE client_defects ADD g7_code NVARCHAR(50) NULL;
            PRINT N'[OK] Đã thêm cột g7_code vào client_defects';
        END
    END

    -- 2.4. Cột cho bảng system_sidebars (Menu thanh điều hướng)
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'system_sidebars')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('system_sidebars') AND name = 'permission_key')
        BEGIN
            ALTER TABLE system_sidebars ADD permission_key NVARCHAR(100) NULL;
            PRINT N'[OK] Đã thêm cột permission_key vào system_sidebars';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('system_sidebars') AND name = 'sort_order')
        BEGIN
            ALTER TABLE system_sidebars ADD sort_order INT NULL DEFAULT 0;
            PRINT N'[OK] Đã thêm cột sort_order vào system_sidebars';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('system_sidebars') AND name = 'badge_count')
        BEGIN
            ALTER TABLE system_sidebars ADD badge_count INT NULL DEFAULT 0;
            PRINT N'[OK] Đã thêm cột badge_count vào system_sidebars';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('system_sidebars') AND name = 'module_code')
        BEGIN
            ALTER TABLE system_sidebars ADD module_code NVARCHAR(50) NULL;
            PRINT N'[OK] Đã thêm cột module_code vào system_sidebars';
        END
    END

    -- 2.5. Cột cho bảng accounts (Tài khoản người dùng)
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'accounts')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'is_web_allowed')
        BEGIN
            ALTER TABLE accounts ADD is_web_allowed BIT NOT NULL DEFAULT 1;
            PRINT N'[OK] Đã thêm cột is_web_allowed vào accounts';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'is_mobile_allowed')
        BEGIN
            ALTER TABLE accounts ADD is_mobile_allowed BIT NOT NULL DEFAULT 1;
            PRINT N'[OK] Đã thêm cột is_mobile_allowed vào accounts';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'department_id')
        BEGIN
            ALTER TABLE accounts ADD department_id INT NULL;
            PRINT N'[OK] Đã thêm cột department_id vào accounts';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'phone')
        BEGIN
            ALTER TABLE accounts ADD phone NVARCHAR(20) NULL;
            PRINT N'[OK] Đã thêm cột phone vào accounts';
        END
    END

    -- 2.6. Cột cho stage_inspections & input_inspections (Xác nhận QC)
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stage_inspections')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stage_inspections') AND name = 'is_confirmed')
        BEGIN
            ALTER TABLE stage_inspections ADD is_confirmed BIT NOT NULL DEFAULT 0;
            PRINT N'[OK] Đã thêm cột is_confirmed vào stage_inspections';
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stage_inspections') AND name = 'confirmed_at')
        BEGIN
            ALTER TABLE stage_inspections ADD confirmed_at DATETIME NULL;
            PRINT N'[OK] Đã thêm cột confirmed_at vào stage_inspections';
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stage_inspections') AND name = 'confirmed_by')
        BEGIN
            ALTER TABLE stage_inspections ADD confirmed_by INT NULL;
            PRINT N'[OK] Đã thêm cột confirmed_by vào stage_inspections';
        END
    END

    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'input_inspections')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('input_inspections') AND name = 'is_confirmed')
        BEGIN
            ALTER TABLE input_inspections ADD is_confirmed BIT NOT NULL DEFAULT 0;
            PRINT N'[OK] Đã thêm cột is_confirmed vào input_inspections';
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('input_inspections') AND name = 'confirmed_at')
        BEGIN
            ALTER TABLE input_inspections ADD confirmed_at DATETIME NULL;
            PRINT N'[OK] Đã thêm cột confirmed_at vào input_inspections';
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('input_inspections') AND name = 'confirmed_by')
        BEGIN
            ALTER TABLE input_inspections ADD confirmed_by INT NULL;
            PRINT N'[OK] Đã thêm cột confirmed_by vào input_inspections';
        END
    END

    -- 2.7. Cột cho delivery_returns (Trả hàng & Xác nhận sản xuất)
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'delivery_returns')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_returns') AND name = 'allocation_method')
        BEGIN
            ALTER TABLE delivery_returns ADD allocation_method NVARCHAR(20) DEFAULT 'FIFO';
            PRINT N'[OK] Đã thêm cột allocation_method vào delivery_returns';
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_returns') AND name = 'sx_confirmed_by')
        BEGIN
            ALTER TABLE delivery_returns ADD sx_confirmed_by INT NULL;
            PRINT N'[OK] Đã thêm cột sx_confirmed_by vào delivery_returns';
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_returns') AND name = 'sx_confirmed_at')
        BEGIN
            ALTER TABLE delivery_returns ADD sx_confirmed_at DATETIME NULL;
            PRINT N'[OK] Đã thêm cột sx_confirmed_at vào delivery_returns';
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_returns') AND name = 'sx_confirmation_note')
        BEGIN
            ALTER TABLE delivery_returns ADD sx_confirmation_note NVARCHAR(500) NULL;
            PRINT N'[OK] Đã thêm cột sx_confirmation_note vào delivery_returns';
        END
    END

    -- 2.8. Bổ sung cột Mobile/Traceability cho các bảng Kho (goods_receipts, goods_issues, rejected_goods)
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'goods_receipts')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goods_receipts') AND name = 'created_channel')
            ALTER TABLE goods_receipts ADD created_channel NVARCHAR(20) NOT NULL DEFAULT N'Web';
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goods_receipts') AND name = 'confirmed_by')
            ALTER TABLE goods_receipts ADD confirmed_by NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goods_receipts') AND name = 'confirmed_at')
            ALTER TABLE goods_receipts ADD confirmed_at DATETIME NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goods_receipts') AND name = 'images_json')
            ALTER TABLE goods_receipts ADD images_json NVARCHAR(MAX) NULL;
    END
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'goods_issues')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goods_issues') AND name = 'created_channel')
            ALTER TABLE goods_issues ADD created_channel NVARCHAR(20) NOT NULL DEFAULT N'Web';
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goods_issues') AND name = 'receiver_name')
            ALTER TABLE goods_issues ADD receiver_name NVARCHAR(150) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goods_issues') AND name = 'confirmed_by')
            ALTER TABLE goods_issues ADD confirmed_by NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goods_issues') AND name = 'confirmed_at')
            ALTER TABLE goods_issues ADD confirmed_at DATETIME NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goods_issues') AND name = 'images_json')
            ALTER TABLE goods_issues ADD images_json NVARCHAR(MAX) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goods_issues') AND name = 'factory_id')
            ALTER TABLE goods_issues ADD factory_id INT NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goods_issues') AND name = 'factory_name')
            ALTER TABLE goods_issues ADD factory_name NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_goods_issues_factory_id' AND object_id = OBJECT_ID('goods_issues'))
            CREATE INDEX IX_goods_issues_factory_id ON goods_issues(factory_id);
    END
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'rejected_goods')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('rejected_goods') AND name = 'created_channel')
            ALTER TABLE rejected_goods ADD created_channel NVARCHAR(20) NOT NULL DEFAULT N'Web';
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('rejected_goods') AND name = 'department_name')
            ALTER TABLE rejected_goods ADD department_name NVARCHAR(150) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('rejected_goods') AND name = 'factory_id')
            ALTER TABLE rejected_goods ADD factory_id INT NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('rejected_goods') AND name = 'factory_name')
            ALTER TABLE rejected_goods ADD factory_name NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_rejected_goods_factory_id' AND object_id = OBJECT_ID('rejected_goods'))
            CREATE INDEX IX_rejected_goods_factory_id ON rejected_goods(factory_id);
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('rejected_goods') AND name = 'return_mode')
            ALTER TABLE rejected_goods ADD return_mode NVARCHAR(30) NOT NULL DEFAULT N'DEFECTIVE';
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('rejected_goods') AND name = 'returned_by')
            ALTER TABLE rejected_goods ADD returned_by NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('rejected_goods') AND name = 'received_by')
            ALTER TABLE rejected_goods ADD received_by NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('rejected_goods') AND name = 'received_at')
            ALTER TABLE rejected_goods ADD received_at DATETIME NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('rejected_goods') AND name = 'images_json')
            ALTER TABLE rejected_goods ADD images_json NVARCHAR(MAX) NULL;
    END

    -- =========================================================================
    -- PHẦN 3: SEED DỮ LIỆU CHUẨN KHO, ĐƠN VỊ TÍNH, MÀN HÌNH & MENU SIDEBAR
    -- =========================================================================

    -- 3.1. Seed 6 Kho chuẩn nhà máy (warehouses)
    INSERT INTO warehouses (code, name, description, sort_order, is_active)
    SELECT v.code, v.name, v.description, v.sort_order, 1
    FROM (VALUES
        (N'KTP',  N'Kho thành phẩm',        N'Bàn, ghế, tủ, giường đồ gỗ hoàn thiện',          1),
        (N'KDG',  N'Đóng gói - bao bì',     N'Thùng carton, màng PE, pallet, xốp bảo vệ',      2),
        (N'KHH',  N'Kho hàng hóa',          N'Hàng hóa mua ngoài, thiết bị phụ trợ lắp ráp',   3),
        (N'KNLC', N'Kho nguyên liệu chính', N'Gỗ Sồi, Tần bì, Óc chó, ván MDF, Plywood',       4),
        (N'KVT',  N'Kho vật tư',            N'Bản lề, ray trượt, ốc vít, keo ghép, nhám',      5),
        (N'KSON', N'Kho sơn - dầu màu',     N'Sơn PU, sơn lót, chất đóng rắn, dung môi',       6)
    ) AS v(code, name, description, sort_order)
    WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.code = v.code);
    PRINT N'[OK] Đã đồng bộ 6 Kho chuẩn (warehouses)';

    -- 3.2. Seed 29 Đơn vị tính chuẩn (units_of_measure)
    INSERT INTO units_of_measure (code, full_name, precision, status)
    SELECT v.code, v.full_name, v.precision, 'ACTIVE'
    FROM (VALUES
        (N'm3',    N'Mét khối',  4),
        (N'Tấm',   N'',          0),
        (N'm2',    N'Mét vuông', 2),
        (N'cái',   N'',          0),
        (N'Kg',    N'Kilogram',  2),
        (N'chai',  N'',          0),
        (N'm',     N'Mét',       2),
        (N'cuộn',  N'',          0),
        (N'bộ',    N'',          0),
        (N'Tủ',    N'',          0),
        (N'thùng', N'',          0),
        (N'Thanh', N'',          0),
        (N'Lít',   N'',          2),
        (N'Con',   N'',          0),
        (N'bịch',  N'',          0),
        (N'Đôi',   N'',          0),
        (N'Cây',   N'',          0),
        (N'Tờ',    N'',          0),
        (N'múi',   N'',          0),
        (N'Hộp',   N'',          0),
        (N'Sợi',   N'',          0),
        (N'tuýp',  N'',          0),
        (N'ống',   N'',          0),
        (N'Hũ',    N'',          0),
        (N'SET',   N'',          0),
        (N'Can',   N'',          0),
        (N'Kiện',  N'',          0),
        (N'Chồng', N'',          0),
        (N'Bó',    N'',          0)
    ) AS v(code, full_name, precision)
    WHERE NOT EXISTS (SELECT 1 FROM units_of_measure u WHERE LOWER(u.code) = LOWER(v.code));
    PRINT N'[OK] Đã đồng bộ 29 Đơn vị tính chuẩn (units_of_measure)';

    -- 3.3. Seed System Screens cho Kho & ĐVT (Web + Mobile)
    INSERT INTO system_screens (platform, route_path, backend_path, default_code, current_code, title, subtitle, is_active, status)
    SELECT v.platform, v.route_path, v.backend_path, v.default_code, v.current_code, v.title, v.subtitle, 1, N'Hoàn thành'
    FROM (VALUES
        ('Web',    '/admin/warehouse/goods-receipt',  '/api/v1/warehouses/receipts',         'KH01', 'KH01', N'Nhập kho',               N'Quản lý danh sách phiếu nhập kho và kiểm đếm vật tư'),
        ('Web',    '/admin/warehouse/goods-issue',    '/api/v1/warehouses/issues',           'KH02', 'KH02', N'Xuất kho',               N'Quản lý phiếu xuất kho sản xuất, bán hàng và kiểm soát tồn kho'),
        ('Web',    '/admin/warehouse/management',     '/api/v1/warehouses/inventory-report', 'KH03', 'KH03', N'Quản lý kho',            N'Báo cáo Xuất - Nhập - Tồn kho tổng hợp, FIFO và Hàng loại'),
        ('Web',    '/admin/warehouse/rejected-goods', '/api/v1/warehouses/rejected-goods',   'KH04', 'KH04', N'Hàng trả về / Hàng loại', N'Theo dõi hàng trả về từ sản xuất và hàng không đạt QC đầu vào'),
        ('Web',    '/admin/units',                    '/api/v1/units-of-measure',            'AD10', 'AD10', N'Quản lý đơn vị tính',    N'Quản lý danh mục đơn vị tính dùng chung cho Kho và Định mức'),
        ('Mobile', '/warehouse/goods-receipt',        '/api/v1/warehouses/receipts',         'MK01', 'MK01', N'Phiếu nhập kho',         N'Tạo và xác nhận phiếu nhập kho từ thiết bị di động'),
        ('Mobile', '/warehouse/handover',             '/api/v1/warehouses/issues',           'MK02', 'MK02', N'Phiếu bàn giao',         N'Lập phiếu bàn giao / xuất kho cho xưởng sản xuất & ký nhận'),
        ('Mobile', '/warehouse/returns',              '/api/v1/warehouses/rejected-goods',   'MK03', 'MK03', N'Phiếu trả về',           N'Tạo và xử lý phiếu trả hàng về kho (hàng lỗi hoặc hàng thừa)')
    ) AS v(platform, route_path, backend_path, default_code, current_code, title, subtitle)
    WHERE NOT EXISTS (SELECT 1 FROM system_screens s WHERE s.platform = v.platform AND s.route_path = v.route_path);
    PRINT N'[OK] Đã đồng bộ System Screens (KH01..KH04, AD10, MK01..MK03)';

    -- 3.4. Seed System Sidebars (Web + Mobile) cho Kho & Đơn vị tính
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'system_sidebars')
    BEGIN
        UPDATE system_sidebars SET sort_order = 9  WHERE platform = 'Web' AND parent_id IS NULL AND title = N'Quản lý kỹ thuật'        AND sort_order = 8;
        UPDATE system_sidebars SET sort_order = 10 WHERE platform = 'Web' AND parent_id IS NULL AND title = N'Bảo trì - cơ sở hạ tầng' AND sort_order = 9;

        IF NOT EXISTS (SELECT 1 FROM system_sidebars WHERE platform = 'Web' AND parent_id IS NULL AND title = N'Quản lý kho')
        BEGIN
            INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
            VALUES ('Web', NULL, N'Quản lý kho', NULL, 'Warehouse', 8, 1, 'warehouse');
        END

        DECLARE @wh_parent_id INT = (SELECT TOP 1 id FROM system_sidebars WHERE platform = 'Web' AND parent_id IS NULL AND title = N'Quản lý kho');
        IF @wh_parent_id IS NOT NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM system_sidebars WHERE platform = 'Web' AND route_path = '/admin/warehouse/goods-receipt')
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                VALUES ('Web', @wh_parent_id, N'Nhập kho', '/admin/warehouse/goods-receipt', 'PackagePlus', 1, 1, 'goods-receipt',
                    (SELECT TOP 1 id FROM system_screens WHERE platform = 'Web' AND route_path = '/admin/warehouse/goods-receipt'));

            IF NOT EXISTS (SELECT 1 FROM system_sidebars WHERE platform = 'Web' AND route_path = '/admin/warehouse/goods-issue')
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                VALUES ('Web', @wh_parent_id, N'Xuất kho', '/admin/warehouse/goods-issue', 'PackageMinus', 2, 1, 'goods-issue',
                    (SELECT TOP 1 id FROM system_screens WHERE platform = 'Web' AND route_path = '/admin/warehouse/goods-issue'));

            IF NOT EXISTS (SELECT 1 FROM system_sidebars WHERE platform = 'Web' AND route_path = '/admin/warehouse/management')
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                VALUES ('Web', @wh_parent_id, N'Quản lý kho', '/admin/warehouse/management', 'Boxes', 3, 1, 'warehouse-management',
                    (SELECT TOP 1 id FROM system_screens WHERE platform = 'Web' AND route_path = '/admin/warehouse/management'));

            IF NOT EXISTS (SELECT 1 FROM system_sidebars WHERE platform = 'Web' AND route_path = '/admin/warehouse/rejected-goods')
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                VALUES ('Web', @wh_parent_id, N'Hàng trả về / Hàng loại', '/admin/warehouse/rejected-goods', 'RotateCcw', 4, 1, 'warehouse-rejected',
                    (SELECT TOP 1 id FROM system_screens WHERE platform = 'Web' AND route_path = '/admin/warehouse/rejected-goods'));
        END

        DECLARE @sys_parent_id INT = (SELECT TOP 1 id FROM system_sidebars WHERE platform = 'Web' AND parent_id IS NULL AND title = N'Quản lý hệ thống');
        IF @sys_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system_sidebars WHERE platform = 'Web' AND route_path = '/admin/units')
        BEGIN
            INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
            VALUES ('Web', @sys_parent_id, N'Quản lý đơn vị tính', '/admin/units', 'Scale', 10, 1, 'units',
                (SELECT TOP 1 id FROM system_screens WHERE platform = 'Web' AND route_path = '/admin/units'));
        END

        -- Mobile Sidebar: Nhóm "Kho" (Phiếu nhập kho, Phiếu bàn giao, Phiếu trả về)
        UPDATE system_sidebars SET sort_order = 4 WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Thông tin sản xuất';
        UPDATE system_sidebars SET sort_order = 5 WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Lập báo cáo';
        UPDATE system_sidebars SET sort_order = 6 WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Báo cáo vi phạm';
        UPDATE system_sidebars SET sort_order = 7 WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Đánh giá nhân sự';

        IF NOT EXISTS (SELECT 1 FROM system_sidebars WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Kho')
        BEGIN
            INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
            VALUES ('Mobile', NULL, N'Kho', '#', 'Warehouse', 3, 1, 'mobile_warehouse');
        END

        DECLARE @m_wh_parent_id INT = (SELECT TOP 1 id FROM system_sidebars WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Kho');
        IF @m_wh_parent_id IS NOT NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM system_sidebars WHERE platform = 'Mobile' AND route_path = '/warehouse/goods-receipt')
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                VALUES ('Mobile', @m_wh_parent_id, N'Phiếu nhập kho', '/warehouse/goods-receipt', 'PackagePlus', 1, 1, 'mobile_warehouse-receipt',
                    (SELECT TOP 1 id FROM system_screens WHERE platform = 'Mobile' AND route_path = '/warehouse/goods-receipt'));

            IF NOT EXISTS (SELECT 1 FROM system_sidebars WHERE platform = 'Mobile' AND route_path = '/warehouse/handover')
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                VALUES ('Mobile', @m_wh_parent_id, N'Phiếu bàn giao', '/warehouse/handover', 'ClipboardCheck', 2, 1, 'mobile_warehouse-handover',
                    (SELECT TOP 1 id FROM system_screens WHERE platform = 'Mobile' AND route_path = '/warehouse/handover'));

            IF NOT EXISTS (SELECT 1 FROM system_sidebars WHERE platform = 'Mobile' AND route_path = '/warehouse/returns')
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                VALUES ('Mobile', @m_wh_parent_id, N'Phiếu trả về', '/warehouse/returns', 'RotateCcw', 3, 1, 'mobile_warehouse-return',
                    (SELECT TOP 1 id FROM system_screens WHERE platform = 'Mobile' AND route_path = '/warehouse/returns'));
        END

        PRINT N'[OK] Đã đồng bộ System Sidebars cho Web & Mobile Kho';
    END

    COMMIT TRANSACTION;
    PRINT N'>>> NÂNG CẤP CSDL THÀNH CÔNG RỰC RỠ 100%!';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT N'!!! LỖI TRONG QUÁ TRÌNH NÂNG CẤP: ' + ERROR_MESSAGE();
    THROW;
END CATCH;
```

---

## 🔍 4. KỊCH BẢN KIỂM TRA HẬU MIGRATION (VERIFICATION CHECKS)

Sau khi chạy script trên, bạn có thể thực hiện kiểm tra nhanh trạng thái CSDL bằng câu lệnh sau:

```sql
SELECT 
    t.name AS TableName, 
    COUNT(c.column_id) AS TotalColumns
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
WHERE t.name IN (
    'customer_claims', 'cabinet_prices', 'container_shipments', 
    'defect_categories', 'user_defect_trackings', 'lpn_ocr_jobs',
    'daily_inspection_records', 'defect_types', 'client_defects',
    'units_of_measure', 'warehouses', 'warehouse_materials',
    'goods_receipts', 'goods_receipt_items', 'goods_issues',
    'goods_issue_items', 'rejected_goods'
)
GROUP BY t.name
ORDER BY t.name;
```

**Bảng kết quả chuẩn mong đợi:**
- `cabinet_prices`: 9 cột
- `client_defects`: 12 cột
- `container_shipments`: 10 cột
- `customer_claims`: 17 cột
- `daily_inspection_records`: 14 cột
- `defect_categories`: 11 cột
- `defect_types`: 14 cột
- `goods_issue_items`: 16 cột
- `goods_issues`: 27 cột
- `goods_receipt_items`: 14 cột
- `goods_receipts`: 23 cột
- `lpn_ocr_jobs`: 16 cột
- `rejected_goods`: 36 cột
- `units_of_measure`: 7 cột
- `user_defect_trackings`: 4 cột
- `warehouse_materials`: 15 cột
- `warehouses`: 7 cột

