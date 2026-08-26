# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from config.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# Find all tables with columns containing stage or string columns
sql = """
SELECT t.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS c
JOIN INFORMATION_SCHEMA.TABLES t ON c.TABLE_NAME = t.TABLE_NAME
WHERE c.DATA_TYPE IN ('nvarchar', 'varchar', 'nchar', 'char', 'text', 'ntext')
AND t.TABLE_TYPE = 'BASE TABLE'
"""
rows = db.execute(text(sql)).fetchall()

found = []
for table, col, dtype in rows:
    try:
        q = f"SELECT DISTINCT [{col}] FROM [{table}] WHERE [{col}] LIKE N'%Nhập Kho%' OR [{col}] LIKE N'%Nhap Kho%'"
        vals = db.execute(text(q)).fetchall()
        for v in vals:
            if v[0]:
                found.append((table, col, v[0]))
    except Exception as e:
        pass

print(f"Total found occurrences: {len(found)}")
for t, c, v in found:
    print(f"Table [{t}].[{c}] -> '{v}'")

db.close()
