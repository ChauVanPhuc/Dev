import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("=== TẤT CẢ ACCOUNTS & EMPLOYEES TRONG DB ===")
    rows = conn.execute(text('''
        SELECT a.id as acc_id, a.username, a.full_name, a.factory_name, 
               e.employee_id as emp_code, e.department, e.position, e.status
        FROM accounts a
        LEFT JOIN employees e ON a.employee_id = e.id
        ORDER BY a.factory_name, e.department, a.id
    ''')).fetchall()
    
    for r in rows:
        d = dict(r._mapping)
        name = d['full_name'] or 'N/A'
        username = d['username'] or 'N/A'
        dept = d['department'] or 'N/A'
        pos = d['position'] or 'N/A'
        fac = d['factory_name'] or 'N/A'
        emp_code = d['emp_code'] or 'N/A'
        print(f"ID: {d['acc_id']:2d} | Code: {emp_code:15s} | User: {username:15s} | Name: {name:25s} | Dept: {dept:25s} | Pos: {pos:15s} | Fac: {fac}")

    print("\n=== TẤT CẢ EMPLOYEES CHƯA CÓ ACCOUNT ===")
    emps_only = conn.execute(text('''
        SELECT e.id, e.employee_id, e.full_name, e.department, e.position, e.status
        FROM employees e
        WHERE e.id NOT IN (SELECT employee_id FROM accounts WHERE employee_id IS NOT NULL)
    ''')).fetchall()
    for e in emps_only:
        d = dict(e._mapping)
        print(f"EmpID: {d['id']:2d} | Code: {d['employee_id']:15s} | Name: {d['full_name']:25s} | Dept: {d['department'] or 'N/A':25s} | Pos: {d['position'] or 'N/A'}")
