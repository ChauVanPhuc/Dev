import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # 1. Accounts & Employees
    accounts = conn.execute(text("SELECT id, username, full_name, employee_id, factory_name FROM accounts")).fetchall()
    acc_dict = {a.id: dict(a._mapping) for a in accounts}

    employees = conn.execute(text("SELECT id, employee_id, full_name, department, position FROM employees")).fetchall()
    emp_dict = {e.id: dict(e._mapping) for e in employees}

    user_full_info = {}
    for acc_id, acc in acc_dict.items():
        emp = emp_dict.get(acc.get('employee_id'), {})
        user_full_info[acc_id] = {
            'username': acc.get('username'),
            'name': acc.get('full_name') or emp.get('full_name') or acc.get('username'),
            'factory': acc.get('factory_name') or 'N/A',
            'department': emp.get('department') or 'N/A',
            'position': emp.get('position') or 'N/A'
        }

    # 2. Product plans & Orders
    plans = conn.execute(text("SELECT id, code, name FROM product_plans")).fetchall()
    plan_dict = {p.id: dict(p._mapping) for p in plans}

    orders = conn.execute(text("SELECT id, order_code, production_code, customer FROM orders")).fetchall()
    order_dict = {o.id: dict(o._mapping) for o in orders}

    # 3. Deliveries
    deliveries = conn.execute(text("SELECT * FROM deliveries ORDER BY created_at DESC, id DESC")).fetchall()
    total_count = len(deliveries)

    print("=" * 100)
    print(f"📊 BÁO CÁO TOÀN DIỆN VỀ TOÀN BỘ PHIẾU BÀN GIAO TRONG HỆ THỐNG (TỔNG CỘNG: {total_count} PHIẾU)")
    print("=" * 100)

    # Thống kê Người bàn giao
    deliverer_map = {}
    # Thống kê Công đoạn giao & nhận
    stage_route_map = {}
    # Thống kê Nhà máy
    factory_map = {}
    # Thống kê Trạng thái
    status_map = {}

    for d_row in deliveries:
        d = dict(d_row._mapping)
        
        # Người giao
        u_id = d.get('sx_delivery')
        u_info = user_full_info.get(u_id, {'name': f"User #{u_id}", 'factory': 'N/A', 'department': 'N/A'})
        u_name = u_info['name']
        if u_name not in deliverer_map:
            deliverer_map[u_name] = {'count': 0, 'factory': u_info['factory'], 'department': u_info['department'], 'user_id': u_id}
        deliverer_map[u_name]['count'] += 1

        # Tuyến công đoạn
        d_stg = (d.get('delivery_stage') or 'N/A').strip()
        r_stg = (d.get('receiving_stage') or 'N/A').strip()
        route = f"{d_stg} ➔ {r_stg}"
        stage_route_map[route] = stage_route_map.get(route, 0) + 1

        # Nhà máy
        fac = "N/A"
        if u_info['factory'] != 'N/A':
            fac = u_info['factory']
        if fac == "N/A":
            if '1' in d_stg: fac = 'Vaniti Phân Xưởng 1'
            elif '2' in d_stg: fac = 'Vaniti Phân Xưởng 2'
            elif '3' in d_stg: fac = 'Furniture nhà máy 3'
        factory_map[fac] = factory_map.get(fac, 0) + 1

        # Trạng thái
        st = d.get('status') or 'Khác'
        status_map[st] = status_map.get(st, 0) + 1

    print("\n👤 1. DANH SÁCH NHỮNG NGƯỜI THỰC HIỆN BÀN GIAO (sx_delivery):")
    sorted_deliverers = sorted(deliverer_map.items(), key=lambda x: x[1]['count'], reverse=True)
    for idx, (name, info) in enumerate(sorted_deliverers):
        print(f"   [{idx+1:2d}] {name:30s} | Nhà máy: {info['factory']:22s} | Bộ phận: {info['department']:20s} | Đã tạo: {info['count']:4d} phiếu")

    print("\n🏭 2. PHÂN BỔ PHIẾU THEO NHÀ MÁY / PHÂN XƯỞNG:")
    for fac, cnt in sorted(factory_map.items(), key=lambda x: x[1], reverse=True):
        pct = (cnt / total_count) * 100 if total_count > 0 else 0
        print(f"   * {fac:35s}: {cnt:4d} phiếu ({pct:.1f}%)")

    print("\n🔄 3. PHÂN BỔ THEO CÁC TUYẾN CÔNG ĐOẠN (Từ Công đoạn Giao ➔ Công đoạn Nhận):")
    for route, cnt in sorted(stage_route_map.items(), key=lambda x: x[1], reverse=True):
        print(f"   * {route:40s}: {cnt:4d} phiếu")

    print("\n📌 4. PHÂN BỔ THEO TRẠNG THÁI BÀN GIAO:")
    for st, cnt in sorted(status_map.items(), key=lambda x: x[1], reverse=True):
        print(f"   * {st:25s}: {cnt:4d} phiếu")

    print("\n" + "=" * 100)
