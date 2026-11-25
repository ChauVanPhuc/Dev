# -*- coding: utf-8 -*-
from modules.chatbot.domains.base import DomainSpec

MASTER_PURCHASING_DOMAIN = DomainSpec(
    key="master_purchasing",
    title="Danh mục Sản phẩm mẫu, BOM Master, Khách hàng & Mua hàng (Master / Purchasing)",
    description="Sản phẩm mẫu (BOM Master), chi tiết gỗ, vật tư định mức, mẫu màu sơn, bản vẽ kỹ thuật, danh mục khách hàng, đề nghị mua hàng (PR) & đơn mua hàng (PO).",
    keywords=[
        "sản phẩm mẫu", "san pham mau", "master product", "sku", "dòng apt", "dòng adv", "màu sơn", "mau son",
        "bản vẽ", "ban ve", "kỹ thuật", "ky thuat", "định mức", "dinh muc", "khách hàng", "khach hang", "customer",
        "mua hàng", "mua hang", "đề nghị mua", "de nghi mua", "purchase", "po", "nhà cung cấp", "nha cung cap",
        "supplier", "vật tư mua",
    ],
    route_prefixes=["/admin/master-products", "/manufacture/products", "/admin/customers", "/admin/purchasing", "/purchasing"],
    tables={
        "master_products", "master_categories", "master_bom_details",
        "master_product_details", "master_product_materials",
        "paint_color_samples", "master_technical_drawings", "technical_pending_tasks",
        "customers", "purchase_requisitions", "purchase_order_items",
    },
    required_permissions=["master-products", "products", "customers", "purchasing", "purchase-requisitions"],
    schema_text="""
--- DOMAIN: MASTER DATA & PURCHASING (Sản phẩm mẫu, Kỹ thuật, Khách hàng, Mua hàng) ---
Table: master_products (Danh mục sản phẩm mẫu duy nhất — KHÔNG trùng SKU)
- id, sku (unique), name, new_name, brand_name, category_id (-> master_categories.id), price, material, color, length, width, height, weight, status, unit, specification, created_at

Table: master_categories (Nhóm sản phẩm mẫu)
- id, name, main_category, description, status

Table: master_product_details (Chi tiết cấu thành sản phẩm mẫu)
- id, master_product_id (-> master_products.id), name, quantity, unit, input_stage, output_stage, parent_name, material

Table: master_product_materials (Định mức vật tư sản phẩm mẫu)
- id, master_product_id (-> master_products.id), product_sku, product_name, group_type, material_code, material_name, color, quota, unit, supplier, note

Table: paint_color_samples (Mẫu màu sơn)
- id, master_product_id, color_code, color_name, supplier, expiry_date, note

Table: master_technical_drawings (Bản vẽ kỹ thuật)
- id, master_product_id, lot_code, status, updated_by, approved_by, change_reason, updated_at

Table: customers (Danh mục khách hàng)
- id, code, name, contact_person, phone, email, country, is_active

Table: purchase_requisitions (Phiếu đề nghị mua hàng - PR/PO)
- id, po_code, creator, order_date, delivery_date, branch, approver, supplier_code, supplier_name, total_amount, order_type, priority, material_type, status, processing_status, warehouse_status, note, created_at

Table: purchase_order_items (Chi tiết vật tư đơn mua hàng)
- id, requisition_id (-> purchase_requisitions.id), po_date, po_code, supplier_name, item_code, item_name, order_code, unit, quantity, unit_price, currency, grand_total_vnd, grand_total_foreign, requested_delivery_date, status, manager
""",
    business_rules="""
- QUAN TRỌNG: Khi hỏi "có bao nhiêu sản phẩm", "đếm sản phẩm dòng APT/ADV", "tìm SKU trong danh mục", BẮT BUỘC truy vấn `master_products` (không dùng bảng `products` vì `products` lặp theo đơn hàng).
- Tiền tệ mua hàng: kiểm tra cột `currency` hoặc dùng `grand_total_vnd` (VNĐ) / `grand_total_foreign`.
""",
    examples="""
- "Có bao nhiêu sản phẩm mẫu dòng APT?" -> SELECT COUNT(*) AS so_luong FROM master_products WHERE sku LIKE '%APT%'
- "Đề nghị mua hàng nào đang chờ duyệt?" -> SELECT TOP 30 po_code, creator, supplier_name, order_date, total_amount, status, priority FROM purchase_requisitions WHERE status LIKE N'%Chờ%' OR status LIKE N'%Pending%' ORDER BY created_at DESC
""",
)

