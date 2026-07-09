# Test backslash cleanup logic
import re

# Simulate AI output with backslash escapes (as seen in error screenshot)
test_query = r"SELECT SUM(CASE WHEN p.sale_price LIKE '\$%\' THEN CAST(REPLACE(REPLACE(c.action, '\$', ''), ',', '') AS DECIMAL(18,2)) ELSE 0 END) AS total_penalty FROM [customer_claims] c LEFT JOIN [cabinet_prices] p ON c.product_name = p.cabinet_name WHERE c.period = '01-2026'"

print("=== BEFORE ===")
print(test_query)
print()

# Step 0a: Remove backslash escapes
clean = test_query.replace("\\'", "'").replace('\\"', '"').replace("\\$", "$").replace("\\\\", "\\")
print("=== AFTER 0a (backslash cleanup) ===")
print(clean)
print()

# Step 0b: Remove square brackets around table names
clean = re.sub(r'\[(\w+)\]', r'\1', clean)
print("=== AFTER 0b (square bracket removal) ===")
print(clean)
print()

# Step 0c: Fix CASE WHEN penalty with wrong column
lower_q = clean.lower()
if "case when" in lower_q and ("p.sale_price like" in lower_q or "p.base_price like" in lower_q):
    clean = re.sub(
        r"SELECT\s+.*?SUM\s*\(\s*CASE\s+WHEN[\s\S]+?\)\s*AS\s+\w+",
        "SELECT SUM(CASE WHEN c.action LIKE '$%' THEN CAST(REPLACE(REPLACE(c.action, '$', ''), ',', '') AS DECIMAL(18,2)) "
        "WHEN c.action = 'Full BC' THEN COALESCE(p.sale_price, 0) "
        "WHEN c.action = 'X2 Unit' THEN COALESCE(p.sale_price, 0) * 2 "
        "ELSE 0 END) AS total_penalty",
        clean,
        flags=re.IGNORECASE
    )
    print("=== AFTER 0c (CASE WHEN fix) ===")
    print(clean)
else:
    print("=== 0c SKIPPED (no wrong column detected) ===")

print()
print("=== FINAL RESULT ===")
print(clean)
