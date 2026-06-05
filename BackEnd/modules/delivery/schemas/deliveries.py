from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from modules.delivery.schemas.delivery_details import DeliveryDetails
from modules.delivery.schemas.delivery_images import DeliveryImage

class DeliveryBase(BaseModel):
    """
    Schema cơ bản cho Phiếu giao hàng/nhận hàng nội bộ.
    """
    delivery_stage: Optional[str] = None # Công đoạn giao
    receiving_stage: Optional[str] = None # Công đoạn nhận
    part_name: Optional[str] = None      # Tên chi tiết được giao
    specification: Optional[str] = None  # [NEW] Quy cách
    note: Optional[str] = None           # Ghi chú
    created_at: Optional[datetime] = None # Thời gian tạo
    residual: Optional[int] = 0          # Số lượng còn lại (nếu có)
    status: Optional[str] = None         # Trạng thái phiếu
    plan_id: Optional[int] = None        # Liên kết kế hoạch sản xuất
    sx_delivery: Optional[int] = 0        # ID người giao
    qc_receipt: Optional[int] = 0         # ID người QC nhận
    sx_receipt: Optional[int] = 0         # ID người nhận
    sx_delivery_name: Optional[str] = None
    sx_receipt_name: Optional[str] = None
    qc_receipt_name: Optional[str] = None

    quantity_total: Optional[int] = 0    # Số lượng giao tổng
    quantity_received: Optional[int] = 0 # Số lượng thực nhận
    quantity_error: Optional[int] = 0    # Số lượng lỗi
    quantity_returned: Optional[int] = 0 # Số lượng trả
    quantity_inspection: Optional[int] = 0 # Số lượng thực kiểm
    order_id: Optional[int] = None       # [NEW] ID Đơn hàng được gán linh kiện này
    backup_qr: Optional[str] = None      # [NEW] Mã QR dự phòng
    moisture_min: Optional[float] = None # [NEW] Độ ẩm Min
    moisture_max: Optional[float] = None # [NEW] Độ ẩm Max

class DeliveryCreate(DeliveryBase):
    """
    Schema dùng để tạo mới phiếu giao nhận.
    """
    pass

class DeliveryUpdate(DeliveryBase):
    """
    Schema dùng để cập nhật phiếu giao nhận.
    """
    pass

class Delivery(DeliveryBase):
    """
    Schema hiển thị thông tin phiếu giao nhận hoàn chỉnh kèm chi tiết các mặt hàng.
    """
    id: int
    details: List[DeliveryDetails] = []
    images: List[DeliveryImage] = []

    class Config:
        from_attributes = True
