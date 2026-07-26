from sqlalchemy import Column, Integer, DateTime, String
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class Customer(Base):
    """
    Model đại diện cho bảng 'customers' (Khách hàng & Đối tác).
    """
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(50), unique=True, index=True, nullable=False) # Mã khách hàng
    name = Column(NVARCHAR(255), nullable=False)                        # Tên công ty / Khách hàng
    contact_person = Column(NVARCHAR(255))                             # Người đại diện / liên hệ
    phone = Column(NVARCHAR(50))                                       # Số điện thoại
    email = Column(NVARCHAR(255))                                      # Email
    address = Column(NVARCHAR(500))                                    # Địa chỉ
    tax_code = Column(NVARCHAR(50))                                    # Mã số thuế
    country = Column(NVARCHAR(100))                                    # Quốc gia / Thị trường
    notes = Column(NVARCHAR(None))                                     # Ghi chú chi tiết
    is_active = Column(Integer, default=1)                             # 1: Hoạt động, 0: Ngưng
    created_at = Column(DateTime, default=get_vietnam_time)            # Ngày khởi tạo
