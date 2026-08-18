import sys
import os

# Add BackEnd directory to python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine, text
from config.settings import settings

def clear_orders():
    print(f"Connecting to database server: {settings.DB_SERVER}, DB: {settings.DB_NAME}")
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Cleaning old BOM details, products, and orders...")
            res_bom = conn.execute(text("DELETE FROM bom_details"))
            res_prod = conn.execute(text("DELETE FROM products"))
            res_ord = conn.execute(text("DELETE FROM orders"))
            
            trans.commit()
            print(f"Successfully cleared old production data!")
            print(f" - Deleted {res_bom.rowcount} BOM detail records")
            print(f" - Deleted {res_prod.rowcount} product records")
            print(f" - Deleted {res_ord.rowcount} order records")
        except Exception as e:
            trans.rollback()
            print(f"Error clearing production data: {e}")

if __name__ == '__main__':
    clear_orders()
