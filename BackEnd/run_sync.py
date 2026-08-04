import app.models
from config.database import SessionLocal
from modules.master.controllers import master_product_controller

db = SessionLocal()
print("Starting BOM deduplicated sync...")
res = master_product_controller.sync_bom_data_to_auxiliary_tables(db)
print("SYNC SUCCESS RESULT:")
print(f"Status: {res['status']}")
print(f"Message: {res['message']}")
print(f"Unique Product Details inserted: {res['unique_product_details_inserted']}")
print(f"Unique Paint Colors inserted: {res['unique_paint_colors_inserted']}")
