from pydantic import BaseModel
from typing import Optional

class DeliveryImageBase(BaseModel):
    """
    Schema cơ bản cho Hình ảnh bàn giao.
    Lưu trữ đường dẫn ảnh minh chứng cho việc giao/nhận hàng.
    """
    delivery_id: int              # ID phiếu giao hàng liên kết
    image_path: str               # Đường dẫn tới file ảnh
    description: Optional[str] = None # Mô tả ảnh (ví dụ: ảnh trước khi đóng gói)

class DeliveryImageCreate(DeliveryImageBase):
    """
    Schema dùng để tạo mới bản ghi hình ảnh.
    """
    pass

class DeliveryImage(DeliveryImageBase):
    """
    Schema hiển thị thông tin hình ảnh hoàn chỉnh (bao gồm ID).
    """
    id: int

    class Config:
        from_attributes = True
