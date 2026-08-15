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
    Schema cơ bản cho Quyền hạn / Vị trí (Permission).
    Xác định các hành động và vị trí trong cơ cấu tổ chức.
    """
    name: str                      # Tên quyền / vị trí (ví dụ: Dev, Tester, Tổ trưởng, ...)
    description: Optional[str] = None # Mô tả chi tiết về vị trí này
    is_active: Optional[bool] = True         # Trạng thái hoạt động
    default_permissions: Optional[str] = None # Quyền mặc định dạng JSON
    department_id: Optional[int] = None      # ID Bộ phận trực thuộc
    role_id: Optional[int] = None            # ID Phòng ban trực thuộc

class PermissionCreate(PermissionBase):
    """Schema dùng để tạo mới một quyền hạn/vị trí."""
    stage_ids: Optional[List[int]] = []
    role_ids: Optional[List[int]] = []

class PermissionUpdate(BaseModel):
    """Schema dùng để cập nhật thông tin quyền hạn/vị trí."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    stage_ids: Optional[List[int]] = None
    role_ids: Optional[List[int]] = None
    role_id: Optional[int] = None
    default_permissions: Optional[str] = None # Quyền mặc định dạng JSON
    department_id: Optional[int] = None

class Permission(PermissionBase):
    """Schema hiển thị thông tin quyền hạn đầy đủ (bao gồm ID)."""
    id: int
    department_name: Optional[str] = None
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    stages: List[Stage] = []
    roles: List[RoleMin] = []

    class Config:
        from_attributes = True
