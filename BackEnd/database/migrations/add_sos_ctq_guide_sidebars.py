"""
Migration: Thêm/cập nhật các menu HDKT, SOS, CTQ vào sidebar Quản lý chất lượng.
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
        # 1. Lấy parent group "Quản lý chất lượng" trên Web
        parent = db.execute(text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Web' AND title = N'Quản lý chất lượng' AND parent_id IS NULL
        """)).fetchone()

        if not parent:
            print("[SKIP] Không tìm thấy nhóm 'Quản lý chất lượng'.")
            return

        parent_id = parent[0]

        # 2. Danh sách 3 màn hình cần có trong system_screens
        guides = [
            {
                "route_path": "/admin/inspection-guides",
                "title": "Hướng dẫn kiểm tra (HDKT)",
                "subtitle": "Danh sách hướng dẫn kiểm tra",
                "default_code": "QL1",
                "icon": "BookOpen",
                "sort_order_offset": 1,
            },
            {
                "route_path": "/admin/sos-guides",
                "title": "Hướng dẫn thao tác (SOS)",
                "subtitle": "Danh sách hướng dẫn thao tác",
                "default_code": "QL2",
                "icon": "Wrench",
                "sort_order_offset": 2,
            },
            {
                "route_path": "/admin/ctq-guides",
                "title": "Lỗi cần chú ý (CTQ)",
                "subtitle": "Danh sách lỗi cần chú ý",
                "default_code": "QL3",
                "icon": "AlertTriangle",
                "sort_order_offset": 3,
            },
        ]

        now = datetime.now()

        for guide in guides:
            # Đảm bảo màn hình có trong system_screens
            screen = db.execute(text("""
                SELECT id, title FROM system_screens
                WHERE platform = 'Web' AND route_path = :route_path
            """), {"route_path": guide["route_path"]}).fetchone()

            if screen:
                screen_id = screen[0]
                # Cập nhật title/subtitle nếu khác
                db.execute(text("""
                    UPDATE system_screens
                    SET title = :title,
                        subtitle = :subtitle,
                        default_code = :default_code,
                        current_code = :default_code,
                        updated_at = :updated_at
                    WHERE id = :screen_id
                """), {
                    "title": guide["title"],
                    "subtitle": guide["subtitle"],
                    "default_code": guide["default_code"],
                    "updated_at": now,
                    "screen_id": screen_id,
                })
                print(f"[UPDATE] Cập nhật screen {guide['route_path']}: {guide['title']}")
            else:
                result = db.execute(text("""
                    INSERT INTO system_screens
                        (platform, route_path, default_code, current_code,
                         title, subtitle, is_active, status, updated_at)
                    OUTPUT INSERTED.id
                    VALUES
                        ('Web', :route_path, :default_code, :default_code,
                         :title, :subtitle, 1, N'Mới thiết kế', :updated_at)
                """), {
                    "route_path": guide["route_path"],
                    "default_code": guide["default_code"],
                    "title": guide["title"],
                    "subtitle": guide["subtitle"],
                    "updated_at": now,
                })
                screen_id = result.scalar()
                print(f"[INSERT] Thêm screen {guide['route_path']}: {guide['title']}")

            # Đảm bảo menu có trong sidebar
            existing = db.execute(text("""
                SELECT id FROM system_sidebars
                WHERE platform = 'Web' AND parent_id = :parent_id AND route_path = :route_path
            """), {"parent_id": parent_id, "route_path": guide["route_path"]}).fetchone()

            if existing:
                db.execute(text("""
                    UPDATE system_sidebars
                    SET title = :title,
                        icon = :icon,
                        permission_key = 'inspection-guides',
                        screen_id = :screen_id,
                        is_active = 1
                    WHERE id = :sidebar_id
                """), {
                    "title": guide["title"],
                    "icon": guide["icon"],
                    "screen_id": screen_id,
                    "sidebar_id": existing[0],
                })
                print(f"[UPDATE] Cập nhật sidebar {guide['title']}")
            else:
                max_order = db.execute(text("""
                    SELECT ISNULL(MAX(sort_order), 0) FROM system_sidebars WHERE parent_id = :parent_id
                """), {"parent_id": parent_id}).fetchone()[0]

                db.execute(text("""
                    INSERT INTO system_sidebars
                        (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key, screen_id)
                    VALUES
                        ('Web', :parent_id, :title, :route_path, :icon, :sort_order, 1, 'inspection-guides', :screen_id)
                """), {
                    "parent_id": parent_id,
                    "title": guide["title"],
                    "route_path": guide["route_path"],
                    "icon": guide["icon"],
                    "sort_order": max_order + 1,
                    "screen_id": screen_id,
                })
                print(f"[INSERT] Thêm sidebar {guide['title']}")

        db.commit()
        print("[OK] Migration hoàn tất.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
