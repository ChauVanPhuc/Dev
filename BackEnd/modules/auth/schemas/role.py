from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from modules.auth.schemas.permissions import Permission

class RoleBase(BaseModel):
    """
    Schema cơ bản cho Vai trò (Role).
    Sử dụng để phân quyền truy cập cho người dùng.
    """
    name: str                      # Tên vai trò (ví dụ: Admin, Manager, Worker, ...)
    description: Optional[str] = None # Mô tả chi tiết vai trò
    code: Optional[str] = None     # Mã viết tắt vai trò / phòng ban (QLCL, BGD, IT, SX...)
    is_active: Optional[bool] = True         # Trạng thái hoạt động
    default_permissions: Optional[str] = None # Quyền mặc định dạng JSON
    created_at: Optional[datetime] = None # Ngày tạo bộ phận

class RoleCreate(RoleBase):
    """Schema dùng để tạo mới một vai trò."""
    permission_ids: Optional[List[int]] = []

class RoleUpdate(BaseModel):
    """Schema dùng để cập nhật thông tin vai trò."""
    name: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None
    permission_ids: Optional[List[int]] = None
    default_permissions: Optional[str] = None # Quyền mặc định dạng JSON

class Role(RoleBase):
    """Schema hiển thị thông tin vai trò đầy đủ (bao gồm ID)."""
    id: int
    permissions: List[Permission] = []

    class Config:
        from_attributes = True
