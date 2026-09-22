# -*- coding: utf-8 -*-
import time
from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc

from app.core.database import get_db
from lpn_crawler.backend.models.models import LpnContainer, LpnItem
from lpn_crawler.backend.services.excel import generate_excel_export
from lpn_crawler.backend.utils.formatters import format_date_mdy

router = APIRouter()


@router.get("/export")
def export_excel_data(
    search: Optional[str] = None,
    factory: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Xuất file Excel row-based chèn hình ảnh thực tế (Embedded Pictures)
    Mặc định sắp xếp theo Date loading sớm nhất.
    """
    query = db.query(LpnContainer).options(joinedload(LpnContainer.items).joinedload(LpnItem.images))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(LpnContainer.container_number.ilike(s), LpnContainer.factory.ilike(s)))

    if factory:
        query = query.filter(LpnContainer.factory.ilike(f"%{factory.strip()}%"))

    containers = query.order_by(
        desc(LpnContainer.date_loading),
        desc(LpnContainer.timestamp_val),
        desc(LpnContainer.date_loading_raw),
        desc(LpnContainer.id)
    ).all()

    data_list = []
    for c in containers:
        c_dict = {
            "container_number": c.container_number,
            "factory": c.factory,
            "date_loading_raw": c.date_loading_raw,
            "date_loading": format_date_mdy(c.date_loading, c.date_loading_raw),
            "timestamp_raw": c.timestamp_raw,
            "timestamp_val": c.timestamp_val,
            "operator_name": c.operator_name,
            "items": [
                {
                    "record_type": item.record_type,
                    "suffix_key": item.suffix_key,
                    "batch_original": item.batch_original,
                    "batch_resolved": item.batch_resolved,
                    "lpn": item.lpn,
                    "sku": item.sku,
                    "images": [
                        {"local_path": img.local_path} for img in item.images
                    ]
                } for item in c.items
            ]
        }
        data_list.append(c_dict)

    file_name = f"LPN_Containers_Export_{int(time.time())}.xlsx"
    file_path = generate_excel_export(data_list, file_name)

    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
