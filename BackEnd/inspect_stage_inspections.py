# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print('=== 1. stage_inspections columns ===')
cols = db.execute(text("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stage_inspections'")).fetchall()
for c in cols:
    print(' ', c[0], ':', c[1])

print('\n=== 2. Sample stage_inspections with fail or error_qty > 0 ===')
rows = db.execute(text("SELECT TOP 20 id, batch_no, stage_name, sample_qty, error_qty, conclusion, inspection_type FROM stage_inspections WHERE error_qty > 0 OR conclusion = 'fail'")).fetchall()
for r in rows:
    print(' ', r)

print('\n=== 3. Distinct stage_name in stage_inspections ===')
st_rows = db.execute(text("SELECT stage_name, count(*) FROM stage_inspections GROUP BY stage_name")).fetchall()
for r in st_rows:
    print('  stage:', r[0], '->', r[1], 'rows')

print('\n=== 4. Stats of fail items by stage ===')
fail_rows = db.execute(text("SELECT stage_name, count(*), avg(cast(error_qty as float)/nullif(sample_qty, 0))*100 FROM stage_inspections WHERE error_qty > 0 OR conclusion = 'fail' GROUP BY stage_name")).fetchall()
for r in fail_rows:
    print('  fail stage:', r[0], 'count:', r[1], 'avg rate:', round(r[2] or 0, 2), '%')

db.close()
