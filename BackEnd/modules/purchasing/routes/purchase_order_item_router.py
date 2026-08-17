from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
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


@router.post("/import-excel")
async def import_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """[POST] Import chi tiết mặt hàng từ file Excel (Hỗ trợ đa định dạng: Đơn hàng ATL, File xuất chuẩn, Báo cáo ERP)."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file Excel (.xlsx, .xls)")

    contents = await file.read()

    async def generate_progress():
        import json
        from datetime import date
        from shared.utils.timezone import get_vietnam_time

        try:
            wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
            ws = wb.active

            def safe_float(val, default=0.0):
                if val is None or val == "" or val == " ":
                    return default
                try:
                    cleaned = str(val).replace(',', '').strip()
                    return float(cleaned)
                except (ValueError, TypeError):
                    return default

            def safe_datetime(val):
                if val is None or val == "" or val == " ":
                    return None
                if isinstance(val, datetime):
                    return val
                if isinstance(val, date):
                    return datetime.combine(val, datetime.min.time())
                val_str = str(val).strip()
                for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
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

            def get_cell(row_tuple, idx, default=None):
                if row_tuple and 0 <= idx < len(row_tuple):
                    return row_tuple[idx]
                return default

            # Đọc tối đa 20 dòng đầu để phân tích cấu trúc header
            sample_rows = list(ws.iter_rows(min_row=1, max_row=20, values_only=True))
            header_row_idx = None
            format_type = "generic"

            for i, row in enumerate(sample_rows, 1):
                cells_lower = [str(c).strip().lower() if c is not None else "" for c in row]
                row_text = " ".join(cells_lower)
                
                # 1. Định dạng ATL
                if "chứng từ" in row_text or "so po doi tac" in row_text or "số po đối tác" in row_text:
                    header_row_idx = i
                    format_type = "atl"
                    break
                
                # 2. Định dạng Export chuẩn (18 cột)
                if ("ngày po" in row_text or "ngay po" in row_text) and ("mã po" in row_text or "ma po" in row_text) and ("mã mặt hàng" in row_text or "ma mat hang" in row_text):
                    header_row_idx = i
                    format_type = "standard_export"
                    break
                
                # 3. Định dạng ERP Báo cáo đơn mua hàng
                if ("ngày po" in row_text or "ngay po" in row_text) and ("mã po" in row_text or "ma po" in row_text):
                    header_row_idx = i
                    format_type = "erp_detailed"
                    break
                
                # 4. Định dạng chung có cột STT và Mã hàng/Mã MH
                if any("mã hàng" in c or "mã sp" in c or "item code" in c for c in cells_lower):
                    header_row_idx = i
                    format_type = "generic"
                    break

            if not header_row_idx:
                header_row_idx = 1
                format_type = "generic"

            # Xây dựng dynamic column mapping từ header_row
            header_cells = [str(c).strip().lower() if c is not None else "" for c in sample_rows[header_row_idx - 1]]
            
            def find_col(keywords, default=None):
                for idx, cell in enumerate(header_cells):
                    for kw in keywords:
                        if kw in cell:
                            return idx
                return default

            col_po_date = find_col(["ngày po", "ngay po", "ngày đặt", "order date", "po date"])
            col_po_code = find_col(["mã po", "ma po", "số chứng từ", "so chung tu", "số po", "mã đơn", "po no", "order code"])
            col_supp_code = find_col(["mã ncc", "ma ncc", "mã đối tác", "mã kh", "supplier code", "cust code"])
            col_supp_name = find_col(["tên ncc", "ten ncc", "tên đối tác", "tên khách", "supplier name", "customer"])
            col_item_code = find_col(["mã mặt hàng", "ma mat hang", "mã hàng", "mã sp", "item code", "part no", "product code"])
            col_item_name = find_col(["tên mặt hàng", "ten mat hang", "tên hàng", "tên sp", "item name", "description"])
            col_order_code = find_col(["mã đơn hàng", "ma don hang", "order no"])
            col_unit = find_col(["đvt", "dvt", "đơn vị", "unit"])
            col_qty = find_col(["số lượng", "so luong", "qty", "quantity"])
            col_price = find_col(["đơn giá", "don gia", "unit price", "price"])
            col_subtotal = find_col(["thành tiền", "thanh tien", "subtotal", "amount"])
            col_tax = find_col(["thuế", "thue", "tax"])
            col_total_tax = find_col(["sau thuế", "sau thue", "total after tax"])
            col_grand_total = find_col(["tổng tiền", "tong tien", "grand total", "total"])
            col_delivery_date = find_col(["ngày giao", "ngay giao", "yêu cầu giao", "delivery date", "req date"])
            col_status = find_col(["trạng thái", "trang thai", "status"])
            col_creator = find_col(["người tạo", "nguoi tao", "creator", "created by"])

            # Đọc các dòng dữ liệu
            data_start_row = header_row_idx + 1
            if format_type == "erp_detailed" and len(sample_rows) >= header_row_idx + 1:
                next_row_text = " ".join([str(c).strip().lower() if c is not None else "" for c in sample_rows[header_row_idx]])
                if "vnd" in next_row_text or "ngoại tệ" in next_row_text or "đvcđ" in next_row_text:
                    data_start_row = header_row_idx + 2

            all_rows = list(ws.iter_rows(min_row=data_start_row, values_only=True))
            rows_to_process = [r for r in all_rows if any(c is not None and str(c).strip() != "" for c in r)]
            total_rows = len(rows_to_process)

            yield json.dumps({"status": "processing", "processed": 0, "total": total_rows}) + "\n"

            created_count = 0
            errors = []

            curr_po_date = None
            curr_po_code = None
            curr_supp_code = None
            curr_supp_name = None
            curr_grand_total_vnd = 0.0
            curr_delivery_date = None
            curr_status = "Chưa duyệt"
            curr_creator = "Admin"

            po_req_cache = {}

            for i, row in enumerate(rows_to_process, 1):
                row_idx = data_start_row + i - 1
                try:
                    if format_type == "atl":
                        doc_no = safe_str(get_cell(row, 0)) or safe_str(get_cell(row, 1))
                        if doc_no:
                            curr_po_code = doc_no
                        if not curr_po_code:
                            continue

                        cust_code = safe_str(get_cell(row, 2)) or "KH036"
                        curr_supp_code = cust_code
                        curr_supp_name = "Atlas International (KH036)" if cust_code == "KH036" else cust_code
                        curr_po_date = safe_datetime(get_cell(row, 12))
                        curr_delivery_date = safe_datetime(get_cell(row, 8))

                        item_code = safe_str(get_cell(row, 3))
                        if not item_code:
                            continue

                        qty = safe_float(get_cell(row, 4))
                        unit_price = safe_float(get_cell(row, 5))
                        subtotal_usd = safe_float(get_cell(row, 6))
                        subtotal_vnd = safe_float(get_cell(row, 11))
                        is_pallet_cell = get_cell(row, 15)
                        is_pallet = bool(is_pallet_cell and str(is_pallet_cell).strip().lower() == "true")
                        unit = "Pallet" if is_pallet else "Bộ"

                        db_item = PurchaseOrderItem(
                            po_date=curr_po_date,
                            po_code=curr_po_code,
                            supplier_code=curr_supp_code,
                            supplier_name=curr_supp_name,
                            item_code=item_code,
                            item_name=item_code,
                            order_code=curr_po_code,
                            unit=unit,
                            quantity=qty,
                            unit_price=unit_price,
                            currency="USD",
                            subtotal_foreign=subtotal_usd,
                            grand_total_foreign=subtotal_usd,
                            subtotal_vnd=subtotal_vnd,
                            grand_total_vnd=subtotal_vnd,
                            requested_delivery_date=curr_delivery_date,
                            content="NVL đóng gói (PALLET)" if is_pallet else None,
                            status="Chưa duyệt",
                            type="Đơn bán hàng",
                            creator="Admin",
                            created_at=get_vietnam_time()
                        )

                    elif format_type == "standard_export":
                        po_code_val = safe_str(get_cell(row, 2))
                        if po_code_val:
                            curr_po_code = po_code_val
                            curr_po_date = safe_datetime(get_cell(row, 1))
                            curr_supp_code = safe_str(get_cell(row, 3))
                            curr_supp_name = safe_str(get_cell(row, 4))
                            curr_grand_total_vnd = safe_float(get_cell(row, 14))
                            curr_delivery_date = safe_datetime(get_cell(row, 15))
                            curr_status = safe_str(get_cell(row, 16)) or "Chưa duyệt"
                            curr_creator = safe_str(get_cell(row, 17)) or "Admin"

                        item_code = safe_str(get_cell(row, 5))
                        item_name = safe_str(get_cell(row, 6))
                        if not item_code and not item_name:
                            continue

                        db_item = PurchaseOrderItem(
                            po_date=curr_po_date,
                            po_code=curr_po_code,
                            supplier_code=curr_supp_code,
                            supplier_name=curr_supp_name,
                            item_code=item_code or item_name,
                            item_name=item_name or item_code,
                            order_code=safe_str(get_cell(row, 7)) or curr_po_code,
                            unit=safe_str(get_cell(row, 8)),
                            quantity=safe_float(get_cell(row, 9)),
                            unit_price=safe_float(get_cell(row, 10)),
                            currency="VND",
                            subtotal_vnd=safe_float(get_cell(row, 11)),
                            tax_vnd=safe_float(get_cell(row, 12)),
                            total_after_tax_vnd=safe_float(get_cell(row, 13)),
                            grand_total_vnd=curr_grand_total_vnd or safe_float(get_cell(row, 14)),
                            requested_delivery_date=curr_delivery_date or safe_datetime(get_cell(row, 15)),
                            status=curr_status,
                            creator=curr_creator,
                            type="Đơn mua hàng",
                            created_at=get_vietnam_time()
                        )

                    else:
                        po_code_val = safe_str(get_cell(row, col_po_code)) if col_po_code is not None else None
                        if po_code_val:
                            curr_po_code = po_code_val
                            if col_po_date is not None: curr_po_date = safe_datetime(get_cell(row, col_po_date))
                            if col_supp_code is not None: curr_supp_code = safe_str(get_cell(row, col_supp_code))
                            if col_supp_name is not None: curr_supp_name = safe_str(get_cell(row, col_supp_name))
                            if col_delivery_date is not None: curr_delivery_date = safe_datetime(get_cell(row, col_delivery_date))
                            if col_grand_total is not None: curr_grand_total_vnd = safe_float(get_cell(row, col_grand_total))
                            if col_status is not None: curr_status = safe_str(get_cell(row, col_status)) or curr_status
                            if col_creator is not None: curr_creator = safe_str(get_cell(row, col_creator)) or curr_creator

                        item_code = safe_str(get_cell(row, col_item_code)) if col_item_code is not None else None
                        item_name = safe_str(get_cell(row, col_item_name)) if col_item_name is not None else None

                        if not item_code and not item_name:
                            continue

                        qty = safe_float(get_cell(row, col_qty)) if col_qty is not None else 0.0
                        price = safe_float(get_cell(row, col_price)) if col_price is not None else 0.0
                        subtotal = safe_float(get_cell(row, col_subtotal)) if col_subtotal is not None else (qty * price)

                        db_item = PurchaseOrderItem(
                            po_date=curr_po_date,
                            po_code=curr_po_code,
                            supplier_code=curr_supp_code,
                            supplier_name=curr_supp_name,
                            item_code=item_code or item_name,
                            item_name=item_name or item_code,
                            order_code=safe_str(get_cell(row, col_order_code)) if col_order_code is not None else curr_po_code,
                            unit=safe_str(get_cell(row, col_unit)) if col_unit is not None else None,
                            quantity=qty,
                            unit_price=price,
                            currency="VND",
                            subtotal_vnd=subtotal,
                            tax_vnd=safe_float(get_cell(row, col_tax)) if col_tax is not None else 0.0,
                            total_after_tax_vnd=safe_float(get_cell(row, col_total_tax)) if col_total_tax is not None else subtotal,
                            grand_total_vnd=curr_grand_total_vnd or subtotal,
                            requested_delivery_date=curr_delivery_date,
                            status=curr_status or "Chưa duyệt",
                            creator=curr_creator or "Admin",
                            type="Đơn mua hàng",
                            created_at=get_vietnam_time()
                        )

                    # Đồng bộ hoặc liên kết với PurchaseRequisition
                    if curr_po_code:
                        if curr_po_code not in po_req_cache:
                            req = db.query(PurchaseRequisition).filter(
                                PurchaseRequisition.po_code == curr_po_code
                            ).first()
                            if not req:
                                req = PurchaseRequisition(
                                    po_code=curr_po_code,
                                    creator=curr_creator or "Admin",
                                    order_date=curr_po_date,
                                    delivery_date=curr_delivery_date,
                                    supplier_code=curr_supp_code,
                                    supplier_name=curr_supp_name,
                                    order_type="Đơn bán hàng" if format_type == "atl" else "Đơn mua hàng",
                                    status="Chưa duyệt",
                                    warehouse_status="Chưa xuất kho",
                                    created_at=get_vietnam_time()
                                )
                                db.add(req)
                                db.flush()
                            po_req_cache[curr_po_code] = req.id

                        db_item.requisition_id = po_req_cache.get(curr_po_code)

                    db.add(db_item)
                    created_count += 1

                    if created_count % 300 == 0:
                        db.flush()

                except Exception as e:
                    errors.append(f"Dòng {row_idx}: {str(e)}")

                if i % 50 == 0 or i == total_rows:
                    yield json.dumps({"status": "processing", "processed": i, "total": total_rows}) + "\n"

            db.commit()
            wb.close()

            yield json.dumps({
                "status": "completed",
                "processed": total_rows,
                "total": total_rows,
                "message": f"Import thành công! Đã nạp {created_count} mặt hàng vào hệ thống."
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
