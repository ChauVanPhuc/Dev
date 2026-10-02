"""
Migration: Đồng bộ dữ liệu từ bảng accounts → hr_employees & quality_employees.

Nguyên tắc: accounts là nguồn dữ liệu chính (source of truth).
Chỉ cập nhật/tạo mới cho những nhân sự đã tồn tại hoặc có liên kết account.

Hành động:
  A. hr_employees:
    1. Cập nhật employee_id, department_id, position_id cho bản ghi khớp account
    2. Tạo mới bản ghi cho account chưa có hồ sơ HR
    3. Xóa bản ghi orphan (NV_QLCL_010, NV_QLCL_011, 888)
  B. quality_employees:
    1. Cập nhật phone, factory cho bản ghi từ account
"""
import sys, os, io
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, r"d:\SmartFlow\SmartFlow_v2_Test\BackEnd")

from sqlalchemy import text
from config.database import SessionLocal

def run_migration():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("MIGRATION: Đồng bộ accounts → hr_employees & quality_employees")
        print("=" * 80)

        # ===================================================================
        # A. HR EMPLOYEES SYNC
        # ===================================================================
        print("\n### A. HR EMPLOYEES ###\n")

        # A1. Lấy tất cả accounts với thông tin department
        accounts = db.execute(text("""
            SELECT a.id, a.username, a.employee_id, a.full_name, a.phone,
                   a.department_id, a.permission_id, a.factory_id, a.factory_name,
                   a.is_active,
                   d.role_id
            FROM accounts a
            LEFT JOIN departments d ON d.account_id = a.id
            ORDER BY a.id
        """)).fetchall()

        acct_by_eid = {}
        acct_by_name = {}
        for a in accounts:
            if a.employee_id:
                acct_by_eid[str(a.employee_id).strip()] = a
            if a.full_name:
                acct_by_name[a.full_name.strip().lower()] = a

        # A2. Xử lý trùng lặp: Nếu cùng 1 account có 2 hr_employees (1 mã cũ, 1 mã mới), giữ bản ghi mã mới
        hr_employees = db.execute(text("""
            SELECT id, employee_id, full_name, phone, department_id, position_id, section_id
            FROM hr_employees ORDER BY id
        """)).fetchall()

        # Nhóm hr_employees theo account chúng khớp
        acct_to_hr_ids = {}  # {acct_id: [hr_employee records]}
        for hr in hr_employees:
            acct = acct_by_eid.get(str(hr.employee_id).strip()) if hr.employee_id else None
            if not acct and hr.full_name:
                acct = acct_by_name.get(hr.full_name.strip().lower())
            if acct:
                acct_id = acct.id
                if acct_id not in acct_to_hr_ids:
                    acct_to_hr_ids[acct_id] = []
                acct_to_hr_ids[acct_id].append(hr)

        # Xóa bản ghi trùng: nếu 1 account có nhiều hr_employees, giữ bản có employee_id khớp account
        dedup_deleted = 0
        dedup_delete_ids = set()
        for acct_id, hr_list in acct_to_hr_ids.items():
            if len(hr_list) > 1:
                acct = next(a for a in accounts if a.id == acct_id)
                real_eid = str(acct.employee_id).strip() if acct.employee_id else None
                
                # Giữ bản ghi có employee_id khớp account, hoặc bản ghi mới nhất (id cao nhất)
                keep = None
                for hr in hr_list:
                    if real_eid and str(hr.employee_id).strip() == real_eid:
                        keep = hr
                        break
                if not keep:
                    keep = max(hr_list, key=lambda h: h.id)
                
                for hr in hr_list:
                    if hr.id != keep.id:
                        dedup_delete_ids.add(hr.id)
                        print(f"  [DEDUP] Xóa hr_employees[{hr.id}] eid='{hr.employee_id}' (trùng với [{keep.id}] cho account {acct.username})")

        if dedup_delete_ids:
            placeholders = ",".join([str(x) for x in dedup_delete_ids])
            db.execute(text(f"DELETE FROM hr_employees WHERE id IN ({placeholders})"))
            dedup_deleted = len(dedup_delete_ids)
            db.flush()
            print(f"\n  -> Xoa {dedup_deleted} ban ghi trung lap")

        # Reload hr_employees after dedup
        hr_employees = db.execute(text("""
            SELECT id, employee_id, full_name, phone, department_id, position_id, section_id
            FROM hr_employees ORDER BY id
        """)).fetchall()

        # Cập nhật hr_employees khớp account
        updated_hr = 0
        for hr in hr_employees:
            acct = acct_by_eid.get(str(hr.employee_id).strip()) if hr.employee_id else None
            if not acct and hr.full_name:
                acct = acct_by_name.get(hr.full_name.strip().lower())
            
            if not acct:
                continue

            updates = {}
            # Sync employee_id
            if acct.employee_id and str(hr.employee_id).strip() != str(acct.employee_id).strip():
                updates['employee_id'] = str(acct.employee_id).strip()
            # Sync department_id (from account's role via departments table)
            if acct.role_id and hr.department_id != acct.role_id:
                updates['department_id'] = acct.role_id
            # Sync position_id (from account's permission_id)
            if acct.permission_id and hr.position_id != acct.permission_id:
                updates['position_id'] = acct.permission_id
            # Sync phone
            if acct.phone and hr.phone != acct.phone:
                updates['phone'] = acct.phone

            if updates:
                set_clauses = ", ".join([f"{k} = :{k}" for k in updates])
                updates['hr_id'] = hr.id
                db.execute(text(f"UPDATE hr_employees SET {set_clauses} WHERE id = :hr_id"), updates)
                updated_hr += 1
                print(f"  [UPDATE] hr_employees[{hr.id}] {hr.full_name}: {list(updates.keys())}")

        print(f"\n  -> Cap nhat {updated_hr} ban ghi hr_employees")

        # A3. Tạo mới cho account chưa có hồ sơ HR
        hr_eid_set = {str(h.employee_id).strip() for h in hr_employees if h.employee_id}
        hr_name_set = {h.full_name.strip().lower() for h in hr_employees if h.full_name}

        created_hr = 0
        for acct in accounts:
            eid_match = str(acct.employee_id).strip() in hr_eid_set if acct.employee_id else False
            name_match = acct.full_name.strip().lower() in hr_name_set if acct.full_name else False
            if not eid_match and not name_match:
                db.execute(text("""
                    INSERT INTO hr_employees (employee_id, full_name, phone, department_id, position_id)
                    VALUES (:eid, :name, :phone, :dept_id, :pos_id)
                """), {
                    "eid": str(acct.employee_id).strip() if acct.employee_id else f"ACCT_{acct.id}",
                    "name": acct.full_name,
                    "phone": acct.phone,
                    "dept_id": acct.role_id,
                    "pos_id": acct.permission_id
                })
                created_hr += 1
                print(f"  [CREATE] hr_employees for account[{acct.id}] {acct.username} ({acct.full_name})")

        print(f"\n  -> Tao moi {created_hr} ban ghi hr_employees")

        # A4. Xóa bản ghi orphan
        orphan_eids = ['NV_QLCL_010', 'NV_QLCL_011', '888']
        deleted_hr = 0
        for eid in orphan_eids:
            row = db.execute(text("SELECT id, full_name FROM hr_employees WHERE employee_id = :eid"), {"eid": eid}).fetchone()
            if row:
                db.execute(text("DELETE FROM hr_employees WHERE id = :id"), {"id": row.id})
                deleted_hr += 1
                print(f"  [DELETE] hr_employees[{row.id}] orphan eid='{eid}' name='{row.full_name}'")

        print(f"\n  -> Xoa {deleted_hr} ban ghi orphan")

        # ===================================================================
        # B. QUALITY EMPLOYEES SYNC
        # ===================================================================
        print("\n\n### B. QUALITY EMPLOYEES ###\n")

        quality_employees = db.execute(text("""
            SELECT id, employee_id, full_name, phone, factory
            FROM quality_employees ORDER BY id
        """)).fetchall()

        updated_qe = 0
        for qe in quality_employees:
            acct = acct_by_eid.get(str(qe.employee_id).strip()) if qe.employee_id else None
            if not acct and qe.full_name:
                acct = acct_by_name.get(qe.full_name.strip().lower())

            if not acct:
                continue

            updates = {}
            # Sync phone
            if acct.phone and (not qe.phone or qe.phone == 'None'):
                updates['phone'] = acct.phone
            # Sync factory (full name from account)
            if acct.factory_name and qe.factory and qe.factory.strip() != acct.factory_name.strip():
                updates['factory'] = acct.factory_name.strip()

            if updates:
                set_clauses = ", ".join([f"{k} = :{k}" for k in updates])
                updates['qe_id'] = qe.id
                db.execute(text(f"UPDATE quality_employees SET {set_clauses} WHERE id = :qe_id"), updates)
                updated_qe += 1
                changes = {k: v for k, v in updates.items() if k != 'qe_id'}
                print(f"  [UPDATE] quality_employees[{qe.id}] {qe.full_name}: {changes}")

        print(f"\n  -> Cap nhat {updated_qe} ban ghi quality_employees")

        # ===================================================================
        # COMMIT
        # ===================================================================
        db.commit()
        print("\n" + "=" * 80)
        print("[OK] MIGRATION HOAN TAT - Da commit thanh cong!")
        print("=" * 80)

    except Exception as e:
        db.rollback()
        print(f"\n[FAIL] MIGRATION THAT BAI: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
