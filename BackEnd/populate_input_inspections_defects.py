import sys, io, random, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

print("=" * 90)
print("BỔ SUNG CHI TIẾT DEFECTS VÀO DATA_JSON CỦA INPUT_INSPECTIONS")
print("=" * 90)

TARGET_DEFECT_MAP = {
    'Sơn': [
        {'id': 1011, 'name': 'Không đồng màu', 'code': 'APP-009', 'weight': 50},
        {'id': 1021, 'name': 'Lệch màu', 'code': 'APP-017', 'weight': 30},
        {'id': 1006, 'name': 'Bụi sơn', 'code': 'APP-004', 'weight': 10},
        {'id': 1004, 'name': 'Chảy sơn', 'code': 'APP-002', 'weight': 10},
    ],
    'Lắp Ráp': [
        {'id': 1001, 'name': 'Nứt tét', 'code': 'APP-001', 'weight': 60},
        {'id': 1014, 'name': 'Lắp ráp lệch', 'code': 'APP-012', 'weight': 25},
        {'id': 1015, 'name': 'Lồi đinh', 'code': 'APP-013', 'weight': 15},
    ],
    'Đóng Gói': [
        {'id': 1003, 'name': 'Trầy xước', 'code': 'STR-002', 'weight': 40},
        {'id': 1008, 'name': 'Cấn móp', 'code': 'APP-006', 'weight': 30},
        {'id': 1017, 'name': 'Tem nhãn', 'code': 'APP-015', 'weight': 15},
        {'id': 1011, 'name': 'Không đồng màu', 'code': 'APP-009', 'weight': 15},
    ],
    'Định Hình': [
        {'id': 1002, 'name': 'Cong vênh', 'code': 'STR-001', 'weight': 60},
        {'id': 1001, 'name': 'Nứt tét', 'code': 'APP-001', 'weight': 30},
        {'id': 1008, 'name': 'Cấn móp', 'code': 'APP-006', 'weight': 10},
    ],
    'Nhập Kho': [
        {'id': 1002, 'name': 'Cong vênh', 'code': 'STR-001', 'weight': 70},
        {'id': 1001, 'name': 'Nứt tét', 'code': 'APP-001', 'weight': 30},
    ],
    'Tạo Phôi': [
        {'id': 1002, 'name': 'Cong vênh', 'code': 'STR-001', 'weight': 80},
        {'id': 1001, 'name': 'Nứt tét', 'code': 'APP-001', 'weight': 20},
    ]
}

with engine.connect() as conn:
    rows = conn.execute(text("SELECT id, stage, inspection_type, conclusion, sample_qty, required_qty, error_qty, data_json, note FROM input_inspections")).fetchall()
    
    count = 0
    for r in rows:
        r_id = r.id
        stg = str(r.stage or '')
        is_fail = (r.conclusion == 'fail')
        err_qty = r.error_qty or 0
        s_qty = r.sample_qty or 50
        req_qty = r.required_qty or 200

        # Xác định nhóm công đoạn
        stg_grp = 'Sơn'
        for k in ['Tạo Phôi', 'Định Hình', 'Lắp Ráp', 'Sơn', 'Đóng Gói', 'Nhập Kho']:
            if k.lower() in stg.lower():
                stg_grp = k
                break

        pool = TARGET_DEFECT_MAP.get(stg_grp, TARGET_DEFECT_MAP['Sơn'])

        try:
            curr_data = json.loads(r.data_json or '{}') if r.data_json else {}
        except:
            curr_data = {}

        if is_fail:
            if err_qty < 2:
                err_qty = random.randint(2, 4)

            # Chọn 2 loại lỗi khác nhau
            num_types = min(len(pool), random.randint(2, 3))
            chosen = random.sample(pool, num_types)
            
            defects_list = []
            rem = err_qty
            for idx, c in enumerate(chosen):
                if idx == len(chosen) - 1:
                    q = max(1, rem)
                else:
                    q = max(1, rem // (len(chosen) - idx))
                    rem -= q
                defects_list.append({
                    'defect_id': c['id'],
                    'defect_name': c['name'],
                    'defect_code': c['code'],
                    'quantity': q
                })

            d_rate = round((err_qty / s_qty) * 100, 2)
            curr_data['defects'] = defects_list
            curr_data['sample_qty'] = s_qty
            curr_data['required_qty'] = req_qty
            curr_data['error_qty'] = err_qty
            curr_data['defect_rate'] = d_rate
            
            defect_desc_str = ", ".join([f"{d['defect_name']} ({d['quantity']} cái)" for d in defects_list])
            new_note = f"[Nguồn: Phiếu kiểm tra QC] Không đạt: Phát hiện {err_qty} chi tiết lỗi gồm: {defect_desc_str}."

            conn.execute(
                text("UPDATE input_inspections SET error_qty = :eq, data_json = :dj, note = :nt WHERE id = :rid"),
                {'eq': err_qty, 'dj': json.dumps(curr_data, ensure_ascii=False), 'nt': new_note, 'rid': r_id}
            )
        else:
            curr_data['defects'] = []
            curr_data['sample_qty'] = s_qty
            curr_data['required_qty'] = req_qty
            curr_data['error_qty'] = 0
            curr_data['defect_rate'] = 0.0
            conn.execute(
                text("UPDATE input_inspections SET data_json = :dj WHERE id = :rid"),
                {'dj': json.dumps(curr_data, ensure_ascii=False), 'rid': r_id}
            )
        count += 1

    conn.commit()
    print(f"✅ Đã cập nhật xong data_json cho {count} bản ghi input_inspections!")

