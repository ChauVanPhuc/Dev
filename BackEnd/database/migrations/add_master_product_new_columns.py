import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import engine
from sqlalchemy import text

def run_migration():
    columns = [
        ("new_name", "NVARCHAR(255) NULL"),
        ("brand_name", "NVARCHAR(100) NULL"),
        ("adjusted_date", "DATETIME NULL"),
        ("image_url", "NVARCHAR(500) NULL"),
        ("total_category_count", "INT NULL DEFAULT 0")
    ]
    
    with engine.begin() as conn:
        for col_name, col_type in columns:
            sql = text(f"""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID('master_products') 
                    AND name = '{col_name}'
                )
                BEGIN
                    ALTER TABLE master_products ADD {col_name} {col_type};
                    PRINT 'Added column {col_name}';
                END
            """)
            conn.execute(sql)
            print(f"[MIGRATION] Processed column: {col_name}")

if __name__ == "__main__":
    run_migration()
