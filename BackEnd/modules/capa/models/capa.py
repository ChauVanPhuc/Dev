from sqlalchemy import Column, Integer, DateTime, func
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base

class CAPA(Base):
    """
    Model đại diện cho Báo cáo CAPA (CL10.1 & CL10.2)
    """
    __tablename__ = "capas"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(50), nullable=False, index=True) # Mã phiếu (e.g. CAPA-01)
    created_at_time = Column(NVARCHAR(50), nullable=True) # Ngày giờ hiển thị (e.g. 16:40 | 22/1/2026)
    creator_name = Column(NVARCHAR(255), nullable=True) # Người khởi tạo (e.g. Nguyễn Văn A)
    handler_name = Column(NVARCHAR(255), nullable=True) # Người xử lý (e.g. Ngô Diễm My)
    
    # Mức độ sự cố: Khẩn cấp | Nghiêm trọng | Bình thường | Nhẹ
    urgency = Column(NVARCHAR(50), default="Bình thường")
    
    # Phạm vi: Sản phẩm lỗi | Quy trình | Khiếu nại từ KH | Khác
    scope = Column(NVARCHAR(100), default="Sản phẩm lỗi")
    
    issue_description = Column(NVARCHAR(2000), nullable=True) # Mô tả sự cố
    images = Column(NVARCHAR(4000), nullable=True) # JSON array chứa các URL hình ảnh lỗi
    
    evaluator_name = Column(NVARCHAR(255), nullable=True) # Người đánh giá
    evaluation_time = Column(NVARCHAR(50), nullable=True) # Thời gian đánh giá
    
    # Trạng thái phiếu: Đạt (đóng CAPA) | Không đạt (làm lại) | Đang theo dõi | Vừa tạo | Lưu nháp
    ticket_status = Column(NVARCHAR(50), default="Vừa tạo")
    
    # Phân loại Tab: tracking (CAPA đang theo dõi) | history (Lịch sử CAPA)
    tab_status = Column(NVARCHAR(50), default="tracking")
    
    # Phân tích nguyên nhân 5-Why (JSON array: [{direct_cause: "...", whys: ["...", "..."]}])
    causes_json = Column(NVARCHAR(4000), nullable=True, default="[]")
    
    # Hành động khắc phục (JSON array: [{stt: 1, action: "...", time: "...", handler: "..."}])
    corrective_actions_json = Column(NVARCHAR(4000), nullable=True, default="[]")
    
    # Kế hoạch phòng ngừa (JSON array: [{stt: 1, action: "...", performer: "...", deadline: "...", result: "..."}])
    preventive_plans_json = Column(NVARCHAR(4000), nullable=True, default="[]")
    
    # Theo dõi & đánh giá định kỳ (JSON array: [{id: 1, content: "...", execution_date: "...", executor: "...", result: "...", notes: "..."}])
    evaluations_json = Column(NVARCHAR(4000), nullable=True, default="[]")
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
