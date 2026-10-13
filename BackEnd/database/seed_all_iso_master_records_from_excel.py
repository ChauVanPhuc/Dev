# -*- coding: utf-8 -*-
"""
Script seed toàn bộ 308 danh mục hồ sơ từ file 'Tổng hợp tài liệu kiểm tra - MASTER LIST.xlsx'
- Đọc chính xác 23 cột thông tin từ sheet 'MASTER LIST'
- Bóc tách liên kết từ cột U (từ dòng U7 trở xuống, tiêu đề tại U6: Link nguồn (chưa xác minh))
- Tự động giải mã tham chiếu (I...) sang sheet 'Tổng hợp tài liệu' (cột 9: Link)
- Lưu trữ chuẩn xác vào CSDL SQL Server (iso_master_records & iso_master_record_audit_logs)
- Hỗ trợ liên kết vật lý trực tiếp với ổ mạng Z:\HỒ SƠ VINA G7
"""

import os
import sys
import re
import datetime
import openpyxl

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from sqlalchemy import text
from config.database import engine, SessionLocal
from modules.inspection.models.iso_master_record_model import ISOMasterRecord, ISOMasterRecordAuditLog
from modules.inspection.services.iso_file_service import parse_raw_source_links, check_single_file_status


def format_cell_val(val):
    if val is None:
        return ""
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.strftime("%d/%m/%Y %H:%M") if hasattr(val, "hour") and val.hour != 0 else val.strftime("%d/%m/%Y")
    return str(val).strip()


def format_bool_val(val):
    if val is None:
        return False
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    return s in ['true', '1', 'có', 'đã kiểm tra', 'yes']


def resolve_u6_link(val_u, sheet_th):
    """
    Giải mã chuỗi từ cột U (Link nguồn).
    Nếu có tham chiếu dạng (I15), (I2)... thì lấy chuỗi link từ dòng tương ứng của sheet 'Tổng hợp tài liệu'.
    """
    if not val_u:
        return None
    val_str = str(val_u).strip()
    if not val_str or val_str.lower() == "none" or val_str == "Chưa có link nguồn":
        return None
    
    m = re.search(r'\(I(\d+)\)', val_str)
    if m and sheet_th:
        th_row = int(m.group(1))
        if th_row <= sheet_th.max_row:
            th_val = sheet_th.cell(th_row, 9).value  # Cột I = col 9
            if th_val:
                return format_cell_val(th_val)
    return val_str


def seed_master_records():
    print("=" * 70)
    print("BẮT ĐẦU SEED TOÀN BỘ 308 HỒ SƠ TỪ MASTER LIST (LINK CỘT U6)...")
    print("=" * 70)

    workspace_root = os.path.abspath(os.path.join(backend_root, ".."))
    excel_candidates = [
        os.path.join(workspace_root, "Tổng hợp tài liệu kiểm tra - MASTER LIST.xlsx"),
        os.path.join(r"Z:\HỒ SƠ VINA G7", "Tổng hợp tài liệu kiểm tra - MASTER LIST.xlsx"),
        os.path.join(backend_root, "Tổng hợp tài liệu kiểm tra - MASTER LIST.xlsx")
    ]
    excel_path = None
    for cand in excel_candidates:
        if os.path.exists(cand):
            excel_path = cand
            break

    if not excel_path:
        # Tìm file đuôi .xlsx có chữ MASTER trong workspace
        for f in os.listdir(workspace_root):
            if f.endswith(".xlsx") and "MASTER" in f:
                excel_path = os.path.join(workspace_root, f)
                break

    if not excel_path:
        print("LỖI: Không tìm thấy file Excel 'Tổng hợp tài liệu kiểm tra - MASTER LIST.xlsx'!")
        return

    print(f"Đang đọc file Excel: {excel_path}")
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    if "MASTER LIST" not in wb.sheetnames:
        print("LỖI: Không tìm thấy sheet 'MASTER LIST'!")
        return

    sheet_ml = wb["MASTER LIST"]
    sheet_th = wb["Tổng hợp tài liệu"] if "Tổng hợp tài liệu" in wb.sheetnames else None

    # Tìm dòng header (chứa 'Mã mục' hoặc 'Link nguồn')
    header_row_idx = 6
    for r in range(1, 15):
        val = sheet_ml.cell(r, 1).value
        if val and "Mã mục" in str(val):
            header_row_idx = r
            break

    headers = [sheet_ml.cell(header_row_idx, c).value for c in range(1, 24)]
    print(f"Dòng tiêu đề xác định tại dòng: {header_row_idx}")
    print(f"Tiêu đề cột 21 (Cột U): {headers[20]}")

    now_vn = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Mở transaction CSDL
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("1. Dọn dẹp dữ liệu cũ trong iso_master_records...")
            conn.execute(text("DELETE FROM iso_master_record_audit_logs;"))
            conn.execute(text("DELETE FROM iso_master_records;"))
            try:
                conn.execute(text("DBCC CHECKIDENT ('iso_master_records', RESEED, 0);"))
                conn.execute(text("DBCC CHECKIDENT ('iso_master_record_audit_logs', RESEED, 0);"))
            except Exception:
                pass
            trans.commit()
            print("   -> Đã dọn sạch dữ liệu cũ và reset ID.")
        except Exception as e:
            trans.rollback()
            print(f"Lỗi khi xóa dữ liệu cũ: {e}")
            raise e

    db = SessionLocal()
    imported_count = 0
    total_physical_files = 0
    rows_with_files = 0

    try:
        for r_idx in range(header_row_idx + 1, sheet_ml.max_row + 1):
            doc_name = format_cell_val(sheet_ml.cell(r_idx, 7).value) # Col 7 = G (Tên tài liệu)
            src_code = format_cell_val(sheet_ml.cell(r_idx, 1).value) # Col 1 = A (Mã mục)

            if not doc_name and not src_code:
                continue

            # Lấy link từ Cột U (Col 21) và giải mã sang sheet 'Tổng hợp tài liệu'
            val_u = sheet_ml.cell(r_idx, 21).value
            resolved_link = resolve_u6_link(val_u, sheet_th)

            # Thống kê file liên quan
            clean_links = parse_raw_source_links(resolved_link)
            if clean_links:
                rows_with_files += 1
                total_physical_files += len(clean_links)

            record = ISOMasterRecord(
                source_code=src_code or None,                                      # 1: Mã mục / nguồn
                management_group=format_cell_val(sheet_ml.cell(r_idx, 2).value) or None,    # 2: Nhóm tài liệu quản lý
                classification=format_cell_val(sheet_ml.cell(r_idx, 3).value) or None,      # 3: Phân loại
                suggested_doc_code=format_cell_val(sheet_ml.cell(r_idx, 4).value) or None,  # 4: Mã TL quản lý / đề xuất
                item_code=format_cell_val(sheet_ml.cell(r_idx, 5).value) or None,           # 5: Mã của mục
                edition=format_cell_val(sheet_ml.cell(r_idx, 6).value) or None,             # 6: Lần ban hành
                document_name=doc_name or None,                                             # 7: Tên tài liệu
                code_of_conduct=format_cell_val(sheet_ml.cell(r_idx, 8).value) or None,     # 8: Quy tắc ứng xử (PA)
                management_doc=format_cell_val(sheet_ml.cell(r_idx, 9).value) or None,      # 9: Tài liệu quản lý / đề xuất
                form_code=format_cell_val(sheet_ml.cell(r_idx, 10).value) or None,          # 10: Mã biểu mẫu áp dụng
                attached_records_count=format_cell_val(sheet_ml.cell(r_idx, 11).value) or None, # 11: Số mục hồ sơ đi kèm
                identified_forms_count=format_cell_val(sheet_ml.cell(r_idx, 12).value) or None, # 12: Số biểu mẫu nhận diện
                link_basis=format_cell_val(sheet_ml.cell(r_idx, 13).value) or None,         # 13: Căn cứ liên kết
                is_checked=format_bool_val(sheet_ml.cell(r_idx, 14).value),                 # 14: Đã kiểm tra
                department_in_charge=format_cell_val(sheet_ml.cell(r_idx, 15).value) or None, # 15: Phụ trách
                source_status=format_cell_val(sheet_ml.cell(r_idx, 16).value) or None,      # 16: Hiện trạng nguồn
                review_issue=format_cell_val(sheet_ml.cell(r_idx, 17).value) or None,       # 17: Vấn đề cần rà soát
                action_chosen=format_cell_val(sheet_ml.cell(r_idx, 18).value) or None,      # 18: Hướng xử lý được chọn
                notes=format_cell_val(sheet_ml.cell(r_idx, 19).value) or None,              # 19: Ghi chú
                last_modified_date=format_cell_val(sheet_ml.cell(r_idx, 20).value) or None, # 20: Ngày chỉnh sửa gần nhất
                source_link=resolved_link,                                                  # 21: Link nguồn (Cột U6 giải mã)
                issue_date=format_cell_val(sheet_ml.cell(r_idx, 22).value) or None,         # 22: Ngày ban hành
                source_category=format_cell_val(sheet_ml.cell(r_idx, 23).value) or None,    # 23: Hạng mục nguồn
                created_at=now_iso,
                updated_at=now_iso
            )
            db.add(record)
            db.flush()

            # Tạo bản ghi Audit Log khởi tạo
            log = ISOMasterRecordAuditLog(
                record_id=record.id,
                action_type="IMPORT_MASTER_LIST",
                action_label="Khởi tạo từ Master List Excel (Cột U)",
                actor_name="Quản trị viên (Hệ thống)",
                actor_dept="Ban ISO / QLCL",
                target_name=record.document_name,
                details=f"Đã liên kết {len(clean_links)} tệp tin thực tế từ ổ mạng Z:",
                created_at=now_vn,
                timestamp=now_iso
            )
            db.add(log)
            imported_count += 1

        db.commit()
        print(f"\n>>> SEED THÀNH CÔNG:")
        print(f" - Tổng số dòng hồ sơ đã nhập: {imported_count} mục")
        print(f" - Số dòng hồ sơ có tệp tin thực tế đính kèm: {rows_with_files} / {imported_count} ({(rows_with_files/imported_count)*100:.1f}%)")
        print(f" - Tổng số lượt liên kết tệp tin vật lý trên ổ Z: {total_physical_files:,} lượt liên kết")

    except Exception as e:
        db.rollback()
        print(f">>> LỖI KHI SEED DỮ LIỆU: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_master_records()
