# -*- coding: utf-8 -*-
from sqlalchemy import text
from config.database import engine

def migrate():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Drop old foreign key constraint
            print("Dropping foreign key FK__org_struc__accou__4979DDF4...")
            conn.execute(text("ALTER TABLE org_structures DROP CONSTRAINT FK__org_struc__accou__4979DDF4"))
            
            # 2. Rename column account_id to employee_id
            print("Renaming column account_id to employee_id...")
            conn.execute(text("EXEC sp_rename 'org_structures.account_id', 'employee_id', 'COLUMN'"))
            
            # 3. Add new foreign key constraint pointing to employees(id)
            print("Adding new foreign key constraint FK_org_structures_employee_id...")
            conn.execute(text("ALTER TABLE org_structures ADD CONSTRAINT FK_org_structures_employee_id FOREIGN KEY (employee_id) REFERENCES employees(id)"))
            
            trans.commit()
            print("Migration completed successfully!")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
