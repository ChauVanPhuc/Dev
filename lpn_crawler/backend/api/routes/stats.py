# -*- coding: utf-8 -*-
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from lpn_crawler.backend.models.models import LpnContainer, LpnItem, LpnImage

router = APIRouter()

_cached_kpi_stats = {
    "all_time": {
        "total_containers": 0,
        "total_sku_rows": 0,
        "total_images": 0,
        "total_missing_rows": 0
    },
    "recent_7days": {
        "total_containers": 0,
        "total_sku_rows": 0,
        "total_images": 0,
        "total_missing_rows": 0,
        "start_date": "",
        "end_date": "",
        "date_range_label": ""
    },
    "total_containers": 0,
    "total_sku_rows": 0,
    "total_images": 0,
    "total_missing_rows": 0,
    "_cached_at": 0
}


@router.get("/stats")
def get_lpn_kpi_stats(force_refresh: bool = False, db: Session = Depends(get_db)):
    """
    Trả về bộ KPI thống kê của hệ thống Container & LPN:
    1. all_time: Thống kê toàn bộ tích lũy (dành cho Popup Dashboard)
    2. recent_7days: Thống kê trượt 7 ngày gần nhất (vd 11/09 - 18/09, tự động trượt theo ngày)
    """
    global _cached_kpi_stats
    now = time.time()

    # Cache 120 giây tránh dội query khi chuyển tab hoặc refresh liên tục
    if not force_refresh and (now - _cached_kpi_stats.get("_cached_at", 0)) < 120.0 and _cached_kpi_stats.get("all_time", {}).get("total_containers", 0) > 0:
        return _cached_kpi_stats

    try:
        db.execute(text("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;"))
        
        # 1. TÍNH ALL-TIME (TOÀN BỘ DỮ LIỆU)
        all_containers = db.execute(text("SELECT COUNT(*) FROM lpn_containers WITH (NOLOCK)")).scalar() or 0
        all_sku_rows = db.execute(text("SELECT COUNT(*) FROM lpn_items WITH (NOLOCK)")).scalar() or 0
        all_images = db.execute(text("""
            SELECT COUNT(*)
            FROM lpn_images img WITH (NOLOCK) 
            WHERE (img.local_path IS NOT NULL AND LTRIM(RTRIM(img.local_path)) != '' AND img.local_path != 'None')
               OR (img.source_url IS NOT NULL AND LTRIM(RTRIM(img.source_url)) != '' AND img.source_url != 'None')
        """)).scalar() or 0
        
        mismatch_check_sql = """
            EXISTS (
                SELECT 1 FROM lpn_ai_ocr_results o WITH (NOLOCK)
                WHERE o.item_id = i.id AND (
                    (o.detected_lpn IS NOT NULL AND LTRIM(RTRIM(o.detected_lpn)) != '' AND o.is_lpn_match = 0)
                    OR (o.detected_sku IS NOT NULL AND LTRIM(RTRIM(o.detected_sku)) != '' AND o.is_sku_match = 0)
                )
            )
        """

        all_missing_sql = text(f"""
            SELECT COUNT(*) FROM lpn_items i WITH (NOLOCK)
            JOIN lpn_containers c WITH (NOLOCK) ON i.container_id = c.id
            WHERE (i.resolution_status IS NULL OR i.resolution_status = '')
              AND (
                 c.container_number IS NULL OR LTRIM(RTRIM(c.container_number)) = ''
                 OR (c.date_loading IS NULL AND (c.date_loading_raw IS NULL OR LTRIM(RTRIM(c.date_loading_raw)) = ''))
                 OR c.timestamp_raw IS NULL OR LTRIM(RTRIM(c.timestamp_raw)) = ''
                 OR i.lpn IS NULL OR LTRIM(RTRIM(i.lpn)) = '' OR i.lpn = 'None' OR i.lpn = '0'
                 OR i.sku IS NULL OR LTRIM(RTRIM(i.sku)) = '' OR i.sku = 'None' OR i.sku = '0'
                 OR NOT EXISTS (
                     SELECT 1 FROM lpn_images img WITH (NOLOCK) 
                     WHERE img.lpn_item_id = i.id AND (
                         (img.local_path IS NOT NULL AND LTRIM(RTRIM(img.local_path)) != '' AND img.local_path != 'None')
                         OR (img.source_url IS NOT NULL AND LTRIM(RTRIM(img.source_url)) != '' AND img.source_url != 'None')
                     )
                 )
                 OR {mismatch_check_sql}
              )
        """)
        all_missing_rows = db.execute(all_missing_sql).scalar() or 0
        
        all_time_stats = {
            "total_containers": all_containers,
            "total_sku_rows": all_sku_rows,
            "total_images": all_images,
            "total_missing_rows": all_missing_rows
        }

        # 2. TÍNH ROLLING 7 DAYS (TRƯỢT 7 NGÀY GẦN NHẤT)
        today = datetime.now().date()
        s_date = today - timedelta(days=7)
        e_date = today

        # Điều kiện SQL theo 7 ngày trượt: date_loading hoặc parse date_loading_raw
        date_cond_c = """(
            (c.date_loading >= :s_date AND c.date_loading <= :e_date)
            OR (c.date_loading IS NULL AND TRY_CAST(c.date_loading_raw AS DATE) >= :s_date AND TRY_CAST(c.date_loading_raw AS DATE) <= :e_date)
        )"""

        params_7d = {"s_date": s_date, "e_date": e_date}
        cont_7d = db.execute(text(f"SELECT COUNT(*) FROM lpn_containers c WITH (NOLOCK) WHERE {date_cond_c}"), params_7d).scalar() or 0

        # Nếu ngày hiện tại chưa có dữ liệu (ví dụ DB snapshot cũ), tự động trượt theo 7 ngày tính từ ngày mới nhất trong DB
        if cont_7d == 0:
            max_d = db.execute(text("SELECT MAX(date_loading) FROM lpn_containers WITH (NOLOCK) WHERE date_loading IS NOT NULL")).scalar()
            if max_d:
                e_date = max_d
                s_date = max_d - timedelta(days=7)
                params_7d = {"s_date": s_date, "e_date": e_date}
                cont_7d = db.execute(text(f"SELECT COUNT(*) FROM lpn_containers c WITH (NOLOCK) WHERE {date_cond_c}"), params_7d).scalar() or 0

        sku_7d = db.execute(text(f"""
            SELECT COUNT(*) FROM lpn_items i WITH (NOLOCK)
            JOIN lpn_containers c WITH (NOLOCK) ON i.container_id = c.id
            WHERE {date_cond_c}
        """), params_7d).scalar() or 0

        img_7d = db.execute(text(f"""
            SELECT COUNT(*)
            FROM lpn_images img WITH (NOLOCK)
            JOIN lpn_containers c WITH (NOLOCK) ON img.container_id = c.id
            WHERE {date_cond_c}
              AND ((img.local_path IS NOT NULL AND LTRIM(RTRIM(img.local_path)) != '' AND img.local_path != 'None')
                OR (img.source_url IS NOT NULL AND LTRIM(RTRIM(img.source_url)) != '' AND img.source_url != 'None'))
        """), params_7d).scalar() or 0

        missing_7d_sql = text(f"""
            SELECT COUNT(*) FROM lpn_items i WITH (NOLOCK)
            JOIN lpn_containers c WITH (NOLOCK) ON i.container_id = c.id
            WHERE {date_cond_c}
              AND (i.resolution_status IS NULL OR i.resolution_status = '')
              AND (
                 c.container_number IS NULL OR LTRIM(RTRIM(c.container_number)) = ''
                 OR (c.date_loading IS NULL AND (c.date_loading_raw IS NULL OR LTRIM(RTRIM(c.date_loading_raw)) = ''))
                 OR c.timestamp_raw IS NULL OR LTRIM(RTRIM(c.timestamp_raw)) = ''
                 OR i.lpn IS NULL OR LTRIM(RTRIM(i.lpn)) = '' OR i.lpn = 'None' OR i.lpn = '0'
                 OR i.sku IS NULL OR LTRIM(RTRIM(i.sku)) = '' OR i.sku = 'None' OR i.sku = '0'
                 OR NOT EXISTS (
                     SELECT 1 FROM lpn_images img WITH (NOLOCK) 
                     WHERE img.lpn_item_id = i.id AND (
                         (img.local_path IS NOT NULL AND LTRIM(RTRIM(img.local_path)) != '' AND img.local_path != 'None')
                         OR (img.source_url IS NOT NULL AND LTRIM(RTRIM(img.source_url)) != '' AND img.source_url != 'None')
                     )
                 )
                 OR {mismatch_check_sql}
              )
        """)
        missing_7d = db.execute(missing_7d_sql, params_7d).scalar() or 0

        range_label = f"{s_date.strftime('%d/%m')} - {e_date.strftime('%d/%m')}"
        if cont_7d == 0 and all_containers > 0:
            cont_7d = all_containers
            sku_7d = all_sku_rows
            img_7d = all_images
            missing_7d = all_missing_rows
            range_label = "Toàn hệ thống"

        recent_7d_stats = {
            "total_containers": cont_7d,
            "total_sku_rows": sku_7d,
            "total_images": img_7d,
            "total_missing_rows": missing_7d,
            "start_date": s_date.strftime("%d/%m/%Y"),
            "end_date": e_date.strftime("%d/%m/%Y"),
            "start_date_iso": s_date.isoformat(),
            "end_date_iso": e_date.isoformat(),
            "date_range_label": range_label
        }

        _cached_kpi_stats = {
            "all_time": all_time_stats,
            "recent_7days": recent_7d_stats,
            # Cung cấp sẵn các trường 7 ngày ở root để UI ControlPanel tự động hiển thị 7 ngày gần nhất
            "total_containers": cont_7d,
            "total_sku_rows": sku_7d,
            "total_images": img_7d,
            "total_missing_rows": missing_7d,
            "date_range_label": range_label,
            "start_date": s_date.strftime("%d/%m/%Y"),
            "end_date": e_date.strftime("%d/%m/%Y"),
            "start_date_iso": s_date.isoformat(),
            "end_date_iso": e_date.isoformat(),
            "_cached_at": now
        }

        return _cached_kpi_stats
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        return _cached_kpi_stats

