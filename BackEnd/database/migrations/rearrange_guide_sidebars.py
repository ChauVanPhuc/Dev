"""
Di chuyển 3 menu HDKT/SOS/CTQ sang nhóm 'Tài liệu ban hành'.
"""
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db


def migrate():
    db = next(get_db())
    try:
        # 1. Kiểm tra/Thêm nhóm 'Tài liệu ban hành'
        group = db.execute(text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Web' AND title = N'Tài liệu ban hành' AND parent_id IS NULL
        """)).fetchone()

        if group:
            group_id = group[0]
            print(f"[FOUND] Nhóm 'Tài liệu ban hành' đã tồn tại (id={group_id}).")
        else:
            max_order = db.execute(text("""
                SELECT ISNULL(MAX(sort_order), 0) FROM system_sidebars WHERE platform = 'Web' AND parent_id IS NULL
            """)).fetchone()[0]

            result = db.execute(text("""
                INSERT INTO system_sidebars
                    (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                OUTPUT INSERTED.id
                VALUES
                    ('Web', NULL, N'Tài liệu ban hành', NULL, 'Files', :sort_order, 1, NULL)
            """), {"sort_order": max_order + 1})
            group_id = result.scalar()
            print(f"[INSERT] Tạo nhóm 'Tài liệu ban hành' (id={group_id}).")

        guides = [
            ("/admin/inspection-guides", 'Hướng dẫn kiểm tra (HDKT)', 'BookOpen'),
            ("/admin/sos-guides", 'Hướng dẫn thao tác (SOS)', 'Wrench'),
            ("/admin/ctq-guides", 'Lỗi cần chú ý (CTQ)', 'AlertTriangle'),
        ]

        for sort_order, (route_path, title, icon) in enumerate(guides, start=1):
            # Cập nhật hoặc thêm menu vào nhóm mới
            existing = db.execute(text("""
                SELECT id FROM system_sidebars
                WHERE platform = 'Web' AND route_path = :route_path
            """), {"route_path": route_path}).fetchone()

            if existing:
                db.execute(text("""
                    UPDATE system_sidebars
                    SET parent_id = :parent_id,
                        title = :title,
                        icon = :icon,
                        sort_order = :sort_order,
                        permission_key = 'inspection-guides'
                    WHERE id = :id
                """), {
                    "parent_id": group_id,
                    "title": title,
                    "icon": icon,
                    "sort_order": sort_order,
                    "id": existing[0],
                })
                print(f"[UPDATE] Di chuyển {title} vào nhóm 'Tài liệu ban hành'.")
            else:
                db.execute(text("""
                    INSERT INTO system_sidebars
                        (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                    VALUES
                        ('Web', :parent_id, :title, :route_path, :icon, :sort_order, 1, 'inspection-guides')
                """), {
                    "parent_id": group_id,
                    "title": title,
                    "route_path": route_path,
                    "icon": icon,
                    "sort_order": sort_order,
                })
                print(f"[INSERT] Thêm {title} vào nhóm 'Tài liệu ban hành'.")

        db.commit()
        print("[OK] Hoàn tất di chuyển menu.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
