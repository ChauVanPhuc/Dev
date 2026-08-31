# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base

class QualityObjective(Base):
    """
    Model quản lý danh mục Mục tiêu Chất lượng (Quality Objective KPI Target)
    """
    __tablename__ = "quality_objectives"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    title = Column(NVARCHAR(255), nullable=False)
    category = Column(NVARCHAR(100), nullable=False, default="FPY")
    factory_name = Column(NVARCHAR(100), nullable=True, default="Tất cả")
    department_name = Column(NVARCHAR(100), nullable=True, default="Tất cả")
    period_type = Column(NVARCHAR(50), nullable=False, default="Tháng")
    year = Column(Integer, nullable=False, default=2026)
    month = Column(Integer, nullable=True)
    target_value = Column(Float, nullable=False, default=0.0)
    target_unit = Column(NVARCHAR(50), nullable=False, default="%")
    operator = Column(NVARCHAR(20), nullable=False, default=">=")
    description = Column(NVARCHAR(1000), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(NVARCHAR(100), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    logs = relationship("QualityObjectiveLog", back_populates="objective", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "title": self.title,
            "category": self.category,
            "factory_name": self.factory_name,
            "department_name": self.department_name,
            "period_type": self.period_type,
            "year": self.year,
            "month": self.month,
            "target_value": self.target_value,
            "target_unit": self.target_unit,
            "operator": self.operator,
            "description": self.description,
            "is_active": self.is_active,
            "created_by": self.created_by,
            "created_at": self.created_at.strftime("%d/%m/%Y") if self.created_at else "",
            "updated_at": self.updated_at.strftime("%d/%m/%Y") if self.updated_at else ""
        }

class QualityObjectiveLog(Base):
    """
    Model lưu lịch sử ghi nhận giá trị thực tế theo kỳ của mục tiêu chất lượng
    """
    __tablename__ = "quality_objective_logs"

    id = Column(Integer, primary_key=True, index=True)
    objective_id = Column(Integer, ForeignKey("quality_objectives.id", ondelete="CASCADE"), nullable=False)
    period_label = Column(NVARCHAR(50), nullable=False)
    actual_value = Column(Float, nullable=False, default=0.0)
    achievement_rate = Column(Float, nullable=False, default=0.0)
    evaluation_status = Column(NVARCHAR(50), nullable=False, default="Đạt")
    analysis_note = Column(NVARCHAR(1000), nullable=True)
    recorded_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    objective = relationship("QualityObjective", back_populates="logs")

    def to_dict(self):
        return {
            "id": self.id,
            "objective_id": self.objective_id,
            "period_label": self.period_label,
            "actual_value": self.actual_value,
            "achievement_rate": self.achievement_rate,
            "evaluation_status": self.evaluation_status,
            "analysis_note": self.analysis_note,
            "recorded_at": self.recorded_at.strftime("%d/%m/%Y %H:%M") if self.recorded_at else ""
        }
