# -*- coding: utf-8 -*-
import asyncio
import json
import threading
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db, SessionLocal
from lpn_crawler.backend.models.models import LpnCrawlJob
from lpn_crawler.backend.models.schemas import LpnCrawlJobSchema
from lpn_crawler.backend.worker.manager import crawl_job_manager
from lpn_crawler.backend.crawler.engine import AppSheetCrawlerEngine

router = APIRouter()

# Global event queues for active SSE connections per job
job_sse_queues = {}

def get_job_sse_queue(job_id: int) -> asyncio.Queue:
    if job_id not in job_sse_queues:
        job_sse_queues[job_id] = asyncio.Queue()
    return job_sse_queues[job_id]


def start_crawler_worker_thread(job_id: int, mode: str = "full", auto_ocr: bool = False):
    """
    Khởi chạy Playwright Crawler trong một Worker Thread riêng biệt có WindowsProactorEventLoopPolicy native.
    Điều này giải quyết triệt để lỗi NotImplementedError trên Windows do SelectorEventLoop của Uvicorn gây ra.
    """
    main_loop = asyncio.get_running_loop()
    queue = get_job_sse_queue(job_id)

    def sse_callback(event_data: dict):
        try:
            main_loop.call_soon_threadsafe(queue.put_nowait, event_data)
        except Exception:
            pass

    def worker_entry():
        try:
            import importlib
            import lpn_crawler.backend.crawler.telemetry
            import lpn_crawler.backend.crawler.api_crawler
            import lpn_crawler.backend.crawler.dom_crawler
            import lpn_crawler.backend.crawler.browser_auth
            import lpn_crawler.backend.crawler.engine
            importlib.reload(lpn_crawler.backend.crawler.telemetry)
            importlib.reload(lpn_crawler.backend.crawler.api_crawler)
            importlib.reload(lpn_crawler.backend.crawler.dom_crawler)
            importlib.reload(lpn_crawler.backend.crawler.browser_auth)
            importlib.reload(lpn_crawler.backend.crawler.engine)
            from lpn_crawler.backend.crawler.engine import AppSheetCrawlerEngine

            engine = AppSheetCrawlerEngine(job_id=job_id, sse_callback=sse_callback, mode=mode, auto_ocr=auto_ocr)
            engine.run()
        except Exception as w_err:
            import traceback
            tb_str = traceback.format_exc()
            print(f"[WorkerThread] Crawl Job #{job_id} error: {w_err}\n{tb_str}")
        finally:
            try:
                crawl_job_manager.release_job_lock_sync(job_id)
            except Exception:
                pass
            
            final_status = "completed"
            err_msg = None
            try:
                db = SessionLocal()
                db_job = db.query(LpnCrawlJob).filter(LpnCrawlJob.id == job_id).first()
                if db_job:
                    final_status = db_job.status
                    err_msg = db_job.error_message
                db.close()
            except Exception:
                pass
            
            main_loop.call_soon_threadsafe(
                sse_callback,
                {"type": "status", "status": final_status, "job_id": job_id, "error_message": err_msg}
            )

    thread = threading.Thread(target=worker_entry, name=f"CrawlWorker-{job_id}", daemon=True)
    thread.start()


@router.post("/jobs/start", response_model=LpnCrawlJobSchema)
async def start_crawl_job(
    force: bool = Query(False),
    mode: str = Query("full", description="Chế độ cào: 'full' (cào toàn bộ lịch sử) hoặc 'incremental' (chỉ cào cập nhật mới)"),
    auto_ocr: bool = Query(False, description="Tự động bóc tách AI OCR thời gian thực khi tải ảnh mới"),
    background_tasks: BackgroundTasks = None, 
    db: Session = Depends(get_db)
):
    """
    Kích hoạt Job Crawl LPN mới. 
    Nếu force=True hoặc job cũ đã kết thúc/hủy, tự động giải phóng lock để chạy job mới.
    """
    active_job_id = crawl_job_manager.get_active_job_id()

    if active_job_id is None:
        orphan_jobs = db.query(LpnCrawlJob).filter(LpnCrawlJob.status == "running").all()
        for oj in orphan_jobs:
            oj.status = "interrupted"
            oj.end_time = datetime.utcnow()
        if orphan_jobs:
            db.commit()
    else:
        running_job = db.query(LpnCrawlJob).filter(LpnCrawlJob.id == active_job_id).first()
        
        # Nếu yêu cầu force=True HOẶC job trong DB đã hủy/hoàn thành/lỗi -> giải phóng lock cũ lập tức
        if force or not running_job or running_job.status in ("cancelled", "completed", "failed", "auth_required"):
            crawl_job_manager.request_stop(active_job_id)
            await crawl_job_manager.release_job_lock(active_job_id)
            if running_job and running_job.status == "running":
                running_job.status = "cancelled"
                running_job.end_time = datetime.utcnow()
                db.commit()
        else:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": f"Đang có Tiến Trình Crawl đang chạy. Bạn có muốn Buộc Dừng & Khởi Chạy Lại không?",
                    "active_job_id": active_job_id
                }
            )

    job = LpnCrawlJob(status="running")
    db.add(job)
    db.commit()
    db.refresh(job)

    crawl_job_manager.reset_cancel_flag()
    acquired = await crawl_job_manager.acquire_job_lock(job.id)
    if not acquired:
        current_active = crawl_job_manager.get_active_job_id()
        if force:
            await crawl_job_manager.release_job_lock(current_active)
            crawl_job_manager.reset_cancel_flag()
            await crawl_job_manager.acquire_job_lock(job.id)
        else:
            raise HTTPException(
                status_code=409, 
                detail=f"Không thể khóa job. Vui lòng bấm Buộc Dừng để thử lại."
            )

    if auto_ocr:
        crawl_job_manager.set_sync_mode(job.id, True)

    start_crawler_worker_thread(job.id, mode=mode, auto_ocr=auto_ocr)
    job.is_sync_mode = auto_ocr
    return job


@router.post("/jobs/{job_id}/stop")
async def stop_crawl_job(job_id: int, db: Session = Depends(get_db)):
    """
    Phát tín hiệu hủy khẩn cấp Job đang chạy và giải phóng Lock tức thì
    """
    stopped = crawl_job_manager.request_stop(job_id)
    await crawl_job_manager.release_job_lock(job_id)
    
    job = db.query(LpnCrawlJob).filter(LpnCrawlJob.id == job_id).first()
    if job:
        job.status = "cancelled"
        job.end_time = datetime.utcnow()
        db.commit()

    return {"message": "Đã dừng Tiến trình Crawl khẩn cấp thành công.", "status": "cancelled"}


@router.post("/jobs/{job_id}/pause")
def pause_crawl_job(job_id: int):
    """
    Tạm dừng tiến trình crawl đang chạy (có thể tiếp tục sau)
    """
    paused = crawl_job_manager.pause_job(job_id)
    if not paused:
        raise HTTPException(status_code=400, detail="Không thể tạm dừng (Job không hoạt động).")
    return {"message": "Đã tạm dừng tiến trình Crawl.", "status": "paused"}


@router.post("/jobs/{job_id}/resume")
def resume_crawl_job(job_id: int):
    """
    Tiếp tục tiến trình crawl đang tạm dừng
    """
    resumed = crawl_job_manager.resume_job(job_id)
    if not resumed:
        raise HTTPException(status_code=400, detail="Không thể tiếp tục (Job không hoạt động).")
    return {"message": "Đã tiếp tục tiến trình Crawl.", "status": "running"}


@router.post("/jobs/reset-lock")
async def reset_all_job_locks(db: Session = Depends(get_db)):
    """
    Giải phóng toàn bộ Lock đang kẹt khẩn cấp
    """
    active_id = crawl_job_manager.get_active_job_id()
    if active_id:
        crawl_job_manager.request_stop(active_id)
        await crawl_job_manager.release_job_lock(active_id)
        job = db.query(LpnCrawlJob).filter(LpnCrawlJob.id == active_id).first()
        if job and job.status == "running":
            job.status = "cancelled"
            job.end_time = datetime.utcnow()
            db.commit()
    return {"message": "Đã giải phóng toàn bộ Lock Crawl Job thành công."}


@router.get("/jobs/current", response_model=Optional[LpnCrawlJobSchema])
def get_current_job(db: Session = Depends(get_db)):
    """
    Lấy thông tin Job đang hoạt động hiện tại.
    Nếu không có job nào đang chạy trong bộ nhớ, tự động dọn dẹp các job bị treo status='running' trong DB.
    """
    active_id = crawl_job_manager.get_active_job_id()
    if active_id:
        active_job = db.query(LpnCrawlJob).filter(LpnCrawlJob.id == active_id).first()
        if active_job:
            active_job.is_sync_mode = crawl_job_manager.is_sync_mode(active_id)
            return active_job
        return None

    # Dọn dẹp tự động các job mồ côi (trạng thái running nhưng không có worker chạy)
    orphan_jobs = db.query(LpnCrawlJob).filter(LpnCrawlJob.status == "running").all()
    if orphan_jobs:
        for oj in orphan_jobs:
            oj.status = "interrupted"
            oj.end_time = datetime.utcnow()
            oj.error_message = "Tiến trình bị ngắt do khởi động lại máy chủ (Orphan Cleanup)."
        db.commit()

    return db.query(LpnCrawlJob).order_by(desc(LpnCrawlJob.id)).first()


@router.get("/jobs", response_model=List[LpnCrawlJobSchema])
def get_all_jobs(limit: int = 20, db: Session = Depends(get_db)):
    """
    Danh sách lịch sử các lần Crawl
    """
    return db.query(LpnCrawlJob).order_by(desc(LpnCrawlJob.id)).limit(limit).all()


@router.get("/jobs/{job_id}/screenshot")
@router.get("/jobs/screenshot")
async def get_live_screenshot(job_id: Optional[int] = None):
    """Endpoint giữ tương thích ngược trả về 204 No Content"""
    return Response(status_code=204)


@router.get("/jobs/{job_id}/sse")
async def stream_job_events(job_id: int):
    """
    EventSource SSE Stream tiến độ % và live log cho Frontend
    """
    queue = get_job_sse_queue(job_id)

    async def event_generator():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                    if event.get("type") == "status" and event.get("status") in ("completed", "failed", "cancelled", "interrupted", "auth_required", "completed_with_errors"):
                        break
                except asyncio.TimeoutError:
                    yield f": ping\n\n"
        except asyncio.CancelledError:
            pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")
