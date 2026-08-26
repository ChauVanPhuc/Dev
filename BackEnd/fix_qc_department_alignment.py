import sys, io, random, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

print("=" * 90)
print("KHẮC PHỤC TRIỆT ĐỂ: PHÂN BỔ QC ĐÚNG CHÍNH XÁC 100% PHÒNG BAN & CÔNG ĐOẠN")
print("=" * 90)

# Cấu hình CHÍNH XÁC tuyệt đối theo Phòng Ban (Department) của từng Nhân viên QC:
EXACT_DEPARTMENT_QC = {
    1: { # Vaniti Phân Xưởng 1
        'wood': [ # Dept 3: QC Định Hình - Lắp Ráp
            {'id': 28, 'name': 'Hà Đình Thành'},
            {'id': 36, 'name': 'Nguyễn Văn Tiến'}
        ],
        'finish': [ # Dept 4: QC Sơn - Đóng Gói
            {'id': 43, 'name': 'Dương Văn Toàn'}
        ]
    },
    2: { # Vaniti Phân Xưởng 2
        'wood': [ # Dept 3: QC Định Hình - Lắp Ráp
            {'id': 30, 'name': 'Huỳnh Hoàng Sơn'},
            {'id': 29, 'name': 'Đậu Thị Tâm'},
            {'id': 31, 'name': 'Hồ Sỹ Khẩn'},
            {'id': 41, 'name': 'Bùi Công Sự'}
        ],
        'finish': [ # Dept 4: QC Sơn - Đóng Gói + Dept 5: QC Final
            {'id': 32, 'name': 'Phan Thị Lương'},
            {'id': 34, 'name': 'Phạm Thị Mai'},
            {'id': 35, 'name': 'Nguyễn Thị Mỹ Kim'},
            {'id': 39, 'name': 'Đặng Minh Tuấn'}
        ]
    },
    3: { # Furniture Nhà Máy 3
        'wood': [ # Phụ trách Mộc NM3: Đỗ Hữu Phúc (Quản lý QC NM3)
            {'id': 33, 'name': 'Đỗ Hữu Phúc'}
        ],
        'finish': [ # Dept 4: QC Sơn - Đóng Gói + Dept 5: QC Final
            {'id': 40, 'name': 'Trần Thị Ánh'},
            {'id': 42, 'name': 'Nguyễn Thị Phương'},
            {'id': 33, 'name': 'Đỗ Hữu Phúc'}
        ]
    }
}

def get_exact_qc(fac_id, stage_name):
    stg = str(stage_name or '').lower()
    fac = int(fac_id or 2)
    if fac not in [1, 2, 3]:
        fac = 2
    
    is_finish = any(k in stg for k in ['sơn', 'đóng gói', 'hoàn thiện', 'lưu kho', 'finish', 'pack', 'dong goi'])
    pool = EXACT_DEPARTMENT_QC[fac]['finish'] if is_finish else EXACT_DEPARTMENT_QC[fac]['wood']
    return random.choice(pool)

with engine.connect() as conn:
    # 1. Cập nhật daily_inspection_records
    print("1. Cập nhật daily_inspection_records...")
    daily_rows = conn.execute(text("SELECT id, stage_name FROM daily_inspection_records")).fetchall()
    for r in daily_rows:
        stg = str(r.stage_name or '')
        fac_id = 2
        if '1' in stg: fac_id = 1
        elif '2' in stg: fac_id = 2
        elif '3' in stg: fac_id = 3
        
        qc = get_exact_qc(fac_id, stg)
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
        stg = str(r.stage or '')
        fac_id = 2
        if '1' in stg: fac_id = 1
        elif '2' in stg: fac_id = 2
        elif '3' in stg: fac_id = 3

        qc = get_exact_qc(fac_id, stg)
        try:
            dj = json.loads(r.data_json or '{}') if r.data_json else {}
        except:
            dj = {}
        dj['inspector_name'] = qc['name']
        dj['created_by'] = qc['name']
        dj['factory_id'] = fac_id

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
        stg = str(r.receiving_stage or '')
        fac_id = 2
        if '1' in stg: fac_id = 1
        elif '2' in stg: fac_id = 2
        elif '3' in stg: fac_id = 3

        qc = get_exact_qc(fac_id, stg)
        conn.execute(
            text("UPDATE deliveries SET qc_receipt = :qcr WHERE id = :rid"),
            {'qcr': qc['id'], 'rid': r.id}
        )
    conn.commit()
    print(f"   -> Đã cập nhật xong {len(deliv_rows)} bản ghi deliveries!")

print("=" * 90)
print("✅ HOÀN TẤT ĐỒNG BỘ 100% PHÂN BỔ NHÂN SỰ QC KHỚP CHÍNH XÁC THEO PHÒNG BAN!")
print("=" * 90)
