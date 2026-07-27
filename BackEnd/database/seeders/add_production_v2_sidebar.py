import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import SessionLocal
import app.models
from modules.system.models.system_sidebar import SystemSidebar

db = SessionLocal()
try:
    # 1. Find or Create parent item "Thông tin sản xuất" for Mobile
    parent_item = db.query(SystemSidebar).filter(
        SystemSidebar.platform == "Mobile",
        SystemSidebar.title == "Thông tin sản xuất",
        SystemSidebar.parent_id == None
    ).first()

    if not parent_item:
        parent_item = SystemSidebar(
            platform="Mobile",
            parent_id=None,
            title="Thông tin sản xuất",
            route_path="#",
            icon="Users",
            sort_order=2,
            is_active=True
        )
        db.add(parent_item)
        db.commit()
        db.refresh(parent_item)
        print("[SUCCESS] Created parent menu 'Thong tin san xuat' for Mobile!")

    # 2. Subitems list
    subitems = [
        {"title": "Lệnh sản xuất", "route_path": "/production/orders", "sort_order": 1},
        {"title": "Kế hoạch sản xuất", "route_path": "/production/plans", "sort_order": 2},
        {"title": "Lịch sử luân chuyển", "route_path": "/production/transfers", "sort_order": 3}
    ]

    for sub in subitems:
        existing_sub = db.query(SystemSidebar).filter(
            SystemSidebar.platform == "Mobile",
            SystemSidebar.parent_id == parent_item.id,
            SystemSidebar.route_path == sub["route_path"]
        ).first()

        if not existing_sub:
            new_sub = SystemSidebar(
                platform="Mobile",
                parent_id=parent_item.id,
                title=sub["title"],
                route_path=sub["route_path"],
                icon="Users",
                sort_order=sub["sort_order"],
                is_active=True
            )
            db.add(new_sub)
        else:
            existing_sub.title = sub["title"]
            existing_sub.is_active = True
            existing_sub.sort_order = sub["sort_order"]

    db.commit()
    print("[SUCCESS] Mobile sidebar 'Thong tin san xuat' submenu items created/updated successfully!")

except Exception as e:
    db.rollback()
    print(f"[ERROR] Executing seeder failed: {str(e)}")
finally:
    db.close()
