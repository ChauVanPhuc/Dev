# -*- coding: utf-8 -*-
"""
SmartFlow ERP - Automatic Database Migration Runner (v3 -> v5)
Chạy script này để tự động cập nhật Database SQL Server khi kéo code mới về.
Lệnh chạy: python BackEnd/database/migrations/run_production_v5_migration.py
"""

import os
import sys
from sqlalchemy import text

# Đảm bảo đường dẫn import đúng module Backend
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
root_dir = os.path.abspath(os.path.join(backend_dir, ".."))

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from config.database import engine
except Exception as e:
    print(f"[ERROR] Không thể kết nối database: {e}")
    sys.exit(1)


DDL_STATEMENTS = [
    # 1. defect_categories
    ("""
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
        INSERT INTO defect_categories (code, name, prefix, color, order_index, is_active)
        VALUES 
            (N'visual', N'Ngoại quan', N'NQ', N'#C45A1A', 1, 1),
            (N'paint', N'Sơn & Bề mặt', N'SON', N'#4D2612', 2, 1),
            (N'structure', N'Kết cấu', N'KC', N'#8C4318', 3, 1),
            (N'material', N'Nguyên liệu', N'NL', N'#8B5E3C', 4, 1),
            (N'other', N'Khác', N'KH', N'#6B584C', 5, 1);
    END
    """, "Bảng defect_categories"),

    # 2. customer_claims
    ("""
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
    END
    """, "Bảng customer_claims"),

    # 3. cabinet_prices
    ("""
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
    END
    """, "Bảng cabinet_prices"),

    # 4. container_shipments
    ("""
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
    END
    """, "Bảng container_shipments"),

    # 5. user_defect_trackings
    ("""
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_defect_trackings')
    BEGIN
        CREATE TABLE user_defect_trackings (
            id INT IDENTITY(1,1) PRIMARY KEY,
            user_id INT NOT NULL,
            defect_id INT NOT NULL,
            created_at DATETIME NULL DEFAULT GETDATE()
        );
        CREATE INDEX IX_user_defect_trackings_user ON user_defect_trackings(user_id);
    END
    """, "Bảng user_defect_trackings"),

    # 6. lpn_ocr_jobs
    ("""
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
    END
    """, "Bảng lpn_ocr_jobs"),

    # 7. daily_inspection_records columns
    ("""
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'daily_inspection_records')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'is_deleted')
            ALTER TABLE daily_inspection_records ADD is_deleted BIT NULL CONSTRAINT DF_daily_inspection_records_is_deleted DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'pallet_code')
            ALTER TABLE daily_inspection_records ADD pallet_code NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'data_json')
            ALTER TABLE daily_inspection_records ADD data_json NVARCHAR(MAX) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'batch_no')
            ALTER TABLE daily_inspection_records ADD batch_no NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'is_confirmed')
            ALTER TABLE daily_inspection_records ADD is_confirmed BIT NULL DEFAULT 1;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('daily_inspection_records') AND name = 'status')
            ALTER TABLE daily_inspection_records ADD status NVARCHAR(50) NULL DEFAULT N'Đã hoàn thành';
    END
    """, "Cột bảng daily_inspection_records"),

    # 8. defect_types columns
    ("""
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'defect_types')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'images')
            ALTER TABLE defect_types ADD images NVARCHAR(MAX) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'qc_tracking')
            ALTER TABLE defect_types ADD qc_tracking BIT NULL DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'aql_class')
            ALTER TABLE defect_types ADD aql_class NVARCHAR(50) NULL DEFAULT 'Minor';
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'root_cause')
            ALTER TABLE defect_types ADD root_cause NVARCHAR(1000) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'solution')
            ALTER TABLE defect_types ADD solution NVARCHAR(1000) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('defect_types') AND name = 'capa_reference')
            ALTER TABLE defect_types ADD capa_reference NVARCHAR(250) NULL;
    END
    """, "Cột bảng defect_types"),

    # 9. client_defects columns
    ("""
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'client_defects')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'last_updated')
            ALTER TABLE client_defects ADD last_updated DATETIME NULL DEFAULT GETDATE();
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'detection_method')
            ALTER TABLE client_defects ADD detection_method NVARCHAR(250) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'minor_criteria')
            ALTER TABLE client_defects ADD minor_criteria NVARCHAR(500) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'major_criteria')
            ALTER TABLE client_defects ADD major_criteria NVARCHAR(500) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'critical_criteria')
            ALTER TABLE client_defects ADD critical_criteria NVARCHAR(500) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('client_defects') AND name = 'g7_code')
            ALTER TABLE client_defects ADD g7_code NVARCHAR(50) NULL;
    END
    """, "Cột bảng client_defects"),

    # 10. system_sidebars columns
    ("""
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'system_sidebars')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('system_sidebars') AND name = 'permission_key')
            ALTER TABLE system_sidebars ADD permission_key NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('system_sidebars') AND name = 'sort_order')
            ALTER TABLE system_sidebars ADD sort_order INT NULL DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('system_sidebars') AND name = 'badge_count')
            ALTER TABLE system_sidebars ADD badge_count INT NULL DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('system_sidebars') AND name = 'module_code')
            ALTER TABLE system_sidebars ADD module_code NVARCHAR(50) NULL;
    END
    """, "Cột bảng system_sidebars"),

    # 11. accounts columns
    ("""
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'accounts')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'is_web_allowed')
            ALTER TABLE accounts ADD is_web_allowed BIT NOT NULL DEFAULT 1;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'is_mobile_allowed')
            ALTER TABLE accounts ADD is_mobile_allowed BIT NOT NULL DEFAULT 1;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'department_id')
            ALTER TABLE accounts ADD department_id INT NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('accounts') AND name = 'phone')
            ALTER TABLE accounts ADD phone NVARCHAR(20) NULL;
    END
    """, "Cột bảng accounts"),

    # 12. stage_inspections & input_inspections
    ("""
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stage_inspections')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stage_inspections') AND name = 'is_confirmed')
            ALTER TABLE stage_inspections ADD is_confirmed BIT NOT NULL DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stage_inspections') AND name = 'confirmed_at')
            ALTER TABLE stage_inspections ADD confirmed_at DATETIME NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('stage_inspections') AND name = 'confirmed_by')
            ALTER TABLE stage_inspections ADD confirmed_by INT NULL;
    END
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'input_inspections')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('input_inspections') AND name = 'is_confirmed')
            ALTER TABLE input_inspections ADD is_confirmed BIT NOT NULL DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('input_inspections') AND name = 'confirmed_at')
            ALTER TABLE input_inspections ADD confirmed_at DATETIME NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('input_inspections') AND name = 'confirmed_by')
            ALTER TABLE input_inspections ADD confirmed_by INT NULL;
    END
    """, "Cột bảng stage_inspections & input_inspections"),

    # 13. delivery_returns
    ("""
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'delivery_returns')
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_returns') AND name = 'allocation_method')
            ALTER TABLE delivery_returns ADD allocation_method NVARCHAR(20) DEFAULT 'FIFO';
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_returns') AND name = 'sx_confirmed_by')
            ALTER TABLE delivery_returns ADD sx_confirmed_by INT NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_returns') AND name = 'sx_confirmed_at')
            ALTER TABLE delivery_returns ADD sx_confirmed_at DATETIME NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('delivery_returns') AND name = 'sx_confirmation_note')
            ALTER TABLE delivery_returns ADD sx_confirmation_note NVARCHAR(500) NULL;
    END
    """, "Cột bảng delivery_returns"),
]

from database.migrations.create_warehouse_tables import (
    WAREHOUSE_DDL_STATEMENTS,
    seed_warehouse_masters_and_navigation,
)
DDL_STATEMENTS.extend(WAREHOUSE_DDL_STATEMENTS)


def run_migration():
    print("=" * 70)
    print("  SMARTFLOW ERP - AUTOMATIC DATABASE MIGRATION (V3 -> V5)")
    print("=" * 70)
    
    success_count = 0
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            for sql, desc in DDL_STATEMENTS:
                print(f"[*] Kiểm tra & cập nhật: {desc}...", end=" ")
                conn.execute(text(sql))
                print("[OK]")
                success_count += 1

            print("[*] Seed dữ liệu chuẩn Kho (6 Kho, 29 ĐVT, Screens & Sidebars)...", end=" ")
            seed_warehouse_masters_and_navigation(conn)
            print("[OK]")
            
            trans.commit()
            print("\n" + "=" * 70)
            print(f"[THÀNH CÔNG] Đã hoàn thành {success_count}/{len(DDL_STATEMENTS)} hạng mục cập nhật!")
            print("=" * 70)
        except Exception as e:
            trans.rollback()
            print(f"\n[LỖI] Xảy ra lỗi khi chạy migration: {e}")
            sys.exit(1)

    # Verification query
    print("\n--- KẾT QUẢ KIỂM TRA TRẠNG THÁI BẢNG HẬU MIGRATION ---")
    with engine.connect() as conn:
        check_sql = text("""
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
                'goods_receipts', 'goods_receipt_items',
                'goods_issues', 'goods_issue_items', 'rejected_goods'
            )
            GROUP BY t.name
            ORDER BY t.name;
        """)
        rows = conn.execute(check_sql).fetchall()
        for r in rows:
            print(f"  + {r[0]:<30}: {r[1]} cột")


if __name__ == "__main__":
    run_migration()

