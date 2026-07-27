from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class TechnicalPendingTask(Base):
    """
    Model đại diện cho bảng 'technical_pending_tasks' (Danh sách công việc kỹ thuật tồn đọng).
    """
    __tablename__ = "technical_pending_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(NVARCHAR(255), nullable=False) # Tên công việc (ví dụ: Duyệt bản vẽ SP A009)
    assigned_to = Column(NVARCHAR(100)) # Người xử lý
    due_date = Column(DateTime, nullable=True) # Hạn xử lý
    status = Column(NVARCHAR(50), default="Chờ xử lý") # Trạng thái: Chờ xử lý, Đang xử lý, Hoàn thành
    created_at = Column(DateTime, default=get_vietnam_time)
