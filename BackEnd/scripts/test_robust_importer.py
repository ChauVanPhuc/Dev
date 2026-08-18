# -*- coding: utf-8 -*-
import sys
import os
import io
import time
from datetime import datetime
from collections import OrderedDict

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import openpyxl
from sqlalchemy import text, func, case
from config.database import SessionLocal, engine
from modules.purchasing.models.purchase_requisition import PurchaseRequisition
from modules.purchasing.models.purchase_order_item import PurchaseOrderItem
from shared.utils.timezone import get_vietnam_time

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
        return row_tuple[idx]
    return default

def run_import_test(file_path):
    print(f"\n=======================================================")
    print(f"[*] Testing import on: {os.path.basename(file_path)}")
    start_time = time.time()
    
    wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
    ws = wb.active
    
    # Read first 25 rows for header analysis
    sample_rows = []
    for row in ws.iter_rows(min_row=1, max_row=25, values_only=True):
        sample_rows.append(row)
        
    header_row_idx = None
    format_type = "generic"
    
    for i, row in enumerate(sample_rows, 1):
        cells_str = [str(c).strip().lower() if c is not None else "" for c in row]
        row_text = " ".join(cells_str)
        
        # 1. ATL format
        if any("chứng từ" in c or "so chung tu" in c or "số po đối tác" in c for c in cells_str):
            header_row_idx = i
            format_type = "atl"
            break
            
        # 2. ERP Detailed report or standard order items
        if any("mã po" in c or "ma po" in c for c in cells_str) and any("mã mặt hàng" in c or "ma mat hang" in c or "mã ncc" in c or "mã hàng" in c for c in cells_str):
            header_row_idx = i
            format_type = "detailed_po"
            break
            
        # 3. Requisition list export
        if any("mã đơn mua" in c or "ma don mua" in c for c in cells_str):
            header_row_idx = i
            format_type = "requisition_list"
            break

    if not header_row_idx:
        header_row_idx = 1
        format_type = "generic"

    # Combine with sub-header row if exists
    header_cells = [str(c).strip().lower().replace('\n', ' ') if c is not None else "" for c in sample_rows[header_row_idx - 1]]
    data_start_row = header_row_idx + 1
    
    if len(sample_rows) >= header_row_idx + 1:
        next_row = sample_rows[header_row_idx]
        next_row_text = " ".join([str(c).strip().lower() for c in next_row if c is not None])
        if any(kw in next_row_text for kw in ("thành tiền", "thuế", "sau thuế", "vnd", "ngoại tệ", "đvcđ")):
            data_start_row = header_row_idx + 2
            # Combine header cells
            for col_idx, sub_val in enumerate(next_row):
                if sub_val is not None and str(sub_val).strip():
                    if col_idx < len(header_cells):
                        header_cells[col_idx] = f"{header_cells[col_idx]} {str(sub_val).strip().lower().replace(chr(10), ' ')}"
                    else:
                        header_cells.append(str(sub_val).strip().lower().replace('\n', ' '))

    print(f"[*] Detected format: {format_type}, header row: {header_row_idx}, data start row: {data_start_row}")
    
    def find_col(keywords, default=None):
        for idx, cell in enumerate(header_cells):
            for kw in keywords:
                if kw in cell:
                    return idx
        return default

    col_po_date = find_col(["ngày po", "ngay po", "ngày đặt", "ngày chứng từ", "order date", "po date"])
    col_po_code = find_col(["mã po", "ma po", "sô chứng từ", "số chứng từ", "so chung tu", "số po đối tác", "mã đơn", "po no"])
    col_supp_code = find_col(["mã ncc", "ma ncc", "mã đối tác", "mã khách hàng", "mã kh", "supplier code", "cust code"])
    col_supp_name = find_col(["tên ncc", "ten ncc", "tên đối tác", "tên khách", "supplier name", "customer"])
    col_item_code = find_col(["mã mặt hàng", "ma mat hang", "mã hàng", "mã sp", "item code", "part no", "product code"])
    col_item_name = find_col(["tên mặt hàng", "ten mat hang", "tên hàng", "tên sp", "item name", "description"])
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
    
    col_subtotal_usd = find_col(["tổng tiền($)", "thành tiền ngoại tệ", "ngoại tệ thành tiền"])
    col_delivery_date = find_col(["ngày giao", "ngay giao", "yêu cầu giao", "delivery date", "req date"])
    col_status = find_col(["trạng thái", "trang thai", "status"])
    col_creator = find_col(["người tạo", "nguoi tao", "creator", "created by"])
    col_manager = find_col(["người quản lý", "nguoi quan ly", "manager"])
    col_type = find_col(["loại", "loai", "order type"])
    col_content = find_col(["nội dung", "noi dung", "content"])
    col_pallet = find_col(["pallet", "là nvl đóng gói"])
    col_container_type = find_col(["loại container", "loại cont"])
    col_container_qty = find_col(["số lượng cont", "số lượng container"])
    col_plan_month = find_col(["kế hoạch tháng", "tháng kh"])
    col_exchange_rate = find_col(["tỷ giá", "ty gia"])

    print(f"[*] Mappings:")
    print(f"    col_po_date: {col_po_date}, col_po_code: {col_po_code}")
    print(f"    col_supp_code: {col_supp_code}, col_supp_name: {col_supp_name}")
    print(f"    col_item_code: {col_item_code}, col_item_name: {col_item_name}")
    print(f"    col_qty: {col_qty}, col_price: {col_price}, col_subtotal_vnd: {col_subtotal_vnd}")
    
    db = SessionLocal()
    try:
        # Pre-cache existing requisitions
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
        
        row_count = 0
        valid_rows = 0
        
        for row in ws.iter_rows(min_row=data_start_row, values_only=True):
            row_count += 1
            if not any(c is not None and str(c).strip() != "" for c in row):
                continue
                
            # PO Code
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

            # Fallback supplier name if KH036
            if curr_supp_code == "KH036" and not curr_supp_name:
                curr_supp_name = "Atlas International (KH036)"
                
            item_code = safe_str(get_cell(row, col_item_code), max_len=50) if col_item_code is not None else None
            item_name = safe_str(get_cell(row, col_item_name), max_len=255) if col_item_name is not None else None
            
            if not item_code and not item_name:
                # If this row is a requisition-only row
                if format_type == "requisition_list":
                    # Update or create requisition directly
                    pr = existing_prs.get(curr_po_code)
                    if not pr:
                        pr = PurchaseRequisition(
                            po_code=curr_po_code,
                            creator=curr_creator,
                            order_date=curr_po_date,
                            delivery_date=curr_delivery_date,
                            supplier_code=curr_supp_code,
                            supplier_name=curr_supp_name,
                            total_amount=safe_float(get_cell(row, col_grand_total_vnd)),
                            order_type=safe_str(get_cell(row, col_type), max_len=50) or "Đơn mua hàng",
                            status=curr_status,
                            warehouse_status="Chưa xuất kho",
                            created_at=get_vietnam_time()
                        )
                        db.add(pr)
                        db.flush()
                        existing_prs[curr_po_code] = pr
                    valid_rows += 1
                continue

            # Ensure PurchaseRequisition exists
            pr = existing_prs.get(curr_po_code)
            if not pr:
                pr = PurchaseRequisition(
                    po_code=curr_po_code,
                    creator=curr_creator or "Admin",
                    order_date=curr_po_date,
                    delivery_date=curr_delivery_date,
                    supplier_code=curr_supp_code,
                    supplier_name=curr_supp_name,
                    order_type="Đơn bán hàng" if format_type == "atl" else (safe_str(get_cell(row, col_type), max_len=50) or "Đơn mua hàng"),
                    status=curr_status or "Chưa duyệt",
                    warehouse_status="Chưa xuất kho",
                    created_at=get_vietnam_time()
                )
                db.add(pr)
                db.flush()
                existing_prs[curr_po_code] = pr
            else:
                # Update header info if available
                if curr_po_date: pr.order_date = curr_po_date
                if curr_delivery_date: pr.delivery_date = curr_delivery_date
                if curr_supp_code: pr.supplier_code = curr_supp_code
                if curr_supp_name: pr.supplier_name = curr_supp_name

            prs_to_update.add(pr.id)

            qty = safe_float(get_cell(row, col_qty)) if col_qty is not None else 0.0
            price = safe_float(get_cell(row, col_price)) if col_price is not None else 0.0
            subtotal_vnd = safe_float(get_cell(row, col_subtotal_vnd)) if col_subtotal_vnd is not None else 0.0
            subtotal_usd = safe_float(get_cell(row, col_subtotal_usd)) if col_subtotal_usd is not None else 0.0
            
            is_pallet_val = get_cell(row, col_pallet) if col_pallet is not None else None
            is_pallet = bool(is_pallet_val and str(is_pallet_val).strip().lower() == "true")
            unit_val = safe_str(get_cell(row, col_unit), max_len=50) if col_unit is not None else ("Pallet" if is_pallet else "Bộ")

            # Create PurchaseOrderItem
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
                converted_unit=safe_str(get_cell(row, col_conv_unit), max_len=50) if col_conv_unit is not None else None,
                quantity=qty,
                converted_quantity=safe_float(get_cell(row, col_conv_qty)) if col_conv_qty is not None else 0.0,
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
                type="Đơn bán hàng" if format_type == "atl" else (safe_str(get_cell(row, col_type), max_len=50) or "Đơn mua hàng"),
                created_at=get_vietnam_time()
            )
            items_to_create.append(poi)
            valid_rows += 1

            if len(items_to_create) >= 500:
                db.bulk_save_objects(items_to_create)
                db.flush()
                items_to_create = []

        if items_to_create:
            db.bulk_save_objects(items_to_create)
            db.flush()

        # Recalculate totals for affected requisitions
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
        elapsed = time.time() - start_time
        print(f"[+] SUCCESS! Processed {row_count} total rows, inserted/updated {valid_rows} items in {elapsed:.2f}s!")
        print(f"[+] Unique POs: {len(prs_to_update)}")
        return True

    except Exception as e:
        db.rollback()
        print(f"[!] FAILED with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()
        wb.close()

if __name__ == "__main__":
    run_import_test(r'D:\File\Đơn hàng ATL triển khai SX(đổ Verp).xlsx')
    run_import_test(r'D:\File\Bao#cao#don#mua#hang#xac#nhan#-#Theo#mat#hang#01_01_2026#31_12_2026.xlsx')
