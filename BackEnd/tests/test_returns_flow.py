import pytest
from modules.delivery.models.deliveries import Delivery
from modules.delivery.models.delivery_returns import DeliveryReturn
from modules.auth.models.departments import Department
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.auth.models.accounts import Account

def test_returns_and_confirmation_flow(client, db_session):
    # 1. Create a sender account and a receiver account
    client.post("/accounts/", json={"username": "qc_user", "password": "123", "full_name": "QC Controller"})
    client.post("/accounts/", json={"username": "sx_user", "password": "123", "full_name": "SX Worker"})
    
    qc_res = client.post("/accounts/login", data={"username": "qc_user", "password": "123"}).json()
    sx_res = client.post("/accounts/login", data={"username": "sx_user", "password": "123"}).json()
    
    qc_token = qc_res["access_token"]
    qc_user_id = qc_res["id"]
    sx_token = sx_res["access_token"]
    sx_user_id = sx_res["id"]

    # Assign "Cắt" stage to the SX user
    dept = Department(
        account_id=sx_user_id,
        input_stage="Cắt",
        output_stage="Cắt"
    )
    db_session.add(dept)
    db_session.commit()

    # 2. Create a delivery order
    delivery_data = {
        "plan_id": 1,
        "delivery_stage": "Cắt",
        "receiving_stage": "Kiểm tra",
        "user_id": sx_user_id,
        "quantity": 100,
        "part_name": "Khung cửa A",
        "status": "Chờ Nhận Hàng"
    }
    
    res = client.post(
        "/api/v1/deliveries/",
        data=delivery_data,
        headers={"Authorization": f"Bearer {sx_token}"}
    )
    assert res.status_code == 200
    delivery = res.json()
    delivery_id = delivery["id"]

    # 3. Create a return slip linked to this delivery
    return_form = {
        "plan_id": 1,
        "delivery_id": delivery_id,
        "from_stage": "Kiểm tra",
        "to_stage": "Cắt",
        "part_name": "Khung cửa A",
        "quantity": 5,
        "note": "Lỗi kích thước lệch 2mm",
        "user_id": qc_user_id,
        "status": "Chờ SX Xác Nhận"
    }

    # Post using form-data format (which is how FastAPI endpoint receives Form params)
    res = client.post(
        "/api/v1/returns/",
        data=return_form,
        headers={"Authorization": f"Bearer {qc_token}"}
    )
    assert res.status_code == 200
    res_json = res.json()
    assert res_json["status"] == "success"
    return_id = res_json["data"]["id"]

    # 4. Verify original delivery status and quantity_returned was updated
    delivery_record = db_session.query(Delivery).filter(Delivery.id == delivery_id).first()
    assert delivery_record.status == "Trả Hàng"
    assert delivery_record.quantity_returned == 5

    # 5. Verify querying return slip by delivery_id
    res = client.get(
        f"/api/v1/returns/by-delivery/{delivery_id}",
        headers={"Authorization": f"Bearer {qc_token}"}
    )
    assert res.status_code == 200
    ret_by_del = res.json()
    assert ret_by_del["id"] == return_id
    assert ret_by_del["delivery_id"] == delivery_id
    assert ret_by_del["quantity"] == 5

    # 6. Verify SX confirmation (should succeed because SX user stage matches to_stage "Cắt")
    confirm_payload = {
        "user_id": sx_user_id,
        "sx_confirmation_note": "Đã nhận lại 5 cái bị lỗi để cắt lại",
        "status": "Đã SX Xác Nhận"
    }
    res = client.patch(
        f"/api/v1/returns/{return_id}/confirm",
        json=confirm_payload,
        headers={"Authorization": f"Bearer {sx_token}"}
    )
    assert res.status_code == 200

    # Verify return slip status is updated in db
    return_record = db_session.query(DeliveryReturn).filter(DeliveryReturn.id == return_id).first()
    assert return_record.status == "Đã SX Xác Nhận"
    assert return_record.sx_confirmed_by == sx_user_id
    assert return_record.sx_confirmation_note == "Đã nhận lại 5 cái bị lỗi để cắt lại"
    assert return_record.sx_confirmed_at is not None
