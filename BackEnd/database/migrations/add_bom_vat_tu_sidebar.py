import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import get_db


def add_bom_vat_tu_sidebar():
    """Thêm menu 'BOM vật tư' vào nhóm 'Quản lý kỹ thuật' trên Web sidebar."""
    db = next(get_db())
    try:
        parent = db.execute(text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Web' AND title = N'Quản lý kỹ thuật' AND parent_id IS NULL
        """)).fetchone()
        if not parent:
            print("[SKIP] Không tìm thấy nhóm Quản lý kỹ thuật.")
            return
        parent_id = parent[0]

        existing = db.execute(text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Web' AND parent_id = :parent_id AND (title = N'BOM vật tư' OR title = N'Định mức vật tư')
        """), {"parent_id": parent_id}).fetchone()

        screen = db.execute(text("""
            SELECT id FROM system_screens WHERE platform = 'Web' AND (route_path = '/admin/material-boms' OR route_path = '/admin/products')
        """)).fetchone()
        screen_id = screen[0] if screen else None

        if existing:
            db.execute(text("""
                UPDATE system_sidebars
                SET route_path = '/admin/material-boms'
                WHERE id = :id
            """), {"id": existing[0]})
            db.commit()
            print("[OK] Updated BOM vat tu sidebar route to /admin/material-boms.")
            return

        max_order = db.execute(text("""
            SELECT ISNULL(MAX(sort_order), 0) FROM system_sidebars WHERE parent_id = :parent_id
        """), {"parent_id": parent_id}).fetchone()[0]
        if max_order is None:
            max_order = 0

        db.execute(text("""
            INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
            VALUES ('Web', :parent_id, N'BOM vật tư', '/admin/material-boms', 'Layers', :sort_order, 1, NULL, :screen_id)
        """), {
            "parent_id": parent_id,
            "sort_order": max_order + 1,
            "screen_id": screen_id
        })
        db.commit()
        print("[OK] Added BOM vat tu to sidebar with route /admin/material-boms.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()



if __name__ == "__main__":
    add_bom_vat_tu_sidebar()
