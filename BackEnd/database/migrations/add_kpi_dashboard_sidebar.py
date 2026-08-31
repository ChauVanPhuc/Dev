import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import SessionLocal

def add_kpi_dashboard_sidebar():
    """Thêm menu 'Dashboard KPI & Chất lượng' (/admin/kpi/dashboard) vào nhóm 'Quản lý KPI' trên Web sidebar."""
    db = SessionLocal()
    try:
        parent_query = text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Web' AND parent_id IS NULL AND title LIKE N'%Quản lý KPI%'
        """)
        parent_row = db.execute(parent_query).fetchone()

        if not parent_row:
            print("[ERROR] Không tìm thấy nhóm menu 'Quản lý KPI' trên Web sidebar.")
            return

        parent_id = parent_row[0]

        existing_query = text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Web' AND parent_id = :parent_id AND route_path = '/admin/kpi/dashboard'
        """)
        existing_row = db.execute(existing_query, {"parent_id": parent_id}).fetchone()

        if existing_row:
            print(f"[SKIP] Menu /admin/kpi/dashboard đã tồn tại với ID = {existing_row[0]}")
        else:
            db.execute(text("""
                UPDATE system_sidebars
                SET sort_order = sort_order + 1
                WHERE platform = 'Web' AND parent_id = :parent_id
            """), {"parent_id": parent_id})

            insert_query = text("""
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                VALUES ('Web', :parent_id, N'Dashboard KPI & Chất lượng', '/admin/kpi/dashboard', 'LayoutDashboard', 1, 1, 'kpi')
            """)
            db.execute(insert_query, {"parent_id": parent_id})
            db.commit()
            print("[OK] Đã thêm thành công menu '/admin/kpi/dashboard' vào nhóm Quản lý KPI.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Thất bại khi thêm sidebar menu: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_kpi_dashboard_sidebar()
