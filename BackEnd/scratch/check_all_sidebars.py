import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

import app.models
from config.database import SessionLocal
from modules.system.models.system_sidebar import SystemSidebar

db = SessionLocal()

groups = db.query(SystemSidebar).filter(
    SystemSidebar.platform == 'Web',
    SystemSidebar.parent_id == None
).order_by(SystemSidebar.sort_order.asc()).all()

for g in groups:
    print(f"\n--- Group: [{g.id}] {g.title} (sort={g.sort_order}) ---")
    children = db.query(SystemSidebar).filter(
        SystemSidebar.parent_id == g.id
    ).order_by(SystemSidebar.sort_order.asc()).all()
    for c in children:
        print(f"   ID={c.id} | Order={c.sort_order} | Title={c.title} | Path={c.route_path} | Perm={c.permission_key}")
