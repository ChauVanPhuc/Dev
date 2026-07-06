from sqlalchemy import Column, Integer, DateTime, Date, ForeignKey, Float
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
import datetime

class Machine(Base):
    """
    Model quản lý Máy móc (Sản xuất).
    """
    __tablename__ = "machines"

    id                = Column(Integer, primary_key=True, index=True)
    name              = Column(NVARCHAR(255), nullable=False)
    code              = Column(NVARCHAR(100), nullable=False, unique=True)
    status            = Column(NVARCHAR(100), nullable=True) # Hoạt động bình thường, Bảo trì...
    factory           = Column(NVARCHAR(255), nullable=True) # Nhà máy
    department        = Column(NVARCHAR(255), nullable=True) # Tổ / Bộ phận
    receive_date      = Column(Date, nullable=True)          # Ngày nhận máy / Về xưởng
    origin            = Column(NVARCHAR(255), nullable=True) # Xuất xứ
    supplier          = Column(NVARCHAR(255), nullable=True) # Nhà cung cấp
    maintenance_cycle = Column(Integer, nullable=True)      # Chu kỳ bảo trì (số ngày)
    next_maintenance_date = Column(Date, nullable=True)      # Ngày bảo trì dự kiến
    last_maintenance_date = Column(Date, nullable=True)      # Ngày bảo trì gần nhất / thực tế
    notes             = Column(NVARCHAR(1000), nullable=True)# Ghi chú
    images            = Column(NVARCHAR(None), nullable=True) # Danh sách ảnh dạng JSON/Comma string
    qr_code           = Column(NVARCHAR(255), nullable=True)  # QR code
    daily_run_time    = Column(Float, nullable=True)          # Thời gian hoạt động TB 1 ngày
    productivity      = Column(NVARCHAR(255), nullable=True)  # Năng suất máy
    production_year   = Column(NVARCHAR(50), nullable=True)   # Năm sản xuất
    owner_name        = Column(NVARCHAR(255), nullable=True)  # Người phụ trách
    created_at        = Column(DateTime, nullable=True, default=datetime.datetime.now)

class MachineMaintenance(Base):
    """
    Nhật ký/Lịch sử Bảo trì máy móc.
    """
    __tablename__ = "machine_maintenances"

    id               = Column(Integer, primary_key=True, index=True)
    machine_id       = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    performed_by     = Column(NVARCHAR(255), nullable=True)  # Người thực hiện
    verified_by      = Column(NVARCHAR(255), nullable=True)  # Người kiểm tra
    check_date       = Column(Date, nullable=True)           # Ngày kiểm tra
    maintenance_date = Column(Date, nullable=True)           # Ngày bảo trì
    status           = Column(NVARCHAR(100), nullable=True)  # Trạng thái sau bảo trì
    notes            = Column(NVARCHAR(500), nullable=True)  # Ghi chú
    created_at       = Column(DateTime, nullable=True, default=datetime.datetime.now)

class MachineDocument(Base):
    """
    Tài liệu đính kèm của máy móc (Lịch sử bảo trì, Hướng dẫn bảo trì, Hướng dẫn sử dụng...)
    """
    __tablename__ = "machine_documents"

    id           = Column(Integer, primary_key=True, index=True)
    machine_id   = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    file_name    = Column(NVARCHAR(255), nullable=False)
    file_path    = Column(NVARCHAR(1000), nullable=False)
    category     = Column(NVARCHAR(100), nullable=False) # maintenance_history, maintenance_instruction, user_manual
    upload_date  = Column(DateTime, nullable=True, default=datetime.datetime.now)
    uploader     = Column(NVARCHAR(255), nullable=True)
