from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from modules.production.schemas.bom_detail import BOMDetail

class ProductBase(BaseModel):
    """
    Schema cơ bản cho Sản phẩm (Product).
    Chứa các thông tin kỹ thuật và trạng thái tồn kho.
    """
    sku: Optional[str] = None           # Mã SKU sản phẩm
    name: str                           # Tên sản phẩm
    category_id: Optional[int] = None   # ID danh mục sản phẩm
    price: float = 0.0                  # Giá bán
    material: Optional[str] = None      # Chất liệu
    color: Optional[str] = None         # Màu sắc
    length: float = 0.0                 # Chiều dài
    width: float = 0.0                  # Chiều rộng
    height: float = 0.0                 # Chiều cao
    weight: float = 0.0                 # Trọng lượng
    status: Optional[str] = "Active"    # Trạng thái (Active/Inactive)
    quantity: float = 0.0               # Số lượng tồn kho
    description: Optional[str] = None   # Mô tả chi tiết

class ProductCreate(ProductBase):
    """Schema dùng để tạo mới một sản phẩm."""
    pass

class ProductUpdate(BaseModel):
    """Schema dùng để cập nhật thông tin sản phẩm (tất cả các trường là tùy chọn)."""
    sku: Optional[str] = None
    name: Optional[str] = None
    category_id: Optional[int] = None
    price: Optional[float] = None
    material: Optional[str] = None
    color: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    status: Optional[str] = None
    quantity: Optional[float] = None
    description: Optional[str] = None

class Product(ProductBase):
    """Schema hiển thị thông tin sản phẩm đầy đủ từ database."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
