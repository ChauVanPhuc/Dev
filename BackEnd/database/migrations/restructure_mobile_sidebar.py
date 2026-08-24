"""
Restructure Mobile Sidebar in system_sidebars table to match the new UI specification:
1. Trang chủ (/dashboard)
2. Khởi tạo phiếu (#)
   - Tạo phiếu luân chuyển (/production_v2/transfer)
   - Danh sách luân chuyển (/production_v2/transfer-list)
   - Tạo phiếu kiểm tra (/production_v2/inspection)
3. Thông tin sản xuất (#)
   - Lệnh sản xuất (/production/orders)
   - Kế hoạch sản xuất (/production/plans)
   - Lịch sử luân chuyển (/production/transfers)
4. Lập báo cáo (#)
   - Theo dõi CAPA (/capa-list)
   - Tạo báo cáo nhanh (/quick-report-create)
   - Lịch sử báo cáo (/quick-report-list)
5. Báo cáo vi phạm (/awards)
6. Đánh giá nhân sự (/kpi-staff)
"""
import sys
import os
import io

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import SessionLocal

def run_migration():
    db = SessionLocal()
    try:
        print("Starting Mobile Sidebar restructuring migration...")
        print("-" * 50)

        # 1. Delete all existing Mobile sidebar items
        db.execute(text("DELETE FROM system_sidebars WHERE platform = 'Mobile'"))
        db.commit()
        print("[CLEAR] Cleared all existing Mobile sidebar records.")

        # 2. Define the new menu tree
        sidebar_tree = [
            {
                "title": "Trang chủ",
                "route_path": "/dashboard",
                "icon": "LayoutGrid",
                "sort_order": 1,
                "children": []
            },
            {
                "title": "Khởi tạo phiếu",
                "route_path": "#",
                "icon": "MessageSquare",
                "sort_order": 2,
                "children": [
                    {"title": "Tạo phiếu luân chuyển", "route_path": "/production_v2/transfer", "icon": "MessageSquare", "sort_order": 1},
                    {"title": "Danh sách luân chuyển", "route_path": "/production_v2/transfer-list", "icon": "MessageSquare", "sort_order": 2},
                    {"title": "Tạo phiếu kiểm tra", "route_path": "/production_v2/inspection", "icon": "MessageSquare", "sort_order": 3},
                ]
            },
            {
                "title": "Thông tin sản xuất",
                "route_path": "#",
                "icon": "Users",
                "sort_order": 3,
                "children": [
                    {"title": "Lệnh sản xuất", "route_path": "/production/orders", "icon": "Users", "sort_order": 1},
                    {"title": "Kế hoạch sản xuất", "route_path": "/production/plans", "icon": "Users", "sort_order": 2},
                    {"title": "Lịch sử luân chuyển", "route_path": "/production/transfers", "icon": "Users", "sort_order": 3},
                ]
            },
            {
                "title": "Lập báo cáo",
                "route_path": "#",
                "icon": "Bell",
                "sort_order": 4,
                "children": [
                    {"title": "Theo dõi CAPA", "route_path": "/capa-list", "icon": "Bell", "sort_order": 1},
                    {"title": "Tạo báo cáo nhanh", "route_path": "/quick-report-create", "icon": "Bell", "sort_order": 2},
                    {"title": "Lịch sử báo cáo", "route_path": "/quick-report-list", "icon": "Bell", "sort_order": 3},
                ]
            },
            {
                "title": "Báo cáo vi phạm",
                "route_path": "/awards",
                "icon": "LayoutGrid",
                "sort_order": 5,
                "children": []
            },
            {
                "title": "Đánh giá nhân sự",
                "route_path": "/kpi-staff",
                "icon": "Heart",
                "sort_order": 6,
                "children": []
            }
        ]

        # 3. Insert items into database
        for group in sidebar_tree:
            insert_parent_sql = text("""
                INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                OUTPUT INSERTED.id
                VALUES ('Mobile', NULL, :title, :route_path, :icon, :sort_order, 1, NULL)
            """)
            result = db.execute(insert_parent_sql, {
                "title": group["title"],
                "route_path": group["route_path"],
                "icon": group["icon"],
                "sort_order": group["sort_order"]
            })
            parent_id = result.scalar()
            print(f"[INSERT] Parent: {group['title']} (id={parent_id}, order={group['sort_order']})")

            for child in group["children"]:
                insert_child_sql = text("""
                    INSERT INTO system_sidebars (platform, parent_id, title, route_path, icon, sort_order, is_active, permission_key)
                    VALUES ('Mobile', :parent_id, :title, :route_path, :icon, :sort_order, 1, NULL)
                """)
                db.execute(insert_child_sql, {
                    "parent_id": parent_id,
                    "title": child["title"],
                    "route_path": child["route_path"],
                    "icon": child["icon"],
                    "sort_order": child["sort_order"]
                })
                print(f"  └─ [INSERT] Child: {child['title']} -> {child['route_path']}")

        db.commit()
        print("-" * 50)
        print("[SUCCESS] Mobile sidebar restructuring completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
