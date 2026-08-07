from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base

class CAPAOccurrence(Base):
    """
    Model lưu trữ các lần ghi nhận cụ thể của một báo cáo CAPA.
    """
    __tablename__ = "capa_occurrences"

    id = Column(Integer, primary_key=True, index=True)
    capa_id = Column(Integer, ForeignKey("capas.id"), nullable=False)
    
    occurrence_number = Column(Integer, nullable=False) # Lần 1, Lần 2, v.v.
    occurrence_date = Column(NVARCHAR(50), nullable=True) # Ngày ghi nhận (e.g. 27/08/2025)
    container_code = Column(NVARCHAR(100), nullable=True) # Mã cont
    product_name = Column(NVARCHAR(255), nullable=True) # Sản phẩm
    quantity = Column(Integer, nullable=True) # Số lượng
    issue_detail = Column(NVARCHAR(1000), nullable=True) # Vấn đề chi tiết
    inspector_name = Column(NVARCHAR(255), nullable=True) # Kiểm soát bởi
    status = Column(NVARCHAR(50), nullable=True) # Trạng thái: "Chờ đánh giá", "Đã đóng"
    
    main_cause = Column(NVARCHAR(1000), nullable=True) # Nguyên nhân chính
    corrective_action = Column(NVARCHAR(1000), nullable=True) # Hành động khắc phục

    # Quan hệ liên kết
    capa = relationship("CAPA")
    evaluations = relationship("CAPAEvaluation", back_populates="occurrence", cascade="all, delete-orphan")

