# -*- coding: utf-8 -*-
import os
import json
import time
import concurrent.futures
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc, asc, extract, text, func

from app.core.database import get_db, SessionLocal
from lpn_crawler.backend.models.models import LpnContainer, LpnItem, LpnImage, LpnAiOcrResult
from lpn_crawler.backend.utils.formatters import format_date_mdy, format_timestamp_display
from lpn_crawler.backend.api.routes.images import resolve_image_file_path
from lpn_crawler.backend.services.storage import download_image_authenticated
from lpn_crawler.ai_ocr_train.core.pipeline import get_default_pipeline
from lpn_crawler.ai_ocr_train.core.parser import LabelDataParser
from lpn_crawler.backend.services.pallet_grouping import group_container_pallets, get_base_pallet_index, is_top_noc_item

router = APIRouter()


class ContainerDeepScanRequest(BaseModel):
    only_unprocessed: bool = False
    model_id: Optional[str] = None


@router.get("/containers")
def get_containers_rows(
    search: Optional[str] = None,
    factory: Optional[str] = None,
    batch: Optional[str] = None,
    sku: Optional[str] = None,
    lpn: Optional[str] = None,
    container_number: Optional[str] = None,
    operator_name: Optional[str] = None,
    year: Optional[str] = None,
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    startDate: Optional[str] = None,
    end_date: Optional[str] = None,
    endDate: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100000),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách bản ghi Row-Based (Mỗi dòng đại diện cho 1 Pallet/Box item của Container).
    Repeated Item = Repeated Row. Hỗ trợ lọc đa điều kiện và sắp xếp.
    Mặc định sắp xếp theo Date loading mới nhất (Thời gian gần nhất).
    """
    try:
        db.execute(text("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;"))
    except Exception:
        pass

    s_date = start_date or startDate
    e_date = end_date or endDate

    where_clauses = []
    params = {}

    if search and search.strip():
        s_clean = search.strip()
        params["search"] = f"%{s_clean}%"
        params["search_ns"] = f"%{s_clean.replace(' ', '')}%"
        where_clauses.append("""(
            c.container_number LIKE :search
            OR REPLACE(c.container_number, ' ', '') LIKE :search_ns
            OR c.factory LIKE :search
            OR c.operator_name LIKE :search
            OR i.lpn LIKE :search
            OR i.sku LIKE :search
            OR i.batch_resolved LIKE :search
            OR i.suffix_key LIKE :search
        )""")

    if container_number and container_number.strip():
        c_clean = container_number.strip()
        params["c_num"] = f"%{c_clean}%"
        params["c_num_ns"] = f"%{c_clean.replace(' ', '')}%"
        where_clauses.append("(c.container_number LIKE :c_num OR REPLACE(c.container_number, ' ', '') LIKE :c_num_ns)")

    if factory and factory.strip():
        params["factory"] = f"%{factory.strip()}%"
        where_clauses.append("c.factory LIKE :factory")

    if operator_name and operator_name.strip():
        params["operator_name"] = f"%{operator_name.strip()}%"
        where_clauses.append("c.operator_name LIKE :operator_name")

    if batch and batch.strip():
        params["batch"] = f"%{batch.strip()}%"
        where_clauses.append("(i.batch_resolved LIKE :batch OR i.batch_original LIKE :batch)")

    if sku and sku.strip():
        params["sku"] = f"%{sku.strip()}%"
        where_clauses.append("i.sku LIKE :sku")

    if lpn and lpn.strip():
        params["lpn"] = f"%{lpn.strip()}%"
        where_clauses.append("i.lpn LIKE :lpn")

    if s_date:
        params["s_date"] = s_date
        where_clauses.append("(c.date_loading >= :s_date OR c.date_loading_raw >= :s_date)")

    if e_date:
        params["e_date"] = e_date
        where_clauses.append("(c.date_loading <= :e_date OR c.date_loading_raw <= :e_date)")

    if year and year.strip():
        y_digits = "".join(ch for ch in year.strip() if ch.isdigit())
        if y_digits:
            params["year"] = int(y_digits)
            params["year_str"] = f"%{y_digits}%"
            where_clauses.append("""(
                (c.date_loading IS NOT NULL AND YEAR(c.date_loading) = :year)
                OR (c.date_loading IS NULL AND (c.date_loading_raw LIKE :year_str OR c.timestamp_raw LIKE :year_str))
            )""")

    if month and month.strip():
        m_digits = "".join(ch for ch in month.strip() if ch.isdigit())
        if m_digits:
            m_int = int(m_digits)
            params["month"] = m_int
            params["month_str1"] = f"{m_int}/%"
            params["month_str2"] = f"{m_int:02d}/%"
            params["month_iso"] = f"%-{m_int:02d}-%"
            where_clauses.append("""(
                (c.date_loading IS NOT NULL AND MONTH(c.date_loading) = :month)
                OR (c.date_loading IS NULL AND (
                    c.date_loading_raw LIKE :month_str1 
                    OR c.date_loading_raw LIKE :month_str2 
                    OR c.date_loading_raw LIKE :month_iso
                ))
            )""")

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    # Count
    count_sql = text(f"SELECT COUNT(*) FROM lpn_items i WITH (NOLOCK) JOIN lpn_containers c WITH (NOLOCK) ON i.container_id = c.id {where_sql}")
    total = db.execute(count_sql, params).scalar() or 0

    # Sorting
    if sort == "sku-asc":
        order_by = "i.sku ASC, i.item_index ASC, i.id ASC"
    elif sort == "sku-desc":
        order_by = "i.sku DESC, i.item_index ASC, i.id ASC"
    elif sort == "cont-asc":
        order_by = "c.container_number ASC, i.item_index ASC, i.id ASC"
    elif sort == "cont-desc":
        order_by = "c.container_number DESC, i.item_index ASC, i.id ASC"
    elif sort == "batch-asc":
        order_by = "i.batch_resolved ASC, i.item_index ASC, i.id ASC"
    elif sort == "batch-desc":
        order_by = "i.batch_resolved DESC, i.item_index ASC, i.id ASC"
    elif sort in ("date-asc", "time-asc"):
        order_by = "c.date_loading ASC, c.timestamp_val ASC, c.id ASC, i.item_index ASC, i.id ASC"
    else:
        order_by = "c.date_loading DESC, c.timestamp_val DESC, c.id DESC, i.item_index ASC, i.id ASC"

    p = page if isinstance(page, int) else getattr(page, "default", 1) or 1
    ps = page_size if isinstance(page_size, int) else getattr(page_size, "default", 15) or 15
    offset = (p - 1) * ps
    params["offset"] = offset
    params["limit"] = ps

    data_sql = text(f"""
        SELECT 
            i.id as item_id,
            c.id as container_id,
            c.container_number,
            c.factory,
            c.date_loading_raw,
            c.date_loading,
            c.timestamp_raw,
            c.timestamp_val,
            c.operator_name,
            i.record_type,
            i.suffix_key,
            i.batch_original,
            COALESCE(i.batch_resolved, i.batch_original, '') as batch_resolved,
            COALESCE(i.lpn, '') as lpn,
            COALESCE(i.sku, '') as sku
        FROM lpn_items i WITH (NOLOCK)
        JOIN lpn_containers c WITH (NOLOCK) ON i.container_id = c.id
        {where_sql}
        ORDER BY {order_by}
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    """)
    rows = db.execute(data_sql, params).fetchall()

    item_ids = [r.item_id for r in rows]
    images_by_item = {}
    if item_ids:
        ids_str = ",".join(str(x) for x in item_ids)
        img_sql = text(f"""
            SELECT id, lpn_item_id, source_url, local_path, sort_order
            FROM lpn_images WITH (NOLOCK)
            WHERE lpn_item_id IN ({ids_str})
            ORDER BY sort_order, id
        """)
        for im in db.execute(img_sql).fetchall():
            if im[1] not in images_by_item:
                images_by_item[im[1]] = []
            images_by_item[im[1]].append({
                "id": im[0],
                "source_url": im[2],
                "local_path": im[3],
                "sort_order": im[4]
            })

    result_rows = []
    for r in rows:
        item_imgs = images_by_item.get(r.item_id, [])
        r_dict = {
            "item_id": r.item_id,
            "container_id": r.container_id,
            "container_number": r.container_number,
            "factory": r.factory,
            "date_loading_raw": r.date_loading_raw,
            "date_loading": format_date_mdy(r.date_loading, r.date_loading_raw),
            "timestamp_raw": format_timestamp_display(r.timestamp_raw, getattr(r, "timestamp_val", None)),
            "operator_name": r.operator_name,
            "record_type": r.record_type,
            "suffix_key": r.suffix_key,
            "batch_original": r.batch_original,
            "batch_resolved": r.batch_resolved,
            "lpn": r.lpn,
            "sku": r.sku,
            "images_count": len(item_imgs),
            "images": item_imgs
        }
        result_rows.append(r_dict)

    return {
        "total": total,
        "items": result_rows,
        "page": p,
        "page_size": ps
    }


@router.get("/containers/cards")
def get_containers_cards(
    search: Optional[str] = None,
    factory: Optional[str] = None,
    batch: Optional[str] = None,
    sku: Optional[str] = None,
    lpn: Optional[str] = None,
    container_number: Optional[str] = None,
    operator_name: Optional[str] = None,
    year: Optional[str] = None,
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    startDate: Optional[str] = None,
    end_date: Optional[str] = None,
    endDate: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách Container Cards phục vụ chế độ xem Thẻ Lưới Container.
    Mỗi Card là 1 Container duy nhất kèm số lượng LPN, SKU, Kiện hàng, Ảnh và hình ảnh đại diện.
    """
    try:
        db.execute(text("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;"))
    except Exception:
        pass

    s_date = start_date or startDate
    e_date = end_date or endDate

    where_clauses = []
    params = {}

    if search and search.strip():
        s_clean = search.strip()
        params["search"] = f"%{s_clean}%"
        params["search_ns"] = f"%{s_clean.replace(' ', '')}%"
        where_clauses.append("""c.id IN (
            SELECT c2.id FROM lpn_containers c2 WITH (NOLOCK)
            WHERE c2.container_number LIKE :search 
               OR REPLACE(c2.container_number, ' ', '') LIKE :search_ns
               OR c2.factory LIKE :search
               OR c2.operator_name LIKE :search
            UNION
            SELECT i.container_id FROM lpn_items i WITH (NOLOCK)
            WHERE i.lpn LIKE :search 
               OR i.sku LIKE :search 
               OR i.batch_resolved LIKE :search 
               OR i.suffix_key LIKE :search
        )""")

    if container_number and container_number.strip():
        c_clean = container_number.strip()
        params["c_num"] = f"%{c_clean}%"
        params["c_num_ns"] = f"%{c_clean.replace(' ', '')}%"
        where_clauses.append("(c.container_number LIKE :c_num OR REPLACE(c.container_number, ' ', '') LIKE :c_num_ns)")

    if factory and factory.strip():
        params["factory"] = f"%{factory.strip()}%"
        where_clauses.append("c.factory LIKE :factory")

    if operator_name and operator_name.strip():
        params["operator_name"] = f"%{operator_name.strip()}%"
        where_clauses.append("c.operator_name LIKE :operator_name")

    if sku and sku.strip():
        params["sku"] = f"%{sku.strip()}%"
        where_clauses.append("EXISTS (SELECT 1 FROM lpn_items i WITH (NOLOCK) WHERE i.container_id = c.id AND i.sku LIKE :sku)")

    if lpn and lpn.strip():
        params["lpn"] = f"%{lpn.strip()}%"
        where_clauses.append("EXISTS (SELECT 1 FROM lpn_items i WITH (NOLOCK) WHERE i.container_id = c.id AND i.lpn LIKE :lpn)")

    if batch and batch.strip():
        params["batch"] = f"%{batch.strip()}%"
        where_clauses.append("EXISTS (SELECT 1 FROM lpn_items i WITH (NOLOCK) WHERE i.container_id = c.id AND (i.batch_resolved LIKE :batch OR i.batch_original LIKE :batch))")

    if s_date:
        params["s_date"] = s_date
        where_clauses.append("(c.date_loading >= :s_date OR c.date_loading_raw >= :s_date)")

    if e_date:
        params["e_date"] = e_date
        where_clauses.append("(c.date_loading <= :e_date OR c.date_loading_raw <= :e_date)")

    if year and year.strip():
        y_digits = "".join(ch for ch in year.strip() if ch.isdigit())
        if y_digits:
            params["year"] = int(y_digits)
            params["year_str"] = f"%{y_digits}%"
            where_clauses.append("""(
                (c.date_loading IS NOT NULL AND YEAR(c.date_loading) = :year)
                OR (c.date_loading IS NULL AND (c.date_loading_raw LIKE :year_str OR c.timestamp_raw LIKE :year_str))
            )""")

    if month and month.strip():
        m_digits = "".join(ch for ch in month.strip() if ch.isdigit())
        if m_digits:
            m_int = int(m_digits)
            params["month"] = m_int
            params["month_str1"] = f"{m_int}/%"
            params["month_str2"] = f"{m_int:02d}/%"
            params["month_iso"] = f"%-{m_int:02d}-%"
            where_clauses.append("""(
                (c.date_loading IS NOT NULL AND MONTH(c.date_loading) = :month)
                OR (c.date_loading IS NULL AND (
                    c.date_loading_raw LIKE :month_str1 
                    OR c.date_loading_raw LIKE :month_str2 
                    OR c.date_loading_raw LIKE :month_iso
                ))
            )""")

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    # Count
    count_sql = text(f"SELECT COUNT(*) FROM lpn_containers c WITH (NOLOCK) {where_sql}")
    total = db.execute(count_sql, params).scalar() or 0

    # Sorting
    order_by = "c.date_loading DESC, c.timestamp_val DESC, c.id DESC"
    if sort == "cont-asc":
        order_by = "c.container_number ASC, c.id ASC"
    elif sort == "cont-desc":
        order_by = "c.container_number DESC, c.id DESC"
    elif sort in ("date-asc", "time-asc"):
        order_by = "c.date_loading ASC, c.timestamp_val ASC, c.id ASC"

    offset = (page - 1) * page_size
    params["offset"] = offset
    params["limit"] = page_size

    base_cards_sql = text(f"""
        SELECT 
            c.id as container_id,
            c.container_number,
            c.factory,
            c.date_loading,
            c.date_loading_raw,
            c.timestamp_raw,
            c.timestamp_val,
            c.operator_name,
            c.container_image
        FROM lpn_containers c WITH (NOLOCK)
        {where_sql}
        ORDER BY {order_by}
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    """)
    rows = db.execute(base_cards_sql, params).fetchall()

    if not rows:
        return {
            "total": total,
            "items": [],
            "page": page,
            "page_size": page_size
        }

    c_ids = [r.container_id for r in rows]
    id_str = ','.join(str(i) for i in c_ids)

    # 1. Item metrics (LPN, SKU, Kiện hàng, thiếu SKU/LPN)
    item_metrics_sql = text(f"""
        SELECT 
            container_id,
            COUNT(DISTINCT CASE WHEN lpn IS NOT NULL AND LTRIM(RTRIM(lpn)) != '' AND lpn != 'None' AND lpn != '0' THEN lpn END) as lpn_count,
            COUNT(DISTINCT CASE WHEN sku IS NOT NULL AND LTRIM(RTRIM(sku)) != '' AND sku != 'None' AND sku != '0' THEN sku END) as sku_count,
            COUNT(*) as total_items,
            COUNT(CASE WHEN sku IS NULL OR LTRIM(RTRIM(sku)) = '' OR sku = 'None' OR sku = '0' THEN 1 END) as items_without_sku,
            COUNT(CASE WHEN lpn IS NULL OR LTRIM(RTRIM(lpn)) = '' OR lpn = 'None' OR lpn = '0' THEN 1 END) as items_without_lpn
        FROM lpn_items WITH (NOLOCK)
        WHERE container_id IN ({id_str})
        GROUP BY container_id
    """)
    items_map = {r.container_id: r for r in db.execute(item_metrics_sql).fetchall()}

    # 2. Image metrics
    img_metrics_sql = text(f"""
        SELECT container_id, COUNT(*) as total_images
        FROM lpn_images WITH (NOLOCK)
        WHERE container_id IN ({id_str})
          AND ((local_path IS NOT NULL AND LTRIM(RTRIM(local_path)) != '' AND local_path != 'None')
            OR (source_url IS NOT NULL AND LTRIM(RTRIM(source_url)) != '' AND source_url != 'None'))
        GROUP BY container_id
    """)
    imgs_map = {r.container_id: r.total_images for r in db.execute(img_metrics_sql).fetchall()}

    # 3. First image for each container
    first_img_sql = text(f"""
        SELECT container_id, local_path, source_url
        FROM (
            SELECT container_id, local_path, source_url,
                   ROW_NUMBER() OVER (PARTITION BY container_id ORDER BY sort_order, id) as rn
            FROM lpn_images WITH (NOLOCK)
            WHERE container_id IN ({id_str})
              AND ((local_path IS NOT NULL AND LTRIM(RTRIM(local_path)) != '' AND local_path != 'None')
                OR (source_url IS NOT NULL AND LTRIM(RTRIM(source_url)) != '' AND source_url != 'None'))
        ) sub
        WHERE rn = 1
    """)
    first_imgs_map = {r.container_id: (r.local_path, r.source_url) for r in db.execute(first_img_sql).fetchall()}

    # 4. Items without image
    no_img_sql = text(f"""
        SELECT 
            i.container_id,
            COUNT(CASE WHEN img.id IS NULL THEN 1 END) as items_without_image
        FROM lpn_items i WITH (NOLOCK)
        LEFT JOIN lpn_images img WITH (NOLOCK) ON img.lpn_item_id = i.id 
            AND ((img.local_path IS NOT NULL AND LTRIM(RTRIM(img.local_path)) != '' AND img.local_path != 'None')
              OR (img.source_url IS NOT NULL AND LTRIM(RTRIM(img.source_url)) != '' AND img.source_url != 'None'))
        WHERE i.container_id IN ({id_str})
        GROUP BY i.container_id
    """)
    no_img_map = {r.container_id: r.items_without_image for r in db.execute(no_img_sql).fetchall()}

    # 5. AI OCR metrics
    ocr_metrics_sql = text(f"""
        SELECT 
            i.container_id,
            COUNT(DISTINCT o.item_id) as ocr_scanned_count,
            COUNT(DISTINCT CASE 
                WHEN o.is_lpn_match = 1 
                 AND (i.sku IS NULL OR LTRIM(RTRIM(i.sku)) IN ('', 'None', '0', '—') OR o.is_sku_match = 1)
                 AND o.status = 'success' 
                THEN o.item_id END
            ) as ocr_matched_count,
            COUNT(DISTINCT CASE 
                WHEN o.is_lpn_match = 0 
                  OR (i.sku IS NOT NULL AND LTRIM(RTRIM(i.sku)) NOT IN ('', 'None', '0', '—') AND o.is_sku_match = 0)
                  OR o.status != 'success'
                THEN o.item_id END
            ) as ocr_mismatch_count
        FROM lpn_ai_ocr_results o WITH (NOLOCK)
        JOIN lpn_items i WITH (NOLOCK) ON o.item_id = i.id
        WHERE i.container_id IN ({id_str})
        GROUP BY i.container_id
    """)
    ocr_map = {r.container_id: r for r in db.execute(ocr_metrics_sql).fetchall()}

    cards = []
    for r in rows:
        cid = r.container_id
        itm_info = items_map.get(cid)
        tot_itms = itm_info.total_items if itm_info else 0
        lpn_cnt = itm_info.lpn_count if itm_info else 0
        sku_cnt = itm_info.sku_count if itm_info else 0
        no_sku = itm_info.items_without_sku if itm_info else 0
        no_lpn = itm_info.items_without_lpn if itm_info else 0

        tot_imgs = imgs_map.get(cid, 0)
        no_img = no_img_map.get(cid, max(0, tot_itms - tot_imgs))

        ocr_info = ocr_map.get(cid)
        ocr_scanned = ocr_info.ocr_scanned_count if ocr_info else 0
        ocr_matched = ocr_info.ocr_matched_count if ocr_info else 0
        ocr_mismatch = ocr_info.ocr_mismatch_count if ocr_info else 0

        first_img_paths = first_imgs_map.get(cid, (None, None))
        first_img = first_img_paths[0]
        first_img_url = first_img_paths[1]

        missing_reasons = []

        # Kiểm tra ảnh (nếu số ảnh < số Pallet/Box hoặc có kiện thiếu ảnh)
        if tot_imgs < tot_itms or no_img > 0 or tot_imgs == 0:
            diff_img = max(no_img, tot_itms - tot_imgs)
            if diff_img > 0:
                missing_reasons.append(f"{diff_img} ảnh")
            else:
                missing_reasons.append("ảnh")
        
        # Kiểm tra SKU (nếu có kiện thiếu SKU hoặc sku_count = 0)
        if not sku_cnt or sku_cnt == 0 or no_sku > 0:
            missing_reasons.append("SKU")
            
        # Kiểm tra LPN (nếu có kiện thiếu LPN hoặc lpn_count = 0)
        if not lpn_cnt or lpn_cnt == 0 or no_lpn > 0:
            missing_reasons.append("LPN")
            
        # Kiểm tra Date loading
        if not r.date_loading_raw and not r.date_loading:
            missing_reasons.append("ngày")

        missing_label = None
        if missing_reasons:
            missing_label = f"Thiếu {', '.join(missing_reasons)}"

        # Tiêu chuẩn NGHIỆM THU: Đạt là TẤT CẢ kiện trong Container đều đạt AI OCR
        if missing_reasons:
            status_code = "MISSING"
            status_label = missing_label
        elif tot_imgs == 0:
            status_code = "NO_IMAGE"
            status_label = "Chưa có ảnh"
        elif ocr_mismatch > 0:
            status_code = "MISMATCH"
            status_label = f"Lệch mã {ocr_mismatch} kiện"
        elif tot_itms > 0 and ocr_scanned < tot_itms:
            status_code = "SCANNING"
            status_label = f"Chưa quét đủ ({ocr_scanned}/{tot_itms})"
        elif tot_itms > 0 and ocr_matched >= tot_itms and ocr_mismatch == 0:
            status_code = "PASSED"
            status_label = "Đạt"
        else:
            status_code = "UNRESOLVED"
            status_label = f"Chưa đạt ({ocr_matched}/{tot_itms})"

        container_img = r.container_image

        cards.append({
            "container_id": r.container_id,
            "container_number": r.container_number,
            "factory": r.factory or "—",
            "date_loading_raw": r.date_loading_raw,
            "date_loading": format_date_mdy(r.date_loading, r.date_loading_raw) or (r.date_loading_raw or "—"),
            "timestamp_raw": format_timestamp_display(r.timestamp_raw, getattr(r, "timestamp_val", None)) or (r.timestamp_raw or "—"),
            "operator_name": r.operator_name or "—",
            "lpn_count": lpn_cnt,
            "sku_count": sku_cnt,
            "total_items": tot_itms,
            "total_images": tot_imgs,
            "items_without_image": no_img,
            "items_without_sku": no_sku,
            "items_without_lpn": no_lpn,
            "container_image": container_img,
            "first_image": container_img,
            "first_pallet_image": first_img or first_img_url,
            "ocr_scanned_count": ocr_scanned,
            "ocr_matched_count": ocr_matched,
            "ocr_mismatch_count": ocr_mismatch,
            "status_code": status_code,
            "status_label": status_label,
            "missing_label": missing_label,
            "is_valid": (status_code == "PASSED")
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": cards
    }


@router.get("/filter-options")
def get_filter_options(db: Session = Depends(get_db)):
    """
    Lấy danh sách gợi ý dữ liệu duy nhất (Distinct Suggestions) cho bộ lọc tìm kiếm
    """
    try:
        db.execute(text("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;"))
    except Exception:
        pass

    try:
        containers = [r[0] for r in db.query(LpnContainer.container_number).distinct().filter(LpnContainer.container_number.isnot(None), LpnContainer.container_number != '').order_by(LpnContainer.container_number).all() if r[0]]
        factories = [r[0] for r in db.query(LpnContainer.factory).distinct().filter(LpnContainer.factory.isnot(None), LpnContainer.factory != '').order_by(LpnContainer.factory).all() if r[0]]
        operators = [r[0] for r in db.query(LpnContainer.operator_name).distinct().filter(LpnContainer.operator_name.isnot(None), LpnContainer.operator_name != '').order_by(LpnContainer.operator_name).all() if r[0]]
        
        batches = [r[0] for r in db.query(LpnItem.batch_resolved).distinct().filter(LpnItem.batch_resolved.isnot(None), LpnItem.batch_resolved != '').order_by(LpnItem.batch_resolved).all() if r[0]]
        lpns = [r[0] for r in db.query(LpnItem.lpn).distinct().filter(LpnItem.lpn.isnot(None), LpnItem.lpn != '').order_by(LpnItem.lpn).all() if r[0]]
        skus = [r[0] for r in db.query(LpnItem.sku).distinct().filter(LpnItem.sku.isnot(None), LpnItem.sku != '').order_by(LpnItem.sku).all() if r[0]]

        return {
            "containers": containers,
            "factories": factories,
            "operators": operators,
            "batches": batches,
            "lpns": lpns,
            "skus": skus
        }
    except Exception as e:
        return {
            "containers": [],
            "factories": [],
            "operators": [],
            "batches": [],
            "lpns": [],
            "skus": []
        }


@router.get("/containers/unscanned")
def get_unscanned_containers(
    search: Optional[str] = None,
    factory: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    container_ids: Optional[str] = None,
    include_mismatched: bool = False,
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách các Container chưa quét hoặc chưa quét đủ ảnh AI OCR.
    Hỗ trợ lọc theo ngày, nhà máy, tìm kiếm hoặc danh sách container_ids được chọn.
    """
    try:
        db.execute(text("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;"))
    except Exception:
        pass

    s_date = start_date or startDate
    e_date = end_date or endDate

    where_clauses = [
        "EXISTS (SELECT 1 FROM lpn_images img WITH (NOLOCK) WHERE img.container_id = c.id)"
    ]
    params = {"limit": limit}

    if include_mismatched:
        where_clauses.append("""EXISTS (
            SELECT 1 FROM lpn_images img WITH (NOLOCK)
            LEFT JOIN lpn_ai_ocr_results o WITH (NOLOCK) ON o.image_id = img.id
            WHERE img.container_id = c.id 
              AND (o.id IS NULL OR o.is_lpn_match = 0 OR o.is_sku_match = 0 OR o.status != 'success')
        )""")
    else:
        where_clauses.append("""EXISTS (
            SELECT 1 FROM lpn_images img WITH (NOLOCK)
            LEFT JOIN lpn_ai_ocr_results o WITH (NOLOCK) ON o.image_id = img.id
            WHERE img.container_id = c.id AND o.id IS NULL
        )""")

    if container_ids:
        c_id_list = [int(x.strip()) for x in container_ids.split(",") if x.strip().isdigit()]
        if c_id_list:
            where_clauses.append(f"c.id IN ({','.join(str(i) for i in c_id_list)})")

    if search and search.strip():
        s_clean = search.strip()
        params["search"] = f"%{s_clean}%"
        params["search_ns"] = f"%{s_clean.replace(' ', '')}%"
        where_clauses.append("""(
            c.container_number LIKE :search
            OR REPLACE(c.container_number, ' ', '') LIKE :search_ns
            OR c.factory LIKE :search
        )""")

    if factory and factory.strip():
        params["factory"] = f"%{factory.strip()}%"
        where_clauses.append("c.factory LIKE :factory")

    if s_date:
        params["s_date"] = s_date
        where_clauses.append("(c.date_loading >= :s_date OR c.date_loading_raw >= :s_date)")

    if e_date:
        params["e_date"] = e_date
        where_clauses.append("(c.date_loading <= :e_date OR c.date_loading_raw <= :e_date)")

    where_sql = f"WHERE {' AND '.join(where_clauses)}"

    sql = text(f"""
        SELECT TOP (:limit)
            c.id as container_id,
            c.container_number,
            c.factory,
            c.date_loading,
            c.date_loading_raw,
            c.timestamp_raw,
            c.operator_name,
            (SELECT COUNT(*) FROM lpn_items i WITH (NOLOCK) WHERE i.container_id = c.id) as total_items,
            (SELECT COUNT(*) FROM lpn_images img WITH (NOLOCK) WHERE img.container_id = c.id) as total_images,
            (SELECT COUNT(DISTINCT o.item_id) FROM lpn_ai_ocr_results o WITH (NOLOCK) 
             JOIN lpn_items i WITH (NOLOCK) ON o.item_id = i.id
             WHERE i.container_id = c.id
            ) as ocr_scanned_count,
            (SELECT COUNT(DISTINCT o.item_id) FROM lpn_ai_ocr_results o WITH (NOLOCK) 
             JOIN lpn_items i WITH (NOLOCK) ON o.item_id = i.id
             WHERE i.container_id = c.id
               AND o.is_lpn_match = 1
               AND (i.sku IS NULL OR LTRIM(RTRIM(i.sku)) IN ('', 'None', '0', '—') OR o.is_sku_match = 1)
               AND o.status = 'success'
            ) as ocr_matched_count,
            (SELECT COUNT(DISTINCT o.item_id) FROM lpn_ai_ocr_results o WITH (NOLOCK) 
             JOIN lpn_items i WITH (NOLOCK) ON o.item_id = i.id
             WHERE i.container_id = c.id
               AND (
                 o.is_lpn_match = 0
                 OR (i.sku IS NOT NULL AND LTRIM(RTRIM(i.sku)) NOT IN ('', 'None', '0', '—') AND o.is_sku_match = 0)
                 OR o.status != 'success'
               )
            ) as ocr_mismatch_count
        FROM lpn_containers c WITH (NOLOCK)
        {where_sql}
        ORDER BY c.date_loading DESC, c.timestamp_val DESC, c.id DESC
    """)
    rows = db.execute(sql, params).fetchall()

    results = []
    tot_unscanned_imgs = 0
    for r in rows:
        tot_imgs = r.total_images or 0
        scanned = r.ocr_scanned_count or 0
        unscanned_imgs = max(0, tot_imgs - scanned)
        tot_unscanned_imgs += unscanned_imgs
        results.append({
            "container_id": r.container_id,
            "container_number": r.container_number,
            "factory": r.factory or "—",
            "date_loading": format_date_mdy(r.date_loading, r.date_loading_raw) or (r.date_loading_raw or "—"),
            "date_loading_raw": r.date_loading_raw,
            "total_items": r.total_items or 0,
            "total_images": tot_imgs,
            "ocr_scanned_count": scanned,
            "ocr_matched_count": r.ocr_matched_count or 0,
            "ocr_mismatch_count": r.ocr_mismatch_count or 0,
            "unscanned_images": unscanned_imgs,
            "status_label": f"Chưa quét đủ ({scanned}/{tot_imgs})" if scanned < tot_imgs else ("Lệch mã" if r.ocr_mismatch_count > 0 else "Đạt")
        })

    return {
        "total_containers": len(results),
        "total_unscanned_images": tot_unscanned_imgs,
        "items": results
    }


@router.get("/containers/{container_id}")
def get_container_detail(container_id: int, db: Session = Depends(get_db)):
    """
    Xem chi tiết 1 Container kèm toàn bộ danh sách items, hình ảnh và kết quả OCR từng kiện
    """
    try:
        db.execute(text("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;"))
    except Exception:
        pass

    cont = db.query(LpnContainer).options(
        joinedload(LpnContainer.items).joinedload(LpnItem.images)
    ).filter(LpnContainer.id == container_id).first()

    if not cont:
        raise HTTPException(status_code=404, detail="Container not found")

    sorted_items = sorted(cont.items, key=lambda x: (x.item_index or 0, x.id))
    valid_lpns = set([i.lpn for i in sorted_items if i.lpn and i.lpn.strip() and i.lpn != 'None'])
    valid_skus = set([i.sku for i in sorted_items if i.sku and i.sku.strip() and i.sku != 'None'])

    # Tự động đồng bộ và đối soát chéo thông minh cho các kiện hoán đổi / cụm Pallet Nóc
    try:
        from lpn_crawler.backend.services.pallet_grouping import resolve_cross_item_matches
        resolve_cross_item_matches(container_id, db)
    except Exception:
        pass

    # Nạp kết quả OCR cho các items trong Container
    item_ids = [i.id for i in sorted_items]
    ocr_map = {}
    if item_ids:
        ocr_results = db.query(LpnAiOcrResult).filter(
            LpnAiOcrResult.item_id.in_(item_ids)
        ).order_by(LpnAiOcrResult.id.asc()).all()
        for r in ocr_results:
            curr = ocr_map.get(r.item_id)
            # Ưu tiên ghi nhận kết quả mới nhất, hoặc nếu đã có bản ghi success thì không bị bản ghi lỗi cũ đè
            if not curr or r.status == 'success' or curr.get('status') != 'success':
                ocr_map[r.item_id] = {
                    "id": r.id,
                    "image_id": r.image_id,
                    "status": r.status,
                    "is_lpn_match": bool(r.is_lpn_match),
                    "is_sku_match": bool(r.is_sku_match),
                    "detected_lpn": r.detected_lpn,
                    "detected_sku": r.detected_sku,
                    "confidence": r.confidence,
                    "error_reason": r.error_reason,
                    "scanned_at": r.scanned_at.isoformat() if r.scanned_at else None
                }

    formatted_items = []
    total_imgs = 0
    for itm in sorted_items:
        seen_keys = set()
        imgs = []
        for img in sorted(itm.images, key=lambda x: (x.sort_order or 1, x.id)):
            key = (img.source_url or '').strip() or (img.local_path or '').strip()
            if key and key in seen_keys:
                continue
            if key:
                seen_keys.add(key)
            imgs.append({
                "id": img.id,
                "source_url": img.source_url,
                "local_path": img.local_path,
                "sort_order": img.sort_order
            })
        total_imgs += len(imgs)
        itm_ocr = ocr_map.get(itm.id)
        formatted_items.append({
            "id": itm.id,
            "item_id": itm.id,
            "container_id": cont.id,
            "container_number": cont.container_number,
            "factory": cont.factory,
            "date_loading": format_date_mdy(cont.date_loading, cont.date_loading_raw) or (cont.date_loading_raw or "—"),
            "date_loading_raw": cont.date_loading_raw,
            "timestamp_raw": format_timestamp_display(cont.timestamp_raw, cont.timestamp_val) or (cont.timestamp_raw or "—"),
            "operator_name": cont.operator_name,
            "item_index": itm.item_index,
            "record_type": itm.record_type,
            "suffix_key": itm.suffix_key,
            "batch_resolved": itm.batch_resolved,
            "batch_original": itm.batch_original,
            "lpn": itm.lpn,
            "sku": itm.sku,
            "images_count": len(imgs),
            "images": imgs,
            "first_image": imgs[0]["local_path"] or imgs[0]["source_url"] if imgs else None,
            "ocr": itm_ocr
        })

    # Tính toán chính xác trạng thái Container theo tiêu chuẩn hệ thống (yêu cầu khớp cả LPN và SKU)
    def _is_itm_ocr_passed(item_dict):
        ocr_obj = item_dict.get("ocr")
        if not ocr_obj or ocr_obj.get("status") != "success":
            return False
        if not ocr_obj.get("is_lpn_match"):
            return False
        item_sku = str(item_dict.get("sku") or "").strip()
        if item_sku and item_sku not in ('None', '0', '—') and not ocr_obj.get("is_sku_match"):
            return False
        return True

    tot_itms = len(formatted_items)
    ocr_scanned = len([itm for itm in formatted_items if itm.get("ocr")])
    ocr_matched = len([itm for itm in formatted_items if _is_itm_ocr_passed(itm)])
    ocr_mismatch = len([itm for itm in formatted_items if itm.get("ocr") and not _is_itm_ocr_passed(itm)])

    missing_reasons = []
    if total_imgs < tot_itms or total_imgs == 0:
        missing_reasons.append("ảnh")
    if len(valid_skus) == 0:
        missing_reasons.append("SKU")
    if len(valid_lpns) == 0:
        missing_reasons.append("LPN")

    if missing_reasons:
        status_code = "MISSING"
        status_label = f"Thiếu {', '.join(missing_reasons)}"
    elif total_imgs == 0:
        status_code = "NO_IMAGE"
        status_label = "Chưa có ảnh"
    elif ocr_mismatch > 0:
        status_code = "MISMATCH"
        status_label = f"Lệch mã {ocr_mismatch} kiện"
    elif tot_itms > 0 and ocr_scanned < tot_itms:
        status_code = "SCANNING"
        status_label = f"Chưa quét đủ ({ocr_scanned}/{tot_itms})"
    elif tot_itms > 0 and ocr_matched >= tot_itms and ocr_scanned >= tot_itms and ocr_mismatch == 0:
        status_code = "PASSED"
        status_label = "Đạt"
    else:
        status_code = "UNRESOLVED"
        status_label = f"Chưa đạt ({ocr_matched}/{tot_itms})"

    # Phân tích gom nhóm Tủ Top Nóc và tính số Pallet thực tế
    pallet_grouping_res = group_container_pallets(formatted_items)

    return {
        "id": cont.id,
        "container_id": cont.id,
        "container_number": cont.container_number,
        "factory": cont.factory or "—",
        "date_loading": format_date_mdy(cont.date_loading, cont.date_loading_raw) or (cont.date_loading_raw or "—"),
        "date_loading_raw": cont.date_loading_raw,
        "timestamp_raw": format_timestamp_display(cont.timestamp_raw, cont.timestamp_val) or (cont.timestamp_raw or "—"),
        "operator_name": cont.operator_name or "—",
        "lpn_count": len(valid_lpns),
        "sku_count": len(valid_skus),
        "total_items": len(formatted_items),
        "total_pallets": pallet_grouping_res["total_pallets"],
        "base_pallet_count": pallet_grouping_res["base_pallet_count"],
        "top_noc_pallet_count": pallet_grouping_res["top_noc_pallet_count"],
        "top_noc_item_count": pallet_grouping_res["top_noc_item_count"],
        "top_noc_pallet_groups": pallet_grouping_res["top_noc_pallet_groups"],
        "has_top_noc_irregularity": pallet_grouping_res["has_top_noc_irregularity"],
        "total_images": total_imgs,
        "ocr_scanned_count": ocr_scanned,
        "ocr_matched_count": ocr_matched,
        "ocr_mismatch_count": ocr_mismatch,
        "status_code": status_code,
        "status_label": status_label,
        "items": formatted_items
    }


@router.post("/containers/{container_id}/deep-scan-stream")
def run_container_deep_scan_stream(
    container_id: int,
    payload: Optional[ContainerDeepScanRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Quét chuyên sâu đồng thời tất cả ảnh trong 1 Container qua ThreadPool song song.
    Truyền stream sự kiện realtime (SSE) cập nhật trạng thái từng ảnh, báo lỗi và tính Đạt.
    """
    only_unproc = payload.only_unprocessed if payload else False
    sel_model = payload.model_id if payload else None

    cont = db.query(LpnContainer).options(
        joinedload(LpnContainer.items).joinedload(LpnItem.images)
    ).filter(LpnContainer.id == container_id).first()

    if not cont:
        raise HTTPException(status_code=404, detail="Container không tồn tại")

    def event_stream():
        stream_db = SessionLocal()
        try:
            # 1. Bản đồ tra cứu LPN Top Nóc và Pallet đứng theo chỉ số Pallet (để nhận biết ảnh chụp dính tem chéo)
            top_noc_lpn_map = {}
            base_pallet_lpn_map = {}
            for itm in cont.items:
                s_k = itm.suffix_key or ""
                if not itm.lpn:
                    continue
                p_idx = get_base_pallet_index(s_k)
                if not p_idx:
                    continue
                if is_top_noc_item(s_k):
                    top_noc_lpn_map[p_idx] = itm.lpn.strip().upper()
                else:
                    base_pallet_lpn_map[p_idx] = itm.lpn.strip().upper()

            # 2. Thu thập danh sách ảnh cần quét
            target_tasks = []
            for itm in sorted(cont.items, key=lambda x: (x.item_index or 0, x.id)):
                for img in sorted(itm.images, key=lambda x: (x.sort_order or 1, x.id)):
                    # Nếu bật only_unprocessed: kiểm tra xem ảnh này đã có kết quả OCR chưa
                    if only_unproc:
                        has_ocr = stream_db.query(LpnAiOcrResult.id).filter(
                            LpnAiOcrResult.item_id == itm.id,
                            LpnAiOcrResult.image_id == img.id
                        ).first()
                        if has_ocr:
                            continue

                    target_tasks.append({
                        "item_id": itm.id,
                        "image_id": img.id,
                        "suffix_key": itm.suffix_key,
                        "expected_lpn": itm.lpn.strip().upper() if itm.lpn else None,
                        "expected_skus": [itm.sku.strip().upper()] if itm.sku else None,
                        "local_path": img.local_path,
                        "source_url": img.source_url,
                        "sort_order": img.sort_order or 1
                    })

            total = len(target_tasks)
            if total == 0:
                yield f"data: {json.dumps({'type': 'empty', 'message': 'Không có ảnh nào cần quét trong container này.'}, ensure_ascii=False)}\n\n"
                return

            yield f"data: {json.dumps({'type': 'start', 'total': total, 'container_number': cont.container_number}, ensure_ascii=False)}\n\n"

            pipeline = get_default_pipeline()
            pipeline.ocr_engine.warmup()

            # Hàm worker chạy song song (độc lập, không ghi DB để bảo đảm thread-safety tuyệt đối)
            def _process_single_task(task):
                t0 = time.time()
                abs_p = resolve_image_file_path(task["local_path"])
                
                # Tự động tải ảnh nếu chưa có trên ổ đĩa
                if not abs_p or not os.path.isfile(abs_p):
                    if task["source_url"] and task["source_url"].startswith("http"):
                        try:
                            dl_res = download_image_authenticated(
                                source_url=task["source_url"],
                                container_number=cont.container_number,
                                suffix_key=task["suffix_key"],
                                sort_order=task["sort_order"]
                            )
                            if dl_res and dl_res.get("local_path"):
                                task["local_path"] = dl_res["local_path"]
                                abs_p = resolve_image_file_path(dl_res["local_path"])
                        except Exception:
                            pass

                target_input = abs_p if (abs_p and os.path.isfile(abs_p)) else task["source_url"]
                if not target_input:
                    return {
                        "task": task,
                        "pipeline_res": None,
                        "duration_ms": 0,
                        "error": "Không tìm thấy file ảnh cục bộ hoặc URL nguồn"
                    }

                try:
                    p_res = pipeline.process(
                        image_input=target_input,
                        model_id=sel_model,
                        auto_crop=True,
                        auto_rotate=True,
                        apply_super_res=True,
                        return_images_base64=False,
                        expected_skus=task["expected_skus"],
                        expected_lpn=task["expected_lpn"],
                        package_position=task["suffix_key"]
                    )
                    dur = round((time.time() - t0) * 1000, 1)
                    return {
                        "task": task,
                        "pipeline_res": p_res,
                        "duration_ms": dur,
                        "error": None
                    }
                except Exception as ex:
                    dur = round((time.time() - t0) * 1000, 1)
                    return {
                        "task": task,
                        "pipeline_res": None,
                        "duration_ms": dur,
                        "error": str(ex)
                    }

            # 2. Xử lý song song qua ThreadPool 6 Workers
            processed_count = 0
            passed_count = 0
            failed_count = 0

            with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
                future_to_task = {executor.submit(_process_single_task, t): t for t in target_tasks}

                for future in concurrent.futures.as_completed(future_to_task):
                    out = future.result()
                    processed_count += 1
                    t_info = out["task"]
                    p_res = out["pipeline_res"]
                    p_err = out["error"]

                    if p_err:
                        det_lpn, det_sku = None, None
                        status_val = "failed"
                        error_reason = f"Lỗi OCR: {p_err}"
                        is_lpn_match = False
                        is_sku_match = False
                        conf = 0.0
                    elif not p_res:
                        det_lpn, det_sku = None, None
                        status_val = "failed"
                        error_reason = "Không tìm thấy file ảnh hợp lệ"
                        is_lpn_match = False
                        is_sku_match = False
                        conf = 0.0
                    else:
                        det_lpn = p_res.get("lpn")
                        det_sku = p_res.get("sku")
                        conf = p_res.get("confidence", 0.0)
                        extracted = p_res.get("extracted", {})
                        overall_c = extracted.get("overall_confidence", conf)

                        exp_lpn = t_info["expected_lpn"]
                        exp_sku = t_info["expected_skus"][0] if t_info["expected_skus"] else None

                        is_lpn_match = (det_lpn.strip().upper() == exp_lpn) if (det_lpn and exp_lpn) else False
                        
                        # Hiệu chỉnh SKU: Nếu sai tối đa 1 ký tự hoặc lệch tiền tố 0 -> Lấy luôn exp_sku và coi là khớp!
                        if det_sku and exp_sku:
                            cal_sku = LabelDataParser.calibrate_sku_with_expected(det_sku, [exp_sku])
                            if cal_sku == exp_sku:
                                det_sku = exp_sku
                                is_sku_match = True
                            else:
                                is_sku_match = (det_sku.strip().upper() == exp_sku.strip().upper())
                        else:
                            is_sku_match = False

                        # Phân loại đạt/lệch (yêu cầu khớp cả LPN và SKU)
                        if is_lpn_match and (is_sku_match or not exp_sku):
                            status_val = "success"
                            error_reason = None
                        elif is_lpn_match:
                            status_val = "review"
                            error_reason = f"LPN khớp nhưng SKU đọc '{det_sku or '—'}' khác CSDL '{exp_sku}'"
                        elif det_lpn:
                            status_val = "review"
                            reasons = []
                            if exp_lpn and not is_lpn_match:
                                s_key = t_info.get("suffix_key") or ""
                                p_idx = get_base_pallet_index(s_key)
                                if not is_top_noc_item(s_key) and p_idx and p_idx in top_noc_lpn_map and det_lpn.strip().upper() == top_noc_lpn_map[p_idx]:
                                    reasons.append(f"Ảnh chụp dính tem Top Nóc Box {p_idx}A ('{det_lpn}') thay vì tem 4 tủ dưới ('{exp_lpn}')")
                                elif is_top_noc_item(s_key) and p_idx and p_idx in base_pallet_lpn_map and det_lpn.strip().upper() == base_pallet_lpn_map[p_idx]:
                                    reasons.append(f"Ảnh chụp dính tem Pallet {p_idx} đứng sàn ('{det_lpn}') thay vì tem Top Nóc ('{exp_lpn}')")
                                else:
                                    reasons.append(f"LPN đọc '{det_lpn}' khác CSDL '{exp_lpn}'")
                            if exp_sku and not is_sku_match:
                                reasons.append(f"SKU đọc '{det_sku or '—'}' khác CSDL '{exp_sku}'")
                            error_reason = "; ".join(reasons) if reasons else "Cần kiểm tra đối chiếu"
                        else:
                            status_val = "failed"
                            error_reason = "Không nhận diện được mã tem nhãn LPN trên ảnh"

                    if status_val == "success":
                        passed_count += 1
                    else:
                        failed_count += 1

                    # 3. Lưu vào CSDL an toàn trên luồng chính
                    try:
                        ocr_rec = stream_db.query(LpnAiOcrResult).filter(
                            LpnAiOcrResult.item_id == t_info["item_id"],
                            LpnAiOcrResult.image_id == t_info["image_id"]
                        ).first()

                        now_dt = datetime.utcnow()
                        raw_ocr_payload = json.dumps({
                            "detected_lpns_detail": p_res.get("detected_lpns_detail", []) if p_res else [],
                            "detected_skus_detail": p_res.get("detected_skus_detail", []) if p_res else [],
                            "all_lpns": p_res.get("all_lpns", []) if p_res else [],
                            "all_skus": p_res.get("all_skus", []) if p_res else [],
                            "barcodes": p_res.get("barcodes", []) if p_res else []
                        }, ensure_ascii=False)
                        barcodes_str = json.dumps(p_res.get("barcodes", [])) if (p_res and p_res.get("barcodes")) else None

                        if not ocr_rec:
                            ocr_rec = LpnAiOcrResult(
                                item_id=t_info["item_id"],
                                image_id=t_info["image_id"],
                                container_number=cont.container_number,
                                suffix_key=t_info["suffix_key"],
                                model_id=sel_model or "hybrid_default",
                                detected_lpn=det_lpn,
                                detected_sku=det_sku,
                                detected_barcodes=barcodes_str,
                                confidence=conf,
                                is_lpn_match=is_lpn_match,
                                is_sku_match=is_sku_match,
                                status=status_val,
                                error_reason=error_reason,
                                raw_ocr_text=raw_ocr_payload,
                                processing_time_ms=out["duration_ms"],
                                scanned_at=now_dt
                            )
                            stream_db.add(ocr_rec)
                        else:
                            ocr_rec.model_id = sel_model or "hybrid_default"
                            ocr_rec.detected_lpn = det_lpn
                            ocr_rec.detected_sku = det_sku
                            ocr_rec.detected_barcodes = barcodes_str
                            ocr_rec.confidence = conf
                            ocr_rec.is_lpn_match = is_lpn_match
                            ocr_rec.is_sku_match = is_sku_match
                            ocr_rec.status = status_val
                            ocr_rec.error_reason = error_reason
                            ocr_rec.raw_ocr_text = raw_ocr_payload
                            ocr_rec.processing_time_ms = out["duration_ms"]
                            ocr_rec.scanned_at = now_dt

                        # Nếu vừa tải được local_path mới cho ảnh, cập nhật vào lpn_images
                        if t_info.get("local_path"):
                            img_db = stream_db.query(LpnImage).filter(LpnImage.id == t_info["image_id"]).first()
                            if img_db and not img_db.local_path:
                                img_db.local_path = t_info["local_path"]

                        stream_db.commit()
                    except Exception as db_err:
                        stream_db.rollback()

                    # Gửi sự kiện SSE cho frontend cập nhật card Pallet ngay lập tức
                    event_data = {
                        "type": "item_scanned",
                        "item_id": t_info["item_id"],
                        "image_id": t_info["image_id"],
                        "suffix_key": t_info["suffix_key"],
                        "status": status_val,
                        "is_lpn_match": is_lpn_match,
                        "is_sku_match": is_sku_match,
                        "detected_lpn": det_lpn,
                        "detected_sku": det_sku,
                        "expected_lpn": t_info["expected_lpn"],
                        "expected_sku": t_info["expected_skus"][0] if t_info["expected_skus"] else None,
                        "confidence": conf,
                        "error_reason": error_reason,
                        "processed": processed_count,
                        "total": total,
                        "passed_count": passed_count,
                        "failed_count": failed_count
                    }
                    yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"

            # 4. Tự động đối soát chéo thông minh (Pallet Đứng <-> Top Nóc)
            try:
                from lpn_crawler.backend.services.pallet_grouping import resolve_cross_item_matches
                cross_res = resolve_cross_item_matches(cont.id, stream_db)
                if cross_res.get("success"):
                    passed_count = cross_res.get("passed_count", passed_count)
                    failed_count = cross_res.get("failed_count", failed_count)
            except Exception as res_err:
                print(f"[DeepScan] resolve_cross_item_matches error: {res_err}")

            # 5. Tính toán kết quả tổng kết cuối cùng
            all_imgs_count = sum(len(itm.images) for itm in cont.items)
            all_passed = stream_db.query(LpnAiOcrResult).filter(
                LpnAiOcrResult.item_id.in_([itm.id for itm in cont.items]),
                LpnAiOcrResult.status == 'success',
                LpnAiOcrResult.is_lpn_match == True
            ).count()

            if all_passed >= all_imgs_count and all_imgs_count > 0:
                final_code = "PASSED"
                final_label = "Đạt"
            else:
                final_code = "MISMATCH" if failed_count > 0 else "SCANNING"
                final_label = f"Lệch mã {failed_count} ảnh" if failed_count > 0 else f"Chưa quét đủ ({all_passed}/{all_imgs_count})"

            summary_event = {
                "type": "complete",
                "total": total,
                "passed_count": passed_count,
                "failed_count": failed_count,
                "status_code": final_code,
                "status_label": final_label
            }
            yield f"data: {json.dumps(summary_event, ensure_ascii=False)}\n\n"
        finally:
            stream_db.close()

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/containers/{container_id}/resolve-cross-matches")
def trigger_resolve_cross_matches(container_id: int, db: Session = Depends(get_db)):
    """API đối soát chéo thông minh giữa Pallet Đứng và Top Nóc."""
    from lpn_crawler.backend.services.pallet_grouping import resolve_cross_item_matches
    res = resolve_cross_item_matches(container_id, db)
    return res
