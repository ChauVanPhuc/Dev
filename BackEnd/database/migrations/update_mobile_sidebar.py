"""
Cập nhật sidebar Mobile để khớp với phiên bản Mobile mới:
- Nhóm 'Thông tin sản xuất' với 3 mục con.
- Nhóm 'Khởi tạo phiếu' (từ 'Thông tin sản xuất v2') với 2 mục con.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db


def migrate():
    db = next(get_db())
    try:
        # 1. Đảm bảo nhóm 'Thông tin sản xuất' tồn tại
        info = db.execute(text("""
            SELECT id, sort_order FROM system_sidebars
            WHERE platform = 'Mobile' AND title = N'Thông tin sản xuất' AND parent_id IS NULL
        """)).fetchone()

        if not info:
            # Nếu chưa có thì tạo mới ở cuối danh sách top-level
            max_order = db.execute(text("""
                SELECT ISNULL(MAX(sort_order), 0) FROM system_sidebars
                WHERE platform = 'Mobile' AND parent_id IS NULL
            """)).fetchone()[0]

            result = db.execute(text("""
                INSERT INTO system_sidebars
                    (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                OUTPUT INSERTED.id
                VALUES
                    ('Mobile', NULL, N'Thông tin sản xuất', '#', 'Users', :sort_order, 1, NULL)
            """), {"sort_order": max_order + 1})
            info = (result.scalar(), max_order + 1)
            print("[INSERT] Tạo nhóm 'Thông tin sản xuất'.")
        else:
            print(f"[FOUND] Nhóm 'Thông tin sản xuất' (id={info[0]}).")

        info_id, info_sort = info

        # 2. Cập nhật/đảm bảo 3 con của 'Thông tin sản xuất'
        info_children = [
            ("Lệnh sản xuất", "/production/orders", "Users"),
            ("Kế hoạch sản xuất", "/production/plans", "Users"),
            ("Lịch sử luân chuyển", "/production/transfers", "Users"),
        ]

        for sort_order, (title, route_path, icon) in enumerate(info_children, start=1):
            existing = db.execute(text("""
                SELECT id FROM system_sidebars
                WHERE platform = 'Mobile' AND parent_id = :parent_id AND route_path = :route_path
            """), {"parent_id": info_id, "route_path": route_path}).fetchone()

            if existing:
                db.execute(text("""
                    UPDATE system_sidebars
                    SET title = :title,
                        icon = :icon,
                        sort_order = :sort_order,
                        is_active = 1
                    WHERE id = :id
                """), {
                    "title": title,
                    "icon": icon,
                    "sort_order": sort_order,
                    "id": existing[0],
                })
                print(f"[UPDATE] Cập nhật con '{title}'.")
            else:
                db.execute(text("""
                    INSERT INTO system_sidebars
                        (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                    VALUES
                        ('Mobile', :parent_id, :title, :route_path, :icon, :sort_order, 1, NULL)
                """), {
                    "parent_id": info_id,
                    "title": title,
                    "route_path": route_path,
                    "icon": icon,
                    "sort_order": sort_order,
                })
                print(f"[INSERT] Thêm con '{title}'.")

        # 3. Tìm và đổi nhóm 'Thông tin sản xuất v2' -> 'Khởi tạo phiếu' hoặc tạo mới
        v2 = db.execute(text("""
            SELECT id FROM system_sidebars
            WHERE platform = 'Mobile' AND (title = N'Thông tin sản xuất v2' OR title = N'Khởi tạo phiếu')
              AND parent_id IS NULL
        """)).fetchone()

        if v2:
            group_id = v2[0]
            db.execute(text("""
                UPDATE system_sidebars
                SET title = N'Khởi tạo phiếu',
                    route_path = '#',
                    icon = 'MessageSquare',
                    sort_order = :sort_order
                WHERE id = :id
            """), {"sort_order": info_sort + 1, "id": group_id})
            print("[UPDATE] Đổi nhóm 'Thông tin sản xuất v2' thành 'Khởi tạo phiếu'.")
        else:
            result = db.execute(text("""
                INSERT INTO system_sidebars
                    (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                OUTPUT INSERTED.id
                VALUES
                    ('Mobile', NULL, N'Khởi tạo phiếu', '#', 'MessageSquare', :sort_order, 1, NULL)
            """), {"sort_order": info_sort + 1})
            group_id = result.scalar()
            print("[INSERT] Tạo nhóm 'Khởi tạo phiếu'.")

        # 4. Xóa toàn bộ con cũ của nhóm 'Khởi tạo phiếu' rồi tạo lại 2 mục đúng
        db.execute(text("""
            DELETE FROM system_sidebars
            WHERE platform = 'Mobile' AND parent_id = :group_id
        """), {"group_id": group_id})
        print("[CLEAR] Xóa con cũ của nhóm 'Khởi tạo phiếu'.")

        create_children = [
            ("Tạo phiếu luân chuyển", "/production_v2/transfer", "MessageSquare"),
            ("Tạo phiếu kiểm tra", "/production_v2/inspection", "MessageSquare"),
        ]

        for sort_order, (title, route_path, icon) in enumerate(create_children, start=1):
            db.execute(text("""
                INSERT INTO system_sidebars
                    (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                VALUES
                    ('Mobile', :parent_id, :title, :route_path, :icon, :sort_order, 1, NULL)
            """), {
                "parent_id": group_id,
                "title": title,
                "route_path": route_path,
                "icon": icon,
                "sort_order": sort_order,
            })
            print(f"[INSERT] Thêm con '{title}'.")

        db.commit()
        print("[OK] Hoàn tất cập nhật sidebar Mobile.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
