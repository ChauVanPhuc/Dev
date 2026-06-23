# -*- coding: utf-8 -*-
import sys
import os
from sqlalchemy import text

# Add current path to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import SessionLocal

db = SessionLocal()
try:
    print("--- PRODUCT DIAGNOSTICS ---")
    
    # 1. Total products in database
    total_prod = db.execute(text("SELECT COUNT(*) FROM products")).scalar()
    print(f"Total products in 'products' table: {total_prod}")
    
    # 2. Products with SKU/Name containing APT
    apt_total = db.execute(text("SELECT COUNT(*) FROM products WHERE sku LIKE '%APT%' OR name LIKE '%APT%'")).scalar()
    print(f"Total products containing 'APT' in SKU/Name: {apt_total}")
    
    # 3. Products with SKU containing APT
    apt_sku = db.execute(text("SELECT COUNT(*) FROM products WHERE sku LIKE '%APT%'")).scalar()
    print(f"Total products containing 'APT' in SKU: {apt_sku}")
    
    # 4. Distinct SKUs containing APT
    apt_distinct_sku = db.execute(text("SELECT COUNT(DISTINCT sku) FROM products WHERE sku LIKE '%APT%'")).scalar()
    print(f"Distinct SKUs containing 'APT': {apt_distinct_sku}")
    
    # 5. Let's see some sample rows matching APT
    samples = db.execute(text("SELECT TOP 5 id, sku, name, order_id, quantity FROM products WHERE sku LIKE '%APT%'")).all()
    print("Sample products matching 'APT':")
    for s in samples:
        print(dict(s._mapping))
        
    # 6. Check what query the AI chatbot ran by viewing request_history.log or logs
    # We will do this via python command output
    
finally:
    db.close()
