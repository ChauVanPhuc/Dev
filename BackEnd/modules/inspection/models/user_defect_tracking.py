from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base

class UserDefectTracking(Base):
    """
    Model lưu trữ việc theo dõi lỗi cá nhân của từng QC.
    Mỗi QC có thể theo dõi một danh sách lỗi riêng.
    """
    __tablename__ = "user_defect_trackings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    defect_id = Column(Integer, ForeignKey("defect_types.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("Account")
    defect = relationship("DefectType")
