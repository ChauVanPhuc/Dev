from sqlalchemy import Column, Integer, DateTime, func
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base

class CAPA(Base):
    """
    Model đại diện cho báo cáo CAPA tổng thể (Master CAPA).
    """
    __tablename__ = "capas"

    id = Column(Integer, primary_key=True, index=True)
    error_name = Column(NVARCHAR(255), nullable=False) # Tên lỗi (e.g. Cong venh)
    description = Column(NVARCHAR(1000), nullable=True) # Mô tả lỗi
    severity = Column(NVARCHAR(50), nullable=True) # Mức độ quan tâm: Nghiêm trọng, Nặng, Nhẹ
    assigned_person = Column(NVARCHAR(255), nullable=True) # Phụ trách chính
    images = Column(NVARCHAR(4000), nullable=True) # JSON array chứa các hình ảnh lỗi
    created_at = Column(DateTime, default=func.now())

    # Quan hệ liên kết
    occurrences = relationship("CAPAOccurrence", back_populates="capa", cascade="all, delete-orphan")
