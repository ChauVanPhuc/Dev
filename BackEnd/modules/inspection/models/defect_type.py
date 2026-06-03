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
    needs_tracking = Column(Boolean, default=False) # Cột "cần theo dõi" theo yêu cầu
    is_active = Column(Boolean, default=True)
