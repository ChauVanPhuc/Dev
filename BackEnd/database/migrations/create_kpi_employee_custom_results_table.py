"""
Migration script to create table 'kpi_employee_custom_results' for manual KPI result overrides.
"""
import sys
import os
import io

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db

def migrate():
    db = next(get_db())
    try:
        print("--- Checking and creating 'kpi_employee_custom_results' table ---")
        
        table_check = db.execute(text("""
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'kpi_employee_custom_results'
        """)).fetchone()

        if table_check:
            print("[INFO] Table 'kpi_employee_custom_results' already exists.")
        else:
            db.execute(text("""
                CREATE TABLE kpi_employee_custom_results (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    employee_id NVARCHAR(50) NOT NULL,
                    kpi_code NVARCHAR(50) NOT NULL,
                    kpi_item_id INT NULL,
                    month INT NOT NULL,
                    year INT NOT NULL DEFAULT 2026,
                    custom_actual NVARCHAR(100) NOT NULL,
                    custom_score FLOAT NOT NULL,
                    reason NVARCHAR(500) NULL,
                    modified_by NVARCHAR(100) NULL,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT UQ_emp_kpi_period UNIQUE (employee_id, kpi_code, month, year)
                )
            """))
            print("[OK] Created table 'kpi_employee_custom_results' successfully.")

            # Create index for query performance
            db.execute(text("""
                CREATE INDEX IX_kpi_custom_emp_month ON kpi_employee_custom_results (employee_id, month, year)
            """))
            print("[OK] Created index IX_kpi_custom_emp_month.")

        db.commit()
        print("[SUCCESS] Migration for 'kpi_employee_custom_results' completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == '__main__':
    migrate()

