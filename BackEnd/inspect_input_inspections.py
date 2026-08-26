# -*- coding: utf-8 -*-
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print('=== 1. input_inspections total and columns ===')
cols = db.execute(text("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'input_inspections'")).fetchall()
for c in cols:
    print(' ', c[0], ':', c[1])

total = db.execute(text("SELECT count(*) FROM input_inspections")).fetchone()[0]
print(f"\nTotal records in input_inspections: {total}")

print('\n=== 2. Sample records in input_inspections ===')
rows = db.execute(text("SELECT TOP 10 id, batch_no, product_sku, inspector_name, conclusion, inspection_type, data_json FROM input_inspections ORDER BY id DESC")).fetchall()
for r in rows:
    p_data = {}
    if r[6]:
        try:
            p_data = json.loads(r[6]) if isinstance(r[6], str) else r[6]
        except Exception:
            pass
    print(f"ID #{r[0]}: PO={r[1]}, SKU/Stage={r[2]}, Inspector={r[3]}, Concl={r[4]}, Type={r[5]}, stage_name={p_data.get('stage_name')}, sample={p_data.get('sample_qty')}, error={p_data.get('error_qty')}")

print('\n=== 3. Breakdown by inspection_type and stage_name ===')
all_rows = db.execute(text("SELECT id, inspection_type, product_sku, conclusion, data_json FROM input_inspections")).fetchall()
from collections import Counter
type_counter = Counter()
stage_counter = Counter()
fail_counter = Counter()

for r in all_rows:
    type_counter[r[1]] += 1
    p_data = {}
    if r[4]:
        try:
            p_data = json.loads(r[4]) if isinstance(r[4], str) else r[4]
        except Exception:
            pass
    stage = p_data.get('stage_name') or r[2] or 'Unknown'
    stage_counter[stage] += 1
    if r[3] == 'fail' or (p_data.get('error_qty') and int(p_data.get('error_qty')) > 0):
        fail_counter[stage] += 1

print("\nBy inspection_type:")
for k, v in type_counter.items():
    print(f"  {k}: {v}")

print("\nTotal / Fail by Stage:")
for k, v in stage_counter.most_common():
    print(f"  Stage '{k}': Total={v}, Fail={fail_counter[k]}")

db.close()
