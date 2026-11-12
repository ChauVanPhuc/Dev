# -*- coding: utf-8 -*-
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base


class GoodsIssue(Base):
    """
    Model quản lý chứng từ Phiếu Xuất Kho (Header).
    """
    __tablename__ = "goods_issues"

    id = Column(Integer, primary_key=True, index=True)
    voucher_no = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    warehouse_code = Column(NVARCHAR(20), index=True, nullable=True)
    warehouse_name = Column(NVARCHAR(150), nullable=False)
    issue_date = Column(Date, index=True, nullable=False)
    deliverer_name = Column(NVARCHAR(150), nullable=True)
    customer_code = Column(NVARCHAR(50), nullable=True)
    customer_name = Column(NVARCHAR(200), nullable=True)
    department_name = Column(NVARCHAR(150), nullable=True)
    factory_id = Column(Integer, index=True, nullable=True)
    factory_name = Column(NVARCHAR(100), nullable=True)
    content = Column(NVARCHAR(500), nullable=True)
    issue_type = Column(NVARCHAR(100), nullable=True, default="Xuất sản xuất")
    status = Column(NVARCHAR(30), index=True, nullable=False, default="PENDING")  # COMPLETED, PENDING, PROCESSING, DRAFT, CANCELLED
    ctgs = Column(NVARCHAR(100), nullable=True)
    total_lines = Column(Integer, nullable=False, default=0)
    total_quantity = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    created_by = Column(NVARCHAR(100), nullable=True)
    created_channel = Column(NVARCHAR(20), nullable=False, default="Web")
    receiver_name = Column(NVARCHAR(150), nullable=True)
    confirmed_by = Column(NVARCHAR(100), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    images_json = Column(NVARCHAR(None), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_deleted = Column(Boolean, nullable=False, default=False)

    items = relationship(
        "GoodsIssueItem",
        back_populates="issue",
        cascade="all, delete-orphan",
        order_by="GoodsIssueItem.line_no"
    )


class GoodsIssueItem(Base):
    """
    Model quản lý chi tiết dòng hàng trong Phiếu Xuất Kho.
    """
    __tablename__ = "goods_issue_items"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("goods_issues.id", ondelete="CASCADE"), index=True, nullable=False)
    line_no = Column(Integer, nullable=False, default=1)
    item_code = Column(NVARCHAR(100), index=True, nullable=False)
    item_name = Column(NVARCHAR(250), nullable=False)
    image_url = Column(NVARCHAR(500), nullable=True)
    unit1 = Column(NVARCHAR(50), nullable=False)
    quantity1 = Column(Float, nullable=False, default=0.0)
    unit2 = Column(NVARCHAR(50), nullable=True)
    quantity2 = Column(Float, nullable=True, default=0.0)
    conversion_rate = Column(Float, nullable=False, default=1.0)
    unit_price = Column(Float, nullable=False, default=0.0)
    amount = Column(Float, nullable=False, default=0.0)
    lsx = Column(NVARCHAR(100), nullable=True)
    package_split = Column(NVARCHAR(150), nullable=True)
    notes = Column(NVARCHAR(500), nullable=True)

    issue = relationship("GoodsIssue", back_populates="items")

