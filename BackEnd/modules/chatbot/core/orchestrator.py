# -*- coding: utf-8 -*-
"""
ChatBot v2.1 Orchestrator for SmartFlow ERP (Full Project, Web-Only, Read-Only + ACL).
- Fast-Path cho lời chào.
- Phân giải quyền ACL theo người dùng hiện tại (`acl_guard`).
- Định tuyến Domain thông minh + nạp Schema động gọn nhẹ.
- Agent Loop tối đa 4 vòng với:
  + `execute_safe_sql` (SQL Server T-SQL chỉ đọc)
  + `get_erp_overview` (Tổng quan nhanh toàn hệ thống)
  + `create_chart` (Dựng biểu đồ tương tác Pareto/Bar/HorizontalBar/Line/Area/Pie có tính sẵn % & KPI highlights)
  + `create_infographic` (Dựng Poster Infographic điều hành 5 khối từ số liệu thật)
  + `get_current_datetime`
- Tự động làm sạch phản hồi (`response_sanitizer`), tự retry khi LLM ảo giác từ chối tool,
  và Smart Time Fallback (tự lấy kỳ gần nhất khi kỳ hiện tại = 0 dòng).
"""
import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, Generator, List, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

from modules.chatbot.core.acl_guard import (
    build_user_context_summary,
    get_allowed_domains,
)
from modules.chatbot.core.llm_gateway import llm_gateway
from modules.chatbot.core.response_sanitizer import (
    build_chart_spec,
    build_infographic_spec,
    is_tool_refusal_hallucination,
    preprocess_user_query,
    sanitize_llm_response,
)
from modules.chatbot.core.sql_sandbox import execute_safe_sql
from modules.chatbot.domains import (
    ALL_DOMAINS,
    build_dynamic_schema_prompt,
    get_allowed_tables_for_domains,
    route_domains,
)

logger = logging.getLogger("chatbot.orchestrator")

GREETING_PATTERNS = re.compile(
    r"^(xin\s*chào|chào|chao|hello|hi|hey|alo|chào\s*bạn|chào\s*bot|chào\s*trợ\s*lý|good\s*(morning|afternoon|evening))[\s!.,?]*$",
    re.IGNORECASE,
)

BASE_SYSTEM_PROMPT = """Bạn là **Trợ lý AI Phân tích & Quản trị SmartFlow ERP** cho doanh nghiệp sản xuất đồ gỗ/nội thất (chế độ CHỈ ĐỌC - Read-Only).

NGUYÊN TẮC BẮT BUỘC:
1. Trả lời bằng **tiếng Việt** tự nhiên, súc tích, chính xác, chuyên nghiệp.
2. Mọi số liệu, danh sách, thống kê PHẢI được truy vấn thực tế từ cơ sở dữ liệu SQL Server thông qua công cụ `execute_safe_sql` hoặc `get_erp_overview`. TUYỆT ĐỐI KHÔNG tự bịa số liệu và KHÔNG BAO GIỜ nói rằng công cụ truy vấn không khả dụng.
3. CHỈ chạy câu lệnh `SELECT` (T-SQL). Khi so sánh chuỗi có dấu tiếng Việt, luôn dùng tiền tố `N'...'`. Dùng `GROUP BY` / `COUNT(*)` / `SUM(...)` trong 1 truy vấn.
4. **TỰ ĐỘNG LẤY KỲ GẦN NHẤT (SMART TIME FALLBACK)**:
   - Khi người dùng hỏi *"tháng này / tuần này / hôm nay"* mà truy vấn trả về `0` dòng (hoặc tổng = 0), bạn **BẮT BUỘC tự động chạy thêm 1 truy vấn** tìm tháng/kỳ gần nhất có dữ liệu, lấy đủ số liệu kỳ đó để lập bảng / vẽ biểu đồ / phân tích luôn trong cùng câu trả lời, và ghi chú rõ ở dòng đầu (VD: *"Tháng 11/2026 chưa có dữ liệu; hệ thống tự động phân tích kỳ gần nhất có dữ liệu là Tháng 09/2026."*).
5. **BẢNG DỮ LIỆU (MARKDOWN TABLE)**:
   - Khi liệt kê thống kê/xếp hạng, luôn trình bày bảng Markdown chuẩn có đủ dấu `|` ở đầu và cuối mỗi dòng (VD: `| Hạng | Loại lỗi | Số lượng | Tỷ trọng |`) kèm dòng **Tổng cộng** ở cuối bảng.
6. **VẼ BIỂU ĐỒ (BẮT BUỘC DÙNG TOOL `create_chart`)**:
   - Khi người dùng yêu cầu vẽ/tạo biểu đồ (Pareto, cột, cột ngang, đường, vùng, tròn, cơ cấu, xu hướng, top lỗi...), sau khi có số liệu từ `execute_safe_sql`, bạn **BẮT BUỘC gọi công cụ `create_chart`** với dữ liệu thật đó.
   - Gợi ý chọn loại biểu đồ: `pareto` (top lỗi/khiếu nại 80/20), `horizontal_bar` (nhiều hạng mục tên dài/SKU), `bar` (so sánh công đoạn/kho/xưởng), `line` hoặc `area` (xu hướng theo tháng/ngày), `pie` (cơ cấu tỷ trọng ≤ 7 nhóm).
7. **VẼ INFOGRAPHIC ĐIỀU HÀNH (BẮT BUỘC DÙNG TOOL `create_infographic`)**:
   - Khi người dùng yêu cầu vẽ/tạo **infographic** (báo cáo tổng hợp, infographic QC, sản xuất, kho, claim...), sau khi truy vấn số liệu thật bằng `execute_safe_sql` / `get_erp_overview`, bạn **BẮT BUỘC gọi công cụ `create_infographic`** truyền đủ: `title`, `subtitle`, `period`, `badge`, `kpis` (2–4 thẻ KPI), `ranking_title`, `ranking_items` (top hạng mục kèm số liệu), `highlights` (3–4 điểm nổi bật), và `recommendations` (3–4 khuyến nghị hành động).
8. **KHUNG ĐÁNH GIÁ & PHÂN TÍCH CHUYÊN SÂU (3 TẦNG)**:
   - Với mọi câu hỏi có biểu đồ, infographic, đánh giá hoặc phân tích, luôn trình bày ngắn gọn, sắc bén theo 3 mục:
     - **1. Điểm nổi bật (Key Findings)**: Con số cốt lõi, tỷ trọng Top 1 / Top 3 (quy tắc 80/20), biến động bất thường.
     - **2. Nguyên nhân có thể (Root Cause)**: Liên hệ trực tiếp quy trình sản xuất đồ gỗ (độ ẩm gỗ/sấy, sơn, gia công phôi, lắp ráp, bao gói, tồn kho, tiến độ LSX).
     - **3. Khuyến nghị & Hành động (Action Plan)**: Đề xuất hành động cụ thể (mở CAPA, siết QC công đoạn, tối ưu vật tư/LSX...).
9. Nếu người dùng yêu cầu thêm/sửa/xóa dữ liệu, lịch sự nhắc rằng Trợ lý AI hoạt động ở chế độ chỉ đọc (Read-Only).
"""


def _build_tools_schema() -> List[Dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {
                "name": "get_current_datetime",
                "description": "Lấy ngày giờ hiện tại của máy chủ (YYYY-MM-DD HH:MM:SS) để xử lý các mốc 'hôm nay', 'tháng này', 'năm nay'.",
                "parameters": {"type": "object", "properties": {}},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_erp_overview",
                "description": "Lấy nhanh các chỉ số tổng quan hôm nay/tháng này trên các phân hệ người dùng được phép xem (Đơn hàng/LSX, Nhập/Xuất kho, QC, CAPA, Claim, Máy móc sắp bảo trì).",
                "parameters": {"type": "object", "properties": {}},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "execute_safe_sql",
                "description": "Thực thi câu lệnh SQL Server (T-SQL) SELECT chỉ đọc trên các bảng thuộc phân hệ được phép và trả về JSON kết quả.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Câu lệnh T-SQL SELECT hợp lệ (chỉ đọc).",
                        }
                    },
                    "required": ["query"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "create_chart",
                "description": "Tạo biểu đồ tương tác trực tiếp trên giao diện Web từ dữ liệu thật đã truy vấn. Hệ thống tự tính % tỷ trọng, % tích lũy Pareto 80/20 và KPI highlights.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "chart_type": {
                            "type": "string",
                            "enum": ["pareto", "bar", "horizontal_bar", "line", "area", "pie"],
                            "description": "Loại biểu đồ cần hiển thị.",
                        },
                        "title": {"type": "string", "description": "Tiêu đề biểu đồ (nên ghi rõ kỳ thời gian)."},
                        "subtitle": {"type": "string", "description": "Mô tả ngắn hoặc ghi chú kỳ dữ liệu."},
                        "unit": {"type": "string", "description": "Đơn vị đo (VD: lỗi, cái, phiếu, USD, VNĐ, %)."},
                        "data": {
                            "type": "array",
                            "description": "Danh sách điểm dữ liệu dạng [{name, value}].",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "value": {"type": "number"},
                                },
                                "required": ["name", "value"],
                            },
                        },
                    },
                    "required": ["chart_type", "title", "data"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "create_infographic",
                "description": "Tạo Poster Infographic báo cáo điều hành 5 khối chuẩn tiếng Việt từ số liệu thật (cho phép phóng to & tải ảnh PNG 2x).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string", "description": "Tiêu đề chính của Infographic."},
                        "subtitle": {"type": "string", "description": "Phụ đề tóm tắt ngắn gọn."},
                        "period": {"type": "string", "description": "Kỳ báo cáo (VD: Tháng 09/2026, Hôm nay...)."},
                        "badge": {"type": "string", "description": "Nhãn phân hệ (VD: BÁO CÁO QLCL, TỔNG QUAN SẢN XUẤT)."},
                        "unit": {"type": "string", "description": "Đơn vị đo cho mục xếp hạng (VD: lỗi, cái, USD)."},
                        "kpis": {
                            "type": "array",
                            "description": "2 đến 4 thẻ KPI nổi bật.",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "label": {"type": "string"},
                                    "value": {"type": "string"},
                                    "subtext": {"type": "string"},
                                    "status": {"type": "string", "enum": ["good", "warning", "danger", "neutral"]},
                                },
                                "required": ["label", "value"],
                            },
                        },
                        "ranking_title": {"type": "string", "description": "Tiêu đề khối xếp hạng Top hạng mục."},
                        "ranking_items": {
                            "type": "array",
                            "description": "Top 5-8 hạng mục kèm giá trị số.",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "value": {"type": "number"},
                                },
                                "required": ["name", "value"],
                            },
                        },
                        "highlights": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "3-4 điểm nổi bật / nguyên nhân chính.",
                        },
                        "recommendations": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "3-4 khuyến nghị hành động cụ thể.",
                        },
                    },
                    "required": ["title", "kpis", "highlights", "recommendations"],
                },
            },
        },
    ]


def _get_erp_overview_tool(db: Session, allowed_domains: List[str]) -> str:
    """Dedicated Read-Only Tool tổng hợp nhanh các chỉ số chính theo quyền của user."""
    if db is None:
        return json.dumps({"error": "Không có kết nối CSDL."}, ensure_ascii=False)

    summary: Dict[str, Any] = {"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

    def _scalar(sql: str):
        try:
            return db.execute(text(sql)).scalar() or 0
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass
            return None

    if "production" in allowed_domains:
        summary["production"] = {
            "orders_in_progress": _scalar("SELECT COUNT(*) FROM orders WHERE order_status = 1"),
            "orders_priority_open": _scalar("SELECT COUNT(*) FROM orders WHERE is_priority = 1 AND order_status < 2"),
            "daily_batches_today": _scalar("SELECT COUNT(*) FROM daily_production_batches WHERE CAST(plan_date AS DATE) = CAST(GETDATE() AS DATE)"),
        }
    if "warehouse" in allowed_domains:
        summary["warehouse"] = {
            "receipts_today": _scalar("SELECT COUNT(*) FROM goods_receipts WHERE (is_deleted=0 OR is_deleted IS NULL) AND CAST(receipt_date AS DATE) = CAST(GETDATE() AS DATE)"),
            "issues_today": _scalar("SELECT COUNT(*) FROM goods_issues WHERE (is_deleted=0 OR is_deleted IS NULL) AND CAST(issue_date AS DATE) = CAST(GETDATE() AS DATE)"),
            "rejected_goods_open": _scalar("SELECT COUNT(*) FROM rejected_goods WHERE (is_deleted=0 OR is_deleted IS NULL) AND (status IS NULL OR status NOT IN (N'Đã xử lý', N'Hoàn thành'))"),
        }
    if "quality" in allowed_domains:
        summary["quality"] = {
            "daily_qc_today": _scalar("SELECT COUNT(*) FROM daily_inspection_records WHERE (is_deleted=0 OR is_deleted IS NULL) AND CAST(inspection_date AS DATE) = CAST(GETDATE() AS DATE)"),
            "capas_open": _scalar("SELECT COUNT(*) FROM capas WHERE ticket_status IS NULL OR ticket_status NOT IN (N'Đã đóng', N'Hoàn thành', 'Closed')"),
        }
    if "claim" in allowed_domains:
        ym = datetime.now().strftime("%m-%Y")
        summary["claim"] = {
            "current_period": ym,
            "claims_this_month": _scalar(f"SELECT COUNT(*) FROM customer_claims WHERE period = '{ym}'"),
            "claims_total": _scalar("SELECT COUNT(*) FROM customer_claims"),
        }
    if "equipment_iso_system" in allowed_domains:
        summary["equipment_iso"] = {
            "machines_due_14d": _scalar("SELECT COUNT(*) FROM machines WHERE next_maintenance_date IS NOT NULL AND next_maintenance_date <= DATEADD(day, 14, GETDATE())"),
            "high_bugs_open": _scalar("SELECT COUNT(*) FROM screen_bugs WHERE severity = 'High' AND status NOT IN (N'Đã sửa', N'Đã đóng')"),
        }

    return json.dumps(summary, ensure_ascii=False)


def _normalize_entity_cards(raw_items: List[Dict[str, Any]], db: Session = None) -> List[Dict[str, Any]]:
    """Chuẩn hóa danh sách bản ghi thành Entity Cards có link điều hướng cho Web UI."""
    cards: List[Dict[str, Any]] = []
    for item in raw_items[:20]:
        if not isinstance(item, dict):
            continue
        if "claim_code" in item or "cabinet_no" in item:
            claim_code = item.get("claim_code") or ""
            cab_no = item.get("cabinet_no")
            if cab_no is None and claim_code:
                m = re.search(r"(\d+)", str(claim_code))
                if m:
                    cab_no = int(m.group(1))
            cards.append({
                "entity_type": "claim",
                "id": item.get("id"),
                "cabinet_no": cab_no,
                "claim_code": claim_code,
                "sku": item.get("sku") or item.get("product_name") or "",
                "product_name": item.get("product_name") or item.get("sku") or "",
                "defect_code": item.get("defect_code") or item.get("order_code") or "",
                "defect_name": item.get("defect_name") or "",
                "company_error_code": item.get("company_error_code") or "",
                "action": item.get("action") or "",
                "period": item.get("period") or "",
                "container_no": item.get("container_no") or "",
                "lpn": item.get("lpn") or "",
                "status": item.get("status") or "",
                "route": "/admin/claims",
            })
        elif "order_code" in item and ("production_code" in item or "customer" in item):
            cards.append({
                "entity_type": "order",
                "id": item.get("id"),
                "title": f"LSX {item.get('production_code') or item.get('order_code')}",
                "subtitle": item.get("customer") or "",
                "meta": f"Đơn hàng: {item.get('order_code', '')} | Giao: {item.get('delivery_date', 'N/A')}",
                "status": str(item.get("order_status", "")),
                "route": "/admin/production-orders",
            })
        elif "voucher_no" in item and "warehouse_name" in item:
            cards.append({
                "entity_type": "warehouse",
                "id": item.get("id"),
                "title": f"Phiếu kho {item.get('voucher_no')}",
                "subtitle": item.get("warehouse_name") or "",
                "meta": f"SL: {item.get('total_quantity', item.get('quantity_main', ''))} | Trạng thái: {item.get('status', '')}",
                "status": item.get("status") or "",
                "route": "/admin/warehouse",
            })
        elif "ticket_code" in item:
            cards.append({
                "entity_type": "inspection",
                "id": item.get("id"),
                "title": f"Phiếu QC {item.get('ticket_code')}",
                "subtitle": item.get("part_name") or item.get("product_sku") or "",
                "meta": f"Công đoạn: {item.get('stage', '')} | Kết quả: {item.get('result', '')}",
                "status": item.get("result") or "",
                "route": "/admin/quality",
            })
    return cards


def _get_context_suggestions(domain_keys: List[str], current_page: str = "") -> List[str]:
    page = (current_page or "").lower()
    if "/warehouse" in page or "warehouse" in domain_keys:
        return [
            "Hôm nay có bao nhiêu phiếu nhập và xuất kho?",
            "Vẽ biểu đồ cột giá trị xuất kho theo từng kho",
            "Tạo infographic tình hình kho & vật tư",
        ]
    if "/production" in page or "/plan" in page or "production" in domain_keys:
        return [
            "Đơn hàng / LSX nào đang ưu tiên và chưa hoàn thành?",
            "Vẽ biểu đồ thống kê đơn hàng theo trạng thái",
            "Tạo infographic tổng quan tiến độ sản xuất",
        ]
    if "/quality" in page or "/capa" in page or "/defects" in page or "quality" in domain_keys:
        return [
            "Vẽ biểu đồ Pareto top 10 lỗi QC gần nhất",
            "Tạo infographic báo cáo chất lượng QC",
            "Tỷ lệ lỗi QC theo công đoạn",
        ]
    if "/claims" in page or "/prices" in page or "claim" in domain_keys:
        return [
            "Vẽ biểu đồ Pareto các lỗi khiếu nại nhiều nhất",
            "Tạo infographic tình hình khiếu nại & tiền phạt",
            "SKU nào bị claim nhiều nhất?",
        ]
    return [
        "Tạo infographic tổng quan nhà máy hôm nay",
        "Vẽ biểu đồ Pareto top 10 lỗi QC gần nhất",
        "Đơn hàng nào đang ưu tiên?",
        "Máy móc nào sắp đến hạn bảo trì?",
    ]


class ChatbotOrchestrator:
    def _load_recent_history(self, db: Session, user_id: Optional[int], session_id: str, fallback_history: List[Dict]) -> List[Dict[str, str]]:
        if db is not None and user_id is not None:
            try:
                from modules.chatbot.models.chatbot_history import ChatbotHistory
                rows = (
                    db.query(ChatbotHistory)
                    .filter(ChatbotHistory.account_id == user_id, ChatbotHistory.session_id == session_id)
                    .order_by(ChatbotHistory.created_at.desc())
                    .limit(12)
                    .all()
                )
                rows.reverse()
                if rows:
                    return [
                        {"role": r.role if r.role in ("user", "assistant") else "assistant", "content": r.content or ""}
                        for r in rows
                    ]
            except Exception as e:
                logger.error(f"[Orchestrator] Lỗi tải lịch sử DB: {e}")
        return fallback_history[-10:] if fallback_history else []

    def _save_message(
        self,
        db: Session,
        user_id: Optional[int],
        session_id: str,
        session_title: Optional[str],
        role: str,
        content: str,
        items: List[Dict] = None,
        suggestions: List[str] = None,
        context: Dict = None,
        charts: List[Dict] = None,
        infographics: List[Dict] = None,
    ) -> Optional[str]:
        if db is None or user_id is None:
            return session_title
        try:
            from modules.chatbot.models.chatbot_history import ChatbotHistory

            title = session_title
            if not title:
                existing = (
                    db.query(ChatbotHistory)
                    .filter(ChatbotHistory.account_id == user_id, ChatbotHistory.session_id == session_id)
                    .first()
                )
                if existing and existing.session_title:
                    title = existing.session_title
                elif role == "user":
                    title = content[:55] + ("..." if len(content) > 55 else "")

            ctx_to_save = dict(context or {})
            if charts:
                ctx_to_save["_charts"] = charts
            if infographics:
                ctx_to_save["_infographics"] = infographics

            msg = ChatbotHistory(
                account_id=user_id,
                session_id=session_id,
                session_title=title,
                role=role,
                content=content,
                items_json=json.dumps(items or [], ensure_ascii=False),
                suggestions_json=json.dumps(suggestions or [], ensure_ascii=False),
                context_json=json.dumps(ctx_to_save, ensure_ascii=False),
            )
            db.add(msg)
            db.commit()
            return title
        except Exception as e:
            try:
                db.rollback()
            except Exception:
                pass
            logger.error(f"[Orchestrator] Lỗi lưu tin nhắn vào DB: {e}")
            return session_title

    def _build_greeting_response(self, user_ctx: Dict[str, Any], current_page: str, allowed_domains: List[str]) -> Dict[str, Any]:
        full_name = user_ctx.get("full_name") or "bạn"
        domain_titles = [ALL_DOMAINS[k].title.split(" (")[0] for k in allowed_domains if k in ALL_DOMAINS]
        domains_str = ", ".join(domain_titles[:6]) + ("..." if len(domain_titles) > 6 else "")
        health = llm_gateway.get_health_status()

        extra_note = ""
        if health.get("cookie_expired") and not health.get("healthy"):
            if user_ctx.get("is_admin"):
                extra_note = "\n\n> ⚠️ **Lưu ý Quản trị viên**: Cookie của dịch vụ Gemini Web Proxy đang hết hạn. Bạn có thể bấm nút **Cập nhật Cookie** ngay trên thanh tiêu đề để nạp lại."
            else:
                extra_note = "\n\n> ℹ️ Hiện tại hệ thống AI đang tạm gián đoạn phiên kết nối, vui lòng liên hệ Quản trị viên để cập nhật."

        answer = (
            f"Xin chào **{full_name}**! Tôi là **Trợ lý AI SmartFlow ERP** (chế độ chỉ đọc).\n\n"
            f"Theo phân quyền tài khoản của bạn, tôi có thể hỗ trợ tra cứu, lập bảng, **vẽ biểu đồ**, **tạo Infographic báo cáo** và phân tích chuyên sâu cho các phân hệ: **{domains_str or 'Hướng dẫn hệ thống'}**.\n\n"
            f"Bạn cần tra cứu hay phân tích thông tin gì hôm nay?{extra_note}"
        )
        return {
            "answer": answer,
            "intent": "greeting",
            "items": [],
            "charts": [],
            "infographics": [],
            "suggestions": _get_context_suggestions(allowed_domains[:2], current_page),
            "domains": [],
            "provider": "fast_path",
            "error_code": "cookie_expired" if (health.get("cookie_expired") and not health.get("healthy")) else None,
            "sql_queries": [],
        }

    def chat(
        self,
        message: str,
        db: Session,
        current_user: Any = None,
        context: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, Any]]] = None,
        session_id: str = "default",
    ) -> Dict[str, Any]:
        result = None
        for event in self.stream_chat(
            message=message,
            db=db,
            current_user=current_user,
            context=context,
            history=history,
            session_id=session_id,
        ):
            if event.get("type") == "done":
                result = event.get("payload")
        return result or {
            "answer": "Không nhận được phản hồi từ hệ thống AI.",
            "intent": "error",
            "items": [],
            "charts": [],
            "infographics": [],
            "suggestions": [],
            "context": context or {},
        }

    def stream_chat(
        self,
        message: str,
        db: Session,
        current_user: Any = None,
        context: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, Any]]] = None,
        session_id: str = "default",
    ) -> Generator[Dict[str, Any], None, None]:
        """Generator phát sự kiện SSE: status -> token -> done."""
        ctx = {k: v for k, v in (context or {}).items() if not str(k).startswith("_")}
        current_page = str(ctx.get("current_page") or "")
        user_id = getattr(current_user, "id", None) if current_user else None

        # 1. Tải lịch sử & lưu câu hỏi người dùng
        active_history = self._load_recent_history(db, user_id, session_id, history or [])
        session_title = self._save_message(db, user_id, session_id, None, "user", message, context=ctx)

        # 2. Phân giải quyền ACL
        yield {"type": "status", "message": "Đang xác thực phân quyền dữ liệu..."}
        allowed_domains = get_allowed_domains(current_user, db, ALL_DOMAINS) if current_user else list(ALL_DOMAINS.keys())
        user_ctx = build_user_context_summary(current_user, db, allowed_domains)

        # 3. Fast-Path cho lời chào đơn giản
        if GREETING_PATTERNS.match(message.strip()):
            res = self._build_greeting_response(user_ctx, current_page, allowed_domains)
            self._save_message(
                db, user_id, session_id, session_title, "assistant",
                res["answer"], items=[], suggestions=res["suggestions"], context=ctx,
            )
            yield {"type": "token", "content": res["answer"]}
            yield {"type": "done", "payload": {**res, "context": ctx, "matched_count": 0}}
            return

        # 4. Định tuyến Domain (Smart Router)
        selected_domains = route_domains(message, current_page=current_page, allowed_domains=allowed_domains, max_domains=3)
        if not selected_domains:
            deny_msg = (
                "Tài khoản của bạn hiện chưa được cấp quyền xem dữ liệu cho phân hệ này. "
                "Vui lòng liên hệ Quản trị viên để được cấp quyền đọc tương ứng."
            )
            self._save_message(db, user_id, session_id, session_title, "assistant", deny_msg, context=ctx)
            yield {"type": "token", "content": deny_msg}
            yield {
                "type": "done",
                "payload": {
                    "answer": deny_msg, "intent": "acl_denied",
                    "items": [], "charts": [], "infographics": [],
                    "suggestions": [], "context": ctx, "matched_count": 0,
                },
            }
            return

        domain_names = ", ".join(ALL_DOMAINS[d].title.split(" (")[0] for d in selected_domains if d in ALL_DOMAINS)
        yield {"type": "status", "message": f"Đang phân tích câu hỏi trên phân hệ: {domain_names}..."}

        # 5. Xây dựng System Prompt động chỉ chứa Schema của các Domain được chọn
        allowed_tables = get_allowed_tables_for_domains(selected_domains)
        schema_prompt = build_dynamic_schema_prompt(selected_domains)

        user_meta_prompt = (
            f"\n\n=== NGỮ CẢNH PHIÊN LÀM VIỆC ===\n"
            f"- Người dùng: {user_ctx.get('full_name')} (username: {user_ctx.get('username')}, mã NV: {user_ctx.get('employee_id') or 'N/A'})\n"
            f"- Trang Web hiện tại: {current_page or '/'}\n"
            f"- Thời gian máy chủ: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        )
        full_system_prompt = BASE_SYSTEM_PROMPT + "\n\n" + schema_prompt + user_meta_prompt

        messages: List[Dict[str, Any]] = [{"role": "system", "content": full_system_prompt}]
        for h in active_history[-10:]:
            if h.get("content"):
                messages.append({"role": h["role"], "content": h["content"][:1500]})

        # Chuẩn hóa câu hỏi (tránh từ 'vẽ' khiến Gemini Web hiểu nhầm tạo ảnh)
        llm_user_msg = preprocess_user_query(message)
        messages.append({"role": "user", "content": llm_user_msg})

        tools_schema = _build_tools_schema()
        captured_raw_items: List[Dict[str, Any]] = []
        captured_charts: List[Dict[str, Any]] = []
        captured_infographics: List[Dict[str, Any]] = []
        executed_queries: List[str] = []
        provider_used = ""
        model_used = ""
        final_answer = ""
        error_code = None
        did_retry_refusal = False

        # 6. Agent Loop (Tối đa 4 vòng gọi Tool: SQL -> Fallback kỳ gần nhất -> create_chart/infographic -> Trả lời)
        MAX_ROUNDS = 4
        for round_idx in range(MAX_ROUNDS):
            llm_res = llm_gateway.chat(messages=messages, tools=tools_schema, temperature=0.15)
            provider_used = llm_res.provider or provider_used
            model_used = llm_res.model or model_used

            if llm_res.error:
                error_code = llm_res.error_code
                if error_code == "cookie_expired":
                    if user_ctx.get("is_admin"):
                        final_answer = (
                            "⚠️ **Cookie Gemini Web đã hết hạn hoặc không hợp lệ.**\n\n"
                            "Vui lòng bấm nút **Cập nhật Cookie** ở góc trên khung chat để nạp Cookie mới."
                        )
                    else:
                        final_answer = (
                            "Trợ lý AI hiện đang tạm gián đoạn do phiên kết nối AI đã hết hạn. "
                            "Vui lòng liên hệ Quản trị viên để cập nhật lại."
                        )
                elif error_code == "unconfigured":
                    final_answer = llm_res.error
                else:
                    final_answer = f"Hiện tại Trợ lý AI gặp sự cố kết nối ({llm_res.error}). Vui lòng thử lại sau."
                break

            if not llm_res.tool_calls:
                cleaned_text, inline_charts = sanitize_llm_response(llm_res.content)
                # Nếu LLM ảo giác báo "tool không khả dụng" dù chưa chạy SQL nào -> ép retry 1 lần!
                if not executed_queries and not did_retry_refusal and is_tool_refusal_hallucination(cleaned_text):
                    did_retry_refusal = True
                    yield {"type": "status", "message": "Đang kết nối lại công cụ truy vấn dữ liệu..."}
                    messages.append({"role": "assistant", "content": cleaned_text})
                    messages.append({
                        "role": "user",
                        "content": (
                            "Công cụ `execute_safe_sql`, `create_chart` và `create_infographic` ĐANG SẴN SÀNG trong phiên này. "
                            "Hãy gọi ngay `execute_safe_sql` để truy vấn dữ liệu thực tế từ SQL Server (nếu tháng hiện tại chưa có dữ liệu thì lấy tháng gần nhất có dữ liệu)."
                        ),
                    })
                    continue

                if inline_charts:
                    captured_charts.extend(inline_charts)
                final_answer = cleaned_text
                break

            # Ghi lại assistant message có tool_calls
            messages.append({
                "role": "assistant",
                "content": llm_res.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.name,
                            "arguments": json.dumps(tc.arguments, ensure_ascii=False),
                        },
                    }
                    for tc in llm_res.tool_calls
                ],
            })

            for tc in llm_res.tool_calls[:4]:
                if tc.name == "execute_safe_sql":
                    yield {"type": "status", "message": f"Đang truy vấn dữ liệu ({domain_names})..."}
                    sql_str = tc.arguments.get("query") or tc.arguments.get("sql") or ""
                    tool_output = execute_safe_sql(
                        raw_query=sql_str,
                        db=db,
                        allowed_tables=allowed_tables,
                        captured_items=captured_raw_items,
                        executed_queries=executed_queries,
                    )
                elif tc.name == "get_erp_overview":
                    yield {"type": "status", "message": "Đang tổng hợp chỉ số toàn hệ thống..."}
                    tool_output = _get_erp_overview_tool(db, allowed_domains)
                elif tc.name == "create_chart":
                    yield {"type": "status", "message": "Đang dựng biểu đồ tương tác..."}
                    spec = build_chart_spec(
                        chart_type=tc.arguments.get("chart_type", "bar"),
                        title=tc.arguments.get("title", "Biểu đồ thống kê"),
                        data=tc.arguments.get("data", []),
                        unit=tc.arguments.get("unit", ""),
                        subtitle=tc.arguments.get("subtitle", ""),
                    )
                    if spec:
                        captured_charts.append(spec)
                        tool_output = json.dumps({
                            "success": True,
                            "message": f"Đã tạo biểu đồ '{spec['title']}' ({spec['type']}) với {len(spec['data'])} hạng mục.",
                            "highlights": spec["highlights"],
                        }, ensure_ascii=False)
                    else:
                        tool_output = json.dumps({"success": False, "error": "Dữ liệu biểu đồ không hợp lệ hoặc rỗng."}, ensure_ascii=False)
                elif tc.name == "create_infographic":
                    yield {"type": "status", "message": "Đang thiết kế Poster Infographic..."}
                    info_spec = build_infographic_spec(
                        title=tc.arguments.get("title", "Infographic Báo cáo"),
                        subtitle=tc.arguments.get("subtitle", ""),
                        period=tc.arguments.get("period", ""),
                        badge=tc.arguments.get("badge", "BÁO CÁO ĐIỀU HÀNH"),
                        kpis=tc.arguments.get("kpis", []),
                        ranking_title=tc.arguments.get("ranking_title", "Top hạng mục nổi bật"),
                        ranking_items=tc.arguments.get("ranking_items", []),
                        unit=tc.arguments.get("unit", ""),
                        highlights=tc.arguments.get("highlights", []),
                        recommendations=tc.arguments.get("recommendations", []),
                    )
                    captured_infographics.append(info_spec)
                    tool_output = json.dumps({
                        "success": True,
                        "message": f"Đã dựng Poster Infographic '{info_spec['title']}' thành công. Hãy viết phần tóm tắt/phân tích ngắn gọn đi kèm.",
                    }, ensure_ascii=False)
                elif tc.name == "get_current_datetime":
                    tool_output = json.dumps({"datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S")})
                else:
                    tool_output = json.dumps({"error": f"Công cụ '{tc.name}' không tồn tại."})

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": tc.name,
                    "content": tool_output,
                })

        # Nếu hết MAX_ROUNDS vẫn chưa có văn bản tổng hợp -> gọi 1 lượt final không kèm tool
        if not final_answer and not error_code:
            yield {"type": "status", "message": "Đang hoàn thiện phân tích & đánh giá..."}
            final_res = llm_gateway.chat(messages=messages, tools=None, temperature=0.15)
            cleaned_final, inline_charts = sanitize_llm_response(final_res.content or final_res.error or "")
            if inline_charts:
                captured_charts.extend(inline_charts)
            final_answer = cleaned_final or "Đã hoàn tất tổng hợp dữ liệu."
            provider_used = final_res.provider or provider_used

        cards = _normalize_entity_cards(captured_raw_items, db)
        suggestions = _get_context_suggestions(selected_domains, current_page) if not error_code else ["Thử lại"]

        self._save_message(
            db, user_id, session_id, session_title, "assistant",
            final_answer,
            items=cards,
            suggestions=suggestions,
            context=ctx,
            charts=captured_charts,
            infographics=captured_infographics,
        )

        # Phát nội dung theo từng đoạn nhỏ để tạo hiệu ứng streaming mượt trên Web
        chunk_size = 70
        for i in range(0, len(final_answer), chunk_size):
            yield {"type": "token", "content": final_answer[i : i + chunk_size]}

        yield {
            "type": "done",
            "payload": {
                "answer": final_answer,
                "intent": "error" if error_code else "ai_agent",
                "error_code": error_code,
                "matched_count": len(cards),
                "items": cards,
                "charts": captured_charts,
                "infographics": captured_infographics,
                "suggestions": suggestions,
                "context": ctx,
                "domains": selected_domains,
                "provider": provider_used,
                "model": model_used,
                "sql_queries": executed_queries,
            },
        }


chatbot_orchestrator = ChatbotOrchestrator()
