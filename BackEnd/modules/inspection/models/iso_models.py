from sqlalchemy import Column, Integer, ForeignKey, text
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base

class ISODocument(Base):
    """
    Model lưu trữ tài liệu quy trình ISO và cấu trúc chung của quy trình đó.
    """
    __tablename__ = "iso_documents"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(100), unique=True, index=True, nullable=False) # Mã quy trình (VD: G7.CL-QT01)
    name = Column(NVARCHAR(250), nullable=False)                         # Tên quy trình
    version = Column(NVARCHAR(50), default="01")                         # Lần ban hành
    issue_date = Column(NVARCHAR(50))                                    # Ngày ban hành
    issuer = Column(NVARCHAR(100))                                       # Người soạn thảo / ban hành
    approver = Column(NVARCHAR(100))                                     # Người phê duyệt
    file_path = Column(NVARCHAR(500), nullable=True)                     # Đường dẫn file tải lên
    status = Column(NVARCHAR(50), default="Hiệu lực")                    # Hiệu lực, Hết hiệu lực, Dự thảo
    diagram_data = Column(NVARCHAR(None), nullable=True)                 # Lưu trữ JSON của sơ đồ lưu đồ (nodes & links)
    created_at = Column(NVARCHAR(50))
    updated_at = Column(NVARCHAR(50))

    # Mối quan hệ tới các thông tin chi tiết của quy trình
    revision_logs = relationship("ISORevisionLog", back_populates="document", cascade="all, delete-orphan")
    sections = relationship("ISOSection", back_populates="document", cascade="all, delete-orphan")
    steps = relationship("ISOProcessStep", back_populates="document", cascade="all, delete-orphan")


class ISORevisionLog(Base):
    """
    Bảng lưu trữ nhật ký theo dõi sửa đổi nội dung tài liệu.
    """
    __tablename__ = "iso_revision_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("iso_documents.id", ondelete="CASCADE"), nullable=False)
    seq_no = Column(Integer)                          # Số thứ tự sửa đổi
    rev_date = Column(NVARCHAR(50))                   # Ngày sửa đổi
    content = Column(NVARCHAR(1000))                  # Nội dung sửa đổi
    page_no = Column(NVARCHAR(50))                    # Trang số sửa đổi

    document = relationship("ISODocument", back_populates="revision_logs")


class ISOSection(Base):
    """
    Các phần văn bản hướng dẫn chung của tài liệu ISO (Mục đích, Phạm vi, Định nghĩa...).
    """
    __tablename__ = "iso_sections"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("iso_documents.id", ondelete="CASCADE"), nullable=False)
    section_name = Column(NVARCHAR(100), nullable=False)  # Tên mục: Mục đích, Phạm vi, Định nghĩa...
    content_html = Column(NVARCHAR(None), nullable=True)  # Nội dung hướng dẫn dạng Rich Text

    document = relationship("ISODocument", back_populates="sections")


class ISOProcessStep(Base):
    """
    Chi tiết các bước/công đoạn trong quy trình ISO.
    Mỗi bước có thể gán trách nhiệm thực hiện, hướng dẫn kiểm tra và checklist QC.
    """
    __tablename__ = "iso_process_steps"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("iso_documents.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)                 # Số thứ tự bước (e.g. 1, 2, 3)
    name = Column(NVARCHAR(250), nullable=False)                  # Tên bước
    assignee_role = Column(NVARCHAR(100), nullable=True)          # Trách nhiệm (Kho, QC, Sản xuất, Bán hàng...)
    instructions = Column(NVARCHAR(None), nullable=True)          # Rich text hướng dẫn chi tiết của bước
    checklist_json = Column(NVARCHAR(None), nullable=True)        # Danh sách trường dữ liệu kiểm tra (Checklist động) dạng JSON string
    transition_json = Column(NVARCHAR(None), nullable=True)       # Thiết lập chuyển tiếp bước (bước tiếp theo, điều kiện, chuyển tiếp)
    flow_node_id = Column(NVARCHAR(50), nullable=True)            # Đối chiếu ID node trong diagram sơ đồ quy trình

    document = relationship("ISODocument", back_populates="steps")
