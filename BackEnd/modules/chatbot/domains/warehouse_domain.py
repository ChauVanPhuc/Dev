# -*- coding: utf-8 -*-
from modules.chatbot.domains.base import DomainSpec

WAREHOUSE_DOMAIN = DomainSpec(
    key="warehouse",
    title="Kho & Quản lý Vật tư (Warehouse)",
    description="Danh mục kho, vật tư tồn đầu, phiếu nhập kho (Goods Receipt), phiếu xuất kho (Goods Issue), hàng lỗi/từ chối tại kho (Rejected Goods), đơn vị tính.",
    keywords=[
        "kho", "vật tư", "vat tu", "tồn kho", "ton kho", "nhập kho", "nhap kho", "xuất kho", "xuat kho",
        "phiếu nhập", "phieu nhap", "phiếu xuất", "phieu xuat", "goods receipt", "goods issue",
        "hàng từ chối", "hang tu choi", "rejected", "đơn vị tính", "warehouse", "nguyên vật liệu", "nvl",
        "po kho", "vật tư tồn",
    ],
    route_prefixes=["/admin/warehouse", "/warehouse", "/goods-receipt", "/goods-issue", "/rejected-goods"],
    tables={
        "warehouses", "warehouse_materials", "units_of_measure",
        "goods_receipts", "goods_receipt_items",
        "goods_issues", "goods_issue_items",
        "rejected_goods", "warehouse_purchase_order_items",
    },
    required_permissions=["warehouse", "warehouses", "goods-receipt", "goods-issue", "rejected-goods"],
    schema_text="""
--- DOMAIN: WAREHOUSE (Kho & Vật tư) ---
Table: warehouses (Danh mục kho)
- id, code, name, description, sort_order, is_active

Table: warehouse_materials (Danh mục vật tư & Tồn đầu kỳ theo kho)
- id, warehouse_code, warehouse_name, item_code, item_name, category, unit_main, unit_conversion, conversion_rate, opening_main (tồn đầu kỳ ĐVT chính), initial_receipt_date, is_active

Table: goods_receipts (Phiếu nhập kho)
- id, voucher_no, warehouse_code, warehouse_name, receipt_date, deliverer_name, customer_code, customer_name, department_name, content, receipt_type, status, total_lines, total_quantity, total_amount (VNĐ), created_by, confirmed_by, confirmed_at, is_deleted

Table: goods_receipt_items (Chi tiết phiếu nhập kho)
- id, receipt_id (-> goods_receipts.id), line_no, item_code, item_name, unit1, quantity1, unit2, quantity2, unit_price, amount, po_code, order_code, partner_po, lsx, notes

Table: goods_issues (Phiếu xuất kho)
- id, voucher_no, warehouse_code, warehouse_name, issue_date, deliverer_name, customer_code, customer_name, department_name, factory_name, content, issue_type, status, total_lines, total_quantity, total_amount (VNĐ), created_by, receiver_name, confirmed_by, confirmed_at, is_deleted

Table: goods_issue_items (Chi tiết phiếu xuất kho)
- id, issue_id (-> goods_issues.id), line_no, item_code, item_name, unit1, quantity1, unit2, quantity2, unit_price, amount, lsx, notes

Table: rejected_goods (Hàng lỗi / Hàng từ chối tại kho)
- id, voucher_no, created_date, source_type, origin_voucher_no, warehouse_code, warehouse_name, item_code, item_name, unit_main, quantity_main, defect_category, defect_reason, resolution, status, department_name, factory_name, is_deleted

Table: warehouse_purchase_order_items (Theo dõi PO nhập kho)
- id, category_group, po_code, order_date, delivery_date, supplier_name, item_code, item_name, order_qty_main, unit_price, order_amount, received_cum_main, remaining_qty, warehouse_name, lsx_code, approval_status, execution_status

Table: units_of_measure (Đơn vị tính)
- id, code, full_name, precision, status
""",
    business_rules="""
- LUÔN lọc `is_deleted = 0 OR is_deleted IS NULL` trên `goods_receipts`, `goods_issues`, `rejected_goods`.
- Tồn kho ước tính của 1 vật tư = `opening_main` + SUM(nhập `goods_receipt_items.quantity1` của phiếu chưa xóa) - SUM(xuất `goods_issue_items.quantity1` của phiếu chưa xóa).
- Tiền tệ kho (`total_amount`, `amount`, `unit_price`) mặc định là VNĐ.
""",
    examples="""
- "Hôm nay có bao nhiêu phiếu nhập và xuất kho?" -> SELECT 'Nhập kho' AS loai, COUNT(*) AS so_phieu, COALESCE(SUM(total_amount),0) AS tong_tien FROM goods_receipts WHERE (is_deleted=0 OR is_deleted IS NULL) AND CAST(receipt_date AS DATE)=CAST(GETDATE() AS DATE) UNION ALL SELECT 'Xuất kho', COUNT(*), COALESCE(SUM(total_amount),0) FROM goods_issues WHERE (is_deleted=0 OR is_deleted IS NULL) AND CAST(issue_date AS DATE)=CAST(GETDATE() AS DATE)
""",
)

