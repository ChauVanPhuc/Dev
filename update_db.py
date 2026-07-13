import sys
import os
sys.path.append(os.path.abspath('BackEnd'))

from sqlalchemy import text
from config.database import SessionLocal

db = SessionLocal()
try:
    db.execute(
        text("UPDATE stage_inspections SET product_sku = :sku WHERE inspection_type = 'quy-trinh' AND (product_sku LIKE '23 - Đ?nh hình' OR product_sku IS NULL OR product_sku = '')"),
        {"sku": "23 - Định hình"}
    )
    db.commit()
    print('Updated old records with proper unicode')
finally:
    db.close()
