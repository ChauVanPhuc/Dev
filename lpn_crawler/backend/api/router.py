# -*- coding: utf-8 -*-
"""
LPN Crawler API Master Router
Tổng hợp tất cả các sub-routers theo từng resource domain:
- jobs: Quản lý crawl jobs, SSE progress/logs stream, pause/resume, lock management.
- containers: Tra cứu danh sách Container, chi tiết Container, filter options gợi ý.
- items: Tra cứu chi tiết Pallet/Box item, xóa hàng loạt, xóa toàn bộ, xử lý dòng thiếu (missing rows & retry).
- logs: Tra cứu logs (phân trang Server-side, thống kê theo level), xóa logs.
- stats: Bộ 4 KPI stats thời gian thực.
- images: Phục vụ ảnh trực tiếp theo image_id hoặc file path.
- export: Xuất dữ liệu Container/Pallet/Box sang Excel chèn ảnh.
"""

from fastapi import APIRouter

# Import sub-routers
from lpn_crawler.backend.api.routes.jobs import (
    router as jobs_router,
    start_crawl_job,
    stop_crawl_job,
    pause_crawl_job,
    resume_crawl_job,
    reset_all_job_locks,
    get_current_job,
    get_all_jobs,
    get_live_screenshot,
    stream_job_events,
    start_crawler_worker_thread,
    get_job_sse_queue,
    job_sse_queues,
)
from lpn_crawler.backend.api.routes.containers import (
    router as containers_router,
    get_containers_rows,
    get_containers_cards,
    get_filter_options,
    get_container_detail,
)
from lpn_crawler.backend.api.routes.items import (
    router as items_router,
    get_item_detail,
    batch_delete_items,
    delete_all_items,
    get_missing_rows,
    retry_missing_data,
)
from lpn_crawler.backend.api.routes.logs import (
    router as logs_router,
    get_crawl_logs,
    clear_crawl_logs,
)
from lpn_crawler.backend.api.routes.stats import (
    router as stats_router,
    get_lpn_kpi_stats,
)
from lpn_crawler.backend.api.routes.images import (
    router as images_router,
    resolve_image_file_path,
    serve_lpn_image_by_id,
    serve_lpn_image_by_path,
)
from lpn_crawler.backend.api.routes.export import (
    router as export_router,
    export_excel_data,
)
from lpn_crawler.backend.api.routes.webhook import (
    router as webhook_router,
)
from lpn_crawler.backend.api.routes.zalo import (
    router as zalo_router,
)
from lpn_crawler.backend.utils.formatters import format_date_mdy
from lpn_crawler.backend.models.schemas import (
    BatchDeleteRequest,
    RetryMissingRequest,
    BatchDeleteItemsRequest,
)

router = APIRouter()

# Mount all sub-routers directly onto master router
router.include_router(jobs_router)
router.include_router(containers_router)
router.include_router(items_router)
router.include_router(logs_router)
router.include_router(stats_router)
router.include_router(images_router)
router.include_router(export_router)
router.include_router(webhook_router)
router.include_router(zalo_router)

# Mount AI OCR & Training sub-router (được bọc try-except an toàn để có thể xóa folder mà không lỗi)
try:
    from lpn_crawler.ai_ocr_train.api.router import router as ai_ocr_router
    router.include_router(ai_ocr_router)
except ImportError:
    pass

__all__ = [
    "router",
    "format_date_mdy",
    "BatchDeleteRequest",
    "RetryMissingRequest",
    "BatchDeleteItemsRequest",
    "job_sse_queues",
    "get_job_sse_queue",
    "start_crawler_worker_thread",
    "start_crawl_job",
    "stop_crawl_job",
    "pause_crawl_job",
    "resume_crawl_job",
    "reset_all_job_locks",
    "get_current_job",
    "get_all_jobs",
    "get_live_screenshot",
    "stream_job_events",
    "get_containers_rows",
    "get_containers_cards",
    "get_filter_options",
    "get_container_detail",
    "get_item_detail",
    "batch_delete_items",
    "delete_all_items",
    "get_crawl_logs",
    "clear_crawl_logs",
    "resolve_image_file_path",
    "serve_lpn_image_by_id",
    "serve_lpn_image_by_path",
    "get_lpn_kpi_stats",
    "get_missing_rows",
    "retry_missing_data",
    "export_excel_data",
]
