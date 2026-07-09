#!/usr/bin/env python3
"""
Script to clear all import data (DB claims, JSON files, Excel files, images).
Use this to start fresh for testing.
"""
import os
import sys
import shutil
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("clear_import_data")

from config.database import SessionLocal
from modules.claim.models.claim_models import CustomerClaim

# Paths
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLAIM_IMPORTS_DIR = os.path.join(BACKEND_DIR, "claim_imports")
JSON_DIR = os.path.join(CLAIM_IMPORTS_DIR, "json")
EXCEL_DIR = os.path.join(CLAIM_IMPORTS_DIR, "excel")
UPLOADS_DIR = os.path.join(CLAIM_IMPORTS_DIR, "uploads")

BACKEND_STATIC_DIR = os.path.join(BACKEND_DIR, "static")
IMAGES_DIR = os.path.join(BACKEND_STATIC_DIR, "uploads", "claim_imports", "images")

def clear_db_claims(db_session):
    """Clear all claims from customer_claims table."""
    try:
        count = db_session.query(CustomerClaim).count()
        logger.info(f"Found {count} claims in customer_claims table")
        
        if count > 0:
            db_session.query(CustomerClaim).delete()
            db_session.commit()
            logger.info(f"Cleared {count} claims from customer_claims table")
        else:
            logger.info("No claims to clear in customer_claims table")
    except Exception as e:
        logger.error(f"Error clearing DB claims: {e}")
        db_session.rollback()
        raise

def clear_directory(directory_path, description):
    """Clear all files in a directory."""
    if not os.path.exists(directory_path):
        logger.info(f"{description} directory does not exist: {directory_path}")
        return
    
    try:
        # Count files before deletion
        files = os.listdir(directory_path)
        file_count = len(files)
        
        if file_count == 0:
            logger.info(f"{description} directory is already empty")
            return
        
        # Delete all files and subdirectories
        for item in files:
            item_path = os.path.join(directory_path, item)
            if os.path.isfile(item_path):
                os.remove(item_path)
            elif os.path.isdir(item_path):
                shutil.rmtree(item_path)
        
        logger.info(f"Cleared {file_count} items from {description} directory")
    except Exception as e:
        logger.error(f"Error clearing {description} directory: {e}")
        raise

def main():
    """Main function to clear all import data."""
    logger.info("Starting to clear all import data...")
    
    # Clear DB claims
    db = SessionLocal()
    try:
        clear_db_claims(db)
    finally:
        db.close()
    
    # Clear JSON files
    clear_directory(JSON_DIR, "JSON")
    
    # Clear Excel files
    clear_directory(EXCEL_DIR, "Excel")
    
    # Clear images (batch directories)
    clear_directory(IMAGES_DIR, "Images")
    
    # Clear uploads (PDF files)
    clear_directory(UPLOADS_DIR, "Uploads")
    
    logger.info("Successfully cleared all import data!")

if __name__ == "__main__":
    main()
