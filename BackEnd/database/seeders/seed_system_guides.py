"""
Seeder script to populate system_guides table with initial workflow steps from seeded_guides.json.
"""
import sys
import os
import json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text
from config.database import SessionLocal, engine, Base
from datetime import datetime
import unicodedata
import re

# Ensure models are registered
import app.models

def normalize_title(title):
    if not title:
        return ""
    text = unicodedata.normalize('NFD', title)
    text = "".join([c for c in text if unicodedata.category(c) != 'Mn'])
    text = text.replace('đ', 'd').replace('Đ', 'd')
    text = re.sub(r'[^a-zA-Z0-9]', '', text)
    return text.lower()

def seed_guides():
    # Load extracted guides
    json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "scratch", "seeded_guides.json"))
    if not os.path.exists(json_path):
        print(f"[ERROR] seeded_guides.json not found at {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        seeded_data = json.load(f)

    db = SessionLocal()
    try:
        # Create tables if not exist (precaution)
        Base.metadata.create_all(bind=engine)

        # Clear existing guides first to avoid duplicates when running multiple times
        db.execute(text("DELETE FROM system_guides"))
        db.commit()
        print("[OK] Cleared system_guides table.")

        added_count = 0
        skipped_count = 0

        # Query all screens
        screens = db.execute(text("SELECT id, title, platform FROM system_screens")).fetchall()
        
        # Build map of (platform, normalized_title) -> screen_id
        screen_map = {}
        for s_id, title, platform in screens:
            norm = normalize_title(title)
            screen_map[(platform.lower(), norm)] = s_id

        # Seed guides
        for item in seeded_data:
            platform = item["platform"].lower()
            slug = item["slug"]
            workflows = item["workflows"]

            key = (platform, slug)
            screen_id = screen_map.get(key)
            if not screen_id:
                # Try key without platform constraint (since title normalize is unique-ish)
                matching_ids = [s_id for (p, s), s_id in screen_map.items() if s == slug]
                if matching_ids:
                    screen_id = matching_ids[0]

            if not screen_id:
                print(f"[SKIP] Screen with slug '{slug}' ({item['platform']}) not found in database.")
                skipped_count += len(workflows)
                continue

            for step in workflows:
                # Parse step values
                step_number = step.get("step")
                title = step.get("title")
                desc = step.get("desc")
                comp = step.get("component")
                
                # Check required fields
                if not step_number or not title:
                    continue

                # Insert guide step
                insert_sql = text("""
                    INSERT INTO system_guides (screen_id, step_number, title, related_components, description, updated_at)
                    VALUES (:screen_id, :step_number, :title, :related_components, :description, :updated_at)
                """)
                db.execute(insert_sql, {
                    "screen_id": screen_id,
                    "step_number": int(step_number),
                    "title": title,
                    "related_components": comp or "",
                    "description": desc or "",
                    "updated_at": datetime.now()
                })
                added_count += 1

        db.commit()
        print("-" * 50)
        print(f"[SUCCESS] Seeding guides completed: Added {added_count}, Skipped {skipped_count}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding guides failed: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_guides()
