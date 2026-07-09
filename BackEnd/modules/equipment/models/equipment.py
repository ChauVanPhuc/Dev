from sqlalchemy import Column, Integer, DateTime, Date, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base

class Equipment(Base):
    """
    Model quản lý Thiết bị (Máy móc).
    """
    __tablename__ = "equipments"

    id                = Column(Integer, primary_key=True, index=True)
    name              = Column(NVARCHAR(255), nullable=False)
    code              = Column(NVARCHAR(100), nullable=False, unique=True)
    type              = Column(NVARCHAR(100), nullable=True)
    status            = Column(NVARCHAR(50), nullable=True) # Bình thường, Hỏng, Bảo trì...
    purchase_date     = Column(Date, nullable=True)
    maintenance_cycle = Column(Integer, nullable=True) # Số ngày
    
    # Các trường bổ sung theo thiết kế mới
    department        = Column(NVARCHAR(255), nullable=True) # Bộ phận phụ trách
    owner_name        = Column(NVARCHAR(255), nullable=True) # Người sở hữu
    calibration_date  = Column(Date, nullable=True)          # Ngày hiệu chuẩn
    handover_date     = Column(Date, nullable=True)          # Ngày bàn giao
    check_date        = Column(Date, nullable=True)          # Ngày kiểm tra
    attachment_pdf    = Column(NVARCHAR(None), nullable=True) # Biên bản bàn giao file PDF
    images            = Column(NVARCHAR(None), nullable=True)# Danh sách ảnh dạng JSON/Comma string
    user_manual_steps = Column(NVARCHAR(None), nullable=True) # JSON lưu trữ các bước HDSD

class EquipmentInspection(Base):
    """
    Lịch sử kiểm tra và hiệu chuẩn thiết bị.
    """
    __tablename__ = "equipment_inspections"

    id               = Column(Integer, primary_key=True, index=True)
    equipment_id     = Column(Integer, ForeignKey("equipments.id", ondelete="CASCADE"), nullable=False)
    performed_by     = Column(NVARCHAR(255), nullable=True)  # Người thực hiện
    verified_by      = Column(NVARCHAR(255), nullable=True)  # Người kiểm tra
    check_date       = Column(Date, nullable=True)           # Ngày kiểm tra
    calibration_date = Column(Date, nullable=True)           # Ngày hiệu chuẩn
    status           = Column(NVARCHAR(50), nullable=True)   # Trạng thái sau kiểm tra
    notes            = Column(NVARCHAR(500), nullable=True)  # Ghi chú

class EquipmentTraining(Base):
    """
    Thông tin đào tạo sử dụng thiết bị.
    """
    __tablename__ = "equipment_trainings"

    id               = Column(Integer, primary_key=True, index=True)
    equipment_id     = Column(Integer, ForeignKey("equipments.id", ondelete="CASCADE"), nullable=False)
    trainer          = Column(NVARCHAR(255), nullable=True)  # Người đào tạo
    summary          = Column(NVARCHAR(1000), nullable=True) # Tóm tắt nội dung
    training_date    = Column(Date, nullable=True)           # Ngày đào tạo
    evaluation_date  = Column(Date, nullable=True)           # Ngày đánh giá
    file_name        = Column(NVARCHAR(255), nullable=True)  # Tên file đính kèm
    file_type        = Column(NVARCHAR(100), nullable=True)  # Loại tài liệu đào tạo
    uploader         = Column(NVARCHAR(255), nullable=True)  # Người tải lên
    upload_date      = Column(Date, nullable=True)           # Ngày tải lên
    evaluation_result= Column(NVARCHAR(500), nullable=True)  # Kết quả sau đánh giá
    file_content_preview = Column(NVARCHAR(None), nullable=True) # Văn bản hiển thị thử file PDF


