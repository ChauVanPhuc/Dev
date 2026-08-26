# -*- coding: utf-8 -*-
import sys, io, json, random
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("Bắt đầu cập nhật toàn bộ phiếu của Dương Văn Toàn sang đúng Công đoạn: Định Hình 1 và Lắp Ráp 1...")

# Lấy tất cả các phiếu của Dương Văn Toàn trong input_inspections
rows = db.execute(text("""
    SELECT id, batch_no, product_sku, stage, inspector_name, data_json, sample_qty, error_qty, conclusion 
    FROM input_inspections 
    WHERE inspector_name LIKE N'%Dương Văn Toàn%' 
       OR data_json LIKE N'%Dương Văn Toàn%' 
       OR data_json LIKE N'%toan.dv%'
""")).fetchall()

print(f"Tổng số phiếu tìm thấy của Dương Văn Toàn: {len(rows)}")

updated_count = 0
for r in rows:
    rec_id = r[0]
    stage_col = r[3] or ''
    p_data = {}
    if r[5]:
        try:
            p_data = json.loads(r[5]) if isinstance(r[5], str) else r[5]
        except Exception:
            p_data = {}
            
    old_stage = p_data.get('stage_name') or stage_col or ''
    
    # Nếu là Sơn (Sơn 1, Sơn 2, Sơn 3) -> chuyển sang Định Hình 1
    # Nếu là Đóng Gói (Đóng Gói 1, Đóng Gói 2, Đóng Gói 3) hoặc khác -> chuyển sang Lắp Ráp 1
    if 'sơn' in old_stage.lower() or 'son' in old_stage.lower():
        new_stage = 'Định Hình 1'
    elif 'đóng gói' in old_stage.lower() or 'dong goi' in old_stage.lower() or 'lưu kho' in old_stage.lower():
        new_stage = 'Lắp Ráp 1'
    else:
        new_stage = 'Định Hình 1' if random.random() < 0.5 else 'Lắp Ráp 1'
        
    p_data['stage_name'] = new_stage
    p_data['inspector_name'] = 'Dương Văn Toàn'
    p_data['created_by'] = 'Dương Văn Toàn'
    
    # Kiểm tra và điều chỉnh tỷ lệ lỗi nếu phiếu là Không đạt (fail)
    concl = r[8]
    sq = r[6] or p_data.get('sample_qty') or 100
    eq = r[7] or p_data.get('error_qty') or 0
    
    if concl == 'fail' or eq > 0:
        if new_stage == 'Định Hình 1':
            # Định hình: 0 - 2% (0.5% - 2.0%)
            sample_qty = random.choice([100, 150, 200, 250, 300])
            max_err = max(1, int(sample_qty * 0.02))
            error_qty = random.randint(1, max_err)
        else: # Lắp Ráp 1
            # Lắp ráp: 0 - 5% (1.0% - 5.0%)
            sample_qty = random.choice([50, 80, 100, 120, 150, 200])
            max_err = max(1, int(sample_qty * 0.05))
            error_qty = random.randint(1, max_err)
            
        rate = round((error_qty / sample_qty) * 100, 2)
        p_data['sample_qty'] = sample_qty
        p_data['error_qty'] = error_qty
        p_data['defect_rate'] = rate
        p_data['conclusion'] = 'fail'
        
        new_json_str = json.dumps(p_data, ensure_ascii=False)
        db.execute(text("""
            UPDATE input_inspections 
            SET stage = :st, product_sku = :sku, sample_qty = :sq, error_qty = :eq, data_json = :dj, conclusion = 'fail', result = 'fail' 
            WHERE id = :id
        """), {"st": new_stage, "sku": new_stage, "sq": sample_qty, "eq": error_qty, "dj": new_json_str, "id": rec_id})
    else:
        new_json_str = json.dumps(p_data, ensure_ascii=False)
        db.execute(text("""
            UPDATE input_inspections 
            SET stage = :st, product_sku = :sku, data_json = :dj 
            WHERE id = :id
        """), {"st": new_stage, "sku": new_stage, "dj": new_json_str, "id": rec_id})
        
    updated_count += 1

db.commit()
print(f"\nĐã cập nhật thành công {updated_count} phiếu của Dương Văn Toàn sang Định Hình 1 / Lắp Ráp 1!")

# Kiểm tra lại sau khi cập nhật
print("\n=== THỐNG KÊ SAU KHI CẬP NHẬT CỦA DƯƠNG VĂN TOÀN ===")
check_rows = db.execute(text("""
    SELECT id, batch_no, product_sku, stage, inspector_name, data_json 
    FROM input_inspections 
    WHERE inspector_name LIKE N'%Dương Văn Toàn%' 
       OR data_json LIKE N'%Dương Văn Toàn%'
""")).fetchall()

from collections import Counter
c_stages = Counter()
for cr in check_rows:
    p_data = json.loads(cr[5]) if cr[5] else {}
    st = p_data.get('stage_name') or cr[3] or cr[2]
    c_stages[st] += 1

for st, cnt in c_stages.most_common():
    print(f"  Stage: '{st}' -> {cnt} phiếu")

# Kiểm tra mẫu phiếu #1895 (trong ảnh của user)
r1895 = db.execute(text("SELECT id, batch_no, stage, product_sku, inspector_name, data_json FROM input_inspections WHERE id = 1895")).fetchone()
if r1895:
    p1895 = json.loads(r1895[5]) if r1895[5] else {}
    print(f"\nPhiếu #1895 sau khi sửa: PO={r1895[1]}, Stage={r1895[2]}, Inspector={r1895[4]}, DataStage={p1895.get('stage_name')}")

db.close()
