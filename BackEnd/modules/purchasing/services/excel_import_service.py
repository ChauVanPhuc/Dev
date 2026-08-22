# -*- coding: utf-8 -*-
"""
Dịch vụ nạp dữ liệu Excel đa năng cho phân hệ Mua hàng (Purchasing Module).
Hỗ trợ tự động nhận diện tất cả các cấu trúc và định dạng:
1. Đơn hàng ATL triển khai SX (Atlas International - KH036)
2. Báo cáo đơn mua hàng xác nhận - Theo mặt hàng (ERP detailed 34 cột)
3. Biểu mẫu xuất danh sách đơn mua (PurchaseRequisition export)
4. Biểu mẫu xuất danh sách mặt hàng (PurchaseOrderItem export)
5. Biểu mẫu linh hoạt tùy chỉnh (Generic column matching)
"""

import io
import json
import time
from datetime import datetime
from collections import OrderedDict
import openpyxl
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from modules.purchasing.models.purchase_requisition import PurchaseRequisition
from modules.purchasing.models.purchase_order_item import PurchaseOrderItem
from shared.utils.timezone import get_vietnam_time
from shared.utils.m3_converter import calculate_pieces_from_m3


def safe_float(val, default=0.0):
    if val is None or val == "" or val == " ":
        return default
    try:
        if isinstance(val, str):
            val = val.replace(",", "").strip()
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_datetime(val):
    if val is None or val == "":
        return None
    if isinstance(val, datetime):
        return val
    val_str = str(val).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(val_str, fmt)
        except ValueError:
            pass
    return None


def safe_str(val, max_len=None):
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    return s[:max_len] if max_len else s


def get_cell(row_tuple, idx, default=None):
    if row_tuple and idx is not None and 0 <= idx < len(row_tuple):
        val = row_tuple[idx]
        return val if val is not None else default
    return default


async def process_purchasing_excel(contents: bytes, db: Session, default_order_type: str = None):
    """
    Generator streaming kết quả import file Excel theo thời gian thực (SSE).
    """
    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True, read_only=True)
        ws = wb.active

        # Đọc 25 dòng đầu để phân tích nhận diện header
        sample_rows = []
        for row in ws.iter_rows(min_row=1, max_row=25, values_only=True):
            sample_rows.append(row)

        header_row_idx = None
        format_type = "generic"

        for i, row in enumerate(sample_rows, 1):
            cells_str = [str(c).strip().lower() if c is not None else "" for c in row]

            # 1. Định dạng ATL
            if any("chứng từ" in c or "so chung tu" in c or "số po đối tác" in c for c in cells_str):
                header_row_idx = i
                format_type = "atl"
                break

            # 2. Định dạng Báo cáo đơn mua hàng chi tiết ERP
            if any("mã po" in c or "ma po" in c for c in cells_str) and any("mã mặt hàng" in c or "ma mat hang" in c or "mã ncc" in c or "mã hàng" in c for c in cells_str):
                header_row_idx = i
                format_type = "detailed_po"
                break

            # 3. Định dạng Danh sách đơn mua (Requisition list)
            if any("mã đơn mua" in c or "ma don mua" in c for c in cells_str):
                header_row_idx = i
                format_type = "requisition_list"
                break

        if not header_row_idx:
            header_row_idx = 1
            format_type = "generic"

        # Chuẩn bị header cells
        header_cells = [str(c).strip().lower().replace('\n', ' ') if c is not None else "" for c in sample_rows[header_row_idx - 1]]
        data_start_row = header_row_idx + 1

        # Xử lý sub-header (ví dụ dòng VND / Ngoại tệ bên dưới)
        if len(sample_rows) >= header_row_idx + 1:
            next_row = sample_rows[header_row_idx]
            next_row_text = " ".join([str(c).strip().lower() for c in next_row if c is not None])
            if any(kw in next_row_text for kw in ("thành tiền", "thuế", "sau thuế", "vnd", "ngoại tệ", "đvcđ")):
                data_start_row = header_row_idx + 2
                for col_idx, sub_val in enumerate(next_row):
                    if sub_val is not None and str(sub_val).strip():
                        if col_idx < len(header_cells):
                            header_cells[col_idx] = f"{header_cells[col_idx]} {str(sub_val).strip().lower().replace(chr(10), ' ')}"
                        else:
                            header_cells.append(str(sub_val).strip().lower().replace('\n', ' '))

        def find_col(keywords, default=None):
            for idx, cell in enumerate(header_cells):
                for kw in keywords:
                    if kw in cell:
                        return idx
            return default

        col_po_date = find_col(["ngày po", "ngay po", "ngày đặt", "ngày chứng từ", "order date", "po date"])
        col_po_code = find_col(["mã po", "ma po", "sô chứng từ", "số chứng từ", "so chung tu", "số po đối tác", "mã đơn mua", "mã đơn", "po no"])
        col_supp_code = find_col(["mã ncc", "ma ncc", "mã đối tác", "mã khách hàng", "mã khách", "ma khach", "mã kh", "supplier code", "cust code"])
        col_supp_name = find_col(["tên ncc", "ten ncc", "tên đối tác", "tên khách hàng", "tên khách", "ten khach", "supplier name", "customer"])
        col_item_code = find_col(["mã vthhtp", "ma vthhtp", "mã mặt hàng", "ma mat hang", "mã hàng", "mã sp", "item code", "part no", "product code"])
        col_item_name = find_col(["tên vthhtp", "ten vthhtp", "tên mh tiếng anh", "tên mặt hàng", "ten mat hang", "tên hàng", "tên sp", "item name", "description"])
        col_order_code = find_col(["mã đơn hàng", "ma don hang", "order no"])
        col_unit = find_col(["đvt", "dvt", "đơn vị", "unit"])
        col_conv_unit = find_col(["đvcđ", "dvcd", "đơn vị chuyển đổi"])
        col_qty = find_col(["số lượng", "so luong", "qty", "quantity"])
        col_conv_qty = find_col(["sl đvcđ", "sl dvcd"])
        col_price = find_col(["giá($)", "đơn giá", "don gia", "unit price", "price"])
        col_conv_price = find_col(["đg đvcđ", "dg dvcd"])
        col_currency = find_col(["loại tiền", "loai tien", "currency"])

        col_subtotal_vnd = find_col(["thành tiền vnđ", "thành tiền vnd", "thanh tien vnd"])
        if col_subtotal_vnd is None:
            col_subtotal_vnd = find_col(["thành tiền", "thanh tien", "subtotal", "amount"])

        col_tax_vnd = find_col(["thuế vnd", "thue vnd", "thuế", "thue"])
        col_total_tax_vnd = find_col(["sau thuế", "sau thue", "total after tax"])
        col_grand_total_vnd = find_col(["tổng tiền vnđ", "tổng tiền vnd", "tổng tiền", "tong tien", "grand total", "total"])

        col_subtotal_usd = find_col(["tt ngoại tệ", "tt ngoai te", "tổng tiền($)", "thành tiền ngoại tệ", "ngoại tệ thành tiền"])
        col_delivery_date = find_col(["ngày giao", "ngay giao", "yêu cầu giao", "delivery date", "req date"])
        col_status = find_col(["trạng thái", "trang thai", "status"])
        col_creator = find_col(["người tạo", "nguoi tao", "creator", "created by"])
        col_manager = find_col(["người quản lý", "nguoi quan ly", "manager"])
        
        # Bắt chính xác cột loại đơn hàng, không để nhầm sang cột Loại tiền
        def find_type_col():
            for idx, cell in enumerate(header_cells):
                if any(kw in cell for kw in ("loại tiền", "loai tien", "currency", "tiền")):
                    continue
                for kw in ("loại đơn", "loai don", "phân loại", "phan loai", "order type", "loại", "loai"):
                    if kw in cell:
                        return idx
            return None

        col_type = find_type_col()
        col_content = find_col(["nội dung", "noi dung", "content"])
        col_pallet = find_col(["pallet", "là nvl đóng gói"])

        # Hàm giải quyết loại đơn hàng (Đơn mua hàng / Đơn bán hàng)
        def resolve_order_type(row_val=None, supp_code=None):
            if default_order_type:
                dt = str(default_order_type).strip().lower()
                if any(k in dt for k in ("bán", "ban", "sale")):
                    return "Đơn bán hàng"
                return "Đơn mua hàng"

            if row_val:
                rv = str(row_val).strip().lower()
                if any(k in rv for k in ("bán", "ban", "sale")):
                    return "Đơn bán hàng"
                if any(k in rv for k in ("mua", "purchase")):
                    return "Đơn mua hàng"

            if format_type == "atl" or (supp_code and "KH036" in supp_code):
                return "Đơn bán hàng"

            return "Đơn mua hàng"

        # Cache existing purchase requisitions
        existing_prs = {pr.po_code: pr for pr in db.query(PurchaseRequisition).all()}

        curr_po_date = None
        curr_po_code = None
        curr_supp_code = None
        curr_supp_name = None
        curr_delivery_date = None
        curr_status = "Chưa duyệt"
        curr_creator = "Admin"
        curr_currency = "VND" if format_type != "atl" else "USD"

        items_to_create = []
        prs_to_update = set()
        created_po_count = 0
        updated_po_count = 0
        total_items_count = 0

        # Đọc tất cả dòng dữ liệu
        all_rows = list(ws.iter_rows(min_row=data_start_row, values_only=True))
        data_rows = [r for r in all_rows if any(c is not None and str(c).strip() != "" for c in r)]
        total_rows = len(data_rows)

        yield json.dumps({"status": "processing", "processed": 0, "total": total_rows}) + "\n"

        for idx, row in enumerate(data_rows, 1):
            po_code_val = safe_str(get_cell(row, col_po_code), max_len=100) if col_po_code is not None else None
            if po_code_val:
                curr_po_code = po_code_val
                if col_po_date is not None: curr_po_date = safe_datetime(get_cell(row, col_po_date))
                if col_supp_code is not None: curr_supp_code = safe_str(get_cell(row, col_supp_code), max_len=50)
                if col_supp_name is not None: curr_supp_name = safe_str(get_cell(row, col_supp_name), max_len=255)
                if col_delivery_date is not None: curr_delivery_date = safe_datetime(get_cell(row, col_delivery_date))
                if col_status is not None: curr_status = safe_str(get_cell(row, col_status), max_len=50) or "Chưa duyệt"
                if col_creator is not None: curr_creator = safe_str(get_cell(row, col_creator), max_len=100) or "Admin"
                if col_currency is not None: curr_currency = safe_str(get_cell(row, col_currency), max_len=10) or ("USD" if format_type == "atl" else "VND")

            if not curr_po_code:
                continue

            if curr_supp_code == "KH036" and not curr_supp_name:
                curr_supp_name = "Atlas International (KH036)"

            raw_type_val = safe_str(get_cell(row, col_type), max_len=50) if col_type is not None else None
            resolved_type = resolve_order_type(raw_type_val, curr_supp_code)

            item_code = safe_str(get_cell(row, col_item_code), max_len=50) if col_item_code is not None else None
            item_name = safe_str(get_cell(row, col_item_name), max_len=255) if col_item_name is not None else None

            # 1. Đơn mua hàng cha (PurchaseRequisition)
            pr = existing_prs.get(curr_po_code)
            if not pr:
                pr = PurchaseRequisition(
                    po_code=curr_po_code,
                    creator=curr_creator or "Admin",
                    order_date=curr_po_date,
                    delivery_date=curr_delivery_date,
                    supplier_code=curr_supp_code,
                    supplier_name=curr_supp_name,
                    order_type=resolved_type,
                    status=curr_status or "Chưa duyệt",
                    warehouse_status="Chưa xuất kho",
                    created_at=get_vietnam_time()
                )
                db.add(pr)
                db.flush()
                existing_prs[curr_po_code] = pr
                created_po_count += 1
            else:
                pr.order_type = resolved_type
                if curr_po_date and not pr.order_date: pr.order_date = curr_po_date
                if curr_delivery_date and not pr.delivery_date: pr.delivery_date = curr_delivery_date
                if curr_supp_code and not pr.supplier_code: pr.supplier_code = curr_supp_code
                if curr_supp_name and not pr.supplier_name: pr.supplier_name = curr_supp_name
                updated_po_count += 1

            prs_to_update.add(pr.id)

            # 2. Chi tiết mặt hàng (PurchaseOrderItem) nếu có
            if item_code or item_name:
                qty = safe_float(get_cell(row, col_qty)) if col_qty is not None else 0.0
                price = safe_float(get_cell(row, col_price)) if col_price is not None else 0.0
                subtotal_vnd = safe_float(get_cell(row, col_subtotal_vnd)) if col_subtotal_vnd is not None else 0.0
                subtotal_usd = safe_float(get_cell(row, col_subtotal_usd)) if col_subtotal_usd is not None else 0.0

                is_pallet_val = get_cell(row, col_pallet) if col_pallet is not None else None
                is_pallet = bool(is_pallet_val and str(is_pallet_val).strip().lower() == "true")
                unit_val = safe_str(get_cell(row, col_unit), max_len=50) if col_unit is not None else ("Pallet" if is_pallet else "Bộ")

                conv_unit_val = safe_str(get_cell(row, col_conv_unit), max_len=50) if col_conv_unit is not None else None
                conv_qty_val = safe_float(get_cell(row, col_conv_qty)) if col_conv_qty is not None else 0.0

                # Tự động quy đổi m3 sang Số lượng Cái/Tấm dựa trên quy cách kích thước nếu chưa có
                if (not conv_qty_val or conv_qty_val <= 0) and unit_val and any(u in unit_val.lower() for u in ("m3", "m³", "mét khối", "met khoi")):
                    calc_res = calculate_pieces_from_m3(item_name or item_code, qty)
                    if calc_res:
                        conv_qty_val = float(calc_res["pieces"])
                        if not conv_unit_val:
                            conv_unit_val = "Cái"

                poi = PurchaseOrderItem(
                    requisition_id=pr.id,
                    po_date=curr_po_date,
                    po_code=curr_po_code,
                    supplier_code=curr_supp_code,
                    supplier_name=curr_supp_name,
                    item_code=item_code or item_name,
                    item_name=item_name or item_code,
                    order_code=safe_str(get_cell(row, col_order_code), max_len=100) or curr_po_code,
                    unit=unit_val,
                    converted_unit=conv_unit_val,
                    quantity=qty,
                    converted_quantity=conv_qty_val,
                    unit_price=price,
                    converted_unit_price=safe_float(get_cell(row, col_conv_price)) if col_conv_price is not None else 0.0,
                    currency=curr_currency or "VND",
                    subtotal_vnd=subtotal_vnd,
                    tax_vnd=safe_float(get_cell(row, col_tax_vnd)) if col_tax_vnd is not None else 0.0,
                    total_after_tax_vnd=safe_float(get_cell(row, col_total_tax_vnd)) if col_total_tax_vnd is not None else subtotal_vnd,
                    grand_total_vnd=safe_float(get_cell(row, col_grand_total_vnd)) if col_grand_total_vnd is not None else subtotal_vnd,
                    subtotal_foreign=subtotal_usd,
                    grand_total_foreign=subtotal_usd,
                    requested_delivery_date=safe_datetime(get_cell(row, col_delivery_date)) or curr_delivery_date,
                    content=safe_str(get_cell(row, col_content)) or ("NVL đóng gói (PALLET)" if is_pallet else None),
                    status=curr_status or "Chưa duyệt",
                    manager=safe_str(get_cell(row, col_manager), max_len=100) if col_manager is not None else None,
                    creator=curr_creator or "Admin",
                    type=resolved_type,
                    created_at=get_vietnam_time()
                )
                items_to_create.append(poi)
                total_items_count += 1

                if len(items_to_create) >= 500:
                    db.bulk_save_objects(items_to_create)
                    db.flush()
                    items_to_create = []

            if idx % 100 == 0 or idx == total_rows:
                yield json.dumps({"status": "processing", "processed": idx, "total": total_rows}) + "\n"

        if items_to_create:
            db.bulk_save_objects(items_to_create)
            db.flush()

        # Đồng bộ tổng giá trị đơn hàng cho các PurchaseRequisition
        for pr_id in prs_to_update:
            sum_val = db.query(func.sum(
                case(
                    (PurchaseOrderItem.subtotal_foreign > 0, PurchaseOrderItem.subtotal_foreign),
                    else_=PurchaseOrderItem.subtotal_vnd
                )
            )).filter(PurchaseOrderItem.requisition_id == pr_id).scalar()
            if sum_val and sum_val > 0:
                db.query(PurchaseRequisition).filter(PurchaseRequisition.id == pr_id).update(
                    {PurchaseRequisition.total_amount: float(sum_val)}, synchronize_session=False
                )

        db.commit()
        wb.close()

        yield json.dumps({
            "status": "completed",
            "processed": total_rows,
            "total": total_rows,
            "message": f"Nạp dữ liệu thành công! Đã xử lý {len(prs_to_update)} đơn hàng và nạp {total_items_count} mặt hàng vào hệ thống."
        }) + "\n"

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        yield json.dumps({"status": "error", "message": f"Lỗi xử lý file Excel: {str(e)}"}) + "\n"
