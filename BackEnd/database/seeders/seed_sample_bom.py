import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import SessionLocal
import app.models
from modules.master.models.master_product import MasterProduct
from modules.master.models.master_bom_detail import MasterBOMDetail
from modules.master.models.master_category import MasterCategory

db = SessionLocal()
try:
    # 1. Check or create MasterCategory
    cat = db.query(MasterCategory).first()
    if not cat:
        cat = MasterCategory(name="Danh muc mau test", description="Danh muc dung de test BOM", status=1)
        db.add(cat)
        db.flush()
        
    # 2. Check or create MasterProduct
    prod = db.query(MasterProduct).filter(MasterProduct.sku == "TEST_PRODUCT_SKU").first()
    if not prod:
        prod = MasterProduct(
            sku="TEST_PRODUCT_SKU",
            name="San pham thu nghiem BOM",
            category_id=cat.id,
            price=100000.0,
            material="Go",
            color="Nau",
            status="Active"
        )
        db.add(prod)
        db.flush()
        
    # 3. Add BOM details with NM1, NM2 & NM3 stages
    db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == prod.id).delete()
    
    bom1 = MasterBOMDetail(
        sku="TEST_PRODUCT_SKU-C1",
        name="Chi tiet go dinh hinh",
        master_product_id=prod.id,
        parent_id=None,
        input_stage="NM1 - Dinh hinh",
        output_stage="NM1 - Lap rap",
        quantity=1.0,
        status="Active"
    )
    bom2 = MasterBOMDetail(
        sku="TEST_PRODUCT_SKU-C2",
        name="Chi tiet son phu be mat",
        master_product_id=prod.id,
        parent_id=None,
        input_stage="NM2 - Son",
        output_stage="NM2 - Dong goi",
        quantity=1.0,
        status="Active"
    )
    bom3 = MasterBOMDetail(
        sku="TEST_PRODUCT_SKU-C3",
        name="Chi tiet tao phoi goc",
        master_product_id=prod.id,
        parent_id=None,
        input_stage="NM3 - Tao phoi 3",
        output_stage="NM3 - Dinh hinh 3",
        quantity=1.0,
        status="Active"
    )
    db.add(bom1)
    db.add(bom2)
    db.add(bom3)
    db.commit()
    print("[SUCCESS] Sample BOM data seeded with NM1, NM2, and NM3 stages!")
except Exception as e:
    db.rollback()
    print(f"[ERROR] Failed to seed sample BOM data: {e}")
finally:
    db.close()
