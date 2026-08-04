# -*- coding: utf-8 -*-
"""
Migration script to create production routing and team tables:
- production_teams
- production_routings
- production_routing_nodes
- production_routing_components
"""

from sqlalchemy import text
from config.database import engine, SessionLocal

def upgrade():
    """Create production routing and team tables if they don't exist"""
    db = SessionLocal()
    
    try:
        # 1. Check if production_teams table exists
        teams_check = db.execute(text("""
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'production_teams'
        """)).fetchone()
        
        if not teams_check:
            print("Creating production_teams table...")
            db.execute(text("""
                CREATE TABLE production_teams (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    team_code NVARCHAR(50) NOT NULL UNIQUE,
                    team_name NVARCHAR(100) NOT NULL,
                    factory NVARCHAR(100) NOT NULL,
                    members_count INT DEFAULT 10,
                    description NVARCHAR(500) NULL,
                    color NVARCHAR(20) DEFAULT '#2D1A12',
                    created_at DATETIME DEFAULT GETDATE()
                )
            """))
            db.execute(text("CREATE INDEX ix_production_teams_team_code ON production_teams (team_code)"))
            db.execute(text("CREATE INDEX ix_production_teams_factory ON production_teams (factory)"))
            db.commit()
            print("Successfully created production_teams table.")

            # Seed data for production_teams
            db.execute(text("""
                INSERT INTO production_teams (team_code, team_name, factory, members_count, description, color) VALUES
                ('TO-TP-01', N'Tổ tạo phôi', N'Nhà máy 1', 12, N'Xẻ phôi thô & bào 4 mặt gỗ tự nhiên', '#2D1A12'),
                ('TO-DH-01', N'Tổ định hình 1', N'Nhà máy 1', 12, N'Gia công phay, cắt phôi gỗ tự nhiên', '#2D1A12'),
                ('TO-DH-02', N'Tổ định hình 2', N'Nhà máy 1', 15, N'Chạy máy CNC 4 đầu và rãnh mộng', '#2D1A12'),
                ('TO-LR-01', N'Tổ lắp ráp 1', N'Nhà máy 1', 10, N'Khoan chốt cam & dựng khung cụm', '#2D1A12'),
                ('TO-DH-03', N'Tổ định hình 3', N'Nhà máy 2', 10, N'Cắt ván dán viền gỗ công nghiệp', '#D97706'),
                ('TO-DH-04', N'Tổ định hình 4', N'Nhà máy 2', 14, N'Chạy chỉ nẹp và khoan chốt tự động', '#D97706'),
                ('TO-SN-01', N'Tổ sơn PU 1', N'Nhà máy 2', 16, N'Sơn lót, xả bả & sơn bóng mờ', '#D97706'),
                ('TO-QC-01', N'Tổ QC kiểm định', N'Nhà máy 3', 8, N'Kiểm tra chất lượng thành phẩm', '#3B82F6'),
                ('TO-DG-01', N'Đóng gói 1', N'Nhà máy 3', 18, N'Đóng thùng carton xuất khẩu', '#3B82F6'),
                ('TO-DG-02', N'Đóng gói 2', N'Nhà máy 3', 16, N'Bọc màng PE & xếp kiện pallet', '#3B82F6')
            """))
            db.commit()
            print("Successfully seeded production_teams data.")
        else:
            print("production_teams table already exists.")

        # 2. Check if production_routings table exists
        routings_check = db.execute(text("""
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'production_routings'
        """)).fetchone()

        if not routings_check:
            print("Creating production_routings table...")
            db.execute(text("""
                CREATE TABLE production_routings (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    routing_code NVARCHAR(50) NOT NULL UNIQUE,
                    routing_name NVARCHAR(255) NOT NULL,
                    category NVARCHAR(100) NULL,
                    is_default BIT DEFAULT 0,
                    applied_count INT DEFAULT 0,
                    description NVARCHAR(500) NULL,
                    created_at DATETIME DEFAULT GETDATE()
                )
            """))
            db.execute(text("CREATE INDEX ix_production_routings_routing_code ON production_routings (routing_code)"))
            db.commit()
            print("Successfully created production_routings table.")

            # Seed data for production_routings
            db.execute(text("""
                INSERT INTO production_routings (routing_code, routing_name, category, is_default, applied_count, description) VALUES
                ('QT-TU-01', N'Quy trình sản xuất Tủ áo & Tủ trang trí', N'Tủ gỗ', 1, 12, N'Quy trình sản xuất tiêu chuẩn cho tủ áo sồi và MDF'),
                ('QT-BAN-01', N'Quy trình sản xuất Bàn ăn & Bàn làm việc', N'Bàn gỗ', 0, 8, N'Quy trình sản xuất bàn ăn chân gỗ tự nhiên'),
                ('QT-GIUONG-01', N'Quy trình sản xuất Giường ngủ King & Queen Size', N'Giường gỗ', 0, 5, N'Quy trình sản xuất giường ngủ bọc da')
            """))
            db.commit()
            print("Successfully seeded production_routings data.")
        else:
            print("production_routings table already exists.")

        # 3. Check if production_routing_nodes table exists
        nodes_check = db.execute(text("""
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'production_routing_nodes'
        """)).fetchone()

        if not nodes_check:
            print("Creating production_routing_nodes table...")
            db.execute(text("""
                CREATE TABLE production_routing_nodes (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    routing_id INT NOT NULL FOREIGN KEY REFERENCES production_routings(id) ON DELETE CASCADE,
                    team_id INT NOT NULL FOREIGN KEY REFERENCES production_teams(id),
                    step_order INT NOT NULL,
                    color NVARCHAR(20) NULL,
                    created_at DATETIME DEFAULT GETDATE()
                )
            """))
            db.execute(text("CREATE INDEX ix_production_routing_nodes_routing ON production_routing_nodes (routing_id)"))
            db.commit()
            print("Successfully created production_routing_nodes table.")

            # Seed nodes for routings
            # QT-TU-01 (Routing ID 1): TO-DH-01 (2), TO-DH-02 (3), TO-DH-03 (5), TO-DG-01 (9)
            db.execute(text("""
                INSERT INTO production_routing_nodes (routing_id, team_id, step_order, color) VALUES
                (1, (SELECT id FROM production_teams WHERE team_code='TO-DH-01'), 1, '#2D1A12'),
                (1, (SELECT id FROM production_teams WHERE team_code='TO-DH-02'), 2, '#2D1A12'),
                (1, (SELECT id FROM production_teams WHERE team_code='TO-DH-03'), 3, '#D97706'),
                (1, (SELECT id FROM production_teams WHERE team_code='TO-DG-01'), 4, '#3B82F6'),
                
                (2, (SELECT id FROM production_teams WHERE team_code='TO-DH-01'), 1, '#2D1A12'),
                (2, (SELECT id FROM production_teams WHERE team_code='TO-DH-04'), 2, '#D97706'),
                (2, (SELECT id FROM production_teams WHERE team_code='TO-DG-02'), 3, '#3B82F6'),
                
                (3, (SELECT id FROM production_teams WHERE team_code='TO-DH-02'), 1, '#2D1A12'),
                (3, (SELECT id FROM production_teams WHERE team_code='TO-DH-03'), 2, '#D97706'),
                (3, (SELECT id FROM production_teams WHERE team_code='TO-DG-01'), 3, '#3B82F6')
            """))
            db.commit()
            print("Successfully seeded production_routing_nodes data.")

        # 4. Check if production_routing_components table exists
        components_check = db.execute(text("""
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'production_routing_components'
        """)).fetchone()

        if not components_check:
            print("Creating production_routing_components table...")
            db.execute(text("""
                CREATE TABLE production_routing_components (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    routing_id INT NOT NULL FOREIGN KEY REFERENCES production_routings(id) ON DELETE CASCADE,
                    team_code NVARCHAR(50) NOT NULL,
                    comp_code NVARCHAR(100) NOT NULL,
                    comp_name NVARCHAR(255) NOT NULL,
                    next_team_name NVARCHAR(100) NULL,
                    qc_required BIT DEFAULT 1,
                    note NVARCHAR(500) NULL,
                    created_at DATETIME DEFAULT GETDATE()
                )
            """))
            db.execute(text("CREATE INDEX ix_production_routing_comp_routing ON production_routing_components (routing_id)"))
            db.commit()

            # Seed data
            db.execute(text("""
                INSERT INTO production_routing_components (routing_id, team_code, comp_code, comp_name, next_team_name, qc_required, note) VALUES
                (1, 'TO-DH-01', 'TP-TA-01', N'Hồi tủ áo gỗ sồi (Trái)', N'Tổ định hình 2', 1, N'Độ dày 18mm'),
                (1, 'TO-DH-01', 'TP-TA-02', N'Hồi tủ áo gỗ sồi (Phải)', N'Tổ định hình 2', 1, N'Độ dày 18mm'),
                (1, 'TO-DH-02', 'TP-TA-03', N'Cánh tủ áo phẳng CNC', N'Tổ định hình 3', 1, N'Chạy rãnh tay móc'),
                (1, 'TO-DH-03', 'TP-TA-04', N'Khung vách nẹp tay móc', N'Đóng gói 1', 0, N'Dán nẹp chỉ PVC'),
                (1, 'TO-DG-01', 'TP-DG-01', N'Bộ phụ kiện bản lề & đinh ốc', N'Kho thành phẩm', 1, N'Đóng túi nilon'),
                
                (2, 'TO-DH-01', 'TP-BA-01', N'Mặt bàn ăn gỗ óc chó 1.8m', N'Tổ định hình 4', 1, N'Vát cạnh 45 độ'),
                (2, 'TO-DH-04', 'TP-BA-02', N'Bộ 4 chân bàn ăn vót nhọn', N'Đóng gói 2', 1, N'Sơn lót PU bóng'),
                (2, 'TO-DG-02', 'TP-DG-02', N'Thùng carton 5 lớp bàn ăn', N'Kho thành phẩm', 1, N'Bọc xốp PE góc'),
                
                (3, 'TO-DH-02', 'TP-GN-01', N'Đầu giường bọc nệm da King', N'Tổ định hình 3', 1, N'Gỗ Sồi + Da Microfiber'),
                (3, 'TO-DH-03', 'TP-GN-02', N'Vai giường & Giát giường', N'Đóng gói 1', 0, N'Sơn phủ mờ 30%'),
                (3, 'TO-DG-01', 'TP-DG-03', N'Phụ kiện ke góc giường', N'Kho thành phẩm', 1, N'Đóng hộp phụ kiện')
            """))
            db.commit()
            print("Successfully seeded production_routing_components data.")

    except Exception as e:
        db.rollback()
        print(f"Error executing migration: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == '__main__':
    upgrade()
