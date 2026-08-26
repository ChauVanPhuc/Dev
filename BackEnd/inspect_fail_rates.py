# -*- coding: utf-8 -*-
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

rows = db.execute(text("""
    SELECT id, batch_no, product_sku, stage, conclusion, sample_qty, error_qty, data_json, inspection_type 
    FROM input_inspections 
    WHERE inspection_type NOT IN ('mau-dau-tien', 'quy-trinh')
""")).fetchall()

print(f"Total 'Kiểm tra lại' records: {len(rows)}")

fail_records = []
for r in rows:
    p_data = {}
    if r[7]:
        try:
            p_data = json.loads(r[7]) if isinstance(r[7], str) else r[7]
        except Exception:
            pass
    stage = p_data.get('stage_name') or r[3] or r[2] or 'Unknown'
    s_qty = r[5] or p_data.get('sample_qty') or 1
    e_qty = r[6] or p_data.get('error_qty') or 0
    concl = r[4]
    
    rate = (e_qty / s_qty) * 100 if s_qty > 0 else 0
    if concl == 'fail' or e_qty > 0:
        fail_records.append((r[0], r[1], stage, concl, s_qty, e_qty, rate))

print(f"Total Fail records in 'Kiểm tra lại': {len(fail_records)}")
for fr in fail_records[:30]:
    print(f"ID #{fr[0]}: PO={fr[1]}, Stage={fr[2]}, Concl={fr[3]}, Sample={fr[4]}, Error={fr[5]}, Rate={fr[6]:.2f}%")

db.close()
