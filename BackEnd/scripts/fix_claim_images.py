# -*- coding: utf-8 -*-
import os
import re
import json
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import SessionLocal
from modules.claim.models.claim_models import CustomerClaim

def main():
    db = SessionLocal()
    try:
        claims = db.query(CustomerClaim).all()
        print(f"Total claims in database: {len(claims)}")
        
        static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
        images_dir = os.path.join(static_dir, "uploads", "claim_imports", "images")
        
        updated_count = 0
        
        for c in claims:
            # Check if claim_code matches YYYYMMDD_HHMMSS_X pattern
            match = re.match(r"^(\d{8}_\d{6})_(\d+)$", c.claim_code)
            if not match:
                # Also check JSON seeder pattern: batch_id_Cabinet#X_Y
                match = re.match(r"^(\d{8}_\d{6})_Cabinet#(\d+)_(\d+)$", c.claim_code)
                
            if match:
                batch_id = match.group(1)
                cabinet_no = match.group(2)
                
                # Check if batch directory exists
                batch_dir = os.path.join(images_dir, batch_id)
                if os.path.exists(batch_dir):
                    # Scan for files matching cabinet_{cabinet_no}_page_*.png
                    files = os.listdir(batch_dir)
                    pattern = rf"^cabinet_{cabinet_no}_page_.*\.png$"
                    matched_files = [f for f in files if re.match(pattern, f)]
                    
                    # Sort files so page order is correct
                    matched_files.sort()
                    
                    if matched_files:
                        paths = []
                        captions = []
                        for filename in matched_files:
                            rel_path = f"/static/uploads/claim_imports/images/{batch_id}/{filename}"
                            paths.append(rel_path)
                            
                            # Extract page number for caption
                            page_match = re.search(r"page_(\d+)", filename)
                            page_str = page_match.group(1) if page_match else "N/A"
                            captions.append(f"Cabinet #{cabinet_no} (Trang {page_str})")
                            
                        # Update DB if different
                        paths_json = json.dumps(paths)
                        captions_json = json.dumps(captions)
                        
                        if c.image_paths != paths_json or c.image_captions != captions_json:
                            c.image_paths = paths_json
                            c.image_captions = captions_json
                            updated_count += 1
                            print(f"Updated claim {c.claim_code}: found {len(paths)} images.")
                            
        if updated_count > 0:
            db.commit()
            print(f"Successfully committed updates for {updated_count} claims.")
        else:
            print("No claims needed updates.")
            
    except Exception as e:
        db.rollback()
        print(f"Error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
