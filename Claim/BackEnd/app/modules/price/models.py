# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, Float, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from datetime import datetime
from app.core.database import Base

class CabinetPrice(Base):
    """
    Model quản lý bảng giá tủ gỗ
    """
    __tablename__ = "cabinet_prices"

    id = Column(Integer, primary_key=True, index=True)
    cabinet_code = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    cabinet_name = Column(NVARCHAR(150), nullable=False)
    material = Column(NVARCHAR(100))
    dimensions = Column(NVARCHAR(50)) # Ví dụ: "800x1200x600"
    base_price = Column(Float, nullable=False)
    sale_price = Column(Float, nullable=False)
    status = Column(NVARCHAR(50), default="Active") # Active, Inactive
    last_updated = Column(DateTime, default=datetime.now, onupdate=datetime.now)
