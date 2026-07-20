# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base

class Employee(Base):
    """
    Model đại diện cho bảng 'employees' (Nhân viên) trong Database.
    """
    __tablename__ = "employees"

    id          = Column(Integer, primary_key=True, index=True)
    employee_id = Column(NVARCHAR(50), unique=True, index=True, nullable=False) # Mã nhân viên (SFxx hoặc tự nhập)
    full_name   = Column(NVARCHAR(250), nullable=False) # Họ và tên
    email       = Column(NVARCHAR(100), nullable=True) # Email
    phone       = Column(NVARCHAR(50), nullable=True) # Số điện thoại
    role_id       = Column(Integer, ForeignKey("roles.id"), nullable=True) # Phòng ban liên kết (Role)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=True) # Vị trí liên kết (Permission)
    department  = Column(NVARCHAR(100), nullable=True) # Phòng ban / Bộ phận (Text fallback)
    position    = Column(NVARCHAR(100), nullable=True) # Vị trí / Chức danh (Text fallback)
    status      = Column(NVARCHAR(50), default="Đang làm việc") # Trạng thái: Đang làm việc, Đã nghỉ việc
    note        = Column(NVARCHAR(500), nullable=True) # Ghi chú

    # Relationships
    role       = relationship("Role")
    permission = relationship("Permission")

