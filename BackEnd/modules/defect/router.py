# -*- coding: utf-8 -*-
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.defect.models import DefectType, ClientDefect, DefectGlossary
from app.modules.defect.schemas import (
    DefectType as DefectTypeSchema,
    DefectTypeCreate,
    ClientDefect as ClientDefectSchema,
    ClientDefectCreate
)
from app.shared.utils import clean_and_standardize_name

router = APIRouter()

@router.get("/defect-glossary")
def get_defect_glossary(
    source: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy bảng chú thích các ký tự viết tắt / phân loại lỗi.
    Có thể lọc theo source: 'ATLAS' hoặc 'G7'.
    """
    query = db.query(DefectGlossary)
    if source:
        query = query.filter(DefectGlossary.source.ilike(source))
    return query.all()

@router.get("/defect-types", response_model=List[DefectTypeSchema])
def get_defect_types(
    category: Optional[str] = None, 
    include_inactive: bool = False, 
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách các loại lỗi từ danh mục. Có thể lọc theo nhóm.
    """
    query = db.query(DefectType)
    if not include_inactive:
        query = query.filter(DefectType.is_active == True)
    if category:
        query = query.filter(DefectType.category == category)
    
    return query.all()

@router.post("/defect-types", response_model=DefectTypeSchema)
def create_defect_type(data: DefectTypeCreate, db: Session = Depends(get_db)):
    existing = None
    if data.code:
        existing = db.query(DefectType).filter(DefectType.code == data.code).first()
        
    if not existing:
        defect = DefectType(
            name=data.name,
            code=data.code,
            category=data.category,
            stage=data.stage,
            description=data.description,
            aql_class=data.aql_class,
            needs_tracking=data.needs_tracking,
            qc_tracking=data.qc_tracking,
            is_active=True
        )
        db.add(defect)
    else:
        defect = existing
        defect.name = data.name
        defect.category = data.category
        defect.stage = data.stage
        defect.description = data.description
        defect.aql_class = data.aql_class
        defect.needs_tracking = data.needs_tracking
        defect.qc_tracking = data.qc_tracking
        defect.is_active = True

    db.commit()
    db.refresh(defect)
    return defect

@router.put("/defect-types/{defect_id}", response_model=DefectTypeSchema)
def update_defect_type(defect_id: int, data: DefectTypeCreate, db: Session = Depends(get_db)):
    defect = db.query(DefectType).filter(DefectType.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại lỗi này")

    defect.name = data.name
    if data.code:
        defect.code = data.code
    defect.category = data.category
    defect.stage = data.stage
    defect.description = data.description
    defect.aql_class = data.aql_class
    defect.needs_tracking = data.needs_tracking
    defect.qc_tracking = data.qc_tracking

    db.commit()
    db.refresh(defect)
    return defect

@router.delete("/defect-types/{defect_id}")
def delete_defect_type(defect_id: int, db: Session = Depends(get_db)):
    defect = db.query(DefectType).filter(DefectType.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại lỗi")
    
    defect.is_active = False
    db.commit()
    return {"status": "success", "message": "Đã ngưng hoạt động loại lỗi thành công"}

@router.get("/client-defects", response_model=List[ClientDefectSchema])
def get_client_defects(
    g7_code: Optional[str] = None, 
    include_inactive: bool = False, 
    db: Session = Depends(get_db)
):
    query = db.query(ClientDefect)
    if not include_inactive:
        query = query.filter(ClientDefect.is_active == True)
    if g7_code:
        query = query.filter(ClientDefect.g7_code == g7_code)
    return query.all()

@router.post("/client-defects", response_model=ClientDefectSchema)
def create_client_defect(data: ClientDefectCreate, db: Session = Depends(get_db)):
    g7_defect = None
    if data.g7_code:
        g7_defect = db.query(DefectType).filter(DefectType.code == data.g7_code).first()
        
    client_def = db.query(ClientDefect).filter(ClientDefect.code == data.code).first()
    if not client_def:
        client_def = ClientDefect(
            code=data.code,
            name=data.name,
            name_en=data.name_en,
            detection_method=data.detection_method,
            g7_code=data.g7_code,
            defect_type_id=g7_defect.id if g7_defect else None,
            is_active=True
        )
        db.add(client_def)
    else:
        client_def.name = data.name
        client_def.name_en = data.name_en
        client_def.detection_method = data.detection_method
        client_def.g7_code = data.g7_code
        client_def.defect_type_id = g7_defect.id if g7_defect else client_def.defect_type_id
        client_def.is_active = True

    db.commit()
    db.refresh(client_def)
    return client_def

@router.put("/client-defects/{defect_id}", response_model=ClientDefectSchema)
def update_client_defect(defect_id: int, data: ClientDefectCreate, db: Session = Depends(get_db)):
    client_def = db.query(ClientDefect).filter(ClientDefect.id == defect_id).first()
    if not client_def:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại lỗi khách hàng")

    g7_defect = None
    if data.g7_code:
        g7_defect = db.query(DefectType).filter(DefectType.code == data.g7_code).first()

    client_def.code = data.code
    client_def.name = data.name
    client_def.name_en = data.name_en
    client_def.detection_method = data.detection_method
    client_def.g7_code = data.g7_code
    client_def.defect_type_id = g7_defect.id if g7_defect else client_def.defect_type_id

    db.commit()
    db.refresh(client_def)
    return client_def

@router.delete("/client-defects/{defect_id}")
def delete_client_defect(defect_id: int, db: Session = Depends(get_db)):
    client_def = db.query(ClientDefect).filter(ClientDefect.id == defect_id).first()
    if not client_def:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại lỗi khách hàng")
    
    client_def.is_active = False
    db.commit()
    return {"status": "success", "message": "Đã ngưng hoạt động loại lỗi khách hàng thành công"}

@router.post("/import-excel-data")
def import_excel_data(payload: dict, db: Session = Depends(get_db)):
    target_tab = payload.get("target_tab", "g7")
    items = payload.get("items", [])
    saved_count = 0

    if target_tab == "g7":
        for item in items:
            code = str(item.get("code", "")).strip()
            name = str(item.get("name", "")).strip()
            if not code or not name:
                continue
            existing = db.query(DefectType).filter(DefectType.code == code).first()
            if not existing:
                existing = DefectType(code=code, name=name, category=item.get("category", "general"), is_active=True)
                db.add(existing)
            else:
                existing.name = name
                existing.is_active = True
            saved_count += 1
        db.commit()

    elif target_tab == "client":
        for item in items:
            code = str(item.get("code", "")).strip()
            name = str(item.get("name", "")).strip()
            if not code or not name:
                continue
            g7_code = str(item.get("g7_code", "")).strip()
            g7_def = db.query(DefectType).filter(DefectType.code == g7_code).first() if g7_code else None
            existing = db.query(ClientDefect).filter(ClientDefect.code == code).first()
            if not existing:
                existing = ClientDefect(code=code, name=name, g7_code=g7_code, defect_type_id=g7_def.id if g7_def else None, is_active=True)
                db.add(existing)
            else:
                existing.name = name
                existing.g7_code = g7_code
                existing.defect_type_id = g7_def.id if g7_def else None
                existing.is_active = True
            saved_count += 1
        db.commit()
        
    elif target_tab == "classification":
        for item in items:
            code = str(item.get("code", "")).strip()
            desc = str(item.get("description", "")).strip()
            code_up = code.upper()
            desc_up = desc.upper()
            if not code or not desc:
                continue
            if code_up in ["KÝ TỰ", "KÝ HIỆU", "STT"] or desc_up in ["MÔ TẢ", "MÔ TẢ CHI TIẾT"] or code_up == desc_up:
                continue
            
            source = "ATLAS" if (code.startswith("DV") or code in ["NP", "DF"]) else "G7"
            existing = db.query(DefectGlossary).filter(DefectGlossary.code == code, DefectGlossary.source == source).first()
            if not existing:
                existing = DefectGlossary(code=code, source=source, description=desc)
                db.add(existing)
            else:
                existing.description = desc
            saved_count += 1
        db.commit()

    filename = payload.get("filename")
    file_bytes_base64 = payload.get("file_bytes_base64")
    if saved_count > 0 and filename and file_bytes_base64:
        try:
            import base64
            from app.core.input_archive_service import archive_input_file
            file_bytes = base64.b64decode(file_bytes_base64)
            archive_input_file("error_codes", "excel", filename, file_bytes)
        except Exception as arch_err:
            import logging
            logging.getLogger("defect_router").warning(f"Failed to archive error_codes input file: {arch_err}")

    return {"status": "success", "saved_count": saved_count}
