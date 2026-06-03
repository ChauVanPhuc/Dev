from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float, String
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time
import datetime

class ProductPlan(Base):
    """
    Model đại diện cho bảng 'product_plans' (Kế hoạch sản xuất sản phẩm).
    Lưu trữ thông tin về tiến độ và thời gian dự kiến hoàn thành sản xuất.
    """
    __tablename__ = "product_plans"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(100), unique=True, index=True) # e.g. KHSX_04_2026
    name = Column(NVARCHAR(255)) # Tên kế hoạch sản xuất
    month = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=get_vietnam_time) # Ngày lập kế hoạch
    updated_at = Column(DateTime, default=get_vietnam_time, onupdate=get_vietnam_time)
    estimated_date = Column(DateTime) # Ngày dự kiến hoàn thành
    finished_date = Column(DateTime)  # Ngày thực tế hoàn thành
    status = Column(Integer, default=0) # Trạng thái kế hoạch (0: Mới, 1: Đang làm, 2: Xong...)
    account_id = Column(Integer)      # ID người lập kế hoạch
    
    # Quan hệ liên kết
    orders = relationship("Order", back_populates="product_plan", cascade="all, delete-orphan")


