# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, String, Text, DateTime, Unicode, UnicodeText
from datetime import datetime
from config.database import Base

class QualityEmployee(Base):
    __tablename__ = "quality_employees"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(Unicode(100), nullable=False)
    department = Column(Unicode(100), default="Phòng QLCL")
    stage = Column(Unicode(100), default="QLCL")
    factory = Column(Unicode(50), default="Nhà máy 1")
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    status = Column(Unicode(50), default="Đang làm việc")
    latest_rating = Column(String(10), default="A")
    note = Column(UnicodeText, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
