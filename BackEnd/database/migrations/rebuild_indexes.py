"""
Migration: Rebuild all indexes for performance optimization
Run this periodically (e.g., every 6-12 months) to defragment indexes
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db

def rebuild_indexes():
    """Rebuild all indexes to optimize performance"""
    db = next(get_db())
    try:
        print("Starting index rebuild process...")
        print("This may take several minutes depending on database size.")
        print()
        
        # List of tables to rebuild indexes
        tables = [
            'bom_details',
            'deliveries',
            'input_inspections',
            'orders',
            'products',
            'delivery_details',
            'equipments',
            'equipment_inspections',
            'equipment_trainings',
            'kpi_checklists',
            'kpi_employee_items',
            'kpi_violations',
            'kpi_feedbacks'
        ]
        
        for table in tables:
            # Check if table exists in database
            check_sql = text("SELECT 1 FROM sys.tables WHERE name = :t")
            has_table = db.execute(check_sql, {"t": table}).fetchone()
            if not has_table:
                print(f"[SKIP] Table '{table}' does not exist in database.")
                continue

            try:
                print(f"Rebuilding indexes for {table}...")
                rebuild_sql = text(f"ALTER INDEX ALL ON {table} REBUILD")
                db.execute(rebuild_sql)
                db.commit()
                print(f"[OK] Rebuilt indexes for {table}")
            except Exception as table_err:
                db.rollback()
                err_clean = str(table_err).encode('ascii', errors='ignore').decode('ascii')
                print(f"[SKIP] Index rebuild skipped for {table}: {err_clean.splitlines()[0]}")
        
        print()
        print("[SUCCESS] All indexes have been processed/rebuilt successfully!")
        print("Database performance should now be optimized.")
        
    except Exception as e:
        db.rollback()
        err_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
        print(f"[ERROR] Index rebuild process failed: {err_msg}")
        raise


if __name__ == "__main__":
    rebuild_indexes()
