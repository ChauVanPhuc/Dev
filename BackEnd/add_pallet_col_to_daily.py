# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    cols = [c[0] for c in db.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'daily_inspection_records'")).fetchall()]
    if 'pallet_code' not in cols:
        db.execute(text("ALTER TABLE daily_inspection_records ADD pallet_code NVARCHAR(100) NULL"))
        db.commit()
        print("SUCCESS: Added pallet_code column to daily_inspection_records!")
    else:
        print("pallet_code column already exists!")
except Exception as e:
    print("Error:", e)
finally:
    db.close()
