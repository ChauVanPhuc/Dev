# -*- coding: utf-8 -*-
import os
import logging
import json
import re
import time
import requests
from datetime import datetime
from typing import Dict, Any

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

SYSTEM_PROMPT = f"""Bạn là trợ lý AI SmartFlow chuyên về quản lý khiếu nại (claims) và dữ liệu hệ thống ERP của doanh nghiệp sản xuất đồ gỗ.

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

class OpenRouterChatbotService:
    def __init__(self):
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        # List of candidate free models that support tool calling on OpenRouter
        self.candidate_models = [
            "openrouter/free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "qwen/qwen3-coder:free",
            "poolside/laguna-m.1:free"
        ]
        self.max_retries = 2
        self.retry_delay = 1

    def is_available(self) -> bool:
        return bool(os.getenv("OPENROUTER_API_KEY", "").strip())

    def _post_with_model_fallback(self, payload: dict) -> requests.Response:
        api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        if not api_key:
            raise Exception("Chưa cấu hình OPENROUTER_API_KEY trong .env")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "SmartFlow Chatbot"
        }

        last_error = None
        # Try multiple models to ensure robust fallback
        for model in self.candidate_models:
            payload["model"] = model
            try:
                print(f"[OpenRouter] Đang thử gọi model: {model}...")
                res = requests.post(self.api_url, headers=headers, json=payload, timeout=(3.0, 8.0))
                
                if res.status_code == 200:
                    print(f"\033[92m[OpenRouter] Gọi model {model} thành công.\033[0m")
                    return res
                else:
                    print(f"\033[91m[OpenRouter] Model {model} bị lỗi HTTP {res.status_code}: {res.text}. Chuyển sang model dự phòng...\033[0m")
                    last_error = f"HTTP {res.status_code}: {res.text}"
                    continue
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as net_err:
                print(f"\033[91m[OpenRouter] Lỗi mạng/Timeout khi kết nối model {model}: {net_err}. Thử dự phòng...\033[0m")
                last_error = f"Network/Timeout: {net_err}"
                continue
            except Exception as e:
                print(f"\033[91m[OpenRouter] Lỗi kết nối model {model}: {e}. Thử dự phòng...\033[0m")
                last_error = str(e)
                continue
                
        raise Exception(f"Tất cả các model OpenRouter miễn phí đều bị lỗi. Lỗi cuối: {last_error}")

    def get_database_schema(self) -> str:
        return DB_SCHEMA

    def get_current_datetime(self) -> str:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def execute_read_only_query(self, query: str, db_session, captured_items: list) -> str:
        """
        Executes a read-only SQL query on the database.
        """
        if not query or not query.strip():
            return json.dumps({"error": "Empty query provided."})

        cleaned = query.strip()
        query_lower = cleaned.lower()
        if not query_lower.startswith("select"):
            return json.dumps({"error": "Security violation: Query must be a SELECT statement."})

        forbidden_patterns = [
            r"\binsert\b", r"\bupdate\b", r"\bdelete\b", r"\bdrop\b",
            r"\balter\b", r"\btruncate\b", r"\bgrant\b", r"\brevoke\b"
        ]
        for pattern in forbidden_patterns:
            if re.search(pattern, query_lower):
                return json.dumps({"error": "Chỉ cho phép thực thi truy vấn đọc dữ liệu (SELECT)."})

        if not db_session:
            return json.dumps({"error": "Database session is not available."})

        try:
            from sqlalchemy import text
            print(f"\n\033[96m[OpenRouter_SQL] CHẠY LỆNH:\033[0m {cleaned}")
            try:
                with open("debug_query_log.txt", "a", encoding="utf-8") as f:
                    f.write(f"\n--- OPENROUTER {datetime.now().isoformat()} ---\n")
                    f.write(f"Query: {cleaned}\n")
            except Exception:
                pass

            result = db_session.execute(text(cleaned))
            
            if result.returns_rows:
                keys = list(result.keys())
                rows = result.fetchall()
                total_rows = len(rows)
                print(f"\033[96m[OpenRouter_SQL] KẾT QUẢ TRẢ VỀ:\033[0m {total_rows} dòng")

                HEAVY_COLS = {"image_paths", "image_captions", "description"}
                full_data = []
                for row in rows:
                    row_dict = {}
                    for idx, col in enumerate(keys):
                        val = row[idx]
                        if isinstance(val, datetime):
                            row_dict[col] = val.isoformat()
                        else:
                            row_dict[col] = val
                    full_data.append(row_dict)

                try:
                    with open("debug_query_log.txt", "a", encoding="utf-8") as f:
                        f.write(f"Result count: {total_rows}\n")
                        if total_rows > 0:
                            f.write(f"First row: {str(full_data[0])}\n")
                except Exception:
                    pass

                if "customer_claims" in query_lower:
                    if full_data and "claim_code" in full_data[0]:
                        captured_items.extend(full_data)

                AI_ROW_LIMIT = 20
                trimmed_data = []
                for row_dict in full_data[:AI_ROW_LIMIT]:
                    trimmed = {k: v for k, v in row_dict.items() if k not in HEAVY_COLS}
                    trimmed_data.append(trimmed)

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
            logger.error(f"\033[91m[OpenRouter_SQL] LỖI:\033[0m {e}")
            try:
                with open("debug_query_log.txt", "a", encoding="utf-8") as f:
                    f.write(f"Error: {str(e)}\n")
            except Exception:
                pass
            return json.dumps({"error": str(e)}, ensure_ascii=False)

    def chat_with_ai(self, message: str, db_session, context: Dict[str, Any] = None, history: list = None) -> Dict[str, Any]:
        """
        Executes AI agent using OpenRouter free models and handles function calling.
        """
        if not self.is_available():
            return {"intent": "error", "message": "Chưa cấu hình OPENROUTER_API_KEY"}

        captured_items = []
        if history is None:
            history = []

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

        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            }
        ]

        for turn in history:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

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

        MAX_TOOL_ROUNDS = 3

        for attempt in range(self.max_retries + 1):
            try:
                for round_idx in range(MAX_TOOL_ROUNDS):
                    payload = {
                        "messages": messages,
                        "tools": tools,
                        "tool_choice": "auto",
                        "temperature": 0.1
                    }

                    res = self._post_with_model_fallback(payload)
                    if res.status_code != 200:
                        raise Exception(f"HTTP {res.status_code}: {res.text}")

                    res_json = res.json()
                    choice = res_json["choices"][0]
                    assistant_message = choice["message"]
                    tool_calls = assistant_message.get("tool_calls")

                    if not tool_calls:
                        text_response = assistant_message.get("content", "")
                        return {
                            "intent": "ai_response",
                            "message": text_response,
                            "items": captured_items,
                            "source": f"openrouter ({res_json.get('model', 'unknown')})"
                        }

                    messages.append(assistant_message)

                    for tool_call in tool_calls[:3]:
                        tool_name = tool_call["function"]["name"]
                        tool_args = json.loads(tool_call["function"]["arguments"])
                        tool_id = tool_call["id"]

                        if tool_name in tool_map:
                            try:
                                if tool_name == "execute_read_only_query":
                                    result = tool_map[tool_name](tool_args["query"])
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

                # Final turn without tools
                final_payload = {
                    "messages": messages,
                    "temperature": 0.1
                }
                final_res = self._post_with_model_fallback(final_payload)
                if final_res.status_code != 200:
                    raise Exception(f"HTTP {final_res.status_code} on final turn: {final_res.text}")

                final_json = final_res.json()
                final_text = final_json["choices"][0]["message"]["content"]

                return {
                    "intent": "ai_response",
                    "message": final_text,
                    "items": captured_items,
                    "source": f"openrouter ({final_json.get('model', 'unknown')})"
                }

            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as net_err:
                cleaned_err = f"Lỗi kết nối mạng đến OpenRouter: {net_err}"
                logger.error(f"Lỗi OpenRouter (Không thử lại do lỗi mạng): \033[91m{cleaned_err}\033[0m")
                return {"intent": "error", "message": cleaned_err}
            except Exception as e:
                from modules.chatbot.services.error_helper import clean_error_message
                cleaned_err = clean_error_message(e)
                logger.error(f"Lỗi OpenRouter: \033[91m{cleaned_err}\033[0m")
                
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay)
                    continue
                
                return {"intent": "error", "message": cleaned_err}

# Singleton instance
openrouter_chatbot_service = OpenRouterChatbotService()
