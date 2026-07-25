from sqlalchemy import Column, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship

from config.database import Base

class SystemSidebar(Base):
    """
    Model đại diện cho bảng 'system_sidebars' (Danh mục menu).
    Quản lý cấu hình menu điều hướng động của cả bản Web và bản Mobile.
    """
    __tablename__ = "system_sidebars"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(NVARCHAR(20), nullable=False)                     # 'Web' hoặc 'Mobile'
    parent_id = Column(Integer, ForeignKey("system_sidebars.id", ondelete="NO ACTION"), nullable=True)
    title = Column(NVARCHAR(100), nullable=False)                       # Tên hiển thị của menu
    route_path = Column(NVARCHAR(250), nullable=True)                    # Đường dẫn React Router / Link
    icon = Column(NVARCHAR(100), nullable=True)                         # Tên biểu tượng (ví dụ: 'Users', 'LayoutGrid')
    sort_order = Column(Integer, default=0, nullable=False)             # Thứ tự hiển thị
    is_active = Column(Boolean, default=True, nullable=False)           # Trạng thái kích hoạt
    permission_key = Column(NVARCHAR(100), nullable=True)               # Khóa phân quyền ánh xạ (ví dụ: 'users')
    screen_id = Column(Integer, ForeignKey("system_screens.id", ondelete="SET NULL"), nullable=True)

    # Quan hệ cha-con tự tham chiếu (Self-referential)
    parent = relationship("SystemSidebar", remote_side=[id], back_populates="children")
    children = relationship("SystemSidebar", back_populates="parent", cascade="all, delete-orphan", order_by="SystemSidebar.sort_order")
    screen = relationship("SystemScreen")
