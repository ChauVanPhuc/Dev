from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from modules.production.schemas.product import Product as ProductResponse


class OrderItemCreate(BaseModel):
    """Schema cho mỗi sản phẩm trong đơn hàng (khi tạo mới)."""
    master_product_id: int # ID của sản phẩm mẫu
    quantity: int           # Số lượng đặt hàng


class OrderItemResponse(BaseModel):
    """Schema hiển thị thông tin sản phẩm trong đơn hàng."""
    id: int
    master_product_id: int
    quantity: int

    class Config:
        from_attributes = True


class BOMDetailRecursiveCreate(BaseModel):
    """Schema tạo mới BOM Detail đệ quy (thủ công)."""
    name: str                      
    sku: Optional[str] = None      
    quantity: float                
    unit: Optional[str] = "Cái"
    specification: Optional[str] = None
    input_stage: Optional[str] = None 
    output_stage: Optional[str] = None 
    description: Optional[str] = None 
    children: List["BOMDetailRecursiveCreate"] = []

BOMDetailRecursiveCreate.model_rebuild()

class ProductDetailedCreate(BaseModel):
    """Schema tạo mới Sản phẩm chi tiết (thủ công)."""
    name: str                      # Tên sản phẩm
    sku: Optional[str] = None      # Mã sản phẩm
    quantity: float                # Số lượng
    master_product_id: Optional[int] = None # ID sản phẩm mẫu (nếu có)
    bom_details: List[BOMDetailRecursiveCreate] = [] # Danh sách các thành phần cấu thành

class OrderCreate(BaseModel):
    """
    Schema tạo Đơn hàng mới.
    Hỗ trợ tạo đơn hàng từ danh sách sản phẩm mẫu (items) 
    hoặc từ cấu trúc sản phẩm chi tiết thủ công (products_details).
    """
    order_code: Optional[str] = None  # Mã đơn hàng (Nếu None thì hệ thống tự sinh)
    customer: str                     # Tên khách hàng
    estimated_date: Optional[datetime] = None # Ngày dự kiến hoàn thành
    note: Optional[str] = None        # Ghi chú đơn hàng
    plan_id: Optional[int] = None      # ID kế hoạch sản xuất liên kết (nếu có)
    order_status: Optional[int] = None # Trạng thái đơn hàng
    is_priority: Optional[int] = 0    # Ưu tiên
    items: List[OrderItemCreate] = []  # Danh sách sản phẩm mẫu và số lượng
    products_details: Optional[List[ProductDetailedCreate]] = None # Chi tiết BOM thủ công

class OrderUpdate(BaseModel):
    """Schema cập nhật thông tin đơn hàng."""
    order_status: Optional[int] = None # Trạng thái mới
    note: Optional[str] = None         # Ghi chú mới
    estimated_date: Optional[datetime] = None # Ngày dự kiến mới
    finished_date: Optional[datetime] = None  # Ngày thực tế hoàn thành
    plan_id: Optional[int] = None      # ID kế hoạch sản xuất mới
    is_priority: Optional[int] = None # Cập nhật ưu tiên
    products_details: Optional[List[ProductDetailedCreate]] = None # Cập nhật BOM thủ công


class OrderResponse(BaseModel):
    """Schema hiển thị thông tin đơn hàng đầy đủ."""
    id: int
    order_code: str                   # Mã đơn hàng
    customer: Optional[str] = None    # Khách hàng
    order_status: Optional[int] = None # Trạng thái (Số nguyên đại diện cho status)
    create_date: Optional[datetime] = None # Ngày tạo
    estimated_date: Optional[datetime] = None # Ngày dự kiến
    note: Optional[str] = None        # Ghi chú
    is_priority: Optional[int] = 0    # Ưu tiên
    items: List[OrderItemResponse] = [] # Danh sách item thô (ID and quantity)
    products: List[ProductResponse] = [] # Danh sách sản phẩm chi tiết (đã phân rã BOM)

    class Config:
        from_attributes = True


class OrderSimpleResponse(BaseModel):
    """Schema hiển thị thông tin đơn hàng rút gọn."""
    id: int
    order_code: str
    order_status: Optional[int] = None
    plan_id: Optional[int] = None
    is_priority: Optional[int] = 0

    class Config:
        from_attributes = True
