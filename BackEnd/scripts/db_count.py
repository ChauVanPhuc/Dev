# -*- coding: utf-8 -*-
import os
import sys
from dotenv import load_dotenv

# Set PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from config.database import SessionLocal
from modules.claim.models.claim_models import CustomerClaim
from sqlalchemy import text

def check_db():
    db = SessionLocal()
    try:
        # 1. SQLAlchemy count
        sq_count = db.query(CustomerClaim).count()
        print(f"SQLAlchemy CustomerClaim.count(): {sq_count}")
        
        # 2. Raw SQL count
        raw_count = db.execute(text("SELECT COUNT(*) FROM customer_claims")).scalar()
        print(f"Raw SQL SELECT COUNT(*) FROM customer_claims: {raw_count}")
        
        # 3. Raw SQL select all length
        raw_rows = db.execute(text("SELECT * FROM customer_claims")).fetchall()
        print(f"Raw SQL SELECT * FROM customer_claims length: {len(raw_rows)}")
        
        # 4. Check if there are other claims imported
        from modules.claim.controllers import claim_controller
        items, total = claim_controller.get_claims(db, skip=0, limit=1000)
        print(f"claim_controller.get_claims total count: {total}")
        print(f"claim_controller.get_claims items length (limit 1000): {len(items)}")
        
    except Exception as e:
        print(f"Error checking database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
