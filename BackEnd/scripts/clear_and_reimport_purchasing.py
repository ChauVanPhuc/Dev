# -*- coding: utf-8 -*-
"""
Script xóa sạch (clear) dữ liệu cũ trong phân hệ Mua hàng và nạp lại toàn bộ dữ liệu
từ các file Excel chuẩn trong D:\File\
"""

import sys
import os
import time

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.database import SessionLocal
from modules.purchasing.models.purchase_requisition import PurchaseRequisition
from modules.purchasing.models.purchase_order_item import PurchaseOrderItem
from modules.purchasing.services.excel_import_service import process_purchasing_excel
import asyncio


async def main():
    db = SessionLocal()
    try:
        print("==================================================================")
        print("BƯỚC 1: XÓA SẠCH DỮ LIỆU CŨ TRONG PURCHASE REQUISITIONS & ITEMS...")
        print("==================================================================")
        
        del_items = db.query(PurchaseOrderItem).delete()
        del_prs = db.query(PurchaseRequisition).delete()
        db.commit()
        
        print(f"[+] Đã xóa {del_items:,} dòng trong purchase_order_items")
        print(f"[+] Đã xóa {del_prs:,} dòng trong purchase_requisitions")
        
        # Verify 0 count
        curr_items = db.query(PurchaseOrderItem).count()
        curr_prs = db.query(PurchaseRequisition).count()
        print(f"[+] Hiện tại CSDL: {curr_prs} đơn mua hàng, {curr_items} mặt hàng chi tiết.")
        
        print("\n==================================================================")
        print("BƯỚC 2: TỰ ĐỘNG NẠP DỮ LIỆU TỪ CÁC FILE EXCEL CHUẨN...")
        print("==================================================================")

        file_list = [
            ("Đơn hàng ATL triển khai SX(đổ Verp).xlsx", os.path.join(r"D:\File", "Đơn hàng ATL triển khai SX(đổ Verp).xlsx")),
            ("Báo cáo đơn mua hàng xác nhận (ERP)", os.path.join(r"D:\File", "Bao#cao#don#mua#hang#xac#nhan#-#Theo#mat#hang#01_01_2026#31_12_2026.xlsx"))
        ]

        for desc, file_path in file_list:
            if not os.path.exists(file_path):
                print(f"[!] Không tìm thấy file: {file_path}")
                continue

            print(f"\n[*] Đang nạp file: {desc} ({os.path.basename(file_path)})...")
            start_t = time.time()
            with open(file_path, "rb") as f:
                contents = f.read()

            last_msg = ""
            async for progress_json in process_purchasing_excel(contents, db):
                # Chỉ log message cuối hoặc các mốc quan trọng
                if "completed" in progress_json:
                    last_msg = progress_json
                elif "error" in progress_json:
                    print(f"[!] Lỗi khi nạp: {progress_json}")

            elapsed = time.time() - start_t
            print(f"[+] Hoàn tất sau {elapsed:.2f}s!")
            print(f"    Kết quả: {last_msg.strip()}")

        print("\n==================================================================")
        print("BƯỚC 3: TỔNG KẾT VÀ KIỂM TRA ĐỘ TOÀN VẸN CƠ SỞ DỮ LIỆU...")
        print("==================================================================")
        
        final_prs = db.query(PurchaseRequisition).count()
        final_items = db.query(PurchaseOrderItem).count()
        linked_items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.requisition_id.isnot(None)).count()
        
        print(f"[*] Tổng số đơn đặt mua (PurchaseRequisition): {final_prs:,}")
        print(f"[*] Tổng số mặt hàng chi tiết (PurchaseOrderItem): {final_items:,}")
        print(f"[*] Mặt hàng đã liên kết FK với đơn mua: {linked_items:,} ({(linked_items/final_items*100):.1f}%)")
        
        # Mẫu 5 đơn hàng
        sample_prs = db.query(PurchaseRequisition).limit(5).all()
        print("\n--- Mẫu 5 đơn hàng mới nhất ---")
        for p in sample_prs:
            cnt = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.requisition_id == p.id).count()
            print(f" - PO: {p.po_code} | NCC: {p.supplier_code} ({p.supplier_name}) | Loại: {p.order_type} | Tổng tiền: {p.total_amount:,.2f} | Số MH: {cnt}")

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
