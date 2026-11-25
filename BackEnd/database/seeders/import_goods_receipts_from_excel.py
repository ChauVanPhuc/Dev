# -*- coding: utf-8 -*-
"""
Script Import 4.401 Phiếu Nhập Kho lịch sử từ C:\Product\SmartFlow\SmartFlow\VTTH\VTHH _ No NL.xlsx vào SQL Server.
Tự động đăng ký danh mục vật tư warehouse_materials và tạo chi tiết phiếu nhập goods_receipt_items.
"""
import sys
import os
from datetime import datetime, date
from collections import OrderedDict

# Thiết lập đường dẫn import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Import api_router để SQLAlchemy đăng ký đầy đủ tất cả models & relationships
from app.routes import api_router
import openpyxl
from config.database import SessionLocal, engine
from sqlalchemy import text
from modules.warehouse.models import (
    WarehouseMaterial,
    GoodsReceipt,
    GoodsReceiptItem,
)
from modules.warehouse.services.warehouse_inventory_service import (
    normalize_wh_name,
    normalize_wh_code,
)

EXCEL_PATH = r"C:\Product\SmartFlow\SmartFlow\VTTH\VTHH _ No NL.xlsx"


def parse_date(val):
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        val = val.strip()
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d', '%d-%m-%Y'):
            try:
                return datetime.strptime(val, fmt).date()
            except ValueError:
                pass
    return date.today()


def parse_datetime(val):
    if isinstance(val, datetime):
        return val
    if isinstance(val, date):
        return datetime.combine(val, datetime.min.time())
    if isinstance(val, str):
        val = val.strip()
        for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%d/%m/%Y %H:%M:%S', '%d/%m/%Y %H:%M', '%Y-%m-%d'):
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                pass
    return None


def run_import():
    print("=" * 60)
    print(f"BẮT ĐẦU IMPORT PHIẾU NHẬP TỪ EXCEL:\n{EXCEL_PATH}")
    print("=" * 60)
    start_time = datetime.now()

    if not os.path.exists(EXCEL_PATH):
        print(f"LỖI: Không tìm thấy file {EXCEL_PATH}")
        return

    # Dùng read_only=True để đọc cực nhanh file lớn mà không tốn nhiều RAM
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
    ws = wb['Data'] if 'Data' in wb.sheetnames else wb.active

    # Gom nhóm dữ liệu theo Số chứng từ
    vouchers = OrderedDict()
    row_count = 0

    print("Đang đọc và bóc tách các dòng trong Excel...")
    for row in ws.iter_rows(min_row=11, values_only=True):
        row_count += 1
        if len(row) < 2:
            continue

        v_date = row[0]
        v_no = row[1]
        if not v_no or not str(v_no).strip():
            continue
        v_no = str(v_no).strip()

        c_code = row[2] if len(row) > 2 else None
        c_name = row[3] if len(row) > 3 else None
        dept = row[4] if len(row) > 4 else None
        content = row[5] if len(row) > 5 else None

        item_code = row[6] if len(row) > 6 else None
        item_code = str(item_code).strip() if item_code and str(item_code).strip() else None

        item_name = row[7] if len(row) > 7 else None
        unit1 = row[8] if len(row) > 8 else None
        qty1 = row[9] if len(row) > 9 else None
        unit2 = row[10] if len(row) > 10 else None
        qty2 = row[11] if len(row) > 11 else None
        amt = row[12] if len(row) > 12 else None
        wh = row[13] if len(row) > 13 else None
        po = row[14] if len(row) > 14 else None
        lsx = row[15] if len(row) > 15 else None
        order_code = row[16] if len(row) > 16 else None
        partner_po = row[17] if len(row) > 17 else None
        pkg = row[18] if len(row) > 18 else None
        notes = row[19] if len(row) > 19 else None
        created_by = row[20] if len(row) > 20 else None
        updated_by = row[21] if len(row) > 21 else None
        confirmed_by = row[22] if len(row) > 22 else None
        created_at = row[23] if len(row) > 23 else None
        updated_at = row[24] if len(row) > 24 else None
        confirmed_at = row[25] if len(row) > 25 else None
        raw_status = row[26] if len(row) > 26 else None
        ctgs = row[27] if len(row) > 27 else None

        if v_no not in vouchers:
            parsed_v_date = parse_date(v_date)
            status_val = 'COMPLETED' if (str(raw_status or '').strip() in ('Đã duyệt', 'COMPLETED')) else 'PENDING'
            parsed_created_at = parse_datetime(created_at) or datetime.combine(parsed_v_date, datetime.min.time())
            parsed_updated_at = parse_datetime(updated_at) or parsed_created_at
            parsed_confirmed_at = parse_datetime(confirmed_at) or (parsed_created_at if status_val == 'COMPLETED' else None)

            vouchers[v_no] = {
                'voucher_no': v_no,
                'receipt_date': parsed_v_date,
                'customer_code': str(c_code or '').strip()[:50] or None,
                'customer_name': str(c_name or '').strip()[:200] or None,
                'department_name': str(dept or '').strip()[:150] or None,
                'content': str(content or '').strip()[:500] or 'Nhập vật tư theo chứng từ',
                'warehouse_name': str(wh or 'Kho vật tư').strip()[:150],
                'created_by': str(created_by or 'mai.le').strip()[:100],
                'updated_by': str(updated_by or '').strip()[:100] or None,
                'confirmed_by': str(confirmed_by or 'mai.le').strip()[:100] if status_val == 'COMPLETED' else None,
                'created_at': parsed_created_at,
                'updated_at': parsed_updated_at,
                'confirmed_at': parsed_confirmed_at,
                'status': status_val,
                'ctgs': str(ctgs or '').strip()[:100] or None,
                'items': [],
            }

        # Nếu dòng có chứa mặt hàng -> thêm vào items
        if item_code:
            try:
                q1 = float(qty1 or 0)
            except (ValueError, TypeError):
                q1 = 0.0

            try:
                q2 = float(qty2 or 0) if qty2 is not None else 0.0
            except (ValueError, TypeError):
                q2 = 0.0

            try:
                a_val = float(amt or 0)
            except (ValueError, TypeError):
                a_val = 0.0

            u_price = round(a_val / q1, 2) if q1 > 0 and a_val > 0 else 0.0
            conv_rate = round(q2 / q1, 4) if q1 > 0 and q2 > 0 else 1.0

            vouchers[v_no]['items'].append({
                'item_code': item_code[:100],
                'item_name': (str(item_name or item_code).strip())[:250],
                'unit1': (str(unit1 or 'Cái').strip())[:50],
                'quantity1': q1,
                'unit2': (str(unit2 or '').strip())[:50] if unit2 else None,
                'quantity2': q2,
                'conversion_rate': conv_rate,
                'amount': a_val,
                'unit_price': u_price,
                'po_code': (str(po or '').strip())[:100] or None,
                'lsx': (str(lsx or '').strip())[:100] or None,
                'order_code': (str(order_code or '').strip())[:100] or None,
                'partner_po': (str(partner_po or '').strip())[:100] or None,
                'package_split': (str(pkg or '').strip())[:150] or None,
                'notes': (str(notes or '').strip())[:500] or None,
            })

    wb.close()
    print(f"-> Đã duyệt qua {row_count} dòng.")
    print(f"-> Bóc tách thành công: {len(vouchers)} chứng từ duy nhất.")
    total_detail_items = sum(len(v['items']) for v in vouchers.values())
    print(f"-> Tổng số dòng mặt hàng chi tiết: {total_detail_items}")

    # Ghi nhận vào CSDL qua SessionLocal
    db = SessionLocal()
    try:
        # Lấy danh sách phiếu đã tồn tại trong DB để tránh trùng
        existing_vouchers = set(
            v[0] for v in db.query(GoodsReceipt.voucher_no).all()
        )
        print(f"Số phiếu đã có sẵn trong DB: {len(existing_vouchers)}")

        # Lấy danh mục vật tư hiện tại trong DB
        existing_materials = set(
            f"{m.warehouse_code}_{m.item_code.lower()}"
            for m in db.query(WarehouseMaterial.warehouse_code, WarehouseMaterial.item_code).all()
        )
        print(f"Số vật tư đã có sẵn trong catalog: {len(existing_materials)}")

        inserted_vouchers = 0
        skipped_vouchers = 0
        inserted_items = 0
        total_imported_amount = 0.0
        total_imported_quantity = 0.0
        new_materials_count = 0

        batch_count = 0
        batch_size = 200

        print(f"\nĐang lưu dữ liệu vào CSDL (Batch size: {batch_size} chứng từ)...")

        for v_no, v in vouchers.items():
            if v_no in existing_vouchers:
                skipped_vouchers += 1
                continue

            wh_name = normalize_wh_name(v['warehouse_name'])
            wh_code = normalize_wh_code(wh_name)

            v_tot_qty = sum(it['quantity1'] for it in v['items'])
            v_tot_amt = sum(it['amount'] for it in v['items'])

            rcp = GoodsReceipt(
                voucher_no=v['voucher_no'],
                warehouse_code=wh_code,
                warehouse_name=wh_name,
                receipt_date=v['receipt_date'],
                customer_code=v['customer_code'],
                customer_name=v['customer_name'],
                department_name=v['department_name'],
                content=v['content'],
                receipt_type='Nhập mua hàng',
                status=v['status'],
                ctgs=v['ctgs'],
                total_lines=len(v['items']),
                total_quantity=v_tot_qty,
                total_amount=v_tot_amt,
                created_by=v['created_by'],
                updated_by=v['updated_by'],
                confirmed_by=v['confirmed_by'],
                created_channel='Excel',
                created_at=v['created_at'],
                updated_at=v['updated_at'],
                confirmed_at=v['confirmed_at'],
            )

            for idx, it in enumerate(v['items'], 1):
                mat_key = f"{wh_code}_{it['item_code'].lower()}"
                if mat_key not in existing_materials:
                    new_mat = WarehouseMaterial(
                        warehouse_code=wh_code,
                        warehouse_name=wh_name,
                        item_code=it['item_code'],
                        item_name=it['item_name'],
                        category="VẬT TƯ TIÊU HAO",
                        unit_main=it['unit1'] or "Cái",
                        unit_conversion=it['unit2'] or "",
                        conversion_rate=it['conversion_rate'],
                        opening_main=0.0,
                        initial_receipt_date=v['receipt_date'],
                        is_active=True,
                    )
                    db.add(new_mat)
                    existing_materials.add(mat_key)
                    new_materials_count += 1

                gri = GoodsReceiptItem(
                    line_no=idx,
                    item_code=it['item_code'],
                    item_name=it['item_name'],
                    unit1=it['unit1'],
                    quantity1=it['quantity1'],
                    unit2=it['unit2'],
                    quantity2=it['quantity2'],
                    conversion_rate=it['conversion_rate'],
                    unit_price=it['unit_price'],
                    amount=it['amount'],
                    po_code=it['po_code'],
                    order_code=it['order_code'],
                    partner_po=it['partner_po'],
                    package_split=it['package_split'],
                    lsx=it['lsx'],
                    notes=it['notes'],
                )
                rcp.items.append(gri)
                inserted_items += 1

            db.add(rcp)
            existing_vouchers.add(v_no)
            inserted_vouchers += 1
            total_imported_amount += v_tot_amt
            total_imported_quantity += v_tot_qty
            batch_count += 1

            if batch_count >= batch_size:
                db.commit()
                batch_count = 0
                print(f"  -> Tiến độ: Đã lưu {inserted_vouchers}/{len(vouchers)} phiếu ({inserted_items} dòng hàng)...")

        if batch_count > 0:
            db.commit()

        elapsed = (datetime.now() - start_time).total_seconds()
        print("\n" + "=" * 60)
        print("HOÀN TẤT IMPORT PHIẾU NHẬP KHO THÀNH CÔNG!")
        print("=" * 60)
        print(f"Tổng số phiếu nhập mới tạo: {inserted_vouchers:,}")
        print(f"Số phiếu đã có trước đó (bỏ qua): {skipped_vouchers:,}")
        print(f"Tổng số dòng chi tiết hàng: {inserted_items:,}")
        print(f"Số vật tư mới tạo trong catalog: {new_materials_count:,}")
        print(f"Tổng số lượng vật tư nhập kho: {total_imported_quantity:,.2f}")
        print(f"Tổng giá trị tiền nhập kho: {total_imported_amount:,.2f} VNĐ")
        print(f"Thời gian thực thi: {elapsed:.2f} giây")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"LỖI trong quá trình import: {e}")
        raise e
    finally:
        db.close()


if __name__ == '__main__':
    run_import()
