# -*- coding: utf-8 -*-
"""
Seeder: Nạp dữ liệu kiểm tra lỗi QC cho bảng daily_inspection_records và daily_inspection_defects.
Giúp trang Quản lý lỗi (/admin/defects) hiển thị đầy đủ:
- Tỷ lệ % T (Tháng) & % A (All-time) trên từng dòng lỗi.
- Biểu đồ Pareto (Lỗi trọng yếu), Biểu đồ phân bổ theo nhóm lỗi (Tròn), và Biểu đồ biến động xu hướng lỗi theo thời gian.
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
        print("=== BẮT ĐẦU NẠP DỮ LIỆU BẢNG DAILY_INSPECTION_RECORDS & DAILY_INSPECTION_DEFECTS ===")

        # 1. Clear existing inspection records if any
        db.query(DailyInspectionDefect).delete()
        db.query(DailyInspectionRecord).delete()
        db.commit()
        print("[THÔNG BÁO] Đã dọn dẹp các bản ghi cũ.")

        # 2. Get available inspectors (accounts)
        qc_accounts = db.query(Account).filter(Account.is_active == True).all()
        inspector_ids = [a.id for a in qc_accounts] if qc_accounts else [4]

        # 3. Stage list
        stages = ["Tạo Phôi", "Định Hình", "Lắp Ráp", "Sơn", "Đóng Gói", "QC Final"]

        # 4. Defect IDs mapping with weights
        # Target proportions among all defects:
        # Nứt tét (1001): 25%
        # Không đồng màu (1011): 20%
        # Lệch màu (1021): 15%
        # Cong vênh (1002): 10%
        # Other defects (1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1012..1020): 30%

        target_defect_pool = (
            [1001] * 25 +  # Nứt tét
            [1011] * 20 +  # Không đồng màu
            [1021] * 15 +  # Lệch màu
            [1002] * 10 +  # Cong vênh
            [1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020] * 2  # Other 30%
        )

        # 5. Generate daily inspection records for June, July, and August 2026
        dates = []
        
        # June 2026 (1-30)
        start_june = date(2026, 6, 1)
        for i in range(30):
            d = start_june + timedelta(days=i)
            if d.weekday() != 6: # Skip Sundays
                dates.append(d)

        # July 2026 (1-31)
        start_july = date(2026, 7, 1)
        for i in range(31):
            d = start_july + timedelta(days=i)
            if d.weekday() != 6:
                dates.append(d)

        # August 2026 (1-21 - Current month up to today)
        start_aug = date(2026, 8, 1)
        for i in range(21):
            d = start_aug + timedelta(days=i)
            if d.weekday() != 6:
                dates.append(d)

        records_to_add = []
        defects_to_add = []

        record_counter = 0

        for insp_date in dates:
            # Generate 3-6 inspection records per day across stages
            records_per_day = random.randint(3, 6)
            for _ in range(records_per_day):
                st_name = random.choice(stages)
                inspector = random.choice(inspector_ids)
                
                total_prod = random.randint(200, 800)
                # Defect rate between 3% and 12%
                num_defects_this_rec = random.randint(5, 45)
                defect_rate = round((num_defects_this_rec / total_prod) * 100, 2)

                created_dt = datetime(insp_date.year, insp_date.month, insp_date.day, random.randint(8, 17), random.randint(0, 59))

                rec = DailyInspectionRecord(
                    inspection_date = insp_date,
                    stage_name      = st_name,
                    inspector_id    = inspector,
                    total_products  = total_prod,
                    total_defects   = num_defects_this_rec,
                    defect_rate     = defect_rate,
                    created_at      = created_dt
                )
                db.add(rec)
                db.flush() # get rec.id

                record_counter += 1

                # Distribute num_defects_this_rec into 2-4 defect types
                num_types = random.randint(1, 4)
                unique_defects = sorted(list(set(target_defect_pool)))
                chosen_defect_ids = random.sample(unique_defects, k=min(num_types, len(unique_defects)))
                
                remaining_qty = num_defects_this_rec
                for idx, df_id in enumerate(chosen_defect_ids):
                    if idx == len(chosen_defect_ids) - 1:
                        qty = remaining_qty
                    else:
                        qty = random.randint(1, max(1, remaining_qty - (len(chosen_defect_ids) - idx - 1)))
                    
                    if qty > 0:
                        db.add(DailyInspectionDefect(
                            record_id = rec.id,
                            defect_id = df_id,
                            quantity  = qty
                        ))
                        remaining_qty -= qty

        db.commit()
        print(f"[THÀNH CÔNG RỰC RỠ] Đã nạp {record_counter} phiếu kiểm tra nhật ký QC vào daily_inspection_records & daily_inspection_defects!")

    except Exception as e:
        db.rollback()
        print(f"[LỖI SEEDER] {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_seeder()
