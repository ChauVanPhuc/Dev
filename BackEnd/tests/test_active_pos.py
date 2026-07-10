import pytest
from datetime import datetime, timedelta
from modules.delivery.models.order import Order

def test_get_active_pos(client, db_session):
    # Seed mock KHSX orders
    # 1. Active PO (today)
    po1 = Order(
        order_code="PO-ACTIVE-01",
        create_date=datetime.utcnow(),
        customer="Active Customer 01"
    )
    # 2. Out of range PO (6 months ago)
    po2 = Order(
        order_code="PO-OLD-02",
        create_date=datetime.utcnow() - timedelta(days=180),
        customer="Old Customer"
    )
    # 3. Future active PO (1 month from now)
    po3 = Order(
        order_code="PO-FUTURE-03",
        create_date=datetime.utcnow() + timedelta(days=30),
        customer="Future Customer"
    )
    
    db_session.add_all([po1, po2, po3])
    db_session.commit()

    response = client.get("/api/v1/purchase-order-items/active-pos")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    
    po_codes = [x["po_code"] for x in data]
    assert "PO-ACTIVE-01" in po_codes
    assert "PO-FUTURE-03" in po_codes
    assert "PO-OLD-02" not in po_codes
