# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class ScreenBug(Base):
    """
    Model đại diện cho bảng 'screen_bugs' trong SQL Server.
    Quản lý danh sách các lỗi (bug) tương ứng của từng màn hình.
    """
    __tablename__ = "screen_bugs"

    id = Column(Integer, primary_key=True, index=True)
    screen_id = Column(Integer, ForeignKey("system_screens.id", ondelete="CASCADE"), nullable=False)
    description = Column(NVARCHAR(None), nullable=False) # NVARCHAR(MAX) để lưu trữ văn bản dài mô tả bug
    severity = Column(NVARCHAR(20), default="Medium", nullable=False) # Critical, High, Medium, Low
    status = Column(NVARCHAR(30), default="New", nullable=False) # New, In Progress, Resolved, Verified
    assignee = Column(NVARCHAR(50), nullable=True) # Người chịu trách nhiệm xử lý
    reporter = Column(NVARCHAR(100), nullable=True) # Người đưa ra lỗi (báo cáo bug)
    requested_at = Column(DateTime, default=get_vietnam_time, nullable=False) # Ngày yêu cầu sửa
    completed_at = Column(DateTime, nullable=True) # Ngày hoàn thành thực tế
    notes = Column(NVARCHAR(None), nullable=True) # Ghi chú phát triển/phản hồi
    created_at = Column(DateTime, default=get_vietnam_time)

    # Relationships
    screen = relationship("SystemScreen", back_populates="bugs")
    updates = relationship("ScreenBugUpdate", back_populates="bug", cascade="all, delete-orphan")
    images = relationship("ScreenBugImage", back_populates="bug", cascade="all, delete-orphan")


class ScreenBugUpdate(Base):
    """
    Lưu các lượt chỉnh sửa/comment của bug.
    """
    __tablename__ = "screen_bug_updates"

    id = Column(Integer, primary_key=True, index=True)
    bug_id = Column(Integer, ForeignKey("screen_bugs.id", ondelete="CASCADE"), nullable=False)
    status = Column(NVARCHAR(30), nullable=True)
    assignee = Column(NVARCHAR(50), nullable=True)
    notes = Column(NVARCHAR(None), nullable=True)
    updater = Column(NVARCHAR(100), nullable=True)
    created_at = Column(DateTime, default=get_vietnam_time, nullable=False)

    # Relationships
    bug = relationship("ScreenBug", back_populates="updates")
    images = relationship("ScreenBugImage", back_populates="update", cascade="all, delete-orphan")


class ScreenBugImage(Base):
    """
    Lưu trữ danh sách hình ảnh đính kèm của bug hoặc lượt cập nhật.
    """
    __tablename__ = "screen_bug_images"

    id = Column(Integer, primary_key=True, index=True)
    bug_id = Column(Integer, ForeignKey("screen_bugs.id", ondelete="CASCADE"), nullable=True)
    update_id = Column(Integer, ForeignKey("screen_bug_updates.id", ondelete="NO ACTION"), nullable=True)
    image_path = Column(NVARCHAR(500), nullable=False)
    created_at = Column(DateTime, default=get_vietnam_time, nullable=False)

    # Relationships
    bug = relationship("ScreenBug", back_populates="images")
    update = relationship("ScreenBugUpdate", back_populates="images")

