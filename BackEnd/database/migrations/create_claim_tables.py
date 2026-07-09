# -*- coding: utf-8 -*-
"""
Migration script to create claim module tables:
- customer_claims
- cabinet_prices  
- container_shipments
"""

from sqlalchemy import text
from config.database import engine, SessionLocal

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
        
        # Check if container_shipments table exists
        container_shipments_check = db.execute(text("""
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'container_shipments'
        """)).fetchone()
        
        if not container_shipments_check:
            print("Creating container_shipments table...")
            db.execute(text("""
                CREATE TABLE container_shipments (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    shipment_code NVARCHAR(50) NOT NULL UNIQUE,
                    container_number NVARCHAR(50) NOT NULL,
                    seal_number NVARCHAR(50) NULL,
                    destination_port NVARCHAR(100) NOT NULL,
                    etd DATETIME NULL,
                    eta DATETIME NULL,
                    status NVARCHAR(50) DEFAULT 'Draft',
                    total_value FLOAT DEFAULT 0.0,
                    created_at DATETIME DEFAULT GETDATE()
                )
            """))
            db.execute(text("CREATE INDEX ix_container_shipments_shipment_code ON container_shipments (shipment_code)"))
            db.execute(text("CREATE INDEX ix_container_shipments_container_number ON container_shipments (container_number)"))
            db.execute(text("CREATE INDEX ix_container_shipments_status ON container_shipments (status)"))
            db.execute(text("CREATE INDEX ix_container_shipments_created_at ON container_shipments (created_at)"))
            db.commit()
            print("Successfully created container_shipments table and indexes.")
        else:
            print("container_shipments table already exists.")
            
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
        
        # Drop tables in reverse order of creation (due to potential foreign keys)
        db.execute(text("DROP TABLE IF EXISTS container_shipments"))
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
