from sqlalchemy import Column, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from modules.auth.models.associations import role_permission

class Role(Base):
    """
    Model đại diện cho bảng 'roles' (Vai trò người dùng).
    Xác định các nhóm quyền hạn khác nhau trong hệ thống (Admin, User, Manager...).
    """
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(NVARCHAR(50), nullable=False, unique=True) # Tên vai trò
    description = Column(NVARCHAR(255))                     # Mô tả vai trò

    # Quan hệ Many-to-Many tới Permission (Quyền hạn)
    permissions = relationship("Permission", secondary=role_permission, back_populates="roles")
