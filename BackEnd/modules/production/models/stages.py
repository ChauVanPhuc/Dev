from sqlalchemy import Column, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from modules.auth.models.associations import permission_stage

class Stage(Base):
    """
    Model đại diện cho bảng 'stages' (Công đoạn sản xuất).
    Định nghĩa các bước/công đoạn trong quy trình sản xuất.
    """
    __tablename__ = "stages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(NVARCHAR(100), nullable=False, unique=True) # Tên công đoạn
    description = Column(NVARCHAR(255))                     # Mô tả công đoạn

    # Quan hệ Many-to-Many tới Permission (Cửa quyền truy cập)
    permissions = relationship("Permission", secondary=permission_stage, back_populates="stages")
