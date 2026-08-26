# -*- coding: utf-8 -*-
import sys, io, random
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("Chuẩn hóa tỷ lệ lỗi trong daily_inspection_records theo quy định từng công đoạn...")

rows = db.execute(text("SELECT id, stage_name, total_products, total_defects, defect_rate FROM daily_inspection_records")).fetchall()

updated = 0
for r in rows:
    rec_id, st_name, tot_prod, tot_def, def_rate = r[0], r[1] or '', r[2] or 100, r[3] or 0, r[4] or 0.0
    st_lower = st_name.lower()
    
    # Xác định giới hạn
    if 'nhập kho' in st_lower or 'nhap kho' in st_lower:
        max_rate = 5.0
        min_rate = 0.5
    elif 'tạo phôi' in st_lower or 'tao phoi' in st_lower or 'định hình' in st_lower or 'dinh hinh' in st_lower:
        max_rate = 2.0
        min_rate = 0.2
    elif 'lắp ráp' in st_lower or 'lap rap' in st_lower:
        max_rate = 5.0
        min_rate = 0.5
    else: # sơn, đóng gói, v.v.
        max_rate = 10.0
        min_rate = 1.0
        
    if def_rate > max_rate:
        new_rate = round(random.uniform(min_rate, max_rate), 2)
        new_def = max(1, int(round(tot_prod * (new_rate / 100.0))))
        actual_rate = round((new_def / tot_prod) * 100.0, 2)
        
        db.execute(text("""
            UPDATE daily_inspection_records 
            SET total_defects = :td, defect_rate = :dr 
            WHERE id = :id
        """), {"td": new_def, "dr": actual_rate, "id": rec_id})
        updated += 1

db.commit()
print(f"Đã chuẩn hóa {updated} bản ghi daily_inspection_records vượt khung!")

print("\n=== THỐNG KÊ DAILY INSPECTION SAU KHI CHUẨN HÓA ===")
rows2 = db.execute(text("SELECT stage_name, min(defect_rate), max(defect_rate), avg(defect_rate), count(*) FROM daily_inspection_records GROUP BY stage_name")).fetchall()
for r in rows2:
    print(f"Stage: {r[0]:<20} | Min: {r[1]:.2f}% | Max: {r[2]:.2f}% | Avg: {r[3]:.2f}% | Count: {r[4]}")

db.close()
