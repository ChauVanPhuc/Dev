# -*- coding: utf-8 -*-
"""
Zero-Trust Read-Only SQL Sandbox for SmartFlow ChatBot v2.
- Chỉ cho phép 1 câu lệnh SELECT hoặc WITH ... SELECT.
- Chặn toàn bộ từ khóa ghi/DDL/DCL/stored-proc/comment/multi-statement.
- Chặn bảng cấm (lpn_zalo_configs...) và cột nhạy cảm (hashed_password, token, secret_key...).
- Kiểm tra Table Whitelist theo các Domain user được cấp quyền.
- Tự động giới hạn TOP 200 nếu query trả danh sách, cắt dữ liệu nặng trước khi đưa lại cho LLM.
- Self-healing nhẹ nhàng cho các lỗi cú pháp T-SQL phổ biến (LIMIT -> TOP, || -> +).
"""
import json
import logging
import re
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger("chatbot.sql_sandbox")

# Các bảng tuyệt đối không bao giờ cho AI truy vấn
FORBIDDEN_TABLES: Set[str] = {
    "lpn_zalo_configs",
    "sysusers",
    "syslogins",
    "sysprocesses",
    "sysobjects",
    "information_schema",
}

# Các cột tuyệt đối không được xuất ra khỏi DB
FORBIDDEN_COLUMNS: Set[str] = {
    "hashed_password",
    "password",
    "password_hash",
    "secret_key",
    "fcm_token",
    "token",
    "refresh_token",
    "api_key",
    "session_cookies",
    "imei",
    "digital_hash",
    "signature_data",
    "screen_permissions",
}

# Các cột text rất dài chỉ giữ cho UI card (nếu cần), loại khỏi payload gửi LLM để tiết kiệm token
HEAVY_COLUMNS: Set[str] = {
    "image_paths",
    "image_captions",
    "images_json",
    "images",
    "data_json",
    "diagram_data",
    "content_html",
    "sheet_data",
    "payload_json",
    "selected_orders_json",
    "causes_json",
    "corrective_actions_json",
    "preventive_plans_json",
    "evaluations_json",
    "criteria_evaluation_json",
    "raw_ocr_text",
}

FORBIDDEN_KEYWORDS_REGEX = [
    r"\bINSERT\b",
    r"\bUPDATE\b",
    r"\bDELETE\b",
    r"\bDROP\b",
    r"\bALTER\b",
    r"\bCREATE\b",
    r"\bTRUNCATE\b",
    r"\bRENAME\b",
    r"\bMERGE\b",
    r"\bREPLACE\b",
    r"\bEXEC\b",
    r"\bEXECUTE\b",
    r"\bGRANT\b",
    r"\bREVOKE\b",
    r"\bDENY\b",
    r"\bWAITFOR\b",
    r"\bOPENROWSET\b",
    r"\bOPENDATASOURCE\b",
    r"\bBULK\b",
    r"\bSHUTDOWN\b",
    r"\bBACKUP\b",
    r"\bRESTORE\b",
    r"\bXP_\w+",
    r"\bSP_\w+",
    r"\bINTO\s+[#\w\.\[\]]+",  # SELECT ... INTO
    r"--",
    r"/\*",
    r"\*/",
    r";",
]

MAX_DB_ROWS = 200
AI_CONTEXT_ROW_LIMIT = 30


def _self_heal_tsql(query: str) -> str:
    """Chuẩn hóa nhẹ cú pháp T-SQL nếu LLM lỡ dùng cú pháp SQLite/MySQL/Postgres."""
    q = query.strip()
    # Bỏ dấu ; ở cuối câu nếu có (trước khi check multi-statement)
    q = q.rstrip(";").strip()

    # Bỏ ngoặc vuông quanh tên bảng/cột đơn giản
    q = re.sub(r"\[(\w+)\]", r"\1", q)

    # Chuyển LIMIT N ở cuối thành SELECT TOP N
    limit_match = re.search(r"\bLIMIT\s+(\d+)\s*$", q, flags=re.IGNORECASE)
    if limit_match:
        limit_num = min(int(limit_match.group(1)), MAX_DB_ROWS)
        q = re.sub(r"\bLIMIT\s+\d+\s*$", "", q, flags=re.IGNORECASE).strip()
        if not re.search(r"\bSELECT\s+(?:DISTINCT\s+)?TOP\b", q, flags=re.IGNORECASE):
            q = re.sub(
                r"^(\s*SELECT\s+(?:DISTINCT\s+)?)",
                rf"\1TOP {limit_num} ",
                q,
                count=1,
                flags=re.IGNORECASE,
            )

    # Chuyển nối chuỗi || thành +
    if "||" in q:
        q = q.replace("||", "+")

    # Chuẩn hóa từ khóa lỗi phổ biến trong customer_claims / client_defects
    q = q.replace("nứt tét", "nứt").replace("móp méo", "móp")

    return q


def _extract_referenced_tables(query: str) -> Set[str]:
    """Trích xuất tên các bảng sau FROM và JOIN."""
    tables: Set[str] = set()
    # Bỏ các chuỗi literal trong dấu nháy đơn để không bắt nhầm
    no_strings = re.sub(r"N?'(?:''|[^'])*'", "''", query)
    for match in re.finditer(
        r"\b(?:FROM|JOIN)\s+(?:dbo\.)?([a-zA-Z_][a-zA-Z0-9_]*)",
        no_strings,
        flags=re.IGNORECASE,
    ):
        tbl = match.group(1).lower()
        # Bỏ qua tên CTE nếu query dùng WITH <cte> AS (...)
        tables.add(tbl)

    # Loại bỏ tên CTE được định nghĩa trong mệnh đề WITH
    cte_names = set(
        m.group(1).lower()
        for m in re.finditer(r"\b(?:WITH|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(", no_strings, flags=re.IGNORECASE)
    )
    return tables - cte_names


def _enforce_row_cap(query: str, max_rows: int = MAX_DB_ROWS) -> str:
    """
    Tự động thêm TOP <max_rows> cho câu SELECT trả danh sách (không có TOP, không phải aggregate thuần).
    """
    upper = query.lstrip().upper()
    if not upper.startswith("SELECT"):
        return query
    if re.search(r"^\s*SELECT\s+(?:DISTINCT\s+)?TOP\b", query, flags=re.IGNORECASE):
        return query
    # Nếu là câu aggregate thuần không có GROUP BY (VD: SELECT COUNT(*), SUM(...)), không cần TOP
    if re.search(r"^\s*SELECT\s+(?:COUNT|SUM|AVG|MIN|MAX)\s*\(", query, flags=re.IGNORECASE) and "GROUP BY" not in upper:
        return query

    return re.sub(
        r"^(\s*SELECT\s+(?:DISTINCT\s+)?)",
        rf"\1TOP {max_rows} ",
        query,
        count=1,
        flags=re.IGNORECASE,
    )


def validate_sql(
    raw_query: str,
    allowed_tables: Optional[Set[str]] = None,
) -> Tuple[bool, str, str]:
    """
    Kiểm tra an toàn câu lệnh SQL.
    Trả về (is_valid, cleaned_query_or_empty, error_message_or_empty).
    """
    if not raw_query or not raw_query.strip():
        return False, "", "Câu lệnh SQL rỗng."

    cleaned = _self_heal_tsql(raw_query)

    # 1. Phải bắt đầu bằng SELECT hoặc WITH
    upper_start = cleaned.lstrip().upper()
    if not (upper_start.startswith("SELECT ") or upper_start.startswith("SELECT\n") or upper_start.startswith("WITH ")):
        return False, "", "Lỗi bảo mật: Chỉ cho phép câu lệnh SELECT (chỉ đọc)."

    # 2. Chặn toàn bộ từ khóa/ký tự nguy hiểm
    no_strings = re.sub(r"N?'(?:''|[^'])*'", "''", cleaned)
    for pat in FORBIDDEN_KEYWORDS_REGEX:
        if re.search(pat, no_strings, flags=re.IGNORECASE):
            return False, "", "Lỗi bảo mật: Câu lệnh chứa từ khóa hoặc ký tự không được phép trong chế độ chỉ đọc."

    # 3. Chặn cột nhạy cảm được nhắc trực tiếp trong SQL
    lower_no_str = no_strings.lower()
    for col in FORBIDDEN_COLUMNS:
        if re.search(rf"\b{re.escape(col)}\b", lower_no_str):
            return False, "", f"Lỗi bảo mật: Không được phép truy cập cột nhạy cảm '{col}'."

    # 4. Kiểm tra danh sách bảng tham chiếu
    ref_tables = _extract_referenced_tables(cleaned)
    if not ref_tables:
        return False, "", "Không xác định được bảng dữ liệu trong câu truy vấn."

    for tbl in ref_tables:
        if tbl in FORBIDDEN_TABLES or tbl.startswith("sys"):
            return False, "", f"Lỗi bảo mật: Bảng '{tbl}' nằm trong danh sách cấm truy cập."

    if allowed_tables is not None:
        allowed_lower = {t.lower() for t in allowed_tables}
        unauthorized = [t for t in ref_tables if t not in allowed_lower]
        if unauthorized:
            return (
                False,
                "",
                f"Bạn không có quyền truy vấn bảng {', '.join(unauthorized)} hoặc bảng không thuộc phân hệ được phép.",
            )

    # 5. Áp đặt giới hạn số dòng an toàn
    safe_query = _enforce_row_cap(cleaned, MAX_DB_ROWS)
    return True, safe_query, ""


def _serialize_val(val: Any) -> Any:
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(val, date):
        return val.strftime("%Y-%m-%d")
    if isinstance(val, Decimal):
        return float(val)
    return val


def execute_safe_sql(
    raw_query: str,
    db: Session,
    allowed_tables: Optional[Set[str]] = None,
    captured_items: Optional[List[Dict[str, Any]]] = None,
    executed_queries: Optional[List[str]] = None,
) -> str:
    """
    Thực thi câu lệnh SQL chỉ đọc an toàn trên SQL Server và trả về chuỗi JSON cho LLM.
    Tự động ẩn cột nhạy cảm ở kết quả trả về (defense-in-depth khi LLM dùng SELECT *).
    """
    if db is None:
        return json.dumps({"error": "Không có kết nối cơ sở dữ liệu."}, ensure_ascii=False)

    is_valid, safe_query, err_msg = validate_sql(raw_query, allowed_tables=allowed_tables)
    if not is_valid:
        logger.warning(f"[SQLSandbox] Chặn query: {err_msg} | Raw: {raw_query[:200]}")
        return json.dumps({"error": err_msg}, ensure_ascii=False)

    if executed_queries is not None:
        executed_queries.append(safe_query)

    logger.info(f"[SQLSandbox] Executing: {safe_query}")

    try:
        # Chạy ở mức READ UNCOMMITTED để tránh lock bảng sản xuất
        try:
            db.execute(text("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED"))
        except Exception:
            pass

        result = db.execute(text(safe_query))
        if not result.returns_rows:
            return json.dumps({"total_rows": 0, "data": [], "message": "Truy vấn không trả về dữ liệu."}, ensure_ascii=False)

        keys = list(result.keys())
        rows = result.fetchmany(MAX_DB_ROWS + 1)
        truncated_at_db = len(rows) > MAX_DB_ROWS
        if truncated_at_db:
            rows = rows[:MAX_DB_ROWS]

        full_data: List[Dict[str, Any]] = []
        safe_keys = [k for k in keys if k.lower() not in FORBIDDEN_COLUMNS]

        for row in rows:
            row_dict: Dict[str, Any] = {}
            for idx, col in enumerate(keys):
                if col.lower() in FORBIDDEN_COLUMNS:
                    continue
                row_dict[col] = _serialize_val(row[idx])
            full_data.append(row_dict)

        # Capture entity cards cho UI (Claim, Order/LSX, CAPA, Warehouse, ISO, Machine...)
        if captured_items is not None and full_data:
            first = full_data[0]
            if any(k in first for k in ("claim_code", "order_code", "voucher_no", "ticket_code")):
                # Chỉ giữ tối đa 20 card để UI không bị nặng
                captured_items.extend(full_data[:20])

        # Cắt dữ liệu gửi lại LLM (tối đa AI_CONTEXT_ROW_LIMIT dòng, bỏ cột nặng)
        trimmed_rows: List[Dict[str, Any]] = []
        for row_dict in full_data[:AI_CONTEXT_ROW_LIMIT]:
            trimmed = {
                k: (v[:400] + "..." if isinstance(v, str) and len(v) > 400 else v)
                for k, v in row_dict.items()
                if k.lower() not in HEAVY_COLUMNS
            }
            trimmed_rows.append(trimmed)

        payload: Dict[str, Any] = {
            "total_rows": len(full_data),
            "truncated_at_db": truncated_at_db,
            "columns": [k for k in safe_keys if k.lower() not in HEAVY_COLUMNS],
            "data": trimmed_rows,
        }
        if len(full_data) > AI_CONTEXT_ROW_LIMIT:
            payload["note"] = (
                f"Trả về {len(full_data)} dòng (chỉ hiển thị {AI_CONTEXT_ROW_LIMIT} dòng đầu cho AI). "
                "Hãy dùng total_rows hoặc câu lệnh GROUP BY/COUNT(*) để thống kê chính xác."
            )
        return json.dumps(payload, ensure_ascii=False)

    except Exception as db_err:
        try:
            db.rollback()
        except Exception:
            pass
        logger.error(f"[SQLSandbox] Lỗi thực thi SQL: {db_err}")
        return json.dumps({"error": f"Lỗi SQL Server: {str(db_err)}"}, ensure_ascii=False)

