import sys
import os
from sqlalchemy import text

# Thêm thư mục BackEnd vào sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
sys.path.append(backend_root)

from config.database import engine
from app.models import Base

def reset_all_db():
    print("--- Đang Reset toàn bộ Database để cập nhật cấu trúc mới (Department) ---")
    
    try:
        # Cách an toàn nhất: drop_all handles foreign key order
        Base.metadata.drop_all(bind=engine)
        print("1. Đã xóa toàn bộ các bảng cũ thành công.")
        
        # Tạo lại tất cả
        Base.metadata.create_all(bind=engine)
        print("2. Đã tạo lại cấu trúc Database mới thành công.")
        
    except Exception as e:
        print(f"Lỗi: {e}")

if __name__ == "__main__":
    reset_all_db()
