from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional
from config.database import get_db
from modules.purchasing.controllers import purchase_order_item_controller as controller
from modules.purchasing.schemas.purchase_order_item import (
    PurchaseOrderItemCreate, PurchaseOrderItemUpdate, PurchaseOrderItemResponse
)
from modules.purchasing.models.purchase_order_item import PurchaseOrderItem
from modules.purchasing.models.purchase_requisition import PurchaseRequisition

import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from datetime import datetime

router = APIRouter()


@router.get("/")
def list_order_items(
    skip: int = 0, limit: int = 50,
    status: Optional[str] = None,
    po_code: Optional[str] = None,
    search: Optional[str] = None,
    supplier_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """[GET] Danh sách chi tiết mặt hàng với filter, search và phân trang."""
    result = controller.get_all(db, skip=skip, limit=limit,
                                status=status, po_code=po_code,
                                search=search, supplier_code=supplier_code)
    # Serialize items
    items_data = []
    for item in result["items"]:
        items_data.append({
            "id": item.id,
            "requisition_id": item.requisition_id,
            "po_date": item.po_date,
            "po_code": item.po_code,
            "supplier_code": item.supplier_code,
            "supplier_name": item.supplier_name,
            "item_code": item.item_code,
            "item_name": item.item_name,
            "order_code": item.order_code,
            "unit": item.unit,
            "converted_unit": item.converted_unit,
            "quantity": item.quantity,
            "converted_quantity": item.converted_quantity,
            "unit_price": item.unit_price,
            "converted_unit_price": item.converted_unit_price,
            "currency": item.currency,
            "subtotal_vnd": item.subtotal_vnd,
            "tax_vnd": item.tax_vnd,
            "total_after_tax_vnd": item.total_after_tax_vnd,
            "shipping_fee_vnd": item.shipping_fee_vnd,
            "other_costs_vnd": item.other_costs_vnd,
            "discount_vnd": item.discount_vnd,
            "grand_total_vnd": item.grand_total_vnd,
            "requested_delivery_date": item.requested_delivery_date,
            "status": item.status,
            "manager": item.manager,
            "creator": item.creator,
            "type": item.type,
        })
    return {"items": items_data, "total": result["total"]}


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """[GET] Thống kê tổng hợp mặt hàng."""
    return controller.get_stats(db)


@router.get("/active-pos")
def get_active_pos(db: Session = Depends(get_db)):
    """[GET] Lấy danh sách PO hoạt động (1 tháng trước, tháng hiện tại, 2 tháng tới)."""
    from sqlalchemy import func
    from shared.utils.timezone import get_vietnam_time
    from datetime import datetime
    from modules.delivery.models.order import Order

    vietnam_now = get_vietnam_time()
    current_year = vietnam_now.year
    current_month = vietnam_now.month
    
    # Ngày bắt đầu: ngày 1 của tháng trước
    start_month = current_month - 1
    start_year = current_year
    if start_month == 0:
        start_month = 12
        start_year -= 1
    start_date = datetime(start_year, start_month, 1, 0, 0, 0)
    
    # Ngày kết thúc: ngày cuối của 2 tháng tới (lấy ngày 1 của 3 tháng tới)
    end_month = current_month + 3
    end_year = current_year
    while end_month > 12:
        end_month -= 12
        end_year += 1
    end_date = datetime(end_year, end_month, 1, 0, 0, 0)
    
    # Lấy distinct order_code từ bảng Order (KHSX)
    results = db.query(
        Order.order_code,
        func.min(Order.create_date).label("create_date"),
        func.max(Order.customer).label("customer")
    ).filter(
        Order.create_date >= start_date,
        Order.create_date < end_date,
        Order.order_code != None,
        Order.order_code != ""
    ).group_by(Order.order_code).order_by(func.min(Order.create_date).desc()).all()
    
    po_list = []
    for r in results:
        po_list.append({
            "po_code": r.order_code,
            "po_date": r.create_date.strftime("%Y-%m-%d") if r.create_date else None,
            "supplier_name": r.customer or "N/A"
        })
    return po_list


@router.get("/by-po/{po_code:path}")
def get_by_po(po_code: str, db: Session = Depends(get_db)):
    """[GET] Lấy danh sách mặt hàng theo mã PO. Hỗ trợ mã PO có ký tự gạch chéo."""
    items = controller.get_by_po_code(db, po_code)
    return items


@router.get("/{item_id}", response_model=PurchaseOrderItemResponse)
def get_order_item(item_id: int, db: Session = Depends(get_db)):
    """[GET] Chi tiết 1 mặt hàng."""
    db_obj = controller.get_by_id(db, item_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy mặt hàng")
    return db_obj


@router.post("/", response_model=PurchaseOrderItemResponse)
def create_order_item(data: PurchaseOrderItemCreate, db: Session = Depends(get_db)):
    """[POST] Tạo mới chi tiết mặt hàng."""
    return controller.create(db, data)


@router.put("/{item_id}", response_model=PurchaseOrderItemResponse)
def update_order_item(item_id: int, data: PurchaseOrderItemUpdate, db: Session = Depends(get_db)):
    """[PUT] Cập nhật chi tiết mặt hàng."""
    result = controller.update(db, item_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy mặt hàng để cập nhật")
    return result


@router.delete("/{item_id}")
def delete_order_item(item_id: int, db: Session = Depends(get_db)):
    """[DELETE] Xóa chi tiết mặt hàng."""
    success = controller.delete(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy mặt hàng để xóa")
    return {"message": "Xóa mặt hàng thành công"}


from modules.purchasing.services.excel_import_service import process_purchasing_excel


@router.post("/import-excel")
async def import_excel(
    file: UploadFile = File(...),
    order_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """[POST] Import chi tiết mặt hàng từ file Excel (Hỗ trợ đa định dạng: Đơn hàng ATL, File xuất chuẩn, Báo cáo ERP)."""
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
    po_code: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """[GET] Xuất danh sách mặt hàng ra file Excel."""
    result = controller.get_all(db, skip=0, limit=99999,
                                status=status, po_code=po_code, search=search)
    items = result["items"]

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Đơn mua hàng"

    # Style
    header_font = Font(name="Arial", bold=True, size=11, color="FFFFFF")
    header_fill = PatternFill(start_color="5D3B32", end_color="5D3B32", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin")
    )

    headers = [
        "STT", "Ngày PO", "Mã PO", "Mã NCC", "Tên NCC",
        "Mã mặt hàng", "Tên mặt hàng", "Mã đơn hàng", "ĐVT",
        "Số lượng", "Đơn giá", "Thành tiền VND", "Thuế VND",
        "Thành tiền sau thuế", "Tổng tiền VND",
        "Ngày giao hàng", "Trạng thái", "Người tạo PO"
    ]

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    for idx, item in enumerate(items, 1):
        row_data = [
            idx,
            item.po_date.strftime("%d/%m/%Y") if item.po_date else "",
            item.po_code or "",
            item.supplier_code or "",
            item.supplier_name or "",
            item.item_code or "",
            item.item_name or "",
            item.order_code or "",
            item.unit or "",
            item.quantity or 0,
            item.unit_price or 0,
            item.subtotal_vnd or 0,
            item.tax_vnd or 0,
            item.total_after_tax_vnd or 0,
            item.grand_total_vnd or 0,
            item.requested_delivery_date.strftime("%d/%m/%Y") if item.requested_delivery_date else "",
            item.status or "",
            item.creator or "",
        ]
        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=idx + 1, column=col, value=value)
            cell.border = thin_border
            if col in (10, 11, 12, 13, 14, 15):
                cell.number_format = '#,##0'

    # Auto-width
    for col in ws.columns:
        max_length = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_length + 4, 40)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Don_mua_hang_{now}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
