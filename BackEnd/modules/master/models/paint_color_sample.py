from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class PaintColorSample(Base):
    """
    Model đại diện cho bảng 'paint_color_samples' (Mẫu màu sơn đính kèm sản phẩm).
    """
    __tablename__ = "paint_color_samples"

    id = Column(Integer, primary_key=True, index=True)
    master_product_id = Column(Integer, ForeignKey("master_products.id"), index=True)
    color_code = Column(NVARCHAR(50), nullable=False) # Mã màu sơn
    color_name = Column(NVARCHAR(100), nullable=False) # Tên màu sơn
    supplier = Column(NVARCHAR(150)) # Nhà cung cấp
    expiry_date = Column(DateTime, nullable=True) # Ngày hết hạn của mẫu sơn
    image_url = Column(NVARCHAR(500)) # Đường dẫn ảnh đính kèm mẫu màu
    note = Column(NVARCHAR(500)) # Ghi chú
    created_at = Column(DateTime, default=get_vietnam_time)

    master_product = relationship("MasterProduct", back_populates="paint_color_samples")
