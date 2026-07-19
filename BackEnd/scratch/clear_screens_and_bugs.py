import os
import sys
import shutil
from sqlalchemy import text

# Add BackEnd directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config.database import SessionLocal

TABLES = [
    "screen_bug_images",
    "screen_bug_updates",
    "screen_bugs",
    "system_guides",
    "system_components",
    "system_screens"
]

def clear_data():
    db = SessionLocal()
    try:
        print("Clearing screen and bug database tables...")
        for table in TABLES:
            # Check if table exists
            check_table_sql = f"""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = '{table}'
            """
            exists = db.execute(text(check_table_sql)).scalar()
            if not exists:
                print(f"Table '{table}' does not exist. Skipping.")
                continue

            count_before = db.execute(text(f"SELECT COUNT(*) FROM [{table}]")).scalar()
            db.execute(text(f"DELETE FROM [{table}]"))
            print(f"Deleted {count_before} rows from '{table}'.")
        
        db.commit()
        print("Database commit successful.")
        
        # Clear uploads folder
        upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", "uploads", "screen_bugs"))
        if os.path.exists(upload_dir):
            print(f"Clearing uploads directory: {upload_dir}")
            for filename in os.listdir(upload_dir):
                file_path = os.path.join(upload_dir, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                    print(f"Deleted file: {filename}")
                except Exception as e:
                    print(f"Failed to delete {file_path}. Reason: {e}")
        else:
            print(f"Uploads directory '{upload_dir}' does not exist.")
            
    except Exception as e:
        db.rollback()
        print(f"Error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_data()
