import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import SessionLocal
import app.models  # Đăng ký đầy đủ toàn bộ models của hệ thống
from modules.system.models.system_sidebar import SystemSidebar

db = SessionLocal()
try:
    # 1. Tìm nhóm cha "Quản lý hệ thống" trên nền tảng Web
    parent_menu = db.query(SystemSidebar).filter(
        SystemSidebar.platform == "Web",
        SystemSidebar.title == "Quản lý hệ thống",
        SystemSidebar.parent_id == None
    ).first()

    if not parent_menu:
        print("[ERROR] Nhom menu 'Quan ly he thong' khong ton tai tre Web!")
        sys.exit(1)

    # 2. Kiểm tra xem route "Cấu hình hệ thống" đã tồn tại chưa
    existing_item = db.query(SystemSidebar).filter(
        SystemSidebar.route_path == "/admin/system-config"
    ).first()

    if not existing_item:
        # Tính toán sort_order cho mục mới (đặt ở cuối nhóm)
        max_order = db.query(SystemSidebar).filter(
            SystemSidebar.parent_id == parent_menu.id
        ).count()

        new_item = SystemSidebar(
            platform="Web",
            parent_id=parent_menu.id,
            title="Cấu hình hệ thống",
            route_path="/admin/system-config",
            icon="Sliders",
            sort_order=max_order + 1,
            is_active=True,
            permission_key="screens"
        )
        db.add(new_item)
        db.commit()
        print("[SUCCESS] Chen thanh cong menu 'Cau hinh he thong' vao sidebar!")
    else:
        # Nếu đã tồn tại, đảm bảo thông tin khớp
        existing_item.title = "Cấu hình hệ thống"
        existing_item.parent_id = parent_menu.id
        existing_item.icon = "Sliders"
        existing_item.permission_key = "screens"
        db.commit()
        print("[INFO] Menu 'Cau hinh he thong' da ton tai. Da dong bo thong tin.")

except Exception as e:
    db.rollback()
    print(f"[ERROR] Executing seeder failed: {str(e)}")
finally:
    db.close()
