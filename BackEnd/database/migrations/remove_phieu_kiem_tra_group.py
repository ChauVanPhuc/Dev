"""
Migration script to remove the legacy 'Phiếu kiểm tra' sidebar group from system_sidebars table for Mobile platform.
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
        print("--- Removing 'Phiếu kiểm tra' group from Mobile Sidebar ---")
        
        # 1. Find the parent group 'Phiếu kiểm tra' for Mobile
        parents = db.execute(text("""
            SELECT id, title FROM system_sidebars 
            WHERE platform = 'Mobile' AND (title = N'Phiếu kiểm tra' OR title LIKE N'%Phiếu kiểm tra%')
        """)).fetchall()

        for parent_id, parent_title in parents:
            print(f"[FOUND] Found target item ID={parent_id}, title='{parent_title}'")
            
            # Delete children first
            del_children = db.execute(text("""
                DELETE FROM system_sidebars WHERE parent_id = :parent_id
            """), {"parent_id": parent_id})
            print(f"  └─ [DELETE] Deleted {del_children.rowcount} child menu items of parent ID={parent_id}")

            # Delete parent
            db.execute(text("""
                DELETE FROM system_sidebars WHERE id = :id
            """), {"id": parent_id})
            print(f"  └─ [DELETE] Deleted parent menu item ID={parent_id}")

        db.commit()
        print("[SUCCESS] Successfully removed 'Phiếu kiểm tra' group from database!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Removal failed: {e}")
        raise
    finally:
        db.close()

if __name__ == '__main__':
    migrate()
