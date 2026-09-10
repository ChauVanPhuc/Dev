from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MasterCategoryBase(BaseModel):
    """
    Schema cơ bản cho Danh mục Master (Danh mục mẫu).
    """
    name: str                   # Tên danh mục (ví dụ: Tủ bếp, Giường, Bàn)
    description: Optional[str] = None # Mô tả chi tiết danh mục
    main_category: Optional[str] = None # Dòng hàng chính (Vanity hoặc Furniture)
    status: int = 1             # Trạng thái (1: Hiệu lực, 0: Hết hiệu lực)

class MasterCategoryCreate(MasterCategoryBase):
    """
    Schema dùng để tạo mới danh mục mẫu.
    """
    pass

class MasterCategoryUpdate(BaseModel):
    """
    Schema dùng để cập nhật thông tin danh mục mẫu.
    """
    name: Optional[str] = None
    description: Optional[str] = None
    main_category: Optional[str] = None
    status: Optional[int] = None

class MasterCategory(MasterCategoryBase):
    """
    Schema hiển thị thông tin danh mục mẫu hoàn chỉnh.
    """
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
