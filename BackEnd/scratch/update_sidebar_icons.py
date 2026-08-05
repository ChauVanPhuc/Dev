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

icon_map = {
    "Quản lý màn hình": "Monitor",
    "Quy trình nghiệp vụ": "Network",
    "Danh sách tài khoản": "Users",
    "Theo dõi góp ý": "MessageSquare",
    "Quản lý hồ sơ mẫu": "FileText",
    "Cấu hình dữ liệu": "Sliders",
    "Đóng gói dữ liệu": "Package",
    "Quy tắt tính điểm": "Award",
    "Danh sách KPI, checklist": "CheckSquare"
}

children = db.query(SystemSidebar).filter(SystemSidebar.parent_id == parent.id).all()

for child in children:
    if child.title in icon_map:
        new_icon = icon_map[child.title]
        child.icon = new_icon
        print(f"Updated '{child.title}' icon to: {new_icon}")

db.commit()
print("Icons updated successfully in DB!")
