from pydantic import BaseModel
from typing import Optional, List
from modules.auth.schemas.permissions import Permission

class RoleBase(BaseModel):
    """
    Schema cơ bản cho Vai trò (Role).
    Sử dụng để phân quyền truy cập cho người dùng.
    """
    name: str                      # Tên vai trò (ví dụ: Admin, Manager, Worker, ...)
    description: Optional[str] = None # Mô tả chi tiết vai trò

class RoleCreate(RoleBase):
    """Schema dùng để tạo mới một vai trò."""
    pass

class RoleUpdate(RoleBase):
    """Schema dùng để cập nhật thông tin vai trò."""
    name: Optional[str] = None

class Role(RoleBase):
    """Schema hiển thị thông tin vai trò đầy đủ (bao gồm ID)."""
    id: int
    permissions: List[Permission] = []

    class Config:
        from_attributes = True
