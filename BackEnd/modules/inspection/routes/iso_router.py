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

router = APIRouter()

# Đảm bảo thư mục lưu trữ file upload tồn tại
UPLOAD_DIR = os.path.join("uploads", "iso_documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_iso_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    [POST] Tải lên file .docx tài liệu ISO và phân tích trích xuất dữ liệu thô.
    """
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng file Word (.docx)")

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
    if not doc_id:
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
            diagram_data=payload.get("diagram_data", ""),
            created_at=now_str,
            updated_at=now_str
        )
        db.add(doc)
        db.flush() # Để lấy doc.id
    else:
        doc = db.query(ISODocument).filter(ISODocument.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu quy trình")
        
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
            page_no=log.get("page_no", "")
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
            "page_no": l.page_no
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

    # Xóa file vật lý nếu có
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except:
            pass

    try:
        db.delete(doc)
        db.commit()
        return {"message": "Đã xóa quy trình thành công!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa: {str(e)}")


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

    if not code or not name or not iso_doc_id:
        raise HTTPException(status_code=400, detail="Mã quy trình, Tên quy trình và Khuôn mẫu ISO gốc không được bỏ trống")

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Kiểm tra khuôn mẫu ISO gốc có tồn tại không
    iso_doc = db.query(ISODocument).filter(ISODocument.id == iso_doc_id).first()
    if not iso_doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy khuôn mẫu ISO gốc được chọn")

    # Kiểm tra trùng mã code nếu tạo mới
    if not proc_id:
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
            diagram_data=payload.get("diagram_data", iso_doc.diagram_data or ""), # Clone diagram mẫu từ ISO nếu ko truyền
            created_at=now_str,
            updated_at=now_str
        )
        db.add(proc)
        db.flush() # Lấy proc.id
        
        # Clone sections mẫu từ ISODocument
        sections = payload.get("sections")
        if sections is None:
            # Tự động clone từ ISO template
            for sec in iso_doc.sections:
                db_sec = ISOProcessSection(
                    process_id=proc.id,
                    section_name=sec.section_name,
                    content_html=sec.content_html
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
        proc = db.query(ISOProcess).filter(ISOProcess.id == proc_id).first()
        if not proc:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông tin quy trình thực tế")

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
        proc.diagram_data = payload.get("diagram_data", proc.diagram_data)
        proc.updated_at = now_str

        # Xóa các chi tiết cũ của quy trình để ghi đè cập nhật mới
        db.query(ISOProcessSection).filter(ISOProcessSection.process_id == proc.id).delete()
        db.query(ISOProcessStepInstance).filter(ISOProcessStepInstance.process_id == proc.id).delete()

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

    # Các phần văn bản
    sections = {}
    for s in proc.sections:
        sections[s.section_name] = s.content_html

    # Nếu rỗng, nạp từ ISO Document mẫu
    if not sections and proc.iso_document:
        for s in proc.iso_document.sections:
            sections[s.section_name] = s.content_html

    # Các bước quy trình thực tế
    steps = []
    steps_db = sorted(proc.steps, key=lambda x: x.step_number)
    
    # Do not fallback to template steps. Process flowchart starts empty by default.
        
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
        "diagram_data": proc.diagram_data or (proc.iso_document.diagram_data if proc.iso_document else ""),
        "sections": sections,
        "steps": steps
    }


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

