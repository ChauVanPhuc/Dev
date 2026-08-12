import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import SessionLocal
from config.security import get_password_hash
from modules.auth.models.accounts import Account

db = SessionLocal()
try:
    existing = db.query(Account).filter(Account.username == 'admin').first()
    if existing:
        print('admin already exists')
    else:
        admin = Account(
            username='admin',
            full_name='Administrator',
            email='admin@smartflow.vn',
            hashed_password=get_password_hash('admin'),
            is_active=True,
            status='Đang sử dụng',
            permission_level='Quản Lý',
            is_mobile_allowed=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f'Created admin account id={admin.id}')
except Exception as e:
    db.rollback()
    print('ERROR:', e)
    raise
finally:
    db.close()
