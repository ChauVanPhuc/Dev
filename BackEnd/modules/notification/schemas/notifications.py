from typing import Optional
from datetime import datetime
from pydantic import BaseModel

# Schema cơ bản cho Thông báo
class NotificationBase(BaseModel):
    content: str
    target_group: Optional[str] = "Toàn công ty"
    target_stage: Optional[str] = None
    priority_status: Optional[str] = "Bình thường"
    issued_at: Optional[str] = None
    expires_at: Optional[str] = None

# Schema dùng để gửi lên khi tạo mới
class NotificationCreate(NotificationBase):
    announcer_id: Optional[int] = None

# Schema dùng để phản hồi về Client (Chứa ID và Thời gian)
class Notification(NotificationBase):
    id: int
    announcer_id: Optional[int] = None
    created_at: datetime
    issued_at: Optional[str] = None
    expires_at: Optional[str] = None

    class Config:
        from_attributes = True # Cho phép Pydantic đọc dữ liệu từ SQLAlchemy Models

# Schema dùng để gửi lên khi xác nhận đã xem thông báo
class NotificationMarkRead(BaseModel):
    user_id: int
    target_group: Optional[str] = None
    target_stage: Optional[str] = None
