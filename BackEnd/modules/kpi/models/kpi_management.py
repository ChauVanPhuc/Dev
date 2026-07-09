from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base

class KPIChecklist(Base):
    """
    Model quản lý Checklist công việc chi tiết của nhân viên.
    """
    __tablename__ = "kpi_checklists"

    id             = Column(Integer, primary_key=True, index=True)
    employee_id    = Column(NVARCHAR(50), nullable=False, index=True) # Liên kết với employee_id trong accounts
    task_code      = Column(NVARCHAR(50), nullable=False) # e.g. "CV01"
    content        = Column(NVARCHAR(255), nullable=False) # e.g. "Duyệt báo cáo"
    frequency      = Column(NVARCHAR(50), nullable=False) # e.g. "Hàng ngày", "Hàng tuần"
    status_today   = Column(NVARCHAR(50), nullable=False, default="Chưa hoàn thành") # e.g. "Chưa hoàn thành", "Đã hoàn thành"
    perform_count  = Column(Integer, nullable=False, default=0)
    last_performed = Column(NVARCHAR(50), nullable=True) # e.g. "2026-07-01"
    result         = Column(NVARCHAR(255), nullable=True) # e.g. "Đầy đủ biên bản"

class KPIEmployeeItem(Base):
    """
    Model quản lý danh sách chỉ số KPI chi tiết của nhân viên.
    """
    __tablename__ = "kpi_employee_items"

    id          = Column(Integer, primary_key=True, index=True)
    employee_id = Column(NVARCHAR(50), nullable=False, index=True) # Liên kết với accounts.employee_id
    kpi_code    = Column(NVARCHAR(50), nullable=False) # e.g. "KPI01"
    content     = Column(NVARCHAR(255), nullable=False) # e.g. "Duy trì họp giao việc"
    score       = Column(Integer, nullable=False, default=0) # Điểm số tối đa của KPI này
    calc_method = Column(NVARCHAR(500), nullable=False) # Công thức / cách tính
    target      = Column(NVARCHAR(100), nullable=False) # e.g. ">= 1 Biên bản/tuần"
    actual      = Column(NVARCHAR(100), nullable=True) # e.g. "1.2 biên bản/tuần"
    status      = Column(NVARCHAR(50), nullable=True) # e.g. "Đạt KPI", "Chưa đạt KPI"
    icon        = Column(NVARCHAR(50), nullable=True) # Tên icon indicator

class KPIViolation(Base):
    """
    Model quản lý danh sách vi phạm / cộng trừ điểm chi tiết (Quy tắc cộng trừ điểm).
    """
    __tablename__ = "kpi_violations"

    id             = Column(Integer, primary_key=True, index=True)
    employee_id    = Column(NVARCHAR(50), nullable=False, index=True) # Liên kết với accounts.employee_id
    violation_code = Column(NVARCHAR(50), nullable=False) # e.g. "VP01"
    content        = Column(NVARCHAR(255), nullable=False) # e.g. "Thiếu form mẫu vẽ"
    calculation    = Column(NVARCHAR(100), nullable=False) # e.g. "-10", "+50"
    violation_time = Column(NVARCHAR(100), nullable=False) # e.g. "2026-07-01 08:30"
    performer      = Column(NVARCHAR(100), nullable=False) # Người chịu trách nhiệm/thực hiện
    note           = Column(NVARCHAR(500), nullable=True)

class KPIFeedback(Base):
    """
    Model quản lý danh sách phản hồi và nhận xét chi tiết của nhân viên.
    """
    __tablename__ = "kpi_feedbacks"

    id            = Column(Integer, primary_key=True, index=True)
    employee_id   = Column(NVARCHAR(50), nullable=False, index=True) # Liên kết với accounts.employee_id
    feedback_code = Column(NVARCHAR(50), nullable=False) # e.g. "NX01"
    type          = Column(NVARCHAR(50), nullable=False) # e.g. "Thành tích nổi bật", "Những khó khăn"
    content       = Column(NVARCHAR(1000), nullable=False) # Nội dung nhận xét
    feedback_time = Column(NVARCHAR(100), nullable=False) # e.g. "2026-07-01"
    reviewer      = Column(NVARCHAR(100), nullable=False) # Quản lý nhận xét

class KPIPointRule(Base):
    """
    Model quản lý các Quy tắc / Điều luật cộng trừ điểm chung (Global KPI rules).
    """
    __tablename__ = "kpi_point_rules"

    id          = Column(Integer, primary_key=True, index=True)
    rule_code   = Column(NVARCHAR(50), nullable=False) # e.g. "RL01"
    content     = Column(NVARCHAR(255), nullable=False) # e.g. "Thiếu tem mẫu"
    points      = Column(Integer, nullable=False, default=0) # e.g. -50, 20
    impact      = Column(NVARCHAR(50), nullable=False) # e.g. "Cao", "Trung bình", "Thấp"
    note        = Column(NVARCHAR(500), nullable=True)

class KPIChecklistPool(Base):
    """
    Model quản lý danh mục Checklist công việc mẫu chung (Global Checklist pool).
    """
    __tablename__ = "kpi_checklist_pool"

    id        = Column(Integer, primary_key=True, index=True)
    task_code = Column(NVARCHAR(50), nullable=False) # e.g. "CV01"
    content   = Column(NVARCHAR(255), nullable=False) # e.g. "Báo cáo OQA"
    frequency = Column(NVARCHAR(50), nullable=False) # e.g. "Hàng ngày"

class KPIItemPool(Base):
    """
    Model quản lý danh mục chỉ số KPI mẫu chung (Global KPI pool).
    """
    __tablename__ = "kpi_item_pool"

    id          = Column(Integer, primary_key=True, index=True)
    kpi_code    = Column(NVARCHAR(50), nullable=False) # e.g. "KPI01"
    content     = Column(NVARCHAR(255), nullable=False) # e.g. "Tỷ lệ lọt lỗi"
    # score     = Column(Integer, nullable=False, default=50) # Điểm số (Đã loại bỏ)
    calc_method = Column(NVARCHAR(500), nullable=False) # Cách tính
    target      = Column(NVARCHAR(100), nullable=False) # Mục tiêu
