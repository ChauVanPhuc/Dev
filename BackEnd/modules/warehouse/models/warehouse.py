# -*- coding: utf-8 -*-
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, Date, DateTime, Index
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base


class Warehouse(Base):
    """
    Model quản lý danh mục các Kho lưu trữ chuẩn (KTP, KDG, KHH, KNLC, KVT, KSON).
    """
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(20), unique=True, index=True, nullable=False)       # KTP, KDG, KHH, KNLC, KVT, KSON
    name = Column(NVARCHAR(150), nullable=False)                                # Kho thành phẩm, Kho nguyên liệu chính...
    description = Column(NVARCHAR(500), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.now)


class WarehouseMaterial(Base):
    """
    Model quản lý danh mục Vật tư / Hàng hóa & Tồn đầu kỳ gốc tại từng Kho.
    """
    __tablename__ = "warehouse_materials"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_code = Column(NVARCHAR(20), index=True, nullable=False)          # Mã kho
    warehouse_name = Column(NVARCHAR(150), nullable=False)                     # Tên kho chuẩn
    item_code = Column(NVARCHAR(100), index=True, nullable=False)              # Mã vật tư
    item_name = Column(NVARCHAR(250), nullable=False)                          # Tên vật tư / Goods
    category = Column(NVARCHAR(50), nullable=True, default="OTHER")            # GO_NGUYEN_LIEU, PHU_KIEN_KIM_KHI...
    unit_main = Column(NVARCHAR(50), nullable=False, default="Cái")            # Đơn vị chính (ĐVC)
    unit_conversion = Column(NVARCHAR(50), nullable=True)                      # Đơn vị chuyển đổi (ĐVCĐ)
    conversion_rate = Column(Float, nullable=False, default=1.0)               # Tỷ lệ quy đổi ĐVC -> ĐVCĐ
    opening_main = Column(Float, nullable=False, default=0.0)                  # Tồn đầu gốc theo ĐVC
    initial_receipt_date = Column(Date, nullable=True)                         # Ngày nhập gốc tính FIFO Aging
    image_url = Column(NVARCHAR(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        Index("IX_warehouse_materials_wh_item", "warehouse_code", "item_code", unique=True),
    )

