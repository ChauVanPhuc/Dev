from sqlalchemy import Column, Integer, Boolean
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base

class Account(Base):
    """
    Model đại diện cho bảng 'accounts' (Tài khoản) trong Database.
    """
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(NVARCHAR(50), unique=True, index=True, nullable=False)
    email = Column(NVARCHAR(100), unique=True, index=True)
    hashed_password = Column(NVARCHAR(255), nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Các trường mới thêm cho Quản lý người dùng
    employee_id = Column(NVARCHAR(20), unique=True, index=True) # Mã nhân viên
    full_name = Column(NVARCHAR(100)) # Họ tên đầy đủ
    status = Column(NVARCHAR(50), default="Đang sử dụng") # Trạng thái: Đang sử dụng, Dừng hoạt động, Đang chờ xóa
    created_at = Column(NVARCHAR(50)) # Lưu chuỗi ngày tháng để dễ hiển thị (hoặc dùng DateTime)
    fcm_token = Column(NVARCHAR(None), nullable=True) # Lưu mã Token để gửi Push Notifications qua Firebase
    last_notif_seen_id = Column(Integer, default=0) # ID của thông báo mới nhất mà người dùng đã xem
    failed_login_attempts = Column(Integer, default=0) # [NEW] Số lần đăng nhập sai liên tiếp

