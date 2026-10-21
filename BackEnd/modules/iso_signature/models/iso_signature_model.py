from sqlalchemy import Column, Integer, NVARCHAR, DateTime, text, Boolean, Text
from config.database import Base, engine
import datetime

class ISOSignature(Base):
    """
    Bảng quản lý Chữ ký ISO:
    - Chữ ký tay: Tải lên hình ảnh (PNG, JPG nền trong suốt)
    - Chữ ký tay: Vẽ trực tiếp bằng bảng ký Canvas (lưu base64 / SVG)
    - Chữ ký điện tử: Chứng thư số PKI / CA Token (Viettel-CA, VNPT-CA, SmartFlow PKI)
    """
    __tablename__ = "iso_signatures"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)          # ID tài khoản Account (nếu liên kết)
    user_code = Column(NVARCHAR(50), nullable=True)               # Mã nhân viên / Username (VD: NV01, admin)
    full_name = Column(NVARCHAR(150), nullable=False)             # Họ và tên người sở hữu chữ ký
    department = Column(NVARCHAR(100), nullable=True)             # Phòng ban (CL, SX, KT, BGD...)
    position = Column(NVARCHAR(150), nullable=True)               # Chức danh / Chức vụ (Trưởng phòng, BGĐ...)
    approval_level = Column(NVARCHAR(100), default="Cả hai")      # Cấp duyệt áp dụng: 'Cấp phòng', 'Cấp công ty', 'Cả hai'
    
    # Loại chữ ký:
    # 'HANDWRITTEN_IMAGE': Chữ ký tay tải lên từ file ảnh
    # 'HANDWRITTEN_DRAW': Chữ ký tay vẽ trực tiếp trên bảng ký Canvas
    # 'DIGITAL': Chữ ký điện tử / Chứng thư số
    signature_type = Column(NVARCHAR(50), nullable=False, default="HANDWRITTEN_IMAGE")
    
    # Dữ liệu hiển thị chữ ký
    image_path = Column(NVARCHAR(500), nullable=True)             # Đường dẫn file ảnh trên server
    signature_data = Column(Text, nullable=True)                  # Chuỗi Data URL Base64 / SVG nếu vẽ trực tiếp
    
    # Thông tin chuyên sâu cho Chữ ký điện tử (DIGITAL)
    digital_cert_provider = Column(NVARCHAR(150), nullable=True)  # Đơn vị cung cấp chứng thư: Viettel-CA, VNPT, SmartFlow...
    digital_serial_no = Column(NVARCHAR(150), nullable=True)      # Số Serial chứng thư số / Token ID
    digital_valid_from = Column(NVARCHAR(50), nullable=True)      # Ngày cấp
    digital_valid_to = Column(NVARCHAR(50), nullable=True)        # Ngày hết hạn
    digital_hash = Column(NVARCHAR(250), nullable=True)           # Mã băm xác thực SHA-256
    
    is_default = Column(Boolean, default=True)                    # Chữ ký mặc định khi thực hiện phê duyệt
    is_active = Column(Boolean, default=True)                     # Trạng thái: True = Đang sử dụng, False = Tạm khóa
    notes = Column(NVARCHAR(500), nullable=True)                  # Ghi chú sử dụng
    
    created_at = Column(NVARCHAR(50), default=lambda: datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    updated_at = Column(NVARCHAR(50), default=lambda: datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

# Tự động tạo bảng nếu chưa có
try:
    ISOSignature.__table__.create(bind=engine, checkfirst=True)
except Exception as e:
    print(f"[ISOSignature] Note: {e}")
