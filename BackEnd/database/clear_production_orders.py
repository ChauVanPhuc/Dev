# -*- coding: utf-8 -*-
"""
Script xóa sạch dữ liệu Kế hoạch sản xuất & Lệnh sản xuất (/admin/production-orders)
Bao gồm:
- bom_details
- products
- orders
- product_plans
Đồng thời nullify các liên kết khóa ngoại an toàn (deliveries, input_inspections, delivery_details)
và reset identity seed về 0 để sẵn sàng cho lần upload mới.
"""
import sys
import os

# Thêm thư mục BackEnd vào sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config.database import engine
from sqlalchemy import text
from modules.production.routes.product_plan_router import clear_plans_cache

def clear_all_production_orders():
    print("=" * 60)
    print("BẮT ĐẦU XÓA SẠCH LỆNH SẢN XUẤT & KẾ HOẠCH SẢN XUẤT")
    print("=" * 60)

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Gỡ liên kết khóa ngoại ở các bảng giao nhận / kiểm tra
            r1 = conn.execute(text("UPDATE deliveries SET order_id = NULL WHERE order_id IS NOT NULL"))
            print(f"1. Gỡ liên kết deliveries.order_id: {r1.rowcount} dòng")

            r2 = conn.execute(text("UPDATE deliveries SET plan_id = NULL WHERE plan_id IS NOT NULL"))
            print(f"2. Gỡ liên kết deliveries.plan_id: {r2.rowcount} dòng")

            r3 = conn.execute(text("UPDATE delivery_details SET order_id = NULL WHERE order_id IS NOT NULL"))
            print(f"3. Gỡ liên kết delivery_details.order_id: {r3.rowcount} dòng")

            r4 = conn.execute(text("UPDATE input_inspections SET plan_id = NULL WHERE plan_id IS NOT NULL"))
            print(f"4. Gỡ liên kết input_inspections.plan_id: {r4.rowcount} dòng")

            # 2. Gỡ tự liên kết parent_id của bom_details
            r5 = conn.execute(text("UPDATE bom_details SET parent_id = NULL WHERE parent_id IS NOT NULL"))
            print(f"5. Gỡ self-reference bom_details.parent_id: {r5.rowcount} dòng")

            # 3. Xóa chi tiết định mức BOM
            r6 = conn.execute(text("DELETE FROM bom_details"))
            print(f"6. Đã xóa bom_details: {r6.rowcount} dòng")

            # 4. Xóa sản phẩm thuộc đơn hàng
            r7 = conn.execute(text("DELETE FROM products"))
            print(f"7. Đã xóa products: {r7.rowcount} dòng")

            # 5. Xóa order_items nếu có
            try:
                r8 = conn.execute(text("DELETE FROM order_items"))
                print(f"8. Đã xóa order_items: {r8.rowcount} dòng")
            except Exception as e:
                print(f"8. Bỏ qua order_items ({e})")

            # 6. Xóa lệnh sản xuất / đơn hàng
            r9 = conn.execute(text("DELETE FROM orders"))
            print(f"9. Đã xóa orders: {r9.rowcount} dòng")

            # 7. Xóa delivery_returns nếu có tham chiếu plan_id
            try:
                r10 = conn.execute(text("DELETE FROM delivery_returns WHERE plan_id IS NOT NULL"))
                print(f"10. Đã xóa delivery_returns: {r10.rowcount} dòng")
            except Exception as e:
                print(f"10. Bỏ qua delivery_returns ({e})")

            # 8. Xóa kế hoạch sản xuất
            r11 = conn.execute(text("DELETE FROM product_plans"))
            print(f"11. Đã xóa product_plans: {r11.rowcount} dòng")

            # 9. Reset Identity Seed về 0
            for tbl in ['bom_details', 'products', 'orders', 'product_plans']:
                try:
                    conn.execute(text(f"DBCC CHECKIDENT ('{tbl}', RESEED, 0)"))
                    print(f"12. Reset Identity Seed cho bảng '{tbl}' về 0 thành công.")
                except Exception as e:
                    print(f"12. Lưu ý khi reset seed '{tbl}': {e}")

            # Commit transaction
            trans.commit()
            print("=" * 60)
            print("TRANSACTION COMMITTED THÀNH CÔNG! ĐÃ XÓA SẠCH DỮ LIỆU.")
            print("=" * 60)

            # Xóa cache bộ nhớ của product_plan_router
            try:
                clear_plans_cache()
                print("Đã xóa cache bộ nhớ SWR của kế hoạch sản xuất.")
            except Exception as e:
                print(f"Lưu ý xóa cache: {e}")

        except Exception as exc:
            trans.rollback()
            print("=" * 60)
            print(f"GẶP LỖI, ĐÃ ROLLBACK AN TOÀN TOÀN BỘ: {exc}")
            print("=" * 60)
            raise exc

if __name__ == "__main__":
    clear_all_production_orders()

