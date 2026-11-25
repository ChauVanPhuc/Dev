# -*- coding: utf-8 -*-
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from config.database import Base


class ChatbotFeedback(Base):
    """Lưu phản hồi (👍/👎) của người dùng kèm SQL đã chạy để cải thiện chất lượng ChatBot."""
    __tablename__ = "chatbot_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, nullable=False, index=True)
    session_id = Column(NVARCHAR(100), nullable=True, index=True)
    message_index = Column(Integer, nullable=True)
    rating = Column(NVARCHAR(20), nullable=False)  # 'up' | 'down'
    user_question = Column(NVARCHAR(None), nullable=True)
    bot_answer = Column(NVARCHAR(None), nullable=True)
    comment = Column(NVARCHAR(500), nullable=True)
    provider_used = Column(NVARCHAR(100), nullable=True)
    domains_used = Column(NVARCHAR(255), nullable=True)
    sql_queries_json = Column(NVARCHAR(None), nullable=True)
    created_at = Column(DateTime, default=datetime.now)

