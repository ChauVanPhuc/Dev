import datetime
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class Notification(Base):
    """
    Model đại diện cho bảng 'notifications' (Thông báo).
    Lưu trữ nội dung thông báo, người gửi, đối tượng nhận và mức độ ưu tiên.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(NVARCHAR(None)) # NVARCHAR(MAX) trong SQL Server cho phép lưu nội dung rất dài
    
    # Người gửi thông báo (Khóa ngoại liên kết tới bảng accounts)
    announcer_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    
    # Đối tượng nhận (vd: Toàn công ty, Sản xuất, QC...)
    target_group = Column(NVARCHAR(100), default="Toàn công ty")
    
    # Công đoạn nhận (vd: Phòng Mộc, Phòng Sơn...) - Dùng để lọc cho QC
    target_stage = Column(NVARCHAR(100), nullable=True)
    
    # Trạng thái/Mức độ (vd: Bình thường, Quan trọng, Khẩn cấp)
    priority_status = Column(NVARCHAR(50), default="Bình thường")
    
    # Thời gian tạo thông báo
    created_at = Column(DateTime, default=get_vietnam_time)

    # Quan hệ liên kết tới bảng Account để lấy thông tin người gửi
    announcer = relationship("Account")
