import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.database import engine
from sqlalchemy import text

def test_status():
    with engine.connect() as conn:
        acc_cnt = conn.execute(text("SELECT COUNT(*) FROM accounts")).scalar()
        sb_cnt = conn.execute(text("SELECT COUNT(*) FROM system_sidebars")).scalar()
        total_rows = 0
        res = conn.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")).fetchall()
        for r in res:
            cnt = conn.execute(text(f"SELECT COUNT(*) FROM [{r[0]}]")).scalar()
            total_rows += cnt
        print(f"Accounts: {acc_cnt}")
        print(f"System Sidebars: {sb_cnt}")
        print(f"Total rows across all 103 tables: {total_rows} (Expected: {acc_cnt + sb_cnt})")

if __name__ == '__main__':
    test_status()
