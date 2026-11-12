# -*- coding: utf-8 -*-
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base


class GoodsReceipt(Base):
    """
    Model quản lý chứng từ Phiếu Nhập Kho (Header).
    """
    __tablename__ = "goods_receipts"

    id = Column(Integer, primary_key=True, index=True)
    voucher_no = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    warehouse_code = Column(NVARCHAR(20), index=True, nullable=True)
    warehouse_name = Column(NVARCHAR(150), nullable=False)
    receipt_date = Column(Date, index=True, nullable=False)
    deliverer_name = Column(NVARCHAR(150), nullable=True)
    customer_code = Column(NVARCHAR(50), nullable=True)
    customer_name = Column(NVARCHAR(200), nullable=True)
    department_name = Column(NVARCHAR(150), nullable=True)
    content = Column(NVARCHAR(500), nullable=True)
    receipt_type = Column(NVARCHAR(100), nullable=True, default="Nhập mua hàng")
    status = Column(NVARCHAR(30), index=True, nullable=False, default="PENDING")  # COMPLETED, PENDING, PROCESSING, DRAFT, CANCELLED
    ctgs = Column(NVARCHAR(100), nullable=True)
    total_lines = Column(Integer, nullable=False, default=0)
    total_quantity = Column(Float, nullable=False, default=0.0)
    created_by = Column(NVARCHAR(100), nullable=True)
    created_channel = Column(NVARCHAR(20), nullable=False, default="Web")
    confirmed_by = Column(NVARCHAR(100), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    images_json = Column(NVARCHAR(None), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_deleted = Column(Boolean, nullable=False, default=False)

    items = relationship(
        "GoodsReceiptItem",
        back_populates="receipt",
        cascade="all, delete-orphan",
        order_by="GoodsReceiptItem.line_no"
    )


class GoodsReceiptItem(Base):
    """
    Model quản lý chi tiết dòng hàng trong Phiếu Nhập Kho (12 cột).
    """
    __tablename__ = "goods_receipt_items"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("goods_receipts.id", ondelete="CASCADE"), index=True, nullable=False)
    line_no = Column(Integer, nullable=False, default=1)
    item_code = Column(NVARCHAR(100), index=True, nullable=False)
    item_name = Column(NVARCHAR(250), nullable=False)
    image_url = Column(NVARCHAR(500), nullable=True)
    unit1 = Column(NVARCHAR(50), nullable=False)
    quantity1 = Column(Float, nullable=False, default=0.0)
    unit2 = Column(NVARCHAR(50), nullable=True)
    quantity2 = Column(Float, nullable=True, default=0.0)
    conversion_rate = Column(Float, nullable=False, default=1.0)
    lsx = Column(NVARCHAR(100), nullable=True)
    package_split = Column(NVARCHAR(150), nullable=True)
    notes = Column(NVARCHAR(500), nullable=True)

    receipt = relationship("GoodsReceipt", back_populates="items")

