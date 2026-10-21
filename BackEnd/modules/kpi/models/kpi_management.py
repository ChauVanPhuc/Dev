from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from datetime import datetime

class KPIChecklist(Base):
    """
    Model quản lý Checklist công việc chi tiết của nhân viên & Kho Thư viện Checklist Master.
    """
    __tablename__ = "kpi_checklists"

    id             = Column(Integer, primary_key=True, index=True)
    employee_id    = Column(NVARCHAR(50), nullable=False, index=True, default="ALL") # 'ALL' cho Master Checklist, hoặc mã nhân sự khi đã gán
    task_code      = Column(NVARCHAR(50), nullable=False) # e.g. "CL-IQC-01"
    content        = Column(NVARCHAR(255), nullable=False) # Nội dung công việc
    frequency      = Column(NVARCHAR(50), nullable=True) # e.g. "Hàng ngày", "Đầu ca"
    status_today   = Column(NVARCHAR(50), nullable=True, default="Chưa làm") # Dùng khi đã gán cho nhân sự
    perform_count  = Column(Integer, nullable=True, default=0)
    last_performed = Column(NVARCHAR(50), nullable=True) # e.g. "2026-10-05"
    result         = Column(NVARCHAR(255), nullable=True) # Tiêu chuẩn nghiệm thu / kết quả
    department_code = Column(NVARCHAR(50), nullable=True, index=True) # e.g. "IQC", "PQC1", "FQC", "QA"
    checklist_type = Column(NVARCHAR(20), nullable=True, default="FIXED") # FIXED | DEADLINE
    deadline_mode  = Column(NVARCHAR(20), nullable=True) # RECURRING | ONCE
    recurring_cycle = Column(NVARCHAR(20), nullable=True) # DAILY | WEEKLY | MONTHLY
    recurring_day_of_week = Column(NVARCHAR(50), nullable=True) # e.g. "MON,FRI"
    recurring_day_of_month = Column(Integer, nullable=True) # 1 - 31
    once_period_type = Column(NVARCHAR(20), nullable=True) # DAY | WEEK | MONTH
    due_date       = Column(NVARCHAR(50), nullable=True) # e.g. "2026-10-15"
    target_week    = Column(NVARCHAR(20), nullable=True) # e.g. "2026-W41"
    target_month   = Column(NVARCHAR(20), nullable=True) # e.g. "2026-10"
    due_time       = Column(NVARCHAR(10), nullable=True) # e.g. "17:00"
    priority       = Column(NVARCHAR(20), nullable=True, default="MEDIUM") # HIGH | MEDIUM | LOW
    target_role    = Column(NVARCHAR(100), nullable=True, default="ALL") # ALL | INSPECTOR | LEADER | MANAGER
    weight_score   = Column(Integer, nullable=True, default=10) # Điểm số trọng số KPI khi hoàn thành
    evidence_type  = Column(NVARCHAR(50), nullable=True, default="NONE") # NONE | PHOTO | FILE | NUMERIC
    guide_code     = Column(NVARCHAR(100), nullable=True) # Mã quy trình / HDKT tham chiếu
    is_active      = Column(Boolean, nullable=True, default=True) # True: Áp dụng, False: Tạm khóa
    evidence_url   = Column(NVARCHAR(1000), nullable=True) # Đường dẫn file/ảnh/chữ ký nộp bằng chứng
    performer_note = Column(NVARCHAR(1000), nullable=True) # Ghi chú thực tế của người thực hiện
    completed_at   = Column(NVARCHAR(50), nullable=True) # Thời điểm hoàn thành


class KPIEmployeeItem(Base):
    """
    Model quản lý danh sách chỉ số KPI chi tiết của nhân viên.
    """
    __tablename__ = "kpi_employee_items"

    id               = Column(Integer, primary_key=True, index=True)
    employee_id      = Column(NVARCHAR(50), nullable=False, index=True) # Liên kết với accounts.employee_id
    kpi_code         = Column(NVARCHAR(50), nullable=False) # e.g. "KPI01"
    content          = Column(NVARCHAR(255), nullable=False) # e.g. "Duy trì họp giao việc"
    score            = Column(Integer, nullable=False, default=0) # Điểm số tối đa/Trọng số của KPI này
    calc_method      = Column(NVARCHAR(500), nullable=False) # Công thức / cách tính e.g. "avg_ticket_rate"
    target           = Column(NVARCHAR(100), nullable=False) # e.g. ">= 95%"
    actual           = Column(NVARCHAR(100), nullable=True) # e.g. "98.5%"
    status           = Column(NVARCHAR(50), nullable=True) # e.g. "Đạt KPI", "Chưa đạt KPI"
    icon             = Column(NVARCHAR(50), nullable=True) # Tên icon indicator
    category         = Column(NVARCHAR(10), nullable=True, default="D") # A, B, C, D, E, F
    
    # 🆕 Các cột cấu hình động chi tiết bao phủ mọi tình huống
    department       = Column(NVARCHAR(100), nullable=True)
    data_source      = Column(NVARCHAR(50), nullable=True, default="inspection") # inspection, capa, violation, training, claim
    stage_filter     = Column(NVARCHAR(255), nullable=True) # e.g. "Đầu Vào,Nhập Kho"
    type_filter      = Column(NVARCHAR(100), nullable=True) # e.g. "first_sample", "patrol", "final"
    employee_field   = Column(NVARCHAR(50), nullable=True, default="inspector_name") # inspector_name, employee_id, handler_name
    penalty_factor   = Column(Float, nullable=True, default=2.0) # Hệ số trừ điểm/lần vi phạm
    denominator      = Column(Float, nullable=True, default=26.0) # Mẫu số tính tỷ lệ (ngày công, công việc...)
    no_data_behavior = Column(NVARCHAR(50), nullable=True, default="full_score") # full_score, zero_score, no_data, target_value
    unit             = Column(NVARCHAR(50), nullable=True, default="%")
    operator         = Column(NVARCHAR(10), nullable=True, default=">=")
    target_val       = Column(NVARCHAR(50), nullable=True, default="95")

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
    department_code = Column(NVARCHAR(50), nullable=True, index=True) # e.g. "IQC", "PQC1", "FQC", "QA"


class KPIItemPool(Base):
    """
    Model quản lý danh mục chỉ số KPI mẫu chung (Global KPI pool).
    """
    __tablename__ = "kpi_item_pool"

    id               = Column(Integer, primary_key=True, index=True)
    kpi_code         = Column(NVARCHAR(50), nullable=False) # e.g. "KPI01"
    content          = Column(NVARCHAR(255), nullable=False) # e.g. "Tỷ lệ lọt lỗi"
    calc_method      = Column(NVARCHAR(500), nullable=False) # Cách tính
    target           = Column(NVARCHAR(100), nullable=False) # Mục tiêu
    category         = Column(NVARCHAR(10), nullable=True, default="D") # A, B, C, D, E, F
    
    # 🆕 Các cột cấu hình động chi tiết bao phủ mọi tình huống
    department       = Column(NVARCHAR(100), nullable=True)
    data_source      = Column(NVARCHAR(50), nullable=True, default="inspection") # inspection, capa, violation, training, claim
    stage_filter     = Column(NVARCHAR(255), nullable=True) # e.g. "Đầu Vào,Nhập Kho"
    type_filter      = Column(NVARCHAR(100), nullable=True) # e.g. "first_sample", "patrol", "final"
    employee_field   = Column(NVARCHAR(50), nullable=True, default="inspector_name") # inspector_name, employee_id, handler_name
    penalty_factor   = Column(Float, nullable=True, default=2.0) # Hệ số trừ điểm/lần vi phạm
    denominator      = Column(Float, nullable=True, default=26.0) # Mẫu số tính tỷ lệ (ngày công, công việc...)
    no_data_behavior = Column(NVARCHAR(50), nullable=True, default="full_score") # full_score, zero_score, no_data, target_value
    unit             = Column(NVARCHAR(50), nullable=True, default="%")
    operator         = Column(NVARCHAR(10), nullable=True, default=">=")
    target_val       = Column(NVARCHAR(50), nullable=True, default="95")

class KPITrainingPlan(Base):
    """
    Model quản lý Kế hoạch đào tạo độc lập (Tab 5 trong KPI Dashboard).
    """
    __tablename__ = "kpi_training_plans"

    id        = Column(Integer, primary_key=True, index=True)
    code      = Column(NVARCHAR(50), nullable=False) # e.g. "KH-ĐT-01"
    name      = Column(NVARCHAR(255), nullable=False) # Tên chương trình đào tạo
    target    = Column(NVARCHAR(None), nullable=False) # Đối tượng tham gia (NVARCHAR(MAX))
    time      = Column(NVARCHAR(100), nullable=False) # Thời gian tổ chức
    teacher   = Column(NVARCHAR(255), nullable=False) # Giảng viên / Đơn vị đào tạo
    file_name = Column(NVARCHAR(None), nullable=True) # Tài liệu đính kèm (NVARCHAR(MAX))
    file_url  = Column(NVARCHAR(None), nullable=True) # Đường dẫn file (NVARCHAR(MAX))
    status    = Column(NVARCHAR(50), nullable=False, default="Sắp diễn ra")

class KPIMonthlyScore(Base):
    """
    Model lưu trữ kết quả tính điểm KPI và Xếp loại tổng kết của nhân viên theo tháng.
    """
    __tablename__ = "kpi_monthly_scores"

    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(NVARCHAR(50), nullable=False, index=True) # Mã nhân viên
    month           = Column(Integer, nullable=False) # Tháng (1 - 12)
    year            = Column(Integer, nullable=False) # Năm (e.g. 2026)
    kpi_score       = Column(Float, nullable=False, default=0.0) # Điểm KPI trọng số
    checklist_score = Column(Float, nullable=False, default=0.0) # Điểm Checklist
    violation_score = Column(Float, nullable=False, default=0.0) # Điểm vi phạm (bị trừ)
    manager_score   = Column(Float, nullable=False, default=0.0) # Điểm QLĐG
    total_score     = Column(Float, nullable=False, default=0.0) # Điểm tổng kết cuối cùng
    rating          = Column(NVARCHAR(20), nullable=True) # Xếp loại (A+, A, B, C, D)
    details_json    = Column(NVARCHAR(None), nullable=True) # JSON chi tiết từng KPI
    calculated_at   = Column(DateTime, default=datetime.utcnow)

class KPIAuditLog(Base):
    """
    Model lưu vết lịch sử sửa đổi giá trị thực tế (actual) của các KPI (Audit Trail).
    """
    __tablename__ = "kpi_audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    item_id     = Column(Integer, nullable=True, index=True) # Liên kết kpi_employee_items.id
    employee_id = Column(NVARCHAR(50), nullable=False, index=True)
    kpi_code    = Column(NVARCHAR(50), nullable=False) # e.g. "KPI04"
    old_value   = Column(NVARCHAR(100), nullable=True) # Giá trị trước khi sửa
    new_value   = Column(NVARCHAR(100), nullable=False) # Giá trị mới
    modified_by = Column(NVARCHAR(100), nullable=True, default="Quản lý QC") # Người sửa
    modified_at = Column(DateTime, default=datetime.utcnow) # Thời gian
    reason      = Column(NVARCHAR(500), nullable=True) # Ghi chú/Lý do



