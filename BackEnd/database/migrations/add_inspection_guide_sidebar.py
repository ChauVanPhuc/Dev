import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import get_db


def add_inspection_guide_sidebar():
    """Thêm menu 'Hướng dẫn kiểm tra' vào nhóm 'Quản lý chất lượng' trên Web sidebar."""
    db = next(get_db())
    try:
        parent = db.execute(text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Web' AND title = N'Quản lý chất lượng' AND parent_id IS NULL
        """)).fetchone()
        if not parent:
            print("[SKIP] Không tìm thấy nhóm Quản lý chất lượng.")
            return
        parent_id = parent[0]

        existing = db.execute(text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Web' AND parent_id = :parent_id AND title = N'Hướng dẫn kiểm tra'
        """), {"parent_id": parent_id}).fetchone()
        if existing:
            print("[SKIP] Menu Hướng dẫn kiểm tra đã tồn tại.")
            return

        max_order = db.execute(text("""
            SELECT ISNULL(MAX(sort_order), 0) FROM system_sidebars WHERE parent_id = :parent_id
        """), {"parent_id": parent_id}).fetchone()[0]
        if max_order is None:
            max_order = 0

        screen = db.execute(text("""
            SELECT id FROM system_screens WHERE platform = 'Web' AND route_path = '/admin/inspection-guides'
        """)).fetchone()
        screen_id = screen[0] if screen else None

        db.execute(text("""
            INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
            VALUES ('Web', :parent_id, N'Hướng dẫn kiểm tra', '/admin/inspection-guides', 'BookOpen', :sort_order, 1, NULL, :screen_id)
        """), {
            "parent_id": parent_id,
            "sort_order": max_order + 1,
            "screen_id": screen_id
        })
        db.commit()
        print("[OK] Thêm Hướng dẫn kiểm tra vào sidebar Quản lý chất lượng.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_inspection_guide_sidebar()
