import sys
import os

# Add root and BackEnd folders to PYTHONPATH to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from config.database import SessionLocal
from modules.inspection.models.defect_type import DefectType

def seed_defect_types():
    db = SessionLocal()
    try:
        defects = [
            {"name": "Bề mặt xước", "category": "visual", "needs_tracking": True},
            {"name": "Lệch màu", "category": "visual", "needs_tracking": True},
            {"name": "Bọt khí", "category": "visual", "needs_tracking": False},
            {"name": "Rỗ bề mặt", "category": "visual", "needs_tracking": False},
            {"name": "Ố vàng", "category": "visual", "needs_tracking": False},
            {"name": "Loang dầu", "category": "visual", "needs_tracking": False},
            {"name": "Trầy xước sơn", "category": "visual", "needs_tracking": True},
            {"name": "Bám bụi bẩn", "category": "visual", "needs_tracking": False},
            {"name": "Sai kích thước bao", "category": "structure", "needs_tracking": True},
            {"name": "Móp méo góc", "category": "structure", "needs_tracking": False},
            {"name": "Độ dày không đều", "category": "structure", "needs_tracking": False},
            {"name": "Hở mộng / Ghép nối lỏng", "category": "structure", "needs_tracking": True},
            {"name": "Cong vênh thanh gỗ", "category": "structure", "needs_tracking": True},
            {"name": "Lệch tâm lỗ khoan", "category": "structure", "needs_tracking": False},
            {"name": "Lẫn tạp chất", "category": "material", "needs_tracking": True},
            {"name": "Ẩm mốc", "category": "material", "needs_tracking": False},
            {"name": "Nứt vân", "category": "material", "needs_tracking": False},
            {"name": "Mắt chết gỗ lớn", "category": "material", "needs_tracking": False},
            {"name": "Gỗ bị nứt tét sâu", "category": "material", "needs_tracking": True},
            {"name": "Ruột gỗ mục", "category": "material", "needs_tracking": True},
        ]
        
        for d in defects:
            exists = db.query(DefectType).filter(
                DefectType.name == d["name"],
                DefectType.category == d["category"]
            ).first()
            if not exists:
                new_defect = DefectType(
                    name=d["name"],
                    category=d["category"],
                    needs_tracking=d["needs_tracking"],
                    qc_tracking=False, # Default QC tracking to false
                    is_active=True
                )
                db.add(new_defect)
                print(f"Added defect: {d['name']} ({d['category']})")
            else:
                # Update tracking status if changed
                if exists.needs_tracking != d["needs_tracking"]:
                    exists.needs_tracking = d["needs_tracking"]
                    print(f"Updated tracking for defect: {d['name']} ({d['category']})")
                else:
                    print(f"Skipped (Exists): {d['name']} ({d['category']})")
                
        db.commit()
        print("--- Seed defect types completed successfully! ---")
    except Exception as e:
        print(f"Error seeding defect types: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_defect_types()
