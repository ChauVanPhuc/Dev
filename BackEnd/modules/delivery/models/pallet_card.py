from sqlalchemy import Column, Integer, DateTime, String, Text
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class PalletCard(Base):
    """
    Model lưu trữ thông tin Thẻ Pallet và dữ liệu bảng tính FortuneSheet.
    """
    __tablename__ = "pallet_cards"

    id = Column(Integer, primary_key=True, index=True)
    pallet_code = Column(NVARCHAR(100), unique=True, index=True) # e.g. PLT-2026-001
    
    # Các trường dữ liệu chính (để tìm kiếm/lọc nhanh)
    khsx_code = Column(NVARCHAR(100), index=True)
    po_code = Column(NVARCHAR(100), index=True)
    customer_name = Column(NVARCHAR(255))
    product_code = Column(NVARCHAR(100))
    detail_name = Column(NVARCHAR(255))
    specification = Column(NVARCHAR(255))
    
    quantity_plan = Column(Integer, default=0)
    quantity_actual = Column(Integer, default=0)
    
    # Thông tin nguồn gốc gỗ
    wood_standard = Column(NVARCHAR(255))
    wood_supplier = Column(NVARCHAR(255))
    
    # Dữ liệu bảng tính (JSON string) - Lưu trữ toàn bộ trạng thái FortuneSheet
    # Bao gồm định dạng, công thức, màu sắc...
    sheet_data = Column(Text) 
    
    created_at = Column(DateTime, default=get_vietnam_time)
    updated_at = Column(DateTime, default=get_vietnam_time, onupdate=get_vietnam_time)
    
    status = Column(Integer, default=1) # 1: Active, 0: Deleted/Archived
    created_by = Column(Integer) # ID người tạo
