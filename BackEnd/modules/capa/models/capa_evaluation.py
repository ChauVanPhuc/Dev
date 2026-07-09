from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base

class CAPAEvaluation(Base):
    """
    Model ghi nhận kết quả theo dõi và đánh giá từng lần kiểm tra của CAPA.
    """
    __tablename__ = "capa_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    occurrence_id = Column(Integer, ForeignKey("capa_occurrences.id"), nullable=False)
    
    content = Column(NVARCHAR(500), nullable=False) # Nội dung kiểm tra (e.g. Check thao tác lụa phôi)
    execution_date = Column(NVARCHAR(50), nullable=True) # Ngày thực hiện (e.g. 28/04/2025)
    executor = Column(NVARCHAR(255), nullable=True) # Người thực hiện (e.g. Hà Minh Xuân)
    result = Column(NVARCHAR(50), nullable=True) # Kết quả: Pass, Fail, Chưa đg
    notes = Column(NVARCHAR(1000), nullable=True) # Ghi chú
    images = Column(NVARCHAR(4000), nullable=True) # JSON array chứa các hình ảnh kiểm tra

    # Quan hệ liên kết
    occurrence = relationship("CAPAOccurrence", back_populates="evaluations")
