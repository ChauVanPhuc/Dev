import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from config.database import engine, Base, SessionLocal
from modules.inspection.models.iso_master_record_model import ISOMasterRecord
import openpyxl
import datetime

def format_cell_value(val):
    if val is None:
        return ""
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.strftime("%d/%m/%Y %H:%M") if hasattr(val, "hour") and val.hour != 0 else val.strftime("%d/%m/%Y")
    return str(val).strip()

def format_bool_value(val):
    if val is None:
        return False
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    return s in ['true', '1', 'có', 'đã kiểm tra', 'yes']

def migrate_and_seed():
    print("[MIGRATION] Creating iso_master_records table...")
    ISOMasterRecord.__table__.create(bind=engine, checkfirst=True)
    print("[MIGRATION] Table iso_master_records is ready.")

    db = SessionLocal()
    try:
        count = db.query(ISOMasterRecord).count()
        if count > 0:
            print(f"[MIGRATION] Table already contains {count} records. Skipping seed.")
            return

        excel_path = os.path.abspath(os.path.join(backend_path, "..", "Tổng hợp tài liệu kiểm tra - MASTER LIST.xlsx"))
        if not os.path.exists(excel_path):
            print(f"[MIGRATION] Excel file not found at: {excel_path}")
            return

        print(f"[MIGRATION] Reading data from {excel_path}...")
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        sheet = wb["MASTER LIST"] if "MASTER LIST" in wb.sheetnames else wb.active
        rows = list(sheet.iter_rows(values_only=True))

        header_row_idx = 5
        for i, r in enumerate(rows):
            if r and any(str(cell).strip() in ['Mã mục / nguồn', 'Phân loại', 'Nhóm tài liệu quản lý'] for cell in r if cell is not None):
                header_row_idx = i
                break

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        records_to_insert = []

        for r_idx in range(header_row_idx + 1, len(rows)):
            row = rows[r_idx]
            if not row or not any(row):
                continue
            
            doc_name = format_cell_value(row[6]) if len(row) > 6 else ""
            src_code = format_cell_value(row[0]) if len(row) > 0 else ""
            if not doc_name and not src_code:
                continue

            rec = ISOMasterRecord(
                source_code=src_code or None,
                management_group=format_cell_value(row[1]) if len(row) > 1 else None,
                classification=format_cell_value(row[2]) if len(row) > 2 else None,
                suggested_doc_code=format_cell_value(row[3]) if len(row) > 3 else None,
                item_code=format_cell_value(row[4]) if len(row) > 4 else None,
                edition=format_cell_value(row[5]) if len(row) > 5 else None,
                document_name=doc_name or None,
                code_of_conduct=format_cell_value(row[7]) if len(row) > 7 else None,
                management_doc=format_cell_value(row[8]) if len(row) > 8 else None,
                form_code=format_cell_value(row[9]) if len(row) > 9 else None,
                attached_records_count=format_cell_value(row[10]) if len(row) > 10 else None,
                identified_forms_count=format_cell_value(row[11]) if len(row) > 11 else None,
                link_basis=format_cell_value(row[12]) if len(row) > 12 else None,
                is_checked=format_bool_value(row[13]) if len(row) > 13 else False,
                department_in_charge=format_cell_value(row[14]) if len(row) > 14 else None,
                source_status=format_cell_value(row[15]) if len(row) > 15 else None,
                review_issue=format_cell_value(row[16]) if len(row) > 16 else None,
                action_chosen=format_cell_value(row[17]) if len(row) > 17 else None,
                notes=format_cell_value(row[18]) if len(row) > 18 else None,
                last_modified_date=format_cell_value(row[19]) if len(row) > 19 else None,
                source_link=format_cell_value(row[20]) if len(row) > 20 else None,
                issue_date=format_cell_value(row[21]) if len(row) > 21 else None,
                source_category=format_cell_value(row[22]) if len(row) > 22 else None,
                created_at=now_str,
                updated_at=now_str
            )
            records_to_insert.append(rec)

        db.bulk_save_objects(records_to_insert)
        db.commit()
        print(f"[MIGRATION] Successfully seeded {len(records_to_insert)} records into iso_master_records!")

    except Exception as e:
        db.rollback()
        print(f"[MIGRATION] Error seeding records: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_and_seed()
