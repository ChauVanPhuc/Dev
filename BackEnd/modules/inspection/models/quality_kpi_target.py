# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, Float, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from datetime import datetime
from config.database import Base

class QualityKPITarget(Base):
    """
    Model lưu trữ giá trị tùy chỉnh cho 6 thẻ KPI (Section 1 - Quality Overview Dashboard)
    """
    __tablename__ = "quality_kpi_targets"

    id = Column(Integer, primary_key=True, index=True)
    kpi_key = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    title = Column(NVARCHAR(255), nullable=False)
    target_year = Column(Integer, nullable=False, default=2026)
    target_text = Column(NVARCHAR(50), nullable=True)     # VD: "< 0.50%", "> 98%"
    vanity_label = Column(NVARCHAR(100), nullable=True, default="Vanity")    # Tên Dòng hàng 1 (VD: "Vanity", "ADV", "ATLAS")
    vanity_val = Column(NVARCHAR(50), nullable=True)      # VD: "0.3%"
    vanity_change = Column(NVARCHAR(50), nullable=True)   # VD: "▼ 0.1%"
    furniture_label = Column(NVARCHAR(100), nullable=True, default="Furniture") # Tên Dòng hàng 2 (VD: "Furniture", "ADVANCE")
    furniture_val = Column(NVARCHAR(50), nullable=True)   # VD: "0.7%"
    furniture_change = Column(NVARCHAR(50), nullable=True)# VD: "▼ 0.2%"
    formula_text = Column(NVARCHAR(500), nullable=True)    # Phương pháp đo lường / Công thức tính
    history_json = Column(NVARCHAR(None), nullable=True)    # Lịch sử ghi nhận biến động các tháng JSON
    score_avg = Column(Float, nullable=True)               # VD: 95.0
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        import json
        history_list = []
        if self.history_json:
            try:
                history_list = json.loads(self.history_json)
            except Exception:
                history_list = []
        return {
            "id": self.id,
            "kpi_key": self.kpi_key,
            "title": self.title,
            "target_year": self.target_year,
            "target_text": self.target_text,
            "vanity_label": self.vanity_label or "Vanity",
            "vanity_val": self.vanity_val,
            "vanity_change": self.vanity_change,
            "furniture_label": self.furniture_label or "Furniture",
            "furniture_val": self.furniture_val,
            "furniture_change": self.furniture_change,
            "formula_text": self.formula_text or "",
            "history_json": history_list,
            "score_avg": self.score_avg,
            "updated_at": self.updated_at.strftime("%d/%m/%Y %H:%M") if self.updated_at else ""
        }
