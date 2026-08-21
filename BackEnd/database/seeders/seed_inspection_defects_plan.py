# -*- coding: utf-8 -*-
"""
Seeder chuẩn theo Plan: Nạp dữ liệu nhật ký kiểm tra lỗi QC cho bảng daily_inspection_records 
và daily_inspection_defects đạt CHÍNH XÁC 100% tỷ lệ phân bổ lỗi theo Plan:
- Nứt tét (APP-001 / ID 1001): 25.0%
- Không đồng màu (APP-009 / ID 1011): 20.0%
- Lệch màu (APP-017 / ID 1021): 15.0%
- Cong vênh (STR-001 / ID 1002): 10.0%
- Các lỗi khác (Trầy xước, Chảy sơn, Bong tróc, Cấn móp, Sứt mẻ, v.v.): 30.0%
"""

import sys
import os
import random
from datetime import datetime, date, timedelta

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import app.models
from config.database import SessionLocal
from modules.inspection.models.daily_inspection import DailyInspectionRecord, DailyInspectionDefect
from modules.inspection.models.defect_type import DefectType
from modules.auth.models.accounts import Account

def run_seeder():
    db = SessionLocal()
    try:
        print("=== NẠP DỮ LIỆU NHẬT KÝ QC CHUẨN XÁC 100% THEO PLAN ===")

        # 1. Clear existing inspection records
        db.query(DailyInspectionDefect).delete()
        db.query(DailyInspectionRecord).delete()
        db.commit()
        print("[THÔNG BÁO] Đã dọn dẹp các bản ghi cũ.")

        # 2. Inspectors (accounts)
        qc_accounts = db.query(Account).filter(Account.is_active == True).all()
        inspector_ids = [a.id for a in qc_accounts] if qc_accounts else [4]

        # 3. Defect ID targets & percentages according to Plan
        # 1001 (Nứt tét): 25%
        # 1011 (Không đồng màu): 20%
        # 1021 (Lệch màu): 15%
        # 1002 (Cong vênh): 10%
        # Other 17 defects: 30% total (each ~ 1.76%)
        other_ids = [1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020]
        
        # Build exact weighted population array of size 1000 items
        # 250 items = 1001 (25%)
        # 200 items = 1011 (20%)
        # 150 items = 1021 (15%)
        # 100 items = 1002 (10%)
        # 300 items = other_ids (30%, ~17-18 items per other defect)
        exact_pool = []
        exact_pool.extend([1001] * 250)
        exact_pool.extend([1011] * 200)
        exact_pool.extend([1021] * 150)
        exact_pool.extend([1002] * 100)

        # Distribute 300 items evenly among the 17 other defect IDs
        items_per_other = 300 // len(other_ids) # 17
        remainder = 300 % len(other_ids) # 11
        for idx, oid in enumerate(other_ids):
            cnt = items_per_other + (1 if idx < remainder else 0)
            exact_pool.extend([oid] * cnt)

        # Shuffle the pool
        random.shuffle(exact_pool)

        # 4. Generate records ONLY for June 2026 and July 2026 (Tháng 6 & Tháng 7)
        months_config = [
            (2026, 6, 30), # Tháng 6/2026 (Plan 1)
            (2026, 7, 31)  # Tháng 7/2026 (Plan 2)
        ]

        stages_map = {
            1001: "Tạo Phôi",       # Nứt tét -> Tạo phôi / Lắp ráp
            1002: "Định Hình",      # Cong vênh -> Định hình
            1011: "Sơn",            # Không đồng màu -> Sơn
            1021: "Sơn",            # Lệch màu -> Sơn
        }
        default_stages = ["Lắp Ráp", "Đóng Gói", "QC Final", "Tạo Phôi", "Định Hình", "Sơn"]

        total_records_created = 0
        total_defects_created = 0

        for year, month, max_day in months_config:
            # We want each month to have exactly 1,000 defects distributed according to exact_pool!
            # Shuffle pool for this month
            month_pool = list(exact_pool)
            random.shuffle(month_pool)
            
            idx = 0
            pool_len = len(month_pool) # 1000 items

            # Working days in month
            working_days = []
            for d in range(1, max_day + 1):
                dt = date(year, month, d)
                if dt.weekday() != 6: # skip Sundays
                    working_days.append(dt)

            while idx < pool_len:
                insp_date = random.choice(working_days)
                inspector = random.choice(inspector_ids)
                
                # Take 3 to 8 defect items from pool for this record
                chunk_size = min(random.randint(3, 8), pool_len - idx)
                chunk_defects = month_pool[idx : idx + chunk_size]
                idx += chunk_size

                # Count quantities per defect ID in this chunk
                from collections import Counter
                defect_counts = Counter(chunk_defects)

                rec_total_defects = sum(defect_counts.values())
                # Realistic inspected products (e.g. 50 to 300)
                total_products = random.randint(150, 400)
                defect_rate = round((rec_total_defects / total_products) * 100, 2)

                # Pick stage based on main defect
                primary_defect = defect_counts.most_common(1)[0][0]
                stage_name = stages_map.get(primary_defect, random.choice(default_stages))

                created_dt = datetime(year, month, insp_date.day, random.randint(8, 17), random.randint(0, 59))

                rec = DailyInspectionRecord(
                    inspection_date = insp_date,
                    stage_name      = stage_name,
                    inspector_id    = inspector,
                    total_products  = total_products,
                    total_defects   = rec_total_defects,
                    defect_rate     = defect_rate,
                    created_at      = created_dt
                )
                db.add(rec)
                db.flush()

                total_records_created += 1
                total_defects_created += rec_total_defects

                for df_id, df_qty in defect_counts.items():
                    db.add(DailyInspectionDefect(
                        record_id = rec.id,
                        defect_id = df_id,
                        quantity  = df_qty
                    ))

        db.commit()
        print(f"[THÀNH CÔNG RỰC RỠ] Đã nạp {total_records_created} phiếu nhật ký QC ({total_defects_created} lỗi) đạt CHUẨN XÁC 100% theo Plan!")

    except Exception as e:
        db.rollback()
        print(f"[LỖI SEEDER] {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_seeder()
