from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time
import datetime

class DeliveryReturn(Base):
    """
    Model đại diện cho bảng 'delivery_returns' (Phiếu trả hàng QC).
    Lưu trữ thông tin về hàng lỗi được QC hoặc các công đoạn trả về nguồn sản xuất.
    """
    __tablename__ = "delivery_returns"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("product_plans.id")) # Liên kết với kế hoạch sản xuất
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=True) # Liên kết trực tiếp với phiếu giao hàng
    
    from_stage = Column(NVARCHAR(50))     # Công đoạn phát hiện/trả hàng (thường là QC hoặc CĐ nhận)
    to_stage = Column(NVARCHAR(50))       # Công đoạn nhận trả (nơi sản xuất ra hàng lỗi)
    
    part_name = Column(NVARCHAR(250))     # Tên chi tiết trả về
    quantity = Column(Integer, default=0) # Số lượng trả
    
    note = Column(NVARCHAR(500))          # Ghi chú từ người dùng (Input từ app)
    reason = Column(NVARCHAR(500), nullable=True) # Lý do phân loại (Để trống cho dùng sau)
    
    status = Column(NVARCHAR(50), default="Chờ SX Xác Nhận") # Trạng thái: Chờ SX Xác Nhận, Đã SX Xác Nhận, Đang Sửa Chữa, Hoàn Thành...
    created_by = Column(Integer)          # ID người tạo phiếu
    created_at = Column(DateTime, default=get_vietnam_time)

    # Cột xác nhận từ SX
    sx_confirmed_by = Column(Integer, nullable=True)  # ID người SX xác nhận nhận hàng
    sx_confirmed_at = Column(DateTime, nullable=True)  # Thời gian SX xác nhận
    sx_confirmation_note = Column(NVARCHAR(500), nullable=True)  # Ghi chú khi SX xác nhận

    # Cột chiến lược phân bổ trả hàng
    allocation_method = Column(NVARCHAR(20), default="LIFO")  # 'FIFO', 'LIFO', 'PROPORTIONAL' - Mặc định LIFO

    # Quan hệ với ảnh
    images = relationship("DeliveryImage", back_populates="return_record")
    delivery = relationship("Delivery", backref="returns")
