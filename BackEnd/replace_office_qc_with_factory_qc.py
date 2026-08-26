import sys, io, random, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

print("=" * 90)
print("THAY THẾ TOÀN BỘ NHÂN SỰ QC VĂN PHÒNG SANG QC TRỰC TIẾP TẠI 3 PHÂN XƯỞNG")
print("=" * 90)

FACTORY_QC = {
    1: { # Vaniti Phân Xưởng 1
        'wood': [
            {'id': 28, 'name': 'Hà Đình Thành'},
            {'id': 36, 'name': 'Nguyễn Văn Tiến'}
        ],
        'finish': [
            {'id': 43, 'name': 'Dương Văn Toàn'}
        ]
    },
    2: { # Vaniti Phân Xưởng 2
        'wood': [
            {'id': 30, 'name': 'Huỳnh Hoàng Sơn'},
            {'id': 29, 'name': 'Đậu Thị Tâm'},
            {'id': 31, 'name': 'Hồ Sỹ Khẩn'},
            {'id': 41, 'name': 'Bùi Công Sự'}
        ],
        'finish': [
            {'id': 32, 'name': 'Phan Thị Lương'},
            {'id': 34, 'name': 'Phạm Thị Mai'},
            {'id': 35, 'name': 'Nguyễn Thị Mỹ Kim'}
        ]
    },
    3: { # Furniture Nhà Máy 3
        'wood': [
            {'id': 40, 'name': 'Trần Thị Ánh'},
            {'id': 42, 'name': 'Nguyễn Thị Phương'},
            {'id': 33, 'name': 'Đỗ Hữu Phúc'}
        ],
        'finish': [
            {'id': 40, 'name': 'Trần Thị Ánh'},
            {'id': 42, 'name': 'Nguyễn Thị Phương'},
            {'id': 33, 'name': 'Đỗ Hữu Phúc'}
        ]
    }
}

def get_factory_qc(fac_id, stage_name):
    stg = str(stage_name or '').lower()
    fac = int(fac_id or 2)
    if fac not in [1, 2, 3]:
        fac = 2
    
    is_finish = any(k in stg for k in ['sơn', 'đóng gói', 'hoàn thiện', 'lưu kho', 'finish', 'pack'])
    pool = FACTORY_QC[fac]['finish'] if is_finish else FACTORY_QC[fac]['wood']
    return random.choice(pool)

with engine.connect() as conn:
    # -------------------------------------------------------------
    # 1. CẬP NHẬT INPUT_INSPECTIONS
    # -------------------------------------------------------------
    print("1. Cập nhật bảng input_inspections...")
    inp_rows = conn.execute(text("SELECT id, stage, data_json, is_confirmed FROM input_inspections")).fetchall()
    
    for r in inp_rows:
        r_id = r.id
        stg = str(r.stage or '')
        
        fac_id = 2
        if '1' in stg: fac_id = 1
        elif '2' in stg: fac_id = 2
        elif '3' in stg: fac_id = 3
        
        qc = get_factory_qc(fac_id, stg)

        try:
            curr_data = json.loads(r.data_json or '{}') if r.data_json else {}
        except:
            curr_data = {}
        
        curr_data['inspector_name'] = qc['name']
        curr_data['created_by'] = qc['name']
        curr_data['factory_id'] = fac_id

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
                'dj': json.dumps(curr_data, ensure_ascii=False),
                'rid': r_id
            }
        )
    conn.commit()
    print(f"   -> Đã cập nhật xong {len(inp_rows)} bản ghi input_inspections sang QC phân xưởng!")

    # -------------------------------------------------------------
    # 2. CẬP NHẬT DAILY_INSPECTION_RECORDS
    # -------------------------------------------------------------
    print("\n2. Cập nhật bảng daily_inspection_records...")
    daily_rows = conn.execute(text("SELECT id, stage_name FROM daily_inspection_records")).fetchall()
    
    for r in daily_rows:
        r_id = r.id
        stg = str(r.stage_name or '')
        
        fac_id = 2
        if '1' in stg: fac_id = 1
        elif '2' in stg: fac_id = 2
        elif '3' in stg: fac_id = 3

        qc = get_factory_qc(fac_id, stg)

        conn.execute(
            text("UPDATE daily_inspection_records SET inspector_id = :iid WHERE id = :rid"),
            {'iid': qc['id'], 'rid': r_id}
        )
    conn.commit()
    print(f"   -> Đã cập nhật xong {len(daily_rows)} bản ghi daily_inspection_records sang QC phân xưởng!")

    # -------------------------------------------------------------
    # 3. CẬP NHẬT DELIVERIES (QC_RECEIPT)
    # -------------------------------------------------------------
    print("\n3. Cập nhật trường qc_receipt trong bảng deliveries...")
    deliv_rows = conn.execute(text("SELECT id, receiving_stage FROM deliveries")).fetchall()

    for r in deliv_rows:
        r_id = r.id
        rec_stg = str(r.receiving_stage or '')

        fac_id = 2
        if '1' in rec_stg: fac_id = 1
        elif '2' in rec_stg: fac_id = 2
        elif '3' in rec_stg: fac_id = 3

        qc = get_factory_qc(fac_id, rec_stg)

        conn.execute(
            text("UPDATE deliveries SET qc_receipt = :qcr WHERE id = :rid"),
            {'qcr': qc['id'], 'rid': r_id}
        )
    conn.commit()
    print(f"   -> Đã cập nhật xong {len(deliv_rows)} bản ghi deliveries sang QC phân xưởng!")

print("=" * 90)
print("✅ HOÀN TẤT CHUYỂN ĐỔI 100% NHÂN SỰ QC VĂN PHÒNG SANG QC PHÂN XƯỞNG!")
print("=" * 90)
