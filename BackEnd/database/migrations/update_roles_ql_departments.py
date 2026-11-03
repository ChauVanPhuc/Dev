"""
Migration: Chuẩn hóa mã phòng ban Quản Lý Chất Lượng trong bảng roles
- id=1: code='QL', name='QL', description='Quản Lý Chất Lượng'
- id=2003: code='QLSX' (tránh xung đột với QL)
- id=2008: code='NS'
- id=2009: code='AT'
"""
from sqlalchemy import text
from config.database import SessionLocal

def run():
    print("[MIGRATION] Bắt đầu chuẩn hóa mã phòng ban trong bảng roles...")
    db = SessionLocal()
    try:
        # 1. Quản lý chất lượng
        db.execute(text("UPDATE roles SET code = 'QL', name = 'QL' WHERE id = 1"))
        
        # 2. Quản đốc sản xuất
        db.execute(text("UPDATE roles SET code = 'QLSX' WHERE id = 2003"))
        
        # 3. Nhân sự & An toàn
        db.execute(text("UPDATE roles SET code = 'NS' WHERE id = 2008 AND (code IS NULL OR code = '')"))
        db.execute(text("UPDATE roles SET code = 'AT' WHERE id = 2009 AND (code IS NULL OR code = '')"))
        
        db.commit()
        print("[MIGRATION] Hoàn thành chuẩn hóa mã phòng ban roles thành công!")
    except Exception as e:
        db.rollback()
        print(f"[MIGRATION ERROR] Lỗi khi chuẩn hóa roles: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()

