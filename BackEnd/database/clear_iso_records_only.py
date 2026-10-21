# -*- coding: utf-8 -*-
"""
Script dọn dẹp riêng dữ liệu cho /admin/iso-records:
- Bảng: iso_master_record_audit_logs
- Bảng: iso_master_records
- Reset identity seeds về 0
- Giữ nguyên toàn bộ dữ liệu của /admin/iso-documents và /admin/iso-processes
"""

import os
import sys
import json

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
WORKSPACE_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))

sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import text
from config.database import engine, SessionLocal

def clear_iso_records_only():
    print("=" * 60)
    print("DỌN DẸP DỮ LIỆU RIÊNG CHO /admin/iso-records...")
    print("=" * 60)

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("1. Xóa bảng con: iso_master_record_audit_logs...")
            conn.execute(text("DELETE FROM iso_master_record_audit_logs;"))

            print("2. Xóa bảng chính: iso_master_records...")
            conn.execute(text("DELETE FROM iso_master_records;"))

            print("3. Reset identity seeds về 0...")
            for tbl in ["iso_master_record_audit_logs", "iso_master_records"]:
                try:
                    conn.execute(text(f"DBCC CHECKIDENT ('{tbl}', RESEED, 0);"))
                except Exception as e:
                    print(f"   [Note] Không thể reseed {tbl}: {e}")

            trans.commit()
            print(">>> ĐÃ COMMIT GIAO DỊCH XÓA CSDL THÀNH CÔNG! <<<")
        except Exception as e:
            trans.rollback()
            print(f"[!] Lỗi khi xóa: {e}")
            raise

    # 4. Dọn dẹp file lineage cache nếu có
    lineage_file = os.path.join(BACKEND_DIR, "data", "iso_file_lineage.json")
    if os.path.exists(lineage_file):
        try:
            with open(lineage_file, "w", encoding="utf-8") as f:
                json.dump({}, f)
            print(f"4. Đã dọn dẹp file cache lineage: {lineage_file}")
        except Exception as e:
            print(f"[Warning] Lỗi khi dọn dẹp {lineage_file}: {e}")

    # 5. Kiểm tra lại số lượng bản ghi sau khi xóa
    db = SessionLocal()
    try:
        rec_cnt = db.execute(text("SELECT COUNT(*) FROM iso_master_records")).scalar()
        audit_cnt = db.execute(text("SELECT COUNT(*) FROM iso_master_record_audit_logs")).scalar()
        doc_cnt = db.execute(text("SELECT COUNT(*) FROM iso_documents")).scalar()
        proc_cnt = db.execute(text("SELECT COUNT(*) FROM iso_processes")).scalar()

        print("\n" + "=" * 60)
        print("XÁC NHẬN TRẠNG THÁI CƠ SỞ DỮ LIỆU:")
        print(f" - /admin/iso-records (iso_master_records): {rec_cnt} bản ghi (ĐÃ CLEAR)")
        print(f" - /admin/iso-records audit (iso_master_record_audit_logs): {audit_cnt} bản ghi (ĐÃ CLEAR)")
        print(f" - /admin/iso-documents (iso_documents): {doc_cnt} bản ghi (BẢO TOÀN)")
        print(f" - /admin/iso-processes (iso_processes): {proc_cnt} bản ghi (BẢO TOÀN)")
        print("=" * 60)
    finally:
        db.close()

if __name__ == "__main__":
    clear_iso_records_only()
