# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
tables = db.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")).fetchall()
for t in tables:
    tname = t[0]
    count = db.execute(text(f"SELECT COUNT(*) FROM [{tname}]")).scalar()
    print(f"  {tname}: {count} rows")
db.close()
