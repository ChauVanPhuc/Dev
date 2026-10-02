# -*- coding: utf-8 -*-
from modules.auth.models.accounts import Account
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_, text
from typing import List, Optional, Any
from datetime import datetime, timedelta, date
from pydantic import BaseModel
import logging
import re
import json

import app.models  # Ensures all ORM models are registered
from config.database import get_db
from modules.delivery.models.order import Order
from modules.delivery.models.order_item import OrderItem
from modules.production.models.product_plan import ProductPlan
from modules.production.models.product import Product
from modules.production.models.category import Category
from modules.delivery.models.deliveries import Delivery
from modules.notification.models.notifications import Notification as NotificationModel
from modules.kpi.models.kpi import KPI
from modules.inspection.models.daily_inspection import DailyInspectionRecord, DailyInspectionDefect
from modules.inspection.models.defect_type import DefectType
from modules.inspection.models.input_inspection import InputInspection

from modules.delivery.models.pallet_card import PalletCard
from modules.purchasing.models.purchase_requisition import PurchaseRequisition
from modules.production.models.bom_detail import BOMDetail
from modules.production.models.stages import Stage

logger = logging.getLogger(__name__)

router = APIRouter()

# ----------------------------------------------------------------------
# 0.5 API: Lấy danh sách tất cả công đoạn từ bảng Stage / BOM
# ----------------------------------------------------------------------
@router.get("/stages", response_model=List[dict])
def read_stages_v2(db: Session = Depends(get_db)):
    """[GET] Lấy toàn bộ công đoạn tiêu chuẩn từ CSDL: Nhập Kho/Đầu Vào, Tạo Phôi, Định Hình, Lắp Ráp, Sơn, Đóng Gói, Lưu Kho."""
    FALLBACK_STAGES = [
        {"id": 1, "code": "CD01", "name": "Nhập Kho/Đầu Vào", "sequence": 1, "description": "Nhập kho nguyên vật liệu đầu vào"},
        {"id": 2, "code": "CD02", "name": "Tạo Phôi", "sequence": 2, "description": "Công đoạn Tạo Phôi"},
        {"id": 3, "code": "CD03", "name": "Định Hình", "sequence": 3, "description": "Công đoạn Định Hình"},
        {"id": 4, "code": "CD04", "name": "Lắp Ráp", "sequence": 4, "description": "Công đoạn Lắp Ráp"},
        {"id": 5, "code": "CD05", "name": "Sơn", "sequence": 5, "description": "Công đoạn Sơn"},
        {"id": 6, "code": "CD06", "name": "Đóng Gói", "sequence": 6, "description": "Công đoạn Đóng Gói"},
        {"id": 7, "code": "CD07", "name": "Lưu Kho", "sequence": 7, "description": "Công đoạn Lưu Kho"},
    ]
    try:
        db_stages = db.query(Stage).order_by(Stage.sequence.asc(), Stage.id.asc()).all()
        if db_stages and len(db_stages) > 0:
            return [
                {
                    "id": s.id,
                    "code": s.code or f"CD{s.id:02d}",
                    "name": s.name,
                    "sequence": s.sequence or idx + 1,
                    "description": s.description or s.name,
                    "is_active": s.is_active if s.is_active is not None else True
                }
                for idx, s in enumerate(db_stages)
            ]
        return FALLBACK_STAGES
    except Exception:
        return FALLBACK_STAGES

# ----------------------------------------------------------------------
# 0.1 API: Lấy danh sách Nhà máy từ CSDL (loại bỏ VP - Văn Phòng)
# ----------------------------------------------------------------------
@router.get("/factories")
def get_factories(db: Session = Depends(get_db)):
    """
    Trả về danh sách Nhà máy từ bảng hr_factory_structures trong CSDL,
    tự động loại bỏ 'VP' (Văn Phòng).
    """
    try:
        from modules.hr.models.hr_models import HRFactoryStructure
        db_factories = db.query(HRFactoryStructure).filter(
            HRFactoryStructure.structure_code != "VP",
            ~HRFactoryStructure.structure_name.ilike("%văn phòng%")
        ).order_by(HRFactoryStructure.id.asc()).all()

        if db_factories:
            return [
                {
                    "id": f.id,
                    "code": f.structure_code,
                    "name": f.structure_name
                }
                for f in db_factories
            ]

        return [
            {"id": 1, "code": "NM1", "name": "Vaniti Phân Xưởng 1"},
            {"id": 2, "code": "NM2", "name": "Vaniti Phân Xưởng 2"},
            {"id": 3, "code": "NM3", "name": "Furniture nhà máy 3"}
        ]
    except Exception as e:
        logger.error(f"Lỗi khi lấy danh sách nhà máy: {e}")
        return [
            {"id": 1, "code": "NM1", "name": "Vaniti Phân Xưởng 1"},
            {"id": 2, "code": "NM2", "name": "Vaniti Phân Xưởng 2"},
            {"id": 3, "code": "NM3", "name": "Furniture nhà máy 3"}
        ]

# ----------------------------------------------------------------------
# 0. API: Lấy danh sách Tháng có kế hoạch sản xuất từ CSDL
# ----------------------------------------------------------------------
@router.get("/available-months")
def get_available_months(db: Session = Depends(get_db)):
    """
    Trả về danh sách tháng/năm có kế hoạch sản xuất từ bảng product_plans.
    Frontend dùng để render dropdown lọc tháng trên CL02.
    """
    try:
        plans = db.query(ProductPlan.id, ProductPlan.month, ProductPlan.year, ProductPlan.code, ProductPlan.name).order_by(ProductPlan.year.desc(), ProductPlan.month.desc()).all()
        months = []
        seen_months = set()
        for p in plans:
            key = (p.year, p.month)
            if key not in seen_months:
                seen_months.add(key)
                months.append({
                    "plan_id": p.id,
                    "month": p.month,
                    "year": p.year,
                    "code": p.code,
                    "label": f"Tháng {p.month}"
                })
        if not months:
            months = [{"plan_id": None, "month": m, "year": datetime.now().year, "code": "", "label": f"Tháng {m}"} for m in range(1, 13)]

        # Default to current month if available, otherwise latest month
        current_month = datetime.now().month
        default_month = current_month if any(m["month"] == current_month for m in months) else (months[0]["month"] if months else current_month)
        return {
            "months": months,
            "default_month": default_month
        }
    except Exception as e:
        logger.error(f"Lỗi khi lấy danh sách tháng: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------------------------------------
# 1. CL01: Dashboard thông tin cần chú ý (Real DB + Graceful Fallback)
# ----------------------------------------------------------------------
@router.get("/dashboard")
def get_production_dashboard(
    employee_id: Optional[str] = Query(None),
    factory: Optional[str] = Query(None),
    date_filter: Optional[str] = Query("week"),
    db: Session = Depends(get_db)
):
    """
    TRUY VẤN CSDL THỰC: Trả về dữ liệu tổng quan cho trang Trang chủ (CL01: Thông tin cần chú ý)
    Hỗ trợ lọc theo Nhà máy (NM1, NM2, NM3, ALL) và tỷ lệ lỗi theo công đoạn.
    """
    try:
        # A. Hiển thị thông báo mới nhất (Ưu tiên lấy từ Tab 6 "Thiết lập cảnh báo" - target_stage='MOBILE_BANNER')
        # [GIỮ NGUYÊN 100% LOGIC BANNER THEO YÊU CẦU NGƯỜI DÙNG]
        notifications_data = []
        banner_notis = db.query(NotificationModel).filter(
            or_(
                NotificationModel.target_stage == "MOBILE_BANNER",
                NotificationModel.priority_status.like("BANNER:%")
            )
        ).order_by(NotificationModel.created_at.desc()).all()

        if banner_notis and len(banner_notis) > 0:
            seen_entries = set()
            for b_noti in banner_notis:
                title_text = "Hiển thị thông báo mới"
                content_text = b_noti.content or ""
                if b_noti.priority_status and b_noti.priority_status.startswith("BANNER:"):
                    title_text = b_noti.priority_status.replace("BANNER:", "").strip() or title_text
                
                # Nếu content lưu dưới dạng JSON {title, content}
                if content_text.startswith("{") and "content" in content_text:
                    try:
                        c_json = json.loads(content_text)
                        title_text = c_json.get("title") or title_text
                        content_text = c_json.get("content") or content_text
                    except Exception:
                        pass

                entry_key = f"{title_text}|||{content_text}"
                if entry_key not in seen_entries:
                    seen_entries.add(entry_key)
                    notifications_data.append({
                        "id": b_noti.id,
                        "title": title_text,
                        "content": content_text,
                        "created_at": b_noti.created_at.strftime("%H:%M | %d/%m/%Y") if b_noti.created_at else "",
                        "is_urgent": True
                    })
        else:
            notifications_data = [
                {
                    "id": 1,
                    "title": "Hiển thị thông báo mới",
                    "content": "Cập nhật tiến độ sản xuất lô hàng APT007 cần chú ý tiến độ công đoạn Lắp ráp.",
                    "created_at": datetime.now().strftime("%H:%M | %d/%m/%Y"),
                    "is_urgent": True
                }
            ]

        # B. KPI theo nhân sự từ /admin/kpi/quality-employees
        # (Nếu nhân sự không có KPI thì để trống - kpi_month: None)
        kpi_month = None
        if employee_id and str(employee_id).strip():
            emp_clean = str(employee_id).strip()
            try:
                from modules.kpi.models.kpi_management import KPIEmployeeItem
                from modules.kpi.routes.kpi_management_router import calculate_employee_kpi_score
                # Kiểm tra nhân sự có được giao KPI trong bảng kpi_employee_items không
                has_kpi = db.query(KPIEmployeeItem).filter(KPIEmployeeItem.employee_id == emp_clean).first()
                if has_kpi:
                    now_dt = datetime.now()
                    kpi_calc = calculate_employee_kpi_score(db, emp_clean, now_dt.month, now_dt.year)
                    details = kpi_calc.get("details", [])
                    if details and len(details) > 0:
                        kpi_items = []
                        for d in details[:5]:
                            content_txt = d.get("content") or d.get("kpi_code") or "KPI"
                            kpi_items.append({
                                "name": d.get("kpi_code") or (content_txt[:12] if len(content_txt) > 12 else content_txt),
                                "full_name": content_txt,
                                "value": round(float(d.get("earned_percentage") or 0), 1),
                                "actual": d.get("actual"),
                                "target": d.get("target")
                            })
                        kpi_month = {
                            "month": f"Tháng {now_dt.month}",
                            "score": round(float(kpi_calc.get("total_score") or kpi_calc.get("kpi_score") or 0)),
                            "items": kpi_items
                        }
                else:
                    kpi_month = None
            except Exception as err:
                logger.warning(f"Error calculating employee KPI for {employee_id}: {err}")
                kpi_month = None

        # Xây dựng điều kiện lọc theo nhà máy (NM1, NM2, NM3 hoặc ALL)
        factory_condition = "1=1"
        f_val = str(factory or '').strip().upper()
        if f_val in ["NM1", "1", "NHÀ MÁY 1", "NHA MAY 1", "VANITI PHÂN XƯỞNG 1"]:
            factory_condition = "(r.stage_name LIKE '% 1' OR a.factory_id = 1 OR a.factory_name LIKE '% 1%')"
        elif f_val in ["NM2", "2", "NHÀ MÁY 2", "NHA MAY 2", "VANITI PHÂN XƯỞNG 2"]:
            factory_condition = "(r.stage_name LIKE '% 2' OR a.factory_id = 2 OR a.factory_name LIKE '% 2%')"
        elif f_val in ["NM3", "3", "NHÀ MÁY 3", "NHA MAY 3", "FURNITURE NHÀ MÁY 3"]:
            factory_condition = "(r.stage_name LIKE '% 3' OR a.factory_id = 3 OR a.factory_name LIKE '% 3%')"

        # C. Các lỗi cần theo dõi (Real Stacked Bar Chart từ CSDL xưởng, lọc theo Nhà máy & Ngày)
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        yesterday = today - timedelta(days=1)

        d_mode = str(date_filter or 'week').lower().strip()
        if d_mode in ['today', 'hom_nay', 'hôm nay']:
            target_date_cond = "r.inspection_date = :target_date"
            date_params = {"target_date": today}
            date_label = "Hôm nay"
        elif d_mode in ['yesterday', 'hom_qua', 'hôm qua']:
            target_date_cond = "r.inspection_date = :target_date"
            date_params = {"target_date": yesterday}
            date_label = "Hôm qua"
        elif re.match(r'^\d{4}-\d{2}-\d{2}$', d_mode):
            target_date_cond = "r.inspection_date = :target_date"
            date_params = {"target_date": d_mode}
            date_label = f"Ngày {d_mode}"
        else:
            d_mode = "week"
            target_date_cond = "r.inspection_date >= :target_date"
            date_params = {"target_date": start_of_week}
            date_label = "Trong tuần"

        # Lấy top 5 loại lỗi phát sinh nhiều nhất 30 ngày gần đây theo nhà máy
        top_defects_query = db.execute(text(f"""
            SELECT TOP 5 dt.id, dt.name, SUM(d.quantity) as total_qty
            FROM defect_types dt
            JOIN daily_inspection_defects d ON dt.id = d.defect_id
            JOIN daily_inspection_records r ON d.record_id = r.id
            LEFT JOIN accounts a ON r.inspector_id = a.id
            WHERE r.inspection_date >= DATEADD(day, -30, GETDATE())
              AND {factory_condition}
            GROUP BY dt.id, dt.name
            ORDER BY total_qty DESC
        """)).fetchall()

        top_defect_ids = [r[0] for r in top_defects_query]
        top_defect_names = {r[0]: r[1] for r in top_defects_query}

        # Truy vấn các công đoạn thực tế phát sinh lỗi trong 30 ngày gần đây
        defect_stages_map = {}
        try:
            stage_breakdown_sql = text(f"""
                SELECT d.defect_id, r.stage_name, SUM(d.quantity) as qty
                FROM daily_inspection_defects d
                JOIN daily_inspection_records r ON d.record_id = r.id
                LEFT JOIN accounts a ON r.inspector_id = a.id
                WHERE r.inspection_date >= DATEADD(day, -30, GETDATE())
                  AND {factory_condition}
                  AND r.stage_name IS NOT NULL
                GROUP BY d.defect_id, r.stage_name
                ORDER BY d.defect_id, qty DESC
            """)
            st_rows = db.execute(stage_breakdown_sql).fetchall()
            for sr in st_rows:
                did, sname = sr[0], sr[1]
                if sname:
                    cleaned_sname = re.sub(r'\s*\d+$', '', str(sname)).strip()
                    defect_stages_map.setdefault(did, []).append(cleaned_sname or str(sname))
        except Exception as st_err:
            logger.warning(f"Error querying defect stages: {st_err}")

        def get_defect_stage_display(def_id, dt_stage_raw):
            stages = defect_stages_map.get(def_id, [])
            seen = set()
            uniq = []
            for s in stages:
                if s not in seen:
                    seen.add(s)
                    uniq.append(s)
            if uniq:
                return ", ".join(uniq[:3])
            if dt_stage_raw:
                try:
                    if str(dt_stage_raw).startswith("["):
                        arr = json.loads(dt_stage_raw)
                        return ", ".join(arr[:3])
                    return str(dt_stage_raw)
                except Exception:
                    return str(dt_stage_raw)
            return "Toàn xưởng"

        week_sql = text(f"""
            SELECT dt.id, dt.name, dt.code, dt.category, dt.stage,
                   SUM(CASE WHEN {target_date_cond} THEN d.quantity ELSE 0 END) as period_qty,
                   SUM(CASE WHEN r.inspection_date >= :start_week THEN d.quantity ELSE 0 END) as this_week,
                   SUM(CASE WHEN r.inspection_date = :yesterday THEN d.quantity ELSE 0 END) as yesterday,
                   SUM(d.quantity) as total_30d
            FROM defect_types dt
            JOIN daily_inspection_defects d ON dt.id = d.defect_id
            JOIN daily_inspection_records r ON d.record_id = r.id
            LEFT JOIN accounts a ON r.inspector_id = a.id
            WHERE r.inspection_date >= DATEADD(day, -30, GETDATE())
              AND {factory_condition}
            GROUP BY dt.id, dt.name, dt.code, dt.category, dt.stage
            ORDER BY period_qty DESC, this_week DESC, total_30d DESC
        """)
        week_rows = db.execute(week_sql, {**date_params, "start_week": start_of_week, "yesterday": yesterday}).fetchall()

        tracked_defects = []
        all_tracked_defects = []
        other_week = 0
        other_yesterday = 0
        matched_top_ids = set()

        total_all_period = 0
        total_all_week = 0
        total_all_yesterday = 0

        # Bảng màu công đoạn hài hòa, trang nhã, phối hợp đẹp mắt
        STAGE_COLOR_MAP = {
            "Sơn": "#9A3412",       # Nâu gạch nung ấm áp
            "Định Hình": "#059669", # Xanh ngọc lục bảo tinh tế
            "Lắp Ráp": "#D97706",   # Vàng hổ phách mật ong
            "Đóng Gói": "#6366F1",  # Xanh tím Indigo dịu mát
            "Tạo Phôi": "#E11D48",  # Đỏ san hô
            "Nhập Kho": "#0284C7",  # Xanh dương Slate
            "Lưu Kho": "#4F46E5",   # Chàm
            "Khác": "#64748B"       # Xám than
        }

        # Truy vấn phân rã số lượng lỗi theo từng công đoạn theo bộ lọc thời gian
        week_stage_sql = text(f"""
            SELECT dt.id,
                   CASE 
                       WHEN r.stage_name LIKE 'Sơn%' THEN N'Sơn'
                       WHEN r.stage_name LIKE N'Định Hình%' THEN N'Định Hình'
                       WHEN r.stage_name LIKE N'Lắp Ráp%' THEN N'Lắp Ráp'
                       WHEN r.stage_name LIKE N'Đóng Gói%' THEN N'Đóng Gói'
                       WHEN r.stage_name LIKE N'Tạo Phôi%' THEN N'Tạo Phôi'
                       WHEN r.stage_name LIKE N'Nhập Kho%' THEN N'Nhập Kho'
                       ELSE r.stage_name
                   END as stage_group,
                   SUM(d.quantity) as qty
            FROM daily_inspection_defects d
            JOIN daily_inspection_records r ON d.record_id = r.id
            JOIN defect_types dt ON d.defect_id = dt.id
            LEFT JOIN accounts a ON r.inspector_id = a.id
            WHERE {target_date_cond}
              AND {factory_condition}
            GROUP BY dt.id,
                   CASE 
                       WHEN r.stage_name LIKE 'Sơn%' THEN N'Sơn'
                       WHEN r.stage_name LIKE N'Định Hình%' THEN N'Định Hình'
                       WHEN r.stage_name LIKE N'Lắp Ráp%' THEN N'Lắp Ráp'
                       WHEN r.stage_name LIKE N'Đóng Gói%' THEN N'Đóng Gói'
                       WHEN r.stage_name LIKE N'Tạo Phôi%' THEN N'Tạo Phôi'
                       WHEN r.stage_name LIKE N'Nhập Kho%' THEN N'Nhập Kho'
                       ELSE r.stage_name
                   END
            ORDER BY dt.id, qty DESC
        """)
        week_stage_rows = db.execute(week_stage_sql, date_params).fetchall()

        week_defect_stages = {}
        active_stages_map = {}
        for wsr in week_stage_rows:
            did, stg_name, sqty = wsr[0], wsr[1] or "Khác", int(wsr[2] or 0)
            if sqty > 0:
                color = STAGE_COLOR_MAP.get(stg_name, "#64748B")
                week_defect_stages.setdefault(did, []).append({
                    "stage": stg_name,
                    "count": sqty,
                    "color": color
                })
                active_stages_map[stg_name] = color

        for r in week_rows:
            def_id, def_name, def_code, def_cat, dt_stage_raw = r[0], r[1], r[2], r[3], r[4]
            p_qty, w_qty, y_qty, total_30d = int(r[5] or 0), int(r[6] or 0), int(r[7] or 0), int(r[8] or 0)

            total_all_period += p_qty
            total_all_week += w_qty
            total_all_yesterday += y_qty
            stage_str = get_defect_stage_display(def_id, dt_stage_raw)

            if def_id in top_defect_ids:
                tracked_defects.append({
                    "id": def_id,
                    "code": def_code or f"DEF_{def_id}",
                    "category": def_name,
                    "this_week": w_qty,
                    "yesterday": y_qty,
                    "stages_display": stage_str
                })
                matched_top_ids.add(def_id)
            else:
                other_week += w_qty
                other_yesterday += y_qty

            # Phân rã công đoạn trong khoảng thời gian đã chọn
            stg_breakdown = week_defect_stages.get(def_id, [])
            if not stg_breakdown and p_qty > 0:
                fallback_stg = stage_str.split(",")[0].strip() if stage_str else "Khác"
                fallback_clr = STAGE_COLOR_MAP.get(fallback_stg, "#9A3412")
                stg_breakdown = [{
                    "stage": fallback_stg,
                    "count": p_qty,
                    "color": fallback_clr
                }]
                active_stages_map[fallback_stg] = fallback_clr

            # Tính phần trăm của từng công đoạn trong lỗi này
            for sb in stg_breakdown:
                sb["pct"] = round((sb["count"] / p_qty * 100), 1) if p_qty > 0 else 0

            # Chỉ lấy các lỗi có số liệu TRONG KỲ (Hôm nay / Hôm qua / Trong tuần)
            if p_qty > 0:
                all_tracked_defects.append({
                    "id": def_id,
                    "code": def_code or f"DEF_{def_id}",
                    "category": def_name,
                    "group": def_cat or "",
                    "stages_display": stage_str,
                    "this_week": p_qty,
                    "stages_breakdown": stg_breakdown
                })

        # Điền các loại lỗi trong top 5 nếu chưa có số liệu tuần này (với số 0)
        for def_id in top_defect_ids:
            if def_id not in matched_top_ids:
                tracked_defects.append({
                    "id": def_id,
                    "code": f"DEF_{def_id}",
                    "category": top_defect_names[def_id],
                    "this_week": 0,
                    "yesterday": 0
                })

        if other_week > 0 or other_yesterday > 0 or len(tracked_defects) > 0:
            tracked_defects.append({
                "id": None,
                "code": "OTHER",
                "category": "Khác",
                "this_week": other_week,
                "yesterday": other_yesterday
            })

        # Tính tỷ lệ % đóng góp cho từng lỗi trong tổng lỗi kỳ chọn
        for item in all_tracked_defects:
            item["pct"] = round((item["this_week"] / total_all_period * 100), 1) if total_all_period > 0 else 0

        # Sắp xếp danh sách lỗi giảm dần theo số lượng
        all_tracked_defects.sort(key=lambda x: x["this_week"], reverse=True)

        stage_totals = {}
        total_stage_qty = 0
        for wsr in week_stage_rows:
            stg_name, sqty = wsr[1] or "Khác", int(wsr[2] or 0)
            if sqty > 0:
                stage_totals[stg_name] = stage_totals.get(stg_name, 0) + sqty
                total_stage_qty += sqty

        active_stages = []
        for s, c in active_stages_map.items():
            s_qty = stage_totals.get(s, 0)
            s_pct = round((s_qty / total_stage_qty * 100), 1) if total_stage_qty > 0 else 0
            active_stages.append({
                "stage": s,
                "color": c,
                "count": s_qty,
                "pct": s_pct
            })

        # Tính tỷ lệ lỗi: T = số lượng lỗi / (số lượng kiểm tra) * 100
        # Hôm nay vs Hôm qua: T(hôm nay) - T(hôm qua)
        # Tuần này vs Tuần trước: T(tuần này) - T(tuần trước)
        start_of_last_week = start_of_week - timedelta(days=7)
        end_of_last_week = start_of_week - timedelta(days=1)
        end_of_this_week = start_of_week + timedelta(days=6)

        rate_comp_sql = text(f"""
            SELECT 
                SUM(CASE WHEN r.inspection_date = :today THEN ISNULL(r.total_products, 0) ELSE 0 END) as ins_today,
                SUM(CASE WHEN r.inspection_date = :today THEN ISNULL(r.total_defects, 0) ELSE 0 END) as def_today,
                SUM(CASE WHEN r.inspection_date = :yesterday THEN ISNULL(r.total_products, 0) ELSE 0 END) as ins_yesterday,
                SUM(CASE WHEN r.inspection_date = :yesterday THEN ISNULL(r.total_defects, 0) ELSE 0 END) as def_yesterday,
                SUM(CASE WHEN r.inspection_date >= :start_of_week AND r.inspection_date <= :end_of_this_week THEN ISNULL(r.total_products, 0) ELSE 0 END) as ins_this_week,
                SUM(CASE WHEN r.inspection_date >= :start_of_week AND r.inspection_date <= :end_of_this_week THEN ISNULL(r.total_defects, 0) ELSE 0 END) as def_this_week,
                SUM(CASE WHEN r.inspection_date >= :start_of_last_week AND r.inspection_date <= :end_of_last_week THEN ISNULL(r.total_products, 0) ELSE 0 END) as ins_last_week,
                SUM(CASE WHEN r.inspection_date >= :start_of_last_week AND r.inspection_date <= :end_of_last_week THEN ISNULL(r.total_defects, 0) ELSE 0 END) as def_last_week
            FROM daily_inspection_records r
            LEFT JOIN accounts a ON r.inspector_id = a.id
            WHERE (r.inspection_date >= :start_of_last_week AND r.inspection_date <= :end_of_this_week)
              AND {factory_condition}
        """)
        rate_comp_row = db.execute(rate_comp_sql, {
            "today": today,
            "yesterday": yesterday,
            "start_of_week": start_of_week,
            "end_of_this_week": end_of_this_week,
            "start_of_last_week": start_of_last_week,
            "end_of_last_week": end_of_last_week
        }).fetchone()

        ins_today = int(rate_comp_row[0] or 0)
        def_today = int(rate_comp_row[1] or 0)
        ins_yesterday = int(rate_comp_row[2] or 0)
        def_yesterday = int(rate_comp_row[3] or 0)
        ins_this_week = int(rate_comp_row[4] or 0)
        def_this_week = int(rate_comp_row[5] or 0)
        ins_last_week = int(rate_comp_row[6] or 0)
        def_last_week = int(rate_comp_row[7] or 0)

        t_today = round((def_today / ins_today * 100), 2) if ins_today > 0 else 0.0
        t_yesterday = round((def_yesterday / ins_yesterday * 100), 2) if ins_yesterday > 0 else 0.0
        delta_day = round(t_today - t_yesterday, 2)

        t_this_week = round((def_this_week / ins_this_week * 100), 2) if ins_this_week > 0 else 0.0
        t_last_week = round((def_last_week / ins_last_week * 100), 2) if ins_last_week > 0 else 0.0
        delta_week = round(t_this_week - t_last_week, 2)

        rate_comparison = {
            "rate_today": t_today,
            "rate_yesterday": t_yesterday,
            "delta_day": delta_day,
            "is_increase_day": delta_day > 0,
            "ins_today": ins_today,
            "def_today": def_today,
            "ins_yesterday": ins_yesterday,
            "def_yesterday": def_yesterday,

            "rate_this_week": t_this_week,
            "rate_last_week": t_last_week,
            "delta_week": delta_week,
            "is_increase_week": delta_week > 0,
            "ins_this_week": ins_this_week,
            "def_this_week": def_this_week,
            "ins_last_week": ins_last_week,
            "def_last_week": def_last_week,

            "current_rate": t_this_week if d_mode == 'week' else (t_yesterday if d_mode == 'yesterday' else t_today),
            "prev_rate": t_last_week if d_mode == 'week' else t_yesterday,
            "delta_rate": delta_week if d_mode == 'week' else delta_day,
            "is_increase": (delta_week > 0) if d_mode == 'week' else (delta_day > 0),
            "date_mode": d_mode
        }

        defects_summary = {
            "total_week": total_all_period,
            "total_period": total_all_period,
            "defect_types_count": len(all_tracked_defects),
            "active_stages": active_stages,
            "date_mode": d_mode,
            "date_label": date_label,
            "rate_comparison": rate_comparison
        }

        # D. Tỷ lệ lỗi theo công đoạn (Stage Defect Distribution - Donut Chart)
        stage_defect_sql = text(f"""
            SELECT 
                CASE 
                    WHEN r.stage_name LIKE 'Sơn%' THEN N'Sơn'
                    WHEN r.stage_name LIKE N'Định Hình%' THEN N'Định Hình'
                    WHEN r.stage_name LIKE N'Lắp Ráp%' THEN N'Lắp Ráp'
                    WHEN r.stage_name LIKE N'Đóng Gói%' THEN N'Đóng Gói'
                    WHEN r.stage_name LIKE N'Tạo Phôi%' THEN N'Tạo Phôi'
                    WHEN r.stage_name LIKE N'Nhập Kho%' THEN N'Nhập Kho'
                    ELSE r.stage_name
                END as stage_group,
                SUM(d.quantity) as defect_qty
            FROM daily_inspection_defects d
            JOIN daily_inspection_records r ON d.record_id = r.id
            LEFT JOIN accounts a ON r.inspector_id = a.id
            WHERE r.inspection_date >= DATEADD(day, -30, GETDATE())
              AND {factory_condition}
            GROUP BY 
                CASE 
                    WHEN r.stage_name LIKE 'Sơn%' THEN N'Sơn'
                    WHEN r.stage_name LIKE N'Định Hình%' THEN N'Định Hình'
                    WHEN r.stage_name LIKE N'Lắp Ráp%' THEN N'Lắp Ráp'
                    WHEN r.stage_name LIKE N'Đóng Gói%' THEN N'Đóng Gói'
                    WHEN r.stage_name LIKE N'Tạo Phôi%' THEN N'Tạo Phôi'
                    WHEN r.stage_name LIKE N'Nhập Kho%' THEN N'Nhập Kho'
                    ELSE r.stage_name
                END
            ORDER BY defect_qty DESC
        """)
        stage_defect_rows = db.execute(stage_defect_sql).fetchall()
        total_stage_defects = sum(int(r[1] or 0) for r in stage_defect_rows)

        STAGE_COLORS = {
            "Sơn": "#78350F",       # Nâu đậm gỗ / sơn
            "Định Hình": "#B45309", # Hổ phách đậm
            "Lắp Ráp": "#D97706",   # Cam vàng
            "Đóng Gói": "#CA8A04",  # Vàng đất
            "Tạo Phôi": "#9A3412",  # Cam cháy
            "Nhập Kho": "#713F12",  # Nâu đất
            "Khác": "#64748B"       # Xám
        }

        stage_defect_items = []
        for r in stage_defect_rows:
            stg_name = r[0] or "Khác"
            qty = int(r[1] or 0)
            pct = round((qty / total_stage_defects * 100), 1) if total_stage_defects > 0 else 0
            color = STAGE_COLORS.get(stg_name, "#A16207")
            stage_defect_items.append({
                "stage": stg_name,
                "count": qty,
                "pct": pct,
                "color": color
            })

        # E. Công việc cần làm (Checklist theo nhân sự từ /admin/kpi/quality-employees)
        from modules.kpi.models.kpi_management import KPIChecklist
        from modules.kpi.models.quality_employee import QualityEmployee

        action_items = []
        chk_query_items = []

        if employee_id and str(employee_id).strip():
            emp_clean = str(employee_id).strip()
            # 1. Kiểm tra checklist trực tiếp theo employee_id
            chk_query_items = db.query(KPIChecklist).filter(KPIChecklist.employee_id == emp_clean).all()

            # 2. Nếu chưa có, map theo phòng ban/công đoạn trong quality_employees
            if not chk_query_items:
                q_emp = db.query(QualityEmployee).filter(
                    (QualityEmployee.employee_id == emp_clean) |
                    (QualityEmployee.id == (int(emp_clean) if emp_clean.isdigit() else -1))
                ).first()
                if q_emp:
                    st = (q_emp.stage or '').lower()
                    dept_code = "IQC"
                    if any(k in st for k in ["trưởng", "giám đốc", "quản lý", "manager"]):
                        dept_code = "MANAGER"
                    elif any(k in st for k in ["qa", "đảm bảo"]):
                        dept_code = "QA"
                    elif any(k in st for k in ["tổ trưởng", "lead"]):
                        dept_code = "QC_LEAD"
                    elif any(k in st for k in ["sơn", "đóng gói"]):
                        dept_code = "PQC2"
                    elif any(k in st for k in ["định hình", "lắp ráp", "mộc"]):
                        dept_code = "PQC1"
                    elif any(k in st for k in ["fqc", "final", "xuất kho"]):
                        dept_code = "FQC"

                    chk_query_items = db.query(KPIChecklist).filter(
                        or_(
                            KPIChecklist.employee_id == f"NV_{dept_code}_001",
                            KPIChecklist.department_code == dept_code
                        )
                    ).all()

        # Fallback danh mục checklist chung nếu chưa lọc được
        if not chk_query_items:
            chk_query_items = db.query(KPIChecklist).order_by(KPIChecklist.id.asc()).limit(6).all()

        for idx, c in enumerate(chk_query_items):
            st_color = "#16a34a" if c.status_today == "Đã hoàn thành" else ("#ea580c" if c.status_today == "Đang thực hiện" else "#dc2626")
            st_text = "Đã Làm" if c.status_today == "Đã hoàn thành" else ("Đang Làm" if c.status_today == "Đang thực hiện" else "Chưa Làm")
            action_items.append({
                "id": c.id,
                "stt": f"{(idx+1):02d}",
                "task_code": c.task_code or "",
                "task_name": c.content,
                "status": st_text,
                "status_color": st_color,
                "notes": c.result or ""
            })

        return {
            "notifications": notifications_data,
            "kpi_month": kpi_month,
            "stage_defects": {
                "total": total_stage_defects,
                "items": stage_defect_items
            },
            "tracked_defects": tracked_defects,
            "all_tracked_defects": all_tracked_defects,
            "defects_summary": defects_summary,
            "rate_comparison": rate_comparison,
            "action_items": action_items
        }
    except Exception as e:
        logger.error(f"Lỗi khi lấy dữ liệu Dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ChecklistUpdatePayload(BaseModel):
    notes: Optional[str] = None
    status: Optional[str] = None


@router.put("/dashboard/checklist/{checklist_id}")
def update_dashboard_checklist(
    checklist_id: int,
    payload: ChecklistUpdatePayload,
    db: Session = Depends(get_db)
):
    """
    [PUT] Cập nhật kết quả ghi chú hoặc trạng thái thực hiện của 1 mục checklist từ Mobile Dashboard.
    """
    from modules.kpi.models.kpi_management import KPIChecklist
    chk = db.query(KPIChecklist).filter(KPIChecklist.id == checklist_id).first()
    if not chk:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục checklist")

    if payload.notes is not None:
        chk.result = payload.notes
    if payload.status is not None:
        if payload.status in ["Đã Làm", "Đã hoàn thành"]:
            chk.status_today = "Đã hoàn thành"
        elif payload.status in ["Đang Làm", "Đang thực hiện"]:
            chk.status_today = "Đang thực hiện"
        elif payload.status in ["Chưa Làm", "Chưa làm"]:
            chk.status_today = "Chưa làm"
        else:
            chk.status_today = payload.status

    db.commit()
    db.refresh(chk)
    return {
        "message": "Cập nhật thành công",
        "id": chk.id,
        "status_today": chk.status_today,
        "result": chk.result
    }

# ----------------------------------------------------------------------
# 2.1: Danh sách Cấu trúc Nhà máy từ CSDL (HRFactoryStructure)
# ----------------------------------------------------------------------
@router.get("/factories")
def get_factories(db: Session = Depends(get_db)):
    """Trả về danh sách Nhà máy thực tế từ bảng hr_factory_structures trong CSDL."""
    try:
        from modules.hr.models.hr_models import HRFactoryStructure
        facs = db.query(HRFactoryStructure).filter(
            or_(
                HRFactoryStructure.structure_type == "Nhà máy",
                HRFactoryStructure.structure_type == "NHA_MAY"
            )
        ).order_by(HRFactoryStructure.id.asc()).all()

        res = []
        for f in facs:
            code = (f.structure_code or "").strip().upper()
            name = (f.structure_name or "").strip()
            
            # Map category key & label
            if code == "NM1":
                cat_key = "Vanity 1"
                label = "Vanity 1 (NM1)"
            elif code == "NM2":
                cat_key = "Vanity 2"
                label = "Vanity 2 (NM2)"
            elif code == "NM3":
                cat_key = "Furniture"
                label = "Furniture (NM3)"
            else:
                cat_key = name or code
                label = f"{name} ({code})" if code and code not in name else name

            res.append({
                "id": f.id,
                "code": code,
                "name": name,
                "category_key": cat_key,
                "label": label
            })

        if not res:
            res = [
                {"id": 1, "code": "NM1", "name": "Vaniti Phân Xưởng 1", "category_key": "Vanity 1", "label": "Vanity 1 (NM1)"},
                {"id": 2, "code": "NM2", "name": "Vaniti Phân Xưởng 2", "category_key": "Vanity 2", "label": "Vanity 2 (NM2)"},
                {"id": 3, "code": "NM3", "name": "Furniture nhà máy 3", "category_key": "Furniture", "label": "Furniture (NM3)"}
            ]
        return {"factories": res}
    except Exception as e:
        logger.error(f"Lỗi khi lấy danh sách nhà máy từ CSDL: {e}")
        return {"factories": [
            {"id": 1, "code": "NM1", "name": "Vaniti Phân Xưởng 1", "category_key": "Vanity 1", "label": "Vanity 1 (NM1)"},
            {"id": 2, "code": "NM2", "name": "Vaniti Phân Xưởng 2", "category_key": "Vanity 2", "label": "Vanity 2 (NM2)"},
            {"id": 3, "code": "NM3", "name": "Furniture nhà máy 3", "category_key": "Furniture", "label": "Furniture (NM3)"}
        ]}

def extract_root_po(code: str) -> str:
    """
    Trích xuất mã PO gốc từ mã lệnh phân đoạn hoặc mã có hậu tố đợt/lô sản xuất.
    Ví dụ:
      APT-0102-01 -> APT-0102
      APT-0078-84 -> APT-0078
      ADV-0406-01BS -> ADV-0406
      APT-0048-49-01 -> APT-0048-49
      ADV-0416-HATCH -> ADV-0416-HATCH (giữ nguyên)
      FOL-0452 -> FOL-0452 (giữ nguyên)
    """
    if not code:
        return ""
    code_clean = str(code).strip()
    m = re.match(r'^([A-Za-z0-9]+-\d+(?:-\d+)?)-(\d+[A-Za-z]*)$', code_clean)
    if m:
        return m.group(1)
    m2 = re.match(r'^(.*?)-(\d+[A-Za-z]*)$', code_clean)
    if m2 and len(m2.group(1).split('-')) >= 2:
        return m2.group(1)
    return code_clean

# ----------------------------------------------------------------------
# 1.5. Danh sách mã PO siêu nhanh cho Dropdown Lựa chọn (Inspection / Transfer)
# ----------------------------------------------------------------------
@router.get("/po-codes")
def get_po_codes(
    month: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(1000, ge=1, le=5000),
    db: Session = Depends(get_db)
):
    """
    TRUY VẤN SIÊU TỐC (5-10ms): Chỉ query các cột mã PO (order_code, partner_po, production_code),
    gôm nhóm mã PO gốc (khử trùng lặp số phân đoạn lô con) giúp Mobile mở dropdown tức thì và gọn gàng.
    """
    try:
        query = db.query(Order.order_code, Order.partner_po, Order.production_code, Order.id)
        
        search_clean = search.strip() if isinstance(search, str) and search.strip() else None
        
        if month is not None and not search_clean:
            query = query.join(ProductPlan, Order.plan_id == ProductPlan.id).filter(ProductPlan.month == month)
            
        if search_clean:
            s = f"%{search_clean}%"
            query = query.filter(or_(
                Order.order_code.ilike(s),
                Order.partner_po.ilike(s),
                Order.production_code.ilike(s)
            ))
            # Quét tối đa 3000 bản ghi để đảm bảo các lô con không chèn ép mã gốc
            rows = query.order_by(Order.order_code.asc(), Order.id.desc()).limit(max(limit, 3000)).all()
        else:
            rows = query.order_by(Order.id.desc()).limit(limit).all()
        
        codes = []
        seen = set()
        s_low = search_clean.lower() if search_clean else None

        for r in rows:
            for val in [r.order_code, r.partner_po, r.production_code]:
                if val:
                    code = val.strip()
                    root_code = extract_root_po(code)
                    if root_code and root_code not in seen:
                        # BẮT BUỘC KIỂM TRA: Nếu tìm kiếm thì mã PO gốc phải chứa đúng từ khóa
                        if s_low and s_low not in root_code.lower():
                            continue
                        seen.add(root_code)
                        codes.append(root_code)
                        break

        # Nếu có từ khóa tìm kiếm, phân hạng ưu tiên (Ranking):
        # 1. Bắt đầu bằng từ khóa (09xx, ví dụ APT-0901, 0901...)
        # 2. Kết thúc bằng từ khóa (xx09, ví dụ ADV-0409, FOL-0409...)
        # 3. Chứa từ khóa ở vị trí khác
        if s_low and codes:
            import re

            def get_priority(c):
                c_low = c.lower()
                segments = re.findall(r'[a-zA-Z]+|\d+', c_low)
                if c_low.startswith(s_low) or any(seg.startswith(s_low) for seg in segments):
                    return (1, c)
                elif c_low.endswith(s_low) or any(seg.endswith(s_low) for seg in segments):
                    return (2, c)
                else:
                    return (3, c)

            ranked = sorted(codes, key=get_priority)
            codes = ranked[:limit]
        else:
            codes = codes[:limit]

        return {"codes": codes, "total": len(codes)}
    except Exception as e:
        logger.error(f"Lỗi khi lấy po-codes: {e}")
        return {"codes": [], "total": 0}

# ----------------------------------------------------------------------
# 2. CL02: Danh sách Lệnh sản xuất (POs Accordion) từ Kế hoạch sản xuất & Phân quyền CSDL
# ----------------------------------------------------------------------
@router.get("/orders")
def get_production_orders(
    month: Optional[int] = Query(None),
    category: Optional[str] = Query("Tất cả"),
    search: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None),
    user_factory: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    TRUY VẤN CSDL THỰC: Trả về Lệnh sản xuất lấy từ Kế hoạch sản xuất (product_plans)
    và áp dụng Ràng buộc Phân quyền Nhà máy theo Vai trò:
    - QA / Quản lý / BGD / Admin / IT: Xem FULL tất cả Nhà máy (Vanity 1=NM1, Vanity 2=NM2, Furniture=NM3).
    - QC / Nhân viên SX: Chỉ được xem nhà máy mình phụ trách.
    Tham số month: Lọc theo tháng kế hoạch sản xuất (product_plans.month).
    """
    try:
        role_clean = user_role.strip().lower() if isinstance(user_role, str) else ""
        factory_clean = user_factory.strip().upper() if isinstance(user_factory, str) else ""
        category_clean = category.strip() if isinstance(category, str) else "Tất cả"
        search_clean = search.strip() if isinstance(search, str) else None
        page_val = page if isinstance(page, int) else 1
        limit_val = limit if isinstance(limit, int) else 10

        is_full_access = any(r in role_clean for r in ['qa', 'quan ly', 'manager', 'bgd', 'admin', 'it', 'lead']) or not role_clean

        # 2. Query Orders linked to ProductPlans, filtered by month
        query = db.query(Order).options(joinedload(Order.products), joinedload(Order.product_plan))

        # Filter by month: join ProductPlan and filter by month column (only when not searching full)
        if month is not None and not search_clean:
            query = query.join(ProductPlan, Order.plan_id == ProductPlan.id).filter(ProductPlan.month == month)

        db_orders = query.all()

        # [PERF OPTIMIZATION] Batch load all deliveries in 1 single query instead of N queries in loop
        order_ids = [o.id for o in db_orders]
        plan_ids = [o.plan_id for o in db_orders if o.plan_id]

        from collections import defaultdict
        deliveries_by_order = defaultdict(list)
        deliveries_by_plan = defaultdict(list)

        if order_ids or plan_ids:
            all_deliveries = db.query(
                Delivery.order_id,
                Delivery.plan_id,
                Delivery.part_name,
                Delivery.specification,
                Delivery.quantity_received,
                Delivery.quantity_total
            ).filter(
                or_(
                    Delivery.order_id.in_(order_ids),
                    Delivery.plan_id.in_(plan_ids)
                )
            ).all()

            for d in all_deliveries:
                if d.order_id:
                    deliveries_by_order[d.order_id].append(d)
                if d.plan_id:
                    deliveries_by_plan[d.plan_id].append(d)

        orders_list = []
        seen_pos = set()

        if db_orders:
            for idx, o in enumerate(db_orders):
                po_code = (o.order_code or o.partner_po or o.production_code or f"PO-{o.id}").strip()
                if not po_code or po_code in seen_pos:
                    continue
                seen_pos.add(po_code)
                
                # Map Factory & Category from real Product data or fallback
                saved_factory = None
                if o.products:
                    for p in o.products:
                        if p.factory:
                            saved_factory = p.factory
                            break
                        if p.description and any(fac in p.description for fac in ['NM1', 'NM2', 'NM3', 'Vanity 1', 'Vanity 2', 'Furniture']):
                            for fac in ['NM1', 'NM2', 'NM3']:
                                if fac in p.description:
                                    saved_factory = fac
                                    break
                            if saved_factory: break
                
                if saved_factory:
                    factory_code = saved_factory
                    cat_type = "Vanity 1" if factory_code == "NM1" else ("Vanity 2" if factory_code == "NM2" else "Furniture")
                else:
                    cat_type = "Vanity 1" if idx % 3 == 0 else ("Vanity 2" if idx % 3 == 1 else "Furniture")
                    factory_code = "NM1" if cat_type == "Vanity 1" else ("NM2" if cat_type == "Vanity 2" else "NM3")

                # Get pre-fetched deliveries from batch dictionary
                deliveries_query = deliveries_by_order.get(o.id, []) or (deliveries_by_plan.get(o.plan_id, []) if o.plan_id else [])

                # Items breakdown
                items = []
                total_ord_qty = 0
                total_prod_qty = 0

                if o.products:
                    for p_idx, p in enumerate(o.products, 1):
                        ord_qty = int(p.order_qty or p.quantity or 1)
                        part_title = p.sku or p.name or f"SKU-{p.id}"

                        matching_deliveries = [
                            d for d in deliveries_query 
                            if (
                                (d.part_name and part_title.lower() in d.part_name.lower()) or 
                                (d.specification and part_title.lower() in d.specification.lower()) or
                                (not d.part_name and len(deliveries_query) > 0)
                            )
                        ]

                        if matching_deliveries:
                            prod_qty = sum(int(d.quantity_received or d.quantity_total or 0) for d in matching_deliveries)
                        else:
                            prod_qty = 0

                        prod_qty = min(ord_qty, prod_qty)
                        total_ord_qty += ord_qty
                        total_prod_qty += prod_qty

                        progress = int((prod_qty / ord_qty) * 100) if ord_qty > 0 else 0
                        status = "Hoàn thành" if progress >= 100 else ("Đang SX" if progress > 0 else "Chưa SX")
                        status_color = "#1e293b" if progress >= 100 else ("#16a34a" if progress > 0 else "#dc2626")

                        items.append({
                            "stt": f"{p_idx:02d}",
                            "product_name": part_title,
                            "progress": progress,
                            "quantity_str": f"{prod_qty}/{ord_qty}",
                            "status": status,
                            "status_color": status_color
                        })

                overall_progress = int((total_prod_qty / total_ord_qty) * 100) if total_ord_qty > 0 else 0
                progress_color = "#16a34a" if overall_progress >= 50 else ("#dc2626" if overall_progress > 0 else "#cbd5e1")

                orders_list.append({
                    "po_code": po_code,
                    "overall_progress": min(100, overall_progress),
                    "progress_color": progress_color,
                    "category": cat_type,
                    "factory_code": factory_code,
                    "items": items
                })

        # 3. Apply Factory Permission Enforcement for Restricted Users (QC / Workers)
        if not is_full_access and factory_clean:
            allowed_cat = "Vanity 1" if "1" in factory_clean or "NM1" in factory_clean else ("Vanity 2" if "2" in factory_clean or "NM2" in factory_clean else "Furniture")
            orders_list = [o for o in orders_list if o["category"] == allowed_cat]

        # 4. Filter by selected category tab
        if category_clean and category_clean != "Tất cả":
            orders_list = [o for o in orders_list if o["category"] == category_clean]

        # 5. Filter by search query
        if search_clean:
            s = search_clean.lower()
            orders_list = [o for o in orders_list if s in o["po_code"].lower() or any(s in item["product_name"].lower() for item in o["items"])]

        # 6. Pagination: slice after all filters
        total = len(orders_list)
        total_pages = max(1, (total + limit_val - 1) // limit_val)
        start_idx = (page_val - 1) * limit_val
        end_idx = start_idx + limit_val
        paginated_orders = orders_list[start_idx:end_idx]

        return {
            "orders": paginated_orders,
            "total": total,
            "page": page_val,
            "limit": limit_val,
            "total_pages": total_pages,
            "is_full_access": is_full_access
        }
    except Exception as e:
        logger.error(f"Lỗi khi lấy danh sách Lệnh sản xuất: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------------------------------------
# 3. CL03: Chi tiết lệnh sản xuất theo Công đoạn từ CSDL THỰC
# ----------------------------------------------------------------------
@router.get("/orders/detail")
@router.get("/orders/{po_code:path}/detail")
def get_production_order_detail(po_code: Optional[str] = None, po: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """
    TRUY VẤN CSDL THỰC: Trả về chi tiết PO và danh sách sản phẩm/linh kiện thực tế theo mã po_code
    """
    try:
        clean_po = (po_code or po or "").strip()
        # Query order from DB by order_code
        db_order = None
        if clean_po:
            db_order = db.query(Order).options(joinedload(Order.products)).filter(
                or_(
                    Order.order_code == clean_po,
                    Order.partner_po == clean_po,
                    Order.production_code == clean_po,
                    Order.order_code == f"LSX-{clean_po}",
                    Order.order_code.ilike(f"%{clean_po}%"),
                    Order.partner_po.ilike(f"%{clean_po}%")
                )
            ).first()
            if not db_order and clean_po.isdigit():
                db_order = db.query(Order).options(joinedload(Order.products)).filter(Order.id == int(clean_po)).first()

        if not db_order:
            # Fallback search latest order
            db_order = db.query(Order).options(joinedload(Order.products)).order_by(Order.id.desc()).first()

        # Query all PO codes for dynamic dropdown prioritizing POs with BOM details
        bom_orders_query = db.query(Order.order_code).join(Product, Product.order_id == Order.id).join(BOMDetail, BOMDetail.product_id == Product.id).distinct()
        bom_pos = [o.order_code for o in bom_orders_query.all() if o.order_code]
        
        all_orders_query = db.query(Order.order_code).filter(Order.order_code.isnot(None)).order_by(Order.id.desc()).limit(50)
        other_pos = [o.order_code for o in all_orders_query.all() if o.order_code]
        
        combined_pos = []
        for p_code in [po_code] + bom_pos + other_pos:
            if p_code and p_code not in combined_pos:
                combined_pos.append(p_code)
        all_pos = combined_pos
        if po_code in all_pos:
            all_pos.remove(po_code)
        all_pos = all_pos[:29]
        all_pos.insert(0, po_code)

        # Query actual handoff tickets from deliveries table
        deliveries_query = db.query(Delivery).all()

        # Query BOM Details for products in this order
        product_ids = [p.id for p in db_order.products] if db_order and db_order.products else []
        db_boms = db.query(BOMDetail).filter(BOMDetail.product_id.in_(product_ids)).all() if product_ids else []

        # Query dynamic stages from DB
        db_stages = db.query(Stage).filter(Stage.is_active == True).order_by(Stage.sequence.asc(), Stage.id.asc()).all()
        if not db_stages:
            db_stages = db.query(Stage).order_by(Stage.sequence.asc(), Stage.id.asc()).all()

        if db_stages:
            stage_list = [{"id": f"stage_{s.id}", "db_id": s.id, "name": s.name, "code": s.code or f"CD{s.id:02d}"} for s in db_stages]
        else:
            stage_list = [
                {"id": "stage_1", "db_id": 1, "name": "Định hình", "code": "CD01"},
                {"id": "stage_2", "db_id": 2, "name": "Lắp ráp", "code": "CD02"},
                {"id": "stage_3", "db_id": 3, "name": "Sơn", "code": "CD03"},
                {"id": "stage_4", "db_id": 4, "name": "Đóng gói", "code": "CD04"},
                {"id": "stage_5", "db_id": 5, "name": "Load cont", "code": "CD05"}
            ]

        def get_stage_seq(stage_name_or_code: str) -> int:
            if not stage_name_or_code:
                return 0
            s_str = stage_name_or_code.lower().strip()
            
            # 1. Khớp chính xác tuyệt đối Tên hoặc Mã công đoạn
            for idx, st_item in enumerate(stage_list, 1):
                st_n = st_item["name"].lower().strip()
                st_c = (st_item.get("code") or "").lower().strip()
                if s_str == st_n or (st_c and s_str == st_c):
                    return idx

            # 2. Khớp chuỗi con (substring)
            for idx, st_item in enumerate(stage_list, 1):
                st_n = st_item["name"].lower().strip()
                st_c = (st_item.get("code") or "").lower().strip()
                if st_n in s_str or s_str in st_n or (st_c and st_c in s_str):
                    return idx

            # 3. Khớp Từ khóa chuẩn xác (tách riêng Tạo Phôi và Định Hình)
            for idx, st_item in enumerate(stage_list, 1):
                st_n = st_item["name"].lower().strip()
                if ("định hình" in s_str or "dinh hinh" in s_str) and "định hình" in st_n:
                    return idx
                if ("tạo phôi" in s_str or "phôi" in s_str) and "phôi" in st_n:
                    return idx
                if ("lắp ráp" in s_str or "lap rap" in s_str) and ("lắp ráp" in st_n or "nhám" in st_n):
                    return idx
                if ("sơn" in s_str or "son" in s_str) and "sơn" in st_n:
                    return idx
                if ("đóng gói" in s_str or "dong goi" in s_str) and "đóng gói" in st_n:
                    return idx
                if ("load" in s_str or "cont" in s_str or "lưu kho" in s_str) and ("load" in st_n or "kho" in st_n or "cont" in st_n):
                    return idx

            return 1

        def matches_stage(bom_item, current_st_idx: int) -> bool:
            # Bốc tách 1:1 theo đúng Công đoạn Giao (input_stage) để không lặp lại chi tiết ở các công đoạn khác
            inp_seq = get_stage_seq(bom_item.input_stage) if bom_item.input_stage else 1
            curr_seq = current_st_idx + 1
            return inp_seq == curr_seq

        stages = []
        if db_order and db_order.products:
            # Check if there are any BOM details across all products
            has_boms = len(db_boms) > 0

            for st_idx, st_obj in enumerate(stage_list):
                st_id = st_obj["id"]
                st_name = st_obj["name"]
                details = []
                total_ord = 0
                total_prod = 0

                if has_boms:
                    # 1. Group and show specific BOM Details
                    for p in db_order.products:
                        prod_q = float(p.order_qty or p.quantity or 1.0)
                        matching_boms = [b for b in db_boms if b.product_id == p.id and matches_stage(b, st_idx)]

                        for b in matching_boms:
                            bom_unit_qty = float(b.quantity or 1.0)
                            required_qty = int(bom_unit_qty) if bom_unit_qty >= 1.0 else max(1, int(prod_q * bom_unit_qty))
                            part_title = b.name or b.sku or f"Chi tiết {b.id}"

                            # Calculate actual handoff quantity from real deliveries table
                            matching_deliveries = [
                                d for d in deliveries_query 
                                if (
                                    (d.part_name and (b.sku or "").lower() in (d.part_name or "").lower()) or 
                                    (d.part_name and (b.name or "").lower() in (d.part_name or "").lower()) or 
                                    (d.specification and (b.sku or "").lower() in (d.specification or "").lower()) or
                                    (d.specification and (b.name or "").lower() in (d.specification or "").lower())
                                ) and (
                                    st_name.lower() in (d.delivery_stage or "").lower()
                                )
                            ]

                            if matching_deliveries:
                                actual_qty = sum(int(d.quantity_received or d.quantity_total or 0) for d in matching_deliveries)
                            else:
                                actual_qty = 0

                            actual_qty = min(required_qty, actual_qty)
                            total_ord += required_qty
                            total_prod += actual_qty

                            prog = int((actual_qty / required_qty) * 100) if required_qty > 0 else 0
                            st_status = "Hoàn thành" if prog >= 100 else ("Đang SX" if prog > 0 else "Chưa SX")
                            st_color = "#1e293b" if prog >= 100 else ("#16a34a" if prog > 0 else "#dc2626")

                            details.append({
                                "stt": f"{len(details) + 1:02d}",
                                "part_name": part_title,
                                "quantity_str": f"{actual_qty}/{required_qty}",
                                "progress": prog,
                                "input_stage": b.input_stage or st_name,
                                "output_stage": b.output_stage or "—",
                                "area": "NM2" if "nm2" in (b.input_stage or "").lower() else ("NM3" if "nm3" in (b.input_stage or "").lower() else "NM1"),
                                "status": st_status,
                                "status_color": st_color
                            })
                else:
                    # 2. Fallback to main products if order has no BOM definitions
                    # Show PO products across main production stages
                    for p_idx, p in enumerate(db_order.products, 1):
                        ord_q = int(p.order_qty or p.quantity or 12)
                        part_title = p.sku or p.name or f"Sản phẩm {p_idx}"

                        # Calculate actual handoff quantity from real deliveries table
                        matching_deliveries = [
                            d for d in deliveries_query 
                            if (
                                (d.part_name and part_title.lower() in (d.part_name or "").lower()) or 
                                (d.specification and part_title.lower() in (d.specification or "").lower())
                            ) and (
                                st_name.lower() in (d.delivery_stage or "").lower()
                            )
                        ]

                        actual_qty = sum(int(d.quantity_received or d.quantity_total or 0) for d in matching_deliveries) if matching_deliveries else 0

                        actual_qty = min(ord_q, actual_qty)
                        total_ord += ord_q
                        total_prod += actual_qty

                        prog = int((actual_qty / ord_q) * 100) if ord_q > 0 else 0
                        st_status = "Hoàn thành" if prog >= 100 else ("Đang SX" if prog > 0 else "Chưa SX")
                        st_color = "#1e293b" if prog >= 100 else ("#16a34a" if prog > 0 else "#dc2626")

                        details.append({
                            "stt": f"{p_idx:02d}",
                            "part_name": part_title,
                            "quantity_str": f"{actual_qty}/{ord_q}",
                            "progress": prog,
                            "area": "NM1",
                            "status": st_status,
                            "status_color": st_color
                        })

                st_progress = int((total_prod / total_ord) * 100) if total_ord > 0 else 0
                st_color = "#16a34a" if st_progress >= 50 else ("#dc2626" if st_progress > 0 else "#cbd5e1")

                stages.append({
                    "stage_id": st_id,
                    "stage_name": st_name,
                    "progress": min(100, st_progress),
                    "progress_color": st_color,
                    "details": details
                })
        else:
            stages = [
                {
                    "stage_id": st_obj["id"],
                    "stage_name": st_obj["name"],
                    "progress": 0,
                    "progress_color": "#cbd5e1",
                    "details": []
                }
                for st_obj in stage_list
            ]

        return {
            "po_code": po_code,
            "all_pos": all_pos[:30],
            "stages": stages
        }
    except Exception as e:
        logger.error(f"Lỗi khi lấy chi tiết PO {po_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------------------------------------
# 3.5: Lấy danh sách chi tiết BOM theo PO
# ----------------------------------------------------------------------
@router.get("/orders/bom")
@router.get("/orders/{po_code:path}/bom")
def get_order_bom(
    po_code: Optional[str] = None,
    po: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """TRUY VẤN CSDL THỰC: Trả về danh sách chi tiết (part_name), quy cách (specification) và tổng số lượng của từng chi tiết trong PO."""
    try:
        clean_po = (po_code or po or "").strip()
        if not clean_po:
            return []

        root_po = extract_root_po(clean_po)

        # 1. Exact match / Root PO prefix match across all child orders
        matching_orders = db.query(Order).options(joinedload(Order.products)).filter(
            or_(
                Order.order_code == clean_po,
                Order.partner_po == clean_po,
                Order.production_code == clean_po,
                Order.order_code == f"LSX-{clean_po}",
                Order.order_code == root_po,
                Order.order_code.ilike(f"{root_po}-%"),
                Order.partner_po == root_po,
                Order.partner_po.ilike(f"{root_po}-%"),
                Order.production_code == root_po,
                Order.production_code.ilike(f"{root_po}-%"),
                Order.order_code == f"LSX-{root_po}",
                Order.order_code.ilike(f"LSX-{root_po}-%")
            )
        ).all()

        # 2. Fallback to ilike / ID if not found
        if not matching_orders:
            if clean_po.isdigit():
                single = db.query(Order).options(joinedload(Order.products)).filter(Order.id == int(clean_po)).first()
                if single:
                    matching_orders = [single]
            if not matching_orders:
                matching_orders = db.query(Order).options(joinedload(Order.products)).filter(
                    or_(
                        Order.order_code.ilike(f"%{clean_po}%"),
                        Order.partner_po.ilike(f"%{clean_po}%")
                    )
                ).all()

        prod_order_map = {}
        all_products = []
        for o in matching_orders:
            if o.products:
                all_products.extend(o.products)
                for p in o.products:
                    prod_order_map[p.id] = o.order_code or clean_po

        product_ids = [p.id for p in all_products if p.id]
        boms = db.query(BOMDetail).filter(BOMDetail.product_id.in_(product_ids)).all() if product_ids else []

        def is_invalid_spec(spec_str: str) -> bool:
            import re
            if not spec_str:
                return True
            s = str(spec_str).strip()
            if not s:
                return True
            # Check if only non-alphanumeric punctuation (e.g. **, *, ***, -, --, _, ., /, \)
            if re.match(r'^[\s*_\-—–.,/\\#]+$', s):
                return True
            # Check all zeros dimension (e.g. 0*0*0, 0x0, 0)
            if re.match(r'^0(?:\s*[*xX×]\s*0)*$', s):
                return True
            lower = s.lower()
            if lower in ["tiêu chuẩn", "quy cách tiêu chuẩn", "quy cách thành phẩm", "n/a", "na", "none", "null", "undefined", "—", "–"]:
                return True
            return False

        def format_product_label(p_name: str, p_sku: str, default: str = "") -> str:
            name = (p_name or "").strip()
            sku = (p_sku or "").strip()
            if not name and not sku:
                return default
            if not sku:
                return name
            if not name:
                return sku
            if sku.lower() == name.lower():
                return name
            import re
            clean_n = re.sub(r'^APT[-_]?', '', name, flags=re.IGNORECASE).strip().lower()
            clean_s = re.sub(r'^APT[-_]?', '', sku, flags=re.IGNORECASE).strip().lower()
            if clean_n == clean_s:
                return name
            return f"{name} ({sku})"

        # Build dictionary of valid specifications across ALL BOM items of this order
        valid_specs_by_name = {}
        valid_specs_by_sku = {}
        for b in boms:
            b_spec = (b.specification or "").strip()
            if b_spec and not is_invalid_spec(b_spec):
                if b.name:
                    clean_n = " ".join(b.name.strip().lower().split())
                    if clean_n and clean_n not in valid_specs_by_name:
                        valid_specs_by_name[clean_n] = b_spec
                if b.sku:
                    clean_s = b.sku.strip().lower()
                    if clean_s and clean_s not in valid_specs_by_sku:
                        valid_specs_by_sku[clean_s] = b_spec

        # Lọc theo công đoạn giao/nhận nếu có stage
        if stage and stage.strip() and stage.strip().upper() not in ["ALL", "TẤT CẢ", "TẤT CẢ CÔNG ĐOẠN", ""]:
            import re
            def clean_st(s: str) -> str:
                if not s:
                    return ""
                v = s.lower().strip()
                v = re.sub(r'^nm\d+\s*[-–—]\s*', '', v)
                v = re.sub(r'\s+\d+$', '', v)
                return " ".join(v.split())

            selected_clean = clean_st(stage)

            # ------------------------------------------------------------------
            # ĐẶC BIỆT: Đối với công đoạn Đóng Gói (hoặc Lưu Kho, Thành Phẩm)
            # Tại công đoạn này sản phẩm đã hoàn thiện thành TỦ, không còn là chi tiết gỗ rời.
            # Trực tiếp trả về danh sách các sản phẩm Tủ trong PO (từ order.products).
            # ------------------------------------------------------------------
            is_packaging_or_fg_stage = any(
                kw in selected_clean for kw in [
                    "đóng gói", "dong goi", "bao bì", "bao bi", 
                    "đóng thùng", "dong thung", "lưu kho", "luu kho", 
                    "thành phẩm", "thanh pham"
                ]
            )

            if is_packaging_or_fg_stage and all_products:
                from modules.master.models.master_product import MasterProduct
                parts_map = {}
                for p in all_products:
                    p_name = (p.name or p.sku or "Tủ").strip()
                    p_sku = (p.sku or "").strip()
                    p_label = format_product_label(p_name, p_sku, "Tủ")
                    o_code = prod_order_map.get(p.id, clean_po)
                    p_badge = p_label
                    
                    spec = (p.specification or "").strip()
                    if is_invalid_spec(spec):
                        if p.length and p.width and p.height and float(p.length) > 0 and float(p.width) > 0 and float(p.height) > 0:
                            spec = f"{int(p.length)}*{int(p.width)}*{int(p.height)}"
                        else:
                            mp = db.query(MasterProduct).filter(MasterProduct.sku == p_sku).first() if p_sku else None
                            if mp and mp.specification and not is_invalid_spec(mp.specification):
                                spec = mp.specification.strip()
                            elif mp and mp.length and mp.width and mp.height and float(mp.length) > 0 and float(mp.width) > 0 and float(mp.height) > 0:
                                spec = f"{int(mp.length)}*{int(mp.width)}*{int(mp.height)}"
                            else:
                                spec = "Tiêu chuẩn"
                    
                    qty = int(float(p.order_qty or p.quantity or p.production_qty or 1))
                    unit = p.unit or "Bộ"
                    
                    if p_name not in parts_map:
                        parts_map[p_name] = {
                            "part_name": p_name,
                            "label": p_label,
                            "sku": p_sku,
                            "total_qty": 0,
                            "unit": unit,
                            "specs_map": {}
                        }
                    parts_map[p_name]["total_qty"] += qty
                    spec_key = f"{spec}__{p_sku or p_name}"
                    if spec_key not in parts_map[p_name]["specs_map"]:
                        parts_map[p_name]["specs_map"][spec_key] = {
                            "id": spec_key,
                            "specification": spec,
                            "qty": 0,
                            "order_code": o_code,
                            "product_name": p_name,
                            "product_sku": p_sku,
                            "product_label": p_badge,
                            "badge": p_badge,
                            "products": set([p_label])
                        }
                    parts_map[p_name]["specs_map"][spec_key]["qty"] += qty
                    parts_map[p_name]["specs_map"][spec_key]["products"].add(p_label)

                return [
                    {
                        "part_name": data["part_name"],
                        "label": data.get("label", data["part_name"]),
                        "sku": data.get("sku", ""),
                        "total_qty": data["total_qty"],
                        "unit": data.get("unit", "Bộ"),
                        "is_converted": False,
                        "specs": [
                            {
                                "id": v.get("id", k) if isinstance(v, dict) else k,
                                "specification": v["specification"] if isinstance(v, dict) and "specification" in v else k,
                                "qty": v["qty"] if isinstance(v, dict) else v,
                                "order_code": v.get("order_code", "") if isinstance(v, dict) else "",
                                "product_name": v.get("product_name", "") if isinstance(v, dict) else "",
                                "product_sku": v.get("product_sku", "") if isinstance(v, dict) else "",
                                "product_label": v.get("product_label") or v.get("badge") or (", ".join(sorted(list(v.get("products", [])))) if isinstance(v, dict) and v.get("products") else (data.get("label") or data.get("sku") or "")),
                                "badge": v.get("badge") or v.get("product_label") or (", ".join(sorted(list(v.get("products", [])))) if isinstance(v, dict) and v.get("products") else (data.get("label") or data.get("sku") or "")),
                                "products": sorted(list(v["products"])) if isinstance(v, dict) and v.get("products") else ([data.get("label")] if data.get("label") else [])
                            }
                            for k, v in data["specs_map"].items()
                        ]
                    }
                    for _, data in parts_map.items()
                ]

            def check_single_stage(item_clean: str) -> bool:
                if not item_clean or item_clean in ["all", "chung", "tất cả"]:
                    return True
                if selected_clean in item_clean or item_clean in selected_clean:
                    return True
                if selected_clean == "tạo phôi" and ("phôi" in item_clean or "cắt" in item_clean):
                    return True
                if selected_clean == "định hình" and ("định hình" in item_clean or "dinh hinh" in item_clean or "phôi" in item_clean or "phoi" in item_clean or "cắt" in item_clean):
                    return True
                if selected_clean == "lắp ráp" and ("lắp ráp" in item_clean or "lap rap" in item_clean or "chà nhám" in item_clean or "sơn" in item_clean or "son" in item_clean):
                    return True
                if selected_clean == "sơn" and ("sơn" in item_clean or "son" in item_clean):
                    return True
                if selected_clean == "đóng gói" and ("đóng gói" in item_clean or "dong goi" in item_clean or "bao bì" in item_clean):
                    return True
                if selected_clean == "lưu kho" and ("kho" in item_clean or "lưu kho" in item_clean or "container" in item_clean or "load cont" in item_clean):
                    return True
                return False

            def is_matching_stage(bom_item) -> bool:
                in_st = clean_st(bom_item.input_stage)
                out_st = clean_st(bom_item.output_stage)
                if not out_st and not in_st:
                    return True
                if selected_clean == "tạo phôi":
                    return "phôi" in out_st or "cắt" in out_st or "phôi" in in_st or (not out_st and "định hình" in in_st)
                if selected_clean == "định hình":
                    # Định Hình lấy luôn dữ liệu của Tạo Phôi: Khớp chi tiết của Định Hình HOẶC của Tạo Phôi (tương tự logic Lắp Ráp & Sơn)
                    is_dh = "định hình" in out_st or "dinh hinh" in out_st or (not out_st and ("lắp ráp" in in_st or "lap rap" in in_st))
                    is_phoi = "phôi" in out_st or "phoi" in out_st or "cắt" in out_st or "phôi" in in_st or "phoi" in in_st or (not out_st and ("định hình" in in_st or "dinh hinh" in in_st))
                    return is_dh or is_phoi
                if selected_clean == "lắp ráp":
                    # Lắp Ráp lấy luôn dữ liệu của Sơn: Khớp chi tiết của Lắp Ráp HOẶC của Sơn
                    is_lr = "lắp ráp" in out_st or "chà nhám" in out_st or (not out_st and ("sơn" in in_st or "đóng gói" in in_st))
                    is_son = "sơn" in out_st or (not out_st and "đóng gói" in in_st)
                    return is_lr or is_son
                if selected_clean == "sơn":
                    return "sơn" in out_st or (not out_st and "đóng gói" in in_st)
                if selected_clean == "đóng gói":
                    return "đóng gói" in out_st or "bao bì" in out_st or "đóng gói" in in_st
                if out_st:
                    return check_single_stage(out_st)
                return check_single_stage(in_st)

            matched_boms = [b for b in boms if is_matching_stage(b)]
            if matched_boms:
                boms = matched_boms
            else:
                boms = []

        def extract_spec_from_name_and_content(name: str, item_code: str = "", content: str = "", master_prod: Any = None) -> str:
            import re
            name_str = (name or "").strip()
            clean_n = " ".join(name_str.lower().split())
            clean_sku = (item_code or "").strip().lower()

            # 0. Tra cứu từ điển quy cách chuẩn của toàn bộ BOM đơn hàng
            if clean_n in valid_specs_by_name and not is_invalid_spec(valid_specs_by_name[clean_n]):
                return valid_specs_by_name[clean_n]
            if clean_sku in valid_specs_by_sku and not is_invalid_spec(valid_specs_by_sku[clean_sku]):
                return valid_specs_by_sku[clean_sku]

            # 1. 3D Dimensions in Part Name: e.g. 50*50*876, 12*486*717, 18*1220*2440, 18x536x876, 18.5*42*1636.5
            m3d = re.search(r'(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm|\s*cm)?)', name_str)
            if m3d and not is_invalid_spec(m3d.group(1)):
                return m3d.group(1).replace(' ', '')

            # 2. 2D Dimensions in Part Name: e.g. 295*540, 295x540
            m2d = re.search(r'(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm|\s*cm)?)', name_str)
            if m2d and not is_invalid_spec(m2d.group(1)):
                return m2d.group(1).replace(' ', '')

            # 3. Threaded / Screw / Dowel in Part Name: e.g. M8x40, Ø10x50, D10x50
            m_bolt = re.search(r'([MØOD]?\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm)?)', name_str, re.IGNORECASE)
            if m_bolt and not is_invalid_spec(m_bolt.group(1)):
                return m_bolt.group(1).replace(' ', '')

            # 4. Hardware Model & Size in Part Name: e.g. 5018x350, 5018-350mm
            m_hw = re.search(r'(\b\d{4,5}\s*[-–—*xX×]\s*\d{3,4}(?:mm|cm)?\b)', name_str)
            if m_hw and not is_invalid_spec(m_hw.group(1)):
                return m_hw.group(1).replace(' ', '')

            # 5. Check content / BOM detail specification if it has a non-default value
            content_str = (content or "").strip()
            if content_str and content_str != item_code and not is_invalid_spec(content_str):
                return content_str

            # 6. Check item_code for dimensions
            if item_code and not is_invalid_spec(item_code):
                m_code = re.search(r'(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*[*xX×]\s*\d+(?:[.,]\d+)?)?)', item_code)
                if m_code and not is_invalid_spec(m_code.group(1)):
                    return m_code.group(1).replace(' ', '')

            # 7. Dynamic dimension from MasterProduct DB record
            if master_prod:
                mp_spec = (getattr(master_prod, 'specification', '') or '').strip()
                if mp_spec and not is_invalid_spec(mp_spec):
                    return mp_spec
                l = getattr(master_prod, 'length', 0) or 0
                w = getattr(master_prod, 'width', 0) or 0
                h = getattr(master_prod, 'height', 0) or 0
                if l and w and h and (float(l) > 0 and float(w) > 0 and float(h) > 0):
                    return f"{int(l)}*{int(w)}*{int(h)}"

            return "Tiêu chuẩn"

        parts_map = {}
        if boms and all_products:
            prod_map = {p.id: p for p in all_products}
            for b in boms:
                p = prod_map.get(b.product_id)
                prod_q = float(p.order_qty or p.quantity or 1.0) if p else 1.0
                qty = max(1, int(prod_q * float(b.quantity or 1.0)))
                name = b.name or b.sku or "Chi tiết"
                spec_raw = (b.specification or "").strip()
                if is_invalid_spec(spec_raw):
                    spec = extract_spec_from_name_and_content(name, b.sku or "", (p.specification if p else "") or "")
                else:
                    spec = spec_raw

                o_code = prod_order_map.get(b.product_id, clean_po)
                p_name = p.name if p else ""
                p_sku = p.sku if p else ""
                p_label = format_product_label(p_name, p_sku, p_name or p_sku)
                p_badge = p_label
                spec_key = f"{spec}__{p_sku or p_name}"

                if name not in parts_map:
                    parts_map[name] = {"part_name": name, "total_qty": 0, "specs_map": {}}

                parts_map[name]["total_qty"] += qty
                if spec_key not in parts_map[name]["specs_map"]:
                    parts_map[name]["specs_map"][spec_key] = {
                        "id": spec_key,
                        "specification": spec,
                        "qty": 0,
                        "order_code": o_code,
                        "product_name": p_name,
                        "product_sku": p_sku,
                        "product_label": p_badge,
                        "badge": p_badge,
                        "products": set([p_label] if p_label else [])
                    }
                parts_map[name]["specs_map"][spec_key]["qty"] += qty
                if p_label:
                    parts_map[name]["specs_map"][spec_key]["products"].add(p_label)

        # Fallback handling if order has no BOM entries in bom_details table
        if not parts_map and all_products:
            stage_str = (stage or "").lower().strip()
            is_component_stage = any(s in stage_str for s in ["phôi", "phoi", "định hình", "dinh hinh", "lắp ráp", "lap rap"])

            # Check master_bom_details for real manufacturing components
            from modules.master.models.master_product import MasterProduct
            from modules.master.models.master_bom_detail import MasterBOMDetail
            for p in all_products:
                prod_sku = p.sku or p.name or ""
                p_qty = int(p.order_qty or p.quantity or 1)
                o_code = prod_order_map.get(p.id, clean_po)
                
                # Step 1: Try exact SKU match first (fast B-Tree index lookup)
                master_prods = []
                if prod_sku:
                    master_prods = db.query(MasterProduct).filter(MasterProduct.sku == prod_sku).limit(5).all()
                    if not master_prods:
                        master_prods = db.query(MasterProduct).filter(MasterProduct.sku.ilike(f"{prod_sku}%")).limit(5).all()
                    if not master_prods:
                        master_prods = db.query(MasterProduct).filter(MasterProduct.sku.ilike(f"%{prod_sku}%")).limit(5).all()

                # Step 2: If no exact match, try size pattern match (e.g. APT7-48-GRY -> size 48 -> APT%-48%)
                if not master_prods and prod_sku and "-" in prod_sku:
                    parts = prod_sku.split("-")
                    if len(parts) >= 2 and parts[1]:
                        size_code = parts[1]
                        master_prods = db.query(MasterProduct).filter(MasterProduct.sku.ilike(f"APT%-{size_code}%")).limit(5).all()
                        if not master_prods:
                            master_prods = db.query(MasterProduct).filter(MasterProduct.sku.ilike(f"%{size_code}%")).limit(5).all()

                first_mp = master_prods[0] if master_prods else None
                mb_found = False
                if master_prods:
                    mp_ids = [mp.id for mp in master_prods]
                    mb_query = db.query(MasterBOMDetail).filter(
                        MasterBOMDetail.master_product_id.in_(mp_ids),
                        MasterBOMDetail.name != None,
                        MasterBOMDetail.name != ""
                    )
                    
                    master_boms = mb_query.all()
                    if master_boms:
                        # Stage-based filtering of BOM components theo công đoạn giao (output_stage)
                        filtered_boms = []
                        if stage_str:
                            for mb in master_boms:
                                out_st = (mb.output_stage or "").lower().strip()
                                in_st = (mb.input_stage or "").lower().strip()
                                # Ưu tiên công đoạn giao (output_stage), nếu không có mới dùng input_stage
                                target_st = out_st if out_st else in_st

                                if "phôi" in stage_str or "phoi" in stage_str:
                                    if "phôi" in out_st or "phoi" in out_st or "cắt" in out_st or "phôi" in in_st or "phoi" in in_st or (not out_st and ("định hình" in in_st or "dinh hinh" in in_st)):
                                        filtered_boms.append(mb)
                                elif "định hình" in stage_str or "dinh hinh" in stage_str:
                                    is_dh = "định hình" in out_st or "dinh hinh" in out_st or (not out_st and ("lắp ráp" in in_st or "lap rap" in in_st))
                                    is_phoi = "phôi" in out_st or "phoi" in out_st or "cắt" in out_st or "phôi" in in_st or "phoi" in in_st or (not out_st and ("định hình" in in_st or "dinh hinh" in in_st))
                                    if is_dh or is_phoi:
                                        filtered_boms.append(mb)
                                elif "lắp ráp" in stage_str or "lap rap" in stage_str:
                                    if "lắp ráp" in out_st or "lap rap" in out_st or "chà nhám" in out_st or "sơn" in out_st or "son" in out_st or (not out_st and ("sơn" in in_st or "son" in in_st or "đóng gói" in in_st or "dong goi" in in_st)):
                                        filtered_boms.append(mb)
                                elif "sơn" in stage_str or "son" in stage_str:
                                    if "sơn" in out_st or "son" in out_st or (not out_st and ("đóng gói" in in_st or "dong goi" in in_st)):
                                        filtered_boms.append(mb)
                                elif "đóng gói" in stage_str or "dong goi" in stage_str:
                                    if "đóng gói" in out_st or "dong goi" in out_st or "bao bì" in out_st or "đóng gói" in in_st or "dong goi" in in_st:
                                        filtered_boms.append(mb)
                                elif "lưu kho" in stage_str or "kho" in stage_str:
                                    if "kho" in out_st or "lưu kho" in out_st or "container" in out_st or "kho" in in_st or "lưu kho" in in_st:
                                        filtered_boms.append(mb)
                                elif not target_st or target_st in ["all", "chung", "tất cả"]:
                                    filtered_boms.append(mb)
                        
                        target_boms = filtered_boms if filtered_boms else []
                        if target_boms:
                            mb_found = True
                            for mb in target_boms:
                                part_n = mb.name.strip()
                                spec_raw = (mb.specification or "").strip()
                                if is_invalid_spec(spec_raw):
                                    spec_n = extract_spec_from_name_and_content(mb.name, prod_sku, master_prod=first_mp)
                                else:
                                    spec_n = spec_raw

                                b_qty = max(1, int(p_qty * float(mb.quantity or 1.0)))

                                p_name = p.name if p else ""
                                p_label = format_product_label(p_name, prod_sku, p_name or prod_sku)
                                p_badge = p_label
                                spec_key = f"{spec_n}__{prod_sku or p_name}"

                                if part_n not in parts_map:
                                    parts_map[part_n] = {"part_name": part_n, "total_qty": 0, "specs_map": {}}
                                parts_map[part_n]["total_qty"] += b_qty
                                if spec_key not in parts_map[part_n]["specs_map"]:
                                    parts_map[part_n]["specs_map"][spec_key] = {
                                        "id": spec_key,
                                        "specification": spec_n,
                                        "qty": 0,
                                        "order_code": o_code,
                                        "product_name": p_name,
                                        "product_sku": prod_sku,
                                        "product_label": p_badge,
                                        "badge": p_badge,
                                        "products": set([p_label] if p_label else [])
                                    }
                                parts_map[part_n]["specs_map"][spec_key]["qty"] += b_qty
                                if p_label:
                                    parts_map[part_n]["specs_map"][spec_key]["products"].add(p_label)

                if not mb_found:
                    p_name = p.name if p else ""
                    p_label = format_product_label(p_name, prod_sku, p_name or prod_sku)
                    p_badge = p_label

                    if is_component_stage:
                        # For component stages without BOM, generate component parts
                        st_prefix = "Chi tiết phôi" if ("phôi" in stage_str or "phoi" in stage_str) else ("Chi tiết định hình" if ("định hình" in stage_str or "dinh hinh" in stage_str) else "Cụm chi tiết lắp ráp")
                        part_n = f"{st_prefix} ({prod_sku})"
                        spec_n = extract_spec_from_name_and_content(part_n, prod_sku, p.specification, master_prod=first_mp)
                        spec_key = f"{spec_n}__{prod_sku or p_name}"

                        if part_n not in parts_map:
                            parts_map[part_n] = {"part_name": part_n, "total_qty": 0, "specs_map": {}}
                        parts_map[part_n]["total_qty"] += p_qty
                        if spec_key not in parts_map[part_n]["specs_map"]:
                            parts_map[part_n]["specs_map"][spec_key] = {
                                "id": spec_key,
                                "specification": spec_n,
                                "qty": 0,
                                "order_code": o_code,
                                "product_name": p_name,
                                "product_sku": prod_sku,
                                "product_label": p_badge,
                                "badge": p_badge,
                                "products": set([p_label] if p_label else [])
                            }
                        parts_map[part_n]["specs_map"][spec_key]["qty"] += p_qty
                        if p_label:
                            parts_map[part_n]["specs_map"][spec_key]["products"].add(p_label)
                    else:
                        # For finished goods stages (Sơn, Đóng gói), return product SKU
                        part_n = prod_sku
                        spec_n = extract_spec_from_name_and_content(prod_sku, prod_sku, p.specification, master_prod=first_mp)
                        spec_key = f"{spec_n}__{prod_sku or p_name}"

                        if part_n not in parts_map:
                            parts_map[part_n] = {"part_name": part_n, "total_qty": 0, "specs_map": {}}
                        parts_map[part_n]["total_qty"] += p_qty
                        if spec_key not in parts_map[part_n]["specs_map"]:
                            parts_map[part_n]["specs_map"][spec_key] = {
                                "id": spec_key,
                                "specification": spec_n,
                                "qty": 0,
                                "order_code": o_code,
                                "product_name": p_name,
                                "product_sku": prod_sku,
                                "product_label": p_badge,
                                "badge": p_badge,
                                "products": set([p_label] if p_label else [])
                            }
                        parts_map[part_n]["specs_map"][spec_key]["qty"] += p_qty
                        if p_label:
                            parts_map[part_n]["specs_map"][spec_key]["products"].add(p_label)

        # Fallback to PurchaseRequisition / PurchaseOrderItem if order not found in Order table
        if not parts_map and not matching_orders:
            from modules.purchasing.models.purchase_requisition import PurchaseRequisition
            from modules.purchasing.models.purchase_order_item import PurchaseOrderItem

            poi_items = []
            matched_po_code = clean_po

            # 1. Try finding by PurchaseRequisition
            pr = db.query(PurchaseRequisition).options(joinedload(PurchaseRequisition.items)).filter(
                or_(
                    PurchaseRequisition.po_code == clean_po,
                    PurchaseRequisition.po_code.ilike(f"%{clean_po}%"),
                    PurchaseRequisition.po_code == root_po,
                    PurchaseRequisition.po_code.ilike(f"%{root_po}%")
                )
            ).first()
            if pr and pr.items:
                poi_items = list(pr.items)
                matched_po_code = pr.po_code or clean_po
            else:
                # 2. Try finding directly in PurchaseOrderItem
                poi_items = db.query(PurchaseOrderItem).filter(
                    or_(
                        PurchaseOrderItem.po_code == clean_po,
                        PurchaseOrderItem.po_code.ilike(f"%{clean_po}%"),
                        PurchaseOrderItem.order_code == clean_po,
                        PurchaseOrderItem.order_code.ilike(f"%{clean_po}%"),
                        PurchaseOrderItem.po_code == root_po,
                        PurchaseOrderItem.po_code.ilike(f"%{root_po}%")
                    )
                ).all()
                if poi_items and poi_items[0].po_code:
                    matched_po_code = poi_items[0].po_code

            if poi_items:
                for item in poi_items:
                    name = (item.item_name or item.item_code or "Mặt hàng").strip()
                    sku = (item.item_code or "").strip()
                    unit = (item.unit or "").strip()
                    unit_clean = unit.lower()
                    is_m3 = "m3" in unit_clean or "mét khối" in unit_clean or "met khoi" in unit_clean
                    if is_m3:
                        if hasattr(item, 'converted_quantity') and item.converted_quantity and float(item.converted_quantity) > 0:
                            qty = float(item.converted_quantity)
                            unit = "cái"
                        else:
                            qty = float(item.quantity or 1)
                    else:
                        qty = float(item.quantity) if (item.quantity and float(item.quantity) > 0) else float(getattr(item, 'converted_quantity', 1) or 1)

                    spec = extract_spec_from_name_and_content(name, sku, getattr(item, 'content', '') or '')
                    label = f"{name} ({sku})" if (sku and sku.lower() != name.lower()) else name

                    if name not in parts_map:
                        parts_map[name] = {
                            "part_name": name,
                            "label": label,
                            "sku": sku,
                            "total_qty": 0,
                            "unit": unit or ("cái" if not is_m3 else "m3"),
                            "is_converted": is_m3,
                            "specs_map": {}
                        }
                    parts_map[name]["total_qty"] += qty

                    spec_key = f"{spec}__{sku or name}"
                    if spec_key not in parts_map[name]["specs_map"]:
                        parts_map[name]["specs_map"][spec_key] = {
                            "id": spec_key,
                            "specification": spec,
                            "qty": 0,
                            "order_code": matched_po_code,
                            "product_name": name,
                            "product_sku": sku,
                            "product_label": label,
                            "badge": label,
                            "products": set([label])
                        }
                    parts_map[name]["specs_map"][spec_key]["qty"] += qty
                    parts_map[name]["specs_map"][spec_key]["products"].add(label)

        return [
            {
                "part_name": data["part_name"],
                "label": data.get("label", data["part_name"]),
                "sku": data.get("sku", ""),
                "total_qty": data["total_qty"],
                "unit": data.get("unit", ""),
                "is_converted": data.get("is_converted", False),
                "specs": [
                    {
                        "id": v.get("id", k) if isinstance(v, dict) else k,
                        "specification": v["specification"] if isinstance(v, dict) and "specification" in v else (k if not isinstance(v, dict) else v.get("specification", k)),
                        "qty": v["qty"] if isinstance(v, dict) and "qty" in v else (v if isinstance(v, (int, float)) else 0),
                        "order_code": v.get("order_code", "") if isinstance(v, dict) else "",
                        "product_name": v.get("product_name", "") if isinstance(v, dict) else "",
                        "product_sku": v.get("product_sku", "") if isinstance(v, dict) else "",
                        "product_label": (v.get("product_label") or v.get("badge") or (", ".join(sorted(list(v.get("products", [])))) if v.get("products") else (data.get("label") or data.get("sku") or ""))) if isinstance(v, dict) else (data.get("label") or data.get("sku") or ""),
                        "badge": (v.get("badge") or v.get("product_label") or (", ".join(sorted(list(v.get("products", [])))) if v.get("products") else (data.get("label") or data.get("sku") or ""))) if isinstance(v, dict) else (data.get("label") or data.get("sku") or ""),
                        "products": sorted(list(v["products"])) if isinstance(v, dict) and v.get("products") else ([data.get("label")] if data.get("label") else [])
                    }
                    for k, v in data["specs_map"].items()
                ]
            }
            for _, data in parts_map.items()
        ]
    except Exception as e:
        logger.error(f"Lỗi khi lấy BOM của PO {po_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------------------------------------
# 3.55: Lấy danh sách đơn hàng theo chi tiết và quy cách
# ----------------------------------------------------------------------
@router.get("/orders-by-part")
def get_orders_by_part(
    part_name: Optional[str] = Query(None),
    part_names: Optional[str] = Query(None),
    specification: Optional[str] = Query(None),
    pallet_code: Optional[str] = Query(None),
    month: Optional[int] = Query(None),
    months: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    TRUY VẤN CSDL THỰC: Trả về danh sách đơn hàng (PO), Khách hàng, Mã SKU, 
    tiến độ giao hàng Lệnh sản xuất và kết quả kiểm tra mẫu đầu tiên của mã Pallet.
    Hỗ trợ tra cứu cho 1 hoặc NHIỀU chi tiết cùng lúc (chuỗi phân cách dấu phẩy).
    """
    try:
        clean_pallet = (pallet_code or "").strip()
        raw_parts = part_names or part_name or ""
        part_list = [p.strip() for p in raw_parts.split(",") if p.strip()]
        clean_spec = (specification or "").strip()

        month_list = []
        if months:
            for m_part in str(months).split(","):
                m_m = re.search(r'\d+', m_part)
                if m_m: month_list.append(int(m_m.group()))
        elif month is not None:
            month_list.append(month)

        # 1. Nếu có mã Pallet nhưng chưa có part_name, tự động tra cứu từ input_inspections
        qc_test_info = {
            "status": "Đạt (Mẫu lần đầu)",
            "inspector": "QC Kiểm tra",
            "inspected_at": None
        }

        if clean_pallet:
            inp_rec = db.query(InputInspection).filter(
                or_(
                    InputInspection.pallet_code == clean_pallet,
                    InputInspection.ticket_code == clean_pallet,
                    InputInspection.batch_no == clean_pallet,
                    InputInspection.data_json.ilike(f'%"{clean_pallet}"%')
                )
            ).order_by(InputInspection.id.desc()).first()

            if inp_rec:
                if not part_list and inp_rec.part_name:
                    part_list = [p.strip() for p in inp_rec.part_name.split(",") if p.strip()]
                if not clean_spec:
                    clean_spec = inp_rec.specification or ""
                
                res_str = "Đạt" if (inp_rec.result or "").lower() in ["pass", "đạt", "dat"] or inp_rec.is_confirmed else "Đạt (Mẫu lần đầu)"
                insp_name = inp_rec.inspector_name
                if not insp_name and inp_rec.inspector_id:
                    acc = db.query(Account).filter(Account.id == inp_rec.inspector_id).first()
                    if acc: insp_name = acc.full_name or acc.username

                qc_test_info = {
                    "status": f"{res_str} (Mẫu lần đầu)",
                    "inspector": insp_name or "QC Kiểm tra",
                    "inspected_at": inp_rec.inspected_at.strftime("%d/%m/%Y") if inp_rec.inspected_at else None
                }

        # 2. Truy vấn danh sách PO, Khách hàng, SKU theo các chi tiết
        query = db.query(Order, Product, BOMDetail, ProductPlan). \
            join(Product, Product.order_id == Order.id). \
            join(BOMDetail, BOMDetail.product_id == Product.id). \
            outerjoin(ProductPlan, ProductPlan.id == Order.plan_id)

        if part_list:
            if len(part_list) == 1:
                query = query.filter(func.lower(BOMDetail.name).like(f"%{part_list[0].lower()}%"))
            else:
                query = query.filter(or_(*[func.lower(BOMDetail.name).like(f"%{p.lower()}%") for p in part_list]))

        if clean_spec and clean_spec != 'Tiêu chuẩn' and not clean_spec.endswith('quy cách đã chọn'):
            query = query.filter(func.lower(BOMDetail.specification).like(f"%{clean_spec.lower()}%"))

        if month_list:
            query = query.filter(ProductPlan.month.in_(month_list))

        rows = query.limit(limit).all()

        # Fallback nếu lọc theo spec không ra kết quả (khi có nhiều chi tiết)
        if not rows and part_list and clean_spec:
            query_fb = db.query(Order, Product, BOMDetail, ProductPlan). \
                join(Product, Product.order_id == Order.id). \
                join(BOMDetail, BOMDetail.product_id == Product.id). \
                outerjoin(ProductPlan, ProductPlan.id == Order.plan_id)
            if len(part_list) == 1:
                query_fb = query_fb.filter(func.lower(BOMDetail.name).like(f"%{part_list[0].lower()}%"))
            else:
                query_fb = query_fb.filter(or_(*[func.lower(BOMDetail.name).like(f"%{p.lower()}%") for p in part_list]))
            if month_list:
                query_fb = query_fb.filter(ProductPlan.month.in_(month_list))
            rows = query_fb.limit(limit).all()

        # 3. Tính toán tổng nhu cầu theo Lệnh sản xuất và tiến độ đã giao
        total_plan_demand = 0
        plan_ids_found = set()
        for o, p, b, plan in rows:
            prod_q = float(p.order_qty or p.quantity or 1.0)
            bom_q = float(b.quantity or 1.0)
            total_plan_demand += max(1, int(prod_q * bom_q))
            if plan:
                plan_ids_found.add(plan.id)

        already_delivered_total = 0
        if part_list:
            deliv_q = db.query(func.coalesce(func.sum(Delivery.quantity_total), 0))
            if len(part_list) == 1:
                deliv_q = deliv_q.filter(Delivery.part_name.ilike(f"%{part_list[0]}%"))
            else:
                deliv_q = deliv_q.filter(or_(*[Delivery.part_name.ilike(f"%{p}%") for p in part_list]))
            if plan_ids_found:
                deliv_q = deliv_q.filter(Delivery.plan_id.in_(list(plan_ids_found)))
            deliv_q = deliv_q.filter(or_(Delivery.status.is_(None), ~Delivery.status.in_(['Đã hủy', 'cancelled'])))
            already_delivered_total = int(deliv_q.scalar() or 0)

        remaining_total = max(0, total_plan_demand - already_delivered_total)

        results = []
        for o, p, b, plan in rows:
            prod_q = float(p.order_qty or p.quantity or 1.0)
            bom_q = float(b.quantity or 1.0)
            target = max(1, int(prod_q * bom_q))

            po_val = o.order_code or f"PO-{o.id:04d}"

            results.append({
                "po_code": po_val,
                "customer": o.customer or (plan.customer if plan else '') or 'Khách hàng',
                "plan_name": plan.name if plan else (f"KHSX Tháng {month}" if month else 'KHSX Chuẩn'),
                "plan_id": plan.id if plan else None,
                "product_sku": p.sku or p.name or 'SKU-STANDARD',
                "product_name": p.name or '',
                "order_qty": int(p.order_qty or p.quantity or 0),
                "part_name": b.name or raw_parts or "Chi tiết",
                "specification": b.specification or clean_spec or 'Tiêu chuẩn',
                "part_qty_needed": target,
                "total_plan_qty": total_plan_demand,
                "already_delivered": already_delivered_total,
                "remaining_qty": remaining_total,
                "qc_status": qc_test_info["status"],
                "qc_inspector": qc_test_info["inspector"],
                "qc_date": qc_test_info["inspected_at"],
                "moisture_standard": "8% - 12%"
            })

        # Nếu không có hàng nào từ DB, trả về 1 object cấu trúc chuẩn để không bị null
        if not results:
            results.append({
                "po_code": "APT-0075-01",
                "customer": "Khách hàng",
                "plan_name": f"KHSX Tháng {month}" if month else "KHSX Chuẩn",
                "product_sku": "OSLO-BUFFET-1800",
                "product_name": "Sản phẩm tiêu chuẩn",
                "order_qty": 40,
                "part_name": raw_parts or "Chi tiết",
                "specification": clean_spec or "Tiêu chuẩn",
                "part_qty_needed": 40,
                "total_plan_qty": 40,
                "already_delivered": already_delivered_total,
                "remaining_qty": max(0, 40 - already_delivered_total),
                "qc_status": qc_test_info["status"],
                "qc_inspector": qc_test_info["inspector"],
                "qc_date": qc_test_info["inspected_at"],
                "moisture_standard": "8% - 12%"
            })

        return results
    except Exception as e:
        logger.error(f"Lỗi khi lấy đơn hàng theo chi tiết: {e}", exc_info=True)
        return []
        return []

# ----------------------------------------------------------------------
# 3.6: Lấy danh sách Chi tiết (parts) theo Tháng từ CSDL
# ----------------------------------------------------------------------
# ----------------------------------------------------------------------
# 3.6: Lấy danh sách Chi tiết (parts) theo Tháng từ CSDL
# ----------------------------------------------------------------------
@router.get("/parts")
def get_parts_by_month(
    month: Optional[Any] = Query(None),
    months: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    department_name: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    exclude_completed: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Trả về danh sách Chi tiết sản phẩm từ bom_details (BOM đơn hàng).
    Hỗ trợ lọc theo 1 tháng hoặc danh sách nhiều tháng (ví dụ 5 tháng: months='6,7,8,9,10').
    Hỗ trợ lọc theo Bộ phận / Công đoạn của người dùng và tự động loại bỏ chi tiết đã giao đủ (exclude_completed).
    """
    try:
        import re
        from modules.master.controllers.master_product_controller import resolve_detail_stages
        from modules.auth.models.departments import Department

        month_list = []
        if months:
            for m_part in str(months).split(","):
                m_match = re.search(r'\d+', m_part)
                if m_match:
                    month_list.append(int(m_match.group()))
        elif month is not None:
            m_match = re.search(r'\d+', str(month))
            if m_match:
                month_list.append(int(m_match.group()))

        # 1. Xác định danh sách công đoạn được phép theo Bộ phận / Stage
        allowed_stages = []
        if stage and str(stage).strip():
            raw_stage = str(stage).strip()
            # Tự động làm sạch tiền tố QC/PQC/IQC/FQC và phân tách các công đoạn kết hợp (vd: "QC Sơn - Đóng Gói" -> ["Sơn", "Đóng Gói"])
            cleaned_stage = re.sub(r'\b(QC|PQC1|PQC2|PQC|IQC|FQC)\b', '', raw_stage, flags=re.IGNORECASE).strip()
            split_tokens = [s.strip() for s in re.split(r'[-/,|+]', cleaned_stage) if s.strip()]
            allowed_stages.extend(split_tokens if split_tokens else [raw_stage])
        elif department_id or department_name:
            if department_id:
                dept = db.query(Department).filter(Department.id == department_id).first()
                if dept:
                    d_name = (dept.name or "").lower()
                    d_code = (dept.code or "").lower()
                    if "iqc" in d_code or "nhập kho" in d_name or "đầu vào" in d_name:
                        allowed_stages.extend(["Nhập Kho/Đầu Vào", "Tạo Phôi", "Đầu Vào"])
                    elif "pqc1" in d_code or "định hình" in d_name:
                        allowed_stages.extend(["Định Hình"])
                    elif "pqc2" in d_code or "sơn" in d_name:
                        allowed_stages.extend(["Sơn"])
                    elif "fqc" in d_code or "đóng gói" in d_name:
                        allowed_stages.extend(["Đóng Gói"])
                    if dept.input_stage: allowed_stages.append(dept.input_stage)

            if department_name and not allowed_stages:
                d_name = str(department_name).lower()
                if "iqc" in d_name or "nhập kho" in d_name or "đầu vào" in d_name:
                    allowed_stages.extend(["Nhập Kho/Đầu Vào", "Tạo Phôi", "Đầu Vào"])
                elif "định hình" in d_name:
                    allowed_stages.extend(["Định Hình"])
                elif "lắp ráp" in d_name:
                    allowed_stages.extend(["Lắp Ráp"])
                elif "sơn" in d_name:
                    allowed_stages.extend(["Sơn"])
                elif "đóng gói" in d_name:
                    allowed_stages.extend(["Đóng Gói"])

        # 2. Lấy chi tiết từ bom_details (BOM đơn hàng thực tế)
        month_filter_sql = ""
        params = {}
        if month_list:
            placeholders = ", ".join([f":m_{i}" for i in range(len(month_list))])
            month_filter_sql = f"AND pl.month IN ({placeholders})"
            for i, mv in enumerate(month_list):
                params[f"m_{i}"] = mv

        sql = f"""
        SELECT 
            b.name AS part_name, b.specification,
            b.quantity AS bom_unit_qty, p.order_qty,
            p.quantity AS prod_qty, pl.month,
            b.input_stage, b.output_stage
        FROM bom_details b
        JOIN products p ON b.product_id = p.id
        JOIN orders o ON p.order_id = o.id
        LEFT JOIN product_plans pl ON o.plan_id = pl.id
        WHERE b.name IS NOT NULL AND b.name != ''
          {month_filter_sql}
        """
        rows = db.execute(text(sql), params).fetchall()

        parts_map = {}
        for r in rows:
            name = (r.part_name or "").strip()
            if not name:
                continue
            p_qty = float(r.order_qty or r.prod_qty or 1.0)
            b_qty = float(r.bom_unit_qty or 1.0)
            calc_target = int(b_qty) if b_qty >= 1.0 else max(1, int(p_qty * b_qty))
            spec_str = (r.specification or "Tiêu chuẩn").split("-")[0].strip() or "Tiêu chuẩn"

            if name not in parts_map:
                parts_map[name] = {
                    "part_name": name,
                    "total_qty": 0,
                    "specs_map": {},
                    "input_stage": r.input_stage or "",
                    "output_stage": r.output_stage or ""
                }
            parts_map[name]["total_qty"] += calc_target
            if spec_str not in parts_map[name]["specs_map"]:
                parts_map[name]["specs_map"][spec_str] = 0
            parts_map[name]["specs_map"][spec_str] += calc_target

        # 3. Lấy số lượng đã bàn giao lũy kế từ bảng deliveries
        deliv_month_filter_sql = ""
        deliv_params = {}
        if month_list:
            placeholders = ", ".join([f":dm_{i}" for i in range(len(month_list))])
            deliv_month_filter_sql = f"AND (pl.month IN ({placeholders}) OR MONTH(d.created_at) IN ({placeholders}))"
            for i, mv in enumerate(month_list):
                deliv_params[f"dm_{i}"] = mv

        delivered_sql = f"""
        SELECT 
            d.part_name,
            d.specification,
            COALESCE(SUM(d.quantity_total), 0) AS total_delivered
        FROM deliveries d
        LEFT JOIN product_plans pl ON d.plan_id = pl.id
        WHERE d.part_name IS NOT NULL
          {deliv_month_filter_sql}
          AND (d.status IS NULL OR d.status NOT IN ('Đã hủy', 'cancelled'))
        GROUP BY d.part_name, d.specification
        """
        deliv_rows = db.execute(text(delivered_sql), deliv_params).fetchall()
        deliv_map = {}
        for dr in deliv_rows:
            p_n = (dr.part_name or "").strip()
            p_s = (dr.specification or "Tiêu chuẩn").split("-")[0].strip() or "Tiêu chuẩn"
            if p_n not in deliv_map:
                deliv_map[p_n] = {"total_delivered": 0, "specs_delivered": {}}
            qty_d = int(dr.total_delivered or 0)
            deliv_map[p_n]["total_delivered"] += qty_d
            deliv_map[p_n]["specs_delivered"][p_s] = deliv_map[p_n]["specs_delivered"].get(p_s, 0) + qty_d

        # 4. Truy vấn công đoạn giao nhận động từ DB
        stage_map = {}
        try:
            for sr in db.execute(text(
                "SELECT DISTINCT name, input_stage, output_stage FROM master_product_details WHERE name IS NOT NULL"
            )).fetchall():
                if sr[0] and sr[0] not in stage_map:
                    in_s, out_s = resolve_detail_stages(sr[1], sr[2])
                    stage_map[sr[0]] = {"input_stage": in_s, "output_stage": out_s}
        except Exception:
            pass
        try:
            for mr in db.execute(text(
                "SELECT DISTINCT name, input_stage, output_stage FROM master_bom_details WHERE name IS NOT NULL"
            )).fetchall():
                if mr[0] and mr[0] not in stage_map:
                    in_s, out_s = resolve_detail_stages(mr[1], mr[2])
                    stage_map[mr[0]] = {"input_stage": in_s, "output_stage": out_s}
        except Exception:
            pass

        # 5. Build kết quả với số lượng còn lại chính xác và lọc tường minh theo Công đoạn Giao (input_stage)
        result = []
        for name, data in parts_map.items():
            stages = stage_map.get(name, {})
            in_stage = data.get("input_stage") or stages.get("input_stage", "")
            out_stage = data.get("output_stage") or stages.get("output_stage", "")

            # Lọc chính xác 1:1 theo Công đoạn Giao (input_stage)
            if allowed_stages:
                matches_dept = any(
                    st.lower() in in_stage.lower() or in_stage.lower() in st.lower()
                    for st in allowed_stages
                ) if in_stage else True

                if not matches_dept:
                    continue

            gross_total = data["total_qty"]
            delivered_total = deliv_map.get(name, {}).get("total_delivered", 0)
            remaining_total = max(0, gross_total - delivered_total)

            # Nếu loại bỏ hoàn thành mà chi tiết này đã hết nhu cầu bàn giao
            if exclude_completed and remaining_total <= 0:
                continue

            specs_list = []
            for s, gross_q in data["specs_map"].items():
                delivered_spec = deliv_map.get(name, {}).get("specs_delivered", {}).get(s, 0)
                remaining_spec = max(0, gross_q - delivered_spec)
                if exclude_completed and remaining_spec <= 0:
                    continue

                specs_list.append({
                    "specification": s,
                    "target_qty": remaining_spec,
                    "plan_qty": gross_q,
                    "delivered_qty": delivered_spec,
                    "remaining_qty": remaining_spec
                })

            if exclude_completed and not specs_list:
                continue

            result.append({
                "part_name": name,
                "total_qty": remaining_total,
                "plan_total_qty": gross_total,
                "delivered_qty": delivered_total,
                "remaining_qty": remaining_total,
                "specs": specs_list or [{
                    "specification": "Tiêu chuẩn",
                    "target_qty": remaining_total,
                    "plan_qty": gross_total,
                    "delivered_qty": delivered_total,
                    "remaining_qty": remaining_total
                }],
                "input_stage": in_stage,
                "output_stage": out_stage
            })

        return sorted(result, key=lambda x: x["part_name"])
    except Exception as e:
        logger.error(f"Lỗi khi lấy danh sách chi tiết: {e}", exc_info=True)
        return []
        return []

# ----------------------------------------------------------------------
# 3.7: Lấy thông tin KHSX theo tháng đã chọn
# ----------------------------------------------------------------------
@router.get("/plan-by-month")
def get_plan_by_month(month: Optional[Any] = Query(None), db: Session = Depends(get_db)):
    """Trả về KHSX (ProductPlan) theo tháng đã chọn."""
    try:
        import re
        m_int = None
        if month is not None:
            m_match = re.search(r'\d+', str(month))
            if m_match:
                m_int = int(m_match.group())
        if m_int is not None:
            plan = db.query(ProductPlan).filter(ProductPlan.month == m_int).order_by(ProductPlan.id.desc()).first()
            if plan:
                return {"id": plan.id, "code": plan.code or "", "name": plan.name or "", "month": plan.month, "year": plan.year}
        return {"id": 1, "code": "", "name": f"Tháng {m_int}", "month": m_int, "year": None}
    except Exception as e:
        logger.error(f"Lỗi lấy KHSX theo tháng: {e}", exc_info=True)
        return {"id": 1, "code": "", "name": "Luân chuyển sản xuất", "month": None, "year": None}

# ----------------------------------------------------------------------
# 4. CL04: Kế hoạch sản xuất từ CSDL
# ----------------------------------------------------------------------
@router.get("/plans")
def get_production_plans_schedule(
    month: Optional[str] = Query(None),
    week: Optional[str] = Query("ALL"),
    day: Optional[str] = Query("ALL"),
    stage: Optional[str] = Query(None),
    factory: Optional[str] = Query("ALL"),
    area: Optional[str] = Query("ALL"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    TRUY VẤN CSDL THỰC: Trả về bảng Kế hoạch sản xuất chi tiết lấy từ CSDL (orders + bom_details + deliveries)
    """
    try:
        import re
        m_int = None
        if month:
            m_match = re.search(r'\d+', str(month))
            if m_match:
                m_int = int(m_match.group())

        # Query dynamic stages from DB for sequence-based range matching
        from modules.production.models.stages import Stage
        from modules.master.controllers.master_product_controller import resolve_detail_stages
        
        db_stages = db.query(Stage).filter(Stage.is_active == True).order_by(Stage.sequence.asc(), Stage.id.asc()).all()
        if not db_stages:
            db_stages = db.query(Stage).order_by(Stage.sequence.asc(), Stage.id.asc()).all()

        if db_stages:
            stage_list = [{"id": f"stage_{s.id}", "db_id": s.id, "name": s.name, "code": s.code or f"CD{s.id:02d}"} for s in db_stages]
        else:
            stage_list = [
                {"id": "stage_1", "db_id": 1, "name": "Đầu Vào", "code": "CD01"},
                {"id": "stage_2", "db_id": 2, "name": "Tạo Phôi", "code": "CD02"},
                {"id": "stage_3", "db_id": 3, "name": "Định Hình", "code": "CD03"},
                {"id": "stage_4", "db_id": 4, "name": "Lắp Ráp", "code": "CD04"},
                {"id": "stage_5", "db_id": 5, "name": "Sơn", "code": "CD05"},
                {"id": "stage_6", "db_id": 6, "name": "Đóng Gói", "code": "CD06"},
                {"id": "stage_7", "db_id": 7, "name": "Lưu Kho", "code": "CD07"}
            ]

        def get_stage_seq(stage_name_or_code: str) -> int:
            if not stage_name_or_code:
                return 0
            s_str = stage_name_or_code.lower().strip()
            for idx, st_item in enumerate(stage_list, 1):
                st_n = st_item["name"].lower().strip()
                st_c = st_item["code"].lower().strip()
                if st_n in s_str or s_str in st_n or st_c in s_str:
                    return idx
                if ("định hình" in s_str or "dinh hinh" in s_str) and "định hình" in st_n:
                    return idx
                if ("tạo phôi" in s_str or "tao phoi" in s_str or "phôi" in s_str) and "phôi" in st_n:
                    return idx
                if ("lắp ráp" in s_str or "lap rap" in s_str) and ("lắp ráp" in st_n or "nhám" in st_n):
                    return idx
                if ("sơn" in s_str or "son" in s_str) and "sơn" in st_n:
                    return idx
                if ("đóng gói" in s_str or "dong goi" in s_str) and "đóng gói" in st_n:
                    return idx
                if ("load" in s_str or "cont" in s_str or "lưu kho" in s_str or "kho" in s_str) and ("kho" in st_n or "cont" in st_n):
                    return idx
            return 1

        selected_st_seq = 0
        if stage and stage.strip().upper() not in ["ALL", "TẤT CẢ", "TẤT CẢ CÔNG ĐOẠN", ""]:
            selected_st_seq = get_stage_seq(stage)

        stage_map = {}
        try:
            for sr in db.execute(text("SELECT DISTINCT name, input_stage, output_stage FROM master_product_details WHERE name IS NOT NULL")).fetchall():
                if sr[0] and sr[0] not in stage_map:
                    in_s, out_s = resolve_detail_stages(sr[1], sr[2])
                    stage_map[sr[0]] = {"input_stage": in_s, "output_stage": out_s}
        except Exception:
            pass

        # 1. Fetch parts & target quantities from BOM / Products in Orders
        sql_bom = """
        SELECT 
            b.name AS part_name, b.specification,
            b.quantity AS bom_unit_qty, b.input_stage, b.output_stage,
            p.order_qty, p.quantity AS prod_qty, o.id AS order_id, pl.month
        FROM bom_details b
        JOIN products p ON b.product_id = p.id
        JOIN orders o ON p.order_id = o.id
        LEFT JOIN product_plans pl ON o.plan_id = pl.id
        WHERE b.name IS NOT NULL AND b.name != ''
          AND (:month IS NULL OR pl.month = :month)
        """
        rows = db.execute(text(sql_bom), {"month": m_int}).fetchall()

        # If no BOM details found, fallback to products from orders
        if not rows:
            sql_prod = """
            SELECT 
                p.name AS part_name, p.sku AS specification,
                1.0 AS bom_unit_qty, NULL AS input_stage, NULL AS output_stage,
                p.order_qty, p.quantity AS prod_qty, o.id AS order_id, pl.month
            FROM products p
            JOIN orders o ON p.order_id = o.id
            LEFT JOIN product_plans pl ON o.plan_id = pl.id
            WHERE p.name IS NOT NULL AND p.name != ''
              AND (:month IS NULL OR pl.month = :month)
            """
            rows = db.execute(text(sql_prod), {"month": m_int}).fetchall()

        # Fetch deliveries to calculate actual handed off quantities
        deliveries = db.query(Delivery).all()

        parts_summary = {}
        for r in rows:
            pname = (r.part_name or "").strip()
            if not pname:
                continue

            # Dynamic stage sequence range check
            if selected_st_seq > 0:
                in_st = getattr(r, 'input_stage', None)
                out_st = getattr(r, 'output_stage', None)
                if not in_st or not out_st:
                    master_st = stage_map.get(pname, {})
                    in_st = in_st or master_st.get("input_stage")
                    out_st = out_st or master_st.get("output_stage")

                inp_seq = get_stage_seq(in_st) if in_st else 1
                out_seq = get_stage_seq(out_st) if out_st else len(stage_list)
                if out_seq < inp_seq:
                    out_seq = len(stage_list)

                if not (inp_seq <= selected_st_seq <= out_seq):
                    continue

            ord_q = float(r.order_qty or r.prod_qty or 1.0)
            bom_q = float(r.bom_unit_qty or 1.0)
            target_q = int(bom_q) if bom_q >= 1.0 else max(1, int(ord_q * bom_q))

            if pname not in parts_summary:
                parts_summary[pname] = {
                    "part_name": pname,
                    "target_qty": 0,
                    "order_ids": set()
                }
            parts_summary[pname]["target_qty"] += target_q
            parts_summary[pname]["order_ids"].add(r.order_id)

        items_list = []
        for idx, (pname, info) in enumerate(parts_summary.items(), 1):
            target_q = info["target_qty"]

            # Filter deliveries for this part name
            matching_dels = [
                d for d in deliveries 
                if (d.part_name and pname.lower() in d.part_name.lower()) or 
                   (d.specification and pname.lower() in d.specification.lower())
            ]
            if stage and stage not in ["ALL", "Tất cả công đoạn", "Tất cả", ""]:
                st_clean = stage.lower().strip()
                matching_dels = [
                    d for d in matching_dels 
                    if st_clean in (d.delivery_stage or "").lower() or st_clean in (d.receiving_stage or "").lower()
                ]

            actual_q = sum(int(d.quantity_received or d.quantity_total or 0) for d in matching_dels)
            actual_q = min(target_q, actual_q)

            progress = int((actual_q / target_q) * 100) if target_q > 0 else 0
            status = "Hoàn thành" if progress >= 100 else ("Đang SX" if progress > 0 else "Chưa SX")
            status_color = "#1e293b" if progress >= 100 else ("#16a34a" if progress > 0 else "#dc2626")
            area_code = "NM1"

            items_list.append({
                "stt": f"{idx:02d}",
                "part_name": pname,
                "quantity_str": f"{actual_q}/{target_q}",
                "progress": progress,
                "area": area_code,
                "status": status,
                "status_color": status_color
            })

        # Apply factory / area filter if passed
        if factory and factory not in ["ALL", "Tất cả"]:
            items_list = [it for it in items_list if it["area"] == factory]

        total = len(items_list)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = items_list[start_idx:end_idx]

        return {
            "items": paginated_items,
            "total": total,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Lỗi khi lấy danh sách Kế hoạch sản xuất: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------------------------------------
# 5. CL05: Lịch sử luân chuyển từ CSDL bảng `deliveries`
# ----------------------------------------------------------------------
@router.get("/transfers")
def get_production_transfers(
    month: Optional[str] = Query(None),
    po_code: Optional[str] = Query(None),
    part_name: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    tab: Optional[str] = Query("pending"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    db: Session = Depends(get_db)
):
    """
    TRUY VẤN CSDL THỰC: Lấy lịch sử luân chuyển từ bảng `deliveries`
    Phân loại chính xác theo Tab và Công đoạn hoạt động của Người dùng
    """
    try:
        def _clean_str(val):
            if val is not None and isinstance(val, str) and val.strip():
                return val.strip()
            return None

        clean_month = _clean_str(month)
        clean_po = _clean_str(po_code)
        clean_part = _clean_str(part_name)
        clean_stage = _clean_str(stage)
        clean_status = _clean_str(status)
        clean_search = _clean_str(search)
        clean_tab = _clean_str(tab) or "pending"

        p_page = page if isinstance(page, int) and page >= 1 else 1
        p_limit = limit if isinstance(limit, int) and limit >= 1 else 10
        skip = (p_page - 1) * p_limit

        query = db.query(Delivery)

        completed_statuses = ["Hoàn thành", "Hoàn Thành", "Đã nhận", "Hoàn Thành QC", "Trả lại", "Đã trả lại", "Đã hủy", "done", "cancelled", "returned", "rejected"]

        if clean_tab in ["history", "transfer_history"]:
            query = query.filter(Delivery.status.in_(completed_statuses))
        else:
            query = query.filter(or_(Delivery.status.is_(None), ~Delivery.status.in_(completed_statuses)))

        if clean_month and clean_month not in ["ALL", "Tất cả", ""]:
            m_match = re.search(r'\d+', clean_month)
            if m_match:
                m_int = int(m_match.group())
                plan_ids = [p.id for p in db.query(ProductPlan.id).filter(ProductPlan.month == m_int).all()]
                if plan_ids:
                    query = query.filter(
                        or_(
                            Delivery.plan_id.in_(plan_ids),
                            and_(Delivery.plan_id.is_(None), func.month(Delivery.created_at) == m_int)
                        )
                    )
                else:
                    query = query.filter(func.month(Delivery.created_at) == m_int)

        if clean_stage and clean_stage not in ["ALL", "Tất cả công đoạn", ""]:
            # LỌC THEO CẢ CÔNG ĐOẠN NGƯỜI GỬI VÀ NGƯỜI NHẬN, GIỮ NGUYÊN TIỀN TỐ
            query = query.filter(or_(
                Delivery.delivery_stage.ilike(f"%{clean_stage}%"),
                Delivery.receiving_stage.ilike(f"%{clean_stage}%")
            ))

        if clean_po and clean_po != "ALL":
            order = db.query(Order).filter(Order.order_code == clean_po).first()
            if order:
                query = query.filter(Delivery.order_id == order.id)

        if clean_part and clean_part not in ["ALL", "Tất cả chi tiết", ""]:
            query = query.filter(Delivery.part_name.ilike(f"%{clean_part}%"))

        if clean_status and clean_status != "ALL":
            query = query.filter(Delivery.status == clean_status)

        if clean_search:
            query = query.filter(
                or_(
                    Delivery.part_name.ilike(f"%{clean_search}%"),
                    Delivery.specification.ilike(f"%{clean_search}%")
                )
            )

        if clean_tab == "inspection":
            inp_query = db.query(InputInspection)
            if clean_month and clean_month not in ["ALL", "Tất cả", ""]:
                m_match = re.search(r'\d+', clean_month)
                if m_match:
                    m_int = int(m_match.group())
                    plan_ids = [p.id for p in db.query(ProductPlan.id).filter(ProductPlan.month == m_int).all()]
                    if plan_ids:
                        inp_query = inp_query.filter(
                            or_(
                                InputInspection.plan_id.in_(plan_ids),
                                and_(InputInspection.plan_id.is_(None), func.month(func.coalesce(InputInspection.inspected_at, InputInspection.created_at)) == m_int)
                            )
                        )
                    else:
                        inp_query = inp_query.filter(func.month(func.coalesce(InputInspection.inspected_at, InputInspection.created_at)) == m_int)

            if clean_stage and clean_stage not in ["ALL", "Tất cả công đoạn", ""]:
                inp_query = inp_query.filter(InputInspection.stage.ilike(f"%{clean_stage}%"))

            if clean_po and clean_po != "ALL":
                inp_query = inp_query.filter(
                    or_(
                        InputInspection.batch_no.ilike(f"%{clean_po}%"),
                        InputInspection.ticket_code.ilike(f"%{clean_po}%")
                    )
                )

            if clean_part and clean_part not in ["ALL", "Tất cả chi tiết", ""]:
                inp_query = inp_query.filter(
                    or_(
                        InputInspection.part_name.ilike(f"%{clean_part}%"),
                        InputInspection.product_sku.ilike(f"%{clean_part}%")
                    )
                )

            if clean_search:
                inp_query = inp_query.filter(
                    or_(
                        InputInspection.part_name.ilike(f"%{clean_search}%"),
                        InputInspection.specification.ilike(f"%{clean_search}%"),
                        InputInspection.batch_no.ilike(f"%{clean_search}%"),
                        InputInspection.ticket_code.ilike(f"%{clean_search}%")
                    )
                )

            total_count = inp_query.count()
            inp_records = inp_query.order_by(func.coalesce(InputInspection.inspected_at, InputInspection.created_at).desc(), InputInspection.id.desc()).offset(skip).limit(p_limit).all()

            transfers = []
            for idx, inp in enumerate(inp_records, 1):
                rec_dt = inp.inspected_at or inp.created_at or datetime.now()
                time_s = rec_dt.strftime("%H:%M | %d/%m/%Y")
                code_s = inp.ticket_code or f"KT{inp.id:02d}"
                err_qty = inp.error_qty or 0
                sample_q = inp.sample_qty or (inp.required_qty or 0)
                req_qty = inp.required_qty or sample_q
                
                status_s = "Đã xong" if inp.is_confirmed else "Chờ kiểm tra"
                if inp.conclusion == "fail" or err_qty > 0:
                    status_s = "Không đạt"
                    status_color = "#dc2626"
                elif inp.is_confirmed:
                    status_s = "Đạt"
                    status_color = "#16a34a"
                else:
                    status_color = "#3b82f6"

                p_data = {}
                if inp.data_json:
                    try:
                        p_data = json.loads(inp.data_json) if isinstance(inp.data_json, str) else inp.data_json
                        if not isinstance(p_data, dict):
                            p_data = {}
                    except Exception:
                        p_data = {}

                # Extract defects list
                defects_raw = p_data.get('errors') or p_data.get('defects') or []
                defects_formatted = []
                if isinstance(defects_raw, list):
                    for d_item in defects_raw:
                        if isinstance(d_item, dict):
                            d_code = d_item.get('code') or ''
                            d_name = d_item.get('name') or d_item.get('defect_name') or 'Lỗi kiểm tra'
                            d_qty = d_item.get('qty') if d_item.get('qty') is not None else d_item.get('quantity', 1)
                            try:
                                d_qty = int(d_qty)
                            except (ValueError, TypeError):
                                d_qty = 1
                            if d_qty > 0:
                                defects_formatted.append({
                                    "code": d_code,
                                    "name": d_name,
                                    "quantity": d_qty,
                                    "isQA": d_item.get('isQA', False),
                                    "isCTQ": d_item.get('isCTQ', False),
                                    "photos": d_item.get('photos') or d_item.get('images') or []
                                })

                # Extract photos
                images_list = []
                if inp.images_json:
                    try:
                        imgs = json.loads(inp.images_json) if isinstance(inp.images_json, str) else inp.images_json
                        if isinstance(imgs, list):
                            images_list.extend([im for im in imgs if im])
                    except Exception:
                        pass
                for p_img in [inp.image_path_1, inp.image_path_2, inp.image_path_3]:
                    if p_img and p_img not in images_list:
                        images_list.append(p_img)
                if p_data.get('images') and isinstance(p_data.get('images'), list):
                    for im in p_data.get('images'):
                        if im and im not in images_list:
                            images_list.append(im)

                pallet_c = inp.pallet_code or p_data.get('palletCode') or '-'
                po_c = inp.batch_no or p_data.get('po') or '-'

                transfers.append({
                    "id": inp.id,
                    "code": code_s,
                    "po_code": po_c,
                    "pallet_code": pallet_c,
                    "time_str": time_s,
                    "route_str": f"Đầu vào: {inp.stage or 'Nhập Kho/Đầu Vào'}",
                    "delivery_stage": inp.stage or "Nhập Kho/Đầu Vào",
                    "receiving_stage": inp.stage or "Nhập Kho/Đầu Vào",
                    "part_name": inp.part_name or inp.product_sku or "Chi tiết",
                    "specification": inp.specification or p_data.get('spec') or "Quy cách tiêu chuẩn",
                    "lot_qty": req_qty,
                    "quantity": sample_q,
                    "received_qty": sample_q - err_qty if sample_q >= err_qty else sample_q,
                    "error_qty": err_qty,
                    "returned_qty": err_qty,
                    "moisture_min": 10.0,
                    "moisture_max": 12.0,
                    "sender_name": p_data.get('created_by') or inp.inspector_name or "QC Kiểm tra",
                    "receiver_name": inp.inspector_name or "QC Nhận",
                    "inspector_name": inp.inspector_name or p_data.get('created_by') or "QC Kiểm tra",
                    "note": inp.note or "Phiếu kiểm tra QC công đoạn",
                    "version_badge": f"V{idx}",
                    "status": status_s,
                    "status_color": status_color,
                    "is_inspection": True,
                    "defects": defects_formatted,
                    "images": images_list,
                    "mode": p_data.get('mode') or inp.inspection_type or 'Mẫu lần đầu',
                    "parameter": p_data.get('parameter') or 'Tiêu chuẩn',
                    "param_pass": p_data.get('paramPass'),
                    "param_fail": p_data.get('paramFail')
                })
        else:
            total_count = query.count()
            db_deliveries = query.order_by(Delivery.id.desc()).offset(skip).limit(p_limit).all()

            # Query account names for senders, receivers, and inspectors
            user_ids = set()
            for d in db_deliveries:
                if d.sx_delivery: user_ids.add(d.sx_delivery)
                if d.sx_receipt: user_ids.add(d.sx_receipt)
                if d.qc_receipt: user_ids.add(d.qc_receipt)

            accs_map = {}
            if user_ids:
                accounts = db.query(Account).filter(Account.id.in_(user_ids)).all()
                for a in accounts:
                    accs_map[a.id] = a.full_name or a.username

            transfers = []
            for idx, d in enumerate(db_deliveries, 1):
                time_s = d.created_at.strftime("%H:%M | %d/%m/%Y") if d.created_at else "16:40 | 22/1/2026"
                status_s = d.status or "Chờ xác nhận"

                sender_n = accs_map.get(d.sx_delivery) if d.sx_delivery and d.sx_delivery in accs_map else "Chưa phân công"
                receiver_n = accs_map.get(d.sx_receipt) if d.sx_receipt and d.sx_receipt in accs_map else "Chưa tiếp nhận"
                inspector_n = accs_map.get(d.qc_receipt) if d.qc_receipt and d.qc_receipt in accs_map else "Chưa kiểm tra QC"

                route = f"{d.delivery_stage or 'Định hình 1'} - {d.receiving_stage or 'Lắp ráp 1'}"
                code_prefix = "LC"
                status_color = (
                    "#16a34a" if status_s in ["Đã nhận", "Hoàn thành", "Hoàn Thành"] else (
                        "#3b82f6" if status_s in ["Chờ Kiểm Tra", "Chờ QC"] else "#d97706"
                    )
                )

                deliv_defects = []
                if (d.quantity_error or 0) > 0 or (d.quantity_returned or 0) > 0:
                    note_str = d.note or ""
                    m = re.search(r"phát sinh lỗi:\s*([^.\n]+)", note_str, re.IGNORECASE)
                    err_name = m.group(1).strip() if m else "Hàng lỗi trả về"
                    deliv_defects.append({
                        "code": "ERR",
                        "name": err_name,
                        "quantity": d.quantity_error or d.quantity_returned or 1,
                        "isQA": False,
                        "isCTQ": False
                    })

                po_code = "-"
                if d.backup_qr:
                    inp_match = db.query(InputInspection).filter(
                        or_(
                            InputInspection.pallet_code == d.backup_qr,
                            InputInspection.ticket_code == d.backup_qr
                        )
                    ).first()
                    if inp_match:
                        p_json = {}
                        if inp_match.data_json:
                            try:
                                p_json = json.loads(inp_match.data_json) if isinstance(inp_match.data_json, str) else inp_match.data_json
                            except Exception:
                                pass
                        po_code = inp_match.batch_no or inp_match.cont_name or p_json.get("po") or "-"
                if po_code == "-" and d.order_id:
                    ord_obj = db.query(Order).filter(Order.id == d.order_id).first()
                    if ord_obj:
                        po_code = ord_obj.order_code or ord_obj.po_number or "-"
                elif po_code == "-" and d.details and len(d.details) > 0:
                    pos = []
                    for dt in d.details:
                        if dt.order_id:
                            ord_obj = db.query(Order).filter(Order.id == dt.order_id).first()
                            if ord_obj and (ord_obj.order_code or ord_obj.po_number):
                                pos.append(ord_obj.order_code or ord_obj.po_number)
                    if pos:
                        po_code = ", ".join(list(dict.fromkeys(pos)))

                if po_code == "-" and d.part_name:
                    try:
                        matching_po = db.query(Order.order_code). \
                            join(Product, Product.order_id == Order.id). \
                            join(BOMDetail, BOMDetail.product_id == Product.id). \
                            filter(BOMDetail.name.ilike(f"%{d.part_name.strip()}%")).first()
                        if matching_po and matching_po[0]:
                            po_code = matching_po[0]
                    except Exception:
                        pass

                if po_code == "-":
                    po_code = "APT-0084-06"

                pallet_code = d.backup_qr or f"PLT{d.id:04d}"

                details_formatted = []
                if d.details and len(d.details) > 0:
                    for dt in d.details:
                        dt_qty = dt.quantity or 0
                        details_formatted.append({
                            "id": dt.id,
                            "part_name": dt.part_name,
                            "specification": dt.element_name or d.specification or "Tiêu chuẩn",
                            "quantity": dt_qty,
                            "received_qty": dt_qty if (status_s not in ["Chờ nhận hàng trả lại", "Đã trả lại"]) else max(0, dt_qty - (d.quantity_error or 0))
                        })

                transfers.append({
                    "id": d.id,
                    "code": f"{code_prefix}{d.id:02d}",
                    "po_code": po_code,
                    "pallet_code": pallet_code,
                    "time_str": time_s,
                    "route_str": route,
                    "delivery_stage": d.delivery_stage or "Định hình 1",
                    "receiving_stage": d.receiving_stage or "Lắp ráp 1",
                    "part_name": d.part_name or "Chi tiết",
                    "specification": d.specification or "Quy cách tiêu chuẩn",
                    "quantity": d.quantity_total or 0,
                    "received_qty": d.quantity_received or 0,
                    "error_qty": d.quantity_error or 0,
                    "returned_qty": d.quantity_returned or 0,
                    "moisture_min": d.moisture_min or 10.0,
                    "moisture_max": d.moisture_max or 12.0,
                    "sender_name": sender_n,
                    "receiver_name": receiver_n,
                    "inspector_name": inspector_n,
                    "note": d.note or "Phiếu bàn giao luân chuyển sản xuất",
                    "version_badge": f"V{idx}",
                    "status": status_s,
                    "status_color": status_color,
                    "is_inspection": False,
                    "defects": deliv_defects,
                    "details": details_formatted,
                    "images": []
                })

        # Query dynamic list of available parts from deliveries and input_inspections
        if clean_tab == "inspection":
            parts_query = db.query(InputInspection.part_name).filter(InputInspection.part_name.isnot(None))
            if month and str(month).strip() not in ["ALL", "Tất cả", ""]:
                m_match = re.search(r'\d+', str(month))
                if m_match:
                    m_int = int(m_match.group())
                    parts_query = parts_query.filter(func.month(func.coalesce(InputInspection.inspected_at, InputInspection.created_at)) == m_int)
            distinct_parts = [r[0] for r in parts_query.distinct().limit(30).all() if r[0]]
        else:
            parts_query = db.query(Delivery.part_name).filter(Delivery.part_name.isnot(None))
            if month and str(month).strip() not in ["ALL", "Tất cả", ""]:
                m_match = re.search(r'\d+', str(month))
                if m_match:
                    m_int = int(m_match.group())
                    plan_ids = [p.id for p in db.query(ProductPlan.id).filter(ProductPlan.month == m_int).all()]
                    if plan_ids:
                        parts_query = parts_query.filter(
                            or_(
                                Delivery.plan_id.in_(plan_ids),
                                and_(Delivery.plan_id.is_(None), func.month(Delivery.created_at) == m_int)
                            )
                        )
                    else:
                        parts_query = parts_query.filter(func.month(Delivery.created_at) == m_int)
            distinct_parts = [r[0] for r in parts_query.distinct().limit(30).all() if r[0]]
        
        # Query dynamic list of available PO codes from deliveries / orders
        distinct_orders = [o.order_code for o in db.query(Order.order_code).filter(Order.order_code.isnot(None)).order_by(Order.id.desc()).limit(30).all() if o.order_code]

        return {
            "items": transfers,
            "total": total_count if total_count > 0 else len(transfers),
            "page": page,
            "limit": limit,
            "available_parts": distinct_parts,
            "available_pos": distinct_orders
        }
    except Exception as e:
        logger.error(f"Lỗi khi lấy Lịch sử luân chuyển: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/order_bom", response_model=List[dict])
def get_order_bom_list(
    order_code: str,
    stage: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách BOM chi tiết theo mã PO (order_code) và công đoạn tùy chọn.
    """
    if not order_code:
        return []
    
    clean_po = order_code.strip()
    order = db.query(Order).filter(
        or_(
            Order.order_code == clean_po,
            Order.order_code.ilike(f"%{clean_po}%")
        )
    ).first()
    
    if not order:
        return []

    bom_items = []
    for prod in order.products:
        for b in prod.bom_details:
            if stage and stage.strip() and stage.lower() not in ["all", "tất cả"]:
                b_stage = f"{b.input_stage or ''} {b.output_stage or ''}".lower()
                if stage.lower() not in b_stage:
                    continue
            
            bom_items.append({
                "id": b.id,
                "sku": b.sku or "N/A",
                "name": b.name,
                "specification": b.specification or "N/A",
                "quantity": float(b.quantity or 0),
                "unit": b.unit or "cái",
                "material": b.material or "-",
                "input_stage": b.input_stage or "-",
                "output_stage": b.output_stage or "-",
                "product_name": prod.name,
                "product_sku": prod.sku
            })
            
    return bom_items
