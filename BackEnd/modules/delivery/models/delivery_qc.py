from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class DeliveryQC(Base):
    """
    Model đại diện cho bảng 'delivery_qc' (Kết quả kiểm định chất lượng).
    Lưu trữ kết quả kiểm tra QC cho một phiếu giao hàng dưới dạng 1 bản ghi duy nhất.
    Sử dụng cột results_json để chứa toàn bộ các chỉ số đo đạc của các hạng mục.
    """
    __tablename__ = "delivery_qc"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), unique=True) # Đảm bảo mỗi phiếu giao chỉ có 1 bản ghi QC
    
    # Toàn bộ trạng thái và trị số kỹ thuật lưu trong JSON để linh hoạt mở rộng
    results_json = Column(NVARCHAR(None)) # NVARCHAR(MAX) trong SQL Server
    
    note = Column(NVARCHAR(500), nullable=True)
    created_at = Column(DateTime, default=get_vietnam_time)

    # Quan hệ liên kết
    delivery = relationship("Delivery")
