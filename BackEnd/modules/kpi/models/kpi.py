from sqlalchemy import Column, Integer, Float
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base

class KPI(Base):
    """
    Model quản lý các chỉ số KPI.
    """
    __tablename__ = "kpis"

    id          = Column(Integer, primary_key=True, index=True)
    content     = Column(NVARCHAR(500), nullable=False)
    target      = Column(Float, nullable=True) # Mục tiêu (%)
    actual      = Column(Float, nullable=True) # Thực hiện (%)
    status      = Column(NVARCHAR(50), nullable=True) # Đạt, Không đạt, v.v. (danger, success, neutral)
    period_type = Column(NVARCHAR(50), nullable=True) # Theo tháng, Theo tuần
    period_name = Column(NVARCHAR(50), nullable=True) # Tháng 1, Tuần 16, v.v.
