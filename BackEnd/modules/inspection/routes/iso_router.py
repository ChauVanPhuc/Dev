import os
import uuid
import datetime
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from config.database import get_db
from modules.inspection.models.iso_models import ISODocument, ISORevisionLog, ISOSection, ISOProcessStep, ISOProcess, ISOProcessSection, ISOProcessStepInstance
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
    if not (filename_lower.endswith(".docx") or filename_lower.endswith(".doc") or filename_lower.endswith(".pdf")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng file PDF hoặc Word (.doc, .docx)")

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
            file_path=payload.get("file_path", ""),
            status=payload.get("status", "Hiệu lực"),
            folder=payload.get("folder", ""),
            doc_type=payload.get("doc_type", ""),
            document_level=payload.get("document_level", ""),
            symbol=payload.get("symbol", ""),
            notes=payload.get("notes", ""),
            diagram_data=payload.get("diagram_data", ""),
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
        doc.file_path = payload.get("file_path", doc.file_path)
        doc.status = payload.get("status", doc.status)
        doc.folder = payload.get("folder", doc.folder)
        doc.doc_type = payload.get("doc_type", doc.doc_type)
        doc.document_level = payload.get("document_level", doc.document_level)
        doc.symbol = payload.get("symbol", doc.symbol)
        doc.notes = payload.get("notes", doc.notes)
        doc.diagram_data = payload.get("diagram_data", doc.diagram_data)
        doc.updated_at = now_str

        # Xóa các chi tiết cũ để ghi đè cập nhật mới
        db.query(ISORevisionLog).filter(ISORevisionLog.document_id == doc.id).delete()
        db.query(ISOSection).filter(ISOSection.document_id == doc.id).delete()
        db.query(ISOProcessStep).filter(ISOProcessStep.document_id == doc.id).delete()

    # 1. Lưu nhật ký sửa đổi (Revision Logs)
    revision_logs = payload.get("revision_logs", [])
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
            "file_path": d.file_path,
            "status": d.status,
            "folder": d.folder,
            "doc_type": d.doc_type,
            "document_level": d.document_level,
            "symbol": d.symbol,
            "notes": d.notes,
            "created_at": d.created_at,
            "updated_at": d.updated_at
        })
    return result


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

@router.get("/processes")
def get_iso_processes(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách các quy trình thực tế áp dụng.
    """
    procs = db.query(ISOProcess).order_by(ISOProcess.code).all()
    result = []
    for p in procs:
        result.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "iso_document_id": p.iso_document_id,
            "iso_document_code": p.iso_document.code if p.iso_document else "---",
            "iso_document_name": p.iso_document.name if p.iso_document else "---",
            "owner": p.owner,
            "editor": p.editor,
            "approver": p.approver,
            "issue_date": p.issue_date,
            "last_checked_date": p.last_checked_date,
            "last_result": p.last_result,
            "status": p.status,
            "display_at": p.display_at,
            "notes": p.notes,
            "document_level": p.document_level or (p.iso_document.document_level if p.iso_document else ""),
            "symbol": p.symbol,
            "role": p.role,
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
    Nếu tạo mới quy trình và không truyền steps/sections, sẽ tự động clone/copy từ ISODocument gốc sang.
    """
    proc_id = payload.get("id")
    code = payload.get("code")
    name = payload.get("name")
    iso_doc_id = payload.get("iso_document_id")

    if not code or not name or iso_doc_id is None or iso_doc_id == "":
        raise HTTPException(status_code=400, detail="Mã quy trình, Tên quy trình và Khuôn mẫu ISO gốc không được bỏ trống")

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Kiểm tra khuôn mẫu ISO gốc có tồn tại không
    iso_doc = db.query(ISODocument).filter(ISODocument.id == int(iso_doc_id)).first()
    if not iso_doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy khuôn mẫu ISO gốc được chọn")

    # Kiểm tra trùng mã code nếu tạo mới
    is_new_proc = (proc_id is None or proc_id == "" or proc_id == "new")
    if is_new_proc:
        existing = db.query(ISOProcess).filter(ISOProcess.code == code).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Mã quy trình áp dụng '{code}' đã tồn tại trong hệ thống")
        
        proc = ISOProcess(
            code=code,
            name=name,
            iso_document_id=iso_doc_id,
            owner=payload.get("owner", ""),
            editor=payload.get("editor", ""),
            approver=payload.get("approver", ""),
            issue_date=payload.get("issue_date", now_str[:10]),
            last_checked_date=payload.get("last_checked_date"),
            last_result=payload.get("last_result", "Chưa đánh giá"),
            status=payload.get("status", "Dự thảo"),
            display_at=payload.get("display_at", ""),
            notes=payload.get("notes", ""),
            symbol=payload.get("symbol") or iso_doc.symbol or "",
            role=payload.get("role", ""),
            document_level=payload.get("document_level") or iso_doc.document_level or "",
            diagram_data=payload.get("diagram_data", iso_doc.diagram_data or ""), # Clone diagram mẫu từ ISO nếu ko truyền
            inspection_guide_id=payload.get("inspection_guide_id"),
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
        
        # Clone sections mẫu từ ISODocument nhưng để rỗng nội dung (chỉ hiển thị dạng hint, giữ lại metadata cấu hình)
        sections = payload.get("sections")
        if sections is None:
            for sec in iso_doc.sections:
                db_sec = ISOProcessSection(
                    process_id=proc.id,
                    section_name=sec.section_name,
                    content_html=sec.content_html if sec.section_name.startswith("__") else ""
                )
                db.add(db_sec)
        
        # Save steps from payload if provided
        steps = payload.get("steps")
        if steps is not None:
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
        proc.iso_document_id = iso_doc_id
        proc.owner = payload.get("owner", proc.owner)
        proc.editor = payload.get("editor", proc.editor)
        proc.approver = payload.get("approver", proc.approver)
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
        for sec_name, content in sections.items():
            db_sec = ISOProcessSection(
                process_id=proc.id,
                section_name=sec_name,
                content_html=content
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
    
    # Nếu là cập nhật, tự động tạo thêm một dòng nhật ký sửa đổi đại diện cho lượt chỉnh sửa này
    if proc_id:
        now_date = now_str[:10]  # YYYY-MM-DD
        editor_name = payload.get("editor") or "Hệ thống"
        
        # Chỉ append nếu dòng cuối cùng không trùng lặp (modifier, date)
        should_append = True
        if revision_logs:
            last_log = revision_logs[-1]
            if (last_log.get("rev_date") == now_date and 
                last_log.get("modifier") == editor_name and 
                "Cập nhật" in last_log.get("content", "")):
                should_append = False
                
        if should_append:
            next_seq = len(revision_logs) + 1
            revision_logs.append({
                "seq_no": next_seq,
                "rev_date": now_date,
                "content": "Cập nhật quy trình",
                "page_no": "Tất cả",
                "modifier": editor_name
            })
            
    # Nếu là tạo mới và không truyền revision_logs, sao chép lịch sử từ mẫu gốc
    elif not revision_logs and iso_doc:
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

    try:
        db.commit()
        return {
            "id": proc.id,
            "code": proc.code,
            "name": proc.name,
            "message": "Đã lưu quy trình thực tế thành công!"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu quy trình thực tế: {str(e)}")


@router.get("/processes/{id}/details")
def get_iso_process_details(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết quy trình thực tế cùng sơ đồ và checklist riêng biệt.
    """
    proc = db.query(ISOProcess).filter(ISOProcess.id == id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình thực tế")

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
        sections[s.section_name] = s.content_html

    # Nếu rỗng, khởi tạo các phần văn bản từ template nhưng để rỗng nội dung (chỉ hiển thị dạng hint, giữ lại metadata cấu hình)
    if not sections and proc.iso_document:
        for s in proc.iso_document.sections:
            if s.section_name.startswith("__"):
                sections[s.section_name] = s.content_html
            else:
                sections[s.section_name] = ""

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
        "id": proc.id,
        "code": proc.code,
        "name": proc.name,
        "iso_document_id": proc.iso_document_id,
        "iso_document_code": proc.iso_document.code if proc.iso_document else "---",
        "iso_document_name": proc.iso_document.name if proc.iso_document else "---",
        "owner": proc.owner,
        "editor": proc.editor,
        "approver": proc.approver,
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
        "revision_logs": revision_logs,
        "sections": sections,
        "template_sections": template_sections,
        "steps": steps,
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

