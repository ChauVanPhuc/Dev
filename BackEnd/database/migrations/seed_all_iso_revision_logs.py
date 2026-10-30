# -*- coding: utf-8 -*-
"""
Database & File System Migration Script:
Chuẩn hóa Lịch sử sửa đổi (Revision Logs) cho toàn bộ 100% Quy trình ISO (iso_processes),
Tài liệu / Biểu mẫu (iso_documents) và Sổ chủ (iso_master_records).

Quy tắc chuẩn hóa:
1. Lần ban hành đầu tiên (seq_no = 1): Ngày làm việc ngẫu nhiên từ Tháng 3 - Tháng 5/2025
   (loại trừ Thứ 7, Chủ Nhật và toàn bộ ngày lễ 2025).
   Nội dung: 'Ban hành lần đầu', Trang số: 'Toàn bộ'.
2. Lần ban hành 2, 3 (ngẫu nhiên 0, 1 hoặc 2 lần trung gian): Ngày làm việc ngẫu nhiên từ Tháng 1 - Tháng 6/2026
   (loại trừ Thứ 7, Chủ Nhật và ngày lễ 2026; sắp xếp tăng dần).
   Nội dung: 'Điều chỉnh, cập nhật, nội dung định kỳ', Trang số: 'Toàn bộ'.
3. Lần ban hành tiếp theo (lần cuối cùng / hiện tại - seq_no = 2, 3 hoặc 4): Ngày làm việc ngẫu nhiên từ Tháng 9 - Tháng 10/2026
   (loại trừ Thứ 7, Chủ Nhật và Quốc khánh 2/9).
   Nội dung: 'Thay đổi khung mẫu tài liệu', Trang số: 'Toàn bộ'.
4. Đồng bộ phiên bản (02, 03, 04) và ngày ban hành lên Trang bìa (Table 0), Nhật ký sửa đổi (Table 1), Chân trang (Footer),
   các bản snapshot __canvas_editor_data__ và các file .docx thực tế trên server.
"""

import sys
import os
import json
import re
import datetime
from typing import List, Dict, Any

# Thêm đường dẫn BackEnd
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from config.database import engine
from sqlalchemy import text
from modules.inspection.services.iso_file_service import generate_standard_revision_logs
import docx

def clean_key(val: Any) -> str:
    if not val:
        return ""
    return re.sub(r'[^A-Z0-9]', '', str(val).upper())

def update_canvas_snapshot_data(raw_json_str: str, logs: List[Dict[str, Any]], version_str: str, issue_date_str: str) -> str:
    """Cập nhật dữ liệu Canvas Editor snapshot: Table 0, Table 1, Footer, và sửa lỗi trang trắng."""
    try:
        data = json.loads(raw_json_str)
    except Exception:
        return raw_json_str

    main = data.get("main") or []
    tables = [el for el in main if isinstance(el, dict) and el.get("type") == "table"]

    # 1. Cập nhật Table 0 (Trang bìa) nếu có
    if len(tables) >= 1:
        t0 = tables[0]
        for tr in t0.get("trList", []):
            for td in tr.get("tdList", []):
                for v in td.get("value", []):
                    if isinstance(v, dict) and isinstance(v.get("value"), str):
                        txt = v["value"]
                        if "[lần ban hành]" in txt or "[Lần ban hành]" in txt:
                            v["value"] = txt.replace("[lần ban hành]", version_str).replace("[Lần ban hành]", version_str)
                        if "[ngày ban hành]" in txt or "[Ngày ban hành]" in txt:
                            v["value"] = txt.replace("[ngày ban hành]", issue_date_str).replace("[Ngày ban hành]", issue_date_str)
                        # Bỏ 'Trưởng phòng /' trong chức vụ Phê duyệt
                        if "Trưởng phòng / BGĐ" in txt or "Trưởng phòng / Ban Giám Đốc" in txt:
                            v["value"] = "Ban Giám Đốc"

    # 2. Cập nhật Table 1 (Bảng Theo dõi sửa đổi nội dung)
    t1_idx = -1
    if len(tables) >= 2:
        t1 = tables[1]
        try:
            t1_idx = main.index(t1)
        except ValueError:
            t1_idx = -1

        tr_list = t1.get("trList", [])
        if len(tr_list) >= 1:
            header_row = tr_list[0]
            new_tr_list = [header_row]

            for idx in range(14):
                if idx < len(logs):
                    log = logs[idx]
                    seq_val = str(log.get("seq_no", idx + 1))
                    date_val = str(log.get("rev_date") or issue_date_str)
                    content_val = str(log.get("content") or "Thay đổi khung mẫu tài liệu")
                    page_val = "Toàn bộ"

                    new_tr_list.append({
                        "height": 34,
                        "minHeight": 34,
                        "tdList": [
                            {"colspan": 1, "rowspan": 1, "verticalAlign": "middle", "height": 34, "minHeight": 34, "disabled": True, "value": [{"value": seq_val, "size": 12, "font": "Times New Roman", "rowFlex": "center"}]},
                            {"colspan": 1, "rowspan": 1, "verticalAlign": "middle", "height": 34, "minHeight": 34, "disabled": True, "value": [{"value": date_val, "size": 12, "font": "Times New Roman", "rowFlex": "center"}]},
                            {"colspan": 1, "rowspan": 1, "verticalAlign": "middle", "height": 34, "minHeight": 34, "disabled": True, "value": [{"value": content_val, "size": 12, "font": "Times New Roman", "rowFlex": "left"}]},
                            {"colspan": 1, "rowspan": 1, "verticalAlign": "middle", "height": 34, "minHeight": 34, "disabled": True, "value": [{"value": page_val, "size": 12, "font": "Times New Roman", "rowFlex": "center"}]}
                        ]
                    })
                else:
                    new_tr_list.append({
                        "height": 34,
                        "minHeight": 34,
                        "tdList": [
                            {"colspan": 1, "rowspan": 1, "verticalAlign": "middle", "height": 34, "minHeight": 34, "disabled": True, "value": [{"value": "\u200B", "size": 12, "font": "Times New Roman", "rowFlex": "center"}]},
                            {"colspan": 1, "rowspan": 1, "verticalAlign": "middle", "height": 34, "minHeight": 34, "disabled": True, "value": [{"value": "\u200B", "size": 12, "font": "Times New Roman", "rowFlex": "center"}]},
                            {"colspan": 1, "rowspan": 1, "verticalAlign": "middle", "height": 34, "minHeight": 34, "disabled": True, "value": [{"value": "\u200B", "size": 12, "font": "Times New Roman", "rowFlex": "left"}]},
                            {"colspan": 1, "rowspan": 1, "verticalAlign": "middle", "height": 34, "minHeight": 34, "disabled": True, "value": [{"value": "\u200B", "size": 12, "font": "Times New Roman", "rowFlex": "center"}]}
                        ]
                    })
            t1["trList"] = new_tr_list

    # 3. Khắc phục triệt để trang trắng sau Table 1 (Trang 3/8 trắng)
    if t1_idx != -1:
        # Kiểm tra phần tử ngay sau Table 1
        # Xóa các pageBreak dư thừa hoặc lồng nhau
        pos = t1_idx + 2
        while pos < len(main) and pos <= t1_idx + 6:
            el = main[pos]
            if isinstance(el, dict):
                # Nếu là pageBreak liên tiếp -> xóa bỏ
                if el.get("type") in ["pageBreak", "PAGE_BREAK"]:
                    main.pop(pos)
                    continue
                # Nếu phần tử có valueList chứa nested pageBreak -> xóa pageBreak lồng
                if el.get("valueList") and isinstance(el["valueList"], list):
                    el["valueList"] = [v for v in el["valueList"] if isinstance(v, dict) and v.get("type") not in ["pageBreak", "PAGE_BREAK"]]
            pos += 1

    # 4. Chuẩn hóa tất cả chữ màu đen (#000000)
    for el in main:
        if isinstance(el, dict):
            if "color" in el and el["color"] != "#000000":
                del el["color"]
            for child in el.get("valueList", []):
                if isinstance(child, dict) and "color" in child and child["color"] != "#000000":
                    del child["color"]

    # 5. Cập nhật Footer trong JSON snapshot
    footer = data.get("footer") or []
    for f_el in footer:
        if isinstance(f_el, dict) and isinstance(f_el.get("value"), str):
            f_val = f_el["value"]
            if "Lần ban hành" in f_val:
                f_el["value"] = re.sub(r'Lần ban hành:\s*\S+', f'Lần ban hành: {version_str}', f_val)
            elif "Ngày ban hành" in f_val:
                f_el["value"] = re.sub(r'Ngày ban hành:\s*\S+', f'Ngày ban hành: {issue_date_str}', f_val)

    return json.dumps(data, ensure_ascii=False)

def update_docx_file(full_path: str, logs: List[Dict[str, Any]], version_str: str, issue_date_str: str, doc_code: str):
    """Cập nhật Table 0, Table 1 và Footer trong file .docx thực tế."""
    if not os.path.exists(full_path):
        return False
    try:
        doc = docx.Document(full_path)
        if len(doc.tables) < 2:
            return False

        # Table 0: Cover
        t0 = doc.tables[0]
        for row in t0.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    txt = p.text
                    orig = txt
                    if "[lần ban hành]" in txt or "[Lần ban hành]" in txt:
                        txt = txt.replace("[lần ban hành]", version_str).replace("[Lần ban hành]", version_str)
                    if "[ngày ban hành]" in txt or "[Ngày ban hành]" in txt:
                        txt = txt.replace("[ngày ban hành]", issue_date_str).replace("[Ngày ban hành]", issue_date_str)
                    if "Trưởng phòng / BGĐ" in txt or "Trưởng phòng / Ban Giám Đốc" in txt:
                        txt = txt.replace("Trưởng phòng / BGĐ", "Ban Giám Đốc").replace("Trưởng phòng / Ban Giám Đốc", "Ban Giám Đốc")
                    if txt != orig:
                        p.text = txt

        # Table 1: Revision table
        t1 = doc.tables[1]
        while len(t1.rows) < 15:
            t1.add_row()
        while len(t1.rows) > 16:
            last_row = t1.rows[-1]
            t1._tbl.remove(last_row._tr)

        for idx, log in enumerate(logs):
            row_idx = idx + 1
            if row_idx < len(t1.rows):
                cells = t1.rows[row_idx].cells
                if len(cells) >= 4:
                    cells[0].text = str(log.get("seq_no", idx + 1)).zfill(2)
                    cells[1].text = str(log.get("rev_date") or issue_date_str)
                    cells[2].text = str(log.get("content") or "Thay đổi khung mẫu tài liệu")
                    cells[3].text = "Toàn bộ"

        for clean_idx in range(len(logs) + 1, len(t1.rows)):
            for c in t1.rows[clean_idx].cells:
                c.text = ""

        # Footer
        for s in doc.sections:
            for p in s.footer.paragraphs:
                p_txt = p.text
                if "Mã hiệu" in p_txt or "Lần ban hành" in p_txt or "Ngày ban hành" in p_txt:
                    for r in p.runs:
                        if "Mã hiệu:" in r.text and doc_code:
                            r.text = f"Mã hiệu: {doc_code}"
                        elif "Lần ban hành" in r.text:
                            r.text = f"Lần ban hành: {version_str}"
                        elif "Ngày ban hành" in r.text:
                            r.text = f" Ngày ban hành: {issue_date_str}"

        doc.save(full_path)
        return True
    except Exception as e:
        print(f"  [WARN] Không thể cập nhật file docx {full_path}: {e}")
        return False

def run_migration():
    print("================================================================================")
    print(" BẮT ĐẦU CHUẨN HÓA TOÀN BỘ REVISION LOGS CHO SMARTFLOW ERP V3")
    print("================================================================================")

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Đọc tất cả Quy trình ISO
            procs = conn.execute(text("SELECT id, code, new_code, name, issue_date, iso_document_id, file_path FROM iso_processes")).fetchall()
            print(f"[1/6] Đã tìm thấy {len(procs)} quy trình ISO (iso_processes)...")

            # 2. Đọc tất cả Tài liệu / Biểu mẫu ISO
            docs = conn.execute(text("SELECT id, code, name, version, issue_date, process_id, file_path FROM iso_documents")).fetchall()
            print(f"[2/6] Đã tìm thấy {len(docs)} tài liệu / biểu mẫu ISO (iso_documents)...")

            # 3. Đọc tất cả Sổ chủ Master Records
            mrs = conn.execute(text("SELECT id, source_code, edition, issue_date FROM iso_master_records")).fetchall()
            print(f"[3/6] Đã tìm thấy {len(mrs)} bản ghi sổ chủ (iso_master_records)...")

            # Xóa sạch dữ liệu cũ trong bảng iso_revision_logs để ghi đè chuẩn xác
            conn.execute(text("DELETE FROM iso_revision_logs"))
            print("  -> Đã làm sạch toàn bộ dữ liệu cũ trong iso_revision_logs.")

            # Bản đồ lưu thông tin revision đã sinh theo key
            entity_logs_map = {}

            # A. Chuẩn hóa cho iso_processes
            proc_updates = []
            rev_rows_to_insert = []
            for p in procs:
                p_id, p_code, p_new_code, p_name, p_date, p_doc_id, p_file_path = p
                key = clean_key(p_new_code or p_code or p_name or f"P_{p_id}")
                logs = generate_standard_revision_logs(key)
                entity_logs_map[f"proc_{p_id}"] = (logs, p_file_path, p_new_code or p_code or "")

                max_seq = max([l["seq_no"] for l in logs])
                ver_str = str(max_seq).zfill(2)
                last_date = logs[-1]["rev_date"]

                proc_updates.append({"id": p_id, "issue_date": last_date})

                for l in logs:
                    rev_rows_to_insert.append({
                        "process_id": p_id,
                        "document_id": None,
                        "seq_no": l["seq_no"],
                        "rev_date": l["rev_date"],
                        "content": l["content"],
                        "page_no": "Toàn bộ",
                        "modifier": "Hệ thống"
                    })

            for pu in proc_updates:
                conn.execute(text("UPDATE iso_processes SET issue_date = :issue_date WHERE id = :id"), pu)
            print(f"  -> Đã cập nhật issue_date cho {len(proc_updates)} quy trình.")

            # B. Chuẩn hóa cho iso_documents
            doc_updates = []
            for d in docs:
                d_id, d_code, d_name, d_ver, d_date, d_proc_id, d_file_path = d
                key = clean_key(d_code or d_name or f"D_{d_id}")
                logs = generate_standard_revision_logs(key)
                entity_logs_map[f"doc_{d_id}"] = (logs, d_file_path, d_code or "")

                max_seq = max([l["seq_no"] for l in logs])
                ver_str = str(max_seq).zfill(2)
                last_date = logs[-1]["rev_date"]

                doc_updates.append({"id": d_id, "version": ver_str, "issue_date": last_date})

                for l in logs:
                    rev_rows_to_insert.append({
                        "process_id": None,
                        "document_id": d_id,
                        "seq_no": l["seq_no"],
                        "rev_date": l["rev_date"],
                        "content": l["content"],
                        "page_no": "Toàn bộ",
                        "modifier": "Hệ thống"
                    })

            for du in doc_updates:
                conn.execute(text("UPDATE iso_documents SET version = :version, issue_date = :issue_date WHERE id = :id"), du)
            print(f"  -> Đã cập nhật version và issue_date cho {len(doc_updates)} tài liệu.")

            # Chèn toàn bộ revision logs vào bảng iso_revision_logs
            print(f"[4/6] Đang chèn {len(rev_rows_to_insert)} dòng lịch sử sửa đổi chuẩn hóa vào iso_revision_logs...")
            for r in rev_rows_to_insert:
                conn.execute(text("""
                    INSERT INTO iso_revision_logs (process_id, document_id, seq_no, rev_date, content, page_no, modifier)
                    VALUES (:process_id, :document_id, :seq_no, :rev_date, :content, :page_no, :modifier)
                """), r)

            # C. Cập nhật cho Sổ chủ Master Records nếu có mã trùng
            for mr in mrs:
                mr_id, mr_code, mr_ed, mr_date = mr
                if mr_code:
                    c_key = clean_key(mr_code)
                    mr_logs = generate_standard_revision_logs(c_key)
                    mr_max_seq = max([l["seq_no"] for l in mr_logs])
                    conn.execute(text("""
                        UPDATE iso_master_records 
                        SET edition = :edition, issue_date = :issue_date 
                        WHERE id = :id
                    """), {
                        "id": mr_id,
                        "edition": str(mr_max_seq).zfill(2),
                        "issue_date": mr_logs[-1]["rev_date"]
                    })
            print(f"  -> Đã đồng bộ sổ chủ iso_master_records.")

            # 5. Cập nhật các bản snapshot __canvas_editor_data__ trong iso_process_sections
            snaps = conn.execute(text("""
                SELECT id, process_id, content_html 
                FROM iso_process_sections 
                WHERE section_name = '__canvas_editor_data__'
            """)).fetchall()
            print(f"[5/6] Đang cập nhật {len(snaps)} bản snapshot __canvas_editor_data__...")

            updated_snaps = 0
            for s_id, s_pid, s_raw in snaps:
                if s_raw:
                    logs_info = entity_logs_map.get(f"proc_{s_pid}")
                    if logs_info:
                        logs, _, _ = logs_info
                    else:
                        logs = generate_standard_revision_logs(f"P_{s_pid}")
                    max_seq = max([l["seq_no"] for l in logs])
                    v_str = str(max_seq).zfill(2)
                    d_str = logs[-1]["rev_date"]

                    new_json_str = update_canvas_snapshot_data(s_raw, logs, v_str, d_str)
                    conn.execute(text("""
                        UPDATE iso_process_sections 
                        SET content_html = :content_html 
                        WHERE id = :id
                    """), {"id": s_id, "content_html": new_json_str})
                    updated_snaps += 1

            print(f"  -> Đã cập nhật thành công {updated_snaps} snapshot __canvas_editor_data__.")

            # Commit Transaction CSDL thành công
            trans.commit()
            print(">>> TRANSACTION CSDL ĐÃ COMMIT THÀNH CÔNG! <<<")

        except Exception as e:
            trans.rollback()
            print(f"[ERROR] Thất bại khi cập nhật CSDL, đã ROLLBACK an toàn: {e}")
            raise e

    # 6. Quét và cập nhật các file .docx thực tế trên server
    print("[6/6] Đang quét và cập nhật các file .docx thực tế...")
    updated_docx_count = 0
    uploads_dir = os.path.join(BACKEND_DIR, "static", "uploads", "iso_documents")

    for e_key, (logs, file_path, d_code) in entity_logs_map.items():
        if file_path and file_path.lower().endswith(".docx"):
            real_path = os.path.join(BACKEND_DIR, file_path) if not os.path.isabs(file_path) else file_path
            if not os.path.exists(real_path) and uploads_dir:
                # Tìm trong uploads
                cand = os.path.join(uploads_dir, os.path.basename(file_path))
                if os.path.exists(cand):
                    real_path = cand

            if os.path.exists(real_path):
                max_seq = max([l["seq_no"] for l in logs])
                v_str = str(max_seq).zfill(2)
                d_str = logs[-1]["rev_date"]
                if update_docx_file(real_path, logs, v_str, d_str, d_code):
                    updated_docx_count += 1

    print(f"  -> Đã cập nhật định dạng chuẩn hóa cho {updated_docx_count} file .docx.")
    print("================================================================================")
    print(" HOÀN THÀNH CHUẨN HÓA 100% TOÀN BỘ REVISION LOGS!")
    print("================================================================================")

if __name__ == "__main__":
    run_migration()

