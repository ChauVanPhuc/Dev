# -*- coding: utf-8 -*-
import sys, io, json, random, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("Bắt đầu cập nhật tỷ lệ lỗi cho dữ liệu 'Kiểm tra lại' theo quy chuẩn...")

# Lấy tất cả các bản ghi 'Kiểm tra lại' trong input_inspections
rows = db.execute(text("""
    SELECT id, batch_no, product_sku, stage, conclusion, sample_qty, error_qty, data_json, inspection_type 
    FROM input_inspections 
    WHERE inspection_type NOT IN ('mau-dau-tien', 'quy-trinh')
""")).fetchall()

print(f"Tổng số phiếu 'Kiểm tra lại': {len(rows)}")

def get_stage_group(stage_str):
    if not stage_str:
        return 'other'
    s = stage_str.lower().strip()
    if 'nhập kho' in s or 'nhap kho' in s:
        return 'nhap_kho'
    elif 'tạo phôi' in s or 'tao phoi' in s or 'định hình' in s or 'dinh hinh' in s:
        return 'dinh_hinh'
    elif 'lắp ráp' in s or 'lap rap' in s:
        return 'lap_rap'
    elif 'sơn' in s or 'son' in s or 'đóng gói' in s or 'dong goi' in s or 'lưu kho' in s or 'luu kho' in s or 'final' in s:
        return 'son_dong_goi'
    return 'other'

updated_count = 0

for r in rows:
    rec_id = r[0]
    p_data = {}
    if r[7]:
        try:
            p_data = json.loads(r[7]) if isinstance(r[7], str) else r[7]
        except Exception:
            p_data = {}
    
    stage_raw = p_data.get('stage_name') or r[3] or r[2] or ''
    concl = r[4]
    err_qty = r[6] or p_data.get('error_qty') or 0
    
    # Chỉ xử lý các phiếu có lỗi (conclusion == 'fail' hoặc error_qty > 0)
    if concl == 'fail' or err_qty > 0:
        grp = get_stage_group(stage_raw)
        
        # Chọn sample_qty và error_qty theo khung
        if grp == 'nhap_kho':
            # Nhập kho: 0 - 5% (1.0% - 5.0%)
            sample_qty = random.choice([50, 80, 100, 120, 150, 200])
            max_err = max(1, int(sample_qty * 0.05))
            min_err = 1
            error_qty = random.randint(min_err, max_err)
        elif grp == 'dinh_hinh':
            # Định hình / Tạo phôi: 0 - 2% (0.5% - 2.0%)
            sample_qty = random.choice([100, 150, 200, 250, 300])
            max_err = max(1, int(sample_qty * 0.02))
            min_err = 1
            error_qty = random.randint(min_err, max_err)
        elif grp == 'lap_rap':
            # Lắp ráp: 0 - 5% (1.0% - 5.0%)
            sample_qty = random.choice([50, 80, 100, 120, 150, 200])
            max_err = max(1, int(sample_qty * 0.05))
            min_err = 1
            error_qty = random.randint(min_err, max_err)
        else: # son_dong_goi or other
            # Sơn, đóng gói: 0 - 10% (1.0% - 10.0%)
            sample_qty = random.choice([50, 80, 100, 120, 150, 200])
            max_err = max(1, int(sample_qty * 0.10))
            min_err = max(1, int(sample_qty * 0.02))
            error_qty = random.randint(min_err, max_err)
            
        rate = round((error_qty / sample_qty) * 100, 2)
        
        # Cập nhật data_json
        p_data['sample_qty'] = sample_qty
        p_data['error_qty'] = error_qty
        p_data['defect_rate'] = rate
        p_data['conclusion'] = 'fail'
        
        # Cập nhật DB
        new_json_str = json.dumps(p_data, ensure_ascii=False)
        db.execute(text("""
            UPDATE input_inspections 
            SET sample_qty = :sq, error_qty = :eq, conclusion = 'fail', result = 'fail', data_json = :dj 
            WHERE id = :id
        """), {"sq": sample_qty, "eq": error_qty, "dj": new_json_str, "id": rec_id})
        
        updated_count += 1

db.commit()
print(f"\nĐã cập nhật thành công {updated_count} phiếu lỗi trong bảng input_inspections!")

# Thống kê sau khi cập nhật
print("\n=== THỐNG KÊ SAU KHI CẬP NHẬT ===")
check_rows = db.execute(text("""
    SELECT id, batch_no, product_sku, stage, conclusion, sample_qty, error_qty, data_json 
    FROM input_inspections 
    WHERE inspection_type NOT IN ('mau-dau-tien', 'quy-trinh') AND (conclusion = 'fail' OR error_qty > 0)
""")).fetchall()

group_stats = {
    'nhap_kho': [],
    'dinh_hinh': [],
    'lap_rap': [],
    'son_dong_goi': [],
    'other': []
}

for cr in check_rows:
    p_data = {}
    if cr[7]:
        try:
            p_data = json.loads(cr[7]) if isinstance(cr[7], str) else cr[7]
        except Exception:
            pass
    stage_raw = p_data.get('stage_name') or cr[3] or cr[2] or ''
    grp = get_stage_group(stage_raw)
    sq = cr[5] or 1
    eq = cr[6] or 0
    rate = round((eq / sq) * 100, 2)
    group_stats[grp].append(rate)

for grp_name, rates in group_stats.items():
    if rates:
        print(f"Nhóm [{grp_name}]: Số lượng={len(rates)}, Min={min(rates):.2f}%, Max={max(rates):.2f}%, Avg={sum(rates)/len(rates):.2f}%")
    else:
        print(f"Nhóm [{grp_name}]: 0 bản ghi lỗi")

db.close()
