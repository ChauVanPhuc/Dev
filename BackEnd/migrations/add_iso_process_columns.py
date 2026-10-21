# -*- coding: utf-8 -*-
"""
Migration script to add missing columns and constraints to:
- iso_processes: department_id, department_name, file_path, new_code, doc_type_id, doc_type_code
- iso_documents: process_id
"""
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text
from app.core.database import SessionLocal

def upgrade():
    """Add missing columns, foreign keys and indexes for ISO module"""
    db = SessionLocal()
    try:
        print("Checking and applying ISO columns migration...")

        # 1. iso_processes columns
        iso_process_columns = [
            ("department_id", "INT NULL"),
            ("department_name", "NVARCHAR(100) NULL"),
            ("file_path", "NVARCHAR(500) NULL"),
            ("new_code", "NVARCHAR(100) NULL"),
            ("doc_type_id", "INT NULL"),
            ("doc_type_code", "NVARCHAR(50) NULL"),
        ]

        for col_name, col_type in iso_process_columns:
            check_col = db.execute(text("""
                SELECT 1 FROM sys.columns 
                WHERE object_id = OBJECT_ID('iso_processes') AND name = :col_name
            """), {"col_name": col_name}).fetchone()

            if not check_col:
                print(f"Adding column '{col_name}' ({col_type}) to iso_processes...")
                db.execute(text(f"ALTER TABLE iso_processes ADD {col_name} {col_type}"))
                db.commit()
                print(f" -> Added '{col_name}' successfully.")
            else:
                print(f" -> Column '{col_name}' already exists in iso_processes.")

        # Ensure iso_document_id in iso_processes is NULLABLE (for standalone processes)
        check_proc_doc_id_null = db.execute(text("""
            SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'iso_processes' AND COLUMN_NAME = 'iso_document_id'
        """)).fetchone()
        if check_proc_doc_id_null and check_proc_doc_id_null[0] == 'NO':
            print("Altering iso_processes.iso_document_id to NULL...")
            db.execute(text("ALTER TABLE iso_processes ALTER COLUMN iso_document_id INT NULL"))
            db.commit()
            print(" -> Altered iso_document_id to NULL successfully.")
        else:
            print(" -> iso_processes.iso_document_id is already NULLABLE.")

        # 2. iso_documents columns
        check_doc_proc_id = db.execute(text("""
            SELECT 1 FROM sys.columns 
            WHERE object_id = OBJECT_ID('iso_documents') AND name = 'process_id'
        """)).fetchone()

        if not check_doc_proc_id:
            print("Adding column 'process_id' (INT NULL) to iso_documents...")
            db.execute(text("ALTER TABLE iso_documents ADD process_id INT NULL"))
            db.commit()
            print(" -> Added 'process_id' to iso_documents successfully.")
        else:
            print(" -> Column 'process_id' already exists in iso_documents.")

        # 3. Add Foreign Keys safely
        # Check if iso_document_types table exists before linking FK
        has_doc_types_table = db.execute(text("SELECT 1 FROM sys.tables WHERE name = 'iso_document_types'")).fetchone()
        if has_doc_types_table:
            check_fk_doc_type = db.execute(text("""
                SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_iso_processes_doc_type'
            """)).fetchone()
            if not check_fk_doc_type:
                print("Adding FK_iso_processes_doc_type constraint...")
                db.execute(text("""
                    ALTER TABLE iso_processes
                    ADD CONSTRAINT FK_iso_processes_doc_type
                    FOREIGN KEY (doc_type_id) REFERENCES iso_document_types(id)
                    ON DELETE SET NULL
                """))
                db.commit()
                print(" -> Added FK_iso_processes_doc_type successfully.")
            else:
                print(" -> Constraint FK_iso_processes_doc_type already exists.")

        check_fk_doc_proc = db.execute(text("""
            SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_iso_documents_process'
        """)).fetchone()
        if not check_fk_doc_proc:
            print("Adding FK_iso_documents_process constraint...")
            db.execute(text("""
                ALTER TABLE iso_documents
                ADD CONSTRAINT FK_iso_documents_process
                FOREIGN KEY (process_id) REFERENCES iso_processes(id)
                ON DELETE NO ACTION
            """))
            db.commit()
            print(" -> Added FK_iso_documents_process successfully.")
        else:
            print(" -> Constraint FK_iso_documents_process already exists.")

        # 4. Add Indexes safely
        check_idx_doc_type = db.execute(text("""
            SELECT 1 FROM sys.indexes WHERE name = 'IX_iso_processes_doc_type_id'
        """)).fetchone()
        if not check_idx_doc_type:
            print("Creating index IX_iso_processes_doc_type_id...")
            db.execute(text("CREATE NONCLUSTERED INDEX IX_iso_processes_doc_type_id ON iso_processes(doc_type_id)"))
            db.commit()
            print(" -> Created IX_iso_processes_doc_type_id successfully.")

        check_idx_process_id = db.execute(text("""
            SELECT 1 FROM sys.indexes WHERE name = 'IX_iso_documents_process_id'
        """)).fetchone()
        if not check_idx_process_id:
            print("Creating index IX_iso_documents_process_id...")
            db.execute(text("CREATE NONCLUSTERED INDEX IX_iso_documents_process_id ON iso_documents(process_id)"))
            db.commit()
            print(" -> Created IX_iso_documents_process_id successfully.")

        print("=== ISO Migration completed successfully! ===")

    except Exception as e:
        db.rollback()
        print(f"Error during ISO migration: {e}")
        raise
    finally:
        db.close()

def downgrade():
    """Remove added columns, foreign keys and indexes"""
    db = SessionLocal()
    try:
        print("Reverting ISO migration...")
        # Drop FKs
        db.execute(text("ALTER TABLE iso_processes DROP CONSTRAINT IF EXISTS FK_iso_processes_doc_type"))
        db.execute(text("ALTER TABLE iso_documents DROP CONSTRAINT IF EXISTS FK_iso_documents_process"))
        
        # Drop Indexes
        db.execute(text("DROP INDEX IF EXISTS IX_iso_processes_doc_type_id ON iso_processes"))
        db.execute(text("DROP INDEX IF EXISTS IX_iso_documents_process_id ON iso_documents"))

        # Drop columns
        for col in ["department_id", "department_name", "file_path", "new_code", "doc_type_id", "doc_type_code"]:
            db.execute(text(f"ALTER TABLE iso_processes DROP COLUMN IF EXISTS {col}"))
        db.execute(text("ALTER TABLE iso_documents DROP COLUMN IF EXISTS process_id"))
        
        db.commit()
        print("Revert completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error during downgrade: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    upgrade()
