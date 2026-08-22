from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Boolean
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
import datetime

class DailyInspectionRecord(Base):
    __tablename__ = "daily_inspection_records"

    id = Column(Integer, primary_key=True, index=True)
    inspection_date = Column(Date, default=datetime.date.today)
    stage_name = Column(NVARCHAR(100), nullable=False)
    inspector_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    batch_no = Column(NVARCHAR(100), nullable=True)
    status = Column(NVARCHAR(50), default="Đã hoàn thành")
    is_confirmed = Column(Boolean, default=True)
    total_products = Column(Integer, default=0)
    total_defects = Column(Integer, default=0)
    defect_rate = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.now)

    # Relationships
    defects = relationship("DailyInspectionDefect", back_populates="record", cascade="all, delete-orphan")

class DailyInspectionDefect(Base):
    __tablename__ = "daily_inspection_defects"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("daily_inspection_records.id"), nullable=False)
    defect_id = Column(Integer, ForeignKey("defect_types.id"), nullable=False)
    quantity = Column(Integer, default=0)

    # Relationships
    record = relationship("DailyInspectionRecord", back_populates="defects")
    defect_type = relationship("DefectType")

    @property
    def defect_name(self):
        return self.defect_type.name if self.defect_type else None

    @property
    def defect_code(self):
        return self.defect_type.code if self.defect_type else None
