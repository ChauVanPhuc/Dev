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

parent = db.query(SystemSidebar).filter(
    SystemSidebar.platform == 'Web',
    SystemSidebar.id == 2
).first()

print(f"Parent Group: ID={parent.id}, Title={parent.title}")

children = db.query(SystemSidebar).filter(
    SystemSidebar.parent_id == parent.id
).order_by(SystemSidebar.sort_order.asc()).all()

print(f"Current children count: {len(children)}")
for c in children:
    print(f"ID={c.id} | Order={c.sort_order} | Title={c.title} | Path={c.route_path} | Icon={c.icon} | Perm={c.permission_key} | Active={c.is_active}")
