# -*- coding: utf-8 -*-
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        conn.execute(text("""
            IF COL_LENGTH('permissions', 'department_id') IS NULL
            BEGIN
                ALTER TABLE permissions ADD department_id INT NULL;
            END
        """))
        conn.commit()
        print("Successfully added department_id to permissions table.")

if __name__ == "__main__":
    run_migration()
