"""
Script Xóa sạch toàn bộ dữ liệu Master Products & BOM (/admin/products)
để chuẩn bị cho việc nạp mới hoàn toàn dữ liệu từ các file BOM.
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.stdout.reconfigure(encoding='utf-8')

from config.database import engine
from sqlalchemy import text

def clear_all_master_products():
    print("============================================================")
    print(" ĐANG XÓA TOÀN BỘ DỮ LIỆU /admin/products...")
    print("============================================================")

    with engine.begin() as conn:
        # 1. Update self-referencing parent_id to NULL in master_bom_details
        print("1. Gỡ bỏ liên kết cây parent_id trong master_bom_details...")
        try:
            conn.execute(text("UPDATE master_bom_details SET parent_id = NULL WHERE parent_id IS NOT NULL"))
        except Exception as e:
            print(f"   Note: {e}")

        # 2. Xóa các bảng con phụ thuộc
        print("2. Xóa chi tiết BOM (master_bom_details)...")
        res_bom = conn.execute(text("DELETE FROM master_bom_details"))
        print(f"   Đã xóa: {res_bom.rowcount} dòng")

        print("3. Xóa chi tiết sản phẩm KT (master_product_details)...")
        res_pd = conn.execute(text("DELETE FROM master_product_details"))
        print(f"   Đã xóa: {res_pd.rowcount} dòng")

        print("4. Xóa mẫu màu sơn (paint_color_samples)...")
        res_paint = conn.execute(text("DELETE FROM paint_color_samples"))
        print(f"   Đã xóa: {res_paint.rowcount} dòng")

        print("5. Xóa định mức vật tư (master_product_materials)...")
        try:
            res_mat = conn.execute(text("DELETE FROM master_product_materials"))
            print(f"   Đã xóa: {res_mat.rowcount} dòng")
        except Exception as e:
            print(f"   Note: {e}")

        # 6. Xóa bảng master_products
        print("6. Xóa danh mục sản phẩm mẫu (master_products)...")
        res_mp = conn.execute(text("DELETE FROM master_products"))
        print(f"   Đã xóa: {res_mp.rowcount} dòng")

    print("============================================================")
    print(" ✅ ĐÃ XÓA SẠCH HOÀN TOÀN TOÀN BỘ DỮ LIỆU /admin/products!")
    print("============================================================")

if __name__ == "__main__":
    clear_all_master_products()
