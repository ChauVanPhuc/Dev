# -*- coding: utf-8 -*-
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from config.database import get_db

from modules.inspection_guide.schemas.inspection_form_type import (
    InspectionFormTypeOut, InspectionFormTypeCreate, InspectionFormTypeUpdate
)
from modules.inspection_guide.services.inspection_form_type_service import (
    list_form_types, get_form_type, create_form_type, update_form_type,
    delete_form_type, seed_default_form_types
)

router = APIRouter()


@router.get("", response_model=List[InspectionFormTypeOut])
def read_inspection_form_types(
    include_inactive: bool = Query(False, description="Bao gồm cả các loại phiếu đang tạm tắt"),
    db: Session = Depends(get_db)
):
    # Auto-seed defaults if table is empty
    seed_default_form_types(db)
    return list_form_types(db, include_inactive=include_inactive)


@router.get("/{type_id}", response_model=InspectionFormTypeOut)
def read_inspection_form_type(type_id: int, db: Session = Depends(get_db)):
    item = get_form_type(db, type_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại phiếu kiểm tra.")
    return item


@router.post("", response_model=InspectionFormTypeOut)
def create_new_inspection_form_type(body: InspectionFormTypeCreate, db: Session = Depends(get_db)):
    try:
        return create_form_type(db, **body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{type_id}", response_model=InspectionFormTypeOut)
def update_existing_inspection_form_type(
    type_id: int, body: InspectionFormTypeUpdate, db: Session = Depends(get_db)
):
    item = get_form_type(db, type_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại phiếu kiểm tra.")
    return update_form_type(db, item, **body.model_dump(exclude_unset=True))


@router.delete("/{type_id}")
def delete_existing_inspection_form_type(type_id: int, db: Session = Depends(get_db)):
    item = get_form_type(db, type_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại phiếu kiểm tra.")
    try:
        delete_form_type(db, item)
        return {"message": "Đã xóa loại phiếu kiểm tra."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
