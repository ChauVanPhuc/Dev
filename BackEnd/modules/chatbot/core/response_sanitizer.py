# -*- coding: utf-8 -*-
"""
Response Sanitizer & Structured Visualization Builders for SmartFlow ChatBot v2.1.
- Tiền xử lý câu hỏi (tránh từ 'vẽ' làm Gemini Web tắt tool-calling).
- Bóc vỏ JSON tool-bridge bị rò rỉ (`{"content": "..."}`) kể cả khi bị lỗi dấu nháy cuối do thẻ `<FollowUp .../>`.
- Dựng đối tượng `chart` (tính sẵn % tỷ trọng, % tích lũy Pareto 80/20, KPI highlights).
- Dựng đối tượng `infographic` điều hành 5 khối chuẩn tiếng Việt.
"""
import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("chatbot.sanitizer")

VALID_CHART_TYPES = {"pareto", "bar", "horizontal_bar", "line", "area", "pie"}

TOOL_REFUSAL_PATTERNS = [
    r"công cụ truy vấn.*không khả dụng",
    r"execute_safe_sql.*không khả dụng",
    r"không thể truy xuất số liệu.*phiên làm việc",
    r"không có quyền gọi.*công cụ",
    r"tool.*not available",
]


def preprocess_user_query(message: str) -> str:
    """
    Chuyển 'vẽ biểu đồ / vẽ infographic / vẽ đồ thị' -> 'tạo ...' trước khi gửi cho LLM
    để tránh Gemini Web hiểu nhầm sang chế độ tạo hình ảnh (Image Generation) và bỏ qua tool SQL.
    """
    if not message:
        return ""
    text = message
    replacements = [
        (r"\bvẽ\s+(biểu\s*đồ|đồ\s*thị|pareto|chart|infographic|báo\s*cáo)\b", r"tạo \1"),
        (r"\bve\s+(bieu\s*do|do\s*thi|pareto|chart|infographic|bao\s*cao)\b", r"tao \1"),
        (r"\bgiúp\s+tôi\s+vẽ\b", "giúp tôi lập"),
    ]
    for pat, repl in replacements:
        text = re.sub(pat, repl, text, flags=re.IGNORECASE)
    return text


def is_tool_refusal_hallucination(text: str) -> bool:
    """Phát hiện LLM ảo giác từ chối gọi tool dù tool vẫn đang sẵn sàng."""
    if not text:
        return False
    lower = text.lower()
    return any(re.search(pat, lower) for pat in TOOL_REFUSAL_PATTERNS)


def _unescape_json_string_fragment(fragment: str) -> str:
    """Giải mã an toàn chuỗi có escape kiểu JSON (\n, \", \t, \\) ngay cả khi chuỗi bị cắt cụt."""
    s = fragment
    s = s.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\t", "\t")
    s = s.replace('\\"', '"').replace("\\'", "'")
    s = s.replace("\\\\", "\\")
    return s


def unwrap_tool_bridge_content(raw_text: str) -> str:
    """
    Bóc vỏ JSON thô `{"content": "..."}` mà `gemini-web-to-api` đôi khi trả nguyên văn
    khi thẻ `<FollowUp .../>` ở cuối làm hỏng JSON.
    """
    if not raw_text:
        return ""

    text = raw_text.strip()

    # Gỡ fence ```json ... ``` nếu bao toàn bộ phản hồi
    fence_match = re.match(r"^```(?:json)?\s*([\s\S]+?)\s*```$", text, flags=re.IGNORECASE)
    if fence_match and '"content"' in fence_match.group(1)[:40]:
        text = fence_match.group(1).strip()

    if text.startswith("{") and re.match(r'^\{\s*"content"\s*:\s*"', text):
        # Thử parse JSON chuẩn trước
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict) and isinstance(parsed.get("content"), str):
                text = parsed["content"]
        except Exception:
            # Fallback bóc thủ công khi JSON bị lỗi dấu nháy ở cuối (VD: <FollowUp .../>)
            m = re.match(r'^\{\s*"content"\s*:\s*"([\s\S]*)$', text)
            if m:
                inner = m.group(1)
                # Cắt dấu đóng `"}` ở cuối nếu có
                inner = re.sub(r'"\s*\}\s*$', "", inner)
                text = _unescape_json_string_fragment(inner)

    # Xóa các thẻ rác nội bộ rò rỉ từ Gemini Web / proxy
    text = re.sub(r"<FollowUp[\s\S]*?(?:/>|</FollowUp>|$)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<thinking>[\s\S]*?</thinking>", "", text, flags=re.IGNORECASE)

    return text.strip()


def build_chart_spec(
    chart_type: str,
    title: str,
    data: List[Dict[str, Any]],
    unit: str = "",
    subtitle: str = "",
) -> Optional[Dict[str, Any]]:
    """
    Chuẩn hóa & tính toán sẵn dữ liệu biểu đồ (tỷ trọng %, tích lũy Pareto 80/20, KPI highlights).
    """
    ctype = (chart_type or "bar").strip().lower()
    if ctype not in VALID_CHART_TYPES:
        ctype = "bar"

    cleaned_rows: List[Dict[str, Any]] = []
    for row in data or []:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name") or row.get("label") or "").strip()
        raw_val = row.get("value")
        if raw_val is None:
            raw_val = row.get("count") or row.get("total")
        try:
            val = float(raw_val)
        except (TypeError, ValueError):
            continue
        if not name or val < 0:
            continue
        # Giữ số nguyên nếu là số tròn
        num_val = int(val) if val.is_integer() else round(val, 2)
        cleaned_rows.append({"name": name, "value": num_val})

    if not cleaned_rows:
        return None

    if ctype == "pareto":
        cleaned_rows.sort(key=lambda x: x["value"], reverse=True)

    total = sum(r["value"] for r in cleaned_rows)
    total_display = int(total) if isinstance(total, float) and total.is_integer() else (round(total, 2) if isinstance(total, float) else total)

    running = 0.0
    enriched: List[Dict[str, Any]] = []
    for r in cleaned_rows:
        pct = round((r["value"] / total) * 100, 1) if total > 0 else 0.0
        running += r["value"]
        cum = round((running / total) * 100, 1) if total > 0 else 0.0
        enriched.append({
            "name": r["name"],
            "value": r["value"],
            "percent": pct,
            "cumulative": cum,
        })

    top_item = max(enriched, key=lambda x: x["value"])
    top3_sorted = sorted(enriched, key=lambda x: x["value"], reverse=True)[:3]
    top3_sum = sum(x["value"] for x in top3_sorted)
    top3_pct = round((top3_sum / total) * 100, 1) if total > 0 else 0.0

    return {
        "type": ctype,
        "title": (title or "Biểu đồ thống kê").strip(),
        "subtitle": (subtitle or "").strip(),
        "unit": (unit or "").strip(),
        "data": enriched,
        "highlights": {
            "total": total_display,
            "count": len(enriched),
            "top_name": top_item["name"],
            "top_value": top_item["value"],
            "top_percent": top_item["percent"],
            "top3_percent": top3_pct,
        },
    }


def build_infographic_spec(
    title: str,
    subtitle: str = "",
    period: str = "",
    badge: str = "BÁO CÁO ĐIỀU HÀNH",
    kpis: Optional[List[Dict[str, Any]]] = None,
    ranking_title: str = "",
    ranking_items: Optional[List[Dict[str, Any]]] = None,
    unit: str = "",
    highlights: Optional[List[str]] = None,
    recommendations: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Chuẩn hóa đối tượng Poster Infographic 5 khối từ số liệu thật."""
    clean_kpis: List[Dict[str, Any]] = []
    for k in (kpis or [])[:4]:
        if not isinstance(k, dict):
            continue
        status = str(k.get("status") or "neutral").lower()
        if status not in ("good", "warning", "danger", "neutral"):
            status = "neutral"
        clean_kpis.append({
            "label": str(k.get("label") or "").strip(),
            "value": str(k.get("value") if k.get("value") is not None else "0").strip(),
            "subtext": str(k.get("subtext") or "").strip(),
            "status": status,
        })

    clean_ranking: List[Dict[str, Any]] = []
    raw_rank = ranking_items or []
    vals = []
    for r in raw_rank[:10]:
        if not isinstance(r, dict):
            continue
        name = str(r.get("name") or r.get("label") or "").strip()
        try:
            v = float(r.get("value", 0))
        except (TypeError, ValueError):
            continue
        if name:
            vals.append((name, int(v) if v.is_integer() else round(v, 2)))

    total_rank = sum(v for _, v in vals)
    max_rank = max((v for _, v in vals), default=1) or 1
    for name, v in vals:
        clean_ranking.append({
            "name": name,
            "value": v,
            "percent": round((v / total_rank) * 100, 1) if total_rank > 0 else 0.0,
            "bar_width": round((v / max_rank) * 100, 1),
        })

    return {
        "title": (title or "Infographic Tổng hợp SmartFlow ERP").strip(),
        "subtitle": (subtitle or "").strip(),
        "period": (period or "").strip(),
        "badge": (badge or "BÁO CÁO ĐIỀU HÀNH").strip().upper(),
        "unit": (unit or "").strip(),
        "kpis": clean_kpis,
        "ranking_title": (ranking_title or "Top hạng mục nổi bật").strip(),
        "ranking_items": clean_ranking,
        "highlights": [str(h).strip() for h in (highlights or []) if str(h).strip()][:5],
        "recommendations": [str(r).strip() for r in (recommendations or []) if str(r).strip()][:5],
        "generated_at": datetime.now().strftime("%d/%m/%Y %H:%M"),
    }


def sanitize_llm_response(raw_text: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Làm sạch toàn diện văn bản trả lời từ LLM:
    1. Bóc vỏ JSON `{"content": ...}` nếu bị rò rỉ.
    2. Xóa thẻ `<FollowUp .../>` và thẻ rác.
    3. Tự động bóc tách mọi thẻ `<chart type="..." title="...">...</chart>` còn sót trong text
       thành mảng `extracted_charts` chuẩn để Frontend render nhất quán.
    """
    text = unwrap_tool_bridge_content(raw_text)
    extracted_charts: List[Dict[str, Any]] = []

    chart_pattern = re.compile(
        r'<chart\s+type=["\']([^"\']+)["\']\s+title=["\']([^"\']+)["\'](?:\s+unit=["\']([^"\']*)["\'])?\s*>([\s\S]*?)</chart>',
        re.IGNORECASE,
    )

    def _replace_chart(match):
        c_type = match.group(1)
        c_title = match.group(2)
        c_unit = match.group(3) or ""
        raw_json = match.group(4).strip()
        try:
            data = json.loads(raw_json)
            spec = build_chart_spec(c_type, c_title, data, unit=c_unit)
            if spec:
                extracted_charts.append(spec)
                return ""  # Đã chuyển sang charts[], xóa thẻ thô khỏi text
        except Exception as e:
            logger.warning(f"[Sanitizer] Không parse được thẻ <chart> inline: {e}")
        return match.group(0)

    text = chart_pattern.sub(_replace_chart, text)
    # Dọn các dòng trống thừa liên tiếp (> 2 dòng trống)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    return text, extracted_charts

