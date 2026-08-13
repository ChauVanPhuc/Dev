from pydantic import BaseModel
from typing import Optional, List
from modules.production.schemas.stages import Stage

class RoleMin(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: Optional[bool] = True

    class Config:
        from_attributes = True

class PermissionBase(BaseModel):
    """
    Schema cơ bản cho Quyền hạn (Permission).
    Xác định các hành động mà một vai trò có thể thực hiện.
    """
    name: str                      # Tên quyền (ví dụ: Create_Order, Delete_User, ...)
    description: Optional[str] = None # Mô tả chi tiết về quyền này
    is_active: Optional[bool] = True         # Trạng thái hoạt động
    default_permissions: Optional[str] = None # Quyền mặc định dạng JSON

class PermissionCreate(PermissionBase):
    """Schema dùng để tạo mới một quyền hạn."""
    stage_ids: Optional[List[int]] = []
    role_ids: Optional[List[int]] = []

class PermissionUpdate(BaseModel):
    """Schema dùng để cập nhật thông tin quyền hạn."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    stage_ids: Optional[List[int]] = None
    role_ids: Optional[List[int]] = None
    default_permissions: Optional[str] = None # Quyền mặc định dạng JSON

class Permission(PermissionBase):
    """Schema hiển thị thông tin quyền hạn đầy đủ (bao gồm ID)."""
    id: int
    stages: List[Stage] = []
    roles: List[RoleMin] = []

    class Config:
        from_attributes = True
