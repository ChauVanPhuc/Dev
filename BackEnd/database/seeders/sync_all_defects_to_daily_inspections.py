# -*- coding: utf-8 -*-
"""
Script Đồng bộ toàn bộ lỗi từ InputInspections và Deliveries vào DailyInspectionRecord / DailyInspectionDefect.
Đảm bảo DailyInspectionDefect là SINGLE SOURCE OF TRUTH (Nguồn dữ liệu duy nhất) cho toàn hệ thống.
"""
import sys
import os
import io
import re
import json
from datetime import datetime, date

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import app.models
from config.database import SessionLocal
from modules.inspection.models.daily_inspection import DailyInspectionRecord, DailyInspectionDefect
from modules.inspection.models.defect_type import DefectType
from modules.inspection.models.input_inspection import InputInspection
from modules.delivery.models.deliveries import Delivery

def run_sync():
    db = SessionLocal()
    try:
        print("=== BẮT ĐẦU CHUẨN HÓA VÀ ĐỒNG BỘ TOÀN BỘ LỖI VÀO DAILY_INSPECTION_DEFECTS ===")

        # 1. Clear existing daily inspection records
        db.query(DailyInspectionDefect).delete()
        db.query(DailyInspectionRecord).delete()
        db.commit()
        print("[CLEAR] Đã làm sạch các bản ghi nhật ký kiểm tra QC cũ.")

        # 2. Defect map lookup
        defect_types = db.query(DefectType).all()
        name_map = {}
        code_map = {}
        id_set = set()
        for dt in defect_types:
            id_set.add(dt.id)
            if dt.name:
                name_map[dt.name.strip().lower()] = dt.id
            if dt.code:
                code_map[dt.code.strip().lower()] = dt.id

        fallback_map = {
            "nứt tét": 1001,
            "không đồng màu": 1011,
            "lệch màu": 1021,
            "cong vênh": 1002,
            "trầy xước": 1003,
            "chảy sơn": 1004,
            "bong tróc": 1005,
            "bụi sơn": 1006,
            "dính dơ": 1007,
            "cấn móp": 1008,
            "sứt mẻ": 1009,
            "phồng rộp": 1010,
            "vết sửa chữa": 1012,
            "lỗ kim": 1013,
            "lắp ráp lệch": 1014,
            "lồi đinh": 1015,
            "thiếu sơn": 1016,
            "tem nhãn": 1017,
            "mối mọt": 1018,
            "mốc": 1019,
            "mắt chết": 1020
        }

        def resolve_defect_id(raw_id=None, raw_code=None, raw_name=None):
            if raw_id:
                try:
                    int_id = int(raw_id)
                    if int_id in id_set:
                        return int_id
                except (ValueError, TypeError):
                    pass
            if raw_code:
                c_clean = str(raw_code).strip().lower()
                if c_clean in code_map:
                    return code_map[c_clean]
            if raw_name:
                n_clean = str(raw_name).strip().lower()
                if n_clean in name_map:
                    return name_map[n_clean]
                if n_clean in fallback_map:
                    return fallback_map[n_clean]
                for k, v in fallback_map.items():
                    if k in n_clean:
                        return v
            return None

        # 3. Đồng bộ từ bảng `deliveries` (Phiếu bàn giao)
        returned_deliveries = db.query(Delivery).filter(
            (Delivery.status == "Trả lại") | (Delivery.quantity_error > 0) | (Delivery.quantity_returned > 0)
        ).all()
        print(f"[THÔNG BÁO] Tìm thấy {len(returned_deliveries)} phiếu bàn giao có lỗi trong CSDL.")

        grouped_deliveries = {}
        for deliv in returned_deliveries:
            deliv_date = deliv.created_at.date() if isinstance(deliv.created_at, datetime) else (deliv.created_at or date.today())
            stage_name = deliv.delivery_stage or "Kiểm tra bàn giao"
            inspector_id = deliv.qc_receipt or deliv.sx_delivery or 4

            note_str = deliv.note or ""
            defect_id = None
            m = re.search(r"phát sinh lỗi:\s*([^.\n]+)", note_str, re.IGNORECASE)
            if m:
                defect_id = resolve_defect_id(raw_name=m.group(1))
            if not defect_id:
                defect_id = resolve_defect_id(raw_name=note_str)
            if not defect_id:
                defect_id = 1001

            qty_error = deliv.quantity_error or deliv.quantity_returned or 1
            qty_total = deliv.quantity_total or ((deliv.quantity_received or 0) + qty_error) or (qty_error * 5)

            group_key = (deliv_date, stage_name, inspector_id)
            if group_key not in grouped_deliveries:
                grouped_deliveries[group_key] = {
                    "inspection_date": deliv_date,
                    "stage_name": stage_name,
                    "inspector_id": inspector_id,
                    "total_products": 0,
                    "total_defects": 0,
                    "defects": {}
                }

            grouped_deliveries[group_key]["total_products"] += qty_total
            grouped_deliveries[group_key]["total_defects"] += qty_error
            grouped_deliveries[group_key]["defects"][defect_id] = grouped_deliveries[group_key]["defects"].get(defect_id, 0) + qty_error

        # 4. Đồng bộ từ bảng `input_inspections` (Phiếu kiểm tra công đoạn / đầu vào)
        input_inspections = db.query(InputInspection).all()
        print(f"[THÔNG BÁO] Tìm thấy {len(input_inspections)} phiếu kiểm tra (input_inspections) trong CSDL.")

        for inp in input_inspections:
            rec_dt = inp.inspected_at or inp.created_at
            if isinstance(rec_dt, datetime):
                rec_date = rec_dt.date()
            elif isinstance(rec_dt, date):
                rec_date = rec_dt
            elif isinstance(rec_dt, str):
                try:
                    rec_date = datetime.strptime(rec_dt[:10], "%Y-%m-%d").date()
                except Exception:
                    rec_date = date.today()
            else:
                rec_date = date.today()

            stage_name = inp.stage or "Nhập Kho/Đầu Vào"
            inspector_id = inp.inspector_id or 4

            if not inp.data_json:
                continue

            try:
                p_data = json.loads(inp.data_json) if isinstance(inp.data_json, str) else inp.data_json
                if not isinstance(p_data, dict):
                    continue

                p_qty = p_data.get('sample_qty') or p_data.get('inspected_qty') or inp.sample_qty or (inp.required_qty or 0)
                try:
                    p_qty = int(p_qty)
                except (ValueError, TypeError):
                    p_qty = 0

                defects_list = p_data.get('errors') or p_data.get('defects') or []
                if isinstance(defects_list, list) and len(defects_list) > 0:
                    group_key = (rec_date, stage_name, inspector_id)
                    if group_key not in grouped_deliveries:
                        grouped_deliveries[group_key] = {
                            "inspection_date": rec_date,
                            "stage_name": stage_name,
                            "inspector_id": inspector_id,
                            "total_products": 0,
                            "total_defects": 0,
                            "defects": {}
                        }

                    if p_qty > 0:
                        grouped_deliveries[group_key]["total_products"] += p_qty

                    for df in defects_list:
                        if not isinstance(df, dict):
                            continue
                        df_id = resolve_defect_id(
                            raw_id=df.get('defect_id') or df.get('defectId') or df.get('id'),
                            raw_code=df.get('code'),
                            raw_name=df.get('defect_name') or df.get('name')
                        )
                        if df_id:
                            qty = df.get('quantity') or df.get('qty', 1)
                            try:
                                qty = int(qty)
                            except (ValueError, TypeError):
                                qty = 1
                            if qty > 0:
                                grouped_deliveries[group_key]["total_defects"] += qty
                                grouped_deliveries[group_key]["defects"][df_id] = grouped_deliveries[group_key]["defects"].get(df_id, 0) + qty
            except Exception as e:
                print(f"[WARNING] Bỏ qua phiếu id={inp.id} do parse json lỗi: {e}")

        # 5. Ghi vào DailyInspectionRecord và DailyInspectionDefect
        inserted_records = 0
        inserted_defects = 0

        for key, rdata in grouped_deliveries.items():
            t_prod = rdata["total_products"] or rdata["total_defects"] or 1
            t_def = rdata["total_defects"]
            d_rate = round((t_def / t_prod * 100), 2) if t_prod > 0 else 0.0

            created_dt = datetime.combine(rdata["inspection_date"], datetime.min.time())

            new_rec = DailyInspectionRecord(
                inspection_date = rdata["inspection_date"],
                stage_name      = rdata["stage_name"],
                inspector_id    = rdata["inspector_id"],
                total_products  = t_prod,
                total_defects   = t_def,
                defect_rate     = d_rate,
                created_at      = created_dt
            )
            db.add(new_rec)
            db.flush()
            inserted_records += 1

            for df_id, df_qty in rdata["defects"].items():
                db.add(DailyInspectionDefect(
                    record_id = new_rec.id,
                    defect_id = df_id,
                    quantity  = df_qty
                ))
                inserted_defects += df_qty

        db.commit()
        print("-" * 50)
        print(f"[SUCCESS] Đã đồng bộ {inserted_records} bản ghi nhật ký ({inserted_defects} lỗi) vào DailyInspectionDefects!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Đồng bộ thất bại: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_sync()
