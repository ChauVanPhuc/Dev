# -*- coding: utf-8 -*-
"""
Script kiểm thử tự động xác minh tính đúng đắn của logic Gôm Nhóm Mã PO, BOM & QC.
Chạy trực tiếp với Database thực tế của SmartFlow.
"""
import sys
import os
import re

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Thêm đường dẫn BackEnd vào sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import app.models
from config.database import SessionLocal
from modules.delivery.models.order import Order
from modules.production.models.bom_detail import BOMDetail
from sqlalchemy.orm import joinedload
from sqlalchemy import or_

def extract_root_po(code: str) -> str:
    """
    Trích xuất mã PO gốc từ mã lệnh phân đoạn hoặc mã có hậu tố đợt/lô sản xuất.
    """
    if not code:
        return ""
    code_clean = str(code).strip()
    m = re.match(r'^([A-Za-z0-9]+-\d+(?:-\d+)?)-(\d+[A-Za-z]*)$', code_clean)
    if m:
        return m.group(1)
    m2 = re.match(r'^(.*?)-(\d+[A-Za-z]*)$', code_clean)
    if m2 and len(m2.group(1).split('-')) >= 2:
        return m2.group(1)
    return code_clean

def test_extract_root_po_unit():
    print("=== TEST 1: Unit Test extract_root_po ===")
    test_cases = [
        ("APT-0102-01", "APT-0102"),
        ("APT-0102-26", "APT-0102"),
        ("APT-0078-84", "APT-0078"),
        ("ADV-0406-01BS", "ADV-0406"),
        ("APT-0048-49-01", "APT-0048-49"),
        ("ADV-0409", "ADV-0409"),
        ("FOL-0452", "FOL-0452"),
        ("ADV-0416-HATCH", "ADV-0416-HATCH"),
        ("FOL-0482-GC", "FOL-0482-GC"),
        ("LSX-APT-0102-01", "LSX-APT-0102"),
        ("PO12345", "PO12345"),
        ("", ""),
        (None, ""),
    ]
    all_passed = True
    for input_val, expected in test_cases:
        actual = extract_root_po(input_val)
        passed = (actual == expected)
        if not passed:
            all_passed = False
            print(f"  FAILED: '{input_val}' -> Expected '{expected}', got '{actual}'")
        else:
            print(f"  PASS: '{input_val}' -> '{actual}'")
    assert all_passed, "Có test case không khớp!"
    print(">>> TEST 1: PASSED\n")

def test_database_orders_grouping():
    print("=== TEST 2: Kiểm tra gôm nhóm trên CSDL thực tế ===")
    db = SessionLocal()
    try:
        codes = db.query(Order.order_code).filter(Order.order_code.isnot(None)).all()
        unique_codes = sorted(list(set([c[0].strip() for c in codes if c[0]])))
        root_codes = sorted(list(set([extract_root_po(c) for c in unique_codes])))
        print(f"  Tổng số mã order_code gốc trong DB: {len(unique_codes)}")
        print(f"  Tổng số mã PO gốc sau khi gôm: {len(root_codes)}")
        assert len(root_codes) < len(unique_codes), "Phải gôm được mã!"
        
        # Kiểm tra cụ thể APT-0078 và APT-0102
        apt_78_sub = [c for c in unique_codes if extract_root_po(c) == "APT-0078"]
        apt_102_sub = [c for c in unique_codes if extract_root_po(c) == "APT-0102"]
        print(f"  Mã gốc APT-0078 đại diện cho {len(apt_78_sub)} lệnh con ({apt_78_sub[0]} ... {apt_78_sub[-1]})")
        print(f"  Mã gốc APT-0102 đại diện cho {len(apt_102_sub)} lệnh con ({apt_102_sub[0]} ... {apt_102_sub[-1]})")
        assert len(apt_78_sub) >= 80, f"APT-0078 phải có ít nhất 80 lệnh con, thực tế: {len(apt_78_sub)}"
        assert len(apt_102_sub) >= 20, f"APT-0102 phải có ít nhất 20 lệnh con, thực tế: {len(apt_102_sub)}"
        print(">>> TEST 2: PASSED\n")
    finally:
        db.close()

def test_multi_order_bom_aggregation():
    print("=== TEST 3: Kiểm tra truy vấn & gôm nhóm BOM đa lệnh ===")
    db = SessionLocal()
    try:
        target_root = "APT-0102"
        # 1. Truy vấn các đơn con
        matching_orders = db.query(Order).options(joinedload(Order.products)).filter(
            or_(
                Order.order_code == target_root,
                Order.order_code.ilike(f"{target_root}-%"),
                Order.partner_po == target_root,
                Order.partner_po.ilike(f"{target_root}-%"),
                Order.production_code == target_root,
                Order.production_code.ilike(f"{target_root}-%"),
                Order.order_code == f"LSX-{target_root}",
                Order.order_code.ilike(f"LSX-{target_root}-%")
            )
        ).all()
        print(f"  Tìm thấy {len(matching_orders)} đơn hàng thuộc root PO '{target_root}'")
        assert len(matching_orders) > 1, f"Phải tìm thấy nhiều đơn hàng con cho {target_root}"
        
        all_products = []
        for o in matching_orders:
            if o.products:
                all_products.extend(o.products)
        print(f"  Tổng số sản phẩm của toàn bộ {len(matching_orders)} đơn: {len(all_products)}")
        
        # Thử tính tổng số lượng tủ cho công đoạn Đóng gói
        parts_map_fg = {}
        for p in all_products:
            p_name = (p.name or p.sku or "Tủ").strip()
            qty = int(float(p.order_qty or p.quantity or p.production_qty or 1))
            parts_map_fg[p_name] = parts_map_fg.get(p_name, 0) + qty
            
        print("  Sản phẩm hoàn thiện (Đóng gói):")
        for name, qty in list(parts_map_fg.items())[:5]:
            print(f"    - {name}: tổng SL = {qty}")
            
        # Thử kiểm tra BOM cho các linh kiện
        prod_ids = [p.id for p in all_products if p.id]
        boms = db.query(BOMDetail).filter(BOMDetail.product_id.in_(prod_ids)).all() if prod_ids else []
        print(f"  Tổng số bản ghi BOMDetail: {len(boms)}")
        
        parts_map_comp = {}
        prod_map = {p.id: p for p in all_products}
        for b in boms:
            p = prod_map.get(b.product_id)
            prod_q = float(p.order_qty or p.quantity or 1.0) if p else 1.0
            qty = max(1, int(prod_q * float(b.quantity or 1.0)))
            name = b.name or b.sku or "Chi tiết"
            parts_map_comp[name] = parts_map_comp.get(name, 0) + qty
            
        print(f"  Số linh kiện duy nhất gôm được: {len(parts_map_comp)}")
        for name, qty in list(parts_map_comp.items())[:5]:
            print(f"    - {name}: tổng SL = {qty}")
            
        print(">>> TEST 3: PASSED\n")
    finally:
        db.close()

def test_fastapi_endpoints():
    print("=== TEST 4: Kiểm tra trực tiếp qua FastAPI TestClient ===")
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # 1. Test /api/v1/production-v2/po-codes
    res1 = client.get("/api/v1/production-v2/po-codes?limit=100")
    assert res1.status_code == 200, f"/po-codes trả về {res1.status_code}"
    codes = res1.json().get("codes", [])
    print(f"  API /po-codes trả về {len(codes)} mã PO gốc (mẫu 5 mã: {codes[:5]})")
    # Kiểm tra xem có mã nào là phân đoạn không
    bad_codes = [c for c in codes if len(c.split("-")) > 2 and any(c.endswith(f"-{i:02d}") for i in range(1, 100))]
    assert len(bad_codes) == 0, f"Vẫn còn mã phân đoạn: {bad_codes}"

    # 2. Test search 0102
    res2 = client.get("/api/v1/production-v2/po-codes?search=0102")
    assert res2.status_code == 200
    search_codes = res2.json().get("codes", [])
    print(f"  API /po-codes?search=0102 trả về: {search_codes}")
    assert "APT-0102" in search_codes, "Phải tìm thấy APT-0102 khi search 0102"

    # 3. Test /orders/APT-0102/bom công đoạn Đóng gói
    res3 = client.get("/api/v1/production-v2/orders/APT-0102/bom?stage=Đóng gói")
    assert res3.status_code == 200
    bom_pack = res3.json()
    print(f"  API /orders/APT-0102/bom?stage=Đóng gói trả về {len(bom_pack)} sản phẩm")
    assert len(bom_pack) > 0, "Phải có sản phẩm đóng gói"
    sample_pack = bom_pack[0]
    print(f"    Mẫu 1 SP: {sample_pack['part_name']}, total_qty={sample_pack['total_qty']}, specs={sample_pack['specs']}")
    assert all("product_label" in s for item in bom_pack for s in item.get("specs", [])), "Mỗi quy cách phải có product_label"

    # 4. Test /orders/APT-0102/bom công đoạn Lắp ráp
    res4 = client.get("/api/v1/production-v2/orders/APT-0102/bom?stage=Lắp ráp")
    assert res4.status_code == 200
    bom_assembly = res4.json()
    print(f"  API /orders/APT-0102/bom?stage=Lắp ráp trả về {len(bom_assembly)} linh kiện")
    assert len(bom_assembly) > 0, "Phải có linh kiện lắp ráp"
    sample_part = bom_assembly[0]
    print(f"    Mẫu 1 LK: {sample_part['part_name']}, total_qty={sample_part['total_qty']}, specs={sample_part['specs']}")
    assert all("product_label" in s for item in bom_assembly for s in item.get("specs", [])), "Mỗi linh kiện phải có product_label trong specs"

    print(">>> TEST 4: PASSED\n")

if __name__ == "__main__":
    test_extract_root_po_unit()
    test_database_orders_grouping()
    test_multi_order_bom_aggregation()
    test_fastapi_endpoints()
    print("=== TẤT CẢ CÁC TEST ĐỀU THÀNH CÔNG (100% SUCCESS) ===")

