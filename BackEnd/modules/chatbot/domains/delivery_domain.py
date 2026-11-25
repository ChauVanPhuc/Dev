# -*- coding: utf-8 -*-
from modules.chatbot.domains.base import DomainSpec

DELIVERY_DOMAIN = DomainSpec(
    key="delivery",
    title="Bàn giao Nội bộ & Trả hàng (Delivery)",
    description="Phiếu bàn giao giữa các công đoạn sản xuất, chi tiết bàn giao, kiểm tra QC bàn giao, phiếu trả hàng lỗi, mã QR dự phòng.",
    keywords=[
        "bàn giao", "ban giao", "delivery", "giao nhận", "giao nhan", "chờ xác nhận", "cho xac nhan",
        "trả hàng", "tra hang", "hàng trả", "hang tra", "độ ẩm", "do am", "qr dự phòng", "backup qr",
    ],
    route_prefixes=["/admin/delivery-tracking", "/admin/exception-deliveries", "/admin/backup-qrs", "/delivery"],
    tables={
        "deliveries", "delivery_details", "delivery_qc", "delivery_returns", "backup_qr_codes",
        "product_plans", "orders",
    },
    required_permissions=["delivery-tracking", "delivery-info", "delivery-create", "delivery-receive", "backup-qrs"],
    schema_text="""
--- DOMAIN: DELIVERY (Bàn giao nội bộ & Trả hàng) ---
Table: deliveries (Phiếu bàn giao giữa các công đoạn)
- id, delivery_stage (Công đoạn giao), receiving_stage (Công đoạn nhận), plan_id (-> product_plans.id), order_id (-> orders.id), part_name, specification, status ('Chờ xác nhận', 'Đã nhận'...), quantity_total, quantity_received, quantity_error, quantity_returned, moisture_min, moisture_max, sx_delivery, qc_receipt, sx_receipt, note, created_at

Table: delivery_details (Chi tiết linh kiện trong phiếu bàn giao)
- id, delivery_id (-> deliveries.id), order_id (-> orders.id), part_name, element_name, quantity

Table: delivery_returns (Phiếu trả hàng lỗi giữa công đoạn)
- id, plan_id, delivery_id (-> deliveries.id), from_stage, to_stage, part_name, quantity, reason, status, created_by, created_at, sx_confirmed_by, sx_confirmed_at

Table: backup_qr_codes (Mã QR dự phòng)
- id, code, status, current_delivery_id, current_inspection_id, created_at
""",
    business_rules="""
- Có thể JOIN `deliveries` với `product_plans` qua `plan_id` hoặc `orders` qua `order_id`.
- Khi hỏi tồn đọng bàn giao, lọc `status = N'Chờ xác nhận'` hoặc `quantity_received < quantity_total`.
""",
    examples="""
- "Hôm nay các công đoạn bàn giao được bao nhiêu?" -> SELECT delivery_stage, receiving_stage, COUNT(*) AS so_phieu, SUM(quantity_total) AS tong_giao, SUM(quantity_received) AS tong_nhan, SUM(quantity_error) AS tong_loi FROM deliveries WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) GROUP BY delivery_stage, receiving_stage
""",
)

