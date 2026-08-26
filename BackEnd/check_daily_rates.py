# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print('=== daily_inspection_records defect rates by stage ===')
rows = db.execute(text("SELECT stage_name, min(defect_rate), max(defect_rate), avg(defect_rate), count(*) FROM daily_inspection_records GROUP BY stage_name")).fetchall()
for r in rows:
    print(f"Stage: {r[0]:<20} | Min: {r[1]:.2f}% | Max: {r[2]:.2f}% | Avg: {r[3]:.2f}% | Count: {r[4]}")

db.close()
