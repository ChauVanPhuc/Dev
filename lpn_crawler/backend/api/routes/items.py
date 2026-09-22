# -*- coding: utf-8 -*-
import os
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc, asc, text

from app.core.database import get_db
from lpn_crawler.backend.config.settings import settings
from lpn_crawler.backend.models.models import (
    LpnContainer, LpnJobContainer, LpnItem, LpnImage, LpnCrawlLog, LpnCrawlJob,
    check_item_missing_fields
)
from lpn_crawler.backend.models.schemas import (
    BatchDeleteRequest, RetryMissingRequest, BatchDeleteItemsRequest
)
from lpn_crawler.backend.worker.manager import crawl_job_manager
from lpn_crawler.backend.services.storage import download_image_authenticated
from lpn_crawler.backend.utils.formatters import format_date_mdy

router = APIRouter()


@router.get("/items/{item_id}")
def get_item_detail(item_id: int, db: Session = Depends(get_db)):
    """
    Lấy chi tiết 1 Item (Pallet/Box) theo item_id.
    Dùng cho row detail action trong DataTable.
    Trả đầy đủ item data + container header + images[].
    """
    item = db.query(LpnItem).options(
        joinedload(LpnItem.images),
        joinedload(LpnItem.container)
    ).filter(LpnItem.id == item_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    cont = item.container

    return {
        "item_id": item.id,
        "container_id": cont.id if cont else None,
        "container_number": cont.container_number if cont else None,
        "factory": cont.factory if cont else None,
        "date_loading_raw": cont.date_loading_raw if cont else None,
        "date_loading": format_date_mdy(cont.date_loading, cont.date_loading_raw) if cont else None,
        "timestamp_raw": cont.timestamp_raw if cont else None,
        "operator_name": cont.operator_name if cont else None,
        "record_type": item.record_type,
        "suffix_key": item.suffix_key,
        "batch_original": item.batch_original,
        "batch_resolved": item.batch_resolved,
        "lpn": item.lpn,
        "sku": item.sku,
        "images": [
            {
                "id": img.id,
                "source_url": img.source_url,
                "local_path": img.local_path,
                "file_mime": img.file_mime,
                "file_size": img.file_size,
                "sort_order": img.sort_order
            }
            for img in sorted(item.images, key=lambda x: x.sort_order or 0)
        ]
    }


@router.delete("/items/batch-delete")
@router.post("/items/batch-delete")
def batch_delete_items(req: BatchDeleteRequest, db: Session = Depends(get_db)):
    """
    Xóa các dòng Pallet/Box item đã chọn theo danh sách item_ids.
    Đồng thời xóa sạch file hình ảnh vật lý trên ổ đĩa.
    """
    if not req.item_ids:
        return {"message": "Không có bản ghi nào được chọn.", "deleted_count": 0, "success": True}

    # 1. Tìm và xóa file ảnh trên ổ đĩa
    imgs = db.query(LpnImage.local_path).filter(LpnImage.lpn_item_id.in_(req.item_ids)).all()
    for (raw_path,) in imgs:
        if raw_path:
            full_p = os.path.join(settings.BASE_DIR, raw_path) if not os.path.isabs(raw_path) else raw_path
            if os.path.exists(full_p):
                try:
                    os.remove(full_p)
                except Exception:
                    pass

    # 2. Xóa trong CSDL
    db.query(LpnImage).filter(LpnImage.lpn_item_id.in_(req.item_ids)).delete(synchronize_session=False)
    deleted_count = db.query(LpnItem).filter(LpnItem.id.in_(req.item_ids)).delete(synchronize_session=False)
    db.commit()

    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"Đã xóa thành công {deleted_count} dòng dữ liệu và tệp ảnh liên quan"
    }


@router.post("/items/delete-all")
@router.delete("/items/delete-all")
def delete_all_items(db: Session = Depends(get_db)):
    """
    Xóa TOÀN BỘ tất cả bản ghi LpnItem, LpnImage, LpnContainer, LpnJobContainer, LpnCrawlLog, LpnCrawlJob trong CSDL
    và dừng mọi Job đang chạy.
    """
    try:
        active_id = crawl_job_manager.get_active_job_id()
        if active_id:
            crawl_job_manager.request_stop(active_id)
        crawl_job_manager.request_stop(-1)

        db.query(LpnImage).delete(synchronize_session=False)
        db.query(LpnItem).delete(synchronize_session=False)
        db.query(LpnJobContainer).delete(synchronize_session=False)
        db.query(LpnContainer).delete(synchronize_session=False)
        db.query(LpnCrawlLog).delete(synchronize_session=False)
        db.query(LpnCrawlJob).delete(synchronize_session=False)
        db.commit()

        # Dọn dẹp thư mục ảnh trên ổ đĩa
        import shutil
        if os.path.exists(settings.STORAGE_IMAGES_DIR):
            try:
                shutil.rmtree(settings.STORAGE_IMAGES_DIR, ignore_errors=True)
                os.makedirs(settings.STORAGE_IMAGES_DIR, exist_ok=True)
            except Exception:
                pass

        return {"message": "Đã xóa toàn bộ dữ liệu CSDL và kho ảnh thành công."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def parse_flexible_date(d_str: Optional[str]) -> Optional[date]:
    if not d_str or not str(d_str).strip():
        return None
    d_clean = str(d_str).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(d_clean, fmt).date()
        except ValueError:
            pass
    return None


@router.get("/missing-rows")
def get_missing_rows(
    search: Optional[str] = None,
    missing_type: Optional[str] = None,
    start_date: Optional[str] = None,
    startDate: Optional[str] = None,
    end_date: Optional[str] = None,
    endDate: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách các dòng dữ liệu bị thiếu trường thông tin (phục vụ Popup Danh Sách Dòng Thiếu).
    Hỗ trợ lọc theo khoảng thời gian hiển thị (start_date/end_date) khớp với KPI trượt trên màn hình.
    Tối ưu hóa phân trang Server-Side (SQL Paging & NOLOCK) tốc độ cao.
    """
    try:
        db.execute(text("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;"))
    except Exception:
        pass

    where_clauses = []
    params = {}

    # Lọc theo ngày (nếu có truyền vào)
    s_date_parsed = parse_flexible_date(start_date or startDate)
    e_date_parsed = parse_flexible_date(end_date or endDate)
    date_where_clauses = []

    if s_date_parsed and e_date_parsed:
        params["s_date"] = s_date_parsed
        params["e_date"] = e_date_parsed
        date_where_clauses.append("""(
            (c.date_loading >= :s_date AND c.date_loading <= :e_date)
            OR (c.date_loading IS NULL AND TRY_CAST(c.date_loading_raw AS DATE) >= :s_date AND TRY_CAST(c.date_loading_raw AS DATE) <= :e_date)
        )""")
    elif s_date_parsed:
        params["s_date"] = s_date_parsed
        date_where_clauses.append("""(
            c.date_loading >= :s_date
            OR (c.date_loading IS NULL AND TRY_CAST(c.date_loading_raw AS DATE) >= :s_date)
        )""")
    elif e_date_parsed:
        params["e_date"] = e_date_parsed
        date_where_clauses.append("""(
            c.date_loading <= :e_date
            OR (c.date_loading IS NULL AND TRY_CAST(c.date_loading_raw AS DATE) <= :e_date)
        )""")

    if date_where_clauses:
        where_clauses.extend(date_where_clauses)

    if missing_type and missing_type != "all":
        mt = missing_type.lower().strip()
        if mt in ("image", "picture", "anh", "hinh_anh"):
            where_clauses.append("""NOT EXISTS (
                SELECT 1 FROM lpn_images img WITH (NOLOCK) 
                WHERE img.lpn_item_id = i.id AND (
                    (img.local_path IS NOT NULL AND LTRIM(RTRIM(img.local_path)) != '' AND img.local_path != 'None')
                    OR (img.source_url IS NOT NULL AND LTRIM(RTRIM(img.source_url)) != '' AND img.source_url != 'None')
                )
            )""")
        elif mt in ("lpn",):
            where_clauses.append("(i.lpn IS NULL OR LTRIM(RTRIM(i.lpn)) = '' OR i.lpn = 'None' OR i.lpn = '0')")
        elif mt in ("sku",):
            where_clauses.append("(i.sku IS NULL OR LTRIM(RTRIM(i.sku)) = '' OR i.sku = 'None' OR i.sku = '0')")
        elif mt in ("date", "ngay"):
            where_clauses.append("(c.date_loading IS NULL AND (c.date_loading_raw IS NULL OR LTRIM(RTRIM(c.date_loading_raw)) = ''))")
        elif mt in ("timestamp", "gio"):
            where_clauses.append("(c.timestamp_raw IS NULL OR LTRIM(RTRIM(c.timestamp_raw)) = '')")
        elif mt in ("container",):
            where_clauses.append("(c.container_number IS NULL OR LTRIM(RTRIM(c.container_number)) = '')")
    else:
        where_clauses.append("""(
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
        )""")

    if search and search.strip():
        s = f"%{search.strip()}%"
        params["search"] = s
        where_clauses.append("""(
            c.container_number LIKE :search 
            OR i.lpn LIKE :search 
            OR i.sku LIKE :search 
            OR i.batch_resolved LIKE :search
        )""")

    where_sql = " AND ".join(where_clauses)

    # 1. Đếm tổng số dòng (Count Query)
    count_query = text(f"""
        SELECT COUNT(*) 
        FROM lpn_items i WITH (NOLOCK)
        JOIN lpn_containers c WITH (NOLOCK) ON i.container_id = c.id
        WHERE {where_sql}
    """)
    total = db.execute(count_query, params).scalar() or 0

    # 2. Lấy danh sách trang hiện tại với SQL Server Paging (OFFSET ... FETCH NEXT ...)
    try:
        p_val = int(page.default if hasattr(page, 'default') else page)
    except Exception:
        p_val = 1
    try:
        ps_val = int(page_size.default if hasattr(page_size, 'default') else page_size)
    except Exception:
        ps_val = 15

    offset = max(0, (p_val - 1) * ps_val)
    params["offset"] = offset
    params["limit"] = ps_val

    page_query = text(f"""
        SELECT 
            i.id as item_id,
            c.id as container_id,
            c.container_number,
            c.factory,
            c.date_loading_raw,
            c.date_loading,
            c.timestamp_raw,
            c.operator_name,
            COALESCE(i.batch_resolved, i.batch_original, '') as batch_resolved,
            COALESCE(i.lpn, '') as lpn,
            COALESCE(i.sku, '') as sku,
            i.suffix_key,
            i.record_type
        FROM lpn_items i WITH (NOLOCK)
        JOIN lpn_containers c WITH (NOLOCK) ON i.container_id = c.id
        WHERE {where_sql}
        ORDER BY 
            c.date_loading DESC,
            c.id DESC,
            i.id ASC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    """)
    rows = db.execute(page_query, params).fetchall()

    # 3. Lấy ảnh tương ứng chỉ cho các items của trang hiện tại
    item_ids = [r.item_id for r in rows]
    images_by_item = {}
    if item_ids:
        ids_str = ",".join(str(x) for x in item_ids)
        img_query = text(f"""
            SELECT lpn_item_id, local_path, source_url, sort_order
            FROM lpn_images WITH (NOLOCK)
            WHERE lpn_item_id IN ({ids_str})
            ORDER BY sort_order, id
        """)
        img_rows = db.execute(img_query).fetchall()
        for im in img_rows:
            if im[0] not in images_by_item:
                images_by_item[im[0]] = []
            images_by_item[im[0]].append(im)

    items = []
    for r in rows:
        missing_fields = []
        if not r.container_number or not str(r.container_number).strip():
            missing_fields.append("Container number")
        if not r.date_loading and (not r.date_loading_raw or not str(r.date_loading_raw).strip()):
            missing_fields.append("Date loading")
        if not r.timestamp_raw or not str(r.timestamp_raw).strip() or str(r.timestamp_raw).strip() == "—":
            missing_fields.append("Timestamp")
        if not r.lpn or not str(r.lpn).strip() or str(r.lpn).strip() == "None" or str(r.lpn).strip() == "0":
            missing_fields.append("LPN Pallet")
        if not r.sku or not str(r.sku).strip() or str(r.sku).strip() == "None" or str(r.sku).strip() == "0":
            missing_fields.append("SKU Pallet")

        item_imgs = images_by_item.get(r.item_id, [])
        valid_paths = [im[1] for im in item_imgs if im[1] and str(im[1]).strip() and str(im[1]).strip() != "None"]
        urls = [im[2] for im in item_imgs if im[2] and str(im[2]).strip() and str(im[2]).strip() != "None"]
        all_imgs = valid_paths + urls
        first_image = valid_paths[0] if valid_paths else (urls[0] if urls else None)

        if not all_imgs:
            missing_fields.append("Hình ảnh (Picture)")

        items.append({
            "item_id": r.item_id,
            "container_id": r.container_id,
            "container_number": r.container_number,
            "factory": r.factory,
            "date_loading_raw": r.date_loading_raw,
            "date_loading": format_date_mdy(r.date_loading, r.date_loading_raw) or (r.date_loading_raw or "—"),
            "timestamp_raw": r.timestamp_raw or "—",
            "operator_name": r.operator_name or "—",
            "batch_resolved": r.batch_resolved or "—",
            "lpn": r.lpn or "—",
            "sku": r.sku or "—",
            "suffix_key": r.suffix_key,
            "record_type": r.record_type,
            "image_count": len(all_imgs),
            "has_image": len(all_imgs) > 0,
            "first_image": first_image,
            "missing_fields": missing_fields
        })

    # Summary Stats cho các thẻ KPI ngang (đồng bộ chính xác theo phạm vi ngày đang lọc)
    summary = {
        "total_missing": total,
        "missing_lpn": 0,
        "missing_sku": 0,
        "missing_image": 0
    }
    try:
        summary_where_sql = f"WHERE {' AND '.join(date_where_clauses)}" if date_where_clauses else ""
        summary_params = {}
        if "s_date" in params:
            summary_params["s_date"] = params["s_date"]
        if "e_date" in params:
            summary_params["e_date"] = params["e_date"]

        summary_query = text(f"""
            WITH ItemStats AS (
                SELECT 
                    i.id,
                    CASE WHEN (i.lpn IS NULL OR LTRIM(RTRIM(i.lpn)) = '' OR i.lpn = 'None' OR i.lpn = '0') THEN 1 ELSE 0 END as no_lpn,
                    CASE WHEN (i.sku IS NULL OR LTRIM(RTRIM(i.sku)) = '' OR i.sku = 'None' OR i.sku = '0') THEN 1 ELSE 0 END as no_sku,
                    CASE WHEN NOT EXISTS (
                        SELECT 1 FROM lpn_images img WITH (NOLOCK) 
                        WHERE img.lpn_item_id = i.id AND (
                            (img.local_path IS NOT NULL AND LTRIM(RTRIM(img.local_path)) != '' AND img.local_path != 'None')
                            OR (img.source_url IS NOT NULL AND LTRIM(RTRIM(img.source_url)) != '' AND img.source_url != 'None')
                        )
                    ) THEN 1 ELSE 0 END as no_img,
                    CASE WHEN (c.container_number IS NULL OR LTRIM(RTRIM(c.container_number)) = '') THEN 1 ELSE 0 END as no_container,
                    CASE WHEN ((c.date_loading IS NULL AND (c.date_loading_raw IS NULL OR LTRIM(RTRIM(c.date_loading_raw)) = '')) OR (c.timestamp_raw IS NULL OR LTRIM(RTRIM(c.timestamp_raw)) = '')) THEN 1 ELSE 0 END as no_datetime
                FROM lpn_items i WITH (NOLOCK)
                JOIN lpn_containers c WITH (NOLOCK) ON i.container_id = c.id
                {summary_where_sql}
            )
            SELECT 
                COUNT(*) as total_missing,
                SUM(no_lpn) as missing_lpn,
                SUM(no_sku) as missing_sku,
                SUM(no_img) as missing_img
            FROM ItemStats
            WHERE no_lpn = 1 OR no_sku = 1 OR no_img = 1 OR no_container = 1 OR no_datetime = 1
        """)
        sum_row = db.execute(summary_query, summary_params).fetchone()
        if sum_row:
            summary = {
                "total_missing": sum_row[0] or 0,
                "missing_lpn": sum_row[1] or 0,
                "missing_sku": sum_row[2] or 0,
                "missing_image": sum_row[3] or 0
            }
    except Exception:
        pass

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "summary": summary,
        "items": items,
        "date_range": {
            "start_date": s_date_parsed.strftime("%d/%m/%Y") if s_date_parsed else None,
            "end_date": e_date_parsed.strftime("%d/%m/%Y") if e_date_parsed else None,
            "has_date_filter": bool(s_date_parsed or e_date_parsed)
        }
    }


@router.post("/missing-rows/retry-missing")
def retry_missing_data(
    req: Optional[RetryMissingRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Tìm kiếm và thử tải lại các hình ảnh / dữ liệu còn thiếu cho các dòng dữ liệu.
    Nếu tải thành công, cập nhật vào Database và tự động loại bỏ khỏi danh sách dòng thiếu.
    """
    query = db.query(LpnItem, LpnContainer).join(
        LpnContainer, LpnItem.container_id == LpnContainer.id
    ).options(joinedload(LpnItem.images))

    if req and req.item_ids:
        query = query.filter(LpnItem.id.in_(req.item_ids))

    all_rows = query.all()
    recovered_images = 0

    for item, cont in all_rows:
        missing_fields = check_item_missing_fields(item, cont)
        if any("hình ảnh" in mf.lower() or "picture" in mf.lower() for mf in missing_fields):
            # Thử tìm các bản ghi ảnh có source_url nhưng chưa có local_path
            for img in (item.images or []):
                if img.source_url and (not img.local_path or not os.path.exists(img.local_path)):
                    dl_res = download_image_authenticated(
                        page_or_context=None,
                        source_url=img.source_url,
                        container_number=cont.container_number or "UNKNOWN",
                        suffix_key=item.suffix_key or f"item_{item.id}",
                        sort_order=img.sort_order or 1
                    )
                    if dl_res and dl_res.get("local_path"):
                        img.local_path = dl_res["local_path"]
                        img.file_name = dl_res.get("file_name") or os.path.basename(dl_res["local_path"])
                        img.file_size = dl_res.get("file_size") or 0
                        img.file_mime = dl_res.get("file_mime") or "image/jpeg"
                        img.image_hash = dl_res.get("image_hash")
                        recovered_images += 1

    if recovered_images > 0:
        db.commit()

    return {
        "success": True,
        "recovered_images": recovered_images,
        "message": f"Đã bổ sung thành công {recovered_images} hình ảnh thiếu vào hệ thống." if recovered_images > 0 else "Đã kiểm tra nhưng chưa có hình ảnh mới từ nguồn."
    }
