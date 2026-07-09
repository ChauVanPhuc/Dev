# -*- coding: utf-8 -*-
import os
import logging
import json
import re
import time
from datetime import datetime
from typing import Dict, Any
import anthropic

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

SYSTEM_PROMPT = """Bạn là trợ lý AI SmartFlow chuyên về quản lý khiếu nại (claims) và dữ liệu hệ thống ERP của doanh nghiệp sản xuất đồ gỗ.

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

QUAN TRỌNG VỀ HIỂN THỊ:
- Giao diện sẽ TỰ ĐỘNG hiển thị kết quả claim dưới dạng các card thông tin có nút "Xem chi tiết".
- Với dữ liệu không phải claim (production, KPI...), trả lời trực tiếp bằng văn bản.
- Không bao giờ liệt kê claim thủ công như "1. Tủ #51... 2. Tủ #49..." vì giao diện đã hiển thị card.

VÍ DỤ — CLAIM:
- "Tháng 2/2025 phạt bao nhiêu tiền?" → SELECT SUM(CASE WHEN action='$50' THEN 50 WHEN action='Full BC' THEN ... END) → hoặc SELECT action, COUNT(*) FROM customer_claims WHERE period='02-2025' GROUP BY action
- "Năm 2025 có bao nhiêu khiếu nại?" → SELECT COUNT(*) FROM customer_claims WHERE period LIKE '%-2025'
- "Claim trong tháng 2 gồm những gì?" → SELECT action, COUNT(*) as so_luong, SUM(...) FROM customer_claims WHERE period='02-2025' GROUP BY action

VÍ DỤ — SẢN XUẤT:
- "Kế hoạch tháng 4/2026 gồm những đơn nào?" → SELECT o.order_code, o.customer, o.order_status FROM orders o JOIN product_plans p ON o.plan_id = p.id WHERE p.month=4 AND p.year=2026
- "Đơn hàng nào đang ưu tiên?" → SELECT order_code, customer, delivery_date FROM orders WHERE is_priority=1 AND order_status < 2

VÍ DỤ — CROSS MODULE (nhiều bảng):
- "Sản phẩm T060D-BC-WOA bị claim bao nhiêu lần, giá bán là bao nhiêu?" → 
  SELECT c.product_name, COUNT(*) as claim_count, p.base_price, p.sale_price
  FROM customer_claims c LEFT JOIN cabinet_prices p ON (c.product_name = p.cabinet_name OR c.product_name = p.cabinet_code)
  WHERE c.product_name LIKE '%T060D%' GROUP BY c.product_name, p.base_price, p.sale_price
- "Container nào đang shipped có claim?" →
  SELECT s.container_number, s.status, COUNT(c.id) as claim_count
  FROM container_shipments s LEFT JOIN customer_claims c ON s.container_number = c.container_no
  WHERE s.status='Shipped' GROUP BY s.container_number, s.status
- "KPI tháng 5 đạt không?" → SELECT content, target, actual, status FROM kpis WHERE period_name LIKE '%5%'
- "Tỷ lệ lỗi QC tháng này?" → SELECT stage_name, AVG(defect_rate) as avg_rate FROM daily_inspection_records WHERE inspection_date >= DATEADD(month, DATEDIFF(month,0,GETDATE()), 0) GROUP BY stage_name

VÍ DỤ — BÀNG GIAO:
- "Kế hoạch KHSX_04_2026 đang bàn giao được bao nhiêu?" →
  SELECT d.delivery_stage, d.receiving_stage, SUM(d.quantity_total) as tong_giao, SUM(d.quantity_received) as tong_nhan
  FROM deliveries d JOIN product_plans p ON d.plan_id = p.id WHERE p.code='KHSX_04_2026' GROUP BY d.delivery_stage, d.receiving_stage

Quy định bảo mật và kỹ thuật:
- CHỈ chạy các câu lệnh SELECT để đọc dữ liệu. Tuyệt đối không thử ghi, sửa đổi hay xóa dữ liệu.
- Trong SQL Server, khi so sánh chuỗi có dấu tiếng Việt, hãy dùng ký tự N đứng trước (ví dụ: status = N'Mới').
- GIỚI HẠN TOOL CALLS: Mỗi câu hỏi chỉ được gọi execute_read_only_query TỐI ĐA 2 LẦN. Không được gọi lặp đi lặp lại nhiều query tương tự.
- TUYỆT ĐỐI CẤM: Không được chạy nhiều query riêng lẻ cho từng giá trị (ví dụ: không được chạy riêng từng WHERE status='Received', rồi WHERE status='Processing'...). THAY VÀO ĐÓ phải dùng GROUP BY trong 1 query duy nhất.
- TRUY VẤN TỐI ƯU KHI THỐNG KÊ/ĐẾM: Khi người dùng hỏi về số lượng tổng quát, dùng SELECT COUNT(*) FROM customer_claims. Khi cần thống kê theo nhóm, dùng GROUP BY trong 1 câu lệnh.
- LỌC THEO NĂM: Dùng period LIKE '%-YYYY'. KHÔNG dùng YEAR(created_at).
- LỌC THEO THÁNG: Dùng period = 'MM-YYYY'.
- Khi người dùng yêu cầu "gần nhất", dùng ORDER BY RIGHT(period, 4) DESC, LEFT(period, 2) DESC.
- Khi người dùng hỏi "năm nay", "tháng này", dùng tool get_current_datetime trước để xác định năm/tháng.
- Trường hợp không tìm thấy dữ liệu, hãy phản hồi lịch sự rằng không tìm thấy thông tin phù hợp trong hệ thống.
- KHI CÂU HỎI LIÊN QUAN NHIỀU BẢNG, dùng JOIN. Ví dụ:
  + "Claim trong container đang Shipped?" → JOIN customer_claims c ON c.container_no = container_shipments.container_number
  + "Giá tủ bị claim nhiều nhất?" → JOIN cabinet_prices p ON (c.product_name = p.cabinet_name OR c.product_name = p.cabinet_code)
  + "Lỗi DVA_08 là lỗi gì?" → SELECT name, name_en FROM client_defects WHERE code = 'DVA_08' OR code = 'DVA-08'

⚠️ CẢNH BÁO RẤT QUAN TRỌNG VỀ CÁC BẢNG:
- TRANG SẢN PHẨM MẪU vs SẢN PHẨM THỰC TẾ:
  + Trang Quản lý sản phẩm (/manufacture/products) hiển thị danh sách sản phẩm mẫu (BOM Master) từ bảng `master_products`. Khi người dùng hỏi "có bao nhiêu sản phẩm", "tìm kiếm sản phẩm", "danh sách sản phẩm" hoặc khi ngữ cảnh hiện tại là trang Quản lý sản phẩm (current_page chứa '/manufacture/products' hoặc '/products'), bạn phải truy vấn bảng `master_products`. Bảng này chứa các SKU duy nhất không bị trùng lặp.
  + Bảng `products` chỉ lưu sản phẩm thực tế đi kèm với các đơn hàng cụ thể (orders), một SKU có thể lặp lại nhiều lần cho các đơn hàng khác nhau. Chỉ truy vấn `products` khi câu hỏi liên quan cụ thể đến đơn hàng hoặc số lượng sản xuất thực tế.
- Bảng client_defects chỉ là BẢNG TRA CỨU danh mục mã lỗi QC (chỉ có các cột: id, code, name, name_en, g7_code, is_active). Bảng này KHÔNG CÓ cột period, KHÔNG CÓ cột created_at, KHÔNG CÓ dữ liệu theo thời gian. KHÔNG BAO GIỜ truy vấn client_defects với điều kiện WHERE period hoặc WHERE created_at.
- Bảng customer_claims là BẢNG DỮ LIỆU CHÍNH chứa tất cả khiếu nại theo thời gian (có cột period dạng 'MM-YYYY'). Cột order_code trong bảng customer_claims lưu MÃ lỗi QC. Chú ý: Cột này có thể chứa một hoặc nhiều mã lỗi phân tách bằng dấu phẩy (ví dụ: 'DVA_05' hoặc 'DVA_05, DVP_05').
- Khi người dùng hỏi về tên lỗi tiếng Việt (ví dụ: "lỗi nứt tét", "lỗi móp", "bông tróc"), bạn BẮT BUỘC phải JOIN customer_claims c với client_defects d bằng biểu thức so khớp danh sách dấu phẩy để không bị sót khi có nhiều lỗi trong 1 dòng:
  ON (',' + REPLACE(c.order_code, ' ', '') + ',' LIKE '%,' + d.code + ',%')
  Sau đó lọc theo d.name bằng tiếng Việt. CHÚ Ý: Danh mục lỗi trong database lưu các từ khóa ngắn, tổng quát (ví dụ: lỗi nứt tét lưu là 'NỨT', lỗi bong tróc lưu là 'BONG TRÓC SƠN'/'BONG TRÓC VENEER', lỗi móp méo lưu là 'MÓP'). Do đó, khi lọc d.name, hãy trích xuất từ khóa cốt lõi ngắn nhất và sử dụng LIKE N'%[từ khóa]%' để so khớp chính xác:
  + Nếu hỏi "nứt tét", "nứt vỡ", "nứt" -> dùng: d.name LIKE N'%nứt%'
  + Nếu hỏi "bong tróc", "bông tróc", "tróc sơn" -> dùng: d.name LIKE N'%tróc%'
  + Nếu hỏi "móp", "móp méo" -> dùng: d.name LIKE N'%móp%'
  + Nếu hỏi "mốc", "ẩm mốc" -> dùng: d.name LIKE N'%mốc%'
  Ví dụ: "Tháng 2 năm 2026 có bao nhiêu lỗi bị nứt tét?" → SELECT COUNT(*) FROM customer_claims c JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',' LIKE '%%,' + d.code + ',%%') WHERE d.name LIKE N'%%nứt%%' AND c.period='02-2026'
- Khi người dùng hỏi "có bao nhiêu lỗi", "gồm những lỗi nào", "loại lỗi gì" → PHẢI truy vấn customer_claims (JOIN với client_defects bằng biểu thức so khớp trên để lấy tên lỗi).

QUY TẮC TÍNH GIÁ TRỊ PHẠT (QUAN TRỌNG):
Cột action trong customer_claims có thể là:
  • Số tiền cố định: '$50', '$100', '$200', v.v. → lấy số tiền đó làm giá trị phạt
  • 'Full BC' → giá trị phạt = sale_price của sản phẩm trong bảng cabinet_prices (JOIN ON (c.product_name = p.cabinet_name OR c.product_name = p.cabinet_code))
  • 'X2 Unit' → giá trị phạt = sale_price × 2 (từ cabinet_prices)
  • 'Repair' hoặc 'Nhắc nhở' → giá trị phạt = 0 (không có phạt tiền)

Yêu cầu hiển thị và tính toán chi tiết:
- Khi người dùng hỏi về tiền phạt, chi tiết tiền, hoặc yêu cầu "list ra từng cái", "liệt kê chi tiết": bạn BẮT BUỘC phải thực hiện JOIN với bảng cabinet_prices để lấy giá bán (sale_price).
- BẮT BUỘC định dạng bảng dưới dạng bảng HTML kẻ viền (chứ không dùng bảng Markdown thông thường) để tránh bị vỡ/lệch cột trên giao diện di động. Bảng HTML có cấu trúc và phong cách sau:
  <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; border: 1px solid #dcdcdc; background-color: #ffffff;">
    <thead>
      <tr style="background-color: #6F4E37; color: white;">
        <th style="padding: 8px; text-align: left; border: 1px solid #dcdcdc;">Sản phẩm</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #dcdcdc;">Hình thức (Đơn giá)</th>
        <th style="padding: 8px; text-align: center; border: 1px solid #dcdcdc; width: 45px;">SL</th>
        <th style="padding: 8px; text-align: right; border: 1px solid #dcdcdc; width: 85px;">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      <!-- các dòng dữ liệu với xen kẽ background-color: #fdfaf6 và #ffffff, mỗi ô td đều có padding: 8px và border: 1px solid #dcdcdc -->
      <!-- dòng tổng cộng có background-color: #f5ebe0; font-weight: bold; -->
    </tbody>
  </table>
- Trong cột "Hình thức (Đơn giá)", hãy kết hợp loại hình phạt và đơn giá:
  + Ví dụ: Full BC ($106.05) hoặc X2 Unit ($212.10) hoặc $50.00
- Cuối cùng hiển thị tổng cộng tất cả các khoản tiền phạt lại với nhau một cách chính xác.

SQL MẪU — TỔNG TIỀN PHẠT (có JOIN cabinet_prices):
SELECT 
  SUM(CASE
    WHEN c.action LIKE '$%' 
      THEN TRY_CAST(REPLACE(REPLACE(c.action, '$', ''), ' ', '') AS FLOAT)
    WHEN c.action = 'Full BC' 
      THEN COALESCE(p.sale_price, 0)
    WHEN c.action = 'X2 Unit' 
      THEN COALESCE(p.sale_price * 2, 0)
    ELSE 0
  END) AS tong_tien_phat
FROM customer_claims c
LEFT JOIN cabinet_prices p ON (c.product_name = p.cabinet_name OR c.product_name = p.cabinet_code)
WHERE c.period = '02-2025'   -- thay đổi điều kiện theo câu hỏi

SQL MẪU — CHI TIẾT TỪNG DÒNG PHẠT (BẮT BUỘC dùng khi yêu cầu chi tiết hoặc list ra từng cái):
SELECT
  c.action,
  c.product_name,
  p.cabinet_name,
  p.sale_price,
  COUNT(*) as so_luong,
  SUM(CASE
    WHEN c.action LIKE '$%' 
      THEN TRY_CAST(REPLACE(REPLACE(c.action, '$', ''), ' ', '') AS FLOAT)
    WHEN c.action = 'Full BC' 
      THEN COALESCE(p.sale_price, 0)
    WHEN c.action = 'X2 Unit' 
      THEN COALESCE(p.sale_price * 2, 0)
    ELSE 0
  END) AS tong_gia_tri
FROM customer_claims c
LEFT JOIN cabinet_prices p ON (c.product_name = p.cabinet_name OR c.product_name = p.cabinet_code)
WHERE c.period = '02-2026'   -- thay đổi điều kiện theo câu hỏi
GROUP BY c.action, c.product_name, p.cabinet_name, p.sale_price
ORDER BY tong_gia_tri DESC

CẤU TRÚC CƠ SỞ DỮ LIỆU (đã được nhúng sẵn, không cần gọi get_database_schema):
""" + DB_SCHEMA + """
"""



class AnthropicChatbotService:
    """AI Chatbot service using Anthropic Claude API with database query tools."""

    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.client = None
        self.max_retries = 2
        self.retry_delay = 1  # seconds
        if self.api_key:
            try:
                self.client = anthropic.Anthropic(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic client: {e}")
        else:
            logger.warning("ANTHROPIC_API_KEY not found in environment variables")

    def is_available(self) -> bool:
        """Check if Anthropic API is available."""
        return self.client is not None or os.getenv("ANTHROPIC_API_KEY") is not None

    # ──────────────────────── Tool Functions ────────────────────────

    def get_database_schema(self) -> str:
        """Returns the database schema for the AI to understand the structure."""
        return DB_SCHEMA

    def get_current_datetime(self) -> str:
        """Returns the current datetime in ISO format."""
        return datetime.now().isoformat()

    def execute_read_only_query(self, query: str, db_session, captured_items: list = None) -> str:
        """
        Executes a read-only SQL query and returns the results as JSON.
        Only SELECT queries are allowed for security.
        """
        if not query or not query.strip():
            return json.dumps({"error": "Empty query provided."})

        cleaned = query.strip()
        
        # Security check: only allow SELECT statements
        if not cleaned.upper().startswith("SELECT"):
            return json.dumps({"error": "Security violation: Query must be a SELECT statement."})

        if not db_session:
            return json.dumps({"error": "Database session is not available."})

        try:
            from sqlalchemy import text
            print(f"\n[Anthropic_SQL] CHẠY LỆNH: {cleaned}")
            try:
                with open("debug_query_log.txt", "a", encoding="utf-8") as f:
                    f.write(f"\n--- ANTHROPIC {datetime.now().isoformat()} ---\n")
                    f.write(f"Query: {cleaned}\n")
            except Exception:
                pass

            result = db_session.execute(text(cleaned))

            if result.returns_rows:
                keys = list(result.keys())
                rows = result.fetchall()
                data = []
                for row in rows:
                    row_dict = {}
                    for idx, col in enumerate(keys):
                        val = row[idx]
                        if isinstance(val, datetime):
                            row_dict[col] = val.isoformat()
                        else:
                            row_dict[col] = val
                    data.append(row_dict)

                total_rows = len(data)
                print(f"[Anthropic_SQL] KẾT QUẢ TRẢ VỀ: {total_rows} dòng")

                try:
                    with open("debug_query_log.txt", "a", encoding="utf-8") as f:
                        f.write(f"Result count: {total_rows}\n")
                        if total_rows > 0:
                            f.write(f"First row: {str(data[0])}\n")
                except Exception:
                    pass

                # Capture claims data for UI card display
                if captured_items is not None and "customer_claims" in cleaned.lower():
                    if data and "claim_code" in data[0]:
                        captured_items.extend(data)

                return json.dumps({
                    "success": True,
                    "total_rows": total_rows,
                    "data": data,
                    "columns": keys
                }, ensure_ascii=False, indent=2)
            else:
                try:
                    with open("debug_query_log.txt", "a", encoding="utf-8") as f:
                        f.write(f"Result count: 0 (No rows returned)\n")
                except Exception:
                    pass
                return json.dumps({
                    "success": True,
                    "message": "Query executed successfully (no rows returned)",
                    "rows_affected": result.rowcount
                })

        except Exception as e:
            error_msg = str(e)
            print(f"[Anthropic_SQL] LỖI: {error_msg}")
            try:
                with open("debug_query_log.txt", "a", encoding="utf-8") as f:
                    f.write(f"Error: {error_msg}\n")
            except Exception:
                pass
            return json.dumps({"error": f"Database query error: {error_msg}"})

    # ──────────────────────── Chat Function ────────────────────────

    def chat_with_ai(self, message: str, db_session, context: dict = None, history: list = None) -> dict:
        """
        Main chat function using Anthropic Claude with tool calling.
        """
        if not self.client:
            # Try to initialize client if not done
            if self.api_key:
                try:
                    self.client = anthropic.Anthropic(api_key=self.api_key)
                except Exception as e:
                    logger.error(f"Failed to initialize Anthropic client: {e}")
                    return {"intent": "error", "message": "Anthropic API không khả dụng"}
            else:
                return {"intent": "error", "message": "Anthropic API key không được cấu hình"}

        captured_items = []
        if history is None:
            history = []
        
        # Prepare tools for Claude
        tools = [
            {
                "name": "get_database_schema",
                "description": "Lấy cấu trúc cơ sở dữ liệu để hiểu các bảng và cột",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "get_current_datetime",
                "description": "Lấy ngày giờ hiện tại",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "execute_read_only_query",
                "description": "Thực thi câu lệnh SQL SELECT để đọc dữ liệu từ cơ sở dữ liệu",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Câu lệnh SQL SELECT để thực thi"
                        }
                    },
                    "required": ["query"]
                }
            }
        ]

        # Tool implementations
        def get_database_schema_impl():
            return self.get_database_schema()

        def get_current_datetime_impl():
            return self.get_current_datetime()

        def execute_read_only_query_impl(query: str):
            return self.execute_read_only_query(query, db_session, captured_items)

        tool_map = {
            "get_database_schema": get_database_schema_impl,
            "get_current_datetime": get_current_datetime_impl,
            "execute_read_only_query": execute_read_only_query_impl
        }

        # Build messages from history
        messages = []
        for turn in history:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        # Inject context filters
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

        try:
            # Use Claude 3.5 Haiku (free tier, faster, good for tool use)
            response = self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=messages,
                tools=tools,
                tool_choice={"type": "auto"}
            )

            # Process tool calls if any
            tool_use_results = []
            for block in response.content:
                if block.type == "tool_use":
                    tool_name = block.name
                    tool_input = block.input
                    tool_id = block.id

                    # Execute the tool
                    if tool_name in tool_map:
                        try:
                            if tool_name == "execute_read_only_query":
                                result = tool_map[tool_name](tool_input["query"])
                            else:
                                result = tool_map[tool_name]()
                            
                            tool_use_results.append({
                                "tool_use_id": tool_id,
                                "result": result
                            })
                        except Exception as e:
                            tool_use_results.append({
                                "tool_use_id": tool_id,
                                "result": json.dumps({"error": str(e)})
                            })

            # If there were tool calls, send results back to Claude
            if tool_use_results:
                # Add assistant response with tool calls
                messages.append({
                    "role": "assistant",
                    "content": response.content
                })

                # Add tool results
                for tool_result in tool_use_results:
                    messages.append({
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_result["tool_use_id"],
                                "content": tool_result["result"]
                            }
                        ]
                    })

                # Get final response
                final_response = self.client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=4096,
                    system=SYSTEM_PROMPT,
                    messages=messages
                )

                # Extract final text response
                final_text = ""
                for block in final_response.content:
                    if block.type == "text":
                        final_text = block.text
                        break

                return {
                    "intent": "ai_response",
                    "message": final_text,
                    "items": captured_items,
                    "source": "anthropic_claude"
                }
            else:
                # No tool calls, just return the text response
                text_response = ""
                for block in response.content:
                    if block.type == "text":
                        text_response = block.text
                        break

                return {
                    "intent": "ai_response",
                    "message": text_response,
                    "items": captured_items,
                    "source": "anthropic_claude"
                }

        except anthropic.RateLimitError as e:
            from modules.chatbot.services.error_helper import clean_error_message
            cleaned_err = clean_error_message(e)
            logger.error(f"Lỗi giới hạn lượt Anthropic: \033[91m{cleaned_err}\033[0m")
            return {"intent": "error", "message": cleaned_err}
        except anthropic.APIError as e:
            from modules.chatbot.services.error_helper import clean_error_message
            cleaned_err = clean_error_message(e)
            logger.error(f"Lỗi Anthropic: \033[91m{cleaned_err}\033[0m")
            return {"intent": "error", "message": cleaned_err}
        except Exception as e:
            from modules.chatbot.services.error_helper import clean_error_message
            cleaned_err = clean_error_message(e)
            logger.error(f"Lỗi hệ thống Anthropic: \033[91m{cleaned_err}\033[0m")
            return {"intent": "error", "message": cleaned_err}


# Singleton instance
anthropic_chatbot_service = AnthropicChatbotService()
