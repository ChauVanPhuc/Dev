import os
import io
import re
import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Body, Request
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
import openpyxl

from config.database import get_db
from modules.inspection.models.iso_master_record_model import ISOMasterRecord, ISOMasterRecordAuditLog
from modules.inspection.services.iso_file_service import (
    get_base_iso_dir,
    resolve_safe_path,
    check_single_file_status,
    get_record_files_and_word_docs,
    parse_docx_to_html_and_headings,
    get_template_original_2_pages_data,
    parse_excel_to_sheets_data,
    parse_raw_source_links,
    convert_word_to_pdf_preview,
    extract_pdf_bookmarks,
    save_uploaded_file,
    validate_document_convertible,
    convert_procedure_document,
    save_accepted_conversion_document,
    cleanup_draft_file,
    update_draft_word_file,
    quick_edit_draft_metadata,
    get_document_page_images,
    save_direct_edited_word_content,
    ensure_docx_path,
    update_file_usage_status,
    sync_record_metadata_to_docx,
    update_document_metadata,
    get_department_code,
    get_department_name,
    resolve_record_storage_dir,
    sanitize_folder_name,
    merge_template_2_pages_with_upload_doc,
    generate_default_created_new_doc
)

router = APIRouter()

FIELD_LABELS = {
    "source_code": "Mã mục / Nguồn",
    "management_group": "Nhóm tài liệu quản lý",
    "classification": "Phân loại",
    "suggested_doc_code": "Mã TL quản lý / đề xuất",
    "item_code": "Mã của mục",
    "edition": "Lần ban hành",
    "document_name": "Tên tài liệu",
    "code_of_conduct": "Quy tắc ứng xử (PA)",
    "management_doc": "Tài liệu quản lý / đề xuất",
    "form_code": "Mã biểu mẫu áp dụng",
    "attached_records_count": "Số mục hồ sơ đi kèm",
    "identified_forms_count": "Số biểu mẫu đã nhận diện",
    "link_basis": "Căn cứ liên kết",
    "is_checked": "Đã kiểm tra",
    "department_in_charge": "Phòng ban",
    "source_status": "Hiện trạng nguồn",
    "review_issue": "Vấn đề cần rà soát",
    "action_chosen": "Hướng xử lý được chọn",
    "notes": "Ghi chú",
    "last_modified_date": "Ngày hiệu chỉnh",
    "source_link": "Liên kết file nguồn",
    "issue_date": "Ngày ban hành",
    "source_category": "Cấp tài liệu"
}

def get_actor_info(request: Optional[Request] = None, payload: Optional[dict] = None, db: Optional[Session] = None):
    """
    Xác định người thực hiện thao tác từ payload/query params hoặc JWT token Authorization header.
    """
    if payload:
        actor_name = payload.get("actor_name") or payload.get("modifier") or payload.get("user_name")
        actor_dept = payload.get("actor_dept") or payload.get("department")
        if actor_name:
            return actor_name, actor_dept or ""

    if request:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                from jose import jwt
                from config.settings import settings
                from modules.auth.models.accounts import Account as AccountModel
                token_data = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                username = token_data.get("sub")
                if username and db:
                    user = db.query(AccountModel).filter(AccountModel.username == username).first()
                    if user:
                        name = user.full_name or user.username
                        dept = getattr(user, "department_name", None) or getattr(user, "department", None) or ""
                        return name, dept
                elif username:
                    return username, ""
            except Exception:
                pass

    return "Quản trị viên (Hệ thống)", "Ban ISO"

def log_master_record_action(
    db: Session,
    record_id: int,
    action_type: str,
    action_label: str,
    actor_name: Optional[str] = None,
    actor_dept: Optional[str] = None,
    target_name: Optional[str] = None,
    details: Optional[dict] = None
):
    """
    Ghi một bản ghi nhật ký kiểm toán / lịch sử thay đổi thực tế vào DB (iso_master_record_audit_logs).
    """
    now = datetime.datetime.now()
    created_at_vn = now.strftime("%d/%m/%Y %H:%M")
    timestamp_iso = now.isoformat()
    
    details_str = None
    if details:
        try:
            details_str = json.dumps(details, ensure_ascii=False)
        except Exception:
            details_str = str(details)

    log_entry = ISOMasterRecordAuditLog(
        record_id=record_id,
        action_type=action_type,
        action_label=action_label,
        actor_name=actor_name or "Quản trị viên (Hệ thống)",
        actor_dept=actor_dept or "Ban ISO",
        target_name=target_name,
        details=details_str,
        created_at=created_at_vn,
        timestamp=timestamp_iso
    )
    db.add(log_entry)
    return log_entry


def resolve_source_link(raw_val, sheet_th=None):
    """
    Trích xuất đường dẫn link nguồn thật từ sheet 'Tổng hợp tài liệu' (cột I = col 9).
    Hỗ trợ tham chiếu dòng dạng '(I15)', '(I2)' hoặc cell location.
    """
    if not raw_val:
        return None
    val_str = str(raw_val or "").strip()
    if not sheet_th:
        return val_str or None

    target_row = None
    # Thử regex từ chuỗi text '(I15)', '(I2)'
    m = re.search(r'\(I(\d+)\)', val_str)
    if m:
        target_row = int(m.group(1))

    # Lấy giá trị cột I (col 9) tại dòng tương ứng của sheet 'Tổng hợp tài liệu'
    if target_row and target_row <= sheet_th.max_row:
        th_val = sheet_th.cell(target_row, 9).value
        if th_val:
            return format_cell_value(th_val) or None

    return val_str if val_str and val_str.lower() != "none" else None

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

@router.get("/")
def get_master_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    search: Optional[str] = Query(None),
    classification: Optional[str] = Query(None),
    management_group: Optional[str] = Query(None),
    code_of_conduct: Optional[str] = Query(None),
    suggested_doc_code: Optional[str] = Query(None),
    document_name: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    edition: Optional[str] = Query(None),
    issue_date: Optional[str] = Query(None),
    last_modified_date: Optional[str] = Query(None),
    management_doc: Optional[str] = Query(None),
    source_status: Optional[str] = Query(None),
    notes: Optional[str] = Query(None),
    is_checked: Optional[bool] = Query(None),
    group_by_doc_code: bool = Query(True),
    sort_by: Optional[str] = Query("id"),
    sort_dir: Optional[str] = Query("asc"),
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách hồ sơ ISO Master List:
    - Tìm kiếm nhanh đa trường: Mã TL đề xuất, Tên tài liệu, Phòng ban, Luật liên quan, Ghi chú...
    - Bộ lọc đầy đủ theo tất cả 12 trường dữ liệu
    - Gom nhóm (GROUP) theo 'Mã TL đề xuất': mỗi nhóm là một hồ sơ quản lý
    - Mã trống gom vào nhóm 'Chưa có Mã TL đề xuất'
    - Phát hiện xung đột metadata giữa các dòng trong nhóm: GROUP_METADATA_CONFLICT
    """
    query = db.query(ISOMasterRecord)

    def _clean_s(val):
        return val.strip() if isinstance(val, str) and val.strip() else None

    search = _clean_s(search)
    classification = _clean_s(classification)
    management_group = _clean_s(management_group)
    code_of_conduct = _clean_s(code_of_conduct)
    suggested_doc_code = _clean_s(suggested_doc_code)
    document_name = _clean_s(document_name)
    department = _clean_s(department)
    edition = _clean_s(edition)
    issue_date = _clean_s(issue_date)
    last_modified_date = _clean_s(last_modified_date)
    management_doc = _clean_s(management_doc)
    source_status = _clean_s(source_status)
    notes = _clean_s(notes)
    sort_by = _clean_s(sort_by) or "id"
    sort_dir = _clean_s(sort_dir) or "asc"
    group_by_doc_code = bool(group_by_doc_code) if not hasattr(group_by_doc_code, 'default') else True
    page = int(page) if not hasattr(page, 'default') else 1
    page_size = int(page_size) if not hasattr(page_size, 'default') else 25
    is_checked = bool(is_checked) if isinstance(is_checked, bool) else None

    # 1. Quick search across all relevant fields simultaneously
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                ISOMasterRecord.source_code.ilike(term),
                ISOMasterRecord.document_name.ilike(term),
                ISOMasterRecord.management_group.ilike(term),
                ISOMasterRecord.classification.ilike(term),
                ISOMasterRecord.suggested_doc_code.ilike(term),
                ISOMasterRecord.item_code.ilike(term),
                ISOMasterRecord.department_in_charge.ilike(term),
                ISOMasterRecord.code_of_conduct.ilike(term),
                ISOMasterRecord.management_doc.ilike(term),
                ISOMasterRecord.source_category.ilike(term),
                ISOMasterRecord.notes.ilike(term),
            )
        )

    # 2. Filters for all 12 fields
    if classification:
        query = query.filter(ISOMasterRecord.classification.ilike(f"%{classification}%"))

    if management_group:
        query = query.filter(ISOMasterRecord.management_group.ilike(f"%{management_group}%"))

    if code_of_conduct:
        query = query.filter(ISOMasterRecord.code_of_conduct.ilike(f"%{code_of_conduct}%"))

    if suggested_doc_code:
        if suggested_doc_code == "__EMPTY__" or suggested_doc_code.lower() == "chưa có mã tl đề xuất":
            query = query.filter(or_(ISOMasterRecord.suggested_doc_code == None, ISOMasterRecord.suggested_doc_code == ''))
        else:
            query = query.filter(ISOMasterRecord.suggested_doc_code.ilike(f"%{suggested_doc_code}%"))

    if document_name:
        query = query.filter(ISOMasterRecord.document_name.ilike(f"%{document_name}%"))

    if department:
        query = query.filter(ISOMasterRecord.department_in_charge.ilike(f"%{department}%"))

    if edition:
        query = query.filter(ISOMasterRecord.edition.ilike(f"%{edition}%"))

    if issue_date:
        query = query.filter(ISOMasterRecord.issue_date.ilike(f"%{issue_date}%"))

    if last_modified_date:
        query = query.filter(ISOMasterRecord.last_modified_date.ilike(f"%{last_modified_date}%"))

    if management_doc:
        query = query.filter(ISOMasterRecord.management_doc.ilike(f"%{management_doc}%"))

    if source_status:
        query = query.filter(ISOMasterRecord.source_status.ilike(f"%{source_status}%"))

    if notes:
        query = query.filter(ISOMasterRecord.notes.ilike(f"%{notes}%"))

    if is_checked is not None:
        query = query.filter(ISOMasterRecord.is_checked == is_checked)

    # 3. Sorting on query
    sort_col = getattr(ISOMasterRecord, sort_by, ISOMasterRecord.id)
    if sort_dir and sort_dir.lower() == "desc":
        query = query.order_by(desc(sort_col))
    else:
        query = query.order_by(asc(sort_col))

    all_matched_records = query.all()
    total_raw_records = len(all_matched_records)

    # Summary statistics across full DB
    all_q = db.query(ISOMasterRecord)
    total_all = all_q.count()
    docs_count = all_q.filter(ISOMasterRecord.classification == 'TÀI LIỆU').count()
    forms_count = all_q.filter(ISOMasterRecord.classification == 'BIỂU MẪU').count()
    records_count = all_q.filter(ISOMasterRecord.classification == 'HỒ SƠ').count()
    checked_count = all_q.filter(ISOMasterRecord.is_checked == True).count()

    stats = {
        "total_all": total_all,
        "docs_count": docs_count,
        "forms_count": forms_count,
        "records_count": records_count,
        "checked_count": checked_count
    }

    if not group_by_doc_code:
        # Chế độ phẳng không group (backward compatibility)
        offset = (page - 1) * page_size
        items = all_matched_records[offset: offset + page_size]
        total_pages = (total_raw_records + page_size - 1) // page_size if total_raw_records > 0 else 1
        return {
            "items": items,
            "total": total_raw_records,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "stats": stats
        }

    # 4. GROUP DỮ LIỆU THEO "MÃ TL ĐỀ XUẤT"
    # Kiểm tra xem có bộ lọc hoặc tìm kiếm nào đang kích hoạt không
    has_active_filters = bool(
        search or classification or management_group or code_of_conduct or
        suggested_doc_code or document_name or department or edition or
        issue_date or last_modified_date or management_doc or source_status or
        notes or (is_checked is not None)
    )

    if has_active_filters:
        # Nhóm match nếu BẤT KỲ child document nào thỏa mãn điều kiện
        matched_groups = set()
        has_matched_empty = False
        for r in all_matched_records:
            mg = (r.management_group or "").strip()
            if mg:
                matched_groups.add(mg)
            else:
                has_matched_empty = True

        if matched_groups or has_matched_empty:
            conds = []
            if matched_groups:
                conds.append(ISOMasterRecord.management_group.in_(list(matched_groups)))
            if has_matched_empty:
                conds.append(or_(ISOMasterRecord.management_group == None, ISOMasterRecord.management_group == ''))
            all_grouped_records = db.query(ISOMasterRecord).filter(or_(*conds)).order_by(asc(sort_col)).all()
        else:
            all_grouped_records = []
    else:
        all_grouped_records = db.query(ISOMasterRecord).order_by(asc(sort_col)).all()

    groups_dict = {}
    for rec in all_grouped_records:
        raw_mg = (rec.management_group or "").strip()
        raw_code = (rec.suggested_doc_code or "").strip()
        g_key = raw_mg if raw_mg else (raw_code if raw_code else (rec.source_code or f"rec_{rec.id}"))
        groups_dict.setdefault(g_key, []).append(rec)

    group_items = []
    DOCUMENT_LEVEL_FIELDS = [
        "management_group", "code_of_conduct", "classification", "document_name",
        "department_in_charge", "edition", "issue_date", "last_modified_date",
        "management_doc", "source_status", "notes"
    ]

    for g_key, group_records in groups_dict.items():
        # Chọn bản ghi đại diện (primary / representative)
        # Ưu tiên bản ghi đã có file chuẩn G7, hoặc Quy trình chính, hoặc phân loại TÀI LIỆU
        rep = group_records[0]
        for candidate in group_records:
            link = (candidate.source_link or "").lower()
            name = (candidate.document_name or "").lower()
            cls = (candidate.classification or "").upper()
            if "g7." in link or "_0" in link or "g7." in name:
                rep = candidate
                break
            if cls == "TÀI LIỆU" or "quy trình" in name:
                rep = candidate

        # Lấy Mã TL đề xuất của nhóm: ưu tiên mã của bản ghi đại diện, hoặc bất kỳ mã nào trong nhóm có giá trị
        rep_code = (rep.suggested_doc_code or "").strip()
        if not rep_code:
            for r in group_records:
                if (r.suggested_doc_code or "").strip():
                    rep_code = (r.suggested_doc_code or "").strip()
                    break

        is_empty_code = not bool(rep_code)
        doc_code = rep_code
        display_code = rep_code if rep_code else "Chưa có Mã TL đề xuất"

        # KHÔNG coi khác biệt metadata giữa các tài liệu con là xung đột
        has_conflict = False
        conflict_fields = []
        conflict_status = None
        conflict_details = {}

        # Thu thập các giá trị riêng biệt (distinct) của từng trường tài liệu con để hiển thị ở bảng ngoài
        distinct_meta = {}
        for f_key in DOCUMENT_LEVEL_FIELDS:
            vals = []
            for r in group_records:
                v = str(getattr(r, f_key) or '').strip()
                if v and v not in vals:
                    vals.append(v)
            distinct_meta[f_key] = {
                "values": vals,
                "has_multiple": len(vals) > 1,
                "count": len(vals)
            }

        # Trạng thái xử lý hồ sơ: Ở giai đoạn này chỉ có 'Nháp' hoặc 'Đang chỉnh'
        has_edits = any(
            (r.last_modified_date is not None and str(r.last_modified_date).strip() != "") or
            (r.source_status and "chỉnh" in str(r.source_status).lower())
            for r in group_records
        )
        proc_status = "Đang chỉnh" if has_edits else "Nháp"

        group_obj = {
            "id": rep.id,
            "group_key": g_key,
            "management_group": rep.management_group or g_key,
            "suggested_doc_code": doc_code,
            "display_doc_code": display_code,
            "is_empty_code": is_empty_code,
            "record_count": len(group_records),
            "processing_status": proc_status,
            "record_status": proc_status,
            "status": proc_status,
            "source_record_ids": [r.id for r in group_records],
            "source_records": [
                {
                    "id": r.id,
                    "source_row_id": r.id,
                    "source_code": r.source_code,
                    "management_group": r.management_group,
                    "classification": r.classification,
                    "suggested_doc_code": r.suggested_doc_code,
                    "document_name": r.document_name,
                    "department_in_charge": r.department_in_charge,
                    "edition": r.edition,
                    "issue_date": r.issue_date,
                    "last_modified_date": r.last_modified_date,
                    "management_doc": r.management_doc,
                    "code_of_conduct": r.code_of_conduct,
                    "source_status": r.source_status,
                    "notes": r.notes,
                    "source_link": r.source_link,
                    "attached_records_count": r.attached_records_count,
                    "identified_forms_count": r.identified_forms_count,
                    "form_code": r.form_code,
                    "is_checked": r.is_checked
                }
                for r in group_records
            ],
            # Metadata của tài liệu đại diện
            "source_code": rep.source_code,
            "management_group": rep.management_group,
            "classification": rep.classification,
            "document_name": rep.document_name,
            "department_in_charge": rep.department_in_charge,
            "edition": rep.edition,
            "issue_date": rep.issue_date,
            "last_modified_date": rep.last_modified_date,
            "management_doc": rep.management_doc,
            "code_of_conduct": rep.code_of_conduct,
            "source_status": rep.source_status,
            "notes": rep.notes,
            "source_link": rep.source_link,
            "attached_records_count": rep.attached_records_count,
            "identified_forms_count": rep.identified_forms_count,
            "form_code": rep.form_code,
            "is_checked": rep.is_checked,
            "distinct_meta": distinct_meta,
            "has_conflict": False,
            "conflict_fields": [],
            "conflict_status": None,
            "conflict_details": {}
        }

        group_items.append(group_obj)

    # Sắp xếp nhóm: Nhóm có mã đưa lên theo sort, nhóm Chưa có Mã xếp ở vị trí hợp lý
    def get_sort_val(g):
        val = g.get(sort_by) or g.get("suggested_doc_code") or ""
        return str(val).lower()

    is_desc = (sort_dir and sort_dir.lower() == "desc")
    group_items.sort(key=lambda x: (1 if x["is_empty_code"] else 0, get_sort_val(x)), reverse=is_desc)

    total_groups = len(group_items)
    total_pages = (total_groups + page_size - 1) // page_size if total_groups > 0 else 1
    offset = (page - 1) * page_size
    paged_groups = group_items[offset: offset + page_size]

    return {
        "items": paged_groups,
        "total": total_groups,
        "total_records": len(all_grouped_records),
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "stats": stats
    }

@router.get("/summary-options")
def get_filter_options(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách đầy đủ các giá trị phục vụ dropdown lọc 12 trường dữ liệu.
    """
    classifications = [r[0] for r in db.query(ISOMasterRecord.classification).distinct().all() if r[0]]
    groups = [r[0] for r in db.query(ISOMasterRecord.management_group).distinct().all() if r[0]]
    departments = [r[0] for r in db.query(ISOMasterRecord.department_in_charge).distinct().all() if r[0]]
    code_of_conducts = [r[0] for r in db.query(ISOMasterRecord.code_of_conduct).distinct().all() if r[0]]
    suggested_doc_codes = [r[0] for r in db.query(ISOMasterRecord.suggested_doc_code).distinct().all() if r[0] and str(r[0]).strip()]
    editions = [r[0] for r in db.query(ISOMasterRecord.edition).distinct().all() if r[0] and str(r[0]).strip()]
    management_docs = [r[0] for r in db.query(ISOMasterRecord.management_doc).distinct().all() if r[0] and str(r[0]).strip()]
    source_statuses = [r[0] for r in db.query(ISOMasterRecord.source_status).distinct().all() if r[0] and str(r[0]).strip()]

    return {
        "classifications": sorted(classifications),
        "groups": sorted(groups),
        "departments": sorted(departments),
        "code_of_conducts": sorted(code_of_conducts),
        "suggested_doc_codes": sorted(suggested_doc_codes),
        "editions": sorted(editions),
        "management_docs": sorted(management_docs),
        "source_statuses": sorted(source_statuses)
    }

@router.post("/upload-excel")
async def upload_excel_master_list(
    file: UploadFile = File(...),
    mode: str = Query("append", description="'append' hoặc 'replace'"),
    db: Session = Depends(get_db)
):
    """
    [POST] Tải lên file Excel Master List (sheet 'MASTER LIST' hoặc sheet đầu tiên),
    phân tích trích xuất 23 cột và lưu trữ vào cơ sở dữ liệu.
    """
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file Excel định dạng .xlsx hoặc .xls")

    try:
        content = await file.read()
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        
        sheet = None
        if "MASTER LIST" in wb.sheetnames:
            sheet = wb["MASTER LIST"]
        else:
            sheet = wb.active

        sheet_th = wb["Tổng hợp tài liệu"] if "Tổng hợp tài liệu" in wb.sheetnames else None

        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            raise HTTPException(status_code=400, detail="File Excel không có dữ liệu")

        # Tìm dòng tiêu đề cột
        header_row_idx = None
        for i, r in enumerate(rows):
            if r and any(str(cell).strip() in ['Mã mục / nguồn', 'Phân loại', 'Nhóm tài liệu quản lý', 'Tên tài liệu / biểu mẫu / hồ sơ'] for cell in r if cell is not None):
                header_row_idx = i
                break

        if header_row_idx is None:
            # Fallback nếu không khớp chính xác
            header_row_idx = 0
            for i, r in enumerate(rows):
                if r and sum(1 for c in r if c is not None) >= 5:
                    header_row_idx = i
                    break

        header_row = [str(c).strip() if c is not None else "" for c in rows[header_row_idx]]

        # Map header columns to indices
        col_map = {}
        for idx, h in enumerate(header_row):
            h_clean = h.lower()
            if "mã mục" in h_clean or "nguồn" in h_clean and "hạng mục" not in h_clean:
                col_map["source_code"] = idx
            elif "nhóm tài liệu" in h_clean:
                col_map["management_group"] = idx
            elif "phân loại" in h_clean:
                col_map["classification"] = idx
            elif "mã tl" in h_clean or "quản lý / đề xuất" in h_clean and "tài liệu quản lý" not in h_clean:
                col_map["suggested_doc_code"] = idx
            elif "mã của mục" in h_clean:
                col_map["item_code"] = idx
            elif "lần ban hành" in h_clean:
                col_map["edition"] = idx
            elif "tên tài liệu" in h_clean:
                col_map["document_name"] = idx
            elif "quy tắc" in h_clean or "(pa)" in h_clean:
                col_map["code_of_conduct"] = idx
            elif "tài liệu quản lý / đề xuất" in h_clean:
                col_map["management_doc"] = idx
            elif "biểu mẫu áp dụng" in h_clean:
                col_map["form_code"] = idx
            elif "hồ sơ đi kèm" in h_clean:
                col_map["attached_records_count"] = idx
            elif "biểu mẫu đã nhận diện" in h_clean:
                col_map["identified_forms_count"] = idx
            elif "căn cứ liên kết" in h_clean:
                col_map["link_basis"] = idx
            elif "đã kiểm tra" in h_clean:
                col_map["is_checked"] = idx
            elif "phụ trách" in h_clean:
                col_map["department_in_charge"] = idx
            elif "hiện trạng nguồn" in h_clean:
                col_map["source_status"] = idx
            elif "vấn đề cần rà soát" in h_clean:
                col_map["review_issue"] = idx
            elif "hướng xử lý" in h_clean:
                col_map["action_chosen"] = idx
            elif "ghi chú" in h_clean:
                col_map["notes"] = idx
            elif "chỉnh sửa gần nhất" in h_clean:
                col_map["last_modified_date"] = idx
            elif "link nguồn" in h_clean:
                col_map["source_link"] = idx
            elif "ngày ban hành" in h_clean:
                col_map["issue_date"] = idx
            elif "hạng mục nguồn" in h_clean:
                col_map["source_category"] = idx

        # Nếu thiếu một số map, gán theo thứ tự chuẩn 23 cột mặc định của file gốc
        default_cols = [
            "source_code", "management_group", "classification", "suggested_doc_code",
            "item_code", "edition", "document_name", "code_of_conduct", "management_doc",
            "form_code", "attached_records_count", "identified_forms_count", "link_basis",
            "is_checked", "department_in_charge", "source_status", "review_issue",
            "action_chosen", "notes", "last_modified_date", "source_link", "issue_date", "source_category"
        ]
        for idx, key in enumerate(default_cols):
            if key not in col_map and idx < len(header_row):
                col_map[key] = idx

        # Nếu mode == 'replace', xóa toàn bộ dữ liệu cũ
        if mode == "replace":
            db.query(ISOMasterRecord).delete()
            db.commit()

        imported_count = 0
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        for r_idx in range(header_row_idx + 1, len(rows)):
            row_data = rows[r_idx]
            if not row_data or not any(row_data):
                continue

            def get_val(key):
                idx = col_map.get(key)
                if idx is not None and idx < len(row_data):
                    return row_data[idx]
                return None

            doc_name = format_cell_value(get_val("document_name"))
            src_code = format_cell_value(get_val("source_code"))
            # Bỏ qua dòng trống cả tên lẫn mã
            if not doc_name and not src_code:
                continue

            record = ISOMasterRecord(
                source_code=src_code or None,
                management_group=format_cell_value(get_val("management_group")) or None,
                classification=format_cell_value(get_val("classification")) or None,
                suggested_doc_code=format_cell_value(get_val("suggested_doc_code")) or None,
                item_code=format_cell_value(get_val("item_code")) or None,
                edition=format_cell_value(get_val("edition")) or None,
                document_name=doc_name or None,
                code_of_conduct=format_cell_value(get_val("code_of_conduct")) or None,
                management_doc=format_cell_value(get_val("management_doc")) or None,
                form_code=format_cell_value(get_val("form_code")) or None,
                attached_records_count=format_cell_value(get_val("attached_records_count")) or None,
                identified_forms_count=format_cell_value(get_val("identified_forms_count")) or None,
                link_basis=format_cell_value(get_val("link_basis")) or None,
                is_checked=format_bool_value(get_val("is_checked")),
                department_in_charge=format_cell_value(get_val("department_in_charge")) or None,
                source_status=format_cell_value(get_val("source_status")) or None,
                review_issue=format_cell_value(get_val("review_issue")) or None,
                action_chosen=format_cell_value(get_val("action_chosen")) or None,
                notes=format_cell_value(get_val("notes")) or None,
                last_modified_date=format_cell_value(get_val("last_modified_date")) or None,
                source_link=resolve_source_link(get_val("source_link"), sheet_th=sheet_th),
                issue_date=format_cell_value(get_val("issue_date")) or None,
                source_category=format_cell_value(get_val("source_category")) or None,
                created_at=now_str,
                updated_at=now_str
            )
            db.add(record)
            imported_count += 1

        db.commit()
        return {
            "success": True,
            "message": f"Đã nhập thành công {imported_count} mục vào danh mục Master List.",
            "imported_count": imported_count,
            "mode": mode
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi đọc file Excel: {str(e)}")

@router.post("/seed-from-file")
def seed_from_local_file(force: bool = Query(False), db: Session = Depends(get_db)):
    """
    [POST] Tự động nạp dữ liệu từ file 'Tổng hợp tài liệu kiểm tra - MASTER LIST.xlsx' nếu có tại thư mục gốc.
    Đồng thời liên kết tự động với cột I của sheet 'Tổng hợp tài liệu' để lấy đường dẫn link nguồn thật.
    """
    # Tìm file tại thư mục gốc dự án
    possible_paths = [
        "Tổng hợp tài liệu kiểm tra - MASTER LIST.xlsx",
        "../Tổng hợp tài liệu kiểm tra - MASTER LIST.xlsx",
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "Tổng hợp tài liệu kiểm tra - MASTER LIST.xlsx")
    ]
    file_path = None
    for p in possible_paths:
        if os.path.exists(p):
            file_path = p
            break

    if not file_path:
        raise HTTPException(status_code=404, detail="Không tìm thấy file 'Tổng hợp tài liệu kiểm tra - MASTER LIST.xlsx'")

    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb["MASTER LIST"] if "MASTER LIST" in wb.sheetnames else wb.active
        sheet_th = wb["Tổng hợp tài liệu"] if "Tổng hợp tài liệu" in wb.sheetnames else None
        rows = list(sheet.iter_rows(values_only=True))

        header_row_idx = 5
        for i, r in enumerate(rows):
            if r and any(str(cell).strip() in ['Mã mục / nguồn', 'Phân loại', 'Nhóm tài liệu quản lý'] for cell in r if cell is not None):
                header_row_idx = i
                break

        # Nếu đã có dữ liệu và không force, cập nhật source_link nếu đang lưu dạng 'Xem nguồn ...'
        existing_count = db.query(ISOMasterRecord).count()
        if existing_count > 0 and not force:
            updated_links = 0
            all_records = db.query(ISOMasterRecord).all()
            for rec in all_records:
                if rec.source_link and "Xem nguồn" in rec.source_link:
                    resolved = resolve_source_link(rec.source_link, sheet_th=sheet_th)
                    if resolved and resolved != rec.source_link:
                        rec.source_link = resolved
                        updated_links += 1
            if updated_links > 0:
                db.commit()
                return {
                    "success": True,
                    "message": f"Đã cập nhật đúng {updated_links} đường dẫn link nguồn thật từ sheet 'Tổng hợp tài liệu'.",
                    "updated_links": updated_links,
                    "total_records": existing_count
                }
            return {
                "success": True,
                "message": f"Bảng đã có sẵn {existing_count} bản ghi với link nguồn chuẩn xác.",
                "total_records": existing_count
            }

        # Nếu force == True, xóa sạch để nạp lại chuẩn
        if force:
            db.query(ISOMasterRecord).delete()
            db.commit()

        imported_count = 0
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        for r_idx in range(header_row_idx + 1, len(rows)):
            row = rows[r_idx]
            if not row or not any(row):
                continue
            
            doc_name = format_cell_value(row[6]) if len(row) > 6 else ""
            src_code = format_cell_value(row[0]) if len(row) > 0 else ""
            if not doc_name and not src_code:
                continue

            raw_source_link = format_cell_value(row[20]) if len(row) > 20 else None

            record = ISOMasterRecord(
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
                source_link=resolve_source_link(raw_source_link, sheet_th=sheet_th),
                issue_date=format_cell_value(row[21]) if len(row) > 21 else None,
                source_category=format_cell_value(row[22]) if len(row) > 22 else None,
                created_at=now_str,
                updated_at=now_str
            )
            db.add(record)
            imported_count += 1

        db.commit()
        return {
            "success": True,
            "message": f"Đã nạp {imported_count} bản ghi từ file gốc với link nguồn thật vào cơ sở dữ liệu.",
            "imported_count": imported_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi nạp dữ liệu gốc: {str(e)}")

@router.post("/")
def create_master_record(payload: dict = Body(...), request: Request = None, db: Session = Depends(get_db)):
    """
    [POST] Thêm mới thủ công một bản ghi Master List và ghi log lịch sử.
    Tự động tổ chức thư mục lưu trữ: Hồ sơ G7/<Phòng ban>/<Nhóm tài liệu quản lý>/
    """
    dept = payload.get("department_in_charge")
    group = payload.get("management_group")
    if not dept or not str(dept).strip():
        raise HTTPException(status_code=400, detail="Vui lòng bổ sung đầy đủ thông tin Phòng ban để xác định thư mục lưu trữ trong Hồ sơ G7.")
    if not group or not str(group).strip():
        raise HTTPException(status_code=400, detail="Vui lòng bổ sung đầy đủ thông tin Nhóm tài liệu quản lý để xác định thư mục lưu trữ trong Hồ sơ G7.")

    # Khởi tạo hoặc chuẩn bị cấu trúc thư mục lưu trữ chuẩn trong Hồ sơ G7
    try:
        rel_dir, abs_dir = resolve_record_storage_dir(
            department=dept,
            management_group=group,
            source_code=payload.get("source_code"),
            create_if_missing=True
        )
    except Exception as dir_err:
        raise HTTPException(status_code=400, detail=str(dir_err))

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    record = ISOMasterRecord(
        source_code=payload.get("source_code"),
        management_group=payload.get("management_group"),
        classification=payload.get("classification"),
        suggested_doc_code=payload.get("suggested_doc_code"),
        item_code=payload.get("item_code"),
        edition=payload.get("edition") or "01",
        document_name=payload.get("document_name"),
        code_of_conduct=payload.get("code_of_conduct"),
        management_doc=payload.get("management_doc"),
        form_code=payload.get("form_code"),
        attached_records_count=payload.get("attached_records_count"),
        identified_forms_count=payload.get("identified_forms_count"),
        link_basis=payload.get("link_basis"),
        is_checked=bool(payload.get("is_checked", False)),
        department_in_charge=payload.get("department_in_charge"),
        source_status=payload.get("source_status"),
        review_issue=payload.get("review_issue"),
        action_chosen=payload.get("action_chosen"),
        notes=payload.get("notes"),
        last_modified_date=payload.get("last_modified_date") or datetime.datetime.now().strftime("%d/%m/%Y"),
        source_link=payload.get("source_link"),
        issue_date=payload.get("issue_date"),
        source_category=payload.get("source_category"),
        created_at=now_str,
        updated_at=now_str
    )
    db.add(record)
    db.flush()

    actor_name, actor_dept = get_actor_info(request, payload, db)
    log_master_record_action(
        db=db,
        record_id=record.id,
        action_type="CREATE",
        action_label=f"Khởi tạo & Ban hành lần đầu (Lần {record.edition or '01'})",
        actor_name=actor_name,
        actor_dept=actor_dept,
        target_name=record.document_name or record.source_code,
        details={
            "source_code": record.source_code,
            "document_name": record.document_name,
            "edition": record.edition,
            "management_group": record.management_group
        }
    )

    db.commit()
    db.refresh(record)
    return {"success": True, "message": "Thêm mới thành công", "data": record}

@router.put("/{record_id}")
def update_master_record(record_id: int, payload: dict = Body(...), request: Request = None, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật bản ghi Master List và ghi nhận lịch sử thay đổi thực tế (Audit Log).
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")

    actor_name, actor_dept = get_actor_info(request, payload, db)

    changes = []
    fields = [
        "source_code", "management_group", "classification", "suggested_doc_code",
        "item_code", "edition", "document_name", "code_of_conduct", "management_doc",
        "form_code", "attached_records_count", "identified_forms_count", "link_basis",
        "is_checked", "department_in_charge", "source_status", "review_issue",
        "action_chosen", "notes", "last_modified_date", "source_link", "issue_date", "source_category"
    ]
    for f in fields:
        if f in payload:
            old_val = getattr(record, f, None)
            new_val = payload[f]
            old_str = "" if old_val is None else str(old_val).strip()
            new_str = "" if new_val is None else str(new_val).strip()
            if old_str != new_str:
                changes.append({
                    "field": f,
                    "field_label": FIELD_LABELS.get(f, f),
                    "old_val": old_val,
                    "new_val": new_val
                })
                setattr(record, f, new_val)

    # Chuẩn hóa tên phòng ban nếu có thay đổi phòng ban
    meta_fields = ["suggested_doc_code", "edition", "issue_date", "department_in_charge", "document_name"]
    meta_changed = any(c["field"] in meta_fields for c in changes)

    # Nếu đổi phòng ban, tự động cập nhật department_code tương ứng vào mã G7.XX... nếu user chưa tự gõ mã mới
    dept_change = next((c for c in changes if c["field"] == "department_in_charge"), None)
    if dept_change:
        norm_dept_name = get_department_name(record.department_in_charge)
        record.department_in_charge = norm_dept_name
        dept_code = get_department_code(norm_dept_name)
        if record.suggested_doc_code and record.suggested_doc_code.startswith("G7."):
            parts = record.suggested_doc_code.split(".")
            if len(parts) >= 3 and parts[1] != dept_code:
                parts[1] = dept_code
                old_c = record.suggested_doc_code
                record.suggested_doc_code = ".".join(parts)
                changes.append({
                    "field": "suggested_doc_code",
                    "field_label": "Mã hiệu đề xuất (đồng bộ theo Phòng ban)",
                    "old_val": old_c,
                    "new_val": record.suggested_doc_code
                })
                meta_changed = True

    # Đồng bộ sang file Word hiện hành nếu có thay đổi metadata
    if meta_changed:
        try:
            files_info = get_record_files_and_word_docs(record)
            sel_doc = files_info.get("selected_word_doc")
            if sel_doc and sel_doc.get("relative_path"):
                target_abs, _ = resolve_safe_path(sel_doc["relative_path"])
                if target_abs and os.path.isfile(target_abs) and target_abs.lower().endswith(('.docx', '.doc')):
                    target_docx = ensure_docx_path(target_abs)
                    sync_record_metadata_to_docx(
                        docx_abs_path=target_docx,
                        doc_code=record.suggested_doc_code or "",
                        edition=record.edition or "01",
                        issue_date=record.issue_date or "",
                        department_name=get_department_name(record.department_in_charge),
                        document_name=record.document_name or "",
                        revision_note=f"Đồng bộ metadata ({record.suggested_doc_code} - Lần {record.edition} - {record.issue_date})"
                    )
        except Exception as sync_e:
            print(f"[UpdateRecord] Cảnh báo đồng bộ Word: {sync_e}")

    record.updated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Xác định loại hành động nghiệp vụ
    action_type = payload.get("action_type")
    action_label = payload.get("action_label")

    if not action_type:
        action_chosen = payload.get("action_chosen")
        edition_change = next((c for c in changes if c["field"] == "edition"), None)

        if edition_change:
            action_type = "REVISION"
            action_label = f"Ban hành phiên bản mới (Lần {edition_change['old_val'] or '01'} → Lần {edition_change['new_val']})"
        elif action_chosen in ["Phê duyệt", "APPROVE", "Ban hành", "Phê duyệt hồ sơ"]:
            action_type = "APPROVAL"
            action_label = f"Phê duyệt & Ban hành hồ sơ (Lần {record.edition or '01'})"
        elif action_chosen in ["Từ chối", "REJECT", "Từ chối hồ sơ"]:
            action_type = "REJECT"
            action_label = "Từ chối phê duyệt hồ sơ"
        elif action_chosen in ["Lưu nháp", "DRAFT", "Lưu nháp hồ sơ"]:
            action_type = "SAVE_DRAFT"
            action_label = "Lưu nháp hồ sơ"
        elif action_chosen in ["Gửi duyệt", "SUBMIT_APPROVAL", "Gửi duyệt hồ sơ"]:
            action_type = "SUBMIT_APPROVAL"
            action_label = f"Gửi duyệt hồ sơ (Lần {record.edition or '01'})"
        elif any(c["field"] == "source_status" for c in changes):
            new_st = payload.get("source_status") or "Thay đổi trạng thái"
            action_type = "STATUS_CHANGE"
            action_label = f"Thay đổi trạng thái sang '{new_st}'"
        else:
            action_type = "UPDATE_INFO"
            action_label = "Hiệu chỉnh thông tin hồ sơ"

    # Chỉ ghi log nếu có trường thay đổi thực tế hoặc là hành động lưu nháp / gửi duyệt
    if changes or action_type in ["SAVE_DRAFT", "SUBMIT_APPROVAL", "STATUS_CHANGE"]:
        log_master_record_action(
            db=db,
            record_id=record_id,
            action_type=action_type,
            action_label=action_label,
            actor_name=actor_name,
            actor_dept=actor_dept,
            target_name=record.document_name or record.source_code,
            details={
                "changes": changes,
                "change_count": len(changes),
                "edition": record.edition,
                "action_chosen": payload.get("action_chosen")
            }
        )

    db.commit()
    db.refresh(record)
    return {"success": True, "message": "Cập nhật thành công", "data": record}

@router.delete("/{record_id}")
def delete_master_record(record_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa một bản ghi Master List.
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")
    db.delete(record)
    db.commit()
    return {"success": True, "message": "Xóa thành công"}

@router.post("/batch-delete")
def batch_delete_master_records(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    [POST] Xóa hàng loạt bản ghi Master List.
    """
    ids = payload.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="Danh sách ID rỗng")
    db.query(ISOMasterRecord).filter(ISOMasterRecord.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"success": True, "message": f"Đã xóa thành công {len(ids)} mục."}

@router.get("/export-excel")
def export_excel(
    search: Optional[str] = Query(None),
    classification: Optional[str] = Query(None),
    management_group: Optional[str] = Query(None),
    code_of_conduct: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    is_checked: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """
    [GET] Xuất toàn bộ danh sách hiện tại ra file Excel chuẩn 23 cột như file gốc.
    """
    query = db.query(ISOMasterRecord)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                ISOMasterRecord.source_code.ilike(term),
                ISOMasterRecord.document_name.ilike(term),
                ISOMasterRecord.management_group.ilike(term),
                ISOMasterRecord.classification.ilike(term),
                ISOMasterRecord.department_in_charge.ilike(term),
                ISOMasterRecord.code_of_conduct.ilike(term),
            )
        )
    if classification:
        query = query.filter(ISOMasterRecord.classification == classification)
    if management_group:
        query = query.filter(ISOMasterRecord.management_group == management_group)
    if code_of_conduct:
        query = query.filter(ISOMasterRecord.code_of_conduct == code_of_conduct)
    if department:
        query = query.filter(ISOMasterRecord.department_in_charge.ilike(f"%{department}%"))
    if is_checked is not None:
        query = query.filter(ISOMasterRecord.is_checked == is_checked)

    records = query.order_by(asc(ISOMasterRecord.id)).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "MASTER LIST"

    headers = [
        "Mã mục / nguồn", "Nhóm tài liệu quản lý", "Phân loại", "Mã TL quản lý / đề xuất",
        "Mã của mục", "Lần ban hành", "Tên tài liệu / biểu mẫu / hồ sơ", "Quy tắc ứng xử (PA)",
        "Tài liệu quản lý / đề xuất", "Mã biểu mẫu áp dụng", "Số mục hồ sơ đi kèm",
        "Số biểu mẫu đã nhận diện", "Căn cứ liên kết", "Đã kiểm tra", "Phụ trách",
        "Hiện trạng nguồn", "Vấn đề cần rà soát", "Hướng xử lý được chọn",
        "Ghi chú / kết quả xác nhận", "Ngày chỉnh sửa gần nhất", "Link nguồn (chưa xác minh)",
        "Ngày ban hành", "Hạng mục nguồn"
    ]
    ws.append(headers)

    for r in records:
        ws.append([
            r.source_code or "",
            r.management_group or "",
            r.classification or "",
            r.suggested_doc_code or "",
            r.item_code or "",
            r.edition or "",
            r.document_name or "",
            r.code_of_conduct or "",
            r.management_doc or "",
            r.form_code or "",
            r.attached_records_count or "",
            r.identified_forms_count or "",
            r.link_basis or "",
            "Đã kiểm tra" if r.is_checked else "Chưa kiểm tra",
            r.department_in_charge or "",
            r.source_status or "",
            r.review_issue or "",
            r.action_chosen or "",
            r.notes or "",
            r.last_modified_date or "",
            r.source_link or "",
            r.issue_date or "",
            r.source_category or ""
        ])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"MASTER_LIST_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ---------------------------------------------------------
# CÁC API QUẢN LÝ VÀ XEM TRỰC TIẾP FILE HỒ SƠ TỪ 'HỒ SƠ VINA G7'
# ---------------------------------------------------------

@router.get("/{record_id}/files-status")
def get_record_files_status(record_id: int, db: Session = Depends(get_db)):
    """
    [GET] Kiểm tra trạng thái thực tế từng file trong HỒ SƠ VINA G7 thuộc về hồ sơ,
    phân loại các tài liệu Word và xác định phiên bản mới nhất.
    Gom toàn bộ file thuộc các dòng trong cùng nhóm Mã TL đề xuất (QT014, QT015, hoặc Chưa có Mã).
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi hồ sơ")

    mg_val = (record.management_group or "").strip()
    code_val = (record.suggested_doc_code or "").strip()

    if mg_val:
        sibling_records = db.query(ISOMasterRecord).filter(
            ISOMasterRecord.management_group.ilike(mg_val)
        ).order_by(ISOMasterRecord.id).all()
    elif code_val:
        sibling_records = db.query(ISOMasterRecord).filter(
            ISOMasterRecord.suggested_doc_code.ilike(code_val)
        ).order_by(ISOMasterRecord.id).all()
    else:
        sibling_records = [record]

    if not sibling_records:
        sibling_records = [record]

    data = get_record_files_and_word_docs(record, sibling_records=sibling_records)
    total_count = data.get("total_count", 0)
    found_count = data.get("found_count", 0)
    missing_count = data.get("missing_count", 0)
    word_documents = data.get("word_documents", [])
    selected_word_doc = data.get("selected_word_doc")

    return {
        "success": True,
        "record_id": record_id,
        "source_code": record.source_code,
        "document_name": record.document_name,
        "suggested_doc_code": record.suggested_doc_code,
        "total_linked": total_count,
        "total_found": found_count,
        "total_missing": missing_count,
        "word_docs": word_documents,
        "default_word_doc": selected_word_doc,
        "source_records": [
            {
                "id": r.id,
                "source_row_id": r.id,
                "source_code": r.source_code,
                "management_group": r.management_group,
                "classification": r.classification,
                "suggested_doc_code": r.suggested_doc_code,
                "document_name": r.document_name,
                "department_in_charge": r.department_in_charge,
                "edition": r.edition,
                "issue_date": r.issue_date,
                "last_modified_date": r.last_modified_date,
                "management_doc": r.management_doc,
                "code_of_conduct": r.code_of_conduct,
                "source_status": r.source_status,
                "notes": r.notes,
                "source_link": r.source_link,
                "attached_records_count": r.attached_records_count,
                "identified_forms_count": r.identified_forms_count,
                "form_code": r.form_code,
                "is_checked": r.is_checked
            }
            for r in sibling_records
        ],
        **data
    }


@router.get("/file-preview/docx")
def preview_docx_file(path: str = Query(..., description="Đường dẫn tương đối tới file .docx hoặc .doc")):
    """
    [GET] Trích xuất nội dung file Word (.docx, .doc) sang HTML có cấu trúc và danh sách Mục lục (TOC Headings).
    """
    abs_path, err = resolve_safe_path(path)
    if not abs_path:
        return {
            "success": False,
            "error": err or "Không tìm thấy file theo đường dẫn",
            "detail": err or "Không tìm thấy file theo đường dẫn",
            "html_content": "",
            "headings": []
        }

    abs_to_parse = ensure_docx_path(abs_path)
    if not abs_to_parse.lower().endswith(".docx"):
        return {
            "success": False,
            "error": "Chỉ hỗ trợ xem trước tệp Word định dạng .docx hoặc .doc",
            "detail": "Chỉ hỗ trợ xem trước tệp Word định dạng .docx hoặc .doc",
            "html_content": "",
            "headings": []
        }

    try:
        preview_data = parse_docx_to_html_and_headings(abs_to_parse)
        file_name = os.path.basename(abs_path)
        stat = os.stat(abs_path)
        return {
            "success": True,
            "file_name": file_name,
            "relative_path": path,
            "size_bytes": stat.st_size,
            "modified_time": datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%d/%m/%Y %H:%M"),
            **preview_data
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Không thể đọc nội dung file Word: {str(e)}",
            "detail": f"Không thể đọc nội dung file Word: {str(e)}",
            "html_content": "",
            "headings": []
        }


@router.get("/template-original-2-pages")
def get_template_original_2_pages(
    doc_title: Optional[str] = Query(None, description="Tên quy trình / tài liệu"),
    issuer: Optional[str] = Query(None, description="Người biên soạn"),
    approver: Optional[str] = Query(None, description="Người phê duyệt"),
    doc_code: Optional[str] = Query(None, description="Mã hiệu tài liệu"),
    issue_date: Optional[str] = Query(None, description="Ngày ban hành"),
    version: Optional[str] = Query(None, description="Phiên bản / Lần ban hành"),
    dept_name: Optional[str] = Query(None, description="Phòng ban / bộ phận"),
    revision_logs: Optional[str] = Query(None, description="JSON danh sách nhật ký sửa đổi"),
    db: Session = Depends(get_db)
):
    """
    [GET] Trích xuất nguyên bản 100% 2 trang đầu gốc từ 'Mẩu quy trình.docx' (Trang bìa & Theo dõi sửa đổi)
    Tự động điền metadata, người ký duyệt và bảng theo dõi sửa đổi.
    """
    try:
        return get_template_original_2_pages_data(
            doc_title=doc_title,
            issuer=issuer,
            approver=approver,
            doc_code=doc_code,
            issue_date=issue_date,
            version=version,
            dept_name=dept_name,
            revision_logs=revision_logs,
            db=db
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể cắt 2 trang gốc từ template: {str(e)}")


@router.get("/default-template-docx")
def get_default_template_docx(
    doc_title: Optional[str] = Query(None),
    doc_code: Optional[str] = Query(None),
    issuer_name: Optional[str] = Query(None),
    issuer_role: Optional[str] = Query(None),
    approver_name: Optional[str] = Query(None),
    approver_role: Optional[str] = Query(None),
    dept_name: Optional[str] = Query(None),
    version: Optional[str] = Query(None),
    issue_date: Optional[str] = Query(None),
    revision_logs: Optional[str] = Query(None)
):
    """
    [GET] Trả về luồng nhị phân file Word (.docx) mặc định cho Tạo mới quy trình ISO.
    Luôn luôn có 2 trang đầu từ 'Mẩu quy trình.docx' (đã điền metadata nếu có) + khung 6 mục ISO chuẩn.
    """
    metadata = {
        "doc_title": doc_title,
        "doc_code": doc_code,
        "issuer_name": issuer_name,
        "issuer_role": issuer_role,
        "approver_name": approver_name,
        "approver_role": approver_role,
        "dept_name": dept_name,
        "version": version or "01",
        "issue_date": issue_date,
        "revision_logs": revision_logs
    }
    try:
        doc = generate_default_created_new_doc(metadata=metadata)
        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        fn = f"{doc_code or 'Quy_trinh'}_template.docx"
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{fn}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khởi tạo template DOCX: {str(e)}")


@router.post("/upload-and-merge-word")
async def upload_and_merge_word(
    file: UploadFile = File(...),
    record_id: Optional[int] = Query(None),
    doc_title: Optional[str] = Query(None),
    doc_code: Optional[str] = Query(None),
    issuer_name: Optional[str] = Query(None),
    issuer_role: Optional[str] = Query(None),
    approver_name: Optional[str] = Query(None),
    approver_role: Optional[str] = Query(None),
    dept_name: Optional[str] = Query(None),
    version: Optional[str] = Query(None),
    issue_date: Optional[str] = Query(None),
    revision_logs: Optional[str] = Query(None),
    actor_name: Optional[str] = Query(None),
    actor_dept: Optional[str] = Query(None),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Tải lên file Word (.docx), tự động:
    1. Cắt bỏ toàn bộ phần bìa cũ của file upload (tất cả phần trước 'Mục đích').
    2. Lấy 2 trang đầu từ 'Mẩu quy trình.docx' (điền metadata hiện tại vào Bìa và Bảng sửa đổi).
    3. Thêm ngắt trang sau Trang 2.
    4. Ghép nối nội dung từ 'Mục đích' đến hết file upload.
    5. Lưu trữ tệp DOCX hoàn chỉnh trên hệ thống và trả về thông tin file + TOC.
    """
    filename = file.filename or "quy_trinh.docx"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".docx", ".doc"]:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file Word định dạng .docx hoặc .doc")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tin rỗng")

    # Thu thập metadata để điền vào 2 trang đầu
    target_dept = dept_name or actor_dept or None
    target_group = None
    target_code = doc_code or None
    record = None
    if record_id:
        record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
        if record:
            target_dept = record.department_in_charge or target_dept
            target_group = record.management_group
            target_code = record.source_code or target_code
            doc_title = doc_title or record.document_name
            doc_code = doc_code or record.suggested_doc_code
            version = version or record.edition
            issue_date = issue_date or record.issue_date

    metadata = {
        "doc_title": doc_title,
        "doc_code": doc_code or target_code,
        "issuer_name": issuer_name,
        "issuer_role": issuer_role,
        "approver_name": approver_name,
        "approver_role": approver_role,
        "dept_name": target_dept,
        "version": version or "01",
        "issue_date": issue_date,
        "revision_logs": revision_logs
    }

    try:
        # Thực hiện ghép 2 trang đầu template + phần từ Mục đích
        merged_doc = merge_template_2_pages_with_upload_doc(
            upload_file_bytes=content,
            metadata=metadata
        )
        merged_buf = io.BytesIO()
        merged_doc.save(merged_buf)
        merged_bytes = merged_buf.getvalue()

        # Lưu file đã ghép vào thư mục upload
        safe_fn = f"{doc_code or 'QT'}_{os.path.basename(filename)}"
        if not safe_fn.endswith('.docx'):
            safe_fn += '.docx'

        if target_dept and target_group:
            rel_path, abs_path = save_uploaded_file(
                merged_bytes,
                safe_fn,
                department=target_dept,
                management_group=target_group,
                source_code=target_code
            )
        else:
            rel_path, abs_path = save_uploaded_file(merged_bytes, safe_fn, "TÀI LIỆU TẢI LÊN")

        # Trích xuất TOC
        headings = []
        try:
            parsed = parse_docx_to_html_and_headings(abs_path)
            headings = parsed.get("headings", [])
        except Exception as e:
            print(f"[UploadAndMergeWord] Lỗi trích xuất TOC: {e}")

        # Liên kết record nếu có
        if record_id and record:
            raw_links = parse_raw_source_links(record.source_link)
            if rel_path not in raw_links:
                raw_links.append(rel_path)
                record.source_link = "; ".join(raw_links)
                record.updated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            act_name, act_dept = get_actor_info(request, {"actor_name": actor_name, "actor_dept": actor_dept}, db)
            log_master_record_action(
                db=db,
                record_id=record_id,
                action_type="UPLOAD_WORD_MERGED",
                action_label="Tải lên và ghép 2 trang đầu Mẫu quy trình chuẩn VINA G7",
                actor_name=act_name,
                actor_dept=act_dept,
                target_name=safe_fn,
                details={
                    "file_name": safe_fn,
                    "rel_path": rel_path,
                    "headings_count": len(headings)
                }
            )
            db.commit()

        return {
            "success": True,
            "message": "Đã ghép 2 trang đầu chuẩn VINA G7 và nối nội dung từ Mục đích thành công!",
            "file_path": rel_path,
            "file_name": safe_fn,
            "size_bytes": len(merged_bytes),
            "headings": headings
        }
    except Exception as e:
        print(f"[UploadAndMergeWord] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi ghép tài liệu: {str(e)}")


@router.get("/file-preview/excel")
def preview_excel_file(path: str = Query(..., description="Đường dẫn tương đối tới file .xlsx/.xls")):
    """
    [GET] Đọc nội dung file Excel thành dữ liệu bảng tính đa sheet để render tương tác.
    """
    abs_path, err = resolve_safe_path(path)
    if not abs_path:
        raise HTTPException(status_code=400, detail=err or "Đường dẫn không hợp lệ")

    if not (abs_path.lower().endswith(".xlsx") or abs_path.lower().endswith(".xls")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ xem trước tệp Excel định dạng .xlsx hoặc .xls")

    try:
        excel_data = parse_excel_to_sheets_data(abs_path)
        file_name = os.path.basename(abs_path)
        stat = os.stat(abs_path)
        return {
            "success": True,
            "file_name": file_name,
            "relative_path": path,
            "size_bytes": stat.st_size,
            "modified_time": datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%d/%m/%Y %H:%M"),
            **excel_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể đọc nội dung file Excel: {str(e)}")


@router.get("/file-preview/pdf")
def preview_pdf_file(path: str = Query(..., description="Đường dẫn tương đối tới file .pdf")):
    """
    [GET] Trích xuất Bookmarks / Outline và siêu dữ liệu từ file PDF gốc để đồng bộ mục lục Viewer.
    """
    abs_path, err = resolve_safe_path(path)
    if not abs_path:
        raise HTTPException(status_code=400, detail=err or "Đường dẫn không hợp lệ")

    if not abs_path.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp PDF")

    try:
        bookmarks = extract_pdf_bookmarks(abs_path)
        file_name = os.path.basename(abs_path)
        stat = os.stat(abs_path)
        return {
            "success": True,
            "file_name": file_name,
            "relative_path": path,
            "size_bytes": stat.st_size,
            "bookmarks": bookmarks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể đọc thông tin PDF: {str(e)}")


@router.get("/file-stream")
@router.get("/file-download")
def stream_file(
    path: str = Query(..., description="Đường dẫn tương đối tới file"),
    download: bool = Query(False, description="Tải về file (attachment) thay vì xem (inline)")
):
    """
    [GET] Phục vụ luồng file an toàn từ HỒ SƠ VINA G7 (hỗ trợ PDF view native, Word, Excel, ảnh, v.v.).
    Hỗ trợ Range Requests (Accept-Ranges: bytes) cho PDF streaming.
    """
    abs_path, err = resolve_safe_path(path)
    if not abs_path:
        raise HTTPException(status_code=400, detail=err or "Đường dẫn không hợp lệ")

    file_name = os.path.basename(abs_path)
    _, ext = os.path.splitext(file_name)
    ext_lower = ext.lower()

    media_type_map = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls": "application/vnd.ms-excel",
        ".rar": "application/x-rar-compressed",
        ".zip": "application/zip",
        ".7z": "application/x-7z-compressed",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png"
    }
    media_type = media_type_map.get(ext_lower, "application/octet-stream")
    disposition_type = "attachment" if download else "inline"

    import urllib.parse
    import unicodedata
    safe_ascii_name = re.sub(r'[^\w\.-]', '_', unicodedata.normalize('NFKD', file_name).encode('ascii', 'ignore').decode('ascii'))
    quoted_utf8_name = urllib.parse.quote(file_name)

    headers = {
        "Content-Disposition": f"{disposition_type}; filename=\"{safe_ascii_name}\"; filename*=UTF-8''{quoted_utf8_name}",
        "Access-Control-Expose-Headers": "Content-Disposition",
        "Accept-Ranges": "bytes"
    }

    return FileResponse(abs_path, media_type=media_type, headers=headers)


@router.post("/{record_id}/unlink-file")
def unlink_file_from_record(
    record_id: int,
    payload: dict = Body(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Xóa liên kết file khỏi hồ sơ (chỉ xóa đường dẫn trong DB, không xóa file vật lý).
    Hỗ trợ xóa liên kết ở dòng nguồn chứa file trong cùng nhóm.
    Ghi nhận nhật ký kiểm toán thực tế.
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi hồ sơ")

    file_path = (payload.get("file_path") or "").strip()
    if not file_path:
        raise HTTPException(status_code=400, detail="Thiếu đường dẫn file cần xóa liên kết")

    target_record = record
    raw_links = parse_raw_source_links(record.source_link)
    has_in_record = any(
        link.strip().lower() == file_path.lower() or os.path.basename(link).lower() == os.path.basename(file_path).lower()
        for link in raw_links
    )

    if not has_in_record:
        # Tìm trong các dòng sibling của cùng nhóm
        code_val = (record.suggested_doc_code or "").strip()
        if code_val:
            siblings = db.query(ISOMasterRecord).filter(ISOMasterRecord.suggested_doc_code.ilike(code_val)).all()
        else:
            siblings = db.query(ISOMasterRecord).filter(
                or_(ISOMasterRecord.suggested_doc_code == None, ISOMasterRecord.suggested_doc_code == '')
            ).all()

        for sib in siblings:
            s_links = parse_raw_source_links(sib.source_link)
            if any(l.strip().lower() == file_path.lower() or os.path.basename(l).lower() == os.path.basename(file_path).lower() for l in s_links):
                target_record = sib
                raw_links = s_links
                break

    # Loại bỏ file khớp đường dẫn khỏi target_record
    updated_links = [
        link for link in raw_links
        if link.strip().lower() != file_path.lower() and os.path.basename(link).lower() != os.path.basename(file_path).lower()
    ]

    new_source_link = "; ".join(updated_links) if updated_links else None
    target_record.source_link = new_source_link
    target_record.updated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    actor_name, actor_dept = get_actor_info(request, payload, db)
    removed_name = os.path.basename(file_path)
    log_master_record_action(
        db=db,
        record_id=target_record.id,
        action_type="UNLINK_FILE",
        action_label="Xóa liên kết file",
        actor_name=actor_name,
        actor_dept=actor_dept,
        target_name=removed_name,
        details={
            "file_name": removed_name,
            "file_path": file_path,
            "remaining_count": len(updated_links),
            "source_code": target_record.source_code
        }
    )
    db.commit()

    return {
        "success": True,
        "message": f"Đã xóa liên kết file khỏi hồ sơ thành công.",
        "remaining_count": len(updated_links),
        "source_link": new_source_link
    }


@router.get("/word-pdf-preview")
def get_word_pdf_preview(path: str = Query(..., description="Đường dẫn tương đối tới file Word")):
    """
    [GET] Tạo và trả về luồng PDF chất lượng cao từ file Word (.docx, .doc) qua Word COM native cache.
    Bảo toàn 100% kích thước A4, bảng biểu, ngắt trang, cell merge, header/footer và logo.
    """
    abs_path, err = resolve_safe_path(path)
    if not abs_path:
        raise HTTPException(status_code=400, detail=err or "Đường dẫn không hợp lệ")

    if abs_path.lower().endswith(".pdf"):
        return FileResponse(
            abs_path,
            media_type="application/pdf",
            headers={"Content-Disposition": 'inline; filename="preview.pdf"'}
        )

    pdf_path = convert_word_to_pdf_preview(abs_path)
    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Không thể tạo bản xem trước PDF (Server chưa cài đặt LibreOffice hoặc Microsoft Office)")

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="preview.pdf"'}
    )


@router.post("/upload-word-document")
async def upload_word_document(
    file: UploadFile = File(...),
    record_id: Optional[int] = Query(None),
    actor_name: Optional[str] = Query(None),
    actor_dept: Optional[str] = Query(None),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Tải lên tài liệu Word (.docx, .doc) từ máy người dùng, lưu trữ an toàn,
    trả về thông tin file và tự động trích xuất Mục lục (TOC Headings) thực tế.
    Nếu có record_id, tự động liên kết file vào hồ sơ và ghi log lịch sử.
    """
    filename = file.filename or "tailieu.docx"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".docx", ".doc"]:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file Word định dạng .docx hoặc .doc")

    import time
    import threading

    t_up_start = time.time()
    print(f"[PROFILING] UPLOAD_START: {filename}")
    content = await file.read()
    t_up_end = time.time()
    print(f"[PROFILING] UPLOAD_END: took {(t_up_end - t_up_start)*1000:.1f}ms, size={len(content)} bytes")
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tin rỗng")

    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dung lượng tệp vượt quá giới hạn 50MB")

    target_dept = actor_dept or None
    target_group = None
    target_code = None
    record = None
    if record_id:
        record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
        if record:
            target_dept = record.department_in_charge or target_dept
            target_group = record.management_group
            target_code = record.source_code

    t_save_start = time.time()
    print(f"[PROFILING] FILE_SAVE_START")
    if target_dept and target_group:
        rel_path, abs_path = save_uploaded_file(
            content,
            filename,
            department=target_dept,
            management_group=target_group,
            source_code=target_code
        )
    else:
        rel_path, abs_path = save_uploaded_file(content, filename, "TÀI LIỆU TẢI LÊN")
    stat = os.stat(abs_path)
    t_save_end = time.time()
    print(f"[PROFILING] FILE_SAVE_END: took {(t_save_end - t_save_start)*1000:.1f}ms, path={rel_path}")

    # Trích xuất TOC nếu là docx (rất nhanh, ~10ms)
    headings = []
    if ext == ".docx":
        try:
            parsed = parse_docx_to_html_and_headings(abs_path)
            headings = parsed.get("headings", [])
        except Exception as e:
            print(f"[UploadWord] Lỗi trích xuất TOC: {e}")

    # Chuyển đổi bản xem trước PDF trong nền để phản hồi HTTP trả về ngay tức thì
    def bg_convert_word_preview(p):
        t_prev_start = time.time()
        print(f"[PROFILING] PREVIEW_START: {p}")
        try:
            convert_word_to_pdf_preview(p)
        except Exception as e:
            print(f"[UploadWord] Cache preview warning: {e}")
        t_prev_end = time.time()
        print(f"[PROFILING] PREVIEW_END: took {(t_prev_end - t_prev_start)*1000:.1f}ms")

    threading.Thread(target=bg_convert_word_preview, args=(abs_path,), daemon=True).start()

    # Nếu có record_id thì liên kết vào source_link
    t_db_start = time.time()
    print(f"[PROFILING] DB_START")
    if record_id:
        record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
        if record:
            raw_links = parse_raw_source_links(record.source_link)
            if rel_path not in raw_links:
                raw_links.append(rel_path)
                record.source_link = "; ".join(raw_links)
                record.updated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            act_name, act_dept = get_actor_info(request, {"actor_name": actor_name, "actor_dept": actor_dept}, db)
            log_master_record_action(
                db=db,
                record_id=record_id,
                action_type="UPLOAD_WORD",
                action_label="Cập nhật tài liệu Word nội dung hồ sơ",
                actor_name=act_name,
                actor_dept=act_dept,
                target_name=filename,
                details={
                    "file_name": filename,
                    "relative_path": rel_path,
                    "size_bytes": stat.st_size,
                    "size_formatted": f"{stat.st_size / 1024:.1f} KB" if stat.st_size < 1024*1024 else f"{stat.st_size / (1024*1024):.1f} MB"
                }
            )
            db.commit()
    t_db_end = time.time()
    print(f"[PROFILING] DB_END: took {(t_db_end - t_db_start)*1000:.1f}ms")

    return {
        "success": True,
        "filename": os.path.basename(abs_path),
        "file_name": os.path.basename(abs_path),
        "relative_path": rel_path,
        "raw_path": rel_path,
        "ext": ext.lstrip("."),
        "exists": True,
        "size_bytes": stat.st_size,
        "size_formatted": f"{stat.st_size / 1024:.1f} KB" if stat.st_size < 1024*1024 else f"{stat.st_size / (1024*1024):.1f} MB",
        "headings": headings,
        "preview_url": f"/api/iso-master-records/word-pdf-preview?path={rel_path.replace(os.sep, '/')}",
        "message": "Đã tải file – đang tạo bản xem trước"
    }


@router.post("/upload-related-file")
async def upload_related_file(
    file: UploadFile = File(...),
    record_id: Optional[int] = Query(None),
    actor_name: Optional[str] = Query(None),
    actor_dept: Optional[str] = Query(None),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Tải lên tệp liên quan (Word, Excel, PDF, ảnh...), lưu trữ an toàn không ghi đè.
    Nếu có record_id, liên kết vào hồ sơ và ghi log lịch sử.
    """
    import time
    import threading

    filename = file.filename or "file_dinh_kem"
    t_up_start = time.time()
    print(f"[PROFILING] UPLOAD_START (related): {filename}")
    content = await file.read()
    t_up_end = time.time()
    print(f"[PROFILING] UPLOAD_END (related): took {(t_up_end - t_up_start)*1000:.1f}ms, size={len(content)} bytes")
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tin rỗng")

    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dung lượng tệp vượt quá giới hạn 50MB")

    danger_exts = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.ps1', '.dll', '.msi']
    _, ext = os.path.splitext(filename)
    if ext.lower() in danger_exts:
        raise HTTPException(status_code=400, detail="Định dạng tệp không được phép tải lên vì lý do an toàn")

    target_dept = actor_dept or None
    target_group = None
    target_code = None
    record = None
    if record_id:
        record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
        if record:
            target_dept = record.department_in_charge or target_dept
            target_group = record.management_group
            target_code = record.source_code

    t_save_start = time.time()
    print(f"[PROFILING] FILE_SAVE_START (related)")
    if target_dept and target_group:
        rel_path, abs_path = save_uploaded_file(
            content,
            filename,
            department=target_dept,
            management_group=target_group,
            source_code=target_code
        )
    else:
        rel_path, abs_path = save_uploaded_file(content, filename, "FILE LIÊN QUAN TẢI LÊN")
    stat = os.stat(abs_path)
    t_save_end = time.time()
    print(f"[PROFILING] FILE_SAVE_END (related): took {(t_save_end - t_save_start)*1000:.1f}ms, path={rel_path}")

    # Nếu là Word, chuyển đổi sẵn PDF preview trong background
    if ext.lower() in [".docx", ".doc"]:
        def bg_convert_rel_preview(p):
            t_prev_start = time.time()
            print(f"[PROFILING] PREVIEW_START (related): {p}")
            try:
                convert_word_to_pdf_preview(p)
            except Exception as e:
                print(f"[UploadRelated] Cache preview warning: {e}")
            t_prev_end = time.time()
            print(f"[PROFILING] PREVIEW_END (related): took {(t_prev_end - t_prev_start)*1000:.1f}ms")

        threading.Thread(target=bg_convert_rel_preview, args=(abs_path,), daemon=True).start()

    t_db_start = time.time()
    print(f"[PROFILING] DB_START (related)")
    if record_id:
        record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
        if record:
            raw_links = parse_raw_source_links(record.source_link)
            if rel_path not in raw_links:
                raw_links.append(rel_path)
                record.source_link = "; ".join(raw_links)
                record.updated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            act_name, act_dept = get_actor_info(request, {"actor_name": actor_name, "actor_dept": actor_dept}, db)
            log_master_record_action(
                db=db,
                record_id=record_id,
                action_type="UPLOAD_RELATED",
                action_label="Thêm file liên quan",
                actor_name=act_name,
                actor_dept=act_dept,
                target_name=filename,
                details={
                    "file_name": filename,
                    "relative_path": rel_path,
                    "size_bytes": stat.st_size,
                    "size_formatted": f"{stat.st_size / 1024:.1f} KB" if stat.st_size < 1024*1024 else f"{stat.st_size / (1024*1024):.1f} MB"
                }
            )
            db.commit()
    t_db_end = time.time()
    print(f"[PROFILING] DB_END (related): took {(t_db_end - t_db_start)*1000:.1f}ms")

    return {
        "success": True,
        "filename": os.path.basename(abs_path),
        "file_name": os.path.basename(abs_path),
        "relative_path": rel_path,
        "raw_path": rel_path,
        "ext": ext.lower().lstrip("."),
        "exists": True,
        "size_bytes": stat.st_size,
        "size_formatted": f"{stat.st_size / 1024:.1f} KB" if stat.st_size < 1024*1024 else f"{stat.st_size / (1024*1024):.1f} MB",
        "message": "Tải lên tệp liên quan thành công"
    }


@router.get("/{record_id}/audit-logs")
def get_record_audit_logs(record_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách lịch sử thay đổi thực tế của hồ sơ từ bảng iso_master_record_audit_logs.
    Chỉ hiển thị các sự kiện có ý nghĩa (bỏ qua hủy draft không làm thay đổi dữ liệu, mở viewer, etc.).
    Sắp xếp mới nhất lên đầu (ORDER BY id DESC).
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi hồ sơ")

    code_val = (record.suggested_doc_code or "").strip()
    if code_val:
        sibling_records = db.query(ISOMasterRecord).filter(
            ISOMasterRecord.suggested_doc_code.ilike(code_val)
        ).all()
    else:
        sibling_records = [record]

    sibling_ids = [r.id for r in sibling_records]
    rec_name_map = {r.id: (r.document_name or r.source_code or f"Tài liệu #{r.id}") for r in sibling_records}

    MEANINGFUL_ACTIONS = {
        "CREATE", "UPDATE", "UPDATE_INFO", "UPDATE_METADATA",
        "CONVERT_DOC", "ACCEPT_CONVERSION", "SAVE_CONVERTED_DOC",
        "SAVE_VERSION", "REVISION", "DIRECT_EDIT_WORD", "EDIT_WORD_DOC",
        "UPLOAD_WORD", "UPLOAD_RELATED", "UNLINK_FILE",
        "UPDATE_FILE_USAGE", "DELETE", "SAVE_DRAFT",
        "SUBMIT_APPROVAL", "APPROVAL", "REJECT", "STATUS_CHANGE"
    }

    logs = db.query(ISOMasterRecordAuditLog)\
             .filter(ISOMasterRecordAuditLog.record_id.in_(sibling_ids))\
             .order_by(desc(ISOMasterRecordAuditLog.id))\
             .all()

    result = []
    for log in logs:
        # Bỏ qua các sự kiện không có giá trị
        if log.action_type not in MEANINGFUL_ACTIONS:
            continue

        details_obj = None
        if log.details:
            try:
                details_obj = json.loads(log.details)
            except Exception:
                details_obj = {"raw": log.details}
        else:
            details_obj = {}

        # Gán target_name nếu chưa có, ưu tiên tên tài liệu cụ thể của event
        target_n = log.target_name
        if not target_n and isinstance(details_obj, dict):
            target_n = (
                details_obj.get("target_name") or
                details_obj.get("document_name") or
                details_obj.get("official_filename") or
                details_obj.get("draft_filename") or
                details_obj.get("source_filename") or
                details_obj.get("filename") or
                rec_name_map.get(log.record_id)
            )
        if not target_n:
            target_n = rec_name_map.get(log.record_id, "")

        result.append({
            "id": log.id,
            "record_id": log.record_id,
            "action_type": log.action_type,
            "action_label": log.action_label,
            "actor_name": log.actor_name,
            "actor_dept": log.actor_dept,
            "target_name": target_n,
            "details": details_obj,
            "created_at": log.created_at,
            "timestamp": log.timestamp
        })

    return {
        "success": True,
        "record_id": record_id,
        "total": len(result),
        "items": result,
        "logs": result
    }

@router.post("/{record_id}/convert-document")
def convert_record_document(
    record_id: int,
    payload: dict = Body(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Chuyển đổi tài liệu theo chuẩn Mẫu quy trình.docx:
    - Lấy đúng file đang mở (hoặc file Word mới nhất của hồ sơ).
    - Áp chuẩn Mẫu quy trình.docx mà không làm mất heading, bảng, hình, lưu đồ, diễn giải của source.
    - Không copy thêm file BEFORE (BEFORE = source file).
    - Tạo AFTER dạng draft trong TẠM CHUYỂN ĐỔI.
    - Ghi nhận audit log traceability.
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ Master Record")

    source_path = payload.get("source_path")
    target_doc_code = payload.get("target_doc_code")
    if target_doc_code and not target_doc_code.strip().startswith("G7."):
        target_doc_code = None
    target_edition = payload.get("target_edition")

    # Xác định đường dẫn file nguồn
    abs_path = None
    if source_path:
        abs_path, err = resolve_safe_path(source_path)
    
    # Nếu chưa truyền source_path hoặc không tìm thấy, lấy tài liệu Word chính từ hồ sơ
    if not abs_path or not os.path.isfile(abs_path):
        record_files_data = get_record_files_and_word_docs(record)
        sel_doc = record_files_data.get("selected_word_doc")
        if sel_doc and sel_doc.get("relative_path"):
            abs_path, _ = resolve_safe_path(sel_doc["relative_path"])

    if not abs_path or not os.path.isfile(abs_path):
        raise HTTPException(status_code=400, detail="Không tìm thấy tệp tin Word hợp lệ để thực hiện chuyển đổi")

    act_name, act_dept = get_actor_info(request, payload, db)

    try:
        res = convert_procedure_document(
            source_abs_path=abs_path,
            record=record,
            actor_name=act_name,
            actor_dept=act_dept,
            target_doc_code=target_doc_code,
            target_edition=target_edition
        )

        old_issue_d = res.get("issue_date_old") or str(record.issue_date or "").strip()
        new_issue_d = res.get("issue_date_new")
        conv_label = "Chuyển đổi tài liệu"

        # Ghi log kiểm toán quá trình chuyển đổi (Traceability - Event 1)
        log_master_record_action(
            db=db,
            record_id=record_id,
            action_type="CONVERT_DOC",
            action_label=conv_label,
            actor_name=act_name,
            actor_dept=act_dept,
            target_name=f"{res['source_filename']} → {res['draft_filename']}",
            details={
                "event": "EVENT_CONVERT",
                "template_used": res["template_used"],
                "source_path": res["source_rel_path"],
                "source_filename": res["source_filename"],
                "source_version": res["edition_old"],
                "doc_code_old": res["doc_code_old"],
                "doc_code_new": res["doc_code_new"],
                "edition_old": res["edition_old"],
                "edition_new": res["edition_new"],
                "issue_date_old": old_issue_d,
                "issue_date_new": new_issue_d,
                "draft_path": res["draft_rel_path"],
                "draft_filename": res["draft_filename"],
                "status": "CHỜ_XÁC_NHẬN",
                "status_label": "Đã tạo bản chuyển đổi chờ xác nhận",
                "changes": [
                    {"field": "doc_code", "field_label": "Mã hiệu tài liệu", "old_val": res["doc_code_old"], "new_val": res["doc_code_new"]},
                    {"field": "edition", "field_label": "Lần ban hành", "old_val": f"Lần {res['edition_old']}", "new_val": f"Lần {res['edition_new']}"},
                    {"field": "issue_date", "field_label": "Ngày ban hành", "old_val": old_issue_d or "Chưa có", "new_val": new_issue_d},
                    {"field": "template", "field_label": "Chuẩn áp dụng", "old_val": "Định dạng gốc", "new_val": "Mẫu quy trình.docx"}
                ]
            }
        )
        db.commit()

        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"[ConvertDoc] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi trong quá trình chuyển đổi tài liệu: {str(e)}")


@router.post("/{record_id}/accept-conversion")
def accept_conversion(
    record_id: int,
    payload: dict = Body(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Chấp nhận kết quả chuyển đổi (Event 2):
    AFTER trở thành bản làm việc mới trong UI nhưng CHƯA ghi đè file gốc ngay.
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ Master Record")

    act_name, act_dept = get_actor_info(request, payload, db)
    doc_code_new = payload.get("doc_code_new")
    edition_new = payload.get("edition_new")
    issue_date_new = payload.get("issue_date_new")
    draft_fn = payload.get("draft_filename") or os.path.basename(payload.get("draft_path") or "") or "Bản chuyển đổi"
    source_fn = payload.get("source_filename") or os.path.basename(payload.get("source_path") or "") or "File nguồn"

    log_master_record_action(
        db=db,
        record_id=record_id,
        action_type="ACCEPT_CONVERSION",
        action_label="Chấp nhận bản chuyển đổi",
        actor_name=act_name,
        actor_dept=act_dept,
        target_name=draft_fn,
        details={
            "event": "EVENT_ACCEPT",
            "template_used": "Mẫu quy trình.docx",
            "source_path": payload.get("source_path"),
            "source_filename": source_fn,
            "draft_path": payload.get("draft_path"),
            "draft_filename": draft_fn,
            "doc_code_new": doc_code_new,
            "edition_new": edition_new,
            "issue_date_new": issue_date_new,
            "status": "ĐÃ_CHẤP_NHẬN",
            "status_label": "Đã chấp nhận bản chuyển đổi làm bản làm việc mới"
        }
    )
    db.commit()

    return {"success": True, "message": "Đã chấp nhận bản chuyển đổi làm bản làm việc mới"}


@router.post("/{record_id}/cancel-conversion")
def cancel_conversion(
    record_id: int,
    payload: dict = Body(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Hủy bản chuyển đổi:
    Bỏ bản draft, giữ nguyên tài liệu đang dùng.
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    draft_path = payload.get("draft_path")
    if draft_path:
        cleanup_draft_file(draft_path)

    act_name, act_dept = get_actor_info(request, payload, db)
    if record:
        log_master_record_action(
            db=db,
            record_id=record_id,
            action_type="CANCEL_CONVERSION",
            action_label="Hủy bản chuyển đổi tài liệu",
            actor_name=act_name,
            actor_dept=act_dept,
            target_name=payload.get("source_filename") or "Bản chuyển đổi",
            details={
                "source_path": payload.get("source_path"),
                "draft_path": draft_path,
                "status": "ĐÃ_HỦY",
                "status_label": "Đã hủy bản draft, không ảnh hưởng file gốc"
            }
        )
        db.commit()

    return {"success": True, "message": "Đã hủy bản chuyển đổi"}


@router.post("/{record_id}/update-draft-word")
async def update_draft_word_route(
    record_id: int,
    file: UploadFile = File(...),
    draft_path: str = Form(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Tải lên file Word đã chỉnh sửa từ máy tính để cập nhật bản nháp làm việc.
    Sinh lại PDF preview và trích xuất lại TOC Headings.
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ Master Record")

    if not draft_path:
        raise HTTPException(status_code=400, detail="Thiếu draft_path")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tin rỗng")

    try:
        res = update_draft_word_file(draft_path, content)
        return res
    except Exception as e:
        print(f"[UpdateDraftWord] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật file Word nháp: {str(e)}")


@router.post("/{record_id}/quick-edit-draft-word")
def quick_edit_draft_word_route(
    record_id: int,
    payload: dict = Body(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Chỉnh sửa nhanh metadata / tiêu đề / dòng theo dõi sửa đổi trực tiếp vào file Word draft.
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ Master Record")

    draft_path = payload.get("draft_path")
    if not draft_path:
        raise HTTPException(status_code=400, detail="Thiếu draft_path")

    try:
        res = quick_edit_draft_metadata(
            draft_rel_path=draft_path,
            doc_code=payload.get("doc_code"),
            edition=payload.get("edition"),
            issue_date=payload.get("issue_date"),
            doc_name=payload.get("document_name"),
            revision_note=payload.get("revision_note")
        )
        return res
    except Exception as e:
        print(f"[QuickEditDraft] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi sửa nhanh tài liệu Word: {str(e)}")


@router.post("/{record_id}/save-converted-document")
def save_converted_document_endpoint(
    record_id: int,
    payload: dict = Body(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Persist chính thức phiên bản mới sau khi chấp nhận và chỉnh sửa (Event 3):
    - Lưu file mới đúng folder của file nguồn.
    - Cập nhật file hiện hành của hồ sơ (CURRENT).
    - Giữ nguyên các version / file trước (SUPERSEDED / Bản cũ – Không sử dụng).
    - Cập nhật metadata hồ sơ.
    - Ghi log audit log Event 3 đầy đủ traceability.
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ Master Record")

    draft_path = payload.get("draft_path")
    source_path = payload.get("source_path")
    target_doc_code = payload.get("target_doc_code")
    target_edition = payload.get("target_edition")
    target_issue_date = payload.get("target_issue_date")
    doc_name = payload.get("document_name")
    if doc_name:
        record.document_name = doc_name.strip()

    if not draft_path or not source_path:
        raise HTTPException(status_code=400, detail="Thiếu thông tin draft_path hoặc source_path để lưu chính thức")

    act_name, act_dept = get_actor_info(request, payload, db)

    try:
        save_res = save_accepted_conversion_document(
            record=record,
            draft_rel_path=draft_path,
            source_rel_path=source_path,
            new_doc_code=target_doc_code,
            new_edition=target_edition,
            new_issue_date=target_issue_date,
            actor_name=act_name,
            actor_dept=act_dept
        )

        saved_loc = save_res.get("source_abs_dir") or os.path.dirname(save_res["official_abs_path"])

        log_master_record_action(
            db=db,
            record_id=record_id,
            action_type="SAVE_CONVERTED_DOC",
            action_label="Lưu sau chỉnh sửa",
            actor_name=act_name,
            actor_dept=act_dept,
            target_name=f"{save_res['source_filename']} → {save_res['official_filename']}",
            details={
                "event": "EVENT_SAVE",
                "template_used": "Mẫu quy trình.docx",
                "file_old": save_res["source_filename"],
                "file_new": save_res["official_filename"],
                "source_path": save_res["source_rel_path"],
                "source_filename": save_res["source_filename"],
                "official_path": save_res["official_rel_path"],
                "official_filename": save_res["official_filename"],
                "saved_location": saved_loc,
                "status_old": "Bản cũ – Không sử dụng",
                "status_new": "Bản hiện hành",
                "doc_code_old": save_res["doc_code_old"],
                "doc_code_new": save_res["doc_code_new"],
                "edition_old": save_res["edition_old"],
                "edition_new": save_res["edition_new"],
                "issue_date_old": save_res.get("issue_date_old"),
                "issue_date_new": save_res.get("issue_date_new"),
                "final_saved_version": f"Lần {save_res['edition_new']}",
                "status": "ĐÃ_LƯU_CHÍNH_THỨC",
                "status_label": "Đã lưu chính thức phiên bản mới",
                "changes": [
                    {"field": "doc_code", "field_label": "Mã hiệu tài liệu", "old_val": save_res["doc_code_old"], "new_val": save_res["doc_code_new"]},
                    {"field": "edition", "field_label": "Lần ban hành", "old_val": f"Lần {save_res['edition_old']}", "new_val": f"Lần {save_res['edition_new']}"},
                    {"field": "issue_date", "field_label": "Ngày ban hành", "old_val": save_res.get("issue_date_old") or "Chưa có", "new_val": save_res.get("issue_date_new")},
                    {"field": "file", "field_label": "Tài liệu hiện hành", "old_val": save_res["source_filename"], "new_val": save_res["official_filename"]},
                    {"field": "location", "field_label": "Vị trí lưu", "old_val": saved_loc, "new_val": saved_loc}
                ]
            }
        )
        db.commit()
        db.refresh(record)

        return {
            "success": True,
            "message": f"Đã lưu chính thức phiên bản mới: {save_res['official_filename']}",
            "file": save_res,
            "record": {
                "id": record.id,
                "document_name": record.document_name,
                "suggested_doc_code": record.suggested_doc_code,
                "edition": record.edition,
                "issue_date": record.issue_date,
                "source_link": record.source_link,
                "last_modified_date": record.last_modified_date
            }
        }
    except Exception as e:
        print(f"[SaveConvertedDoc] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu phiên bản mới: {str(e)}")


@router.get("/{record_id}/compare-pages")
def get_compare_pages(
    record_id: int,
    source_path: str = Query(...),
    draft_path: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    [GET] Trích xuất danh sách các trang PDF dưới dạng ảnh cho popup So sánh Before / After
    để hỗ trợ Synchronized Scroll chính xác hai chiều không bị lỗi plugin iframe.
    """
    record = None
    if record_id > 0:
        record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()

    before_pages = get_document_page_images(source_path, dpi=130)
    after_pages = get_document_page_images(draft_path, dpi=130)

    return {
        "success": True,
        "record_id": record_id,
        "before_pages": before_pages,
        "after_pages": after_pages,
        "total_before": len(before_pages),
        "total_after": len(after_pages)
    }


@router.post("/save-direct-word-content")
def save_direct_word_content_standalone(
    payload: dict = Body(...),
    record_id: Optional[int] = Query(None),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Lưu trực tiếp nội dung sửa đổi từ Direct Word Editor vào DOCX file.
    Hỗ trợ cả trường hợp chưa có record_id (tạo hồ sơ mới) hoặc có record_id.
    """
    draft_path = payload.get("draft_path") or payload.get("doc_path")
    html_content = payload.get("html_content") or payload.get("html")
    if not draft_path or not html_content:
        raise HTTPException(status_code=400, detail="Thiếu draft_path hoặc html_content")

    act_name, act_dept = get_actor_info(request, payload, db)
    record = None
    if record_id:
        record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()

    try:
        res = save_direct_edited_word_content(
            draft_rel_path=draft_path,
            html_content=html_content,
            record=record
        )
        if record:
            doc_fn = os.path.basename(draft_path)
            log_master_record_action(
                db=db,
                record_id=record.id,
                action_type="EDIT_WORD_DOC",
                action_label="Chỉnh sửa tài liệu Word",
                actor_name=act_name,
                actor_dept=act_dept,
                target_name=doc_fn,
                details={"event": "EVENT_EDIT_WORD", "doc_path": draft_path}
            )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu tài liệu Word: {str(e)}")


@router.post("/{record_id}/save-direct-word-content")
def save_direct_word_content_endpoint(
    record_id: int,
    payload: dict = Body(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Lưu trực tiếp nội dung sửa đổi từ Direct Word Editor vào working DOCX file.
    - Cập nhật text, headings và cell bảng vào DOCX.
    - Regenerate PDF preview và cache.
    - Refresh TOC/headings.
    - Cập nhật modified time.
    - Ghi audit log.
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ Master Record")

    draft_path = payload.get("draft_path") or payload.get("doc_path")
    html_content = payload.get("html_content") or payload.get("html")
    if not draft_path or not html_content:
        raise HTTPException(status_code=400, detail="Thiếu draft_path hoặc html_content")

    act_name, act_dept = get_actor_info(request, payload, db)

    try:
        res = save_direct_edited_word_content(
            draft_rel_path=draft_path,
            html_content=html_content,
            record=record
        )

        doc_fn = os.path.basename(draft_path)
        log_master_record_action(
            db=db,
            record_id=record_id,
            action_type="EDIT_WORD_DOC",
            action_label="Chỉnh sửa tài liệu Word",
            actor_name=act_name,
            actor_dept=act_dept,
            target_name=doc_fn,
            details={
                "event": "EVENT_EDIT_WORD",
                "doc_path": draft_path,
                "doc_filename": doc_fn,
                "status": "ĐÃ_CẬP_NHẬT_NỘI_DUNG",
                "status_label": "Đã lưu trực tiếp nội dung sửa đổi vào tệp Word"
            }
        )
        db.commit()
        db.refresh(record)

        return res
    except Exception as e:
        print(f"[SaveDirectWord] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu chỉnh sửa Word: {str(e)}")


@router.post("/{record_id}/update-file-usage")
def update_file_usage_endpoint(
    record_id: int,
    payload: dict = Body(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Cập nhật trạng thái sử dụng của tệp (IN_USE / NOT_IN_USE) qua menu ba chấm.
    - Độc lập với conversion, không xóa file vật lý.
    - Nếu đánh dấu IN_USE: tự động đặt các file khác trong cùng document_family_id thành NOT_IN_USE.
    - Ghi nhận vào audit log.
    - Trả về danh sách file và Word docs mới nhất.
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ Master Record")

    rel_path = payload.get("relative_path") or payload.get("file_path") or payload.get("raw_path")
    new_usage = payload.get("usage_status")
    if not rel_path or new_usage not in ["IN_USE", "NOT_IN_USE"]:
        raise HTTPException(status_code=400, detail="Thiếu relative_path hoặc usage_status (chỉ chấp nhận 'IN_USE' hoặc 'NOT_IN_USE')")

    act_name, act_dept = get_actor_info(request, payload, db)

    try:
        updated_item = update_file_usage_status(
            record_id=record_id,
            rel_path=rel_path,
            new_usage=new_usage,
            record=record
        )

        fn = os.path.basename(rel_path)
        action_lbl = f"Đánh dấu file: {updated_item.get('usage_status_label')}"
        log_master_record_action(
            db=db,
            record_id=record_id,
            action_type="UPDATE_FILE_USAGE",
            action_label=action_lbl,
            actor_name=act_name,
            actor_dept=act_dept,
            target_name=fn,
            details={
                "file_path": rel_path,
                "file_name": fn,
                "document_family_id": updated_item.get("document_family_id"),
                "usage_status": new_usage,
                "usage_status_label": updated_item.get("usage_status_label")
            }
        )
        db.commit()

        # Trả về dữ liệu cập nhật
        mg_val = (record.management_group or "").strip()
        code_val = (record.suggested_doc_code or "").strip()
        if mg_val:
            sibling_records = db.query(ISOMasterRecord).filter(
                ISOMasterRecord.management_group.ilike(mg_val)
            ).order_by(ISOMasterRecord.id).all()
        elif code_val:
            sibling_records = db.query(ISOMasterRecord).filter(
                ISOMasterRecord.suggested_doc_code.ilike(code_val)
            ).order_by(ISOMasterRecord.id).all()
        else:
            sibling_records = [record]

        files_info = get_record_files_and_word_docs(record, sibling_records=sibling_records)
        return {
            "success": True,
            "message": f"Đã cập nhật trạng thái sử dụng '{updated_item.get('usage_status_label')}' cho tệp {fn}",
            "updated_file": updated_item,
            **files_info
        }
    except Exception as e:
        print(f"[UpdateFileUsage] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật trạng thái sử dụng tệp: {str(e)}")


@router.post("/{record_id}/update-metadata")
def update_record_metadata_endpoint(
    record_id: int,
    payload: dict = Body(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Đồng bộ metadata hai chiều thống nhất giữa DB và tài liệu Word:
    - doc_code (Mã hiệu)
    - edition (Lần ban hành)
    - issue_date (Ngày ban hành)
    - department_in_charge (Phòng ban / Bộ phận thực hiện)
    - document_name (Tên tài liệu)
    Cập nhật đồng thời: DB, Word Cover, Word Footer, Bảng theo dõi sửa đổi, Preview cache.
    Nếu DOCX thất bại -> báo lỗi, không cập nhật DB.
    """
    act_name, act_dept = get_actor_info(request, payload, db)
    try:
        res = update_document_metadata(
            db=db,
            record_id=record_id,
            metadata=payload,
            actor_name=act_name,
            actor_dept=act_dept
        )
        return res
    except Exception as e:
        print(f"[UpdateMetadataEndpoint] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{record_id}")
def get_master_record(record_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết một bản ghi Master List theo ID (đặt ở cuối cùng để không chặn các endpoint tĩnh).
    """
    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")
    return record


