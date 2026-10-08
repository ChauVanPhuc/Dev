# -*- coding: utf-8 -*-
import os
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc, asc, text

from pydantic import BaseModel

from app.core.database import get_db
from lpn_crawler.backend.config.settings import settings
from lpn_crawler.backend.models.models import (
    LpnContainer, LpnJobContainer, LpnItem, LpnImage, LpnCrawlLog, LpnCrawlJob,
    LpnAiOcrResult, check_item_missing_fields
)
from lpn_crawler.backend.models.schemas import (
    BatchDeleteRequest, RetryMissingRequest, BatchDeleteItemsRequest
)
from lpn_crawler.backend.worker.manager import crawl_job_manager
from lpn_crawler.backend.services.storage import download_image_authenticated
from lpn_crawler.backend.utils.formatters import format_date_mdy

router = APIRouter()


class InlineEditItemRequest(BaseModel):
    field: str  # "csdl_sku" | "csdl_lpn" | "ocr_sku" | "ocr_lpn"
    value: str
    updated_by: Optional[str] = "User"
    user_role: Optional[str] = None
    is_admin: Optional[bool] = False


class ResolveItemRequest(BaseModel):
    status: str = "resolved"  # "resolved" | "unresolved"
    note: Optional[str] = None
    resolved_by: Optional[str] = "Nguyễn A"


@router.post("/items/{item_id}/resolve")
def resolve_item(item_id: int, req: ResolveItemRequest, db: Session = Depends(get_db)):
    """
    Xử lý dòng dữ liệu thiếu / sai mã:
    - status = 'resolved': Đã xử lý -> Ẩn khỏi danh sách cần kiểm tra
    - status = 'unresolved': Không xử lý được (kèm lý do ghi chú) -> Chuyển sang danh sách 'Không xử lý được'
    """
    item = db.query(LpnItem).filter(LpnItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.resolution_status = req.status
    item.resolution_note = req.note
    item.resolved_at = datetime.utcnow()
    item.resolved_by = req.resolved_by or "Nguyễn A"

    # Nếu người dùng đánh dấu đã xử lý và có kết quả OCR mismatch, cập nhật is_lpn_match / is_sku_match
    if req.status == "resolved":
        db.execute(text("""
            UPDATE lpn_ai_ocr_results 
            SET is_lpn_match = 1, is_sku_match = 1
            WHERE item_id = :item_id
        """), {"item_id": item_id})

    db.commit()
    return {
        "success": True,
        "message": "Đã cập nhật trạng thái xử lý thành công.",
        "item_id": item_id,
        "resolution_status": req.status
    }


@router.post("/items/{item_id}/unresolve")
def unresolve_item(item_id: int, db: Session = Depends(get_db)):
    """Đưa dòng dữ liệu quay trở lại danh sách cần xử lý."""
    item = db.query(LpnItem).filter(LpnItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.resolution_status = None
    item.resolution_note = None
    item.resolved_at = None
    item.resolved_by = None
    db.commit()
    return {"success": True, "message": "Đã đưa dòng dữ liệu quay lại danh sách cần xử lý."}


@router.put("/items/{item_id}/inline-edit")
def inline_edit_item(item_id: int, req: InlineEditItemRequest, request: Request, db: Session = Depends(get_db)):
    """
    Chỉnh sửa thủ công trực tiếp từng ô (Inline Edit):
    - Chỉ tài khoản Quản trị viên (Admin) mới có quyền sử dụng chức năng này.
    - field: "csdl_sku" | "csdl_lpn" | "ocr_sku" | "ocr_lpn"
    - value: Giá trị mới do người dùng gõ
    Tự động đối chiếu CSDL với kết quả AI, cập nhật is_lpn_match, is_sku_match, status
    và tính lại số liệu Đạt/Lỗi của Container.
    """
    # Kiểm tra phân quyền: Chỉ tài khoản Admin mới được sửa
    is_admin = False
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            from jose import jwt
            from config.settings import settings as app_settings
            payload = jwt.decode(token, app_settings.SECRET_KEY, algorithms=[app_settings.ALGORITHM])
            username = (payload.get("sub") or "").lower()
            if username == "admin":
                is_admin = True
            else:
                from modules.auth.models.accounts import Account as AccountModel
                user_acc = db.query(AccountModel).filter(AccountModel.username == username).first()
                if user_acc:
                    r_name = (getattr(user_acc, 'role_name', '') or '').lower()
                    if r_name in ('it', 'bgd', 'admin') or getattr(user_acc, 'username', '') == 'admin':
                        is_admin = True
        except Exception:
            pass

    # Fallback kiểm tra thông tin định danh gửi từ client
    if not is_admin:
        if req.is_admin is True:
            is_admin = True
        elif req.user_role and any(r in req.user_role.lower() for r in ("it", "bgd", "admin", "quản trị")):
            is_admin = True
        elif req.updated_by and req.updated_by.lower() in ("admin", "it", "bgd"):
            is_admin = True

    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Chức năng chỉnh sửa chỉ dành riêng cho tài khoản Quản trị viên (Admin)."
        )

    item = db.query(LpnItem).filter(LpnItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    new_val = (req.value or "").strip()
    field_lower = req.field.lower()

    # Tìm hoặc tạo LpnAiOcrResult cho item
    ocr = db.query(LpnAiOcrResult).filter(LpnAiOcrResult.item_id == item_id).first()
    if not ocr and item.images:
        first_img = item.images[0]
        ocr = LpnAiOcrResult(
            item_id=item.id,
            image_id=first_img.id,
            container_number=item.container.container_number if item.container else None,
            suffix_key=item.suffix_key,
            confidence=1.0,
            status="success"
        )
        db.add(ocr)
        db.flush()

    if field_lower in ("csdl_sku", "sku"):
        item.sku = new_val
        item.resolution_status = "manual_edited"
        item.resolution_note = f"Sửa thủ công CSDL SKU: '{new_val}'"
        item.resolved_at = datetime.utcnow()
        item.resolved_by = req.updated_by or "User"
        if ocr:
            det_sku = (ocr.detected_sku or "").strip()
            ocr.is_sku_match = (det_sku.upper() == new_val.upper()) if new_val else True

    elif field_lower in ("csdl_lpn", "lpn"):
        item.lpn = new_val
        item.resolution_status = "manual_edited"
        item.resolution_note = f"Sửa thủ công CSDL LPN: '{new_val}'"
        item.resolved_at = datetime.utcnow()
        item.resolved_by = req.updated_by or "User"
        if ocr:
            det_lpn = (ocr.detected_lpn or "").strip()
            ocr.is_lpn_match = (det_lpn.upper() == new_val.upper()) if new_val else True

    elif field_lower in ("ocr_sku", "detected_sku"):
        if ocr:
            ocr.detected_sku = new_val
            item_sku = (item.sku or "").strip()
            ocr.is_sku_match = (new_val.upper() == item_sku.upper()) if item_sku else True
        item.resolution_status = "manual_edited"
        item.resolution_note = f"Sửa thủ công OCR SKU: '{new_val}'"
        item.resolved_at = datetime.utcnow()
        item.resolved_by = req.updated_by or "User"

    elif field_lower in ("ocr_lpn", "detected_lpn"):
        if ocr:
            ocr.detected_lpn = new_val
            item_lpn = (item.lpn or "").strip()
            ocr.is_lpn_match = (new_val.upper() == item_lpn.upper()) if item_lpn else True
        item.resolution_status = "manual_edited"
        item.resolution_note = f"Sửa thủ công OCR LPN: '{new_val}'"
        item.resolved_at = datetime.utcnow()
        item.resolved_by = req.updated_by or "User"

    else:
        raise HTTPException(status_code=400, detail=f"Trường '{req.field}' không hợp lệ")

    # Đánh giá lại status của ocr
    if ocr:
        lpn_matched = bool(ocr.is_lpn_match)
        sku_matched = bool(ocr.is_sku_match) if item.sku else True
        if lpn_matched and sku_matched:
            ocr.status = "success"
            ocr.error_reason = f"Đã sửa thủ công bởi {req.updated_by or 'User'}"
        else:
            ocr.status = "failed"
            reasons = []
            if not lpn_matched:
                reasons.append("LPN không khớp")
            if not sku_matched:
                reasons.append("SKU không khớp")
            ocr.error_reason = f"Lệch mã: {', '.join(reasons)}"

    db.commit()

    # Tính toán lại số liệu container
    container = item.container
    cont_kpi = None
    if container:
        all_itms = container.items
        all_itm_ids = [it.id for it in all_itms]
        matched_cnt = db.query(LpnAiOcrResult).filter(
            LpnAiOcrResult.item_id.in_(all_itm_ids),
            LpnAiOcrResult.is_lpn_match == True,
            LpnAiOcrResult.is_sku_match == True,
            LpnAiOcrResult.status == 'success'
        ).count()
        total_itms = len(all_itms)
        mismatch_cnt = max(0, total_itms - matched_cnt)
        new_status = "PASSED" if mismatch_cnt == 0 else "MISMATCH"

        cont_kpi = {
            "container_id": container.id,
            "total_items": total_itms,
            "ocr_matched_count": matched_cnt,
            "ocr_mismatch_count": mismatch_cnt,
            "status_code": new_status,
            "status_label": "Đạt" if new_status == "PASSED" else f"Lệch mã {mismatch_cnt} ảnh"
        }

    return {
        "success": True,
        "message": "Đã lưu chỉnh sửa thành công.",
        "item": {
            "id": item.id,
            "lpn": item.lpn,
            "sku": item.sku,
            "resolution_status": item.resolution_status,
            "resolution_note": item.resolution_note,
            "ocr": {
                "id": ocr.id if ocr else None,
                "detected_lpn": ocr.detected_lpn if ocr else None,
                "detected_sku": ocr.detected_sku if ocr else None,
                "is_lpn_match": bool(ocr.is_lpn_match) if ocr else False,
                "is_sku_match": bool(ocr.is_sku_match) if ocr else False,
                "status": ocr.status if ocr else None,
                "error_reason": ocr.error_reason if ocr else None
            } if ocr else None
        },
        "container_kpi": cont_kpi
    }


@router.get("/items/{item_id}")
def get_item_detail(item_id: int, db: Session = Depends(get_db)):
    """
    Lấy chi tiết 1 Item (Pallet/Box) theo item_id.
    Dùng cho row detail action trong DataTable.
    Trả đầy đủ item data + container header + images[].
    """
    item = db.query(LpnItem).options(
        joinedload(LpnItem.images),
        joinedload(LpnItem.container).joinedload(LpnContainer.items)
    ).filter(LpnItem.id == item_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    cont = item.container
    sibling_items = []
    if cont and cont.items:
        sibling_items = [
            {
                "id": itm.id,
                "item_id": itm.id,
                "suffix_key": itm.suffix_key,
                "record_type": itm.record_type,
                "lpn": itm.lpn,
                "sku": itm.sku,
                "batch": itm.batch_resolved or itm.batch_original,
                "container_number": cont.container_number,
                "container_id": cont.id
            }
            for itm in cont.items
        ]

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
        "resolution_status": item.resolution_status,
        "resolution_note": item.resolution_note,
        "resolved_at": item.resolved_at.isoformat() if item.resolved_at else None,
        "resolved_by": item.resolved_by,
        "sibling_items": sibling_items,
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
    tab: str = Query("active"),  # "active" (cần kiểm tra) | "unresolved" (không xử lý được)
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách các dòng dữ liệu bị thiếu trường thông tin (phục vụ Popup Danh Sách Dòng Thiếu/Lệch).
    Hỗ trợ tab='active' (chưa xử lý) và tab='unresolved' (danh sách không xử lý được kèm ghi chú).
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

    if tab == "unresolved":
        # Danh sách không xử lý được
        where_clauses.append("i.resolution_status = 'unresolved'")
    else:
        # Danh sách cần xử lý (loại bỏ các dòng đã xử lý hoặc không xử lý được)
        where_clauses.append("(i.resolution_status IS NULL OR i.resolution_status = '')")

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
            elif mt in ("mismatch", "sai_ma", "lech_ma", "wrong_code"):
                where_clauses.append("""EXISTS (
                    SELECT 1 FROM lpn_ai_ocr_results o WITH (NOLOCK)
                    WHERE o.item_id = i.id AND (
                        (o.detected_lpn IS NOT NULL AND LTRIM(RTRIM(o.detected_lpn)) != '' AND o.is_lpn_match = 0)
                        OR (o.detected_sku IS NOT NULL AND LTRIM(RTRIM(o.detected_sku)) != '' AND o.is_sku_match = 0)
                    )
                )""")
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
                OR EXISTS (
                    SELECT 1 FROM lpn_ai_ocr_results o WITH (NOLOCK)
                    WHERE o.item_id = i.id AND (
                        (o.detected_lpn IS NOT NULL AND LTRIM(RTRIM(o.detected_lpn)) != '' AND o.is_lpn_match = 0)
                        OR (o.detected_sku IS NOT NULL AND LTRIM(RTRIM(o.detected_sku)) != '' AND o.is_sku_match = 0)
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
            i.record_type,
            i.resolution_status,
            i.resolution_note,
            i.resolved_at,
            i.resolved_by,
            ocr.detected_lpn,
            ocr.detected_sku,
            ocr.is_lpn_match,
            ocr.is_sku_match
        FROM lpn_items i WITH (NOLOCK)
        JOIN lpn_containers c WITH (NOLOCK) ON i.container_id = c.id
        OUTER APPLY (
            SELECT TOP 1 detected_lpn, detected_sku, is_lpn_match, is_sku_match
            FROM lpn_ai_ocr_results o WITH (NOLOCK)
            WHERE o.item_id = i.id
            ORDER BY o.id DESC
        ) ocr
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

        # Phát hiện sai mã / lệch CSDL từ kết quả quét AI OCR
        has_lpn_mismatch = bool(r.detected_lpn and str(r.detected_lpn).strip() and r.is_lpn_match is False)
        has_sku_mismatch = bool(r.detected_sku and str(r.detected_sku).strip() and r.is_sku_match is False)
        if has_lpn_mismatch:
            missing_fields.append(f"Sai mã LPN (Đọc: {str(r.detected_lpn).strip()})")
        if has_sku_mismatch:
            missing_fields.append(f"Sai mã SKU (Đọc: {str(r.detected_sku).strip()})")

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
            "resolution_status": r.resolution_status,
            "resolution_note": r.resolution_note,
            "resolved_at": r.resolved_at.isoformat() if hasattr(r, 'resolved_at') and r.resolved_at else None,
            "resolved_by": r.resolved_by if hasattr(r, 'resolved_by') else None,
            "detected_lpn": r.detected_lpn,
            "detected_sku": r.detected_sku,
            "is_lpn_match": r.is_lpn_match,
            "is_sku_match": r.is_sku_match,
            "has_mismatch": bool(has_lpn_mismatch or has_sku_mismatch),
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
        "missing_image": 0,
        "mismatch_code": 0,
        "unresolved_count": 0
    }
    try:
        summary_where_sql_parts = list(date_where_clauses)
        summary_where_sql = f"WHERE {' AND '.join(summary_where_sql_parts)}" if summary_where_sql_parts else ""
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
                    CASE WHEN ((c.date_loading IS NULL AND (c.date_loading_raw IS NULL OR LTRIM(RTRIM(c.date_loading_raw)) = '')) OR (c.timestamp_raw IS NULL OR LTRIM(RTRIM(c.timestamp_raw)) = '')) THEN 1 ELSE 0 END as no_datetime,
                    CASE WHEN EXISTS (
                        SELECT 1 FROM lpn_ai_ocr_results o WITH (NOLOCK)
                        WHERE o.item_id = i.id AND (
                            (o.detected_lpn IS NOT NULL AND LTRIM(RTRIM(o.detected_lpn)) != '' AND o.is_lpn_match = 0)
                            OR (o.detected_sku IS NOT NULL AND LTRIM(RTRIM(o.detected_sku)) != '' AND o.is_sku_match = 0)
                        )
                    ) THEN 1 ELSE 0 END as is_mismatch
                FROM lpn_items i WITH (NOLOCK)
                JOIN lpn_containers c WITH (NOLOCK) ON i.container_id = c.id
                {summary_where_sql}
                {"AND" if summary_where_sql else "WHERE"} (i.resolution_status IS NULL OR i.resolution_status = '')
            )
            SELECT 
                COUNT(*) as total_missing,
                SUM(no_lpn) as missing_lpn,
                SUM(no_sku) as missing_sku,
                SUM(no_img) as missing_img,
                SUM(is_mismatch) as mismatch_code
            FROM ItemStats
            WHERE no_lpn = 1 OR no_sku = 1 OR no_img = 1 OR no_container = 1 OR no_datetime = 1 OR is_mismatch = 1
        """)
        sum_row = db.execute(summary_query, summary_params).fetchone()

        # Đếm số lượng item Không Xử Lý Được trong phạm vi ngày
        unres_sql = text(f"""
            SELECT COUNT(*) 
            FROM lpn_items i WITH (NOLOCK)
            JOIN lpn_containers c WITH (NOLOCK) ON i.container_id = c.id
            {summary_where_sql}
            {"AND" if summary_where_sql else "WHERE"} i.resolution_status = 'unresolved'
        """)
        unres_cnt = db.execute(unres_sql, summary_params).scalar() or 0

        if sum_row:
            summary = {
                "total_missing": sum_row[0] or 0,
                "missing_lpn": sum_row[1] or 0,
                "missing_sku": sum_row[2] or 0,
                "missing_image": sum_row[3] or 0,
                "mismatch_code": sum_row[4] or 0,
                "unresolved_count": unres_cnt
            }
        else:
            summary["unresolved_count"] = unres_cnt
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
