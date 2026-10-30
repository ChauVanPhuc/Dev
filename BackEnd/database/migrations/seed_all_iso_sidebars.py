import sys, os
sys.path.insert(0, os.path.abspath('BackEnd'))
from config.database import SessionLocal
from sqlalchemy import text

def seed_iso_sidebars():
    db = SessionLocal()
    try:
        # Tìm nhóm cha 'Hồ sơ ISO'
        parent = db.execute(text("SELECT id FROM system_sidebars WHERE platform = 'Web' AND parent_id IS NULL AND (title = N'Hồ sơ ISO' OR title LIKE N'%ISO%')")).fetchone()
        if not parent:
            print("[SIDEBAR] Không tìm thấy nhóm cha 'Hồ sơ ISO'.")
            return
        parent_id = parent[0]
        print(f"[SIDEBAR] Nhóm cha 'Hồ sơ ISO' id: {parent_id}")

        items = [
            {
                "title": "Mẫu tài liệu",
                "route_path": "/admin/iso-documents",
                "icon": "FileText",
                "sort_order": 1,
                "permission_key": "iso-documents"
            },
            {
                "title": "Tài liệu nghiệp vụ",
                "route_path": "/admin/iso-processes",
                "icon": "Layers",
                "sort_order": 2,
                "permission_key": "iso-processes"
            },
            {
                "title": "Quản lý bộ tài liệu",
                "route_path": "/admin/iso-records",
                "icon": "FolderArchive",
                "sort_order": 3,
                "permission_key": "iso-records"
            },
            {
                "title": "Hồ sơ cần duyệt",
                "route_path": "/admin/iso-approvals",
                "icon": "FileCheck",
                "sort_order": 4,
                "permission_key": "iso-approvals"
            },
            {
                "title": "Quản lý Chữ ký",
                "route_path": "/admin/iso-signatures",
                "icon": "PenTool",
                "sort_order": 5,
                "permission_key": "iso-signatures"
            }
        ]

        for item in items:
            existing = db.execute(text(f"SELECT id FROM system_sidebars WHERE route_path = '{item['route_path']}'")).fetchone()
            if existing:
                db.execute(text(f"""
                    UPDATE system_sidebars
                    SET parent_id = {parent_id},
                        title = N'{item['title']}',
                        icon = '{item['icon']}',
                        sort_order = {item['sort_order']},
                        permission_key = '{item['permission_key']}',
                        platform = 'Web',
                        is_active = 1
                    WHERE id = {existing[0]}
                """))
                print(f" -> Đã cập nhật mục [{existing[0]}]: {item['title']} (sort={item['sort_order']})")
            else:
                db.execute(text(f"""
                    INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                    VALUES ('Web', {parent_id}, N'{item['title']}', '{item['route_path']}', '{item['icon']}', {item['sort_order']}, 1, '{item['permission_key']}')
                """))
                print(f" -> Đã thêm mới mục: {item['title']} (sort={item['sort_order']})")

        db.commit()

        # Hiển thị lại kết quả
        rows = db.execute(text(f"SELECT id, title, route_path, icon, sort_order, is_active FROM system_sidebars WHERE parent_id = {parent_id} ORDER BY sort_order")).fetchall()
        print(f"\n[SIDEBAR] Toàn bộ 5 mục con của 'Hồ sơ ISO' trong CSDL:")
        for r in rows:
            print(f"   [{r[0]}] {r[1]} -> {r[2]} (icon={r[3]}, sort={r[4]}, active={r[5]})")

    except Exception as e:
        db.rollback()
        print(f"[SIDEBAR ERROR] {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_iso_sidebars()
