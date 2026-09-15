"""
Script: Đồng bộ Quy cách & Cây BOM từ Master Products sang toàn bộ Lệnh sản xuất (POs).
Chạy độc lập trên server/terminal.
"""
import sys, os, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BACKEND_DIR = r"d:\SmartFlow\SmartFlow_v2_Test\BackEnd"
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

import app.models
from config.database import SessionLocal
from modules.delivery.controllers import order_controller

def main():
    print("=" * 80)
    print("BẮT ĐẦU ĐỒNG BỘ BOM & QUY CÁCH TỪ MASTER PRODUCTS SANG TOÀN BỘ LỆNH SẢN XUẤT (POs)")
    print("=" * 80)
    
    start_time = time.time()
    db = SessionLocal()
    try:
        res = order_controller.sync_all_orders_boms_from_master(db=db, force_refresh=True)
        elapsed = time.time() - start_time
        
        print("\n" + "=" * 80)
        print(f"HOÀN THÀNH ĐỒNG BỘ TRONG {elapsed:.2f} GIÂY!")
        print("=" * 80)
        print(f"- Tổng số Lệnh sản xuất (POs) : {res['total_orders']}")
        print(f"- Số Lệnh sản xuất đã cập nhật : {res['updated_orders']}")
        print(f"- Số Sản phẩm đã cập nhật BOM : {res['updated_products']}")
        print(f"- Tổng số chi tiết BOM đã tạo : {res['created_boms']}")
        print(f"- Số sản phẩm chưa khớp SKU   : {res['unmatched_products_count']}")
        if res.get('unmatched_products'):
            print("  Chi tiết chưa khớp mẫu:", res['unmatched_products'])
    except Exception as e:
        print(f"[LỖI ĐỒNG BỘ]: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == '__main__':
    main()
