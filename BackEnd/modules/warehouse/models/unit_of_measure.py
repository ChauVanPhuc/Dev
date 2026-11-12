# -*- coding: utf-8 -*-
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base


class UnitOfMeasure(Base):
    """
    Model quản lý danh mục Đơn vị tính dùng chung toàn hệ thống (Kho, Hàng hóa, BOM).
    """
    __tablename__ = "units_of_measure"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(50), unique=True, index=True, nullable=False)       # Tên / ký hiệu ĐVT (m3, Tấm, Kg...)
    full_name = Column(NVARCHAR(150), nullable=True, default="")                # Tên đầy đủ (Mét khối, Kilogram...)
    precision = Column(Integer, nullable=False, default=0)                      # Số chữ số thập phân (0 - 6)
    status = Column(NVARCHAR(20), nullable=False, default="ACTIVE")             # ACTIVE / INACTIVE
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

