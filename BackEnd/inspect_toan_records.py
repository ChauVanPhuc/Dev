# -*- coding: utf-8 -*-
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text
from collections import Counter

db = SessionLocal()

print("=== 1. Checking input_inspections for Dương Văn Toàn ===")
inp_rows = db.execute(text("""
    SELECT id, batch_no, product_sku, stage, inspector_name, data_json 
    FROM input_inspections 
    WHERE inspector_name LIKE N'%Dương Văn Toàn%' 
       OR data_json LIKE N'%Dương Văn Toàn%' 
       OR data_json LIKE N'%toan.dv%'
""")).fetchall()
print(f"Total input_inspections for Toàn: {len(inp_rows)}")
inp_stages = Counter()
for r in inp_rows:
    p_data = {}
    if r[5]:
        try:
            p_data = json.loads(r[5]) if isinstance(r[5], str) else r[5]
        except Exception:
            pass
    st = p_data.get('stage_name') or r[3] or r[2] or 'N/A'
    inp_stages[st] += 1

for st, cnt in inp_stages.most_common():
    print(f"  Stage '{st}': {cnt} rows")

print("\n=== 2. Checking daily_inspection_records for Dương Văn Toàn ===")
daily_rows = db.execute(text("""
    SELECT id, stage_name, inspector_name 
    FROM daily_inspection_records 
    WHERE inspector_name LIKE N'%Dương Văn Toàn%'
""")).fetchall()
print(f"Total daily_inspection_records for Toàn: {len(daily_rows)}")
daily_stages = Counter()
for r in daily_rows:
    daily_stages[r[1]] += 1
for st, cnt in daily_stages.most_common():
    print(f"  Stage '{st}': {cnt} rows")

print("\n=== 3. First 10 input_inspections IDs for Dương Văn Toàn ===")
for r in inp_rows[:10]:
    p_data = json.loads(r[5]) if r[5] else {}
    print(f"ID #{r[0]}: PO={r[1]}, StageCol='{r[3]}', DataStage='{p_data.get('stage_name')}'")

db.close()
