from pydantic import BaseModel
from typing import Optional

class CategoryBase(BaseModel):
    """
    Schema cơ bản cho Danh mục hàng hóa (Category).
    Dùng để phân loại sản phẩm, linh kiện trong hệ thống.
    """
    name: str                      # Tên danh mục (ví dụ: Phụ kiện, Nguyên liệu, ...)
    description: Optional[str] = None # Mô tả chi tiết danh mục

class CategoryCreate(CategoryBase):
    """Schema dùng để tạo mới một danh mục."""
    pass

class CategoryUpdate(CategoryBase):
    """Schema dùng để cập nhật thông tin danh mục."""
    name: Optional[str] = None

class Category(CategoryBase):
    """Schema hiển thị thông tin danh mục hoàn chỉnh (bao gồm ID)."""
    id: int

    class Config:
        from_attributes = True
