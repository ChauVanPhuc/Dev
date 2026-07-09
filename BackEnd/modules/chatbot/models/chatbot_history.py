# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from datetime import datetime
from config.database import Base

class ChatbotHistory(Base):
    """
    Model lưu trữ lịch sử chat của từng người dùng (User Chat History)
    """
    __tablename__ = "chatbot_histories"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, nullable=False, index=True) # ID của người dùng từ bảng accounts
    session_id = Column(NVARCHAR(100), nullable=True, default="default", index=True)
    session_title = Column(NVARCHAR(200), nullable=True)
    role = Column(NVARCHAR(50), nullable=False) # 'user' hoặc 'assistant'
    content = Column(NVARCHAR(None), nullable=False) # Nội dung tin nhắn (NVARCHAR(MAX))
    items_json = Column(NVARCHAR(None), nullable=True) # Lưu trữ thẻ khiếu nại dưới dạng JSON string
    suggestions_json = Column(NVARCHAR(None), nullable=True) # Lưu trữ các câu gợi ý dưới dạng JSON string
    context_json = Column(NVARCHAR(None), nullable=True) # Lưu trữ context bộ lọc dưới dạng JSON string
    created_at = Column(DateTime, default=datetime.now)
