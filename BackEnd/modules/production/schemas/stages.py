from pydantic import BaseModel
from typing import Optional

class StageBase(BaseModel):
    """
    Schema cơ bản cho Công đoạn (Stage).
    Đại diện cho các bước trong quy trình sản xuất.
    """
    code: Optional[str] = None
    name: str
    description: Optional[str] = None
    sequence: int = 0
    is_active: bool = True

class StageCreate(StageBase):
    """Schema dùng để tạo mới một công đoạn."""
    pass

class StageUpdate(BaseModel):
    """
    Schema dùng để cập nhật thông tin công đoạn.
    Tất cả các trường đều là tùy chọn.
    """
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    sequence: Optional[int] = None
    is_active: Optional[bool] = None

class Stage(StageBase):
    """Schema hiển thị thông tin công đoạn đầy đủ (bao gồm ID)."""
    id: int

    class Config:
        from_attributes = True
