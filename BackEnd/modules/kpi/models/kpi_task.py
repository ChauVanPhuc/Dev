# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, Float, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from datetime import datetime
from config.database import Base

class KPITask(Base):
    """
    Model quản lý phiếu Nhiệm vụ đặc tả (CL.03.2)
    """
    __tablename__ = "kpi_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_code = Column(NVARCHAR(50), unique=True, index=True, nullable=False) # e.g. "CL.03.2" hoặc "NV001"
    task_name = Column(NVARCHAR(255), nullable=False) # Tên nhiệm vụ
    assigner = Column(NVARCHAR(100), nullable=False) # Người giao
    assignee = Column(NVARCHAR(100), nullable=False) # Người nhận
    deadline = Column(NVARCHAR(50), nullable=True) # Hạn chót
    priority = Column(NVARCHAR(50), default=u"Trung bình") # Cao, Trung bình, Thấp
    status = Column(NVARCHAR(50), default=u"Đang thực hiện") # Đang thực hiện, Hoàn thành, Quá hạn
    target_score = Column(Float, default=120.0) # Điểm chỉ tiêu tối đa (VD: 120)
    achieved_score = Column(Float, default=40.0) # Điểm đã đạt (VD: 40)
    description = Column(NVARCHAR(1000), nullable=True) # Mô tả nhiệm vụ
    created_at = Column(DateTime, default=datetime.utcnow)

class KPITaskChecklistCriteria(Base):
    """
    Model chi tiết tiêu chí đánh giá checklist gắn với từng Nhiệm vụ
    """
    __tablename__ = "kpi_task_checklist_criterias"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, nullable=False, index=True) # ID liên kết với kpi_tasks
    stt = Column(Integer, default=1)
    criteria_name = Column(NVARCHAR(255), nullable=False) # Tiêu chí đánh giá
    max_score = Column(Float, default=10.0) # Trọng số / Điểm tối đa
    achieved_score = Column(Float, default=0.0) # Điểm đạt
    evaluation = Column(NVARCHAR(50), default=u"Đạt") # Đạt / Không đạt / Khá / Tốt
    note = Column(NVARCHAR(500), nullable=True) # Ghi chú
    created_at = Column(DateTime, default=datetime.utcnow)
