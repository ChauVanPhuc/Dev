import sys
import os

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from config.database import SessionLocal
from sqlalchemy import text

def update_iso_sidebar_titles():
    db = SessionLocal()
    try:
        db.execute(text("UPDATE system_sidebars SET title = N'Mẫu tài liệu' WHERE route_path = '/admin/iso-documents'"))
        db.execute(text("UPDATE system_sidebars SET title = N'Tài liệu nghiệp vụ' WHERE route_path = '/admin/iso-processes'"))
        db.execute(text("UPDATE system_sidebars SET title = N'Quản lý bộ tài liệu' WHERE route_path = '/admin/iso-records'"))
        db.commit()

        print("[OK] Updated sidebar titles for ISO menu items:")
        rows = db.execute(text("SELECT id, title, route_path, parent_id, sort_order FROM system_sidebars WHERE route_path LIKE '%iso%' ORDER BY sort_order")).fetchall()
        for r in rows:
            print(f"  ID: {r[0]}, Title: {r[1]}, Route: {r[2]}, Parent: {r[3]}, Order: {r[4]}")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_iso_sidebar_titles()
