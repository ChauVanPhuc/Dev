# -*- coding: utf-8 -*-
import re
import json
import hashlib
from datetime import datetime, date
from typing import Dict, Any, List, Tuple, Optional

HEADER_FIELD_KEYS = {
    "container_number": ["container number", "containernumber", "container_number", "so container", "container #"],
    "factory": ["factory", "nha may", "nhà máy"],
    "date_loading_raw": ["date loading", "dateloading", "date_loading", "ngay loading"],
    "timestamp_raw": ["timestamp", "time stamp", "thoi gian"],
    "operator_name": ["operator name", "operatorname", "operator_name", "nguoi thao tac", "operator"]
}

ITEM_FIELD_REGEX = re.compile(r"^(Batch|LPN|SKU|Picture)\s+(.+)$", re.IGNORECASE)

def normalize_date_for_hash(date_str: Any) -> str:
    """
    Chuẩn hóa ngày thành chuỗi YYYY-MM-DD cố định bất kể đầu vào là '8/22/2026', '08/22/2026', '2026-08-22', date obj,...
    """
    if not date_str:
        return ""
    if isinstance(date_str, (date, datetime)):
        return date_str.strftime("%Y-%m-%d")
    parsed_d, _ = parse_date_string(str(date_str))
    if parsed_d:
        return parsed_d.strftime("%Y-%m-%d")
    # Fallback clean string (bỏ các số 0 thừa nếu có dạng m/d/yyyy)
    s = re.sub(r"\s+", "", str(date_str).strip())
    parts = s.split("/")
    if len(parts) == 3 and len(parts[2]) == 4:
        try:
            return f"{int(parts[2]):04d}-{int(parts[0]):02d}-{int(parts[1]):02d}"
        except Exception:
            pass
    return s

def normalize_timestamp_for_hash(ts_str: Any) -> str:
    """
    Chuẩn hóa timestamp thành chuỗi YYYY-MM-DD HH:MM:SS cố định bất kể định dạng đầu vào.
    """
    if not ts_str:
        return ""
    if isinstance(ts_str, datetime):
        return ts_str.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(ts_str, date):
        return ts_str.strftime("%Y-%m-%d 00:00:00")
    _, parsed_dt = parse_date_string(str(ts_str))
    if parsed_dt:
        return parsed_dt.strftime("%Y-%m-%d %H:%M:%S")
    return re.sub(r"\s+", " ", str(ts_str).strip().upper())

def compute_record_fingerprint(container_num: str, factory: str, date_loading: Any, timestamp: Any, operator: str) -> str:
    """
    Tính record_fingerprint để xác định bản ghi nguồn (Record Identity).
    Chuẩn hóa triệt để:
    - container_number không phân biệt khoảng trắng (BSIU 9344540 vs BSIU9344540)
    - date_loading chuẩn hóa thành YYYY-MM-DD (không phân biệt 8/22/2026 vs 08/22/2026)
    - timestamp chuẩn hóa thành YYYY-MM-DD HH:MM:SS
    """
    c_clean = re.sub(r"\s+", "", str(container_num or "").upper())
    f_clean = re.sub(r"\s+", " ", str(factory or "").strip().upper())
    d_clean = normalize_date_for_hash(date_loading)
    t_clean = normalize_timestamp_for_hash(timestamp)
    op_clean = re.sub(r"\s+", " ", str(operator or "").strip().upper())

    raw_str = f"{c_clean}|{f_clean}|{d_clean}|{t_clean}|{op_clean}"
    return hashlib.md5(raw_str.encode('utf-8')).hexdigest()

def compute_content_hash(header_dict: Dict[str, Any], items_list: List[Dict[str, Any]]) -> str:
    """
    Tính content_hash dựa trên dữ liệu text nghiệp vụ chuẩn hóa (Header + Items).
    KHÔNG dùng image URL token để tránh làm đổi hash khi token AppSheet thay đổi.
    """
    c_clean = re.sub(r"\s+", "", str(header_dict.get("container_number") or "").upper())
    f_clean = re.sub(r"\s+", " ", str(header_dict.get("factory") or "").strip().upper())
    d_clean = normalize_date_for_hash(header_dict.get("date_loading") or header_dict.get("date_loading_raw"))
    t_clean = normalize_timestamp_for_hash(header_dict.get("timestamp_val") or header_dict.get("timestamp_raw"))
    op_clean = re.sub(r"\s+", " ", str(header_dict.get("operator_name") or "").strip().upper())

    parts = [c_clean, f_clean, d_clean, t_clean, op_clean]
    
    # Sort items by suffix_key for deterministic hashing
    sorted_items = sorted(items_list, key=lambda x: str(x.get("suffix_key", "")).strip().upper())
    for item in sorted_items:
        s_key = str(item.get("suffix_key") or "").strip().upper()
        b_orig = str(item.get("batch_original") or "").strip().upper()
        lpn = str(item.get("lpn") or "").strip().upper()
        sku = str(item.get("sku") or "").strip().upper()
        parts.append(f"{s_key}:{b_orig}:{lpn}:{sku}")
        
    combined = "||".join(parts)
    return hashlib.md5(combined.encode('utf-8')).hexdigest()

def parse_date_string(date_str: str) -> Tuple[Optional[date], Optional[datetime]]:
    """
    Parse chuỗi date/timestamp thô từ AppSheet thành python date/datetime
    """
    if not date_str:
        return None, None
    clean_str = date_str.strip()
    parsed_d = None
    parsed_dt = None

    # Common formats: MM/DD/YYYY, YYYY-MM-DD, DD/MM/YYYY, with or without time
    date_formats = [
        "%m/%d/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%m/%d/%Y %I:%M:%S %p",
        "%d/%m/%Y %I:%M:%S %p",
        "%m/%d/%Y %H:%M",
        "%d/%m/%Y %H:%M",
        "%m/%d/%Y %I:%M %p",
        "%d/%m/%Y %I:%M %p",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%Y-%m-%d",
        "%Y/%m/%d"
    ]
    for fmt in date_formats:
        try:
            dt = datetime.strptime(clean_str, fmt)
            parsed_d = dt.date()
            parsed_dt = dt
            break
        except ValueError:
            continue
    return parsed_d, parsed_dt

def process_raw_container_data(raw_fields: Dict[str, Any], raw_images_map: Dict[str, List[str]]) -> Dict[str, Any]:
    """
    Phân tích dict các field cào được từ AppSheet:
    - Trích xuất Header fields
    - Gom nhóm Item fields theo suffix_key
    - Xử lý Batch Carry-Forward trong cùng Container
    """
    header = {
        "container_number": "",
        "factory": "",
        "date_loading_raw": "",
        "timestamp_raw": "",
        "operator_name": ""
    }

    item_groups: Dict[str, Dict[str, Any]] = {}
    
    for field_name, value_data in raw_fields.items():
        field_clean = field_name.strip()
        field_lower = field_clean.lower()
        val_str = str(value_data).strip() if value_data is not None else ""

        # 1. Match Header fields
        matched_header = False
        for h_key, aliases in HEADER_FIELD_KEYS.items():
            if any(alias == field_lower for alias in aliases):
                # Clean up if val_str contains field header
                clean_val = val_str
                for alias in aliases:
                    if clean_val.lower().startswith(alias):
                        clean_val = clean_val[len(alias):].strip()
                        break
                header[h_key] = clean_val or val_str
                matched_header = True
                break
        if matched_header:
            continue


        # 2. Match Item fields (Batch / LPN / SKU / Picture)
        match = ITEM_FIELD_REGEX.match(field_clean)
        if match:
            field_type = match.group(1).title()  # Batch, Lpn, Sku, Picture
            raw_suffix = match.group(2).strip()  # e.g., Pallet 1, LPN Pallet 1, Box 1A
            # Chuẩn hóa: loại bỏ tiền tố 'LPN ' nếu có để 'Picture LPN Pallet 1' và 'SKU Pallet 1' dùng chung key 'Pallet 1'
            suffix_key = re.sub(r"^lpn\s+", "", raw_suffix, flags=re.IGNORECASE).strip()
            if not suffix_key:
                suffix_key = raw_suffix

            if suffix_key not in item_groups:
                record_type = "Pallet" if "pallet" in suffix_key.lower() else ("Box" if "box" in suffix_key.lower() else "Item")
                item_groups[suffix_key] = {
                    "record_type": record_type,
                    "suffix_key": suffix_key,
                    "batch_original": None,
                    "lpn": None,
                    "sku": None,
                    "raw_group_key": field_clean,
                    "image_urls": []
                }

            group = item_groups[suffix_key]

            if field_type == "Batch":
                group["batch_original"] = val_str if val_str else None
            elif field_type == "Lpn":
                group["lpn"] = val_str if val_str else None
            elif field_type == "Sku":
                group["sku"] = val_str if val_str else None
            elif field_type == "Picture":
                if val_str.startswith("http") and val_str not in group["image_urls"]:
                    group["image_urls"].append(val_str)

    # 2b. Gắn toàn bộ ảnh từ raw_images_map vào đúng item_groups tương ứng
    for img_field_name, urls in raw_images_map.items():
        if not urls:
            continue
        # Chuẩn hóa field name ảnh: "Picture LPN Pallet 1" -> "Pallet 1", "Picture Box 1A" -> "Box 1A", "Picture 1" -> "Pallet 1"
        clean_img_key = re.sub(r"^(picture|ảnh|image)\s+(lpn\s+)?", "", img_field_name, flags=re.IGNORECASE).strip()
        
        target_group = None
        if clean_img_key in item_groups:
            target_group = item_groups[clean_img_key]
        else:
            # Tìm key gần đúng nhất
            for k, grp in item_groups.items():
                k_l = k.lower().strip()
                c_l = clean_img_key.lower().strip()
                if k_l == c_l or c_l.endswith(k_l) or k_l.endswith(c_l) or (c_l.isdigit() and k_l == f"pallet {c_l}") or (c_l.isdigit() and k_l == f"box {c_l}"):
                    target_group = grp
                    break

        if target_group:
            for u in urls:
                if u and str(u).startswith("http") and u not in target_group["image_urls"]:
                    target_group["image_urls"].append(u)


    # 3. Batch Carry-Forward Logic
    # Sắp xếp các items theo thứ tự xuất hiện
    items_list = list(item_groups.values())
    last_seen_batch = None

    for item in items_list:
        if item["batch_original"]:
            last_seen_batch = item["batch_original"]
            item["batch_resolved"] = item["batch_original"]
        else:
            item["batch_resolved"] = last_seen_batch

    # Parse Dates
    parsed_date, _ = parse_date_string(header["date_loading_raw"])
    _, parsed_dt = parse_date_string(header["timestamp_raw"])

    header["date_loading"] = parsed_date
    header["timestamp_val"] = parsed_dt

    # Fingerprint & Content Hash
    fingerprint = compute_record_fingerprint(
        header["container_number"],
        header["factory"],
        parsed_date or header["date_loading_raw"],
        parsed_dt or header["timestamp_raw"],
        header["operator_name"]
    )

    content_hash = compute_content_hash(header, items_list)

    return {
        "header": {
            "container_number": header["container_number"],
            "factory": header["factory"],
            "date_loading_raw": header["date_loading_raw"],
            "date_loading": parsed_date,
            "timestamp_raw": header["timestamp_raw"],
            "timestamp_val": parsed_dt,
            "operator_name": header["operator_name"],
            "record_fingerprint": fingerprint,
            "content_hash": content_hash
        },
        "items": items_list
    }


def process_api_row_data(row: Dict[str, Any], app_name: str = "", table_name: str = "") -> Dict[str, Any]:
    """
    Xử lý trực tiếp 1 dictionary bản ghi nhận được từ AppSheet API / Network Interception
    """
    raw_fields: Dict[str, Any] = {}
    raw_images_map: Dict[str, List[str]] = {}

    for k, v in row.items():
        if v is None:
            continue
        k_str = str(k).strip()
        v_str = str(v).strip()

        # Bỏ qua các trường metadata nội bộ của AppSheet
        if k_str.startswith("_") and k_str not in ("_RowNumber", "_RowNum"):
            continue

        raw_fields[k_str] = v_str

        # Nếu là trường Picture
        if ITEM_FIELD_REGEX.match(k_str) and k_str.lower().startswith("picture"):
            urls = []
            if isinstance(v, list):
                for item_val in v:
                    iv_str = str(item_val).strip()
                    if iv_str.startswith("http"):
                        urls.append(iv_str)
                    elif app_name and iv_str:
                        urls.append(f"https://www.appsheet.com/template/gettablefileurl?appName={app_name}&tableName={table_name or 'LPN NEW'}&fileName={iv_str}")
            elif v_str.startswith("http"):
                urls.append(v_str)
            elif app_name and v_str and any(v_str.lower().endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.webp', '.gif')) or '/' in v_str:
                urls.append(f"https://www.appsheet.com/template/gettablefileurl?appName={app_name}&tableName={table_name or 'LPN NEW'}&fileName={v_str}")

            if urls:
                raw_images_map[k_str] = urls

    return process_raw_container_data(raw_fields, raw_images_map)


def extract_table_rows(item: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Trích xuất danh sách các dòng dữ liệu từ 1 bảng trong AppSheet NestedDataSets:
    Hỗ trợ cả dạng list of dicts ('Rows') và dạng bảng chuẩn nén ('DataSet' chứa columns và data array).
    """
    if not isinstance(item, dict):
        return []

    # 1. Dạng trực tiếp Rows
    rows = item.get("Rows") or item.get("rows")
    if isinstance(rows, list) and len(rows) > 0:
        return [r for r in rows if isinstance(r, dict)]

    # 2. Dạng DataSet (columns + data)
    ds = item.get("DataSet") or item.get("dataset")
    if ds:
        if isinstance(ds, str):
            try:
                ds = json.loads(ds)
            except Exception:
                ds = None
        if isinstance(ds, dict):
            cols = ds.get("columns", [])
            raw_data = ds.get("data", [])
            if cols and raw_data:
                return [dict(zip(cols, r)) for r in raw_data if isinstance(r, list)]
        elif isinstance(ds, list):
            return [r for r in ds if isinstance(r, dict)]

    # 3. Dạng data / values
    raw_v = item.get("data") or item.get("values")
    if isinstance(raw_v, list):
        return [r for r in raw_v if isinstance(r, dict)]

    return []


def validate_template_api_payload(payload: Any) -> Tuple[bool, str]:
    """
    Validation cổng kiểm duyệt chặt chẽ cho dữ liệu nhận được từ AppSheet Template API:
    - Kiểm tra payload là dict hợp lệ
    - Kiểm tra có chứa dữ liệu bảng (NestedDataSets hoặc RowsList/data)
    - Kiểm tra có bảng Container/LPN hoặc các cột bắt buộc
    - Kiểm tra số lượng dòng hợp lý (> 0)
    """
    if not payload or not isinstance(payload, dict):
        return False, "Payload không phải là JSON dict hợp lệ"

    # Trường hợp 1: Có NestedDataSets
    nested = payload.get("NestedDataSets")
    if nested and isinstance(nested, list) and len(nested) > 0:
        found_cont_table = False
        total_rows = 0
        for item in nested:
            if not isinstance(item, dict):
                continue
            name = str(item.get("Name") or "").upper()
            rows = extract_table_rows(item)
            total_rows += len(rows)
            if any(k in name for k in ("CONTAINER", "LPN", "LOAD", "SHIP", "PALLET")):
                found_cont_table = True
            elif rows and isinstance(rows[0], dict):
                first_keys = [str(k).lower() for k in rows[0].keys()]
                if any("container" in k or "lpn" in k for k in first_keys):
                    found_cont_table = True

        if found_cont_table and total_rows > 0:
            return True, f"Hợp lệ: Tìm thấy {total_rows} bản ghi trong NestedDataSets"
        elif total_rows > 0:
            return True, f"Hợp lệ: Tìm thấy {total_rows} bản ghi trong các bảng NestedDataSets"

    # Trường hợp 2: Có Rows / data ở cấp root
    root_rows = payload.get("Rows") or payload.get("rows") or payload.get("data") or payload.get("values") or payload.get("RowsList")
    if root_rows and isinstance(root_rows, list) and len(root_rows) > 0:
        first_r = root_rows[0]
        if isinstance(first_r, dict):
            first_keys = [str(k).lower() for k in first_r.keys()]
            if any("container" in k or "lpn" in k or "sku" in k for k in first_keys):
                return True, f"Hợp lệ: Tìm thấy {len(root_rows)} bản ghi Container/LPN ở root payload"

    return False, "Payload không chứa cấu trúc bảng Container/LPN hợp lệ"


def process_template_nested_datasets(
    payload: Dict[str, Any],
    app_name: str = "",
    table_name: str = ""
) -> Dict[str, Dict[str, Any]]:
    """
    Phân tích trọn bộ NestedDataSets (CONTAINER_09_05, LPN_11_04, v.v.) thành dictionary các Container:
    Dict[container_number, {"header": {...}, "items": [...]}]
    """
    nested = payload.get("NestedDataSets", [])
    container_rows: List[Dict[str, Any]] = []
    lpn_rows: List[Dict[str, Any]] = []
    other_rows: List[Dict[str, Any]] = []

    # 1. Phân loại các bảng trong NestedDataSets
    if isinstance(nested, list):
        for item in nested:
            if not isinstance(item, dict):
                continue
            name = str(item.get("Name") or "").upper()
            rows = extract_table_rows(item)
            if not rows:
                continue

            if any(k in name for k in ("CONTAINER",)):
                container_rows.extend(rows)
            elif any(k in name for k in ("LPN",)):
                lpn_rows.extend(rows)
            else:
                # Kiểm tra nội dung các dòng để phân loại
                if rows and isinstance(rows[0], dict):
                    keys = [str(k).lower() for k in rows[0].keys()]
                    if any("lpn" in k or "pallet" in k or "box" in k for k in keys):
                        lpn_rows.extend(rows)
                    elif any("container" in k for k in keys):
                        container_rows.extend(rows)
                    else:
                        other_rows.extend(rows)

    # Nếu không có bảng riêng biệt, thử lấy từ root rows
    if not container_rows and not lpn_rows:
        root_rows = payload.get("Rows") or payload.get("rows") or payload.get("data") or payload.get("RowsList") or []
        if isinstance(root_rows, list):
            container_rows.extend(root_rows)

    # 2. Gom nhóm thông tin theo Container Number
    containers_merged: Dict[str, Dict[str, Any]] = {}

    def extract_cont_number(d: Dict[str, Any]) -> str:
        for k, v in d.items():
            k_lower = str(k).lower().strip()
            if k_lower in ("container number", "containernumber", "container_number", "so container", "container #", "container"):
                if v and str(v).strip():
                    return str(v).strip().upper()
        return ""

    # Nạp dữ liệu Header từ container_rows
    for c_row in container_rows:
        if not isinstance(c_row, dict):
            continue
        c_num = extract_cont_number(c_row)
        if not c_num:
            continue
        if c_num not in containers_merged:
            containers_merged[c_num] = {}
        for k, v in c_row.items():
            if v is not None and str(v).strip():
                containers_merged[c_num][k] = v

    # Merge dữ liệu Pallet/Box từ lpn_rows
    for l_row in lpn_rows:
        if not isinstance(l_row, dict):
            continue
        c_num = extract_cont_number(l_row)
        if not c_num:
            continue
        if c_num not in containers_merged:
            containers_merged[c_num] = {}
        for k, v in l_row.items():
            if v is not None and str(v).strip():
                # Nếu là trường Picture và đã có -> gộp
                if str(k).lower().startswith("picture") and k in containers_merged[c_num]:
                    ex = containers_merged[c_num][k]
                    if isinstance(ex, list):
                        if isinstance(v, list):
                            ex.extend([x for x in v if x not in ex])
                        elif v not in ex:
                            ex.append(v)
                    else:
                        containers_merged[c_num][k] = [ex, v] if ex != v else ex
                else:
                    containers_merged[c_num][k] = v

    # 3. Parse từng container thành cấu trúc {header, items} chuẩn
    result: Dict[str, Dict[str, Any]] = {}
    for c_num, combined_fields in containers_merged.items():
        parsed = process_api_row_data(combined_fields, app_name=app_name, table_name=table_name)
        if not parsed["header"]["container_number"]:
            parsed["header"]["container_number"] = c_num
        result[c_num] = parsed

    return result


