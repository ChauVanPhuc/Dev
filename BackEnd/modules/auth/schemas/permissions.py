from pydantic import BaseModel
from typing import Optional, List
from modules.production.schemas.stages import Stage

class PermissionBase(BaseModel):
    """
    Schema cơ bản cho Quyền hạn (Permission).
    Xác định các hành động mà một vai trò có thể thực hiện.
    """
    name: str                      # Tên quyền (ví dụ: Create_Order, Delete_User, ...)
    description: Optional[str] = None # Mô tả chi tiết về quyền này

class PermissionCreate(PermissionBase):
    """Schema dùng để tạo mới một quyền hạn."""
    pass

class Permission(PermissionBase):
    """Schema hiển thị thông tin quyền hạn đầy đủ (bao gồm ID)."""
    id: int
    stages: List[Stage] = []

    class Config:
        from_attributes = True
