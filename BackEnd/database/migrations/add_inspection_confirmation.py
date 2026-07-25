import sys
import os
from sqlalchemy import text
from datetime import datetime

# Thêm thư mục gốc và BackEnd vào PYTHONPATH để có thể import các module cần thiết
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import SessionLocal

def run_migration():
    db = SessionLocal()
    try:
        print("Starting inspection confirmation migration...")
        print("-" * 50)

        # 1. Kiểm tra và thêm cột cho bảng stage_inspections
        check_stage_sql = text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'stage_inspections' 
            AND COLUMN_NAME = 'is_confirmed'
        """)
        stage_has_col = db.execute(check_stage_sql).fetchone()
        
        if not stage_has_col:
            db.execute(text("ALTER TABLE stage_inspections ADD is_confirmed BIT NOT NULL DEFAULT 0"))
            db.execute(text("ALTER TABLE stage_inspections ADD confirmed_at DATETIME NULL"))
            db.execute(text("ALTER TABLE stage_inspections ADD confirmed_by INT NULL"))
            db.commit()
            print("[OK] Added confirmation columns to stage_inspections table.")
        else:
            print("[SKIP] Confirmation columns already exist in stage_inspections.")

        # 2. Kiểm tra và thêm cột cho bảng input_inspections
        check_input_sql = text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'input_inspections' 
            AND COLUMN_NAME = 'is_confirmed'
        """)
        input_has_col = db.execute(check_input_sql).fetchone()
        
        if not input_has_col:
            db.execute(text("ALTER TABLE input_inspections ADD is_confirmed BIT NOT NULL DEFAULT 0"))
            db.execute(text("ALTER TABLE input_inspections ADD confirmed_at DATETIME NULL"))
            db.execute(text("ALTER TABLE input_inspections ADD confirmed_by INT NULL"))
            db.commit()
            print("[OK] Added confirmation columns to input_inspections table.")
        else:
            print("[SKIP] Confirmation columns already exist in input_inspections.")

        # 3. Seed dữ liệu cấu hình màn hình trong system_screens
        print("Seeding screens metadata into system_screens...")

        # Cập nhật route /admin/claims từ CL1 sang CL5 để nhường CL1 cho trang tổng quan mới
        check_claims = text("SELECT COUNT(*) FROM system_screens WHERE route_path = '/admin/claims' AND platform = 'Web'")
        claims_exists = db.execute(check_claims).fetchone()[0]
        if claims_exists > 0:
            db.execute(text("""
                UPDATE system_screens 
                SET default_code = 'CL5', current_code = 'CL5' 
                WHERE route_path = '/admin/claims' AND platform = 'Web'
            """))
            print("[OK] Updated route /admin/claims to CL5.")

        # Cấu hình cho màn hình tổng quan Quản lý chất lượng CL1
        screens_to_seed = [
            {
                "platform": "Web",
                "route_path": "/admin/quality",
                "default_code": "CL1",
                "current_code": "CL1",
                "title": "Quản lý chất lượng",
                "subtitle": "Hiển thị danh sách các công việc tồn đọng cần xử lý"
            },
            {
                "platform": "Web",
                "route_path": "/admin/reports/detail/:type/:id",
                "default_code": "CL1.1",
                "current_code": "CL1.1",
                "title": "Chi tiết phiếu kiểm tra",
                "subtitle": "Xem chi tiết kết quả kiểm tra chất lượng"
            }
        ]

        for screen in screens_to_seed:
            check_route = text("SELECT COUNT(*) FROM system_screens WHERE route_path = :route_path AND platform = :platform")
            route_exists = db.execute(check_route, {"route_path": screen["route_path"], "platform": screen["platform"]}).fetchone()[0]
            
            if route_exists == 0:
                insert_sql = text("""
                    INSERT INTO system_screens (platform, route_path, default_code, current_code, title, subtitle, is_active, status, updated_at)
                    VALUES (:platform, :route_path, :default_code, :current_code, :title, :subtitle, 1, N'Mới thiết kế', :updated_at)
                """)
                db.execute(insert_sql, {
                    "platform": screen["platform"],
                    "route_path": screen["route_path"],
                    "default_code": screen["default_code"],
                    "current_code": screen["current_code"],
                    "title": screen["title"],
                    "subtitle": screen["subtitle"],
                    "updated_at": datetime.now()
                })
                print(f"[OK] Seeded route {screen['route_path']} ({screen['default_code']})")
            else:
                update_sql = text("""
                    UPDATE system_screens 
                    SET default_code = :default_code, current_code = :current_code, title = :title, subtitle = :subtitle, updated_at = :updated_at
                    WHERE route_path = :route_path AND platform = :platform
                """)
                db.execute(update_sql, {
                    "platform": screen["platform"],
                    "route_path": screen["route_path"],
                    "default_code": screen["default_code"],
                    "current_code": screen["current_code"],
                    "title": screen["title"],
                    "subtitle": screen["subtitle"],
                    "updated_at": datetime.now()
                })
                print(f"[SKIP/UPDATE] Route {screen['route_path']} already exists, updated details")
        
        db.commit()
        print("-" * 50)
        print("Inspection confirmation migration completed successfully.")
        
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
