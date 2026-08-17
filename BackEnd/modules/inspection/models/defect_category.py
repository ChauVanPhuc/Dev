from sqlalchemy import Column, Integer, Boolean, DateTime, func
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base

class DefectCategory(Base):
    """
    Model lưu trữ danh mục phân nhóm lỗi QC (Defect Categories) được cấu hình linh động trong Cấu hình hệ thống.
    """
    __tablename__ = "defect_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(50), nullable=False, unique=True, index=True) # visual, structure, material, paint, other, etc.
    name = Column(NVARCHAR(250), nullable=False)                         # Ngoại quan (Visual / APP), Kết cấu (Structure / STR),...
    prefix = Column(NVARCHAR(20), nullable=False)                        # APP, STR, MAT, PAI, OTH (dùng tự động sinh mã lỗi G7)
    default_departments = Column(NVARCHAR(500), nullable=True)           # Danh sách bộ phận mặc định JSON string (ví dụ: ["Sơn - Đóng gói", "Xưởng Đóng Gói"])
    description = Column(NVARCHAR(500), nullable=True)                   # Ghi chú / mô tả
    color = Column(NVARCHAR(50), nullable=True)                          # Màu sắc hiển thị hoặc mã HEX
    order_index = Column(Integer, default=0)                             # Thứ tự hiển thị
    is_active = Column(Boolean, default=True)                            # Trạng thái kích hoạt
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
