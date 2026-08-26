# -*- coding: utf-8 -*-
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text
from collections import Counter

db = SessionLocal()

print("=== 1. Checking QC inspections for Toàn (account_id = 43) ===")
qc_rows = db.execute(text("SELECT id, delivery_id, stage, inspector_id, result FROM qc_inspections WHERE inspector_id = 43")).fetchall()
print(f"Total qc_inspections: {len(qc_rows)}")
qc_stages = Counter(r[2] for r in qc_rows)
for st, cnt in qc_stages.most_common():
    print(f"  stage '{st}': {cnt}")

db.close()
