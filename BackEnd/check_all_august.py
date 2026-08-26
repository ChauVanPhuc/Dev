import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text, inspect

print("=" * 80)
print("KIỂM TRA CHI TIẾT TẤT CẢ CÁC BẢNG BÀN GIAO & KIỂM TRA TRONG CSDL (THÁNG 8)")
print("=" * 80)

insp = inspect(engine)
all_tables = sorted(insp.get_table_names())

# Danh sách tất cả các bảng cần quét
tables_to_check = [
    # Bàn giao / Giao hàng / Vận chuyển
    'deliveries', 'delivery_details', 'delivery_qc', 'delivery_returns',
    'pallet_cards', 'container_shipments', 'orders', 'order_items', 'product_plans',
    'purchase_requisitions', 'purchase_order_items', 'mobile_daily_plans',
    # Kiểm tra chất lượng / Thiết bị / Biên bản
    'equipment_inspections', 'input_inspections', 'stage_inspections',
    'daily_inspection_records', 'daily_inspection_defects',
    'inspection_guides', 'inspection_guide_assignments',
    'capas', 'capa_evaluations', 'capa_occurrences',
    'kpis', 'kpi_violations', 'kpi_checklists', 'kpi_feedbacks',
    'customer_claims', 'client_defects', 'user_defect_trackings',
    'machine_maintenances', 'quick_reports'
]

results = {}

with engine.connect() as conn:
    for t in tables_to_check:
        if t not in all_tables:
            continue
            
        cols = [c['name'] for c in insp.get_columns(t)]
        date_cols = [c for c in cols if any(k in c.lower() for k in ['date', 'time', 'created', 'at', 'ngay', 'handover', 'delivery', 'inspect'])]
        
        total_rows = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
        
        # Query toàn bộ rows
        rows = conn.execute(text(f"SELECT * FROM {t}")).mappings().fetchall()
        
        aug_records = []
        for r in rows:
            r_dict = dict(r)
            is_aug = False
            aug_fields = {}
            for col, val in r_dict.items():
                if val is not None:
                    val_str = str(val)
                    # Check month 8 in ISO (YYYY-08-DD), slash (DD/08/YYYY or MM/DD/YYYY), or month name
                    if any(p in val_str for p in ['-08-', '/08/', '2026-08', '2025-08', '2024-08', 'August', 'tháng 8', 'Tháng 8']):
                        is_aug = True
                        aug_fields[col] = val_str
            
            if is_aug:
                aug_records.append({'data': r_dict, 'matched_dates': aug_fields})
        
        results[t] = {
            'total': total_rows,
            'august_count': len(aug_records),
            'records': aug_records
        }

print("\n--- BÁO CÁO THỐNG KÊ TỪNG BẢNG ---")
has_august_data = False

for table_name, info in results.items():
    if info['august_count'] > 0:
        has_august_data = True
        print(f"\n🟢 BẢNG: {table_name.upper()} (Tổng: {info['total']} | Tháng 8: {info['august_count']} bản ghi)")
        for idx, item in enumerate(info['records']):
            rec = item['data']
            dates = item['matched_dates']
            print(f"  [{idx+1}] Ngày tháng: {dates}")
            # Lọc các trường quan trọng
            summary = {k: v for k, v in rec.items() if v is not None and any(sub in k.lower() for sub in ['id', 'code', 'name', 'title', 'status', 'type', 'product', 'qty', 'quantity', 'note', 'desc', 'sender', 'receiver', 'user', 'stage', 'factory'])}
            print(f"      Thông tin: {summary}")
    else:
        if info['total'] > 0:
            print(f"⚪ Bảng '{table_name}': Có {info['total']} bản ghi nhưng KHÔNG có bản ghi nào trong Tháng 8.")
        else:
            print(f"⚪ Bảng '{table_name}': Bảng rỗng (0 bản ghi).")

print("\n" + "=" * 80)
if not has_august_data:
    print("KẾT LUẬN: Trong CSDL hiện tại KHÔNG CÓ bất kỳ phiếu bàn giao hay phiếu kiểm tra nào thuộc Tháng 8.")
else:
    total_aug = sum(v['august_count'] for v in results.values())
    print(f"KẾT LUẬN: Tổng cộng tìm thấy {total_aug} bản ghi thuộc Tháng 8.")
print("=" * 80)
