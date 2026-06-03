from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base

class DeliveryImage(Base):
    """
    Model đại diện cho bảng 'delivery_images' (Hình ảnh bàn giao).
    Lưu trữ đường dẫn các tệp ảnh minh chứng cho quá trình giao nhận hàng.
    """
    __tablename__ = "delivery_images"

    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(NVARCHAR(500)) # Đường dẫn đến file ảnh trên server
    description = Column(NVARCHAR(50)) # Mô tả ảnh (ví dụ: "ảnh giao" hoặc "ảnh nhận")
    
    # Quan hệ liên kết (Khóa ngoại)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=True)
    delivery = relationship("Delivery", back_populates="images")
    
    return_id = Column(Integer, ForeignKey("delivery_returns.id"), nullable=True)
    return_record = relationship("DeliveryReturn", back_populates="images")

