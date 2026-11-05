"""
Migration script to remove the 'Quản lý KPI' sidebar group and its child items from system_sidebars table.
KPI features are now consolidated under 'Module chất lượng':
- /admin/kpi/dashboard (Mục tiêu Chất Lượng)
- /admin/kpi/quality-employees (Danh sách nhân sự)
"""
import sys
import os
import io

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db

def migrate():
    db = next(get_db())
    try:
        print("--- Removing 'Quản lý KPI' sidebar group from system_sidebars ---")
        
        # 1. Find the parent group 'Quản lý KPI' for Web
        parents = db.execute(text("""
            SELECT id, title, platform FROM system_sidebars 
            WHERE (title = N'Quản lý KPI' OR title = N'KPI') AND parent_id IS NULL
        """)).fetchall()

        for parent_id, parent_title, platform in parents:
            print(f"[FOUND] Found target parent item ID={parent_id}, title='{parent_title}', platform='{platform}'")
            
            # Delete children of this group
            del_children = db.execute(text("""
                DELETE FROM system_sidebars WHERE parent_id = :parent_id
            """), {"parent_id": parent_id})
            print(f"  └─ [DELETE] Deleted {del_children.rowcount} child menu items of parent ID={parent_id}")

            # Delete the parent item itself
            db.execute(text("""
                DELETE FROM system_sidebars WHERE id = :id
            """), {"id": parent_id})
            print(f"  └─ [DELETE] Deleted parent menu item ID={parent_id}")

        db.commit()
        print("[SUCCESS] Successfully removed 'Quản lý KPI' group from system_sidebars!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Removal failed: {e}")
        raise
    finally:
        db.close()

if __name__ == '__main__':
    migrate()

