from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class BackupQRCode(Base):
    """
    Model đại diện cho bảng 'backup_qr_codes'.
    Quản lý trạng thái luân chuyển của các thẻ QR dự phòng.
    """
    __tablename__ = "backup_qr_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(100), unique=True, index=True)
    status = Column(NVARCHAR(50), default="Trống") # 'Trống' hoặc 'Đang Sử Dụng'
    current_delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=True)
    current_inspection_id = Column(Integer, nullable=True)
    scheduled_release_at = Column(DateTime, nullable=True) # Mốc thời gian tự động giải phóng (7h ngày mai)
    created_at = Column(DateTime, default=get_vietnam_time)
