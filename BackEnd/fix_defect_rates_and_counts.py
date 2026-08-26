import sys, io, random
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

print("=" * 90)
print("CHUẨN HÓA TỶ LỆ LỖI VÀ QUY TẮC PHIẾU KHÔNG ĐẠT CÓ ÍT NHẤT 2 LỖI TRỞ LÊN")
print("=" * 90)

with engine.connect() as conn:
    # 1. Lấy danh sách Defect Types theo từng công đoạn
    def_rows = conn.execute(text("SELECT id, name, stage FROM defect_types WHERE is_active = 1")).fetchall()
    defects_by_stage = {}
    all_defect_ids = []
    for d in def_rows:
        all_defect_ids.append(d.id)
        stg = d.stage or 'Chung'
        if stg not in defects_by_stage:
            defects_by_stage[stg] = []
        defects_by_stage[stg].append(d.id)

    # 2. Xử lý chuẩn hóa toàn bộ DAILY_INSPECTION_RECORDS
    print("1. Đang chuẩn hóa daily_inspection_records và daily_inspection_defects...")
    
    # Xóa sạch chi tiết lỗi cũ trong daily_inspection_defects
    conn.execute(text("DELETE FROM daily_inspection_defects"))

    records = conn.execute(text("SELECT id, stage_name, total_products FROM daily_inspection_records")).fetchall()
    
    new_defects_batch = []
    
    for r in records:
        rec_id = r.id
        stage_name = str(r.stage_name or '')
        tot_prod = r.total_products or random.randint(100, 600)
        if tot_prod < 50: tot_prod = random.randint(100, 300)

        # Tỷ lệ lỗi chuẩn nhà máy: từ 1.8% đến 5.8% (Tuyệt đối < 8%)
        target_rate = round(random.uniform(1.8, 5.8), 2)
        
        # Số lượng lỗi tính theo tỷ lệ (phải >= 2 lỗi trở lên)
        tot_def = max(2, int(tot_prod * (target_rate / 100)))
        
        # Tính lại tỷ lệ chính xác
        actual_rate = round((tot_def / tot_prod) * 100, 2)
        
        # Cập nhật bản ghi daily_inspection_records
        conn.execute(
            text("""
                UPDATE daily_inspection_records
                SET total_products = :tp, total_defects = :td, defect_rate = :dr
                WHERE id = :rid
            """),
            {'tp': tot_prod, 'td': tot_def, 'dr': actual_rate, 'rid': rec_id}
        )

        # Tạo ít nhất 2 loại lỗi khác nhau trong daily_inspection_defects
        stage_key = 'Chung'
        for k in defects_by_stage.keys():
            if k.lower() in stage_name.lower():
                stage_key = k
                break
        
        pool = defects_by_stage.get(stage_key, all_defect_ids)
        if len(pool) < 2: pool = all_defect_ids

        # Chọn 2 đến 3 loại lỗi khác nhau
        num_types = min(len(pool), random.randint(2, 3))
        chosen_types = random.sample(pool, num_types)

        # Phân chia số lượng lỗi cho các loại sao cho tổng = tot_def
        remaining = tot_def
        for idx, def_id in enumerate(chosen_types):
            if idx == len(chosen_types) - 1:
                qty = max(1, remaining)
            else:
                qty = max(1, remaining // (len(chosen_types) - idx))
                remaining -= qty

            new_defects_batch.append({
                'record_id': rec_id,
                'defect_id': def_id,
                'quantity': qty
            })

    # Chèn lại daily_inspection_defects
    batch_size = 500
    for i in range(0, len(new_defects_batch), batch_size):
        b = new_defects_batch[i:i+batch_size]
        conn.execute(
            text("""
                INSERT INTO daily_inspection_defects (record_id, defect_id, quantity)
                VALUES (:record_id, :defect_id, :quantity)
            """),
            b
        )

    conn.commit()
    print(f"   -> Đã chuẩn hóa xong {len(records)} bản ghi daily_inspection_records (Tỷ lệ lỗi max < 8%)!")
    print(f"   -> Đã chèn {len(new_defects_batch)} bản ghi chi tiết lỗi (mỗi phiếu >= 2 lỗi khác nhau)!")

    # 3. Chuẩn hóa INPUT_INSPECTIONS (Mọi phiếu Không đạt phải có ít nhất 2 lỗi trở lên)
    print("\n2. Chuẩn hóa input_inspections: Phiếu không đạt phải có error_qty >= 2...")
    
    conn.execute(text("""
        UPDATE input_inspections
        SET error_qty = CASE 
            WHEN conclusion = 'fail' AND (error_qty IS NULL OR error_qty < 2) THEN 2
            WHEN conclusion = 'pass' THEN 0
            ELSE error_qty
        END
    """))

    # Cập nhật ghi chú rõ ràng cho các phiếu Không đạt
    fail_records = conn.execute(text("SELECT id, sample_qty, error_qty FROM input_inspections WHERE conclusion = 'fail'")).fetchall()
    for fr in fail_records:
        err = max(2, fr.error_qty or 2)
        note = f"Phát hiện {err} chi tiết không đạt: gồm ít nhất 2 lỗi (sai lệch dung sai lắp ghép và bám bụi bề mặt)."
        conn.execute(
            text("UPDATE input_inspections SET error_qty = :eq, note = :nt WHERE id = :fid"),
            {'eq': err, 'nt': note, 'fid': fr.id}
        )

    conn.commit()
    print(f"   -> Đã chuẩn hóa xong {len(fail_records)} phiếu Không đạt trong input_inspections (100% có error_qty >= 2)!")

print("=" * 90)
print("✅ HOÀN TẤT CHUẨN HÓA 100%!")
print("=" * 90)
