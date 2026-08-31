import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db

def upgrade():
    """Tạo bảng quality_objectives, quality_objective_logs và seed menu sidebar."""
    db = next(get_db())
    try:
        print("Creating quality_objectives table...")
        create_objectives_sql = text("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'quality_objectives')
            BEGIN
                CREATE TABLE quality_objectives (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    code NVARCHAR(50) NOT NULL UNIQUE,
                    title NVARCHAR(255) NOT NULL,
                    category NVARCHAR(100) NOT NULL DEFAULT 'FPY',
                    factory_name NVARCHAR(100) NULL DEFAULT N'Tất cả',
                    department_name NVARCHAR(100) NULL DEFAULT N'Tất cả',
                    period_type NVARCHAR(50) NOT NULL DEFAULT N'Tháng',
                    year INT NOT NULL DEFAULT 2026,
                    month INT NULL,
                    target_value FLOAT NOT NULL DEFAULT 0.0,
                    target_unit NVARCHAR(50) NOT NULL DEFAULT '%',
                    operator NVARCHAR(20) NOT NULL DEFAULT '>=',
                    description NVARCHAR(1000) NULL,
                    is_active BIT NOT NULL DEFAULT 1,
                    created_by NVARCHAR(100) NULL,
                    created_at DATETIME NOT NULL DEFAULT GETDATE(),
                    updated_at DATETIME NOT NULL DEFAULT GETDATE()
                )
                PRINT '[OK] Created quality_objectives table.'
            END
            ELSE
            BEGIN
                PRINT '[SKIP] Table quality_objectives already exists.'
            END
        """)
        db.execute(create_objectives_sql)
        db.commit()

        print("Creating quality_objective_logs table...")
        create_logs_sql = text("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'quality_objective_logs')
            BEGIN
                CREATE TABLE quality_objective_logs (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    objective_id INT NOT NULL,
                    period_label NVARCHAR(50) NOT NULL,
                    actual_value FLOAT NOT NULL DEFAULT 0.0,
                    achievement_rate FLOAT NOT NULL DEFAULT 0.0,
                    evaluation_status NVARCHAR(50) NOT NULL DEFAULT N'Đạt',
                    analysis_note NVARCHAR(1000) NULL,
                    recorded_at DATETIME NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_quality_obj_logs_obj FOREIGN KEY (objective_id) REFERENCES quality_objectives(id) ON DELETE CASCADE
                )
                PRINT '[OK] Created quality_objective_logs table.'
            END
            ELSE
            BEGIN
                PRINT '[SKIP] Table quality_objective_logs already exists.'
            END
        """)
        db.execute(create_logs_sql)
        db.commit()

        # Seed initial quality objectives data if empty
        check_obj_count = db.execute(text("SELECT COUNT(*) FROM quality_objectives")).fetchone()[0]
        if check_obj_count == 0:
            print("Seeding sample quality objectives...")
            seed_objs_sql = text("""
                INSERT INTO quality_objectives (code, title, category, factory_name, department_name, period_type, year, month, target_value, target_unit, operator, description, created_by)
                VALUES 
                (N'MTCL-2026-01', N'Tỷ lệ sản phẩm đạt kiểm tra lần đầu (FPY)', N'FPY', N'Tất cả', N'QC Sơn', N'Tháng', 2026, 8, 98.5, N'%', N'>=', N'Mục tiêu tỷ lệ sản phẩm đạt ngay từ công đoạn kiểm tra đầu tiên', N'Admin'),
                (N'MTCL-2026-02', N'Tỷ lệ phế phẩm / lỗi tổng hợp (PPM)', N'PPM', N'NM1', N'Mộc', N'Tháng', 2026, 8, 1200, N'PPM', N'<=', N'Khống chế số lỗi trên 1 triệu sản phẩm', N'Admin'),
                (N'MTCL-2026-03', N'Số lượng sự cố vi phạm chất lượng nghiêm trọng', N'Violation', N'Tất cả', N'Tất cả', N'Tháng', 2026, 8, 0, N'Vụ', N'==', N'Không để xảy ra sự cố vi phạm chất lượng nghiêm trọng', N'Admin'),
                (N'MTCL-2026-04', N'Tỷ lệ xử lý Biên bản sự cố (BBCH) đúng hạn', N'QuickReport', N'Tất cả', N'Tất cả', N'Tháng', 2026, 8, 100, N'%', N'>=', N'Các báo cáo nhanh và BBCH phải được phản hồi trong 24h', N'Admin')
            """)
            db.execute(seed_objs_sql)
            db.commit()
            print("[OK] Seeded sample quality objectives.")

        # Seed sidebar menu for /admin/quality-targets
        print("Checking/Seeding sidebar menu...")
        parent_query = text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Web' AND parent_id IS NULL AND title LIKE N'%Quản lý chất lượng%'
        """)
        parent_row = db.execute(parent_query).fetchone()

        if parent_row:
            parent_id = parent_row[0]
            existing_query = text("""
                SELECT id FROM system_sidebars
                WHERE platform = 'Web' AND parent_id = :parent_id AND route_path = '/admin/quality-targets'
            """)
            existing_row = db.execute(existing_query, {"parent_id": parent_id}).fetchone()

            if not existing_row:
                insert_sidebar_sql = text("""
                    INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                    VALUES ('Web', :parent_id, N'Mục tiêu chất lượng', '/admin/quality-targets', 'Target', 2, 1, 'quality-records')
                """)
                db.execute(insert_sidebar_sql, {"parent_id": parent_id})
                db.commit()
                print("[OK] Added 'Mục tiêu chất lượng' sidebar item.")
            else:
                print(f"[SKIP] Sidebar item already exists with ID: {existing_row[0]}")

        print("[SUCCESS] All migrations for Quality Objectives executed successfully!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    upgrade()
