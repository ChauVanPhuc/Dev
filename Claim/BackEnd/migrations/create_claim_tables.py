# -*- coding: utf-8 -*-
"""
Migration script to create claim module tables:
- customer_claims
- cabinet_prices
"""
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text
from app.core.database import engine, SessionLocal

def upgrade():
    """Create claim module tables if they don't exist"""
    db = SessionLocal()
    
    try:
        # Check if customer_claims table exists
        customer_claims_check = db.execute(text("""
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'customer_claims'
        """)).fetchone()
        
        if not customer_claims_check:
            print("Creating customer_claims table...")
            db.execute(text("""
                CREATE TABLE customer_claims (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    claim_code NVARCHAR(50) NOT NULL UNIQUE,
                    customer_name NVARCHAR(100) NULL,
                    product_name NVARCHAR(150) NOT NULL,
                    order_code NVARCHAR(50) NULL,
                    company_error_code NVARCHAR(50) NULL,
                    description NVARCHAR(1000) NULL,
                    severity NVARCHAR(20) DEFAULT 'Medium',
                    status NVARCHAR(50) DEFAULT 'Received',
                    lpn NVARCHAR(50) NULL,
                    container_no NVARCHAR(50) NULL,
                    action NVARCHAR(200) NULL,
                    period NVARCHAR(20) NULL,
                    image_paths NVARCHAR(MAX) NULL,
                    image_captions NVARCHAR(MAX) NULL,
                    created_at DATETIME DEFAULT GETDATE(),
                    resolved_at DATETIME NULL
                )
            """))
            db.execute(text("CREATE INDEX ix_customer_claims_claim_code ON customer_claims (claim_code)"))
            db.execute(text("CREATE INDEX ix_customer_claims_status ON customer_claims (status)"))
            db.execute(text("CREATE INDEX ix_customer_claims_created_at ON customer_claims (created_at)"))
            db.commit()
            print("Successfully created customer_claims table and indexes.")
        else:
            print("customer_claims table already exists.")
        
        # Check if cabinet_prices table exists
        cabinet_prices_check = db.execute(text("""
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'cabinet_prices'
        """)).fetchone()
        
        if not cabinet_prices_check:
            print("Creating cabinet_prices table...")
            db.execute(text("""
                CREATE TABLE cabinet_prices (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    cabinet_code NVARCHAR(50) NOT NULL UNIQUE,
                    cabinet_name NVARCHAR(150) NOT NULL,
                    material NVARCHAR(100) NULL,
                    dimensions NVARCHAR(50) NULL,
                    base_price FLOAT NOT NULL,
                    sale_price FLOAT NOT NULL,
                    status NVARCHAR(50) DEFAULT 'Active',
                    last_updated DATETIME DEFAULT GETDATE()
                )
            """))
            db.execute(text("CREATE INDEX ix_cabinet_prices_cabinet_code ON cabinet_prices (cabinet_code)"))
            db.execute(text("CREATE INDEX ix_cabinet_prices_status ON cabinet_prices (status)"))
            db.commit()
            print("Successfully created cabinet_prices table and indexes.")
        else:
            print("cabinet_prices table already exists.")
            
        print("Claim module tables migration completed successfully.")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating claim tables: {e}")
        raise
    finally:
        db.close()

def downgrade():
    """Drop claim module tables"""
    db = SessionLocal()
    
    try:
        print("Dropping claim module tables...")
        db.execute(text("DROP TABLE IF EXISTS cabinet_prices"))
        db.execute(text("DROP TABLE IF EXISTS customer_claims"))
        db.commit()
        print("Successfully dropped claim module tables.")
    except Exception as e:
        db.rollback()
        print(f"Error dropping claim tables: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    upgrade()
