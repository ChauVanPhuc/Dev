#!/usr/bin/env python3
"""
Script to import existing JSON batch files into the database.
This populates the DB with claims from JSON import files.
"""
import os
import sys
import json
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("import_json_to_db")

from config.database import SessionLocal
from modules.claim.controllers import claim_controller as db_controllers
from modules.claim.schemas.claim_schemas import CustomerClaimCreate

# Paths
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_DIR = os.path.join(BACKEND_DIR, "modules", "claim_imports", "json")

def import_json_batch_to_db(json_file_path: str, db_session):
    """Import a single JSON batch file into the database."""
    with open(json_file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if not data.get("success"):
        logger.warning(f"Skipping {json_file_path}: success=False")
        return 0
    
    batch_id = data.get("batch_id")
    claims = data.get("records") or data.get("claims", [])
    
    if not claims:
        logger.warning(f"Skipping {json_file_path}: no claims found")
        return 0
    
    logger.info(f"Processing batch {batch_id} with {len(claims)} claims")
    
    saved_count = 0
    for c in claims:
        try:
            # Generate claim_code from cabinet_no if missing
            code = c.get("claim_code")
            if not code and c.get("cabinet_no") is not None:
                # Use batch_id + cabinet_no + stt to ensure uniqueness
                stt = c.get("stt", 0)
                code = f"{batch_id}_Cabinet#{c['cabinet_no']}_{stt}"
            
            # Map JSON fields to Schema
            claim_data = CustomerClaimCreate(
                claim_code=code,
                customer_name=c.get("customer_name") or "Atlas",
                product_name=c.get("sku"),
                order_code=c.get("defect_code"),
                company_error_code=c.get("company_error_code"),
                description=c.get("claim_description"),
                severity=c.get("severity") or "Medium",
                status="Received",
                lpn=c.get("lpn"),
                container_no=c.get("container_no"),
                action=c.get("action"),
                period=c.get("period"),
                image_paths=c.get("image_paths"),
                image_captions=c.get("image_captions")
            )
            
            db_controllers.create_claim(db_session, claim_data)
            saved_count += 1
            
            if saved_count % 50 == 0:
                logger.info(f"Saved {saved_count}/{len(claims)} claims for batch {batch_id}")
                
        except Exception as e:
            logger.error(f"Failed to save claim {code} from {batch_id}: {e}")
            continue
    
    logger.info(f"Successfully saved {saved_count}/{len(claims)} claims from batch {batch_id}")
    return saved_count

def main():
    """Main function to import all JSON batches."""
    db = SessionLocal()
    
    try:
        # Get all JSON batch files
        json_files = []
        for filename in os.listdir(JSON_DIR):
            if filename.endswith("_claims.json") and filename != "manual_claims.json":
                json_files.append(os.path.join(JSON_DIR, filename))
        
        logger.info(f"Found {len(json_files)} JSON batch files to import")
        
        total_saved = 0
        for json_file in json_files:
            try:
                saved = import_json_batch_to_db(json_file, db)
                total_saved += saved
            except Exception as e:
                logger.error(f"Failed to import {json_file}: {e}")
                continue
        
        db.commit()
        logger.info(f"Total claims imported to DB: {total_saved}")
        
    except Exception as e:
        logger.error(f"Error during import: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
