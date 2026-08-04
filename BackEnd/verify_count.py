import app.models
from config.database import SessionLocal
from modules.master.models.master_product_detail import MasterProductDetail
from modules.master.models.paint_color_sample import PaintColorSample

db = SessionLocal()
d_cnt = db.query(MasterProductDetail).count()
c_cnt = db.query(PaintColorSample).count()

print("DATABASE SYNC VERIFICATION RESULTS:")
print("Product Details count:", d_cnt)
print("Paint Colors count:", c_cnt)
