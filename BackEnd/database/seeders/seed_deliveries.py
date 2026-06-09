import sys
import os
from datetime import datetime, timedelta
from sqlalchemy import text

# Add root and BackEnd folders to PYTHONPATH to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from config.database import SessionLocal
from shared.utils.timezone import get_vietnam_time

def seed_deliveries():
    db = SessionLocal()
    try:
        # Get today's date in Vietnam timezone
        today = get_vietnam_time().date()
        
        # Use raw SQL to insert delivery records to avoid SQLAlchemy relationship issues
        deliveries = [
            {
                "delivery_stage": "NM1 - Định hình 1",
                "receiving_stage": "NM2 - Định hình 2",
                "quantity_total": 500,
                "quantity_received": 500,
                "quantity_error": 0,
                "quantity_returned": 0,
                "quantity_inspection": 500,
                "status": "Đã nhận",
                "part_name": "Thanh gỗ định hình",
                "specification": "20x40x2000mm",
                "created_at": datetime.combine(today, datetime.min.time()) + timedelta(hours=8, minutes=30)
            },
            {
                "delivery_stage": "NM1 - Định hình 1",
                "receiving_stage": "NM2 - Định hình 2",
                "quantity_total": 450,
                "quantity_received": 450,
                "quantity_error": 0,
                "quantity_returned": 0,
                "quantity_inspection": 450,
                "status": "Đã nhận",
                "part_name": "Thanh gỗ định hình",
                "specification": "20x40x2000mm",
                "created_at": datetime.combine(today, datetime.min.time()) + timedelta(hours=10, minutes=15)
            },
            {
                "delivery_stage": "NM1 - Định hình 1",
                "receiving_stage": "NM2 - Định hình 2",
                "quantity_total": 520,
                "quantity_received": 520,
                "quantity_error": 0,
                "quantity_returned": 0,
                "quantity_inspection": 520,
                "status": "Đã nhận",
                "part_name": "Thanh gỗ định hình",
                "specification": "20x40x2000mm",
                "created_at": datetime.combine(today, datetime.min.time()) + timedelta(hours=13, minutes=45)
            },
            {
                "delivery_stage": "NM1 - Định hình 1",
                "receiving_stage": "NM2 - Định hình 2",
                "quantity_total": 480,
                "quantity_received": 480,
                "quantity_error": 0,
                "quantity_returned": 0,
                "quantity_inspection": 480,
                "status": "Đã nhận",
                "part_name": "Thanh gỗ định hình",
                "specification": "20x40x2000mm",
                "created_at": datetime.combine(today, datetime.min.time()) + timedelta(hours=15, minutes=30)
            },
            {
                "delivery_stage": "NM1 - Định hình 1",
                "receiving_stage": "NM2 - Định hình 2",
                "quantity_total": 550,
                "quantity_received": 550,
                "quantity_error": 0,
                "quantity_returned": 0,
                "quantity_inspection": 550,
                "status": "Đã nhận",
                "part_name": "Thanh gỗ định hình",
                "specification": "20x40x2000mm",
                "created_at": datetime.combine(today, datetime.min.time()) + timedelta(hours=17, minutes=0)
            },
        ]
        
        for d in deliveries:
            # Check if delivery already exists using raw SQL
            check_sql = text("""
                SELECT id FROM deliveries 
                WHERE delivery_stage = :delivery_stage 
                AND receiving_stage = :receiving_stage 
                AND created_at = :created_at
            """)
            result = db.execute(check_sql, {
                "delivery_stage": d["delivery_stage"],
                "receiving_stage": d["receiving_stage"],
                "created_at": d["created_at"]
            }).fetchone()
            
            if not result:
                # Insert using raw SQL
                insert_sql = text("""
                    INSERT INTO deliveries (
                        delivery_stage, receiving_stage, quantity_total, quantity_received,
                        quantity_error, quantity_returned, quantity_inspection, status,
                        part_name, specification, created_at
                    ) VALUES (:delivery_stage, :receiving_stage, :quantity_total, :quantity_received,
                        :quantity_error, :quantity_returned, :quantity_inspection, :status,
                        :part_name, :specification, :created_at)
                """)
                db.execute(insert_sql, {
                    "delivery_stage": d["delivery_stage"],
                    "receiving_stage": d["receiving_stage"],
                    "quantity_total": d["quantity_total"],
                    "quantity_received": d["quantity_received"],
                    "quantity_error": d["quantity_error"],
                    "quantity_returned": d["quantity_returned"],
                    "quantity_inspection": d["quantity_inspection"],
                    "status": d["status"],
                    "part_name": d["part_name"],
                    "specification": d["specification"],
                    "created_at": d["created_at"]
                })
                print(f"Added delivery: {d['delivery_stage']} -> {d['receiving_stage']} at {d['created_at']}")
            else:
                print(f"Skipped (Exists): {d['delivery_stage']} -> {d['receiving_stage']} at {d['created_at']}")
                
        db.commit()
        print("--- Seed deliveries completed successfully! ---")
    except Exception as e:
        print(f"Error seeding deliveries: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_deliveries()
