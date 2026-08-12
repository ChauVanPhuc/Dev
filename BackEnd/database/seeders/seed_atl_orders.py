# -*- coding: utf-8 -*-
"""
Seeder: Đổ toàn bộ dữ liệu Đơn hàng ATL triển khai SX từ file Excel vào purchase_requisitions
File nguồn: D:\File\Đơn hàng ATL triển khai SX(đổ Verp).xlsx
Loại đơn hàng: Đơn bán hàng
Đối tác: Atlas International (KH036)
"""

import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import openpyxl
from datetime import datetime
from collections import OrderedDict

# Thiết lập đường dẫn import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import app.models
from config.database import SessionLocal
from modules.purchasing.models.purchase_requisition import PurchaseRequisition
from modules.purchasing.models.purchase_order_item import PurchaseOrderItem
from modules.master.models.customer import Customer
from shared.utils.timezone import get_vietnam_time


def parse_datetime(val):
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


def parse_float(val, default=0.0):
    if val is None or val == "":
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def seed_atl_orders(excel_path=r"D:\File\Đơn hàng ATL triển khai SX(đổ Verp).xlsx"):
    print(f"[*] Bắt đầu đọc file Excel: {excel_path}")
    if not os.path.exists(excel_path):
        print(f"[!] Lỗi: Không tìm thấy file tại đường dẫn: {excel_path}")
        return False

    wb = openpyxl.load_workbook(excel_path, data_only=True)
    sheet = wb.active

    rows = list(sheet.iter_rows(values_only=True))
    if len(rows) < 2:
        print("[!] File Excel rỗng hoặc không có dữ liệu!")
        return False

    headers = [str(c).strip() if c else "" for c in rows[0]]
    print(f"[*] Headers ({len(headers)} cột): {headers}")

    data_rows = rows[1:]
    print(f"[*] Tổng số dòng dữ liệu: {len(data_rows)}")

    # Gom nhóm theo Số chứng từ (Cột 0 hoặc Cột 1)
    orders = OrderedDict()
    for idx, row in enumerate(data_rows, 1):
        if not row or not any(row):
            continue
        doc_no = str(row[0]).strip() if row[0] is not None else ""
        if not doc_no:
            po_partner = str(row[1]).strip() if row[1] is not None else ""
            doc_no = po_partner
        if not doc_no:
            continue

        if doc_no not in orders:
            orders[doc_no] = {
                "po_code": doc_no,
                "partner_po": str(row[1]).strip() if row[1] is not None else "",
                "cust_code": str(row[2]).strip() if row[2] is not None else "KH036",
                "plan_month": str(row[7]).strip() if row[7] is not None else "",
                "delivery_date": parse_datetime(row[8]),
                "currency": str(row[9]).strip() if row[9] is not None else "USD",
                "exchange_rate": parse_float(row[10], 26100.0),
                "order_date": parse_datetime(row[12]),
                "container_type": str(row[13]).strip() if row[13] is not None else "",
                "container_qty": parse_float(row[14], 1.0),
                "items": []
            }

        item_code = str(row[3]).strip() if row[3] is not None else ""
        qty = parse_float(row[4], 0.0)
        unit_price = parse_float(row[5], 0.0)
        subtotal_usd = parse_float(row[6], 0.0)
        subtotal_vnd = parse_float(row[11], 0.0)
        is_pallet = bool(row[15] and str(row[15]).strip().lower() == "true")

        item_entry = {
            "item_code": item_code,
            "quantity": qty,
            "unit_price": unit_price,
            "subtotal_usd": subtotal_usd,
            "subtotal_vnd": subtotal_vnd,
            "is_pallet": is_pallet,
            "delivery_date": parse_datetime(row[8]),
            "order_date": parse_datetime(row[12]),
        }
        orders[doc_no]["items"].append(item_entry)

    print(f"[*] Đã phân tích xong: {len(orders)} đơn hàng duy nhất từ {len(data_rows)} dòng chi tiết.")

    # Tiến hành ghi vào CSDL
    db = SessionLocal()
    try:
        # 1. Đảm bảo khách hàng KH036 tồn tại
        cust = db.query(Customer).filter(Customer.code == "KH036").first()
        if not cust:
            cust = Customer(
                code="KH036",
                name="Atlas International",
                contact_person="ATL Department",
                phone="1900-ATL",
                country="US",
                notes="Khách hàng Atlas International - Đơn hàng xuất khẩu",
                is_active=1,
                created_at=get_vietnam_time()
            )
            db.add(cust)
            db.commit()
            print("[+] Đã tạo mới khách hàng: KH036 - Atlas International")
        else:
            print("[i] Khách hàng KH036 đã tồn tại.")

        # 2. Xóa các đơn hàng cũ của KH036 hoặc batch import (Upsert)
        existing_prs = {pr.po_code: pr for pr in db.query(PurchaseRequisition).all()}
        print(f"[*] Hiện có {len(existing_prs)} đơn hàng trong bảng purchase_requisitions.")

        created_pr_count = 0
        updated_pr_count = 0
        total_items_count = 0
        total_value_usd = 0.0

        for po_code, o_data in orders.items():
            order_total_usd = sum(it["subtotal_usd"] for it in o_data["items"])
            total_value_usd += order_total_usd

            # Chuẩn bị thông tin ghi chú Note
            note_parts = []
            if o_data["plan_month"]:
                note_parts.append(f"Kế hoạch: {o_data['plan_month']}")
            if o_data["container_type"]:
                cnt_str = f"{int(o_data['container_qty'])}x {o_data['container_type']}" if o_data['container_qty'] else o_data['container_type']
                note_parts.append(f"Cont: {cnt_str}")
            if o_data["exchange_rate"]:
                note_parts.append(f"Tỷ giá: {int(o_data['exchange_rate']):,}")
            note_text = " | ".join(note_parts)

            pr = existing_prs.get(po_code)
            if pr:
                # Cập nhật đơn hàng cũ
                pr.creator = "Admin"
                pr.order_date = o_data["order_date"]
                pr.delivery_date = o_data["delivery_date"]
                pr.est_completion_date = o_data["delivery_date"]
                pr.supplier_code = "KH036"
                pr.supplier_name = "Atlas International (KH036)"
                pr.total_amount = order_total_usd
                pr.order_type = "Đơn bán hàng"
                pr.priority = "Bình thường"
                pr.status = "Chưa duyệt"
                pr.warehouse_status = "Chưa xuất kho"
                pr.note = note_text
                updated_pr_count += 1
                # Xóa items cũ để cập nhật lại
                db.query(PurchaseOrderItem).filter(PurchaseOrderItem.requisition_id == pr.id).delete()
                db.flush()
            else:
                # Tạo đơn hàng mới
                pr = PurchaseRequisition(
                    po_code=po_code,
                    creator="Admin",
                    order_date=o_data["order_date"],
                    delivery_date=o_data["delivery_date"],
                    est_completion_date=o_data["delivery_date"],
                    supplier_code="KH036",
                    supplier_name="Atlas International (KH036)",
                    total_amount=order_total_usd,
                    order_type="Đơn bán hàng",
                    priority="Bình thường",
                    material_type="Gỗ & Phụ kiện",
                    status="Chưa duyệt",
                    warehouse_status="Chưa xuất kho",
                    note=note_text,
                    created_at=get_vietnam_time()
                )
                db.add(pr)
                db.flush()
                created_pr_count += 1

            # Thêm chi tiết các mặt hàng
            for it in o_data["items"]:
                poi = PurchaseOrderItem(
                    requisition_id=pr.id,
                    po_date=o_data["order_date"],
                    po_code=po_code,
                    supplier_code="KH036",
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
                total_items_count += 1

        db.commit()
        print("[+] ===========================================")
        print(f"[+] KẾT QUẢ IMPORT THÀNH CÔNG:")
        print(f"[+] - Tổng số đơn hàng cha (PurchaseRequisition): {len(orders)} (Tạo mới: {created_pr_count}, Cập nhật: {updated_pr_count})")
        print(f"[+] - Tổng số dòng mặt hàng con (PurchaseOrderItem): {total_items_count}")
        print(f"[+] - Tổng giá trị đơn hàng: ${total_value_usd:,.2f}")
        print("[+] ===========================================")
        return True

    except Exception as e:
        db.rollback()
        print(f"[!] Lỗi trong quá trình seed dữ liệu: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    seed_atl_orders()
