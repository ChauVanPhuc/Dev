# -*- coding: utf-8 -*-
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Text, ForeignKey, Date, Boolean, UnicodeText, Unicode, Index, Float
from sqlalchemy.orm import relationship
from app.core.database import Base
from lpn_crawler.backend.services.validators import check_item_missing_fields


class LpnCrawlJob(Base):
    __tablename__ = "lpn_crawl_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    status = Column(String(50), nullable=False, default="pending")  # pending, running, auth_required, completed, completed_with_errors, failed, cancelled, interrupted
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    total_containers_found = Column(Integer, default=0)
    containers_processed = Column(Integer, default=0)
    containers_success = Column(Integer, default=0)
    containers_failed = Column(Integer, default=0)
    total_items_crawled = Column(Integer, default=0)
    total_images_downloaded = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job_containers = relationship("LpnJobContainer", back_populates="job", cascade="all, delete-orphan")
    logs = relationship("LpnCrawlLog", back_populates="job", cascade="all, delete-orphan")


class LpnContainer(Base):
    __tablename__ = "lpn_containers"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    source_record_key = Column(String(200), nullable=True, index=True)
    record_fingerprint = Column(String(64), nullable=False, index=True)
    container_number = Column(String(100), nullable=False, index=True)
    factory = Column(String(150), nullable=True)
    date_loading_raw = Column(String(100), nullable=True)
    date_loading = Column(Date, nullable=True)
    timestamp_raw = Column(String(100), nullable=True)
    timestamp_val = Column(DateTime, nullable=True)
    operator_name = Column(String(150), nullable=True)
    operator_phone = Column(String(50), nullable=True)
    zalo_notify_status = Column(String(50), default="PENDING")
    zalo_notified_at = Column(DateTime, nullable=True)
    content_hash = Column(String(64), nullable=False)
    first_seen_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)
    last_crawl_job_id = Column(Integer, nullable=True)
    crawl_count = Column(Integer, default=1)
    status = Column(String(50), default="success")
    error_detail = Column(Text, nullable=True)
    container_image = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("LpnItem", back_populates="container", cascade="all, delete-orphan")
    images = relationship("LpnImage", back_populates="container", cascade="all, delete-orphan")
    job_containers = relationship("LpnJobContainer", back_populates="container", cascade="all, delete-orphan")
    zalo_logs = relationship("LpnZaloLog", back_populates="container")


class LpnJobContainer(Base):
    __tablename__ = "lpn_job_containers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    crawl_job_id = Column(Integer, ForeignKey("lpn_crawl_jobs.id", ondelete="CASCADE"), nullable=False)
    container_id = Column(BigInteger, ForeignKey("lpn_containers.id", ondelete="CASCADE"), nullable=False)
    crawled_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="success")
    is_data_updated = Column(Boolean, default=False)

    job = relationship("LpnCrawlJob", back_populates="job_containers")
    container = relationship("LpnContainer", back_populates="job_containers")


class LpnItem(Base):
    __tablename__ = "lpn_items"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    container_id = Column(BigInteger, ForeignKey("lpn_containers.id", ondelete="CASCADE"), nullable=False)
    record_type = Column(String(50), nullable=False)  # Pallet, Box, etc.
    suffix_key = Column(String(100), nullable=False)   # Pallet 1, Box 1A, etc.
    item_index = Column(Integer, default=1)
    batch_original = Column(String(100), nullable=True)
    batch_resolved = Column(String(100), nullable=True)
    lpn = Column(String(100), nullable=True)
    sku = Column(String(150), nullable=True)
    raw_group_key = Column(String(200), nullable=True)
    resolution_status = Column(String(50), nullable=True)  # 'resolved', 'unresolved'
    resolution_note = Column(UnicodeText, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Unicode(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    container = relationship("LpnContainer", back_populates="items")
    images = relationship("LpnImage", back_populates="item", cascade="all, delete-orphan")


class LpnImage(Base):
    __tablename__ = "lpn_images"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    lpn_item_id = Column(BigInteger, ForeignKey("lpn_items.id", ondelete="CASCADE"), nullable=False)
    container_id = Column(BigInteger, ForeignKey("lpn_containers.id"), nullable=False)
    image_type = Column(String(50), nullable=True)
    sort_order = Column(Integer, default=1)
    source_url = Column(String(1000), nullable=True)
    local_path = Column(String(500), nullable=True)
    image_hash = Column(String(64), nullable=True)
    file_mime = Column(String(50), nullable=True)
    file_size = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    container = relationship("LpnContainer", back_populates="images")
    item = relationship("LpnItem", back_populates="images")


class LpnCrawlLog(Base):
    __tablename__ = "lpn_crawl_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    crawl_job_id = Column(Integer, ForeignKey("lpn_crawl_jobs.id", ondelete="CASCADE"), nullable=False)
    container_number = Column(String(100), nullable=True)
    level = Column(String(20), default="INFO")  # INFO, WARNING, ERROR, DOM_SELECTOR_CHANGED
    message = Column(UnicodeText, nullable=False)
    details = Column(UnicodeText, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    job = relationship("LpnCrawlJob", back_populates="logs")


class LpnAiOcrResult(Base):
    __tablename__ = "lpn_ai_ocr_results"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    item_id = Column(BigInteger, index=True, nullable=False)
    image_id = Column(BigInteger, index=True, nullable=True)
    container_number = Column(String(100), index=True, nullable=True)
    suffix_key = Column(Unicode(100), nullable=True)
    model_id = Column(String(150), nullable=True)
    detected_lpn = Column(Unicode(100), nullable=True)
    detected_sku = Column(Unicode(150), nullable=True)
    detected_barcodes = Column(UnicodeText, nullable=True)  # JSON string
    confidence = Column(Float, default=0.0)
    is_lpn_match = Column(Boolean, default=False)
    is_sku_match = Column(Boolean, default=False)
    status = Column(String(50), default="success")  # success, failed
    error_reason = Column(UnicodeText, nullable=True)
    raw_ocr_text = Column(UnicodeText, nullable=True)
    processing_time_ms = Column(Float, default=0.0)
    scanned_at = Column(DateTime, default=datetime.utcnow)


class LpnZaloConfig(Base):
    __tablename__ = "lpn_zalo_configs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bot_phone = Column(String(20), nullable=True)
    bot_name = Column(Unicode(100), nullable=True)
    imei = Column(String(255), nullable=True)
    session_cookies = Column(UnicodeText, nullable=True)
    secret_key = Column(String(255), nullable=True)
    default_recipient_phone = Column(String(20), nullable=True)
    fallback_manager_phones = Column(UnicodeText, nullable=True)  # JSON array string
    is_auto_send_enabled = Column(Boolean, default=True)
    is_connected = Column(Boolean, default=False)
    last_connected_at = Column(DateTime, nullable=True)
    last_checked_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LpnZaloLog(Base):
    __tablename__ = "lpn_zalo_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    container_id = Column(BigInteger, ForeignKey("lpn_containers.id", ondelete="SET NULL"), nullable=True)
    container_number = Column(String(100), nullable=True, index=True)
    recipient_phone = Column(String(20), nullable=False, index=True)
    recipient_zalo_id = Column(String(100), nullable=True)
    recipient_name = Column(Unicode(100), nullable=True)
    message_content = Column(UnicodeText, nullable=False)
    status = Column(String(30), default="PENDING")  # SUCCESS, FAILED, FALLBACK_SENT
    error_reason = Column(Unicode(500), nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)

    container = relationship("LpnContainer", back_populates="zalo_logs")

