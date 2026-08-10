# -*- coding: utf-8 -*-
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from config.database import get_db

from modules.inspection_guide.models.inspection_guide import InspectionGuideStep, InspectionGuideSubStep, InspectionGuideStepImage
from modules.inspection_guide.services.inspection_guide_service import (
    list_guides, get_guide, create_guide, update_guide, delete_guide,
    create_step, update_step, delete_step, reorder_steps,
    create_sub_step, update_sub_step, delete_sub_step, reorder_sub_steps,
    upload_images, delete_image, set_assignments, get_mobile_guide
)
from modules.inspection_guide.schemas.inspection_guide import (
    InspectionGuideCreate, InspectionGuideUpdate, InspectionGuideOut, InspectionGuideListOut,
    InspectionGuideStepCreate, InspectionGuideStepUpdate, InspectionGuideStepOut,
    InspectionGuideSubStepCreate, InspectionGuideSubStepUpdate, InspectionGuideSubStepOut,
    GuideAssignmentPayload, ReorderPayload
)

router = APIRouter()


@router.get("", response_model=List[InspectionGuideListOut])
def read_guides(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = "",
    inspection_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    items, _ = list_guides(db, skip, limit, search, inspection_type)
    return items


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
    return create_guide(db, guide.code, guide.name, guide.description, user_id)


@router.put("/{guide_id}", response_model=InspectionGuideOut)
def update_existing_guide(guide_id: int, guide: InspectionGuideUpdate, db: Session = Depends(get_db)):
    existing = get_guide(db, guide_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn.")
    return update_guide(db, existing, guide.name, guide.description, guide.is_active)


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
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    return upload_images(db, guide_id, step_id, files)


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
@router.post("/{guide_id}/assign")
def assign_guide(guide_id: int, payload: GuideAssignmentPayload, db: Session = Depends(get_db)):
    existing = get_guide(db, guide_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn.")
    data = [a.model_dump() for a in payload.assignments]
    set_assignments(db, guide_id, data)
    return {"message": "Đã cập nhật gán loại phiếu."}


# --- Mobile ---
@router.get("/mobile/{inspection_type}", response_model=Optional[InspectionGuideOut])
def mobile_guide(
    inspection_type: str,
    product_id: Optional[int] = None,
    category_id: Optional[int] = None,
    stage_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    guide = get_mobile_guide(db, inspection_type, product_id, category_id, stage_id)
    if not guide:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn cho loại phiếu này.")
    return guide
