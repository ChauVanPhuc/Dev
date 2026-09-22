# -*- coding: utf-8 -*-
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel

class LpnImageSchema(BaseModel):
    id: int
    lpn_item_id: int
    container_id: int
    image_type: Optional[str] = None
    sort_order: int = 1
    source_url: Optional[str] = None
    local_path: Optional[str] = None
    file_mime: Optional[str] = None
    file_size: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LpnItemSchema(BaseModel):
    id: int
    container_id: int
    record_type: str
    suffix_key: str
    item_index: int = 1
    batch_original: Optional[str] = None
    batch_resolved: Optional[str] = None
    lpn: Optional[str] = None
    sku: Optional[str] = None
    raw_group_key: Optional[str] = None
    images: List[LpnImageSchema] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LpnContainerSchema(BaseModel):
    id: int
    source_record_key: Optional[str] = None
    record_fingerprint: str
    container_number: str
    factory: Optional[str] = None
    date_loading_raw: Optional[str] = None
    date_loading: Optional[date] = None
    timestamp_raw: Optional[str] = None
    timestamp_val: Optional[datetime] = None
    operator_name: Optional[str] = None
    content_hash: str
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    last_crawl_job_id: Optional[int] = None
    crawl_count: int = 1
    status: str = "success"
    error_detail: Optional[str] = None
    items: List[LpnItemSchema] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LpnCrawlJobSchema(BaseModel):
    id: int
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_containers_found: int = 0
    containers_processed: int = 0
    containers_success: int = 0
    containers_failed: int = 0
    total_items_crawled: int = 0
    total_images_downloaded: int = 0
    error_message: Optional[str] = None
    is_sync_mode: Optional[bool] = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LpnCrawlLogSchema(BaseModel):
    id: int
    crawl_job_id: int
    container_number: Optional[str] = None
    level: str
    message: str
    details: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StartCrawlJobRequest(BaseModel):
    url: Optional[str] = None


class BatchDeleteRequest(BaseModel):
    item_ids: List[int]


class RetryMissingRequest(BaseModel):
    item_ids: Optional[List[int]] = None


class BatchDeleteItemsRequest(BaseModel):
    item_ids: List[int]
