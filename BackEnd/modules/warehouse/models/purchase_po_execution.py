# -*- coding: utf-8 -*-
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Date, DateTime, Index
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base


class WarehousePurchaseOrderItem(Base):
    """
    Bảng lưu dữ liệu Báo cáo tổng hợp tình hình thực hiện Đơn mua hàng (PO đặt hàng).
    Phục vụ tra cứu nhanh Mã PO, Tên NCC, Tên hàng và Số lượng đặt khi tạo Phiếu Nhập Kho.
    """
    __tablename__ = "warehouse_purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    category_group = Column(NVARCHAR(200), nullable=True)
    line_no = Column(Integer, nullable=True, default=1)

    po_code = Column(NVARCHAR(100), index=True, nullable=False)
    order_date = Column(Date, nullable=True)
    delivery_date = Column(Date, nullable=True)
    supplier_code = Column(NVARCHAR(50), index=True, nullable=True)
    supplier_name = Column(NVARCHAR(255), nullable=True)

    item_code = Column(NVARCHAR(100), index=True, nullable=True)
    item_name = Column(NVARCHAR(300), nullable=False)
    accounting_code = Column(NVARCHAR(30), nullable=True)
    unit1 = Column(NVARCHAR(50), nullable=True)
    unit2 = Column(NVARCHAR(50), nullable=True)

    order_qty_main = Column(Float, nullable=False, default=0.0)
    unit_price = Column(Float, nullable=False, default=0.0)
    order_qty_conv = Column(Float, nullable=False, default=0.0)
    order_amount = Column(Float, nullable=False, default=0.0)

    received_period_main = Column(Float, nullable=False, default=0.0)
    received_period_conv = Column(Float, nullable=False, default=0.0)
    received_period_amount = Column(Float, nullable=False, default=0.0)

    received_cum_main = Column(Float, nullable=False, default=0.0)
    received_cum_conv = Column(Float, nullable=False, default=0.0)
    received_cum_amount = Column(Float, nullable=False, default=0.0)
    remaining_qty = Column(Float, nullable=False, default=0.0)

    warehouse_name = Column(NVARCHAR(200), index=True, nullable=True)
    sales_order_code = Column(NVARCHAR(100), nullable=True)
    lsx_code = Column(NVARCHAR(100), nullable=True)
    request_code = Column(NVARCHAR(100), nullable=True)

    approval_status = Column(NVARCHAR(50), nullable=True)
    execution_status = Column(NVARCHAR(50), nullable=True)
    notes = Column(NVARCHAR(500), nullable=True)
    order_type = Column(NVARCHAR(50), nullable=True)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        Index("IX_wpoi_po_wh", "po_code", "warehouse_name"),
    )

