import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import SessionLocal

def add_quality_overview_sidebar():
    """Thêm menu 'Quản lý chất lượng' (/admin/quality) vào nhóm 'Quản lý chất lượng' trên Web sidebar."""
    db = SessionLocal()
    try:
        # 1. Tìm ID của nhóm 'Quản lý chất lượng' (Web)
        parent_query = text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Web' AND parent_id IS NULL AND title LIKE N'%Quản lý chất lượng%'
        """)
        parent_row = db.execute(parent_query).fetchone()
        
        if not parent_row:
            print("[ERROR] Không tìm thấy nhóm menu 'Quản lý chất lượng' trên Web sidebar.")
            return

        parent_id = parent_row[0]

        # 2. Kiểm tra xem route /admin/quality đã có trong sidebar chưa
        existing_query = text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Web' AND parent_id = :parent_id AND route_path = '/admin/quality'
        """)
        existing_row = db.execute(existing_query, {"parent_id": parent_id}).fetchone()

        if existing_row:
            print(f"[SKIP] Menu /admin/quality đã tồn tại với ID = {existing_row[0]}")
        else:
            # Shift order of existing items under parent
            db.execute(text("""
                UPDATE system_sidebars
                SET sort_order = sort_order + 1
                WHERE parent_id = :parent_id
            """), {"parent_id": parent_id})

            # Insert /admin/quality as item 1
            insert_query = text("""
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                VALUES ('Web', :parent_id, N'Quản lý chất lượng', '/admin/quality', 'ShieldCheck', 1, 1, 'quality-records')
            """)
            db.execute(insert_query, {"parent_id": parent_id})
            db.commit()
            print("[OK] Đã thêm thành công menu '/admin/quality' (Quản lý chất lượng) vào đầu nhóm Quản lý chất lượng.")
            
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Thất bại khi thêm sidebar menu: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_quality_overview_sidebar()
