import app.models
from config.database import SessionLocal
from modules.master.models.master_bom_detail import MasterBOMDetail
from modules.master.models.master_product import MasterProduct

db = SessionLocal()
boms = db.query(MasterBOMDetail).all()
products = db.query(MasterProduct).all()

unique_details = {}
unique_colors = {}

for b in boms:
    if b.name and b.name.strip():
        name_clean = b.name.strip()
        key = name_clean.lower()
        if key not in unique_details:
            unique_details[key] = {
                'master_product_id': b.master_product_id,
                'name': name_clean,
                'quantity': b.quantity or 1.0,
                'unit': b.unit or 'Cái',
                'input_stage': b.input_stage or 'Định hình',
                'output_stage': b.output_stage or 'Lắp ráp',
                'parent_name': b.parent.name if (b.parent and b.parent.name) else '',
                'material': b.material or 'Gỗ'
            }

for b in boms:
    if b.color and b.color.strip():
        c_clean = b.color.strip()
        key = c_clean.lower()
        if key not in unique_colors:
            unique_colors[key] = {
                'master_product_id': b.master_product_id,
                'color_code': f"MS-{c_clean[:10].upper().replace(' ', '-')}",
                'color_name': c_clean,
                'supplier': 'NPP Sơn Nippon',
                'note': 'Mẫu màu sơn độc nhất lọc từ BOM'
            }

for p in products:
    if p.color and p.color.strip():
        c_clean = p.color.strip()
        key = c_clean.lower()
        if key not in unique_colors:
            unique_colors[key] = {
                'master_product_id': p.id,
                'color_code': f"MS-{c_clean[:10].upper().replace(' ', '-')}",
                'color_name': c_clean,
                'supplier': 'Nội bộ G7',
                'note': 'Mẫu màu sơn độc nhất lọc từ sản phẩm'
            }

print(f"Unique Product Details count: {len(unique_details)}")
print(f"Unique Paint Colors count: {len(unique_colors)}")

print("\nSample Unique Colors:")
for k, v in list(unique_colors.items())[:15]:
    print(f"  - Code: {v['color_code']} | Name: {v['color_name']}")

print("\nSample Unique Details:")
for k, v in list(unique_details.items())[:15]:
    print(f"  - Name: {v['name']} | Unit: {v['unit']} | Material: {v['material']}")
