# -*- coding: utf-8 -*-
from modules.chatbot.domains.base import DomainSpec

CLAIM_DOMAIN = DomainSpec(
    key="claim",
    title="Khiếu nại Khách hàng, Bảng giá & Xuất Container (Claim / Export)",
    description="Khiếu nại khách hàng (Claims), tính tiền phạt đền bù (USD), bảng giá tủ gỗ, lịch xuất container, kiểm tra pallet & LPN Crawler.",
    keywords=[
        "claim", "khiếu nại", "khieu nai", "cabinet", "tủ #", "full bc", "x2 unit", "phạt", "phat",
        "đền bù", "den bu", "bảng giá", "bang gia", "giá tủ", "gia tu", "container", "cont", "shipped",
        "lpn", "pallet", "thiếu ảnh", "thieu anh", "dva", "dvp", "nứt", "bong tróc", "móp", "mốc",
        "crawler", "ocr",
    ],
    route_prefixes=["/admin/claims", "/admin/prices", "/admin/shipments", "/admin/pallet", "/lpn"],
    tables={
        "customer_claims", "cabinet_prices", "container_shipments", "client_defects",
        "pallet_cards", "pallet_check_containers",
        "lpn_containers", "lpn_items", "lpn_ai_ocr_results", "lpn_crawl_jobs",
    },
    required_permissions=["claims", "prices", "shipments", "pallet-check", "lpn"],
    schema_text="""
--- DOMAIN: CLAIM & EXPORT (Khiếu nại, Bảng giá, Container, LPN) ---
Table: customer_claims (Khiếu nại khách hàng — Dữ liệu chính theo kỳ 'MM-YYYY')
- id, claim_code (VD: 'Cabinet #12'), customer_name, product_name (SKU -> cabinet_prices.cabinet_name/cabinet_code), order_code (Mã lỗi KH, có thể nhiều mã cách nhau dấu phẩy -> client_defects.code), company_error_code (Mã G7), description, severity ('Low'/'Medium'/'High'), status ('Received'/'Processing'/'Resolved'), lpn, container_no (-> container_shipments.container_number), action ('Full BC', '$50', 'Repair', 'X2 Unit'), period ('MM-YYYY', VD: '02-2026'), image_paths, created_at, resolved_at

Table: cabinet_prices (Bảng giá tủ gỗ — USD)
- id, cabinet_code, cabinet_name, material, dimensions, base_price, sale_price, status, last_updated

Table: client_defects (Danh mục mã lỗi KH — KHÔNG có cột period/created_at)
- id, code, name (Tên tiếng Việt ngắn, VD: 'NỨT', 'MÓP', 'BONG TRÓC SƠN'), name_en, g7_code, is_active

Table: container_shipments (Lịch trình xuất container)
- id, shipment_code, container_number, seal_number, destination_port, etd, eta, status ('Draft'/'Loading'/'Shipped'/'Delivered'), total_value, created_at

Table: lpn_containers (Container quét LPN)
- id, container_number, factory, date_loading, operator_name, status, crawl_count, created_at

Table: lpn_items (Danh sách pallet LPN trong container)
- id, container_id (-> lpn_containers.id), lpn, sku, resolution_status, created_at

Table: pallet_check_containers (Kiểm đếm pallet xuất hàng)
- id, name, inspector, status, is_valid, total_pallets, total_boxes, total_scans, audit_result, completed_at
""",
    business_rules="""
- LỌC THỜI GIAN CLAIM: Dùng `period = 'MM-YYYY'` (tháng) hoặc `period LIKE '%-YYYY'` (năm). KHÔNG dùng `YEAR(created_at)`.
- JOIN TÊN LỖI TIẾNG VIỆT: Bắt buộc dùng `JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',' LIKE '%,' + d.code + ',%')` và lọc từ khóa gốc ngắn (`d.name LIKE N'%nứt%'`, `N'%tróc%'`, `N'%móp%'`, `N'%mốc%'`).
- TÍNH TIỀN PHẠT (Đơn vị: USD):
  + `action LIKE '$%'` -> `TRY_CAST(REPLACE(REPLACE(c.action, '$', ''), ' ', '') AS FLOAT)`
  + `action = 'Full BC'` -> `COALESCE(p.sale_price, 0)`
  + `action = 'X2 Unit'` -> `COALESCE(p.sale_price * 2, 0)`
  + Khác ('Repair', 'Nhắc nhở') -> 0
  + JOIN `cabinet_prices p ON (c.product_name = p.cabinet_name OR c.product_name = p.cabinet_code)`.
- Khi người dùng yêu cầu xem danh sách claim cụ thể, dùng `SELECT TOP 20 * FROM customer_claims ...` để UI tự động hiển thị thẻ Claim Card (không liệt kê thủ công từng dòng quá dài).
""",
    examples="""
- "Tháng 2/2026 phạt bao nhiêu tiền?" -> SELECT SUM(CASE WHEN c.action LIKE '$%' THEN TRY_CAST(REPLACE(REPLACE(c.action,'$',''),' ','') AS FLOAT) WHEN c.action='Full BC' THEN COALESCE(p.sale_price,0) WHEN c.action='X2 Unit' THEN COALESCE(p.sale_price*2,0) ELSE 0 END) AS tong_tien_phat_usd FROM customer_claims c LEFT JOIN cabinet_prices p ON (c.product_name=p.cabinet_name OR c.product_name=p.cabinet_code) WHERE c.period='02-2026'
""",
)

