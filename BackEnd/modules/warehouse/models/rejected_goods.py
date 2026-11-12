# -*- coding: utf-8 -*-
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, Date, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base


class RejectedGoods(Base):
    """
    Model quản lý phiếu Hàng loại / Hàng trả về (QC đầu vào loại hoặc Sản xuất trả về).
    """
    __tablename__ = "rejected_goods"

    id = Column(Integer, primary_key=True, index=True)
    voucher_no = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    created_date = Column(Date, index=True, nullable=False)
    source_type = Column(NVARCHAR(30), index=True, nullable=False, default="QC_INCOMING")  # QC_INCOMING | PROD_RETURN
    origin_voucher_id = Column(Integer, nullable=True)
    origin_voucher_no = Column(NVARCHAR(50), nullable=True)
    origin_line_id = Column(Integer, nullable=True)
    warehouse_code = Column(NVARCHAR(20), index=True, nullable=True)
    warehouse_name = Column(NVARCHAR(150), nullable=True)
    item_code = Column(NVARCHAR(100), index=True, nullable=False)
    item_name = Column(NVARCHAR(250), nullable=False)
    unit_main = Column(NVARCHAR(50), nullable=True)
    unit_conversion = Column(NVARCHAR(50), nullable=True)
    conversion_rate = Column(Float, nullable=False, default=1.0)
    quantity_main = Column(Float, nullable=False, default=0.0)
    quantity_conv = Column(Float, nullable=False, default=0.0)
    defect_category = Column(NVARCHAR(150), nullable=True)
    defect_reason = Column(NVARCHAR(500), nullable=True)
    resolution = Column(NVARCHAR(30), nullable=False, default="PENDING")         # PENDING, REUSE, SCRAP, RETURN_VENDOR, REWORK
    status = Column(NVARCHAR(30), index=True, nullable=False, default="PENDING")  # PENDING, RESOLVED, CANCELLED
    resolution_date = Column(Date, nullable=True)
    resolution_notes = Column(NVARCHAR(500), nullable=True)
    created_by = Column(NVARCHAR(100), nullable=True)
    created_channel = Column(NVARCHAR(20), nullable=False, default="Web")
    department_name = Column(NVARCHAR(150), nullable=True)
    factory_id = Column(Integer, index=True, nullable=True)
    factory_name = Column(NVARCHAR(100), nullable=True)
    return_mode = Column(NVARCHAR(30), nullable=False, default="DEFECTIVE")  # DEFECTIVE | GOOD_EXCESS
    returned_by = Column(NVARCHAR(100), nullable=True)
    received_by = Column(NVARCHAR(100), nullable=True)
    received_at = Column(DateTime, nullable=True)
    images_json = Column(NVARCHAR(None), nullable=True)
    is_demo = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_deleted = Column(Boolean, nullable=False, default=False)

