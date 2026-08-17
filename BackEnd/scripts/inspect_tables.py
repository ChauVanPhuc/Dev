import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.database import engine
from sqlalchemy import text

def inspect_db():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"))
        tables = [row[0] for row in res.fetchall()]
        print(f"Total tables: {len(tables)}")
        for t in tables:
            try:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM [{t}]")).scalar()
                print(f"  - [{t}]: {cnt} rows")
            except Exception as e:
                print(f"  - [{t}]: error ({e})")

if __name__ == '__main__':
    inspect_db()
