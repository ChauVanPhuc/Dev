"""
Migration: Thêm các cột lưu tệp tin gốc bất biến (original_file_path, original_file_name)
vào các bảng iso_processes và iso_documents.
Đảm bảo khi người dùng upload file gốc thì file gốc được lưu riêng,
quá trình chỉnh sửa / export tạo file mới không làm mất bản gốc.
"""
import sys
import os

# Thêm đường dẫn BackEnd vào sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config.database import engine
from sqlalchemy import text

def run_migration():
    print(">>> [1/2] Bắt đầu migration: Thêm cột original_file_path & original_file_name...")
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Thêm cột vào bảng iso_processes
            existing_proc_cols = [
                row[0] for row in conn.execute(text(
                    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'iso_processes'"
                )).fetchall()
            ]

            if "original_file_path" not in existing_proc_cols:
                print(" -> Thêm cột original_file_path vào iso_processes...")
                conn.execute(text("ALTER TABLE iso_processes ADD original_file_path NVARCHAR(500) NULL;"))
            else:
                print(" -> Cột original_file_path đã tồn tại trong iso_processes.")

            if "original_file_name" not in existing_proc_cols:
                print(" -> Thêm cột original_file_name vào iso_processes...")
                conn.execute(text("ALTER TABLE iso_processes ADD original_file_name NVARCHAR(250) NULL;"))
            else:
                print(" -> Cột original_file_name đã tồn tại trong iso_processes.")

            # 2. Thêm cột vào bảng iso_documents
            existing_doc_cols = [
                row[0] for row in conn.execute(text(
                    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'iso_documents'"
                )).fetchall()
            ]

            if "original_file_path" not in existing_doc_cols:
                print(" -> Thêm cột original_file_path vào iso_documents...")
                conn.execute(text("ALTER TABLE iso_documents ADD original_file_path NVARCHAR(500) NULL;"))
            else:
                print(" -> Cột original_file_path đã tồn tại trong iso_documents.")

            if "original_file_name" not in existing_doc_cols:
                print(" -> Thêm cột original_file_name vào iso_documents...")
                conn.execute(text("ALTER TABLE iso_documents ADD original_file_name NVARCHAR(250) NULL;"))
            else:
                print(" -> Cột original_file_name đã tồn tại trong iso_documents.")

            # 3. Đồng bộ dữ liệu cũ: Nếu original_file_path IS NULL, gán tạm bằng file_path
            print(" -> Đồng bộ dữ liệu cũ: cập nhật original_file_path = file_path nếu chưa có...")
            conn.execute(text("""
                UPDATE iso_processes 
                SET original_file_path = file_path 
                WHERE original_file_path IS NULL AND file_path IS NOT NULL;
            """))
            conn.execute(text("""
                UPDATE iso_documents 
                SET original_file_path = file_path 
                WHERE original_file_path IS NULL AND file_path IS NOT NULL;
            """))

            trans.commit()
            print(">>> [2/2] Migration thành công hoàn tất!")
        except Exception as e:
            trans.rollback()
            print(f">>> LỖI MIGRATION: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
