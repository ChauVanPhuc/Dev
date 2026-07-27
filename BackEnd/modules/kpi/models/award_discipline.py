from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from datetime import datetime

class AwardDiscipline(Base):
    """
    Model quản lý báo cáo vi phạm / khen thưởng kỷ luật.
    Mở rộng với các trường mới để hỗ trợ quản lý vi phạm đầy đủ.
    """
    __tablename__ = "award_disciplines"

    id = Column(Integer, primary_key=True, index=True)
    staff_name = Column(NVARCHAR(255), nullable=False)
    issue = Column(NVARCHAR(255), nullable=False)
    note = Column(NVARCHAR(1000), nullable=True)
    impact = Column(NVARCHAR(50), nullable=False)  # Cao, Trung bình, Thấp
    points = Column(Integer, nullable=False)
    date = Column(NVARCHAR(50), nullable=False)  # Ngày kiểm tra (e.g. "22.01.2026")
    evidence_images = Column(NVARCHAR(4000), nullable=True)  # JSON array của các ảnh

    # === Trường mở rộng mới ===
    rule_code = Column(NVARCHAR(50), nullable=True)       # Mã quy tắt (liên kết kpi_point_rules)
    rule_name = Column(NVARCHAR(255), nullable=True)       # Tên quy tắt
    severity = Column(NVARCHAR(50), nullable=True)         # Mức độ: Nghiêm trọng, Nhẹ, Trung bình
    employee_id = Column(NVARCHAR(50), nullable=True, index=True)  # Mã nhân sự
    department = Column(NVARCHAR(100), nullable=True)      # Phòng ban
    position = Column(NVARCHAR(100), nullable=True)        # Vị trí
    section = Column(NVARCHAR(100), nullable=True)         # Bộ phận
    violation_time = Column(NVARCHAR(100), nullable=True)  # Thời gian vi phạm cụ thể
    reporter_name = Column(NVARCHAR(255), nullable=True)   # Người phát hiện/ghi nhận
    description = Column(NVARCHAR(1000), nullable=True)    # Mô tả chi tiết
    status = Column(NVARCHAR(50), nullable=True, default="pending")  # pending, tracking, approved, rejected
    created_at = Column(DateTime, nullable=True, default=datetime.utcnow)
