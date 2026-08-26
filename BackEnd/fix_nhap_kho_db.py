# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("Updating database to standardize 'Nhập Kho' (no factory numbers)...")

# 1. daily_inspection_records
try:
    res = db.execute(text("""
        UPDATE daily_inspection_records 
        SET stage_name = N'Nhập Kho' 
        WHERE stage_name IN (N'Nhập Kho 1', N'Nhập Kho 2', N'Nhập Kho 3', N'Nhập Kho NM1', N'Nhập Kho NM2', N'Nhập Kho NM3')
           OR stage_name LIKE N'Nhập Kho%'
    """))
    print(f"daily_inspection_records updated: {res.rowcount} rows")
except Exception as e:
    print("daily_inspection_records err:", e)

# 2. deliveries delivery_stage
try:
    res1 = db.execute(text("""
        UPDATE deliveries 
        SET delivery_stage = N'Nhập Kho' 
        WHERE delivery_stage IN (N'Nhập Kho 1', N'Nhập Kho 2', N'Nhập Kho 3', N'Nhập Kho NM1', N'Nhập Kho NM2', N'Nhập Kho NM3')
           OR delivery_stage LIKE N'Nhập Kho %'
    """))
    print(f"deliveries.delivery_stage updated: {res1.rowcount} rows")
except Exception as e:
    print("deliveries.delivery_stage err:", e)

# 3. deliveries receiving_stage
try:
    res2 = db.execute(text("""
        UPDATE deliveries 
        SET receiving_stage = N'Nhập Kho' 
        WHERE receiving_stage IN (N'Nhập Kho 1', N'Nhập Kho 2', N'Nhập Kho 3', N'Nhập Kho NM1', N'Nhập Kho NM2', N'Nhập Kho NM3')
           OR receiving_stage LIKE N'Nhập Kho %'
    """))
    print(f"deliveries.receiving_stage updated: {res2.rowcount} rows")
except Exception as e:
    print("deliveries.receiving_stage err:", e)

# 4. bom_details input_stage / output_stage if any
try:
    res3 = db.execute(text("""
        UPDATE bom_details 
        SET input_stage = N'Nhập Kho' 
        WHERE input_stage LIKE N'Nhập Kho %'
    """))
    print(f"bom_details.input_stage updated: {res3.rowcount} rows")
except Exception as e:
    print("bom_details.input_stage err:", e)

db.commit()
print("All DB updates committed successfully!")
db.close()
