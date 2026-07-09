# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, Float, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from datetime import datetime
from config.database import Base

class CustomerClaim(Base):
    """
    Model quản lý khiếu nại (Claim) của khách hàng
    """
    __tablename__ = "customer_claims"

    id = Column(Integer, primary_key=True, index=True)
    claim_code = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    customer_name = Column(NVARCHAR(100), nullable=True)
    product_name = Column(NVARCHAR(150), nullable=False)
    order_code = Column(NVARCHAR(50), nullable=True)
    company_error_code = Column(NVARCHAR(50), nullable=True)
    description = Column(NVARCHAR(1000))
    severity = Column(NVARCHAR(20), default="Medium") # Low, Medium, High
    status = Column(NVARCHAR(50), default="Received") # Received, Processing, Resolved, Rejected
    
    # New fields from JSON
    lpn = Column(NVARCHAR(50), nullable=True)
    container_no = Column(NVARCHAR(50), nullable=True)
    action = Column(NVARCHAR(200), nullable=True) # Penalty/Action taken
    period = Column(NVARCHAR(20), nullable=True) # Month-Year (e.g. "02-2026")
    image_paths = Column(NVARCHAR, nullable=True) # Store as JSON string (NVARCHAR(MAX))
    image_captions = Column(NVARCHAR, nullable=True) # Store as JSON string (NVARCHAR(MAX))
    
    created_at = Column(DateTime, default=datetime.now)
    resolved_at = Column(DateTime, nullable=True)

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

class ContainerShipment(Base):
    """
    Model quản lý lịch trình xuất container (Xuất công)
    """
    __tablename__ = "container_shipments"

    id = Column(Integer, primary_key=True, index=True)
    shipment_code = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    container_number = Column(NVARCHAR(50), nullable=False)
    seal_number = Column(NVARCHAR(50))
    destination_port = Column(NVARCHAR(100), nullable=False)
    etd = Column(DateTime, nullable=True) # Estimated Time of Departure
    eta = Column(DateTime, nullable=True) # Estimated Time of Arrival
    status = Column(NVARCHAR(50), default="Draft") # Draft, Loading, Shipped, Delivered
    total_value = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.now)

# ClaimDefect model removed - using ClientDefect from inspection module instead

