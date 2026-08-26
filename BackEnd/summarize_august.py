import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text, inspect

print("=" * 90)
print("CHI TIẾT TOÀN BỘ PHIẾU BÀN GIAO & PHIẾU KIỂM TRA TRONG THÁNG 8/2026")
print("=" * 90)

with engine.connect() as conn:
    # 1. Phiếu kiểm tra chất lượng / đầu vào (input_inspections)
    input_insp = conn.execute(text("SELECT id, ticket_code, pallet_code, part_name, product_sku, stage, inspection_type, sample_qty, error_qty, inspector_name, inspected_at FROM input_inspections WHERE MONTH(inspected_at) = 8 AND YEAR(inspected_at) = 2026 ORDER BY inspected_at DESC")).fetchall()
    print(f"\n📋 1. PHIẾU KIỂM TRA ĐẦU VÀO / CÔNG ĐOẠN (input_inspections): Có {len(input_insp)} phiếu")
    for idx, r in enumerate(input_insp):
        d = dict(r._mapping)
        status_text = f"❌ LỖI ({d['error_qty']}/{d['sample_qty']})" if (d['error_qty'] or 0) > 0 else f"✅ ĐẠT ({d['sample_qty']})"
        print(f"  [{idx+1}] Mã phiếu: {d['ticket_code']} | Pallet: {d['pallet_code']} | Chi tiết/Sản phẩm: {d['part_name'] or d['product_sku']} | Công đoạn: {d['stage']} | Loại KT: {d['inspection_type']} | Kết quả: {status_text} | Người KT: {d['inspector_name']} | Thời gian: {d['inspected_at']}")

    # 2. Phiếu bàn giao giữa các công đoạn (deliveries)
    deliv = conn.execute(text("SELECT id, plan_id, order_id, part_name, specification, delivery_stage, receiving_stage, quantity_total, quantity_received, quantity_error, quantity_returned, status, created_at FROM deliveries WHERE MONTH(created_at) = 8 AND YEAR(created_at) = 2026 ORDER BY created_at DESC")).fetchall()
    print(f"\n📦 2. PHIẾU BÀN GIAO CÔNG ĐOẠN (deliveries): Có {len(deliv)} phiếu")
    if deliv:
        for idx, r in enumerate(deliv):
            d = dict(r._mapping)
            print(f"  [{idx+1}] ID: {d['id']} | Chi tiết: {d['part_name']} ({d['specification']}) | Từ: {d['delivery_stage']} -> Đến: {d['receiving_stage']} | Tổng SL: {d['quantity_total']} | Đã nhận: {d['quantity_received']} | Lỗi: {d['quantity_error']} | Trạng thái: {d['status']} | Ngày tạo: {d['created_at']}")
    else:
        print("  -> Không có phiếu bàn giao công đoạn nào trong tháng 8/2026.")

    # 3. Thẻ Pallet (pallet_cards)
    pallets = conn.execute(text("SELECT id, pallet_code, product_code, detail_name, quantity_plan, quantity_actual, customer_name, created_at FROM pallet_cards WHERE MONTH(created_at) = 8 AND YEAR(created_at) = 2026 ORDER BY created_at DESC")).fetchall()
    print(f"\n🏷️ 3. THẺ PALLET (pallet_cards): Có {len(pallets)} thẻ")
    for idx, r in enumerate(pallets):
        d = dict(r._mapping)
        print(f"  [{idx+1}] Mã Pallet: {d['pallet_code']} | Mã SP: {d['product_code']} | Chi tiết: {d['detail_name']} | Kế hoạch: {d['quantity_plan']} | Thực tế: {d['quantity_actual']} | Khách hàng: {d['customer_name']} | Ngày tạo: {d['created_at']}")

print("\n" + "=" * 90)
