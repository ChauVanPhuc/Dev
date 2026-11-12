# -*- coding: utf-8 -*-
"""
Migration: Khởi tạo 8 bảng cho Phân hệ Quản lý Kho & Đơn vị tính (Warehouse & UoM),
kèm Seed dữ liệu chuẩn: 6 Kho, 29 Đơn vị tính, System Screens và System Sidebars.
"""
import os
import sys
from sqlalchemy import text

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config.database import engine


WAREHOUSE_DDL_STATEMENTS = [
    ("""
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
    END
    """, "Tạo bảng units_of_measure"),

    ("""
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
        CREATE INDEX IX_warehouses_code ON warehouses(code);
    END
    """, "Tạo bảng warehouses"),

    ("""
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
        CREATE INDEX IX_warehouse_materials_item_code ON warehouse_materials(item_code);
    END
    """, "Tạo bảng warehouse_materials"),

    ("""
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
        CREATE INDEX IX_goods_receipts_wh ON goods_receipts(warehouse_code);
        CREATE INDEX IX_goods_receipts_status ON goods_receipts(status);
    END
    """, "Tạo bảng goods_receipts"),

    ("""
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
        CREATE INDEX IX_goods_receipt_items_item_code ON goods_receipt_items(item_code);
    END
    """, "Tạo bảng goods_receipt_items"),

    ("""
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
        CREATE INDEX IX_goods_issues_wh ON goods_issues(warehouse_code);
        CREATE INDEX IX_goods_issues_status ON goods_issues(status);
        CREATE INDEX IX_goods_issues_factory_id ON goods_issues(factory_id);
    END
    """, "Tạo bảng goods_issues"),

    ("""
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
        CREATE INDEX IX_goods_issue_items_item_code ON goods_issue_items(item_code);
    END
    """, "Tạo bảng goods_issue_items"),

    ("""
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
        CREATE INDEX IX_rejected_goods_item ON rejected_goods(item_code);
        CREATE INDEX IX_rejected_goods_wh ON rejected_goods(warehouse_code);
    END
    """, "Tạo bảng rejected_goods"),

    ("""
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
    """, "Bổ sung cột Mobile/Traceability cho các bảng Kho"),
]


STANDARD_WAREHOUSES = [
    ("KTP", "Kho thành phẩm", "Bàn, ghế, tủ, giường đồ gỗ hoàn thiện", 1),
    ("KDG", "Đóng gói - bao bì", "Thùng carton, màng PE, pallet, xốp bảo vệ", 2),
    ("KHH", "Kho hàng hóa", "Hàng hóa mua ngoài, thiết bị phụ trợ lắp ráp", 3),
    ("KNLC", "Kho nguyên liệu chính", "Gỗ Sồi, Tần bì, Óc chó, ván MDF, Plywood", 4),
    ("KVT", "Kho vật tư", "Bản lề, ray trượt, ốc vít, keo ghép, nhám", 5),
    ("KSON", "Kho sơn - dầu màu", "Sơn PU, sơn lót, chất đóng rắn, dung môi", 6),
]

STANDARD_UNITS = [
    ("m3", "Mét khối", 4),
    ("Tấm", "", 0),
    ("m2", "Mét vuông", 2),
    ("cái", "", 0),
    ("Kg", "Kilogram", 2),
    ("chai", "", 0),
    ("m", "Mét", 2),
    ("cuộn", "", 0),
    ("bộ", "", 0),
    ("Tủ", "", 0),
    ("thùng", "", 0),
    ("Thanh", "", 0),
    ("Lít", "", 2),
    ("Con", "", 0),
    ("bịch", "", 0),
    ("Đôi", "", 0),
    ("Cây", "", 0),
    ("Tờ", "", 0),
    ("múi", "", 0),
    ("Hộp", "", 0),
    ("Sợi", "", 0),
    ("tuýp", "", 0),
    ("ống", "", 0),
    ("Hũ", "", 0),
    ("SET", "", 0),
    ("Can", "", 0),
    ("Kiện", "", 0),
    ("Chồng", "", 0),
    ("Bó", "", 0),
]


def seed_warehouse_masters_and_navigation(conn):
    # 1. Seed 6 kho chuẩn
    for code, name, desc, sort_order in STANDARD_WAREHOUSES:
        exists = conn.execute(text("SELECT id FROM warehouses WHERE code = :c"), {"c": code}).fetchone()
        if not exists:
            conn.execute(
                text("INSERT INTO warehouses (code, name, description, sort_order, is_active) VALUES (:c, :n, :d, :s, 1)"),
                {"c": code, "n": name, "d": desc, "s": sort_order},
            )

    # 2. Seed danh mục ĐVT chuẩn
    for code, full_name, precision in STANDARD_UNITS:
        exists = conn.execute(text("SELECT id FROM units_of_measure WHERE LOWER(code) = LOWER(:c)"), {"c": code}).fetchone()
        if not exists:
            conn.execute(
                text("INSERT INTO units_of_measure (code, full_name, precision, status) VALUES (:c, :fn, :p, 'ACTIVE')"),
                {"c": code, "fn": full_name, "p": precision},
            )

    # 3. Seed system_screens cho Kho & ĐVT (Web + Mobile)
    screens = [
        ("Web", "/admin/warehouse/goods-receipt", "/api/v1/warehouses/receipts", "KH01", "KH01", "Nhập kho", "Quản lý danh sách phiếu nhập kho và kiểm đếm vật tư"),
        ("Web", "/admin/warehouse/goods-issue", "/api/v1/warehouses/issues", "KH02", "KH02", "Xuất kho", "Quản lý phiếu xuất kho sản xuất, bán hàng và kiểm soát tồn kho"),
        ("Web", "/admin/warehouse/management", "/api/v1/warehouses/inventory-report", "KH03", "KH03", "Quản lý kho", "Báo cáo Xuất - Nhập - Tồn kho tổng hợp, FIFO và Hàng loại"),
        ("Web", "/admin/warehouse/rejected-goods", "/api/v1/warehouses/rejected-goods", "KH04", "KH04", "Hàng trả về / Hàng loại", "Theo dõi hàng trả về từ sản xuất và hàng không đạt QC đầu vào"),
        ("Web", "/admin/units", "/api/v1/units-of-measure", "AD10", "AD10", "Quản lý đơn vị tính", "Quản lý danh mục đơn vị tính dùng chung cho Kho và Định mức"),
        ("Mobile", "/warehouse/goods-receipt", "/api/v1/warehouses/receipts", "MK01", "MK01", "Phiếu nhập kho", "Tạo và xác nhận phiếu nhập kho từ thiết bị di động"),
        ("Mobile", "/warehouse/handover", "/api/v1/warehouses/issues", "MK02", "MK02", "Phiếu bàn giao", "Lập phiếu bàn giao / xuất kho cho xưởng sản xuất & ký nhận"),
        ("Mobile", "/warehouse/returns", "/api/v1/warehouses/rejected-goods", "MK03", "MK03", "Phiếu trả về", "Tạo và xử lý phiếu trả hàng về kho (hàng lỗi hoặc hàng thừa)"),
    ]
    screen_ids = {}
    for platform, route_path, backend_path, def_code, cur_code, title, subtitle in screens:
        row = conn.execute(
            text("SELECT id FROM system_screens WHERE platform = :p AND route_path = :r"),
            {"p": platform, "r": route_path},
        ).fetchone()
        if not row:
            conn.execute(
                text("""
                    INSERT INTO system_screens (platform, route_path, backend_path, default_code, current_code, title, subtitle, is_active, status)
                    VALUES (:p, :r, :b, :dc, :cc, :t, :s, 1, N'Hoàn thành')
                """),
                {"p": platform, "r": route_path, "b": backend_path, "dc": def_code, "cc": cur_code, "t": title, "s": subtitle},
            )
            row = conn.execute(
                text("SELECT id FROM system_screens WHERE platform = :p AND route_path = :r"),
                {"p": platform, "r": route_path},
            ).fetchone()
        if row:
            screen_ids[(platform, route_path)] = row[0]

    # 4. Seed system_sidebars (Web) cho Quản lý kho & Quản lý đơn vị tính
    # Đảm bảo vị trí sort_order hợp lý sau 'Quản lý kinh doanh' (sort_order=7)
    conn.execute(text("UPDATE system_sidebars SET sort_order = 9 WHERE platform = 'Web' AND parent_id IS NULL AND title = N'Quản lý kỹ thuật' AND sort_order = 8"))
    conn.execute(text("UPDATE system_sidebars SET sort_order = 10 WHERE platform = 'Web' AND parent_id IS NULL AND title = N'Bảo trì - cơ sở hạ tầng' AND sort_order = 9"))

    wh_parent = conn.execute(text("SELECT id FROM system_sidebars WHERE platform = 'Web' AND parent_id IS NULL AND title = N'Quản lý kho'")).fetchone()
    if not wh_parent:
        conn.execute(
            text("""
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                VALUES ('Web', NULL, N'Quản lý kho', NULL, 'Warehouse', 8, 1, 'warehouse')
            """)
        )
        wh_parent = conn.execute(text("SELECT id FROM system_sidebars WHERE platform = 'Web' AND parent_id IS NULL AND title = N'Quản lý kho'")).fetchone()

    wh_parent_id = wh_parent[0]
    wh_children = [
        ("Nhập kho", "/admin/warehouse/goods-receipt", "PackagePlus", 1, "goods-receipt"),
        ("Xuất kho", "/admin/warehouse/goods-issue", "PackageMinus", 2, "goods-issue"),
        ("Quản lý kho", "/admin/warehouse/management", "Boxes", 3, "warehouse-management"),
        ("Hàng trả về / Hàng loại", "/admin/warehouse/rejected-goods", "RotateCcw", 4, "warehouse-rejected"),
    ]
    for title, route_path, icon, sort_order, perm_key in wh_children:
        exists = conn.execute(text("SELECT id FROM system_sidebars WHERE platform = 'Web' AND route_path = :r"), {"r": route_path}).fetchone()
        if not exists:
            conn.execute(
                text("""
                    INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                    VALUES ('Web', :pid, :t, :r, :i, :s, 1, :pk, :sid)
                """),
                {
                    "pid": wh_parent_id,
                    "t": title,
                    "r": route_path,
                    "i": icon,
                    "s": sort_order,
                    "pk": perm_key,
                    "sid": screen_ids.get(("Web", route_path)),
                },
            )

    # Thêm 'Quản lý đơn vị tính' dưới 'Quản lý hệ thống'
    sys_parent = conn.execute(text("SELECT id FROM system_sidebars WHERE platform = 'Web' AND parent_id IS NULL AND title = N'Quản lý hệ thống'")).fetchone()
    if sys_parent:
        uom_exists = conn.execute(text("SELECT id FROM system_sidebars WHERE platform = 'Web' AND route_path = '/admin/units'")).fetchone()
        if not uom_exists:
            conn.execute(
                text("""
                    INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                    VALUES ('Web', :pid, N'Quản lý đơn vị tính', '/admin/units', 'Scale', 10, 1, 'units', :sid)
                """),
                {"pid": sys_parent[0], "sid": screen_ids.get(("Web", "/admin/units"))},
            )

    # 5. Seed system_sidebars (Mobile) cho nhóm 'Kho' tại vị trí ngay sau 'Khởi tạo phiếu' (sort_order=3)
    conn.execute(text("UPDATE system_sidebars SET sort_order = 4 WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Thông tin sản xuất'"))
    conn.execute(text("UPDATE system_sidebars SET sort_order = 5 WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Lập báo cáo'"))
    conn.execute(text("UPDATE system_sidebars SET sort_order = 6 WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Báo cáo vi phạm'"))
    conn.execute(text("UPDATE system_sidebars SET sort_order = 7 WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Đánh giá nhân sự'"))

    m_wh_parent = conn.execute(text("SELECT id FROM system_sidebars WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Kho'")).fetchone()
    if not m_wh_parent:
        conn.execute(
            text("""
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                VALUES ('Mobile', NULL, N'Kho', '#', 'Warehouse', 3, 1, 'mobile_warehouse')
            """)
        )
        m_wh_parent = conn.execute(text("SELECT id FROM system_sidebars WHERE platform = 'Mobile' AND parent_id IS NULL AND title = N'Kho'")).fetchone()

    m_wh_parent_id = m_wh_parent[0]
    m_wh_children = [
        ("Phiếu nhập kho", "/warehouse/goods-receipt", "PackagePlus", 1, "mobile_warehouse-receipt"),
        ("Phiếu bàn giao", "/warehouse/handover", "ClipboardCheck", 2, "mobile_warehouse-handover"),
        ("Phiếu trả về", "/warehouse/returns", "RotateCcw", 3, "mobile_warehouse-return"),
    ]
    for title, route_path, icon, sort_order, perm_key in m_wh_children:
        exists = conn.execute(
            text("SELECT id FROM system_sidebars WHERE platform = 'Mobile' AND route_path = :r"),
            {"r": route_path},
        ).fetchone()
        if not exists:
            conn.execute(
                text("""
                    INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                    VALUES ('Mobile', :pid, :t, :r, :i, :s, 1, :pk, :sid)
                """),
                {
                    "pid": m_wh_parent_id,
                    "t": title,
                    "r": route_path,
                    "i": icon,
                    "s": sort_order,
                    "pk": perm_key,
                    "sid": screen_ids.get(("Mobile", route_path)),
                },
            )


def migrate_warehouse_tables():
    print("[*] Running Warehouse & Unit of Measure Database Migration...")
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            for sql, desc in WAREHOUSE_DDL_STATEMENTS:
                conn.execute(text(sql))
                print(f"  [OK] {desc}")
            seed_warehouse_masters_and_navigation(conn)
            print("  [OK] Seed 6 Kho chuẩn, 29 Đơn vị tính, System Screens & System Sidebars")
            trans.commit()
            print("[SUCCESS] Warehouse migration completed successfully!")
        except Exception as e:
            trans.rollback()
            print(f"[ERROR] Warehouse migration failed: {e}")
            raise


if __name__ == "__main__":
    migrate_warehouse_tables()

