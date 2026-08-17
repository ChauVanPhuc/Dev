# -*- coding: utf-8 -*-
import sys
import os
import io

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import openpyxl
from fastapi.testclient import TestClient
from app.main import app
from config.database import SessionLocal
from modules.purchasing.models.purchase_order_item import PurchaseOrderItem
from modules.purchasing.models.purchase_requisition import PurchaseRequisition

client = TestClient(app)

def create_sample_export_excel():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Đơn mua hàng"
    headers = [
        "STT", "Ngày PO", "Mã PO", "Mã NCC", "Tên NCC",
        "Mã mặt hàng", "Tên mặt hàng", "Mã đơn hàng", "ĐVT",
        "Số lượng", "Đơn giá", "Thành tiền VND", "Thuế VND",
        "Thành tiền sau thuế", "Tổng tiền VND",
        "Ngày giao hàng", "Trạng thái", "Người tạo PO"
    ]
    ws.append(headers)
    ws.append([
        1, "2026-08-17", "PO-TEST-001", "NCC001", "Công ty TNHH Nhôm Kính",
        "MH-NHOM-01", "Khung nhôm 40x40", "DH-2026-01", "Thanh",
        100, 150000, 15000000, 1500000, 16500000, 16500000,
        "2026-08-25", "Đã duyệt", "Admin"
    ])
    ws.append([
        2, "2026-08-17", "PO-TEST-001", "NCC001", "Công ty TNHH Nhôm Kính",
        "MH-KINH-02", "Kính cường lực 10mm", "DH-2026-01", "Tấm",
        50, 300000, 15000000, 1500000, 16500000, 16500000,
        "2026-08-25", "Đã duyệt", "Admin"
    ])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()

def test_import():
    content = create_sample_export_excel()
    files = {"file": ("test_import.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    
    print("[*] Gửi request import file Excel...")
    response = client.post("/api/v1/purchase-order-items/import-excel", files=files)
    print(f"[*] Response status: {response.status_code}")
    print(f"[*] Response text:\n{response.text}")

    db = SessionLocal()
    try:
        items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_code == "PO-TEST-001").all()
        print(f"[+] Tìm thấy {len(items)} items trong DB cho PO-TEST-001")
        for it in items:
            print(f"    - {it.item_code} | {it.item_name} | SL: {it.quantity} | Đơn giá: {it.unit_price} | Thành tiền: {it.subtotal_vnd}")
        
        req = db.query(PurchaseRequisition).filter(PurchaseRequisition.po_code == "PO-TEST-001").first()
        print(f"[+] Requisition tương ứng: {req.po_code if req else 'None'} (id={req.id if req else 'None'})")
    finally:
        db.close()

if __name__ == "__main__":
    test_import()
