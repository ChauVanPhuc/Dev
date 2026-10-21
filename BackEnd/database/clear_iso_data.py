# -*- coding: utf-8 -*-
"""
Script dọn dẹp toàn bộ dữ liệu ISO:
- /admin/iso-documents (iso_documents, iso_sections, iso_process_steps, iso_revision_logs)
- /admin/iso-processes (iso_processes, iso_process_sections, iso_process_step_instances)
- /admin/iso-records (iso_master_records, iso_master_record_audit_logs, iso_file_lineage.json)
- Lịch sử phê duyệt tài liệu/quy trình liên quan trong iso_approval_logs
"""

import os
import sys
import json
import shutil

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from sqlalchemy import text
from config.database import engine


def clear_iso_data():
    print("=" * 60)
    print("BẮT ĐẦU XÓA DỮ LIỆU ISO (DOCUMENTS, PROCESSES, RECORDS)...")
    print("=" * 60)

    # 1. Thu thập danh sách file upload cần xóa dọn dẹp
    files_to_delete = []
    with engine.connect() as conn:
        try:
            docs = conn.execute(text("SELECT file_path FROM iso_documents WHERE file_path IS NOT NULL")).fetchall()
            for row in docs:
                if row[0]:
                    files_to_delete.append(row[0])
            
            procs = conn.execute(text("SELECT file_path FROM iso_processes WHERE file_path IS NOT NULL")).fetchall()
            for row in procs:
                if row[0]:
                    files_to_delete.append(row[0])
        except Exception as e:
            print(f"[Warning] Lỗi khi đọc file_path: {e}")

    # 2. Xóa dữ liệu trong CSDL với SQLAlchemy Transaction an toàn
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("1. Gỡ bỏ các ràng buộc khóa ngoại vòng giữa iso_documents và iso_processes...")
            conn.execute(text("UPDATE iso_documents SET process_id = NULL;"))
            conn.execute(text("UPDATE iso_processes SET iso_document_id = NULL;"))
            conn.execute(text("UPDATE inspection_guides SET process_id = NULL WHERE process_id IS NOT NULL;"))

            print("2. Xóa các bảng con phụ thuộc của iso_documents...")
            conn.execute(text("DELETE FROM iso_process_steps;"))
            conn.execute(text("DELETE FROM iso_sections;"))

            print("3. Xóa các bảng con phụ thuộc của iso_processes...")
            conn.execute(text("DELETE FROM iso_process_step_instances;"))
            conn.execute(text("DELETE FROM iso_process_sections;"))

            print("4. Xóa nhật ký sửa đổi (iso_revision_logs)...")
            conn.execute(text("DELETE FROM iso_revision_logs;"))

            print("5. Xóa tài liệu mẫu (iso_documents)...")
            conn.execute(text("DELETE FROM iso_documents;"))

            print("6. Xóa quy trình áp dụng (iso_processes)...")
            conn.execute(text("DELETE FROM iso_processes;"))

            print("7. Xóa nhật ký kiểm toán Master Records (iso_master_record_audit_logs)...")
            conn.execute(text("DELETE FROM iso_master_record_audit_logs;"))

            print("8. Xóa danh mục Master Records (iso_master_records)...")
            conn.execute(text("DELETE FROM iso_master_records;"))

            print("9. Dọn dẹp log phê duyệt tài liệu/quy trình trong iso_approval_logs (nếu có)...")
            conn.execute(text("DELETE FROM iso_approval_logs WHERE item_type IN ('document', 'process');"))

            print("10. Reset Identity Seeds về 0...")
            reseed_tables = [
                "iso_documents",
                "iso_processes",
                "iso_master_records",
                "iso_sections",
                "iso_process_steps",
                "iso_process_sections",
                "iso_process_step_instances",
                "iso_revision_logs",
                "iso_master_record_audit_logs"
            ]
            for tbl in reseed_tables:
                try:
                    conn.execute(text(f"DBCC CHECKIDENT ('{tbl}', RESEED, 0);"))
                except Exception as e:
                    print(f"   [Note] Không thể reseed {tbl}: {e}")

            trans.commit()
            print(">>> GIAO DỊCH CSDL ĐÃ ĐƯỢC COMMIT THÀNH CÔNG! <<<")
        except Exception as e:
            trans.rollback()
            print(f">>> LỖI GIAO DỊCH, ĐÃ ROLLBACK HOÀN TOÀN: {e} <<<")
            raise e

    # 3. Dọn dẹp file vật lý đính kèm nếu tồn tại
    print("11. Dọn dẹp file vật lý liên quan...")
    workspace_root = os.path.abspath(os.path.join(backend_root, ".."))
    for rel_path in files_to_delete:
        abs_p = os.path.join(backend_root, rel_path.replace("/", os.sep))
        if os.path.exists(abs_p) and os.path.isfile(abs_p):
            try:
                os.remove(abs_p)
                print(f"   - Đã xóa file: {rel_path}")
            except Exception as e:
                print(f"   - Không thể xóa {abs_p}: {e}")

    # 4. Reset file lineage metadata
    lineage_file = os.path.join(backend_root, "data", "iso_file_lineage.json")
    if os.path.exists(lineage_file):
        try:
            with open(lineage_file, "w", encoding="utf-8") as f:
                json.dump({}, f, ensure_ascii=False, indent=2)
            print("12. Đã làm trống file lineage registry (iso_file_lineage.json).")
        except Exception as e:
            print(f"   - Lỗi khi reset lineage file: {e}")

    # 5. Dọn dẹp thư mục tạm và cache nếu có
    preview_cache = os.path.join(backend_root, "data", "preview_cache")
    if os.path.exists(preview_cache):
        for item in os.listdir(preview_cache):
            item_path = os.path.join(preview_cache, item)
            try:
                if os.path.isfile(item_path):
                    os.remove(item_path)
                elif os.path.isdir(item_path):
                    shutil.rmtree(item_path)
            except Exception:
                pass

    # 6. Dọn dẹp các thư mục quy trình tạo ra trong 'Hồ sơ G7'
    ho_so_g7 = os.path.join(workspace_root, "Hồ sơ G7")
    if os.path.exists(ho_so_g7):
        for item in os.listdir(ho_so_g7):
            dept_path = os.path.join(ho_so_g7, item)
            if os.path.isdir(dept_path):
                try:
                    shutil.rmtree(dept_path)
                    print(f"   - Đã dọn dẹp thư mục: Hồ sơ G7/{item}")
                except Exception as e:
                    print(f"   - Không thể xóa {dept_path}: {e}")

    # 7. Kiểm tra lại số lượng bản ghi sau khi xóa
    print("\n" + "=" * 60)
    print("KIỂM TRA SỐ LƯỢNG BẢN GHI SAU KHI XÓA:")
    print("=" * 60)
    with engine.connect() as conn:
        for tbl in [
            "iso_documents",
            "iso_processes",
            "iso_master_records",
            "iso_sections",
            "iso_process_steps",
            "iso_process_sections",
            "iso_process_step_instances",
            "iso_revision_logs",
            "iso_master_record_audit_logs",
            "iso_approval_logs"
        ]:
            cnt = conn.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
            print(f"   {tbl}: {cnt} bản ghi")

    print("\n>>> HOÀN TẤT CLEAR DATA CHO /admin/iso-documents, /admin/iso-processes VÀ /admin/iso-records! <<<")


if __name__ == "__main__":
    clear_iso_data()
