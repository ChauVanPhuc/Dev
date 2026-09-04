import sys
import os
import json
import openpyxl

# Add BackEnd directory to python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config.database import engine, SessionLocal
from sqlalchemy import text
from config.security import get_password_hash

EXCEL_PATH = r"D:\File\Báo cáo quân số 2026 .xlsx"

def normalize_username(name):
    # Convert Vietnamese name to username format (e.g. "Đặng Văn Nam" -> "nam.dv")
    import unicodedata
    import re
    
    nfkd_form = unicodedata.normalize('NFKD', name)
    only_ascii = nfkd_form.encode('ASCII', 'ignore').decode('utf-8').lower()
    only_ascii = re.sub(r'[^a-z\s]', '', only_ascii).strip()
    parts = only_ascii.split()
    if not parts:
        return "user"
    if len(parts) == 1:
        return parts[0]
    
    first = parts[-1]
    initials = "".join([p[0] for p in parts[:-1]])
    return f"{first}.{initials}"

def main():
    print("=== STARTING PERSONNEL SYNCHRONIZATION ===")
    
    if not os.path.exists(EXCEL_PATH):
        print(f"Error: File not found at {EXCEL_PATH}")
        return

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    if "DS HIỆN TẠI" not in wb.sheetnames:
        print("Error: Tab 'DS HIỆN TẠI' not found in Excel workbook.")
        return

    ws = wb["DS HIỆN TẠI"]
    
    raw_emps = []
    # Parse rows 4 to 35
    for r in range(4, 35):
        msnv_val = ws.cell(r, 2).value
        name_val = ws.cell(r, 3).value
        chuc_vu_val = ws.cell(r, 4).value
        bo_phan_val = ws.cell(r, 5).value
        
        if name_val and str(name_val).strip() and not str(name_val).startswith("#"):
            msnv = str(msnv_val).strip() if msnv_val else ""
            full_name = str(name_val).strip()
            chuc_vu = str(chuc_vu_val).strip() if chuc_vu_val else "QC"
            bo_phan = str(bo_phan_val).strip() if bo_phan_val else "Phân xưởng 1"
            
            raw_emps.append({
                "msnv": msnv,
                "full_name": full_name,
                "chuc_vu": chuc_vu,
                "bo_phan": bo_phan
            })
            
    print(f"Successfully loaded {len(raw_emps)} active personnel from tab DS HIEN TAI.")

    # Map Factories & Departments
    # "Bộ phận" in Excel -> Factory:
    #   "Văn phòng" -> VP
    #   "Phân xưởng 1", "Kho NL" -> NM1
    #   "Phân xưởng 2" -> NM2
    #   "Nhà máy Furniture" -> NM3
    #
    # "Chức vụ" in Excel -> Department & Position:
    #   "Quản lý", "QA", "QC" -> Department: QLCL
    #   "NVSX" -> Department: SX
    
    processed_emps = []
    
    qa_leads = ["5100", "5981", "0165"] # Uyên, My, Xuân
    
    for idx, emp in enumerate(raw_emps):
        msnv = emp["msnv"]
        full_name = emp["full_name"]
        pos = emp["chuc_vu"]
        bphan = emp["bo_phan"]
        
        # Factory mapping
        if "văn phòng" in bphan.lower():
            factory = "VP"
            factory_name = "Văn Phòng"
        elif "phân xưởng 2" in bphan.lower():
            factory = "NM2"
            factory_name = "Vaniti Phân Xưởng 2"
        elif "furniture" in bphan.lower():
            factory = "NM3"
            factory_name = "Furniture nhà máy 3"
        else: # Phân xưởng 1, Kho NL, etc.
            factory = "NM1"
            factory_name = "Vaniti Phân Xưởng 1"
            
        # Department & Position mapping
        if pos == "NVSX":
            department = "SX"
            position = "NVSX"
        elif pos == "Quản lý":
            department = "QLCL"
            position = "Trưởng Phòng"
        elif pos == "QA":
            department = "QLCL"
            position = "Nhân viên QA"
        else: # QC
            department = "QLCL"
            position = "Nhân viên QC"
            
        # Hierarchy tree (Note field)
        if msnv == "3973": # Đặng Văn Nam (Manager)
            note_obj = {
                "level": "Cấp 1",
                "parent_level": "Đặng Văn Nam",
                "parent_id": "3973"
            }
        elif msnv in qa_leads: # QA Leads
            note_obj = {
                "level": "Cấp 2",
                "parent_level": "Đặng Văn Nam",
                "parent_id": "3973"
            }
        else: # QC & NVSX staff under QA Lead or Manager
            assigned_qa_id = qa_leads[idx % len(qa_leads)]
            assigned_qa_name = "Dương Thị Lệ Uyên" if assigned_qa_id == "5100" else ("Ngô Diễm My" if assigned_qa_id == "5981" else "Hà Minh Xuân")
            note_obj = {
                "level": "Cấp 3",
                "parent_level": assigned_qa_name,
                "parent_id": assigned_qa_id
            }
            
        username = normalize_username(full_name)
        
        processed_emps.append({
            "employee_id": msnv,
            "full_name": full_name,
            "department": department,
            "stage": position,
            "factory": factory,
            "factory_name": factory_name,
            "position": position,
            "username": username,
            "note": json.dumps(note_obj, ensure_ascii=False)
        })

    db = SessionLocal()
    default_hash = get_password_hash("123456")
    
    try:
        # 1. Clean up test/obsolete data
        print("Cleaning up old test & obsolete personnel...")
        db.execute(text("DELETE FROM quality_employees WHERE employee_id LIKE 'TEST%' OR full_name LIKE '%#N/A%' OR full_name LIKE '%nghỉ việc%'"))
        db.execute(text("DELETE FROM employees WHERE employee_id LIKE 'TEST%' OR full_name LIKE '%#N/A%' OR full_name LIKE '%nghỉ việc%'"))
        db.commit()
        
        # 2. Sync to quality_employees
        print("Syncing 27 personnel to 'quality_employees'...")
        valid_ids = [e["employee_id"] for e in processed_emps]
        
        # Remove quality_employees not in official 27 list
        placeholders = ', '.join([f"'{eid}'" for eid in valid_ids])
        db.execute(text(f"DELETE FROM quality_employees WHERE employee_id NOT IN ({placeholders})"))
        db.commit()
        
        for emp in processed_emps:
            # Check existing by employee_id or full_name
            existing = db.execute(text("SELECT id FROM quality_employees WHERE employee_id = :eid OR full_name = :fname"), {"eid": emp["employee_id"], "fname": emp["full_name"]}).fetchone()
            
            if existing:
                db.execute(text("""
                    UPDATE quality_employees 
                    SET employee_id = :eid, full_name = :fname, department = :dept, stage = :stage, factory = :factory, status = N'Đang làm việc', note = :note, updated_at = GETDATE()
                    WHERE id = :id
                """), {
                    "eid": emp["employee_id"],
                    "fname": emp["full_name"],
                    "dept": emp["department"],
                    "stage": emp["stage"],
                    "factory": emp["factory"],
                    "note": emp["note"],
                    "id": existing[0]
                })
            else:
                db.execute(text("""
                    INSERT INTO quality_employees (employee_id, full_name, department, stage, factory, status, latest_rating, note, created_at, updated_at)
                    VALUES (:eid, :fname, :dept, :stage, :factory, N'Đang làm việc', 'A', :note, GETDATE(), GETDATE())
                """), {
                    "eid": emp["employee_id"],
                    "fname": emp["full_name"],
                    "dept": emp["department"],
                    "stage": emp["stage"],
                    "factory": emp["factory"],
                    "note": emp["note"]
                })
        db.commit()
        print("quality_employees sync complete.")

        # 3. Sync to employees (HR)
        print("Syncing 27 personnel to 'employees' (HR)...")
        for emp in processed_emps:
            existing = db.execute(text("SELECT id FROM employees WHERE employee_id = :eid OR full_name = :fname"), {"eid": emp["employee_id"], "fname": emp["full_name"]}).fetchone()
            
            if existing:
                db.execute(text("""
                    UPDATE employees 
                    SET employee_id = :eid, full_name = :fname, department = :dept, position = :pos, status = N'Đang làm việc'
                    WHERE id = :id
                """), {
                    "eid": emp["employee_id"],
                    "fname": emp["full_name"],
                    "dept": emp["department"],
                    "pos": emp["position"],
                    "id": existing[0]
                })
            else:
                db.execute(text("""
                    INSERT INTO employees (employee_id, full_name, department, position, status)
                    VALUES (:eid, :fname, :dept, :pos, 'Đang làm việc')
                """), {
                    "eid": emp["employee_id"],
                    "fname": emp["full_name"],
                    "dept": emp["department"],
                    "pos": emp["position"]
                })
        db.commit()
        print("employees (HR) sync complete.")

        # 4. Sync accounts
        print("Syncing user accounts in 'accounts'...")
        for emp in processed_emps:
            existing = db.execute(text("SELECT id FROM accounts WHERE employee_id = :eid OR full_name = :fname OR username = :uname"), {
                "eid": emp["employee_id"],
                "fname": emp["full_name"],
                "uname": emp["username"]
            }).fetchone()
            
            if existing:
                db.execute(text("""
                    UPDATE accounts 
                    SET employee_id = :eid, full_name = :fname, factory_name = :fname_label, status = 'Đang sử dụng', is_active = 1
                    WHERE id = :id
                """), {
                    "eid": emp["employee_id"],
                    "fname": emp["full_name"],
                    "fname_label": emp["factory_name"],
                    "id": existing[0]
                })
            else:
                db.execute(text("""
                    INSERT INTO accounts (username, full_name, employee_id, hashed_password, is_active, status, factory_name, permission_level)
                    VALUES (:uname, :fname, :eid, :hpass, 1, 'Đang sử dụng', :fname_label, :plevel)
                """), {
                    "uname": emp["username"],
                    "fname": emp["full_name"],
                    "eid": emp["employee_id"],
                    "hpass": default_hash,
                    "fname_label": emp["factory_name"],
                    "plevel": emp["position"]
                })
        db.commit()
        print("accounts sync complete.")
        
        print("=== SYNCHRONIZATION FINISHED SUCCESSFULLY ===")

    except Exception as e:
        db.rollback()
        print(f"Error during synchronization: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    main()
