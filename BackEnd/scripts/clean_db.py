import sys
import os
import argparse
from sqlalchemy import text

# Thêm thư mục gốc và BackEnd vào PYTHONPATH để có thể import các config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import SessionLocal

# Danh sách các bảng cần xóa theo thứ tự phụ thuộc khóa ngoại (Con trước, Cha sau)
TABLES_TO_CLEAN = [
    # 1. Dữ liệu bàn giao và QC liên quan
    "delivery_qc",
    "delivery_images",
    "delivery_returns",
    "delivery_details",
    "deliveries",
    
    # 2. Dữ liệu kiểm tra chất lượng (QC)
    "input_inspections",
    
    # 3. Kế hoạch sản xuất & Đơn hàng thực tế
    "bom_details",
    "products",
    "order_items",
    "orders",
    "product_plans",
    "pallet_cards",
    
    # 4. Danh mục mẫu (Master Data - Lựa chọn A)
    "master_bom_details",
    "master_products"
]

def clean_database(commit=False):
    db = SessionLocal()
    try:
        print("=" * 60)
        print("BẮT ĐẦU DỌN DẸP DỮ LIỆU CƠ SỞ DỮ LIỆU (LỰA CHỌN A)")
        print(f"Chế độ: {'[COMMIT] Lưu thay đổi' if commit else '[DRY-RUN] Chạy thử (Rollback)'}")
        print("=" * 60)

        # Tắt kiểm tra khóa ngoại tạm thời nếu cần (tuy nhiên ta đã sắp xếp đúng thứ tự xóa)
        for table_name in TABLES_TO_CLEAN:
            # Kiểm tra xem bảng có tồn tại trong database không trước khi xóa
            check_table_sql = f"""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = '{table_name}'
            """
            table_exists = db.execute(text(check_table_sql)).scalar()
            
            if not table_exists:
                print(f"[-] Bảng '{table_name}' không tồn tại trong DB. Bỏ qua.")
                continue

            # Đếm số dòng trước khi xóa
            count_sql = f"SELECT COUNT(*) FROM [{table_name}]"
            row_count_before = db.execute(text(count_sql)).scalar()

            if row_count_before == 0:
                print(f"[o] Bảng '{table_name}' đã trống sẵn.")
                continue

            # Thực hiện xóa
            delete_sql = f"DELETE FROM [{table_name}]"
            db.execute(text(delete_sql))
            
            print(f"[x] Đã xóa {row_count_before} dòng khỏi bảng '{table_name}'.")

        # Hoàn tất giao dịch
        if commit:
            db.commit()
            print("=" * 60)
            print("[SUCCESS] Đã commit thay đổi thành công vào Cơ sở dữ liệu!")
            print("=" * 60)
        else:
            db.rollback()
            print("=" * 60)
            print("[DRY-RUN COMPLETE] Đã rollback thành công. Không có dữ liệu nào bị thay đổi thực tế.")
            print("Để thực hiện xóa thật, chạy với tham số: python scripts/clean_db.py --commit")
            print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Lỗi trong quá trình dọn dẹp DB: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dọn dẹp dữ liệu BOM & Bàn giao")
    parser.add_argument("--commit", action="store_true", help="Commit thực tế vào DB thay vì chạy thử")
    args = parser.parse_args()

    clean_database(commit=args.commit)
