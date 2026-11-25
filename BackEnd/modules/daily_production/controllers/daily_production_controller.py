# -*- coding: utf-8 -*-
import json
import re
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from collections import defaultdict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, text

from modules.daily_production.models.daily_production_model import DailyProductionBatch, DailyProductionItem
from modules.daily_production.schemas.daily_production_schema import (
    PreviewMergeRequest,
    DailyProductionBatchCreate,
    DailyProductionBatchUpdate,
    BatchItemsQuickUpdatePayload
)
from modules.delivery.models.order import Order
from modules.production.models.product import Product
from modules.production.models.product_plan import ProductPlan
from modules.production.models.bom_detail import BOMDetail
from modules.production.models.stages import Stage
from modules.hr.models.hr_models import HRFactoryStructure
from shared.utils.timezone import get_vietnam_time

logger = logging.getLogger(__name__)


def get_daily_production_metadata(db: Session) -> Dict[str, Any]:
    """
    Lấy toàn bộ danh mục cấu hình động trực tiếp từ CSDL (Không gán cứng):
    1. factories: Từ bảng hr_factory_structures (loại bỏ khối Văn phòng)
    2. stages: Từ bảng stages
    3. bom_sections: Tổng hợp từ các cụm chi tiết cấp 1 thực tế trong bảng bom_details + stages
    4. plans: Từ bảng product_plans
    5. colors: Danh sách mã màu thực tế từ bảng products
    """
    # 1. Nhà máy từ bảng hr_factory_structures
    db_factories = db.query(HRFactoryStructure).filter(
        ~HRFactoryStructure.structure_code.ilike("VP%"),
        ~HRFactoryStructure.structure_name.ilike("%văn phòng%")
    ).order_by(HRFactoryStructure.id.asc()).all()

    factories = [
        {
            "id": f.id,
            "code": f.structure_code.strip(),
            "name": f.structure_name.strip(),
            "label": f"{f.structure_code.strip()} - {f.structure_name.strip()}"
        }
        for f in db_factories
        if f.structure_code
    ]

    # 2. Công đoạn từ bảng stages
    db_stages = db.query(Stage).order_by(Stage.sequence.asc(), Stage.id.asc()).all()
    stages = [
        {
            "id": s.id,
            "code": s.code or f"CD{s.id:02d}",
            "name": s.name.strip()
        }
        for s in db_stages
        if s.name
    ]

    # 3. Cụm chi tiết BOM cấp 1 thực tế từ bảng bom_details
    top_bom_rows = db.execute(text("""
        SELECT TOP 30 LTRIM(RTRIM(name)) AS bom_name, COUNT(*) AS cnt
        FROM bom_details
        WHERE parent_id IS NULL AND (is_raw_material = 0 OR is_raw_material IS NULL) AND name IS NOT NULL AND LTRIM(RTRIM(name)) <> ''
        GROUP BY LTRIM(RTRIM(name))
        ORDER BY cnt DESC
    """)).fetchall()

    # Xây dựng danh sách Cụm chi tiết / Công đoạn từ dữ liệu thực trong DB
    bom_sections = [
        {"code": "TẤT CẢ", "value": "TẤT CẢ", "name": "Tất cả chi tiết BOM", "label": "Tất cả chi tiết BOM", "group_type": "ALL"},
        {"code": "MẶT TIỀN", "value": "MẶT TIỀN", "name": "Cụm Mặt tiền (Mặt hộc, Cánh cửa, Ván hậu)", "label": "Cụm Mặt tiền (Mặt hộc, Cánh cửa, Ván hậu)", "group_type": "BOM_GROUP"}
    ]
    seen_sec = {"TẤT CẢ", "MẶT TIỀN"}

    # Đưa các cụm gốc phổ biến từ bom_details vào
    for row in top_bom_rows:
        b_name = (row[0] or "").strip()
        if not b_name:
            continue
        # Gom các tên có số thứ tự như 'Mặt hộc 1', 'Mặt hộc 2' -> 'Mặt hộc'
        base_name = re.sub(r'\s+\d+(?:\s+(?:trên|dưới|trái|phải))?$', '', b_name, flags=re.IGNORECASE).strip()
        code_up = base_name.upper()
        if code_up and code_up not in seen_sec:
            seen_sec.add(code_up)
            bom_sections.append({
                "code": code_up,
                "value": code_up,
                "name": f"Cụm {base_name}",
                "label": f"Cụm {base_name}",
                "group_type": "BOM_ROOT"
            })

    # Đưa các công đoạn từ bảng stages vào
    for st in stages:
        code_up = st["name"].upper()
        if code_up not in seen_sec:
            seen_sec.add(code_up)
            bom_sections.append({
                "code": code_up,
                "value": code_up,
                "name": f"Công đoạn: {st['name']}",
                "label": f"Công đoạn: {st['name']}",
                "group_type": "STAGE"
            })

    # 4. Danh sách Kế hoạch sản xuất (product_plans) kèm số lượng đơn hàng thực tế
    plan_counts_rows = db.execute(text("""
        SELECT plan_id, COUNT(*) AS cnt
        FROM orders
        WHERE plan_id IS NOT NULL
        GROUP BY plan_id
    """)).fetchall()
    plan_counts_map = {r[0]: int(r[1]) for r in plan_counts_rows}

    db_plans = db.query(ProductPlan).order_by(ProductPlan.year.desc(), ProductPlan.month.desc(), ProductPlan.id.desc()).all()
    plans = [
        {
            "id": p.id,
            "code": p.code,
            "plan_code": p.code,
            "name": p.name or p.code,
            "month": p.month,
            "year": p.year,
            "orders_count": plan_counts_map.get(p.id, 0)
        }
        for p in db_plans
    ]

    # 5. Danh sách Màu sắc thực tế từ bảng products
    color_rows = db.execute(text("""
        SELECT DISTINCT LTRIM(RTRIM(color)) AS clr
        FROM products
        WHERE color IS NOT NULL AND LTRIM(RTRIM(color)) <> ''
        ORDER BY clr ASC
    """)).fetchall()
    colors = [r[0] for r in color_rows if r[0]]

    return {
        "factories": factories,
        "stages": stages,
        "sections": bom_sections,
        "plans": plans,
        "colors": colors
    }


def extract_root_and_sub_po(code: str) -> Tuple[str, str, Optional[int]]:
    """
    Phân tách mã đơn hàng/Cont thành: (root_po, sub_suffix_str, sub_suffix_num).
    Ví dụ:
      'APT-0063-03' -> ('APT-0063', '03', 3)
      'APT-0074-2'  -> ('APT-0074', '2', 2)
      'FOL-0448'    -> ('FOL-0448', '', None)
    """
    if not code:
        return ("", "", None)
    clean = re.sub(r'\s*-\s*', '-', str(code).strip())
    m = re.match(r'^([A-Za-z0-9]+-\d+(?:-\d+)?)-(\d+)([A-Za-z]*)$', clean)
    if m:
        root = m.group(1)
        num_str = m.group(2)
        tail = m.group(3) or ""
        return (root, f"{num_str}{tail}", int(num_str))
    m2 = re.match(r'^(.*?)-(\d+)([A-Za-z]*)$', clean)
    if m2 and len(m2.group(1).split('-')) >= 2:
        root = m2.group(1)
        num_str = m2.group(2)
        tail = m2.group(3) or ""
        return (root, f"{num_str}{tail}", int(num_str))
    return (clean, "", None)


def format_compact_order_title(order_codes: List[str]) -> str:
    """
    Tự động rút gọn danh sách mã Cont đã chọn thành chuỗi chuẩn biểu mẫu xưởng.
    Ví dụ:
      ['APT-0063-03', 'APT-0063-04', 'APT-0074-02', 'APT-0084-04', 'APT-0123-01', 'APT-0123-02', 'APT-0123-03']
      -> 'APT-0063-03~04; APT-0074-02; APT-0084-04; APT-0123-01~03'
    """
    if not order_codes:
        return ""

    groups: Dict[str, List[Tuple[str, str, Optional[int]]]] = {}
    root_order: List[str] = []

    seen = set()
    for raw_code in order_codes:
        c = (raw_code or "").strip()
        if not c or c in seen:
            continue
        seen.add(c)
        root, suffix_str, suffix_num = extract_root_and_sub_po(c)
        if root not in groups:
            groups[root] = []
            root_order.append(root)
        groups[root].append((c, suffix_str, suffix_num))

    parts = []
    for root in root_order:
        items = groups[root]
        all_numeric = all(it[2] is not None and it[1].isdigit() for it in items)
        if all_numeric and len(items) > 1:
            sorted_items = sorted(items, key=lambda x: x[2])
            ranges = []
            start = sorted_items[0]
            prev = sorted_items[0]
            for curr in sorted_items[1:]:
                if curr[2] == prev[2] + 1:
                    prev = curr
                else:
                    ranges.append((start, prev))
                    start = curr
                    prev = curr
            ranges.append((start, prev))

            range_strs = []
            for idx, (r_start, r_end) in enumerate(ranges):
                prefix = f"{root}-" if idx == 0 else ""
                if r_start[2] == r_end[2]:
                    range_strs.append(f"{prefix}{r_start[1]}")
                else:
                    range_strs.append(f"{prefix}{r_start[1]}~{r_end[1]}")
            parts.append(", ".join(range_strs))
        elif len(items) == 1:
            parts.append(items[0][0])
        else:
            sub_labels = [items[0][0]] + [it[1] or it[0] for it in items[1:]]
            parts.append(", ".join(sub_labels))

    return "; ".join(parts)


def parse_cabinet_and_color(prod: Product, bom_skus: List[str]) -> Tuple[str, str, str, str]:
    """
    Trích xuất: (cont_code, color_code, cabinet_code, line_code) từ dữ liệu thực của Product và BOM SKU trong DB.
    """
    raw_name = (prod.name or prod.sku or "").strip()
    raw_sku = (prod.sku or "").strip()
    color = (prod.color or "").strip().upper()

    clean_cab = re.sub(r'^APT[-_]?', '', raw_name, flags=re.IGNORECASE).strip()
    m_color = re.match(r'^(.+?)-([A-Za-z]{3,4})$', clean_cab)
    if m_color:
        cabinet_code = m_color.group(1).strip()
        if not color:
            color = m_color.group(2).upper()
    else:
        cabinet_code = clean_cab

    cont_code = ""
    line_letter = ""
    for b_sku in bom_skus:
        if not b_sku:
            continue
        m_bom = re.match(r'^ATL([A-Za-z])0*(\d+)', b_sku.strip())
        if m_bom:
            line_letter = m_bom.group(1).upper()
            size_num = m_bom.group(2)
            cont_code = f"{line_letter}{size_num}"
            break

    if not cont_code:
        m_cab = re.match(r'^(\d+)-(\d+)', cabinet_code)
        if m_cab:
            series_num = m_cab.group(1)
            size_num = m_cab.group(2)
            series_map = {
                "10": "R",
                "9": "N",
                "8": "B",
                "7": "G",
                "1": "A"
            }
            line_letter = series_map.get(series_num, f"S{series_num}")
            cont_code = f"{line_letter}{size_num}"
        else:
            cont_code = cabinet_code[:8] if cabinet_code else raw_sku[:8]

    line_code = f"Dòng {line_letter}" if line_letter else ""
    return (cont_code, color, cabinet_code or raw_sku, line_code)


def normalize_material_display(raw_mat_name: str, fallback_mat: str = "") -> str:
    """
    Làm sạch tên nguyên liệu từ dòng raw material của bảng bom_details (cắt bỏ kích thước tấm khổ lớn phía sau).
    """
    src = (raw_mat_name or fallback_mat or "").strip()
    if not src or src.lower() in ["có", "khong", "không", "none", "null"]:
        return ""
    low = src.lower()
    if "ván ghép cao su" in low or "van ghep cao su" in low:
        return "Ván Ghép Cao Su"
    if "poplar" in low and ("ván ép" in low or "van ep" in low):
        if "veneer" in low:
            return "Ván Ép Veneer/Poplar"
        return "Ván Ép Poplar"
    if "ván mdf" in low or "van mdf" in low or low.startswith("mdf"):
        return "Ván MDF"
    if "ván hdf" in low or "van hdf" in low:
        return "Ván HDF"
    cleaned = re.sub(r'\s+\d+(?:[.,]\d+)?\s*\*\s*\d+.*$', '', src).strip()
    return cleaned


def parse_dimensions_from_spec(spec: str, height: float = 0.0, width: float = 0.0, length: float = 0.0) -> Tuple[str, str, str]:
    """
    Tách Quy cách tinh (Dày, Rộng, Dài) từ cột specification hoặc (height, width, length) trong bảng bom_details.
    """
    def fmt_num(val: Any) -> str:
        if val is None or val == "":
            return ""
        try:
            f = float(str(val).replace(",", "."))
            if f <= 0:
                return ""
            if abs(f - round(f)) < 0.001:
                return str(int(round(f)))
            return str(round(f, 1))
        except Exception:
            return str(val).strip()

    if spec:
        parts = re.split(r'[*xX×]', str(spec).strip())
        if len(parts) >= 3:
            return (fmt_num(parts[0]), fmt_num(parts[1]), fmt_num(parts[2]))

    return (fmt_num(height), fmt_num(width), fmt_num(length))


def stt_sort_key(stt: str) -> Tuple:
    if not stt:
        return (9999,)
    nums = []
    for seg in str(stt).strip().split('.'):
        m = re.match(r'^(\d+)', seg.strip())
        if m:
            nums.append(int(m.group(1)))
        else:
            nums.append(999)
    return tuple(nums)


def match_section_preset(stt_code: str, item_name: str, parent_name: str, input_stage: str, output_stage: str, section_name: str) -> bool:
    """
    Kiểm tra xem dòng chi tiết BOM trong CSDL có khớp với Cụm chi tiết / Công đoạn được chọn không.
    """
    sec = (section_name or "").strip().upper()
    if not sec or sec in ["TẤT CẢ", "ALL", ""]:
        return True

    name_low = (item_name or "").strip().lower()
    parent_low = (parent_name or "").strip().lower()
    in_stg_low = (input_stage or "").strip().lower()
    out_stg_low = (output_stage or "").strip().lower()
    sec_low = sec.lower()
    combined = f"{name_low} {parent_low}"

    if "MẶT TIỀN" in sec or "MAT TIEN" in sec:
        front_keywords = ["mặt hộc", "mat hoc", "cánh cửa", "canh cua", "ván cửa", "van cua", "ván hậu", "van hau"]
        return any(kw in combined for kw in front_keywords)

    # Khớp theo tên Cụm gốc BOM (VD: 'KHUNG TỦ', 'CÁNH CỬA', 'HỘC TỦ', 'MẶT HỘC'...) hoặc công đoạn
    if sec_low in combined or sec_low in in_stg_low or sec_low in out_stg_low:
        return True

    if "HỘC" in sec and ("hộc" in combined or "hoc" in combined):
        return True

    if ("KHUNG" in sec or "THÙNG" in sec) and any(k in combined for k in ["khung", "hông", "chân", "vách", "đáy tủ", "ván tầng", "bọ", "thanh ngang"]):
        return True

    return True


def get_available_containers_tree(
    db: Session,
    search: Optional[str] = None,
    factory: Optional[str] = None,
    plan_id: Optional[int] = None,
    month: Optional[int] = None,
    plan_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Truy vấn trực tiếp từ bảng orders, products, product_plans trong CSDL:
    Trả về danh sách PO gốc và toàn bộ các Cont lẻ bên trong để người dùng chọn gộp.
    """
    target_date = plan_date or get_vietnam_time().strftime("%Y-%m-%d")

    # Lấy toàn bộ các đợt sản xuất đã tạo để biết chính xác từng PO/Cont đã được chọn SX vào ngày nào
    existing_batches = db.query(DailyProductionBatch).order_by(
        DailyProductionBatch.plan_date.desc(),
        DailyProductionBatch.id.desc()
    ).all()

    scheduled_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for b in existing_batches:
        try:
            codes = json.loads(b.selected_orders_json or "[]")
            for c in codes:
                scheduled_map[c].append({
                    "batch_id": b.id,
                    "batch_code": b.batch_code,
                    "batch_title": b.batch_title,
                    "plan_date": b.plan_date,
                    "factory": b.factory,
                    "section_name": b.section_name,
                    "status": b.status
                })
        except Exception as e:
            logger.warning(f"Lỗi parse selected_orders_json của batch {b.id}: {e}")

    # Tính tổng số tủ đã lên lịch SX cho từng Cont lẻ dựa trên các dòng CABINET_HEADER đã lưu
    scheduled_qty_map: Dict[str, int] = defaultdict(int)
    cab_items = db.query(
        DailyProductionItem.source_orders_text,
        DailyProductionItem.base_planned_qty,
        DailyProductionItem.custom_planned_qty
    ).filter(
        DailyProductionItem.row_type == "CABINET_HEADER",
        DailyProductionItem.is_visible == True
    ).all()

    src_order_pattern = re.compile(r"([^,()]+?)\s*\(\s*(\d+)\s*\)")
    for src_text, base_qty, custom_qty in cab_items:
        if not src_text:
            continue
        matches = src_order_pattern.findall(str(src_text))
        if not matches:
            continue
        base_num = float(base_qty or 0)
        custom_num = float(custom_qty if custom_qty is not None else base_num)
        ratio = (custom_num / base_num) if base_num > 0 else 1.0
        for raw_code, raw_q in matches:
            oc_clean = raw_code.strip()
            if oc_clean:
                scheduled_qty_map[oc_clean] += int(round(int(raw_q) * ratio))

    query = db.query(Order).options(
        joinedload(Order.products),
        joinedload(Order.product_plan)
    )

    if plan_id is not None:
        query = query.filter(Order.plan_id == plan_id)
    elif month is not None:
        query = query.join(ProductPlan, Order.plan_id == ProductPlan.id).filter(ProductPlan.month == month)

    if search and search.strip():
        s_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Order.order_code.ilike(s_term),
                Order.partner_po.ilike(s_term),
                Order.production_code.ilike(s_term),
                Order.customer.ilike(s_term)
            )
        )

    orders = query.order_by(Order.order_code.asc(), Order.id.asc()).all()

    root_groups: Dict[str, Dict[str, Any]] = {}
    root_order_keys: List[str] = []
    seen_order_codes = set()

    for o in orders:
        o_code = (o.order_code or o.partner_po or o.production_code or "").strip()
        if not o_code or o_code in seen_order_codes:
            continue
        seen_order_codes.add(o_code)

        root_po, suffix_str, suffix_num = extract_root_and_sub_po(o_code)

        total_cabs = 0
        colors_set = set()
        skus_preview = []
        sub_products = []
        fac_detected = ""

        for p in (o.products or []):
            q = int(float(p.order_qty or p.quantity or p.production_qty or 0))
            total_cabs += q
            p_color = ""
            if p.color:
                p_color = p.color.strip().upper()
                colors_set.add(p_color)
            else:
                m_c = re.search(r'-([A-Za-z]{3,4})$', (p.name or p.sku or "").strip())
                if m_c:
                    p_color = m_c.group(1).upper()
                    colors_set.add(p_color)

            p_label = re.sub(r'^APT[-_]?', '', (p.name or p.sku or "").strip(), flags=re.IGNORECASE)
            if p_label:
                skus_preview.append(f"{p_label} ({q})")

            if not fac_detected and p.factory:
                fac_detected = p.factory

            sub_products.append({
                "product_id": p.id,
                "order_id": o.id,
                "order_code": o_code,
                "sku": (p.sku or "").strip(),
                "name": (p.name or p.sku or "").strip(),
                "cabinet_code": p_label or (p.sku or "").strip(),
                "color": p_color,
                "quantity": q,
                "factory": p.factory or fac_detected or ""
            })

        if factory and factory.strip().upper() not in ["ALL", "TẤT CẢ", ""]:
            if fac_detected and fac_detected.upper() != factory.strip().upper():
                continue

        if root_po not in root_groups:
            root_groups[root_po] = {
                "root_po": root_po,
                "total_containers": 0,
                "total_cabinets": 0,
                "colors": set(),
                "factories": set(),
                "plan_id": o.plan_id,
                "plan_name": o.product_plan.name if o.product_plan else "",
                "plan_month": o.product_plan.month if o.product_plan else None,
                "plan_year": o.product_plan.year if o.product_plan else None,
                "sub_containers": []
            }
            root_order_keys.append(root_po)

        grp = root_groups[root_po]
        grp["total_containers"] += 1
        grp["total_cabinets"] += total_cabs
        grp["colors"].update(colors_set)
        if fac_detected:
            grp["factories"].add(fac_detected)

        grp["sub_containers"].append({
            "order_id": o.id,
            "order_code": o_code,
            "root_po": root_po,
            "suffix": suffix_str or o_code,
            "suffix_num": suffix_num if suffix_num is not None else 9999,
            "total_cabinets": total_cabs,
            "products_count": len(o.products or []),
            "colors": sorted(list(colors_set)),
            "factory": fac_detected,
            "plan_name": o.product_plan.name if o.product_plan else "",
            "product_summary": ", ".join(skus_preview[:5]) + (f" (+{len(skus_preview) - 5})" if len(skus_preview) > 5 else ""),
            "products": sub_products,
            "scheduled_batches": scheduled_map.get(o_code, []),
            "scheduled_dates": sorted(list({
                b["plan_date"] for b in scheduled_map.get(o_code, []) if b.get("plan_date")
            }), reverse=True),
            "scheduled_cabinets_qty": scheduled_qty_map.get(o_code, 0),
            "is_scheduled_today": any(
                b.get("plan_date") == target_date for b in scheduled_map.get(o_code, [])
            ),
            "is_scheduled": len(scheduled_map.get(o_code, [])) > 0
        })

    result_list = []
    for r_key in root_order_keys:
        g = root_groups[r_key]
        g["sub_containers"].sort(key=lambda x: (x["suffix_num"], x["order_code"]))
        group_dates = sorted(list({
            d
            for sc in g["sub_containers"]
            for d in (sc.get("scheduled_dates") or [])
        }), reverse=True)
        scheduled_cont_count = sum(1 for sc in g["sub_containers"] if sc.get("is_scheduled"))
        scheduled_cabs_total = sum(int(sc.get("scheduled_cabinets_qty") or 0) for sc in g["sub_containers"])
        result_list.append({
            "root_po": g["root_po"],
            "total_containers": g["total_containers"],
            "total_cabinets": g["total_cabinets"],
            "colors": sorted(list(g["colors"])),
            "factories": sorted(list(g["factories"])),
            "plan_id": g["plan_id"],
            "plan_name": g["plan_name"],
            "plan_month": g["plan_month"],
            "plan_year": g["plan_year"],
            "scheduled_dates": group_dates,
            "scheduled_containers_count": scheduled_cont_count,
            "scheduled_cabinets_qty": scheduled_cabs_total,
            "sub_containers": g["sub_containers"]
        })

    total_sub = sum(x["total_containers"] for x in result_list)
    return {
        "plan_date": target_date,
        "total_root_pos": len(result_list),
        "total_containers": total_sub,
        "total_sub_containers": total_sub,
        "groups": result_list
    }


def preview_merged_containers_bom(
    db: Session,
    payload: PreviewMergeRequest
) -> Dict[str, Any]:
    """
    Tổng hợp danh sách Mã tủ và Cây chi tiết BOM trực tiếp từ CSDL (bảng orders, products, bom_details)
    theo các Cont lẻ được người dùng chọn gộp.
    """
    clean_codes = [c.strip() for c in (payload.order_codes or []) if c and c.strip()]
    if not clean_codes:
        return {
            "batch_title": "",
            "line_color_summary": "",
            "selected_orders": [],
            "available_colors": [],
            "total_cabinets": 0,
            "items": []
        }

    orders = db.query(Order).options(joinedload(Order.products)).filter(
        or_(
            Order.order_code.in_(clean_codes),
            Order.partner_po.in_(clean_codes),
            Order.production_code.in_(clean_codes)
        )
    ).all()

    has_specific_product_selection = payload.product_ids is not None
    selected_product_id_set = {int(pid) for pid in (payload.product_ids or []) if pid is not None}

    all_products: List[Tuple[str, Product]] = []
    for o in orders:
        o_code = (o.order_code or o.partner_po or o.production_code or "").strip()
        for p in (o.products or []):
            if has_specific_product_selection and p.id not in selected_product_id_set:
                continue
            all_products.append((o_code, p))

    prod_ids = [p.id for _, p in all_products if p.id]
    all_boms = []
    boms_by_prod: Dict[int, List[BOMDetail]] = defaultdict(list)
    if payload.include_bom and prod_ids:
        all_boms = db.query(BOMDetail).filter(BOMDetail.product_id.in_(prod_ids)).all()
        for b in all_boms:
            boms_by_prod[b.product_id].append(b)

    cabinet_groups: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
    all_colors_found = set()
    all_lines_found = set()
    color_filter_set = {c.strip().upper() for c in (payload.color_filter or []) if c and c.strip()}

    for o_code, prod in all_products:
        p_boms = boms_by_prod.get(prod.id, [])
        bom_skus = [b.sku for b in p_boms if b.sku and not b.is_raw_material]
        cont_code, color_code, cabinet_code, line_code = parse_cabinet_and_color(prod, bom_skus)

        if color_code:
            all_colors_found.add(color_code)
        if line_code:
            all_lines_found.add(line_code)

        if color_filter_set and color_code not in color_filter_set:
            continue

        prod_qty = int(round(float(prod.order_qty or prod.quantity or prod.production_qty or 0)))
        if prod_qty <= 0:
            prod_qty = 1

        g_key = (cont_code, color_code, cabinet_code)
        if g_key not in cabinet_groups:
            cabinet_groups[g_key] = {
                "cont_code": cont_code,
                "color_code": color_code,
                "cabinet_code": cabinet_code,
                "line_code": line_code,
                "total_cabinet_qty": 0,
                "source_orders": defaultdict(int),
                "representative_prod": prod,
                "representative_boms": p_boms
            }

        cabinet_groups[g_key]["total_cabinet_qty"] += prod_qty
        cabinet_groups[g_key]["source_orders"][o_code] += prod_qty
        if len(p_boms) > len(cabinet_groups[g_key]["representative_boms"]):
            cabinet_groups[g_key]["representative_prod"] = prod
            cabinet_groups[g_key]["representative_boms"] = p_boms

    sorted_group_keys = sorted(
        cabinet_groups.keys(),
        key=lambda k: (k[0], k[1], k[2])
    )

    items_list: List[Dict[str, Any]] = []
    sort_idx = 1
    total_all_cabinets = 0

    for g_key in sorted_group_keys:
        grp = cabinet_groups[g_key]
        cont_code = grp["cont_code"]
        color_code = grp["color_code"]
        cabinet_code = grp["cabinet_code"]
        total_cab_qty = grp["total_cabinet_qty"]
        total_all_cabinets += total_cab_qty
        rep_prod: Product = grp["representative_prod"]
        rep_boms: List[BOMDetail] = grp["representative_boms"]

        src_orders_str = ", ".join(f"{oc} ({q})" for oc, q in grp["source_orders"].items())

        items_list.append({
            "row_type": "CABINET_HEADER",
            "cont_code": cont_code,
            "color_code": color_code,
            "cabinet_code": cabinet_code,
            "stt_code": cabinet_code,
            "material_name": "",
            "item_name": f"Tủ {cabinet_code}" + (f" ({color_code})" if color_code else ""),
            "dim_thick": "",
            "dim_width": "",
            "dim_length": "",
            "set_qty": 1.0,
            "base_planned_qty": total_cab_qty,
            "custom_planned_qty": total_cab_qty,
            "completed_qty": 0,
            "is_visible": True,
            "is_custom_row": False,
            "source_orders_text": src_orders_str,
            "note": "",
            "sort_order": sort_idx
        })
        sort_idx += 1

        if payload.include_bom and rep_boms:
            bom_by_id = {b.id: b for b in rep_boms}
            raw_mat_by_parent: Dict[int, str] = {}
            part_boms: List[BOMDetail] = []

            for b in rep_boms:
                if b.is_raw_material:
                    if b.parent_id and b.parent_id not in raw_mat_by_parent:
                        raw_mat_by_parent[b.parent_id] = normalize_material_display(b.name, b.material)
                else:
                    part_boms.append(b)

            rep_prod_qty = float(rep_prod.order_qty or rep_prod.quantity or 1.0)
            top_nodes = [b for b in part_boms if b.parent_id is None]
            is_pre_multiplied = False
            if rep_prod_qty > 1.0 and top_nodes:
                ge_count = sum(1 for tn in top_nodes if float(tn.quantity or 0) >= rep_prod_qty)
                if ge_count >= max(1, len(top_nodes) // 2):
                    is_pre_multiplied = True

            enriched_parts = []
            for b in part_boms:
                b_sku = (b.sku or "").strip()
                if "." in b_sku:
                    stt_val = b_sku.split(".", 1)[1].strip()
                else:
                    stt_val = b_sku or str(b.id)

                raw_q = float(b.quantity or 1.0)
                if is_pre_multiplied and rep_prod_qty > 0:
                    unit_set = round(raw_q / rep_prod_qty, 2)
                else:
                    parent_node = bom_by_id.get(b.parent_id) if b.parent_id else None
                    parent_set = float(parent_node.quantity or 1.0) if (parent_node and not is_pre_multiplied) else 1.0
                    unit_set = round(raw_q * parent_set, 2) if parent_set > 1.0 else round(raw_q, 2)

                if unit_set <= 0:
                    unit_set = 1.0

                planned_q = int(round(unit_set * total_cab_qty))
                mat_display = raw_mat_by_parent.get(b.id, "") or normalize_material_display("", b.material)
                d_thick, d_width, d_length = parse_dimensions_from_spec(b.specification, b.height, b.width, b.length)
                parent_name = bom_by_id[b.parent_id].name if (b.parent_id and b.parent_id in bom_by_id) else ""

                vis = match_section_preset(
                    stt_val,
                    b.name,
                    parent_name,
                    b.input_stage or "",
                    b.output_stage or "",
                    payload.section_name
                )

                enriched_parts.append({
                    "stt_key": stt_sort_key(stt_val),
                    "data": {
                        "row_type": "DETAIL_ITEM",
                        "cont_code": cont_code,
                        "color_code": color_code,
                        "cabinet_code": cabinet_code,
                        "stt_code": stt_val,
                        "material_name": mat_display,
                        "item_name": (b.name or "").upper() if b.parent_id is None else (b.name or ""),
                        "dim_thick": d_thick,
                        "dim_width": d_width,
                        "dim_length": d_length,
                        "set_qty": int(unit_set) if abs(unit_set - round(unit_set)) < 0.001 else unit_set,
                        "base_planned_qty": planned_q,
                        "custom_planned_qty": planned_q,
                        "completed_qty": 0,
                        "is_visible": vis,
                        "is_custom_row": False,
                        "source_orders_text": src_orders_str,
                        "note": (b.description or "").strip(),
                        "sort_order": 0
                    }
                })

            enriched_parts.sort(key=lambda x: x["stt_key"])
            for ep in enriched_parts:
                ep["data"]["sort_order"] = sort_idx
                items_list.append(ep["data"])
                sort_idx += 1

    batch_title = format_compact_order_title(clean_codes)
    active_colors = sorted(list(color_filter_set if color_filter_set else all_colors_found))
    lines_str = "/".join(sorted(list(all_lines_found)))
    colors_str = "/".join(active_colors)
    fac_str = (payload.factory or "").strip().upper()
    summary_parts = [x for x in [lines_str, colors_str] if x]
    line_color_summary = "/".join(summary_parts) + (f"-{fac_str}" if fac_str else "")

    components_by_cabinet: Dict[Tuple[str, str], List[Dict[str, Any]]] = defaultdict(list)
    for it in items_list:
        if it.get("row_type") == "DETAIL_ITEM":
            components_by_cabinet[(it.get("cabinet_code") or "", it.get("color_code") or "")].append(it)

    cabinets_summary = [
        {
            "cabinet_code": grp["cabinet_code"],
            "cont_code": grp["cont_code"],
            "color_code": grp["color_code"],
            "line_code": grp["line_code"],
            "total_cabinet_qty": grp["total_cabinet_qty"],
            "custom_planned_qty": grp["total_cabinet_qty"],
            "source_orders_breakdown": [
                {"order_code": oc, "quantity": q}
                for oc, q in grp["source_orders"].items()
            ],
            "source_orders_text": ", ".join(f"{oc} ({q})" for oc, q in grp["source_orders"].items()),
            "components": components_by_cabinet.get((grp["cabinet_code"], grp["color_code"]), []),
            "components_count": len(components_by_cabinet.get((grp["cabinet_code"], grp["color_code"]), [])),
            "note": ""
        }
        for grp in [cabinet_groups[k] for k in sorted_group_keys]
    ]

    return {
        "batch_title": batch_title,
        "line_color_summary": line_color_summary,
        "selected_orders": clean_codes,
        "available_colors": sorted(list(all_colors_found)),
        "total_cabinets": total_all_cabinets,
        "total_items": len(items_list),
        "visible_items_count": sum(1 for it in items_list if it["is_visible"]),
        "has_detailed_bom": bool(payload.include_bom),
        "cabinets": cabinets_summary,
        "items": items_list
    }


def _serialize_batch(batch: DailyProductionBatch, include_items: bool = True, only_visible: bool = False) -> Dict[str, Any]:
    try:
        selected_orders = json.loads(batch.selected_orders_json or "[]")
    except Exception:
        selected_orders = []

    raw_items = batch.items or []
    total_cabinets = sum(
        int(it.custom_planned_qty or 0)
        for it in raw_items
        if it.row_type == "CABINET_HEADER" and it.is_visible
    )
    visible_detail_count = sum(
        1 for it in raw_items
        if it.row_type == "DETAIL_ITEM" and it.is_visible
    )
    total_detail_count = sum(
        1 for it in raw_items
        if it.row_type == "DETAIL_ITEM"
    )

    res = {
        "id": batch.id,
        "batch_code": batch.batch_code,
        "plan_date": batch.plan_date,
        "factory": batch.factory,
        "section_name": batch.section_name,
        "batch_title": batch.batch_title,
        "line_color_summary": batch.line_color_summary or "",
        "selected_orders": selected_orders,
        "orders_count": len(selected_orders),
        "total_cabinets": total_cabinets,
        "visible_detail_count": visible_detail_count,
        "total_detail_count": total_detail_count,
        "status": batch.status,
        "notes": batch.notes or "",
        "created_by": batch.created_by or "",
        "created_at": batch.created_at.strftime("%Y-%m-%d %H:%M:%S") if batch.created_at else None,
        "updated_at": batch.updated_at.strftime("%Y-%m-%d %H:%M:%S") if batch.updated_at else None,
    }

    if include_items:
        filtered_items = [
            it for it in raw_items
            if (not only_visible or it.is_visible)
        ]
        res["items"] = [
            {
                "id": it.id,
                "batch_id": it.batch_id,
                "row_type": it.row_type,
                "cont_code": it.cont_code or "",
                "color_code": it.color_code or "",
                "cabinet_code": it.cabinet_code or "",
                "stt_code": it.stt_code or "",
                "material_name": it.material_name or "",
                "item_name": it.item_name or "",
                "dim_thick": it.dim_thick or "",
                "dim_width": it.dim_width or "",
                "dim_length": it.dim_length or "",
                "set_qty": it.set_qty,
                "base_planned_qty": it.base_planned_qty or 0,
                "custom_planned_qty": it.custom_planned_qty or 0,
                "completed_qty": it.completed_qty or 0,
                "is_visible": bool(it.is_visible),
                "is_custom_row": bool(it.is_custom_row),
                "source_orders_text": it.source_orders_text or "",
                "note": it.note or "",
                "sort_order": it.sort_order or idx
            }
            for idx, it in enumerate(filtered_items, 1)
        ]

    return res


def create_daily_batch(db: Session, payload: DailyProductionBatchCreate) -> Dict[str, Any]:
    now = get_vietnam_time()
    date_clean = (payload.plan_date or now.strftime("%Y-%m-%d")).strip()
    date_compact = date_clean.replace("-", "")

    count_today = db.query(DailyProductionBatch).filter(DailyProductionBatch.plan_date == date_clean).count()
    batch_code = f"SXN-{date_compact}-{count_today + 1:03d}"
    while db.query(DailyProductionBatch).filter(DailyProductionBatch.batch_code == batch_code).first():
        count_today += 1
        batch_code = f"SXN-{date_compact}-{count_today + 1:03d}"

    new_batch = DailyProductionBatch(
        batch_code=batch_code,
        plan_date=date_clean,
        factory=(payload.factory or "").strip().upper(),
        section_name=(payload.section_name or "").strip().upper(),
        batch_title=payload.batch_title.strip(),
        line_color_summary=(payload.line_color_summary or "").strip(),
        selected_orders_json=json.dumps(payload.selected_orders or [], ensure_ascii=False),
        status=payload.status or "PUBLISHED",
        notes=payload.notes or "",
        created_by=payload.created_by or "",
        created_at=now,
        updated_at=now
    )
    db.add(new_batch)
    db.flush()

    items_to_save = list(payload.items or [])
    has_details = any(it.row_type == "DETAIL_ITEM" for it in items_to_save)
    if not has_details and selected_orders:
        # Nếu người dùng lưu từ chế độ Tổng hợp Tủ -> Backend tự động bóc tách BOM chi tiết đầy đủ
        full_preview = preview_merged_containers_bom(
            db,
            PreviewMergeRequest(
                order_codes=selected_orders,
                section_name=payload.section_name,
                factory=payload.factory,
                include_bom=True
            )
        )
        if full_preview.get("items"):
            cab_qty_override = {
                (it.cabinet_code, it.color_code): it.custom_planned_qty
                for it in items_to_save
                if it.row_type == "CABINET_HEADER" and it.custom_planned_qty is not None
            }
            generated_items = []
            for git in full_preview["items"]:
                key = (git["cabinet_code"], git["color_code"])
                if key in cab_qty_override:
                    new_cab_qty = cab_qty_override[key]
                    if git["row_type"] == "CABINET_HEADER":
                        git["custom_planned_qty"] = new_cab_qty
                    elif git["row_type"] == "DETAIL_ITEM":
                        set_v = float(git.get("set_qty") or 1.0)
                        git["custom_planned_qty"] = int(round(set_v * new_cab_qty))
                generated_items.append(DailyProductionItemPayload(**git))
            items_to_save = generated_items

    for idx, item_in in enumerate(items_to_save, 1):
        db_item = DailyProductionItem(
            batch_id=new_batch.id,
            row_type=item_in.row_type or "DETAIL_ITEM",
            cont_code=item_in.cont_code or "",
            color_code=item_in.color_code or "",
            cabinet_code=item_in.cabinet_code or "",
            stt_code=item_in.stt_code or "",
            material_name=item_in.material_name or "",
            item_name=item_in.item_name or "",
            dim_thick=str(item_in.dim_thick or ""),
            dim_width=str(item_in.dim_width or ""),
            dim_length=str(item_in.dim_length or ""),
            set_qty=float(item_in.set_qty if item_in.set_qty is not None else 1.0),
            base_planned_qty=int(item_in.base_planned_qty or 0),
            custom_planned_qty=int(item_in.custom_planned_qty if item_in.custom_planned_qty is not None else (item_in.base_planned_qty or 0)),
            completed_qty=int(item_in.completed_qty or 0),
            is_visible=True if item_in.is_visible is None else bool(item_in.is_visible),
            is_custom_row=bool(item_in.is_custom_row),
            source_orders_text=item_in.source_orders_text or "",
            note=item_in.note or "",
            sort_order=item_in.sort_order or idx,
            created_at=now
        )
        db.add(db_item)

    db.commit()
    db.refresh(new_batch)
    return _serialize_batch(new_batch, include_items=True)


def list_daily_batches(
    db: Session,
    plan_date: Optional[str] = None,
    factory: Optional[str] = None,
    section_name: Optional[str] = None,
    status: Optional[str] = None,
    include_items: bool = True,
    only_visible: bool = False
) -> List[Dict[str, Any]]:
    query = db.query(DailyProductionBatch).options(joinedload(DailyProductionBatch.items))

    if plan_date and plan_date.strip() and plan_date.strip().upper() != "ALL":
        query = query.filter(DailyProductionBatch.plan_date == plan_date.strip())

    if factory and factory.strip().upper() not in ["ALL", "TẤT CẢ", ""]:
        query = query.filter(DailyProductionBatch.factory == factory.strip().upper())

    if section_name and section_name.strip().upper() not in ["ALL", "TẤT CẢ", ""]:
        query = query.filter(DailyProductionBatch.section_name == section_name.strip().upper())

    if status and status.strip().upper() not in ["ALL", "TẤT CẢ", ""]:
        query = query.filter(DailyProductionBatch.status == status.strip().upper())

    batches = query.order_by(desc(DailyProductionBatch.plan_date), desc(DailyProductionBatch.id)).all()
    return [_serialize_batch(b, include_items=include_items, only_visible=only_visible) for b in batches]


def get_daily_batch_detail(db: Session, batch_id: int, only_visible: bool = False) -> Dict[str, Any]:
    batch = db.query(DailyProductionBatch).options(
        joinedload(DailyProductionBatch.items)
    ).filter(DailyProductionBatch.id == batch_id).first()
    if not batch:
        return None
    return _serialize_batch(batch, include_items=True, only_visible=only_visible)


def update_daily_batch(db: Session, batch_id: int, payload: DailyProductionBatchUpdate) -> Optional[Dict[str, Any]]:
    batch = db.query(DailyProductionBatch).filter(DailyProductionBatch.id == batch_id).first()
    if not batch:
        return None

    now = get_vietnam_time()
    if payload.plan_date is not None:
        batch.plan_date = payload.plan_date.strip()
    if payload.factory is not None:
        batch.factory = payload.factory.strip().upper()
    if payload.section_name is not None:
        batch.section_name = payload.section_name.strip().upper()
    if payload.batch_title is not None:
        batch.batch_title = payload.batch_title.strip()
    if payload.line_color_summary is not None:
        batch.line_color_summary = payload.line_color_summary.strip()
    if payload.selected_orders is not None:
        batch.selected_orders_json = json.dumps(payload.selected_orders, ensure_ascii=False)
    if payload.status is not None:
        batch.status = payload.status.strip().upper()
    if payload.notes is not None:
        batch.notes = payload.notes

    batch.updated_at = now

    if payload.items is not None:
        db.query(DailyProductionItem).filter(DailyProductionItem.batch_id == batch.id).delete()
        for idx, item_in in enumerate(payload.items, 1):
            db_item = DailyProductionItem(
                batch_id=batch.id,
                row_type=item_in.row_type or "DETAIL_ITEM",
                cont_code=item_in.cont_code or "",
                color_code=item_in.color_code or "",
                cabinet_code=item_in.cabinet_code or "",
                stt_code=item_in.stt_code or "",
                material_name=item_in.material_name or "",
                item_name=item_in.item_name or "",
                dim_thick=str(item_in.dim_thick or ""),
                dim_width=str(item_in.dim_width or ""),
                dim_length=str(item_in.dim_length or ""),
                set_qty=float(item_in.set_qty if item_in.set_qty is not None else 1.0),
                base_planned_qty=int(item_in.base_planned_qty or 0),
                custom_planned_qty=int(item_in.custom_planned_qty if item_in.custom_planned_qty is not None else (item_in.base_planned_qty or 0)),
                completed_qty=int(item_in.completed_qty or 0),
                is_visible=True if item_in.is_visible is None else bool(item_in.is_visible),
                is_custom_row=bool(item_in.is_custom_row),
                source_orders_text=item_in.source_orders_text or "",
                note=item_in.note or "",
                sort_order=item_in.sort_order or idx,
                created_at=now
            )
            db.add(db_item)

    db.commit()
    db.refresh(batch)
    return _serialize_batch(batch, include_items=True)


def quick_update_batch_items(db: Session, batch_id: int, payload: BatchItemsQuickUpdatePayload) -> Optional[Dict[str, Any]]:
    batch = db.query(DailyProductionBatch).options(
        joinedload(DailyProductionBatch.items)
    ).filter(DailyProductionBatch.id == batch_id).first()
    if not batch:
        return None

    now = get_vietnam_time()
    existing_map = {it.id: it for it in (batch.items or []) if it.id}

    for idx, item_in in enumerate(payload.items or [], 1):
        if item_in.id and item_in.id in existing_map:
            db_item = existing_map[item_in.id]
            if item_in.is_visible is not None:
                db_item.is_visible = bool(item_in.is_visible)
            if item_in.custom_planned_qty is not None:
                db_item.custom_planned_qty = int(item_in.custom_planned_qty)
            if item_in.completed_qty is not None:
                db_item.completed_qty = int(item_in.completed_qty)
            if item_in.note is not None:
                db_item.note = item_in.note
            if item_in.item_name is not None and item_in.item_name.strip():
                db_item.item_name = item_in.item_name
            if item_in.material_name is not None:
                db_item.material_name = item_in.material_name
            if item_in.dim_thick is not None:
                db_item.dim_thick = str(item_in.dim_thick)
            if item_in.dim_width is not None:
                db_item.dim_width = str(item_in.dim_width)
            if item_in.dim_length is not None:
                db_item.dim_length = str(item_in.dim_length)
            if item_in.set_qty is not None:
                db_item.set_qty = float(item_in.set_qty)
            if item_in.sort_order is not None:
                db_item.sort_order = int(item_in.sort_order)
        else:
            new_item = DailyProductionItem(
                batch_id=batch.id,
                row_type=item_in.row_type or "DETAIL_ITEM",
                cont_code=item_in.cont_code or "",
                color_code=item_in.color_code or "",
                cabinet_code=item_in.cabinet_code or "",
                stt_code=item_in.stt_code or "+",
                material_name=item_in.material_name or "",
                item_name=item_in.item_name or "",
                dim_thick=str(item_in.dim_thick or ""),
                dim_width=str(item_in.dim_width or ""),
                dim_length=str(item_in.dim_length or ""),
                set_qty=float(item_in.set_qty if item_in.set_qty is not None else 1.0),
                base_planned_qty=int(item_in.base_planned_qty or item_in.custom_planned_qty or 0),
                custom_planned_qty=int(item_in.custom_planned_qty or 0),
                completed_qty=int(item_in.completed_qty or 0),
                is_visible=True if item_in.is_visible is None else bool(item_in.is_visible),
                is_custom_row=True,
                source_orders_text=item_in.source_orders_text or "",
                note=item_in.note or "",
                sort_order=item_in.sort_order or (len(existing_map) + idx),
                created_at=now
            )
            db.add(new_item)

    batch.updated_at = now
    db.commit()
    db.refresh(batch)
    return _serialize_batch(batch, include_items=True)


def delete_daily_batch(db: Session, batch_id: int) -> bool:
    batch = db.query(DailyProductionBatch).filter(DailyProductionBatch.id == batch_id).first()
    if not batch:
        return False
    db.delete(batch)
    db.commit()
    return True
