from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
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


@router.post("/import-excel")
async def import_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """[POST] Import đơn hàng từ file Excel (Hỗ trợ cả định dạng Đơn hàng ATL và biểu mẫu PO chuẩn)."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file Excel (.xlsx, .xls)")

    contents = await file.read()

    async def generate_progress():
        import json
        from collections import OrderedDict
        from shared.utils.timezone import get_vietnam_time

        try:
            wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
            ws = wb.active

            def safe_float(val, default=0.0):
                if val is None or val == "" or val == " ":
                    return default
                try:
                    return float(val)
                except (ValueError, TypeError):
                    return default

            def safe_datetime(val):
                if val is None or val == "":
                    return None
                if isinstance(val, datetime):
                    return val
                val_str = str(val).strip()
                for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
                    try:
                        return datetime.strptime(val_str, fmt)
                    except ValueError:
                        pass
                return None

            def safe_str(val):
                if val is None:
                    return None
                s = str(val).strip()
                return s if s else None

            # Tìm header row
            header_row = None
            is_atl_format = False
            for i, row in enumerate(ws.iter_rows(min_row=1, max_row=10, values_only=True), 1):
                cells = [str(c).strip() if c else "" for c in row]
                if any("Sô chứng từ" in c or "Số PO đối tác" in c or "Mã mặt hàng" in c for c in cells):
                    header_row = i
                    is_atl_format = True
                    break
                elif any("Mã đơn mua" in c or "STT" == c for c in cells):
                    header_row = i
                    is_atl_format = False
                    break

            if not header_row:
                yield json.dumps({"status": "error", "message": "Không tìm thấy dòng tiêu đề hợp lệ trong file Excel"}) + "\n"
                return

            rows_to_process = []
            for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
                if any(c is not None for c in row):
                    rows_to_process.append(row)

            total_rows = len(rows_to_process)
            yield json.dumps({"status": "processing", "processed": 0, "total": total_rows}) + "\n"

            created_count = 0
            updated_count = 0

            if is_atl_format:
                # Định dạng Đơn hàng ATL với chi tiết mặt hàng
                orders = OrderedDict()
                for row in rows_to_process:
                    doc_no = safe_str(row[0]) or safe_str(row[1])
                    if not doc_no:
                        continue
                    if doc_no not in orders:
                        orders[doc_no] = {
                            "po_code": doc_no,
                            "partner_po": safe_str(row[1]) or "",
                            "cust_code": safe_str(row[2]) or "KH036",
                            "plan_month": safe_str(row[7]) or "",
                            "delivery_date": safe_datetime(row[8]),
                            "currency": safe_str(row[9]) or "USD",
                            "exchange_rate": safe_float(row[10], 26100.0),
                            "order_date": safe_datetime(row[12]),
                            "container_type": safe_str(row[13]) or "",
                            "container_qty": safe_float(row[14], 1.0),
                            "items": []
                        }
                    item_code = safe_str(row[3]) or ""
                    qty = safe_float(row[4], 0.0)
                    unit_price = safe_float(row[5], 0.0)
                    subtotal_usd = safe_float(row[6], 0.0)
                    subtotal_vnd = safe_float(row[11], 0.0)
                    is_pallet = bool(row[15] and str(row[15]).strip().lower() == "true") if len(row) > 15 else False

                    orders[doc_no]["items"].append({
                        "item_code": item_code,
                        "quantity": qty,
                        "unit_price": unit_price,
                        "subtotal_usd": subtotal_usd,
                        "subtotal_vnd": subtotal_vnd,
                        "is_pallet": is_pallet,
                        "delivery_date": safe_datetime(row[8]),
                    })

                processed_orders = 0
                total_orders = len(orders)

                for po_code, o_data in orders.items():
                    order_total_usd = sum(it["subtotal_usd"] for it in o_data["items"])
                    note_parts = []
                    if o_data["plan_month"]:
                        note_parts.append(f"Kế hoạch: {o_data['plan_month']}")
                    if o_data["container_type"]:
                        cnt_str = f"{int(o_data['container_qty'])}x {o_data['container_type']}" if o_data['container_qty'] else o_data['container_type']
                        note_parts.append(f"Cont: {cnt_str}")
                    if o_data["exchange_rate"]:
                        note_parts.append(f"Tỷ giá: {int(o_data['exchange_rate']):,}")
                    note_text = " | ".join(note_parts)

                    existing = db.query(PurchaseRequisition).filter(PurchaseRequisition.po_code == po_code).first()
                    if existing:
                        existing.creator = "Admin"
                        existing.order_date = o_data["order_date"] or existing.order_date
                        existing.delivery_date = o_data["delivery_date"] or existing.delivery_date
                        existing.est_completion_date = o_data["delivery_date"] or existing.est_completion_date
                        existing.supplier_code = o_data["cust_code"]
                        existing.supplier_name = "Atlas International (KH036)" if o_data["cust_code"] == "KH036" else o_data["cust_code"]
                        existing.total_amount = order_total_usd
                        existing.order_type = "Đơn bán hàng"
                        existing.note = note_text
                        updated_count += 1
                        db.query(PurchaseOrderItem).filter(PurchaseOrderItem.requisition_id == existing.id).delete()
                        pr_id = existing.id
                    else:
                        new_pr = PurchaseRequisition(
                            po_code=po_code,
                            creator="Admin",
                            order_date=o_data["order_date"],
                            delivery_date=o_data["delivery_date"],
                            est_completion_date=o_data["delivery_date"],
                            supplier_code=o_data["cust_code"],
                            supplier_name="Atlas International (KH036)" if o_data["cust_code"] == "KH036" else o_data["cust_code"],
                            total_amount=order_total_usd,
                            order_type="Đơn bán hàng",
                            priority="Bình thường",
                            material_type="Gỗ & Phụ kiện",
                            status="Chưa duyệt",
                            warehouse_status="Chưa xuất kho",
                            note=note_text,
                            created_at=get_vietnam_time()
                        )
                        db.add(new_pr)
                        db.flush()
                        pr_id = new_pr.id
                        created_count += 1

                    for it in o_data["items"]:
                        poi = PurchaseOrderItem(
                            requisition_id=pr_id,
                            po_date=o_data["order_date"],
                            po_code=po_code,
                            supplier_code=o_data["cust_code"],
                            supplier_name="Atlas International (KH036)",
                            item_code=it["item_code"],
                            item_name=it["item_code"],
                            order_code=po_code,
                            unit="Pallet" if it["is_pallet"] else "Bộ",
                            quantity=it["quantity"],
                            unit_price=it["unit_price"],
                            currency="USD",
                            subtotal_foreign=it["subtotal_usd"],
                            grand_total_foreign=it["subtotal_usd"],
                            subtotal_vnd=it["subtotal_vnd"],
                            grand_total_vnd=it["subtotal_vnd"],
                            requested_delivery_date=it["delivery_date"],
                            content="NVL đóng gói (PALLET)" if it["is_pallet"] else None,
                            status="Chưa duyệt",
                            type="Đơn bán hàng",
                            creator="Admin",
                            created_at=get_vietnam_time()
                        )
                        db.add(poi)

                    processed_orders += 1
                    if processed_orders % 20 == 0 or processed_orders == total_orders:
                        yield json.dumps({
                            "status": "processing",
                            "processed": processed_orders,
                            "total": total_orders
                        }) + "\n"

            else:
                # Biểu mẫu phẳng chuẩn
                processed = 0
                for i, row in enumerate(rows_to_process, 1):
                    po_code = safe_str(row[1])
                    if not po_code:
                        processed += 1
                        continue

                    existing = db.query(PurchaseRequisition).filter(PurchaseRequisition.po_code == po_code).first()
                    if existing:
                        existing.creator = safe_str(row[2]) or existing.creator
                        existing.order_date = safe_datetime(row[3]) or existing.order_date
                        existing.delivery_date = safe_datetime(row[4]) or existing.delivery_date
                        existing.branch = safe_str(row[5]) or existing.branch
                        existing.inspector = safe_str(row[6]) or existing.inspector
                        existing.inspection_date = safe_datetime(row[7]) or existing.inspection_date
                        existing.approver = safe_str(row[8]) or existing.approver
                        existing.approval_date = safe_datetime(row[9]) or existing.approval_date
                        existing.supplier_code = safe_str(row[10]) or existing.supplier_code
                        existing.supplier_name = safe_str(row[11]) or existing.supplier_name
                        existing.total_amount = safe_float(row[12]) or existing.total_amount
                        existing.order_type = safe_str(row[13]) or existing.order_type
                        existing.status = safe_str(row[14]) or existing.status
                        existing.processing_status = safe_str(row[15]) or existing.processing_status
                        existing.warehouse_status = safe_str(row[16]) or existing.warehouse_status
                        existing.note = safe_str(row[17]) if len(row) > 17 else existing.note
                        updated_count += 1
                    else:
                        db_obj = PurchaseRequisition(
                            po_code=po_code,
                            creator=safe_str(row[2]),
                            order_date=safe_datetime(row[3]),
                            delivery_date=safe_datetime(row[4]),
                            branch=safe_str(row[5]),
                            inspector=safe_str(row[6]),
                            inspection_date=safe_datetime(row[7]),
                            approver=safe_str(row[8]),
                            approval_date=safe_datetime(row[9]),
                            supplier_code=safe_str(row[10]),
                            supplier_name=safe_str(row[11]),
                            total_amount=safe_float(row[12]),
                            order_type=safe_str(row[13]) or "Đơn bán hàng",
                            status=safe_str(row[14]),
                            processing_status=safe_str(row[15]),
                            warehouse_status=safe_str(row[16]),
                            note=safe_str(row[17]) if len(row) > 17 else None,
                            created_at=get_vietnam_time()
                        )
                        db.add(db_obj)
                        created_count += 1

                    processed += 1
                    if processed % 20 == 0 or processed == total_rows:
                        yield json.dumps({"status": "processing", "processed": processed, "total": total_rows}) + "\n"

            db.commit()
            wb.close()

            yield json.dumps({
                "status": "completed",
                "processed": total_rows,
                "total": total_rows,
                "message": f"Import thành công! Tạo mới: {created_count} đơn hàng, Cập nhật: {updated_count} đơn hàng"
            }) + "\n"

        except Exception as e:
            db.rollback()
            yield json.dumps({"status": "error", "message": f"Lỗi xử lý file Excel: {str(e)}"}) + "\n"

    return StreamingResponse(
        generate_progress(),
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
