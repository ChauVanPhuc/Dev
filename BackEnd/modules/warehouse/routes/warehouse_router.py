# -*- coding: utf-8 -*-
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session, joinedload

from config.database import get_db
from config.security import get_current_user
from config.settings import get_upload_dir
from shared.services.websocket_service import socket_manager
from modules.auth.models.accounts import Account
from modules.warehouse.models import (
    Warehouse,
    WarehouseMaterial,
    GoodsReceipt,
    GoodsIssue,
    RejectedGoods,
)
from modules.warehouse.schemas import (
    WarehouseResponse,
    WarehouseMaterialCreate,
    WarehouseMaterialResponse,
    GoodsReceiptCreate,
    GoodsReceiptUpdate,
    GoodsReceiptConfirmRequest,
    GoodsReceiptBatchDelete,
    GoodsIssueCreate,
    GoodsIssueUpdate,
    GoodsIssueConfirmRequest,
    GoodsIssueBatchDelete,
    RejectedGoodsCreate,
    RejectedGoodsUpdate,
    RejectedGoodsResolveRequest,
    RejectedGoodsCancelRequest,
)
from modules.warehouse.services import warehouse_inventory_service as wh_srv

router = APIRouter()


async def _broadcast_wh_event(event: str, voucher_no: str = "", channel: str = "Web"):
    try:
        await socket_manager.broadcast_all({
            "type": "WAREHOUSE_UPDATED",
            "event": event,
            "voucher_no": voucher_no,
            "channel": channel,
        })
    except Exception:
        pass


def _get_username(user: Optional[Account]) -> str:
    if not user:
        return "Người dùng"
    return getattr(user, "full_name", None) or getattr(user, "username", None) or "Người dùng"


# ==========================================
# UPLOAD IMAGE & MOBILE METADATA
# ==========================================
@router.post("/upload-image")
async def upload_warehouse_image(
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
):
    upload_file = image or file
    if not upload_file:
        raise HTTPException(status_code=400, detail="Không tìm thấy tệp ảnh tải lên.")

    upload_dir = get_upload_dir("warehouse")
    file_ext = os.path.splitext(upload_file.filename or "")[1].lower() or ".jpg"
    if file_ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        file_ext = ".jpg"
    filename = f"wh_{uuid.uuid4().hex[:12]}{file_ext}"
    file_path = os.path.join(upload_dir, filename)

    content = await upload_file.read()
    with open(file_path, "wb") as buf:
        buf.write(content)

    return {"url": f"/static/uploads/warehouse/{filename}", "filename": filename}


@router.get("/mobile-meta")
@router.get("/meta")
def get_warehouse_mobile_meta(db: Session = Depends(get_db)):
    return wh_srv.get_mobile_meta(db)


@router.get("/my-factory-handovers")
def get_my_factory_handovers(
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user),
):
    return wh_srv.get_factory_handovers_for_account(db, current_user)


@router.get("/catalog-search")
def search_warehouse_catalog(
    search: str = Query(""),
    warehouseCode: str = Query("ALL"),
    limit: int = Query(60, ge=1, le=200),
    db: Session = Depends(get_db),
):
    items = wh_srv.search_catalog_items(db, search=search, warehouse_code=warehouseCode, limit=limit)
    return {"items": items, "total": len(items)}


# ==========================================
# MASTER WAREHOUSES & MATERIALS
# ==========================================
@router.get("/list", response_model=List[WarehouseResponse])
def get_warehouses(db: Session = Depends(get_db)):
    return db.query(Warehouse).filter(Warehouse.is_active == True).order_by(Warehouse.sort_order.asc()).all()


@router.get("/counts")
def get_warehouse_counts(db: Session = Depends(get_db)):
    return wh_srv.get_warehouse_counts(db)


@router.get("/materials", response_model=List[WarehouseMaterialResponse])
def get_warehouse_materials(
    warehouse_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(WarehouseMaterial).filter(WarehouseMaterial.is_active == True)
    if warehouse_code and warehouse_code.upper() != "ALL":
        norm_code = wh_srv.normalize_wh_code(warehouse_code)
        q = q.filter(WarehouseMaterial.warehouse_code == norm_code)
    return q.order_by(WarehouseMaterial.item_code.asc()).all()


@router.post("/materials", response_model=WarehouseMaterialResponse)
def upsert_warehouse_material(
    payload: WarehouseMaterialCreate,
    db: Session = Depends(get_db),
):
    wh_code = wh_srv.normalize_wh_code(payload.warehouse_code)
    wh_name = payload.warehouse_name or wh_srv.normalize_wh_name(wh_code)
    existing = db.query(WarehouseMaterial).filter(
        WarehouseMaterial.warehouse_code == wh_code,
        WarehouseMaterial.item_code == payload.item_code.strip()
    ).first()
    if existing:
        existing.item_name = payload.item_name.strip()
        existing.category = payload.category or existing.category
        existing.unit_main = payload.unit_main
        existing.unit_conversion = payload.unit_conversion
        existing.conversion_rate = payload.conversion_rate
        existing.opening_main = payload.opening_main
        if payload.initial_receipt_date:
            existing.initial_receipt_date = payload.initial_receipt_date
        db.commit()
        db.refresh(existing)
        return existing

    mat = WarehouseMaterial(
        warehouse_code=wh_code,
        warehouse_name=wh_name,
        item_code=payload.item_code.strip(),
        item_name=payload.item_name.strip(),
        category=payload.category or "OTHER",
        unit_main=payload.unit_main,
        unit_conversion=payload.unit_conversion,
        conversion_rate=payload.conversion_rate,
        opening_main=payload.opening_main,
        initial_receipt_date=payload.initial_receipt_date,
        image_url=payload.image_url,
    )
    db.add(mat)
    db.commit()
    db.refresh(mat)
    return mat


@router.post("/materials/import")
def import_warehouse_materials(
    payload: List[WarehouseMaterialCreate],
    db: Session = Depends(get_db),
):
    count = 0
    for item in payload:
        upsert_warehouse_material(item, db)
        count += 1
    return {"imported": count}


@router.get("/check-stock")
def check_available_stock(
    warehouse_name: str = Query(...),
    item_code: str = Query(...),
    db: Session = Depends(get_db),
):
    return wh_srv.check_available_stock(db, warehouse_name, item_code)


@router.get("/sub-po-codes")
def get_sub_po_codes(
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    [GET] Tìm kiếm danh sách mã phân đoạn PO / Lệnh sản xuất (APT-0123-01, APT-0123-02...)
    phục vụ ô Autocomplete tìm kiếm nhanh trên phiếu bàn giao kho Mobile.
    """
    return wh_srv.search_sub_po_codes(db, search=search, limit=limit)


@router.get("/po-materials")
def get_po_materials_bom(
    po_code: Optional[str] = Query(None, description="Mã PO / Phân đoạn Lệnh sản xuất (ví dụ: APT-0123-01)"),
    po_codes: Optional[str] = Query(None, description="Danh sách nhiều mã PO cách nhau bởi dấu phẩy hoặc chấm phẩy"),
    warehouse_name: Optional[str] = Query(None, description="Tên kho xuất để tính tồn khả dụng"),
    db: Session = Depends(get_db),
):
    """
    [GET] Tự động tra cứu sản phẩm trong 1 hoặc nhiều phân đoạn PO và cộng gộp toàn bộ vật tư cần giao theo định mức BOM.
    """
    return wh_srv.get_po_material_bom_summary(
        db,
        po_code=po_code,
        po_codes=po_codes,
        warehouse_name=warehouse_name,
    )


@router.get("/purchase-po-codes")
def get_purchase_po_codes(
    search: Optional[str] = Query(None, description="Từ khóa tìm Mã PO hoặc Tên NCC"),
    warehouse_name: Optional[str] = Query(None, description="Lọc gợi ý theo kho nhập"),
    limit: int = Query(80, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    [GET] Tìm kiếm danh sách Mã PO đặt hàng từ bảng warehouse_purchase_order_items
    phục vụ chọn nhanh Mã PO khi tạo Phiếu Nhập Kho (/warehouse/goods-receipt/new).
    """
    return wh_srv.search_purchase_po_codes(db, search=search, warehouse_name=warehouse_name, limit=limit)


@router.get("/purchase-po-items")
def get_purchase_po_items(
    po_code: str = Query(..., description="Mã PO đặt hàng (ví dụ: DMH_00685/26)"),
    db: Session = Depends(get_db),
):
    """
    [GET] Lấy thông tin NCC và danh sách Tên hàng + Số lượng đặt theo Mã PO đặt hàng.
    """
    return wh_srv.get_purchase_po_items(db, po_code=po_code)


# ==========================================
# INVENTORY REPORT (XUẤT - NHẬP - TỒN)
# ==========================================
@router.get("/inventory-report")
def get_inventory_report(
    warehouse: str = Query("ALL"),
    search: str = Query(""),
    category: str = Query("ALL"),
    unitMain: str = Query("ALL"),
    unitConv: str = Query("ALL"),
    stockStatus: str = Query("ALL"),
    inventoryDays: str = Query("ALL"),
    fromDate: str = Query(""),
    toDate: str = Query(""),
    page: int = Query(1, ge=1),
    pageSize: int = Query(25, ge=1, le=5000),
    sortBy: str = Query("item_code"),
    sortDir: str = Query("asc"),
    db: Session = Depends(get_db),
):
    return wh_srv.get_inventory_report(
        db=db,
        warehouse=warehouse,
        search=search,
        category=category,
        unit_main=unitMain,
        unit_conv=unitConv,
        stock_status=stockStatus,
        inventory_days=inventoryDays,
        from_date=fromDate,
        to_date=toDate,
        page=page,
        page_size=pageSize,
        sort_by=sortBy,
        sort_dir=sortDir,
    )


@router.get("/raw-items")
def get_raw_inventory_items(
    fromDate: str = Query(""),
    toDate: str = Query(""),
    db: Session = Depends(get_db),
):
    return wh_srv.compute_raw_items(db, from_date=fromDate, to_date=toDate)


# ==========================================
# GOODS RECEIPTS (PHIẾU NHẬP KHO)
# ==========================================
@router.get("/receipts")
def get_goods_receipts(
    search: str = Query(""),
    warehouse: str = Query("ALL"),
    receiptType: str = Query("ALL"),
    status: str = Query("ALL"),
    department: str = Query("ALL"),
    createdBy: str = Query("ALL"),
    createdChannel: str = Query("ALL"),
    customer: str = Query(""),
    fromDate: str = Query(""),
    toDate: str = Query(""),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=5000),
    sortBy: str = Query("receipt_date"),
    sortDir: str = Query("desc"),
    db: Session = Depends(get_db),
):
    return wh_srv.filter_receipts(
        db=db,
        search=search,
        warehouse=warehouse,
        receipt_type=receiptType,
        status=status,
        department=department,
        created_by=createdBy,
        created_channel=createdChannel,
        customer=customer,
        from_date=fromDate,
        to_date=toDate,
        page=page,
        page_size=pageSize,
        sort_by=sortBy,
        sort_dir=sortDir,
    )


@router.post("/receipts/import")
def import_goods_receipts(
    payloads: List[GoodsReceiptCreate],
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user),
):
    username = _get_username(current_user)
    created = []
    for p in payloads:
        created.append(wh_srv.create_receipt(db, p, username=username))
    return {"imported": len(created), "items": created}


@router.post("/receipts/batch-delete")
def batch_delete_receipts(
    payload: GoodsReceiptBatchDelete,
    db: Session = Depends(get_db),
):
    deleted = wh_srv.delete_receipts(db, payload.ids)
    return {"deleted": deleted}


@router.get("/receipts/{receipt_id}")
def get_goods_receipt_by_id(receipt_id: int, db: Session = Depends(get_db)):
    r = db.query(GoodsReceipt).options(joinedload(GoodsReceipt.items)).filter(
        GoodsReceipt.id == receipt_id, GoodsReceipt.is_deleted == False
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu nhập kho.")
    return wh_srv._serialize_receipt(r)


@router.post("/receipts")
def create_goods_receipt(
    payload: GoodsReceiptCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user),
):
    res = wh_srv.create_receipt(db, payload, username=_get_username(current_user))
    background_tasks.add_task(_broadcast_wh_event, "RECEIPT_CREATED", res.get("voucher_no", ""), res.get("created_channel", "Web"))
    return res


@router.put("/receipts/{receipt_id}")
def update_goods_receipt(
    receipt_id: int,
    payload: GoodsReceiptUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user),
):
    res = wh_srv.update_receipt(db, receipt_id, payload, username=_get_username(current_user))
    background_tasks.add_task(_broadcast_wh_event, "RECEIPT_UPDATED", res.get("voucher_no", ""), res.get("created_channel", "Web"))
    return res


@router.patch("/receipts/{receipt_id}/confirm")
def confirm_goods_receipt(
    receipt_id: int,
    payload: GoodsReceiptConfirmRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user),
):
    res = wh_srv.confirm_receipt(db, receipt_id, username=_get_username(current_user), notes=payload.notes, images=payload.images)
    background_tasks.add_task(_broadcast_wh_event, "RECEIPT_CONFIRMED", res.get("voucher_no", ""), "Mobile")
    return res


@router.delete("/receipts/{receipt_id}")
def delete_single_receipt(receipt_id: int, db: Session = Depends(get_db)):
    wh_srv.delete_receipts(db, [receipt_id])
    return {"message": "Đã xóa phiếu nhập kho thành công."}


# ==========================================
# GOODS ISSUES (PHIẾU XUẤT KHO / BÀN GIAO)
# ==========================================
@router.get("/issues")
def get_goods_issues(
    search: str = Query(""),
    warehouse: str = Query("ALL"),
    issueType: str = Query("ALL"),
    status: str = Query("ALL"),
    department: str = Query("ALL"),
    createdBy: str = Query("ALL"),
    createdChannel: str = Query("ALL"),
    customer: str = Query(""),
    fromDate: str = Query(""),
    toDate: str = Query(""),
    factoryId: Optional[int] = Query(None),
    factoryName: str = Query(""),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=5000),
    sortBy: str = Query("issue_date"),
    sortDir: str = Query("desc"),
    db: Session = Depends(get_db),
):
    return wh_srv.filter_issues(
        db=db,
        search=search,
        warehouse=warehouse,
        issue_type=issueType,
        status=status,
        department=department,
        created_by=createdBy,
        created_channel=createdChannel,
        customer=customer,
        from_date=fromDate,
        to_date=toDate,
        factory_id=factoryId,
        factory_name=factoryName,
        page=page,
        page_size=pageSize,
        sort_by=sortBy,
        sort_dir=sortDir,
    )


@router.post("/issues/import")
def import_goods_issues(
    payloads: List[GoodsIssueCreate],
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user),
):
    username = _get_username(current_user)
    created = []
    for p in payloads:
        created.append(wh_srv.create_issue(db, p, username=username))
    return {"imported": len(created), "items": created}


@router.post("/issues/batch-delete")
def batch_delete_issues(
    payload: GoodsIssueBatchDelete,
    db: Session = Depends(get_db),
):
    deleted = wh_srv.delete_issues(db, payload.ids)
    return {"deleted": deleted}


@router.get("/issues/{issue_id}")
def get_goods_issue_by_id(issue_id: int, db: Session = Depends(get_db)):
    iss = db.query(GoodsIssue).options(joinedload(GoodsIssue.items)).filter(
        GoodsIssue.id == issue_id, GoodsIssue.is_deleted == False
    ).first()
    if not iss:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu xuất kho.")
    return wh_srv._serialize_issue(iss)


@router.post("/issues")
def create_goods_issue(
    payload: GoodsIssueCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user),
):
    res = wh_srv.create_issue(db, payload, username=_get_username(current_user))
    background_tasks.add_task(_broadcast_wh_event, "ISSUE_CREATED", res.get("voucher_no", ""), res.get("created_channel", "Web"))
    return res


@router.put("/issues/{issue_id}")
def update_goods_issue(
    issue_id: int,
    payload: GoodsIssueUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user),
):
    res = wh_srv.update_issue(db, issue_id, payload, username=_get_username(current_user))
    background_tasks.add_task(_broadcast_wh_event, "ISSUE_UPDATED", res.get("voucher_no", ""), res.get("created_channel", "Web"))
    return res


@router.patch("/issues/{issue_id}/confirm")
def confirm_goods_issue(
    issue_id: int,
    payload: GoodsIssueConfirmRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user),
):
    res = wh_srv.confirm_issue(
        db,
        issue_id,
        username=_get_username(current_user),
        receiver_name=payload.receiver_name,
        notes=payload.notes,
        images=payload.images,
    )
    background_tasks.add_task(_broadcast_wh_event, "ISSUE_CONFIRMED", res.get("voucher_no", ""), "Mobile")
    return res


@router.delete("/issues/{issue_id}")
def delete_single_issue(issue_id: int, db: Session = Depends(get_db)):
    wh_srv.delete_issues(db, [issue_id])
    return {"message": "Đã xóa phiếu xuất kho thành công."}


# ==========================================
# REJECTED GOODS (HÀNG LOẠI & HÀNG TRẢ VỀ)
# ==========================================
@router.get("/rejected-goods")
def get_rejected_goods(
    warehouseCode: str = Query("ALL"),
    sourceType: str = Query("ALL"),
    status: str = Query("ALL"),
    resolution: str = Query("ALL"),
    defectCategory: str = Query("ALL"),
    createdChannel: str = Query("ALL"),
    search: str = Query(""),
    fromDate: str = Query(""),
    toDate: str = Query(""),
    page: Optional[int] = Query(None, ge=1),
    pageSize: Optional[int] = Query(None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    return wh_srv.filter_rejected_goods(
        db=db,
        warehouse_code=warehouseCode,
        source_type=sourceType,
        status=status,
        resolution=resolution,
        defect_category=defectCategory,
        created_channel=createdChannel,
        search=search,
        from_date=fromDate,
        to_date=toDate,
        page=page,
        page_size=pageSize,
    )


@router.get("/rejected-goods/{rg_id}")
def get_rejected_goods_by_id(rg_id: int, db: Session = Depends(get_db)):
    rg = db.query(RejectedGoods).filter(RejectedGoods.id == rg_id, RejectedGoods.is_deleted == False).first()
    if not rg:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu trả về / hàng loại.")
    return wh_srv._serialize_rejected(rg)


@router.post("/rejected-goods")
def create_rejected_goods(
    payload: RejectedGoodsCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user),
):
    acct_factory = wh_srv.resolve_account_factory(db, current_user)
    res = wh_srv.create_rejected(db, payload, username=_get_username(current_user), account_factory=acct_factory)
    background_tasks.add_task(_broadcast_wh_event, "RETURN_CREATED", res.get("voucher_no", ""), res.get("created_channel", "Web"))
    return res


@router.put("/rejected-goods/{rg_id}")
def update_rejected_goods(
    rg_id: int,
    payload: RejectedGoodsUpdate,
    db: Session = Depends(get_db),
):
    rg = db.query(RejectedGoods).filter(RejectedGoods.id == rg_id, RejectedGoods.is_deleted == False).first()
    if not rg:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu hàng loại.")
    for field in [
        "created_date", "source_type", "origin_voucher_no", "warehouse_name",
        "item_code", "item_name", "quantity_main", "defect_category", "defect_reason",
        "resolution", "status", "resolution_notes", "department_name", "factory_id", "factory_name",
        "return_mode", "returned_by"
    ]:
        val = getattr(payload, field, None)
        if val is not None:
            setattr(rg, field, val)
    if payload.warehouse_code:
        rg.warehouse_code = wh_srv.normalize_wh_code(payload.warehouse_code)
    if getattr(payload, "images", None) is not None:
        rg.images_json = wh_srv._dump_images_json(payload.images)
    db.commit()
    db.refresh(rg)
    return wh_srv._serialize_rejected(rg)


@router.patch("/rejected-goods/{rg_id}/resolve")
def resolve_rejected_goods(
    rg_id: int,
    payload: RejectedGoodsResolveRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user),
):
    res = wh_srv.resolve_rejected(
        db,
        rg_id,
        payload.resolution,
        payload.notes or "",
        payload.resolution_date,
        username=_get_username(current_user),
        images=getattr(payload, "images", None),
    )
    background_tasks.add_task(_broadcast_wh_event, "RETURN_RESOLVED", res.get("voucher_no", ""), "Web")
    return res


@router.patch("/rejected-goods/{rg_id}/cancel")
def cancel_rejected_goods(
    rg_id: int,
    payload: RejectedGoodsCancelRequest,
    db: Session = Depends(get_db),
):
    return wh_srv.cancel_rejected(db, rg_id, payload.reason or "")

