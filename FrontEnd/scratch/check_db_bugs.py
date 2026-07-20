import sys
import os
sys.path.append(os.path.abspath('BackEnd'))

from config.database import SessionLocal
from modules.system.models.system_screen import SystemScreen
from modules.system.models.system_component import SystemComponent
from modules.system.models.screen_bug import ScreenBug, ScreenBugUpdate, ScreenBugImage

db = SessionLocal()
try:
    screens = db.query(SystemScreen).all()
    for s in screens:
        if s.id == 54:
            print(f"FOUND Screen ID: {s.id} | Code: {s.current_code}")
            bugs = db.query(ScreenBug).filter(ScreenBug.screen_id == s.id).all()
            print(f"  Bugs count: {len(bugs)}")
            for b in bugs:
                print(f"    Bug ID: {b.id} | Status: {b.status} | Severity: {b.severity}")
except Exception as e:
    print("Error:", e)
finally:
    db.close()
