from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
import shutil
import os

from config.database import get_db
from modules.production.controllers.production_controller import (
    import_production_plan_from_excel,
    get_all_production_plans,
    get_production_plan_detail
)
from modules.production.schemas.product_plan import ProductPlan, ProductPlanDetailOut
from typing import List

router = APIRouter()

@router.post("/import")
async def import_production_plan(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Import Kế Hoạch Sản Xuất từ file Excel.
    Tự động parse Đơn hàng, Sản phẩm và Clone cây BOM từ Master Data.
    """
    upload_dir = "static/uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    file_path = f"{upload_dir}/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return StreamingResponse(
        import_production_plan_from_excel(file_path, db), 
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@router.get("/", response_model=List[ProductPlan])
def read_production_plans(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả Kế hoạch sản xuất"""
    return get_all_production_plans(db)

@router.get("/{plan_id}", response_model=ProductPlanDetailOut)
def read_production_plan_detail(plan_id: int, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết một Kế hoạch sản xuất, bao gồm các Đơn hàng và Sản phẩm"""
    plan = get_production_plan_detail(plan_id, db)
    return plan
