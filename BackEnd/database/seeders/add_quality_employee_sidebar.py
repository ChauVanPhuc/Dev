import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import SessionLocal

def add_sidebar_menu():
    db = SessionLocal()
    try:
        # 1. Update for Web under 'Quản lý chất lượng'
        parent_web = db.execute(text("SELECT id FROM system_sidebars WHERE platform = 'Web' AND parent_id IS NULL AND title LIKE N'%Quản lý chất lượng%'")).fetchone()
        if not parent_web:
            parent_web = db.execute(text("SELECT id FROM system_sidebars WHERE platform = 'Web' AND parent_id IS NULL AND title LIKE N'%Chất lượng%'")).fetchone()

        if parent_web:
            parent_id = parent_web[0]
            db.execute(text("""
                UPDATE system_sidebars 
                SET parent_id = :pid, title = N'Danh sách nhân sự' 
                WHERE platform = 'Web' AND route_path = '/admin/kpi/quality-employees'
            """), {'pid': parent_id})
            db.commit()
            print(f"[WEB OK] Đã đổi tên thành 'Danh sách nhân sự' & chuyển /admin/kpi/quality-employees sang nhóm Quản lý chất lượng (ID = {parent_id})")
        else:
            print("[WEB WARN] Không tìm thấy nhóm Quản lý chất lượng")

        # 2. Update for Mobile
        db.execute(text("""
            UPDATE system_sidebars 
            SET title = N'Danh sách nhân sự' 
            WHERE platform = 'Mobile' AND route_path = '/kpi-quality-employees'
        """))
        db.commit()
        print("[MOBILE OK] Đã đổi tên menu Mobile thành 'Danh sách nhân sự'")

    except Exception as e:
        db.rollback()
        print('Lỗi:', e)
    finally:
        db.close()

if __name__ == '__main__':
    add_sidebar_menu()
