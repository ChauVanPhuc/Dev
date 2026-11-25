# -*- coding: utf-8 -*-
"""
Script tạo bảng 'warehouse_purchase_order_items' và import dữ liệu từ file:
BC#tong#hop#tinh#hinh#thuc#hien#Don#mua#hang#01_01_2026#31_12_2026.xlsx
"""
import argparse
import os
import re
import sys
from datetime import date, datetime
from typing import Optional

import openpyxl
from sqlalchemy import text

backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config.database import engine, Base
from modules.warehouse.models.purchase_po_execution import WarehousePurchaseOrderItem

DEFAULT_EXCEL_PATH = r"C:\Product\SmartFlow\SmartFlow\VTTH\BC#tong#hop#tinh#hinh#thuc#hien#Don#mua#hang#01_01_2026#31_12_2026.xlsx"
ROMAN_RE = re.compile(r"^[IVXLCDM]+$", re.IGNORECASE)


def _to_str(val, max_len: Optional[int] = None) -> str:
    if val is None:
        return ""
    s = str(val).strip()
    if max_len and len(s) > max_len:
        return s[:max_len]
    return s


def _to_float(val) -> float:
    if val is None or val == "":
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    try:
        return float(str(val).replace(",", "").strip())
    except Exception:
        return 0.0


def _to_int(val, default: int = 1) -> int:
    if val is None or val == "":
        return default
    try:
        return int(float(str(val).strip()))
    except Exception:
        return default


def _to_date(val) -> Optional[date]:
    if val is None or val == "":
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    s = str(val).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s[:10], fmt).date()
        except Exception:
            continue
    return None


def import_purchase_po_executions(excel_path: str = DEFAULT_EXCEL_PATH):
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Không tìm thấy file Excel: {excel_path}")

    print("=" * 70)
    print(f"IMPORT ĐƠN MUA HÀNG TỪ EXCEL: {excel_path}")
    print("=" * 70)

    # 1. Tạo bảng nếu chưa tồn tại
    Base.metadata.create_all(bind=engine, tables=[WarehousePurchaseOrderItem.__table__])
    print("[1/4] Đã kiểm tra/tạo bảng 'warehouse_purchase_order_items'.")

    # 2. Đọc dữ liệu từ sheet Data
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    ws = wb["Data"] if "Data" in wb.sheetnames else wb.active

    current_group = ""
    records = []
    now_dt = datetime.now()

    for row in ws.iter_rows(min_row=11, values_only=True):
        if not row or len(row) < 12:
            continue

        stt_raw = _to_str(row[0])
        po_code = _to_str(row[2], 100)

        # Dòng tiêu đề nhóm (STT là chữ số La Mã và không có Mã PO)
        if not po_code:
            if stt_raw and ROMAN_RE.match(stt_raw):
                grp_name = _to_str(row[1], 200) or _to_str(row[6], 200)
                if grp_name and grp_name != "0":
                    current_group = grp_name
                else:
                    current_group = ""
            continue

        item_name = _to_str(row[7], 300)
        item_code = _to_str(row[6], 100)
        if not item_name and not item_code:
            continue

        records.append({
            "category_group": current_group or None,
            "line_no": _to_int(stt_raw, 1),
            "po_code": po_code,
            "order_date": _to_date(row[1]),
            "delivery_date": _to_date(row[5]),
            "supplier_code": _to_str(row[3], 50) or None,
            "supplier_name": _to_str(row[4], 255) or None,
            "item_code": item_code or None,
            "item_name": item_name or item_code,
            "accounting_code": _to_str(row[8], 30) or None,
            "unit1": _to_str(row[9], 50) or None,
            "unit2": _to_str(row[10], 50) or None,
            "order_qty_main": _to_float(row[11]),
            "unit_price": _to_float(row[12]),
            "order_qty_conv": _to_float(row[13]),
            "order_amount": _to_float(row[14]),
            "received_period_main": _to_float(row[15]) if len(row) > 15 else 0.0,
            "received_period_conv": _to_float(row[16]) if len(row) > 16 else 0.0,
            "received_period_amount": _to_float(row[17]) if len(row) > 17 else 0.0,
            "received_cum_main": _to_float(row[18]) if len(row) > 18 else 0.0,
            "received_cum_conv": _to_float(row[19]) if len(row) > 19 else 0.0,
            "received_cum_amount": _to_float(row[20]) if len(row) > 20 else 0.0,
            "remaining_qty": _to_float(row[21]) if len(row) > 21 else 0.0,
            "warehouse_name": _to_str(row[22], 200) or None if len(row) > 22 else None,
            "sales_order_code": _to_str(row[23], 100) or None if len(row) > 23 else None,
            "lsx_code": _to_str(row[24], 100) or None if len(row) > 24 else None,
            "request_code": _to_str(row[25], 100) or None if len(row) > 25 else None,
            "approval_status": _to_str(row[26], 50) or None if len(row) > 26 else None,
            "execution_status": _to_str(row[27], 50) or None if len(row) > 27 else None,
            "notes": _to_str(row[28], 500) or None if len(row) > 28 else None,
            "order_type": _to_str(row[29], 50) or None if len(row) > 29 else None,
            "created_at": now_dt,
            "updated_at": now_dt,
        })

    wb.close()
    print(f"[2/4] Đã bóc tách {len(records)} dòng mặt hàng hợp lệ từ Excel.")

    # 3. Xóa dữ liệu cũ & Bulk Insert trong 1 Transaction
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            conn.execute(text("DELETE FROM warehouse_purchase_order_items"))
            try:
                conn.execute(text("DBCC CHECKIDENT ('warehouse_purchase_order_items', RESEED, 0)"))
            except Exception:
                pass

            batch_size = 1000
            tbl = WarehousePurchaseOrderItem.__table__
            for i in range(0, len(records), batch_size):
                conn.execute(tbl.insert(), records[i:i + batch_size])

            trans.commit()
            print(f"[3/4] Đã ghi thành công {len(records)} dòng vào SQL Server.")
        except Exception as exc:
            trans.rollback()
            print(f"[ERROR] Rollback transaction do lỗi: {exc}")
            raise

    # 4. Kiểm tra thống kê sau import
    with engine.connect() as conn:
        total_rows = conn.execute(text("SELECT COUNT(*) FROM warehouse_purchase_order_items")).scalar()
        distinct_pos = conn.execute(text("SELECT COUNT(DISTINCT po_code) FROM warehouse_purchase_order_items")).scalar()
        print(f"[4/4] Xác nhận DB: {total_rows} dòng | {distinct_pos} Mã PO duy nhất.")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import báo cáo Đơn mua hàng vào CSDL")
    parser.add_argument("--file", default=DEFAULT_EXCEL_PATH, help="Đường dẫn file Excel nguồn")
    args = parser.parse_args()
    import_purchase_po_executions(args.file)

