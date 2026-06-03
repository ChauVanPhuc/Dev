from sqlalchemy import Column, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from modules.auth.models.associations import role_permission, permission_stage

class Permission(Base):
    """
    Model đại diện cho bảng 'permissions' (Quyền hạn).
    Định nghĩa các quyền thao tác trong hệ thống (Xem, Sửa, Xóa...).
    """
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(NVARCHAR(100), nullable=False) # Tên quyền
    description = Column(NVARCHAR(255))         # Mô tả quyền hạn

    # Quan hệ Many-to-Many tới Role (Vai trò)
    roles = relationship("Role", secondary=role_permission, back_populates="permissions")
    
    # Quan hệ Many-to-Many tới Stage (Công đoạn sản xuất)
    stages = relationship("Stage", secondary=permission_stage, back_populates="permissions")
