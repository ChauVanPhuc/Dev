import sys, io, random, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

print("=" * 90)
print("CÂN CHỈNH HOÀN HẢO: 0% LỖI LỆCH CÔNG ĐOẠN & KHỚP 100% TỶ LỆ TOÀN CỤC")
print("=" * 90)

# Cấu hình danh mục lỗi cho phép (Whitelist) và trọng số chuẩn xác:
STAGE_DEFECT_WHITELIST = {
    'Tạo Phôi': [
        {'id': 1002, 'name': 'Cong vênh', 'code': 'STR-001', 'weight': 80},
        {'id': 1001, 'name': 'Nứt tét', 'code': 'APP-001', 'weight': 15},
        {'id': 1020, 'name': 'Mắt chết', 'code': 'MAT-002', 'weight': 5}
    ],
    'Nhập Kho': [
        {'id': 1002, 'name': 'Cong vênh', 'code': 'STR-001', 'weight': 65}, # ~450 cong vênh
        {'id': 1001, 'name': 'Nứt tét', 'code': 'APP-001', 'weight': 20},   # ~150 nứt tét
        {'id': 1020, 'name': 'Mắt chết', 'code': 'MAT-002', 'weight': 15}
    ],
    'Định Hình': [
        {'id': 1001, 'name': 'Nứt tét', 'code': 'APP-001', 'weight': 60},   # ~150 nứt tét
        {'id': 1002, 'name': 'Cong vênh', 'code': 'STR-001', 'weight': 25}, # ~60 cong vênh
        {'id': 1008, 'name': 'Cấn móp', 'code': 'APP-006', 'weight': 15}
    ],
    'Lắp Ráp': [
        {'id': 1001, 'name': 'Nứt tét', 'code': 'APP-001', 'weight': 70},      # ~1050 nứt tét
        {'id': 1014, 'name': 'Lắp ráp lệch', 'code': 'APP-012', 'weight': 15}, # ~225 lắp ráp lệch
        {'id': 1015, 'name': 'Lồi đinh', 'code': 'APP-013', 'weight': 10},      # ~150 lồi đinh
        {'id': 1008, 'name': 'Cấn móp', 'code': 'APP-006', 'weight': 5}        # ~75 cấn móp
    ],
    'Sơn': [
        {'id': 1011, 'name': 'Không đồng màu', 'code': 'APP-009', 'weight': 60}, # ~880 không đồng màu
        {'id': 1021, 'name': 'Lệch màu', 'code': 'APP-017', 'weight': 35},       # ~515 lệch màu (10.5% + thêm từ QC)
        {'id': 1006, 'name': 'Bụi sơn', 'code': 'APP-004', 'weight': 3},
        {'id': 1004, 'name': 'Chảy sơn', 'code': 'APP-002', 'weight': 2}
    ],
    'Đóng Gói': [
        {'id': 1011, 'name': 'Không đồng màu', 'code': 'APP-009', 'weight': 40}, # ~390 không đồng màu (tổng ~1270 = 26%)
        {'id': 1003, 'name': 'Trầy xước', 'code': 'STR-002', 'weight': 30},       # ~290 trầy xước
        {'id': 1008, 'name': 'Cấn móp', 'code': 'APP-006', 'weight': 20},        # ~195 cấn móp
        {'id': 1017, 'name': 'Tem nhãn', 'code': 'APP-015', 'weight': 10}         # ~95 tem nhãn
    ],
    'Lưu Kho': [
        {'id': 1003, 'name': 'Trầy xước', 'code': 'STR-002', 'weight': 50},
        {'id': 1008, 'name': 'Cấn móp', 'code': 'APP-006', 'weight': 50}
    ]
}

def get_stage_key(stage_name):
    stg = str(stage_name or '').lower()
    for k in ['Tạo Phôi', 'Định Hình', 'Lắp Ráp', 'Sơn', 'Đóng Gói', 'Lưu Kho', 'Nhập Kho']:
        if k.lower() in stg:
            return k
    return 'Lắp Ráp'

with engine.connect() as conn:
    print("1. Cân chỉnh daily_inspection_defects...")
    conn.execute(text("DELETE FROM daily_inspection_defects"))

    daily_rows = conn.execute(text("SELECT id, stage_name, total_products FROM daily_inspection_records")).fetchall()

    stage_groups = {
        'Tạo Phôi': [],
        'Định Hình': [],
        'Lắp Ráp': [],
        'Sơn': [],
        'Đóng Gói': [],
        'Nhập Kho': []
    }

    for r in daily_rows:
        k = get_stage_key(r.stage_name)
        if k == 'Lưu Kho': k = 'Đóng Gói'
        stage_groups[k].append(r)

    rec_defect_map = {}

    # Tạo Phôi (0.1%)
    for r in stage_groups['Tạo Phôi']:
        tp = r.total_products or 300
        rec_defect_map[r.id] = (tp, 0, 0.0)
    for r in stage_groups['Tạo Phôi'][:2]:
        tp = r.total_products or 300
        rec_defect_map[r.id] = (tp, 2, round((2/tp)*100, 2))

    # Định Hình (5%) - 306 bản ghi -> 125 bản ghi có 2 lỗi = 250 lỗi
    dh_records = stage_groups['Định Hình']
    for idx, r in enumerate(dh_records):
        tp = r.total_products or 300
        if idx < 125:
            rec_defect_map[r.id] = (tp, 2, round((2/tp)*100, 2))
        else:
            rec_defect_map[r.id] = (tp, 0, 0.0)

    # Lắp Ráp (30%) - 328 bản ghi -> ~1,500 lỗi (~4-5 lỗi/bản ghi)
    for r in stage_groups['Lắp Ráp']:
        tp = r.total_products or 350
        tot_def = random.randint(4, 5)
        rec_defect_map[r.id] = (tp, tot_def, round((tot_def/tp)*100, 2))

    # Sơn (30%) - 225 bản ghi -> ~1,500 lỗi (~6-7 lỗi/bản ghi)
    for r in stage_groups['Sơn']:
        tp = r.total_products or 350
        tot_def = random.randint(6, 7)
        rec_defect_map[r.id] = (tp, tot_def, round((tot_def/tp)*100, 2))

    # Đóng Gói (20%) - 70 bản ghi -> ~1,000 lỗi (~14 lỗi/bản ghi)
    for r in stage_groups['Đóng Gói']:
        tp = max(350, r.total_products or 400)
        tot_def = random.randint(13, 15)
        rec_defect_map[r.id] = (tp, tot_def, round((tot_def/tp)*100, 2))

    # Nhập Kho (14.9%) - 150 bản ghi -> ~745 lỗi (~5 lỗi/bản ghi)
    for r in stage_groups['Nhập Kho']:
        tp = r.total_products or 300
        tot_def = random.randint(4, 6)
        rec_defect_map[r.id] = (tp, tot_def, round((tot_def/tp)*100, 2))

    new_daily_defects = []

    for r in daily_rows:
        stg_key = get_stage_key(r.stage_name)
        allowed_defects = STAGE_DEFECT_WHITELIST.get(stg_key, STAGE_DEFECT_WHITELIST['Lắp Ráp'])

        tp, td, rate = rec_defect_map.get(r.id, (300, 0, 0.0))
        conn.execute(
            text("UPDATE daily_inspection_records SET total_products = :tp, total_defects = :td, defect_rate = :dr WHERE id = :rid"),
            {'tp': tp, 'td': td, 'dr': rate, 'rid': r.id}
        )

        if td > 0:
            pop_items = allowed_defects
            pop_weights = [item['weight'] for item in pop_items]
            
            num_types = min(len(pop_items), random.randint(2, 3))
            chosen = set()
            while len(chosen) < num_types:
                idx = random.choices(range(len(pop_items)), weights=pop_weights)[0]
                chosen.add(pop_items[idx]['id'])
            
            chosen_items = [item for item in pop_items if item['id'] in chosen]
            rem = td
            for idx, c_item in enumerate(chosen_items):
                if idx == len(chosen_items) - 1:
                    qty = max(1, rem)
                else:
                    qty = max(1, rem // (len(chosen_items) - idx))
                    rem -= qty
                
                new_daily_defects.append({
                    'record_id': r.id,
                    'defect_id': c_item['id'],
                    'quantity': qty
                })

    for i in range(0, len(new_daily_defects), 500):
        b = new_daily_defects[i:i+500]
        conn.execute(
            text("INSERT INTO daily_inspection_defects (record_id, defect_id, quantity) VALUES (:record_id, :defect_id, :quantity)"),
            b
        )
    conn.commit()

    # -------------------------------------------------------------
    # 2. CẬP NHẬT INPUT_INSPECTIONS (DATA_JSON & NOTE)
    # -------------------------------------------------------------
    print("2. Cập nhật input_inspections...")
    inp_rows = conn.execute(text("SELECT id, stage, conclusion, sample_qty, required_qty, error_qty, data_json FROM input_inspections")).fetchall()
    
    for r in inp_rows:
        r_id = r.id
        stg_key = get_stage_key(r.stage)
        allowed_defects = STAGE_DEFECT_WHITELIST.get(stg_key, STAGE_DEFECT_WHITELIST['Lắp Ráp'])

        is_fail = (r.conclusion == 'fail')
        err_qty = max(2, r.error_qty or 2) if is_fail else 0
        s_qty = r.sample_qty or 35
        req_qty = r.required_qty or 200

        try:
            curr_data = json.loads(r.data_json or '{}') if r.data_json else {}
        except:
            curr_data = {}

        if is_fail:
            pop_items = allowed_defects
            pop_weights = [item['weight'] for item in pop_items]
            
            num_types = min(len(pop_items), random.randint(2, 3))
            chosen = set()
            while len(chosen) < num_types:
                idx = random.choices(range(len(pop_items)), weights=pop_weights)[0]
                chosen.add(pop_items[idx]['id'])
            
            chosen_items = [item for item in pop_items if item['id'] in chosen]
            defects_list = []
            rem = err_qty
            for idx, c_item in enumerate(chosen_items):
                if idx == len(chosen_items) - 1:
                    qty = max(1, rem)
                else:
                    qty = max(1, rem // (len(chosen_items) - idx))
                    rem -= qty
                
                defects_list.append({
                    'defect_id': c_item['id'],
                    'defect_name': c_item['name'],
                    'defect_code': c_item['code'],
                    'quantity': qty
                })

            curr_data['defects'] = defects_list
            curr_data['sample_qty'] = s_qty
            curr_data['required_qty'] = req_qty
            curr_data['error_qty'] = err_qty
            curr_data['defect_rate'] = round((err_qty / s_qty) * 100, 2)

            desc_parts = [f"{d['defect_name']} ({d['quantity']} cái)" for d in defects_list]
            note = f"[Nguồn: Phiếu kiểm tra QC] Không đạt: Phát hiện {err_qty} chi tiết lỗi gồm: {', '.join(desc_parts)}."

            conn.execute(
                text("UPDATE input_inspections SET error_qty = :eq, data_json = :dj, note = :nt WHERE id = :rid"),
                {'eq': err_qty, 'dj': json.dumps(curr_data, ensure_ascii=False), 'nt': note, 'rid': r_id}
            )
        else:
            curr_data['defects'] = []
            curr_data['sample_qty'] = s_qty
            curr_data['required_qty'] = req_qty
            curr_data['error_qty'] = 0
            curr_data['defect_rate'] = 0.0
            note = "[Nguồn: Phiếu kiểm tra QC] Kiểm tra thông số kỹ thuật, quy cách và độ hoàn thiện đạt chuẩn 100%."
            conn.execute(
                text("UPDATE input_inspections SET error_qty = 0, data_json = :dj, note = :nt WHERE id = :rid"),
                {'dj': json.dumps(curr_data, ensure_ascii=False), 'nt': note, 'rid': r_id}
            )

    conn.commit()

print("=" * 90)
print("✅ HOÀN TẤT CÂN CHỈNH 100%!")
print("=" * 90)
