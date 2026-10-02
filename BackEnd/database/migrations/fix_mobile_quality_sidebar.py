import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('.')
from config.database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    try:
        # Cập nhật route_path thành '/admin/quality' cho menu 'Xác nhận phiếu kiểm tra'
        res = db.execute(text("UPDATE system_sidebars SET route_path = '/admin/quality' WHERE route_path = 'admin/quality' OR (platform = 'Mobile' AND title = N'Xác nhận phiếu kiểm tra')"))
        db.commit()
        print(f"[OK] Đã cập nhật {res.rowcount} dòng trong system_sidebars.")

        # In lại cấu hình sau khi cập nhật
        rows = db.execute(text("SELECT id, title, route_path, platform FROM system_sidebars WHERE platform = 'Mobile' AND title = N'Xác nhận phiếu kiểm tra'")).fetchall()
        for r in rows:
            print(f"ID: {r[0]} | Title: {r[1]} | Route: {r[2]} | Platform: {r[3]}")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Lỗi khi cập nhật system_sidebars: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    run_migration()
