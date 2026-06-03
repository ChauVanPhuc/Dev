import pytest
from modules.production.routes.product_plan_router import normalize_vn

def test_normalize_vn():
    assert normalize_vn("Công đoạn Cắt") == "cong doan cat"
    assert normalize_vn("Thành phẩm ĐÃ NHẬN") == "thanh pham da nhan"
    assert normalize_vn(None) == ""

def test_bom_tree_logic(db_session, client):
    from modules.production.models.product_plan import ProductPlan
    from modules.delivery.models.order import Order
    from modules.production.models.product import Product
    from modules.production.models.bom_detail import BOMDetail

    plan = ProductPlan(name="KHSX Test", code="TEST_001", status=1)
    db_session.add(plan)
    db_session.flush()

    order = Order(plan_id=plan.id, order_code="ORD-TEST", customer="Khách hàng Test")
    db_session.add(order)
    db_session.flush()

    product = Product(order_id=order.id, name="Bàn Gỗ", sku="BG-01", total_qty=10)
    db_session.add(product)
    db_session.flush()

    part = BOMDetail(product_id=product.id, name="Chân bàn", quantity=40, sku="CB-01", is_raw_material=0)
    db_session.add(part)
    db_session.commit()

    response = client.get(f"/api/v1/plans/product-progress/{product.id}")
    
    # Debug nếu không phải 200
    if response.status_code != 200:
        print(f"DEBUG API RESPONSE: {response.json()}")
        
    assert response.status_code == 200
    data = response.json()
    
    # Kiểm tra xem có lỗi trong data không trước khi truy cập key
    if "error" in data:
        pytest.fail(f"API tra ve loi: {data['error']}")
        
    assert data["prodName"] == "Bàn Gỗ"
    assert data["stages"][0]["name"] == "Chân bàn"
