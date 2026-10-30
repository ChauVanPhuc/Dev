import sys
import os

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from config.database import engine
from sqlalchemy import text

def run_migration():
    print("[MIGRATION] Checking/creating table iso_master_record_processes...")
    sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='iso_master_record_processes' AND xtype='U')
    BEGIN
        CREATE TABLE iso_master_record_processes (
            id INT IDENTITY(1,1) PRIMARY KEY,
            master_record_id INT NOT NULL,
            process_id INT NOT NULL,
            created_at NVARCHAR(50) NULL,
            CONSTRAINT FK_mrp_master FOREIGN KEY (master_record_id) 
                REFERENCES iso_master_records(id) ON DELETE CASCADE,
            CONSTRAINT FK_mrp_process FOREIGN KEY (process_id) 
                REFERENCES iso_processes(id) ON DELETE CASCADE,
            CONSTRAINT UQ_master_record_process UNIQUE (master_record_id, process_id)
        );
        CREATE INDEX IX_mrp_master_id ON iso_master_record_processes(master_record_id);
        CREATE INDEX IX_mrp_process_id ON iso_master_record_processes(process_id);
        PRINT 'Table iso_master_record_processes created successfully.';
    END
    ELSE
    BEGIN
        PRINT 'Table iso_master_record_processes already exists.';
    END
    """
    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()
    print("[MIGRATION] Done.")

if __name__ == "__main__":
    run_migration()

