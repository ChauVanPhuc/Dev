from sqlalchemy import Column, Integer, Boolean
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base

class ISOMasterRecord(Base):
    """
    Model lưu trữ danh mục hồ sơ Master List (Tổng hợp tài liệu kiểm tra - MASTER LIST).
    Giữ nguyên toàn bộ 23 cột nguyên bản từ sheet MASTER LIST.
    """
    __tablename__ = "iso_master_records"

    id = Column(Integer, primary_key=True, index=True)
    
    # 0: Mã mục / nguồn
    source_code = Column(NVARCHAR(100), nullable=True, index=True)
    
    # 1: Nhóm tài liệu quản lý
    management_group = Column(NVARCHAR(150), nullable=True, index=True)
    
    # 2: Phân loại (TÀI LIỆU, HỒ SƠ, BIỂU MẪU)
    classification = Column(NVARCHAR(100), nullable=True, index=True)
    
    # 3: Mã TL quản lý / đề xuất
    suggested_doc_code = Column(NVARCHAR(100), nullable=True, index=True)
    
    # 4: Mã của mục
    item_code = Column(NVARCHAR(100), nullable=True, index=True)
    
    # 5: Lần ban hành
    edition = Column(NVARCHAR(50), nullable=True)
    
    # 6: Tên tài liệu / biểu mẫu / hồ sơ
    document_name = Column(NVARCHAR(500), nullable=True)
    
    # 7: Quy tắc ứng xử (PA)
    code_of_conduct = Column(NVARCHAR(300), nullable=True)
    
    # 8: Tài liệu quản lý / đề xuất
    management_doc = Column(NVARCHAR(500), nullable=True)
    
    # 9: Mã biểu mẫu áp dụng
    form_code = Column(NVARCHAR(150), nullable=True)
    
    # 10: Số mục hồ sơ đi kèm
    attached_records_count = Column(NVARCHAR(50), nullable=True)
    
    # 11: Số biểu mẫu đã nhận diện
    identified_forms_count = Column(NVARCHAR(50), nullable=True)
    
    # 12: Căn cứ liên kết
    link_basis = Column(NVARCHAR(300), nullable=True)
    
    # 13: Đã kiểm tra
    is_checked = Column(Boolean, default=False)
    
    # 14: Phụ trách
    department_in_charge = Column(NVARCHAR(300), nullable=True)
    
    # 15: Hiện trạng nguồn
    source_status = Column(NVARCHAR(200), nullable=True)
    
    # 16: Vấn đề cần rà soát
    review_issue = Column(NVARCHAR(500), nullable=True)
    
    # 17: Hướng xử lý được chọn
    action_chosen = Column(NVARCHAR(500), nullable=True)
    
    # 18: Ghi chú / kết quả xác nhận
    notes = Column(NVARCHAR(None), nullable=True)
    
    # 19: Ngày chỉnh sửa gần nhất
    last_modified_date = Column(NVARCHAR(100), nullable=True)
    
    # 20: Link nguồn (chưa xác minh)
    source_link = Column(NVARCHAR(None), nullable=True)
    
    # 21: Ngày ban hành
    issue_date = Column(NVARCHAR(100), nullable=True)
    
    # 22: Hạng mục nguồn
    source_category = Column(NVARCHAR(300), nullable=True)
    
    created_at = Column(NVARCHAR(50), nullable=True)
    updated_at = Column(NVARCHAR(50), nullable=True)


class ISOMasterRecordAuditLog(Base):
    """
    Model lưu trữ nhật ký kiểm toán / lịch sử thay đổi thực tế cho hồ sơ ISO Master Record.
    Theo dõi: Tạo mới, Chỉnh sửa thông tin chung, Upload/thay thế Word, Thêm/xóa liên kết file, Lưu nháp, Gửi duyệt, v.v.
    """
    __tablename__ = "iso_master_record_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, nullable=False, index=True)
    action_type = Column(NVARCHAR(100), nullable=False)   # CREATE, UPDATE_INFO, UPLOAD_WORD, UPLOAD_RELATED, UNLINK_FILE, SAVE_DRAFT, SUBMIT_APPROVAL, STATUS_CHANGE
    action_label = Column(NVARCHAR(200), nullable=False)  # Tên hành động tiếng Việt
    actor_name = Column(NVARCHAR(200), nullable=True)     # Tên người thực hiện
    actor_dept = Column(NVARCHAR(200), nullable=True)     # Đơn vị người thực hiện
    target_name = Column(NVARCHAR(500), nullable=True)    # Tên tài liệu / file / nhóm trường bị tác động
    details = Column(NVARCHAR(None), nullable=True)       # JSON string chi tiết thay đổi (trước/sau)
    created_at = Column(NVARCHAR(50), nullable=True)      # Định dạng chuẩn VN: DD/MM/YYYY HH:mm
    timestamp = Column(NVARCHAR(50), nullable=True)       # ISO timestamp phục vụ sắp xếp chính xác

