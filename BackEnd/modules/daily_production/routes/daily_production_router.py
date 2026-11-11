# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from config.database import get_db
from modules.daily_production.schemas.daily_production_schema import (
    PreviewMergeRequest,
    DailyProductionBatchCreate,
    DailyProductionBatchUpdate,
    BatchItemsQuickUpdatePayload
)
from modules.daily_production.controllers.daily_production_controller import (
    get_daily_production_metadata,
    get_available_containers_tree,
    preview_merged_containers_bom,
    create_daily_batch,
    list_daily_batches,
    get_daily_batch_detail,
    update_daily_batch,
    quick_update_batch_items,
    delete_daily_batch
)

router = APIRouter()


@router.get("/metadata")
def api_get_daily_production_metadata(db: Session = Depends(get_db)):
    """
    [GET] Trả về toàn bộ danh mục cấu hình động trực tiếp từ CSDL:
    - factories (hr_factory_structures)
    - stages (stages)
    - sections (bom_details cấp 1 + stages)
    - plans (product_plans)
    - colors (products)
    """
    return get_daily_production_metadata(db=db)


@router.get("/available-containers")
def api_get_available_containers(
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm mã PO / Cont / Khách hàng"),
    factory: Optional[str] = Query(None, description="Nhà máy từ CSDL"),
    plan_id: Optional[int] = Query(None, description="ID Kế hoạch sản xuất (product_plans.id)"),
    month: Optional[int] = Query(None, description="Tháng kế hoạch SX"),
    plan_date: Optional[str] = Query(None, description="Ngày sản xuất YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """
    [GET] Trả về danh sách các PO gốc và danh sách từng Cont lẻ bên trong từ CSDL
    để người dùng tự do tick chọn gộp Cont.
    """
    return get_available_containers_tree(
        db=db,
        search=search,
        factory=factory,
        plan_id=plan_id,
        month=month,
        plan_date=plan_date
    )


@router.post("/preview-merge")
def api_preview_merged_containers(
    payload: PreviewMergeRequest,
    db: Session = Depends(get_db)
):
    """
    [POST] Xem trước kết quả gộp các Cont đã chọn từ CSDL.
    """
    return preview_merged_containers_bom(db=db, payload=payload)


@router.get("/batches")
def api_list_daily_batches(
    plan_date: Optional[str] = Query(None, description="Ngày SX YYYY-MM-DD hoặc ALL"),
    factory: Optional[str] = Query(None, description="Nhà máy hoặc ALL"),
    section_name: Optional[str] = Query(None, description="Cụm công đoạn"),
    status: Optional[str] = Query(None, description="Trạng thái: DRAFT, PUBLISHED, COMPLETED"),
    include_items: bool = Query(True, description="Có trả kèm danh sách chi tiết hay không"),
    only_visible: bool = Query(False, description="Chỉ lấy các dòng được tick chọn hiển thị (is_visible=True)"),
    db: Session = Depends(get_db)
):
    """
    [GET] Danh sách các bảng 'Hôm nay sản xuất gì' đã lưu trong CSDL.
    """
    data = list_daily_batches(
        db=db,
        plan_date=plan_date,
        factory=factory,
        section_name=section_name,
        status=status,
        include_items=include_items,
        only_visible=only_visible
    )
    return {"batches": data, "total": len(data)}


@router.get("/batches/{batch_id}")
def api_get_daily_batch_detail(
    batch_id: int,
    only_visible: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy chi tiết 1 bảng 'Hôm nay sản xuất gì' theo ID.
    """
    res = get_daily_batch_detail(db=db, batch_id=batch_id, only_visible=only_visible)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bảng kế hoạch sản xuất ngày.")
    return res


@router.post("/batches")
def api_create_daily_batch(
    payload: DailyProductionBatchCreate,
    db: Session = Depends(get_db)
):
    """
    [POST] Lưu mới 1 bảng gộp Cont & Custom 'Hôm nay sản xuất gì'.
    """
    if not payload.batch_title or not payload.batch_title.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập hoặc chọn Cont để tạo tiêu đề bảng sản xuất.")
    return create_daily_batch(db=db, payload=payload)


@router.put("/batches/{batch_id}")
def api_update_daily_batch(
    batch_id: int,
    payload: DailyProductionBatchUpdate,
    db: Session = Depends(get_db)
):
    """
    [PUT] Cập nhật toàn bộ bảng gộp Cont & danh sách chi tiết Custom.
    """
    res = update_daily_batch(db=db, batch_id=batch_id, payload=payload)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bảng kế hoạch sản xuất ngày.")
    return res


@router.patch("/batches/{batch_id}/items")
def api_quick_update_batch_items(
    batch_id: int,
    payload: BatchItemsQuickUpdatePayload,
    db: Session = Depends(get_db)
):
    """
    [PATCH] Custom nhanh các dòng hiển thị hôm nay: bật/tắt is_visible, sửa SLKH, sửa Ghi chú hoặc thêm dòng mới.
    """
    res = quick_update_batch_items(db=db, batch_id=batch_id, payload=payload)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bảng kế hoạch sản xuất ngày.")
    return res


@router.delete("/batches/{batch_id}")
def api_delete_daily_batch(
    batch_id: int,
    db: Session = Depends(get_db)
):
    """
    [DELETE] Xóa bảng sản xuất ngày.
    """
    ok = delete_daily_batch(db=db, batch_id=batch_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy bảng kế hoạch sản xuất ngày.")
    return {"message": "Đã xóa bảng sản xuất ngày thành công.", "id": batch_id}
