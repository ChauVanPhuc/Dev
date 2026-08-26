import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("=== CHI TIẾT TỪNG TÀI KHOẢN TRONG BẢNG ACCOUNTS ===")
    accounts = conn.execute(text('''
        SELECT a.id, a.username, a.full_name, a.factory_name, a.permission_level, 
               p.name as perm_name, d.name as dept_name, a.is_mobile_allowed, a.is_web_allowed
        FROM accounts a
        LEFT JOIN permissions p ON a.permission_id = p.id
        LEFT JOIN departments d ON a.department_id = d.id
        ORDER BY a.factory_name, d.name, a.id
    ''')).fetchall()
    
    for a in accounts:
        d = dict(a._mapping)
        name = d['full_name'] or 'N/A'
        user = d['username'] or 'N/A'
        dept = d['dept_name'] or 'N/A'
        perm = d['perm_name'] or 'N/A'
        fac = d['factory_name'] or 'N/A'
        print(f"ID: {d['id']:2d} | User: {user:15s} | Name: {name:25s} | Dept: {dept:25s} | Perm: {perm:20s} | Fac: {fac}")
