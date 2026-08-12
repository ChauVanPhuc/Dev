from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class MasterProductBase(BaseModel):
    """
    Schema cơ bản cho Sản phẩm mẫu (Master Product).
    Gốc của cấu trúc Sản phẩm chuẩn (BOM mẫu).
    """
    sku: str                       # Mã sản phẩm chuẩn (Stock Keeping Unit)
    name: str                      # Tên sản phẩm chuẩn
    new_name: Optional[str] = None
    brand_name: Optional[str] = None
    image_url: Optional[str] = None
    category_id: Optional[int] = None # ID danh mục sản phẩm mẫu
    price: Optional[float] = 0.0   # Giá bán mặc định
    material: Optional[str] = None # Chất liệu chuẩn
    color: Optional[str] = None    # Màu sắc chuẩn
    length: Optional[float] = 0.0  # Chiều dài chuẩn
    width: Optional[float] = 0.0   # Chiều rộng chuẩn
    height: Optional[float] = 0.0  # Chiều cao chuẩn
    weight: Optional[float] = 0.0  # Trọng lượng chuẩn
    status: Optional[str] = "Active" # Trạng thái hoạt động
    quantity: Optional[float] = 1.0 # Đơn vị tính/Số lượng mặc định
    unit: Optional[str] = "Bộ"
    specification: Optional[str] = None
    description: Optional[str] = None # Mô tả chi tiết sản phẩm

class MasterProductCreate(MasterProductBase):
    """
    Schema dùng để tạo mới sản phẩm mẫu.
    """
    master_bom_details: Optional[List[Any]] = []
    product_details: Optional[List[Any]] = []
    paint_color_samples: Optional[List[Any]] = []
    technical_drawings: Optional[List[Any]] = []
    materials: Optional[List[Any]] = []

class MasterProductUpdate(BaseModel):
    """
    Schema dùng để cập nhật thông tin sản phẩm mẫu.
    """
    sku: Optional[str] = None
    name: Optional[str] = None
    new_name: Optional[str] = None
    brand_name: Optional[str] = None
    image_url: Optional[str] = None
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
    unit: Optional[str] = None
    specification: Optional[str] = None
    description: Optional[str] = None

class MasterProductListItem(MasterProductBase):
    """
    Schema tối giản dùng cho danh sách sản phẩm mẫu (Table View).
    Loại bỏ master_bom_details để tăng tốc độ truy vấn và phản hồi.
    """
    id: int
    category_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MasterProduct(MasterProductBase):
    """
    Schema hiển thị thông tin sản phẩm mẫu đầy đủ, bao gồm cấu trúc các thành phần (Master BOM Details).
    Dùng cho màn hình Chi tiết sản phẩm.
    """
    id: int
    category_name: Optional[str] = None
    total_category_count: Optional[int] = 0
    adjusted_date: Optional[str] = None
    created_at: Optional[datetime] = None
    master_bom_details: Optional[List[Any]] = []
    technical_drawings: Optional[List[Any]] = []
    paint_color_samples: Optional[List[Any]] = []
    materials: Optional[List[Any]] = []
    product_details: Optional[List[Any]] = []

    class Config:
        from_attributes = True
        arbitrary_types_allowed = True

class MasterProductListResponse(BaseModel):
    items: List[MasterProductListItem]
    total: int
