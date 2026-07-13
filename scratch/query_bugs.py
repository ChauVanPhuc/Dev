import sys
import os
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../BackEnd")))

from config.database import SessionLocal

db = SessionLocal()
try:
    bugs = db.execute(text("SELECT id, screen_id, description, status, created_at FROM screen_bugs")).fetchall()
    with open("scratch/query_bugs_output.txt", "w", encoding="utf-8") as f:
        f.write(f"Total bugs in DB: {len(bugs)}\n")
        for bug in bugs:
            f.write(f"ID: {bug.id} | ScreenID: {bug.screen_id} | Desc: {bug.description} | Status: {bug.status} | CreatedAt: {bug.created_at}\n")
    print("Done querying bugs!")
finally:
    db.close()
