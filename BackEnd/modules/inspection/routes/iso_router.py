import os
import re
import uuid
import datetime
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, defer, joinedload, selectinload
from sqlalchemy import func
from config.database import get_db
from modules.inspection.models.iso_models import ISODocument, ISORevisionLog, ISOSection, ISOProcessStep, ISOProcess, ISOProcessSection, ISOProcessStepInstance, ISODocumentType
from modules.inspection.services.iso_parser import parse_iso_docx

from config.settings import get_upload_dir

router = APIRouter()

# Đảm bảo thư mục lưu trữ file upload tồn tại chuẩn
UPLOAD_DIR = get_upload_dir("iso_documents")

@router.post("/upload-attachment")
async def upload_attachment(
    file: UploadFile = File(...)
):
    """
    [POST] Tải lên tài liệu đính kèm (PDF, doc, docx) liên quan đến quy trình.
    """
    filename_lower = file.filename.lower()
    allowed_exts = (
        ".docx", ".doc", ".pdf", ".xlsx", ".xls", ".ppt", ".pptx",
        ".png", ".jpg", ".jpeg", ".webp", ".svg", ".csv", ".txt", ".zip", ".rar", ".7z"
    )
    if not any(filename_lower.endswith(ext) for ext in allowed_exts):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file Word, Excel, PDF, PPT, Ảnh hoặc File nén")

    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        relative_path = f"static/uploads/iso_documents/{unique_filename}"
        return {
            "file_name": file.filename,
            "original_file_name": file.filename,
            "file_path": relative_path,
            "file_size": len(content),
            "file_type": file_ext.lstrip(".").lower()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu file đính kèm: {str(e)}")


@router.post("/upload-multiple-attachments")
async def upload_multiple_attachments(
    files: List[UploadFile] = File(...)
):
    """
    [POST] Tải lên đồng thời nhiều file con đính kèm (Word, Excel, PDF, PPT, Ảnh, File nén...)
    """
    uploaded_results = []
    allowed_exts = (
        ".docx", ".doc", ".pdf", ".xlsx", ".xls", ".ppt", ".pptx",
        ".png", ".jpg", ".jpeg", ".webp", ".svg", ".csv", ".txt", ".zip", ".rar", ".7z"
    )

    for file in files:
        if not file.filename:
            continue
        filename_lower = file.filename.lower()
        if not any(filename_lower.endswith(ext) for ext in allowed_exts):
            continue

        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        try:
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            relative_path = f"static/uploads/iso_documents/{unique_filename}"
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            uploaded_results.append({
                "id": f"child_{uuid.uuid4().hex[:8]}",
                "file_name": file.filename,
                "original_file_name": file.filename,
                "file_path": relative_path,
                "file_size": len(content),
                "file_type": file_ext.lstrip(".").lower(),
                "uploaded_at": now_str
            })
        except Exception as e:
            print(f"Lỗi khi lưu file con {file.filename}: {e}")

    return {
        "success": True,
        "files": uploaded_results
    }


@router.post("/upload")
async def upload_iso_document(
    file: UploadFile = File(...),
    apply_iso_template: bool = Form(False),
    db: Session = Depends(get_db)
):
    """
    [POST] Tải lên file .docx tài liệu ISO và phân tích trích xuất dữ liệu thô.
    """
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".docx") or filename_lower.endswith(".doc")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng file Word (.doc, .docx)")

    # Lưu file GỐC (bất biến - không chuẩn hóa/ghi đè)
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    work_path = file_path  # file dùng để phân tích (bản sao đã chuẩn hóa)

    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        from modules.inspection.services.iso_file_service import (
            standardize_iso_docx_document, ensure_docx_path
        )
        import docx
        import shutil

        # .doc -> .docx (Word COM) để phân tích; file gốc .doc vẫn giữ nguyên
        docx_source = ensure_docx_path(file_path)
        if not docx_source.lower().endswith(".docx"):
            raise HTTPException(status_code=400, detail="Không thể chuyển đổi tệp .doc sang .docx (cần cài Microsoft Word trên máy chủ).")

        # Chuẩn hóa chạy trên BẢN SAO, không đụng tới file gốc
        work_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_work.docx")
        shutil.copyfile(docx_source, work_path)
        try:
            std_doc = docx.Document(work_path)
            standardize_iso_docx_document(std_doc)
            std_doc.save(work_path)
        except Exception as e_std:
            print(f"[upload_iso_document] Warning standardize docx (bản sao): {e_std}")
            shutil.copyfile(docx_source, work_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu file: {str(e)}")

    # Phân tích file Word
    try:
        docx_filename = f"{os.path.splitext(unique_filename)[0]}.docx"
        docx_final_path = os.path.join(UPLOAD_DIR, docx_filename)
        shutil.copyfile(work_path, docx_final_path)
        rel_docx_path = f"static/uploads/iso_documents/{docx_filename}"
        rel_upload_path = f"static/uploads/iso_documents/{unique_filename}"

        parsed_data = parse_iso_docx(work_path, original_filename=file.filename or "")
        parsed_data["file_path"] = rel_docx_path
        parsed_data["docx_path"] = rel_docx_path
        parsed_data["raw_file_path"] = rel_upload_path
        parsed_data["original_file_path"] = rel_upload_path
        parsed_data["original_file_name"] = file.filename or ""
        parsed_data["abs_path"] = docx_final_path.replace("\\", "/")
        parsed_data["original_filename"] = file.filename or ""

        # Kiểm tra nếu code bị rỗng hoặc là UUID thì bóc tách từ tên tệp tin gốc
        from modules.inspection.services.iso_parser import is_uuid_str
        filename_clean = os.path.splitext(file.filename)[0].strip() if file.filename else ""
        if (not parsed_data.get("code") or is_uuid_str(parsed_data.get("code", ""))) and filename_clean:
            import re
            m_dual = re.match(r'^(G7\.[A-Za-z0-9._-]+)\s*[-_]\s*([A-Za-z0-9._-]+)\s*[-_]\s*(.*)$', filename_clean)
            if m_dual:
                parsed_data["new_code"] = m_dual.group(1).strip()
                parsed_data["code"] = m_dual.group(2).strip()
                if not parsed_data.get("name") or parsed_data.get("name").strip() == "":
                    parsed_data["name"] = m_dual.group(3).strip()
            else:
                m_single = re.match(r'^([A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*(?:\s*[-_]\s*[A-Za-z0-9]+)?)\s*[-_]\s*(.*)$', filename_clean)
                if m_single:
                    parsed_data["code"] = m_single.group(1).strip()
                    if not parsed_data.get("name") or parsed_data.get("name").strip() == "":
                        parsed_data["name"] = m_single.group(2).strip()
                elif re.match(r'^[A-Za-z0-9._-]+$', filename_clean):
                    parsed_data["code"] = filename_clean

        # Tự động trích xuất tên tài liệu nếu tên hiện tại bị generic hoặc rỗng
        generic_names = ['quy trình kiểm soát chất lượng mới', 'quy trình', '[tên quy trình]', 'tên quy trình', '[tên tài liệu]', 'tên tài liệu', 'theo dõi sửa đổi nội dung tài liệu', 'theo dõi sửa đổi', 'nhật ký sửa đổi', '']
        current_name = (parsed_data.get("name") or "").strip().lower()
        if (current_name in generic_names or any(g in current_name for g in ['sửa đổi nội dung', 'nhật ký sửa đổi'])) and file_path:
            extracted_title = ""
            try:
                import docx
                doc_obj = docx.Document(file_path)
                skip_phrases = ['THEO DÕI SỬA ĐỔI', 'NHẬT KÝ SỬA ĐỔI', 'LỊCH SỬ SỬA ĐỔI', 'TRANG BÌA', 'BẢN QUYỀN', 'HỌ TÊN', 'CHỨC VỤ', 'KÝ TÊN', 'ĐC:', 'ĐỊA CHỈ:']
                title_kw = ['MỤC TIÊU', 'QUY TRÌNH', 'QUY ĐỊNH', 'HƯỚNG DẪN', 'SỔ TAY', 'CHÍNH SÁCH', 'TIÊU CHUẨN', 'QUYẾT ĐỊNH', 'QUY CHẾ', 'SƠ ĐỒ', 'BIỂU MẪU', 'THÔNG BÁO', 'BÁO CÁO']
                
                # Check tables first
                for tbl in doc_obj.tables[:3]:
                    for r in tbl.rows:
                        for cl in r.cells:
                            ctext = cl.text.strip().replace('\n', ' ')
                            cupper = ctext.upper()
                            if 5 <= len(ctext) <= 200 and not any(k in cupper for k in skip_phrases) and cupper not in ['TRÁCH NHIỆM', 'CÔNG TY', 'CÔNG TY CỔ PHẦN VINA G7']:
                                if any(k in cupper for k in title_kw):
                                    extracted_title = ctext
                                    break
                        if extracted_title:
                            break
                    if extracted_title:
                        break

                if not extracted_title:
                    for p in doc_obj.paragraphs[:30]:
                        txt = p.text.strip()
                        if txt and 5 <= len(txt) <= 200:
                            txt_upper = txt.upper()
                            if any(k in txt_upper for k in skip_phrases) or txt_upper in ['TRÁCH NHIỆM', 'CÔNG TY', 'CÔNG TY CỔ PHẦN VINA G7']:
                                continue
                            if re.match(r'^(?:[I|V|X]+\.|\d+\.)\s+', txt):
                                continue
                            is_upper = (txt == txt_upper)
                            starts_with_kw = any(txt_upper.startswith(k) for k in title_kw)
                            if (is_upper or starts_with_kw) and any(k in txt_upper for k in title_kw):
                                extracted_title = txt
                                break
                            if not extracted_title and is_upper and not txt_upper.startswith("CÔNG TY"):
                                extracted_title = txt
            except Exception:
                pass

            if extracted_title:
                parsed_data["name"] = extracted_title
            elif filename_clean:
                clean_title = re.sub(r'^[A-Za-z0-9._-]+\s*[-_.]\s*', '', filename_clean).strip()
                parsed_data["name"] = clean_title or filename_clean

        # Phát hiện loại tài liệu (doc_type) tự động từ mã hoặc tiêu đề
        detected_doc_type = "QT"
        name_check = (parsed_data.get("name") or "").upper()
        code_check = (parsed_data.get("code") or "").upper()
        if "MỤC TIÊU" in name_check or ".MT" in code_check or code_check.startswith("MT"):
            detected_doc_type = "MT"
        elif "HƯỚNG DẪN" in name_check or ".HD" in code_check or code_check.startswith("HD"):
            detected_doc_type = "HD"
        elif "QUY ĐỊNH" in name_check or ".QD" in code_check or ".QĐ" in code_check or code_check.startswith("QD"):
            detected_doc_type = "QD"
        elif "CHÍNH SÁCH" in name_check or ".CS" in code_check or code_check.startswith("CS"):
            detected_doc_type = "CS"
        elif "SỔ TAY" in name_check or ".ST" in code_check or code_check.startswith("ST"):
            detected_doc_type = "ST"
        elif "QUY CHẾ" in name_check or ".QC" in code_check:
            detected_doc_type = "QC"
        elif "SƠ ĐỒ" in name_check or ".SD" in code_check:
            detected_doc_type = "SD"
        elif "BIỂU MẪU" in name_check or ".BM" in code_check or code_check.startswith("BM"):
            detected_doc_type = "BM"
        parsed_data["doc_type"] = detected_doc_type

        # Trích xuất toàn bộ nội dung HTML nguyên bản có cấu trúc kèm bảng biểu và hình ảnh
        try:
            from modules.inspection.services.iso_file_service import parse_docx_to_html_and_headings
            docx_html_data = parse_docx_to_html_and_headings(work_path, prepend_template=apply_iso_template)
            parsed_data["html_content"] = docx_html_data.get("html_content", "")
            parsed_data["headings"] = docx_html_data.get("headings", [])
        except Exception as e_html:
            print(f"[upload_iso_document] Warning parse html: {e_html}")

        # Render trung thực từ FILE GỐC: đúng khổ giấy, hướng trang, bảng, hình, lưu đồ
        try:
            from modules.inspection.services.iso_file_service import render_document_pages
            rendered = render_document_pages(file_path)
            parsed_data["faithful_pages"] = rendered.get("pages", [])
            parsed_data["page_count"] = rendered.get("page_count", 0)
            parsed_data["page_setup"] = [
                {
                    "page_number": p["page_number"],
                    "width_mm": p["width_mm"],
                    "height_mm": p["height_mm"],
                    "orientation": p["orientation"],
                } for p in rendered.get("pages", [])
            ]
        except Exception as e_render:
            print(f"[upload_iso_document] Warning render pages: {e_render}")

        return parsed_data
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích cú pháp tài liệu: {str(e)}")
    finally:
        if work_path != file_path and os.path.exists(work_path):
            try:
                os.remove(work_path)
            except OSError as e_rm:
                print(f"[upload_iso_document] Không xóa được file tạm: {e_rm}")



@router.post("/save")
def save_iso_document(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    [POST] Lưu hoặc Cập nhật tài liệu ISO từ dữ liệu form chỉnh sửa tùy ý.
    """
    doc_id = payload.get("id")
    code = payload.get("code")
    name = payload.get("name")
    
    if not code or not name:
        raise HTTPException(status_code=400, detail="Mã quy trình và Tên quy trình không được bỏ trống")

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Kiểm tra trùng mã code nếu tạo mới
    is_new_doc = (doc_id is None or doc_id == "" or doc_id == "new")
    if is_new_doc:
        existing = db.query(ISODocument).filter(ISODocument.code == code).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Mã quy trình '{code}' đã tồn tại trong hệ thống")
        
        doc = ISODocument(
            code=code,
            name=name,
            version=payload.get("version", "01"),
            issue_date=payload.get("issue_date", now_str[:10]),
            issuer=payload.get("issuer", ""),
            approver=payload.get("approver", ""),
            approver_bgd=payload.get("approver_bgd", ""),
            file_path=payload.get("file_path", ""),
            original_file_path=payload.get("original_file_path") or payload.get("raw_file_path") or payload.get("file_path", ""),
            original_file_name=payload.get("original_file_name", ""),
            status=payload.get("status", "Hiệu lực"),
            folder=payload.get("folder", ""),
            doc_type=payload.get("doc_type", ""),
            document_level=payload.get("document_level", ""),
            symbol=payload.get("symbol", ""),
            notes=payload.get("notes", ""),
            diagram_data=payload.get("diagram_data", ""),
            process_id=payload.get("process_id"),
            created_at=now_str,
            updated_at=now_str
        )
        db.add(doc)
        db.flush() # Để lấy doc.id
    else:
        doc = db.query(ISODocument).filter(ISODocument.id == int(doc_id)).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu quy trình")
        
        existing = db.query(ISODocument).filter(ISODocument.code == code, ISODocument.id != int(doc_id)).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Mã quy trình '{code}' đã tồn tại ở một tài liệu khác")
        
        # Cập nhật thông tin chung
        doc.code = code
        doc.name = name
        doc.version = payload.get("version", doc.version)
        doc.issue_date = payload.get("issue_date", doc.issue_date)
        doc.issuer = payload.get("issuer", doc.issuer)
        doc.approver = payload.get("approver", doc.approver)
        doc.approver_bgd = payload.get("approver_bgd", getattr(doc, "approver_bgd", ""))
        if payload.get("file_path"):
            doc.file_path = payload.get("file_path")
        if payload.get("original_file_path") or payload.get("raw_file_path"):
            doc.original_file_path = payload.get("original_file_path") or payload.get("raw_file_path")
        if payload.get("original_file_name"):
            doc.original_file_name = payload.get("original_file_name")
        if not doc.original_file_path and doc.file_path:
            doc.original_file_path = doc.file_path
        doc.status = payload.get("status", doc.status)
        doc.folder = payload.get("folder", doc.folder)
        doc.doc_type = payload.get("doc_type", doc.doc_type)
        doc.document_level = payload.get("document_level", doc.document_level)
        doc.symbol = payload.get("symbol", doc.symbol)
        doc.notes = payload.get("notes", doc.notes)
        doc.diagram_data = payload.get("diagram_data", doc.diagram_data)
        if "process_id" in payload:
            doc.process_id = payload.get("process_id")
        doc.updated_at = now_str

        # Xóa các chi tiết cũ để ghi đè cập nhật mới
        db.query(ISORevisionLog).filter(ISORevisionLog.document_id == doc.id).delete()
        db.query(ISOSection).filter(ISOSection.document_id == doc.id).delete()
        db.query(ISOProcessStep).filter(ISOProcessStep.document_id == doc.id).delete()

    # 1. Lưu nhật ký sửa đổi (Revision Logs)
    edit_note = payload.get("revision_note")
    edit_page_no = payload.get("revision_page_no") or payload.get("page_no") or "Toàn bộ"
    editor_name = payload.get("editor") or payload.get("owner") or "Hệ thống"
    now_date = now_str[:10]

    revision_logs = payload.get("revision_logs", [])
    if payload.get("append_revision") and edit_note:
        last_log = revision_logs[-1] if revision_logs else None
        is_exact_dup = (
            last_log and 
            last_log.get("rev_date") == now_date and 
            last_log.get("content") == edit_note and 
            last_log.get("page_no") == edit_page_no
        )
        if not is_exact_dup:
            revision_logs.append({
                "seq_no": len(revision_logs) + 1,
                "rev_date": now_date,
                "content": edit_note,
                "page_no": edit_page_no,
                "modifier": editor_name
            })
    elif not revision_logs:
        revision_logs = [{
            "seq_no": 1,
            "rev_date": now_date,
            "content": "Ban hành lần đầu",
            "page_no": "Toàn bộ",
            "modifier": editor_name
        }]

    for idx, log in enumerate(revision_logs):
        db_log = ISORevisionLog(
            document_id=doc.id,
            seq_no=idx + 1,
            rev_date=log.get("rev_date", ""),
            content=log.get("content", ""),
            page_no=log.get("page_no", ""),
            modifier=log.get("modifier", "")
        )
        db.add(db_log)

    # 2. Lưu các phần văn bản chính (Sections)
    sections = payload.get("sections", {})
    for sec_name, content in sections.items():
        db_sec = ISOSection(
            document_id=doc.id,
            section_name=sec_name,
            content_html=content
        )
        db.add(db_sec)

    # 3. Lưu danh sách bước quy trình (Steps)
    steps = payload.get("steps", [])
    for idx, step in enumerate(steps):
        checklist = step.get("checklist")
        checklist_str = json.dumps(checklist) if checklist is not None else step.get("checklist_json", "")
        
        transition = step.get("transition")
        transition_str = json.dumps(transition) if transition is not None else step.get("transition_json", "")

        db_step = ISOProcessStep(
            document_id=doc.id,
            step_number=step.get("step_number", idx + 1),
            name=step.get("name", ""),
            assignee_role=step.get("assignee_role", ""),
            instructions=step.get("instructions", ""),
            checklist_json=checklist_str,
            transition_json=transition_str,
            flow_node_id=step.get("flow_node_id", f"node_{idx+1}")
        )
        db.add(db_step)

    try:
        db.commit()
        return {
            "id": doc.id,
            "code": doc.code,
            "name": doc.name,
            "revision_logs": [
                {
                    "seq_no": idx + 1,
                    "rev_date": l.get("rev_date", ""),
                    "content": l.get("content", ""),
                    "page_no": l.get("page_no", ""),
                    "modifier": l.get("modifier", "")
                }
                for idx, l in enumerate(revision_logs)
            ],
            "message": "Đã lưu tài liệu quy trình ISO thành công!"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu DB: {str(e)}")


@router.get("/")
def get_iso_documents(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách hồ sơ tài liệu ISO chung.
    """
    docs = db.query(ISODocument).order_by(ISODocument.code).all()
    result = []
    for d in docs:
        result.append({
            "id": d.id,
            "code": d.code,
            "name": d.name,
            "version": d.version,
            "issue_date": d.issue_date,
            "issuer": d.issuer,
            "approver": d.approver,
            "approver_bgd": getattr(d, "approver_bgd", "") or "",
            "file_path": d.file_path,
            "status": d.status,
            "folder": d.folder,
            "doc_type": d.doc_type,
            "document_level": d.document_level,
            "symbol": d.symbol,
            "notes": d.notes,
            "process_id": d.process_id,
            "process_code": d.process.code if d.process else None,
            "process_name": d.process.name if d.process else None,
            "created_at": d.created_at,
            "updated_at": d.updated_at
        })
    return result


@router.get("/form-templates")
def get_iso_form_templates(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh mục tất cả Biểu mẫu / Hồ sơ từ database (iso_documents và iso_master_records)
    để người dùng lựa chọn trong lưu đồ và quy trình ISO.
    """
    docs = db.query(ISODocument).filter(
        ISODocument.code.isnot(None),
        ISODocument.code != ""
    ).order_by(ISODocument.code).all()

    templates = []
    seen_codes = set()

    for d in docs:
        c = (d.code or "").strip()
        if c and c not in seen_codes:
            seen_codes.add(c)
            templates.append({
                "id": d.id,
                "code": c,
                "name": (d.name or "").strip(),
                "doc_type": d.doc_type or "Biểu mẫu",
                "folder": d.folder or ""
            })

    try:
        from modules.inspection.models.iso_master_record_model import ISOMasterRecord
        mrs = db.query(ISOMasterRecord).filter(
            ISOMasterRecord.form_code.isnot(None),
            ISOMasterRecord.form_code != ""
        ).all()
        for mr in mrs:
            fc = (mr.form_code or "").strip()
            if fc and fc not in seen_codes:
                seen_codes.add(fc)
                templates.append({
                    "id": f"mr_{mr.id}",
                    "code": fc,
                    "name": (mr.document_name or "").strip(),
                    "doc_type": "Biểu mẫu gốc",
                    "folder": mr.department_in_charge or ""
                })
    except Exception as e:
        print(f"[get_iso_form_templates] Notice: {e}")

    return templates


@router.get("/{id}/details")
def get_iso_document_details(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết toàn bộ thông tin đã bóc tách/chỉnh sửa của một quy trình ISO.
    """
    doc = db.query(ISODocument).filter(ISODocument.id == id).first()
    if not doc:
        proc = db.query(ISOProcess).filter(ISOProcess.id == id).first()
        if proc:
            return {
                "id": proc.id,
                "code": proc.code or "",
                "name": proc.name or "",
                "version": proc.version or "01",
                "issue_date": str(proc.issue_date) if proc.issue_date else datetime.date.today().isoformat(),
                "file_path": proc.file_path or "",
                "status": proc.status or "Hiệu lực",
                "sections": {s.section_name: s.content_html for s in proc.sections} if proc.sections else {},
                "steps": []
            }
        return {
            "id": id,
            "code": "",
            "name": "",
            "version": "01",
            "issue_date": datetime.date.today().isoformat(),
            "status": "Hiệu lực",
            "document_level": "Cấp phòng",
            "file_path": "",
            "sections": {},
            "steps": [],
            "is_new": True
        }

    # Nhật ký sửa đổi
    revision_logs = [
        {
            "seq_no": l.seq_no,
            "rev_date": l.rev_date,
            "content": l.content,
            "page_no": l.page_no,
            "modifier": l.modifier
        }
        for l in sorted(doc.revision_logs, key=lambda x: x.seq_no)
    ]

    eff_version = doc.version or "01"
    if revision_logs:
        max_seq = max([l.get("seq_no") or 0 for l in revision_logs], default=0)
        cnt = max_seq if max_seq > 0 else len(revision_logs)
        if cnt > 0:
            eff_version = f"{cnt:02d}" if cnt < 10 else str(cnt)


    # Các phần văn bản
    sections = {}
    for s in doc.sections:
        sections[s.section_name] = s.content_html

    # Các bước quy trình
    steps = []
    for st in sorted(doc.steps, key=lambda x: x.step_number):
        checklist = []
        if st.checklist_json:
            try:
                checklist = json.loads(st.checklist_json)
            except:
                pass
        
        transition = {}
        if st.transition_json:
            try:
                transition = json.loads(st.transition_json)
            except:
                pass

        steps.append({
            "id": st.id,
            "step_number": st.step_number,
            "name": st.name,
            "assignee_role": st.assignee_role,
            "instructions": st.instructions,
            "checklist": checklist,
            "transition": transition,
            "flow_node_id": st.flow_node_id
        })

    return {
        "id": doc.id,
        "code": doc.code,
        "name": doc.name,
        "version": eff_version,
        "effective_version": eff_version,
        "issue_date": doc.issue_date,
        "issuer": doc.issuer,
        "approver": doc.approver,
        "approver_bgd": getattr(doc, "approver_bgd", "") or "",
        "file_path": doc.file_path,
        "status": doc.status,
        "folder": doc.folder,
        "doc_type": doc.doc_type,
        "document_level": doc.document_level,
        "symbol": doc.symbol,
        "notes": doc.notes,
        "diagram_data": doc.diagram_data,
        "revision_logs": revision_logs,
        "sections": sections,
        "steps": steps
    }


@router.delete("/{id}")
def delete_iso_document(id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa tài liệu quy trình ISO cùng toàn bộ các bảng con liên quan.
    """
    doc = db.query(ISODocument).filter(ISODocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu quy trình")

    # Tìm đường dẫn file vật lý thực tế trên đĩa (hỗ trợ cả chạy từ / hoặc /BackEnd)
    resolved_path = doc.file_path
    if resolved_path:
        if not os.path.exists(resolved_path):
            alt_path = os.path.join("BackEnd", resolved_path)
            if os.path.exists(alt_path):
                resolved_path = alt_path
            else:
                alt_path2 = os.path.join("..", resolved_path)
                if os.path.exists(alt_path2):
                    resolved_path = alt_path2

    # Xóa file vật lý nếu có
    if resolved_path and os.path.exists(resolved_path):
        try:
            os.remove(resolved_path)
        except:
            pass

    try:
        # Xóa toàn bộ các Quy trình thực tế (ISOProcess) kế thừa từ mẫu này
        processes = db.query(ISOProcess).filter(ISOProcess.iso_document_id == id).all()
        for proc in processes:
            db.delete(proc)

        # Xóa tài liệu quy trình mẫu (ISODocument)
        db.delete(doc)
        db.commit()
        return {"message": "Đã xóa tài liệu quy trình mẫu và toàn bộ dữ liệu liên quan thành công!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa tài liệu quy trình: {str(e)}")


# -----------------------------------------------------------------------------
# QUẢN LÝ QUY TRÌNH THỰC TẾ (ISO PROCESS INSTANCES) APIS
# -----------------------------------------------------------------------------

@router.get("/meta/departments")
def get_iso_meta_departments(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách phòng ban trực tiếp từ CSDL (bảng roles) phục vụ chọn khi tạo/sửa quy trình mới.
    Mã phòng ban (code) lấy trực tiếp từ database (r.code), không gán cứng.
    """
    from modules.auth.models.permissions import Permission
    from modules.auth.models.role import Role
    
    roles = db.query(Role).filter(Role.is_active == True).order_by(Role.id).all()
    result = []
    skip_roles = ["Quản Lý", "Tổ Trưởng"]
    for r in roles:
        if r.name in skip_roles:
            continue
        
        # 1. Mã phòng ban (code): Lấy trực tiếp từ cột code trong CSDL (quy ước BGD -> ISO)
        dept_code = (getattr(r, "code", None) or "").strip()
        if not dept_code:
            # Fallback nếu dòng cũ chưa điền cột code
            if r.description and len(r.description.strip()) <= 6 and r.description.strip().isupper():
                dept_code = r.description.strip()
            elif r.name and len(r.name.strip()) <= 6 and r.name.strip().isupper():
                dept_code = r.name.strip()
            else:
                dept_code = (r.name or "PB").strip()
        if dept_code.upper() in ("BGD", "BG"):
            dept_code = "ISO"

        # 2. Tên đầy đủ phòng ban (name)
        if r.description and len(r.description.strip()) > len(r.name.strip()):
            full_name = r.description.strip()
        elif r.name and len(r.name.strip()) > 4:
            full_name = r.name.strip()
        elif r.description and r.description.strip():
            full_name = r.description.strip()
        else:
            full_name = r.name.strip()

        result.append({
            "id": r.id,
            "name": full_name,
            "code": dept_code,
            "role_name": r.name
        })
    return result


@router.get("/approvers/department-heads")
def get_iso_department_heads(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách Người duyệt có Vị trí là Trưởng phòng (loại trừ Ban Giám Đốc).
    """
    from modules.auth.models.accounts import Account
    from modules.auth.models.permissions import Permission
    from modules.auth.models.permissions import Permission
    from modules.auth.models.role import Role
    from modules.auth.models.departments import Department
    
    roles_map = {r.id: r.name for r in db.query(Role).all()}
    depts_map = {d.id: d.name for d in db.query(Department).all()}
    
    tp_perms = db.query(Permission).filter(Permission.name.ilike("%Trưởng Phòng%")).all()
    tp_perm_ids = [p.id for p in tp_perms]
    
    query = db.query(Account).filter(
        (Account.permission_id.in_(tp_perm_ids)) |
        (Account.permission_level.ilike("%Trưởng Phòng%")) |
        (Account.department_id == 3060)
    )
    accounts = query.all()
    
    result = []
    for a in accounts:
        d_name = depts_map.get(a.department_id, "")
        r_name = roles_map.get(getattr(a, "role_id", None), "")
        
        # Loại trừ Ban Giám Đốc khỏi danh sách Trưởng phòng
        if d_name in ["Giám Đốc", "Ban Giám Đốc"] or r_name == "BGD":
            continue
            
        dept_display = d_name or r_name or "Trưởng phòng"
        display_name = f"{a.full_name} ({dept_display})" if a.full_name else a.username
            
        result.append({
            "id": a.id,
            "username": a.username,
            "full_name": a.full_name,
            "department_id": a.department_id,
            "department_name": d_name,
            "role_name": r_name,
            "display_name": display_name
        })
    return result


@router.get("/approvers/bgd")
def get_iso_bgd_approvers(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách Người phê duyệt thuộc Ban Giám Đốc (BGD) thực tế từ CSDL.
    """
    from sqlalchemy import text
    sql = text("""
        SELECT a.id, a.username, a.full_name, a.permission_level, 
               COALESCE(d.name, '') as dept_name, COALESCE(r.name, '') as role_name
        FROM accounts a
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN roles r ON d.role_id = r.id
        WHERE a.is_active = 1
          AND a.username != 'admin'
          AND (
              r.name = 'BGD' 
              OR d.name LIKE '%Giám Đốc%' 
              OR a.permission_level LIKE '%Giám Đốc%'
          )
        ORDER BY a.id ASC
    """)
    rows = db.execute(sql).fetchall()
    
    result = []
    for r in rows:
        fn = r.full_name or r.username
        pos = r.dept_name or "Ban Giám Đốc"
        result.append({
            "id": r.id,
            "username": r.username,
            "full_name": fn,
            "position": pos,
            "display_name": f"{fn} ({pos})"
        })
    return result


@router.get("/processes")
def get_iso_processes(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách các quy trình thực tế áp dụng. Có hỗ trợ lọc theo trạng thái (status).
    """
    query = (
        db.query(ISOProcess)
        .options(
            defer(ISOProcess.diagram_data),
            defer(ISOProcess.notes),
            joinedload(ISOProcess.iso_document),
            selectinload(ISOProcess.documents)
        )
    )
    if status:
        query = query.filter(ISOProcess.status.ilike(f"%{status.strip()}%"))
    procs = query.order_by(ISOProcess.new_code, ISOProcess.code).all()

    def _process_sort_key(p_obj):
        nc = (getattr(p_obj, "new_code", "") or getattr(p_obj, "code", "") or "").strip().upper()
        m = re.match(r"^G7\.([A-Z]+)\.([A-Z]+)(\d+)$", nc)
        if m:
            return (0, m.group(1), m.group(2), int(m.group(3)), p_obj.id or 0)
        return (1, nc, "", 999999, p_obj.id or 0)

    procs.sort(key=_process_sort_key)
    result = []
    for p in procs:
        result.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "department_id": p.department_id,
            "department_name": p.department_name,
            "file_path": p.file_path,
            "original_file_path": getattr(p, "original_file_path", "") or p.file_path or "",
            "original_file_name": getattr(p, "original_file_name", "") or "",
            "iso_document_id": p.iso_document_id,
            "iso_document_code": p.iso_document.code if p.iso_document else "---",
            "iso_document_name": p.iso_document.name if p.iso_document else "---",
            "documents_count": len(p.documents) if p.documents else 0,
            "documents": [
                {
                    "id": d.id,
                    "code": d.code,
                    "name": d.name,
                    "symbol": d.symbol,
                    "version": d.version,
                    "file_path": d.file_path,
                    "original_file_path": getattr(d, "original_file_path", "") or d.file_path or "",
                    "original_file_name": getattr(d, "original_file_name", "") or "",
                    "status": d.status
                }
                for d in (p.documents or [])
            ],
            "owner": p.owner,
            "editor": p.editor,
            "approver": p.approver,
            "approver_bgd": getattr(p, "approver_bgd", "") or "",
            "issue_date": p.issue_date,
            "last_checked_date": p.last_checked_date,
            "last_result": p.last_result,
            "status": p.status,
            "display_at": p.display_at,
            "notes": p.notes,
            "document_level": p.document_level or (p.iso_document.document_level if p.iso_document else "") or "Cấp phòng",
            "symbol": p.symbol,
            "role": p.role,
            "new_code": getattr(p, "new_code", "") or "",
            "doc_type_id": getattr(p, "doc_type_id", None),
            "doc_type_code": getattr(p, "doc_type_code", "") or "",
            "created_at": p.created_at,
            "updated_at": p.updated_at
        })
    return result


@router.post("/processes/save")
def save_iso_process(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    [POST] Lưu hoặc Cập nhật Quy trình thực tế. 
    1 Quy trình có nhiều Mẫu tài liệu. Có thể tải file Word (.docx) lên trực tiếp.
    """
    proc_id = payload.get("id")
    code = (payload.get("code") or "").strip()
    name = (payload.get("name") or "").strip()
    new_code = (payload.get("new_code") or "").strip()
    iso_doc_id = payload.get("iso_document_id")

    if not name:
        raise HTTPException(status_code=400, detail="Tên tài liệu / quy trình không được bỏ trống")

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Kiểm tra khuôn mẫu ISO gốc (nếu có chọn)
    iso_doc = None
    if iso_doc_id is not None and iso_doc_id != "":
        try:
            iso_doc = db.query(ISODocument).filter(ISODocument.id == int(iso_doc_id)).first()
        except:
            iso_doc = None

    is_new_proc = (proc_id is None or proc_id == "" or proc_id == "new")
    from modules.inspection.services.iso_file_service import get_department_acronym

    # Nếu client truyền mã G7 trong code mà chưa có new_code, đồng bộ sang new_code
    if (not new_code or new_code == "G7.xx.yy.zz") and code and code.strip().startswith("G7."):
        new_code = code.strip()

    old_code_matched_new = (code == new_code)

    # Chuẩn hóa định dạng new_code nếu có dạng G7.<dept>.<type><seq> (hoặc G7.<dept>.<type>.<seq>)
    if new_code and new_code != "G7.xx.yy.zz" and "xx" not in new_code.lower() and "yy" not in new_code.lower():
        m_nc = re.match(r"^G7\.([A-Za-z]+)\.([A-Za-z]+)\.?(\d+)$", new_code.strip())
        if m_nc:
            norm_dept = get_department_acronym(m_nc.group(1), db=db)
            norm_type = m_nc.group(2).upper()
            norm_seq = int(m_nc.group(3))
            new_code = f"G7.{norm_dept}.{norm_type}{norm_seq:02d}"

            # Khi thêm mới: nếu số thứ tự norm_seq đã tồn tại trong cùng (Phòng ban + Loại tài liệu) G7.{norm_dept}.{norm_type}*, tự động lấy số tiếp theo
            if is_new_proc:
                type_pat = re.compile(rf"^G7\.{re.escape(norm_dept)}\.{re.escape(norm_type)}(\d+)$", re.IGNORECASE)
                existing_type_codes = db.query(ISOProcess.new_code).filter(
                    ISOProcess.new_code.like(f"G7.{norm_dept}.{norm_type}%")
                ).all()
                used_type_seqs = set()
                for (ec,) in existing_type_codes:
                    if ec:
                        m_ec = type_pat.match(ec.strip())
                        if m_ec:
                            used_type_seqs.add(int(m_ec.group(1)))
                if norm_seq in used_type_seqs:
                    next_data = get_next_process_code(
                        department_code=norm_dept,
                        doc_type_code=norm_type,
                        exclude_id=None,
                        db=db
                    )
                    new_code = next_data["next_code"]

        dup_query = db.query(ISOProcess).filter(func.lower(ISOProcess.new_code) == func.lower(new_code))
        if not is_new_proc:
            dup_query = dup_query.filter(ISOProcess.id != int(proc_id))
        dup = dup_query.first()
        if dup:
            raise HTTPException(
                status_code=400,
                detail=f"Mã mới '{new_code}' đã tồn tại trong hệ thống (tại quy trình: '{dup.name}', ID: {dup.id}). Mã mới là khóa duy nhất (không trùng), vui lòng kiểm tra lại!"
            )
    else:
        # Nếu chưa có mã mới, tự động sinh mã mới duy nhất tăng dần theo phòng ban G7.<dept>.<type><seq>
        dept_id = payload.get("department_id")
        dept_name = payload.get("department_name") or ""
        if dept_id:
            from modules.auth.models.role import Role
            r_dept = db.query(Role).filter(Role.id == int(dept_id)).first()
            if r_dept:
                dept_name = r_dept.description or r_dept.name
        elif dept_name:
            from modules.auth.models.role import Role
            r_dept = db.query(Role).filter(
                (Role.description == dept_name) | (Role.name == dept_name) | (Role.code == dept_name)
            ).first()
            if r_dept:
                dept_id = r_dept.id
                dept_name = r_dept.description or r_dept.name

        dept_acr = get_department_acronym(dept_name, db=db)
        t_code = (payload.get("doc_type_code") or payload.get("symbol") or "QT").strip().upper()
        next_data = get_next_process_code(
            department_code=dept_acr,
            doc_type_code=t_code,
            exclude_id=int(proc_id) if not is_new_proc else None,
            db=db
        )
        new_code = next_data["next_code"]

    # 2. MÃ CŨ (code): ăn theo file hoặc form, nếu để trống hoặc trùng mã G7 cũ thì đồng bộ theo new_code
    if not code or old_code_matched_new:
        code = new_code

    if is_new_proc:
        dept_id = payload.get("department_id")
        dept_name = payload.get("department_name", "")
        if dept_id:
            from modules.auth.models.role import Role
            r_dept = db.query(Role).filter(Role.id == int(dept_id)).first()
            if r_dept:
                dept_name = r_dept.description or r_dept.name

        proc = ISOProcess(
            code=code,
            name=name,
            iso_document_id=int(iso_doc_id) if (iso_doc_id is not None and iso_doc_id != "") else None,
            department_id=dept_id,
            department_name=dept_name,
            file_path=(payload.get("file_path") or payload.get("docx_path") or "").replace("\\", "/"),
            original_file_path=(payload.get("original_file_path") or payload.get("raw_file_path") or payload.get("file_path") or payload.get("docx_path") or "").replace("\\", "/"),
            original_file_name=payload.get("original_file_name", ""),
            owner=payload.get("owner") or "Ngô Diễm My",
            editor=payload.get("editor") or "Ngô Diễm My",
            approver=payload.get("approver", ""),
            approver_bgd=payload.get("approver_bgd", ""),
            issue_date=payload.get("issue_date", now_str[:10]),
            last_checked_date=payload.get("last_checked_date"),
            last_result=payload.get("last_result", "Chưa đánh giá"),
            status=payload.get("status", "Dự thảo"),
            display_at=payload.get("display_at", ""),
            notes=payload.get("notes", ""),
            symbol=payload.get("symbol") or (iso_doc.symbol if iso_doc else "") or "",
            role=payload.get("role", ""),
            document_level=payload.get("document_level") or (iso_doc.document_level if iso_doc else "") or "Cấp phòng",
            diagram_data=payload.get("diagram_data", (iso_doc.diagram_data if iso_doc else "") or ""),
            inspection_guide_id=payload.get("inspection_guide_id"),
            new_code=new_code,
            doc_type_id=payload.get("doc_type_id"),
            doc_type_code=payload.get("doc_type_code", ""),
            created_at=now_str,
            updated_at=now_str
        )
        db.add(proc)
        db.flush() # Lấy proc.id

        if proc.inspection_guide_id:
            from modules.inspection_guide.models.inspection_guide import InspectionGuide
            guide_record = db.query(InspectionGuide).filter(InspectionGuide.id == proc.inspection_guide_id).first()
            if guide_record:
                guide_record.process_id = proc.id
        
        # Clone sections mẫu từ ISODocument nếu payload không có sections nhưng có iso_doc
        sections = payload.get("sections")
        if (sections is None or len(sections) == 0) and iso_doc:
            for sec in iso_doc.sections:
                if sec.section_name.startswith("__") or (sec.content_html and sec.content_html.strip()):
                    db_sec = ISOProcessSection(
                        process_id=proc.id,
                        section_name=sec.section_name,
                        content_html=sec.content_html
                    )
                    db.add(db_sec)
    else:
        proc = db.query(ISOProcess).filter(ISOProcess.id == int(proc_id)).first()
        if not proc:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông tin quy trình thực tế")

        old_proc_new_code = (proc.new_code or "").strip()

        # Cập nhật thông tin chung (new_code đã được kiểm tra không trùng ở trên)
        if code == old_proc_new_code and new_code and new_code != old_proc_new_code:
            code = new_code
        proc.code = code
        proc.new_code = new_code
        proc.name = name
        if "iso_document_id" in payload:
            proc.iso_document_id = int(payload["iso_document_id"]) if payload["iso_document_id"] else None
        if "department_id" in payload:
            proc.department_id = payload.get("department_id")
        if "department_name" in payload:
            proc.department_name = payload.get("department_name")
        if "doc_type_id" in payload:
            proc.doc_type_id = payload.get("doc_type_id")
        if "doc_type_code" in payload:
            proc.doc_type_code = payload.get("doc_type_code")

        # Nếu new_code thay đổi, tự động đồng bộ tiền tố cho các biểu mẫu con thuộc quy trình này
        if old_proc_new_code and new_code and old_proc_new_code != new_code:
            child_docs = db.query(ISODocument).filter(ISODocument.process_id == proc.id).all()
            for cd in child_docs:
                if cd.code:
                    if cd.code.startswith(f"{old_proc_new_code}-"):
                        cd.code = f"{new_code}-{cd.code[len(old_proc_new_code) + 1:]}"
                    elif cd.code.startswith(f"{old_proc_new_code}_"):
                        cd.code = f"{new_code}_{cd.code[len(old_proc_new_code) + 1:]}"
        new_fp = payload.get("file_path") or payload.get("docx_path")
        if new_fp and str(new_fp).strip():
            proc.file_path = str(new_fp).strip().replace("\\", "/")
        new_orig_fp = payload.get("original_file_path") or payload.get("raw_file_path")
        if new_orig_fp and str(new_orig_fp).strip():
            proc.original_file_path = str(new_orig_fp).strip().replace("\\", "/")
        if "original_file_name" in payload and payload.get("original_file_name"):
            proc.original_file_name = payload.get("original_file_name")
        if not proc.original_file_path and proc.file_path:
            proc.original_file_path = proc.file_path
        proc.owner = payload.get("owner", proc.owner)
        proc.editor = payload.get("editor", proc.editor)
        proc.approver = payload.get("approver", proc.approver)
        proc.approver_bgd = payload.get("approver_bgd", getattr(proc, "approver_bgd", ""))
        proc.issue_date = payload.get("issue_date", proc.issue_date)
        proc.last_checked_date = payload.get("last_checked_date", proc.last_checked_date)
        proc.last_result = payload.get("last_result", proc.last_result)
        proc.status = payload.get("status", proc.status)
        proc.display_at = payload.get("display_at", proc.display_at)
        proc.notes = payload.get("notes", proc.notes)
        proc.document_level = payload.get("document_level", proc.document_level)
        proc.symbol = payload.get("symbol", proc.symbol)
        proc.role = payload.get("role", proc.role)
        proc.diagram_data = payload.get("diagram_data", proc.diagram_data)
        proc.updated_at = now_str

        if "inspection_guide_id" in payload:
            new_gid = payload.get("inspection_guide_id")
            if new_gid != proc.inspection_guide_id:
                from modules.inspection_guide.models.inspection_guide import InspectionGuide
                if proc.inspection_guide_id:
                    old_g = db.query(InspectionGuide).filter(InspectionGuide.id == proc.inspection_guide_id).first()
                    if old_g:
                        old_g.process_id = None
                proc.inspection_guide_id = new_gid
                if new_gid:
                    new_g = db.query(InspectionGuide).filter(InspectionGuide.id == new_gid).first()
                    if new_g:
                        new_g.process_id = proc.id

        # Xóa các chi tiết cũ của quy trình để ghi đè cập nhật mới
        payload_sections = payload.get("sections")
        if isinstance(payload_sections, dict) and not payload_sections.get("__canvas_editor_data__"):
            old_snapshot = db.query(ISOProcessSection).filter(
                ISOProcessSection.process_id == proc.id,
                ISOProcessSection.section_name == "__canvas_editor_data__"
            ).first()
            if old_snapshot and old_snapshot.content_html:
                payload_sections["__canvas_editor_data__"] = old_snapshot.content_html
        db.query(ISOProcessSection).filter(ISOProcessSection.process_id == proc.id).delete()
        db.query(ISOProcessStepInstance).filter(ISOProcessStepInstance.process_id == proc.id).delete()
        db.query(ISORevisionLog).filter(ISORevisionLog.process_id == proc.id).delete()

    # Nếu có truyền payload cập nhật sections chi tiết
    if payload.get("sections") is not None:
        sections = payload.get("sections", {})
        if isinstance(sections, dict):
            for sec_name, content in sections.items():
                if content and str(content).strip():
                    db_sec = ISOProcessSection(
                        process_id=proc.id,
                        section_name=sec_name,
                        content_html=str(content)
                    )
                    db.add(db_sec)
        elif isinstance(sections, list):
            for sec in sections:
                s_name = sec.get("section_name") or sec.get("name")
                s_content = sec.get("content_html") or sec.get("content")
                if s_name and s_content and str(s_content).strip():
                    db_sec = ISOProcessSection(
                        process_id=proc.id,
                        section_name=s_name,
                        content_html=str(s_content)
                    )
                    db.add(db_sec)

    # Nếu có truyền payload cập nhật steps chi tiết
    if payload.get("steps") is not None:
        steps = payload.get("steps", [])
        for idx, step in enumerate(steps):
            checklist = step.get("checklist")
            checklist_str = json.dumps(checklist) if checklist is not None else step.get("checklist_json", "")
            
            raw_trans = step.get("transition")
            if isinstance(raw_trans, dict):
                transition = dict(raw_trans)
            elif isinstance(raw_trans, str) and raw_trans:
                try:
                    transition = json.loads(raw_trans)
                except:
                    transition = {}
            else:
                transition = {}

            # Đảm bảo template_files và standard luôn được đóng gói vào transition_json
            if step.get("template_files"):
                transition["template_files"] = step.get("template_files")
            if step.get("standard"):
                transition["standard"] = step.get("standard")

            transition_str = json.dumps(transition) if transition else step.get("transition_json", "")

            db_step = ISOProcessStepInstance(
                process_id=proc.id,
                step_number=step.get("step_number", idx + 1),
                name=step.get("name", ""),
                assignee_role=step.get("assignee_role", ""),
                instructions=step.get("instructions", ""),
                checklist_json=checklist_str,
                transition_json=transition_str,
                flow_node_id=step.get("flow_node_id", f"node_{idx+1}")
            )
            db.add(db_step)

    # Ghi nhận nhật ký sửa đổi (Revision Logs) của quy trình
    revision_logs = payload.get("revision_logs", [])
    now_date = now_str[:10]  # YYYY-MM-DD
    editor_name = payload.get("editor") or payload.get("owner") or "Hệ thống"
    steps_list = payload.get("steps")
    steps_count = len(steps_list) if steps_list is not None else 0

    edit_note = payload.get("revision_note")
    edit_page_no = payload.get("revision_page_no") or payload.get("page_no") or "Toàn bộ"
    if not edit_note:
        if steps_count > 0:
            edit_note = f"Cập nhật lưu đồ và các bước quy trình ({steps_count} bước)"
        else:
            edit_note = "Cập nhật nội dung văn bản quy trình"

    # Nếu là cập nhật quy trình đã có
    if proc_id:
        if not revision_logs:
            # Ưu tiên giữ nguyên revision_logs hiện có của quy trình
            existing_proc_logs = db.query(ISORevisionLog).filter(ISORevisionLog.process_id == proc.id).order_by(ISORevisionLog.seq_no.asc()).all()
            if existing_proc_logs:
                revision_logs = [
                    {
                        "seq_no": l.seq_no,
                        "rev_date": l.rev_date,
                        "content": l.content,
                        "page_no": l.page_no or "Toàn bộ",
                        "modifier": l.modifier or "Hệ thống"
                    }
                    for l in existing_proc_logs
                ]
            elif iso_doc and iso_doc.revision_logs:
                revision_logs = [
                    {
                        "seq_no": l.seq_no,
                        "rev_date": l.rev_date,
                        "content": l.content,
                        "page_no": l.page_no or "Toàn bộ",
                        "modifier": l.modifier or "Hệ thống"
                    }
                    for l in sorted(iso_doc.revision_logs, key=lambda x: x.seq_no or 0)
                ]
            else:
                revision_logs = [{
                    "seq_no": 1,
                    "rev_date": proc.issue_date or now_date,
                    "content": "Ban hành lần đầu",
                    "page_no": "Toàn bộ",
                    "modifier": editor_name
                }]

        # Chỉ thêm dòng nhật ký nếu người dùng chủ động yêu cầu ban hành bản sửa đổi mới (append_revision)
        if payload.get("append_revision") and payload.get("revision_note"):
            next_seq = len(revision_logs) + 1
            revision_logs.append({
                "seq_no": next_seq,
                "rev_date": now_date,
                "content": payload.get("revision_note"),
                "page_no": edit_page_no,
                "modifier": editor_name
            })

    # Nếu là tạo mới và không truyền revision_logs, sao chép lịch sử từ mẫu gốc hoặc tạo dòng ban hành lần đầu
    elif not revision_logs:
        if iso_doc and iso_doc.revision_logs:
            revision_logs = [
                {
                    "seq_no": l.seq_no,
                    "rev_date": l.rev_date,
                    "content": l.content,
                    "page_no": l.page_no,
                    "modifier": l.modifier or "Hệ thống"
                }
                for l in sorted(iso_doc.revision_logs, key=lambda x: x.seq_no or 0)
            ]
        else:
            revision_logs = [{
                "seq_no": 1,
                "rev_date": now_date,
                "content": "Ban hành lần đầu",
                "page_no": "Toàn bộ",
                "modifier": editor_name
            }]

    # Lưu lại toàn bộ revision logs vào bảng
    for idx, log in enumerate(revision_logs):
        db_log = ISORevisionLog(
            process_id=proc.id,
            seq_no=idx + 1,
            rev_date=log.get("rev_date", ""),
            content=log.get("content", ""),
            page_no=log.get("page_no", ""),
            modifier=log.get("modifier", "")
        )
        db.add(db_log)

    # Đồng bộ danh sách tài liệu / biểu mẫu liên quan vào bảng iso_documents
    raw_templates = payload.get("related_templates")
    if raw_templates is None and payload.get("sections"):
        sec_templates = payload.get("sections", {}).get("__metadata_related_templates__")
        if sec_templates:
            try:
                raw_templates = json.loads(sec_templates)
            except:
                raw_templates = None

    if raw_templates is not None:
        kept_doc_ids = []
        for tpl in raw_templates:
            tpl_code = (tpl.get("code") or "").strip()
            tpl_title = (tpl.get("title") or tpl.get("name") or "").strip()
            tpl_file = tpl.get("file_path") or ""
            tpl_fname = tpl.get("original_file_name") or tpl.get("file_name") or ""
            tpl_note = tpl.get("note") or ""
            tpl_sub_files = tpl.get("sub_files") or []
            sub_files_json = json.dumps(tpl_sub_files, ensure_ascii=False) if tpl_sub_files else None
            doc_id = tpl.get("doc_id")

            # Chuẩn hóa mã biểu mẫu theo chuẩn G7.AA.BBCC-DDEE (dùng proc.new_code)
            if tpl_code:
                parent_prefix = proc.new_code or proc.code
                has_prefix = (
                    tpl_code.startswith(f"{parent_prefix}-") or
                    tpl_code.startswith(f"{parent_prefix}_")
                )
                if not has_prefix:
                    clean_code = tpl_code.lstrip("-_ ")
                    # Format as parent_prefix-BMxx if needed
                    if not clean_code.upper().startswith(("BM", "SD", "PL")):
                        clean_code = f"BM{clean_code}"
                    tpl_code = f"{parent_prefix}-{clean_code}"

            if not tpl_code:
                continue

            existing_doc = None
            if doc_id:
                try:
                    existing_doc = db.query(ISODocument).filter(ISODocument.id == int(doc_id)).first()
                except:
                    existing_doc = None

            if not existing_doc and tpl_code:
                existing_doc = db.query(ISODocument).filter(ISODocument.code == tpl_code).first()

            if existing_doc:
                existing_doc.code = tpl_code
                existing_doc.name = tpl_title or existing_doc.name
                existing_doc.process_id = proc.id
                existing_doc.file_path = tpl_file or existing_doc.file_path
                existing_doc.sub_files = sub_files_json
                if tpl_fname and not bool(re.match(r'^[0-9a-fA-F-]{32,38}(\.[a-zA-Z0-9]+)?$', tpl_fname)):
                    existing_doc.original_file_name = tpl_fname
                elif not existing_doc.original_file_name and tpl_title:
                    ext = os.path.splitext(existing_doc.file_path or tpl_file)[1]
                    existing_doc.original_file_name = f"{tpl_title}{ext}"
                existing_doc.notes = tpl_note
                existing_doc.folder = proc.department_name or proc.code
                existing_doc.document_level = proc.document_level or "Cấp phòng"
                existing_doc.issuer = proc.editor or proc.owner or existing_doc.issuer
                existing_doc.approver = proc.approver or existing_doc.approver
                existing_doc.approver_bgd = proc.approver_bgd or getattr(existing_doc, "approver_bgd", "")
                existing_doc.updated_at = now_str
                kept_doc_ids.append(existing_doc.id)
            else:
                ext = os.path.splitext(tpl_file)[1] if tpl_file else ""
                orig_name = tpl_fname
                if not orig_name or bool(re.match(r'^[0-9a-fA-F-]{32,38}(\.[a-zA-Z0-9]+)?$', orig_name)):
                    orig_name = f"{tpl_title}{ext}" if tpl_title else (tpl_fname or "")

                new_doc = ISODocument(
                    code=tpl_code,
                    name=tpl_title or f"Biểu mẫu {tpl_code}",
                    process_id=proc.id,
                    file_path=tpl_file,
                    original_file_name=orig_name,
                    sub_files=sub_files_json,
                    notes=tpl_note,
                    version="01",
                    issue_date=proc.issue_date or now_str[:10],
                    issuer=proc.editor or proc.owner or "Ngô Diễm My",
                    approver=proc.approver,
                    approver_bgd=proc.approver_bgd,
                    status="Hiệu lực",
                    folder=proc.department_name or proc.code,
                    doc_type="Biểu mẫu quy trình",
                    document_level=proc.document_level or "Cấp phòng",
                    symbol="BM",
                    created_at=now_str,
                    updated_at=now_str
                )
                db.add(new_doc)
                db.flush()
                kept_doc_ids.append(new_doc.id)

        # Xóa các mẫu tài liệu cũ thuộc quy trình này không còn trong danh sách giữ lại
        old_docs = db.query(ISODocument).filter(ISODocument.process_id == proc.id).all()
        for od in old_docs:
            if od.id not in kept_doc_ids:
                db.delete(od)

    try:
        db.commit()

        # Tự động đồng bộ Metadata (Mã mới, Tên quy trình, Ngày ban hành, Bộ phận, Biên soạn, Phê duyệt, Nhật ký sửa đổi)
        # và chuẩn hóa cấu trúc OpenXML cho file .docx hiện hành (file_path) để Xem trước và Xuất file khớp 100%
        try:
            if proc.file_path and proc.file_path.lower().endswith(".docx"):
                abs_fp = resolve_iso_file_path(proc.file_path)
                if abs_fp and os.path.exists(abs_fp):
                    import docx as _docx
                    from modules.inspection.services.iso_file_service import (
                        _has_iso_cover_table,
                        fill_metadata_into_template_docx,
                        repair_and_standardize_docx_structure,
                    )
                    doc_cur = _docx.Document(abs_fp)
                    eff_ver = f"{len(revision_logs):02d}" if revision_logs else "01"
                    eff_date = (revision_logs[-1].get("rev_date") if revision_logs and revision_logs[-1].get("rev_date") else proc.issue_date) or now_str[:10]
                    meta_sync = {
                        "doc_title": proc.name or "",
                        "doc_code": proc.new_code or proc.code or "",
                        "version": eff_ver,
                        "issue_date": eff_date,
                        "dept_name": proc.department_name or "",
                        "issuer_name": proc.editor or proc.owner or "Ngô Diễm My",
                        "approver_name": proc.approver or "",
                        "approver_bgd": getattr(proc, "approver_bgd", "") or "",
                        "document_level": proc.document_level or "Cấp phòng",
                        "revision_logs": [
                            {
                                "seq_no": idx + 1,
                                "rev_date": l.get("rev_date", ""),
                                "content": l.get("content", ""),
                                "page_no": l.get("page_no", "Toàn bộ"),
                                "modifier": l.get("modifier", ""),
                            }
                            for idx, l in enumerate(revision_logs)
                        ],
                    }
                    if _has_iso_cover_table(doc_cur):
                        fill_metadata_into_template_docx(doc_cur, meta_sync)
                    else:
                        repair_and_standardize_docx_structure(doc_cur, meta_sync)

                    orig_fp = getattr(proc, "original_file_path", "") or ""
                    if orig_fp and proc.file_path == orig_fp:
                        from config.settings import UPLOADS_DIR
                        iso_up_dir = os.path.join(UPLOADS_DIR, "iso_documents")
                        os.makedirs(iso_up_dir, exist_ok=True)
                        new_uuid_fn = f"{uuid.uuid4()}.docx"
                        abs_fp = os.path.join(iso_up_dir, new_uuid_fn)
                        proc.file_path = f"static/uploads/iso_documents/{new_uuid_fn}"
                        db.commit()

                    doc_cur.save(abs_fp)
        except Exception as e_sync_doc:
            print(f"[save_iso_process] Warning sync docx metadata: {e_sync_doc}")

        return {
            "id": proc.id,
            "code": proc.code,
            "name": proc.name,
            "file_path": proc.file_path,
            "original_file_path": getattr(proc, "original_file_path", "") or proc.file_path or "",
            "original_file_name": getattr(proc, "original_file_name", "") or "",
            "revision_logs": [
                {
                    "seq_no": idx + 1,
                    "rev_date": l.get("rev_date", ""),
                    "content": l.get("content", ""),
                    "page_no": l.get("page_no", ""),
                    "modifier": l.get("modifier", "")
                }
                for idx, l in enumerate(revision_logs)
            ],
            "message": "Đã lưu quy trình thực tế thành công!"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu quy trình thực tế: {str(e)}")


def resolve_iso_file_path(file_path: str) -> Optional[str]:
    if not file_path:
        return None
    if os.path.exists(file_path):
        return file_path
    from modules.inspection.services.iso_file_service import BASE_ISO_DIR
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    clean_rel = file_path.lstrip("/\\")
    candidates = [
        os.path.join(backend_root, clean_rel),
        os.path.join(BASE_ISO_DIR, file_path),
        os.path.join(BASE_ISO_DIR, clean_rel),
        os.path.join("BackEnd", clean_rel),
        os.path.join("..", clean_rel),
        os.path.join(os.getcwd(), clean_rel)
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


@router.get("/processes/{id}/details")
def get_iso_process_details(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết quy trình thực tế cùng sơ đồ và checklist riêng biệt.
    """
    proc = db.query(ISOProcess).filter(ISOProcess.id == id).first()
    if not proc:
        doc = db.query(ISODocument).filter(ISODocument.id == id).first()
        if doc:
            return {
                "id": doc.id,
                "code": doc.code or "",
                "new_code": getattr(doc, "new_code", "") or "",
                "name": doc.name or "",
                "version": doc.version or "01",
                "issue_date": str(doc.issue_date) if doc.issue_date else datetime.date.today().isoformat(),
                "file_path": doc.file_path or "",
                "status": doc.status or "Hiệu lực",
                "folder": doc.folder or "",
                "doc_type": doc.doc_type or "",
                "document_level": doc.document_level or "Cấp phòng",
                "sections": {s.section_name: s.content_html for s in doc.sections} if doc.sections else {},
                "steps": []
            }
        return {
            "id": id,
            "code": "",
            "new_code": "",
            "name": "",
            "version": "01",
            "issue_date": datetime.date.today().isoformat(),
            "status": "Hiệu lực",
            "document_level": "Cấp phòng",
            "file_path": "",
            "sections": {},
            "steps": [],
            "is_new": True
        }

    # Tự động đồng bộ nội dung ăn theo file nếu quy trình chưa có nội dung thực tế hoặc chưa có các bước hoặc chưa có định dạng rich HTML
    has_real_sections = False
    has_rich_sections = False
    if proc.sections:
        for s in proc.sections:
            cnt = (s.content_html or "").strip()
            if cnt and "Chuẩn bị sẵn sàng" not in cnt:
                has_real_sections = True
            if "iso-subheading" in cnt or "iso-lead-item" in cnt or "iso-content-table" in cnt:
                has_rich_sections = True

    has_real_steps = bool(proc.steps and len(proc.steps) > 0)

    if (not has_real_sections or not has_rich_sections or not has_real_steps) and proc.file_path:
        resolved_file = resolve_iso_file_path(proc.file_path)
        if resolved_file and os.path.exists(resolved_file):
            try:
                from modules.inspection.services.iso_parser import parse_iso_docx
                parsed = parse_iso_docx(resolved_file) if resolved_file.lower().endswith(('.docx', '.doc')) else {}
                parsed_secs = parsed.get("sections", {})
                parsed_steps = parsed.get("steps", [])
                if (not has_real_sections or not has_rich_sections) and parsed_secs:
                    db.query(ISOProcessSection).filter(ISOProcessSection.process_id == proc.id).delete()
                    for s_name, s_html in parsed_secs.items():
                        db.add(ISOProcessSection(process_id=proc.id, section_name=s_name, content_html=s_html))
                if not has_real_steps and parsed_steps:
                    db.query(ISOProcessStepInstance).filter(ISOProcessStepInstance.process_id == proc.id).delete()
                    for st in parsed_steps:
                        st_num = st.get("step_number", 1)
                        st_trans = st.get("transition") or {}
                        if not isinstance(st_trans, dict):
                            st_trans = {}
                        if st.get("template_files"):
                            st_trans["template_files"] = st.get("template_files")
                        if st.get("standard"):
                            st_trans["standard"] = st.get("standard")
                        db.add(ISOProcessStepInstance(
                            process_id=proc.id,
                            step_number=st_num,
                            name=st.get("name", ""),
                            assignee_role=st.get("assignee_role", ""),
                            instructions=st.get("instructions", ""),
                            checklist_json=json.dumps(st.get("checklist", [])) if st.get("checklist") else "",
                            transition_json=json.dumps(st_trans) if st_trans else "",
                            flow_node_id=f"node_{st_num}"
                        ))
                    if parsed.get("diagram_data") and (not proc.diagram_data or proc.diagram_data in ('{"nodes":[],"links":[]}', '')):
                        proc.diagram_data = parsed.get("diagram_data")
                db.commit()
                db.refresh(proc)
            except Exception as e:
                db.rollback()
                print(f"Lỗi tự động parse file cho quy trình {proc.id}: {e}")

    # Nhật ký sửa đổi
    revision_logs = []
    logs_to_use = proc.revision_logs if proc.revision_logs else (proc.iso_document.revision_logs if proc.iso_document else [])
    for l in sorted(logs_to_use, key=lambda x: x.seq_no or 0):
        p_no = str(l.page_no or "Toàn bộ").strip()
        if p_no.lower() in ("tất cả", "tat ca", "all", ""):
            p_no = "Toàn bộ"
        revision_logs.append({
            "seq_no": l.seq_no,
            "rev_date": l.rev_date,
            "content": l.content,
            "page_no": p_no,
            "modifier": l.modifier or "Hệ thống"
        })

    if not revision_logs:
        from modules.inspection.services.iso_file_service import generate_standard_revision_logs
        code_key = proc.code or proc.new_code or proc.name or proc.id
        revision_logs = generate_standard_revision_logs(code_key)

    eff_version = "01"
    latest_rev_date = proc.issue_date
    if revision_logs:
        max_seq = max([l.get("seq_no") or 0 for l in revision_logs], default=0)
        cnt = max_seq if max_seq > 0 else len(revision_logs)
        if cnt > 0:
            eff_version = f"{cnt:02d}" if cnt < 10 else str(cnt)
        for l in reversed(revision_logs):
            d = str(l.get("rev_date") or "").strip()
            if d:
                latest_rev_date = d
                break
    elif proc.iso_document and proc.iso_document.version:
        eff_version = proc.iso_document.version

    # Các phần văn bản
    sections = {}
    for s in proc.sections:
        if s.section_name.startswith("__") or (s.content_html and s.content_html.strip()):
            sections[s.section_name] = s.content_html

    # Các phần văn bản của mẫu gốc để làm gợi ý (hints)
    template_sections = {}
    if proc.iso_document:
        for s in proc.iso_document.sections:
            template_sections[s.section_name] = s.content_html

    # Các bước quy trình thực tế
    steps = []
    steps_db = sorted(proc.steps, key=lambda x: x.step_number) if proc.steps else []
    if not steps_db and proc.iso_document and proc.iso_document.steps:
        steps_db = sorted(proc.iso_document.steps, key=lambda x: x.step_number)
    
    for st in steps_db:
        checklist = []
        if st.checklist_json:
            try:
                checklist = json.loads(st.checklist_json)
            except:
                pass
        
        transition = {}
        if st.transition_json:
            try:
                transition = json.loads(st.transition_json)
            except:
                pass

        node_type = transition.get("node_type") if isinstance(transition, dict) else (st.node_type if hasattr(st, 'node_type') else None)
        fail_path = transition.get("fail_path") if isinstance(transition, dict) else (st.fail_path if hasattr(st, 'fail_path') else [])
        template_files = transition.get("template_files") if isinstance(transition, dict) else ""
        standard = transition.get("standard") if isinstance(transition, dict) else ""

        steps.append({
            "id": st.id,
            "step_number": st.step_number,
            "name": st.name,
            "assignee_role": st.assignee_role,
            "instructions": st.instructions,
            "checklist": checklist,
            "transition": transition,
            "node_type": node_type,
            "fail_path": fail_path,
            "flow_node_id": st.flow_node_id,
            "template_files": template_files or "",
            "standard": standard or ""
        })

    # Danh sách mẫu biểu mẫu liên quan (ISODocument con) thuộc quy trình này
    related_templates = []
    for doc in (proc.documents or []):
        ext = os.path.splitext(doc.file_path)[1] if doc.file_path else ""
        raw_fname = doc.original_file_name or (os.path.basename(doc.file_path) if doc.file_path else "")
        # Nếu tên file là mã UUID ngẫu nhiên (ví dụ 9573ec7f-17eb-4f5d-bc0b-5d9d806bb89e.ppt), lấy theo tên thật doc.name + ext
        is_uuid = bool(re.match(r'^[0-9a-fA-F-]{32,38}(\.[a-zA-Z0-9]+)?$', raw_fname or ""))
        if (is_uuid or not raw_fname) and doc.name:
            fname = f"{doc.name}{ext}" if not doc.name.lower().endswith(ext.lower()) else doc.name
        else:
            fname = raw_fname

        # Đảm bảo có đầy đủ tiền tố mã biểu mẫu nếu tên file chưa có
        doc_code = (doc.code or "").strip()
        if doc_code and fname and not fname.upper().startswith(doc_code.upper()):
            display_file_name = f"{doc_code} - {fname}"
        else:
            display_file_name = fname or (f"{doc_code}{ext}" if doc_code else "tai_lieu_dinh_kem")

        # Trích xuất danh sách file con đính kèm (nếu có)
        doc_sub_files = []
        if getattr(doc, "sub_files", None):
            try:
                doc_sub_files = json.loads(doc.sub_files) if isinstance(doc.sub_files, str) else doc.sub_files
            except Exception:
                doc_sub_files = []

        related_templates.append({
            "id": f"doc_{doc.id}",
            "doc_id": doc.id,
            "code": doc.code,
            "title": doc.name,
            "scope": "Tất cả",
            "note": doc.notes or "",
            "file_name": display_file_name,
            "original_file_name": doc.original_file_name or display_file_name,
            "file_path": doc.file_path or "",
            "sub_files": doc_sub_files or []
        })

    if not related_templates and sections.get("__metadata_related_templates__"):
        try:
            sec_tpls = json.loads(sections.get("__metadata_related_templates__"))
            if isinstance(sec_tpls, list):
                for tpl in sec_tpls:
                    raw_fn = tpl.get("original_file_name") or tpl.get("file_name") or ""
                    fp = tpl.get("file_path") or ""
                    ext = os.path.splitext(fp)[1] if fp else ""
                    is_uuid = bool(re.match(r'^[0-9a-fA-F-]{32,38}(\.[a-zA-Z0-9]+)?$', raw_fn or ""))
                    if (is_uuid or not raw_fn) and (tpl.get("title") or tpl.get("name")):
                        title_fn = tpl.get("title") or tpl.get("name")
                        raw_fn = f"{title_fn}{ext}" if not title_fn.lower().endswith(ext.lower()) else title_fn
                    doc_c = (tpl.get("code") or "").strip()
                    if doc_c and raw_fn and not raw_fn.upper().startswith(doc_c.upper()):
                        raw_fn = f"{doc_c} - {raw_fn}"
                    tpl["file_name"] = raw_fn
                    tpl["original_file_name"] = tpl.get("original_file_name") or raw_fn
                    tpl["sub_files"] = tpl.get("sub_files") or []
                related_templates = sec_tpls
        except:
            pass

    # Đồng bộ cả vào sections để tương thích hoàn toàn với tất cả frontend client
    if related_templates:
        sections["__metadata_related_templates__"] = json.dumps(related_templates, ensure_ascii=False)

    # Xác định tài liệu có Lưu đồ hay không (Tuyệt đối không gán cứng)
    doc_code_check = (proc.code or proc.new_code or "").upper()
    doc_name_check = (proc.name or "").lower()
    doc_type_code_check = (proc.doc_type_code or "").upper()
    
    is_policy = (
        "CS" in doc_type_code_check or
        "CS" in doc_code_check or
        doc_name_check.startswith("chính sách") or
        "quy chế" in doc_name_check
    )
    
    real_steps = [s for s in steps if s.get("name") and len(s.get("name", "").strip()) > 1 and s.get("name", "").strip() != ":"]
    has_flowchart = False
    if not is_policy:
        if len(real_steps) >= 2:
            has_flowchart = True
        elif proc.diagram_data and len(proc.diagram_data.strip()) > 10:
            has_flowchart = True

    # Nếu không có lưu đồ, đảm bảo steps trả về rỗng
    if not has_flowchart:
        steps = []

    cover_info = {
        "company_name": "CÔNG TY CỔ PHẦN VINA G7",
        "name": proc.name,
        "code": proc.code or proc.new_code or "",
        "version": eff_version,
        "issue_date": proc.issue_date or "",
        "department_name": proc.department_name or "",
        "editor": proc.editor or proc.owner or "",
        "approver": proc.approver or "",
        "approver_bgd": getattr(proc, "approver_bgd", "") or ""
    }

    page_setup = {
        "width_mm": 210.0,
        "height_mm": 297.0,
        "orientation": "portrait",
        "margins_mm": [25.4, 25.4, 25.4, 25.4],
        "margins_px": [96, 96, 96, 96]
    }
    try:
        target_for_setup = proc.file_path or getattr(proc, "original_file_path", "")
        if target_for_setup:
            abs_setup_path = resolve_iso_file_path(target_for_setup)
            if abs_setup_path and os.path.exists(abs_setup_path):
                from modules.inspection.services.iso_file_service import extract_docx_page_setup, ensure_docx_path
                docx_setup_path = ensure_docx_path(abs_setup_path) if abs_setup_path.lower().endswith((".doc", ".docx")) else abs_setup_path
                if docx_setup_path and os.path.exists(docx_setup_path):
                    page_setup = extract_docx_page_setup(docx_setup_path)
    except Exception as e_setup:
        print(f"[get_iso_process_details] Warning page_setup: {e_setup}")

    return {
        "id": proc.id,
        "code": proc.code,
        "name": proc.name,
        "version": eff_version,
        "effective_version": eff_version,
        "file_path": proc.file_path,
        "original_file_path": getattr(proc, "original_file_path", "") or proc.file_path or "",
        "original_file_name": getattr(proc, "original_file_name", "") or (os.path.basename(proc.original_file_path) if getattr(proc, "original_file_path", None) else ""),
        "file_name": os.path.basename(proc.file_path) if proc.file_path else "",
        "page_setup": page_setup,
        "iso_document_id": proc.iso_document_id,
        "iso_document_code": proc.iso_document.code if proc.iso_document else "---",
        "iso_document_name": proc.iso_document.name if proc.iso_document else "---",
        "owner": proc.owner,
        "editor": proc.editor,
        "approver": proc.approver,
        "approver_bgd": getattr(proc, "approver_bgd", "") or "",
        "department_id": proc.department_id,
        "department_name": proc.department_name or "",
        "new_code": getattr(proc, "new_code", "") or "",
        "doc_type_id": getattr(proc, "doc_type_id", None),
        "doc_type_code": getattr(proc, "doc_type_code", "") or "",
        "issue_date": latest_rev_date or proc.issue_date,
        "last_checked_date": proc.last_checked_date,
        "last_result": proc.last_result,
        "status": proc.status,
        "display_at": proc.display_at,
        "notes": proc.notes,
        "document_level": proc.document_level or (proc.iso_document.document_level if proc.iso_document else ""),
        "symbol": proc.symbol,
        "role": proc.role,
        "diagram_data": proc.diagram_data or (proc.iso_document.diagram_data if proc.iso_document else ""),
        "has_flowchart": has_flowchart,
        "cover_info": cover_info,
        "revision_logs": revision_logs,
        "sections": sections,
        "template_sections": template_sections,
        "steps": steps,
        "documents": related_templates,
        "related_templates": related_templates,
        "inspection_guide_id": proc.inspection_guide_id,
        "inspection_guide": {
            "id": proc.inspection_guide.id,
            "code": proc.inspection_guide.code,
            "name": proc.inspection_guide.name,
            "doc_type": proc.inspection_guide.doc_type,
            "is_active": proc.inspection_guide.is_active,
            "steps_count": len(proc.inspection_guide.steps) if proc.inspection_guide and proc.inspection_guide.steps else 0
        } if proc.inspection_guide else None
    }


@router.post("/processes/{id}/sync-from-file")
def sync_iso_process_from_file(id: int, db: Session = Depends(get_db)):
    """
    [POST] Ép đọc lại toàn bộ nội dung (Mục lục, văn bản, các bước) từ file nguồn thực tế.
    """
    proc = db.query(ISOProcess).filter(ISOProcess.id == id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình thực tế")
    if not proc.file_path:
        raise HTTPException(status_code=400, detail="Quy trình chưa liên kết đường dẫn tệp tài liệu")

    resolved_file = resolve_iso_file_path(proc.file_path)
    if not resolved_file or not os.path.exists(resolved_file):
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tệp tài liệu nguồn: {proc.file_path}")

    from modules.inspection.services.iso_parser import parse_iso_docx
    try:
        parsed = {}
        if resolved_file.lower().endswith(('.docx', '.doc')):
            parsed = parse_iso_docx(resolved_file)
        elif resolved_file.lower().endswith('.pdf'):
            import fitz
            doc_pdf = fitz.open(resolved_file)
            lines = []
            for page in doc_pdf:
                lines.extend(page.get_text().split("\n"))
            doc_pdf.close()
            sec_dict = {}
            cur_sec = "Nội dung"
            cur_l = []
            for l in lines:
                l_s = l.strip()
                if not l_s:
                    continue
                if any(l_s.lower().startswith(kw) for kw in ["mục đích", "phạm vi", "trách nhiệm", "nguyên tắc", "nội dung"]) and len(l_s) < 50:
                    if cur_l:
                        sec_dict[cur_sec] = "<p>" + "</p><p>".join(cur_l) + "</p>"
                    cur_sec = l_s.rstrip(":").strip()
                    cur_l = []
                else:
                    cur_l.append(l_s)
            if cur_l:
                sec_dict[cur_sec] = "<p>" + "</p><p>".join(cur_l) + "</p>"
            parsed = {"sections": sec_dict, "steps": []}

        parsed_secs = parsed.get("sections", {})
        parsed_steps = parsed.get("steps", [])
        if not parsed_secs:
            raise HTTPException(status_code=400, detail="Không thể bóc tách nội dung văn bản từ tệp này")

        db.query(ISOProcessSection).filter(ISOProcessSection.process_id == proc.id).delete()
        for s_name, s_html in parsed_secs.items():
            db.add(ISOProcessSection(process_id=proc.id, section_name=s_name, content_html=s_html))

        if parsed_steps:
            db.query(ISOProcessStepInstance).filter(ISOProcessStepInstance.process_id == proc.id).delete()
            for st in parsed_steps:
                st_num = st.get("step_number", 1)
                db.add(ISOProcessStepInstance(
                    process_id=proc.id,
                    step_number=st_num,
                    name=st.get("name", ""),
                    assignee_role=st.get("assignee_role", ""),
                    instructions=st.get("instructions", ""),
                    checklist_json=json.dumps(st.get("checklist", [])) if st.get("checklist") else "",
                    transition_json=json.dumps(st.get("transition", {})) if st.get("transition") else "",
                    flow_node_id=f"node_{st_num}"
                ))

        if parsed.get("issuer") and not proc.editor:
            proc.editor = parsed["issuer"]
        if parsed.get("approver") and not proc.approver:
            proc.approver = parsed["approver"]

        db.commit()
        return {
            "success": True, 
            "message": f"Đã đồng bộ {len(parsed_secs)} mục nội dung từ tệp tài liệu gốc!",
            "sections_count": len(parsed_secs),
            "steps_count": len(parsed_steps)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi đọc file: {str(e)}")


from modules.inspection_guide.schemas.inspection_guide import InspectionGuideOut

@router.get("/processes/{id}/inspection-guide", response_model=Optional[InspectionGuideOut])
def get_process_inspection_guide(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết Hướng dẫn kiểm tra (InspectionGuide) liên kết 1-1 với quy trình ISO.
    """
    proc = db.query(ISOProcess).filter(ISOProcess.id == id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình ISO")
    
    if not proc.inspection_guide_id:
        return None
    
    from modules.inspection_guide.services import inspection_guide_service
    guide = inspection_guide_service.get_guide(db, proc.inspection_guide_id)
    return guide


@router.post("/processes/{id}/link-inspection-guide")
def link_process_inspection_guide(id: int, payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Liên kết 1-1 quy trình ISO với một Hướng dẫn kiểm tra có sẵn.
    """
    proc = db.query(ISOProcess).filter(ISOProcess.id == id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình ISO")
    
    guide_id = payload.get("guide_id")
    if not guide_id:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp guide_id")
        
    from modules.inspection_guide.models.inspection_guide import InspectionGuide
    guide = db.query(InspectionGuide).filter(InspectionGuide.id == guide_id, InspectionGuide.deleted_at.is_(None)).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Không tìm thấy Hướng dẫn kiểm tra")
        
    # Kiểm tra quan hệ 1 - 1: guide này đã gắn với quy trình khác chưa
    other_proc = db.query(ISOProcess).filter(ISOProcess.inspection_guide_id == guide_id, ISOProcess.id != id).first()
    if other_proc:
        raise HTTPException(status_code=400, detail=f"Hướng dẫn này đã được liên kết với quy trình '{other_proc.code} - {other_proc.name}'. Vui lòng chọn hướng dẫn khác.")
        
    # Gỡ liên kết cũ của quy trình này nếu có
    if proc.inspection_guide_id and proc.inspection_guide_id != guide_id:
        old_guide = db.query(InspectionGuide).filter(InspectionGuide.id == proc.inspection_guide_id).first()
        if old_guide:
            old_guide.process_id = None
        proc.inspection_guide_id = None
        db.flush()

    # Cập nhật liên kết 1-1
    proc.inspection_guide_id = guide.id
    guide.process_id = proc.id
    db.commit()
    db.refresh(proc)
    
    from modules.inspection_guide.services import inspection_guide_service
    guide_obj = inspection_guide_service.get_guide(db, guide.id)
    return {
        "message": "Đã liên kết thành công!",
        "inspection_guide_id": proc.inspection_guide_id,
        "guide": InspectionGuideOut.model_validate(guide_obj) if guide_obj else None
    }



@router.delete("/processes/{id}/unlink-inspection-guide")
def unlink_process_inspection_guide(id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Gỡ liên kết 1-1 giữa quy trình ISO và Hướng dẫn kiểm tra.
    """
    proc = db.query(ISOProcess).filter(ISOProcess.id == id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình ISO")
        
    if proc.inspection_guide_id:
        from modules.inspection_guide.models.inspection_guide import InspectionGuide
        guide = db.query(InspectionGuide).filter(InspectionGuide.id == proc.inspection_guide_id).first()
        if guide:
            guide.process_id = None
        proc.inspection_guide_id = None
        db.commit()
        
    return {"message": "Đã gỡ liên kết thành công!"}


@router.post("/processes/{id}/create-inspection-guide")
def create_guide_for_process(id: int, payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới nhanh một Hướng dẫn kiểm tra (HDKT) và liên kết 1-1 với quy trình ISO.
    """
    proc = db.query(ISOProcess).filter(ISOProcess.id == id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình ISO")
        
    code = (payload.get("code") or f"HD-{proc.code}").strip()
    name = (payload.get("name") or f"Hướng dẫn kiểm tra {proc.name}").strip()
    description = (payload.get("description") or f"Hướng dẫn kiểm tra thực hiện liên kết 1-1 với quy trình {proc.code} - {proc.name}").strip()
    
    from modules.inspection_guide.models.inspection_guide import InspectionGuide
    # Kiểm tra trùng mã
    exist_code = db.query(InspectionGuide).filter(InspectionGuide.code == code, InspectionGuide.deleted_at.is_(None)).first()
    if exist_code:
        import time
        code = f"{code}-{int(time.time()) % 10000}"

    new_guide = InspectionGuide(
        code=code,
        name=name,
        doc_type="HDKT",
        description=description,
        is_active=True,
        process_id=proc.id
    )
    db.add(new_guide)
    db.flush()

    # Gỡ guide cũ nếu có
    if proc.inspection_guide_id:
        old_g = db.query(InspectionGuide).filter(InspectionGuide.id == proc.inspection_guide_id).first()
        if old_g:
            old_g.process_id = None

    proc.inspection_guide_id = new_guide.id
    db.commit()
    db.refresh(new_guide)
    db.refresh(proc)
    
    from modules.inspection_guide.services import inspection_guide_service
    guide_obj = inspection_guide_service.get_guide(db, new_guide.id)
    return {
        "message": "Đã tạo mới và liên kết Hướng dẫn kiểm tra thành công!",
        "inspection_guide_id": proc.inspection_guide_id,
        "guide": InspectionGuideOut.model_validate(guide_obj) if guide_obj else None
    }



@router.get("/unlinked-inspection-guides")
def get_unlinked_inspection_guides(process_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách các Hướng dẫn kiểm tra (HDKT) chưa được liên kết với quy trình ISO nào (hoặc đang liên kết với chính process_id này).
    """
    from modules.inspection_guide.models.inspection_guide import InspectionGuide
    query = db.query(InspectionGuide).filter(
        InspectionGuide.deleted_at.is_(None),
        InspectionGuide.doc_type == "HDKT"
    )
    if process_id:
        query = query.filter(
            (InspectionGuide.process_id.is_(None)) | (InspectionGuide.process_id == process_id)
        )
    else:
        query = query.filter(InspectionGuide.process_id.is_(None))
        
    guides = query.order_by(InspectionGuide.code.asc()).all()
    return [
        {
            "id": g.id,
            "code": g.code,
            "name": g.name,
            "doc_type": g.doc_type,
            "steps_count": len(g.steps) if g.steps else 0,
            "is_current": g.process_id == process_id if process_id else False
        }
        for g in guides
    ]



@router.delete("/processes/{id}")
def delete_iso_process(id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa một quy trình thực tế khỏi hệ thống.
    """
    proc = db.query(ISOProcess).filter(ISOProcess.id == id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình thực tế")

    try:
        db.delete(proc)
        db.commit()
        return {"message": "Đã xóa quy trình thực tế thành công!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa quy trình thực tế: {str(e)}")


@router.get("/{id}/download-raw")
def download_raw_iso_document(id: int, db: Session = Depends(get_db)):
    """
    [GET] Tải tệp tin gốc (raw file) mà người dùng đã upload lên cho tài liệu ISO này.
    """
    from fastapi.responses import FileResponse

    doc_obj = db.query(ISODocument).filter(ISODocument.id == id).first()
    if not doc_obj or not doc_obj.file_path:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp tin gốc của tài liệu này")

    # Tìm đường dẫn file thực tế trên đĩa (hỗ trợ cả chạy từ /, /BackEnd hoặc ổ Z:)
    resolved_path = doc_obj.file_path
    if resolved_path and not os.path.exists(resolved_path):
        from modules.inspection.services.iso_file_service import BASE_ISO_DIR
        alt_z = os.path.join(BASE_ISO_DIR, resolved_path)
        if os.path.exists(alt_z):
            resolved_path = alt_z
        else:
            alt_path = os.path.join("BackEnd", resolved_path)
            if os.path.exists(alt_path):
                resolved_path = alt_path
            else:
                alt_path2 = os.path.join("..", resolved_path)
                if os.path.exists(alt_path2):
                    resolved_path = alt_path2

    if not resolved_path or not os.path.exists(resolved_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp tin gốc trên hệ thống đĩa máy chủ")

    # Lấy định dạng đuôi file thực tế (.docx, .pdf, .doc, ...)
    ext = os.path.splitext(resolved_path)[1]
    safe_code = (doc_obj.code or "ISO").replace("/", "_").replace("\\", "_")
    fname = doc_obj.original_file_name or doc_obj.name
    doc_code = (doc_obj.code or "").strip()
    if fname:
        if ext and not fname.lower().endswith(ext.lower()):
            fname = f"{fname}{ext}"
        if doc_code and not fname.upper().startswith(doc_code.upper()):
            download_filename = f"{doc_code} - {fname}"
        else:
            download_filename = fname
    else:
        download_filename = f"{safe_code}_{safe_name}{ext}"

    return FileResponse(
        path=resolved_path,
        filename=download_filename,
        media_type="application/octet-stream"
    )


@router.get("/processes/{id}/download-raw")
def download_raw_iso_process(
    id: int,
    variant: str = Query("current", description="current = bản hiện hành (file_path), original = bản gốc (original_file_path)"),
    db: Session = Depends(get_db)
):
    """
    [GET] Tải tệp tin của quy trình ISO thực tế theo phiên bản đang xem:
    - variant='current': ưu tiên file_path (bản hiện hành đang xem/sửa), fallback original_file_path
    - variant='original': ưu tiên original_file_path (bản gốc lúc tải lên), fallback file_path
    """
    from fastapi.responses import FileResponse

    proc_obj = db.query(ISOProcess).filter(ISOProcess.id == id).first()
    if not proc_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình này")

    if variant == "original":
        target_path = getattr(proc_obj, "original_file_path", None) or proc_obj.file_path
    else:
        target_path = proc_obj.file_path or getattr(proc_obj, "original_file_path", None)

    if not target_path:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp tin của quy trình này")

    resolved_path = resolve_iso_file_path(target_path)
    if not resolved_path or not os.path.exists(resolved_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp tin trên hệ thống đĩa máy chủ")

    # Đối với bản hiện hành (variant != 'original'), đảm bảo file .docx được đồng bộ metadata & chuẩn hóa cấu trúc OpenXML trước khi tải
    if variant != "original" and resolved_path.lower().endswith(".docx"):
        try:
            import docx as _docx
            from modules.inspection.services.iso_file_service import (
                _has_iso_cover_table,
                fill_metadata_into_template_docx,
                repair_and_standardize_docx_structure,
            )
            doc_dl = _docx.Document(resolved_path)
            rev_logs_db = sorted(proc_obj.revision_logs, key=lambda x: x.seq_no or 0) if proc_obj.revision_logs else []
            eff_ver = f"{len(rev_logs_db):02d}" if rev_logs_db else "01"
            eff_date = (rev_logs_db[-1].rev_date if rev_logs_db and rev_logs_db[-1].rev_date else proc_obj.issue_date) or ""
            meta_dl = {
                "doc_title": proc_obj.name or "",
                "doc_code": getattr(proc_obj, "new_code", None) or proc_obj.code or "",
                "version": eff_ver,
                "issue_date": eff_date,
                "dept_name": proc_obj.department_name or "",
                "issuer_name": proc_obj.editor or proc_obj.owner or "Ngô Diễm My",
                "approver_name": proc_obj.approver or "",
                "approver_bgd": getattr(proc_obj, "approver_bgd", "") or "",
                "document_level": proc_obj.document_level or "Cấp phòng",
                "revision_logs": [
                    {
                        "seq_no": l.seq_no,
                        "rev_date": l.rev_date or "",
                        "content": l.content or "",
                        "page_no": l.page_no or "Toàn bộ",
                    }
                    for l in rev_logs_db
                ] if rev_logs_db else [],
            }
            orig_fp = getattr(proc_obj, "original_file_path", "") or ""
            if _has_iso_cover_table(doc_dl):
                fill_metadata_into_template_docx(doc_dl, meta_dl)
            else:
                repair_and_standardize_docx_structure(doc_dl, meta_dl)
            if not orig_fp or proc_obj.file_path != orig_fp:
                doc_dl.save(resolved_path)
        except Exception as e_dl_sync:
            print(f"[download_raw_iso_process] Warning sync docx: {e_dl_sync}")

    ext = os.path.splitext(resolved_path)[1] or ".docx"
    safe_code = (getattr(proc_obj, "new_code", None) or proc_obj.code or "QT").strip().replace("/", "_").replace("\\", "_")
    safe_name = (proc_obj.name or "Quy_trinh").strip().replace("/", "_").replace("\\", "_")

    if variant == "original":
        orig_fname = getattr(proc_obj, "original_file_name", None)
        if orig_fname and not re.match(r'^[0-9a-fA-F-]{32,38}(\.[a-zA-Z0-9]+)?$', orig_fname):
            if not orig_fname.lower().endswith(ext.lower()):
                orig_fname = f"{os.path.splitext(orig_fname)[0]}{ext}"
            download_filename = orig_fname
        else:
            download_filename = f"{safe_code} - {safe_name} (Ban goc){ext}"
    else:
        download_filename = f"{safe_code} - {safe_name}{ext}"

    return FileResponse(
        path=resolved_path,
        filename=download_filename,
        media_type="application/octet-stream"
    )


@router.post("/processes/{id}/sync-docx")
async def sync_process_docx(
    id: int,
    file: UploadFile = File(...),
    render_pages: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    [POST] Đồng bộ file .docx đang soạn thảo từ Canvas Editor vào file_path của quy trình,
    giữ nguyên original_file_path (bản gốc), xóa cache render cũ để Xem trước / In / Tải Word khớp 100%.
    """
    from config.settings import UPLOADS_DIR
    from modules.inspection.services.iso_file_service import render_document_pages, standardize_iso_docx_document
    import docx

    proc_obj = db.query(ISOProcess).filter(ISOProcess.id == id).first()
    if not proc_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình ISO")

    raw_bytes = await file.read()
    if not raw_bytes or len(raw_bytes) < 500:
        raise HTTPException(status_code=400, detail="File Word tải lên rỗng hoặc không hợp lệ")

    # Đảm bảo bảo toàn original_file_path nếu chưa có
    if not getattr(proc_obj, "original_file_path", None) and proc_obj.file_path:
        proc_obj.original_file_path = proc_obj.file_path

    # Bổ sung footer chuẩn ISO vào file .docx xuất từ Canvas Editor (giữ nguyên 100% bố cục thân bài)
    try:
        doc_in = docx.Document(io.BytesIO(raw_bytes))
        out_buf = io.BytesIO()
        doc_in.save(out_buf)
        raw_bytes = out_buf.getvalue()
    except Exception as e_doc:
        print(f"[sync_process_docx] Warning parse docx: {e_doc}")

    iso_upload_dir = os.path.join(UPLOADS_DIR, "iso_documents")
    os.makedirs(iso_upload_dir, exist_ok=True)

    # Nếu file_path hiện tại khác original_file_path và là .docx trong iso_documents -> ghi đè; ngược lại tạo file .docx mới cho bản hiện hành
    cur_fp = (proc_obj.file_path or "").strip()
    orig_fp = (getattr(proc_obj, "original_file_path", "") or "").strip()
    target_abs = None
    target_rel = None

    if cur_fp and cur_fp != orig_fp and cur_fp.lower().endswith(".docx"):
        resolved_cur = resolve_iso_file_path(cur_fp)
        if resolved_cur:
            target_abs = resolved_cur
            target_rel = cur_fp

    if not target_abs:
        new_uuid_name = f"{uuid.uuid4()}.docx"
        target_abs = os.path.join(iso_upload_dir, new_uuid_name)
        target_rel = f"static/uploads/iso_documents/{new_uuid_name}"

    with open(target_abs, "wb") as f_out:
        f_out.write(raw_bytes)

    proc_obj.file_path = target_rel
    proc_obj.updated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.commit()

    pages_data = []
    if render_pages:
        try:
            rendered = render_document_pages(target_abs)
            if rendered and rendered.get("success"):
                pages_data = rendered.get("pages") or []
        except Exception as e_rp:
            print(f"[sync_process_docx] Warning render_document_pages: {e_rp}")

    return {
        "success": True,
        "file_path": target_rel,
        "original_file_path": getattr(proc_obj, "original_file_path", "") or "",
        "pages": pages_data,
        "page_count": len(pages_data)
    }


@router.get("/{id}/download-docx")
def download_compiled_iso_document(id: int, db: Session = Depends(get_db)):
    """
    [GET] Tải file Word (.docx) mẫu ISO, tự động điền các thông tin metadata và nhật ký sửa đổi từ DB.
    """
    import docx
    import re
    from fastapi.responses import StreamingResponse
    from io import BytesIO

    doc_obj = db.query(ISODocument).filter(ISODocument.id == id).first()
    if not doc_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu quy trình")

    # Tìm đường dẫn file thực tế trên đĩa (hỗ trợ cả chạy từ / hoặc /BackEnd)
    resolved_path = doc_obj.file_path
    if resolved_path:
        if not os.path.exists(resolved_path):
            alt_path = os.path.join("BackEnd", resolved_path)
            if os.path.exists(alt_path):
                resolved_path = alt_path
            else:
                alt_path2 = os.path.join("..", resolved_path)
                if os.path.exists(alt_path2):
                    resolved_path = alt_path2

    if not resolved_path or not os.path.exists(resolved_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy file đính kèm gốc trên hệ thống")

    try:
        docx_file = docx.Document(resolved_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi đọc file Word: {str(e)}")

    def replace_text(text_val):
        if not text_val:
            return text_val
        mapping = {
            "[mã hiệu]": getattr(doc_obj, 'symbol', '') or "",
            "[lần ban hành]": getattr(doc_obj, 'version', '') or "01",
            "[lân ban hành]": getattr(doc_obj, 'version', '') or "01",
            "[ngày ban hành]": getattr(doc_obj, 'issue_date', '') or "",
            "[phòng ban/ bộ phận]": getattr(doc_obj, 'folder', '') or "",
            "[Họ tên người biên soạn]": getattr(doc_obj, 'issuer', '') or "",
            "[CV NBS]": "TP. QLCL",
            "[Họ tên người phê duyệt]": getattr(doc_obj, 'approver', '') or "",
            "[CV NPD]": "PHÓ TGĐ",
            "[Tên quy trình]": getattr(doc_obj, 'name', '') or "",
            "[Tên tài liệu]": getattr(doc_obj, 'name', '') or "",
        }
        res_txt = text_val
        for k, v in mapping.items():
            res_txt = res_txt.replace(k, v)
        return res_txt

    def process_paragraph(p):
        old_text = p.text
        new_text = replace_text(old_text)
        
        # Cập nhật thông tin footer nếu có
        if "Mã hiệu:" in new_text and doc_obj.symbol:
            new_text = re.sub(r"Mã hiệu:\s*[^\s]+", lambda m: f"Mã hiệu: {doc_obj.symbol}", new_text)
        if "Ngày ban hành:" in new_text and doc_obj.issue_date:
            new_text = re.sub(r"Ngày ban hành:\s*[\d/]+", lambda m: f"Ngày ban hành: {doc_obj.issue_date}", new_text)
        if "Lần ban hành:" in new_text and doc_obj.version:
            new_text = re.sub(r"Lần ban hành:\s*\d+", lambda m: f"Lần ban hành: {doc_obj.version}", new_text)
            
        if old_text != new_text:
            if len(p.runs) == 1:
                p.runs[0].text = new_text
            elif len(p.runs) > 1:
                p.runs[0].text = new_text
                for r in p.runs[1:]:
                    r.text = ""
            else:
                p.text = new_text

    def process_table(table):
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    process_paragraph(p)
                for nt in cell.tables:
                    process_table(nt)

    # 1. Quét paragraph ngoài
    for p in docx_file.paragraphs:
        process_paragraph(p)
        
    # 2. Quét tables
    for table in docx_file.tables:
        process_table(table)
        
    # 3. Quét header / footer
    for sec in docx_file.sections:
        for h_type in ['header', 'footer']:
            header_footer = getattr(sec, h_type, None)
            if header_footer:
                for p in header_footer.paragraphs:
                    process_paragraph(p)
                for t in header_footer.tables:
                    process_table(t)

    # 4. Điền bảng nhật ký sửa đổi (Revision logs)
    for table in docx_file.tables:
        if len(table.rows) < 2:
            continue
        headers = [cell.text.strip().lower() for cell in table.rows[0].cells]
        is_rev_table = any("sửa đổi" in h or "ngày sửa" in h or "nội dung" in h or "trang số" in h for h in headers)
        if is_rev_table:
            logs = sorted(doc_obj.revision_logs, key=lambda x: x.seq_no)
            for idx, log in enumerate(logs):
                row_idx = idx + 1
                if row_idx < len(table.rows):
                    row = table.rows[row_idx]
                else:
                    row = table.add_row()
                
                if len(row.cells) >= 4:
                    row.cells[0].text = str(log.seq_no)
                    row.cells[1].text = log.rev_date or ""
                    row.cells[2].text = log.content or ""
                    row.cells[3].text = log.page_no or ""
            
            # Xóa các dòng mẫu còn thừa
            for empty_idx in range(len(logs) + 1, len(table.rows)):
                row = table.rows[empty_idx]
                for cell in row.cells:
                    cell.text = ""

    # Lưu file ra buffer
    try:
        out_buf = BytesIO()
        docx_file.save(out_buf)
        out_buf.seek(0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xuất file Word: {str(e)}")

    safe_filename = re.sub(r'[^\w\-_.]', '_', doc_obj.name)
    headers = {
        'Content-Disposition': f'attachment; filename="{safe_filename}.docx"'
    }
    return StreamingResponse(
        out_buf,
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        headers=headers
    )


# -------------------------------------------------------------
# PHÂN HỆ QUẢN LÝ LOẠI HỒ SƠ ISO (ISO DOCUMENT TYPES) CRUD
# -------------------------------------------------------------

@router.get("/types")
def get_iso_document_types(db: Session = Depends(get_db)):
    """[GET] Lấy danh mục Loại hồ sơ / Loại tài liệu ISO"""
    types = db.query(ISODocumentType).order_by(ISODocumentType.id.asc()).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "code": t.code,
            "description": t.description or "",
            "created_at": t.created_at or "",
            "updated_at": t.updated_at or ""
        }
        for t in types
    ]


@router.post("/types")
def create_iso_document_type(payload: dict, db: Session = Depends(get_db)):
    """[POST] Thêm mới Loại hồ sơ ISO"""
    name = (payload.get("name") or "").strip()
    code = (payload.get("code") or "").strip().upper()
    description = payload.get("description", "")
    if not name or not code:
        raise HTTPException(status_code=400, detail="Tên và Mã viết tắt không được bỏ trống")
    
    existing = db.query(ISODocumentType).filter(ISODocumentType.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã viết tắt '{code}' đã tồn tại")
    
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    doc_type = ISODocumentType(
        name=name,
        code=code,
        description=description,
        created_at=now_str,
        updated_at=now_str
    )
    db.add(doc_type)
    db.commit()
    db.refresh(doc_type)
    return {
        "id": doc_type.id,
        "name": doc_type.name,
        "code": doc_type.code,
        "description": doc_type.description or "",
        "created_at": doc_type.created_at,
        "updated_at": doc_type.updated_at
    }


@router.put("/types/{id}")
def update_iso_document_type(id: int, payload: dict, db: Session = Depends(get_db)):
    """[PUT] Cập nhật Loại hồ sơ ISO"""
    doc_type = db.query(ISODocumentType).filter(ISODocumentType.id == id).first()
    if not doc_type:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại hồ sơ")
    
    name = (payload.get("name") or "").strip()
    code = (payload.get("code") or "").strip().upper()
    description = payload.get("description", "")
    if not name or not code:
        raise HTTPException(status_code=400, detail="Tên và Mã viết tắt không được bỏ trống")
    
    existing = db.query(ISODocumentType).filter(ISODocumentType.code == code, ISODocumentType.id != id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã viết tắt '{code}' đã tồn tại ở loại hồ sơ khác")
    
    doc_type.name = name
    doc_type.code = code
    doc_type.description = description
    doc_type.updated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.commit()
    db.refresh(doc_type)
    return {
        "id": doc_type.id,
        "name": doc_type.name,
        "code": doc_type.code,
        "description": doc_type.description or "",
        "updated_at": doc_type.updated_at
    }


@router.delete("/types/{id}")
def delete_iso_document_type(id: int, db: Session = Depends(get_db)):
    """[DELETE] Xóa Loại hồ sơ ISO"""
    doc_type = db.query(ISODocumentType).filter(ISODocumentType.id == id).first()
    if not doc_type:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại hồ sơ")
    
    used_count = db.query(ISOProcess).filter(ISOProcess.doc_type_id == id).count()
    if used_count > 0:
        raise HTTPException(status_code=400, detail=f"Không thể xóa vì có {used_count} quy trình đang liên kết loại hồ sơ này")
    
    db.delete(doc_type)
    db.commit()
    return {"message": "Đã xóa loại hồ sơ thành công"}


@router.get("/processes/next-code")
def get_next_process_code(
    department_code: str = "QL",
    doc_type_code: str = "QT",
    exclude_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Sinh mã quy trình gợi ý tiếp theo dạng G7.<Mã_PB>.<Mã_Loại><STT> (DUY NHẤT - TĂNG DẦN THEO PHÒNG BAN)
    - Mã phòng ban chuẩn hóa: AT, HC, ISO, MH, MT, QL, SX, KT, KH, KD, IT...
    - STT (01, 02...): tăng xuyên suốt trong cùng một Phòng ban (G7.<Mã_PB>.*), không reset khi đổi Loại tài liệu.
    """
    import re
    from modules.inspection.services.iso_file_service import get_department_acronym

    dept = get_department_acronym(department_code or "QL", db=db)
    dtype = (doc_type_code or "QT").strip().upper()
    prefix = f"G7.{dept}.{dtype}"

    query = db.query(ISOProcess.new_code).filter(
        ISOProcess.new_code.like(f"{prefix}%")
    )
    if exclude_id is not None:
        query = query.filter(ISOProcess.id != exclude_id)

    existing_codes = query.all()

    used_nums = set()
    type_seq_pattern = re.compile(rf"^G7\.{re.escape(dept)}\.{re.escape(dtype)}(\d+)$", re.IGNORECASE)
    for (c,) in existing_codes:
        if c:
            m = type_seq_pattern.match(c.strip())
            if m:
                try:
                    used_nums.add(int(m.group(1)))
                except Exception:
                    pass

    # Nếu đang chỉnh sửa một quy trình đã có số thứ tự trong cùng loại này, giữ nguyên số thứ tự đó
    if exclude_id is not None:
        current_proc = db.query(ISOProcess).filter(ISOProcess.id == exclude_id).first()
        if current_proc and current_proc.new_code:
            m_curr = type_seq_pattern.match(current_proc.new_code.strip())
            if m_curr:
                curr_seq = int(m_curr.group(1))
                if curr_seq not in used_nums:
                    curr_seq_str = f"{curr_seq:02d}"
                    return {
                        "prefix": prefix,
                        "next_code": f"{prefix}{curr_seq_str}",
                        "seq": curr_seq
                    }

    next_num = (max(used_nums) + 1) if used_nums else 1
    next_num_str = f"{next_num:02d}"
    return {
        "prefix": prefix,
        "next_code": f"{prefix}{next_num_str}",
        "seq": next_num
    }


@router.get("/approvers-list")
def get_iso_approvers_list(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách Trưởng phòng và Ban Giám Đốc từ DB để tự động điền Người duyệt.
    """
    from sqlalchemy import text
    manager_list = []
    try:
        managers = db.execute(text("SELECT full_name, position, department FROM employees WHERE position LIKE N'%Trưởng%' OR position LIKE N'%Giám%'")).fetchall()
        for m in managers:
            manager_list.append({
                "name": m[0],
                "position": m[1],
                "department": m[2] or ""
            })
    except Exception:
        pass

    try:
        hr_mgrs = db.execute(text("""
            SELECT e.full_name, p.name as position, d.name as department 
            FROM hr_employees e 
            JOIN permissions p ON e.position_id = p.id 
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE p.name LIKE N'%Trưởng%' OR p.name LIKE N'%Giám%'
        """)).fetchall()
        for hm in hr_mgrs:
            if not any(m["name"] == hm[0] for m in manager_list):
                manager_list.append({
                    "name": hm[0],
                    "position": hm[1],
                    "department": hm[2] or ""
                })
    except Exception:
        pass
    
    try:
        from modules.auth.models.permissions import Permission
        from modules.auth.models.role import Role
        from modules.inspection.services.iso_file_service import get_department_code
        roles = db.query(Role).filter(Role.is_active == True).order_by(Role.id).all()
        skip_roles = ["Quản Lý", "Tổ Trưởng"]
        depts = []
        for r in roles:
            if r.name in skip_roles:
                continue
            full_name = r.description if r.description and r.description.strip() else r.name
            code_2 = get_department_code(r.name)
            if code_2 in ["CL", "QL"] or "QL" in (r.name or "").upper():
                code_2 = "QL"
            elif code_2 in ["BG", "BGD"] or (r.name or "").upper() == "BGD":
                code_2 = "BG"
            depts.append({
                "id": r.id,
                "name": full_name,
                "code": code_2,
                "role_name": r.name
            })
    except Exception:
        depts = []

    return {
        "managers": manager_list,
        "departments": depts,
        "default_bgd": "Ban Giám Đốc"
    }


@router.post("/export-process-docx")
async def export_process_docx(data: dict):
    """
    [POST] Xuất tài liệu quy trình ra file Word .docx chuẩn 100% theo Mẫu quy trình.docx và G7.CL-QT01.
    """
    import io
    import re
    import urllib.parse
    import docx
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.oxml import OxmlElement, parse_xml
    from docx.oxml.ns import qn

    # 1. Tìm template chuẩn Mẫu quy trình.docx hoặc G7.CL-QT01
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    dirs_to_check = [os.path.join(workspace_root, "BackEnd", "templates"), workspace_root]
    tpl_path = None
    for d in dirs_to_check:
        if os.path.exists(d):
            for f in os.listdir(d):
                if "quy tr" in f.lower() and f.endswith(".docx") and ("m" in f.lower() and "u" in f.lower()):
                    tpl_path = os.path.join(d, f)
                    break
        if tpl_path:
            break
    if not tpl_path:
        for d in dirs_to_check:
            cand = os.path.join(d, "G7.CL -QT01_Quy trình kiểm soát nguyên vật liệu đầu vào.docx")
            if os.path.exists(cand):
                tpl_path = cand
                break

    if tpl_path:
        doc = docx.Document(tpl_path)
    else:
        doc = docx.Document()
        s = doc.sections[0]
        s.page_width = Pt(595.3)
        s.page_height = Pt(841.9)
        s.top_margin = Pt(72.0)
        s.bottom_margin = Pt(72.0)
        s.left_margin = Pt(72.0)
        s.right_margin = Pt(72.0)

    doc_title = (str(data.get("name") or "").strip() or "QUY TRÌNH").upper()
    raw_code = (str(data.get("new_code") or "").strip() or 
                str(data.get("code") or "").strip() or 
                str(data.get("symbol") or "").strip() or
                str(data.get("iso_document_code") or "").strip())
    if not raw_code:
        for s in doc.sections:
            for p in list(s.footer.paragraphs) + list(s.header.paragraphs):
                p_t = p.text.strip()
                if not p_t:
                    continue
                m_c = re.search(r'(?:Mã\s*hiệu|Mã\s*quy\s*trình|Mã\s*số)\s*[\:\-]?\s*([A-Z0-9\.\_\s\-]+?)(?:\s{2,}|Ngày|Lần|Trang|$)', p_t, re.I)
                if m_c:
                    cand = m_c.group(1).strip()
                    if len(cand) >= 3 and not cand.lower().startswith("ngày"):
                        raw_code = cand
                        break
            if raw_code:
                break
    if not raw_code:
        raw_code = "G7.CL -QT01"
    doc_code = raw_code
    issue_date = (str(data.get("issue_date") or "").strip() or datetime.date.today().strftime("%Y-%m-%d"))
    version = (str(data.get("version") or "").strip() or "01")
    dept = (str(data.get("folder") or data.get("department_name") or "").strip() or "Ban Quản trị Chất lượng & ISO (QLCL)")
    issuer = str(data.get("issuer") or "").strip() or "Ngô Diễm My"
    approver = str(data.get("approver") or "").strip() or "Đặng Minh Tuấn"

    # Đảm bảo toàn bộ tài liệu dùng font Times New Roman chuẩn
    try:
        style_normal = doc.styles['Normal']
        style_normal.font.name = 'Times New Roman'
        rPr_norm = style_normal._element.get_or_add_rPr()
        rFonts_norm = rPr_norm.find(qn('w:rFonts'))
        if rFonts_norm is None:
            rFonts_norm = OxmlElement('w:rFonts')
            rPr_norm.append(rFonts_norm)
        rFonts_norm.set(qn('w:ascii'), 'Times New Roman')
        rFonts_norm.set(qn('w:hAnsi'), 'Times New Roman')
        rFonts_norm.set(qn('w:cs'), 'Times New Roman')
        rFonts_norm.set(qn('w:eastAsia'), 'Times New Roman')
    except Exception:
        pass

    def apply_run_font(run, size=None, bold=None, italic=None, color=None):
        run.font.name = 'Times New Roman'
        rPr = run._r.get_or_add_rPr()
        rFonts = rPr.find(qn('w:rFonts'))
        if rFonts is None:
            rFonts = OxmlElement('w:rFonts')
            rPr.append(rFonts)
        rFonts.set(qn('w:ascii'), 'Times New Roman')
        rFonts.set(qn('w:hAnsi'), 'Times New Roman')
        rFonts.set(qn('w:cs'), 'Times New Roman')
        rFonts.set(qn('w:eastAsia'), 'Times New Roman')
        if size is not None:
            run.font.size = size
        if bold is not None:
            run.bold = bold
        if italic is not None:
            run.italic = italic
        if color is not None:
            run.font.color.rgb = color

    # Cập nhật Trang 1 (Trang bìa) và Trang 2 (Theo dõi sửa đổi) theo đúng chuẩn Mẩu quy trình.docx
    from modules.inspection.services.iso_file_service import (
        fill_metadata_into_template_docx,
        repair_and_standardize_docx_structure,
    )
    rev_logs = data.get("revision_logs") or [
        {"seq_no": 1, "rev_date": issue_date, "content": "Ban hành lần đầu", "page_no": "Toàn bộ"}
    ]
    export_meta = {
        "doc_title": doc_title,
        "doc_code": doc_code,
        "version": version,
        "issue_date": issue_date,
        "dept_name": dept,
        "issuer_name": issuer,
        "approver_name": approver,
        "approver_bgd": str(data.get("approver_bgd") or "").strip(),
        "document_level": str(data.get("document_level") or "Cấp phòng").strip(),
        "revision_logs": rev_logs,
    }
    fill_metadata_into_template_docx(doc, export_meta)

    # Dọn dẹp các đoạn văn bản trắng thừa ở cuối template trước khi thêm trang mới để không bị dư trang
    while len(doc.paragraphs) > 0 and not doc.paragraphs[-1].text.strip():
        p_last = doc.paragraphs[-1]
        p_last._element.getparent().remove(p_last._element)

    # Bổ sung nội dung quy trình từ Trang 3 trở đi
    doc.add_page_break()

    sections_data = data.get("sections") or {}
    steps_data = data.get("steps") or []

    # Nếu người dùng chưa nhập nội dung sections: để trống Trang 3 (mặc định trống, không tự tạo sẵn)
    sec_keys = [k for k in sections_data.keys() if not k.startswith("__")]
    if not sec_keys:
        p_blank = doc.add_paragraph()
        r_blank = p_blank.add_run("\u00a0")
        r_blank.font.name = "Times New Roman"
        r_blank.font.size = Pt(12)

    def generate_flowchart_table_image(steps):
        import os, io
        from PIL import Image, ImageDraw, ImageFont

        fonts_dir = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts')
        font_p = os.path.join(fonts_dir, 'times.ttf')
        font_bp = os.path.join(fonts_dir, 'timesbd.ttf')
        if not os.path.exists(font_p):
            font_p = os.path.join(fonts_dir, 'arial.ttf')
        if not os.path.exists(font_bp):
            font_bp = os.path.join(fonts_dir, 'arialbd.ttf')

        try:
            f_hdr = ImageFont.truetype(font_bp, 22)
            f_step_num = ImageFont.truetype(font_bp, 22)
            f_role = ImageFont.truetype(font_p, 19)
            f_tpl = ImageFont.truetype(font_bp, 18)
            f_node = ImageFont.truetype(font_bp, 19)
            f_node_badge = ImageFont.truetype(font_bp, 16)
            f_badge_txt = ImageFont.truetype(font_bp, 17)
        except Exception:
            f_hdr = f_step_num = f_role = f_tpl = f_node = f_node_badge = f_badge_txt = ImageFont.load_default()

        def wrap_lines(text, max_chars):
            if not text: return ['']
            words = str(text).split()
            lines, cur = [], ''
            for w in words:
                cand = cur + ' ' + w if cur else w
                if len(cand) <= max_chars: cur = cand
                else:
                    if cur: lines.append(cur)
                    cur = w
            if cur: lines.append(cur)
            return lines[:3]

        def get_node_type(s, idx, total):
            raw = (s.get('node_type') or '').lower()
            if raw in ['decision'] or s.get('fail_path') or s.get('has_branch'): return 'decision'
            if raw in ['terminal', 'start', 'end']: return 'terminal'
            name = (s.get('name') or '').lower()
            if idx == 0 or any(k in name for k in ['bắt đầu', 'tiếp nhận']): return 'terminal'
            if idx == total - 1 or any(k in name for k in ['kết thúc', 'lưu trữ', 'hoàn tất']): return 'terminal'
            if any(k in name for k in ['phê duyệt', 'quyết định', 'kiểm tra', 'thẩm định', 'đối chiếu']): return 'decision'
            return 'task'

        total = len(steps)
        scale = 2
        w0 = 38 * scale
        w1 = 150 * scale
        w2 = 252 * scale
        w3 = 180 * scale
        W = w0 + w1 + w2 + w3

        H_HDR = 40 * scale
        H_ROW = 120 * scale
        total_H = H_HDR + total * H_ROW + 10 * scale

        im = Image.new('RGB', (W, total_H), color=(255, 255, 255))
        draw = ImageDraw.Draw(im)

        col_x = [0, w0, w0 + w1, w0 + w1 + w2, W]
        MAIN_CX = col_x[2] + 118 * scale

        # Outer border
        draw.rectangle([0, 0, W - 1, total_H - 1], outline=(0, 0, 0), width=3)
        draw.line([0, H_HDR, W, H_HDR], fill=(0, 0, 0), width=3)

        # Column lines
        for x in col_x[1:4]:
            draw.line([x, 0, x, total_H], fill=(0, 0, 0), width=2)

        # Row lines
        for i in range(1, total):
            y = H_HDR + i * H_ROW
            draw.line([0, y, W, y], fill=(0, 0, 0), width=2)

        # Header texts
        hdrs = [
            ((col_x[0] + col_x[1]) // 2, 'Bước'),
            ((col_x[1] + col_x[2]) // 2, 'Trách nhiệm'),
            ((col_x[2] + col_x[3]) // 2, 'Lưu đồ'),
            ((col_x[3] + col_x[4]) // 2, 'Phụ lục')
        ]
        for hx, htxt in hdrs:
            bbox = f_hdr.getbbox(htxt)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            draw.text((hx - tw // 2, H_HDR // 2 - th // 2 - 2), htxt, fill=(0, 0, 0), font=f_hdr)

        # Node sizes
        W_RECT = 160 * scale
        H_RECT = 50 * scale
        W_OVAL = 160 * scale
        H_OVAL = 46 * scale
        W_DIAM = 106 * scale
        H_DIAM = 72 * scale

        node_coords = []

        for idx, s in enumerate(steps):
            s_num = s.get('step_number') or (idx + 1)
            cy = H_HDR + idx * H_ROW + H_ROW // 2
            ntype = get_node_type(s, idx, total)

            # Col 0: Bước
            b_txt = f'{s_num}.'
            bbox = f_step_num.getbbox(b_txt)
            draw.text(((col_x[0] + col_x[1]) // 2 - (bbox[2] - bbox[0]) // 2, cy - (bbox[3] - bbox[1]) // 2), b_txt, fill=(0, 0, 0), font=f_step_num)

            # Col 1: Trách nhiệm
            r_lines = wrap_lines(f"- {s.get('assignee_role') or 'Đang cập nhật'}", 20)
            lh = 24
            tot_lh = (len(r_lines) - 1) * lh
            for li, rl in enumerate(r_lines):
                draw.text((col_x[1] + 16, cy - tot_lh // 2 + li * lh - 12), rl, fill=(30, 41, 59), font=f_role)

            # Col 3: Phụ lục
            tpl_val = s.get('template_files') or '---'
            if tpl_val != '---':
                raw_items = [it.strip() for it in re.split(r'[,;\n]+', tpl_val) if it.strip()]
                tpl_lines = []
                for it in raw_items:
                    tpl_lines.extend(wrap_lines(it, 22)[:2])
                tpl_lines = tpl_lines[:4]
                tot_tlh = (len(tpl_lines) - 1) * lh
                for li, tl in enumerate(tpl_lines):
                    draw.text((col_x[3] + 16, cy - tot_tlh // 2 + li * lh - 12), tl, fill=(3, 105, 161), font=f_tpl)

            # Col 2: Shape
            if ntype == 'terminal':
                nw, nh = W_OVAL, H_OVAL
                draw.rounded_rectangle([MAIN_CX - nw // 2, cy - nh // 2, MAIN_CX + nw // 2, cy + nh // 2], radius=23 * scale, fill=(255, 255, 255), outline=(0, 0, 0), width=3)
            elif ntype == 'decision':
                nw, nh = W_DIAM, H_DIAM
                pts = [(MAIN_CX, cy - nh // 2), (MAIN_CX + nw // 2, cy), (MAIN_CX, cy + nh // 2), (MAIN_CX - nw // 2, cy)]
                draw.polygon(pts, fill=(255, 255, 255), outline=(0, 0, 0))
                draw.line(pts + [pts[0]], fill=(0, 0, 0), width=3)
            else:
                nw, nh = W_RECT, H_RECT
                draw.rounded_rectangle([MAIN_CX - nw // 2, cy - nh // 2, MAIN_CX + nw // 2, cy + nh // 2], radius=4 * scale, fill=(255, 255, 255), outline=(0, 0, 0), width=3)

            # Node label text: căn chính giữa ô cả phương ngang và dọc (bỏ B1, B2)
            nl_lines = wrap_lines(s.get('name') or f'Bước {s_num}', 20 if ntype != 'decision' else 14)
            nl_lh = 22
            tot_text_h = (len(nl_lines) - 1) * nl_lh
            for li, nline in enumerate(nl_lines):
                lbox = f_node.getbbox(nline)
                lw = lbox[2] - lbox[0]
                text_y = cy - tot_text_h // 2 + li * nl_lh - 9
                draw.text((MAIN_CX - lw // 2, text_y), nline, fill=(0, 0, 0), font=f_node)

            node_coords.append({'cx': MAIN_CX, 'cy': cy, 'w': nw, 'h': nh, 'type': ntype})

        # Connectors
        for idx in range(total - 1):
            cur = node_coords[idx]
            nxt = node_coords[idx + 1]
            y1 = cur['cy'] + cur['h'] // 2
            y2 = nxt['cy'] - nxt['h'] // 2
            midY = (y1 + y2) // 2

            if cur['type'] == 'decision':
                draw.line([(MAIN_CX, y1), (MAIN_CX, midY - 16)], fill=(21, 128, 61), width=3)
                bg_txt = 'Đồng ý'
                gbox = f_badge_txt.getbbox(bg_txt)
                gw = gbox[2] - gbox[0] + 18
                gh = gbox[3] - gbox[1] + 10
                draw.rounded_rectangle([MAIN_CX - gw // 2, midY - gh // 2, MAIN_CX + gw // 2, midY + gh // 2], radius=6, fill=(220, 252, 231), outline=(21, 128, 61), width=2)
                draw.text((MAIN_CX - (gbox[2] - gbox[0]) // 2, midY - (gbox[3] - gbox[1]) // 2 - 2), bg_txt, fill=(21, 128, 61), font=f_badge_txt)
                draw.line([(MAIN_CX, midY + 16), (MAIN_CX, y2)], fill=(21, 128, 61), width=3)
                draw.polygon([(MAIN_CX, y2), (MAIN_CX - 6, y2 - 11), (MAIN_CX + 6, y2 - 11)], fill=(21, 128, 61))

                # Loopback branch
                target_idx = max(0, idx - 1)
                tgt = node_coords[target_idx]
                x_start = cur['cx'] + cur['w'] // 2
                y_start = cur['cy']
                busX = MAIN_CX + 86 * scale
                x_end = tgt['cx'] + tgt['w'] // 2
                y_end = tgt['cy']

                pts = [(x_start, y_start), (busX, y_start), (busX, y_end), (x_end + 12, y_end)]
                for p_i in range(len(pts) - 1):
                    draw.line([pts[p_i], pts[p_i + 1]], fill=(220, 38, 38), width=3)
                draw.polygon([(x_end, y_end), (x_end + 11, y_end - 6), (x_end + 11, y_end + 6)], fill=(220, 38, 38))
                r_txt = 'Không đồng ý'
                rbox = f_badge_txt.getbbox(r_txt)
                rw = rbox[2] - rbox[0] + 16
                rh = rbox[3] - rbox[1] + 10
                mid_loop_y = (y_start + y_end) // 2
                draw.rounded_rectangle([busX - rw // 2, mid_loop_y - rh // 2, busX + rw // 2, mid_loop_y + rh // 2], radius=6, fill=(254, 226, 226), outline=(220, 38, 38), width=2)
                draw.text((busX - (rbox[2] - rbox[0]) // 2, mid_loop_y - (rbox[3] - rbox[1]) // 2 - 2), r_txt, fill=(220, 38, 38), font=f_badge_txt)
            else:
                draw.line([(MAIN_CX, y1), (MAIN_CX, y2)], fill=(0, 0, 0), width=3)
                draw.polygon([(MAIN_CX, y2), (MAIN_CX - 6, y2 - 11), (MAIN_CX + 6, y2 - 11)], fill=(0, 0, 0))

        buf = io.BytesIO()
        im.save(buf, format='PNG')
        buf.seek(0)
        return buf

    for sec_name in sec_keys:
        sec_content = sections_data.get(sec_name, "")
        
        # Tiêu đề mục
        p_sec = doc.add_paragraph()
        p_sec.paragraph_format.space_before = Pt(14)
        p_sec.paragraph_format.space_after = Pt(6)
        r_sec = p_sec.add_run(sec_name)
        r_sec.bold = True
        r_sec.font.name = "Times New Roman"
        r_sec.font.size = Pt(13)

        # Nếu là Mục 5 (Nội dung) hoặc có lưu đồ
        if "5." in sec_name or "nội dung" in sec_name.lower():
            eff_steps = steps_data if (steps_data and len(steps_data) > 0) else [
                {"step_number": 1, "name": "Tiếp nhận yêu cầu", "assignee_role": "Người thực hiện"},
                {"step_number": 2, "name": "Xử lý & Triển khai", "assignee_role": "Người thực hiện"},
                {"step_number": 3, "name": "Kiểm tra & Đánh giá", "assignee_role": "Cấp quản lý"},
                {"step_number": 4, "name": "Phê duyệt", "assignee_role": "Người phê duyệt"},
                {"step_number": 5, "name": "Lưu trữ hồ sơ", "assignee_role": "Người thực hiện"}
            ]
            if eff_steps:
                # 5.1 Sơ đồ lưu trình
                p_51 = doc.add_paragraph()
                p_51.paragraph_format.space_before = Pt(12)
                p_51.paragraph_format.space_after = Pt(8)
                r_51 = p_51.add_run(f"5.1. Sơ đồ lưu trình kiểm soát công tác {doc_title.lower()}")
                r_51.bold = True
                r_51.font.name = "Times New Roman"
                r_51.font.size = Pt(12)

                # Tạo và chèn Bảng Lưu đồ 4 cột đồ họa trực quan (khối elip, hình chữ nhật, hình thoi, mũi tên loopback)
                fc_img_stream = None
                fc_data = data.get("flowchart_image_data")
                if fc_data and "base64," in fc_data:
                    try:
                        b64_str = fc_data.split("base64,")[1]
                        fc_img_stream = io.BytesIO(base64.b64decode(b64_str))
                    except Exception as eB64:
                        print("Error decoding flowchart_image_data:", eB64)

                if not fc_img_stream:
                    try:
                        fc_img_stream = generate_flowchart_table_image(eff_steps)
                    except Exception as eGen:
                        print("Error generating flowchart table image:", eGen)

                if fc_img_stream:
                    try:
                        p_fc = doc.add_paragraph()
                        p_fc.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        p_fc.paragraph_format.space_before = Pt(6)
                        p_fc.paragraph_format.space_after = Pt(14)
                        run_fc = p_fc.add_run()
                        run_fc.add_picture(fc_img_stream, width=Inches(6.25))
                    except Exception as ePic:
                        print("Could not add flowchart picture:", ePic)

                # 5.2 Diễn giải chi tiết
                p_52 = doc.add_paragraph()
                p_52.paragraph_format.space_before = Pt(14)
                p_52.paragraph_format.space_after = Pt(4)
                r_52 = p_52.add_run("5.2. Diễn giải chi tiết các bước thực hiện")
                r_52.bold = True
                r_52.font.name = "Times New Roman"
                r_52.font.size = Pt(11.5)

                for s_idx, stp in enumerate(eff_steps):
                    s_num = stp.get("step_number") or (s_idx + 1)
                    s_role = stp.get("assignee_role") or "---"
                    s_name = stp.get("name") or f"Bước {s_num}"
                    
                    p_st = doc.add_paragraph()
                    p_st.paragraph_format.space_before = Pt(6)
                    r_st = p_st.add_run(f"Bước {s_num}: {s_name}")
                    r_st.bold = True
                    r_st.font.name = "Times New Roman"

                    p_role = doc.add_paragraph()
                    p_role.paragraph_format.left_indent = Inches(0.25)
                    r_role = p_role.add_run(f"• Trách nhiệm thực hiện: {s_role}")
                    r_role.font.name = "Times New Roman"

                    p_work = doc.add_paragraph()
                    p_work.paragraph_format.left_indent = Inches(0.25)
                    r_work = p_work.add_run(f"• Nội dung: {s_role} chủ trì thực hiện {s_name.lower()} theo đúng quy trình.")
                    r_work.font.name = "Times New Roman"

        # Nếu là Mục 6 (Biểu mẫu)
        elif "6." in sec_name or "biểu mẫu" in sec_name.lower():
            # Lead-in câu dẫn bắt buộc
            p_lead = doc.add_paragraph()
            p_lead.paragraph_format.space_after = Pt(6)
            r_lead = p_lead.add_run("Toàn bộ các biểu mẫu phục vụ quy trình này phải được kiểm soát theo danh mục sau:")
            r_lead.font.name = "Times New Roman"
            r_lead.font.size = Pt(11)

            # Bảng biểu mẫu 5 cột chuẩn
            t_forms = doc.add_table(rows=1, cols=5)
            t_forms.alignment = WD_TABLE_ALIGNMENT.CENTER

            tblPr = t_forms._tbl.tblPr
            tblBorders = parse_xml(r'''
                <w:tblBorders xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                    <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                </w:tblBorders>
            ''')
            tblPr.append(tblBorders)

            tblLayout = parse_xml(r'<w:tblLayout xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:type="fixed"/>')
            tblPr.append(tblLayout)

            # Cấu hình gridCol và độ rộng cột chuẩn (tổng = 9026 dxa = 451.3 Pt vừa khít 100% lề in A4)
            cols_dxa = [2350, 3450, 1800, 1426]
            form_widths = [Pt(117.5), Pt(172.5), Pt(90), Pt(71.3)]
            grid_xml = '<w:tblGrid xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' + ''.join([f'<w:gridCol w:w="{d}"/>' for d in cols_dxa]) + '</w:tblGrid>'
            t_forms._tbl.append(parse_xml(grid_xml))

            form_hdrs = ["Mã hiệu biểu mẫu", "Tên biểu mẫu / Hồ sơ kiểm soát", "Nơi lưu trữ", "Thời hạn lưu"]
            
            r0 = t_forms.rows[0]
            trPr0 = r0._tr.get_or_add_trPr()
            trPr0.append(parse_xml(r'<w:tblHeader xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'))
            trPr0.append(parse_xml(r'<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'))

            for i, h_text in enumerate(form_hdrs):
                c = r0.cells[i]
                c.width = form_widths[i]
                c.text = h_text
                tcPr = c._tc.get_or_add_tcPr()
                tcPr.append(parse_xml(f'<w:tcW xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:w="{cols_dxa[i]}" w:type="dxa"/>'))
                tcPr.append(parse_xml(r'<w:vAlign xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:val="center"/>'))
                tcPr.append(parse_xml(r'<w:tcMar xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>'))
                for p in c.paragraphs:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    for run in p.runs:
                        run.bold = True
                        run.font.name = "Times New Roman"
                        run.font.size = Pt(11)
                        run.font.color.rgb = RGBColor(0, 0, 0)

            # Tách dòng hoặc tạo dòng mẫu
            form_rows_data = []

            # 1. Ưu tiên hàng đầu: Lấy từ mảng related_templates đã upload/cấu hình ở Tab Tài liệu liên quan
            rel_templates = data.get("related_templates") or data.get("templates") or []
            if rel_templates:
                for t in rel_templates:
                    t_code = (t.get("code") or "").strip()
                    t_name = (t.get("title") or t.get("name") or "").strip()
                    t_store = (t.get("storage_location") or "").strip()
                    t_ret = (t.get("retention_period") or "").strip()
                    if t_code or t_name:
                        form_rows_data.append({
                            "code": t_code,
                            "name": t_name or f"Biểu mẫu {t_code}",
                            "storage": t_store,
                            "retention": t_ret
                        })

            # 2. Nếu chưa có, phân tích từ sec_content
            if not form_rows_data and sec_content:
                clean_lines = re.sub(r'<[^>]+>', '\n', sec_content).split('\n')
                for line in clean_lines:
                    l = re.sub(r'^(?:(?:iso\s*[-_]\s*)?doc\s*[-_]\s*paragraph"?\s*(?:data\s*[-_]\s*p\s*[-_]\s*idx="?\d+"?)?>?|data\s*[-_]\s*p\s*[-_]\s*idx="?\d+"?>?)\s*[-–—:\s]*', '', line, flags=re.I).strip()
                    l = re.sub(r'^[-*•\d\.\s]+', '', l).strip()
                    l = re.sub(r'^(?:(?:iso\s*[-_]\s*)?doc\s*[-_]\s*paragraph"?\s*(?:data\s*[-_]\s*p\s*[-_]\s*idx="?\d+"?)?>?)\s*[-–—:\s]*', '', l, flags=re.I).strip()
                    l = re.sub(r'^[-*•\d\.\s]+', '', l).strip()
                    l_lower = l.lower()
                    is_hdr = bool(re.match(r'^(?:(?:6\.)?\s*biểu\s*mẫu(?:\s*đi\s*kèm)?\s*:?|toàn\s*bộ\s*các\s*biểu\s*mẫu.*|danh\s*mục\s*biểu\s*mẫu.*|stt\s+mã\s+biểu\s+mẫu.*)$', l_lower))
                    if l and not is_hdr:
                        parts = [p.strip() for p in re.split(r'\s*[-–—:]\s*', l) if p.strip()]
                        if len(parts) >= 3 and re.match(r'^(?:BM|HD|PL|SOP|WI|QD|QĐ)\d*', parts[1], re.I):
                            form_rows_data.append({"code": f"{parts[0]}-{parts[1]}", "name": " - ".join(parts[2:])})
                        elif len(parts) >= 2:
                            if re.match(r'^(?:BM|HD|PL|SOP|WI|QD|QĐ)\d*', parts[0], re.I):
                                form_rows_data.append({"code": f"{doc_code}-{parts[0]}", "name": " - ".join(parts[1:])})
                            else:
                                form_rows_data.append({"code": parts[0], "name": " - ".join(parts[1:])})
                        else:
                            form_rows_data.append({"code": "", "name": l})

            default_dept_clean = dept if (dept and "phòng" not in dept.lower() and dept != "---") else "ISO"

            # 3. Nếu vẫn chưa có, lấy từ cột phụ lục của steps_data
            if not form_rows_data:
                seen = set()
                for s in steps_data:
                    tf = s.get("template_files") or ""
                    if tf and tf != "---":
                        for item in re.split(r'[,;\n]+', tf):
                            item = item.strip()
                            if item and item not in seen:
                                seen.add(item)
                                fmt_c = f"{doc_code}-{item}" if re.match(r'^(?:BM|HD|PL)\d*', item, re.I) else item
                                form_rows_data.append({
                                    "code": fmt_c,
                                    "name": f"Biểu mẫu kiểm soát {s.get('name', '')}".strip()
                                })

            # 4. Mặc định dự phòng nếu chưa có bất kỳ biểu mẫu nào (theo chuẩn ảnh 2)
            if not form_rows_data:
                proc_name = doc_title or "Quy trình"
                form_rows_data = [
                    {"code": f"{doc_code}-BM01", "name": f"Biểu mẫu theo dõi {proc_name}", "storage": default_dept_clean, "retention": "12 tháng"},
                    {"code": f"{doc_code}-BM02", "name": "Phiếu ghi nhận thông tin/khiếu nại", "storage": "ISO", "retention": "12 tháng"},
                    {"code": f"{doc_code}-BM03", "name": "Biên bản xác minh thông tin", "storage": "ISO", "retention": "12 tháng"},
                    {"code": f"{doc_code}-BM04", "name": "Biên bản họp Hội đồng kỷ luật", "storage": "ISO", "retention": "12 tháng"}
                ]

            for f_idx, f_item in enumerate(form_rows_data):
                f_seq = f_idx + 1
                raw_c = (f_item.get("code") or f"{doc_code}-BM0{f_seq}").strip()
                if re.match(r'^(?:BM|HD|PL)\d*', raw_c, re.I):
                    f_c = f"{doc_code}-{raw_c}"
                else:
                    f_c = re.sub(r'\s*-\s*(BM|HD|PL)', r'-\1', raw_c)
                f_n = (f_item.get("name") or f"Biểu mẫu {f_seq}").strip()
                f_store = f_item.get("storage") or ("ISO" if (f_idx in [1, 2, 3] or "BM02" in f_c or "ISO" in f_c) else default_dept_clean)
                f_ret = f_item.get("retention") or "12 tháng"

                row = t_forms.add_row()
                trPr = row._tr.get_or_add_trPr()
                trPr.append(parse_xml(r'<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'))

                for i, w in enumerate(form_widths):
                    c = row.cells[i]
                    c.width = w
                    tcPr = c._tc.get_or_add_tcPr()
                    tcPr.append(parse_xml(f'<w:tcW xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:w="{cols_dxa[i]}" w:type="dxa"/>'))
                    tcPr.append(parse_xml(r'<w:vAlign xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:val="center"/>'))
                    tcPr.append(parse_xml(r'<w:tcMar xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>'))

                row.cells[0].text = f_c
                row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.LEFT
                
                row.cells[1].text = f_n
                row.cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.LEFT

                row.cells[2].text = f_store
                row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

                row.cells[3].text = f_ret
                row.cells[3].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

                for c in row.cells:
                    for p in c.paragraphs:
                        for run in p.runs:
                            apply_run_font(run, size=Pt(11))
                            run.font.color.rgb = RGBColor(0, 0, 0)

        else:
            # Các mục văn bản thông thường
            clean_text = re.sub(r'<[^>]+>', '\n', sec_content).strip()
            lines = [l.strip() for l in clean_text.split('\n') if l.strip()]
            if not lines:
                lines = ["(Nội dung thực hiện theo đúng quy định hiện hành)"]
            for l in lines:
                p_line = doc.add_paragraph()
                p_line.paragraph_format.space_after = Pt(4)
                r_line = p_line.add_run(l)
                r_line.font.name = "Times New Roman"
                r_line.font.size = Pt(11)

    # Đồng bộ Footer chuẩn: Trang bìa không footer, từ trang 2 hiển thị 4 trường trên 1 hàng (Mã hiệu | Lần ban hành | Ngày ban hành | Trang: PAGE/NUMPAGES)
    eff_code = (str(data.get("new_code") or "").strip() or 
                str(data.get("code") or "").strip() or 
                str(data.get("symbol") or "").strip() or 
                str(doc_code or "").strip() or 
                "G7.CL -QT01")
    eff_ver = version
    eff_date = issue_date
    rev_logs = data.get("revision_logs") or []
    if rev_logs:
        seq_nums = []
        for l in rev_logs:
            try:
                n = int(l.get("seq_no", 0))
                if n > 0:
                    seq_nums.append(n)
            except Exception:
                pass
        if seq_nums:
            eff_ver = str(max(seq_nums)).zfill(2)
        for l in reversed(rev_logs):
            d = str(l.get("rev_date") or "").strip()
            if d:
                eff_date = d
                break

    if "-" in eff_date and len(eff_date.split("-")) == 3:
        pts = eff_date.split("-")
        if len(pts[0]) == 4:
            eff_date = f"{pts[2]}/{pts[1]}/{pts[0]}"

    footer_xml_str = f"""<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:pPr>
    <w:pBdr>
      <w:top w:val="single" w:sz="6" w:space="4" w:color="000000"/>
    </w:pBdr>
    <w:tabs>
      <w:tab w:val="left" w:pos="3100"/>
      <w:tab w:val="left" w:pos="5900"/>
      <w:tab w:val="right" w:pos="9360"/>
    </w:tabs>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
    </w:rPr>
  </w:pPr>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:t>Mã hiệu: {eff_code}</w:t>
  </w:r>
  <w:r><w:tab/></w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:t>Lần ban hành: {eff_ver}</w:t>
  </w:r>
  <w:r><w:tab/></w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:t>Ngày ban hành: {eff_date}</w:t>
  </w:r>
  <w:r><w:tab/></w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:t xml:space="preserve">Trang: </w:t>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:fldChar w:fldCharType="begin"/>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:instrText xml:space="preserve"> PAGE </w:instrText>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:fldChar w:fldCharType="separate"/>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:t>1</w:t>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:fldChar w:fldCharType="end"/>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:t>/</w:t>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:fldChar w:fldCharType="begin"/>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:instrText xml:space="preserve"> NUMPAGES </w:instrText>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:fldChar w:fldCharType="separate"/>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:t>6</w:t>
  </w:r>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr>
    <w:fldChar w:fldCharType="end"/>
  </w:r>
</w:p>"""
    for s in doc.sections:
        s.different_first_page_header_footer = True
        for p in list(s.first_page_footer.paragraphs):
            p._element.getparent().remove(p._element)
        for t in list(s.first_page_footer.tables):
            t._element.getparent().remove(t._element)
        s.first_page_footer.add_paragraph()

        footer = s.footer
        for p in list(footer.paragraphs):
            p._element.getparent().remove(p._element)
        for t in list(footer.tables):
            t._element.getparent().remove(t._element)
        footer._element.append(parse_xml(footer_xml_str))

    repair_and_standardize_docx_structure(doc, export_meta)

    try:
        w_settings = doc.settings.element
        if w_settings.find(qn('w:updateFields')) is None:
            update_fields_el = parse_xml(r'<w:updateFields xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:val="true"/>')
            w_settings.append(update_fields_el)
    except Exception:
        pass

    # Xuất ra bộ nhớ đệm
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)

    filename = f"{doc_code}_{doc_title}.docx"
    safe_filename = urllib.parse.quote(filename.encode('utf-8'))
    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"
    }
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers=headers
    )


# ==============================================================================
# PHÂN HỆ XUẤT DỮ LIỆU QUY TRÌNH ISO: 1. EXCEL 3 CẤP & 2. THƯ MỤC ZIP HỒ SƠ G7
# ==============================================================================

def _get_export_processes_query(payload: dict, db: Session) -> List[ISOProcess]:
    """
    Truy vấn danh sách quy trình cần xuất theo scope ('current_page' hoặc 'all').
    """
    scope = payload.get("scope", "all")
    process_ids = payload.get("process_ids") or []

    query = (
        db.query(ISOProcess)
        .options(
            joinedload(ISOProcess.iso_document),
            selectinload(ISOProcess.sections),
            selectinload(ISOProcess.steps),
            selectinload(ISOProcess.documents)
        )
    )

    if scope in ("current_page", "selected") and process_ids:
        query = query.filter(ISOProcess.id.in_(process_ids))
    elif scope != "all" and process_ids:
        query = query.filter(ISOProcess.id.in_(process_ids))
    else:
        # Áp dụng bộ lọc nếu có
        search = (payload.get("search") or "").strip()
        doc_type = (payload.get("doc_type") or "").strip()
        dept_name = (payload.get("department_name") or "").strip()
        status = (payload.get("status") or "").strip()
        level = (payload.get("document_level") or "").strip()

        if status:
            query = query.filter(ISOProcess.status.ilike(f"%{status}%"))
        if dept_name:
            query = query.filter(ISOProcess.department_name.ilike(f"%{dept_name}%"))
        if level:
            query = query.filter(ISOProcess.document_level.ilike(f"%{level}%"))
        if doc_type:
            query = query.filter(
                (ISOProcess.doc_type_code.ilike(f"%{doc_type}%")) |
                (ISOProcess.symbol.ilike(f"%{doc_type}%")) |
                (ISOProcess.new_code.ilike(f"%{doc_type}%"))
            )
        if search:
            query = query.filter(
                (ISOProcess.name.ilike(f"%{search}%")) |
                (ISOProcess.code.ilike(f"%{search}%")) |
                (ISOProcess.new_code.ilike(f"%{search}%")) |
                (ISOProcess.editor.ilike(f"%{search}%")) |
                (ISOProcess.approver.ilike(f"%{search}%"))
            )

    procs = query.order_by(ISOProcess.new_code, ISOProcess.code).all()

    def _sort_key(p_obj):
        nc = (getattr(p_obj, "new_code", "") or getattr(p_obj, "code", "") or "").strip().upper()
        m = re.match(r"^G7\.([A-Z]+)\.([A-Z]+)(\d+)$", nc)
        if m:
            return (0, m.group(1), int(m.group(3)), m.group(2), p_obj.id or 0)
        return (1, nc, 999999, "", p_obj.id or 0)

    procs.sort(key=_sort_key)
    return procs


@router.post("/processes/export-excel")
async def export_processes_excel(payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Xuất danh mục quy trình ISO ra file Excel (.xlsx) phân tầng chuẩn 3 cấp:
    - Cấp 1: Mã của mục của tài liệu (CS, QT, HD, QĐ, BM...).
    - Cấp 2: Tài liệu gốc đang soạn thảo hiện hành.
    - Cấp 3: Các file/biểu mẫu đính kèm thuộc tài liệu gốc.
    Hỗ trợ Outline Grouping thu gọn/mở rộng [1], [2], [3] của Excel.
    """
    import io
    import urllib.parse
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    procs = _get_export_processes_query(payload, db)
    scope = payload.get("scope", "all")
    scope_label = "Trang hiện tại (Bộ lọc)" if scope == "current_page" else "Tất cả quy trình"

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "DANH MỤC TÀI LIỆU ISO"
    ws.views.sheetView[0].showGridLines = True
    ws.sheet_properties.outlinePr.summaryBelow = False
    ws.sheet_properties.outlinePr.summaryRight = False

    font_family = "Times New Roman"
    c_bronze = "7B5233"
    c_cream = "FAF7F2"
    c_sand_dark = "EADCC9"
    c_border_gray = "CBD5E1"

    thin_border_side = Side(border_style="thin", color=c_border_gray)
    box_border = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)

    # 1. Tiêu đề thương hiệu VINA G7
    ws.merge_cells("A1:N1")
    c1 = ws["A1"]
    c1.value = "CÔNG TY CỔ PHẦN VINA G7"
    c1.font = Font(name=font_family, size=13, bold=True, color=c_bronze)
    c1.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 22

    ws.merge_cells("A2:N2")
    c2 = ws["A2"]
    c2.value = "HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG TIÊU CHUẨN ISO 9001:2015"
    c2.font = Font(name=font_family, size=10.5, italic=True, color="64748B")
    c2.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[2].height = 18

    ws.merge_cells("A3:N3")
    c3 = ws["A3"]
    c3.value = "BẢNG DANH MỤC THEO DÕI HỆ THỐNG TÀI LIỆU QUY TRÌNH ISO"
    c3.font = Font(name=font_family, size=15, bold=True, color="0F172A")
    c3.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[3].height = 28

    ws.merge_cells("A4:N4")
    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    c4 = ws["A4"]
    c4.value = f"Thời gian xuất: {now_str}  |  Phạm vi xuất: {scope_label}  |  Tổng số tài liệu: {len(procs)}"
    c4.font = Font(name=font_family, size=10, italic=True, color="475569")
    c4.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[4].height = 18

    # 2. Cột bảng tính
    headers = [
        ("STT", 7, "center"),
        ("PHÂN CẤP", 15, "center"),
        ("MÃ HIỆU MỚI", 18, "center"),
        ("MÃ HIỆU CŨ", 15, "center"),
        ("TÊN TÀI LIỆU / TÊN FILE ĐÍNH KÈM", 75, "left"),
        ("PHÒNG BAN", 14, "center"),
        ("CẤP QUẢN LÝ", 14, "center"),
        ("LẦN BH", 10, "center"),
        ("NGÀY BAN HÀNH", 15, "center"),
        ("NGƯỜI BIÊN SOẠN", 20, "left"),
        ("NGƯỜI PHÊ DUYỆT", 20, "left"),
        ("TRẠNG THÁI", 14, "center"),
        ("SỐ TỆP ĐÍNH KÈM", 16, "center"),
        ("GHI CHÚ / PHẠM VI", 30, "left"),
    ]

    header_row = 6
    ws.row_dimensions[header_row].height = 26
    for col_idx, (h_title, h_width, h_align) in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=col_idx, value=h_title)
        cell.font = Font(name=font_family, size=10.5, bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color=c_bronze, end_color=c_bronze, fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = box_border
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = h_width

    # 3. Phân nhóm theo Cấp 1 (Mã mục / Loại tài liệu)
    DOC_TYPE_LABELS = {
        "CS": "CHÍNH SÁCH / CAM KẾT (CS)",
        "QT": "QUY TRÌNH QUẢN LÝ (QT)",
        "HD": "HƯỚNG DẪN CÔNG VIỆC (HD)",
        "QD": "QUY ĐỊNH / QUYẾT ĐỊNH (QĐ)",
        "BM": "BIỂU MẪU HỒ SƠ (BM)",
        "ST": "SỔ TAY CHẤT LƯỢNG (ST)",
        "SD": "SƠ ĐỒ TỔ CHỨC (SD)",
        "MT": "MỤC TIÊU CHẤT LƯỢNG (MT)",
        "TT": "THÔNG TƯ / VĂN BẢN (TT)",
    }

    groups = {}
    for p in procs:
        raw_code = (getattr(p, "doc_type_code", "") or getattr(p, "symbol", "") or "").strip().upper()
        if not raw_code:
            nc = (p.new_code or p.code or "").upper()
            m = re.search(r'\b(CS|QT|HD|QD|BM|ST|SD|MT|TT)\b', nc)
            raw_code = m.group(1) if m else "KHAC"
        if raw_code not in groups:
            groups[raw_code] = []
        groups[raw_code].append(p)

    order_pref = ["CS", "QT", "HD", "QD", "BM", "ST", "SD", "MT", "TT", "KHAC"]
    sorted_cat_keys = sorted(groups.keys(), key=lambda k: order_pref.index(k) if k in order_pref else 99)

    from sqlalchemy import text
    rows_roles = db.execute(text("SELECT id, name, description FROM roles")).fetchall()
    roles_map = {r[0]: (r[2] or r[1]) for r in rows_roles}

    current_row = 7
    global_stt = 0
    roman_numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]

    for cat_idx, cat_code in enumerate(sorted_cat_keys):
        cat_procs = groups[cat_code]
        cat_title = DOC_TYPE_LABELS.get(cat_code, f"MỤC {cat_code}")
        cat_num = roman_numerals[cat_idx] if cat_idx < len(roman_numerals) else f"{cat_idx+1}"

        # CẤP 1: Dòng Mã của Mục Tài Liệu
        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=len(headers))
        cat_cell = ws.cell(row=current_row, column=1)
        cat_cell.value = f"{cat_num}. {cat_code} - {cat_title} ({len(cat_procs)} tài liệu)"
        cat_cell.font = Font(name=font_family, size=11.5, bold=True, color="543821")
        cat_cell.fill = PatternFill(start_color=c_sand_dark, end_color=c_sand_dark, fill_type="solid")
        cat_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        for c_idx in range(1, len(headers) + 1):
            ws.cell(row=current_row, column=c_idx).border = box_border
        ws.row_dimensions[current_row].height = 25
        ws.row_dimensions[current_row].outlineLevel = 0
        current_row += 1

        # CẤP 2: Dòng Tài liệu gốc đang soạn thảo
        for proc in cat_procs:
            global_stt += 1
            p_code = proc.new_code or proc.code or ""
            p_old_code = proc.code if (proc.code and proc.code != p_code) else ""
            p_name = proc.name or ""
            p_dept = proc.department_name or roles_map.get(proc.department_id) or ""
            p_level = proc.document_level or "Cấp phòng"
            p_issuer = proc.editor or proc.owner or ""
            p_approver = proc.approver_bgd or proc.approver or ""
            p_status = proc.status or "Hiệu lực"
            p_notes = proc.notes or ""

            # Xác định Lần BH và Ngày ban hành từ nhật ký sửa đổi
            eff_ver = "01"
            eff_date = proc.issue_date or ""
            rev_logs = proc.revision_logs if hasattr(proc, 'revision_logs') and proc.revision_logs else []
            if rev_logs:
                seqs = [int(l.seq_no) for l in rev_logs if hasattr(l, 'seq_no') and str(l.seq_no).isdigit()]
                if seqs:
                    eff_ver = f"{max(seqs):02d}"
                for l in reversed(rev_logs):
                    if hasattr(l, 'rev_date') and l.rev_date:
                        eff_date = str(l.rev_date)
                        break

            if eff_date and "-" in eff_date and len(eff_date.split("-")) == 3:
                parts = eff_date.split("-")
                if len(parts[0]) == 4:
                    eff_date = f"{parts[2]}/{parts[1]}/{parts[0]}"

            # Đọc danh sách biểu mẫu / tài liệu đính kèm
            related_templates = []
            if hasattr(proc, 'sections'):
                for s in proc.sections:
                    if s.section_name == "__metadata_related_templates__" and s.content_html:
                        try:
                            parsed_tpls = json.loads(s.content_html)
                            if isinstance(parsed_tpls, list):
                                related_templates = parsed_tpls
                        except:
                            pass
                        break

            # Thêm các tệp đính kèm từ proc.documents (nếu có)
            if hasattr(proc, 'documents') and proc.documents:
                for doc_att in proc.documents:
                    related_templates.append({
                        "code": doc_att.code or "",
                        "title": doc_att.name or "",
                        "file_name": getattr(doc_att, "original_file_name", "") or os.path.basename(doc_att.file_path or ""),
                        "file_path": doc_att.file_path or "",
                        "note": "Biểu mẫu liên kết hệ thống"
                    })

            p_row = [
                global_stt,
                "[Gốc]",
                p_code,
                p_old_code,
                p_name,
                p_dept,
                p_level,
                eff_ver,
                eff_date,
                p_issuer,
                p_approver,
                p_status,
                len(related_templates),
                p_notes
            ]

            def _calc_row_height(text_val, width=65, base_h=25, line_h=18):
                if not text_val:
                    return base_h
                text_str = str(text_val)
                lines = 0
                for segment in text_str.split("\n"):
                    est_lines = max(1, (len(segment) + width - 1) // width)
                    lines += est_lines
                if lines <= 1:
                    return base_h
                return lines * line_h + 8

            h_proc = _calc_row_height(p_name, width=65, base_h=25, line_h=18)
            ws.row_dimensions[current_row].height = h_proc
            ws.row_dimensions[current_row].outlineLevel = 1

            for col_idx, val in enumerate(p_row, start=1):
                cell = ws.cell(row=current_row, column=col_idx, value=val)
                cell.font = Font(name=font_family, size=10.5, bold=(col_idx in (1, 2, 3, 5)))
                cell.border = box_border
                align_mode = headers[col_idx-1][2]
                cell.alignment = Alignment(horizontal=align_mode, vertical="center", wrap_text=True)

                if col_idx == 2:
                    cell.font = Font(name=font_family, size=10, bold=True, color=c_bronze)
                    cell.fill = PatternFill(start_color="F5EBE1", end_color="F5EBE1", fill_type="solid")
                elif col_idx == 3:
                    cell.font = Font(name=font_family, size=10.5, bold=True, color="1E3A8A")
                    cell.fill = PatternFill(start_color="F0F9FF", end_color="F0F9FF", fill_type="solid")
                elif col_idx == 12:
                    st_val = str(val or "").lower()
                    if "hiệu lực" in st_val:
                        cell.fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
                        cell.font = Font(name=font_family, size=10, bold=True, color="15803D")
                    elif "soạn thảo" in st_val:
                        cell.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
                        cell.font = Font(name=font_family, size=10, bold=True, color="B45309")
                    else:
                        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
                        cell.font = Font(name=font_family, size=10, color="475569")
                else:
                    cell.fill = PatternFill(start_color=c_cream, end_color=c_cream, fill_type="solid")

            current_row += 1

            # CẤP 3: Các dòng File đính kèm / Biểu mẫu (chỉ ghi khi thực sự có tài liệu/biểu mẫu đính kèm)
            if related_templates:
                for att_idx, tpl in enumerate(related_templates, start=1):
                    att_code = tpl.get("code") or f"BM{att_idx:02d}"
                    att_title = tpl.get("title") or tpl.get("name") or ""
                    att_fn = tpl.get("original_file_name") or tpl.get("file_name") or ""
                    if att_title and att_fn and att_title in att_fn:
                        display_fn = att_title
                    elif att_title:
                        display_fn = att_title
                    else:
                        display_fn = att_fn or "Biểu mẫu đính kèm"

                    att_scope = tpl.get("scope") or tpl.get("note") or "Tài liệu đính kèm kiểm soát"

                    sub_row = [
                        f"{global_stt}.{att_idx}",
                        "   └── Đính kèm",
                        att_code,
                        "",
                        f"   └── {display_fn}",
                        p_dept,
                        "",
                        "",
                        "",
                        "",
                        "",
                        "Đính kèm",
                        1,
                        att_scope
                    ]

                    h_att = _calc_row_height(f"   └── {display_fn}", width=65, base_h=23, line_h=17)
                    ws.row_dimensions[current_row].height = h_att
                    ws.row_dimensions[current_row].outlineLevel = 2

                    for col_idx, val in enumerate(sub_row, start=1):
                        cell = ws.cell(row=current_row, column=col_idx, value=val)
                        cell.font = Font(name=font_family, size=9.5, italic=(col_idx in (2, 4)))
                        cell.border = box_border
                        align_mode = headers[col_idx-1][2]
                        cell.alignment = Alignment(horizontal=align_mode, vertical="center", wrap_text=True)

                        if col_idx == 2:
                            cell.font = Font(name=font_family, size=9, italic=True, color="64748B")
                        elif col_idx == 5:
                            cell.font = Font(name=font_family, size=9.5, color="334155")
                        elif col_idx == 12:
                            cell.font = Font(name=font_family, size=9, color="64748B")
                        cell.fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

                    current_row += 1

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"Danh_Muc_Quy_Trinh_ISO_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    safe_filename = urllib.parse.quote(filename.encode('utf-8'))
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"}
    )


@router.post("/processes/export-folder-zip")
async def export_processes_folder_zip(payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Xuất gói thư mục ZIP 'Hồ Sơ G7' chuẩn hóa theo 4 cấp phân tầng:
    - Cấp 1: Thư mục gốc 'Hồ Sơ G7/'
    - Cấp 2: Thư mục theo Loại tài liệu:
        + '1. Quy trình (QT)/'
        + '2. Hướng dẫn (HD)/'
        + '3. Quy định (QD)/'
        + '4. Chính sách (CS)/'
        + '5. Biểu mẫu (BM)/'
        + '6. Khác/'
    - Cấp 3: Thư mục của từng tài liệu 'Mã hiệu - Tên tài liệu/'
    - Cấp 4:
        + File gốc: 'Mã hiệu - Tên tài liệu.docx'
        + File đính kèm: 'Mã biểu mẫu - Tên biểu mẫu.xlsx/.docx'
    """
    import io
    import zipfile
    import urllib.parse
    from modules.inspection.services.iso_file_service import generate_default_created_new_doc

    procs = _get_export_processes_query(payload, db)
    if not procs:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình nào phù hợp để xuất.")

    DOC_TYPE_FOLDER_MAP = {
        "QT": "1. Quy trình (QT)",
        "HD": "2. Hướng dẫn (HD)",
        "QD": "3. Quy định (QD)",
        "CS": "4. Chính sách (CS)",
        "BM": "5. Biểu mẫu (BM)",
        "ST": "6. Sổ tay (ST)",
        "SD": "7. Sơ đồ tổ chức (SD)",
        "MT": "8. Mục tiêu (MT)",
        "TT": "9. Thông tư (TT)",
    }

    zip_buf = io.BytesIO()

    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for proc in procs:
            # 1. Xác định Cấp 2: Thư mục Loại tài liệu
            raw_type = (getattr(proc, "doc_type_code", "") or getattr(proc, "symbol", "") or "").strip().upper()
            if not raw_type:
                nc = (proc.new_code or proc.code or "").upper()
                m = re.search(r'\b(CS|QT|HD|QD|BM|ST|SD|MT|TT)\b', nc)
                raw_type = m.group(1) if m else "KHAC"
            category_folder = DOC_TYPE_FOLDER_MAP.get(raw_type, f"Loại {raw_type}")

            # 2. Xác định Cấp 3: Thư mục của từng tài liệu 'Mã hiệu - Tên tài liệu'
            raw_code = (proc.new_code or proc.code or "").strip()
            raw_name = (proc.name or f"Quy_trinh_{proc.id}").strip()
            safe_code = re.sub(r'[/\\:*?"<>|]', '_', raw_code)
            safe_name = re.sub(r'[/\\:*?"<>|]', '_', raw_name)
            folder_title = f"{safe_code} - {safe_name}" if safe_code else safe_name
            folder_title = folder_title.strip()

            base_folder_path = f"Hồ Sơ G7/{category_folder}/{folder_title}"

            # 3. Cấp 4: Ghi File gốc (.docx/.doc)
            eff_ver = "01"
            eff_date = proc.issue_date or ""
            rev_logs = proc.revision_logs if hasattr(proc, 'revision_logs') and proc.revision_logs else []
            if rev_logs:
                seqs = [int(l.seq_no) for l in rev_logs if hasattr(l, 'seq_no') and str(l.seq_no).isdigit()]
                if seqs:
                    eff_ver = f"{max(seqs):02d}"
                for l in reversed(rev_logs):
                    if hasattr(l, 'rev_date') and l.rev_date:
                        eff_date = str(l.rev_date)
                        break

            doc_meta = {
                "doc_title": proc.name,
                "doc_code": raw_code,
                "issuer_name": proc.editor or proc.owner or "Ngô Diễm My",
                "approver_name": proc.approver or "Đặng Văn Nam",
                "approver_bgd": proc.approver_bgd or "Nguyễn Hòa",
                "document_level": proc.document_level or "Cấp phòng",
                "dept_name": proc.department_name,
                "version": eff_ver,
                "issue_date": str(eff_date or datetime.date.today().isoformat()),
            }

            try:
                main_file_data = None
                main_ext = ".docx"
                if proc.file_path:
                    resolved_file = resolve_iso_file_path(proc.file_path)
                    if resolved_file and os.path.exists(resolved_file):
                        _, ext_cand = os.path.splitext(resolved_file)
                        if ext_cand and len(ext_cand) <= 5:
                            main_ext = ext_cand.lower()
                        with open(resolved_file, "rb") as f_in:
                            main_file_data = f_in.read()

                if not main_file_data:
                    doc_tpl = generate_default_created_new_doc(doc_meta)
                    tmp_buf = io.BytesIO()
                    doc_tpl.save(tmp_buf)
                    main_file_data = tmp_buf.getvalue()

                main_file_path_in_zip = f"{base_folder_path}/{folder_title}{main_ext}"
                zf.writestr(main_file_path_in_zip, main_file_data)
            except Exception as eDoc:
                print(f"Lỗi sinh file chính cho {proc.id}: {eDoc}")

            # 4. Cấp 4: Thu thập và ghi các File đính kèm liên quan
            related_templates = []
            if hasattr(proc, 'sections'):
                for s in proc.sections:
                    if s.section_name == "__metadata_related_templates__" and s.content_html:
                        try:
                            parsed_tpls = json.loads(s.content_html)
                            if isinstance(parsed_tpls, list):
                                related_templates.extend(parsed_tpls)
                        except:
                            pass
                        break

            if hasattr(proc, 'documents') and proc.documents:
                for doc_att in proc.documents:
                    related_templates.append({
                        "code": doc_att.code or "",
                        "title": doc_att.name or "",
                        "file_path": doc_att.file_path or "",
                        "original_file_name": getattr(doc_att, "original_file_name", "") or os.path.basename(doc_att.file_path or "")
                    })

            # Ghi từng file đính kèm vào đúng thư mục con của tài liệu
            seen_att_names = set()
            for att_idx, tpl in enumerate(related_templates, start=1):
                att_fp = tpl.get("file_path") or ""
                if not att_fp:
                    continue
                resolved_att = resolve_iso_file_path(att_fp)
                if resolved_att and os.path.exists(resolved_att):
                    try:
                        ext = os.path.splitext(resolved_att)[1] or ".docx"
                        att_code = tpl.get("code") or f"BM{att_idx:02d}"
                        att_title = tpl.get("title") or tpl.get("name") or ""
                        att_fn = tpl.get("original_file_name") or tpl.get("file_name") or ""

                        if att_title and att_fn and att_title in att_fn:
                            title_text = att_title
                        elif att_title:
                            title_text = att_title
                        else:
                            title_text = att_fn or "Biểu mẫu đính kèm"

                        if title_text.lower().endswith(ext.lower()):
                            title_text = title_text[:-len(ext)]
                        title_text = title_text.strip()

                        # Chuẩn hóa tên file: Mã biểu mẫu - Tên biểu mẫu
                        if title_text.startswith(f"[{att_code}]"):
                            clean_t = title_text[len(f"[{att_code}]"):].strip(" -_")
                            raw_att_fn = f"{att_code} - {clean_t}{ext}" if clean_t else f"{att_code}{ext}"
                        elif title_text.startswith(f"{att_code} -"):
                            raw_att_fn = f"{title_text}{ext}"
                        elif title_text.startswith(att_code):
                            clean_t = title_text[len(att_code):].strip(" -_")
                            raw_att_fn = f"{att_code} - {clean_t}{ext}" if clean_t else f"{att_code}{ext}"
                        else:
                            raw_att_fn = f"{att_code} - {title_text}{ext}" if att_code else f"{title_text}{ext}"

                        clean_att_fn = re.sub(r'[/\\:*?"<>|]', '_', raw_att_fn)

                        # Tránh trùng tên trong zip
                        if clean_att_fn in seen_att_names:
                            clean_att_fn = f"{att_idx}_{clean_att_fn}"
                        seen_att_names.add(clean_att_fn)

                        with open(resolved_att, "rb") as af:
                            zf.writestr(f"{base_folder_path}/{clean_att_fn}", af.read())
                    except Exception as eAtt:
                        print(f"Lỗi ghi file đính kèm {att_fp}: {eAtt}")

                # Tệp con đính kèm (sub_files) nếu có
                sub_files = tpl.get("sub_files") or []
                if isinstance(sub_files, list):
                    for sub_idx, sub in enumerate(sub_files, start=1):
                        sub_fp = sub.get("file_path") or ""
                        if sub_fp:
                            res_sub = resolve_iso_file_path(sub_fp)
                            if res_sub and os.path.exists(res_sub):
                                try:
                                    sub_fn = sub.get("file_name") or os.path.basename(res_sub)
                                    clean_sub_fn = re.sub(r'[/\\:*?"<>|]', '_', sub_fn)
                                    zf.writestr(f"{base_folder_path}/{clean_sub_fn}", open(res_sub, "rb").read())
                                except Exception as eSub:
                                    print(f"Lỗi ghi sub file {sub_fp}: {eSub}")

    zip_buf.seek(0)
    zip_filename = f"Ho_So_G7_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    safe_zip_filename = urllib.parse.quote(zip_filename.encode('utf-8'))

    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_zip_filename}"}
    )



