# -*- coding: utf-8 -*-
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc, asc, extract, text, func

from app.core.database import get_db
from lpn_crawler.backend.models.models import LpnContainer, LpnItem
from lpn_crawler.backend.utils.formatters import format_date_mdy

router = APIRouter()


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
        y_str = year.strip()
        if y_str.isdigit():
            params["year"] = int(y_str)
            params["year_str"] = f"%{y_str}%"
            where_clauses.append("(YEAR(c.date_loading) = :year OR c.date_loading_raw LIKE :year_str OR c.timestamp_raw LIKE :year_str)")

    if month and month.strip():
        m_val = month.replace("Tháng", "").replace("tháng", "").strip()
        if m_val.isdigit():
            params["month"] = int(m_val)
            params["month_str1"] = f"%/{m_val}/%"
            params["month_str2"] = f"%/{int(m_val):02d}/%"
            where_clauses.append("(MONTH(c.date_loading) = :month OR c.date_loading_raw LIKE :month_str1 OR c.date_loading_raw LIKE :month_str2)")

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
            "timestamp_raw": r.timestamp_raw,
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

    cards_sql = text(f"""
        SELECT 
            c.id as container_id,
            c.container_number,
            c.factory,
            c.date_loading,
            c.date_loading_raw,
            c.timestamp_raw,
            c.operator_name,
            (SELECT COUNT(DISTINCT i.lpn) FROM lpn_items i WITH (NOLOCK) WHERE i.container_id = c.id AND i.lpn IS NOT NULL AND LTRIM(RTRIM(i.lpn)) != '' AND i.lpn != 'None' AND i.lpn != '0') as lpn_count,
            (SELECT COUNT(DISTINCT i.sku) FROM lpn_items i WITH (NOLOCK) WHERE i.container_id = c.id AND i.sku IS NOT NULL AND LTRIM(RTRIM(i.sku)) != '' AND i.sku != 'None' AND i.sku != '0') as sku_count,
            (SELECT COUNT(*) FROM lpn_items i WITH (NOLOCK) WHERE i.container_id = c.id) as total_items,
            (SELECT COUNT(DISTINCT CONCAT(CAST(img.lpn_item_id AS VARCHAR(30)), '_', ISNULL(img.image_hash, CAST(img.id AS VARCHAR(30))))) FROM lpn_images img WITH (NOLOCK) WHERE img.container_id = c.id AND (
                (img.local_path IS NOT NULL AND LTRIM(RTRIM(img.local_path)) != '' AND img.local_path != 'None')
                OR (img.source_url IS NOT NULL AND LTRIM(RTRIM(img.source_url)) != '' AND img.source_url != 'None')
            )) as total_images,
            (SELECT COUNT(*) FROM lpn_items i WITH (NOLOCK) WHERE i.container_id = c.id AND (i.sku IS NULL OR LTRIM(RTRIM(i.sku)) = '' OR i.sku = 'None' OR i.sku = '0')) as items_without_sku,
            (SELECT COUNT(*) FROM lpn_items i WITH (NOLOCK) WHERE i.container_id = c.id AND (i.lpn IS NULL OR LTRIM(RTRIM(i.lpn)) = '' OR i.lpn = 'None' OR i.lpn = '0')) as items_without_lpn,
            (SELECT COUNT(*) FROM lpn_items i WITH (NOLOCK) WHERE i.container_id = c.id AND NOT EXISTS (
                SELECT 1 FROM lpn_images img WITH (NOLOCK) 
                WHERE img.lpn_item_id = i.id AND (
                    (img.local_path IS NOT NULL AND LTRIM(RTRIM(img.local_path)) != '' AND img.local_path != 'None')
                    OR (img.source_url IS NOT NULL AND LTRIM(RTRIM(img.source_url)) != '' AND img.source_url != 'None')
                )
            )) as items_without_image,
            (SELECT TOP 1 local_path FROM lpn_images img WITH (NOLOCK) WHERE img.container_id = c.id AND img.local_path IS NOT NULL AND LTRIM(RTRIM(img.local_path)) != '' AND img.local_path != 'None' ORDER BY img.sort_order, img.id) as first_image,
            (SELECT TOP 1 source_url FROM lpn_images img WITH (NOLOCK) WHERE img.container_id = c.id AND img.source_url IS NOT NULL AND LTRIM(RTRIM(img.source_url)) != '' AND img.source_url != 'None' ORDER BY img.sort_order, img.id) as first_image_url
        FROM lpn_containers c WITH (NOLOCK)
        {where_sql}
        ORDER BY {order_by}
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    """)
    rows = db.execute(cards_sql, params).fetchall()

    cards = []
    for r in rows:
        missing_reasons = []
        tot_imgs = r.total_images or 0
        tot_itms = r.total_items or 0
        no_img = r.items_without_image if r.items_without_image is not None else max(0, tot_itms - tot_imgs)
        no_sku = r.items_without_sku or 0
        no_lpn = r.items_without_lpn or 0

        # Kiểm tra ảnh (nếu số ảnh < số Pallet/Box hoặc có kiện thiếu ảnh)
        if tot_imgs < tot_itms or no_img > 0 or tot_imgs == 0:
            diff_img = max(no_img, tot_itms - tot_imgs)
            if diff_img > 0:
                missing_reasons.append(f"{diff_img} ảnh")
            else:
                missing_reasons.append("ảnh")
        
        # Kiểm tra SKU (nếu có kiện thiếu SKU hoặc sku_count = 0)
        if not r.sku_count or r.sku_count == 0 or no_sku > 0:
            missing_reasons.append("SKU")
            
        # Kiểm tra LPN (nếu có kiện thiếu LPN hoặc lpn_count = 0)
        if not r.lpn_count or r.lpn_count == 0 or no_lpn > 0:
            missing_reasons.append("LPN")
            
        # Kiểm tra Date loading
        if not r.date_loading_raw and not r.date_loading:
            missing_reasons.append("ngày")

        missing_label = None
        if missing_reasons:
            missing_label = f"Thiếu {', '.join(missing_reasons)}"

        cards.append({
            "container_id": r.container_id,
            "container_number": r.container_number,
            "factory": r.factory or "—",
            "date_loading_raw": r.date_loading_raw,
            "date_loading": format_date_mdy(r.date_loading, r.date_loading_raw) or (r.date_loading_raw or "—"),
            "timestamp_raw": r.timestamp_raw or "—",
            "operator_name": r.operator_name or "—",
            "lpn_count": r.lpn_count or 0,
            "sku_count": r.sku_count or 0,
            "total_items": tot_itms,
            "total_images": tot_imgs,
            "items_without_image": no_img,
            "items_without_sku": no_sku,
            "items_without_lpn": no_lpn,
            "first_image": r.first_image or r.first_image_url,
            "missing_label": missing_label,
            "is_valid": len(missing_reasons) == 0
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


@router.get("/containers/{container_id}")
def get_container_detail(container_id: int, db: Session = Depends(get_db)):
    """
    Xem chi tiết 1 Container kèm toàn bộ danh sách items và hình ảnh
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
        formatted_items.append({
            "id": itm.id,
            "item_id": itm.id,
            "container_id": cont.id,
            "container_number": cont.container_number,
            "factory": cont.factory,
            "date_loading": format_date_mdy(cont.date_loading, cont.date_loading_raw) or (cont.date_loading_raw or "—"),
            "date_loading_raw": cont.date_loading_raw,
            "timestamp_raw": cont.timestamp_raw,
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
            "first_image": imgs[0]["local_path"] or imgs[0]["source_url"] if imgs else None
        })

    return {
        "id": cont.id,
        "container_id": cont.id,
        "container_number": cont.container_number,
        "factory": cont.factory or "—",
        "date_loading": format_date_mdy(cont.date_loading, cont.date_loading_raw) or (cont.date_loading_raw or "—"),
        "date_loading_raw": cont.date_loading_raw,
        "timestamp_raw": cont.timestamp_raw or "—",
        "operator_name": cont.operator_name or "—",
        "lpn_count": len(valid_lpns),
        "sku_count": len(valid_skus),
        "total_items": len(formatted_items),
        "total_images": total_imgs,
        "items": formatted_items
    }
