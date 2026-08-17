import sys
import os
import json
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.database import engine
from sqlalchemy import text

# Tables that must NOT be deleted
PRESERVED_TABLES = {
    'accounts',
    'system_sidebars'
}

def clear_database():
    print("=" * 60)
    print("STARTING DATABASE CLEANUP OPERATION")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Preserved tables: {list(PRESERVED_TABLES)}")
    print("=" * 60)

    backup_dir = os.path.join(os.path.dirname(__file__), '..', 'database', 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    backup_file = os.path.join(backup_dir, f"backup_before_clear_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")

    with engine.connect() as conn:
        # Step 1: Get all tables
        res = conn.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"))
        all_tables = [row[0] for row in res.fetchall()]
        print(f"Total tables found in database: {len(all_tables)}")

        # Step 2: Backup non-empty tables to JSON
        print("\n--- STEP 1: CREATING SNAPSHOT BACKUP ---")
        snapshot_data = {}
        for t in all_tables:
            try:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM [{t}]")).scalar()
                if cnt > 0:
                    rows = conn.execute(text(f"SELECT * FROM [{t}]")).mappings().all()
                    snapshot_data[t] = [dict(r) for r in rows]
                    print(f"  [BACKUP] Backed up {cnt} rows from [{t}]")
            except Exception as e:
                print(f"  [BACKUP WARNING] Could not backup [{t}]: {e}")

        # Serialize datetime / decimal to string for JSON
        def default_serializer(obj):
            if hasattr(obj, 'isoformat'):
                return obj.isoformat()
            return str(obj)

        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(snapshot_data, f, ensure_ascii=False, indent=2, default=default_serializer)
        print(f"[SUCCESS] Snapshot backup saved to: {backup_file}")

        # Step 3: Disable all foreign key constraints
        print("\n--- STEP 2: DISABLING ALL FOREIGN KEY CONSTRAINTS ---")
        conn.execute(text("EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT all'"))
        conn.commit()
        print("[SUCCESS] All foreign key constraints disabled.")

        # Step 4: Delete records from all tables except preserved ones
        print("\n--- STEP 3: CLEARING TARGET TABLES ---")
        deleted_tables = []
        for t in all_tables:
            if t.lower() in PRESERVED_TABLES:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM [{t}]")).scalar()
                print(f"  [PRESERVED] Skipping [{t}] (currently has {cnt} rows)")
                continue

            try:
                # Delete rows
                conn.execute(text(f"DELETE FROM [{t}]"))
                conn.commit()
                deleted_tables.append(t)

                # Try to reseed identity column if it exists
                try:
                    conn.execute(text(f"DBCC CHECKIDENT ('[{t}]', RESEED, 0)"))
                    conn.commit()
                except Exception:
                    pass # Table may not have an identity column

                print(f"  [CLEARED] [{t}] -> 0 rows")
            except Exception as e:
                print(f"  [ERROR] Failed to clear [{t}]: {e}")

        # Step 5: Clean up any invalid foreign key values in preserved accounts if needed
        print("\n--- STEP 4: SANITIZING ACCOUNTS REFERENCES ---")
        try:
            # Set department_id, permission_id, factory_id to NULL if those parent tables are cleared
            conn.execute(text("UPDATE accounts SET department_id = NULL, permission_id = NULL, factory_id = NULL"))
            conn.commit()
            print("[SUCCESS] Account references sanitized to NULL.")
        except Exception as e:
            print(f"[WARNING] Account sanitization: {e}")

        # Step 6: Re-enable foreign key constraints
        print("\n--- STEP 5: RE-ENABLING ALL FOREIGN KEY CONSTRAINTS ---")
        try:
            conn.execute(text("EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all'"))
            conn.commit()
            print("[SUCCESS] All foreign key constraints re-enabled.")
        except Exception as e:
            print(f"[WARNING] Error re-enabling constraints: {e}")

        # Step 7: Verify final table counts
        print("\n--- STEP 6: VERIFYING TABLE ROW COUNTS ---")
        non_zero_tables = []
        for t in all_tables:
            try:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM [{t}]")).scalar()
                if cnt > 0:
                    non_zero_tables.append((t, cnt))
            except Exception as e:
                print(f"  [ERROR] Count check failed for [{t}]: {e}")

        print(f"\nFinal summary of non-empty tables ({len(non_zero_tables)} tables):")
        for t, cnt in non_zero_tables:
            print(f"  - [{t}]: {cnt} rows")

        print("\n" + "=" * 60)
        print("DATABASE CLEANUP COMPLETED SUCCESSFULLY!")
        print("=" * 60)

if __name__ == '__main__':
    clear_database()
