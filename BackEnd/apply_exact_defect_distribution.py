import sys, io, random
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

print("=" * 90)
print("CÂN CHỈNH TỶ LỆ LỖI CHUẨN XÁC 100% THEO CÔNG ĐOẠN VÀ LOẠI LỖI")
print("=" * 90)

TARGET_DEFECT_WEIGHTS = [
    (1011, 'Không đồng màu', 270), # 27.0%
    (1001, 'Nứt tét',        250), # 25.0%
    (1021, 'Lệch màu',       150), # 15.0%
    (1002, 'Cong vênh',      100), # 10.0%
    (1003, 'Trầy xước',       50), # 5.0%
    (1006, 'Bụi sơn',         50), # 5.0%
    (1008, 'Cấn móp',         40), # 4.0%
    (1004, 'Chảy sơn',        30), # 3.0%
    (1014, 'Lắp ráp lệch',    30), # 3.0%
    (1015, 'Lồi đinh',        20), # 2.0%
    (1017, 'Tem nhãn',        10)  # 1.0%
]

with engine.connect() as conn:
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
        stg = str(r.stage_name or '')
        matched = 'Nhập Kho'
        for k in ['Tạo Phôi', 'Định Hình', 'Lắp Ráp', 'Sơn', 'Đóng Gói']:
            if k.lower() in stg.lower():
                matched = k
                break
        stage_groups[matched].append(r)

    # Mục tiêu tổng lỗi: ~5,000 lỗi
    # Tạo Phôi: 5 lỗi (~0.1%)
    # Định Hình: 250 lỗi (~5.0%) -> 306 bản ghi: ~0.8 lỗi/bản ghi (hầu hết 0, một số 2 lỗi)
    # Lắp Ráp: 1,500 lỗi (~30.0%) -> 328 bản ghi: ~4.5 lỗi/bản ghi (3-6 lỗi/bản ghi)
    # Sơn: 1,500 lỗi (~30.0%) -> 225 bản ghi: ~6.6 lỗi/bản ghi (5-8 lỗi/bản ghi)
    # Đóng Gói: 1,000 lỗi (~20.0%) -> 70 bản ghi: ~14.2 lỗi/bản ghi (12-16 lỗi/bản ghi trên lô lớn)
    # Nhập Kho: 745 lỗi (~14.9%) -> 150 bản ghi: ~5.0 lỗi/bản ghi (4-6 lỗi/bản ghi)

    rec_defect_map = {}

    # Tạo Phôi (0.1%)
    for r in stage_groups['Tạo Phôi']:
        tp = r.total_products or 300
        rec_defect_map[r.id] = (tp, 0, 0.0)
    for r in stage_groups['Tạo Phôi'][:2]:
        tp = r.total_products or 300
        rec_defect_map[r.id] = (tp, 2, round((2/tp)*100, 2))

    # Định Hình (5%) - 306 bản ghi -> 250 lỗi
    dh_records = stage_groups['Định Hình']
    # 125 bản ghi có 2 lỗi = 250 lỗi, còn lại 0 lỗi
    for idx, r in enumerate(dh_records):
        tp = r.total_products or 300
        if idx < 125:
            rec_defect_map[r.id] = (tp, 2, round((2/tp)*100, 2))
        else:
            rec_defect_map[r.id] = (tp, 0, 0.0)

    # Lắp Ráp (30%) - 328 bản ghi -> 1,500 lỗi (~4.5 lỗi/bản ghi)
    for r in stage_groups['Lắp Ráp']:
        tp = r.total_products or 350
        tot_def = random.randint(4, 5)
        rec_defect_map[r.id] = (tp, tot_def, round((tot_def/tp)*100, 2))

    # Sơn (30%) - 225 bản ghi -> 1,500 lỗi (~6.6 lỗi/bản ghi)
    for r in stage_groups['Sơn']:
        tp = r.total_products or 350
        tot_def = random.randint(6, 7)
        rec_defect_map[r.id] = (tp, tot_def, round((tot_def/tp)*100, 2))

    # Đóng Gói (20%) - 70 bản ghi -> 1,000 lỗi (~14.2 lỗi/bản ghi)
    for r in stage_groups['Đóng Gói']:
        tp = max(350, r.total_products or 400)
        tot_def = random.randint(13, 15)
        rec_defect_map[r.id] = (tp, tot_def, round((tot_def/tp)*100, 2))

    # Nhập Kho (14.9%) - 150 bản ghi -> 745 lỗi (~5.0 lỗi/bản ghi)
    for r in stage_groups['Nhập Kho']:
        tp = r.total_products or 300
        tot_def = random.randint(4, 6)
        rec_defect_map[r.id] = (tp, tot_def, round((tot_def/tp)*100, 2))

    # Cập nhật daily_inspection_records và phân bổ loại lỗi
    all_def_types = [t[0] for t in TARGET_DEFECT_WEIGHTS]
    all_def_weights = [t[2] for t in TARGET_DEFECT_WEIGHTS]

    new_daily_defects = []

    for r in daily_rows:
        tp, td, rate = rec_defect_map.get(r.id, (300, 0, 0.0))
        conn.execute(
            text("UPDATE daily_inspection_records SET total_products = :tp, total_defects = :td, defect_rate = :dr WHERE id = :rid"),
            {'tp': tp, 'td': td, 'dr': rate, 'rid': r.id}
        )

        if td > 0:
            num_types = min(len(all_def_types), random.randint(2, 3))
            chosen = set()
            while len(chosen) < num_types:
                chosen.add(random.choices(all_def_types, weights=all_def_weights)[0])
            
            chosen = list(chosen)
            rem = td
            for idx, d_id in enumerate(chosen):
                if idx == len(chosen) - 1:
                    qty = max(1, rem)
                else:
                    qty = max(1, rem // (len(chosen) - idx))
                    rem -= qty
                
                new_daily_defects.append({
                    'record_id': r.id,
                    'defect_id': d_id,
                    'quantity': qty
                })

    for i in range(0, len(new_daily_defects), 500):
        b = new_daily_defects[i:i+500]
        conn.execute(
            text("INSERT INTO daily_inspection_defects (record_id, defect_id, quantity) VALUES (:record_id, :defect_id, :quantity)"),
            b
        )
    conn.commit()
    print(f"   -> Đã cân chỉnh xong {len(new_daily_defects)} bản ghi chi tiết lỗi theo đúng tỷ lệ toán học!")

print("=" * 90)
