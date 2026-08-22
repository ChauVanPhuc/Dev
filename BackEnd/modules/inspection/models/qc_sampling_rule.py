from sqlalchemy import Column, Integer, DateTime, Boolean
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
import datetime

class QCSamplingRule(Base):
    """
    Model cấu hình quy tắc lấy mẫu kiểm tra chất lượng (AQL Sampling Plan).
    """
    __tablename__ = "qc_sampling_rules"

    id = Column(Integer, primary_key=True, index=True)
    min_lot_size = Column(Integer, nullable=False)               # Mốc dưới lô hàng N
    max_lot_size = Column(Integer, nullable=True)                # Mốc trên lô hàng N (NULL = vô tận / >3200)
    sample_rate_desc = Column(NVARCHAR(50), nullable=True)       # Mô tả tỷ lệ (vd: '10%', '8% - 10%', 'Cố định')
    sample_size = Column(Integer, nullable=False)                # Cỡ mẫu cần lấy n
    
    # Ngưỡng lỗi Nặng (Major Defects)
    major_ac = Column(Integer, default=0, nullable=False)        # Accept threshold
    major_re = Column(Integer, default=1, nullable=False)        # Reject threshold
    
    # Ngưỡng lỗi Nhẹ (Minor Defects)
    minor_ac = Column(Integer, default=0, nullable=False)        # Accept threshold
    minor_re = Column(Integer, default=1, nullable=False)        # Reject threshold
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.now)
    updated_at = Column(DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)
