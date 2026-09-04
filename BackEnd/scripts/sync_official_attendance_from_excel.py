# -*- coding: utf-8 -*-
import sys
import openpyxl
import os
from datetime import datetime, date, timedelta
from sqlalchemy import text

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r'd:\SmartFlow_v2_Test\BackEnd')

from config.database import SessionLocal
from modules.kpi.models.quality_employee import QualityEmployee
from modules.kpi.models.quality_employee_attendance import QualityEmployeeAttendance

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

def sync_attendance():
    excel_path = r'D:\File\Báo cáo quân số 2026 .xlsx'
    if not os.path.exists(excel_path):
        print(f"ERROR: File not found at {excel_path}")
        return

    db = SessionLocal()

    try:
        print("=== STARTING ATTENDANCE SYNCHRONIZATION ===")
        # 1. Fetch all 27 verified quality employees
        employees = db.query(QualityEmployee).all()
        emp_by_name = {e.full_name.strip().lower(): e for e in employees}
        emp_ids = [e.employee_id for e in employees]
        
        print(f"Loaded {len(employees)} official quality employees from database.")

        # 2. Clear old/obsolete attendance records
        print("Clearing old attendance records...")
        db.execute(text("DELETE FROM quality_employee_attendances"))
        db.commit()

        # 3. Load Excel sheet 'DS Nghỉ'
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        if 'DS Nghỉ' not in wb.sheetnames:
            print("ERROR: Sheet 'DS Nghỉ' not found in Excel file.")
            return

        sh = wb['DS Nghỉ']
        synced_count = 0
        skipped_count = 0

        for r in range(4, sh.max_row + 1):
            date_val = sh.cell(r, 1).value
            name_val = sh.cell(r, 2).value
            dept_val = sh.cell(r, 3).value
            status_val = sh.cell(r, 4).value

            if not name_val or not status_val:
                continue

            name_str = str(name_val).strip()
            status_str = str(status_val).strip()

            # Parse date
            parsed_date = None
            if isinstance(date_val, datetime):
                parsed_date = date_val.date()
            elif isinstance(date_val, date):
                parsed_date = date_val
            elif isinstance(date_val, (int, float)):
                parsed_date = (datetime(1899, 12, 30) + timedelta(days=int(date_val))).date()
            elif isinstance(date_val, str):
                try:
                    parsed_date = datetime.strptime(date_val.strip(), "%Y-%m-%d").date()
                except Exception:
                    try:
                        parsed_date = datetime.strptime(date_val.strip(), "%d/%m/%Y").date()
                    except Exception:
                        pass

            if not parsed_date:
                continue

            # Check if employee is in official 27 list
            emp = emp_by_name.get(name_str.lower())
            if not emp:
                skipped_count += 1
                continue

            st_code = LABEL_TO_STATUS.get(status_str, "LEAVE_PAID")
            st_lbl = status_str
            ot_hrs = 4.0 if status_str == "22h" else (2.0 if status_str == "20h" else 0.0)

            rec = QualityEmployeeAttendance(
                employee_id=emp.employee_id,
                full_name=emp.full_name,
                department=emp.department,
                stage=emp.stage,
                factory=emp.factory,
                work_date=parsed_date,
                status=st_code,
                status_label=st_lbl,
                overtime_hours=ot_hrs,
                note="Đồng bộ từ Excel DS Nghỉ"
            )
            db.add(rec)
            synced_count += 1

        db.commit()
        print(f"Synced {synced_count} attendance records for verified personnel (skipped {skipped_count} non-active/resigned personnel records).")
        print("=== ATTENDANCE SYNCHRONIZATION COMPLETED SUCCESSFULLY ===")

    except Exception as e:
        db.rollback()
        print(f"ERROR DURING SYNC: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    sync_attendance()
