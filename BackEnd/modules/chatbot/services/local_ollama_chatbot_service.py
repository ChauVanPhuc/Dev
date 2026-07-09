# -*- coding: utf-8 -*-
import os
import logging
import json
import re
import requests
import time
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

Table: client_defects (Danh mục lỗi khách hàng)
- id: INT PK
- code: NVARCHAR(50) — Mã lỗi → LIÊN KẾT: customer_claims.order_code (so khớp chuỗi chứa code)
- name: NVARCHAR(255) — Tên lỗi tiếng Việt (ví dụ: 'Nứt sơn', 'Móp cạnh')
- description: NVARCHAR(500)
- severity: NVARCHAR(50)
- category: NVARCHAR(100)

Table: products (Sản phẩm trong đơn hàng)
- id: INT PK
- sku: NVARCHAR(50) — Mã sản phẩm → LIÊN KẾT: customer_claims.product_name, cabinet_prices.cabinet_name, cabinet_prices.cabinet_code
- name: NVARCHAR(255) — Tên sản phẩm
- order_id: INT FK
- category_id: INT FK
- price: FLOAT
- material: NVARCHAR(255)
- quantity: FLOAT
- order_qty, production_qty, total_qty, loss_qty: FLOAT
- total_vnd: FLOAT
- status: NVARCHAR(50)
- created_at: DATETIME

Table: master_products (Sản phẩm mẫu / BOM Master)
- id: INT PK
- sku: NVARCHAR(50) — Mã sản phẩm mẫu/BOM (unique) → LIÊN KẾT: products.sku, cabinet_prices.cabinet_name, cabinet_prices.cabinet_code
- name: NVARCHAR(255) — Tên sản phẩm mẫu
- category_id: INT FK
- price: FLOAT
- material: NVARCHAR(255)
- color: NVARCHAR(100)
- length, width, height: FLOAT
- weight: FLOAT
- status: NVARCHAR(50)
- created_at: DATETIME

════════════ CÁC QUY TẮC PHẢI TUÂN THỦ KHI TẠO SQL CƠ SỞ DỮ LIỆU TỰ ĐỘNG ════════════
1. [BẮT BUỘC] Chỉ tạo duy nhất một câu lệnh SQL SELECT READ-ONLY. Không được dùng INSERT, UPDATE, DELETE, ALTER hoặc CREATE.
2. [BẮT BUỘC] Khi so khớp tiếng Việt có dấu, PHẢI dùng tiền tố N (ví dụ: c.status = N'Mới', d.name LIKE N'%nứt%').
3. [BẮT BUỘC] Khi lọc theo tháng/năm, LUÔN lọc theo cột `period` dạng chuỗi 'MM-YYYY' (ví dụ: period = '02-2025'). TUYỆT ĐỐI không dùng hàm YEAR() hay MONTH() trên cột period vì nó là kiểu chuỗi nvarchar.
4. [BẮT BUỘC] Khi lấy danh sách khiếu nại kèm theo Tên Lỗi chính xác từ client_defects:
   Do c.order_code có thể chứa nhiều mã lỗi ngăn cách bởi dấu phẩy (ví dụ: 'DVA_01,DVA_02'), bạn PHẢI dùng cú pháp so khớp chuỗi chuẩn:
   FROM customer_claims c JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%')
5. [BẮT BUỘC] Tuyệt đối không dùng d.name hoặc d.code nếu chưa thực hiện JOIN client_defects d. Mọi truy vấn lọc theo tên lỗi (nứt, móp, tróc...) bắt buộc phải JOIN như quy tắc 4.
   Ví dụ tìm lỗi "nứt" hoặc "nứt tét" trong tháng 05-2026:
   SELECT COUNT(*) FROM customer_claims c JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%') WHERE d.name LIKE N'%nứt%' AND c.period='05-2026'
6. [BẮT BUỘC] Khi hiển thị, liệt kê hoặc đề cập đến Lỗi (defects/errors) cho người dùng, LUÔN hiển thị TÊN LỖI tiếng Việt (ví dụ: 'Nứt sơn', 'Móp cạnh' - từ cột `name` của bảng `client_defects`) thay vì Mã Lỗi (ví dụ: 'DVA_01', 'DVA_02'). Bạn bắt buộc phải thực hiện JOIN với bảng `client_defects` để lấy đúng tên lỗi khi thực hiện câu lệnh SQL SELECT.
7. [BẮT BUỘC] Khi sử dụng mệnh đề GROUP BY, tất cả các cột được chọn trong phần SELECT (ngoại trừ các hàm tổng hợp như COUNT, SUM, MAX, MIN...) BẮT BUỘC phải xuất hiện đầy đủ trong mệnh đề GROUP BY. Tuyệt đối không nhóm thiếu cột dẫn đến lỗi cú pháp SQL Server.
8. [BẮT BUỘC] Cơ sở dữ liệu này là SQL Server (MS SQL). Do đó: Tuyệt đối KHÔNG được sử dụng từ khóa `LIMIT` (SQL Server không hỗ trợ `LIMIT`, thay vào đó hãy dùng `TOP` ở đầu câu SELECT, ví dụ `SELECT TOP 1 COUNT(*)...` hoặc `SELECT TOP 50 *...`). Tuyệt đối KHÔNG dùng toán tử `||` để nối chuỗi (hãy dùng dấu cộng `+` để nối chuỗi, ví dụ: `N'%' + d.code + N'%'`).
9. [BẮT BUỘC] Cột 'cabinet_no' KHÔNG tồn tại trong bảng customer_claims. Để tìm khiếu nại của Cabinet số X (ví dụ: Cabinet #12 hoặc Cabinet 12), bạn phải lọc theo cột claim_code: c.claim_code LIKE N'%Cabinet #' + CAST(X AS NVARCHAR) + N'%' OR c.claim_code LIKE N'%Cabinet ' + CAST(X AS NVARCHAR) + N'%'.
10. [BẮT BUỘC] Cột 'penalty' KHÔNG tồn tại trong bảng customer_claims. Tiền phạt được lưu trong cột 'action' dưới các dạng chuỗi như '$50', 'Full BC', 'X2 Unit'. Để tính tổng tiền phạt (tiền đền bù), bạn bắt buộc phải dùng biểu thức CASE WHEN nối với bảng cabinet_prices để lấy giá bán sale_price của sản phẩm (c.product_name = p.cabinet_name), cụ thể:
    SELECT SUM(CASE WHEN c.action LIKE '$%' THEN CAST(REPLACE(REPLACE(c.action, '$', ''), ',', '') AS DECIMAL(18,2)) WHEN c.action = 'Full BC' THEN COALESCE(p.sale_price, 0) WHEN c.action = 'X2 Unit' THEN COALESCE(p.sale_price, 0) * 2 ELSE 0 END) AS total_penalty FROM customer_claims c LEFT JOIN cabinet_prices p ON c.product_name = p.cabinet_name
11. [BẮT BUỘC] TRANG SẢN PHẨM MẪU vs SẢN PHẨM THỰC TẾ:
    - Trang Quản lý sản phẩm (/manufacture/products) hiển thị danh sách sản phẩm mẫu (BOM Master) từ bảng `master_products`. Khi người dùng hỏi "có bao nhiêu sản phẩm", "tìm kiếm sản phẩm", "danh sách sản phẩm" hoặc khi ngữ cảnh hiện tại là trang Quản lý sản phẩm (current_page chứa '/manufacture/products' hoặc '/products'), bạn phải truy vấn bảng `master_products`. Bảng này chứa các SKU duy nhất không bị trùng lặp.
    - Bảng `products` chỉ lưu sản phẩm thực tế đi kèm với các đơn hàng cụ thể (orders), một SKU có thể lặp lại nhiều lần cho các đơn hàng khác nhau. Chỉ truy vấn `products` khi câu hỏi liên quan cụ thể đến đơn hàng hoặc số lượng sản xuất thực tế.
"""

MAX_TOOL_ROUNDS = 3

class LocalOllamaChatbotService:
    def __init__(self):
        self.api_url = os.getenv("LOCAL_AI_URL", "https://ai.smartflowg7.cloud/v1/chat/completions")
        self.model_name = os.getenv("LOCAL_AI_MODEL", "qwen2.5:3b")
        self.api_key = os.getenv("LOCAL_AI_API_KEY", "")
        self.max_retries = 2
        self.retry_delay = 1

    def is_available(self) -> bool:
        # Nếu đã cấu hình URL local, chúng ta coi là khả dụng.
        # Chúng ta sẽ thử quét các model đang chạy thực tế trên server để đồng bộ và ưu tiên QWEN.
        if not self.api_url:
            return False

        # Phân tích base URL (ví dụ: https://ai.smartflowg7.cloud/ hoặc http://localhost:11434/)
        base_url = self.api_url
        if "/v1/chat/completions" in base_url:
            base_url = base_url.split("/v1/chat/completions")[0]
        elif "/api/chat" in base_url:
            base_url = base_url.split("/api/chat")[0]
        elif "/v1" in base_url:
            base_url = base_url.split("/v1")[0]
        
        base_url = base_url.rstrip("/")
        available_names = []

        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        # 1. Thử gọi API tags của Ollama
        try:
            res = requests.get(f"{base_url}/api/tags", headers=headers, timeout=2.0)
            if res.status_code == 200:
                models = res.json().get("models", [])
                available_names = [m.get("name") for m in models]
        except Exception:
            pass

        # 2. Thử gọi API models của Express proxy (ví dụ: /api/models)
        if not available_names:
            try:
                res = requests.get(f"{base_url}/api/models", headers=headers, timeout=2.0)
                if res.status_code == 200:
                    models = res.json().get("models", [])
                    available_names = [m.get("name") for m in models]
            except Exception:
                pass

        # 3. Thử gọi API models của OpenAI (nếu các cách trên thất bại)
        if not available_names:
            try:
                res = requests.get(f"{base_url}/v1/models", headers=headers, timeout=2.0)
                if res.status_code == 200:
                    models = res.json().get("data", [])
                    available_names = [m.get("id") for m in models]
            except Exception:
                pass

        if available_names:
            # Ưu tiên tìm các dòng model QWEN trước
            qwen_models = [name for name in available_names if "qwen" in name.lower()]
            if qwen_models:
                # Quét các model qwen ưa thích theo thứ tự
                for preferred in ["qwen2.5-coder:7b", "qwen2.5-coder:1.5b", "qwen2.5:3b", "qwen2.5", "qwen"]:
                    for qm in qwen_models:
                        if preferred in qm.lower():
                            self.model_name = qm
                            logger.info(f"[LocalAI] Auto-selected Qwen model: {self.model_name}")
                            return True
                self.model_name = qwen_models[0]
                logger.info(f"[LocalAI] Auto-selected Qwen model (first match): {self.model_name}")
                return True

            # Nếu không có QWEN, quét các model ưa thích khác
            for preferred in ["llama3.2", "llama3.1", "deepseek"]:
                for name in available_names:
                    if preferred in name.lower():
                        self.model_name = name
                        logger.info(f"[LocalAI] Fallback selected model: {self.model_name}")
                        return True

            # Fallback lấy model đầu tiên tìm thấy
            self.model_name = available_names[0]
            logger.info(f"[LocalAI] Fallback selected first model: {self.model_name}")
            return True

        # Nếu không lấy được danh sách, giữ nguyên model mặc định từ cấu hình env
        self.model_name = os.getenv("LOCAL_AI_MODEL", "qwen2.5:3b")
        logger.info(f"[LocalAI] Could not fetch models, using default config: {self.model_name}")
        return True

    def _parse_text_tool_call(self, content: str) -> dict:
        if not content:
            return None
            
        # 1. Thử tìm khối mã markdown ```sql SELECT ... ``` hoặc ``` SELECT ... ``` trước
        sql_match = re.search(r"```(?:sql)?\s*(SELECT[\s\S]+?)```", content, re.IGNORECASE)
        if sql_match:
            query = sql_match.group(1).strip()
            return {
                "name": "execute_read_only_query",
                "arguments": {"query": query}
            }

        # 2. Tìm dấu { đầu tiên để xử lý JSON
        start_idx = content.find('{')
        if start_idx != -1:
            # Quét chuỗi để trích xuất JSON và tự sửa lỗi nếu thiếu ngoặc đóng
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
                    # Tìm kiếm đệ quy khóa "query" hoặc "sql" trong dictionary
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
                logger.warning(f"[JSON Repair] Failed to parse repaired JSON: {json_str}. Error: {e}")

        # 3. Phân tích cú pháp thô bằng Regex nếu các cách trên thất bại
        if "select " in content.lower() and "from " in content.lower():
            # Trích xuất câu lệnh SELECT thô từ text
            select_match = re.search(r"(SELECT[\s\S]+?)(?:;|$|\n\n|\})", content, re.IGNORECASE)
            if select_match:
                query = select_match.group(1).strip()
                if len(query) < 1500 and "from" in query.lower():
                    # Làm sạch các ký tự JSON thừa trong trường hợp text bị trộn lẫn
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

    def _parse_ollama_response(self, response_text: str) -> dict:
        """
        Phân tích kết quả trả về từ Ollama hoặc Express Proxy.
        Hỗ trợ cả dạng một JSON duy nhất và dạng stream JSON lines (SSE).
        """
        text = response_text.strip()
        print(f"[Ollama Raw Response] {text}")
        if not text:
            raise Exception("Phản hồi từ AI rỗng.")

        # 1. Thử parse toàn bộ văn bản dưới dạng 1 JSON duy nhất trước (để xử lý JSON có thụt lề hoặc chứa ký tự xuống dòng \n)
        try:
            clean_text = text
            if clean_text.startswith("data: "):
                clean_text = clean_text[6:].strip()
            if clean_text == "[DONE]":
                return {"role": "assistant", "content": ""}
            
            data = json.loads(clean_text)
            return self._extract_message_from_json(data)
        except Exception:
            # 2. Nếu thất bại, có thể đây là một stream gồm nhiều dòng JSON độc lập (NDJSON hoặc SSE stream)
            pass

        lines = [line.strip() for line in text.split("\n") if line.strip()]
        aggregated_content = ""
        tool_calls = []
        
        for line in lines:
            if line.startswith("data: "):
                line = line[6:].strip()
            if not line or line == "[DONE]":
                continue
            
            try:
                data = json.loads(line)
                
                # Trích xuất content chunk
                msg = None
                if "choices" in data and len(data["choices"]) > 0:
                    msg = data["choices"][0].get("delta", data["choices"][0].get("message", {}))
                elif "message" in data:
                    msg = data["message"]
                
                if msg:
                    content_chunk = msg.get("content", "")
                    if content_chunk:
                        aggregated_content += content_chunk
                    
                    tc = msg.get("tool_calls")
                    if tc:
                        tool_calls.extend(tc)
            except Exception:
                # Bỏ qua các dòng không thể parse JSON
                continue
                
        return {
            "role": "assistant",
            "content": aggregated_content,
            "tool_calls": tool_calls if tool_calls else None
        }

    def _extract_message_from_json(self, data: dict) -> dict:
        # Phát hiện API trả JSON error (ví dụ: {"error":{"code":2091,"message":"Operation is not allowed..."}})
        if "error" in data and isinstance(data["error"], dict):
            error_msg = data["error"].get("message", "Unknown API error")
            error_code = data["error"].get("code", "")
            raise Exception(f"API Error {error_code}: {error_msg}")
        
        # Dạng OpenAI format
        if "choices" in data and len(data["choices"]) > 0:
            choice = data["choices"][0]
            msg = choice.get("message", {})
            return {
                "role": msg.get("role", "assistant"),
                "content": msg.get("content", ""),
                "tool_calls": msg.get("tool_calls")
            }
        # Dạng Ollama native format
        elif "message" in data:
            msg = data["message"]
            return {
                "role": msg.get("role", "assistant"),
                "content": msg.get("content", ""),
                "tool_calls": msg.get("tool_calls")
            }
        else:
            # Fallback direct string
            content = data.get("response", data.get("content", ""))
            return {
                "role": "assistant",
                "content": content,
                "tool_calls": None
            }

    def get_database_schema(self) -> str:
        return DB_SCHEMA

    def get_current_datetime(self) -> str:
        return datetime.now().isoformat()

    def execute_read_only_query(self, query: str, db_session, captured_items: list) -> str:
        if not db_session:
            return "Lỗi: Không tìm thấy kết nối Database."

        clean_query = query.strip()

        # 0a. Loại bỏ ký tự backslash-escape thừa do JSON/AI serialization
        import re
        # Bước 1: Thay thế \\\\ (double backslash) thành placeholder tạm
        clean_query = clean_query.replace("\\\\", "\x00DBLBS\x00")
        # Bước 2: Loại bỏ mọi backslash đơn lẻ đứng trước ký tự (\\' → ', \\" → ", \\$ → $, \\n → n, etc.)
        clean_query = re.sub(r'\\([^\\])', r'\1', clean_query)
        # Bước 3: Khôi phục double backslash thành single backslash
        clean_query = clean_query.replace("\x00DBLBS\x00", "\\")
        # 0b. Loại bỏ ngoặc vuông bao quanh tên bảng [customer_claims] -> customer_claims (để regex self-healing hoạt động)
        clean_query = re.sub(r'\[(\w+)\]', r'\1', clean_query)
        
        # 0b-1. Sửa các lỗi AI dính liền alias và tên cột (ví dụ caction -> c.action, cperiod -> c.period, cstatus -> c.status, dname -> d.name, etc.)
        merged_c_cols = "action|period|status|claim_code|product_name|order_code|company_error_code|severity|lpn|container_no|created_at|resolved_at"
        clean_query = re.sub(rf"\bc({merged_c_cols})\b", r"c.\1", clean_query, flags=re.IGNORECASE)
        merged_p_cols = "sale_price|base_price|cabinet_name|cabinet_code|material|dimensions"
        clean_query = re.sub(rf"\bp({merged_p_cols})\b", r"p.\1", clean_query, flags=re.IGNORECASE)
        merged_d_cols = "name|code|description|severity|category"
        clean_query = re.sub(rf"\bd({merged_d_cols})\b", r"d.\1", clean_query, flags=re.IGNORECASE)
        
        # 0b-2. Chuẩn hóa lỗi lặp từ khóa ON ON (ví dụ JOIN ... ON ON c.order_code)
        clean_query = re.sub(r"\bON\s+ON\b", "ON", clean_query, flags=re.IGNORECASE)
        
        print(f"\033[96m[Ollama_SQL] Câu lệnh sau khi làm sạch: {clean_query}\033[0m")

        # 0c. Tự động sửa logic CASE WHEN penalty sai cột (AI hay nhầm p.sale_price LIKE '$%' thay vì c.action LIKE '$%')
        lower_q = clean_query.lower()
        if "case when" in lower_q and ("p.sale_price like" in lower_q or "p.base_price like" in lower_q or "c.sale_price" in lower_q or "c.price" in lower_q):
            # AI đang dùng sai cột → giữ lại phần FROM...WHERE trở đi, thay phần SELECT bằng công thức chuẩn
            from_idx = lower_q.find("from ")
            if from_idx > 0:
                from_part = clean_query[from_idx:]
                # Đảm bảo có JOIN cabinet_prices
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
                print(f"\033[93m[Ollama_SQL Self-Healing] Đã tự động sửa logic CASE WHEN penalty sai cột: {clean_query}\033[0m")

        # 0d. Tự động sửa c.sale_price, c.price, c.base_price thành p.sale_price, p.base_price
        if "c.sale_price" in clean_query.lower() or "c.price" in clean_query.lower() or "c.base_price" in clean_query.lower():
            clean_query = re.sub(r'\bc\.sale_price\b', 'p.sale_price', clean_query, flags=re.IGNORECASE)
            clean_query = re.sub(r'\bc\.base_price\b', 'p.base_price', clean_query, flags=re.IGNORECASE)
            clean_query = re.sub(r'\bc\.price\b', 'p.sale_price', clean_query, flags=re.IGNORECASE)
            print(f"\033[93m[Ollama_SQL Self-Healing] Đã sửa c.sale_price/c.price -> p.sale_price: {clean_query}\033[0m")

        # 0e. Tự động sửa c.defect_name thành d.name
        if "c.defect_name" in clean_query.lower():
            clean_query = re.sub(r'\bc\.defect_name\b', 'd.name', clean_query, flags=re.IGNORECASE)
            print(f"\033[93m[Ollama_SQL Self-Healing] Đã sửa c.defect_name -> d.name: {clean_query}\033[0m")

        # Self-healing SQL queries for small local models (automatically fix missing JOIN client_defects and wrong column names)
        # 1. Sửa penalty_amount thành penalty
        if "penalty_amount" in clean_query:
            clean_query = clean_query.replace("penalty_amount", "penalty")
            print(f"\033[93m[Ollama_SQL Self-Healing] Đã tự động sửa penalty_amount -> penalty: {clean_query}\033[0m")

        # 2. Tự động thêm JOIN client_defects nếu dùng d.name, d.code hoặc defect_name, defect_code mà thiếu JOIN
        lower_query = clean_query.lower()
        has_defect_col = "defect_name" in lower_query or "defect_code" in lower_query or "d.name" in lower_query or "d.code" in lower_query
        if has_defect_col and "join client_defects" not in lower_query:
            import re
            clean_query = re.sub(
                r"from\s+customer_claims(\s+c)?", 
                "FROM customer_claims c JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%')", 
                clean_query, 
                flags=re.IGNORECASE
            )
            print(f"\033[93m[Ollama_SQL Self-Healing] Đã tự động sửa truy vấn thiếu JOIN cho defect: {clean_query}\033[0m")
            lower_query = clean_query.lower()

        # 3. Chuẩn hóa defect_name/defect_code thành d.name/d.code nếu có alias d (sử dụng regex để tránh thay thế trùng lặp)
        if "join client_defects d" in clean_query.lower() or "join client_defects as d" in clean_query.lower():
            import re
            clean_query = re.sub(
                r"(?<!d\.name\s)(?<!d\.name\sas\s)(?<!d\.name\sAS\s)\bdefect_name\b", 
                "d.name AS defect_name", 
                clean_query, 
                flags=re.IGNORECASE
            )
            clean_query = re.sub(
                r"(?<!d\.code\s)(?<!d\.code\sas\s)(?<!d\.code\sAS\s)\bdefect_code\b", 
                "d.code AS defect_code", 
                clean_query, 
                flags=re.IGNORECASE
            )

        # 4. Tự động thêm alias c nếu dùng c. nhưng thiếu định nghĩa alias c trong FROM
        if "c." in clean_query and "customer_claims c" not in clean_query.lower() and "customer_claims as c" not in clean_query.lower():
            import re
            clean_query = re.sub(
                r"from\s+customer_claims", 
                "FROM customer_claims c", 
                clean_query, 
                flags=re.IGNORECASE
            )
            print(f"\033[93m[Ollama_SQL Self-Healing] Đã tự động thêm alias c: {clean_query}\033[0m")
            lower_query = clean_query.lower()
            
        # Standardize common defect search keywords to match DB values (e.g. 'NỨT', 'MÓP')
        if "nứt tét" in clean_query:
            clean_query = clean_query.replace("nứt tét", "nứt")
        if "móp méo" in clean_query:
            clean_query = clean_query.replace("móp méo", "móp")

        # 5. Tự động sửa điều kiện JOIN client_defects d bị lỗi cú pháp ngoặc đơn hoặc nối chuỗi phức tạp
        if "client_defects" in clean_query.lower() and "join client_defects" in clean_query.lower():
            try:
                import re
                join_idx = clean_query.lower().find("join client_defects")
                on_part = clean_query[join_idx:]
                pattern = re.compile(r"on\s+[\s\S]+?(?=\bwhere\b|\border\b|\bgroup\b|$)", re.IGNORECASE)
                on_clause_match = pattern.search(on_part)
                if on_clause_match:
                    on_clause = on_clause_match.group(0)
                    # Nếu điều kiện ON chứa dấu ngoặc lệch hoặc không phải cấu trúc JOIN chuẩn bằng LIKE và REPLACE
                    on_clause_normalized = on_clause.lower().replace('"', "'")
                    if (on_clause.count('(') != on_clause.count(')') or 
                        "like" not in on_clause_normalized or 
                        "replace(c.order_code, ' ', '')" not in on_clause_normalized.replace(" '", "'").replace("' ", "'") or
                        "',' +" not in on_clause_normalized or
                        "d.code" not in on_clause_normalized):
                        standard_on = "ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%') "
                        clean_query = clean_query[:join_idx] + pattern.sub(standard_on, on_part)
                        print(f"\033[93m[Ollama_SQL Self-Healing] Đã sửa điều kiện JOIN client_defects bị lỗi cú pháp: {clean_query}\033[0m")
            except Exception as join_err:
                logger.warning(f"Error repairing join condition: {join_err}")

        # 5b. Tự động thêm JOIN cabinet_prices nếu truy vấn sử dụng alias p. nhưng thiếu JOIN cabinet_prices
        lower_query = clean_query.lower()
        if "p." in clean_query and "join cabinet_prices" not in lower_query:
            try:
                import re
                clean_query = re.sub(
                    r"from\s+customer_claims(\s+c)?", 
                    "FROM customer_claims c LEFT JOIN cabinet_prices p ON c.product_name = p.cabinet_name", 
                    clean_query, 
                    flags=re.IGNORECASE
                )
                print(f"\033[93m[Ollama_SQL Self-Healing] Đã tự động thêm JOIN cabinet_prices p: {clean_query}\033[0m")
            except Exception as p_join_err:
                logger.warning(f"Error adding cabinet_prices join: {p_join_err}")

        # 5c. Tự động xử lý thuộc tính quantity bị ảo tưởng (hallucinated) trong SQL Server
        if "quantity" in clean_query.lower():
            try:
                import re
                # Thay thế SUM(c.quantity) hoặc SUM(quantity) thành COUNT(*)
                clean_query = re.sub(r"sum\(\s*(c\.)?quantity\s*\)", "COUNT(*)", clean_query, flags=re.IGNORECASE)
                # Thay thế c.quantity hoặc quantity trong các biểu thức khác thành 1
                clean_query = re.sub(r"\b(c\.)?quantity\b", "1", clean_query, flags=re.IGNORECASE)
                # Xử lý mệnh đề GROUP BY nếu có chứa số 1 dư thừa
                clean_query = re.sub(r"group\s+by\s+([^,]+?)\s*,\s*1\b", r"GROUP BY \1", clean_query, flags=re.IGNORECASE)
                clean_query = re.sub(r"group\s+by\s+1\b", "", clean_query, flags=re.IGNORECASE)
                print(f"\033[93m[Ollama_SQL Self-Healing] Đã tự động xử lý cột ảo tưởng quantity: {clean_query}\033[0m")
            except Exception as qty_err:
                logger.warning(f"Error handling quantity hallucination: {qty_err}")

        # 5d. Tự động chuyển đổi LIMIT (SQLite) thành TOP (SQL Server) và || thành +
        if "limit " in clean_query.lower():
            try:
                import re
                limit_match = re.search(r"\blimit\s+(\d+)\b", clean_query, flags=re.IGNORECASE)
                if limit_match:
                    limit_num = limit_match.group(1)
                    # Xóa LIMIT khỏi câu lệnh
                    clean_query = re.sub(r"\blimit\s+\d+\b", "", clean_query, flags=re.IGNORECASE).strip()
                    # Chèn TOP X vào sau SELECT
                    if not re.search(r"\bselect\s+top\b", clean_query, flags=re.IGNORECASE):
                        clean_query = re.sub(
                            r"\bselect\s+(distinct\s+)?", 
                            rf"SELECT \1TOP {limit_num} ", 
                            clean_query, 
                            count=1, 
                            flags=re.IGNORECASE
                        )
                        print(f"\033[93m[Ollama_SQL Self-Healing] Đã chuyển đổi LIMIT sang TOP {limit_num}: {clean_query}\033[0m")
            except Exception as limit_err:
                logger.warning(f"Error converting LIMIT to TOP: {limit_err}")

        if "||" in clean_query:
            clean_query = clean_query.replace("||", "+")
            print(f"\033[93m[Ollama_SQL Self-Healing] Đã chuyển đổi || sang +: {clean_query}\033[0m")

        # 5d. Tự động sửa hàm MONTH/YEAR áp dụng sai trên cột period (period là MM-YYYY dạng nvarchar)
        if "month(" in clean_query.lower() or "year(" in clean_query.lower():
            try:
                import re
                clean_query = re.sub(
                    r"\bmonth\(([a-zA-Z0-9_.]*period)\)",
                    r"CAST(LEFT(\1, 2) AS INT)",
                    clean_query,
                    flags=re.IGNORECASE
                )
                clean_query = re.sub(
                    r"\byear\(([a-zA-Z0-9_.]*period)\)",
                    r"CAST(RIGHT(\1, 4) AS INT)",
                    clean_query,
                    flags=re.IGNORECASE
                )
                print(f"\033[93m[Ollama_SQL Self-Healing] Đã tự động sửa MONTH/YEAR của period: {clean_query}\033[0m")
            except Exception as dt_err:
                logger.warning(f"Error repairing MONTH/YEAR on period: {dt_err}")

        # 5e. Tự động thêm JOIN client_defects nếu truy vấn sử dụng alias d. nhưng thiếu JOIN client_defects
        lower_query = clean_query.lower()
        if "d." in clean_query and "join client_defects" not in lower_query:
            try:
                import re
                clean_query = re.sub(
                    r"from\s+customer_claims(\s+c)?", 
                    "FROM customer_claims c LEFT JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%')", 
                    clean_query, 
                    flags=re.IGNORECASE
                )
                print(f"\033[93m[Ollama_SQL Self-Healing] Đã tự động thêm JOIN client_defects d: {clean_query}\033[0m")
            except Exception as d_join_err:
                logger.warning(f"Error adding client_defects join: {d_join_err}")

        # 6. Tự động xóa GROUP BY vô dụng nếu không chứa hàm aggregate nào (như count, sum, avg, max, min) trong câu SELECT
        if "group by" in clean_query.lower():
            aggregates = ["count(", "sum(", "avg(", "max(", "min("]
            if not any(agg in clean_query.lower() for agg in aggregates):
                import re
                clean_query = re.sub(
                    r"group\s+by\s+[\s\S]+?(?=\border\b|$)", 
                    "", 
                    clean_query, 
                    flags=re.IGNORECASE
                ).strip()
                print(f"\033[93m[Ollama_SQL Self-Healing] Đã tự động xóa GROUP BY vô dụng: {clean_query}\033[0m")

        # 6b. Tự động sửa lỗi GROUP BY thiếu cột (SQL Server yêu cầu mọi cột non-aggregate trong SELECT phải có mặt trong GROUP BY)
        if "group by" in clean_query.lower():
            try:
                lower_q = clean_query.lower()
                from_idx = lower_q.find("from ")
                group_idx = lower_q.find("group by")
                if from_idx > 0 and group_idx > from_idx:
                    select_part = clean_query[:from_idx]
                    group_part = clean_query[group_idx:]
                    
                    # Tìm tất cả các cột dạng x.y hoặc tên cột đơn lẻ
                    cols_in_select = set(re.findall(r"\b([cpds]\.[a-zA-Z0-9_]+)\b", select_part, re.IGNORECASE))
                    
                    # Loại bỏ các cột nằm trong SUM(...), COUNT(...), AVG(...), MAX(...), MIN(...)
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
                    
                    # Đảm bảo các cột non-aggregated có trong GROUP BY
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
                        print(f"\033[93m[Ollama_SQL Self-Healing] Đã tự động thêm các cột thiếu vào GROUP BY: {clean_query}\033[0m")
            except Exception as grp_err:
                logger.warning(f"Error repairing GROUP BY columns: {grp_err}")

        # 6c. Tự động xóa các JOIN trùng lặp (ví dụ AI join cabinet_prices 2 lần)
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
                        print(f"\033[93m[Ollama_SQL Self-Healing] Đã tự động xóa JOIN {table} trùng lặp: {clean_query}\033[0m")
                except Exception as join_dup_err:
                    logger.warning(f"Error removing duplicate join: {join_dup_err}")

        # Security checks (sử dụng regex \b để tránh khớp nhầm các cột hợp lệ như created_at)
        import re
        forbidden_keywords = ["insert", "update", "delete", "drop", "alter", "create", "truncate", "grant"]
        for keyword in forbidden_keywords:
            if re.search(r"\b" + keyword + r"\b", clean_query.lower()):
                return "Lỗi: Chỉ được phép thực hiện câu lệnh SELECT đọc dữ liệu."

        print(f"\033[96m[Ollama_SQL] CHẠY LỆNH:\033[0m {clean_query}")
        try:
            from sqlalchemy import text
            result = db_session.execute(text(clean_query))
            
            # If it's a SELECT returning rows
            if result.returns_rows:
                rows = result.fetchall()
                keys = list(result.keys())
                data_list = []
                for row in rows:
                    row_dict = {}
                    for i, val in enumerate(row):
                        from decimal import Decimal
                        if isinstance(val, datetime):
                            row_dict[keys[i]] = val.strftime("%Y-%m-%d %H:%M:%S")
                        elif isinstance(val, Decimal):
                            row_dict[keys[i]] = float(val)
                        else:
                            row_dict[keys[i]] = val
                    data_list.append(row_dict)
                    captured_items.append(row_dict)
                
                print(f"\033[96m[Ollama_SQL] KẾT QUẢ TRẢ VỀ:\033[0m {len(data_list)} dòng")
                return json.dumps(data_list, ensure_ascii=False)
            else:
                db_session.commit()
                return "Lệnh SQL được thực hiện thành công (Không trả về dòng dữ liệu)."
        except Exception as db_err:
            print(f"\033[91m[Ollama_SQL] LỖI CƠ SỞ DỮ LIỆU: {db_err}\033[0m")
            return f"Lỗi cơ sở dữ liệu khi chạy truy vấn: {str(db_err)}"

    def _post_process_response(self, text: str) -> str:
        """Hậu xử lý câu trả lời của AI để sửa các lỗi thường gặp."""
        if not text:
            return text
        import re
        # 1. Thay thế 'đồng' bằng 'USD' trong ngữ cảnh tiền tệ
        # Pattern: số + ký tự + 'đồng' (ví dụ: '1620.0 đồng', '1620 đồng')
        text = re.sub(r'(\d[\d,.]*\s*)đồng', r'\1USD', text)
        # Pattern: 'đồng' đứng riêng khi nói về tiền phạt
        text = text.replace(' đồng.', ' USD.').replace(' đồng,', ' USD,').replace(' đồng ', ' USD ')
        # 2. Loại bỏ các ký tự rác tiếng nước ngoài (tiếng Nga, Trung, etc.) ở cuối câu trả lời
        text = re.sub(r'[Ѐ-ӿ一-鿿]+\s*$', '', text).strip()
        return text

    def _format_query_result_for_ai(self, query_result: str) -> str:
        """Định dạng lại kết quả truy vấn JSON thành dạng text bảng gọn nhẹ để tiết kiệm token và tránh làm AI cục bộ bị bối rối bởi cú pháp JSON phức tạp."""
        if not query_result or not query_result.strip().startswith("["):
            return query_result
        try:
            data = json.loads(query_result)
            if not isinstance(data, list) or len(data) == 0:
                return "Không tìm thấy dữ liệu phù hợp."
            
            # Lấy tất cả các key (tên cột)
            headers = list(data[0].keys())
            formatted_lines = []
            formatted_lines.append("Cột: " + " | ".join(headers))
            
            for idx, row in enumerate(data):
                row_vals = []
                for h in headers:
                    val = row.get(h)
                    if val is None:
                        row_vals.append("NULL")
                    else:
                        row_vals.append(str(val))
                formatted_lines.append(f"Dòng {idx+1}: " + " | ".join(row_vals))
                
            return "\n".join(formatted_lines)
        except Exception:
            return query_result

    def chat_with_ai(self, message: str, db_session=None, context: dict = None, history: list = None) -> dict:
        if context is None:
            context = {}
        if history is None:
            history = []

        # Tự động làm sạch lịch sử chat: Lọc bỏ các tool call thô bằng JSON hoặc thông điệp hệ thống để tránh làm model bị lệch (bias)
        cleaned_history = []
        skip_next_user = False
        for h in history:
            role = h.get("role")
            content = h.get("content", "") or ""
            
            if skip_next_user and role == "user":
                skip_next_user = False
                continue
                
            if role == "assistant" and content.strip().startswith("{") and content.strip().endswith("}"):
                skip_next_user = True
                continue
                
            if role == "user" and (content.startswith("[Hệ thống:") or content.startswith("[System:")):
                continue
                
            cleaned_history.append(h)

        system_prompt = (
            "Bạn là Trợ lý AI của hệ thống SmartFlow, chuyên phân tích dữ liệu khiếu nại (claims).\n"
            f"Thông tin ngữ cảnh hiện tại của người dùng:\n{json.dumps(context, ensure_ascii=False)}\n\n"
            "Hãy trả lời bằng tiếng Việt ngắn gọn, dễ hiểu và chuyên nghiệp.\n"
            f"Thời gian hiện tại: {self.get_current_datetime()}\n\n"
            "Cấu trúc cơ sở dữ liệu và các quy tắc đặc biệt:\n"
            f"{self.get_database_schema()}\n\n"
            "Bạn có quyền truy cập công cụ `execute_read_only_query` để chạy truy vấn SQL và tìm kiếm dữ liệu.\n"
            "QUY TẮC BẮT BUỘC CHO MODEL CỤC BỘ:\n"
            "1. Tuyệt đối không tự đoán hoặc bịa ra số liệu (ví dụ: số lượng lỗi, số tiền phạt, tên sản phẩm...). Mọi câu hỏi đòi hỏi số liệu thực tế bắt buộc phải gọi công cụ execute_read_only_query để chạy SQL SELECT.\n"
            "2. Khi câu hỏi của người dùng có tính chất nối tiếp (ví dụ: '50 lỗi đó...', 'trong số đó...', 'ai là người...'), bạn vẫn phải viết câu lệnh SQL để truy vấn thông tin chi tiết từ database.\n"
            "3. Khi muốn gọi công cụ, hãy viết duy nhất một block mã JSON định dạng gọi hàm (ví dụ: {\"name\": \"execute_read_only_query\", \"arguments\": {\"query\": \"...\"}}). Không giải thích dài dòng và phải đảm bảo đóng đầy đủ các dấu ngoặc nhọn của JSON block.\n"
            "4. TUYỆT ĐỐI không được sinh ra các từ ngữ rác hoặc ký tự lạ nước ngoài ở cuối câu trả lời (như từ tiếng Nga 'ность', v.v.). Chỉ dùng duy nhất ngôn ngữ tiếng Việt và các định dạng JSON chuẩn.\n"
            "5. Đơn vị tiền phạt trong cơ sở dữ liệu luôn là Đô-la Mỹ (USD/$). Khi hiển thị hoặc trả lời về tiền phạt, bạn bắt buộc phải dùng đơn vị USD hoặc $, tuyệt đối không được dịch/đổi thành đồng Việt Nam (VND) hay 'đồng'. Ví dụ: '$120.00' hoặc '120 USD'.\n"
            "6. Khi người dùng yêu cầu liệt kê danh sách chi tiết hoặc thống kê nhiều dòng/nhiều cột dữ liệu, bạn BẮT BUỘC phải định dạng kết quả dưới dạng bảng Markdown rõ ràng và đầy đủ cột thông tin. Tuy nhiên, TUYỆT ĐỐI KHÔNG vẽ bảng rỗng (chỉ có tiêu đề không có data) hoặc bảng cho kết quả đơn lẻ (scalar - ví dụ kết quả chỉ là một con số tổng số lượng hoặc đếm tổng số dòng như 81). Nếu kết quả truy vấn SQL chỉ có 1 dòng chứa 1 con số (ví dụ: 81), bạn bắt buộc phải trả lời trực tiếp bằng câu chữ tự nhiên ngắn gọn (ví dụ: 'Tháng 2 có 81 khiếu nại'), không vẽ bảng.\n"
            "7. TUYỆT ĐỐI KHÔNG ảo tưởng các cột sau trong bảng customer_claims: quantity, qty, price, sale_price, cabinet_no, defect_name. Bảng customer_claims không hề có các cột này! Nếu muốn tính tiền phạt/giá tủ, bạn bắt buộc phải JOIN cabinet_prices p và dùng p.sale_price. Nếu muốn lấy tên lỗi tiếng Việt, bạn phải JOIN client_defects d và dùng d.name. Số lượng khiếu nại bằng số dòng hoặc COUNT(*).\n\n"
            "════════════ CÚ PHÁP TRUY VẤN SQL SERVER (MS SQL) THAM KHẢO ════════════\n"
            "- Tính tổng tiền phạt trong một tháng (ví dụ tháng 01/2025):\n"
            "  SELECT SUM(CASE WHEN c.action LIKE '$%' THEN CAST(REPLACE(REPLACE(c.action, '$', ''), ',', '') AS DECIMAL(18,2)) WHEN c.action = 'Full BC' THEN COALESCE(p.sale_price, 0) WHEN c.action = 'X2 Unit' THEN COALESCE(p.sale_price, 0) * 2 ELSE 0 END) AS total_penalty FROM customer_claims c LEFT JOIN cabinet_prices p ON c.product_name = p.cabinet_name WHERE c.period = '01-2025'\n\n"
            "- Đếm số lượng khiếu nại trong một tháng cụ thể (ví dụ tháng 02/2026):\n"
            "  SELECT COUNT(*) FROM customer_claims WHERE period = '02-2026'\n\n"
            "- Đếm số khiếu nại của lỗi cụ thể (ví dụ 'nứt sơn' trong tháng 05/2026):\n"
            "  SELECT COUNT(*) FROM customer_claims c JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%') WHERE d.name LIKE N'%nứt sơn%' AND c.period = '05-2026'\n\n"
            "- Liệt kê danh sách chi tiết các khiếu nại (ví dụ tháng 01/2025):\n"
            "  SELECT TOP 50 c.claim_code, c.product_name, d.name AS defect_name, c.action, c.status, c.created_at FROM customer_claims c LEFT JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%') WHERE c.period = '01-2025' ORDER BY c.created_at DESC\n\n"
            "- Tìm khiếu nại của một số Cabinet cụ thể (ví dụ Cabinet #12):\n"
            "  SELECT TOP 10 c.claim_code, c.product_name, d.name AS defect_name, c.action, c.status FROM customer_claims c LEFT JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%') WHERE c.claim_code LIKE N'%Cabinet #12%' OR c.claim_code LIKE N'%Cabinet 12%'\n\n"
            "- Thống kê chi phí phạt theo sản phẩm (bảng chi phí — dùng khi người dùng hỏi 'thống kê chi phí', 'bảng chi phí', 'list chi phí'):\n"
            "  SELECT TOP 50 c.product_name AS ten_san_pham, d.name AS ten_loi, c.action AS hinh_thuc_phat, CASE WHEN c.action LIKE '$%' THEN CAST(REPLACE(REPLACE(c.action, '$', ''), ',', '') AS DECIMAL(18,2)) WHEN c.action = 'Full BC' THEN COALESCE(p.sale_price, 0) WHEN c.action = 'X2 Unit' THEN COALESCE(p.sale_price, 0) * 2 ELSE 0 END AS gia_tri_phat_usd, c.status, c.period FROM customer_claims c LEFT JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%') LEFT JOIN cabinet_prices p ON c.product_name = p.cabinet_name ORDER BY gia_tri_phat_usd DESC\n\n"
            "- Tổng hợp chi phí phạt gộp nhóm theo sản phẩm (GROUP BY - dùng khi hỏi tổng chi phí gộp theo sản phẩm):\n"
            "  SELECT c.product_name, SUM(CASE WHEN c.action LIKE '$%' THEN CAST(REPLACE(REPLACE(c.action, '$', ''), ',', '') AS DECIMAL(18,2)) WHEN c.action = 'Full BC' THEN COALESCE(p.sale_price, 0) WHEN c.action = 'X2 Unit' THEN COALESCE(p.sale_price, 0) * 2 ELSE 0 END) AS tong_chi_phi_usd, COUNT(*) AS so_luong_claim FROM customer_claims c LEFT JOIN cabinet_prices p ON c.product_name = p.cabinet_name GROUP BY c.product_name ORDER BY tong_chi_phi_usd DESC\n\n"
            "- Truy vấn LIÊN KẾT NHIỀU BẢNG (Master JOIN liên kết 4 bảng khiếu nại, lỗi, bảng giá, và container):\n"
            "  SELECT TOP 50 c.claim_code, c.product_name, d.name AS defect_name, c.action, p.sale_price AS unit_price, s.destination_port, c.status FROM customer_claims c LEFT JOIN client_defects d ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%') LEFT JOIN cabinet_prices p ON c.product_name = p.cabinet_name LEFT JOIN container_shipments s ON c.container_no = s.container_number WHERE c.period = '01-2025' ORDER BY c.created_at DESC\n\n"
            "LƯU Ý QUAN TRỌNG:\n"
            "- Đây là SQL Server (MS SQL), TUYỆT ĐỐI KHÔNG ĐƯỢC dùng LIMIT, dùng TOP để giới hạn dòng. Dùng dấu cộng (+) để nối chuỗi thay cho ||.\n"
            "- Đơn vị tiền phạt LUÔN LUÔN là USD ($). TUYỆT ĐỐI không dùng từ 'đồng' hay VND khi trả lời về tiền phạt.\n"
            "- Khi JOIN bảng client_defects, bắt buộc phải viết đúng cú pháp: ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%'). Chú ý dấu nháy đơn chứa khoảng trắng ' ' và dấu phẩy ','. Không được viết nháy đơn rỗng ''."
        )

        # System whisper for local models to force tool usage on data queries
        enhanced_message = message
        lower_msg = message.lower()
        data_keywords = ["bao nhiêu", "mấy", "liệt kê", "danh sách", "tổng", "phạt", "khiếu nại", "lỗi", "chỉ số", "kpi", "đơn hàng", "sản xuất", "chi tiết", "liệt ra", "liệt", "thống kê", "bảng", "list", "chi phí", "thong ke", "bang"]
        if any(kw in lower_msg for kw in data_keywords):
            enhanced_message += (
                "\n[Hệ thống nhắc: Để trả lời chính xác, bạn BẮT BUỘC phải tạo câu lệnh SQL SELECT và gọi công cụ `execute_read_only_query` bằng cách viết duy nhất một block mã JSON. "
                "Tuyệt đối không được đoán số lượng. Phải dùng JOIN để lấy Tên Lỗi chính xác từ client_defects nếu cần hiển thị hoặc đếm lỗi. "
                "LƯU Ý CÚ PHÁP: Đây là SQL Server (MS SQL), TUYỆT ĐỐI KHÔNG dùng LIMIT (dùng TOP), TUYỆT ĐỐI KHÔNG dùng || (dùng +). "
                "BẮT BUỘC JOIN client_defects phải đúng dấu nháy: ON (',' + REPLACE(c.order_code, ' ', '') + ',') LIKE ('%,' + d.code + ',%'). "
                "Không được viết nháy đơn rỗng '' trong REPLACE và các chuỗi bao quanh. "
                "BẮT BUỘC: Đơn vị tiền phạt luôn là USD ($). Nếu câu trả lời có danh sách hoặc thống kê, phải trình bày bảng Markdown.]"
            )

        messages = [{"role": "system", "content": system_prompt}]
        for h in cleaned_history:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": enhanced_message})

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "execute_read_only_query",
                    "description": "Thực thi câu lệnh SQL SELECT đọc cơ sở dữ liệu để lấy dữ liệu thống kê khiếu nại thực tế.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Câu lệnh SQL SELECT đầy đủ. Ví dụ: SELECT COUNT(*) FROM customer_claims WHERE period='02-2026'"
                            }
                        },
                        "required": ["query"]
                    }
                }
            }
        ]

        captured_items = []

        for attempt in range(self.max_retries + 1):
            try:
                for round_idx in range(MAX_TOOL_ROUNDS):
                    # Chúng ta không gửi tham số 'tools' và 'tool_choice' lên Ollama/Express Proxy nữa.
                    # Điều này bắt buộc mô hình nhỏ (như Qwen 2.5:3b) phải viết JSON block gọi hàm
                    # dưới dạng văn bản (text-based tool calling), tránh việc Express Proxy nuốt hoặc
                    # làm mất các trường tool_calls/native stream.
                    payload = {
                        "model": self.model_name,
                        "messages": messages,
                        "temperature": 0.1
                    }

                    headers = {"Content-Type": "application/json"}
                    if self.api_key:
                        headers["Authorization"] = f"Bearer {self.api_key}"
                    print(f"[Ollama] Đang gọi model {self.model_name} (Lượt {round_idx + 1})...")
                    res = requests.post(self.api_url, headers=headers, json=payload, timeout=(3.0, 30.0))
                    res.encoding = 'utf-8'
                    
                    if res.status_code != 200:
                        raise Exception(f"HTTP {res.status_code}: {res.text}")

                    res_msg = self._parse_ollama_response(res.text)
                    tool_calls = res_msg.get("tool_calls")
                    ai_text = res_msg.get("content", "")

                    # Phát hiện nếu AI trả về raw JSON error thay vì text thường
                    if ai_text and ai_text.strip().startswith('{"error"'):
                        print(f"\033[91m[Ollama] Phát hiện AI trả raw JSON error, bỏ qua lượt này: {ai_text[:200]}\033[0m")
                        raise Exception(f"AI returned raw error JSON: {ai_text[:200]}")

                    # Chuẩn hóa tin nhắn phản hồi trước khi lưu vào history
                    formatted_res_msg = {
                        "role": res_msg.get("role", "assistant"),
                        "content": res_msg.get("content", "")
                    }
                    if res_msg.get("tool_calls"):
                        formatted_res_msg["tool_calls"] = res_msg["tool_calls"]

                    # Intercept markdown json tool calls
                    is_text_tool = False
                    if not tool_calls and ai_text:
                        parsed_tool = self._parse_text_tool_call(ai_text)
                        if parsed_tool:
                            is_text_tool = True
                            func_name = parsed_tool["name"]
                            arguments = parsed_tool["arguments"]
                            
                            if func_name == "execute_read_only_query":
                                query = arguments.get("query")
                                query_result = self.execute_read_only_query(query, db_session, captured_items)
                                
                                # Tự động phân tích kết quả: Nếu có lỗi SQL, yêu cầu AI tự sửa đổi và thử lại
                                if "Lỗi cơ sở dữ liệu" in str(query_result) or "Error" in str(query_result) or "ProgrammingError" in str(query_result):
                                    user_feedback = (
                                        f"[Hệ thống: Thực thi SQL thất bại do lỗi:\n{query_result}]\n"
                                        "Hãy tự động sửa lại câu lệnh SQL cho đúng chuẩn SQL Server (MS SQL) và thực hiện gọi lại công cụ. "
                                        "Lưu ý quan trọng: Bảng customer_claims KHÔNG có các cột quantity, qty, price, sale_price, cabinet_no, defect_name. "
                                        "Để lấy giá tủ/tính tiền phạt, bạn bắt buộc phải LEFT JOIN cabinet_prices p ON c.product_name = p.cabinet_name và dùng p.sale_price. "
                                        "Nếu dùng GROUP BY, mọi cột không nằm trong hàm aggregate (như SUM, COUNT) bắt buộc phải xuất hiện đầy đủ trong mệnh đề GROUP BY. "
                                        "TUYỆT ĐỐI không dùng LIMIT (dùng TOP), không dùng || (dùng +). Không giải thích lỗi này cho người dùng."
                                    )
                                else:
                                    is_scalar = False
                                    try:
                                        res_data = json.loads(query_result)
                                        if isinstance(res_data, list) and len(res_data) == 1:
                                            row = res_data[0]
                                            if isinstance(row, dict) and len(row) == 1:
                                                is_scalar = True
                                    except Exception:
                                        pass

                                    ai_friendly_result = self._format_query_result_for_ai(query_result)
                                    if is_scalar:
                                        user_feedback = (
                                            f"[Hệ thống: Kết quả thực thi SQL từ công cụ {func_name}:\n{ai_friendly_result}]\n"
                                            "Lưu ý quan trọng: Kết quả truy vấn trên là một con số/giá trị đơn lẻ (scalar). Bạn BẮT BUỘC phải trả lời bằng câu chữ tự nhiên ngắn gọn tiếng Việt (ví dụ: 'Tháng 2 có 81 khiếu nại'). "
                                            "TUYỆT ĐỐI KHÔNG vẽ bảng Markdown rỗng hoặc bảng trống có tiêu đề cột không có data, chỉ viết câu trả lời trực tiếp."
                                        )
                                    else:
                                        user_feedback = (
                                            f"[Hệ thống: Kết quả thực thi SQL từ công cụ {func_name}:\n{ai_friendly_result}]\n"
                                            "Hãy phân tích kết quả SQL trên và trả lời trực tiếp câu hỏi của người dùng bằng tiếng Việt tự nhiên ngắn gọn. "
                                            "Lưu ý: Nếu đây là danh sách chi tiết hoặc thống kê nhiều dòng/nhiều cột, hãy trình bày đẹp mắt dưới dạng BẢNG MARKDOWN rõ ràng. "
                                            "Tuyệt đối không được viết mã JSON hoặc gọi hàm nữa."
                                        )

                                messages.append({"role": "assistant", "content": ai_text})
                                messages.append({
                                    "role": "user",
                                    "content": user_feedback
                                })
                            else:
                                messages.append({"role": "assistant", "content": ai_text})
                                messages.append({
                                    "role": "user",
                                    "content": f"[Hệ thống: Lỗi: Không tìm thấy công cụ '{func_name}']"
                                })
                            
                            continue

                    if not is_text_tool:
                        # Append assistant message to history context
                        messages.append(formatted_res_msg)

                        if tool_calls:
                            for tool_call in tool_calls:
                                func_name = tool_call.get("function", {}).get("name")
                                arguments_str = tool_call.get("function", {}).get("arguments")
                                
                                # Safely parse arguments
                                if isinstance(arguments_str, str):
                                    try:
                                        arguments = json.loads(arguments_str)
                                    except Exception:
                                        arguments = {}
                                else:
                                    arguments = arguments_str or {}

                                if func_name == "execute_read_only_query":
                                    query = arguments.get("query")
                                    query_result = self.execute_read_only_query(query, db_session, captured_items)
                                    
                                    # Append tool response back to assistant context
                                    ai_friendly_result = self._format_query_result_for_ai(query_result)
                                    messages.append({
                                        "role": "tool",
                                        "tool_call_id": tool_call.get("id"),
                                        "name": "execute_read_only_query",
                                        "content": ai_friendly_result
                                    })
                                else:
                                    messages.append({
                                        "role": "tool",
                                        "tool_call_id": tool_call.get("id"),
                                        "name": func_name,
                                        "content": f"Lỗi: Không tìm thấy công cụ '{func_name}'."
                                    })
                        else:
                            # Final answer reached
                            final_text = ai_text
                            
                            # Chặn raw JSON error hiển thị cho user
                            if final_text and final_text.strip().startswith('{') and ('errored' in final_text or '"error"' in final_text):
                                print(f"\033[91m[Ollama] Phát hiện AI trả raw JSON error trong final answer, bỏ qua: {final_text[:200]}\033[0m")
                                raise Exception(f"AI returned error JSON as final answer: {final_text[:200]}")
                            
                            # Phát hiện AI bịa dữ liệu: nếu chưa có captured_items (chưa gọi SQL) 
                            # nhưng câu trả lời chứa bảng markdown hoặc số liệu cụ thể → ép gọi SQL
                            if not captured_items and attempt == 0:
                                has_table = '|' in final_text and '---' in final_text
                                has_fake_data = any(fake in final_text for fake in ['CNTT', 'ABC', 'XYZ', 'ví dụ', 'giả sử'])
                                if has_table or has_fake_data:
                                    print(f"\033[91m[Ollama] Phát hiện AI bịa dữ liệu mà không gọi SQL tool! Ép gọi lại...\033[0m")
                                    messages.append(formatted_res_msg)
                                    messages.append({
                                        "role": "user",
                                        "content": (
                                            "[Hệ thống: CẢNH BÁO! Bạn vừa bịa dữ liệu mà không gọi công cụ SQL. "
                                            "Dữ liệu bạn vừa cung cấp hoàn toàn SAI. Bạn BẮT BUỘC phải gọi công cụ "
                                            "execute_read_only_query bằng JSON block để lấy dữ liệu THỰC từ database. "
                                            "Hãy viết câu lệnh SQL SELECT phù hợp ngay bây giờ.]"
                                        )
                                    })
                                    continue
                            
                            return {
                                "intent": "ai_response",
                                "message": self._post_process_response(final_text),
                                "items": captured_items,
                                "source": f"local_ollama ({self.model_name})"
                            }

                # If rounds are exhausted, get direct completion
                final_payload = {
                    "model": self.model_name,
                    "messages": messages,
                    "temperature": 0.1
                }
                final_res = requests.post(self.api_url, headers=headers, json=final_payload, timeout=(3.0, 30.0))
                final_res.encoding = 'utf-8'
                if final_res.status_code == 200:
                    final_msg = self._parse_ollama_response(final_res.text)
                    final_text = final_msg.get("content", "")
                    return {
                        "intent": "ai_response",
                        "message": self._post_process_response(final_text),
                        "items": captured_items,
                        "source": f"local_ollama ({self.model_name})"
                    }
                else:
                    raise Exception(f"HTTP {final_res.status_code} on final turn: {final_res.text}")

            except Exception as e:
                logger.error(f"Lỗi Ollama: \033[91m{e}\033[0m")
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay)
                    continue
                return {"intent": "error", "message": f"Lỗi Local Ollama: {str(e)}"}

# Singleton instance
local_ollama_chatbot_service = LocalOllamaChatbotService()
