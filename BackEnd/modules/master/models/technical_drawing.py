from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class TechnicalDrawing(Base):
    """
    Model đại diện cho bảng 'master_technical_drawings' (Bản vẽ kỹ thuật & Lịch sử Revision).
    """
    __tablename__ = "master_technical_drawings"

    id = Column(Integer, primary_key=True, index=True)
    master_product_id = Column(Integer, ForeignKey("master_products.id"), index=True)
    lot_code = Column(NVARCHAR(50), default="Lô 1") # Lô sản xuất áp dụng
    updated_at = Column(DateTime, default=get_vietnam_time) # Ngày cập nhật
    updated_by = Column(NVARCHAR(100)) # Người cập nhật
    status = Column(NVARCHAR(50), default="Bản áp dụng") # Trạng thái: Bản áp dụng, Tạm dừng, Thu hồi, Thêm mới
    change_reason = Column(NVARCHAR(255)) # Lý do cập nhật: Thay đổi, Bổ sung, Thẩm định...
    approved_by = Column(NVARCHAR(100)) # Người duyệt
    approved_at = Column(DateTime, nullable=True) # Ngày duyệt
    note = Column(NVARCHAR(500)) # Ghi chú
    file_url = Column(NVARCHAR(500)) # Đường dẫn file đính kèm

    master_product = relationship("MasterProduct", back_populates="technical_drawings")
