# -*- coding: utf-8 -*-
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from modules.warehouse.models.unit_of_measure import UnitOfMeasure
from modules.warehouse.schemas import UnitOfMeasureCreate, UnitOfMeasureUpdate


def list_units(
    db: Session,
    status: Optional[str] = None,
    search: Optional[str] = None
) -> List[UnitOfMeasure]:
    query = db.query(UnitOfMeasure)
    if status and status != "ALL":
        query = query.filter(UnitOfMeasure.status == status)
    if search and search.strip():
        kw = f"%{search.strip()}%"
        query = query.filter(
            (UnitOfMeasure.code.ilike(kw)) | (UnitOfMeasure.full_name.ilike(kw))
        )
    return query.order_by(UnitOfMeasure.id.asc()).all()


def create_unit(db: Session, payload: UnitOfMeasureCreate) -> UnitOfMeasure:
    clean_code = (payload.code or "").strip()
    if not clean_code:
        raise HTTPException(status_code=400, detail="Tên đơn vị tính không được để trống.")

    existing = db.query(UnitOfMeasure).filter(
        func.lower(UnitOfMeasure.code) == clean_code.lower()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Đơn vị tính '{clean_code}' đã tồn tại.")

    unit = UnitOfMeasure(
        code=clean_code,
        full_name=(payload.full_name or "").strip(),
        precision=max(0, min(6, int(payload.precision or 0))),
        status=payload.status or "ACTIVE",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


def update_unit(db: Session, unit_id: int, payload: UnitOfMeasureUpdate) -> UnitOfMeasure:
    unit = db.query(UnitOfMeasure).filter(UnitOfMeasure.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn vị tính.")

    if payload.code is not None:
        clean_code = payload.code.strip()
        if not clean_code:
            raise HTTPException(status_code=400, detail="Tên đơn vị tính không được để trống.")
        dup = db.query(UnitOfMeasure).filter(
            func.lower(UnitOfMeasure.code) == clean_code.lower(),
            UnitOfMeasure.id != unit_id
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail=f"Đơn vị tính '{clean_code}' đã tồn tại.")
        unit.code = clean_code

    if payload.full_name is not None:
        unit.full_name = payload.full_name.strip()
    if payload.precision is not None:
        unit.precision = max(0, min(6, int(payload.precision)))
    if payload.status is not None:
        unit.status = payload.status

    unit.updated_at = datetime.now()
    db.commit()
    db.refresh(unit)
    return unit


def delete_unit(db: Session, unit_id: int) -> bool:
    unit = db.query(UnitOfMeasure).filter(UnitOfMeasure.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn vị tính.")
    db.delete(unit)
    db.commit()
    return True


def import_units(db: Session, items: List[UnitOfMeasureCreate]) -> dict:
    created = 0
    updated = 0
    for item in items:
        clean_code = (item.code or "").strip()
        if not clean_code:
            continue
        existing = db.query(UnitOfMeasure).filter(
            func.lower(UnitOfMeasure.code) == clean_code.lower()
        ).first()
        if existing:
            if item.full_name is not None:
                existing.full_name = item.full_name.strip()
            existing.precision = max(0, min(6, int(item.precision or 0)))
            existing.status = item.status or "ACTIVE"
            existing.updated_at = datetime.now()
            updated += 1
        else:
            db.add(UnitOfMeasure(
                code=clean_code,
                full_name=(item.full_name or "").strip(),
                precision=max(0, min(6, int(item.precision or 0))),
                status=item.status or "ACTIVE",
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ))
            created += 1
    db.commit()
    return {"created": created, "updated": updated}

