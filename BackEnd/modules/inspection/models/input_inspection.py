from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class InputInspection(Base):
    """
    Model cho bảng 'input_inspections' - Kiểm tra đầu vào.
    Ghi nhận kết quả kiểm tra kích thước (dài/rộng/cao) của chi tiết
    TRƯỚC khi tạo phiếu bàn giao.
    Khóa logic: (plan_id, part_name)
    """
    __tablename__ = "input_inspections"

    id              = Column(Integer, primary_key=True, index=True)
    plan_id         = Column(Integer, ForeignKey("product_plans.id"), nullable=False)
    part_name       = Column(NVARCHAR(255), nullable=False)  # Tên chi tiết cần KT
    specification   = Column(NVARCHAR(255), nullable=True)   # Quy cách chi tiết cần KT
    cont_name       = Column(NVARCHAR(50), nullable=True)    # Container (VD: "Cont 60")
    stage           = Column(NVARCHAR(255), nullable=True)   # Công đoạn thực hiện KT
    inspector_id    = Column(Integer, nullable=True)         # ID người kiểm tra
    inspected_at    = Column(DateTime, default=get_vietnam_time)

    # Kích thước đo được (đơn vị: mm)
    measured_length = Column(Float, nullable=True)
    measured_width  = Column(Float, nullable=True)
    measured_height = Column(Float, nullable=True)

    # Kết quả kiểm tra
    result          = Column(NVARCHAR(20), nullable=False)   # 'Đạt' | 'Không đạt'
    note            = Column(NVARCHAR(500), nullable=True)

    # Ảnh minh chứng (tối đa 3 tấm)
    image_path_1    = Column(NVARCHAR(500), nullable=True)
    image_path_2    = Column(NVARCHAR(500), nullable=True)
    image_path_3    = Column(NVARCHAR(500), nullable=True)

    # Trạng thái xác nhận (Thêm mới)
    is_confirmed    = Column(Boolean, default=False, nullable=False)
    confirmed_at    = Column(DateTime, nullable=True)
    confirmed_by    = Column(Integer, nullable=True)
