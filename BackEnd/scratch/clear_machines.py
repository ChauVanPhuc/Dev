import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from config.database import SessionLocal
from modules.equipment.models.machinery import Machine

db = SessionLocal()
try:
    num_deleted = db.query(Machine).delete()
    db.commit()
    print(f"CLEARED: Deleted {num_deleted} machines successfully.")
except Exception as e:
    db.rollback()
    print(f"ERROR: {e}")
finally:
    db.close()
