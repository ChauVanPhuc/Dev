import pyodbc
conn = pyodbc.connect("DRIVER={ODBC Driver 17 for SQL Server};SERVER=DESKTOP-GCS0O50\\MIMI;DATABASE=SmartFlow_v5;UID=sa;PWD=Admin@123", timeout=5)
cursor = conn.cursor()

print("=== DONG A KHAC ===")
cursor.execute("""
    SELECT LEFT(sku, 4) as pfx, COUNT(*) as cnt, MIN(sku) as ex
    FROM master_products
    WHERE category_id = 12 AND sku LIKE 'A%' 
      AND sku NOT LIKE 'APT%' AND sku NOT LIKE 'ATLA%' AND sku NOT LIKE 'ATLT%' AND sku NOT LIKE 'ADV%'
    GROUP BY LEFT(sku, 4)
    ORDER BY COUNT(*) DESC
""")
for r in cursor.fetchall():
    print(f"  {r[0]}: {r[1]} sp (VD: {r[2]})")

print("\n=== DONG T VA KHAC ===")
cursor.execute("""
    SELECT LEFT(sku, 4) as pfx, COUNT(*) as cnt, MIN(sku) as ex
    FROM master_products
    WHERE category_id = 12 
      AND sku NOT LIKE 'MBC%' AND sku NOT LIKE 'APT%' AND sku NOT LIKE 'ADV%' 
      AND sku NOT LIKE 'A%' AND sku NOT LIKE 'TPH%'
    GROUP BY LEFT(sku, 4)
    ORDER BY COUNT(*) DESC
""")
for r in cursor.fetchall():
    print(f"  {r[0]}: {r[1]} sp (VD: {r[2]})")

conn.close()
