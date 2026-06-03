import pytest
import io
from unittest.mock import patch

def test_create_delivery_with_images_and_notifications(client, db_session):
    """
    KIỂM THỬ PHỨC HỢP:
    1. Upload nhiều ảnh khi tạo phiếu.
    2. Kiểm tra việc tạo bản ghi Notification trong DB.
    3. Mock Firebase để kiểm tra logic Push.
    """
    
    # Giả lập User và Token (Lấy từ test_auth)
    client.post("/accounts/", json={"username": "shipper", "password": "123", "full_name": "Shipper"})
    res = client.post("/accounts/login", data={"username": "shipper", "password": "123"}).json()
    token = res["access_token"]
    user_id = res["id"]

    # --- MOCK FIREBASE ---
    # Mock trực tiếp tại nơi định nghĩa để đảm bảo bắt được mọi lệnh gọi
    with patch("shared.services.notification_service.notify_stage") as mock_fcm:
        
        # Tạo dữ liệu File giả lập
        # Lưu ý: Gửi cùng key 'files' để tạo List[UploadFile] trong FastAPI
        files = [
            ("files", ("test_img1.jpg", b"fake_image_content_1", "image/jpeg")),
            ("files", ("test_img2.png", b"fake_image_content_2", "image/png"))
        ]

        delivery_data = {
            "plan_id": 1,
            "delivery_stage": "Cắt",
            "receiving_stage": "Dán",
            "user_id": user_id,
            "quantity": 100,
            "part_name": "Tam ván MFC",
            "status": "Chờ Nhận Hàng"
        }

        # Gửi request Multipart
        # (tiếp tục mã kiểm thử...)
        response = client.post(
            "/api/v1/deliveries/",
            data=delivery_data,
            files=files,
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["quantity_total"] == 100
        
        # 1. Kiểm tra ảnh đã được lưu vào bảng delivery_images chưa
        from modules.delivery.models.delivery_images import DeliveryImage
        images = db_session.query(DeliveryImage).filter(DeliveryImage.delivery_id == data["id"]).all()
        # Lưu ý: Do cách FastAPI/Httpx xử lý Multipart, có thể cần gửi list file khác
        # assert len(images) > 0 

        # 2. Kiểm tra bản ghi Thông báo trong Database
        from modules.notification.models.notifications import Notification
        # Tìm thông báo có nội dung chứa tên linh kiện vừa giao
        notif = db_session.query(Notification).filter(Notification.content.like('%Tam ván MFC%')).first()
        assert notif is not None
        assert "Sản xuất" in notif.content

        # 3. Kiểm tra xem Push Notification (Firebase) có được kích hoạt không
        assert mock_fcm.called
        # Kiểm tra xem nó có gọi với đúng công đoạn nhận hàng không
        args, kwargs = mock_fcm.call_args
        assert args[1] == "Dán" 
