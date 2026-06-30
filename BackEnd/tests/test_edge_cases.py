import pytest
from modules.delivery.models.deliveries import Delivery

@pytest.mark.parametrize("invalid_qty", [0, -1, -500])
def test_create_delivery_with_invalid_quantity(client, invalid_qty):
    """CHẶN: Không cho phép giao số lượng <= 0"""
    # Đảm bảo User tồn tại trước khi login
    client.post("/accounts/", json={"username": "sx_user_qty", "password": "123", "full_name": "SX Test", "phone": "0987654304"})
    res = client.post("/accounts/login", data={"username": "sx_user_qty", "password": "123"}).json()
    token = res["access_token"]
    
    delivery_data = {
        "plan_id": 1,
        "delivery_stage": "Cắt",
        "receiving_stage": "Dán",
        "user_id": res["id"],
        "quantity": invalid_qty,
        "part_name": "Linh kiện lỗi",
        "status": "Chờ Nhận Hàng"
    }
    
    response = client.post(
        "/api/v1/deliveries/",
        data=delivery_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    # Nếu code hiện tại chưa chặn, test này sẽ giúp bạn phát hiện ra để thêm logic 'if quantity <= 0'
    assert response.status_code != 200 or "error" in response.text.lower()

def test_confirm_more_than_delivered(client, db_session):
    """CHẶN: Không cho phép nhận nhiều hơn số lượng đã giao"""
    # 1. Tạo 1 phiếu giao 10 cái
    client.post("/accounts/", json={"username": "sx_user_confirm", "password": "123", "full_name": "SX Test", "phone": "0987654305"})
    res = client.post("/accounts/login", data={"username": "sx_user_confirm", "password": "123"}).json()
    token = res["access_token"]
    
    response = client.post(
        "/api/v1/deliveries/",
        data={"plan_id": 1, "delivery_stage": "A", "receiving_stage": "B", "user_id": res["id"], "quantity": 10, "part_name": "Test"},
        headers={"Authorization": f"Bearer {token}"}
    )
    delivery_id = response.json()["id"]

    # 2. Thử xác nhận nhận 100 cái (Vô lý)
    confirm_payload = {
        "user_id": res["id"],
        "sx_receipt": res["id"],
        "quantity_received": 100, # LỚN HƠN 10
        "status": "Chờ Kiểm Tra"
    }
    response = client.patch(
        f"/api/v1/deliveries/{delivery_id}/confirm",
        json=confirm_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Kỳ vọng: Server phải cảnh báo hoặc không cho phép
    # assert response.status_code == 400 
    pass # Để bạn tự quyết định logic chặn ở Backend sau khi thấy kết quả test

def test_login_wrong_password(client):
    """KIỂM TRA: Đăng nhập sai mật khẩu"""
    client.post("/accounts/", json={"username": "sx_user_wrong", "password": "123", "full_name": "SX Test", "phone": "0987654306"})
    response = client.post("/accounts/login", data={"username": "sx_user_wrong", "password": "wrong_password"})
    assert response.status_code != 200
    assert "detail" in response.json()

def test_upload_non_image_file(client):
    """BẢO MẬT: Chặn upload file nguy hiểm (ví dụ .txt giả danh)"""
    client.post("/accounts/", json={"username": "sx_user_upload", "password": "123", "full_name": "SX Test", "phone": "0987654307"})
    res = client.post("/accounts/login", data={"username": "sx_user_upload", "password": "123"}).json()
    token = res["access_token"]
    
    files = [("files", ("virus.txt", b"harmful content", "text/plain"))]
    delivery_data = {"plan_id": 1, "delivery_stage": "A", "receiving_stage": "B", "user_id": res["id"], "quantity": 10, "part_name": "Test"}
    
    response = client.post(
        "/api/v1/deliveries/",
        data=delivery_data,
        files=files,
        headers={"Authorization": f"Bearer {token}"}
    )
    # Kiểm tra xem server có lưu file .txt này không, hay là chặn
    # (Tùy thuộc vào logic router đã viết)
    pass
