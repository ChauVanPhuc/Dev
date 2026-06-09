import sys
import os
from sqlalchemy import text

# Add root and BackEnd folders to PYTHONPATH to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from config.database import SessionLocal

def create_user_defect_tracking_table():
    db = SessionLocal()
    try:
        # Check if table already exists
        check_sql = text("""
            SELECT * FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'user_defect_trackings'
        """)
        result = db.execute(check_sql).fetchone()
        
        if result:
            print("Table 'user_defect_trackings' already exists. Skipping migration.")
            return
        
        # Create user_defect_trackings table
        # user_id references accounts.id
        # defect_id references defect_types.id
        create_sql = text("""
            CREATE TABLE user_defect_trackings (
                id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT NOT NULL,
                defect_id INT NOT NULL,
                created_at DATETIME DEFAULT GETDATE(),
                CONSTRAINT FK_UserDefectTracking_User FOREIGN KEY (user_id) REFERENCES accounts(id),
                CONSTRAINT FK_UserDefectTracking_Defect FOREIGN KEY (defect_id) REFERENCES defect_types(id)
            )
        """)
        db.execute(create_sql)
        db.commit()
        print("SUCCESS: Created 'user_defect_trackings' table.")
        
    except Exception as e:
        print(f"ERROR: Failed to create table: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_user_defect_tracking_table()
