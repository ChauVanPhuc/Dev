import sys, io, random, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

print("=" * 90)
print("KHÓA CHẶT 100% QUAN HỆ CÔNG ĐOẠN <-> PHÒNG BAN CHUYÊN MÔN CỦA NHÂN SỰ QC")
print("=" * 90)

# BẢNG MA TRẬN 1-1 CHUẨN XÁC:
# 1. Nhập Kho -> Dept 1: QC Kiểm Tra Nhập Kho
# 2. Tạo Phôi, Định Hình, Lắp Ráp -> Dept 3: QC Định Hình - Lắp Ráp
# 3. Sơn -> Dept 4: QC Sơn - Đóng Gói
# 4. Đóng Gói -> Dept 4: QC Sơn - Đóng Gói + Dept 5: QC Final
# 5. Lưu Kho / Final -> Dept 5: QC Final

STAGE_TO_QC_MAP = {
    'Nhập Kho': [
        {'id': 27, 'name': 'Đặng Quý Hải', 'dept': 'QC Kiểm Tra Nhập Kho'}
    ],
    'Tạo Phôi 1': [
        {'id': 28, 'name': 'Hà Đình Thành', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 36, 'name': 'Nguyễn Văn Tiến', 'dept': 'QC Định Hình - Lắp Ráp'}
    ],
    'Định Hình 1': [
        {'id': 28, 'name': 'Hà Đình Thành', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 36, 'name': 'Nguyễn Văn Tiến', 'dept': 'QC Định Hình - Lắp Ráp'}
    ],
    'Lắp Ráp 1': [
        {'id': 28, 'name': 'Hà Đình Thành', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 36, 'name': 'Nguyễn Văn Tiến', 'dept': 'QC Định Hình - Lắp Ráp'}
    ],
    'Tạo Phôi 2': [
        {'id': 30, 'name': 'Huỳnh Hoàng Sơn', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 29, 'name': 'Đậu Thị Tâm', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 31, 'name': 'Hồ Sỹ Khẩn', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 41, 'name': 'Bùi Công Sự', 'dept': 'QC Định Hình - Lắp Ráp'}
    ],
    'Định Hình 2': [
        {'id': 30, 'name': 'Huỳnh Hoàng Sơn', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 29, 'name': 'Đậu Thị Tâm', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 31, 'name': 'Hồ Sỹ Khẩn', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 41, 'name': 'Bùi Công Sự', 'dept': 'QC Định Hình - Lắp Ráp'}
    ],
    'Lắp Ráp 2': [
        {'id': 30, 'name': 'Huỳnh Hoàng Sơn', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 29, 'name': 'Đậu Thị Tâm', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 31, 'name': 'Hồ Sỹ Khẩn', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 41, 'name': 'Bùi Công Sự', 'dept': 'QC Định Hình - Lắp Ráp'}
    ],
    'Tạo Phôi 3': [
        {'id': 30, 'name': 'Huỳnh Hoàng Sơn', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 31, 'name': 'Hồ Sỹ Khẩn', 'dept': 'QC Định Hình - Lắp Ráp'}
    ],
    'Định Hình 3': [
        {'id': 30, 'name': 'Huỳnh Hoàng Sơn', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 41, 'name': 'Bùi Công Sự', 'dept': 'QC Định Hình - Lắp Ráp'}
    ],
    'Lắp Ráp 3': [
        {'id': 29, 'name': 'Đậu Thị Tâm', 'dept': 'QC Định Hình - Lắp Ráp'},
        {'id': 31, 'name': 'Hồ Sỹ Khẩn', 'dept': 'QC Định Hình - Lắp Ráp'}
    ],
    'Sơn 1': [
        {'id': 43, 'name': 'Dương Văn Toàn', 'dept': 'QC Sơn - Đóng Gói'}
    ],
    'Sơn 2': [
        {'id': 32, 'name': 'Phan Thị Lương', 'dept': 'QC Sơn - Đóng Gói'},
        {'id': 34, 'name': 'Phạm Thị Mai', 'dept': 'QC Sơn - Đóng Gói'},
        {'id': 35, 'name': 'Nguyễn Thị Mỹ Kim', 'dept': 'QC Sơn - Đóng Gói'}
    ],
    'Sơn 3': [
        {'id': 40, 'name': 'Trần Thị Ánh', 'dept': 'QC Sơn - Đóng Gói'},
        {'id': 42, 'name': 'Nguyễn Thị Phương', 'dept': 'QC Sơn - Đóng Gói'}
    ],
    'Đóng Gói 1': [
        {'id': 43, 'name': 'Dương Văn Toàn', 'dept': 'QC Sơn - Đóng Gói'}
    ],
    'Đóng Gói 2': [
        {'id': 32, 'name': 'Phan Thị Lương', 'dept': 'QC Sơn - Đóng Gói'},
        {'id': 34, 'name': 'Phạm Thị Mai', 'dept': 'QC Sơn - Đóng Gói'},
        {'id': 35, 'name': 'Nguyễn Thị Mỹ Kim', 'dept': 'QC Sơn - Đóng Gói'},
        {'id': 39, 'name': 'Đặng Minh Tuấn', 'dept': 'QC Final'}
    ],
    'Đóng Gói 3': [
        {'id': 40, 'name': 'Trần Thị Ánh', 'dept': 'QC Sơn - Đóng Gói'},
        {'id': 42, 'name': 'Nguyễn Thị Phương', 'dept': 'QC Sơn - Đóng Gói'},
        {'id': 33, 'name': 'Đỗ Hữu Phúc', 'dept': 'QC Final'}
    ],
    'Lưu Kho 1': [
        {'id': 43, 'name': 'Dương Văn Toàn', 'dept': 'QC Sơn - Đóng Gói'}
    ],
    'Lưu Kho 2': [
        {'id': 39, 'name': 'Đặng Minh Tuấn', 'dept': 'QC Final'}
    ],
    'Lưu Kho 3': [
        {'id': 33, 'name': 'Đỗ Hữu Phúc', 'dept': 'QC Final'}
    ]
}

def pick_qc(stage_name):
    stg = str(stage_name or '').strip()
    if 'Nhập Kho' in stg:
        return STAGE_TO_QC_MAP['Nhập Kho'][0]
    
    for key, pool in STAGE_TO_QC_MAP.items():
        if key.lower() == stg.lower():
            return random.choice(pool)
    
    # Fallback match
    if 'sơn' in stg.lower():
        if '1' in stg: return random.choice(STAGE_TO_QC_MAP['Sơn 1'])
        elif '3' in stg: return random.choice(STAGE_TO_QC_MAP['Sơn 3'])
        else: return random.choice(STAGE_TO_QC_MAP['Sơn 2'])
    elif 'đóng gói' in stg.lower():
        if '1' in stg: return random.choice(STAGE_TO_QC_MAP['Đóng Gói 1'])
        elif '3' in stg: return random.choice(STAGE_TO_QC_MAP['Đóng Gói 3'])
        else: return random.choice(STAGE_TO_QC_MAP['Đóng Gói 2'])
    elif 'lưu kho' in stg.lower():
        if '1' in stg: return random.choice(STAGE_TO_QC_MAP['Lưu Kho 1'])
        elif '3' in stg: return random.choice(STAGE_TO_QC_MAP['Lưu Kho 3'])
        else: return random.choice(STAGE_TO_QC_MAP['Lưu Kho 2'])
    elif 'lắp ráp' in stg.lower():
        if '1' in stg: return random.choice(STAGE_TO_QC_MAP['Lắp Ráp 1'])
        elif '3' in stg: return random.choice(STAGE_TO_QC_MAP['Lắp Ráp 3'])
        else: return random.choice(STAGE_TO_QC_MAP['Lắp Ráp 2'])
    elif 'định hình' in stg.lower():
        if '1' in stg: return random.choice(STAGE_TO_QC_MAP['Định Hình 1'])
        elif '3' in stg: return random.choice(STAGE_TO_QC_MAP['Định Hình 3'])
        else: return random.choice(STAGE_TO_QC_MAP['Định Hình 2'])
    elif 'phôi' in stg.lower():
        if '1' in stg: return random.choice(STAGE_TO_QC_MAP['Tạo Phôi 1'])
        elif '3' in stg: return random.choice(STAGE_TO_QC_MAP['Tạo Phôi 3'])
        else: return random.choice(STAGE_TO_QC_MAP['Tạo Phôi 2'])
        
    return STAGE_TO_QC_MAP['Nhập Kho'][0]

with engine.connect() as conn:
    # 1. Cập nhật daily_inspection_records
    print("1. Cập nhật daily_inspection_records...")
    daily_rows = conn.execute(text("SELECT id, stage_name FROM daily_inspection_records")).fetchall()
    for r in daily_rows:
        qc = pick_qc(r.stage_name)
        conn.execute(
            text("UPDATE daily_inspection_records SET inspector_id = :iid WHERE id = :rid"),
            {'iid': qc['id'], 'rid': r.id}
        )
    conn.commit()
    print(f"   -> Đã cập nhật xong {len(daily_rows)} bản ghi daily_inspection_records!")

    # 2. Cập nhật input_inspections
    print("2. Cập nhật input_inspections...")
    inp_rows = conn.execute(text("SELECT id, stage, data_json, is_confirmed FROM input_inspections")).fetchall()
    for r in inp_rows:
        qc = pick_qc(r.stage)
        try:
            dj = json.loads(r.data_json or '{}') if r.data_json else {}
        except:
            dj = {}
        dj['inspector_name'] = qc['name']
        dj['created_by'] = qc['name']

        conf_by = qc['id'] if r.is_confirmed else None

        conn.execute(
            text("""
                UPDATE input_inspections
                SET inspector_id = :iid,
                    inspector_name = :iname,
                    confirmed_by = :cby,
                    data_json = :dj
                WHERE id = :rid
            """),
            {
                'iid': qc['id'],
                'iname': qc['name'],
                'cby': conf_by,
                'dj': json.dumps(dj, ensure_ascii=False),
                'rid': r.id
            }
        )
    conn.commit()
    print(f"   -> Đã cập nhật xong {len(inp_rows)} bản ghi input_inspections!")

    # 3. Cập nhật deliveries.qc_receipt
    print("3. Cập nhật deliveries.qc_receipt...")
    deliv_rows = conn.execute(text("SELECT id, receiving_stage FROM deliveries")).fetchall()
    for r in deliv_rows:
        qc = pick_qc(r.receiving_stage)
        conn.execute(
            text("UPDATE deliveries SET qc_receipt = :qcr WHERE id = :rid"),
            {'qcr': qc['id'], 'rid': r.id}
        )
    conn.commit()
    print(f"   -> Đã cập nhật xong {len(deliv_rows)} bản ghi deliveries!")

print("=" * 90)
print("✅ HOÀN TẤT KHÓA CHẶT 100% CÔNG ĐOẠN <-> PHÒNG BAN CHUYÊN MÔN!")
print("=" * 90)
