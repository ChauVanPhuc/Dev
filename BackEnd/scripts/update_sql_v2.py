import sys
import os
from sqlalchemy import text

# Thêm thư mục BackEnd vào sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
sys.path.append(backend_root)

from config.database import engine, Base
# Import models để Base nhận diện
from modules.auth.models.accounts import Account
from modules.auth.models.departments import Department
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.production.models.stages import Stage

def update_db_v2():
    print("--- Đang cập nhật cấu trúc Database (Thêm Department & Xóa Role từ Account) ---")
    
    with engine.connect() as connection:
        # Xóa các ràng buộc và bảng cũ để làm mới cấu trúc
        print("Đang dọn dẹp cấu trúc cũ...")
        try:
            # Xóa các ràng buộc khóa ngoại trước khi drop bảng
            # Lưu ý: MSSQL cần câu lệnh DROP CONSTRAINT nếu muốn xóa cột, nhưng ở đây ta drop cả bảng
            connection.execute(text("DROP TABLE IF EXISTS departments")) # Xóa table mới nếu chạy lại
            connection.execute(text("DROP TABLE IF EXISTS accounts"))    # Xóa table accounts cũ
            connection.commit()
            print("Đã xóa bảng accounts cũ.")
        except Exception as e:
            print(f"Lỗi khi dọn dẹp: {e}")

        # Tạo lại tất cả bảng (bao gồm accounts mới không có role_id và bảng departments)
        print("Đang tạo cấu trúc mới...")
        try:
            Base.metadata.create_all(bind=engine)
            print("Cập nhật Database thành công!")
        except Exception as e:
            print(f"Lỗi khi tạo cấu trúc mới: {e}")

    print("--- Hoàn tất cập nhật SQL ---")

if __name__ == "__main__":
    update_db_v2()
