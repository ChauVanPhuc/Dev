# -*- coding: utf-8 -*-
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from app.core.database import get_db
from lpn_crawler.backend.models.models import LpnCrawlLog

router = APIRouter()


@router.get("/logs")
def get_crawl_logs(
    job_id: Optional[int] = None,
    container_number: Optional[str] = None,
    level: Optional[str] = None,
    search: Optional[str] = None,
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=500),
    limit: Optional[int] = Query(None, ge=1, le=100000),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách Logs từ database.
    Hỗ trợ phân trang Server-side (page, page_size) không giới hạn số lượng log,
    kèm tìm kiếm text (search) và lọc level siêu nhanh.
    """
    query = db.query(LpnCrawlLog)
    if job_id:
        query = query.filter(LpnCrawlLog.crawl_job_id == job_id)
    if container_number:
        query = query.filter(LpnCrawlLog.container_number.ilike(f"%{container_number.strip()}%"))
    if level:
        query = query.filter(LpnCrawlLog.level == level)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(
            LpnCrawlLog.message.ilike(s),
            LpnCrawlLog.container_number.ilike(s)
        ))

    # Chế độ phân trang Server-Side (Chuẩn xác, tải siêu nhanh, lưu trữ hàng triệu log không giới hạn)
    if page is not None:
        p_size = page_size or 25
        total = query.count()

        # Thống kê nhanh toàn bộ log theo level trong DB
        stats_query = db.query(LpnCrawlLog.level, func.count(LpnCrawlLog.id))
        if job_id:
            stats_query = stats_query.filter(LpnCrawlLog.crawl_job_id == job_id)
        stats_rows = stats_query.group_by(LpnCrawlLog.level).all()
        stats_dict = {(row[0] or "INFO").upper(): row[1] for row in stats_rows}
        total_all = sum(stats_dict.values())

        offset = (page - 1) * p_size
        logs = query.order_by(desc(LpnCrawlLog.id)).offset(offset).limit(p_size).all()

        return {
            "items": [
                {
                    "id": l.id,
                    "crawl_job_id": l.crawl_job_id,
                    "container_number": l.container_number,
                    "level": l.level,
                    "message": l.message,
                    "details": l.details,
                    "created_at": l.created_at.isoformat() if l.created_at else None
                }
                for l in logs
            ],
            "total": total,
            "page": page,
            "page_size": p_size,
            "total_pages": max(1, (total + p_size - 1) // p_size),
            "stats": {
                "total": total_all,
                "success": stats_dict.get("SUCCESS", 0),
                "skip": stats_dict.get("SKIP", 0),
                "recovery": stats_dict.get("RECOVERY", 0),
                "info": stats_dict.get("INFO", 0),
                "action": stats_dict.get("ACTION", 0),
                "warning": stats_dict.get("WARNING", 0),
                "error": stats_dict.get("ERROR", 0),
                "dom_changed": stats_dict.get("DOM_SELECTOR_CHANGED", 0) or stats_dict.get("DOM_CHANGED", 0),
                "other": sum(v for k, v in stats_dict.items() if k not in [
                    "SUCCESS", "SKIP", "RECOVERY", "INFO", "ACTION", "WARNING", "ERROR", "DOM_SELECTOR_CHANGED", "DOM_CHANGED"
                ])
            }
        }

    # Chế độ tương thích ngược cũ (khi gọi không có page)
    lim = limit or 5000
    logs = query.order_by(desc(LpnCrawlLog.id)).limit(lim).all()
    return [
        {
            "id": l.id,
            "crawl_job_id": l.crawl_job_id,
            "container_number": l.container_number,
            "level": l.level,
            "message": l.message,
            "details": l.details,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]


@router.delete("/logs")
def clear_crawl_logs(
    job_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Xóa toàn bộ Logs hoặc xóa Logs của 1 Job cụ thể trong bảng LpnCrawlLog
    """
    try:
        query = db.query(LpnCrawlLog)
        if job_id:
            query = query.filter(LpnCrawlLog.crawl_job_id == job_id)
        deleted_count = query.delete(synchronize_session=False)
        db.commit()
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Đã xóa thành công {deleted_count} bản ghi nhật ký log."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa nhật ký log: {e}")
