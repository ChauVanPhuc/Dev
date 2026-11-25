# -*- coding: utf-8 -*-
from modules.chatbot.domains.base import DomainSpec

PRODUCTION_DOMAIN = DomainSpec(
    key="production",
    title="Sản xuất & Kế hoạch (Production / Daily Production)",
    description="Kế hoạch sản xuất, Lệnh sản xuất (LSX), Đơn hàng sản xuất, Sản xuất hằng ngày theo xưởng/tổ, BOM & Công đoạn.",
    keywords=[
        "sản xuất", "san xuat", "khsx", "kế hoạch", "ke hoach", "lệnh sản xuất", "lenh san xuat", "lsx",
        "đơn hàng", "don hang", "order", "tiến độ", "tien do", "ưu tiên", "uu tien", "trễ hạn", "tre han",
        "sản lượng", "san luong", "hôm nay", "daily production", "công đoạn", "cong doan", "stage",
        "tổ sản xuất", "bom", "routing", "xưởng", "xuong", "batch", "mẻ sản xuất",
    ],
    route_prefixes=[
        "/admin/production-orders", "/admin/plan", "/admin/daily-production",
        "/production", "/manufacture", "/plan",
    ],
    tables={
        "product_plans", "orders", "order_items", "products", "categories",
        "daily_production_batches", "daily_production_items", "mobile_daily_plans",
        "bom_details", "stages", "production_teams",
        "production_routings", "production_routing_nodes",
        "production_routing_components", "production_routing_products",
    },
    required_permissions=["plan", "orders", "daily-production", "production-orders", "production"],
    schema_text="""
--- DOMAIN: PRODUCTION (Sản xuất & Kế hoạch) ---
Table: product_plans (Kế hoạch sản xuất)
- id, code (VD: 'KHSX_04_2026'), name, month, year, status (0:Mới, 1:Đang làm, 2:Xong), estimated_date, finished_date, account_id, created_at

Table: orders (Đơn hàng / Lệnh sản xuất - LSX)
- id, order_code, production_code (Mã LSX), partner_po, customer_code, customer, plan_id (-> product_plans.id), create_date, delivery_date, start_date, finished_date, estimated_date, order_status (0:Mới, 1:Đang làm, 2:Xong), is_priority (1:Ưu tiên, 0:Bình thường), priority_score, note

Table: products (Sản phẩm thực tế trong từng đơn hàng — LƯU Ý: 1 SKU lặp theo nhiều đơn)
- id, sku, name, order_id (-> orders.id), category_id (-> categories.id), price, material, quantity, order_qty, production_qty, loss_qty, total_qty, total_vnd (VNĐ), unit, status, created_at

Table: daily_production_batches (Lô kế hoạch sản xuất hằng ngày)
- id, batch_code, plan_date, factory, section_name, batch_title, line_color_summary, status, notes, created_by, created_at

Table: daily_production_items (Chi tiết sản xuất hằng ngày)
- id, batch_id (-> daily_production_batches.id), row_type, cont_code, color_code, cabinet_code, material_name, item_name, dim_thick, dim_width, dim_length, set_qty, base_planned_qty, custom_planned_qty, completed_qty, source_orders_text, note

Table: mobile_daily_plans (Kế hoạch giao việc hằng ngày trên Mobile)
- id, plan_date, stage, factory, order_code, part_name, planned_qty, remaining_qty, created_at

Table: stages (Danh mục công đoạn sản xuất)
- id, code, name, description, sequence, is_active

Table: bom_details (Định mức chi tiết theo sản phẩm đơn hàng)
- id, sku, name, product_id (-> products.id), parent_id, length, width, height, unit, material, color, input_stage, output_stage, quantity, status
""",
    business_rules="""
- Tiền tệ trong `products.total_vnd` là VNĐ (KHÔNG đổi sang USD).
- `orders.order_status`: 0 = Mới, 1 = Đang sản xuất, 2 = Hoàn thành.
- Chỉ dùng bảng `products` khi hỏi về sản lượng / đơn hàng cụ thể. Nếu hỏi "danh mục sản phẩm mẫu có bao nhiêu mã / dòng APT", hãy dùng bảng `master_products` ở domain Master.
- Khi lọc ngày sản xuất hằng ngày: dùng `daily_production_batches.plan_date` hoặc `mobile_daily_plans.plan_date`.
""",
    examples="""
- "Đơn hàng nào đang ưu tiên và chưa xong?" -> SELECT TOP 50 order_code, production_code, customer, delivery_date, order_status FROM orders WHERE is_priority = 1 AND order_status < 2 ORDER BY delivery_date ASC
- "Sản xuất hằng ngày hôm nay có bao nhiêu lô?" -> SELECT factory, section_name, COUNT(*) AS so_lo, status FROM daily_production_batches WHERE CAST(plan_date AS DATE) = CAST(GETDATE() AS DATE) GROUP BY factory, section_name, status
""",
)

