import datetime
import json
import re
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from modules.inspection.models.iso_models import (
    ISODocument,
    ISOProcess,
    ISOSection,
    ISOProcessStep,
    ISOProcessSection,
    ISOProcessStepInstance,
    ISORevisionLog
)
from modules.iso_approval.models.iso_approval_model import ISOApprovalLog

def extract_department_from_code(code: str, symbol: str = None) -> str:
    """Trích xuất mã viết tắt phòng ban từ mã ký hiệu hoặc mã quy trình (VD: G7.CL-QT01 -> CL)"""
    target = symbol or code or ""
    match = re.search(r'G7\.([A-Z0-9]+)[-.]', target, re.IGNORECASE)
    if match and match.group(1):
        return match.group(1).upper()
    
    target_upper = target.upper()
    if 'CL' in target_upper or 'QC' in target_upper:
        return 'CL'
    if 'SX' in target_upper:
        return 'SX'
    if 'KT' in target_upper:
        return 'KT'
    if 'KHO' in target_upper:
        return 'KHO'
    if 'IT' in target_upper:
        return 'IT'
    if 'BGD' in target_upper:
        return 'BGD'
    return 'CHUNG'


class ISOApprovalService:
    @staticmethod
    def get_approval_stats(db: Session) -> Dict[str, int]:
        """Thống kê tổng quan số lượng hồ sơ theo các trạng thái phê duyệt"""
        docs = db.query(ISODocument).all()
        processes = db.query(ISOProcess).all()

        total = len(docs) + len(processes)
        pending = 0
        approved = 0
        rejected = 0
        draft = 0

        for item in docs + processes:
            status = (item.status or "").strip().lower()
            if status in [
                "chờ duyệt", "cho duyet", "pending", 
                "chờ bgđ duyệt", "cho bgd duyet", "chờ bgđ", "cho bgd",
                "chờ trưởng phòng duyệt", "cho truong phong duyet", "chờ trưởng phòng", "chờ tp duyệt"
            ]:
                pending += 1
            elif status in [
                "trưởng phòng đã duyệt", "truong phong da duyet",
                "bgđ đã duyệt", "bgd da duyet", "ban giám đốc đã duyệt",
                "hiệu lực", "hieu luc", "đã duyệt", "da duyet", "approved"
            ]:
                approved += 1
            elif status in ["từ chối", "tu choi", "yêu cầu sửa đổi", "rejected"]:
                rejected += 1
            elif status in ["dự thảo", "du thao", "nháp", "nhap", "draft"]:
                draft += 1
            else:
                # Mặc định các trạng thái khởi tạo xem như chờ duyệt
                pending += 1

        return {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "draft": draft,
            "documents_count": len(docs),
            "processes_count": len(processes)
        }

    @staticmethod
    def get_items_list(
        db: Session,
        status: Optional[str] = "all",
        item_type: Optional[str] = "all",
        department: Optional[str] = "all",
        keyword: Optional[str] = None,
        issuer: Optional[str] = None,
        approver: Optional[str] = None,
        document_level: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Lấy danh sách hồ sơ kèm lọc trạng thái, loại hồ sơ, phòng ban, người tạo, người duyệt và tìm kiếm"""
        results = []

        # 1. Thu thập Tài liệu mẫu ISODocument
        if item_type in ["all", "document", "documents"]:
            docs = db.query(ISODocument).all()
            for d in docs:
                dept = extract_department_from_code(d.code, d.symbol)
                doc_lvl = (d.document_level or "Cấp công ty").strip()
                st = (d.status or "Dự thảo").strip()
                st_lower = st.lower()

                if doc_lvl == "Cấp phòng":
                    workflow_label = "Cấp phòng"
                    total_steps = 1
                    current_step = 1
                    current_role = "Trưởng phòng"
                    stage_label = "Trưởng phòng ký duyệt"
                    if st_lower in ["trưởng phòng đã duyệt", "truong phong da duyet", "hiệu lực", "hieu luc", "đã duyệt", "da duyet"]:
                        resolved_status = "Trưởng phòng đã duyệt"
                        display_approver = d.approver or "Trưởng phòng"
                    elif st_lower in ["từ chối", "tu choi", "yêu cầu sửa đổi", "rejected"]:
                        resolved_status = "Từ chối"
                        display_approver = d.approver or "Trưởng phòng"
                    elif st_lower in ["dự thảo", "du thao", "nháp", "nhap", "draft"]:
                        resolved_status = "Nháp"
                        display_approver = "Trưởng phòng"
                    else:
                        resolved_status = "Chờ Trưởng phòng duyệt"
                        display_approver = d.approver or "Trưởng phòng"
                else:
                    workflow_label = "Cấp công ty"
                    total_steps = 2
                    if st_lower in ["bgđ đã duyệt", "bgd da duyet", "ban giám đốc đã duyệt", "hiệu lực", "hieu luc", "đã duyệt", "da duyet"]:
                        resolved_status = "BGĐ đã duyệt"
                        current_step = 2
                        current_role = "Ban Giám Đốc"
                        stage_label = "BGĐ đã duyệt"
                        display_approver = d.approver or "Ban Giám Đốc"
                    elif st_lower in ["chờ bgđ duyệt", "cho bgd duyet", "chờ bgđ", "cho bgd"]:
                        resolved_status = "Chờ BGĐ duyệt"
                        current_step = 2
                        current_role = "Ban Giám Đốc"
                        stage_label = "Chờ BGĐ duyệt"
                        display_approver = "Ban Giám Đốc"
                    elif st_lower in ["từ chối", "tu choi", "yêu cầu sửa đổi", "rejected"]:
                        resolved_status = "Từ chối"
                        current_step = 1
                        current_role = "Trưởng phòng"
                        stage_label = "Từ chối"
                        display_approver = d.approver or "Trưởng phòng"
                    elif st_lower in ["dự thảo", "du thao", "nháp", "nhap", "draft"]:
                        resolved_status = "Nháp"
                        current_step = 1
                        current_role = "Trưởng phòng"
                        stage_label = "Nháp"
                        display_approver = "Trưởng phòng"
                    else:
                        resolved_status = "Chờ Trưởng phòng duyệt"
                        current_step = 1
                        current_role = "Trưởng phòng"
                        stage_label = "Chờ Trưởng phòng duyệt"
                        display_approver = "Trưởng phòng"

                # Lấy mốc thời gian của hành động duyệt/trình duyệt gần nhất
                latest_doc_log = db.query(ISOApprovalLog).filter(
                    ISOApprovalLog.item_type == "document",
                    ISOApprovalLog.item_id == d.id
                ).order_by(ISOApprovalLog.id.desc()).first()
                last_doc_action_date = latest_doc_log.created_at if latest_doc_log else (d.updated_at or d.created_at or d.issue_date or "")

                results.append({
                    "id": d.id,
                    "item_type": "document",
                    "item_type_label": "Tài liệu mẫu ISO",
                    "code": d.code or "",
                    "name": d.name or "",
                    "version": d.version or "01",
                    "status": resolved_status,
                    "issuer": d.issuer or "",
                    "approver": display_approver,
                    "approver_bgd": getattr(d, "approver_bgd", "") or "",
                    "issue_date": d.issue_date or "",
                    "document_level": doc_lvl,
                    "doc_type": d.doc_type or "Tài liệu ISO",
                    "department": dept,
                    "file_path": d.file_path or "",
                    "created_at": d.created_at or "",
                    "updated_at": last_doc_action_date or d.updated_at or d.created_at or "",
                    "approval_date": last_doc_action_date,
                    "notes": d.notes or "",
                    "workflow_label": workflow_label,
                    "current_step": current_step,
                    "total_steps": total_steps,
                    "current_role": current_role,
                    "stage_label": stage_label
                })

        # 2. Thu thập Quy trình thực tế áp dụng ISOProcess
        if item_type in ["all", "process", "processes"]:
            procs = db.query(ISOProcess).all()
            for p in procs:
                dept = extract_department_from_code(p.code, p.symbol)
                doc_lvl = (p.document_level or "Cấp công ty").strip()
                st = (p.status or "Dự thảo").strip()
                st_lower = st.lower()

                if doc_lvl == "Cấp phòng":
                    workflow_label = "Cấp phòng"
                    total_steps = 1
                    current_step = 1
                    current_role = "Trưởng phòng"
                    stage_label = "Trưởng phòng ký duyệt"
                    if st_lower in ["trưởng phòng đã duyệt", "truong phong da duyet", "hiệu lực", "hieu luc", "đã duyệt", "da duyet"]:
                        resolved_status = "Trưởng phòng đã duyệt"
                        display_approver = p.approver or "Trưởng phòng"
                    elif st_lower in ["từ chối", "tu choi", "yêu cầu sửa đổi", "rejected"]:
                        resolved_status = "Từ chối"
                        display_approver = p.approver or "Trưởng phòng"
                    elif st_lower in ["dự thảo", "du thao", "nháp", "nhap", "draft"]:
                        resolved_status = "Nháp"
                        display_approver = "Trưởng phòng"
                    else:
                        resolved_status = "Chờ Trưởng phòng duyệt"
                        display_approver = p.approver or "Trưởng phòng"
                else:
                    workflow_label = "Cấp công ty"
                    total_steps = 2
                    if st_lower in ["bgđ đã duyệt", "bgd da duyet", "ban giám đốc đã duyệt", "hiệu lực", "hieu luc", "đã duyệt", "da duyet"]:
                        resolved_status = "BGĐ đã duyệt"
                        current_step = 2
                        current_role = "Ban Giám Đốc"
                        stage_label = "BGĐ đã duyệt"
                        display_approver = p.approver or "Ban Giám Đốc"
                    elif st_lower in ["chờ bgđ duyệt", "cho bgd duyet", "chờ bgđ", "cho bgd"]:
                        resolved_status = "Chờ BGĐ duyệt"
                        current_step = 2
                        current_role = "Ban Giám Đốc"
                        stage_label = "Chờ BGĐ duyệt"
                        display_approver = "Ban Giám Đốc"
                    elif st_lower in ["từ chối", "tu choi", "yêu cầu sửa đổi", "rejected"]:
                        resolved_status = "Từ chối"
                        current_step = 1
                        current_role = "Trưởng phòng"
                        stage_label = "Từ chối"
                        display_approver = p.approver or "Trưởng phòng"
                    elif st_lower in ["dự thảo", "du thao", "nháp", "nhap", "draft"]:
                        resolved_status = "Nháp"
                        current_step = 1
                        current_role = "Trưởng phòng"
                        stage_label = "Nháp"
                        display_approver = "Trưởng phòng"
                    else:
                        resolved_status = "Chờ Trưởng phòng duyệt"
                        current_step = 1
                        current_role = "Trưởng phòng"
                        stage_label = "Chờ Trưởng phòng duyệt"
                        display_approver = "Trưởng phòng"

                # Lấy mốc thời gian của hành động duyệt/trình duyệt gần nhất
                latest_proc_log = db.query(ISOApprovalLog).filter(
                    ISOApprovalLog.item_type == "process",
                    ISOApprovalLog.item_id == p.id
                ).order_by(ISOApprovalLog.id.desc()).first()
                last_proc_action_date = latest_proc_log.created_at if latest_proc_log else (p.updated_at or p.created_at or p.issue_date or "")

                results.append({
                    "id": p.id,
                    "item_type": "process",
                    "item_type_label": "Quy trình thực tế áp dụng",
                    "code": p.code or "",
                    "name": p.name or "",
                    "version": "01",
                    "status": resolved_status,
                    "issuer": p.owner or p.editor or "",
                    "approver": display_approver,
                    "approver_bgd": getattr(p, "approver_bgd", "") or "",
                    "issue_date": p.issue_date or "",
                    "document_level": doc_lvl,
                    "doc_type": "Quy trình thực tế",
                    "department": dept,
                    "file_path": "",
                    "created_at": p.created_at or "",
                    "updated_at": last_proc_action_date or p.updated_at or p.created_at or "",
                    "approval_date": last_proc_action_date,
                    "notes": p.notes or "",
                    "workflow_label": workflow_label,
                    "current_step": current_step,
                    "total_steps": total_steps,
                    "current_role": current_role,
                    "stage_label": stage_label
                })

        # 3. Lọc theo trạng thái
        filtered = []
        status_norm = (status or "all").strip().lower()

        for item in results:
            item_status = item["status"].strip().lower()
            
            if status_norm == "all":
                pass
            elif status_norm in ["pending", "chờ duyệt", "cho duyet"]:
                if item_status not in ["chờ duyệt", "cho duyet", "pending", "chờ bgđ duyệt", "cho bgd duyet", "chờ trưởng phòng duyệt", "cho truong phong duyet"]:
                    continue
            elif status_norm in ["approved", "đã duyệt", "da duyet", "hiệu lực", "hieu luc"]:
                if item_status not in ["hiệu lực", "hieu luc", "đã duyệt", "da duyet", "approved"]:
                    continue
            elif status_norm in ["rejected", "từ chối", "tu choi", "yêu cầu sửa đổi"]:
                if item_status not in ["từ chối", "tu choi", "yêu cầu sửa đổi", "rejected"]:
                    continue
            elif status_norm in ["draft", "dự thảo", "du thao", "nháp", "nhap"]:
                if item_status not in ["dự thảo", "du thao", "nháp", "nhap"]:
                    continue
            else:
                if status_norm not in item_status:
                    continue

            # 4. Lọc theo phòng ban
            if department and department != "all":
                if item["department"].upper() != department.upper():
                    continue

            # 5. Lọc theo Người đề xuất (issuer)
            if issuer and issuer != "all":
                if issuer.strip().lower() not in item["issuer"].lower():
                    continue

            # 6. Lọc theo Người duyệt (approver)
            if approver and approver != "all":
                if approver.strip().lower() not in item["approver"].lower():
                    continue

            # 7. Lọc theo Cấp tài liệu (document_level)
            if document_level and document_level != "all":
                if document_level.strip().lower() not in item["document_level"].lower():
                    continue

            # 8. Lọc theo từ khóa tìm kiếm
            if keyword:
                kw = keyword.strip().lower()
                matched = (
                    kw in item["code"].lower() or
                    kw in item["name"].lower() or
                    kw in item["issuer"].lower() or
                    kw in item["approver"].lower() or
                    kw in item["department"].lower() or
                    kw in item["document_level"].lower()
                )
                if not matched:
                    continue

            filtered.append(item)

        # Sắp xếp mới nhất lên đầu
        filtered.sort(key=lambda x: x.get("updated_at") or x.get("created_at") or "", reverse=True)
        return filtered

    @staticmethod
    def get_item_detail(db: Session, item_type: str, item_id: int) -> Dict[str, Any]:
        """Lấy toàn bộ thông tin chi tiết một tài liệu hoặc quy trình để phục vụ xem xét phê duyệt"""
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if item_type == "document":
            doc = db.query(ISODocument).filter(ISODocument.id == item_id).first()
            if not doc:
                raise ValueError(f"Không tìm thấy tài liệu ISO ID #{item_id}")

            sections = db.query(ISOSection).filter(ISOSection.document_id == item_id).all()
            steps = db.query(ISOProcessStep).filter(ISOProcessStep.document_id == item_id).order_by(ISOProcessStep.step_number).all()
            rev_logs = db.query(ISORevisionLog).filter(ISORevisionLog.document_id == item_id).order_by(ISORevisionLog.seq_no).all()
            approval_logs = db.query(ISOApprovalLog).filter(
                ISOApprovalLog.item_type == "document",
                ISOApprovalLog.item_id == item_id
            ).order_by(desc(ISOApprovalLog.id)).all()

            return {
                "id": doc.id,
                "item_type": "document",
                "item_type_label": "Tài liệu mẫu ISO",
                "code": doc.code or "",
                "name": doc.name or "",
                "version": doc.version or "01",
                "status": doc.status or "Dự thảo",
                "issuer": doc.issuer or "",
                "approver": doc.approver or "",
                "approver_bgd": getattr(doc, "approver_bgd", "") or "",
                "issue_date": doc.issue_date or "",
                "document_level": doc.document_level or "Cấp công ty",
                "doc_type": doc.doc_type or "Tài liệu ISO",
                "folder": doc.folder or "",
                "symbol": doc.symbol or "",
                "department": extract_department_from_code(doc.code, doc.symbol),
                "file_path": doc.file_path or "",
                "diagram_data": doc.diagram_data or "",
                "notes": doc.notes or "",
                "created_at": doc.created_at or "",
                "updated_at": doc.updated_at or "",
                "sections": [{"section_name": s.section_name, "content_html": s.content_html} for s in sections],
                "steps": [{
                    "id": st.id,
                    "step_number": st.step_number,
                    "name": st.name,
                    "assignee_role": st.assignee_role,
                    "instructions": st.instructions,
                    "checklist_json": st.checklist_json,
                    "transition_json": st.transition_json,
                    "flow_node_id": st.flow_node_id
                } for st in steps],
                "revision_logs": [{
                    "seq_no": r.seq_no,
                    "rev_date": r.rev_date,
                    "content": r.content,
                    "page_no": r.page_no,
                    "modifier": r.modifier
                } for r in rev_logs],
                "approval_logs": [{
                    "id": a.id,
                    "action": a.action,
                    "action_by": a.action_by,
                    "action_by_name": a.action_by_name,
                    "role": a.role,
                    "previous_status": a.previous_status,
                    "new_status": a.new_status,
                    "comment": a.comment,
                    "created_at": a.created_at
                } for a in approval_logs]
            }

        elif item_type == "process":
            proc = db.query(ISOProcess).filter(ISOProcess.id == item_id).first()
            if not proc:
                raise ValueError(f"Không tìm thấy quy trình thực tế ID #{item_id}")

            sections = db.query(ISOProcessSection).filter(ISOProcessSection.process_id == item_id).all()
            steps = db.query(ISOProcessStepInstance).filter(ISOProcessStepInstance.process_id == item_id).order_by(ISOProcessStepInstance.step_number).all()
            rev_logs = db.query(ISORevisionLog).filter(ISORevisionLog.process_id == item_id).order_by(ISORevisionLog.seq_no).all()
            approval_logs = db.query(ISOApprovalLog).filter(
                ISOApprovalLog.item_type == "process",
                ISOApprovalLog.item_id == item_id
            ).order_by(desc(ISOApprovalLog.id)).all()

            template_doc = db.query(ISODocument).filter(ISODocument.id == proc.iso_document_id).first()

            return {
                "id": proc.id,
                "item_type": "process",
                "item_type_label": "Quy trình thực tế áp dụng",
                "code": proc.code or "",
                "name": proc.name or "",
                "version": "01",
                "status": proc.status or "Dự thảo",
                "issuer": proc.owner or proc.editor or "",
                "owner": proc.owner or "",
                "editor": proc.editor or "",
                "approver": proc.approver or "",
                "approver_bgd": getattr(proc, "approver_bgd", "") or "",
                "issue_date": proc.issue_date or "",
                "document_level": proc.document_level or "Cấp công ty",
                "doc_type": "Quy trình áp dụng",
                "symbol": proc.symbol or "",
                "department": extract_department_from_code(proc.code, proc.symbol),
                "template_code": template_doc.code if template_doc else "",
                "template_name": template_doc.name if template_doc else "",
                "file_path": template_doc.file_path if template_doc else "",
                "diagram_data": proc.diagram_data or "",
                "notes": proc.notes or "",
                "created_at": proc.created_at or "",
                "updated_at": proc.updated_at or "",
                "sections": [{"section_name": s.section_name, "content_html": s.content_html} for s in sections],
                "steps": [{
                    "id": st.id,
                    "step_number": st.step_number,
                    "name": st.name,
                    "assignee_role": st.assignee_role,
                    "instructions": st.instructions,
                    "checklist_json": st.checklist_json,
                    "transition_json": getattr(st, "transition_json", ""),
                    "flow_node_id": getattr(st, "flow_node_id", "")
                } for st in steps],
                "revision_logs": [{
                    "seq_no": r.seq_no,
                    "rev_date": r.rev_date,
                    "content": r.content,
                    "page_no": r.page_no,
                    "modifier": r.modifier
                } for r in rev_logs],
                "approval_logs": [{
                    "id": a.id,
                    "action": a.action,
                    "action_by": a.action_by,
                    "action_by_name": a.action_by_name,
                    "role": a.role,
                    "previous_status": a.previous_status,
                    "new_status": a.new_status,
                    "comment": a.comment,
                    "created_at": a.created_at
                } for a in approval_logs]
            }
        else:
            raise ValueError(f"Loại hồ sơ không hợp lệ: '{item_type}'")

    @staticmethod
    def approve_item(
        db: Session,
        item_type: str,
        item_id: int,
        comment: str = "",
        approver_name: str = "",
        approver_username: str = ""
    ) -> Dict[str, Any]:
        """Thực hiện phê duyệt hồ sơ:
        - Cấp phòng: Đưa cho Trưởng phòng ký duyệt -> Chuyển thành 'Hiệu lực'
        - Cấp công ty: Lên lần lượt:
          + Bước 1: Trưởng phòng ký duyệt cấp phòng -> Chuyển thành 'Chờ BGĐ duyệt'
          + Bước 2: Ban Giám Đốc ký duyệt cấp công ty -> Chuyển thành 'Hiệu lực'
        """
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if item_type == "document":
            item = db.query(ISODocument).filter(ISODocument.id == item_id).first()
            if not item:
                raise ValueError(f"Không tìm thấy tài liệu ISO ID #{item_id}")
            
            prev_status = item.status or "Dự thảo"
            doc_level = (item.document_level or "Cấp công ty").strip()
            prev_status_lower = (prev_status or "").strip().lower()

            if doc_level == "Cấp phòng":
                # Cấp phòng: Trưởng phòng ký duyệt ban hành
                item.status = "Trưởng phòng đã duyệt"
                item.approver = approver_name or item.approver or "Trưởng phòng"
                item.updated_at = now_str
                
                log = ISOApprovalLog(
                    item_type="document",
                    item_id=item.id,
                    item_code=item.code,
                    item_name=item.name,
                    action="APPROVE",
                    action_by=approver_username,
                    action_by_name=approver_name or approver_username or "Trưởng phòng",
                    role="Trưởng phòng",
                    previous_status=prev_status,
                    new_status="Trưởng phòng đã duyệt",
                    comment=comment or "Trưởng phòng đã phê duyệt ban hành tài liệu (Cấp phòng)",
                    created_at=now_str
                )
                db.add(log)
                db.commit()
                return {
                    "success": True,
                    "message": f"Trưởng phòng đã phê duyệt ban hành tài liệu '{item.code}' (Cấp phòng) thành công!",
                    "new_status": "Trưởng phòng đã duyệt",
                    "step_completed": "phong_done"
                }
            else:
                # Cấp công ty: Tuần tự: (1) Trưởng phòng duyệt -> (2) BGĐ duyệt
                if prev_status_lower in ["chờ bgđ duyệt", "cho bgd duyet", "chờ bgđ", "cho bgd"]:
                    # Bước 2: BGĐ ký duyệt ban hành
                    item.status = "BGĐ đã duyệt"
                    item.approver_bgd = approver_name or getattr(item, "approver_bgd", "") or "Ban Giám Đốc"
                    item.updated_at = now_str

                    log = ISOApprovalLog(
                        item_type="document",
                        item_id=item.id,
                        item_code=item.code,
                        item_name=item.name,
                        action="APPROVE",
                        action_by=approver_username,
                        action_by_name=approver_name or approver_username or "Ban Giám Đốc",
                        role="Ban Giám Đốc",
                        previous_status=prev_status,
                        new_status="BGĐ đã duyệt",
                        comment=comment or "Ban Giám Đốc đã phê duyệt ban hành tài liệu cấp công ty",
                        created_at=now_str
                    )
                    db.add(log)
                    db.commit()
                    return {
                        "success": True,
                        "message": f"Ban Giám Đốc đã phê duyệt ban hành tài liệu '{item.code}' (Cấp công ty) thành công!",
                        "new_status": "BGĐ đã duyệt",
                        "step_completed": "bgd_done"
                    }
                else:
                    # Bước 1: Trưởng phòng duyệt cấp phòng -> chuyển tiếp lên BGĐ
                    item.status = "Chờ BGĐ duyệt"
                    item.approver = approver_name or item.approver or "Trưởng phòng"
                    item.updated_at = now_str

                    log = ISOApprovalLog(
                        item_type="document",
                        item_id=item.id,
                        item_code=item.code,
                        item_name=item.name,
                        action="APPROVE_DEPT",
                        action_by=approver_username,
                        action_by_name=approver_name or approver_username or "Trưởng phòng",
                        role="Trưởng phòng",
                        previous_status=prev_status,
                        new_status="Chờ BGĐ duyệt",
                        comment=comment or "Trưởng phòng đã ký duyệt thông qua cấp phòng (Bước 1), chuyển tiếp lên Ban Giám Đốc ký duyệt ban hành (Bước 2)",
                        created_at=now_str
                    )
                    db.add(log)
                    db.commit()
                    return {
                        "success": True,
                        "message": f"Trưởng phòng đã ký duyệt tài liệu '{item.code}'. Đã chuyển tiếp lên Ban Giám Đốc (Cấp công ty) ký duyệt ban hành!",
                        "new_status": "Chờ BGĐ duyệt",
                        "step_completed": "phong_to_bgd"
                    }

        elif item_type == "process":
            item = db.query(ISOProcess).filter(ISOProcess.id == item_id).first()
            if not item:
                raise ValueError(f"Không tìm thấy quy trình thực tế ID #{item_id}")

            prev_status = item.status or "Dự thảo"
            doc_level = (item.document_level or "Cấp công ty").strip()
            prev_status_lower = (prev_status or "").strip().lower()

            if doc_level == "Cấp phòng":
                # Cấp phòng: Trưởng phòng ký duyệt ban hành
                item.status = "Trưởng phòng đã duyệt"
                item.approver = approver_name or item.approver or "Trưởng phòng"
                item.updated_at = now_str

                log = ISOApprovalLog(
                    item_type="process",
                    item_id=item.id,
                    item_code=item.code,
                    item_name=item.name,
                    action="APPROVE",
                    action_by=approver_username,
                    action_by_name=approver_name or approver_username or "Trưởng phòng",
                    role="Trưởng phòng",
                    previous_status=prev_status,
                    new_status="Trưởng phòng đã duyệt",
                    comment=comment or "Trưởng phòng đã phê duyệt áp dụng quy trình vào thực tế (Cấp phòng)",
                    created_at=now_str
                )
                db.add(log)
                db.commit()
                return {
                    "success": True,
                    "message": f"Trưởng phòng đã phê duyệt quy trình '{item.code}' (Cấp phòng) thành công!",
                    "new_status": "Trưởng phòng đã duyệt",
                    "step_completed": "phong_done"
                }
            else:
                # Cấp công ty: Tuần tự: (1) Trưởng phòng duyệt -> (2) BGĐ duyệt
                if prev_status_lower in ["chờ bgđ duyệt", "cho bgd duyet", "chờ bgđ", "cho bgd"]:
                    # Bước 2: BGĐ ký duyệt ban hành
                    item.status = "BGĐ đã duyệt"
                    item.approver_bgd = approver_name or getattr(item, "approver_bgd", "") or "Ban Giám Đốc"
                    item.updated_at = now_str

                    log = ISOApprovalLog(
                        item_type="process",
                        item_id=item.id,
                        item_code=item.code,
                        item_name=item.name,
                        action="APPROVE",
                        action_by=approver_username,
                        action_by_name=approver_name or approver_username or "Ban Giám Đốc",
                        role="Ban Giám Đốc",
                        previous_status=prev_status,
                        new_status="BGĐ đã duyệt",
                        comment=comment or "Ban Giám Đốc đã phê duyệt ban hành quy trình cấp công ty",
                        created_at=now_str
                    )
                    db.add(log)
                    db.commit()
                    return {
                        "success": True,
                        "message": f"Ban Giám Đốc đã phê duyệt ban hành quy trình '{item.code}' (Cấp công ty) thành công!",
                        "new_status": "BGĐ đã duyệt",
                        "step_completed": "bgd_done"
                    }
                else:
                    # Bước 1: Trưởng phòng duyệt cấp phòng -> chuyển tiếp lên BGĐ
                    item.status = "Chờ BGĐ duyệt"
                    item.approver = approver_name or item.approver or "Trưởng phòng"
                    item.updated_at = now_str

                    log = ISOApprovalLog(
                        item_type="process",
                        item_id=item.id,
                        item_code=item.code,
                        item_name=item.name,
                        action="APPROVE_DEPT",
                        action_by=approver_username,
                        action_by_name=approver_name or approver_username or "Trưởng phòng",
                        role="Trưởng phòng",
                        previous_status=prev_status,
                        new_status="Chờ BGĐ duyệt",
                        comment=comment or "Trưởng phòng đã ký duyệt thông qua cấp phòng (Bước 1), chuyển tiếp lên Ban Giám Đốc ký duyệt ban hành (Bước 2)",
                        created_at=now_str
                    )
                    db.add(log)
                    db.commit()
                    return {
                        "success": True,
                        "message": f"Trưởng phòng đã ký duyệt quy trình '{item.code}'. Đã chuyển tiếp lên Ban Giám Đốc (Cấp công ty) ký duyệt ban hành!",
                        "new_status": "Chờ BGĐ duyệt",
                        "step_completed": "phong_to_bgd"
                    }
        else:
            raise ValueError(f"Loại hồ sơ không hợp lệ: '{item_type}'")

    @staticmethod
    def reject_item(
        db: Session,
        item_type: str,
        item_id: int,
        comment: str,
        approver_name: str = "",
        approver_username: str = ""
    ) -> Dict[str, Any]:
        """Từ chối hồ sơ kèm lý do bắt buộc: Chuyển sang trạng thái 'Từ chối' và ghi nhận log"""
        if not comment or not comment.strip():
            raise ValueError("Vui lòng nhập lý do từ chối hoặc yêu cầu sửa đổi")

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if item_type == "document":
            item = db.query(ISODocument).filter(ISODocument.id == item_id).first()
            if not item:
                raise ValueError(f"Không tìm thấy tài liệu ISO ID #{item_id}")

            prev_status = item.status or "Dự thảo"
            item.status = "Từ chối"
            item.updated_at = now_str

            log = ISOApprovalLog(
                item_type="document",
                item_id=item.id,
                item_code=item.code,
                item_name=item.name,
                action="REJECT",
                action_by=approver_username,
                action_by_name=approver_name or approver_username,
                role="Người phê duyệt",
                previous_status=prev_status,
                new_status="Từ chối",
                comment=comment.strip(),
                created_at=now_str
            )
            db.add(log)
            db.commit()
            return {"success": True, "message": f"Đã từ chối tài liệu '{item.code}' và yêu cầu sửa đổi.", "new_status": "Từ chối"}

        elif item_type == "process":
            item = db.query(ISOProcess).filter(ISOProcess.id == item_id).first()
            if not item:
                raise ValueError(f"Không tìm thấy quy trình thực tế ID #{item_id}")

            prev_status = item.status or "Dự thảo"
            item.status = "Từ chối"
            item.updated_at = now_str

            log = ISOApprovalLog(
                item_type="process",
                item_id=item.id,
                item_code=item.code,
                item_name=item.name,
                action="REJECT",
                action_by=approver_username,
                action_by_name=approver_name or approver_username,
                role="Người phê duyệt",
                previous_status=prev_status,
                new_status="Từ chối",
                comment=comment.strip(),
                created_at=now_str
            )
            db.add(log)
            db.commit()
            return {"success": True, "message": f"Đã từ chối quy trình '{item.code}' và yêu cầu sửa đổi.", "new_status": "Từ chối"}
        else:
            raise ValueError(f"Loại hồ sơ không hợp lệ: '{item_type}'")

    @staticmethod
    def forward_item(
        db: Session,
        item_type: str,
        item_id: int,
        new_approver_name: str,
        new_approver_role: str = "",
        note: str = "",
        forwarded_by: str = ""
    ) -> Dict[str, Any]:
        """Chuyển tiếp hồ sơ cho cấp hoặc người phê duyệt khác"""
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if item_type == "document":
            item = db.query(ISODocument).filter(ISODocument.id == item_id).first()
            if not item:
                raise ValueError(f"Không tìm thấy tài liệu ID #{item_id}")
            prev_approver = item.approver
            item.approver = new_approver_name
            item.status = "Chờ duyệt"
            item.updated_at = now_str

            log = ISOApprovalLog(
                item_type="document",
                item_id=item.id,
                item_code=item.code,
                item_name=item.name,
                action="FORWARD",
                action_by=forwarded_by,
                action_by_name=forwarded_by,
                role=new_approver_role,
                previous_status=item.status,
                new_status="Chờ duyệt",
                comment=f"Chuyển phê duyệt từ '{prev_approver}' sang '{new_approver_name}'. Ghi chú: {note}",
                created_at=now_str
            )
            db.add(log)
            db.commit()
            return {"success": True, "message": f"Đã chuyển duyệt tài liệu '{item.code}' cho {new_approver_name}"}

        elif item_type == "process":
            item = db.query(ISOProcess).filter(ISOProcess.id == item_id).first()
            if not item:
                raise ValueError(f"Không tìm thấy quy trình ID #{item_id}")
            prev_approver = item.approver
            item.approver = new_approver_name
            item.status = "Chờ duyệt"
            item.updated_at = now_str

            log = ISOApprovalLog(
                item_type="process",
                item_id=item.id,
                item_code=item.code,
                item_name=item.name,
                action="FORWARD",
                action_by=forwarded_by,
                action_by_name=forwarded_by,
                role=new_approver_role,
                previous_status=item.status,
                new_status="Chờ duyệt",
                comment=f"Chuyển phê duyệt từ '{prev_approver}' sang '{new_approver_name}'. Ghi chú: {note}",
                created_at=now_str
            )
            db.add(log)
            db.commit()
            return {"success": True, "message": f"Đã chuyển duyệt quy trình '{item.code}' cho {new_approver_name}"}
        else:
            raise ValueError(f"Loại hồ sơ không hợp lệ: '{item_type}'")

    @staticmethod
    def get_approval_history(db: Session, item_type: str, item_id: int) -> List[Dict[str, Any]]:
        """Lấy toàn bộ lịch sử các lần phê duyệt, từ chối, chuyển tiếp của một hồ sơ"""
        logs = db.query(ISOApprovalLog).filter(
            ISOApprovalLog.item_type == item_type,
            ISOApprovalLog.item_id == item_id
        ).order_by(desc(ISOApprovalLog.id)).all()

        return [{
            "id": a.id,
            "item_type": a.item_type,
            "item_id": a.item_id,
            "item_code": a.item_code,
            "item_name": a.item_name,
            "action": a.action,
            "action_by": a.action_by,
            "action_by_name": a.action_by_name,
            "role": a.role,
            "previous_status": a.previous_status,
            "new_status": a.new_status,
            "comment": a.comment,
            "created_at": a.created_at
        } for a in logs]
