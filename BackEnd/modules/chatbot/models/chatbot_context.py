# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from datetime import datetime
from config.database import Base

class ChatbotContext(Base):
    """
    Model lưu trữ context memory cho chatbot claim
    """
    __tablename__ = "chatbot_contexts"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(NVARCHAR(100), unique=True, index=True, nullable=False)
    last_cabinet_no = Column(NVARCHAR(50), nullable=True)
    last_sku = Column(NVARCHAR(100), nullable=True)
    last_period = Column(NVARCHAR(20), nullable=True)
    last_defect_code = Column(NVARCHAR(100), nullable=True)
    last_action = Column(NVARCHAR(100), nullable=True)
    last_container = Column(NVARCHAR(50), nullable=True)
    last_lpn = Column(NVARCHAR(50), nullable=True)
    last_status = Column(NVARCHAR(50), nullable=True)
    last_severity = Column(NVARCHAR(20), nullable=True)
    last_intent = Column(NVARCHAR(50), nullable=True)
    last_items = Column(NVARCHAR(2000), nullable=True)  # JSON string of last items
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
