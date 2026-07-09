from sqlalchemy import Column, Integer, Float
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base

class StaffEvaluation(Base):
    """
    Model quản lý đánh giá nhân sự chi tiết và xếp loại thái độ.
    """
    __tablename__ = "staff_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    staff_name = Column(NVARCHAR(255), nullable=False)
    stage = Column(NVARCHAR(100), nullable=True) # Công đoạn (e.g. Định hình 1)
    level = Column(NVARCHAR(50), nullable=True) # Level (e.g. A)
    department = Column(NVARCHAR(100), nullable=True) # Bộ phận (e.g. QLCL)
    goal_score = Column(Float, nullable=True) # Tổng mục tiêu
    actual_score = Column(Float, nullable=True) # Tổng thực hiện
    status = Column(NVARCHAR(50), nullable=True) # "Chưa đánh giá", "Đã đánh giá"
    rating = Column(NVARCHAR(10), nullable=True) # Loại A, B, C, D
    manager_note = Column(NVARCHAR(1000), nullable=True) # Nhận xét từ quản lý
    proposed_action = Column(NVARCHAR(1000), nullable=True) # Đề xuất hành động
    kpi_details = Column(NVARCHAR(4000), nullable=True) # JSON list của các sub-KPI
