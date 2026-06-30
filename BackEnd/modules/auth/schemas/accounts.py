from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class AccountBase(BaseModel):
    """
    Schema cơ bản cho Tài khoản người dùng (Account).
    Chứa các thông tin định danh và trạng thái hoạt động.
    """
    username: str                  # Tên đăng nhập
    phone: Optional[str] = None    # Số điện thoại
    email: Optional[EmailStr] = None # Địa chỉ Email (phải đúng định dạng)
    is_active: bool = True         # Trạng thái tài khoản (Đang hoạt động hay không)

class AccountCreate(AccountBase):
    """
    Schema dùng để tạo mới một tài khoản.
    Yêu cầu mật khẩu và các thông tin liên kết nhân sự/phòng ban.
    """
    password: str                  # Mật khẩu
    phone: str                     # Số điện thoại (bắt buộc khi tạo)
    employee_id: Optional[str] = None # Mã nhân viên (từ HRM)
    employee_code: Optional[str] = None # Mã nhân viên (phương án 2)
    full_name: Optional[str] = None # Họ và tên
    name: Optional[str] = None     # Họ và tên (phương án 2)
    role_id: Optional[int] = None   # ID vai trò (Role)
    permission_id: Optional[int] = None # ID quyền hạn (Permission)
    stage_id: Optional[int] = None  # ID công đoạn (Stage) phụ trách
    stage_ids: Optional[List[int]] = None # [NEW] Danh sách ID các công đoạn phụ trách
    permission_level: Optional[str] = None # Quyền hạn: Công Nhân, Nhân Viên, Quản Lý, Trưởng Phòng


class AccountUpdate(BaseModel):
    """
    Schema dùng để cập nhật thông tin tài khoản.
    Tất cả các trường đều là tùy chọn.
    """
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None
    name: Optional[str] = None
    employee_id: Optional[str] = None
    employee_code: Optional[str] = None
    status: Optional[str] = None
    permission_level: Optional[str] = None # Quyền hạn: Công Nhân, Nhân Viên, Quản Lý, Trưởng Phòng

class Account(AccountBase):
    """
    Schema đại diện cho thông tin tài khoản hoàn chỉnh (bao gồm ID).
    Sử dụng khi trả về dữ liệu từ Database.
    """
    id: int

    class Config:
        from_attributes = True

# Schema chi tiết cho danh mục Quản lý người dùng trong Admin
class AccountInfo(AccountBase):
    """
    Schema hiển thị thông tin chi tiết tài khoản kèm theo tên vai trò và công đoạn.
    Thường dùng cho các bảng danh sách người dùng.
    """
    id: int
    employee_id: Optional[str] = None
    full_name: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None # Thời gian tạo
    
    # Thông tin mở rộng từ các phép Join (Role, Stage)
    role_name: Optional[str] = None # Tên vai trò
    permission_name: Optional[str] = None # Tên chức vụ
    stage_name: Optional[str] = None # Tên công đoạn phụ trách
    permission_level: Optional[str] = None # Quyền hạn: Công Nhân, Nhân Viên, Quản Lý, Trưởng Phòng

    class Config:
        from_attributes = True

# Schema phục vụ phản hồi phân trang
class PaginatedAccountResponse(BaseModel):
    """
    Schema đóng gói dữ liệu phản hồi có phân trang cho danh sách tài khoản.
    """
    items: List[AccountInfo] # Danh sách tài khoản
    total: int                # Tổng số bản ghi
    page: int                 # Trang hiện tại
    size: int                 # Số lượng bản ghi mỗi trang

class Token(BaseModel):
    """
    Schema đại diện cho Token truy cập (JWT).
    Chứa thông tin xác thực và phân quyền của người dùng sau khi đăng nhập.
    """
    access_token: str   # JWT Token chuỗi
    token_type: str     # Loại token (thường là "bearer")
    username: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    role_name: Optional[str] = None
    role_description: Optional[str] = None
    permission_name: Optional[str] = None
    permission_description: Optional[str] = None
    stage_name: Optional[str] = None
    stage_description: Optional[str] = None
    id: Optional[int] = None
    screen_permissions: Optional[str] = None
    permission_level: Optional[str] = None # Quyền hạn: Công Nhân, Nhân Viên, Quản Lý, Trưởng Phòng

class TokenData(BaseModel):
    """
    Schema chứa dữ liệu giải mã từ JWT token (sub/username).
    """
    username: Optional[str] = None

class FCMTokenUpdate(BaseModel):
    """
    Schema dùng để cập nhật mã FCM Token từ thiết bị di động.
    """
    user_id: int
    fcm_token: str
