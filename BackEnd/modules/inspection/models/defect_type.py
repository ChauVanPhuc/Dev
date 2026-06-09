from sqlalchemy import Column, Integer, Boolean
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base

class DefectType(Base):
    """
    Model lưu trữ danh mục các loại lỗi (Defects) phân theo nhóm.
    """
    __tablename__ = "defect_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(NVARCHAR(250), nullable=False) # Tên lỗi (ví dụ: Nứt tét)
    category = Column(NVARCHAR(50), nullable=False) # Nhóm: tracking, visual, structure, material
    stage = Column(NVARCHAR(100), nullable=True) # Công đoạn phát sinh lỗi (Có thể lưu nhiều công đoạn, cách nhau dấu phẩy)
    description = Column(NVARCHAR(500), nullable=True) # Mô tả chi tiết về lỗi
    needs_tracking = Column(Boolean, default=False) # QA theo dõi đặc biệt
    qc_tracking = Column(Boolean, default=False)    # QC theo dõi đặc biệt
    is_active = Column(Boolean, default=True)
