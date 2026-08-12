import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import SessionLocal
from sqlalchemy import text

# Các bảng cấu hình + sidebar cần giữ lại
KEEP = {
    'alembic_version',
    'users',
    'accounts',
    'roles',
    'permissions',
    'user_roles',
    'role_permissions',
    'sidebars',
    'system_sidebars',
    'modules',
    'categories',
    'stages',
    'departments',
    'factories',
    'areas',
}

db = SessionLocal()
try:
    # Lấy danh sách các bảng cần xóa
    keep_in = '(' + ','.join(f"'{k}'" for k in KEEP) + ')'
    rows = db.execute(text(
        f"SELECT name FROM sys.tables WHERE is_ms_shipped = 0 AND name NOT IN {keep_in}"
    )).fetchall()
    to_clear = [r[0] for r in rows]

    # Tắt tất cả foreign key constraints
    fks = db.execute(text(
        "SELECT fk.name AS fk_name, OBJECT_NAME(fk.parent_object_id) AS table_name FROM sys.foreign_keys fk"
    )).fetchall()
    for fk_name, table_name in fks:
        db.execute(text(f"ALTER TABLE [{table_name}] NOCHECK CONSTRAINT [{fk_name}]"))

    # Xóa dữ liệu các bảng cần xóa (ngược thứ tự phụ thuộc để an toàn)
    for t in reversed(to_clear):
        try:
            db.execute(text(f"DELETE FROM [{t}]"))
        except Exception as te:
            print(f"Warning deleting {t}: {te}")

    # Bật lại foreign key constraints
    for fk_name, table_name in fks:
        db.execute(text(f"ALTER TABLE [{table_name}] WITH CHECK CHECK CONSTRAINT [{fk_name}]"))

    db.commit()
    print('Cleared tables:', to_clear)
except Exception as e:
    db.rollback()
    print('ERROR:', e)
    raise
finally:
    db.close()
