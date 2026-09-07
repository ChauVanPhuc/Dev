# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import date, datetime, timedelta
import math
import openpyxl
import os

from config.database import get_db, engine, Base
from modules.kpi.models.quality_employee import QualityEmployee
from modules.kpi.models.quality_employee_attendance import QualityEmployeeAttendance

# Khởi tạo bảng nếu chưa có
QualityEmployeeAttendance.__table__.create(bind=engine, checkfirst=True)

router = APIRouter()

# --- Status Map & Labels ---
STATUS_LABEL_MAP = {
    "WORKING": "Đi làm",
    "LEAVE_PAID": "Vắng CP",
    "LEAVE_UNPAID": "Vắng KP",
    "EARLY_LEAVE_1630": "Về 16h30",
    "HALF_DAY": "Nghỉ 0.5 ngày",
    "OT_20H": "20h",
    "OT_22H": "22h",
    "SUNDAY_OFF": "Vắng chủ nhật"
}

LABEL_TO_STATUS = {
    "Vắng CP": "LEAVE_PAID",
    "Vắng KP": "LEAVE_UNPAID",
    "Về 16h30": "EARLY_LEAVE_1630",
    "Nghỉ 0.5 ngày": "HALF_DAY",
    "20h": "OT_20H",
    "22h": "OT_22H",
    "Vắng chủ nhật": "SUNDAY_OFF",
    "đi làm": "WORKING",
    "Đi làm": "WORKING"
}

# --- Pydantic Schemas ---
class AttendanceBase(BaseModel):
    employee_id: str
    full_name: str
    department: Optional[str] = "Phòng QLCL"
    stage: Optional[str] = "QLCL"
    factory: Optional[str] = "Nhà máy 1"
    work_date: date
    status: str = "WORKING"
    status_label: Optional[str] = None
    overtime_hours: Optional[float] = 0.0
    note: Optional[str] = None

class BatchAttendanceCreate(BaseModel):
    employee_ids: List[str]
    employee_shifts: Optional[Dict[str, str]] = None  # Dict mapping employee_id -> status (vd: {"0027": "OT_20H", "0090": "OT_22H"})
    start_date: date
    end_date: date
    status: Optional[str] = "OT_22H"  # Fallback LEAVE_PAID, LEAVE_UNPAID, EARLY_LEAVE_1630, HALF_DAY, OT_20H, OT_22H, SUNDAY_OFF, WORKING
    status_label: Optional[str] = None
    overtime_hours: Optional[float] = 0.0
    note: Optional[str] = None
    skip_weekends: Optional[bool] = False

class AttendanceResponse(AttendanceBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.post("/seed-initial-data")
def seed_attendance_from_excel(db: Session = Depends(get_db)):
    """
    Tự động import dữ liệu lịch chấm công từ file Excel D:\File\Báo cáo quân số 2026 .xlsx nếu DB chưa có
    """
    excel_path = r'D:\File\Báo cáo quân số 2026 .xlsx'
    if not os.path.exists(excel_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy file Excel Báo cáo quân số 2026 .xlsx")

    existing_count = db.query(QualityEmployeeAttendance).count()
    if existing_count > 0:
        return {"message": f"Bảng chấm công đã có {existing_count} bản ghi.", "count": existing_count}

    # Fetch existing quality employees map by full_name and employee_id
    employees = db.query(QualityEmployee).all()
    emp_by_name = {e.full_name.strip().lower(): e for e in employees}
    emp_by_id = {e.employee_id.strip(): e for e in employees}

    wb = openpyxl.load_workbook(excel_path, data_only=True)
    count = 0

    # 1. Parse Sheet 'DS Nghỉ'
    if 'DS Nghỉ' in wb.sheetnames:
        sh_nghi = wb['DS Nghỉ']
        for r in range(4, sh_nghi.max_row + 1):
            date_val = sh_nghi.cell(r, 1).value
            name_val = sh_nghi.cell(r, 2).value
            dept_val = sh_nghi.cell(r, 3).value
            status_val = sh_nghi.cell(r, 4).value

            if not name_val or not status_val:
                continue

            name_str = str(name_val).strip()
            status_str = str(status_val).strip()

            # Parse date
            parsed_date = None
            if isinstance(date_val, datetime):
                parsed_date = date_val.date()
            elif isinstance(date_val, (int, float)):
                # Excel serial date (origin 1899-12-30)
                parsed_date = (datetime(1899, 12, 30) + timedelta(days=int(date_val))).date()

            if not parsed_date:
                parsed_date = date.today()

            # Map status
            st_code = LABEL_TO_STATUS.get(status_str, "LEAVE_PAID")
            st_lbl = status_str
            ot_hrs = 4.0 if status_str == "22h" else (2.0 if status_str == "20h" else 0.0)

            # Match employee
            emp = emp_by_name.get(name_str.lower())
            if not emp:
                new_code = f"NV_QLCL_{len(emp_by_name) + 1:03d}"
                emp = QualityEmployee(
                    employee_id=new_code,
                    full_name=name_str,
                    department=dept_val or "Phòng QLCL",
                    stage=dept_val or "QLCL",
                    factory="Nhà máy 1",
                    status="Đang làm việc",
                    latest_rating="A"
                )
                db.add(emp)
                db.flush()
                emp_by_name[name_str.lower()] = emp
                emp_by_id[new_code] = emp

            emp_id = emp.employee_id
            emp_factory = emp.factory
            emp_dept = emp.department
            emp_stage = emp.stage

            rec = QualityEmployeeAttendance(
                employee_id=emp_id,
                full_name=name_str,
                department=emp_dept,
                stage=emp_stage,
                factory=emp_factory,
                work_date=parsed_date,
                status=st_code,
                status_label=st_lbl,
                overtime_hours=ot_hrs,
                note=f"Imported from DS Nghỉ"
            )
            db.add(rec)
            count += 1

    db.commit()
    return {"message": f"Đã khởi tạo thành công {count} bản ghi chấm công từ Excel!", "count": count}


@router.get("/day-details")
def get_attendance_day_details(
    work_date: date = Query(..., description="Ngày dạng YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách chấm công / báo phép / tăng ca của một ngày cụ thể
    """
    records = db.query(QualityEmployeeAttendance).filter(
        QualityEmployeeAttendance.work_date == work_date
    ).all()

    return [
        {
            "id": r.id,
            "employee_id": r.employee_id,
            "full_name": r.full_name,
            "department": r.department,
            "stage": r.stage,
            "factory": r.factory,
            "status": r.status,
            "status_label": r.status_label or STATUS_LABEL_MAP.get(r.status, r.status),
            "overtime_hours": r.overtime_hours,
            "note": r.note
        }
        for r in records
    ]


@router.get("/calendar")
def get_attendance_calendar(
    month: str = Query(..., description="Tháng dạng YYYY-MM, ví dụ 2026-09"),
    factory: Optional[str] = None,
    department: Optional[str] = None,
    employee_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Lấy ma trận chấm công theo tháng cho màn hình Calendar
    """
    try:
        year_str, month_str = month.split("-")
        year = int(year_str)
        month_num = int(month_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Tháng phải có định dạng YYYY-MM")

    # Start and end date of month
    start_date = date(year, month_num, 1)
    if month_num == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month_num + 1, 1) - timedelta(days=1)

    # Query attendance records in date range
    query = db.query(QualityEmployeeAttendance).filter(
        QualityEmployeeAttendance.work_date >= start_date,
        QualityEmployeeAttendance.work_date <= end_date
    )

    if factory:
        query = query.filter(QualityEmployeeAttendance.factory == factory)
    if department:
        query = query.filter(QualityEmployeeAttendance.department == department)
    if employee_id:
        query = query.filter(QualityEmployeeAttendance.employee_id == employee_id)

    records = query.order_by(QualityEmployeeAttendance.work_date.asc()).all()

    # Query all active quality employees for complete grid
    emp_query = db.query(QualityEmployee)
    if factory:
        emp_query = emp_query.filter(QualityEmployee.factory == factory)
    if department:
        emp_query = emp_query.filter(QualityEmployee.department == department)
    if employee_id:
        emp_query = emp_query.filter(QualityEmployee.employee_id == employee_id)

    employees = emp_query.order_by(QualityEmployee.id.asc()).all()

    # Group records by date string YYYY-MM-DD
    calendar_data = {}
    for r in records:
        d_str = r.work_date.strftime("%Y-%m-%d")
        if d_str not in calendar_data:
            calendar_data[d_str] = []
        calendar_data[d_str].append({
            "id": r.id,
            "employee_id": r.employee_id,
            "full_name": r.full_name,
            "department": r.department,
            "stage": r.stage,
            "factory": r.factory,
            "status": r.status,
            "status_label": r.status_label or STATUS_LABEL_MAP.get(r.status, r.status),
            "overtime_hours": r.overtime_hours,
            "note": r.note
        })

    return {
        "month": month,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "total_records": len(records),
        "employees_count": len(employees),
        "employees": [
            {
                "id": e.id,
                "employee_id": e.employee_id,
                "full_name": e.full_name,
                "department": e.department,
                "stage": e.stage,
                "factory": e.factory
            } for e in employees
        ],
        "calendar": calendar_data
    }


@router.post("/batch-log", status_code=status.HTTP_201_CREATED)
def create_batch_attendance(payload: BatchAttendanceCreate, db: Session = Depends(get_db)):
    """
    Đăng ký Báo phép / Báo tăng ca hàng loạt cho 1 hoặc nhiều nhân sự theo khoảng ngày.
    Hỗ trợ gán ca tăng ca linh hoạt riêng biệt cho từng nhân sự (payload.employee_shifts).
    """
    if payload.start_date > payload.end_date:
        raise HTTPException(status_code=400, detail="Ngày bắt đầu không được lớn hơn ngày kết thúc")

    if not payload.employee_ids:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất 1 nhân sự")

    # Fetch employees
    employees = db.query(QualityEmployee).filter(QualityEmployee.employee_id.in_(payload.employee_ids)).all()
    if not employees:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân sự hợp lệ")

    created_records = []
    curr_date = payload.start_date

    while curr_date <= payload.end_date:
        # Check skip weekend option (Saturday = 5, Sunday = 6)
        is_single_day_selection = (payload.start_date == payload.end_date)
        if payload.skip_weekends and not is_single_day_selection and curr_date.weekday() in (5, 6):
            curr_date += timedelta(days=1)
            continue

        for emp in employees:
            # Xác định ca làm việc / ca tăng ca cụ thể của từng nhân sự
            emp_st = (payload.employee_shifts.get(emp.employee_id) if payload.employee_shifts else None) or payload.status or "OT_22H"
            emp_st_lbl = STATUS_LABEL_MAP.get(emp_st, emp_st)
            emp_ot_hrs = 4.0 if emp_st == "OT_22H" else (2.0 if emp_st == "OT_20H" else (payload.overtime_hours or 0.0))

            # Check existing record for employee & date
            existing = db.query(QualityEmployeeAttendance).filter(
                QualityEmployeeAttendance.employee_id == emp.employee_id,
                QualityEmployeeAttendance.work_date == curr_date
            ).first()

            if existing:
                existing.status = emp_st
                existing.status_label = emp_st_lbl
                existing.overtime_hours = emp_ot_hrs
                existing.note = payload.note
                existing.updated_at = datetime.utcnow()
                created_records.append(existing)
            else:
                new_rec = QualityEmployeeAttendance(
                    employee_id=emp.employee_id,
                    full_name=emp.full_name,
                    department=emp.department or "Phòng QLCL",
                    stage=emp.stage or "QLCL",
                    factory=emp.factory or "Nhà máy 1",
                    work_date=curr_date,
                    status=emp_st,
                    status_label=emp_st_lbl,
                    overtime_hours=emp_ot_hrs,
                    note=payload.note
                )
                db.add(new_rec)
                created_records.append(new_rec)

        curr_date += timedelta(days=1)

    db.commit()
    return {
        "message": f"Đã lưu thành công {len(created_records)} lượt chấm công / báo phép!",
        "count": len(created_records)
    }


@router.get("/daily-summary")
def get_daily_headcount_summary(
    period_type: Optional[str] = Query("day", description="Loại báo cáo: day, week, month"),
    report_date: Optional[str] = Query(None, description="Ngày báo cáo YYYY-MM-DD"),
    report_month: Optional[str] = Query(None, description="Tháng báo cáo YYYY-MM"),
    db: Session = Depends(get_db)
):
    """
    Lấy bảng báo cáo quân số hàng ngày, hàng tuần hoặc hàng tháng
    """
    target_date = date.today()
    if report_date:
        try:
            target_date = datetime.strptime(report_date, "%Y-%m-%d").date()
        except Exception:
            raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ (YYYY-MM-DD)")

    if period_type == "week":
        # Calculate Monday and Sunday of the selected week
        start_date = target_date - timedelta(days=target_date.weekday())
        end_date = start_date + timedelta(days=6)
        period_label = f"Tuần ({start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')})"
    elif period_type == "month":
        # Calculate first and last day of month
        if report_month:
            try:
                y, m = map(int, report_month.split('-'))
                start_date = date(y, m, 1)
            except Exception:
                start_date = date(target_date.year, target_date.month, 1)
        else:
            start_date = date(target_date.year, target_date.month, 1)
        
        # Last day of month
        if start_date.month == 12:
            end_date = date(start_date.year, 12, 31)
        else:
            end_date = date(start_date.year, start_date.month + 1, 1) - timedelta(days=1)
        period_label = f"Tháng {start_date.strftime('%m/%Y')}"
    else:
        # Day mode
        period_type = "day"
        start_date = target_date
        end_date = target_date
        period_label = f"Ngày {target_date.strftime('%d/%m/%Y')}"

    employees = db.query(QualityEmployee).all()
    categories = ["Quản lý", "QA", "QC", "NVSX"]

    summary_matrix = {
        cat: {
            "total": 0,
            "working": 0,
            "leave_paid": 0,
            "leave_unpaid": 0,
            "early_1630": 0,
            "half_day": 0,
            "ot_20h": 0,
            "ot_22h": 0,
            "sunday_off": 0,
            "details": []
        } for cat in categories
    }

    # Count master total QS per category
    for emp in employees:
        pos = (emp.stage or emp.department or '').lower()
        if 'giám đốc' in pos or 'trưởng' in pos or 'phó' in pos or 'quản lý' in pos:
            cat = "Quản lý"
        elif 'qa' in pos or 'kiểm định' in pos:
            cat = "QA"
        elif 'nvsx' in pos or 'sản xuất' in pos:
            cat = "NVSX"
        else:
            cat = "QC"
        summary_matrix[cat]["total"] += 1

    attendances = db.query(QualityEmployeeAttendance).filter(
        QualityEmployeeAttendance.work_date >= start_date,
        QualityEmployeeAttendance.work_date <= end_date
    ).all()

    emp_cat_map = {}
    for emp in employees:
        pos = (emp.stage or emp.department or '').lower()
        if 'giám đốc' in pos or 'trưởng' in pos or 'phó' in pos or 'quản lý' in pos:
            cat = "Quản lý"
        elif 'qa' in pos or 'kiểm định' in pos:
            cat = "QA"
        elif 'nvsx' in pos or 'sản xuất' in pos:
            cat = "NVSX"
        else:
            cat = "QC"
        emp_cat_map[emp.employee_id] = cat

    for att in attendances:
        cat = emp_cat_map.get(att.employee_id, "QC")
        st = att.status
        if st == "LEAVE_PAID":
            summary_matrix[cat]["leave_paid"] += 1
        elif st == "LEAVE_UNPAID":
            summary_matrix[cat]["leave_unpaid"] += 1
        elif st == "EARLY_LEAVE_1630":
            summary_matrix[cat]["early_1630"] += 1
        elif st == "HALF_DAY":
            summary_matrix[cat]["half_day"] += 1
        elif st == "OT_20H":
            summary_matrix[cat]["ot_20h"] += 1
        elif st == "OT_22H":
            summary_matrix[cat]["ot_22h"] += 1
        elif st == "SUNDAY_OFF":
            summary_matrix[cat]["sunday_off"] += 1

    # Calculate default working headcount (Total - Absences)
    for cat, item in summary_matrix.items():
        absent_count = item["leave_paid"] + item["leave_unpaid"] + item["half_day"] + item["sunday_off"]
        item["working"] = max(0, item["total"] - absent_count)

    # Construct detailed list for ALL active employees
    employee_details = []
    att_by_emp = {}
    for att in attendances:
        if att.employee_id not in att_by_emp:
            att_by_emp[att.employee_id] = []
        att_by_emp[att.employee_id].append(att)

    for emp in employees:
        cat = emp_cat_map.get(emp.employee_id, "QC")
        emp_atts = att_by_emp.get(emp.employee_id, [])
        statuses = [a.status for a in emp_atts]
        ot_hours = sum(a.overtime_hours or 0.0 for a in emp_atts)
        notes = [a.note for a in emp_atts if a.note and not any(k in a.note for k in ['Excel', 'Imported', 'Đồng bộ'])]
        
        status_display = "Đi làm"
        if "OT_22H" in statuses:
            status_display = "Tăng ca 22h"
        elif "OT_20H" in statuses:
            status_display = "Tăng ca 20h"
        elif "LEAVE_PAID" in statuses:
            status_display = "Vắng CP (Phép)"
        elif "LEAVE_UNPAID" in statuses:
            status_display = "Vắng KP"
        elif "EARLY_LEAVE_1630" in statuses:
            status_display = "Về 16h30"
        elif "HALF_DAY" in statuses:
            status_display = "Nghỉ 0.5d"
        elif "SUNDAY_OFF" in statuses:
            status_display = "Vắng CN"

        employee_details.append({
            "employee_id": emp.employee_id,
            "full_name": emp.full_name,
            "category": cat,
            "department": emp.department or "",
            "stage": emp.stage or "",
            "factory": emp.factory or "",
            "status_display": status_display,
            "overtime_hours": ot_hours,
            "note": "; ".join(notes) if notes else ""
        })

    return {
        "period_type": period_type,
        "period_label": period_label,
        "report_date": target_date.strftime("%Y-%m-%d"),
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "summary": summary_matrix,
        "totals": totals,
        "details": employee_details
    }


class UpdateAttendanceRequest(BaseModel):
    status: str
    note: Optional[str] = None

@router.put("/{id}")
def update_attendance_record(id: int, payload: UpdateAttendanceRequest, db: Session = Depends(get_db)):
    """
    Cập nhật nhanh ca tăng ca (OT_20H / OT_22H) hoặc trạng thái nghỉ phép của 1 bản ghi
    """
    rec = db.query(QualityEmployeeAttendance).filter(QualityEmployeeAttendance.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi chấm công")

    rec.status = payload.status
    rec.status_label = STATUS_LABEL_MAP.get(payload.status, payload.status)
    if payload.status == "OT_22H":
        rec.overtime_hours = 4.0
    elif payload.status == "OT_20H":
        rec.overtime_hours = 2.0
    else:
        rec.overtime_hours = 0.0

    if payload.note is not None:
        rec.note = payload.note

    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return {
        "message": "Cập nhật bản ghi chấm công thành công",
        "record": {
            "id": rec.id,
            "employee_id": rec.employee_id,
            "full_name": rec.full_name,
            "department": rec.department,
            "stage": rec.stage,
            "factory": rec.factory,
            "status": rec.status,
            "status_label": rec.status_label,
            "overtime_hours": rec.overtime_hours,
            "note": rec.note
        }
    }


@router.delete("/{id}")
def delete_attendance_record(id: int, db: Session = Depends(get_db)):
    rec = db.query(QualityEmployeeAttendance).filter(QualityEmployeeAttendance.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi chấm công")
    db.delete(rec)
    db.commit()
    return {"message": "Đã xóa bản ghi chấm công thành công"}


# --- Excel Export Endpoint ---
import io
from fastapi.responses import StreamingResponse
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

class ExportAttendanceRequest(BaseModel):
    report_type: str = "matrix"  # matrix, log, summary, overtime
    month: Optional[str] = None  # YYYY-MM
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    factory: Optional[str] = None  # VP, NM1, NM2, NM3 or ALL
    department: Optional[str] = None  # QLCL, SX or ALL
    employee_id: Optional[str] = None

@router.post("/export-excel")
def export_attendance_excel(payload: ExportAttendanceRequest, db: Session = Depends(get_db)):
    """
    Xuất báo cáo lịch chấm công / nghỉ phép / tăng ca ra file Excel (.xlsx) với 4 tùy chọn mẫu báo cáo
    """
    # 1. Determine date range
    if payload.month:
        try:
            y, m = map(int, payload.month.split('-'))
            start = date(y, m, 1)
            if m == 12:
                end = date(y + 1, 1, 1) - timedelta(days=1)
            else:
                end = date(y, m + 1, 1) - timedelta(days=1)
        except Exception:
            start = payload.start_date or date.today().replace(day=1)
            end = payload.end_date or date.today()
    elif payload.start_date and payload.end_date:
        start = payload.start_date
        end = payload.end_date
    else:
        # Default current month
        today = date.today()
        start = today.replace(day=1)
        if today.month == 12:
            end = date(today.year + 1, 1, 1) - timedelta(days=1)
        else:
            end = date(today.year, today.month + 1, 1) - timedelta(days=1)

    # 2. Query Employees
    emp_query = db.query(QualityEmployee)
    if payload.factory and payload.factory != 'ALL':
        emp_query = emp_query.filter(QualityEmployee.factory == payload.factory)
    if payload.department and payload.department != 'ALL':
        emp_query = emp_query.filter(QualityEmployee.department == payload.department)
    if payload.employee_id:
        emp_query = emp_query.filter(QualityEmployee.employee_id == payload.employee_id)
    
    employees = emp_query.order_by(QualityEmployee.employee_id.asc()).all()

    # 3. Query Attendances in Date Range
    att_query = db.query(QualityEmployeeAttendance).filter(
        QualityEmployeeAttendance.work_date >= start,
        QualityEmployeeAttendance.work_date <= end
    )
    if payload.factory and payload.factory != 'ALL':
        att_query = att_query.filter(QualityEmployeeAttendance.factory == payload.factory)
    if payload.department and payload.department != 'ALL':
        att_query = att_query.filter(QualityEmployeeAttendance.department == payload.department)
    if payload.employee_id:
        att_query = att_query.filter(QualityEmployeeAttendance.employee_id == payload.employee_id)
    
    attendances = att_query.order_by(QualityEmployeeAttendance.work_date.asc()).all()

    # 4. Build Excel Workbook using OpenPyXL
    wb = openpyxl.Workbook()
    ws = wb.active

    # Bật hiển thị đường lưới GridLines trong Excel viewer
    try:
        ws.views.sheetView[0].showGridLines = True
    except Exception:
        pass

    # Fonts
    font_title = Font(name='Segoe UI', size=14, bold=True, color='3D2314')
    font_sub = Font(name='Segoe UI', size=9.5, italic=True, color='64748B')
    font_header = Font(name='Segoe UI', size=10, bold=True, color='FFFFFF')
    font_body = Font(name='Segoe UI', size=9.5)
    font_body_center = Font(name='Segoe UI', size=9.5)
    font_bold = Font(name='Segoe UI', size=9.5, bold=True)
    font_total = Font(name='Segoe UI', size=10, bold=True, color='0F172A')

    # Status Fonts with contrasting colors for readability
    STATUS_FONTS = {
        "LEAVE_PAID": Font(name='Segoe UI', size=9.5, bold=True, color='B45309'),        # Dark Amber
        "LEAVE_UNPAID": Font(name='Segoe UI', size=9.5, bold=True, color='B91C1C'),      # Dark Red
        "EARLY_LEAVE_1630": Font(name='Segoe UI', size=9.5, bold=True, color='C2410C'),  # Dark Orange
        "HALF_DAY": Font(name='Segoe UI', size=9.5, bold=True, color='A16207'),          # Dark Yellow
        "OT_20H": Font(name='Segoe UI', size=9.5, bold=True, color='4338CA'),            # Dark Indigo
        "OT_22H": Font(name='Segoe UI', size=9.5, bold=True, color='7E22CE'),            # Dark Purple
        "SUNDAY_OFF": Font(name='Segoe UI', size=9.5, color='64748B'),                   # Gray
        "WORKING": Font(name='Segoe UI', size=9.5, color='15803D')                        # Dark Green
    }

    # Fills
    fill_header = PatternFill(start_color='4A2E1B', end_color='4A2E1B', fill_type='solid') # Coffee Dark Brown
    fill_total = PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid')  # Soft Slate Total
    fill_zebra = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')  # Light Zebra

    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    total_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='475569'),
        bottom=Side(style='double', color='475569')
    )

    align_center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    align_left = Alignment(horizontal='left', vertical='center')
    align_right = Alignment(horizontal='right', vertical='center')

    # Color Fills for Attendance Statuses (Pastel palette)
    STATUS_FILLS = {
        "LEAVE_PAID": PatternFill(start_color='FEF3C7', end_color='FEF3C7', fill_type='solid'), # Soft Amber
        "LEAVE_UNPAID": PatternFill(start_color='FEE2E2', end_color='FEE2E2', fill_type='solid'), # Soft Red
        "EARLY_LEAVE_1630": PatternFill(start_color='FFEDD5', end_color='FFEDD5', fill_type='solid'), # Soft Orange
        "HALF_DAY": PatternFill(start_color='FEF9C3', end_color='FEF9C3', fill_type='solid'), # Soft Yellow
        "OT_20H": PatternFill(start_color='E0E7FF', end_color='E0E7FF', fill_type='solid'), # Soft Indigo
        "OT_22H": PatternFill(start_color='F3E8FF', end_color='F3E8FF', fill_type='solid'), # Soft Purple
        "SUNDAY_OFF": PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid'), # Soft Grey
        "WORKING": PatternFill(start_color='DCFCE7', end_color='DCFCE7', fill_type='solid') # Soft Green
    }

    STATUS_CODES = {
        "LEAVE_PAID": "P",
        "LEAVE_UNPAID": "KP",
        "EARLY_LEAVE_1630": "16h30",
        "HALF_DAY": "0.5P",
        "OT_20H": "20h",
        "OT_22H": "22h",
        "SUNDAY_OFF": "CN",
        "WORKING": "X"
    }

    rep_type = payload.report_type

    if rep_type == "matrix":
        ws.title = "Ma Trận Chấm Công"
        ws.merge_cells("A1:O1")
        ws["A1"] = f"BÁO CÁO MA TRẬN CHẤM CÔNG VÀ TĂNG CA ({start.strftime('%d/%m/%Y')} - {end.strftime('%d/%m/%Y')})"
        ws["A1"].font = font_title
        ws["A1"].alignment = align_left

        ws["A2"] = f"Bộ phận: Quản lý Chất lượng | Tổng quân số: {len(employees)} nhân sự | Ngày xuất: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ws["A2"].font = font_sub

        # Header Row (Row 4)
        headers = ["STT", "Mã NV", "Họ và Tên", "Phòng Ban", "Vị Trí", "Nhà Máy"]
        
        num_days = (end - start).days + 1
        date_list = [start + timedelta(days=i) for i in range(num_days)]
        for d in date_list:
            headers.append(f"{d.day:02d}/{d.month:02d}")
        headers.extend(["Tổng Vắng", "Tổng Giờ TC"])

        ws.row_dimensions[4].height = 28
        for col_idx, text_val in enumerate(headers, 1):
            cell = ws.cell(row=4, column=col_idx, value=text_val)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border

        att_map = {}
        for a in attendances:
            att_map[(a.employee_id, a.work_date.strftime("%Y-%m-%d"))] = a

        current_row = 5
        day_working_counts = [0] * len(date_list)
        total_all_leave = 0
        total_all_ot = 0.0

        for idx, emp in enumerate(employees, 1):
            ws.row_dimensions[current_row].height = 22
            row_fill = fill_zebra if idx % 2 == 0 else PatternFill(fill_type=None)

            c1 = ws.cell(row=current_row, column=1, value=idx)
            c1.alignment = align_center
            c2 = ws.cell(row=current_row, column=2, value=emp.employee_id)
            c2.alignment = align_center
            c3 = ws.cell(row=current_row, column=3, value=emp.full_name)
            c3.alignment = align_left
            c4 = ws.cell(row=current_row, column=4, value=emp.department or 'QLCL')
            c4.alignment = align_center
            c5 = ws.cell(row=current_row, column=5, value=emp.stage or 'QC')
            c5.alignment = align_center
            c6 = ws.cell(row=current_row, column=6, value=emp.factory or '-')
            c6.alignment = align_center

            for c in range(1, 7):
                cell = ws.cell(row=current_row, column=c)
                cell.font = font_body
                cell.border = thin_border
                if idx % 2 == 0:
                    cell.fill = row_fill

            total_leave = 0
            total_ot = 0.0

            for d_idx, d in enumerate(date_list, 7):
                d_str = d.strftime("%Y-%m-%d")
                att = att_map.get((emp.employee_id, d_str))
                cell = ws.cell(row=current_row, column=d_idx)
                cell.border = thin_border
                cell.alignment = align_center

                if att:
                    code = STATUS_CODES.get(att.status, att.status)
                    cell.value = code
                    if att.status in STATUS_FILLS:
                        cell.fill = STATUS_FILLS[att.status]
                    if att.status in STATUS_FONTS:
                        cell.font = STATUS_FONTS[att.status]
                    else:
                        cell.font = font_body

                    if att.status in ['LEAVE_PAID', 'LEAVE_UNPAID', 'HALF_DAY', 'EARLY_LEAVE_1630']:
                        total_leave += (0.5 if att.status == 'HALF_DAY' else 1)
                    else:
                        day_working_counts[d_idx - 7] += 1

                    if att.overtime_hours:
                        total_ot += att.overtime_hours
                else:
                    if d.weekday() == 6:
                        cell.value = "CN"
                        cell.fill = STATUS_FILLS["SUNDAY_OFF"]
                        cell.font = STATUS_FONTS["SUNDAY_OFF"]
                    else:
                        cell.value = "X"
                        cell.fill = STATUS_FILLS["WORKING"]
                        cell.font = STATUS_FONTS["WORKING"]
                        day_working_counts[d_idx - 7] += 1

            cell_leave = ws.cell(row=current_row, column=len(headers) - 1, value=total_leave)
            cell_leave.font = font_bold
            cell_leave.alignment = align_center
            cell_leave.border = thin_border
            if idx % 2 == 0: cell_leave.fill = row_fill

            cell_ot = ws.cell(row=current_row, column=len(headers), value=total_ot)
            cell_ot.font = font_bold
            cell_ot.alignment = align_center
            cell_ot.border = thin_border
            if idx % 2 == 0: cell_ot.fill = row_fill

            total_all_leave += total_leave
            total_all_ot += total_ot
            current_row += 1

        # Dòng Tổng Cộng Quân Số & Giờ Công cuối bảng
        ws.row_dimensions[current_row].height = 24
        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=6)
        tot_label = ws.cell(row=current_row, column=1, value="TỔNG CỘNG QUÂN SỐ CÔNG TÁC & TĂNG CA")
        tot_label.font = font_total
        tot_label.alignment = align_center
        
        for c in range(1, 7):
            ws.cell(row=current_row, column=c).fill = fill_total
            ws.cell(row=current_row, column=c).border = total_border

        for d_i, wc in enumerate(day_working_counts, 7):
            c_tot = ws.cell(row=current_row, column=d_i, value=wc)
            c_tot.font = font_total
            c_tot.alignment = align_center
            c_tot.fill = fill_total
            c_tot.border = total_border

        c_tot_leave = ws.cell(row=current_row, column=len(headers) - 1, value=total_all_leave)
        c_tot_leave.font = font_total
        c_tot_leave.alignment = align_center
        c_tot_leave.fill = fill_total
        c_tot_leave.border = total_border

        c_tot_ot = ws.cell(row=current_row, column=len(headers), value=total_all_ot)
        c_tot_ot.font = font_total
        c_tot_ot.alignment = align_center
        c_tot_ot.fill = fill_total
        c_tot_ot.border = total_border

        # 📌 THÊM TÍNH NĂNG FREEZE PANES (Cố định 4 dòng tiêu đề & Cột thông tin nhân sự A-F)
        # G5 có nghĩa là: giữ cố định dòng 1-4 ở trên và cột A-F ở bên trái khi cuộn ngang sang các ngày!
        ws.freeze_panes = 'G5'

        # 📌 THÊM BỘ LỌC AUTOFILTER TỰ ĐỘNG CHO DÒNG TIÊU ĐỀ
        max_col_letter = get_column_letter(len(headers))
        ws.auto_filter.ref = f"A4:{max_col_letter}{current_row}"

        # Đặt độ rộng chuẩn cho các cột
        ws.column_dimensions['A'].width = 6    # STT
        ws.column_dimensions['B'].width = 10   # Mã NV
        ws.column_dimensions['C'].width = 24   # Họ và Tên
        ws.column_dimensions['D'].width = 16   # Phòng Ban
        ws.column_dimensions['E'].width = 16   # Vị Trí
        ws.column_dimensions['F'].width = 10   # Nhà Máy
        
        for d_idx in range(7, 7 + len(date_list)):
            c_letter = get_column_letter(d_idx)
            ws.column_dimensions[c_letter].width = 6.5

        ws.column_dimensions[get_column_letter(len(headers) - 1)].width = 13
        ws.column_dimensions[get_column_letter(len(headers))].width = 13

    elif rep_type == "log":
        ws.title = "Nhật Ký Chi Tiết"
        ws["A1"] = f"NHẬT KÝ CHI TIẾT BÁO PHÉP & TĂNG CA ({start.strftime('%d/%m/%Y')} - {end.strftime('%d/%m/%Y')})"
        ws["A1"].font = font_title
        ws["A2"] = f"Tổng số bản ghi: {len(attendances)} | Ngày xuất: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ws["A2"].font = font_sub

        headers = ["STT", "Mã NV", "Họ và Tên", "Phòng Ban", "Vị Trí", "Nhà Máy", "Ngày Thực Hiện", "Trạng Thái / Loại Báo", "Số Giờ TC", "Ghi Chú"]
        ws.row_dimensions[4].height = 28
        for col_idx, text_val in enumerate(headers, 1):
            cell = ws.cell(row=4, column=col_idx, value=text_val)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border

        current_row = 5
        for idx, att in enumerate(attendances, 1):
            ws.row_dimensions[current_row].height = 20
            row_fill = fill_zebra if idx % 2 == 0 else PatternFill(fill_type=None)
            r_vals = [
                idx,
                att.employee_id,
                att.full_name,
                att.department or 'QLCL',
                att.stage or 'QC',
                att.factory or '-',
                att.work_date.strftime("%d/%m/%Y"),
                att.status_label or STATUS_LABEL_MAP.get(att.status, att.status),
                att.overtime_hours or 0.0,
                att.note or ''
            ]
            for c_idx, val in enumerate(r_vals, 1):
                cell = ws.cell(row=current_row, column=c_idx, value=val)
                cell.font = font_body
                cell.border = thin_border
                if idx % 2 == 0: cell.fill = row_fill
                if c_idx in [1, 2, 4, 5, 6, 7, 8, 9]:
                    cell.alignment = align_center
                else:
                    cell.alignment = align_left
            current_row += 1

        ws.freeze_panes = 'A5'
        ws.auto_filter.ref = f"A4:J{current_row - 1}"

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    elif rep_type == "overtime":
        ws.title = "Tổng Hợp Tăng Ca"
        ws["A1"] = f"BẢNG TỔNG HỢP GIỜ TĂNG CA VÀ NGÀY CÔNG ({start.strftime('%d/%m/%Y')} - {end.strftime('%d/%m/%Y')})"
        ws["A1"].font = font_title
        ws["A2"] = f"Tổng nhân sự: {len(employees)} người | Ngày xuất: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ws["A2"].font = font_sub

        headers = ["STT", "Mã NV", "Họ và Tên", "Phòng Ban", "Nhà Máy", "Số Ngày Vắng CP", "Số Lượt TC 20h (2h)", "Số Lượt TC 22h (4h)", "Tổng Giờ Tăng Ca (Giờ)"]
        ws.row_dimensions[4].height = 28
        for col_idx, text_val in enumerate(headers, 1):
            cell = ws.cell(row=4, column=col_idx, value=text_val)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border

        emp_att_map = {}
        for a in attendances:
            if a.employee_id not in emp_att_map:
                emp_att_map[a.employee_id] = []
            emp_att_map[a.employee_id].append(a)

        current_row = 5
        for idx, emp in enumerate(employees, 1):
            row_fill = fill_zebra if idx % 2 == 0 else PatternFill(fill_type=None)
            emp_records = emp_att_map.get(emp.employee_id, [])
            leave_cp = sum(1 for r in emp_records if r.status == 'LEAVE_PAID')
            ot_20h_count = sum(1 for r in emp_records if r.status == 'OT_20H')
            ot_22h_count = sum(1 for r in emp_records if r.status == 'OT_22H')
            total_ot_hours = sum(r.overtime_hours for r in emp_records if r.overtime_hours)

            r_vals = [
                idx,
                emp.employee_id,
                emp.full_name,
                emp.department or 'QLCL',
                emp.factory or '-',
                leave_cp,
                ot_20h_count,
                ot_22h_count,
                total_ot_hours
            ]
            ws.row_dimensions[current_row].height = 22
            for c_idx, val in enumerate(r_vals, 1):
                cell = ws.cell(row=current_row, column=c_idx, value=val)
                cell.font = font_body
                cell.border = thin_border
                if idx % 2 == 0: cell.fill = row_fill
                if c_idx in [1, 2, 4, 5, 6, 7, 8, 9]:
                    cell.alignment = align_center
                else:
                    cell.alignment = align_left
            current_row += 1

        ws.freeze_panes = 'D5'
        ws.auto_filter.ref = f"A4:I{current_row - 1}"

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    else:
        ws.title = "Tổng Hợp Quân Số"
        ws["A1"] = f"BÁO CÁO TỔNG HỢP QUÂN SỐ VÀ TRẠNG THÁI CHẤM CÔNG"
        ws["A1"].font = font_title
        ws["A2"] = f"Thời gian: {start.strftime('%d/%m/%Y')} - {end.strftime('%d/%m/%Y')}"
        ws["A2"].font = font_sub

        headers = ["Nhóm Bộ Phận", "Tổng QS", "Đi Làm", "Vắng CP", "Vắng KP", "Về 16h30", "Nghỉ 0.5d", "Tăng Ca 20h", "Tăng Ca 22h", "Vắng Chủ Nhật"]
        ws.row_dimensions[4].height = 28
        for col_idx, text_val in enumerate(headers, 1):
            cell = ws.cell(row=4, column=col_idx, value=text_val)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border

        categories = ["Quản lý", "QA", "QC", "NVSX"]
        matrix = {c: {"total": 0, "working": 0, "leave_paid": 0, "leave_unpaid": 0, "early_1630": 0, "half_day": 0, "ot_20h": 0, "ot_22h": 0, "sunday_off": 0} for c in categories}

        emp_cat_map = {}
        for emp in employees:
            pos = (emp.stage or emp.department or '').lower()
            if 'trưởng' in pos or 'phó' in pos or 'quản lý' in pos:
                cat = "Quản lý"
            elif 'qa' in pos:
                cat = "QA"
            elif 'nvsx' in pos:
                cat = "NVSX"
            else:
                cat = "QC"
            matrix[cat]["total"] += 1
            emp_cat_map[emp.employee_id] = cat

        for att in attendances:
            cat = emp_cat_map.get(att.employee_id, "QC")
            st = att.status
            if st == "LEAVE_PAID": matrix[cat]["leave_paid"] += 1
            elif st == "LEAVE_UNPAID": matrix[cat]["leave_unpaid"] += 1
            elif st == "EARLY_LEAVE_1630": matrix[cat]["early_1630"] += 1
            elif st == "HALF_DAY": matrix[cat]["half_day"] += 1
            elif st == "OT_20H": matrix[cat]["ot_20h"] += 1; matrix[cat]["working"] += 1
            elif st == "OT_22H": matrix[cat]["ot_22h"] += 1; matrix[cat]["working"] += 1
            elif st == "SUNDAY_OFF": matrix[cat]["sunday_off"] += 1
            elif st == "WORKING": matrix[cat]["working"] += 1

        current_row = 5
        for idx, cat in enumerate(categories, 1):
            row_fill = fill_zebra if idx % 2 == 0 else PatternFill(fill_type=None)
            d = matrix[cat]
            r_vals = [cat, d["total"], d["working"], d["leave_paid"], d["leave_unpaid"], d["early_1630"], d["half_day"], d["ot_20h"], d["ot_22h"], d["sunday_off"]]
            ws.row_dimensions[current_row].height = 22
            for c_idx, val in enumerate(r_vals, 1):
                cell = ws.cell(row=current_row, column=c_idx, value=val)
                cell.font = font_body
                cell.border = thin_border
                if idx % 2 == 0: cell.fill = row_fill
                cell.alignment = align_center if c_idx > 1 else align_left
            current_row += 1

        ws.freeze_panes = 'A5'
        ws.auto_filter.ref = f"A4:J{current_row - 1}"

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"Bao_Cao_Lich_Cham_Cong_{rep_type}_{start.strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

