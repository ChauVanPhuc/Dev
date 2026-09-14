# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, Boolean, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.sql import func
from config.database import Base


class InspectionFormType(Base):
    """
    Master data: Danh sách các loại phiếu kiểm tra / cách kiểm tra.
    Hỗ trợ tùy biến (Custom) linh hoạt: thêm, sửa tên, mô tả, màu sắc, thứ tự, bật/tắt.
    """
    __tablename__ = "inspection_form_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    name = Column(NVARCHAR(150), nullable=False)
    short_name = Column(NVARCHAR(50), nullable=True)
    description = Column(NVARCHAR(500), nullable=True)
    route_path = Column(NVARCHAR(250), nullable=True)
    icon = Column(NVARCHAR(50), nullable=True)
    color = Column(NVARCHAR(30), default='#0284C7', nullable=True)
    bg_color = Column(NVARCHAR(30), default='#F0F9FF', nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.now(), nullable=True)
