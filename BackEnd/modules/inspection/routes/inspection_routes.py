import os
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from config.database import get_db
from modules.inspection.models.input_inspection import InputInspection
from modules.inspection.schemas.input_inspection import InputInspection as InspectionSchema
from modules.inspection.models.defect_type import DefectType
from modules.inspection.schemas.defect_type import DefectType as DefectTypeSchema, DefectTypeCreate
from modules.inspection.schemas.daily_inspection import DailyInspectionRecordCreate, DailyInspectionRecordRead
from modules.inspection.models.daily_inspection import DailyInspectionRecord, DailyInspectionDefect
from modules.inspection.models.stage_inspection import StageInspection
from modules.inspection.schemas.stage_inspection import StageInspectionCreate, StageInspectionRead
from modules.auth.models.accounts import Account

router = APIRouter()

@router.post("/daily", response_model=DailyInspectionRecordRead)
def create_daily_inspection(
    data: DailyInspectionRecordCreate,
    db: Session = Depends(get_db)
):
    """
    [POST] Lưu kết quả kiểm tra hàng ngày (Thông tin chung + Danh sách lỗi).
    """
    try:
        # 1. Tạo bản ghi chung
        new_record = DailyInspectionRecord(
            inspection_date = data.inspection_date or datetime.date.today(),
            stage_name      = data.stage_name,
            inspector_id    = data.inspector_id,
            total_products  = data.total_products,
            total_defects   = data.total_defects,
            defect_rate     = data.defect_rate
        )
        db.add(new_record)
        db.flush() # Để lấy ID của new_record

        # 2. Tạo các bản ghi lỗi chi tiết
        for d in data.defects:
            defect_detail = DailyInspectionDefect(
                record_id = new_record.id,
                defect_id = d.defect_id,
                quantity  = d.quantity
            )
            db.add(defect_detail)

        db.commit()
        db.refresh(new_record)
        return new_record

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu phiếu kiểm tra: {str(e)}")

@router.get("/daily", response_model=List[DailyInspectionRecordRead])
def get_daily_inspections(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách phiếu kiểm tra hàng ngày.
    """
    records = db.query(DailyInspectionRecord).order_by(DailyInspectionRecord.inspection_date.desc()).offset(skip).limit(limit).all()
    
    # Gắn thêm tên người kiểm tra
    for r in records:
        if r.inspector_id:
            user = db.query(Account).filter(Account.id == r.inspector_id).first()
            if user:
                r.inspector_name = user.full_name
    return records

@router.post("/stage", response_model=StageInspectionRead)
def create_stage_inspection(
    data: StageInspectionCreate,
    db: Session = Depends(get_db)
):
    """
    [POST] Lưu kết quả kiểm tra theo công đoạn (Stage Inspection).
    """
    try:
        new_record = StageInspection(
            inspection_type = data.inspection_type,
            batch_no        = data.batch_no,
            product_sku     = data.product_sku,
            inspector_name  = data.inspector_name,
            conclusion      = data.conclusion,
            notes           = data.notes,
            data_json       = data.data_json,
            images_json     = data.images_json
        )
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        return new_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu phiếu kiểm tra công đoạn: {str(e)}")

@router.get("/stage/{id}", response_model=StageInspectionRead)
def get_stage_inspection(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết một phiếu kiểm tra công đoạn.
    """
    record = db.query(StageInspection).filter(StageInspection.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu kiểm tra")
    return record

@router.get("/stage", response_model=List[StageInspectionRead])
def get_stage_inspections(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách phiếu kiểm tra công đoạn.
    """
    return db.query(StageInspection).order_by(StageInspection.inspection_date.desc()).offset(skip).limit(limit).all()

UPLOAD_DIR = "static/uploads/inspections"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=InspectionSchema)
async def create_inspection(
    plan_id:         int   = Form(...),
    part_name:       str   = Form(...),
    specification:   Optional[str]   = Form(None),
    cont_name:       Optional[str]   = Form(None),
    stage:           Optional[str]   = Form(None),
    inspector_id:    Optional[int]   = Form(None),
    measured_length: Optional[float] = Form(None),
    measured_width:  Optional[float] = Form(None),
    measured_height: Optional[float] = Form(None),
    result:          str   = Form(...),   # 'Đạt' | 'Không đạt'
    note:            Optional[str]   = Form(None),
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db)
):
    """
    [POST] Tạo kết quả kiểm tra đầu vào mới.
    Nhận tối đa 3 ảnh minh chứng.
    """
    try:
        image_paths = []
        for file in files[:3]:  # Giới hạn tối đa 3 ảnh
            ext = os.path.splitext(file.filename)[1]
            filename = f"{uuid.uuid4()}{ext}"
            filepath = os.path.join(UPLOAD_DIR, filename)
            with open(filepath, "wb") as buffer:
                buffer.write(await file.read())
            image_paths.append(f"/static/uploads/inspections/{filename}")

        new_inspection = InputInspection(
            plan_id         = plan_id,
            part_name       = part_name,
            specification   = specification,
            cont_name       = cont_name,
            stage           = stage,
            inspector_id    = inspector_id,
            measured_length = measured_length,
            measured_width  = measured_width,
            measured_height = measured_height,
            result          = result,
            note            = note,
            image_path_1    = image_paths[0] if len(image_paths) > 0 else None,
            image_path_2    = image_paths[1] if len(image_paths) > 1 else None,
            image_path_3    = image_paths[2] if len(image_paths) > 2 else None,
            inspected_at    = datetime.datetime.now()
        )
        db.add(new_inspection)
        db.commit()
        db.refresh(new_inspection)

        # [Realtime WebSocket] Báo cho toàn bộ phận tại công đoạn này cập nhật kết quả KT mới nhất
        try:
            from shared.services.websocket_service import socket_manager
            await socket_manager.broadcast_to_stage(
                db, 
                stage_name=stage, 
                message={
                    "type": "QC_CONFIRMED", 
                    "plan_id": plan_id, 
                    "part_name": part_name, 
                    "specification": specification,
                    "result": result
                }
            )
        except Exception as e:
            print(f"Lỗi WebSocket khi gửi kết quả KT: {e}")

        return new_inspection

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu kết quả KT: {str(e)}")

@router.post("/upload")
async def upload_inspection_images(
    files: List[UploadFile] = File(...)
):
    """
    [POST] Tải ảnh lên máy chủ và trả về danh sách đường dẫn.
    """
    try:
        image_paths = []
        for file in files:
            ext = os.path.splitext(file.filename)[1]
            filename = f"{uuid.uuid4()}{ext}"
            filepath = os.path.join(UPLOAD_DIR, filename)
            with open(filepath, "wb") as buffer:
                buffer.write(await file.read())
            image_paths.append(f"/static/uploads/inspections/{filename}")
        return {"paths": image_paths}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tải ảnh lên: {str(e)}")


@router.get("/plan/{plan_id}", response_model=List[InspectionSchema])
def get_inspections_by_plan(plan_id: int, stage: Optional[str] = None, db: Session = Depends(get_db)):
    """
    [GET] Lấy tất cả kết quả KT đầu vào theo KHSX. Có thể lọc theo công đoạn.
    """
    query = db.query(InputInspection).filter(InputInspection.plan_id == plan_id)
    if stage:
        query = query.filter(InputInspection.stage == stage)
    return query.order_by(InputInspection.inspected_at.desc()).all()


@router.get("/plan/{plan_id}/part", response_model=Optional[InspectionSchema])
def get_inspection_by_part(
    plan_id: int,
    part_name: str,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy kết quả KT mới nhất cho một chi tiết cụ thể trong KHSX.
    Query param: ?part_name=Thanh ngang
    """
    result = db.query(InputInspection).filter(
        InputInspection.plan_id == plan_id,
        InputInspection.part_name.ilike(f"%{part_name}%")
    ).order_by(InputInspection.inspected_at.desc()).first()
    return result

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
    """
    [POST] Tạo mới một loại lỗi.
    """
    defect = DefectType(
        name=data.name,
        category=data.category,
        needs_tracking=data.needs_tracking,
        is_active=data.is_active
    )
    db.add(defect)
    db.commit()
    db.refresh(defect)
    return defect

@router.put("/defect-types/{defect_id}", response_model=DefectTypeSchema)
def update_defect_type(defect_id: int, data: DefectTypeCreate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin loại lỗi.
    """
    defect = db.query(DefectType).filter(DefectType.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại lỗi")
    
    defect.name = data.name
    defect.category = data.category
    defect.needs_tracking = data.needs_tracking
    defect.is_active = data.is_active
    
    db.commit()
    db.refresh(defect)
    return defect

@router.patch("/defect-types/{defect_id}/toggle-tracking", response_model=DefectTypeSchema)
def toggle_defect_tracking(defect_id: int, db: Session = Depends(get_db)):
    """
    [PATCH] Bật/Tắt trạng thái 'needs_tracking' cho một loại lỗi.
    """
    defect = db.query(DefectType).filter(DefectType.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại lỗi này")
    
    defect.needs_tracking = not defect.needs_tracking
    db.commit()
    db.refresh(defect)
    return defect

@router.delete("/defect-types/{defect_id}")
def delete_defect_type(defect_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa mềm loại lỗi (is_active = False).
    """
    defect = db.query(DefectType).filter(DefectType.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại lỗi")
    
    defect.is_active = False
    db.commit()
    return {"status": "success", "message": "Đã ngưng hoạt động loại lỗi thành công"}

