"""
Migration: update_iso_process_and_document_hierarchy.py
Tái cấu trúc quan hệ:
- 1 Quy trình (iso_processes) có nhiều Mẫu tài liệu (iso_documents)
- Thêm process_id vào iso_documents
- Thêm department_id, department_name, file_path vào iso_processes
- Chuyển iso_document_id trong iso_processes thành nullable
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text
from config.database import engine

def run_migration():
    print("Bắt đầu migration tái cấu trúc Quy trình - Mẫu tài liệu ISO...")
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Kiểm tra và thêm cột process_id vào iso_documents
            check_col_sql = text("""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'iso_documents' AND COLUMN_NAME = 'process_id'
            """)
            has_process_id = conn.execute(check_col_sql).scalar()
            if not has_process_id:
                print("-> Thêm cột process_id vào iso_documents...")
                conn.execute(text("ALTER TABLE iso_documents ADD process_id INT NULL;"))
                conn.execute(text("""
                    ALTER TABLE iso_documents 
                    ADD CONSTRAINT FK_iso_documents_process 
                    FOREIGN KEY (process_id) REFERENCES iso_processes(id) ON DELETE NO ACTION;
                """))
                print("   Đã thêm cột process_id và khóa ngoại thành công.")
            else:
                print("-> Cột process_id đã tồn tại trong iso_documents.")

            # 2. Kiểm tra và thêm các cột vào iso_processes: department_id, department_name, file_path
            cols_to_add = [
                ("department_id", "INT NULL"),
                ("department_name", "NVARCHAR(100) NULL"),
                ("file_path", "NVARCHAR(500) NULL")
            ]
            for col_name, col_type in cols_to_add:
                check_sql = text(f"""
                    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'iso_processes' AND COLUMN_NAME = '{col_name}'
                """)
                exists = conn.execute(check_sql).scalar()
                if not exists:
                    print(f"-> Thêm cột {col_name} vào iso_processes...")
                    conn.execute(text(f"ALTER TABLE iso_processes ADD {col_name} {col_type};"))
                    print(f"   Đã thêm cột {col_name} thành công.")
                else:
                    print(f"-> Cột {col_name} đã tồn tại trong iso_processes.")

            # 3. Cho phép iso_document_id trong iso_processes là NULL
            print("-> Kiểm tra nullable cho cột iso_document_id trong iso_processes...")
            conn.execute(text("ALTER TABLE iso_processes ALTER COLUMN iso_document_id INT NULL;"))
            print("   Đã chuyển iso_document_id thành NULL thành công.")

            # 4. Đồng bộ dữ liệu cũ: nếu iso_processes có iso_document_id, cập nhật ngược lại iso_documents.process_id
            print("-> Đồng bộ liên kết ngược từ iso_processes sang iso_documents...")
            sync_sql = text("""
                UPDATE d
                SET d.process_id = p.id
                FROM iso_documents d
                INNER JOIN iso_processes p ON p.iso_document_id = d.id
                WHERE d.process_id IS NULL;
            """)
            conn.execute(sync_sql)

            trans.commit()
            print(" Hoàn tất migration cấu trúc CSDL thành công!")
        except Exception as e:
            trans.rollback()
            print(f"❌ Lỗi migration: {str(e)}")
            raise e

if __name__ == "__main__":
    run_migration()
