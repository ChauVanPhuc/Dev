# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, Boolean, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from datetime import datetime
from config.database import Base

class QuickReport(Base):
    __tablename__ = "quick_reports"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(NVARCHAR(50), unique=True, index=True, nullable=False) # e.g. BC-01, BC-02
    report_type = Column(NVARCHAR(100), nullable=False) # "Biên bản cuộc họp" | "Báo cáo vấn đề"
    creator_name = Column(NVARCHAR(252), default="Nguyễn Văn A")
    is_anonymous = Column(Boolean, default=False)
    
    # Form fields for "Biên bản cuộc họp"
    attendees = Column(NVARCHAR(1000), nullable=True) # JSON list or string of attendees
    related_ticket = Column(NVARCHAR(100), nullable=True) # Phiếu liên quan e.g. CAPA-01
    
    # Form fields for "Báo cáo vấn đề"
    issue_type = Column(NVARCHAR(100), nullable=True) # e.g. Sản xuất, Chất lượng, Thiết bị
    area = Column(NVARCHAR(100), nullable=True) # e.g. Xưởng 1, Khu đúc
    
    # Common fields
    main_content = Column(NVARCHAR(4000), nullable=False) # Nội dung chính (Vấn đề)
    solution_recommendation = Column(NVARCHAR(4000), nullable=True) # Kết luận (Giải pháp) hoặc Kiến nghị
    images = Column(NVARCHAR(4000), default="[]") # JSON list of image URLs
    audio_url = Column(NVARCHAR(1000), nullable=True) # URL file âm thanh ghi âm
    
    status = Column(NVARCHAR(50), default="Chờ xử lý") # "Chờ xử lý", "Đã tiếp nhận", "Đã xong", "Từ chối"
    handler_name = Column(NVARCHAR(252), nullable=True)
    handler_response = Column(NVARCHAR(4000), nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "report_type": self.report_type,
            "creator_name": "Ẩn danh" if self.is_anonymous else self.creator_name,
            "is_anonymous": self.is_anonymous,
            "attendees": self.attendees,
            "related_ticket": self.related_ticket,
            "issue_type": self.issue_type,
            "area": self.area,
            "main_content": self.main_content,
            "solution_recommendation": self.solution_recommendation,
            "images": self.images,
            "audio_url": self.audio_url,
            "status": self.status,
            "handler_name": self.handler_name,
            "handler_response": self.handler_response,
            "created_at": self.created_at.strftime("%H:%M | %d/%m/%Y") if self.created_at else "",
            "updated_at": self.updated_at.strftime("%H:%M | %d/%m/%Y") if self.updated_at else ""
        }
