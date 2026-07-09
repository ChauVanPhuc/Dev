from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time
import datetime

class Delivery(Base):
    """
    Model đại diện cho bảng 'deliveries' (Phiếu bàn giao).
    Lưu trữ thông tin về quá trình bàn giao hàng hóa giữa các công đoạn.
    """
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    delivery_stage = Column(NVARCHAR(50))     # Công đoạn giao
    receiving_stage = Column(NVARCHAR(50))    # Công đoạn nhận
    note = Column(NVARCHAR(500))              # Ghi chú phiếu giao
    created_at = Column(DateTime, default=get_vietnam_time) # Thời gian tạo
    residual = Column(Integer, default=0)     # Số lượng còn dư/tổng
    status = Column(NVARCHAR(50))             # Trạng thái phiếu (Chờ xác nhận, Đã nhận...)
    plan_id = Column(Integer, ForeignKey("product_plans.id")) # Liên kết với kế hoạch sản xuất
    sx_delivery = Column(Integer, default=0)  # ID người thực hiện giao
    qc_receipt = Column(Integer, default=0)   # ID người QC xác nhận nhận (nếu có)
    sx_receipt = Column(Integer, default=0)   # ID người công đoạn nhận xác nhận

    # Tên chi tiết (Part/Element) được giao, thay thế cho việc chia nhỏ vào delivery_details
    part_name = Column(NVARCHAR(250), nullable=True)
    
    # [NEW] Quy cách (Specification)
    specification = Column(NVARCHAR(250), nullable=True)
    
    # [NEW] ID Đơn hàng được gán linh kiện này (Dùng cho cơ chế rót hàng tự động)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)

    # [NEW] Mã QR dự phòng
    backup_qr = Column(NVARCHAR(100), nullable=True)

    # Các cột định lượng mới
    quantity_total = Column(Integer, default=0)    # Số lượng giao tổng
    quantity_received = Column(Integer, default=0) # Số lượng thực nhận
    quantity_error = Column(Integer, default=0)    # Số lượng lỗi (QC nhập)
    quantity_returned = Column(Integer, default=0) # Số lượng trả (QC nhập)
    quantity_inspection = Column(Integer, default=0) # Số lượng thực kiểm (QC nhập)

    # [NEW] Thông tin độ ẩm
    moisture_min = Column(Float, nullable=True)
    moisture_max = Column(Float, nullable=True)

    # Các quan hệ liên kết
    details = relationship("DeliveryDetails", back_populates="delivery")
    images = relationship("DeliveryImage", back_populates="delivery")

