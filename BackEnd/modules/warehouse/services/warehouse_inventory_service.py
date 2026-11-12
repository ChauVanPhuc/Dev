# -*- coding: utf-8 -*-
import json
import re
import unicodedata
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from fastapi import HTTPException

from modules.warehouse.models import (
    Warehouse,
    WarehouseMaterial,
    UnitOfMeasure,
    GoodsReceipt,
    GoodsReceiptItem,
    GoodsIssue,
    GoodsIssueItem,
    RejectedGoods,
)

# Bản đồ mã kho <-> tên kho chuẩn (khớp 100% với Frontend warehouseData.service.js)
WAREHOUSE_NAME_BY_CODE = {
    "KTP": "Kho thành phẩm",
    "KDG": "Đóng gói - bao bì",
    "KHH": "Kho hàng hóa",
    "KNLC": "Kho nguyên liệu chính",
    "KVT": "Kho vật tư",
    "KSON": "Kho sơn - dầu màu",
}

WAREHOUSE_ALIAS_MAP = {
    "Kho Nguyên Vật Liệu (NVL)": "Kho nguyên liệu chính",
    "Kho Bán Thành Phẩm (BTP)": "Kho thành phẩm",
    "Kho Thành Phẩm Gỗ (TP)": "Kho thành phẩm",
    "Kho Sơn & Hóa Chất": "Kho sơn - dầu màu",
    "Kho Phụ Liệu Cơ Kim Khí": "Kho vật tư",
    "Kho Bao Bì Đóng Gói": "Đóng gói - bao bì",
}


def normalize_wh_name(name_or_code: Optional[str]) -> str:
    if not name_or_code:
        return ""
    s = str(name_or_code).strip()
    upper = s.upper()
    if upper in WAREHOUSE_NAME_BY_CODE:
        return WAREHOUSE_NAME_BY_CODE[upper]
    if s in WAREHOUSE_ALIAS_MAP:
        return WAREHOUSE_ALIAS_MAP[s]
    lower = s.lower()
    for code, full in WAREHOUSE_NAME_BY_CODE.items():
        if full.lower() == lower:
            return full
    return s


def normalize_wh_code(name_or_code: Optional[str]) -> str:
    if not name_or_code:
        return "ALL"
    s = str(name_or_code).strip()
    upper = s.upper()
    if upper == "ALL":
        return "ALL"
    if upper in WAREHOUSE_NAME_BY_CODE:
        return upper
    resolved_name = normalize_wh_name(s)
    for code, full in WAREHOUSE_NAME_BY_CODE.items():
        if full.lower() == resolved_name.lower():
            return code
    return upper


def normalize_unit_code(val: Optional[str]) -> str:
    if val is None:
        return ""
    s = str(val).strip().lower()
    mapping = {
        "m³": "m3", "m3": "m3", "mét khối": "m3", "met khoi": "m3",
        "m²": "m2", "m2": "m2", "mét vuông": "m2", "met vuong": "m2",
        "m": "m", "mét": "m", "met": "m",
        "cái": "cái", "cai": "cái", "chiếc": "cái", "chiec": "cái",
        "thùng": "thùng", "thung": "thùng",
        "hộp": "hộp", "hop": "hộp",
        "tấm": "tấm", "tam": "tấm",
        "cuộn": "cuộn", "cuon": "cuộn",
        "bộ": "bộ", "bo": "bộ",
        "kg": "kg", "kilogram": "kg", "kí": "kg", "ki": "kg",
        "lít": "lít", "lit": "lít", "l": "lít",
        "can": "can",
        "cây": "cây", "cay": "cây",
        "thanh": "thanh",
        "tờ": "tờ", "to": "tờ",
        "kiện": "kiện", "kien": "kiện",
        "chồng": "chồng", "chong": "chồng",
        "bó": "bó",
    }
    return mapping.get(s, s)


def parse_date_safe(val) -> Optional[date]:
    if not val:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    try:
        s = str(val).strip().split("T")[0]
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None


def _parse_images_json(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw if x]
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(x) for x in parsed if x]
    except Exception:
        pass
    return []


def _dump_images_json(imgs: Optional[List[str]]) -> Optional[str]:
    if imgs is None:
        return None
    cleaned = [str(x).strip() for x in imgs if x and str(x).strip()]
    return json.dumps(cleaned, ensure_ascii=False)


def _normalize_channel(val: Optional[str]) -> str:
    if not val:
        return "Web"
    return "Mobile" if str(val).strip().lower() == "mobile" else "Web"


def _resolve_item_qty1(it) -> float:
    if getattr(it, "quantity1", None) is not None:
        return float(it.quantity1)
    if getattr(it, "quantity", None) is not None:
        return float(it.quantity)
    if getattr(it, "quantity_main", None) is not None:
        return float(it.quantity_main)
    return 0.0


def _serialize_receipt(r: GoodsReceipt) -> dict:
    return {
        "id": r.id,
        "voucher_no": r.voucher_no,
        "warehouse_code": r.warehouse_code or normalize_wh_code(r.warehouse_name),
        "warehouse_name": r.warehouse_name,
        "receipt_date": r.receipt_date.isoformat() if r.receipt_date else "",
        "deliverer_name": r.deliverer_name or "",
        "customer_code": r.customer_code or "",
        "customer_name": r.customer_name or "",
        "department_name": r.department_name or "",
        "content": r.content or "",
        "receipt_type": r.receipt_type or "Nhập mua hàng",
        "status": r.status or "PENDING",
        "ctgs": r.ctgs or "",
        "total_lines": r.total_lines or len(r.items or []),
        "total_quantity": round(float(r.total_quantity or 0), 3),
        "created_at": r.created_at.strftime("%Y-%m-%d") if r.created_at else "",
        "created_by": r.created_by or "Người dùng",
        "created_channel": getattr(r, "created_channel", None) or "Web",
        "confirmed_by": getattr(r, "confirmed_by", None) or "",
        "confirmed_at": r.confirmed_at.strftime("%Y-%m-%d %H:%M") if getattr(r, "confirmed_at", None) else None,
        "images": _parse_images_json(getattr(r, "images_json", None)),
        "items": [
            {
                "id": it.id,
                "line_id": it.id,
                "line_no": it.line_no,
                "item_code": it.item_code,
                "item_name": it.item_name,
                "image": it.image_url or "",
                "image_url": it.image_url or "",
                "unit": it.unit1,
                "unit1": it.unit1,
                "quantity": it.quantity1,
                "quantity1": it.quantity1,
                "quantity_main": it.quantity1,
                "unit2": it.unit2 or "",
                "quantity2": it.quantity2 or 0.0,
                "conversion_rate": it.conversion_rate or 1.0,
                "lsx": it.lsx or "",
                "package_split": it.package_split or "",
                "notes": it.notes or "",
            }
            for it in (r.items or [])
        ],
    }


def _resolve_factory(db: Session, factory_id: Optional[int] = None, factory_name: Optional[str] = None) -> dict:
    """
    Chuẩn hóa Nhà máy (factory_id, factory_name, factory_code) dựa vào bảng hr_factory_structures.
    Ưu tiên khớp theo tên/mã nhà máy nếu có (phòng trường hợp dữ liệu cũ bị lệch factory_id).
    """
    clean_name = (factory_name or "").strip()
    try:
        from modules.hr.models.hr_models import HRFactoryStructure
        rows = db.query(HRFactoryStructure).order_by(HRFactoryStructure.id.asc()).all()
        if clean_name:
            low = clean_name.lower()
            matched = next(
                (
                    f for f in rows
                    if (f.structure_name or "").strip().lower() == low
                    or (f.structure_code or "").strip().lower() == low
                ),
                None,
            )
            if matched:
                return {
                    "factory_id": matched.id,
                    "factory_name": matched.structure_name or matched.structure_code,
                    "factory_code": matched.structure_code or "",
                }
        if factory_id:
            matched = next((f for f in rows if f.id == int(factory_id)), None)
            if matched:
                return {
                    "factory_id": matched.id,
                    "factory_name": clean_name or matched.structure_name or matched.structure_code or "",
                    "factory_code": matched.structure_code or "",
                }
    except Exception as exc:
        print(f"[warehouse] Fallback resolve factory: {exc}")

    return {
        "factory_id": int(factory_id) if factory_id else None,
        "factory_name": clean_name or (f"Nhà Máy {factory_id}" if factory_id else ""),
        "factory_code": "",
    }


def resolve_account_factory(db: Session, current_user) -> dict:
    """Xác định Nhà máy của tài khoản đang đăng nhập."""
    if not current_user:
        return {"factory_id": None, "factory_name": "", "factory_code": ""}
    return _resolve_factory(
        db,
        factory_id=getattr(current_user, "factory_id", None),
        factory_name=getattr(current_user, "factory_name", None),
    )


def _factories_match(target: dict, cand_id: Optional[int], cand_name: Optional[str]) -> bool:
    t_id = target.get("factory_id")
    t_name = (target.get("factory_name") or "").strip().lower()
    c_name = (cand_name or "").strip().lower()
    if t_id and cand_id and int(t_id) == int(cand_id):
        return True
    if t_name and c_name and t_name == c_name:
        return True
    return False


def _serialize_issue(iss: GoodsIssue) -> dict:
    return {
        "id": iss.id,
        "voucher_no": iss.voucher_no,
        "warehouse_code": iss.warehouse_code or normalize_wh_code(iss.warehouse_name),
        "warehouse_name": iss.warehouse_name,
        "issue_date": iss.issue_date.isoformat() if iss.issue_date else "",
        "deliverer_name": iss.deliverer_name or "",
        "receiver_name": getattr(iss, "receiver_name", None) or "",
        "customer_code": iss.customer_code or "",
        "customer_name": iss.customer_name or "",
        "department_name": iss.department_name or "",
        "factory_id": getattr(iss, "factory_id", None),
        "factory_name": getattr(iss, "factory_name", None) or "",
        "content": iss.content or "",
        "issue_type": iss.issue_type or "Xuất sản xuất",
        "status": iss.status or "PENDING",
        "ctgs": iss.ctgs or "",
        "total_lines": iss.total_lines or len(iss.items or []),
        "total_quantity": round(float(iss.total_quantity or 0), 3),
        "total_amount": round(float(iss.total_amount or 0), 2),
        "created_at": iss.created_at.strftime("%Y-%m-%d") if iss.created_at else "",
        "created_by": iss.created_by or "Người dùng",
        "created_channel": getattr(iss, "created_channel", None) or "Web",
        "confirmed_by": getattr(iss, "confirmed_by", None) or "",
        "confirmed_at": iss.confirmed_at.strftime("%Y-%m-%d %H:%M") if getattr(iss, "confirmed_at", None) else None,
        "images": _parse_images_json(getattr(iss, "images_json", None)),
        "items": [
            {
                "id": it.id,
                "line_id": it.id,
                "line_no": it.line_no,
                "item_code": it.item_code,
                "item_name": it.item_name,
                "image": it.image_url or "",
                "image_url": it.image_url or "",
                "unit": it.unit1,
                "unit1": it.unit1,
                "quantity": it.quantity1,
                "quantity1": it.quantity1,
                "quantity_main": it.quantity1,
                "unit2": it.unit2 or "",
                "quantity2": it.quantity2 or 0.0,
                "conversion_rate": it.conversion_rate or 1.0,
                "unit_price": it.unit_price or 0.0,
                "amount": it.amount or 0.0,
                "lsx": it.lsx or "",
                "package_split": it.package_split or "",
                "notes": it.notes or "",
            }
            for it in (iss.items or [])
        ],
    }


def _serialize_rejected(rg: RejectedGoods) -> dict:
    return {
        "id": rg.id,
        "voucher_no": rg.voucher_no,
        "created_date": rg.created_date.isoformat() if rg.created_date else "",
        "source_type": rg.source_type,
        "return_mode": getattr(rg, "return_mode", None) or "DEFECTIVE",
        "origin_voucher_id": rg.origin_voucher_id,
        "origin_voucher_no": rg.origin_voucher_no or "",
        "origin_line_id": rg.origin_line_id,
        "warehouse_code": rg.warehouse_code or normalize_wh_code(rg.warehouse_name),
        "warehouse_name": rg.warehouse_name or "",
        "department_name": getattr(rg, "department_name", None) or "",
        "factory_id": getattr(rg, "factory_id", None),
        "factory_name": getattr(rg, "factory_name", None) or "",
        "item_code": rg.item_code,
        "item_name": rg.item_name,
        "unit_main": rg.unit_main or "Cái",
        "unit_conversion": rg.unit_conversion or "",
        "conversion_rate": rg.conversion_rate or 1.0,
        "quantity_main": rg.quantity_main or 0.0,
        "quantity_conv": rg.quantity_conv or 0.0,
        "defect_category": rg.defect_category or "",
        "defect_reason": rg.defect_reason or "",
        "resolution": rg.resolution or "PENDING",
        "status": rg.status or "PENDING",
        "resolution_date": rg.resolution_date.isoformat() if rg.resolution_date else None,
        "resolution_notes": rg.resolution_notes or "",
        "created_by": rg.created_by or "QC / Thủ kho",
        "created_channel": getattr(rg, "created_channel", None) or "Web",
        "returned_by": getattr(rg, "returned_by", None) or "",
        "received_by": getattr(rg, "received_by", None) or "",
        "received_at": rg.received_at.strftime("%Y-%m-%d %H:%M") if getattr(rg, "received_at", None) else None,
        "images": _parse_images_json(getattr(rg, "images_json", None)),
        "is_demo": bool(rg.is_demo),
    }


def _ensure_material_exists(db: Session, wh_name: str, item_code: str, item_name: str, unit1: str, unit2: Optional[str], conv_rate: float, ref_date: Optional[date] = None):
    wh_code = normalize_wh_code(wh_name)
    wh_full = normalize_wh_name(wh_name)
    clean_code = item_code.strip()
    existing = db.query(WarehouseMaterial).filter(
        WarehouseMaterial.warehouse_code == wh_code,
        func.lower(WarehouseMaterial.item_code) == clean_code.lower()
    ).first()
    if not existing:
        db.add(WarehouseMaterial(
            warehouse_code=wh_code,
            warehouse_name=wh_full,
            item_code=clean_code,
            item_name=item_name.strip(),
            category="OTHER",
            unit_main=unit1 or "Cái",
            unit_conversion=unit2 or "",
            conversion_rate=conv_rate or 1.0,
            opening_main=0.0,
            initial_receipt_date=ref_date or date.today(),
            is_active=True,
        ))
        db.flush()


# ==========================================
# XNT DYNAMIC AGGREGATION ENGINE
# ==========================================
def compute_raw_items(db: Session, from_date: Optional[str] = None, to_date: Optional[str] = None) -> List[dict]:
    f_date = parse_date_safe(from_date)
    t_date = parse_date_safe(to_date)
    as_of_date = t_date or date.today()

    materials = db.query(WarehouseMaterial).filter(WarehouseMaterial.is_active == True).all()
    receipts = db.query(GoodsReceipt).options(joinedload(GoodsReceipt.items)).filter(
        GoodsReceipt.is_deleted == False,
        GoodsReceipt.status.notin_(["CANCELLED", "DRAFT"])
    ).all()
    issues = db.query(GoodsIssue).options(joinedload(GoodsIssue.items)).filter(
        GoodsIssue.is_deleted == False,
        GoodsIssue.status.notin_(["CANCELLED", "DRAFT"])
    ).all()
    rejected = db.query(RejectedGoods).filter(
        RejectedGoods.is_deleted == False,
        RejectedGoods.status != "CANCELLED"
    ).all()

    rcp_map: Dict[Tuple[str, str], dict] = {}
    for r in receipts:
        wh_full = normalize_wh_name(r.warehouse_name)
        r_date = r.receipt_date
        for it in (r.items or []):
            key = (wh_full, it.item_code.strip().lower())
            entry = rcp_map.setdefault(key, {"opening_in": 0.0, "in_main": 0.0, "last_date": None, "batches": []})
            q = float(it.quantity1 or 0.0)
            if f_date and r_date and r_date < f_date:
                entry["opening_in"] += q
            elif not t_date or (r_date and r_date <= t_date):
                entry["in_main"] += q
                if not entry["last_date"] or (r_date and r_date > entry["last_date"]):
                    entry["last_date"] = r_date
                entry["batches"].append({"date": r_date, "qty": q, "allocated": 0.0})

    iss_map: Dict[Tuple[str, str], dict] = {}
    for iss in issues:
        wh_full = normalize_wh_name(iss.warehouse_name)
        i_date = iss.issue_date
        for it in (iss.items or []):
            key = (wh_full, it.item_code.strip().lower())
            entry = iss_map.setdefault(key, {"opening_out": 0.0, "out_main": 0.0, "last_date": None})
            q = float(it.quantity1 or 0.0)
            if f_date and i_date and i_date < f_date:
                entry["opening_out"] += q
            elif not t_date or (i_date and i_date <= t_date):
                entry["out_main"] += q
                if not entry["last_date"] or (i_date and i_date > entry["last_date"]):
                    entry["last_date"] = i_date

    rej_map: Dict[Tuple[str, str], dict] = {}
    for rg in rejected:
        wh_full = normalize_wh_name(rg.warehouse_name)
        key = (wh_full, rg.item_code.strip().lower())
        entry = rej_map.setdefault(key, {
            "qc_rej_open": 0.0, "qc_rej_in": 0.0,
            "prod_ret_open": 0.0, "prod_ret_in": 0.0,
            "reused_open": 0.0, "reused_in": 0.0,
            "tracked_ret_in": 0.0, "tracked_ret_conv": 0.0
        })
        q = float(rg.quantity_main or 0.0)
        q_conv = float(rg.quantity_conv or 0.0)
        c_date = rg.created_date
        r_date = rg.resolution_date or c_date

        in_period = (not f_date or (c_date and c_date >= f_date)) and (not t_date or (c_date and c_date <= t_date))
        if in_period:
            entry["tracked_ret_in"] += q
            entry["tracked_ret_conv"] += q_conv

        if not rg.is_demo and rg.status != "DRAFT":
            if rg.source_type == "QC_INCOMING":
                if f_date and c_date and c_date < f_date:
                    entry["qc_rej_open"] += q
                elif not t_date or (c_date and c_date <= t_date):
                    entry["qc_rej_in"] += q
            elif rg.source_type == "PROD_RETURN":
                if f_date and c_date and c_date < f_date:
                    entry["prod_ret_open"] += q
                elif not t_date or (c_date and c_date <= t_date):
                    entry["prod_ret_in"] += q

            if rg.status == "RESOLVED" and rg.resolution == "REUSE":
                if f_date and r_date and r_date < f_date:
                    entry["reused_open"] += q
                elif not t_date or (r_date and r_date <= t_date):
                    entry["reused_in"] += q

    results = []
    for mat in materials:
        wh_full = normalize_wh_name(mat.warehouse_name)
        key = (wh_full, mat.item_code.strip().lower())
        rate = float(mat.conversion_rate or 1.0)

        rcp = rcp_map.get(key, {"opening_in": 0.0, "in_main": 0.0, "last_date": None, "batches": []})
        iss = iss_map.get(key, {"opening_out": 0.0, "out_main": 0.0, "last_date": None})
        rej = rej_map.get(key, {
            "qc_rej_open": 0.0, "qc_rej_in": 0.0, "reused_open": 0.0, "reused_in": 0.0,
            "tracked_ret_in": 0.0, "tracked_ret_conv": 0.0
        })

        base_opening = float(mat.opening_main or 0.0)
        net_open_in = max(0.0, rcp["opening_in"] - rej["qc_rej_open"])
        eff_open = max(0.0, round(base_opening + net_open_in - iss["opening_out"] + rej["reused_open"], 3))
        eff_open_conv = round(eff_open * rate, 2)

        final_in = max(0.0, round(rcp["in_main"] - rej["qc_rej_in"], 3))
        final_in_conv = round(final_in * rate, 2)

        final_out = round(iss["out_main"], 3)
        final_out_conv = round(final_out * rate, 2)

        ret_main = round(rej["tracked_ret_in"], 3)
        ret_conv = round(rej["tracked_ret_conv"] if rej["tracked_ret_conv"] > 0 else ret_main * rate, 2)

        closing = max(0.0, round(eff_open + final_in - final_out + rej["reused_in"], 3))
        closing_conv = round(closing * rate, 2)

        # FIFO Aging calculation
        inv_days = 0
        if closing > 0:
            batches = []
            if eff_open > 0:
                batches.append({"date": mat.initial_receipt_date or date(2025, 12, 1), "qty": eff_open, "allocated": 0.0})
            for b in rcp["batches"]:
                batches.append({"date": b["date"] or date(2026, 1, 1), "qty": b["qty"], "allocated": 0.0})
            batches.sort(key=lambda b: b["date"])

            to_alloc = final_out
            for b in batches:
                if to_alloc <= 0:
                    b["allocated"] = 0.0
                elif to_alloc >= b["qty"]:
                    b["allocated"] = b["qty"]
                    to_alloc -= b["qty"]
                else:
                    b["allocated"] = to_alloc
                    to_alloc = 0.0

            oldest = next((b for b in batches if b["qty"] > b["allocated"]), None)
            if oldest and oldest["date"]:
                diff = (as_of_date - oldest["date"]).days
                inv_days = max(0, diff)
            else:
                inv_days = "Chưa xác định"

        last_rcp = rcp["last_date"] or mat.initial_receipt_date
        results.append({
            "id": mat.id,
            "warehouse_code": mat.warehouse_code,
            "warehouse_name": wh_full,
            "item_code": mat.item_code,
            "item_name": mat.item_name,
            "category": mat.category or "OTHER",
            "unit_main": mat.unit_main,
            "unit_conversion": mat.unit_conversion or "",
            "conversion_rate": rate,
            "opening_main": eff_open,
            "opening_conv": eff_open_conv,
            "in_main": final_in,
            "in_conv": final_in_conv,
            "out_main": final_out,
            "out_conv": final_out_conv,
            "closing_main": closing,
            "closing_conv": closing_conv,
            "return_main": ret_main,
            "return_conv": ret_conv,
            "inventory_days": inv_days,
            "last_receipt_date": last_rcp.isoformat() if last_rcp else None,
            "last_issue_date": iss["last_date"].isoformat() if iss["last_date"] else None,
            "initial_receipt_date": mat.initial_receipt_date.isoformat() if mat.initial_receipt_date else None,
        })
    return results


def get_inventory_report(
    db: Session,
    warehouse: str = "ALL",
    search: str = "",
    category: str = "ALL",
    unit_main: str = "ALL",
    unit_conv: str = "ALL",
    stock_status: str = "ALL",
    inventory_days: str = "ALL",
    from_date: str = "",
    to_date: str = "",
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "item_code",
    sort_dir: str = "asc",
) -> dict:
    raw_items = compute_raw_items(db, from_date=from_date, to_date=to_date)
    target_wh = normalize_wh_code(warehouse)
    clean_search = (search or "").strip().lower()

    filtered = []
    for it in raw_items:
        if target_wh != "ALL" and it["warehouse_code"] != target_wh:
            continue
        if clean_search and clean_search not in it["item_code"].lower() and clean_search not in it["item_name"].lower():
            continue
        if category and category != "ALL" and it["category"] != category:
            continue
        if unit_main and unit_main != "ALL" and normalize_unit_code(it["unit_main"]) != normalize_unit_code(unit_main):
            continue
        if unit_conv and unit_conv != "ALL" and normalize_unit_code(it["unit_conversion"]) != normalize_unit_code(unit_conv):
            continue

        closing = float(it["closing_main"] or 0)
        if stock_status == "IN_STOCK" and closing <= 0:
            continue
        if stock_status == "OUT_OF_STOCK" and closing > 0:
            continue
        if stock_status == "LOW_STOCK" and (closing <= 0 or closing > 20):
            continue

        if inventory_days and inventory_days != "ALL":
            days_val = it["inventory_days"]
            if days_val == "Chưa xác định":
                continue
            d_num = int(days_val)
            if inventory_days in ("<30", "LT30") and d_num >= 30:
                continue
            if inventory_days in ("30-60", "30TO60") and (d_num < 30 or d_num > 60):
                continue
            if inventory_days in ("60-90", "60TO90") and (d_num < 60 or d_num > 90):
                continue
            if inventory_days in (">90", "GT90") and d_num <= 90:
                continue

        filtered.append(it)

    reverse_sort = (sort_dir or "").lower() == "desc"
    def sort_key(x):
        val = x.get(sort_by)
        if val is None:
            return (1, "")
        if isinstance(val, (int, float)):
            return (0, float(val))
        return (0, str(val).lower())

    filtered.sort(key=sort_key, reverse=reverse_sort)

    # Quy tắc không cộng gộp khác ĐVT cho dòng Tổng cộng
    distinct_units = {normalize_unit_code(it["unit_main"]) for it in filtered if normalize_unit_code(it["unit_main"])}
    is_single_unit = len(distinct_units) == 1
    single_unit_name = filtered[0]["unit_main"] if is_single_unit and filtered else None

    def empty_total():
        return {"status": "empty", "unit": "—", "sum": None}

    totals = {
        "opening_main": empty_total(),
        "opening_conv": empty_total(),
        "in_main": empty_total(),
        "in_conv": empty_total(),
        "out_main": empty_total(),
        "out_conv": empty_total(),
        "closing_main": empty_total(),
        "closing_conv": empty_total(),
        "return_main": empty_total(),
        "return_conv": empty_total(),
        "inventory_days": empty_total(),
    }

    if filtered:
        if is_single_unit:
            for field in ["opening_main", "in_main", "out_main", "closing_main", "return_main"]:
                totals[field] = {
                    "status": "single",
                    "unit": single_unit_name,
                    "sum": round(sum(float(it[field] or 0) for it in filtered), 2),
                }
        else:
            for field in ["opening_main", "in_main", "out_main", "closing_main", "return_main"]:
                totals[field] = {"status": "multiple", "unit": "Đa đơn vị", "sum": None}

    total_count = len(filtered)
    safe_size = max(1, page_size)
    total_pages = max(1, (total_count + safe_size - 1) // safe_size)
    safe_page = max(1, min(page, total_pages))
    start_idx = (safe_page - 1) * safe_size
    paginated = filtered[start_idx: start_idx + safe_size]

    return {
        "items": paginated,
        "allItems": filtered,
        "totalCount": total_count,
        "totalPages": total_pages,
        "page": safe_page,
        "pageSize": safe_size,
        "totals": totals,
        "kpis": {
            "totalItems": total_count,
            "isSingleUnit": is_single_unit,
            "singleUnitName": single_unit_name,
            "itemsWithOpening": sum(1 for it in filtered if float(it["opening_main"] or 0) > 0),
            "itemsWithIn": sum(1 for it in filtered if float(it["in_main"] or 0) > 0),
            "itemsWithOut": sum(1 for it in filtered if float(it["out_main"] or 0) > 0),
        },
    }


def get_warehouse_counts(db: Session) -> dict:
    raw_items = compute_raw_items(db)
    counts = {"ALL": len(raw_items)}
    for code in WAREHOUSE_NAME_BY_CODE.keys():
        counts[code] = sum(1 for it in raw_items if it["warehouse_code"] == code)
    return counts


def check_available_stock(db: Session, warehouse_name: str, item_code: str) -> dict:
    raw_items = compute_raw_items(db)
    wh_full = normalize_wh_name(warehouse_name)
    code_clean = (item_code or "").strip().lower()
    match = next((it for it in raw_items if it["item_code"].lower() == code_clean and it["warehouse_name"] == wh_full), None)
    if not match:
        match = next((it for it in raw_items if it["item_code"].lower() == code_clean), None)
    if not match:
        return {"available": 0, "available_stock": 0, "unit": "", "item_name": ""}
    return {
        "available": float(match["closing_main"]),
        "available_stock": float(match["closing_main"]),
        "unit": match["unit_main"],
        "item_name": match["item_name"],
    }


# ==========================================
# RECEIPTS CRUD & FILTER
# ==========================================
def filter_receipts(
    db: Session,
    search: str = "",
    warehouse: str = "ALL",
    receipt_type: str = "ALL",
    status: str = "ALL",
    department: str = "ALL",
    created_by: str = "ALL",
    created_channel: str = "ALL",
    customer: str = "",
    from_date: str = "",
    to_date: str = "",
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "receipt_date",
    sort_dir: str = "desc",
) -> dict:
    rows = db.query(GoodsReceipt).options(joinedload(GoodsReceipt.items)).filter(GoodsReceipt.is_deleted == False).all()
    all_serialized = [_serialize_receipt(r) for r in rows]

    clean_search = (search or "").strip().lower()
    clean_cust = (customer or "").strip().lower()
    wh_norm = normalize_wh_name(warehouse) if warehouse and warehouse != "ALL" else "ALL"

    filtered = []
    for r in all_serialized:
        if clean_search:
            items_txt = " ".join(
                f"{it.get('item_code', '')} {it.get('item_name', '')} {it.get('lsx', '')}"
                for it in (r.get("items") or [])
            )
            haystack = f"{r['voucher_no']} {r['deliverer_name']} {r['customer_name']} {r['department_name']} {r['content']} {r['ctgs']} {items_txt}".lower()
            if clean_search not in haystack:
                continue
        if wh_norm != "ALL" and normalize_wh_name(r["warehouse_name"]) != wh_norm:
            continue
        if receipt_type and receipt_type != "ALL" and r["receipt_type"] != receipt_type:
            continue
        if status and status != "ALL" and r["status"] != status:
            continue
        if department and department != "ALL" and r["department_name"] != department:
            continue
        if created_by and created_by != "ALL" and r["created_by"] != created_by:
            continue
        if created_channel and created_channel != "ALL" and r["created_channel"].lower() != created_channel.lower():
            continue
        if clean_cust and clean_cust not in (r["customer_name"] + " " + r["customer_code"]).lower():
            continue
        if from_date and r["receipt_date"] < from_date:
            continue
        if to_date and r["receipt_date"] > to_date:
            continue
        filtered.append(r)

    reverse_sort = (sort_dir or "desc").lower() == "desc"
    filtered.sort(key=lambda x: str(x.get(sort_by) or "").lower(), reverse=reverse_sort)

    total_lines = sum(int(r.get("total_lines") or len(r.get("items") or [])) for r in filtered)
    total_qty = round(sum(float(r.get("total_quantity") or 0) for r in filtered), 2)
    stats = {
        "total": len(filtered),
        "total_vouchers": len(filtered),
        "total_lines": total_lines,
        "total_quantity": total_qty,
        "total_value": 0,
        "completed": sum(1 for r in filtered if r["status"] == "COMPLETED"),
        "pending": sum(1 for r in filtered if r["status"] in ("PENDING", "PROCESSING")),
        "mobileCount": sum(1 for r in filtered if r["created_channel"] == "Mobile"),
        "totalQuantity": total_qty,
    }

    total_count = len(filtered)
    safe_size = max(1, page_size)
    total_pages = max(1, (total_count + safe_size - 1) // safe_size)
    safe_page = max(1, min(page, total_pages))
    start_idx = (safe_page - 1) * safe_size

    return {
        "data": filtered[start_idx: start_idx + safe_size],
        "totalCount": total_count,
        "totalPages": total_pages,
        "page": safe_page,
        "pageSize": safe_size,
        "stats": stats,
    }


def _resolve_receipt_item_code(db: Session, item_code: Optional[str], item_name: str, line_no: int = 1) -> str:
    explicit = (item_code or "").strip()
    if explicit:
        return explicit[:50]
    clean_name = (item_name or "").strip()
    if clean_name:
        existing_mat = (
            db.query(WarehouseMaterial)
            .filter(func.lower(WarehouseMaterial.item_name) == clean_name.lower())
            .first()
        )
        if existing_mat and existing_mat.item_code:
            return existing_mat.item_code
        ascii_name = unicodedata.normalize("NFD", clean_name.replace("đ", "d").replace("Đ", "D"))
        ascii_name = "".join(ch for ch in ascii_name if unicodedata.category(ch) != "Mn")
        slug = re.sub(r"[^A-Z0-9]+", "-", ascii_name.upper()).strip("-")
        if slug:
            return slug[:32]
    return f"SP-{line_no:03d}"


def _build_receipt_item_row(db: Session, wh_name: str, ref_date: date, idx: int, it) -> Tuple[GoodsReceiptItem, float]:
    clean_name = (getattr(it, "item_name", None) or "").strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail=f"Dòng {idx}: Vui lòng nhập tên sản phẩm.")
    q1 = _resolve_item_qty1(it)
    if q1 <= 0:
        raise HTTPException(status_code=400, detail=f"Dòng {idx}: Số lượng nhập phải lớn hơn 0.")
    u1 = (it.unit1 or it.unit or "").strip() or "Cái"
    conv_rate = float(it.conversion_rate or 1.0)
    q2 = float(it.quantity2 if it.quantity2 is not None else round(q1 * conv_rate, 2))
    resolved_code = _resolve_receipt_item_code(db, getattr(it, "item_code", None), clean_name, idx)

    _ensure_material_exists(db, wh_name, resolved_code, clean_name, u1, it.unit2, conv_rate, ref_date)
    row = GoodsReceiptItem(
        line_no=idx,
        item_code=resolved_code,
        item_name=clean_name,
        image_url=it.image_url or it.image,
        unit1=u1,
        quantity1=q1,
        unit2=it.unit2 or "",
        quantity2=q2,
        conversion_rate=conv_rate,
        lsx=it.lsx,
        package_split=it.package_split,
        notes=it.notes,
    )
    return row, q1


def create_receipt(db: Session, payload, username: str = "Người dùng") -> dict:
    if not payload.items:
        raise HTTPException(status_code=400, detail="Phiếu nhập kho phải có ít nhất một dòng mặt hàng.")

    v_no = (payload.voucher_no or "").strip()
    if not v_no:
        ym = payload.receipt_date.strftime("%y%m")
        count = db.query(GoodsReceipt).count() + 1
        v_no = f"PNK-{ym}-{count:04d}"

    dup = db.query(GoodsReceipt).filter(GoodsReceipt.voucher_no == v_no).first()
    if dup:
        raise HTTPException(status_code=400, detail=f"Mã phiếu '{v_no}' đã tồn tại.")

    wh_name = normalize_wh_name(payload.warehouse_name)
    wh_code = normalize_wh_code(payload.warehouse_code or wh_name)
    st = payload.status or "PENDING"

    rcp = GoodsReceipt(
        voucher_no=v_no,
        warehouse_code=wh_code,
        warehouse_name=wh_name,
        receipt_date=payload.receipt_date,
        deliverer_name=payload.deliverer_name,
        customer_code=payload.customer_code,
        customer_name=payload.customer_name,
        department_name=payload.department_name,
        content=payload.content,
        receipt_type=payload.receipt_type or "Nhập mua hàng",
        status=st,
        ctgs=payload.ctgs,
        created_by=payload.created_by or username,
        created_channel=_normalize_channel(getattr(payload, "created_channel", None)),
        confirmed_by=username if st == "COMPLETED" else None,
        confirmed_at=datetime.now() if st == "COMPLETED" else None,
        images_json=_dump_images_json(getattr(payload, "images", None)),
    )

    total_qty = 0.0
    for idx, it in enumerate(payload.items, 1):
        row, q1 = _build_receipt_item_row(db, wh_name, payload.receipt_date, idx, it)
        total_qty += q1
        rcp.items.append(row)

    rcp.total_lines = len(rcp.items)
    rcp.total_quantity = total_qty
    db.add(rcp)
    db.commit()
    db.refresh(rcp)
    return _serialize_receipt(rcp)


def update_receipt(db: Session, receipt_id: int, payload, username: str = "Người dùng") -> dict:
    rcp = db.query(GoodsReceipt).options(joinedload(GoodsReceipt.items)).filter(
        GoodsReceipt.id == receipt_id, GoodsReceipt.is_deleted == False
    ).first()
    if not rcp:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu nhập kho.")

    if payload.voucher_no is not None:
        rcp.voucher_no = payload.voucher_no.strip()
    if payload.warehouse_name is not None:
        rcp.warehouse_name = normalize_wh_name(payload.warehouse_name)
        rcp.warehouse_code = normalize_wh_code(rcp.warehouse_name)
    if payload.receipt_date is not None:
        rcp.receipt_date = payload.receipt_date
    for field in ["deliverer_name", "customer_code", "customer_name", "department_name", "content", "receipt_type", "status", "ctgs"]:
        val = getattr(payload, field, None)
        if val is not None:
            setattr(rcp, field, val)
    if getattr(payload, "status", None) == "COMPLETED" and not rcp.confirmed_at:
        rcp.confirmed_by = username
        rcp.confirmed_at = datetime.now()
    if getattr(payload, "images", None) is not None:
        rcp.images_json = _dump_images_json(payload.images)

    if payload.items is not None:
        rcp.items.clear()
        total_qty = 0.0
        for idx, it in enumerate(payload.items, 1):
            row, q1 = _build_receipt_item_row(db, rcp.warehouse_name, rcp.receipt_date, idx, it)
            total_qty += q1
            rcp.items.append(row)
        rcp.total_lines = len(rcp.items)
        rcp.total_quantity = total_qty

    rcp.updated_at = datetime.now()
    db.commit()
    db.refresh(rcp)
    return _serialize_receipt(rcp)


def confirm_receipt(db: Session, receipt_id: int, username: str = "Thủ kho", notes: Optional[str] = None, images: Optional[List[str]] = None) -> dict:
    rcp = db.query(GoodsReceipt).options(joinedload(GoodsReceipt.items)).filter(
        GoodsReceipt.id == receipt_id, GoodsReceipt.is_deleted == False
    ).first()
    if not rcp:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu nhập kho.")
    if rcp.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Phiếu đã hủy, không thể xác nhận nhập kho.")

    rcp.status = "COMPLETED"
    rcp.confirmed_by = username
    rcp.confirmed_at = datetime.now()
    if notes:
        rcp.content = f"{rcp.content} | Xác nhận: {notes}".strip(" |") if rcp.content else notes
    if images:
        existing_imgs = _parse_images_json(getattr(rcp, "images_json", None))
        merged = list(dict.fromkeys([*existing_imgs, *images]))
        rcp.images_json = _dump_images_json(merged)
    rcp.updated_at = datetime.now()
    db.commit()
    db.refresh(rcp)
    return _serialize_receipt(rcp)


def delete_receipts(db: Session, ids: List[int]) -> int:
    count = db.query(GoodsReceipt).filter(GoodsReceipt.id.in_(ids)).update(
        {"is_deleted": True, "updated_at": datetime.now()}, synchronize_session=False
    )
    db.commit()
    return count


# ==========================================
# ISSUES CRUD & FILTER (Kèm Check Tồn Kho)
# ==========================================
def filter_issues(
    db: Session,
    search: str = "",
    warehouse: str = "ALL",
    issue_type: str = "ALL",
    status: str = "ALL",
    department: str = "ALL",
    created_by: str = "ALL",
    created_channel: str = "ALL",
    customer: str = "",
    from_date: str = "",
    to_date: str = "",
    factory_id: Optional[int] = None,
    factory_name: str = "",
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "issue_date",
    sort_dir: str = "desc",
) -> dict:
    rows = db.query(GoodsIssue).options(joinedload(GoodsIssue.items)).filter(GoodsIssue.is_deleted == False).all()
    all_serialized = [_serialize_issue(iss) for iss in rows]

    clean_search = (search or "").strip().lower()
    clean_cust = (customer or "").strip().lower()
    wh_norm = normalize_wh_name(warehouse) if warehouse and warehouse != "ALL" else "ALL"
    clean_fac_name = (factory_name or "").strip()
    has_fac_filter = bool(factory_id) or (clean_fac_name != "" and clean_fac_name != "ALL")
    target_factory = _resolve_factory(db, factory_id, clean_fac_name) if has_fac_filter else None

    filtered = []
    for r in all_serialized:
        if clean_search:
            items_txt = " ".join(
                f"{it.get('item_code', '')} {it.get('item_name', '')} {it.get('lsx', '')}"
                for it in (r.get("items") or [])
            )
            haystack = f"{r['voucher_no']} {r['deliverer_name']} {r['receiver_name']} {r['department_name']} {r['factory_name']} {r['customer_name']} {r['content']} {r['ctgs']} {items_txt}".lower()
            if clean_search not in haystack:
                continue
        if wh_norm != "ALL" and normalize_wh_name(r["warehouse_name"]) != wh_norm:
            continue
        if issue_type and issue_type != "ALL" and r["issue_type"] != issue_type:
            continue
        if status and status != "ALL" and r["status"] != status:
            continue
        if department and department != "ALL" and r["department_name"] != department:
            continue
        if has_fac_filter and not _factories_match(target_factory, r.get("factory_id"), r.get("factory_name")):
            continue
        if created_by and created_by != "ALL" and r["created_by"] != created_by:
            continue
        if created_channel and created_channel != "ALL" and r["created_channel"].lower() != created_channel.lower():
            continue
        if clean_cust and clean_cust not in (r["customer_name"] + " " + r["customer_code"]).lower():
            continue
        if from_date and r["issue_date"] < from_date:
            continue
        if to_date and r["issue_date"] > to_date:
            continue
        filtered.append(r)

    reverse_sort = (sort_dir or "desc").lower() == "desc"
    filtered.sort(key=lambda x: str(x.get(sort_by) or "").lower(), reverse=reverse_sort)

    total_lines = sum(int(r.get("total_lines") or len(r.get("items") or [])) for r in filtered)
    total_qty = round(sum(float(r.get("total_quantity") or 0) for r in filtered), 2)
    total_val = round(sum(float(r.get("total_amount") or 0) for r in filtered), 2)
    stats = {
        "total": len(filtered),
        "total_vouchers": len(filtered),
        "total_lines": total_lines,
        "total_quantity": total_qty,
        "total_value": total_val,
        "completed": sum(1 for r in filtered if r["status"] == "COMPLETED"),
        "pending": sum(1 for r in filtered if r["status"] in ("PENDING", "PROCESSING")),
        "mobileCount": sum(1 for r in filtered if r["created_channel"] == "Mobile"),
        "totalQuantity": total_qty,
    }

    total_count = len(filtered)
    safe_size = max(1, page_size)
    total_pages = max(1, (total_count + safe_size - 1) // safe_size)
    safe_page = max(1, min(page, total_pages))
    start_idx = (safe_page - 1) * safe_size

    return {
        "data": filtered[start_idx: start_idx + safe_size],
        "totalCount": total_count,
        "totalPages": total_pages,
        "page": safe_page,
        "pageSize": safe_size,
        "stats": stats,
    }


def create_issue(db: Session, payload, username: str = "Người dùng") -> dict:
    if not payload.items:
        raise HTTPException(status_code=400, detail="Phiếu xuất kho phải có ít nhất một dòng mặt hàng.")

    v_no = (payload.voucher_no or "").strip()
    if not v_no:
        ym = payload.issue_date.strftime("%y%m")
        count = db.query(GoodsIssue).count() + 1
        v_no = f"PXK-{ym}-{count:04d}"

    dup = db.query(GoodsIssue).filter(GoodsIssue.voucher_no == v_no).first()
    if dup:
        raise HTTPException(status_code=400, detail=f"Mã phiếu '{v_no}' đã tồn tại.")

    wh_name = normalize_wh_name(payload.warehouse_name)
    wh_code = normalize_wh_code(payload.warehouse_code or wh_name)
    st = payload.status or "PENDING"
    is_deducting = st not in ("DRAFT", "CANCELLED")
    fac = _resolve_factory(db, getattr(payload, "factory_id", None), getattr(payload, "factory_name", None))

    iss = GoodsIssue(
        voucher_no=v_no,
        warehouse_code=wh_code,
        warehouse_name=wh_name,
        issue_date=payload.issue_date,
        deliverer_name=payload.deliverer_name or username,
        receiver_name=getattr(payload, "receiver_name", None),
        customer_code=payload.customer_code,
        customer_name=payload.customer_name,
        department_name=payload.department_name,
        factory_id=fac["factory_id"],
        factory_name=fac["factory_name"] or None,
        content=payload.content,
        issue_type=payload.issue_type or "Xuất sản xuất",
        status=st,
        ctgs=payload.ctgs,
        created_by=payload.created_by or username,
        created_channel=_normalize_channel(getattr(payload, "created_channel", None)),
        confirmed_by=username if st == "COMPLETED" else None,
        confirmed_at=datetime.now() if st == "COMPLETED" else None,
        images_json=_dump_images_json(getattr(payload, "images", None)),
    )

    total_qty = 0.0
    total_amt = 0.0
    for idx, it in enumerate(payload.items, 1):
        q1 = _resolve_item_qty1(it)
        if q1 <= 0:
            raise HTTPException(status_code=400, detail=f"Dòng {idx}: Số lượng xuất phải lớn hơn 0.")

        # Chống xuất âm kho khi phiếu có hiệu lực xuất
        if is_deducting:
            stock_info = check_available_stock(db, wh_name, it.item_code)
            avail = stock_info["available"]
            if q1 > avail + 0.0001:
                raise HTTPException(
                    status_code=400,
                    detail=f"Vật tư '{it.item_code}' tại {wh_name} chỉ còn tồn khả dụng {avail} {stock_info['unit']}, không đủ để xuất {q1}."
                )

        u1 = it.unit1 or it.unit or "Cái"
        conv_rate = float(it.conversion_rate or 1.0)
        q2 = float(it.quantity2 if it.quantity2 is not None else round(q1 * conv_rate, 2))
        price = float(it.unit_price or 0.0)
        amt = float(it.amount if it.amount else round(q1 * price, 2))
        total_qty += q1
        total_amt += amt

        iss.items.append(GoodsIssueItem(
            line_no=idx,
            item_code=it.item_code.strip(),
            item_name=it.item_name.strip(),
            image_url=it.image_url or it.image,
            unit1=u1,
            quantity1=q1,
            unit2=it.unit2 or "",
            quantity2=q2,
            conversion_rate=conv_rate,
            unit_price=price,
            amount=amt,
            lsx=it.lsx,
            package_split=it.package_split,
            notes=it.notes,
        ))

    iss.total_lines = len(iss.items)
    iss.total_quantity = total_qty
    iss.total_amount = total_amt
    db.add(iss)
    db.commit()
    db.refresh(iss)
    return _serialize_issue(iss)


def update_issue(db: Session, issue_id: int, payload, username: str = "Người dùng") -> dict:
    iss = db.query(GoodsIssue).options(joinedload(GoodsIssue.items)).filter(
        GoodsIssue.id == issue_id, GoodsIssue.is_deleted == False
    ).first()
    if not iss:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu xuất kho.")

    if payload.voucher_no is not None:
        iss.voucher_no = payload.voucher_no.strip()
    if payload.warehouse_name is not None:
        iss.warehouse_name = normalize_wh_name(payload.warehouse_name)
        iss.warehouse_code = normalize_wh_code(iss.warehouse_name)
    if payload.issue_date is not None:
        iss.issue_date = payload.issue_date
    for field in ["deliverer_name", "receiver_name", "customer_code", "customer_name", "department_name", "content", "issue_type", "status", "ctgs"]:
        val = getattr(payload, field, None)
        if val is not None:
            setattr(iss, field, val)
    if getattr(payload, "factory_id", None) is not None or getattr(payload, "factory_name", None) is not None:
        fac = _resolve_factory(db, getattr(payload, "factory_id", None), getattr(payload, "factory_name", None))
        iss.factory_id = fac["factory_id"]
        iss.factory_name = fac["factory_name"] or None
    if getattr(payload, "status", None) == "COMPLETED" and not iss.confirmed_at:
        iss.confirmed_by = username
        iss.confirmed_at = datetime.now()
    if getattr(payload, "images", None) is not None:
        iss.images_json = _dump_images_json(payload.images)

    if payload.items is not None:
        iss.items.clear()
        total_qty = 0.0
        total_amt = 0.0
        for idx, it in enumerate(payload.items, 1):
            q1 = _resolve_item_qty1(it)
            if q1 <= 0:
                raise HTTPException(status_code=400, detail=f"Dòng {idx}: Số lượng xuất phải lớn hơn 0.")
            u1 = it.unit1 or it.unit or "Cái"
            conv_rate = float(it.conversion_rate or 1.0)
            q2 = float(it.quantity2 if it.quantity2 is not None else round(q1 * conv_rate, 2))
            price = float(it.unit_price or 0.0)
            amt = float(it.amount if it.amount else round(q1 * price, 2))
            total_qty += q1
            total_amt += amt

            iss.items.append(GoodsIssueItem(
                line_no=idx,
                item_code=it.item_code.strip(),
                item_name=it.item_name.strip(),
                image_url=it.image_url or it.image,
                unit1=u1,
                quantity1=q1,
                unit2=it.unit2 or "",
                quantity2=q2,
                conversion_rate=conv_rate,
                unit_price=price,
                amount=amt,
                lsx=it.lsx,
                package_split=it.package_split,
                notes=it.notes,
            ))
        iss.total_lines = len(iss.items)
        iss.total_quantity = total_qty
        iss.total_amount = total_amt

    iss.updated_at = datetime.now()
    db.commit()
    db.refresh(iss)
    return _serialize_issue(iss)


def confirm_issue(db: Session, issue_id: int, username: str = "Người nhận", receiver_name: Optional[str] = None, notes: Optional[str] = None, images: Optional[List[str]] = None) -> dict:
    iss = db.query(GoodsIssue).options(joinedload(GoodsIssue.items)).filter(
        GoodsIssue.id == issue_id, GoodsIssue.is_deleted == False
    ).first()
    if not iss:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu bàn giao / xuất kho.")
    if iss.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Phiếu đã hủy, không thể xác nhận.")

    if iss.status == "DRAFT":
        for it in (iss.items or []):
            stock_info = check_available_stock(db, iss.warehouse_name, it.item_code)
            if float(it.quantity1 or 0) > stock_info["available"] + 0.0001:
                raise HTTPException(
                    status_code=400,
                    detail=f"Vật tư '{it.item_code}' tại {iss.warehouse_name} chỉ còn tồn khả dụng {stock_info['available']}, không đủ xác nhận bàn giao {it.quantity1}."
                )

    iss.status = "COMPLETED"
    if receiver_name and receiver_name.strip():
        iss.receiver_name = receiver_name.strip()
    elif not iss.receiver_name:
        iss.receiver_name = username
    iss.confirmed_by = username
    iss.confirmed_at = datetime.now()
    if notes:
        iss.content = f"{iss.content} | Nhận bàn giao: {notes}".strip(" |") if iss.content else notes
    if images:
        existing_imgs = _parse_images_json(getattr(iss, "images_json", None))
        merged = list(dict.fromkeys([*existing_imgs, *images]))
        iss.images_json = _dump_images_json(merged)
    iss.updated_at = datetime.now()
    db.commit()
    db.refresh(iss)
    return _serialize_issue(iss)


def delete_issues(db: Session, ids: List[int]) -> int:
    count = db.query(GoodsIssue).filter(GoodsIssue.id.in_(ids)).update(
        {"is_deleted": True, "updated_at": datetime.now()}, synchronize_session=False
    )
    db.commit()
    return count


# ==========================================
# REJECTED GOODS CRUD & TREND CHART
# ==========================================
def filter_rejected_goods(
    db: Session,
    warehouse_code: str = "ALL",
    source_type: str = "ALL",
    status: str = "ALL",
    resolution: str = "ALL",
    defect_category: str = "ALL",
    created_channel: str = "ALL",
    search: str = "",
    from_date: str = "",
    to_date: str = "",
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> dict:
    rows = db.query(RejectedGoods).filter(RejectedGoods.is_deleted == False).order_by(
        RejectedGoods.created_date.desc(), RejectedGoods.id.desc()
    ).all()
    all_serialized = [_serialize_rejected(rg) for rg in rows]

    wh_norm = normalize_wh_code(warehouse_code) if warehouse_code and warehouse_code != "ALL" else "ALL"
    clean_search = (search or "").strip().lower()

    filtered = []
    for r in all_serialized:
        if wh_norm != "ALL" and r["warehouse_code"] != wh_norm:
            continue
        if source_type and source_type != "ALL" and r["source_type"] != source_type:
            continue
        if status and status != "ALL" and r["status"] != status:
            continue
        if resolution and resolution != "ALL" and r["resolution"] != resolution:
            continue
        if defect_category and defect_category != "ALL" and (r.get("defect_category") or "") != defect_category:
            continue
        if created_channel and created_channel != "ALL" and r["created_channel"].lower() != created_channel.lower():
            continue
        if from_date and r["created_date"] < from_date:
            continue
        if to_date and r["created_date"] > to_date:
            continue
        if clean_search:
            hay = f"{r['voucher_no']} {r['item_code']} {r['item_name']} {r['origin_voucher_no']} {r['defect_reason']} {r['department_name']} {r['returned_by']}".lower()
            if clean_search not in hay:
                continue
        filtered.append(r)

    total_count = len(filtered)
    total_qty = round(sum(float(r["quantity_main"] or 0) for r in filtered), 2)
    pending_cnt = sum(1 for r in filtered if r["status"] == "PENDING")
    resolved_cnt = sum(1 for r in filtered if r["status"] == "RESOLVED")
    stats = {
        "totalVouchers": total_count,
        "qcIncomingCount": sum(1 for r in filtered if r["source_type"] == "QC_INCOMING"),
        "prodReturnCount": sum(1 for r in filtered if r["source_type"] == "PROD_RETURN"),
        "pendingCount": pending_cnt,
        "resolvedCount": resolved_cnt,
        "mobileCount": sum(1 for r in filtered if r["created_channel"] == "Mobile"),
        "totalQuantity": total_qty,
        "total_vouchers": total_count,
        "total_quantity": total_qty,
        "pending_count": pending_cnt,
        "resolved_count": resolved_cnt,
        "reused_count": sum(1 for r in filtered if r["resolution"] == "REUSE"),
        "scrap_count": sum(1 for r in filtered if r["resolution"] == "SCRAP"),
        "return_vendor_count": sum(1 for r in filtered if r["resolution"] == "RETURN_VENDOR"),
    }

    if page is not None and page_size is not None:
        safe_size = max(1, page_size)
        total_pages = max(1, (total_count + safe_size - 1) // safe_size)
        safe_page = max(1, min(page, total_pages))
        start_idx = (safe_page - 1) * safe_size
        page_rows = filtered[start_idx: start_idx + safe_size]
    else:
        safe_size = total_count or 25
        total_pages = 1
        safe_page = 1
        page_rows = filtered

    return {
        "data": page_rows,
        "totalCount": total_count,
        "totalPages": total_pages,
        "page": safe_page,
        "pageSize": safe_size,
        "stats": stats,
    }


def create_rejected(db: Session, payload, username: str = "QC / Thủ kho", account_factory: Optional[dict] = None) -> dict:
    c_date = payload.created_date or date.today()
    v_no = (payload.voucher_no or "").strip()
    return_mode = (getattr(payload, "return_mode", None) or "DEFECTIVE").upper()
    if not v_no:
        if return_mode == "GOOD_EXCESS":
            prefix = "PTV"
        else:
            prefix = "HL-QC" if payload.source_type == "QC_INCOMING" else "HL-SX"
        cnt = db.query(RejectedGoods).count() + 1
        v_no = f"{prefix}-{c_date.strftime('%y%m')}-{cnt:04d}"

    wh_name = normalize_wh_name(payload.warehouse_name or payload.warehouse_code)
    wh_code = normalize_wh_code(payload.warehouse_code or wh_name)
    conv_rate = float(payload.conversion_rate or 1.0)
    q_main = float(payload.quantity_main)
    q_conv = float(payload.quantity_conv if payload.quantity_conv is not None else round(q_main * conv_rate, 2))
    st = payload.status or "PENDING"
    res = payload.resolution or ("REUSE" if return_mode == "GOOD_EXCESS" and st == "RESOLVED" else "PENDING")

    fac_id = getattr(payload, "factory_id", None)
    fac_name = getattr(payload, "factory_name", None)
    if not fac_id and not fac_name and payload.origin_voucher_id:
        orig_iss = db.query(GoodsIssue).filter(GoodsIssue.id == payload.origin_voucher_id, GoodsIssue.is_deleted == False).first()
        if orig_iss:
            fac_id = getattr(orig_iss, "factory_id", None)
            fac_name = getattr(orig_iss, "factory_name", None)
    if not fac_id and not fac_name and account_factory:
        fac_id = account_factory.get("factory_id")
        fac_name = account_factory.get("factory_name")
    fac = _resolve_factory(db, fac_id, fac_name)

    _ensure_material_exists(
        db,
        wh_name or "Kho nguyên liệu chính",
        payload.item_code,
        payload.item_name,
        payload.unit_main or "Cái",
        payload.unit_conversion,
        conv_rate,
        c_date,
    )

    rg = RejectedGoods(
        voucher_no=v_no,
        created_date=c_date,
        source_type=payload.source_type,
        return_mode=return_mode,
        origin_voucher_id=payload.origin_voucher_id,
        origin_voucher_no=payload.origin_voucher_no,
        origin_line_id=payload.origin_line_id,
        warehouse_code=wh_code,
        warehouse_name=wh_name,
        department_name=getattr(payload, "department_name", None),
        factory_id=fac["factory_id"],
        factory_name=fac["factory_name"] or None,
        item_code=payload.item_code.strip(),
        item_name=payload.item_name.strip(),
        unit_main=payload.unit_main or "Cái",
        unit_conversion=payload.unit_conversion or "",
        conversion_rate=conv_rate,
        quantity_main=q_main,
        quantity_conv=q_conv,
        defect_category=payload.defect_category,
        defect_reason=payload.defect_reason,
        resolution=res,
        status=st,
        resolution_date=c_date if st == "RESOLVED" else None,
        created_by=payload.created_by or username,
        created_channel=_normalize_channel(getattr(payload, "created_channel", None)),
        returned_by=getattr(payload, "returned_by", None) or payload.created_by or username,
        received_by=username if st == "RESOLVED" else None,
        received_at=datetime.now() if st == "RESOLVED" else None,
        images_json=_dump_images_json(getattr(payload, "images", None)),
        is_demo=False,
    )
    db.add(rg)
    db.commit()
    db.refresh(rg)
    return _serialize_rejected(rg)


def resolve_rejected(db: Session, rg_id: int, resolution: str, notes: str = "", resolution_date: Optional[date] = None, username: str = "Thủ kho", images: Optional[List[str]] = None) -> dict:
    rg = db.query(RejectedGoods).filter(RejectedGoods.id == rg_id, RejectedGoods.is_deleted == False).first()
    if not rg:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu hàng loại / trả về.")
    rg.resolution = resolution
    rg.status = "RESOLVED"
    rg.resolution_notes = notes
    rg.resolution_date = resolution_date or date.today()
    rg.received_by = username
    rg.received_at = datetime.now()
    if images:
        existing_imgs = _parse_images_json(getattr(rg, "images_json", None))
        merged = list(dict.fromkeys([*existing_imgs, *images]))
        rg.images_json = _dump_images_json(merged)
    rg.updated_at = datetime.now()
    db.commit()
    db.refresh(rg)
    return _serialize_rejected(rg)


def cancel_rejected(db: Session, rg_id: int, reason: str = "") -> dict:
    rg = db.query(RejectedGoods).filter(RejectedGoods.id == rg_id, RejectedGoods.is_deleted == False).first()
    if not rg:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu hàng loại.")
    rg.status = "CANCELLED"
    if reason:
        rg.resolution_notes = reason
    rg.updated_at = datetime.now()
    db.commit()
    db.refresh(rg)
    return _serialize_rejected(rg)


def get_mobile_meta(db: Session) -> dict:
    """
    Trả về toàn bộ danh mục nền từ CSDL để Mobile & Web Kho chọn trực tiếp, không hardcode:
    warehouses, units, departments (gồm cả stages), defect_categories, customers (gồm NCC/KH từ PO & Orders),
    orders, accounts, receipt_types, issue_types.
    """
    from modules.auth.models.departments import Department
    from modules.auth.models.accounts import Account
    from modules.production.models.stages import Stage
    from modules.inspection.models.defect_category import DefectCategory
    from modules.delivery.models.order import Order
    from modules.master.models.customer import Customer
    from modules.purchasing.models.purchase_order_item import PurchaseOrderItem
    from modules.hr.models.hr_models import HRFactoryStructure

    factories = [
        {
            "id": f.id,
            "code": f.structure_code or "",
            "name": f.structure_name or f.structure_code or f"Nhà máy {f.id}",
            "structure_type": f.structure_type or "Nhà máy",
        }
        for f in db.query(HRFactoryStructure).order_by(HRFactoryStructure.id.asc()).all()
        if (f.structure_code or "").strip().upper() != "KHO"
        and (f.structure_name or "").strip().upper() != "KHO"
    ]

    warehouses = [
        {"code": w.code, "name": w.name, "description": w.description or ""}
        for w in db.query(Warehouse).filter(Warehouse.is_active == True).order_by(Warehouse.sort_order.asc()).all()
    ]
    units = [
        {"id": u.id, "code": u.code, "full_name": u.full_name or "", "precision": u.precision}
        for u in db.query(UnitOfMeasure).filter(UnitOfMeasure.status == "ACTIVE").order_by(UnitOfMeasure.id.asc()).all()
    ]

    depts = []
    seen_dept_names = set()
    for d in db.query(Department).filter(Department.name.isnot(None), Department.account_id.is_(None)).order_by(Department.id.asc()).all():
        clean_name = (d.name or "").strip()
        if not clean_name or clean_name.lower() in seen_dept_names:
            continue
        seen_dept_names.add(clean_name.lower())
        depts.append({"id": d.id, "name": clean_name, "code": d.code or "", "source": "department"})

    stages = []
    for s in db.query(Stage).filter(Stage.is_active == True, Stage.name.isnot(None)).order_by(Stage.sequence.asc(), Stage.id.asc()).all():
        clean_name = (s.name or "").strip()
        if not clean_name:
            continue
        stages.append({"id": s.id, "name": clean_name, "code": s.code or ""})
        if clean_name.lower() not in seen_dept_names:
            seen_dept_names.add(clean_name.lower())
            depts.append({"id": f"stage-{s.id}", "name": clean_name, "code": s.code or "", "source": "stage"})

    defect_cats = [
        {"id": dc.id, "code": dc.code, "name": dc.name}
        for dc in db.query(DefectCategory).filter(DefectCategory.is_active == True).order_by(DefectCategory.order_index.asc(), DefectCategory.id.asc()).all()
    ]

    customers = []
    seen_cust_keys = set()
    for c in db.query(Customer).order_by(Customer.id.desc()).limit(200).all():
        c_code = (c.code or "").strip()
        c_name = (c.name or "").strip()
        key = (c_code.lower(), c_name.lower())
        if not c_name or key in seen_cust_keys:
            continue
        seen_cust_keys.add(key)
        customers.append({"id": c.id, "code": c_code, "name": c_name, "source": "customer"})

    # Bổ sung Khách hàng từ Đơn hàng sản xuất (Orders) khi bảng customers trống/thiếu
    order_custs = (
        db.query(Order.customer_code, Order.customer)
        .filter(Order.customer.isnot(None), Order.customer != "")
        .distinct()
        .limit(200)
        .all()
    )
    for idx, (c_code, c_name) in enumerate(order_custs):
        code_clean = (c_code or "").strip()
        name_clean = (c_name or "").strip()
        key = (code_clean.lower(), name_clean.lower())
        if not name_clean or key in seen_cust_keys:
            continue
        seen_cust_keys.add(key)
        customers.append({"id": f"ord-{idx+1}", "code": code_clean, "name": name_clean, "source": "order"})

    # Bổ sung Nhà cung cấp từ Đơn mua hàng (PurchaseOrderItems)
    po_suppliers = (
        db.query(PurchaseOrderItem.supplier_code, PurchaseOrderItem.supplier_name)
        .filter(PurchaseOrderItem.supplier_name.isnot(None), PurchaseOrderItem.supplier_name != "")
        .distinct()
        .limit(300)
        .all()
    )
    for idx, (s_code, s_name) in enumerate(po_suppliers):
        code_clean = (s_code or "").strip()
        name_clean = (s_name or "").strip()
        key = (code_clean.lower(), name_clean.lower())
        if not name_clean or key in seen_cust_keys:
            continue
        seen_cust_keys.add(key)
        customers.append({"id": f"sup-{idx+1}", "code": code_clean, "name": name_clean, "source": "supplier"})

    orders = [
        {"id": o.id, "order_code": o.order_code, "production_code": o.production_code or o.order_code, "customer": o.customer or ""}
        for o in db.query(Order).order_by(Order.id.desc()).limit(150).all()
    ]
    accounts = [
        {"id": a.id, "username": a.username, "full_name": a.full_name or a.name or a.username}
        for a in db.query(Account).filter(Account.is_active == True).order_by(Account.full_name.asc()).all()
    ]

    return {
        "warehouses": warehouses,
        "factories": factories,
        "units": units,
        "departments": depts,
        "stages": stages,
        "defect_categories": defect_cats,
        "customers": customers,
        "orders": orders,
        "accounts": accounts,
        "receipt_types": [
            "Nhập mua hàng",
            "Nhập thành phẩm sản xuất",
            "Nhập chuyển kho nội bộ",
            "Nhập thu hồi / Trả hàng",
            "Nhập gia công ngoài",
            "Nhập điều chỉnh kiểm kê",
        ],
        "issue_types": [
            "Xuất sản xuất",
            "Xuất đóng gói hoàn thiện",
            "Xuất chuyển kho nội bộ",
            "Xuất gia công ngoài",
            "Xuất bán hàng xuất khẩu",
            "Xuất hủy / thanh lý",
            "Xuất điều chỉnh kiểm kê",
        ],
    }


def get_factory_handovers_for_account(db: Session, current_user) -> dict:
    """
    Xác định Nhà máy của tài khoản đang đăng nhập và lấy danh sách phiếu bàn giao
    ĐÃ GIAO (status = 'COMPLETED') từ /warehouse/handover.
    - Tài khoản thuộc nhà máy sản xuất (NM1/NM2/NM3...): chỉ lấy phiếu đã giao của đúng nhà máy đó.
    - Tài khoản Văn Phòng / Kho hoặc Toàn quyền không gắn nhà máy SX: lấy các phiếu đã giao toàn hệ thống.
    """
    acct_factory = resolve_account_factory(db, current_user)
    has_factory = bool(acct_factory.get("factory_id") or acct_factory.get("factory_name"))
    f_code = (acct_factory.get("factory_code") or "").strip().upper()
    f_name_up = (acct_factory.get("factory_name") or "").strip().upper()
    is_admin_or_non_prod = (
        f_code in ("VP", "KHO")
        or f_name_up in ("VĂN PHÒNG", "KHO")
        or (not has_factory and getattr(current_user, "username", "") == "admin")
    )

    if not has_factory and not is_admin_or_non_prod:
        return {
            "factory": acct_factory,
            "has_factory": False,
            "is_all_factories_scope": False,
            "vouchers": [],
        }

    rows = (
        db.query(GoodsIssue)
        .options(joinedload(GoodsIssue.items))
        .filter(
            GoodsIssue.is_deleted == False,
            GoodsIssue.status == "COMPLETED",
        )
        .order_by(GoodsIssue.issue_date.desc(), GoodsIssue.id.desc())
        .all()
    )
    if is_admin_or_non_prod:
        matched = [_serialize_issue(iss) for iss in rows]
    else:
        matched = [
            _serialize_issue(iss)
            for iss in rows
            if _factories_match(acct_factory, getattr(iss, "factory_id", None), getattr(iss, "factory_name", None))
        ]
    return {
        "factory": acct_factory,
        "has_factory": has_factory or is_admin_or_non_prod,
        "is_all_factories_scope": is_admin_or_non_prod,
        "vouchers": matched,
    }


def search_catalog_items(
    db: Session,
    search: str = "",
    warehouse_code: str = "ALL",
    limit: int = 60,
) -> List[dict]:
    """
    Tìm kiếm & gợi ý danh mục vật tư / sản phẩm trực tiếp từ các bảng CSDL thật:
    1) WarehouseMaterial (ưu tiên tồn kho thực tế trong kho)
    2) PurchaseOrderItem (vật tư/linh kiện từ PO mua hàng)
    3) MasterProduct (sản phẩm mẫu / tủ)
    4) BOMDetail (fallback nếu vẫn chưa đủ kết quả và có từ khóa)
    """
    from modules.purchasing.models.purchase_order_item import PurchaseOrderItem
    from modules.master.models.master_product import MasterProduct
    from modules.production.models.bom_detail import BOMDetail

    q_str = (search or "").strip()
    q_lower = q_str.lower()
    wh_norm = normalize_wh_code(warehouse_code) if warehouse_code and warehouse_code != "ALL" else "ALL"
    max_limit = max(1, min(int(limit or 60), 200))

    results: List[dict] = []
    seen_codes = set()

    # 1. Tồn kho hiện có trong WarehouseMaterial
    raw_items = compute_raw_items(db)
    for it in raw_items:
        if wh_norm != "ALL" and it.get("warehouse_code") != wh_norm:
            continue
        code = (it.get("item_code") or "").strip()
        name = (it.get("item_name") or "").strip()
        if q_lower and q_lower not in code.lower() and q_lower not in name.lower():
            continue
        key = (code or name).lower()
        if not key or key in seen_codes:
            continue
        seen_codes.add(key)
        results.append({
            "item_code": code,
            "item_name": name,
            "unit": it.get("unit_main") or "Cái",
            "unit_main": it.get("unit_main") or "Cái",
            "unit1": it.get("unit_main") or "Cái",
            "unit2": it.get("unit_conversion") or "",
            "unit_conversion": it.get("unit_conversion") or "",
            "conversion_rate": float(it.get("conversion_rate") or 1.0),
            "closing_main": float(it.get("closing_main") or 0.0),
            "warehouse_code": it.get("warehouse_code") or "",
            "warehouse_name": it.get("warehouse_name") or "",
            "image_url": "",
            "po_code": "",
            "order_code": "",
            "supplier_name": "",
            "spec": "",
            "source": "Kho",
        })
        if len(results) >= max_limit:
            return results

    # 2. Vật tư / hàng mua từ PurchaseOrderItem
    po_query = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.item_name.isnot(None),
        PurchaseOrderItem.item_name != "",
    )
    if q_str:
        like_pat = f"%{q_str}%"
        po_query = po_query.filter(
            or_(
                PurchaseOrderItem.item_code.ilike(like_pat),
                PurchaseOrderItem.item_name.ilike(like_pat),
                PurchaseOrderItem.po_code.ilike(like_pat),
                PurchaseOrderItem.order_code.ilike(like_pat),
            )
        )
    po_rows = po_query.order_by(PurchaseOrderItem.id.desc()).limit(max_limit * 3).all()
    for po in po_rows:
        code = (po.item_code or "").strip() or (po.item_name or "").strip()[:30]
        name = (po.item_name or "").strip()
        key = code.lower()
        if not key or key in seen_codes:
            continue
        seen_codes.add(key)
        unit1 = (po.unit or "").strip() or "Cái"
        unit2 = (po.converted_unit or "").strip()
        results.append({
            "item_code": code,
            "item_name": name,
            "unit": unit1,
            "unit_main": unit1,
            "unit1": unit1,
            "unit2": unit2,
            "unit_conversion": unit2,
            "conversion_rate": 1.0,
            "closing_main": 0.0,
            "warehouse_code": "",
            "warehouse_name": "",
            "image_url": "",
            "po_code": po.po_code or "",
            "order_code": po.order_code or "",
            "supplier_name": po.supplier_name or "",
            "spec": "",
            "source": "PO mua hàng",
        })
        if len(results) >= max_limit:
            return results

    # 3. Sản phẩm mẫu từ MasterProduct
    mp_query = db.query(MasterProduct).filter(
        MasterProduct.sku.isnot(None),
        MasterProduct.name.isnot(None),
    )
    if q_str:
        like_pat = f"%{q_str}%"
        mp_query = mp_query.filter(
            or_(
                MasterProduct.sku.ilike(like_pat),
                MasterProduct.name.ilike(like_pat),
                MasterProduct.specification.ilike(like_pat),
            )
        )
    mp_rows = mp_query.order_by(MasterProduct.id.desc()).limit(max_limit * 2).all()
    for mp in mp_rows:
        code = (mp.sku or "").strip()
        name = (mp.name or "").strip()
        key = code.lower()
        if not key or key in seen_codes:
            continue
        seen_codes.add(key)
        unit1 = (mp.unit or "").strip() or "Cái"
        results.append({
            "item_code": code,
            "item_name": name,
            "unit": unit1,
            "unit_main": unit1,
            "unit1": unit1,
            "unit2": "",
            "unit_conversion": "",
            "conversion_rate": 1.0,
            "closing_main": 0.0,
            "warehouse_code": "",
            "warehouse_name": "",
            "image_url": mp.image_url or "",
            "po_code": "",
            "order_code": "",
            "supplier_name": "",
            "spec": mp.specification or "",
            "source": "SP mẫu",
        })
        if len(results) >= max_limit:
            return results

    # 4. Fallback BOMDetail khi tìm kiếm chi tiết chưa đủ kết quả
    if q_str and len(results) < max_limit:
        like_pat = f"%{q_str}%"
        bom_rows = (
            db.query(BOMDetail)
            .filter(
                BOMDetail.name.isnot(None),
                or_(
                    BOMDetail.sku.ilike(like_pat),
                    BOMDetail.name.ilike(like_pat),
                    BOMDetail.specification.ilike(like_pat),
                ),
            )
            .order_by(BOMDetail.id.desc())
            .limit(max_limit)
            .all()
        )
        for bom in bom_rows:
            code = (bom.sku or "").strip() or (bom.name or "").strip()[:30]
            name = (bom.name or "").strip()
            key = code.lower()
            if not key or key in seen_codes:
                continue
            seen_codes.add(key)
            unit1 = (bom.unit or "").strip() or "Cái"
            results.append({
                "item_code": code,
                "item_name": name,
                "unit": unit1,
                "unit_main": unit1,
                "unit1": unit1,
                "unit2": "",
                "unit_conversion": "",
                "conversion_rate": 1.0,
                "closing_main": 0.0,
                "warehouse_code": "",
                "warehouse_name": "",
                "image_url": "",
                "po_code": "",
                "order_code": "",
                "supplier_name": "",
                "spec": bom.specification or "",
                "source": "BOM",
            })
            if len(results) >= max_limit:
                break

    return results

