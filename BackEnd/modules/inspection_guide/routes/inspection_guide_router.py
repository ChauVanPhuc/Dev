# -*- coding: utf-8 -*-
import re
from typing import List, Optional
from datetime import datetime
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from config.database import get_db

from modules.inspection_guide.models.inspection_guide import InspectionGuideStep, InspectionGuideSubStep, InspectionGuideStepImage
from modules.inspection_guide.services.inspection_guide_service import (
    list_guides, get_guide, create_guide, update_guide, delete_guide,
    create_step, update_step, delete_step, reorder_steps,
    create_sub_step, update_sub_step, delete_sub_step, reorder_sub_steps,
    upload_images, delete_image, set_assignments, get_mobile_guide,
    check_assignment_conflicts,
    generate_next_code,
    list_parameters, get_parameter, create_parameter, update_parameter, delete_parameter,
    set_guide_parameters, seed_default_parameters
)
from modules.inspection_guide.services.inspection_guide_docx_service import (
    generate_guide_docx,
    generate_batch_guides_zip
)
from modules.inspection_guide.schemas.inspection_guide import (
    InspectionGuideCreate, InspectionGuideUpdate, InspectionGuideOut, InspectionGuideListOut,
    InspectionGuideStepCreate, InspectionGuideStepUpdate, InspectionGuideStepOut,
    InspectionGuideSubStepCreate, InspectionGuideSubStepUpdate, InspectionGuideSubStepOut,
    GuideAssignmentPayload, ReorderPayload,
    InspectionParameterOut, InspectionParameterCreate, InspectionParameterUpdate,
    GuideParameterPayload, ExportDocxBatchPayload
)

router = APIRouter()


@router.get("/next-code")
def get_next_guide_code(doc_type: str = "SOS", db: Session = Depends(get_db)):
    """
    Sinh mã kế tiếp tự động theo loại tài liệu (SOS -> G7.CL.SOS.xxx, HDKT -> G7.CL.HDKT.xxx, CTQ -> G7.CL.CTQ.xxx)
    """
    next_code = generate_next_code(db, doc_type)
    return {"code": next_code, "doc_type": doc_type}


@router.get("", response_model=List[InspectionGuideListOut])
def read_guides(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = "",
    inspection_type: Optional[str] = None,
    doc_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    items, _ = list_guides(db, skip, limit, search, inspection_type, doc_type)
    return items


# --- Mobile (PHẢI đặt TRƯỚC /{guide_id} để tránh xung đột route) ---
@router.get("/mobile/{inspection_type}", response_model=Optional[InspectionGuideOut])
def mobile_guide(
    inspection_type: str,
    product_id: Optional[int] = None,
    category_id: Optional[int] = None,
    stage_id: Optional[int] = None,
    parameter: Optional[str] = None,
    parameter_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    guide = get_mobile_guide(db, inspection_type, product_id, category_id, stage_id, parameter, parameter_id)
    if not guide:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn cho loại phiếu này.")
    return guide


# --- Xuất file Word (.docx) & Tải theo lô (.zip) ---
@router.get("/export-docx-batch")
def export_guides_docx_batch_get(
    ids: str = Query(..., description="Danh sách ID tài liệu cách nhau bởi dấu phẩy, ví dụ: 1,2,3"),
    db: Session = Depends(get_db)
):
    """
    Xuất file Word cho danh sách tài liệu đã chọn (qua query param).
    - Nếu chọn 1 tài liệu: Trả về file .docx trực tiếp.
    - Nếu chọn từ 2 tài liệu trở lên: Đóng gói các file .docx vào 1 file .zip.
    """
    id_list = []
    for item in ids.split(","):
        clean_item = item.strip()
        if clean_item.isdigit():
            id_list.append(int(clean_item))

    if not id_list:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp ít nhất một mã tài liệu hợp lệ.")

    guides = [get_guide(db, gid) for gid in id_list]
    valid_guides = [g for g in guides if g is not None]

    if not valid_guides:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu nào phù hợp.")

    # Nếu chỉ có 1 tài liệu -> Tải trực tiếp .docx
    if len(valid_guides) == 1:
        g = valid_guides[0]
        docx_buf = generate_guide_docx(g, db)
        safe_code = re.sub(r'[\\/*?:"<>|]', '_', g.code or f"HD_{g.id}").strip()
        safe_name = re.sub(r'[\\/*?:"<>|]', '_', g.name or "Tai_lieu").strip()[:80]
        filename = f"{safe_code}_{safe_name}.docx"
        encoded_filename = quote(filename)

        return Response(
            content=docx_buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )

    # Nếu có nhiều tài liệu -> Đóng gói .zip
    zip_buf = generate_batch_guides_zip(valid_guides, db)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    doc_types = list({g.doc_type or "HDKT" for g in valid_guides})
    type_tag = doc_types[0] if len(doc_types) == 1 else "TAI_LIEU"
    zip_filename = f"{type_tag}_Selected_{len(valid_guides)}_Docs_{timestamp}.zip"
    encoded_zip = quote(zip_filename)

    return Response(
        content=zip_buf.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_zip}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.post("/export-docx-batch")
def export_guides_docx_batch_post(
    payload: ExportDocxBatchPayload,
    db: Session = Depends(get_db)
):
    """
    Xuất file Word cho danh sách tài liệu đã chọn (qua POST payload).
    """
    if not payload.guide_ids:
        raise HTTPException(status_code=400, detail="Danh sách tài liệu cần xuất không được để trống.")

    guides = [get_guide(db, gid) for gid in payload.guide_ids]
    valid_guides = [g for g in guides if g is not None]

    if not valid_guides:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu nào phù hợp.")

    # Nếu chỉ có 1 tài liệu -> Tải trực tiếp .docx
    if len(valid_guides) == 1:
        g = valid_guides[0]
        docx_buf = generate_guide_docx(g, db)
        safe_code = re.sub(r'[\\/*?:"<>|]', '_', g.code or f"HD_{g.id}").strip()
        safe_name = re.sub(r'[\\/*?:"<>|]', '_', g.name or "Tai_lieu").strip()[:80]
        filename = f"{safe_code}_{safe_name}.docx"
        encoded_filename = quote(filename)

        return Response(
            content=docx_buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )

    # Nếu có nhiều tài liệu -> Đóng gói .zip
    zip_buf = generate_batch_guides_zip(valid_guides, db)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    doc_types = list({g.doc_type or "HDKT" for g in valid_guides})
    type_tag = doc_types[0] if len(doc_types) == 1 else "TAI_LIEU"
    zip_filename = f"{type_tag}_Selected_{len(valid_guides)}_Docs_{timestamp}.zip"
    encoded_zip = quote(zip_filename)

    return Response(
        content=zip_buf.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_zip}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.get("/{guide_id}/export-docx")
def export_single_guide_docx(guide_id: int, db: Session = Depends(get_db)):
    """
    Xuất file Word (.docx) chi tiết cho 1 tài liệu duy nhất.
    """
    guide = get_guide(db, guide_id)
    if not guide:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn kiểm tra.")

    docx_buf = generate_guide_docx(guide, db)
    safe_code = re.sub(r'[\\/*?:"<>|]', '_', guide.code or f"HD_{guide.id}").strip()
    safe_name = re.sub(r'[\\/*?:"<>|]', '_', guide.name or "Tai_lieu").strip()[:80]
    filename = f"{safe_code}_{safe_name}.docx"
    encoded_filename = quote(filename)

    return Response(
        content=docx_buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.get("/{guide_id}", response_model=InspectionGuideOut)
def read_guide(guide_id: int, db: Session = Depends(get_db)):
    guide = get_guide(db, guide_id)
    if not guide:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn.")
    return guide


@router.post("", response_model=InspectionGuideOut)
def create_new_guide(
    guide: InspectionGuideCreate,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return create_guide(db, guide.code, guide.name, guide.description, user_id, guide.doc_type or "HDKT")


@router.put("/{guide_id}", response_model=InspectionGuideOut)
def update_existing_guide(guide_id: int, guide: InspectionGuideUpdate, db: Session = Depends(get_db)):
    existing = get_guide(db, guide_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn.")
    return update_guide(db, existing, guide.name, guide.description, guide.is_active, guide.doc_type)


@router.delete("/{guide_id}")
def delete_existing_guide(guide_id: int, db: Session = Depends(get_db)):
    existing = get_guide(db, guide_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn.")
    delete_guide(db, existing)
    return {"message": "Đã xóa hướng dẫn."}


# --- Steps ---
@router.post("/{guide_id}/steps", response_model=InspectionGuideStepOut)
def add_step(guide_id: int, step: InspectionGuideStepCreate, db: Session = Depends(get_db)):
    existing = get_guide(db, guide_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn.")
    return create_step(db, guide_id, step.step_no, step.title, step.content)


@router.put("/{guide_id}/steps/{step_id}", response_model=InspectionGuideStepOut)
def update_existing_step(guide_id: int, step_id: int, step: InspectionGuideStepUpdate, db: Session = Depends(get_db)):
    existing = db.query(InspectionGuideStep).filter(
        InspectionGuideStep.id == step_id,
        InspectionGuideStep.guide_id == guide_id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy bước.")
    return update_step(db, existing, step.step_no, step.title, step.content)


@router.delete("/{guide_id}/steps/{step_id}")
def delete_existing_step(guide_id: int, step_id: int, db: Session = Depends(get_db)):
    existing = db.query(InspectionGuideStep).filter(
        InspectionGuideStep.id == step_id,
        InspectionGuideStep.guide_id == guide_id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy bước.")
    delete_step(db, existing)
    return {"message": "Đã xóa bước."}


@router.post("/{guide_id}/steps/reorder")
def reorder_guide_steps(guide_id: int, payload: ReorderPayload, db: Session = Depends(get_db)):
    existing = get_guide(db, guide_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn.")
    reorder_steps(db, guide_id, payload.ids)
    return {"message": "Đã cập nhật thứ tự."}


# --- Sub-steps ---
@router.post("/{guide_id}/steps/{step_id}/sub-steps", response_model=InspectionGuideSubStepOut)
def add_sub_step(guide_id: int, step_id: int, sub: InspectionGuideSubStepCreate, db: Session = Depends(get_db)):
    existing = db.query(InspectionGuideStep).filter(
        InspectionGuideStep.id == step_id,
        InspectionGuideStep.guide_id == guide_id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy bước.")
    return create_sub_step(db, step_id, sub.sub_step_no, sub.content, sub.title)


@router.put("/{guide_id}/steps/{step_id}/sub-steps/{sub_step_id}", response_model=InspectionGuideSubStepOut)
def update_existing_sub_step(guide_id: int, step_id: int, sub_step_id: int, sub: InspectionGuideSubStepUpdate, db: Session = Depends(get_db)):
    existing = db.query(InspectionGuideSubStep).join(InspectionGuideStep).filter(
        InspectionGuideSubStep.id == sub_step_id,
        InspectionGuideSubStep.step_id == step_id,
        InspectionGuideStep.guide_id == guide_id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy bước nhỏ.")
    return update_sub_step(db, existing, sub.sub_step_no, sub.content, sub.title)


@router.delete("/{guide_id}/steps/{step_id}/sub-steps/{sub_step_id}")
def delete_existing_sub_step(guide_id: int, step_id: int, sub_step_id: int, db: Session = Depends(get_db)):
    existing = db.query(InspectionGuideSubStep).join(InspectionGuideStep).filter(
        InspectionGuideSubStep.id == sub_step_id,
        InspectionGuideSubStep.step_id == step_id,
        InspectionGuideStep.guide_id == guide_id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy bước nhỏ.")
    delete_sub_step(db, existing)
    return {"message": "Đã xóa bước nhỏ."}


@router.post("/{guide_id}/steps/{step_id}/sub-steps/reorder")
def reorder_guide_sub_steps(guide_id: int, step_id: int, payload: ReorderPayload, db: Session = Depends(get_db)):
    existing = db.query(InspectionGuideStep).filter(
        InspectionGuideStep.id == step_id,
        InspectionGuideStep.guide_id == guide_id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy bước.")
    reorder_sub_steps(db, step_id, payload.ids)
    return {"message": "Đã cập nhật thứ tự bước nhỏ."}


# --- Images ---
@router.post("/{guide_id}/steps/{step_id}/images")
async def upload_step_images(
    guide_id: int,
    step_id: int,
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    upload_list = []
    if files:
        upload_list.extend([f for f in files if f and f.filename])
    if file and file.filename:
        upload_list.append(file)
    if not upload_list:
        raise HTTPException(status_code=400, detail="Không có file ảnh nào được gửi lên.")
    return upload_images(db, guide_id, step_id, upload_list)


@router.delete("/{guide_id}/steps/{step_id}/images/{image_id}")
def delete_step_image(guide_id: int, step_id: int, image_id: int, db: Session = Depends(get_db)):
    image = db.query(InspectionGuideStepImage).filter(
        InspectionGuideStepImage.id == image_id,
        InspectionGuideStepImage.step_id == step_id,
        InspectionGuideStepImage.guide_id == guide_id
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh.")
    delete_image(db, image)
    return {"message": "Đã xóa ảnh."}


# --- Assignments ---
@router.post("/{guide_id}/check-conflicts")
def check_guide_assignment_conflicts(guide_id: int, payload: GuideAssignmentPayload, db: Session = Depends(get_db)):
    data = [a.model_dump() for a in payload.assignments]
    conflicts = check_assignment_conflicts(db, guide_id, data)
    return {
        "has_conflict": len(conflicts) > 0,
        "conflicts": conflicts
    }


@router.post("/check-conflicts")
def check_new_assignment_conflicts(payload: GuideAssignmentPayload, db: Session = Depends(get_db)):
    data = [a.model_dump() for a in payload.assignments]
    conflicts = check_assignment_conflicts(db, None, data)
    return {
        "has_conflict": len(conflicts) > 0,
        "conflicts": conflicts
    }


@router.post("/{guide_id}/assign")
def assign_guide(guide_id: int, payload: GuideAssignmentPayload, db: Session = Depends(get_db)):
    existing = get_guide(db, guide_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn.")
    data = [a.model_dump() for a in payload.assignments]
    set_assignments(db, guide_id, data)
    return {"message": "Đã cập nhật gán loại phiếu."}


# --- Guide Parameters (liên kết hướng dẫn ↔ thông số) ---
@router.post("/{guide_id}/parameters")
def assign_guide_parameters(guide_id: int, payload: GuideParameterPayload, db: Session = Depends(get_db)):
    existing = get_guide(db, guide_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn.")
    set_guide_parameters(db, guide_id, payload.parameter_ids)
    return {"message": "Đã cập nhật thông số đo cho hướng dẫn."}


# ==================== INSPECTION PARAMETERS (Master Data) ====================

parameter_router = APIRouter()


@parameter_router.get("", response_model=List[InspectionParameterOut])
def read_parameters(include_inactive: bool = False, db: Session = Depends(get_db)):
    # Auto-seed defaults on first access
    seed_default_parameters(db)
    return list_parameters(db, include_inactive)


@parameter_router.get("/{param_id}", response_model=InspectionParameterOut)
def read_parameter(param_id: int, db: Session = Depends(get_db)):
    param = get_parameter(db, param_id)
    if not param:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông số.")
    return param


@parameter_router.post("", response_model=InspectionParameterOut)
def create_new_parameter(body: InspectionParameterCreate, db: Session = Depends(get_db)):
    return create_parameter(
        db, body.code, body.name, body.unit,
        body.default_min, body.default_max, body.display_order or 0
    )


@parameter_router.put("/{param_id}", response_model=InspectionParameterOut)
def update_existing_parameter(param_id: int, body: InspectionParameterUpdate, db: Session = Depends(get_db)):
    param = get_parameter(db, param_id)
    if not param:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông số.")
    return update_parameter(db, param, **body.model_dump(exclude_unset=True))


@parameter_router.delete("/{param_id}")
def delete_existing_parameter(param_id: int, db: Session = Depends(get_db)):
    param = get_parameter(db, param_id)
    if not param:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông số.")
    delete_parameter(db, param)
    return {"message": "Đã xóa thông số."}
