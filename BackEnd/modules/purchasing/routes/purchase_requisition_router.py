from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from config.database import get_db
from modules.purchasing.controllers import purchase_requisition_controller as controller
from modules.purchasing.schemas.purchase_requisition import (
    PurchaseRequisitionCreate, PurchaseRequisitionUpdate, PurchaseRequisitionResponse
)
from modules.purchasing.models.purchase_requisition import PurchaseRequisition
from modules.purchasing.models.purchase_order_item import PurchaseOrderItem

import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from datetime import datetime

router = APIRouter()


@router.get("/")
def list_requisitions(
    skip: int = 0, limit: int = 50,
    status: Optional[str] = None,
    warehouse_status: Optional[str] = None,
    search: Optional[str] = None,
    supplier_code: Optional[str] = None,
    supplier_name: Optional[str] = None,
    order_type: Optional[str] = None,
    month: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """[GET] Danh sách đơn hàng với filter, search và phân trang."""
    return controller.get_all(db, skip=skip, limit=limit,
                              status=status, warehouse_status=warehouse_status,
                              search=search, supplier_code=supplier_code,
                              supplier_name=supplier_name,
                              order_type=order_type, month=month)


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """[GET] Thống kê tổng hợp đơn hàng."""
    return controller.get_stats(db)


@router.get("/shipping-monitoring")
def get_shipping_monitoring(
    skip: int = 0, limit: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
    order_type: Optional[str] = None,
    supplier_name: Optional[str] = None,
    priority: Optional[str] = None,
    month: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """[GET] Danh sách mốc thời gian vận chuyển đơn hàng cho KD04."""
    return controller.get_shipping_monitoring(
        db, skip=skip, limit=limit, search=search,
        status=status, order_type=order_type,
        supplier_name=supplier_name, priority=priority, month=month
    )


@router.get("/all-po-codes")
def get_all_po_codes(
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """[GET] Lấy danh sách tất cả mã PO duy nhất phục vụ dropdown tìm kiếm nhanh."""
    return controller.get_all_po_codes(db, search=search)


@router.get("/{requisition_id}", response_model=PurchaseRequisitionResponse)
def get_requisition(requisition_id: int, db: Session = Depends(get_db)):
    """[GET] Chi tiết 1 đơn đặt mua kèm danh sách mặt hàng."""
    db_obj = controller.get_by_id(db, requisition_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt mua")
    return db_obj


@router.post("/", response_model=PurchaseRequisitionResponse)
def create_requisition(data: PurchaseRequisitionCreate, db: Session = Depends(get_db)):
    """[POST] Tạo mới đơn đặt mua."""
    existing = controller.get_by_code(db, data.po_code)
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã đơn mua '{data.po_code}' đã tồn tại")
    return controller.create(db, data)


@router.put("/{requisition_id}", response_model=PurchaseRequisitionResponse)
def update_requisition(requisition_id: int, data: PurchaseRequisitionUpdate, db: Session = Depends(get_db)):
    """[PUT] Cập nhật đơn đặt mua."""
    result = controller.update(db, requisition_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt mua để cập nhật")
    return result


@router.delete("/{requisition_id}")
def delete_requisition(requisition_id: int, db: Session = Depends(get_db)):
    """[DELETE] Xóa đơn đặt mua."""
    success = controller.delete(db, requisition_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt mua để xóa")
    return {"message": "Xóa đơn đặt mua thành công"}


from modules.purchasing.services.excel_import_service import process_purchasing_excel


@router.post("/import-excel")
async def import_excel(
    file: UploadFile = File(...),
    order_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """[POST] Import đơn hàng từ file Excel (Hỗ trợ định dạng Đơn hàng ATL, Báo cáo ERP chi tiết và PO chuẩn)."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file Excel (.xlsx, .xls)")

    contents = await file.read()

    return StreamingResponse(
        process_purchasing_excel(contents, db, default_order_type=order_type),
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )


@router.get("/export-excel/download")
def export_excel(
    status: Optional[str] = None,
    warehouse_status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """[GET] Xuất danh sách đơn đặt mua ra file Excel."""
    result = controller.get_all(db, skip=0, limit=99999,
                                status=status, warehouse_status=warehouse_status, search=search)
    items = result["items"]

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Đơn đặt mua"

    # Style
    header_font = Font(name="Arial", bold=True, size=11, color="FFFFFF")
    header_fill = PatternFill(start_color="5D3B32", end_color="5D3B32", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin")
    )

    headers = [
        "STT", "Mã đơn mua", "Người tạo", "Ngày đặt hàng", "Ngày giao hàng",
        "Người kiểm tra", "Người duyệt", "Mã NCC", "Tên NCC",
        "Tổng tiền", "Loại đơn mua", "Trạng thái", "Tình trạng nhập kho", "Số mặt hàng"
    ]

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    # Data rows
    for idx, item in enumerate(items, 1):
        row_data = [
            idx,
            item.get("po_code", ""),
            item.get("creator", ""),
            item.get("order_date").strftime("%d/%m/%Y") if item.get("order_date") else "",
            item.get("delivery_date").strftime("%d/%m/%Y") if item.get("delivery_date") else "",
            item.get("inspector", ""),
            item.get("approver", ""),
            item.get("supplier_code", ""),
            item.get("supplier_name", ""),
            item.get("total_amount", 0),
            item.get("order_type", ""),
            item.get("status", ""),
            item.get("warehouse_status", ""),
            item.get("item_count", 0),
        ]
        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=idx + 1, column=col, value=value)
            cell.border = thin_border
            if col == 10:  # Tổng tiền
                cell.number_format = '#,##0'

    # Auto-width
    for col in ws.columns:
        max_length = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_length + 4, 40)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Don_dat_mua_{now}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
