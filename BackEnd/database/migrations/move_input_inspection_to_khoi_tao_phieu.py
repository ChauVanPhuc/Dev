"""
Migration script to move 'Kiểm tra nhập kho' under 'Khởi tạo phiếu' menu group in Mobile system_sidebars table.
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
        print("--- Updating Mobile Sidebar in Database ---")
        
        # 1. Find the parent group 'Khởi tạo phiếu' for Mobile
        parent = db.execute(text("""
            SELECT id FROM system_sidebars 
            WHERE platform = 'Mobile' AND title = N'Khởi tạo phiếu' AND parent_id IS NULL
        """)).fetchone()

        if not parent:
            print("[WARN] Could not find top-level 'Khởi tạo phiếu' group for Mobile. Creating it...")
            max_order = db.execute(text("""
                SELECT ISNULL(MAX(sort_order), 0) FROM system_sidebars
                WHERE platform = 'Mobile' AND parent_id IS NULL
            """)).fetchone()[0]
            
            res = db.execute(text("""
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                OUTPUT INSERTED.id
                VALUES ('Mobile', NULL, N'Khởi tạo phiếu', '#', 'MessageSquare', :sort_order, 1, NULL)
            """), {"sort_order": max_order + 1})
            parent_id = res.scalar()
        else:
            parent_id = parent[0]
            print(f"[FOUND] Parent group 'Khởi tạo phiếu' ID = {parent_id}")

        # 2. Check if 'Kiểm tra nhập kho' already exists in Mobile sidebars
        existing_item = db.execute(text("""
            SELECT id, parent_id FROM system_sidebars 
            WHERE platform = 'Mobile' AND (title = N'Kiểm tra nhập kho' OR route_path = '/input-inspection' OR route_path = '/inspection-stage')
        """)).fetchall()

        if existing_item:
            for item in existing_item:
                item_id = item[0]
                db.execute(text("""
                    UPDATE system_sidebars
                    SET parent_id = :parent_id,
                        title = N'Kiểm tra nhập kho',
                        route_path = '/input-inspection',
                        icon = 'MessageSquare',
                        sort_order = 4,
                        is_active = 1
                    WHERE id = :id
                """), {"parent_id": parent_id, "id": item_id})
                print(f"[UPDATE] Moved existing menu item (ID={item_id}) under 'Khởi tạo phiếu' (parent_id={parent_id}).")
        else:
            # Insert new child item under 'Khởi tạo phiếu'
            db.execute(text("""
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                VALUES ('Mobile', :parent_id, N'Kiểm tra nhập kho', '/input-inspection', 'MessageSquare', 4, 1, NULL)
            """), {"parent_id": parent_id})
            print(f"[INSERT] Added 'Kiểm tra nhập kho' under 'Khởi tạo phiếu' (parent_id={parent_id}).")

        db.commit()
        print("[SUCCESS] Mobile sidebar database migration completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == '__main__':
    migrate()
