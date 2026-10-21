from sqlalchemy import Column, Integer, NVARCHAR, DateTime, text
from config.database import Base, engine
import datetime

class ISOApprovalLog(Base):
    """
    Bảng ghi nhận lịch sử và vết phê duyệt/từ chối hồ sơ ISO (ISODocument & ISOProcess).
    Đảm bảo tính minh bạch, tuân thủ chuẩn quản lý chất lượng ISO.
    """
    __tablename__ = "iso_approval_logs"

    id = Column(Integer, primary_key=True, index=True)
    item_type = Column(NVARCHAR(50), nullable=False)       # 'document' (Tài liệu mẫu) hoặc 'process' (Quy trình áp dụng)
    item_id = Column(Integer, nullable=False, index=True)  # ID tương ứng trong bảng iso_documents hoặc iso_processes
    item_code = Column(NVARCHAR(100), nullable=True)       # Mã quy trình / tài liệu tại thời điểm thao tác
    item_name = Column(NVARCHAR(250), nullable=True)       # Tên quy trình / tài liệu
    action = Column(NVARCHAR(50), nullable=False)          # 'APPROVE', 'REJECT', 'SUBMIT', 'FORWARD'
    action_by = Column(NVARCHAR(100), nullable=True)       # Username của người thực hiện
    action_by_name = Column(NVARCHAR(150), nullable=True)  # Họ tên người thực hiện
    role = Column(NVARCHAR(100), nullable=True)            # Vai trò / Chức vụ người duyệt (BGD, Trưởng phòng, v.v.)
    previous_status = Column(NVARCHAR(50), nullable=True)  # Trạng thái trước khi duyệt/từ chối
    new_status = Column(NVARCHAR(50), nullable=True)       # Trạng thái sau khi xử lý
    comment = Column(NVARCHAR(1000), nullable=True)        # Ý kiến chỉ đạo, lý do từ chối hoặc ghi chú phê duyệt
    created_at = Column(NVARCHAR(50), default=lambda: datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

# Tự động tạo bảng nếu chưa có
try:
    ISOApprovalLog.__table__.create(bind=engine, checkfirst=True)
except Exception as e:
    print(f"[ISOApproval] Note: {e}")
