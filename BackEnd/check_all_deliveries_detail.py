import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text, inspect

print("=" * 100)
print("BÁO CÁO TOÀN DIỆN VỀ TOÀN BỘ CÁC PHIẾU BÀN GIAO TRONG HỆ THỐNG")
print("=" * 100)

with engine.connect() as conn:
    # 1. Lấy danh sách tài khoản / nhân viên để map tên
    acc_map = {}
    try:
        accs = conn.execute(text("SELECT id, username, full_name, role_name, department_name, factory FROM accounts")).fetchall()
        for a in accs:
            d = dict(a._mapping)
            acc_map[d['id']] = d
    except Exception as e:
        print(f"Lỗi đọc accounts: {e}")

    # 2. Lấy danh sách orders & plans để map nhà máy / PO
    order_map = {}
    try:
        ords = conn.execute(text("SELECT id, po_code, customer_name, factory FROM orders")).fetchall()
        for o in ords:
            d = dict(o._mapping)
            order_map[d['id']] = d
    except Exception as e:
        print(f"Lỗi đọc orders: {e}")

    plan_map = {}
    try:
        plans = conn.execute(text("SELECT id, plan_code, product_name, factory, order_id FROM product_plans")).fetchall()
        for p in plans:
            d = dict(p._mapping)
            plan_map[d['id']] = d
    except Exception as e:
        print(f"Lỗi đọc plans: {e}")

    # 3. Lấy toàn bộ phiếu bàn giao trong bảng deliveries
    deliveries = conn.execute(text("SELECT * FROM deliveries ORDER BY created_at DESC, id DESC")).fetchall()
    total_deliv = len(deliveries)
    print(f"\n📦 TỔNG SỐ PHIẾU BÀN GIAO TRONG CSDL: {total_deliv} phiếu\n")

    if total_deliv == 0:
        print("-> Hiện tại trong CSDL không có phiếu bàn giao nào.")
    else:
        # Thống kê theo Công đoạn
        stage_stats = {}
        # Thống kê theo Người bàn giao
        deliverer_stats = {}
        # Thống kê theo Nhà máy
        factory_stats = {}
        # Thống kê theo Trạng thái
        status_stats = {}

        for r in deliveries:
            d = dict(r._mapping)
            
            # Người giao (sx_delivery)
            deliv_user = acc_map.get(d.get('sx_delivery'), {})
            deliv_user_name = deliv_user.get('full_name') or deliv_user.get('username') or f"User #{d.get('sx_delivery')}"
            
            # Người QC nhận (qc_receipt)
            qc_user = acc_map.get(d.get('qc_receipt'), {})
            qc_user_name = qc_user.get('full_name') or qc_user.get('username') or f"User #{d.get('qc_receipt')}" if d.get('qc_receipt') else "Chưa nhận"

            # Người SX nhận (sx_receipt)
            sx_user = acc_map.get(d.get('sx_receipt'), {})
            sx_user_name = sx_user.get('full_name') or sx_user.get('username') or f"User #{d.get('sx_receipt')}" if d.get('sx_receipt') else "Chưa nhận"

            # Tuyến công đoạn
            stage_route = f"{d.get('delivery_stage') or 'N/A'} -> {d.get('receiving_stage') or 'N/A'}"
            stage_stats[stage_route] = stage_stats.get(stage_route, 0) + 1

            # Người giao
            deliverer_stats[deliv_user_name] = deliverer_stats.get(deliv_user_name, 0) + 1

            # Nhà máy (tìm từ plan, order, hoặc account)
            fac = "N/A"
            if d.get('plan_id') and d.get('plan_id') in plan_map:
                fac = plan_map[d['plan_id']].get('factory') or "N/A"
            if fac == "N/A" and d.get('order_id') and d.get('order_id') in order_map:
                fac = order_map[d['order_id']].get('factory') or "N/A"
            if fac == "N/A":
                fac = deliv_user.get('factory') or "N/A"
            
            factory_stats[fac] = factory_stats.get(fac, 0) + 1

            # Trạng thái
            st = d.get('status') or 'Chưa xác định'
            status_stats[st] = status_stats.get(st, 0) + 1

        print("--- THỐNG KÊ TỔNG QUAN ---")
        print("\n1. THEO NHÀ MÁY:")
        for k, v in factory_stats.items():
            print(f"   * Nhà máy '{k}': {v} phiếu")

        print("\n2. THEO NGƯỜI BÀN GIAO:")
        for k, v in deliverer_stats.items():
            print(f"   * Người giao '{k}': {v} phiếu")

        print("\n3. THEO TUYẾN CÔNG ĐOẠN (Từ -> Đến):")
        for k, v in stage_stats.items():
            print(f"   * Tuyến '{k}': {v} phiếu")

        print("\n4. THEO TRẠNG THÁI PHIẾU:")
        for k, v in status_stats.items():
            print(f"   * Trạng thái '{k}': {v} phiếu")

        print("\n--- DANH SÁCH CHI TIẾT CÁC PHIẾU BÀN GIAO ---")
        for idx, r in enumerate(deliveries[:50]): # Hiển thị 50 phiếu gần nhất
            d = dict(r._mapping)
            deliv_user = acc_map.get(d.get('sx_delivery'), {})
            deliv_name = deliv_user.get('full_name') or deliv_user.get('username') or f"User #{d.get('sx_delivery')}"
            
            qc_user = acc_map.get(d.get('qc_receipt'), {})
            qc_name = qc_user.get('full_name') or qc_user.get('username') if d.get('qc_receipt') else "-"

            sx_user = acc_map.get(d.get('sx_receipt'), {})
            sx_name = sx_user.get('full_name') or sx_user.get('username') if d.get('sx_receipt') else "-"

            fac = "N/A"
            po_info = ""
            if d.get('plan_id') and d.get('plan_id') in plan_map:
                fac = plan_map[d['plan_id']].get('factory') or "N/A"
                po_info = f"Plan: {plan_map[d['plan_id']].get('plan_code')}"
            elif d.get('order_id') and d.get('order_id') in order_map:
                fac = order_map[d['order_id']].get('factory') or "N/A"
                po_info = f"PO: {order_map[d['order_id']].get('po_code')}"

            print(f"[{idx+1:3d}] ID: #{d['id']} | Ngày: {str(d.get('created_at'))[:16]} | Nhà máy: {fac}")
            print(f"      Chi tiết: {d.get('part_name')} ({d.get('specification')}) | SL Giao: {d.get('quantity_total')} | Đã nhận: {d.get('quantity_received')} | Lỗi: {d.get('quantity_error')}")
            print(f"      Công đoạn: [{d.get('delivery_stage')}] -> [{d.get('receiving_stage')}] | Trạng thái: {d.get('status')}")
            print(f"      Người giao (SX): {deliv_name} | Người nhận (QC): {qc_name} | Người nhận (SX): {sx_name}")
            print("      " + "-" * 80)

print("=" * 100)
