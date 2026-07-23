from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base
import datetime

class StageInspection(Base):
    """
    Model lưu trữ kết quả kiểm tra theo công đoạn (Stage Inspection).
    Dùng chung cho nhiều loại phiếu: Phụ kiện, Bám dính, Sau đóng gói.
    """
    __tablename__ = "stage_inspections"

    id = Column(Integer, primary_key=True, index=True)
    inspection_type = Column(NVARCHAR(50), nullable=False) # phu-kien, bam-dinh, sau-dong-goi
    batch_no = Column(NVARCHAR(100), nullable=True)        # Mã PO
    product_sku = Column(NVARCHAR(100), nullable=True)     # Mã sản phẩm
    specification = Column(NVARCHAR(255), nullable=True)   # Quy cách
    inspector_name = Column(NVARCHAR(255), nullable=True)  # Tên người kiểm tra
    inspection_date = Column(DateTime, default=datetime.datetime.now)
    
    conclusion = Column(NVARCHAR(20), default='pass')      # pass/fail
    notes = Column(NVARCHAR, nullable=True)           # Ghi chú chung
    
    # Kích thước ảnh minh chứng riêng lẻ (đồng bộ như IQC)
    image_path_1 = Column(NVARCHAR(500), nullable=True)
    image_path_2 = Column(NVARCHAR(500), nullable=True)
    image_path_3 = Column(NVARCHAR(500), nullable=True)
    
    # Dữ liệu đặc thù của từng loại phiếu (JSON string)
    # VD: supplier, check_type, intended_use, detail_bam_dinh, results chi tiết...
    data_json = Column(NVARCHAR(None), nullable=True) 
    
    # Danh sách đường dẫn ảnh (JSON array string)
    images_json = Column(NVARCHAR(None), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.now)
