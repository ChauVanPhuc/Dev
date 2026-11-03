# -*- coding: utf-8 -*-
from datetime import datetime
from sqlalchemy import Column, Integer, Boolean, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base

class PalletCheckContainer(Base):
    """
    Bảng lưu trữ thông tin Container kiểm tra Pallet xuất khẩu.
    """
    __tablename__ = "pallet_check_containers"

    id = Column(String(100), primary_key=True, index=True) # Mã Container (VD: CONT-261102-123)
    name = Column(NVARCHAR(255), nullable=False)            # Tên Container (VD: CONT-01)
    inspector = Column(NVARCHAR(100), nullable=True)        # Người kiểm tra
    status = Column(String(50), default="completed")        # completed, warning, in_progress
    is_valid = Column(Boolean, default=True)                # Đạt chuẩn hay có lỗi
    total_pallets = Column(Integer, default=0)              # Số lượng pallet
    total_boxes = Column(Integer, default=0)                # Ước tính số kiện
    total_scans = Column(Integer, default=0)                # Tổng số lần bắn tia
    audit_result = Column(Text, nullable=True)              # JSON chuỗi kết quả kiểm định
    completed_at = Column(NVARCHAR(100), nullable=True)     # Thời gian hoàn thành hiển thị
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    pallets = relationship("PalletCheckRecord", back_populates="container", cascade="all, delete-orphan", order_by="PalletCheckRecord.pallet_index")


class PalletCheckRecord(Base):
    """
    Bảng lưu trữ từng Pallet trong một Container kiểm tra.
    """
    __tablename__ = "pallet_check_records"

    id = Column(String(100), primary_key=True, index=True) # Mã Pallet (VD: PL-CONT01-P01)
    container_id = Column(String(100), ForeignKey("pallet_check_containers.id", ondelete="CASCADE"), nullable=False, index=True)
    pallet_index = Column(Integer, nullable=False)          # Số thứ tự Pallet (#1, #2...)
    status = Column(String(50), default="pass")             # pass, warning, fail
    has_roof = Column(Boolean, default=False)               # Có kiện top nóc không
    
    standing_standard_sku = Column(NVARCHAR(100), nullable=True)
    standing_standard_lpn = Column(NVARCHAR(100), nullable=True)
    standing_skus_count = Column(Integer, default=0)
    standing_lpns_count = Column(Integer, default=0)
    standing_data = Column(Text, nullable=True)             # JSON chi tiết các tia đứng
    
    roof_standard_sku = Column(NVARCHAR(100), nullable=True)
    roof_standard_lpn = Column(NVARCHAR(100), nullable=True)
    roof_skus_count = Column(Integer, default=0)
    roof_lpns_count = Column(Integer, default=0)
    roof_data = Column(Text, nullable=True)                 # JSON chi tiết các tia nóc

    total_scans = Column(Integer, default=0)
    timestamp_str = Column(NVARCHAR(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    container = relationship("PalletCheckContainer", back_populates="pallets")

