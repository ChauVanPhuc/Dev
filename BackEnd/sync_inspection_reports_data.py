import sys, io, random, datetime, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

print("=" * 90)
print("ĐỒNG BỘ TOÀN DIỆN DỮ LIỆU BÁO CÁO KIỂM TRA CHO TRANG /admin/reports")
print("=" * 90)

# Cấu hình QC chuyên trách theo nhà máy và loại kiểm tra
QC_STAFF = {
    'iqc': {'id': 27, 'name': 'Đặng Quý Hải'},
    'px1': [
        {'id': 5, 'name': 'Ngô Diễm My'},
        {'id': 26, 'name': 'Đặng Văn Nam'}
    ],
    'px2': [
        {'id': 38, 'name': 'Dương Thị Lệ Uyên'}
    ],
    'nm3': [
        {'id': 37, 'name': 'Hà Minh Xuân'}
    ]
}

INSPECTION_TYPE_WEIGHTS = [
    ('cong-doan', 'Kiểm tra công đoạn', 35),
    ('dau-vao', 'Kiểm tra đầu vào (IQC)', 20),
    ('quy-trinh', 'Kiểm tra quy trình (IPQC)', 15),
    ('mau-dau-tien', 'Kiểm tra mẫu đầu tiên (FAI)', 10),
    ('bam-dinh', 'Kiểm tra độ bám dính sơn', 8),
    ('sau-dong-goi', 'Kiểm tra sau đóng gói (OQC)', 7),
    ('do-am', 'Kiểm tra độ ẩm gỗ', 5)
]

STAGES_BY_FACTORY = {
    1: ['Tạo Phôi 1', 'Định Hình 1', 'Lắp Ráp 1', 'Sơn 1', 'Đóng Gói 1'],
    2: ['Tạo Phôi 2', 'Định Hình 2', 'Lắp Ráp 2', 'Sơn 2', 'Đóng Gói 2'],
    3: ['Tạo Phôi 3', 'Định Hình 3', 'Lắp Ráp 3', 'Sơn 3', 'Đóng Gói 3']
}

with engine.connect() as conn:
    # 1. Lấy danh sách Orders, Products & Plans thực tế
    orders = conn.execute(text("SELECT id, order_code, customer FROM orders")).fetchall()
    orders_list = [dict(o._mapping) for o in orders]

    products = conn.execute(text("SELECT id, sku, name, specification, order_id FROM products")).fetchall()
    prod_list = [dict(p._mapping) for p in products]

    plans = conn.execute(text("SELECT id, code, name FROM product_plans")).fetchall()
    plan_list = [dict(p._mapping) for p in plans]

    # 2. Xóa sạch dữ liệu cũ trong input_inspections
    conn.execute(text("DELETE FROM input_inspections"))
    print("1. Đã dọn sạch dữ liệu cũ trong input_inspections.")
    conn.commit()

    # 3. Tạo dữ liệu kiểm tra chuẩn cho Tháng 6 (khoảng 650 phiếu) & Tháng 7 (khoảng 750 phiếu)
    MONTH_TARGETS = [
        {'month': 6, 'year': 2026, 'target': 650, 'days': 30},
        {'month': 7, 'year': 2026, 'target': 750, 'days': 31}
    ]

    all_inspections = []
    ticket_counter = 1000

    print("\n2. Đang tạo dữ liệu kiểm tra chuẩn hóa cho Tháng 6 & Tháng 7...")

    for mt in MONTH_TARGETS:
        m = mt['month']
        y = mt['year']
        target = mt['target']
        days_in_month = mt['days']

        base_per_day = target // days_in_month
        remainder = target % days_in_month
        daily_counts = [base_per_day + (1 if d < remainder else 0) for d in range(days_in_month)]

        for day_idx, d_cnt in enumerate(daily_counts):
            day = day_idx + 1

            for _ in range(d_cnt):
                ticket_counter += 1
                ticket_code = f"INS-{y}{m:02d}-{ticket_counter}"
                pallet_code = f"PAL-{random.randint(100, 999)}-{random.randint(10, 99)}"

                hour = random.randint(7, 17)
                minute = random.randint(0, 59)
                second = random.randint(0, 59)
                inspected_dt = datetime.datetime(y, m, day, hour, minute, second)

                # Chọn loại kiểm tra
                insp_type = random.choices(
                    [t[0] for t in INSPECTION_TYPE_WEIGHTS],
                    weights=[t[2] for t in INSPECTION_TYPE_WEIGHTS]
                )[0]

                # Chọn nhà máy: PX1 (40%), PX2 (35%), NM3 (25%)
                fac_id = random.choices([1, 2, 3], weights=[40, 35, 25])[0]
                stage_name = random.choice(STAGES_BY_FACTORY[fac_id])

                # Gán người kiểm tra QC
                if insp_type in ['dau-vao', 'nhap-kho']:
                    inspector = QC_STAFF['iqc']
                elif fac_id == 1:
                    inspector = random.choice(QC_STAFF['px1'])
                elif fac_id == 2:
                    inspector = random.choice(QC_STAFF['px2'])
                else:
                    inspector = random.choice(QC_STAFF['nm3'])

                # Chọn Order & Product
                ord_item = random.choice(orders_list) if orders_list else {'id': 1, 'order_code': 'APT-0041-01'}
                batch_no = ord_item['order_code']

                prod_item = random.choice(prod_list) if prod_list else {'sku': 'FOL7000001558', 'name': 'Chi tiết ghế bàn', 'specification': '18x450x800mm'}
                product_sku = prod_item['sku']
                part_name = prod_item['name']
                specification = prod_item.get('specification') or 'Quy cách chuẩn tiêu chuẩn xuất khẩu'

                plan_item = random.choice(plan_list) if plan_list else {'id': 1}

                # Số lượng kiểm tra
                required_qty = random.choice([100, 150, 200, 250, 300, 400, 500])
                sample_qty = max(5, int(required_qty * random.uniform(0.05, 0.15)))

                # Kết quả Đạt / Lỗi: 94% Đạt, 6% Lỗi
                is_pass = random.random() < 0.94
                if is_pass:
                    conclusion = 'pass'
                    result_text = 'Đạt'
                    error_qty = 0
                    note = "Kiểm tra kích thước, ngoại quan và độ hoàn thiện đạt chuẩn chất lượng."
                else:
                    conclusion = 'fail'
                    result_text = 'Không đạt'
                    error_qty = random.randint(1, min(5, sample_qty))
                    note = f"Phát hiện {error_qty} chi tiết chưa đạt quy cách (lệch kích thước / bám bụi / lỗi mộng)."

                # Trạng thái xác nhận: 98% đã xác nhận
                is_conf = random.random() < 0.98
                conf_at = inspected_dt + datetime.timedelta(hours=random.randint(1, 4)) if is_conf else None
                conf_by = inspector['id'] if is_conf else None

                all_inspections.append({
                    'ticket_code': ticket_code,
                    'pallet_code': pallet_code,
                    'plan_id': plan_item['id'],
                    'batch_no': batch_no,
                    'product_sku': product_sku,
                    'part_name': part_name,
                    'specification': specification,
                    'cont_name': f"Lô {random.randint(1, 10):02d}",
                    'stage': stage_name,
                    'inspection_type': insp_type,
                    'inspector_id': inspector['id'],
                    'inspector_name': inspector['name'],
                    'inspected_at': inspected_dt,
                    'created_at': inspected_dt,
                    'measured_length': round(random.uniform(500, 1800), 1),
                    'measured_width': round(random.uniform(300, 900), 1),
                    'measured_height': round(random.uniform(15, 80), 1),
                    'required_qty': required_qty,
                    'sample_qty': sample_qty,
                    'error_qty': error_qty,
                    'conclusion': conclusion,
                    'result': result_text,
                    'note': note,
                    'is_confirmed': is_conf,
                    'confirmed_at': conf_at,
                    'confirmed_by': conf_by,
                    'data_json': json.dumps({
                        'inspector_name': inspector['name'],
                        'factory_id': fac_id,
                        'stage': stage_name,
                        'batch_no': batch_no,
                        'product_sku': product_sku,
                        'created_by': inspector['name']
                    })
                })

    # Chèn dữ liệu vào input_inspections theo batch
    print(f"\n3. Đang chèn {len(all_inspections)} phiếu kiểm tra chuẩn vào CSDL...")
    batch_size = 500
    for i in range(0, len(all_inspections), batch_size):
        batch = all_inspections[i:i+batch_size]
        conn.execute(
            text("""
                INSERT INTO input_inspections (
                    ticket_code, pallet_code, plan_id, batch_no, product_sku,
                    part_name, specification, cont_name, stage, inspection_type,
                    inspector_id, inspector_name, inspected_at, created_at,
                    measured_length, measured_width, measured_height,
                    required_qty, sample_qty, error_qty, conclusion, result,
                    note, is_confirmed, confirmed_at, confirmed_by, data_json
                ) VALUES (
                    :ticket_code, :pallet_code, :plan_id, :batch_no, :product_sku,
                    :part_name, :specification, :cont_name, :stage, :inspection_type,
                    :inspector_id, :inspector_name, :inspected_at, :created_at,
                    :measured_length, :measured_width, :measured_height,
                    :required_qty, :sample_qty, :error_qty, :conclusion, :result,
                    :note, :is_confirmed, :confirmed_at, :confirmed_by, :data_json
                )
            """),
            batch
        )
    conn.commit()
    print(f"   -> Đã chèn thành công {len(all_inspections)} phiếu vào input_inspections.")

    # 4. Cập nhật daily_inspection_records về đúng 5 QC
    print("\n4. Cập nhật người kiểm tra trong daily_inspection_records về 5 nhân sự QC...")
    records = conn.execute(text("SELECT id, stage_name FROM daily_inspection_records")).fetchall()
    for r in records:
        r_id = r.id
        stg = str(r.stage_name or '')
        if '1' in stg:
            new_id = random.choice([5, 26]) # QC PX1
        elif '2' in stg:
            new_id = 38 # QC PX2
        elif '3' in stg:
            new_id = 37 # QC NM3
        else:
            new_id = 27 # IQC
        conn.execute(text("UPDATE daily_inspection_records SET inspector_id = :nid WHERE id = :rid"), {'nid': new_id, 'rid': r_id})
    conn.commit()
    print(f"   -> Đã cập nhật xong {len(records)} bản ghi daily_inspection_records!")

print("=" * 90)
print("✅ HOÀN TẤT ĐỒNG BỘ 100% DỮ LIỆU BÁO CÁO KIỂM TRA!")
print("=" * 90)
