import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from config.database import SessionLocal
import app.main
from modules.delivery.models.order import Order

db = SessionLocal()
try:
    orders = db.query(Order).limit(10).all()
    print("TOP 10 ORDERS:")
    for o in orders:
        print(f"ID: {o.id}, Code: {o.order_code}, Customer: {o.customer}, Created: {o.create_date}")
finally:
    db.close()
