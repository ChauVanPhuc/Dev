from sqlalchemy import Column, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base

class DefectType(Base):
    """
    Model lưu trữ danh mục các loại lỗi (Defects) phân theo nhóm.
    """
    __tablename__ = "defect_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(NVARCHAR(250), nullable=False) # Tên lỗi (ví dụ: Nứt tét)
    category = Column(NVARCHAR(50), nullable=False) # Nhóm: tracking, visual, structure, material, paint
    stage = Column(NVARCHAR(500), nullable=True) # Công đoạn phát sinh lỗi (lưu JSON list hoặc chuỗi dài)
    description = Column(NVARCHAR(1000), nullable=True) # Mô tả chi tiết về lỗi / Tiêu chuẩn ghi nhật ký
    needs_tracking = Column(Boolean, default=False) # QA theo dõi đặc biệt
    qc_tracking = Column(Boolean, default=False)    # QC theo dõi đặc biệt
    is_active = Column(Boolean, default=True)

    # Cột bổ sung cho danh mục lỗi G7
    code = Column(NVARCHAR(50), nullable=True, unique=True, index=True) # Mã lỗi G7 (Ví dụ: MAT-01, STR-01)
    aql_class = Column(NVARCHAR(50), nullable=True)                     # Phân loại AQL (Critical, Major, Minor)

    # Mối quan hệ tới lỗi của khách hàng
    client_defects = relationship("ClientDefect", back_populates="g7_defect", cascade="all, delete-orphan")


class ClientDefect(Base):
    """
    Model lưu danh mục lỗi phía khách hàng (Atlas Vanity) ánh xạ tới lỗi nội bộ G7.
    """
    __tablename__ = "client_defects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(50), nullable=False, unique=True, index=True) # Mã lỗi của khách hàng (Ví dụ: DVA_01, DVB_01)
    name = Column(NVARCHAR(250), nullable=False)                         # Tên lỗi Tiếng Việt (Ví dụ: MỐC)
    name_en = Column(NVARCHAR(250), nullable=True)                       # Tên lỗi Tiếng Anh (Ví dụ: MOLD)
    minor_criteria = Column(NVARCHAR(500), nullable=True)                # Tiêu chuẩn lỗi nhẹ
    major_criteria = Column(NVARCHAR(500), nullable=True)                # Tiêu chuẩn lỗi nặng
    critical_criteria = Column(NVARCHAR(500), nullable=True)             # Tiêu chuẩn lỗi nghiêm trọng
    detection_method = Column(NVARCHAR(250), nullable=True)              # Phương pháp xác định (Ví dụ: MẮT & TAY)

    g7_code = Column(NVARCHAR(50), nullable=True)                        # Lưu mã G7 để đối chiếu gốc
    defect_type_id = Column(Integer, ForeignKey("defect_types.id", ondelete="CASCADE"), nullable=True)
    is_active = Column(Boolean, default=True)

    g7_defect = relationship("DefectType", back_populates="client_defects")


class DefectGlossary(Base):
    """
    Model lưu trữ bảng chú thích các ký tự viết tắt / phân loại lỗi.
    """
    __tablename__ = "defect_glossaries"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(NVARCHAR(50), nullable=False)                         # 'ATLAS' hoặc 'G7'
    code = Column(NVARCHAR(50), nullable=False, index=True)               # Ký tự viết tắt (DVA, MAT, etc.)
    description = Column(NVARCHAR(500), nullable=False)                   # Mô tả ý nghĩa của ký tự


