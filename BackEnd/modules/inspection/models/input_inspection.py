import json
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class InputInspection(Base):
    """
    Model cho bảng 'input_inspections' - Kiểm tra đầu vào.
    Ghi nhận kết quả kiểm tra kích thước (dài/rộng/cao) của chi tiết
    TRƯỚC khi tạo phiếu bàn giao.
    Khóa logic: (plan_id, part_name)
    """
    __tablename__ = "input_inspections"

    id              = Column(Integer, primary_key=True, index=True)
    plan_id         = Column(Integer, nullable=True)
    ticket_code     = Column(NVARCHAR(50), index=True, nullable=True)
    pallet_code     = Column(NVARCHAR(100), index=True, nullable=True)
    backup_qr       = Column(NVARCHAR(100), index=True, nullable=True)
    inspection_type = Column(NVARCHAR(50), default="first_sample", nullable=True)
    batch_no        = Column(NVARCHAR(100), nullable=True)      # Mã PO
    product_sku     = Column(NVARCHAR(255), nullable=True)      # Tên sản phẩm
    part_name       = Column(NVARCHAR(255), nullable=True)       # Tên chi tiết cần KT
    specification   = Column(NVARCHAR(255), nullable=True)       # Quy cách chi tiết cần KT
    cont_name       = Column(NVARCHAR(50), nullable=True)        # Container (VD: "Cont 60")
    stage           = Column(NVARCHAR(255), nullable=True)       # Công đoạn thực hiện KT
    required_qty    = Column(Integer, default=0, nullable=True)
    sample_qty      = Column(Integer, default=0, nullable=True)
    error_qty       = Column(Integer, default=0, nullable=True)
    conclusion      = Column(NVARCHAR(20), default="pass", nullable=True)
    inspector_id    = Column(Integer, nullable=True)             # ID người kiểm tra
    inspector_name  = Column(NVARCHAR(255), nullable=True)
    inspected_at    = Column(DateTime, default=get_vietnam_time)

    # Kích thước đo được (đơn vị: mm - IQC)
    measured_length = Column(Float, nullable=True)
    measured_width  = Column(Float, nullable=True)
    measured_height = Column(Float, nullable=True)

    # Kết quả kiểm tra
    result          = Column(NVARCHAR(20), nullable=True, default="pass")   # 'Đạt' | 'Không đạt' | 'pass' | 'fail'
    note            = Column(NVARCHAR(500), nullable=True)
    data_json       = Column(NVARCHAR(None), nullable=True)      # JSON thông tin mở rộng (lỗi, ảnh, SOP)

    # Ảnh minh chứng (tối đa 3 tấm)
    image_path_1    = Column(NVARCHAR(500), nullable=True)
    image_path_2    = Column(NVARCHAR(500), nullable=True)
    image_path_3    = Column(NVARCHAR(500), nullable=True)
    images_json     = Column(NVARCHAR(None), nullable=True)     # JSON array string ảnh

    # Trạng thái xác nhận (Thêm mới)
    is_confirmed    = Column(Boolean, default=False, nullable=False)
    confirmed_at    = Column(DateTime, nullable=True)
    confirmed_by    = Column(Integer, nullable=True)
    is_deleted      = Column(Boolean, default=False, nullable=True)
    created_at      = Column(DateTime, default=get_vietnam_time, nullable=True)

    # Alias Properties để tương thích ngược 100% với code dùng stage_inspections
    @property
    def notes(self):
        return self.note

    @notes.setter
    def notes(self, value):
        self.note = value

    @property
    def stage_name(self):
        return self.stage

    @stage_name.setter
    def stage_name(self, value):
        self.stage = value

    @property
    def inspection_date(self):
        return self.inspected_at or self.created_at

    @inspection_date.setter
    def inspection_date(self, value):
        self.inspected_at = value

    @property
    def action(self):
        if self.data_json:
            try:
                d = json.loads(self.data_json) if isinstance(self.data_json, str) else self.data_json
                if d.get("action"):
                    return d.get("action")
            except Exception:
                pass
        return "chap-nhan" if (self.result in ["pass", "Đạt"] or self.conclusion in ["pass", "Đạt"]) else "tra-ve"

    @property
    def confirmed_by_name(self):
        if hasattr(self, '_confirmed_by_name') and self._confirmed_by_name:
            return self._confirmed_by_name
        if self.data_json:
            try:
                d = json.loads(self.data_json) if isinstance(self.data_json, str) else self.data_json
                if d.get("confirmed_by_name"):
                    return d.get("confirmed_by_name")
                history = d.get("edit_history", [])
                if isinstance(history, list):
                    for h in reversed(history):
                        if h.get("action_type") == "confirm" and h.get("user_name"):
                            return h.get("user_name")
            except Exception:
                pass
        return None

    @confirmed_by_name.setter
    def confirmed_by_name(self, value):
        self._confirmed_by_name = value

