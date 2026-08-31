import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import SessionLocal

def upgrade():
    db = SessionLocal()
    try:
        # 1. Delete /admin/quality-targets from system_sidebars
        db.execute(text("DELETE FROM system_sidebars WHERE route_path = '/admin/quality-targets'"))
        print("[OK] Deleted /admin/quality-targets from system_sidebars.")

        # 2. Get ID of 'Quản lý chất lượng' parent sidebar
        quality_parent = db.execute(text("SELECT id FROM system_sidebars WHERE platform='Web' AND parent_id IS NULL AND title LIKE N'%Quản lý chất lượng%'")).fetchone()
        if quality_parent:
            parent_id = quality_parent[0]
            # Update /admin/kpi/dashboard
            db.execute(text("""
                UPDATE system_sidebars
                SET parent_id = :parent_id,
                    title = N'Mục tiêu Chất Lượng',
                    icon = 'Target'
                WHERE route_path = '/admin/kpi/dashboard'
            """), {"parent_id": parent_id})
            print("[OK] Updated /admin/kpi/dashboard to parent 'Quản lý chất lượng' with title 'Mục tiêu Chất Lượng'.")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    upgrade()
