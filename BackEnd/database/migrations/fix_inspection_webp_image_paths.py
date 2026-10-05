# -*- coding: utf-8 -*-
"""
Migration: Chuẩn hóa đường dẫn hình ảnh biên bản kiểm tra (input_inspections).
- Chuyển đổi các đường dẫn ảnh bị lưu nhầm đuôi '.webp' sang '.jpg' để khớp với file vật lý trên server.
- Xóa các đường dẫn ảnh ảo từ dữ liệu mẫu cũ (deliveries/qc_phoi_x.webp) không tồn tại trên ổ đĩa.
"""
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from config.database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    try:
        print("[MIGRATION] Bắt đầu chuẩn hóa định dạng ảnh cho bảng input_inspections...")
        
        # 1. Cập nhật các đường dẫn uploads/inspections từ .webp sang .jpg
        r1 = db.execute(text("UPDATE input_inspections SET image_path_1 = REPLACE(image_path_1, '.webp', '.jpg') WHERE image_path_1 LIKE '/static/uploads/inspections/%.webp'"))
        r2 = db.execute(text("UPDATE input_inspections SET image_path_2 = REPLACE(image_path_2, '.webp', '.jpg') WHERE image_path_2 LIKE '/static/uploads/inspections/%.webp'"))
        r3 = db.execute(text("UPDATE input_inspections SET image_path_3 = REPLACE(image_path_3, '.webp', '.jpg') WHERE image_path_3 LIKE '/static/uploads/inspections/%.webp'"))
        r4 = db.execute(text("UPDATE input_inspections SET images_json = REPLACE(images_json, '.webp', '.jpg') WHERE images_json LIKE '%/static/uploads/inspections/%.webp%'"))

        # 2. Xóa các đường dẫn ảnh mock dummy cũ không tồn tại
        r5 = db.execute(text("UPDATE input_inspections SET image_path_1 = NULL WHERE image_path_1 LIKE '/static/uploads/deliveries/%'"))
        r6 = db.execute(text("UPDATE input_inspections SET image_path_2 = NULL WHERE image_path_2 LIKE '/static/uploads/deliveries/%'"))
        r7 = db.execute(text("UPDATE input_inspections SET image_path_3 = NULL WHERE image_path_3 LIKE '/static/uploads/deliveries/%'"))

        db.commit()
        print(f"[OK] Cập nhật thành công: img1={r1.rowcount}, img2={r2.rowcount}, img3={r3.rowcount}, images_json={r4.rowcount}")
        print(f"[OK] Dọn dẹp ảnh mock deliveries: img1={r5.rowcount}, img2={r6.rowcount}")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Lỗi khi chạy migration ảnh: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
