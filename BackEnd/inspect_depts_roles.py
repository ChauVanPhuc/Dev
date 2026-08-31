import sys
sys.path.insert(0, '.')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("=== 1. ROLES (PHÒNG BAN / PHÂN XƯỞNG) IN DB ===")
res_roles = db.execute(text("SELECT id, name, description FROM roles"))
for r in res_roles.fetchall():
    print(f"  Role ID={r[0]} | Name='{r[1]}' | Desc='{r[2]}'")

print("\n=== 2. PERMISSIONS (VỊ TRÍ / CHỨC DANH) IN DB ===")
res_perms = db.execute(text("SELECT id, name, description FROM permissions"))
for p in res_perms.fetchall():
    print(f"  Perm ID={p[0]} | Name='{p[1]}' | Desc='{p[2]}'")

print("\n=== 3. DEPARTMENTS (LEGACY BỘ PHẬN JUNCTION) IN DB ===")
res_depts = db.execute(text("SELECT id, name, code, role_id, permission_id, account_id FROM departments"))
for d in res_depts.fetchall():
    print(f"  Dept ID={d[0]} | Name='{d[0]}' | RoleID={d[3]} | PermID={d[4]} | AccountID={d[5]}")

print("\n=== 4. ACCOUNTS DETAILS (ROLE & DEPARTMENT & POSITION) ===")
res_accs = db.execute(text("""
    SELECT a.id, a.username, a.full_name, a.employee_id, a.permission_level, 
           a.department_id, a.permission_id, a.factory_name
    FROM accounts a
    ORDER BY a.id ASC
"""))
for acc in res_accs.fetchall():
    name = (acc[2] or '').encode('ascii', 'ignore').decode('ascii')
    factory = (acc[7] or '').encode('ascii', 'ignore').decode('ascii')
    print(f"ID={acc[0]:2d} | User={acc[1]:12s} | Name={name:20s} | DeptID={acc[5]} | PermID={acc[6]} | Factory={factory:20s}")

db.close()
