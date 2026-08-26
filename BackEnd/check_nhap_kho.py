# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print('=== 1. Checking stages table ===')
try:
    rows = db.execute(text("SELECT id, name FROM stages WHERE name LIKE N'%Nhập Kho%'")).fetchall()
    for r in rows:
        print('stages:', r)
except Exception as e:
    print('stages err:', e)

print('=== 2. Checking stage_inspections ===')
try:
    rows = db.execute(text("SELECT DISTINCT stage FROM stage_inspections WHERE stage LIKE N'%Nhập Kho%'")).fetchall()
    for r in rows:
        print('stage_inspections.stage:', r)
except Exception as e:
    print('stage_inspections err:', e)

print('=== 3. Checking input_inspections ===')
try:
    rows = db.execute(text("SELECT DISTINCT stage_name FROM input_inspections WHERE stage_name LIKE N'%Nhập Kho%'")).fetchall()
    for r in rows:
        print('input_inspections.stage_name:', r)
except Exception as e:
    print('input_inspections err:', e)

print('=== 4. Checking daily_inspections ===')
try:
    rows = db.execute(text("SELECT DISTINCT stage_name FROM daily_inspections WHERE stage_name LIKE N'%Nhập Kho%'")).fetchall()
    for r in rows:
        print('daily_inspections.stage_name:', r)
except Exception as e:
    print('daily_inspections err:', e)

print('=== 5. Checking deliveries ===')
try:
    rows = db.execute(text("SELECT DISTINCT stage FROM deliveries WHERE stage LIKE N'%Nhập Kho%'")).fetchall()
    for r in rows:
        print('deliveries.stage:', r)
except Exception as e:
    print('deliveries err:', e)

db.close()
