# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, String, Date, Float, DateTime, Unicode, UnicodeText
from datetime import datetime
from config.database import Base

class QualityEmployeeAttendance(Base):
    __tablename__ = "quality_employee_attendances"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String(50), index=True, nullable=False)
    full_name = Column(Unicode(100), nullable=False)
    department = Column(Unicode(100), default="Phòng QLCL")
    stage = Column(Unicode(100), default="QLCL")
    factory = Column(Unicode(50), default="Nhà máy 1")
    work_date = Column(Date, index=True, nullable=False)
    status = Column(String(50), nullable=False, default="WORKING")
    status_label = Column(Unicode(100), nullable=True)
    overtime_hours = Column(Float, default=0.0)
    note = Column(UnicodeText, nullable=True)
    created_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
