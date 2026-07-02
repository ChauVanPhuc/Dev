#!/usr/bin/env python3
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import SessionLocal
from sqlalchemy import text

def run_update():
    db = SessionLocal()
    try:
        print("Running SQL updates for equipment types...")
        
        # 1. Update Đo lường to Điện tử
        res1 = db.execute(text("UPDATE equipments SET type = N'Điện tử' WHERE type = N'Đo lường'"))
        print(f"Updated Do luong -> Dien tu: {res1.rowcount} rows")
        
        # 2. Update Sản xuất to Vật lý
        res2 = db.execute(text("UPDATE equipments SET type = N'Vật lý' WHERE type = N'Sản xuất'"))
        print(f"Updated San xuat -> Vat ly: {res2.rowcount} rows")
        
        # 3. Update Giá kệ to Vật lý
        res3 = db.execute(text("UPDATE equipments SET type = N'Vật lý' WHERE type = N'Giá kệ'"))
        print(f"Updated Gia ke -> Vat ly: {res3.rowcount} rows")
        
        # 4. Update Phụ trợ to Vật lý
        res4 = db.execute(text("UPDATE equipments SET type = N'Vật lý' WHERE type = N'Phụ trợ'"))
        print(f"Updated Phu tro -> Vat ly: {res4.rowcount} rows")
        
        db.commit()
        print("Database update successfully committed!")
    except Exception as e:
        db.rollback()
        print(f"Error executing database update: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_update()
