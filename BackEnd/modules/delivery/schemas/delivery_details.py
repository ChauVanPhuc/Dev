from pydantic import BaseModel
from typing import Optional

class DeliveryDetailsBase(BaseModel):
    """
    Schema cơ bản cho Chi tiết phiếu giao hàng.
    Lưu trữ thông tin về linh kiện và số lượng trong mỗi lần giao/nhận.
    """
    delivery_id: int                    # ID phiếu giao hàng tổng
    part_name: Optional[str] = None     # Tên linh kiện/sản phẩm
    quantity: int = 0                   # Số lượng
    order_id: Optional[int] = None      # ID đơn hàng liên kết
    order_code: Optional[str] = None    # [NEW] Mã đơn hàng (để hiển thị)
    element_name: Optional[str] = None  # Tên bộ phận/Element

class DeliveryDetailsCreate(DeliveryDetailsBase):
    """
    Schema dùng để tạo mới chi tiết phiếu giao nhận.
    """
    pass

class DeliveryDetails(DeliveryDetailsBase):
    """
    Schema hiển thị thông tin chi tiết phiếu giao nhận hoàn chỉnh (bao gồm ID).
    """
    id: int

    class Config:
        from_attributes = True
