import sys, os
sys.path.insert(0, os.path.abspath('BackEnd'))
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    parent = db.execute(text("SELECT id FROM system_sidebars WHERE title = N'Hồ sơ ISO'")).fetchone()
    if not parent:
        parent = db.execute(text("SELECT id FROM system_sidebars WHERE title LIKE N'%ISO%' AND parent_id IS NULL")).fetchone()
    
    parent_id = parent[0] if parent else 17
    print(f"Parent 'Hồ sơ ISO' id is: {parent_id}")

    # Cập nhật parent_id và sort_order cho /admin/iso-records
    db.execute(text(f"""
        UPDATE system_sidebars 
        SET parent_id = {parent_id}, sort_order = 3, is_active = 1, icon = 'FolderArchive', title = N'Quản lý hồ sơ'
        WHERE route_path = '/admin/iso-records' OR id = 3101
    """))
    db.commit()

    rows = db.execute(text(f"SELECT id, title, route_path, parent_id, sort_order, is_active FROM system_sidebars WHERE parent_id = {parent_id} ORDER BY sort_order")).fetchall()
    print("Children of 'Hồ sơ ISO' in DB:")
    for r in rows:
        print("  ", r)
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
