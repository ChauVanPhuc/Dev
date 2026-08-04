from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class MasterProductDetail(Base):
    """
    Model đại diện cho bảng 'master_product_details' (Chi tiết sản phẩm - KT03.1).
    Lưu trữ riêng biệt các chi tiết kỹ thuật đính kèm sản phẩm mẫu.
    """
    __tablename__ = "master_product_details"

    id = Column(Integer, primary_key=True, index=True)
    master_product_id = Column(Integer, ForeignKey("master_products.id"), index=True)
    name = Column(NVARCHAR(255), nullable=False)        # Tên chi tiết (Chân, Ván panel, Cụm hông dưới...)
    quantity = Column(Float, default=1.0)                # Số lượng
    unit = Column(NVARCHAR(50), default="Cái")           # Đơn vị (Cái, Tấm, Bộ, m2, m3)
    input_stage = Column(NVARCHAR(100))                  # Công đoạn giao (Định hình, Tạo phôi...)
    output_stage = Column(NVARCHAR(100))                 # Công đoạn nhận (Lắp ráp, Sơn...)
    parent_name = Column(NVARCHAR(255))                  # Tên thành phẩm cha
    material = Column(NVARCHAR(255))                     # Vật liệu (Gỗ tự nhiên, MDF, Gỗ Sồi...)
    created_at = Column(DateTime, default=get_vietnam_time)

    master_product = relationship("MasterProduct", back_populates="product_details")
