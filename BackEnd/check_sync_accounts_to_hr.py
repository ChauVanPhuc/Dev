import sys
sys.path.insert(0, '.')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# Query all accounts
res_acc = db.execute(text("SELECT id, username, full_name, employee_id, phone, department_id, permission_id FROM accounts"))
accounts = res_acc.fetchall()
print(f"=== TOTAL ACCOUNTS: {len(accounts)} ===")

# Query all hr_employees
res_hr = db.execute(text("SELECT id, employee_id, full_name, phone, department_id FROM hr_employees"))
hr_emps = res_hr.fetchall()
print(f"=== TOTAL HR EMPLOYEES: {len(hr_emps)} ===")

# Map existing HR employee_ids
hr_emp_ids = {e[1] for e in hr_emps if e[1]}

missing_in_hr = []
for acc in accounts:
    emp_id = acc[3]
    if not emp_id or emp_id not in hr_emp_ids:
        missing_in_hr.append(acc)

print(f"\nFound {len(missing_in_hr)} accounts missing in hr_employees:")
for a in missing_in_hr:
    name = (a[2] or '').encode('ascii', 'ignore').decode('ascii')
    print(f"  Account ID={a[0]} | User={a[1]} | Name={name} | EmpID={a[3]}")

db.close()
