import sys, io, random, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

print("=" * 90)
print("TIẾN HÀNH TÁI TẠO DỮ LIỆU BÀN GIAO: CHỈ THÁNG 6 & THÁNG 7 (TRẢI ĐỀU 100% CÁC NGÀY)")
print("=" * 90)

# Cấu hình nhân sự chuẩn xác theo ma trận: CHỈ CÓ 6 CÔNG NHÂN BÀN GIAO
FACTORY_STAFF = {
    1: {
        'name': 'Vaniti Phân Xưởng 1',
        'suffix': '1',
        'worker_wood': 44,    # Nguyễn Thị Thu Thủy (Công Nhân)
        'worker_finish': 45,  # Bùi Thị Tình (Công Nhân)
        'qc_iqc': 27,         # Đặng Quý Hải (QC IQC)
        'qc_factory': [5, 26] # Ngô Diễm My, Đặng Văn Nam (QC)
    },
    2: {
        'name': 'Vaniti Phân Xưởng 2',
        'suffix': '2',
        'worker_wood': 46,    # Đỗ Thị Kim Hiền (Công Nhân)
        'worker_finish': 47,  # Huỳnh Thị Diễm Trinh (Công Nhân)
        'qc_iqc': 27,         # Đặng Quý Hải (QC IQC)
        'qc_factory': [38]    # Dương Thị Lệ Uyên (QC)
    },
    3: {
        'name': 'Furniture nhà máy 3',
        'suffix': '3',
        'worker_wood': 48,    # Bùi Hồng Hạnh (Công Nhân)
        'worker_finish': 49,  # Huỳnh Thị Diễm Lài (Công Nhân)
        'qc_iqc': 27,         # Đặng Quý Hải (QC IQC)
        'qc_factory': [37]    # Hà Minh Xuân (QC)
    }
}

STAGE_ROUTES = [
    {'from': 'Nhập Kho', 'to': 'Tạo Phôi', 'worker_from': 'wood', 'worker_to': 'wood', 'is_iqc': True, 'weight': 6},
    {'from': 'Tạo Phôi', 'to': 'Định Hình', 'worker_from': 'wood', 'worker_to': 'wood', 'is_iqc': False, 'weight': 18},
    {'from': 'Định Hình', 'to': 'Lắp Ráp', 'worker_from': 'wood', 'worker_to': 'wood', 'is_iqc': False, 'weight': 20},
    {'from': 'Lắp Ráp', 'to': 'Sơn', 'worker_from': 'wood', 'worker_to': 'finish', 'is_iqc': False, 'weight': 20},
    {'from': 'Sơn', 'to': 'Đóng Gói', 'worker_from': 'finish', 'worker_to': 'finish', 'is_iqc': False, 'weight': 19},
    {'from': 'Đóng Gói', 'to': 'Lưu Kho', 'worker_from': 'finish', 'worker_to': 'finish', 'is_iqc': False, 'weight': 17}
]

PART_TEMPLATES = [
    ('Mặt bàn gỗ sồi tự nhiên', '20*800*1600 mm', 'Gỗ Sồi (Oak) nhập khẩu'),
    ('Tấm vách hông bên trái', '17*450*780 mm', 'MDF chống ẩm phủ Melamine'),
    ('Tấm vách hông bên phải', '17*450*780 mm', 'MDF chống ẩm phủ Melamine'),
    ('Cánh tủ vát cạnh soi chỉ', '18*400*650 mm', 'Gỗ Tần Bì tự nhiên'),
    ('Tấm ván đáy tủ liên kết', '15*450*1200 mm', 'Ván ép Plywood phủ Veneer'),
    ('Khung chân sắt hộp sơn tĩnh điện', '40*40*720 mm', 'Thép mạ kẽm sơn nhám'),
    ('Cụm chân gỗ tròn vót nhọn', 'D50*720 mm', 'Gỗ Cao su tự nhiên sấy'),
    ('Thanh giằng ngang chịu lực', '25*50*1400 mm', 'Gỗ Tràm ghép thanh'),
    ('Mặt hộc kéo ngăn trên', '16*180*550 mm', 'Gỗ Thông New Zealand'),
    ('Bộ xốp bọc màng PE chống xước', '1800*500*800 mm', 'Xốp Foam 10mm + PE'),
    ('Tấm ngăn chia đợt tầng tủ', '17*400*750 mm', 'MDF phủ Melamine 2 mặt'),
    ('Thanh nẹp chỉ gỗ viền bo', '10*25*2000 mm', 'Gỗ Sồi xẻ phôi tinh'),
    ('Thùng carton 5 lớp xuất khẩu', '600*450*850 mm', 'Carton sóng BC cứng'),
    ('Khung xương giường chịu lực', '30*60*1950 mm', 'Gỗ Dầu / Gỗ Keo sấy khô')
]

LIGHT_DEFECTS = [
    "Trầy xước nhẹ góc cạnh 1-2mm",
    "Bám bụi bề mặt sơn chưa lau sạch",
    "Lệch đường keo dán mép 0.5mm",
    "Vết lõm nông trên bề mặt gỗ thô",
    "Màu sơn hơi nhạt mép viền trong",
    "Xước nhẹ màng bọc PE bên ngoài"
]

HEAVY_DEFECTS = [
    "Nứt vỡ kết cấu mộng âm dương",
    "Sai kích thước bản vẽ vượt quá dung sai 3mm",
    "Bong tróc màng sơn diện rộng mặt tiền",
    "Cong vênh bề mặt ván quá tiêu chuẩn",
    "Thủng rách thùng bao bì bảo vệ",
    "Lỗi tim lỗ khoan liên kết lệch tâm"
]

with engine.connect() as conn:
    print("1. Xóa sạch dữ liệu bàn giao cũ...")
    conn.execute(text("DELETE FROM delivery_details"))
    try: conn.execute(text("DELETE FROM delivery_images"))
    except: pass
    try: conn.execute(text("DELETE FROM delivery_returns"))
    except: pass
    del_count = conn.execute(text("DELETE FROM deliveries")).rowcount
    print(f"   -> Đã dọn sạch {del_count} phiếu bàn giao cũ.")
    conn.commit()

    # Lấy danh sách orders & plans hiện có
    order_rows = conn.execute(text("SELECT id, order_code, production_code, customer FROM orders")).fetchall()
    orders_list = [dict(r._mapping) for r in order_rows]

    plan_rows = conn.execute(text("SELECT id, code, name FROM product_plans")).fetchall()
    plans_list = [dict(r._mapping) for r in plan_rows]

    # CẤU HÌNH: CHỈ CÓ THÁNG 6 & THÁNG 7 (KHÔNG CÓ THÁNG 5 VÀ THÁNG 8)
    MONTH_TARGETS = [
        {'month': 6, 'year': 2026, 'target': 5021, 'days': 30},
        {'month': 7, 'year': 2026, 'target': 5530, 'days': 31}
    ]

    all_deliveries_data = []

    print("\n2. Sinh dữ liệu bàn giao trải đều từng ngày trong Tháng 6 & Tháng 7...")

    for mt in MONTH_TARGETS:
        m = mt['month']
        y = mt['year']
        target = mt['target']
        days_in_month = mt['days']

        print(f"   * Đang sinh Tháng {m}/{y}: Đúng {target} phiếu (phân bổ đều {days_in_month} ngày)...")

        # Phân bổ số lượng phiếu đều cho từng ngày trong tháng
        base_per_day = target // days_in_month
        remainder = target % days_in_month

        day_counts = [base_per_day + (1 if d < remainder else 0) for d in range(days_in_month)]

        month_records = []

        for day_idx, daily_count in enumerate(day_counts):
            day = day_idx + 1 # Ngày từ 1 đến 30 hoặc 31

            for _ in range(daily_count):
                # Giờ làm việc: 7:30 đến 17:30
                hour = random.randint(7, 17)
                minute = random.randint(0, 59)
                second = random.randint(0, 59)
                created_dt = datetime.datetime(y, m, day, hour, minute, second)

                # Chọn nhà máy theo tỷ lệ: PX1 (40%), PX2 (35%), NM3 (25%)
                fac_id = random.choices([1, 2, 3], weights=[40, 35, 25])[0]
                f_cfg = FACTORY_STAFF[fac_id]
                f_suffix = f_cfg['suffix']

                # Chọn tuyến công đoạn theo trọng số
                route_choice = random.choices(STAGE_ROUTES, weights=[r['weight'] for r in STAGE_ROUTES])[0]
                d_stage = f"{route_choice['from']} {f_suffix}" if route_choice['from'] != 'Nhập Kho' else f"Nhập Kho {f_suffix}"
                r_stage = f"{route_choice['to']} {f_suffix}"

                # Gán đúng CÔNG NHÂN
                worker_deliv_id = f_cfg['worker_wood'] if route_choice['worker_from'] == 'wood' else f_cfg['worker_finish']
                worker_rec_id = f_cfg['worker_wood'] if route_choice['worker_to'] == 'wood' else f_cfg['worker_finish']

                # Gán đúng NHÂN VIÊN QC
                if route_choice['is_iqc']:
                    qc_id = f_cfg['qc_iqc'] # Đặng Quý Hải
                else:
                    qc_id = random.choice(f_cfg['qc_factory'])

                # Chọn chi tiết / linh kiện
                part_tmpl = random.choice(PART_TEMPLATES)
                part_name = part_tmpl[0]
                spec = part_tmpl[1]

                # Số lượng bàn giao: 50 -> 500
                qty_total = random.choice([50, 80, 100, 120, 150, 200, 250, 300, 350, 400, 450, 500, 600])

                # Quy tắc tính lỗi & Trạng thái:
                # 85% Không lỗi, 10% Lỗi ít (Hoàn thành), 5% Lỗi nhiều (Trả lại)
                error_rand = random.random()

                if error_rand < 0.85:
                    # Không lỗi
                    qty_error = 0
                    qty_rec = qty_total
                    qty_ret = 0
                    status = 'Hoàn thành'
                    note = f"Bàn giao đủ {qty_total} cái đạt chuẩn chất lượng"
                elif error_rand < 0.95:
                    # Lỗi ít (1 -> 5 cái, và < 5% qty_total)
                    max_light = min(5, max(1, int(qty_total * 0.04)))
                    qty_error = random.randint(1, max_light)
                    qty_rec = qty_total - qty_error
                    qty_ret = 0
                    status = 'Hoàn thành'
                    note = f"Chấp nhận nhập kho trừ {qty_error} cái lỗi nhẹ: {random.choice(LIGHT_DEFECTS)}"
                else:
                    # Lỗi nhiều (10 -> 50 cái, và < 9% qty_total)
                    max_heavy = min(50, max(10, int(qty_total * 0.09)))
                    min_heavy = min(10, max(5, int(qty_total * 0.04)))
                    qty_error = random.randint(min_heavy, max(min_heavy, max_heavy))
                    qty_rec = 0
                    qty_ret = qty_total
                    status = 'Trả lại'
                    note = f"Từ chối nhận hàng do phát hiện {qty_error} cái lỗi nghiêm trọng: {random.choice(HEAVY_DEFECTS)}"

                # Đảm bảo RÀNG BUỘC VÀNG: qty_error LUÔN < 10% qty_total
                if qty_error >= qty_total * 0.10:
                    qty_error = int(qty_total * 0.08)

                # Map order & plan nếu có
                ord_item = random.choice(orders_list) if orders_list else {}
                plan_item = random.choice(plans_list) if plans_list else {}

                month_records.append({
                    'delivery_stage': d_stage,
                    'receiving_stage': r_stage,
                    'note': note,
                    'created_at': created_dt,
                    'residual': 0,
                    'status': status,
                    'plan_id': plan_item.get('id'),
                    'sx_delivery': worker_deliv_id,
                    'qc_receipt': qc_id,
                    'sx_receipt': worker_rec_id,
                    'part_name': part_name,
                    'specification': spec,
                    'order_id': ord_item.get('id'),
                    'backup_qr': f"DEL-{y}{m:02d}-{random.randint(100000, 999999)}",
                    'quantity_total': qty_total,
                    'quantity_received': qty_rec,
                    'quantity_error': qty_error,
                    'quantity_returned': qty_ret,
                    'quantity_inspection': qty_total,
                    'moisture_min': round(random.uniform(8.5, 10.0), 1),
                    'moisture_max': round(random.uniform(10.5, 12.5), 1)
                })

        # Sắp xếp theo thời gian tăng dần
        month_records.sort(key=lambda x: x['created_at'])
        all_deliveries_data.extend(month_records)

    # Chèn dữ liệu theo batch 1000 records
    print(f"\n3. Đang lưu {len(all_deliveries_data)} phiếu bàn giao vào CSDL SQL Server...")
    batch_size = 1000
    for i in range(0, len(all_deliveries_data), batch_size):
        batch = all_deliveries_data[i:i+batch_size]
        conn.execute(
            text("""
                INSERT INTO deliveries (
                    delivery_stage, receiving_stage, note, created_at, residual,
                    status, plan_id, sx_delivery, qc_receipt, sx_receipt,
                    part_name, specification, order_id, backup_qr, quantity_total,
                    quantity_received, quantity_error, quantity_returned,
                    quantity_inspection, moisture_min, moisture_max
                ) VALUES (
                    :delivery_stage, :receiving_stage, :note, :created_at, :residual,
                    :status, :plan_id, :sx_delivery, :qc_receipt, :sx_receipt,
                    :part_name, :specification, :order_id, :backup_qr, :quantity_total,
                    :quantity_received, :quantity_error, :quantity_returned,
                    :quantity_inspection, :moisture_min, :moisture_max
                )
            """),
            batch
        )
        print(f"   -> Đã chèn {min(i + batch_size, len(all_deliveries_data))}/{len(all_deliveries_data)} bản ghi...")

    conn.commit()
    print("✅ HOÀN TẤT CHÈN 100% DỮ LIỆU BÀN GIAO THÁNG 6 & THÁNG 7 VÀO CSDL!")

print("=" * 90)
