from pydantic import BaseModel, EmailStr
from typing import Optional, List, Union
from datetime import datetime

class AccountBase(BaseModel):
    """
    Schema cơ bản cho Tài khoản người dùng (Account).
    Chứa các thông tin định danh và trạng thái hoạt động.
    """
    username: str                          # Tên đăng nhập
    phone: Union[str, None] = None          # Số điện thoại
    email: Union[EmailStr, str, None] = None # Địa chỉ Email
    is_active: bool = True                 # Trạng thái tài khoản (Đang hoạt động hay không)

class AccountCreate(AccountBase):
    """
    Schema dùng để tạo mới một tài khoản.
    Yêu cầu mật khẩu và các thông tin liên kết nhân sự/phòng ban.
    """
    password: str                          # Mật khẩu
    phone: Union[str, None] = None          # Số điện thoại (tùy chọn)
    employee_id: Union[str, None] = None    # Mã nhân viên (từ HRM)
    employee_code: Union[str, None] = None  # Mã nhân viên (phương án 2)
    full_name: Union[str, None] = None      # Họ và tên
    name: Union[str, None] = None           # Họ và tên (phương án 2)
    role_id: Union[int, None] = None        # ID vai trò (Role)
    permission_id: Union[int, None] = None  # ID quyền hạn (Permission)
    stage_id: Union[int, None] = None       # ID công đoạn (Stage) phụ trách
    stage_ids: Union[List[int], None] = None # Danh sách ID các công đoạn phụ trách
    permission_level: Union[str, None] = None # Quyền hạn: Công Nhân, Nhân Viên, Quản Lý, Trưởng Phòng


class AccountUpdate(BaseModel):
    """
    Schema dùng để cập nhật thông tin tài khoản.
    Tất cả các trường đều là tùy chọn.
    """
    email: Union[EmailStr, str, None] = None
    phone: Union[str, None] = None
    password: Union[str, None] = None
    is_active: Union[bool, None] = None
    full_name: Union[str, None] = None
    name: Union[str, None] = None
    employee_id: Union[str, None] = None
    employee_code: Union[str, None] = None
    status: Union[str, None] = None
    permission_level: Union[str, None] = None # Quyền hạn: Công Nhân, Nhân Viên, Quản Lý, Trưởng Phòng

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
    employee_id: Union[str, None] = None
    full_name: Union[str, None] = None
    status: Union[str, None] = None
    created_at: Union[str, datetime, None] = None # Thời gian tạo
    
    # Thông tin mở rộng từ các phép Join (Role, Stage)
    role_name: Union[str, None] = None # Tên vai trò
    permission_name: Union[str, None] = None # Tên chức vụ
    stage_name: Union[str, None] = None # Tên công đoạn phụ trách
    permission_level: Union[str, None] = None # Quyền hạn: Công Nhân, Nhân Viên, Quản Lý, Trưởng Phòng

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
    username: Union[str, None] = None
    full_name: Union[str, None] = None
    email: Union[str, None] = None
    phone: Union[str, None] = None
    employee_id: Union[str, None] = None
    role_name: Union[str, None] = None
    role_description: Union[str, None] = None
    permission_name: Union[str, None] = None
    permission_description: Union[str, None] = None
    stage_name: Union[str, None] = None
    stage_description: Union[str, None] = None
    id: Union[int, None] = None
    screen_permissions: Union[str, None] = None
    permission_level: Union[str, None] = None # Quyền hạn: Công Nhân, Nhân Viên, Quản Lý, Trưởng Phòng

class TokenData(BaseModel):
    """
    Schema chứa dữ liệu giải mã từ JWT token (sub/username).
    """
    username: Union[str, None] = None

class FCMTokenUpdate(BaseModel):
    """
    Schema dùng để cập nhật mã FCM Token từ thiết bị di động.
    """
    user_id: int
    fcm_token: str

class PasswordChange(BaseModel):
    """
    Schema dùng để thay đổi mật khẩu tài khoản người dùng.
    """
    old_password: str
    new_password: str
