"""
Migration: Clone factory accounts (nvF, nvK, nvS, nvDH) for Factory 2 and Factory 3
"""
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from datetime import datetime
from config.database import SessionLocal
from modules.auth.models.accounts import Account
from modules.auth.models.departments import Department

def run_migration():
    db = SessionLocal()
    try:
        source_usernames = ['nvF', 'nvK', 'nvS', 'nvDH']
        sources = db.query(Account).filter(Account.username.in_(source_usernames)).all()
        source_map = {a.username: a for a in sources}

        if not sources:
            print("No source accounts found!")
            return

        factories = [
            {"id": 2, "name": "Vaniti Phân Xưởng 2", "suffix": "2"},
            {"id": 3, "name": "Furniture nhà máy 3", "suffix": "3"}
        ]

        created_count = 0
        for factory in factories:
            f_id = factory["id"]
            f_name = factory["name"]
            suf = factory["suffix"]

            for base_uname in ['nvF', 'nvK', 'nvS', 'nvDH']:
                if base_uname not in source_map:
                    continue

                src = source_map[base_uname]
                new_username = f"{base_uname}{suf}"

                # Check if already exists
                existing = db.query(Account).filter(Account.username == new_username).first()
                if existing:
                    print(f"[SKIP] Account {new_username} already exists.")
                    continue

                new_account = Account(
                    username=new_username,
                    employee_id=new_username,
                    full_name=src.full_name,
                    email=src.email,
                    phone=None,
                    hashed_password=src.hashed_password,
                    is_active=src.is_active,
                    status=src.status or "Đang sử dụng",
                    created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    permission_level=src.permission_level,
                    is_mobile_allowed=src.is_mobile_allowed,
                    is_web_allowed=src.is_web_allowed,
                    department_id=src.department_id,
                    permission_id=src.permission_id,
                    factory_id=f_id,
                    factory_name=f_name,
                    screen_permissions=src.screen_permissions
                )
                db.add(new_account)
                db.flush()

                # Add corresponding legacy junction department entry
                new_dept = Department(
                    account_id=new_account.id,
                    role_id=1,
                    permission_id=1001
                )
                db.add(new_dept)

                created_count += 1
                print(f"[OK] Created account {new_username} for {f_name} (ID: {f_id})")

        db.commit()
        print(f"\nSuccessfully seeded {created_count} accounts!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding accounts: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
