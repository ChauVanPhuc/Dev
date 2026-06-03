from pydantic import BaseModel
from typing import Optional

class StageBase(BaseModel):
    """
    Schema cơ bản cho Công đoạn (Stage).
    Đại diện cho các bước trong quy trình sản xuất (ví dụ: Chế bản, Cắt, Dán, ...).
    """
    name: str                      # Tên công đoạn
    description: Optional[str] = None # Mô tả chi tiết công đoạn
    sequence_order: int = 0        # Thứ tự thực hiện trong quy trình

class StageCreate(StageBase):
    """Schema dùng để tạo mới một công đoạn."""
    pass

class StageUpdate(BaseModel):
    """
    Schema dùng để cập nhật thông tin công đoạn.
    Tất cả các trường đều là tùy chọn.
    """
    name: Optional[str] = None
    description: Optional[str] = None
    sequence_order: Optional[int] = None

class Stage(StageBase):
    """Schema hiển thị thông tin công đoạn đầy đủ (bao gồm ID)."""
    id: int

    class Config:
        from_attributes = True
