import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from config.database import SessionLocal
import app.main
from modules.delivery.models.order import Order

db = SessionLocal()
try:
    order = db.query(Order).filter(Order.order_code == "APT-0082-15").first()
    if order:
        print(f"ORDER FOUND: {order.order_code}, plan_id: {order.plan_id}")
        # Fetch plan detail directly from DB
        from modules.production.routes.product_plan_router import get_plan_detail
        detail = get_plan_detail(id=order.plan_id, db=db, limit=0)
        print("HANDOVER ITEMS IN PLAN:")
        for h in detail.get("bom_details", {}).get("handover", []):
            if "APT-0082-15" in h.get("order_names", []):
                print(f"Name: '{h['name']}', spec: '{h['specification']}', order_names: {h['order_names']}")
    else:
        print("ORDER NOT FOUND")
finally:
    db.close()
