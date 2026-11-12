# -*- coding: utf-8 -*-
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from config.database import get_db
from modules.warehouse.schemas import (
    UnitOfMeasureCreate,
    UnitOfMeasureUpdate,
    UnitOfMeasureResponse,
    UnitOfMeasureBatchImport,
)
from modules.warehouse.services import unit_of_measure_service

router = APIRouter()


@router.get("/", response_model=List[UnitOfMeasureResponse])
def get_units_of_measure(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return unit_of_measure_service.list_units(db, status=status, search=search)


@router.post("/", response_model=UnitOfMeasureResponse)
def create_unit_of_measure(
    payload: UnitOfMeasureCreate,
    db: Session = Depends(get_db),
):
    return unit_of_measure_service.create_unit(db, payload)


@router.put("/{unit_id}", response_model=UnitOfMeasureResponse)
def update_unit_of_measure(
    unit_id: int,
    payload: UnitOfMeasureUpdate,
    db: Session = Depends(get_db),
):
    return unit_of_measure_service.update_unit(db, unit_id, payload)


@router.delete("/{unit_id}")
def delete_unit_of_measure(
    unit_id: int,
    db: Session = Depends(get_db),
):
    unit_of_measure_service.delete_unit(db, unit_id)
    return {"message": "Đã xóa đơn vị tính thành công."}


@router.post("/import")
def import_units_of_measure(
    payload: UnitOfMeasureBatchImport,
    db: Session = Depends(get_db),
):
    return unit_of_measure_service.import_units(db, payload.items)

