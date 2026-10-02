# -*- coding: utf-8 -*-
import sys
import openpyxl
import os
import json
from datetime import datetime, date, timedelta
from sqlalchemy import text

sys.stdout.reconfigure(encoding='utf-8')
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

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

def sync_all():
    excel_path = r"D:\SmartFlow\Báo cáo quân số 2026 .xlsx"
    if not os.path.exists(excel_path):
        excel_path = r"D:\File\Báo cáo quân số 2026 .xlsx"
    
    if not os.path.exists(excel_path):
        print(f"ERROR: File not found at {excel_path}")
        return False

    print(f"=== READING EXCEL: {excel_path} ===")
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    db = SessionLocal()

    try:
        # ----------------------------------------------------
        # 1. BẢO ĐẢM ĐỦ 29 NHÂN SỰ CHÍNH THỨC (DS HIỆN TẠI)
        # ----------------------------------------------------
        print("\n--- 1. Kiểm tra và đồng bộ danh sách nhân sự chính thức ---")
        tuoi_emp = db.query(QualityEmployee).filter(QualityEmployee.full_name == "Nguyễn Thị Hồng Tươi").first()
        if not tuoi_emp:
            note_obj = {
                "level": "Cấp 3",
                "parent_level": "Ngô Diễm My",
                "parent_id": "5981"
            }
            tuoi_emp = QualityEmployee(
                employee_id="0029",
                full_name="Nguyễn Thị Hồng Tươi",
                department="SX",
                stage="NVSX",
                factory="Vaniti Phân Xưởng 2",
                status="Đang làm việc",
                latest_rating="A",
                note=json.dumps(note_obj, ensure_ascii=False)
            )
            db.add(tuoi_emp)
            db.commit()
            print(" -> Đã thêm nhân sự STT 29: Nguyễn Thị Hồng Tươi (Mã: 0029, NVSX, Vaniti Phân Xưởng 2)")
        else:
            print(f" -> Nhân sự Nguyễn Thị Hồng Tươi đã có trong DB (Mã: {tuoi_emp.employee_id})")

        # Đảm bảo các nhân sự cũ trong lịch sử có record trạng thái 'Đã nghỉ việc' để map dữ liệu
        historical_staff = [
            ("OLD_001", "Vi Thị Mai Chi ( nghỉ việc)", "QC", "Vaniti Phân Xưởng 2"),
            ("OLD_002", "Vi Thị Mai Chi", "QC", "Vaniti Phân Xưởng 2"),
            ("OLD_003", "Lê Văn Đoàn", "QC", "Vaniti Phân Xưởng 1"),
            ("OLD_004", "Nguyễn Thị Ngọc Linh", "QC", "Vaniti Phân Xưởng 1"),
            ("OLD_005", "Nguyễn Thị Trang", "QC", "Vaniti Phân Xưởng 2"),
        ]
        for h_id, h_name, h_stage, h_factory in historical_staff:
            found = db.query(QualityEmployee).filter(QualityEmployee.full_name == h_name).first()
            if not found:
                db.add(QualityEmployee(
                    employee_id=h_id,
                    full_name=h_name,
                    department="Phòng QLCL",
                    stage=h_stage,
                    factory=h_factory,
                    status="Đã nghỉ việc",
                    latest_rating="B",
                    note="Nhân sự cũ trong lịch sử tháng 05-06/2026"
                ))
        db.commit()

        # Load lại map nhân sự
        all_emps = db.query(QualityEmployee).all()
        emp_by_name = {e.full_name.strip().lower(): e for e in all_emps}
        print(f"Tổng số nhân viên trong danh bạ quản lý: {len(all_emps)} (29 nhân sự chính thức đang làm việc).")

        # ----------------------------------------------------
        # 2. ĐỒNG BỘ DỮ LIỆU LỊCH CHẤM CÔNG & NGHỈ (DS Nghỉ)
        # ----------------------------------------------------
        print("\n--- 2. Đọc và đồng bộ dữ liệu sheet 'DS Nghỉ' ---")
        if 'DS Nghỉ' not in wb.sheetnames:
            print("ERROR: Không tìm thấy sheet 'DS Nghỉ' trong file Excel!")
            return False

        sh_nghi = wb['DS Nghỉ']
        # Xóa các bản ghi cũ để đồng bộ trọn vẹn, không bị trùng lặp
        print("Đang làm sạch dữ liệu cũ trong bảng quality_employee_attendances...")
        db.execute(text("DELETE FROM quality_employee_attendances"))
        db.commit()

        synced_count = 0
        min_date = None
        max_date = None

        for r in range(4, sh_nghi.max_row + 1):
            d_val = sh_nghi.cell(r, 1).value
            name_val = sh_nghi.cell(r, 2).value
            dept_val = sh_nghi.cell(r, 3).value
            status_val = sh_nghi.cell(r, 4).value
            note_val = sh_nghi.cell(r, 5).value

            if not name_val or not status_val or not d_val:
                continue

            name_str = str(name_val).strip()
            status_str = str(status_val).strip()
            note_str = str(note_val).strip() if note_val is not None else None

            # Parse ngày
            parsed_date = None
            if isinstance(d_val, datetime):
                parsed_date = d_val.date()
            elif isinstance(d_val, date):
                parsed_date = d_val
            elif isinstance(d_val, (int, float)):
                parsed_date = (datetime(1899, 12, 30) + timedelta(days=int(d_val))).date()
            elif isinstance(d_val, str):
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
                    try:
                        parsed_date = datetime.strptime(d_val.strip(), fmt).date()
                        break
                    except Exception:
                        pass

            if not parsed_date:
                continue

            if min_date is None or parsed_date < min_date:
                min_date = parsed_date
            if max_date is None or parsed_date > max_date:
                max_date = parsed_date

            # Map trạng thái
            st_code = LABEL_TO_STATUS.get(status_str, "LEAVE_PAID")
            st_lbl = status_str
            ot_hrs = 4.0 if status_str == "22h" else (2.0 if status_str == "20h" else 0.0)

            # Tìm thông tin nhân viên
            emp = emp_by_name.get(name_str.lower())
            if emp:
                emp_id = emp.employee_id
                emp_name = emp.full_name
                emp_dept = emp.department
                emp_stage = emp.stage
                emp_factory = emp.factory
            else:
                emp_id = f"NV_{name_str[:6]}"
                emp_name = name_str
                emp_dept = str(dept_val).strip() if dept_val else "Phòng QLCL"
                emp_stage = str(dept_val).strip() if dept_val else "QLCL"
                emp_factory = "Vaniti Phân Xưởng 2"

            final_note = note_str if note_str else "Đồng bộ từ Excel DS Nghỉ"

            rec = QualityEmployeeAttendance(
                employee_id=emp_id,
                full_name=emp_name,
                department=emp_dept,
                stage=emp_stage,
                factory=emp_factory,
                work_date=parsed_date,
                status=st_code,
                status_label=st_lbl,
                overtime_hours=ot_hrs,
                note=final_note
            )
            db.add(rec)
            synced_count += 1

        db.commit()
        print(f" -> Đã đồng bộ thành công {synced_count} bản ghi chấm công & nghỉ phép!")
        print(f" -> Khoảng thời gian: Từ ngày {min_date} đến ngày {max_date}")

        # Thống kê theo tháng bằng Python (tương thích mọi CSDL SQL Server, Postgres, SQLite)
        all_att_dates = [r[0] for r in db.query(QualityEmployeeAttendance.work_date).all()]
        month_counts = {}
        for wd in all_att_dates:
            m_key = wd.strftime('%Y-%m')
            month_counts[m_key] = month_counts.get(m_key, 0) + 1

        print("\n--- 3. Thống kê số lượng bản ghi theo tháng ---")
        for m in sorted(month_counts.keys()):
            print(f"  Tháng {m}: {month_counts[m]} bản ghi")

        print("\n=== ĐỒNG BỘ HOÀN TẤT THÀNH CÔNG 100% ===")
        return True

    except Exception as e:
        db.rollback()
        print(f"ERROR khi đồng bộ: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    sync_all()
