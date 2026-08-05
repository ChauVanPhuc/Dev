import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

import app.models
from config.database import SessionLocal
from modules.system.models.system_sidebar import SystemSidebar

db = SessionLocal()

parent = db.query(SystemSidebar).filter(
    SystemSidebar.platform == 'Web',
    SystemSidebar.title == 'Quản lý hệ thống'
).first()

if not parent:
    print("Parent 'Quản lý hệ thống' not found!")
    sys.exit(1)

print(f"Parent Group ID: {parent.id}")

# 9 mục theo chuẩn từ ảnh thiết kế
items = [
    {
        "title": "Quản lý màn hình",
        "route_path": "/admin/screens",
        "icon": "Bell",
        "permission_key": "screens",
        "sort_order": 1
    },
    {
        "title": "Quy trình nghiệp vụ",
        "route_path": "/admin/iso-processes",
        "icon": "Bell",
        "permission_key": "iso-processes",
        "sort_order": 2
    },
    {
        "title": "Danh sách tài khoản",
        "route_path": "/admin/users",
        "icon": "Bell",
        "permission_key": "users",
        "sort_order": 3
    },
    {
        "title": "Theo dõi góp ý",
        "route_path": "/admin/feedback",
        "icon": "Bell",
        "permission_key": "feedback",
        "sort_order": 4
    },
    {
        "title": "Quản lý hồ sơ mẫu",
        "route_path": "/admin/iso-documents",
        "icon": "Bell",
        "permission_key": "iso-documents",
        "sort_order": 5
    },
    {
        "title": "Cấu hình dữ liệu",
        "route_path": "/admin/system-config",
        "icon": "Bell",
        "permission_key": "screens",
        "sort_order": 6
    },
    {
        "title": "Đóng gói dữ liệu",
        "route_path": "/admin/data",
        "icon": "Bell",
        "permission_key": "data",
        "sort_order": 7
    },
    {
        "title": "Quy tắt tính điểm",
        "route_path": "/admin/kpi/rules",
        "icon": "Bell",
        "permission_key": "kpi",
        "sort_order": 8
    },
    {
        "title": "Danh sách KPI, checklist",
        "route_path": "/admin/kpi/checklist",
        "icon": "Bell",
        "permission_key": "kpi",
        "sort_order": 9
    }
]

# Delete existing children under parent.id
old_children = db.query(SystemSidebar).filter(SystemSidebar.parent_id == parent.id).all()
for child in old_children:
    db.delete(child)

db.commit()
print(f"Deleted {len(old_children)} old children items.")

# Insert new 9 items
for item_data in items:
    new_item = SystemSidebar(
        platform="Web",
        parent_id=parent.id,
        title=item_data["title"],
        route_path=item_data["route_path"],
        icon=item_data["icon"],
        sort_order=item_data["sort_order"],
        is_active=True,
        permission_key=item_data["permission_key"]
    )
    db.add(new_item)

db.commit()
print("Successfully inserted 9 new sidebar items matching the design image!")

# Verify
updated_children = db.query(SystemSidebar).filter(
    SystemSidebar.parent_id == parent.id
).order_by(SystemSidebar.sort_order.asc()).all()

for c in updated_children:
    print(f"ID={c.id} | Order={c.sort_order} | Title={c.title} | Path={c.route_path} | Icon={c.icon}")
