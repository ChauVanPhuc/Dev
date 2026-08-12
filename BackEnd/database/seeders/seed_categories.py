# -*- coding: utf-8 -*-
"""
Seeder danh mục Dòng hàng (Categories & Master Categories).
Đồng bộ các Dòng hàng tiêu chuẩn của hệ thống:
- Dòng hàng APT
- Dòng hàng ATL
- Dòng hàng FOL
- Dòng hàng ADV
- Dòng hàng TPH
- Dòng hàng HOR
- Dòng hàng EYC
- Dòng hàng COV
- Dòng hàng TIN
- Dòng hàng BEZ
- Dòng hàng MBC
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import app.models  # Nạp toàn bộ models để SQLAlchemy resolve các relationships

from config.database import SessionLocal
from modules.master.models.master_category import MasterCategory
from modules.production.models.category import Category
from datetime import datetime

CATEGORIES_DATA = [
    {"name": "Dòng hàng APT", "prefix": "APT", "description": "Dòng hàng APT"},
    {"name": "Dòng hàng ATL", "prefix": "ATL", "description": "Dòng hàng ATL"},
    {"name": "Dòng hàng FOL", "prefix": "FOL", "description": "Dòng hàng FOL"},
    {"name": "Dòng hàng ADV", "prefix": "ADV", "description": "Dòng hàng ADV"},
    {"name": "Dòng hàng TPH", "prefix": "TPH", "description": "Dòng hàng TPH"},
    {"name": "Dòng hàng HOR", "prefix": "HOR", "description": "Dòng hàng HOR"},
    {"name": "Dòng hàng EYC", "prefix": "EYC", "description": "Dòng hàng EYC"},
    {"name": "Dòng hàng COV", "prefix": "COV", "description": "Dòng hàng COV"},
    {"name": "Dòng hàng TIN", "prefix": "TIN", "description": "Dòng hàng TIN"},
    {"name": "Dòng hàng BEZ", "prefix": "BEZ", "description": "Dòng hàng BEZ"},
    {"name": "Dòng hàng MBC", "prefix": "MBC", "description": "Dòng hàng MBC"},
]

def seed_categories():
    db = SessionLocal()
    try:
        print("=== BẮT ĐẦU SEED DANH MỤC DÒNG HÀNG (CATEGORIES) ===")
        
        # 1. Seed vào bảng master_categories
        master_added = 0
        master_existing = 0
        for item in CATEGORIES_DATA:
            cat = db.query(MasterCategory).filter(MasterCategory.name == item["name"]).first()
            if not cat:
                new_cat = MasterCategory(
                    name=item["name"],
                    description=item["description"],
                    status=1,
                    created_at=datetime.now()
                )
                db.add(new_cat)
                master_added += 1
            else:
                master_existing += 1
        db.commit()
        print(f"-> Bảng 'master_categories': Thêm mới {master_added}, Đã tồn tại {master_existing}")

        # 2. Seed vào bảng categories (Production)
        prod_added = 0
        prod_existing = 0
        for item in CATEGORIES_DATA:
            cat = db.query(Category).filter(Category.name == item["name"]).first()
            if not cat:
                new_cat = Category(
                    name=item["name"],
                    description=item["description"]
                )
                db.add(new_cat)
                prod_added += 1
            else:
                prod_existing += 1
        db.commit()
        print(f"-> Bảng 'categories': Thêm mới {prod_added}, Đã tồn tại {prod_existing}")

        print("\n=== HOÀN TẤT SEED DÒNG HÀNG THÀNH CÔNG! ===")

    except Exception as e:
        db.rollback()
        print(f"[LỖI] Seed categories thất bại: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_categories()
