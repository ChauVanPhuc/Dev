from sqlalchemy import Column, Integer
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base

class AwardDiscipline(Base):
    """
    Model quản lý khen thưởng, kỷ luật (Daily Inspection / Awards & Discipline).
    """
    __tablename__ = "award_disciplines"

    id = Column(Integer, primary_key=True, index=True)
    staff_name = Column(NVARCHAR(255), nullable=False)
    issue = Column(NVARCHAR(255), nullable=False)
    note = Column(NVARCHAR(1000), nullable=True)
    impact = Column(NVARCHAR(50), nullable=False) # Cao, Trung bình, Thấp
    points = Column(Integer, nullable=False)
    date = Column(NVARCHAR(50), nullable=False) # Ngày kiểm tra (e.g. "22.01.2026")
    evidence_images = Column(NVARCHAR(4000), nullable=True) # JSON array của các ảnh
