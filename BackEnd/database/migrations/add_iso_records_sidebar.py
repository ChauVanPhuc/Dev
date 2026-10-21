import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from config.database import SessionLocal
from sqlalchemy import text

def add_iso_records_sidebar():
    db = SessionLocal()
    try:
        parent = db.execute(text("SELECT id FROM system_sidebars WHERE id = 16")).fetchone()
        if not parent:
            parent = db.execute(text("SELECT id FROM system_sidebars WHERE title = N'Hồ sơ ISO'")).fetchone()
        
        parent_id = parent[0] if parent else 16

        existing = db.execute(text("SELECT id FROM system_sidebars WHERE route_path = '/admin/iso-records'")).fetchone()
        if not existing:
            db.execute(text("UPDATE system_sidebars SET sort_order = 4 WHERE id = 3099"))
            db.execute(text("UPDATE system_sidebars SET sort_order = 5 WHERE id = 3100"))

            max_id = db.execute(text("SELECT MAX(id) FROM system_sidebars")).scalar() or 3100
            new_id = max(3101, max_id + 1)

            try:
                db.execute(text(f"""
                    SET IDENTITY_INSERT system_sidebars ON;
                    INSERT INTO system_sidebars (id, title, route_path, icon, parent_id, sort_order, is_active, platform)
                    VALUES ({new_id}, N'Quản lý hồ sơ', '/admin/iso-records', 'FolderArchive', {parent_id}, 3, 1, 'Web');
                    SET IDENTITY_INSERT system_sidebars OFF;
                """))
                db.commit()
            except Exception:
                db.rollback()
                db.execute(text(f"""
                    INSERT INTO system_sidebars (title, route_path, icon, parent_id, sort_order, is_active, platform)
                    VALUES (N'Quản lý hồ sơ', '/admin/iso-records', 'FolderArchive', {parent_id}, 3, 1, 'Web')
                """))
                db.commit()

            print(f"[SIDEBAR MIGRATION] Inserted 'Quản lý hồ sơ' into system_sidebars under parent {parent_id}!")
        else:
            print("[SIDEBAR MIGRATION] 'Quản lý hồ sơ' already exists in system_sidebars.")

        rows = db.execute(text(f"SELECT id, title, route_path, sort_order, platform FROM system_sidebars WHERE parent_id = {parent_id} ORDER BY sort_order")).fetchall()
        print(f"Current children of parent {parent_id}:")
        for r in rows:
            print(" ", r)
    except Exception as e:
        db.rollback()
        print(f"[SIDEBAR MIGRATION] Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_iso_records_sidebar()
