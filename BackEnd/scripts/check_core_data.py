import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.database import engine
from sqlalchemy import text

def check_core_data():
    with engine.connect() as conn:
        print("=== ACCOUNTS ===")
        res = conn.execute(text("SELECT id, username, full_name, permission_level, department_id, permission_id, factory_id FROM accounts")).fetchall()
        for r in res:
            print(" ", r)

        print("\n=== ROLES ===")
        res = conn.execute(text("SELECT * FROM roles")).fetchall()
        for r in res:
            print(" ", r)

        print("\n=== DEPARTMENTS ===")
        res = conn.execute(text("SELECT id, name FROM departments")).fetchall()
        for r in res:
            print(" ", r)

        print("\n=== SYSTEM_SIDEBARS COUNT ===")
        cnt = conn.execute(text("SELECT COUNT(*) FROM system_sidebars")).scalar()
        print(" Total sidebars:", cnt)

        print("\n=== SYSTEM_SCREENS COUNT ===")
        cnt = conn.execute(text("SELECT COUNT(*) FROM system_screens")).scalar()
        print(" Total screens:", cnt)

if __name__ == '__main__':
    check_core_data()
