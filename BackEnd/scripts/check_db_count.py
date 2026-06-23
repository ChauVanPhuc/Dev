#!/usr/bin/env python3
"""
Script to check current count in customer_claims table.
"""
import os
import sys
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("check_db_count")

from config.database import SessionLocal
from modules.claim.models.claim_models import CustomerClaim

def main():
    """Check current count in customer_claims table."""
    db = SessionLocal()
    try:
        count = db.query(CustomerClaim).count()
        logger.info(f"Current count in customer_claims table: {count}")
        
        if count > 0:
            # Show first 5 claims
            claims = db.query(CustomerClaim).limit(5).all()
            logger.info(f"First 5 claims:")
            for claim in claims:
                logger.info(f"  - ID: {claim.id}, claim_code: {claim.claim_code}, period: {claim.period}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
