from sqlalchemy import Column, Integer, Boolean, Index, text
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
    email = Column(NVARCHAR(100), index=True)
    phone = Column(NVARCHAR(20))
    hashed_password = Column(NVARCHAR(255), nullable=False)
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        Index(
            "ux_accounts_phone",
            "phone",
            unique=True,
            mssql_where=text("phone IS NOT NULL")
        ),
    )
    
    # Các trường mới thêm cho Quản lý người dùng
    employee_id = Column(NVARCHAR(20), unique=True, index=True) # Mã nhân viên
    full_name = Column(NVARCHAR(100)) # Họ tên đầy đủ
    status = Column(NVARCHAR(50), default="Đang sử dụng") # Trạng thái: Đang sử dụng, Dừng hoạt động, Đang chờ xóa
    created_at = Column(NVARCHAR(50)) # Lưu chuỗi ngày tháng để dễ hiển thị (hoặc dùng DateTime)
    fcm_token = Column(NVARCHAR(None), nullable=True) # Lưu mã Token để gửi Push Notifications qua Firebase
    last_notif_seen_id = Column(Integer, default=0) # ID của thông báo mới nhất mà người dùng đã xem
    failed_login_attempts = Column(Integer, default=0) # [NEW] Số lần đăng nhập sai liên tiếp
    screen_permissions = Column(NVARCHAR(None), nullable=True) # Lưu trữ dạng JSON string các quyền trên từng màn hình
    permission_level = Column(NVARCHAR(50), nullable=True) # Quyền hạn: Công Nhân, Nhân Viên, Quản Lý, Trưởng Phòng
    is_mobile_allowed = Column(Boolean, default=True) # Quyền truy cập ứng dụng Mobile
    is_web_allowed = Column(Boolean, default=True) # Quyền truy cập ứng dụng Web
    department_id = Column(Integer, nullable=True) # ID Bộ phận (bảng departments)
    permission_id = Column(Integer, nullable=True) # ID Vị trí (bảng permissions)
    factory_id = Column(Integer, nullable=True) # ID Nhà máy (bảng hr_factory_structures)
    factory_name = Column(NVARCHAR(100), nullable=True) # Tên Nhà máy


