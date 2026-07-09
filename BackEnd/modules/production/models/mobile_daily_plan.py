from sqlalchemy import Column, Integer, DateTime, Float
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class MobileDailyPlan(Base):
    """
    Model đại diện cho bảng 'mobile_daily_plans' (Kế hoạch sản xuất di động phân bổ theo ngày).
    """
    __tablename__ = "mobile_daily_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_date = Column(NVARCHAR(50), nullable=False, index=True) # Ngày kế hoạch (YYYY-MM-DD)
    stage = Column(NVARCHAR(100), nullable=False, index=True)    # Công đoạn (Định hình, Lắp ráp, Đóng gói...)
    factory = Column(NVARCHAR(100), nullable=False, index=True)  # Nhà máy (Nhà máy 1, Nhà máy 2...)
    order_code = Column(NVARCHAR(100), nullable=False, index=True) # Mã đơn hàng/PO
    part_name = Column(NVARCHAR(255), nullable=False, index=True) # Tên chi tiết sản xuất
    planned_qty = Column(Float, default=0.0)                    # Số lượng kế hoạch (KH)
    remaining_qty = Column(Float, default=0.0)                  # Số lượng còn lại
    created_at = Column(DateTime, default=get_vietnam_time)      # Ngày tạo
