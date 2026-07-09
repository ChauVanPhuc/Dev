import sys
import os
from datetime import datetime, timedelta, date
from sqlalchemy import text

# Add root and BackEnd folders to PYTHONPATH to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from config.database import SessionLocal
from shared.utils.timezone import get_vietnam_time

def seed_daily_inspections():
    db = SessionLocal()
    try:
        # Get today's date in Vietnam timezone
        today = get_vietnam_time().date()
        
        # Create daily inspection records for NM1 (Định hình 1) stage
        inspections = [
            {
                "inspection_date": today,
                "stage_name": "NM1 - Định hình 1",
                "inspector_id": 1,  # Assuming user ID 1 exists
                "total_products": 500,
                "total_defects": 15,
                "defect_rate": 3.0,
                "created_at": datetime.combine(today, datetime.min.time()) + timedelta(hours=8, minutes=30)
            },
            {
                "inspection_date": today,
                "stage_name": "NM1 - Định hình 1",
                "inspector_id": 1,
                "total_products": 450,
                "total_defects": 12,
                "defect_rate": 2.67,
                "created_at": datetime.combine(today, datetime.min.time()) + timedelta(hours=10, minutes=15)
            },
            {
                "inspection_date": today,
                "stage_name": "NM1 - Định hình 1",
                "inspector_id": 1,
                "total_products": 520,
                "total_defects": 20,
                "defect_rate": 3.85,
                "created_at": datetime.combine(today, datetime.min.time()) + timedelta(hours=13, minutes=45)
            },
            {
                "inspection_date": today,
                "stage_name": "NM1 - Định hình 1",
                "inspector_id": 1,
                "total_products": 480,
                "total_defects": 8,
                "defect_rate": 1.67,
                "created_at": datetime.combine(today, datetime.min.time()) + timedelta(hours=15, minutes=30)
            },
            {
                "inspection_date": today,
                "stage_name": "NM1 - Định hình 1",
                "inspector_id": 1,
                "total_products": 550,
                "total_defects": 25,
                "defect_rate": 4.55,
                "created_at": datetime.combine(today, datetime.min.time()) + timedelta(hours=17, minutes=0)
            },
        ]
        
        for insp in inspections:
            # Check if inspection already exists using raw SQL
            check_sql = text("""
                SELECT id FROM daily_inspection_records 
                WHERE stage_name = :stage_name 
                AND created_at = :created_at
            """)
            result = db.execute(check_sql, {
                "stage_name": insp["stage_name"],
                "created_at": insp["created_at"]
            }).fetchone()
            
            if not result:
                # Insert using raw SQL
                insert_sql = text("""
                    INSERT INTO daily_inspection_records (
                        inspection_date, stage_name, inspector_id, total_products,
                        total_defects, defect_rate, created_at
                    ) VALUES (:inspection_date, :stage_name, :inspector_id, :total_products,
                        :total_defects, :defect_rate, :created_at)
                """)
                db.execute(insert_sql, {
                    "inspection_date": insp["inspection_date"],
                    "stage_name": insp["stage_name"],
                    "inspector_id": insp["inspector_id"],
                    "total_products": insp["total_products"],
                    "total_defects": insp["total_defects"],
                    "defect_rate": insp["defect_rate"],
                    "created_at": insp["created_at"]
                })
                print(f"Added inspection: {insp['stage_name']} at {insp['created_at']} - Rate: {insp['defect_rate']}%")
            else:
                print(f"Skipped (Exists): {insp['stage_name']} at {insp['created_at']}")
                
        db.commit()
        print("--- Seed daily inspections completed successfully! ---")
    except Exception as e:
        print(f"Error seeding daily inspections: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_daily_inspections()
