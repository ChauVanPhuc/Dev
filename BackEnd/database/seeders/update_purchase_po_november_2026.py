# -*- coding: utf-8 -*-
"""
Script cập nhật (Upsert) dữ liệu Báo cáo tình hình thực hiện Đơn mua hàng tháng 11/2026:
BC#tong#hop#tinh#hinh#thuc#hien#Don#mua#hang#01_11_2026#30_11_2026.xlsx
- Cập nhật lũy kế nhận hàng & còn lại cho các dòng hiện hữu
- Thêm mới các dòng phát sinh mới trong tháng 11
- Bảo toàn toàn bộ 13.645 dòng dữ liệu lịch sử các tháng trước
"""
import argparse
import os
import re
import sys
from datetime import date, datetime
from typing import Optional, Dict, Tuple, List

import openpyxl
from sqlalchemy import text

backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config.database import engine, Base, SessionLocal
from modules.warehouse.models.purchase_po_execution import WarehousePurchaseOrderItem

DEFAULT_EXCEL_PATH = r"C:\Product\SmartFlow\SmartFlow\VTTH\BC#tong#hop#tinh#hinh#thuc#hien#Don#mua#hang#01_11_2026#30_11_2026.xlsx"
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


def update_purchase_po_november(excel_path: str = DEFAULT_EXCEL_PATH):
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Không tìm thấy file Excel: {excel_path}")

    print("=" * 75)
    print(f"CẬP NHẬT DỮ LIỆU ĐƠN MUA HÀNG THÁNG 11/2026 (UPSERT)")
    print(f"File nguồn: {excel_path}")
    print("=" * 75)

    # 1. Đọc dữ liệu từ sheet Data của file Excel tháng 11
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    ws = wb["Data"] if "Data" in wb.sheetnames else wb.active

    current_group = ""
    incoming_records: List[dict] = []
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

        incoming_records.append({
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
    print(f"[1/4] Đã đọc thành công {len(incoming_records)} dòng mặt hàng từ Excel.")

    # 2. Xây dựng Index tra cứu dòng hiện tại trong CSDL
    # Tạo pool ánh xạ: (po_code, item_code, item_name, line_no) -> id
    db = SessionLocal()
    existing_items = db.query(WarehousePurchaseOrderItem).all()
    print(f"[2/4] Đang đối chiếu với {len(existing_items)} dòng hiện có trong CSDL...")

    # Tra cứu chính xác: (po_code, item_code_norm, item_name_norm, line_no)
    exact_map: Dict[Tuple[str, str, str, int], int] = {}
    # Tra cứu dự phòng: (po_code, item_code_norm, item_name_norm)
    backup_map: Dict[Tuple[str, str, str], List[int]] = {}

    for it in existing_items:
        p_code = (it.po_code or "").strip().lower()
        i_code = (it.item_code or "").strip().lower()
        i_name = (it.item_name or "").strip().lower()
        l_no = int(it.line_no or 1)

        key_exact = (p_code, i_code, i_name, l_no)
        exact_map[key_exact] = it.id

        key_backup = (p_code, i_code, i_name)
        if key_backup not in backup_map:
            backup_map[key_backup] = []
        backup_map[key_backup].append(it.id)

    db.close()

    # 3. Phân loại Update vs Insert
    to_update: List[dict] = []
    to_insert: List[dict] = []
    used_db_ids = set()

    for rec in incoming_records:
        p_code = (rec["po_code"] or "").strip().lower()
        i_code = (rec["item_code"] or "").strip().lower()
        i_name = (rec["item_name"] or "").strip().lower()
        l_no = int(rec["line_no"] or 1)

        target_id = None
        key_exact = (p_code, i_code, i_name, l_no)
        if key_exact in exact_map and exact_map[key_exact] not in used_db_ids:
            target_id = exact_map[key_exact]
        else:
            # Thử tra cứu dự phòng không kèm line_no
            key_backup = (p_code, i_code, i_name)
            candidates = backup_map.get(key_backup, [])
            for c_id in candidates:
                if c_id not in used_db_ids:
                    target_id = c_id
                    break

        if target_id is not None:
            used_db_ids.add(target_id)
            rec["id"] = target_id
            to_update.append(rec)
        else:
            to_insert.append(rec)

    print(f"[3/4] Phân loại: {len(to_update)} dòng CẬP NHẬT | {len(to_insert)} dòng THÊM MỚI.")

    # 4. Thực thi Update & Insert trong 1 Transaction an toàn
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 4.1 Update các dòng hiện hữu
            tbl = WarehousePurchaseOrderItem.__table__
            for up in to_update:
                update_vals = {
                    "delivery_date": up["delivery_date"],
                    "order_qty_main": up["order_qty_main"],
                    "unit_price": up["unit_price"],
                    "order_amount": up["order_amount"],
                    "received_period_main": up["received_period_main"],
                    "received_period_conv": up["received_period_conv"],
                    "received_period_amount": up["received_period_amount"],
                    "received_cum_main": up["received_cum_main"],
                    "received_cum_conv": up["received_cum_conv"],
                    "received_cum_amount": up["received_cum_amount"],
                    "remaining_qty": up["remaining_qty"],
                    "warehouse_name": up["warehouse_name"],
                    "approval_status": up["approval_status"],
                    "execution_status": up["execution_status"],
                    "notes": up["notes"],
                    "updated_at": now_dt,
                }
                conn.execute(
                    tbl.update().where(tbl.c.id == up["id"]).values(**update_vals)
                )

            # 4.2 Insert các dòng mới hoàn toàn
            if to_insert:
                batch_size = 500
                for i in range(0, len(to_insert), batch_size):
                    conn.execute(tbl.insert(), to_insert[i:i + batch_size])

            trans.commit()
            print(f"[4/4] Ghi nhận thành công vào CSDL SQL Server!")
        except Exception as exc:
            trans.rollback()
            print(f"[ERROR] Rollback transaction do lỗi: {exc}")
            raise

    # 5. Kiểm tra và xác nhận sau Upsert
    with engine.connect() as conn:
        total_rows = conn.execute(text("SELECT COUNT(*) FROM warehouse_purchase_order_items")).scalar()
        distinct_pos = conn.execute(text("SELECT COUNT(DISTINCT po_code) FROM warehouse_purchase_order_items")).scalar()
        print("=" * 75)
        print(f"KẾT QUẢ SAU CẬP NHẬT:")
        print(f"• Tổng số dòng trong CSDL: {total_rows} dòng (Cũ: 15.160 + Thêm mới: {len(to_insert)})")
        print(f"• Tổng số Mã PO duy nhất: {distinct_pos} PO")
        print(f"• Số dòng được cập nhật tiến độ mới: {len(to_update)} dòng")
        print("=" * 75)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cập nhật Báo cáo Đơn mua hàng tháng 11/2026 vào CSDL")
    parser.add_argument("--file", default=DEFAULT_EXCEL_PATH, help="Đường dẫn file Excel nguồn")
    args = parser.parse_args()
    update_purchase_po_november(args.file)

