# -*- coding: utf-8 -*-
from sqlalchemy import text
from config.database import engine

def migrate():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Add columns
            print("Adding role_id and permission_id columns to employees table...")
            try:
                conn.execute(text("ALTER TABLE employees ADD role_id INT NULL"))
            except Exception as e:
                print(f"role_id column already exists or error: {e}")
                
            try:
                conn.execute(text("ALTER TABLE employees ADD permission_id INT NULL"))
            except Exception as e:
                print(f"permission_id column already exists or error: {e}")
            
            # Add constraints
            print("Adding foreign key constraints...")
            try:
                conn.execute(text("ALTER TABLE employees ADD CONSTRAINT FK_employees_role_id FOREIGN KEY (role_id) REFERENCES roles(id)"))
            except Exception as e:
                print(f"FK_employees_role_id already exists or error: {e}")
                
            try:
                conn.execute(text("ALTER TABLE employees ADD CONSTRAINT FK_employees_permission_id FOREIGN KEY (permission_id) REFERENCES permissions(id)"))
            except Exception as e:
                print(f"FK_employees_permission_id already exists or error: {e}")
                
            trans.commit()
            print("Migration completed successfully!")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
