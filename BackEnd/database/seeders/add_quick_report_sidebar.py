import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import SessionLocal
import app.models
from modules.system.models.system_sidebar import SystemSidebar

db = SessionLocal()
try:
    # Check if "Lập báo cáo" already exists for Mobile
    existing_item = db.query(SystemSidebar).filter(
        SystemSidebar.platform == "Mobile",
        (SystemSidebar.route_path == "/quick-report-list") | (SystemSidebar.title == "Lập báo cáo")
    ).first()

    if not existing_item:
        # Find max order
        max_order = db.query(SystemSidebar).filter(
            SystemSidebar.platform == "Mobile",
            SystemSidebar.parent_id == None
        ).count()

        new_item = SystemSidebar(
            platform="Mobile",
            parent_id=None,
            title="Lập báo cáo",
            route_path="/quick-report-list",
            icon="FileText",
            sort_order=max_order + 1,
            is_active=True,
            permission_key=None
        )
        db.add(new_item)
        db.commit()
        print("[SUCCESS] Them thanh cong menu 'Lap bao cao' vao Mobile sidebar database!")
    else:
        existing_item.title = "Lập báo cáo"
        existing_item.route_path = "/quick-report-list"
        existing_item.icon = "FileText"
        existing_item.is_active = True
        db.commit()
        print("[INFO] Menu 'Lap bao cao' da ton tai va duoc cap nhat!")

except Exception as e:
    db.rollback()
    print(f"[ERROR] Executing seeder failed: {str(e)}")
finally:
    db.close()
