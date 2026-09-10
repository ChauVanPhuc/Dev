# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from datetime import datetime
from app.core.database import Base

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
    
    # Fields from JSON / Import PDF
    lpn = Column(NVARCHAR(50), nullable=True)
    container_no = Column(NVARCHAR(50), nullable=True)
    action = Column(NVARCHAR(200), nullable=True) # Penalty/Action taken
    period = Column(NVARCHAR(20), nullable=True) # Month-Year (e.g. "02-2026")
    image_paths = Column(NVARCHAR, nullable=True) # Store as JSON string (NVARCHAR(MAX))
    image_captions = Column(NVARCHAR, nullable=True) # Store as JSON string (NVARCHAR(MAX))
    
    created_at = Column(DateTime, default=datetime.now)
    resolved_at = Column(DateTime, nullable=True)
