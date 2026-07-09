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
    folder = Column(NVARCHAR(100), nullable=True)                        # Thư mục quản lý (ví dụ: "3/2/1")
    doc_type = Column(NVARCHAR(100), nullable=True)                      # Loại tài liệu phê duyệt (ví dụ: "Phê duyệt 1 cấp")
    document_level = Column(NVARCHAR(100), nullable=True)                # Cấp tài liệu (1 hoặc nhiều)
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


class ISOProcess(Base):
    """
    Model lưu trữ Quy trình thực tế áp dụng (được khởi tạo/clone từ khuôn mẫu ISODocument)
    """
    __tablename__ = "iso_processes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(100), unique=True, index=True, nullable=False) # Mã quy trình thực tế (ví dụ: TB001)
    name = Column(NVARCHAR(250), nullable=False)                         # Tên quy trình thực tế (ví dụ: QT01)
    iso_document_id = Column(Integer, ForeignKey("iso_documents.id", ondelete="CASCADE"), nullable=False) # Khuôn mẫu gốc
    owner = Column(NVARCHAR(100))                                       # Người phụ trách / chịu trách nhiệm
    editor = Column(NVARCHAR(100))                                      # Người biên soạn / thực thi
    approver = Column(NVARCHAR(100))                                    # Người duyệt
    issue_date = Column(NVARCHAR(50))                                   # Ngày ban hành thực tế
    last_checked_date = Column(NVARCHAR(50), nullable=True)             # Ngày kiểm tra đánh giá gần nhất
    last_result = Column(NVARCHAR(100), nullable=True)                  # Kết quả đánh giá gần nhất (Đạt / Không đạt)
    status = Column(NVARCHAR(50), default="Dự thảo")                    # Dự thảo, Hiệu lực, Tạm dừng
    display_at = Column(NVARCHAR(250), nullable=True)                   # Hiệu thị tại (ví dụ: máy, công đoạn...)
    notes = Column(NVARCHAR(None), nullable=True)                        # Ghi chú / Lưu ý
    document_level = Column(NVARCHAR(100), nullable=True)                # Cấp tài liệu (1 hoặc nhiều)
    diagram_data = Column(NVARCHAR(None), nullable=True)                 # JSON sơ đồ lưu đồ tùy chỉnh riêng cho quy trình này
    created_at = Column(NVARCHAR(50))
    updated_at = Column(NVARCHAR(50))

    # Mối quan hệ
    iso_document = relationship("ISODocument")
    sections = relationship("ISOProcessSection", back_populates="process", cascade="all, delete-orphan")
    steps = relationship("ISOProcessStepInstance", back_populates="process", cascade="all, delete-orphan")


class ISOProcessSection(Base):
    """
    Nội dung hướng dẫn chi tiết (Mục đích, phạm vi, viện dẫn...) được chỉnh sửa riêng của quy trình thực tế.
    """
    __tablename__ = "iso_process_sections"

    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(Integer, ForeignKey("iso_processes.id", ondelete="CASCADE"), nullable=False)
    section_name = Column(NVARCHAR(100), nullable=False)
    content_html = Column(NVARCHAR(None), nullable=True)

    process = relationship("ISOProcess", back_populates="sections")


class ISOProcessStepInstance(Base):
    """
    Các bước chi tiết, hướng dẫn kiểm tra và checklist QC tùy chỉnh riêng của quy trình thực tế.
    """
    __tablename__ = "iso_process_step_instances"

    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(Integer, ForeignKey("iso_processes.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    name = Column(NVARCHAR(250), nullable=False)
    assignee_role = Column(NVARCHAR(100), nullable=True)
    instructions = Column(NVARCHAR(None), nullable=True)
    checklist_json = Column(NVARCHAR(None), nullable=True)
    transition_json = Column(NVARCHAR(None), nullable=True)
    flow_node_id = Column(NVARCHAR(50), nullable=True)

    process = relationship("ISOProcess", back_populates="steps")

