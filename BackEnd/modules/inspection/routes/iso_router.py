import os
import uuid
import datetime
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
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
    allowed_exts = (".docx", ".doc", ".pdf", ".xlsx", ".xls")
    if not any(filename_lower.endswith(ext) for ext in allowed_exts):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng file PDF, Word (.doc, .docx) hoặc Excel (.xls, .xlsx)")

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
            "file_path": relative_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu file đính kèm: {str(e)}")


@router.post("/upload")
async def upload_iso_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    [POST] Tải lên file .docx tài liệu ISO và phân tích trích xuất dữ liệu thô.
    """
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".docx") or filename_lower.endswith(".doc")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng file Word (.doc, .docx)")
        
    if filename_lower.endswith(".doc"):
        raise HTTPException(status_code=400, detail="Hệ thống chỉ hỗ trợ phân tích tự động định dạng Word (.docx). Vui lòng chuyển đổi tệp (.doc) sang (.docx) trước khi tải lên.")

    # Lưu file tạm thời
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu file: {str(e)}")

    # Phân tích file Word
    try:
        parsed_data = parse_iso_docx(file_path)
        # Bổ sung đường dẫn file phục vụ lưu trữ sau này
        parsed_data["file_path"] = file_path.replace("\\", "/")
        
        # Nếu không bóc tách được mã quy trình từ nội dung file, tự động trích xuất từ tên tệp tin gốc
        if (not parsed_data.get("code") or parsed_data.get("code").strip() == "") and file.filename:
            import re
            filename_clean = os.path.splitext(file.filename)[0]
            filename_clean = re.sub(r'\s+', ' ', filename_clean)
            match = re.search(r'^([A-Z0-9\s._-]+?)(?:_|\s+Quy trình|\s+Mẫu|\s+QT|\s+qt|$)', filename_clean, re.IGNORECASE)
            if match and len(match.group(1).strip()) >= 3:
                parsed_data["code"] = match.group(1).strip()
            else:
                parsed_data["code"] = filename_clean[:15].strip()

        # Trích xuất toàn bộ nội dung HTML nguyên bản có cấu trúc kèm bảng biểu và hình ảnh
        try:
            from modules.inspection.services.iso_file_service import parse_docx_to_html_and_headings
            docx_html_data = parse_docx_to_html_and_headings(file_path)
            parsed_data["html_content"] = docx_html_data.get("html_content", "")
            parsed_data["headings"] = docx_html_data.get("headings", [])
        except Exception as e_html:
            print(f"[upload_iso_document] Warning parse html: {e_html}")
                
        return parsed_data
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích cú pháp tài liệu: {str(e)}")


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
        doc.file_path = payload.get("file_path", doc.file_path)
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
    if edit_note:
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
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu quy trình")

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
        "version": doc.version,
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

def _resolve_dept_acronym(role_name: str, desc: str = "") -> str:
    name_upper = (role_name or "").upper().strip()
    desc_upper = (desc or "").upper().strip()
    comb = f"{name_upper} {desc_upper}"
    if "QLCL" in comb or "CHẤT LƯỢNG" in comb or "ISO" in comb:
        return "QL"
    if "BGD" in comb or "GIÁM ĐỐC" in comb:
        return "BG"
    if "IT" in name_upper or "CÔNG NGHỆ THÔNG TIN" in comb:
        return "IT"
    if "HCNS" in comb or "HÀNH CHÍNH" in comb or "NHÂN SỰ" in comb:
        return "HC"
    if "SX" in name_upper or "SẢN XUẤT" in comb:
        return "SX"
    if "KETOAN" in name_upper or "KẾ TOÁN" in comb:
        return "KT"
    if "KỸ THUẬT" in comb or "CƠ ĐIỆN" in comb or name_upper == "KT":
        return "KT"
    if "MH" in name_upper or "MUA HÀNG" in comb or "VẬT TƯ" in comb:
        return "MH"
    if "KHO" in comb or "KHO VẬN" in comb:
        return "KH"
    if "KD" in name_upper or "KINH DOANH" in comb:
        return "KD"
    return name_upper[:2] if len(name_upper) >= 2 else "QL"


@router.get("/meta/departments")
def get_iso_meta_departments(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách phòng ban từ CSDL (bảng roles) phục vụ chọn khi tạo/sửa quy trình mới.
    """
    from modules.auth.models.permissions import Permission
    from modules.auth.models.role import Role
    
    roles = db.query(Role).filter(Role.is_active == True).order_by(Role.id).all()
    result = []
    skip_roles = ["Quản Lý", "Tổ Trưởng"]
    for r in roles:
        if r.name in skip_roles:
            continue
        full_name = r.description if r.description and r.description.strip() else r.name
        code_2 = _resolve_dept_acronym(r.name, r.description or "")
        result.append({
            "id": r.id,
            "name": full_name,
            "code": code_2,
            "role_name": r.name
        })
    return result


@router.get("/approvers/department-heads")
def get_iso_department_heads(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách Người duyệt có Vị trí là Trưởng phòng.
    """
    from modules.auth.models.accounts import Account
    from modules.auth.models.permissions import Permission
    from modules.auth.models.role import Role
    from modules.auth.models.departments import Department
    
    roles_map = {r.id: r.name for r in db.query(Role).all()}
    depts_map = {d.id: d.name for d in db.query(Department).all()}
    
    tp_perms = db.query(Permission).filter(Permission.name.ilike("%Trưởng Phòng%")).all()
    tp_perm_ids = [p.id for p in tp_perms]
    
    query = db.query(Account).filter(
        (Account.permission_id.in_(tp_perm_ids)) |
        (Account.permission_level.ilike("%Trưởng Phòng%"))
    )
    accounts = query.all()
    
    result = []
    for a in accounts:
        d_name = depts_map.get(a.department_id, "")
        r_name = roles_map.get(getattr(a, "role_id", None), "")
        dept_display = d_name or r_name or "Phòng ban"
        
        result.append({
            "id": a.id,
            "username": a.username,
            "full_name": a.full_name,
            "department_id": a.department_id,
            "department_name": d_name,
            "role_name": r_name,
            "display_name": f"{a.full_name} ({dept_display})" if a.full_name else a.username
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
    query = db.query(ISOProcess)
    if status:
        query = query.filter(ISOProcess.status.ilike(f"%{status.strip()}%"))
    procs = query.order_by(ISOProcess.code).all()
    result = []
    for p in procs:
        result.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "department_id": p.department_id,
            "department_name": p.department_name,
            "file_path": p.file_path,
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
    code = payload.get("code")
    name = payload.get("name")
    iso_doc_id = payload.get("iso_document_id")

    if not code or not name:
        raise HTTPException(status_code=400, detail="Mã quy trình và Tên quy trình không được bỏ trống")

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Kiểm tra khuôn mẫu ISO gốc (nếu có chọn)
    iso_doc = None
    if iso_doc_id is not None and iso_doc_id != "":
        try:
            iso_doc = db.query(ISODocument).filter(ISODocument.id == int(iso_doc_id)).first()
        except:
            iso_doc = None

    # Kiểm tra trùng mã code nếu tạo mới
    is_new_proc = (proc_id is None or proc_id == "" or proc_id == "new")
    if is_new_proc:
        existing = db.query(ISOProcess).filter(ISOProcess.code == code).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Mã quy trình áp dụng '{code}' đã tồn tại trong hệ thống")
        
        proc = ISOProcess(
            code=code,
            name=name,
            iso_document_id=int(iso_doc_id) if (iso_doc_id is not None and iso_doc_id != "") else None,
            department_id=payload.get("department_id"),
            department_name=payload.get("department_name", ""),
            file_path=payload.get("file_path", ""),
            owner=payload.get("owner", ""),
            editor=payload.get("editor", ""),
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
            new_code=payload.get("new_code", ""),
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

        existing = db.query(ISOProcess).filter(ISOProcess.code == code, ISOProcess.id != int(proc_id)).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Mã quy trình áp dụng '{code}' đã tồn tại ở một quy trình khác")

        # Cập nhật thông tin chung
        proc.code = code
        proc.name = name
        if "iso_document_id" in payload:
            proc.iso_document_id = int(payload["iso_document_id"]) if payload["iso_document_id"] else None
        if "department_id" in payload:
            proc.department_id = payload.get("department_id")
        if "department_name" in payload:
            proc.department_name = payload.get("department_name")
        if "new_code" in payload:
            proc.new_code = payload.get("new_code")
        if "doc_type_id" in payload:
            proc.doc_type_id = payload.get("doc_type_id")
        if "doc_type_code" in payload:
            proc.doc_type_code = payload.get("doc_type_code")
        if "file_path" in payload:
            proc.file_path = payload.get("file_path")
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
            
            transition = step.get("transition")
            transition_str = json.dumps(transition) if transition is not None else step.get("transition_json", "")

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
            if iso_doc and iso_doc.revision_logs:
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

        # Kiểm tra dòng cuối cùng có trùng lặp tuyệt đối với cùng nội dung và ngày sửa không
        last_log = revision_logs[-1] if revision_logs else None
        is_exact_dup = (
            last_log and 
            last_log.get("rev_date") == now_date and 
            last_log.get("content") == edit_note and 
            last_log.get("page_no") == edit_page_no and
            last_log.get("modifier") == editor_name
        )

        if not is_exact_dup:
            next_seq = len(revision_logs) + 1
            revision_logs.append({
                "seq_no": next_seq,
                "rev_date": now_date,
                "content": edit_note,
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
            tpl_note = tpl.get("note") or ""
            doc_id = tpl.get("doc_id")

            # Chuẩn hóa mã biểu mẫu: luôn lấy theo định dạng (Mã QT_người dùng nhập)
            if tpl_code and not tpl_code.startswith(f"{proc.code}_"):
                tpl_code = f"{proc.code}_{tpl_code}"

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
                existing_doc.notes = tpl_note
                existing_doc.folder = proc.department_name or proc.code
                existing_doc.document_level = proc.document_level or "Cấp phòng"
                existing_doc.issuer = proc.editor or proc.owner or existing_doc.issuer
                existing_doc.approver = proc.approver or existing_doc.approver
                existing_doc.approver_bgd = proc.approver_bgd or getattr(existing_doc, "approver_bgd", "")
                existing_doc.updated_at = now_str
                kept_doc_ids.append(existing_doc.id)
            else:
                new_doc = ISODocument(
                    code=tpl_code,
                    name=tpl_title or f"Biểu mẫu {tpl_code}",
                    process_id=proc.id,
                    file_path=tpl_file,
                    notes=tpl_note,
                    version="01",
                    issue_date=proc.issue_date or now_str[:10],
                    issuer=proc.editor or proc.owner or "Administrator",
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
        return {
            "id": proc.id,
            "code": proc.code,
            "name": proc.name,
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
    candidates = [
        os.path.join(BASE_ISO_DIR, file_path),
        os.path.join("BackEnd", file_path),
        os.path.join("..", file_path),
        os.path.join(os.getcwd(), file_path)
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
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình thực tế")

    # Tự động đồng bộ nội dung ăn theo file nếu quy trình chưa có nội dung thực tế hoặc chỉ có placeholder
    has_real_sections = False
    if proc.sections:
        for s in proc.sections:
            cnt = (s.content_html or "").strip()
            if cnt and "Chuẩn bị sẵn sàng" not in cnt:
                has_real_sections = True
                break

    if not has_real_sections and proc.file_path:
        resolved_file = resolve_iso_file_path(proc.file_path)
        if resolved_file and os.path.exists(resolved_file):
            try:
                from modules.inspection.services.iso_parser import parse_iso_docx
                parsed = parse_iso_docx(resolved_file) if resolved_file.lower().endswith(('.docx', '.doc')) else {}
                parsed_secs = parsed.get("sections", {})
                parsed_steps = parsed.get("steps", [])
                if parsed_secs:
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
                    db.commit()
                    db.refresh(proc)
            except Exception as e:
                db.rollback()
                print(f"Lỗi tự động parse file cho quy trình {proc.id}: {e}")

    # Nhật ký sửa đổi
    revision_logs = []
    logs_to_use = proc.revision_logs if proc.revision_logs else (proc.iso_document.revision_logs if proc.iso_document else [])
    revision_logs = [
        {
            "seq_no": l.seq_no,
            "rev_date": l.rev_date,
            "content": l.content,
            "page_no": l.page_no,
            "modifier": l.modifier or "Hệ thống"
        }
        for l in sorted(logs_to_use, key=lambda x: x.seq_no or 0)
    ]

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
            "flow_node_id": st.flow_node_id
        })

    # Danh sách mẫu biểu mẫu liên quan (ISODocument con) thuộc quy trình này
    related_templates = []
    for doc in (proc.documents or []):
        fname = os.path.basename(doc.file_path) if doc.file_path else ""
        related_templates.append({
            "id": f"doc_{doc.id}",
            "doc_id": doc.id,
            "code": doc.code,
            "title": doc.name,
            "scope": "Tất cả",
            "note": doc.notes or "",
            "file_name": fname,
            "file_path": doc.file_path or ""
        })

    if not related_templates and sections.get("__metadata_related_templates__"):
        try:
            sec_tpls = json.loads(sections.get("__metadata_related_templates__"))
            if isinstance(sec_tpls, list):
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
        "version": getattr(proc.iso_document, "version", "01") if proc.iso_document else "01",
        "issue_date": proc.issue_date or "",
        "department_name": proc.department_name or "",
        "editor": proc.editor or proc.owner or "",
        "approver": proc.approver or "",
        "approver_bgd": getattr(proc, "approver_bgd", "") or ""
    }

    return {
        "id": proc.id,
        "code": proc.code,
        "name": proc.name,
        "file_path": proc.file_path,
        "file_name": os.path.basename(proc.file_path) if proc.file_path else "",
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
        "issue_date": proc.issue_date,
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
    safe_name = (doc_obj.name or "Tai_lieu").replace("/", "_").replace("\\", "_")
    download_filename = f"{safe_code}_{safe_name}{ext}"

    return FileResponse(
        path=resolved_path,
        filename=download_filename,
        media_type="application/octet-stream"
    )


@router.get("/processes/{id}/download-raw")
def download_raw_iso_process(id: int, db: Session = Depends(get_db)):
    """
    [GET] Tải tệp tin gốc (raw file Word/PDF) của quy trình ISO thực tế.
    """
    from fastapi.responses import FileResponse
    from modules.inspection.services.iso_file_service import BASE_ISO_DIR

    proc_obj = db.query(ISOProcess).filter(ISOProcess.id == id).first()
    if not proc_obj or not proc_obj.file_path:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp tin gốc của quy trình này")

    resolved_path = proc_obj.file_path
    if resolved_path and not os.path.exists(resolved_path):
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

    ext = os.path.splitext(resolved_path)[1]
    safe_code = (proc_obj.code or "QT").replace("/", "_").replace("\\", "_")
    safe_name = (proc_obj.name or "Quy_trinh").replace("/", "_").replace("\\", "_")
    download_filename = f"{safe_code}_{safe_name}{ext}"

    return FileResponse(
        path=resolved_path,
        filename=download_filename,
        media_type="application/octet-stream"
    )


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
    db: Session = Depends(get_db)
):
    """
    [GET] Sinh mã quy trình gợi ý tiếp theo dạng G7.xx.yy.zz
    xx: 2 ký tự viết tắt của phòng ban
    yy: 2 ký tự viết tắt của loại hồ sơ
    zz: số tự tăng 2 chữ số (01, 02...)
    """
    import re
    dept = (department_code or "QL").strip().upper()[:2]
    dtype = (doc_type_code or "QT").strip().upper()[:2]
    prefix = f"G7.{dept}.{dtype}."
    
    existing_codes = db.query(ISOProcess.new_code).filter(
        ISOProcess.new_code.like(f"{prefix}%")
    ).all()
    
    max_num = 0
    for (c,) in existing_codes:
        if c:
            m = re.search(rf"^{re.escape(prefix)}(\d+)", c)
            if m:
                try:
                    num = int(m.group(1))
                    if num > max_num:
                        max_num = num
                except:
                    pass
    
    next_num_str = f"{max_num + 1:02d}"
    return {
        "prefix": prefix,
        "next_code": f"{prefix}{next_num_str}",
        "seq": max_num + 1
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

    doc_title = (data.get("name") or "QUY TRÌNH").strip().upper()
    doc_code = (data.get("code") or data.get("new_code") or "G7.QL.QT10").strip()
    issue_date = (data.get("issue_date") or datetime.date.today().strftime("%Y-%m-%d")).strip()
    version = (data.get("version") or "01").strip()
    dept = (data.get("folder") or data.get("department_name") or "Ban Quản trị Chất lượng & ISO (QLCL)").strip()
    issuer = data.get("issuer") or "Administrator"
    approver = data.get("approver") or "Đặng Minh Tuấn"

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

    # Cập nhật Table 0 (Trang bìa)
    if doc.tables:
        t0 = doc.tables[0]
        if len(t0.rows) > 1:
            c1 = t0.rows[1].cells[0]
            for p in list(c1.paragraphs):
                p._element.getparent().remove(p._element)
            
            p_space = c1.add_paragraph()
            p_space.paragraph_format.space_before = Pt(16)
            
            p_title = c1.add_paragraph()
            p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_title.paragraph_format.space_before = Pt(0)
            p_title.paragraph_format.space_after = Pt(0)
            r_title = p_title.add_run(doc_title)
            r_title.bold = True
            r_title.font.name = "Times New Roman"
            r_title.font.size = Pt(17)
            r_title.font.color.rgb = RGBColor(0, 0, 0)
            
            p_m_space = c1.add_paragraph()
            p_m_space.paragraph_format.space_before = Pt(14)

            meta_lines = [
                f"Mã hiệu:              {doc_code}",
                f"Lần ban hành:         {version}",
                f"Ngày ban hành:        {issue_date}",
                f"Bộ phận thực hiện:    {dept}"
            ]
            for ml in meta_lines:
                p_m = c1.add_paragraph()
                p_m.paragraph_format.left_indent = Inches(1.2)
                p_m.paragraph_format.space_before = Pt(0)
                p_m.paragraph_format.space_after = Pt(2)
                r_m = p_m.add_run(ml)
                r_m.bold = "Mã hiệu" in ml
                r_m.font.name = "Times New Roman"
                r_m.font.size = Pt(10.5)

            # Thêm chính xác 9 dòng trống theo đúng yêu cầu
            for _ in range(9):
                p_blank = c1.add_paragraph()
                p_blank.paragraph_format.space_before = Pt(0)
                p_blank.paragraph_format.space_after = Pt(0)
                r_blank = p_blank.add_run()
                r_blank.font.name = "Times New Roman"
                r_blank.font.size = Pt(11)

        if len(t0.rows) > 3:
            r3 = t0.rows[3]
            if len(r3.cells) >= 3:
                r3.cells[1].text = issuer
                r3.cells[2].text = "Người soạn thảo"
                for c in [r3.cells[1], r3.cells[2]]:
                    for p in c.paragraphs:
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        p.paragraph_format.space_before = Pt(0)
                        p.paragraph_format.space_after = Pt(0)
                        for run in p.runs:
                            run.font.name = "Times New Roman"
                            run.font.size = Pt(11)

        if len(t0.rows) > 4:
            r4 = t0.rows[4]
            if len(r4.cells) >= 3:
                r4.cells[1].text = approver
                r4.cells[2].text = "Trưởng Phòng"
                for c in [r4.cells[1], r4.cells[2]]:
                    for p in c.paragraphs:
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        p.paragraph_format.space_before = Pt(0)
                        p.paragraph_format.space_after = Pt(0)
                        for run in p.runs:
                            run.font.name = "Times New Roman"
                            run.font.size = Pt(11)

        # Cấu hình chiều cao hàng chuẩn để trang bìa nằm trọn 100% trong Trang 1, khớp chính xác Ảnh 2
        if len(t0.rows) > 0:
            t0.rows[0].height = Pt(85)
        if len(t0.rows) > 1:
            t0.rows[1].height = None
        if len(t0.rows) > 2:
            t0.rows[2].height = Pt(30)
        if len(t0.rows) > 3:
            t0.rows[3].height = Pt(65)
        if len(t0.rows) > 4:
            t0.rows[4].height = Pt(65)

        for row in t0.rows:
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(r'<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'))

    # Đảm bảo tiêu đề "THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU" luôn ngắt sang đầu trang 2 độc lập
    for p in doc.paragraphs:
        p_txt = p.text.strip().upper()
        if "THEO DÕI SỬA ĐỔI" in p_txt or "THEO DOI SUA DOI" in p_txt:
            p.paragraph_format.page_break_before = True
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(8)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in p.runs:
                run.bold = True
                run.font.name = "Times New Roman"
                run.font.size = Pt(12)

    # Cập nhật Table 1 (Theo dõi sửa đổi)
    if len(doc.tables) > 1:
        t1 = doc.tables[1]
        rev_logs = data.get("revision_logs") or [
            {"seq_no": 1, "rev_date": issue_date, "content": "Ban hành lần đầu", "page_no": "Toàn bộ"}
        ]
        for idx, log in enumerate(rev_logs):
            row_idx = idx + 1
            if row_idx < len(t1.rows):
                r = t1.rows[row_idx]
                r.cells[0].text = str(log.get("seq_no", idx + 1)).zfill(2)
                r.cells[1].text = str(log.get("rev_date", issue_date))
                r.cells[2].text = str(log.get("content", "Ban hành lần đầu"))
                r.cells[3].text = str(log.get("page_no", "Toàn bộ"))
                for c in r.cells:
                    for p in c.paragraphs:
                        for run in p.runs:
                            run.font.name = "Times New Roman"
                            run.font.size = Pt(10.5)

        for row in t1.rows:
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(r'<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'))

    # Dọn dẹp các đoạn văn bản trắng thừa ở cuối template trước khi thêm trang mới để không bị dư trang
    while len(doc.paragraphs) > 0 and not doc.paragraphs[-1].text.strip():
        p_last = doc.paragraphs[-1]
        p_last._element.getparent().remove(p_last._element)

    # Bổ sung nội dung quy trình từ Trang 3 trở đi
    doc.add_page_break()

    sections_data = data.get("sections") or {}
    steps_data = data.get("steps") or []

    # Danh mục mục mặc định nếu chưa có
    sec_keys = [k for k in sections_data.keys() if not k.startswith("__")]
    if not sec_keys:
        sec_keys = ["1. Mục đích", "2. Phạm vi", "3. Tài liệu viện dẫn", "4. Định nghĩa", "5. Nội dung", "6. Biểu mẫu đi kèm"]

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
            if steps_data:
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
                        fc_img_stream = generate_flowchart_table_image(steps_data)
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

                for s_idx, stp in enumerate(steps_data):
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
            cols_dxa = [560, 2200, 3360, 2040, 866]
            form_widths = [Pt(28), Pt(110), Pt(168), Pt(102), Pt(43.3)]
            grid_xml = '<w:tblGrid xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' + ''.join([f'<w:gridCol w:w="{d}"/>' for d in cols_dxa]) + '</w:tblGrid>'
            t_forms._tbl.append(parse_xml(grid_xml))

            form_hdrs = ["STT", "Mã biểu mẫu", "Tên biểu mẫu", "Nơi lưu trữ", "Thời hạn lưu"]
            
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
                tcPr.append(parse_xml(r'<w:shd xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:fill="F1F5F9" w:val="clear"/>'))
                tcPr.append(parse_xml(r'<w:vAlign xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:val="center"/>'))
                tcPr.append(parse_xml(r'<w:tcMar xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>'))
                for p in c.paragraphs:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    for run in p.runs:
                        run.bold = True
                        run.font.name = "Times New Roman"
                        run.font.size = Pt(10.5)

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
                            form_rows_data.append({"code": f"{parts[0]} - {parts[1]}", "name": " - ".join(parts[2:])})
                        elif len(parts) >= 2:
                            if re.match(r'^(?:BM|HD|PL|SOP|WI|QD|QĐ)\d*', parts[0], re.I):
                                form_rows_data.append({"code": f"{doc_code} - {parts[0]}", "name": " - ".join(parts[1:])})
                            else:
                                form_rows_data.append({"code": parts[0], "name": " - ".join(parts[1:])})
                        else:
                            form_rows_data.append({"code": "", "name": l})

            default_dept_clean = dept if (dept and "phòng" not in dept.lower() and dept != "---") else "Ban Quản trị Chất lượng & ISO (QLCL)"

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
                                fmt_c = f"{doc_code} - {item}" if re.match(r'^(?:BM|HD|PL)\d*', item, re.I) else item
                                form_rows_data.append({
                                    "code": fmt_c,
                                    "name": f"Biểu mẫu kiểm soát {s.get('name', '')}".strip()
                                })

            # 4. Mặc định dự phòng nếu chưa có bất kỳ biểu mẫu nào
            if not form_rows_data:
                proc_name = doc_title or "Quy trình đào tạo"
                form_rows_data = [
                    {"code": f"{doc_code} - BM01", "name": f"Biểu mẫu theo dõi {proc_name}"},
                    {"code": f"{doc_code} - BM02", "name": f"Phiếu kiểm tra {proc_name}"},
                    {"code": f"{doc_code} - BM03", "name": "Sổ tổng hợp và lưu trữ dữ liệu quy trình định kỳ"},
                    {"code": f"{doc_code} - HD01", "name": f"Hướng dẫn thực hiện {proc_name}"}
                ]

            for f_idx, f_item in enumerate(form_rows_data):
                f_seq = f_idx + 1
                f_c = f_item.get("code") or f"{doc_code} - BM0{f_seq}"
                f_n = f_item.get("name") or f"Biểu mẫu {f_seq}"
                if re.match(r'^(?:BM|HD|PL)\d*', f_c, re.I):
                    f_c = f"{doc_code} - {f_c}"
                f_store = f_item.get("storage") or ("Ban ISO / QLCL" if (f_idx == 1 or "BM02" in f_c or "ISO" in f_c) else default_dept_clean)
                f_ret = f_item.get("retention") or ("05 năm" if (f_idx in [1, 3] or "BM02" in f_c or "HD" in f_c or "ISO" in f_c) else "03 năm")

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

                row.cells[0].text = str(f_seq)
                row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
                
                row.cells[1].text = f_c
                row.cells[1].paragraphs[0].runs[0].bold = True
                row.cells[1].paragraphs[0].runs[0].font.color.rgb = RGBColor(3, 105, 161)

                row.cells[2].text = f_n
                row.cells[3].text = f_store
                row.cells[4].text = f_ret
                row.cells[4].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

                for c in row.cells:
                    for p in c.paragraphs:
                        for run in p.runs:
                            apply_run_font(run, size=Pt(10))

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

    # Đồng bộ Footer chuẩn
    for s in doc.sections:
        s.different_first_page_header_footer = True
        for p in list(s.first_page_footer.paragraphs):
            p._element.getparent().remove(p._element)
        for t in list(s.first_page_footer.tables):
            t._element.getparent().remove(t._element)

        footer = s.footer
        for p in list(footer.paragraphs):
            p._element.getparent().remove(p._element)
        f_table = footer.add_table(rows=1, cols=4, width=Pt(451.3))
        f_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        widths = [Pt(130), Pt(125), Pt(100), Pt(96.3)]
        r = f_table.rows[0]
        for i, w in enumerate(widths):
            r.cells[i].width = w
        c0, c1, c2, c3 = r.cells
        
        p0 = c0.paragraphs[0]
        p0.text = f"Mã hiệu: {doc_code}"
        p0.runs[0].font.name = "Times New Roman"
        p0.runs[0].font.size = Pt(9.5)
        p0.runs[0].font.italic = True

        p1 = c1.paragraphs[0]
        p1.text = f"Ngày ban hành: {issue_date}"
        p1.runs[0].font.name = "Times New Roman"
        p1.runs[0].font.size = Pt(9.5)
        p1.runs[0].font.italic = True
        p1.alignment = WD_ALIGN_PARAGRAPH.CENTER

        p2 = c2.paragraphs[0]
        p2.text = f"Lần ban hành: {version}"
        p2.runs[0].font.name = "Times New Roman"
        p2.runs[0].font.size = Pt(9.5)
        p2.runs[0].font.italic = True
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER

        p3 = c3.paragraphs[0]
        p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run3 = p3.add_run("Trang ")
        run3.font.name = "Times New Roman"
        run3.font.size = Pt(9.5)
        run3.font.italic = True
        fld_page = OxmlElement('w:fldSimple')
        fld_page.set(qn('w:instr'), 'PAGE')
        p3._p.append(fld_page)

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


