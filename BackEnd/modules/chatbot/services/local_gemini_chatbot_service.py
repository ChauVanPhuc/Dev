# -*- coding: utf-8 -*-
import os
import logging
import json
import re
import time
import requests
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List

logger = logging.getLogger("chatbot")

# ─── Database schema constant (provided to the AI for context) ───
DB_SCHEMA = """
════════════ MODULE CLAIM (Khiếu nại & Xuất hàng) ════════════

Table: customer_claims (Khiếu nại khách hàng)
- id: INT PK
- claim_code: NVARCHAR(50) — Mã KN, ví dụ 'Cabinet #12'
- customer_name: NVARCHAR(100)
- product_name: NVARCHAR(150) — SKU sản phẩm bị claim → LIÊN KẾT: cabinet_prices.cabinet_name (hoặc cabinet_prices.cabinet_code nếu trùng mã hàng)
- order_code: NVARCHAR(50) — Mã lỗi KH → LIÊN KẾT: client_defects.code
- company_error_code: NVARCHAR(50) — Mã lỗi G7
- severity: NVARCHAR(20) — 'Low', 'Medium', 'High'
- status: NVARCHAR(50) — 'Received' (Mới), 'Processing' (Đang xử lý), 'Resolved' (Đã xử lý)
- lpn: NVARCHAR(50) — Mã pallet
- container_no: NVARCHAR(50) → LIÊN KẾT: container_shipments.container_number
- action: NVARCHAR(200) — 'Full BC', '$50', 'Repair', 'X2 Unit'
- period: NVARCHAR(20) — 'MM-YYYY', ví dụ '02-2025' — LUÔN dùng để lọc theo tháng/năm
- image_paths, image_captions: NVARCHAR — JSON
- created_at, resolved_at: DATETIME

Table: cabinet_prices (Bảng giá tủ gỗ)
- id: INT PK
- cabinet_code: NVARCHAR(50) — Mã hàng → LIÊN KẾT: customer_claims.product_name (nếu lưu mã hàng), products.sku
- cabinet_name: NVARCHAR(150) — Tên sản phẩm/SKU → LIÊN KẾT: customer_claims.product_name
- material: NVARCHAR(100)
- dimensions: NVARCHAR(50)
- base_price: FLOAT — Giá gốc
- sale_price: FLOAT — Giá bán
- status: NVARCHAR(50) — 'Active', 'Inactive'
- last_updated: DATETIME

Table: container_shipments (Lịch trình xuất container)
- id: INT PK
- shipment_code: NVARCHAR(50)
- container_number: NVARCHAR(50) → LIÊN KẾT: customer_claims.container_no
- seal_number: NVARCHAR(50)
- destination_port: NVARCHAR(100)
- etd: DATETIME — Dự kiến xuất
- eta: DATETIME — Dự kiến đến
- status: NVARCHAR(50) — 'Draft', 'Loading', 'Shipped', 'Delivered'
- total_value: FLOAT
- created_at: DATETIME

════════════ MODULE PRODUCTION (Sản xuất) ════════════

Table: product_plans (Kế hoạch sản xuất)
- id: INT PK
- code: NVARCHAR(100) — Mã KHSX, ví dụ 'KHSX_04_2026'
- name: NVARCHAR(255) — Tên kế hoạch
- month: INT — Tháng
- year: INT — Năm
- status: INT — 0:Mới, 1:Đang làm, 2:Xong
- estimated_date: DATETIME — Ngày dự kiến hoàn thành
- finished_date: DATETIME — Ngày thực tế xong
- account_id: INT — ID người lập kế hoạch
- created_at, updated_at: DATETIME

Table: orders (Đơn hàng sản xuất)
- id: INT PK
- order_code: NVARCHAR(50) — Mã đơn hàng → LIÊN KẾT: delivery_details.order_id
- production_code: NVARCHAR(50) — Lệnh sản xuất
- partner_po: NVARCHAR(100) — Số PO đối tác
- customer_code: NVARCHAR(100)
- customer: NVARCHAR(255) — Tên khách hàng
- plan_id: INT FK → product_plans.id
- order_status: INT — 0:Mới, 1:Đang làm, 2:Xong
- delivery_date: DATETIME — Ngày giao hàng
- start_date: DATETIME — Ngày bắt đầu sản xuất
- finished_date: DATETIME — Hoàn thành thực tế
- estimated_date: DATETIME — Dự kiến hoàn thành
- is_priority: INT — 1:Ưu tiên, 0:Bình thường
- create_date: DATETIME

Table: products (Sản phẩm trong đơn hàng)
- id: INT PK
- sku: NVARCHAR(50) — Mã sản phẩm → LIÊN KẾT: customer_claims.product_name, cabinet_prices.cabinet_name, cabinet_prices.cabinet_code
- name: NVARCHAR(255) — Tên sản phẩm
- order_id: INT FK → orders.id
- category_id: INT FK → categories.id
- price: FLOAT
- material: NVARCHAR(255)
- quantity: FLOAT — Số lượng
- order_qty, production_qty, total_qty, loss_qty: FLOAT
- total_vnd: FLOAT — Tổng tiền VNĐ
- status: NVARCHAR(50)
- created_at: DATETIME

Table: master_products (Sản phẩm mẫu / BOM Master)
- id: INT PK
- sku: NVARCHAR(50) — Mã sản phẩm mẫu/BOM (unique) → LIÊN KẾT: products.sku, cabinet_prices.cabinet_name, cabinet_prices.cabinet_code
- name: NVARCHAR(255) — Tên sản phẩm mẫu
- category_id: INT FK → master_categories.id
- price: FLOAT — Giá dự kiến
- material: NVARCHAR(255) — Chất liệu chính
- color: NVARCHAR(100) — Màu sắc quy chuẩn
- length, width, height: FLOAT — Kích thước (L-W-H)
- weight: FLOAT
- status: NVARCHAR(50) — Trạng thái
- created_at: DATETIME

════════════ MODULE DELIVERY (Bàn giao nội bộ) ════════════

Table: deliveries (Phiếu bàn giao nội bộ)
- id: INT PK
- delivery_stage: NVARCHAR(50) — Công đoạn giao
- receiving_stage: NVARCHAR(50) — Công đoạn nhận
- plan_id: INT FK → product_plans.id
- order_id: INT FK → orders.id
- part_name: NVARCHAR(250) — Tên chi tiết được giao
- status: NVARCHAR(50) — 'Chờ xác nhận', 'Đã nhận', v.v.
- quantity_total: INT — Số lượng giao
- quantity_received: INT — Số lượng thực nhận
- quantity_error: INT — Số lượng lỗi
- quantity_returned: INT — Số lượng trả
- moisture_min, moisture_max: FLOAT — Độ ẩm
- created_at: DATETIME

Table: delivery_details (Chi tiết bàn giao)
- id: INT PK
- delivery_id: INT FK → deliveries.id
- order_id: INT FK → orders.id
- part_name: NVARCHAR(50) — Tên linh kiện
- quantity: INT
- element_name: NVARCHAR(100)

════════════ MODULE INSPECTION (Kiểm tra chất lượng) ════════════

Table: daily_inspection_records (Phiếu kiểm tra hằng ngày)
- id: INT PK
- inspection_date: DATE — Ngày kiểm
- stage_name: NVARCHAR(100) — Công đoạn kiểm
- inspector_id: INT FK → accounts.id
- total_products: INT — Tổng SP kiểm
- total_defects: INT — Tổng lỗi
- defect_rate: FLOAT — Tỷ lệ lỗi (%)
- created_at: DATETIME

Table: daily_inspection_defects (Chi tiết lỗi trong phiếu kiểm)
- id: INT PK
- record_id: INT FK → daily_inspection_records.id
- defect_id: INT FK → defect_types.id
- quantity: INT — Số lượng lỗi loại này

Table: input_inspections (Kiểm tra đầu vào chi tiết)
- id: INT PK
- plan_id: INT FK → product_plans.id
- part_name: NVARCHAR(255)
- cont_name: NVARCHAR(50) — Container
- stage: NVARCHAR(255) — Công đoạn kiểm
- result: NVARCHAR(20) — 'Đạt' | 'Không đạt'
- measured_length, measured_width, measured_height: FLOAT (mm)
- inspected_at: DATETIME

Table: client_defects (Danh mục mã lỗi QC)
- id: INT PK
- code: NVARCHAR(50) → LIÊN KẾT: customer_claims.order_code
- name: NVARCHAR(250) — Tên lỗi tiếng Việt
- name_en: NVARCHAR(250) — Tên lỗi tiếng Anh
- g7_code: NVARCHAR(50) — Mã G7 tương ứng
- is_active: BIT

════════════ MODULE KPI ════════════

Table: kpis (Chỉ số KPI)
- id: INT PK
- content: NVARCHAR(500) — Nội dung KPI
- target: FLOAT — Mục tiêu (%)
- actual: FLOAT — Thực hiện (%)
- status: NVARCHAR(50) — 'success'(Đạt), 'danger'(Không đạt), 'neutral'
- period_type: NVARCHAR(50) — 'Theo tháng', 'Theo tuần'
- period_name: NVARCHAR(50) — 'Tháng 1', 'Tuần 16', v.v.

════════════ QUAN HỆ GIỮA CÁC BẢNG (FOREIGN KEY & LIÊN KẾT NGẦM) ════════════

-- FOREIGN KEY thực sự:
orders.plan_id              → product_plans.id
products.order_id           → orders.id
deliveries.plan_id          → product_plans.id
deliveries.order_id         → orders.id
delivery_details.delivery_id→ deliveries.id
delivery_details.order_id   → orders.id
input_inspections.plan_id   → product_plans.id
daily_inspection_defects.record_id → daily_inspection_records.id
daily_inspection_defects.defect_id → defect_types.id

-- LIÊN KẾT NGẦM (JOIN bằng text):
customer_claims.product_name  ≈ products.sku ≈ cabinet_prices.cabinet_name (hoặc cabinet_prices.cabinet_code)
customer_claims.container_no  ≈ container_shipments.container_number
customer_claims.order_code    ≈ client_defects.code
"""

SYSTEM_PROMPT_TEMPLATE = """Bạn là trợ lý AI SmartFlow chuyên về quản lý khiếu nại (claims) và dữ liệu hệ thống ERP của doanh nghiệp sản xuất đồ gỗ.

Nhiệm vụ của bạn:
1. Trả lời câu hỏi về toàn bộ dữ liệu hệ thống SmartFlow, bao gồm:
   - Khiếu nại (customer_claims, cabinet_prices, container_shipments, client_defects)
   - Sản xuất (product_plans, orders, products, master_products)
   - Bàn giao nội bộ (deliveries, delivery_details)
   - Kiểm tra chất lượng (daily_inspection_records, daily_inspection_defects, input_inspections)
   - KPI (kpis)
2. Sử dụng công cụ execute_read_only_query để truy vấn dữ liệu, kể cả JOIN nhiều bảng khi cần.
3. Trả lời bằng tiếng Việt một cách tự nhiên, chuyên nghiệp, ngắn gọn.
4. Khi người dùng yêu cầu xem danh sách claim cụ thể, BẮT BUỘC dùng SELECT * FROM customer_claims để hệ thống hiển thị dạng thẻ (card).
5. Nhận biết trang hiện tại qua giá trị `current_page` trong phần Ngữ cảnh hiện tại (ví dụ: `/admin/claims`, `/admin/prices`, `/admin/shipments`, `/admin/dashboard`, `/manufacture`...). Hãy ưu tiên trả lời và đưa ra thông tin hoặc gợi ý phù hợp với phân hệ người dùng đang xem nếu câu hỏi của họ chung chung hoặc liên quan đến màn hình đó.

QUAN TRỌNG VỀ HIỂN THỊ VÀ BIỂU ĐỒ (CHARTS):
- Giao diện sẽ TỰ ĐỘNG hiển thị kết quả claim dưới dạng các card thông tin có nút "Xem chi tiết".
- Với dữ liệu không phải claim (production, KPI...), trả lời trực tiếp bằng văn bản.
- Không bao giờ liệt kê claim thủ công như "1. Tủ #51... 2. Tủ #49..." vì giao diện đã hiển thị card.
- KHI NGƯỜI DÙNG YÊU CẦU VẼ BIỂU ĐỒ (ví dụ: Pareto, cột, đường, tròn, phân tích lỗi khiếu nại...):
  + Bạn BẮT BUỘC phải chèn một thẻ `<chart type="..." title="...">` chứa dữ liệu JSON dạng `[{"name": "Tên", "value": Số}, ...]` ở cuối câu trả lời. Hệ thống frontend sẽ tự động render biểu đồ tương tác cực kỳ đẹp và sống động trực tiếp trong khung chat.
  + ĐỒNG THỜI, bạn phải đưa ra phần PHÂN TÍCH CHUYÊN SÂU bằng tiếng Việt ở phía dưới biểu đồ. Phần phân tích phải cực kỳ rõ ràng, chia làm 3 mục chính:
    1. **Điểm nổi bật (Highlights)**: Nhận xét cụ thể về xu hướng chính, lỗi/sản phẩm chiếm tỷ trọng cao nhất, hoặc biến động bất thường dựa trên số liệu thực tế của biểu đồ.
    2. **Phân tích nguyên nhân (Root Cause Analysis)**: Kết nối dữ liệu với hoạt động thực tế của nhà máy để suy luận nguyên nhân (ví dụ: lỗi "NỨT TÉT" liên quan đến công đoạn sấy gỗ/độ ẩm; lỗi "BẢN LỀ/HARDWARE" liên quan đến nhà cung cấp phụ kiện hoặc sai sót khi lắp ráp...).
    3. **Khuyến nghị & Hành động khắc phục (Actionable Advice)**: Đưa ra giải pháp kỹ thuật, quản lý chất lượng cụ thể để cải tiến quy trình sản xuất và ngăn chặn tái diễn.
  + Các loại biểu đồ hỗ trợ (type): 'pareto' (Pareto chart), 'bar' (Bar chart), 'line' (Line chart), 'pie' (Pie chart).
  Ví dụ định dạng thẻ chart bắt buộc:
  <chart type="pareto" title="Biểu đồ Pareto lỗi khiếu nại tháng 05/2026">
  [
    {"name": "NỨT", "value": 16},
    {"name": "CONG VÊNH", "value": 7},
    {"name": "BẢN LỀ KHÔNG HOẠT ĐỘNG", "value": 6}
  ]
  </chart>

VÍ DỤ — CLAIM:
- "Tháng 2/2025 phạt bao nhiêu tiền?" → dùng SUM(CASE...) với JOIN cabinet_prices
- "Năm 2025 có bao nhiêu khiếu nại?" → SELECT COUNT(*) FROM customer_claims WHERE period LIKE '%%-2025'
- "Claim trong tháng 2 gồm những gì?" → SELECT * FROM customer_claims WHERE period='02-2025'

VÍ DỤ — SẢN XUẤT:
- "Kế hoạch tháng 4/2026 gồm những đơn nào?" → SELECT o.order_code, o.customer, o.order_status FROM orders o JOIN product_plans p ON o.plan_id = p.id WHERE p.month=4 AND p.year=2026

VÍ DỤ — CROSS MODULE (nhiều bảng):
- "Sản phẩm T060D-BC-WOA bị claim bao nhiêu lần, giá bán là bao nhiêu?" → JOIN customer_claims với cabinet_prices
- "KPI tháng 5 đạt không?" → SELECT content, target, actual, status FROM kpis WHERE period_name LIKE '%%5%%'

Quy định bảo mật và kỹ thuật:
- CHỈ chạy các câu lệnh SELECT để đọc dữ liệu. Tuyệt đối không thử ghi, sửa đổi hay xóa dữ liệu.
- Trong SQL Server, khi so sánh chuỗi có dấu tiếng Việt, hãy dùng ký tự N đứng trước (ví dụ: status = N'Mới').
- GIỚI HẠN TOOL CALLS: Mỗi câu hỏi chỉ được gọi execute_read_only_query TỐI ĐA 2 LẦN.
- TUYỆT ĐỐI CẤM: Không được chạy nhiều query riêng lẻ cho từng giá trị. THAY VÀO ĐÓ phải dùng GROUP BY trong 1 query duy nhất.
- LỌC THEO NĂM: Dùng period LIKE '%%-YYYY'. KHÔNG dùng YEAR(created_at).
- LỌC THEO THÁNG: Dùng period = 'MM-YYYY'.
- Khi người dùng hỏi "năm nay", "tháng này", dùng tool get_current_datetime trước để xác định năm/tháng.
- KHI CÂU HỎI LIÊN QUAN NHIỀU BẢNG, dùng JOIN.

⚠️ CẢNH BÁO CỰC KỲ QUAN TRỌNG VỀ ĐẾM SẢN PHẨM (master_products vs products):
- TRANG SẢN PHẨM MẪU vs SẢN PHẨM THỰC TẾ:
  + Bảng `master_products` (BOM Master) chứa danh mục các mã sản phẩm mẫu duy nhất (không trùng lặp SKU).
  + Bảng `products` lưu sản phẩm đi kèm với đơn hàng thực tế (orders), nên một SKU sẽ xuất hiện nhiều lần (lặp lại) cho nhiều đơn hàng.
  + ĐẶC BIỆT CHÚ Ý: Khi người dùng hỏi "có bao nhiêu sản phẩm", "tìm kiếm sản phẩm", "danh sách sản phẩm" hoặc các câu hỏi đếm sản phẩm của một dòng cụ thể (ví dụ: "có bao nhiêu sản phẩm dòng APT", "đếm sản phẩm dòng ADV", "danh mục sản phẩm có bao nhiêu dòng APT"), bạn BẮT BUỘC phải truy vấn đếm trên bảng `master_products` (ví dụ: SELECT COUNT(*) FROM master_products WHERE sku LIKE '%APT%'). Tuyệt đối KHÔNG ĐƯỢC truy vấn bảng `products` cho các câu hỏi này vì bảng `products` chứa sản phẩm lặp theo đơn hàng dẫn tới kết quả đếm bị sai lệch (ví dụ đếm ra 48 thay vì số chính xác trong danh mục mẫu).
  + Chỉ truy vấn bảng `products` khi câu hỏi hỏi cụ thể về sản lượng sản xuất, số lượng đặt hàng, hoặc số lượng đi kèm đơn hàng cụ thể (ví dụ: "tổng số lượng sản phẩm APT đã sản xuất/đặt hàng là bao nhiêu").
- Bảng client_defects chỉ là BẢNG TRA CỨU danh mục mã lỗi QC (chỉ có các cột: id, code, name, name_en, g7_code, is_active). Bảng này KHÔNG CÓ cột period, KHÔNG CÓ cột created_at, KHÔNG CÓ dữ liệu theo thời gian. KHÔNG BAO GIỜ truy vấn client_defects với điều kiện WHERE period hoặc WHERE created_at.
- Bảng customer_claims là BẢNG DỮ LIỆU CHÍNH chứa tất cả khiếu nại theo thời gian (có cột period dạng 'MM-YYYY'). Cột order_code trong bảng customer_claims lưu MÃ lỗi QC. Chú ý: Cột này có thể chứa một hoặc nhiều mã lỗi phân tách bằng dấu phẩy (ví dụ: 'DVA_05' hoặc 'DVA_05, DVP_05').
- Khi người dùng hỏi về tên lỗi tiếng Việt (ví dụ: "lỗi nứt tét", "lỗi móp", "bong tróc"), bạn BẮT BUỘC phải JOIN customer_claims c với client_defects d bằng biểu thức so khớp danh sách dấu phẩy để không bị sót khi có nhiều lỗi trong 1 dòng:
  ON (',' + REPLACE(c.order_code, ' ', '') + ',' LIKE '%,' + d.code + ',%')
  Sau đó lọc theo d.name bằng tiếng Việt. CHÚ Ý: Danh mục lỗi trong database lưu các từ khóa ngắn, tổng quát (ví dụ: lỗi nứt tét lưu là 'NỨT', lỗi bong tróc lưu là 'BONG TRÓC SƠN'/'BONG TRÓC VENEER', lỗi móp méo lưu là 'MÓP'). Do đó, khi lọc d.name, hãy trích xuất từ khóa cốt lõi ngắn nhất và sử dụng LIKE N'%[từ khóa]%' để so khớp chính xác:
  + Nếu hỏi "nứt tét", "nứt vỡ", "nứt" -> dùng: d.name LIKE N'%nứt%'
  + Nếu hỏi "bong tróc", "bông tróc", "tróc sơn" -> dùng: d.name LIKE N'%tróc%'
  + Nếu hỏi "móp", "móp méo" -> dùng: d.name LIKE N'%móp%'
  + Nếu hỏi "mốc", "ẩm mốc" -> dùng: d.name LIKE N'%mốc%'
- Khi người dùng hỏi "có bao nhiêu lỗi", "gồm những lỗi nào", "loại lỗi gì" → PHẢI truy vấn customer_claims (JOIN với client_defects bằng biểu thức so khớp trên để lấy tên lỗi).

VÍ DỤ — CÂU HỎI TIẾP NỐI (follow-up) & LỌC TÊN LỖI:
- "Tháng 2 năm 2026 có bao nhiêu lỗi bị nứt tét?" → SELECT COUNT(*) FROM customer_claims c JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',' LIKE '%%,' + d.code + ',%%') WHERE d.name LIKE N'%%nứt%%' AND c.period='02-2026'
- "Tháng 2 có bao nhiêu claim?" → SELECT COUNT(*) FROM customer_claims WHERE period='02-2026'
- "Gồm những lỗi nào?" → SELECT d.code, d.name, COUNT(*) as so_luong FROM customer_claims c JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',' LIKE '%%,' + d.code + ',%%') WHERE c.period='02-2026' GROUP BY d.code, d.name ORDER BY so_luong DESC
- "Gồm những phiếu nào?" → SELECT * FROM customer_claims WHERE period='02-2026'
- "Chi tiết tủ 12" → SELECT * FROM customer_claims WHERE claim_code LIKE '%%12%%'

QUY TẮC TÍNH GIÁ TRỊ PHẠT (QUAN TRỌNG):
Cột action trong customer_claims có thể là:
  • Số tiền cố định: '$50', '$100', '$200', v.v. → lấy số tiền đó làm giá trị phạt
  • 'Full BC' → giá trị phạt = sale_price của sản phẩm trong bảng cabinet_prices
  • 'X2 Unit' → giá trị phạt = sale_price × 2 (từ cabinet_prices)
  • 'Repair' hoặc 'Nhắc nhở' → giá trị phạt = 0

SQL MẪU — TỔNG TIỀN PHẠT (có JOIN cabinet_prices):
SELECT
  SUM(CASE
    WHEN c.action LIKE '$%%'
      THEN TRY_CAST(REPLACE(REPLACE(c.action, '$', ''), ' ', '') AS FLOAT)
    WHEN c.action = 'Full BC'
      THEN COALESCE(p.sale_price, 0)
    WHEN c.action = 'X2 Unit'
      THEN COALESCE(p.sale_price * 2, 0)
    ELSE 0
  END) AS tong_tien_phat
FROM customer_claims c
LEFT JOIN cabinet_prices p ON (c.product_name = p.cabinet_name OR c.product_name = p.cabinet_code)
WHERE c.period = '02-2025'

SQL MẪU — CHI TIẾT TỪNG DÒNG PHẠT:
SELECT
  c.action,
  c.product_name,
  p.cabinet_name,
  p.sale_price,
  COUNT(*) as so_luong,
  SUM(CASE
    WHEN c.action LIKE '$%%'
      THEN TRY_CAST(REPLACE(REPLACE(c.action, '$', ''), ' ', '') AS FLOAT)
    WHEN c.action = 'Full BC'
      THEN COALESCE(p.sale_price, 0)
    WHEN c.action = 'X2 Unit'
      THEN COALESCE(p.sale_price * 2, 0)
    ELSE 0
  END) AS tong_gia_tri
FROM customer_claims c
LEFT JOIN cabinet_prices p ON (c.product_name = p.cabinet_name OR c.product_name = p.cabinet_code)
WHERE c.period = '02-2026'
GROUP BY c.action, c.product_name, p.cabinet_name, p.sale_price
ORDER BY tong_gia_tri DESC

BẮT BUỘC định dạng bảng dưới dạng bảng HTML kẻ viền (KHÔNG dùng bảng Markdown):
<table style="width: 100%%; border-collapse: collapse; margin: 10px 0; font-size: 13px; border: 1px solid #dcdcdc;">
  <thead>
    <tr style="background-color: #6F4E37; color: white;">
      <th style="padding: 8px; text-align: left; border: 1px solid #dcdcdc;">Cột</th>
    </tr>
  </thead>
  <tbody>
    <!-- các dòng xen kẽ background-color: #fdfaf6 và #ffffff -->
    <!-- dòng tổng cộng có background-color: #f5ebe0; font-weight: bold; -->
  </tbody>
</table>

CẤU TRÚC CƠ SỞ DỮ LIỆU (đã được nhúng sẵn, không cần gọi get_database_schema):
{DB_SCHEMA}
"""

SYSTEM_PROMPT = SYSTEM_PROMPT_TEMPLATE.replace("{DB_SCHEMA}", DB_SCHEMA)

class LocalGeminiChatbotService:
    def __init__(self):
        # Configure endpoints from environment variables or use defaults
        self.api_url = os.getenv("LOCAL_GEMINI_URL", "http://localhost:8081/v1/chat/completions")
        self.model_name = os.getenv("LOCAL_GEMINI_MODEL", "gemini-3.5-flash-thinking")
        self.api_key = os.getenv("LOCAL_GEMINI_API_KEY", "")
        self.max_retries = 2
        self.retry_delay = 1
        self.active_model = self.model_name
        self.available_models = []

    def get_base_url(self) -> str:
        base_url = self.api_url.split("/chat/completions")[0]
        return base_url.rstrip("/")

    def is_available(self) -> bool:
        """
        Check if local Gemini proxy is active and scan for available models.
        """
        base_url = self.get_base_url()
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            res = requests.get(f"{base_url}/models", headers=headers, timeout=2.0)
            if res.status_code == 200:
                data = res.json().get("data", [])
                self.available_models = [m.get("id") for m in data]
                
                # Check if configured model is available
                if self.model_name in self.available_models:
                    self.active_model = self.model_name
                elif self.available_models:
                    # Fallback to thinking model if available, else first model
                    thinking_models = [m for m in self.available_models if "thinking" in m.lower()]
                    if thinking_models:
                        self.active_model = thinking_models[0]
                    else:
                        self.active_model = self.available_models[0]
                return True
        except Exception as e:
            logger.debug(f"Local Gemini Proxy not responding on {base_url}/models: {e}")
        return False

    def get_database_schema(self) -> str:
        return DB_SCHEMA

    def get_current_datetime(self) -> str:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def execute_read_only_query(self, query: str, db_session, captured_items: list) -> str:
        """
        Executes a read-only T-SQL query on the database.
        Includes advanced self-healing logic to repair SQL syntax errors.
        """
        if not db_session:
            return json.dumps({"error": "Database session is not available."})

        if not query or not query.strip():
            return json.dumps({"error": "Empty query provided."})

        clean_query = query.strip()

        # ─── SQL SELF-HEALING LOGIC (ADAPTED FROM OLLAMA SERVICE) ───
        
        # 1. Clean backslash escapes
        clean_query = clean_query.replace("\\\\", "\x00DBLBS\x00")
        clean_query = re.sub(r'\\([^\\])', r'\1', clean_query)
        clean_query = clean_query.replace("\x00DBLBS\x00", "\\")
        
        # 2. Remove table braces [customer_claims] -> customer_claims
        clean_query = re.sub(r'\[(\w+)\]', r'\1', clean_query)
        
        # 3. Clean merged alias/columns (caction -> c.action, pbase_price -> p.base_price, etc)
        merged_c_cols = "action|period|status|claim_code|product_name|order_code|company_error_code|severity|lpn|container_no|created_at|resolved_at"
        clean_query = re.sub(rf"\bc({merged_c_cols})\b", r"c.\1", clean_query, flags=re.IGNORECASE)
        merged_p_cols = "sale_price|base_price|cabinet_name|cabinet_code|material|dimensions"
        clean_query = re.sub(rf"\bp({merged_p_cols})\b", r"p.\1", clean_query, flags=re.IGNORECASE)
        merged_d_cols = "name|code|description|severity|category"
        clean_query = re.sub(rf"\bd({merged_d_cols})\b", r"d.\1", clean_query, flags=re.IGNORECASE)
        
        # 4. Standardize ON ON -> ON
        clean_query = re.sub(r"\bON\s+ON\b", "ON", clean_query, flags=re.IGNORECASE)

        # 5. Automatically repair CASE WHEN penalty calculation on wrong columns
        lower_q = clean_query.lower()
        if "case when" in lower_q and ("p.sale_price like" in lower_q or "p.base_price like" in lower_q or "c.sale_price" in lower_q or "c.price" in lower_q):
            from_idx = lower_q.find("from ")
            if from_idx > 0:
                from_part = clean_query[from_idx:]
                if "join cabinet_prices" not in from_part.lower():
                    from_part = re.sub(
                        r"from\s+customer_claims(\s+c)?",
                        "FROM customer_claims c LEFT JOIN cabinet_prices p ON c.product_name = p.cabinet_name",
                        from_part, flags=re.IGNORECASE
                    )
                clean_query = (
                    "SELECT SUM(CASE WHEN c.action LIKE '$%' THEN CAST(REPLACE(REPLACE(c.action, '$', ''), ',', '') AS DECIMAL(18,2)) "
                    "WHEN c.action = 'Full BC' THEN COALESCE(p.sale_price, 0) "
                    "WHEN c.action = 'X2 Unit' THEN COALESCE(p.sale_price, 0) * 2 "
                    "ELSE 0 END) AS total_penalty " + from_part
                )
                print(f"\033[93m[LocalGemini_SQL Self-Healing] Repaired CASE WHEN penalty columns: {clean_query}\033[0m")

        # 6. Correct c.sale_price, c.price -> p.sale_price
        if "c.sale_price" in clean_query.lower() or "c.price" in clean_query.lower() or "c.base_price" in clean_query.lower():
            clean_query = re.sub(r'\bc\.sale_price\b', 'p.sale_price', clean_query, flags=re.IGNORECASE)
            clean_query = re.sub(r'\bc\.base_price\b', 'p.base_price', clean_query, flags=re.IGNORECASE)
            clean_query = re.sub(r'\bc\.price\b', 'p.sale_price', clean_query, flags=re.IGNORECASE)
            print(f"\033[93m[LocalGemini_SQL Self-Healing] Fixed c.sale_price/c.price -> p.sale_price\033[0m")

        # 7. Correct c.defect_name -> d.name
        if "c.defect_name" in clean_query.lower():
            clean_query = re.sub(r'\bc\.defect_name\b', 'd.name', clean_query, flags=re.IGNORECASE)
            print(f"\033[93m[LocalGemini_SQL Self-Healing] Fixed c.defect_name -> d.name\033[0m")

        # 8. Correct penalty_amount -> penalty
        if "penalty_amount" in clean_query:
            clean_query = clean_query.replace("penalty_amount", "penalty")

        # 9. Auto join client_defects if using d.name / d.code but missing JOIN statement
        lower_query = clean_query.lower()
        has_defect_col = "defect_name" in lower_query or "defect_code" in lower_query or "d.name" in lower_query or "d.code" in lower_query
        if has_defect_col and "join client_defects" not in lower_query:
            clean_query = re.sub(
                r"from\s+customer_claims(\s+c)?", 
                "FROM customer_claims c JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%')", 
                clean_query, 
                flags=re.IGNORECASE
            )
            print(f"\033[93m[LocalGemini_SQL Self-Healing] Auto-added missing JOIN client_defects\033[0m")
            lower_query = clean_query.lower()

        # 10. Normalize defect aliases (defect_name -> d.name AS defect_name)
        if "join client_defects d" in clean_query.lower() or "join client_defects as d" in clean_query.lower():
            clean_query = re.sub(r"(?<!d\.name\s)(?<!d\.name\sas\s)(?<!d\.name\sAS\s)\bdefect_name\b", "d.name AS defect_name", clean_query, flags=re.IGNORECASE)
            clean_query = re.sub(r"(?<!d\.code\s)(?<!d\.code\sas\s)(?<!d\.code\sAS\s)\bdefect_code\b", "d.code AS defect_code", clean_query, flags=re.IGNORECASE)

        # 11. Auto-inject alias c if missing in customer_claims table reference
        if "c." in clean_query and "customer_claims c" not in clean_query.lower() and "customer_claims as c" not in clean_query.lower():
            clean_query = re.sub(r"from\s+customer_claims", "FROM customer_claims c", clean_query, flags=re.IGNORECASE)
            lower_query = clean_query.lower()

        # 12. Correct defect names to match database keywords
        if "nứt tét" in clean_query:
            clean_query = clean_query.replace("nứt tét", "nứt")
        if "móp méo" in clean_query:
            clean_query = clean_query.replace("móp méo", "móp")

        # 13. Auto-fix JOIN client_defects syntax errors (parenthesis issues)
        if "client_defects" in clean_query.lower() and "join client_defects" in clean_query.lower():
            try:
                join_idx = clean_query.lower().find("join client_defects")
                on_part = clean_query[join_idx:]
                pattern = re.compile(r"on\s+[\s\S]+?(?=\bwhere\b|\border\b|\bgroup\b|$)", re.IGNORECASE)
                on_clause_match = pattern.search(on_part)
                if on_clause_match:
                    on_clause = on_clause_match.group(0)
                    on_clause_normalized = on_clause.lower().replace('"', "'")
                    if (on_clause.count('(') != on_clause.count(')') or 
                        "like" not in on_clause_normalized or 
                        "replace(c.order_code, ' ', '')" not in on_clause_normalized.replace(" '", "'").replace("' ", "'") or
                        "',' +" not in on_clause_normalized or
                        "d.code" not in on_clause_normalized):
                        standard_on = "ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%') "
                        clean_query = clean_query[:join_idx] + pattern.sub(standard_on, on_part)
                        print(f"\033[93m[LocalGemini_SQL Self-Healing] Fixed client_defects JOIN condition syntax\033[0m")
            except Exception as join_err:
                logger.warning(f"Error repairing join condition: {join_err}")

        # 14. Auto join cabinet_prices if using p. alias but missing JOIN statement
        lower_query = clean_query.lower()
        if "p." in clean_query and "join cabinet_prices" not in lower_query:
            try:
                clean_query = re.sub(
                    r"from\s+customer_claims(\s+c)?", 
                    "FROM customer_claims c LEFT JOIN cabinet_prices p ON c.product_name = p.cabinet_name", 
                    clean_query, 
                    flags=re.IGNORECASE
                )
                print(f"\033[93m[LocalGemini_SQL Self-Healing] Auto-added missing JOIN cabinet_prices p\033[0m")
            except Exception as p_join_err:
                logger.warning(f"Error adding cabinet_prices join: {p_join_err}")

        # 15. Fix hallucinated quantity column in customer_claims
        if "quantity" in clean_query.lower():
            try:
                clean_query = re.sub(r"sum\(\s*(c\.)?quantity\s*\)", "COUNT(*)", clean_query, flags=re.IGNORECASE)
                clean_query = re.sub(r"\b(c\.)?quantity\b", "1", clean_query, flags=re.IGNORECASE)
                clean_query = re.sub(r"group\s+by\s+([^,]+?)\s*,\s*1\b", r"GROUP BY \1", clean_query, flags=re.IGNORECASE)
                clean_query = re.sub(r"group\s+by\s+1\b", "", clean_query, flags=re.IGNORECASE)
                print(f"\033[93m[LocalGemini_SQL Self-Healing] Auto-fixed hallucinated quantity column\033[0m")
            except Exception as qty_err:
                logger.warning(f"Error handling quantity hallucination: {qty_err}")

        # 16. Convert SQLite LIMIT to T-SQL TOP
        if "limit " in clean_query.lower():
            try:
                limit_match = re.search(r"\blimit\s+(\d+)\b", clean_query, flags=re.IGNORECASE)
                if limit_match:
                    limit_num = limit_match.group(1)
                    clean_query = re.sub(r"\blimit\s+\d+\b", "", clean_query, flags=re.IGNORECASE).strip()
                    if not re.search(r"\bselect\s+top\b", clean_query, flags=re.IGNORECASE):
                        clean_query = re.sub(
                            r"\bselect\s+(distinct\s+)?", 
                            rf"SELECT \1TOP {limit_num} ", 
                            clean_query, 
                            count=1, 
                            flags=re.IGNORECASE
                        )
                        print(f"\033[93m[LocalGemini_SQL Self-Healing] Converted LIMIT to TOP {limit_num}\033[0m")
            except Exception as limit_err:
                logger.warning(f"Error converting LIMIT to TOP: {limit_err}")

        # 17. Convert SQLite string concatenation || to T-SQL +
        if "||" in clean_query:
            clean_query = clean_query.replace("||", "+")
            print(f"\033[93m[LocalGemini_SQL Self-Healing] Converted string concatenation || to +\033[0m")

        # 18. Fix MONTH/YEAR functions on nvarchar period field
        if "month(" in clean_query.lower() or "year(" in clean_query.lower():
            try:
                clean_query = re.sub(r"\bmonth\(([a-zA-Z0-9_.]*period)\)", r"CAST(LEFT(\1, 2) AS INT)", clean_query, flags=re.IGNORECASE)
                clean_query = re.sub(r"\byear\(([a-zA-Z0-9_.]*period)\)", r"CAST(RIGHT(\1, 4) AS INT)", clean_query, flags=re.IGNORECASE)
                print(f"\033[93m[LocalGemini_SQL Self-Healing] Corrected MONTH/YEAR on period column\033[0m")
            except Exception as dt_err:
                logger.warning(f"Error repairing MONTH/YEAR on period: {dt_err}")

        # 19. Auto join client_defects if using d. alias but missing JOIN statement (post modifications check)
        lower_query = clean_query.lower()
        if "d." in clean_query and "join client_defects" not in lower_query:
            try:
                clean_query = re.sub(
                    r"from\s+customer_claims(\s+c)?", 
                    "FROM customer_claims c LEFT JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%')", 
                    clean_query, 
                    flags=re.IGNORECASE
                )
                print(f"\033[93m[LocalGemini_SQL Self-Healing] Auto-added missing JOIN client_defects d\033[0m")
            except Exception as d_join_err:
                logger.warning(f"Error adding client_defects join: {d_join_err}")

        # 20. Remove useless GROUP BY clauses without aggregates
        if "group by" in clean_query.lower():
            aggregates = ["count(", "sum(", "avg(", "max(", "min("]
            if not any(agg in clean_query.lower() for agg in aggregates):
                clean_query = re.sub(r"group\s+by\s+[\s\S]+?(?=\border\b|$)", "", clean_query, flags=re.IGNORECASE).strip()
                print(f"\033[93m[LocalGemini_SQL Self-Healing] Removed useless GROUP BY\033[0m")

        # 21. Fix GROUP BY column omission errors (non-aggregated columns in SELECT must be in GROUP BY)
        if "group by" in clean_query.lower():
            try:
                lower_q = clean_query.lower()
                from_idx = lower_q.find("from ")
                group_idx = lower_q.find("group by")
                if from_idx > 0 and group_idx > from_idx:
                    select_part = clean_query[:from_idx]
                    group_part = clean_query[group_idx:]
                    cols_in_select = set(re.findall(r"\b([cpds]\.[a-zA-Z0-9_]+)\b", select_part, re.IGNORECASE))
                    
                    aggregated_cols = set()
                    for col in cols_in_select:
                        for m in re.finditer(re.escape(col), select_part, re.IGNORECASE):
                            idx = m.start()
                            prefix = select_part[max(0, idx-20):idx].lower()
                            if any(agg in prefix for agg in ["sum", "count", "avg", "max", "min"]):
                                if re.search(r"\b(sum|count|avg|max|min)\s*\(\s*" + re.escape(col), select_part, re.IGNORECASE):
                                    aggregated_cols.add(col)
                                    break
                    
                    non_aggregated_cols = cols_in_select - aggregated_cols
                    missing_cols = []
                    for col in non_aggregated_cols:
                        if col.lower() not in group_part.lower():
                            missing_cols.append(col)
                            
                    if missing_cols:
                        order_idx = group_part.lower().find("order by")
                        if order_idx > 0:
                            gp_main = group_part[:order_idx].strip()
                            gp_order = group_part[order_idx:]
                            new_gp = gp_main + ", " + ", ".join(missing_cols) + " " + gp_order
                        else:
                            new_gp = group_part.strip() + ", " + ", ".join(missing_cols)
                            
                        clean_query = clean_query[:group_idx] + new_gp
                        print(f"\033[93m[LocalGemini_SQL Self-Healing] Added missing columns to GROUP BY\033[0m")
            except Exception as grp_err:
                logger.warning(f"Error repairing GROUP BY columns: {grp_err}")

        # 22. Remove duplicate JOINs (e.g. joining a table twice)
        for table in ["cabinet_prices", "client_defects", "container_shipments"]:
            lower_q = clean_query.lower()
            join_str = f"join {table}"
            if lower_q.count(join_str) > 1:
                try:
                    first_idx = lower_q.find(join_str)
                    second_idx = lower_q.find(join_str, first_idx + len(join_str))
                    if second_idx > 0:
                        start_delete_idx = second_idx
                        prefix = clean_query[max(0, second_idx - 15):second_idx].lower()
                        for modifier in ["left ", "right ", "inner ", "cross "]:
                            if modifier in prefix:
                                start_delete_idx = second_idx - (len(prefix) - prefix.rfind(modifier))
                                break
                        
                        end_delete_idx = len(clean_query)
                        for keyword in ["join ", "where ", "group by", "order by"]:
                            kw_idx = lower_q.find(keyword, second_idx + len(join_str))
                            if kw_idx > 0 and kw_idx < end_delete_idx:
                                end_delete_idx = kw_idx
                                
                        clean_query = clean_query[:start_delete_idx] + " " + clean_query[end_delete_idx:]
                        print(f"\033[93m[LocalGemini_SQL Self-Healing] Removed duplicate JOIN {table}\033[0m")
                except Exception as join_dup_err:
                    logger.warning(f"Error removing duplicate join: {join_dup_err}")

        # Security check: verify SQL only reads data (SELECT statements only)
        forbidden_keywords = ["insert", "update", "delete", "drop", "alter", "create", "truncate", "grant"]
        for keyword in forbidden_keywords:
            if re.search(r"\b" + keyword + r"\b", clean_query.lower()):
                return json.dumps({"error": "Lỗi bảo mật: Chỉ được thực hiện câu lệnh SELECT đọc dữ liệu."})

        # Ensure SELECT is at the beginning
        if not clean_query.lower().strip().startswith("select"):
            return json.dumps({"error": "Lỗi bảo mật: Truy vấn SQL phải bắt đầu bằng SELECT."})

        print(f"\033[96m[LocalGemini_SQL] EXECUTING:\033[0m {clean_query}")
        try:
            from sqlalchemy import text
            result = db_session.execute(text(clean_query))
            
            if result.returns_rows:
                rows = result.fetchall()
                keys = list(result.keys())
                
                # Heavy columns to strip from AI context (keep for UI cards only)
                HEAVY_COLS = {"image_paths", "image_captions", "description"}
                
                full_data = []
                for row in rows:
                    row_dict = {}
                    for i, val in enumerate(row):
                        if isinstance(val, datetime):
                            row_dict[keys[i]] = val.strftime("%Y-%m-%d %H:%M:%S")
                        elif isinstance(val, Decimal):
                            row_dict[keys[i]] = float(val)
                        else:
                            row_dict[keys[i]] = val
                    full_data.append(row_dict)
                
                # Capture claims data for UI card display
                if "customer_claims" in clean_query.lower():
                    if full_data and "claim_code" in full_data[0]:
                        captured_items.extend(full_data)

                # Build trimmed data for AI (max 20 rows, strip heavy columns)
                AI_ROW_LIMIT = 20
                trimmed_data = []
                for row_dict in full_data[:AI_ROW_LIMIT]:
                    trimmed = {k: v for k, v in row_dict.items() if k not in HEAVY_COLS}
                    trimmed_data.append(trimmed)

                total_rows = len(full_data)
                print(f"\033[96m[LocalGemini_SQL] ROWS RETURNED:\033[0m {total_rows}")

                if total_rows > AI_ROW_LIMIT:
                    return json.dumps({
                        "total_rows": total_rows,
                        "note": f"Database has {total_rows} rows total. Only first {AI_ROW_LIMIT} shown below. Use total_rows when answering the user.",
                        "data": trimmed_data,
                        "columns": [k for k in keys if k not in HEAVY_COLS]
                    }, ensure_ascii=False)

                return json.dumps({
                    "total_rows": total_rows,
                    "data": trimmed_data,
                    "columns": [k for k in keys if k not in HEAVY_COLS]
                }, ensure_ascii=False)
            else:
                db_session.commit()
                return json.dumps({
                    "success": True,
                    "message": "Query executed successfully (no rows returned)"
                })
        except Exception as db_err:
            logger.error(f"\033[91m[LocalGemini_SQL] DATABASE ERROR:\033[0m {db_err}")
            return json.dumps({"error": str(db_err)}, ensure_ascii=False)

    def _post_process_response(self, text: str) -> str:
        """Post-process the AI response to clean up currency references, clean markdown, etc."""
        if not text:
            return text
        # Replace 'đồng' or 'VND' with 'USD' for claims penalties context
        text = re.sub(r'(\d[\d,.]*\s*)(đồng|VND|vnd)', r'\1USD', text)
        text = text.replace(' đồng.', ' USD.').replace(' đồng,', ' USD,').replace(' đồng ', ' USD ')
        # Strip trailing garbage characters if any
        text = re.sub(r'[Ѐ-ӿ一-鿿]+\s*$', '', text).strip()
        return text

    def _parse_text_tool_call(self, content: str) -> dict:
        """
        Extract tool call parameters from text response if the model fails to use native tool calling schema.
        Supports markdown codeblocks, JSON parser, and raw T-SQL SELECT statements.
        """
        if not content:
            return None

        # 1. Look for ```sql SELECT ... ``` or ``` SELECT ... ```
        sql_match = re.search(r"```(?:sql)?\s*(SELECT[\s\S]+?)```", content, re.IGNORECASE)
        if sql_match:
            query = sql_match.group(1).strip()
            return {
                "name": "execute_read_only_query",
                "arguments": {"query": query}
            }

        # 2. Look for JSON block and attempt to repair braces if cut off
        start_idx = content.find('{')
        if start_idx != -1:
            json_str = ""
            brace_count = 0
            in_string = False
            escape = False
            
            for i in range(start_idx, len(content)):
                char = content[i]
                if escape:
                    json_str += char
                    escape = False
                    continue
                if char == '\\':
                    json_str += char
                    escape = True
                    continue
                if char == '"':
                    json_str += char
                    in_string = not in_string
                    continue
                if in_string:
                    json_str += char
                else:
                    if char in '{}[]:,0123456789.+-eE' or char.isspace() or char in 'tTfFnN':
                        json_str += char
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                break
            
            if brace_count > 0:
                if in_string:
                    json_str += '"'
                json_str += '}' * brace_count
                
            try:
                data = json.loads(json_str)
                if isinstance(data, dict):
                    # Recursive search for query or sql key
                    def find_query_key(d):
                        if not isinstance(d, dict):
                            return None
                        for target in ["query", "sql"]:
                            if target in d and isinstance(d[target], str):
                                return d[target]
                        for k, v in d.items():
                            if isinstance(v, dict):
                                res = find_query_key(v)
                                if res:
                                    return res
                        return None
                        
                    query_val = find_query_key(data)
                    if query_val:
                        return {
                            "name": "execute_read_only_query",
                            "arguments": {"query": query_val}
                        }
            except Exception as e:
                logger.debug(f"[JSON Repair] Failed to parse JSON: {json_str}. Error: {e}")

        # 3. Fallback regex search for direct SELECT statement
        if "select " in content.lower() and "from " in content.lower():
            select_match = re.search(r"(SELECT[\s\S]+?)(?:;|$|\n\n|\})", content, re.IGNORECASE)
            if select_match:
                query = select_match.group(1).strip()
                if len(query) < 1500 and "from" in query.lower():
                    query = query.replace("{", "").replace("}", "").replace("\\\"", "\"").strip()
                    if query.startswith('"') and query.endswith('"'):
                        query = query[1:-1]
                    if query.startswith("'") and query.endswith("'"):
                        query = query[1:-1]
                    return {
                        "name": "execute_read_only_query",
                        "arguments": {"query": query}
                    }

        return None

    def chat_with_ai(self, message: str, db_session, context: Dict[str, Any] = None, history: list = None) -> Dict[str, Any]:
        """
        Communicates with local Gemini server, handling conversation flow and tool invocation.
        """
        # Ensure server is reachable and fetch/validate model list
        if not self.is_available():
            return {"intent": "error", "message": f"Local Gemini proxy is not running at {self.get_base_url()}"}

        captured_items = []
        if history is None:
            history = []

        headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        # Define OpenAI-compatible tools schema
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_database_schema",
                    "description": "Lấy cấu trúc và mối liên kết của tất cả các bảng trong cơ sở dữ liệu."
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_current_datetime",
                    "description": "Lấy ngày giờ hệ thống hiện tại dưới dạng chuỗi YYYY-MM-DD HH:MM:SS."
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "execute_read_only_query",
                    "description": "Thực thi một câu lệnh SQL Server (T-SQL) SELECT chỉ đọc và trả về kết quả JSON.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Câu lệnh SELECT hoàn chỉnh cần thực thi."
                            }
                        },
                        "required": ["query"]
                    }
                }
            }
        ]

        # Map tool names to python functions
        tool_map = {
            "get_database_schema": self.get_database_schema,
            "get_current_datetime": self.get_current_datetime,
            "execute_read_only_query": lambda q: self.execute_read_only_query(q, db_session, captured_items)
        }

        # Build message history
        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            }
        ]

        # Inject conversation history
        for turn in history:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        # Inject context filter details if present
        context_str = ""
        if context:
            parts = []
            for k, v in context.items():
                if v is not None and not k.startswith("last_items") and not k.startswith("last_intent"):
                    parts.append(f"- {k}: {v}")
            if parts:
                context_str = "\n\nNgữ cảnh hiện tại:\n" + "\n".join(parts)

        user_content = f"Câu hỏi của người dùng: {message}"
        if context_str:
            user_content = f"[{context_str.strip()}]\n\n{user_content}"

        messages.append({
            "role": "user",
            "content": user_content
        })

        MAX_TOOL_ROUNDS = 3  # Allow up to 3 rounds of tool executions
        last_error = None

        for attempt in range(self.max_retries + 1):
            try:
                for round_idx in range(MAX_TOOL_ROUNDS):
                    payload = {
                        "model": self.active_model,
                        "messages": messages,
                        "temperature": 0.1
                    }
                    
                    # Thinking models often do not accept tools in standard API formats
                    # if they are reasoning-only, but let's include tools by default.
                    if "thinking" not in self.active_model.lower():
                        payload["tools"] = tools
                        payload["tool_choice"] = "auto"
                    else:
                        # For reasoning models, we also send tools. Gemini Web2API handles converting 
                        # tool calling for flash-thinking as well. Let's send tools to ensure compatibility.
                        payload["tools"] = tools
                        payload["tool_choice"] = "auto"

                    print(f"[LocalGemini] Sending request (round {round_idx+1}) using model: {self.active_model}")
                    res = requests.post(self.api_url, headers=headers, json=payload, timeout=45.0)
                    
                    if res.status_code != 200:
                        raise Exception(f"HTTP {res.status_code}: {res.text}")

                    res_json = res.json()
                    choice = res_json["choices"][0]
                    assistant_message = choice["message"]
                    
                    tool_calls = assistant_message.get("tool_calls")
                    content = assistant_message.get("content", "")

                    # Fallback text-based parsing check if no structured tool_calls returned
                    # but the text contains raw SQL query blocks
                    if not tool_calls and content:
                        text_tool = self._parse_text_tool_call(content)
                        if text_tool:
                            # Mimic structured tool call
                            tool_calls = [{
                                "id": "call_text_" + str(int(time.time())),
                                "type": "function",
                                "function": {
                                    "name": text_tool["name"],
                                    "arguments": json.dumps(text_tool["arguments"])
                                }
                            }]
                            # Clear content to avoid duplicate texts in message chain
                            assistant_message["content"] = ""

                    if not tool_calls:
                        # Final response text
                        final_text = self._post_process_response(content)
                        return {
                            "intent": "ai_response",
                            "message": final_text,
                            "items": captured_items,
                            "source": "local_gemini"
                        }

                    # Append assistant message with tool calls to conversation history
                    messages.append(assistant_message)

                    # Execute tool calls
                    for tool_call in tool_calls[:3]:
                        tool_name = tool_call["function"]["name"]
                        tool_id = tool_call["id"]
                        
                        try:
                            tool_args_str = tool_call["function"].get("arguments", "{}")
                            if isinstance(tool_args_str, dict):
                                tool_args = tool_args_str
                            else:
                                tool_args = json.loads(tool_args_str)
                        except Exception as parse_err:
                            tool_args = {}
                            logger.warning(f"Failed to parse tool arguments: {parse_err}")

                        if tool_name in tool_map:
                            try:
                                if tool_name == "execute_read_only_query":
                                    query = tool_args.get("query", "")
                                    result = tool_map[tool_name](query)
                                else:
                                    result = tool_map[tool_name]()
                            except Exception as run_err:
                                result = json.dumps({"error": str(run_err)})
                            
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_id,
                                "name": tool_name,
                                "content": result
                            })

                # If loop completed without final text response, fetch final response
                final_payload = {
                    "model": self.active_model,
                    "messages": messages,
                    "temperature": 0.1
                }
                final_res = requests.post(self.api_url, headers=headers, json=final_payload, timeout=25.0)
                if final_res.status_code != 200:
                    raise Exception(f"HTTP {final_res.status_code} on final turn: {final_res.text}")

                final_json = final_res.json()
                final_text = final_json["choices"][0]["message"].get("content", "")
                final_text = self._post_process_response(final_text)

                return {
                    "intent": "ai_response",
                    "message": final_text,
                    "items": captured_items,
                    "source": "local_gemini"
                }

            except Exception as e:
                from modules.chatbot.services.error_helper import clean_error_message
                last_error = clean_error_message(e)
                logger.error(f"Local Gemini Service Error (attempt {attempt+1}): {last_error}")
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay)
                    continue
                break

        return {"intent": "error", "message": f"Lỗi Local Gemini: {last_error}"}


# Singleton instance
local_gemini_chatbot_service = LocalGeminiChatbotService()
