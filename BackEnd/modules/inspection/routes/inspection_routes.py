import os
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from config.database import get_db
from modules.inspection.models.input_inspection import InputInspection
from modules.inspection.schemas.input_inspection import InputInspection as InspectionSchema
from modules.inspection.models.defect_type import DefectType
from modules.inspection.models.user_defect_tracking import UserDefectTracking
from modules.inspection.schemas.defect_type import DefectType as DefectTypeSchema, DefectTypeCreate
from modules.inspection.schemas.daily_inspection import (
    DailyInspectionRecordCreate, 
    DailyInspectionRecordRead,
    DailyInspectionAnalytics,
    DailyInspectionSummary,
    ParetoItem,
    TrendItem,
    DistributionItem
)
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

@router.get("/test-sync")
def test_sync():
    return {"status": "ok", "message": "Backend code is synced"}

@router.get("/stage/{id}", response_model=StageInspectionRead)
def get_stage_inspection(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết một phiếu kiểm tra công đoạn.
    """
    record = db.query(StageInspection).filter(StageInspection.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu kiểm tra")
    return record

@router.put("/stage/{id}", response_model=StageInspectionRead)
def update_stage_inspection(
    id: int,
    data: StageInspectionCreate,
    db: Session = Depends(get_db)
):
    """
    [PUT] Cập nhật kết quả kiểm tra theo công đoạn.
    """
    return do_update_stage(id, data, db)

@router.post("/stage/{id}", response_model=StageInspectionRead)
def update_stage_inspection_post(
    id: int,
    data: StageInspectionCreate,
    db: Session = Depends(get_db)
):
    """
    [POST] Cập nhật kết quả kiểm tra theo công đoạn (Dành cho trường hợp PUT bị chặn).
    """
    return do_update_stage(id, data, db)

def do_update_stage(id: int, data: StageInspectionCreate, db: Session):
    record = db.query(StageInspection).filter(StageInspection.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu kiểm tra")
    
    try:
        record.inspection_type = data.inspection_type
        record.batch_no        = data.batch_no
        record.product_sku     = data.product_sku
        record.inspector_name  = data.inspector_name
        record.conclusion      = data.conclusion
        record.notes           = data.notes
        record.data_json       = data.data_json
        record.images_json     = data.images_json
        record.updated_at      = datetime.datetime.now()
        
        db.commit()
        db.refresh(record)
        return record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật phiếu kiểm tra công đoạn: {str(e)}")

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
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách các loại lỗi từ danh mục. Có thể lọc theo nhóm.
    Nếu truyền user_id, sẽ trả về trạng thái theo dõi cá nhân của user đó.
    """
    query = db.query(DefectType)
    if not include_inactive:
        query = query.filter(DefectType.is_active == True)
    if category:
        query = query.filter(DefectType.category == category)
    
    defects = query.all()
    
    # Nếu có user_id, lấy danh sách ID lỗi mà user này đang track
    tracked_defect_ids = []
    if user_id:
        tracked_defect_ids = [
            r.defect_id for r in db.query(UserDefectTracking.defect_id)
            .filter(UserDefectTracking.user_id == user_id)
            .all()
        ]
    
    # Gán trạng thái is_tracked_by_me cho từng bản ghi
    for d in defects:
        d.is_tracked_by_me = d.id in tracked_defect_ids
        
    return defects

@router.post("/defect-types", response_model=DefectTypeSchema)
def create_defect_type(data: DefectTypeCreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới một loại lỗi.
    """
    defect = DefectType(
        name=data.name,
        category=data.category,
        stage=data.stage,
        description=data.description,
        needs_tracking=data.needs_tracking,
        qc_tracking=data.qc_tracking,
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
    defect.stage = data.stage
    defect.description = data.description
    defect.needs_tracking = data.needs_tracking
    defect.qc_tracking = data.qc_tracking
    defect.is_active = data.is_active
    
    db.commit()
    db.refresh(defect)
    return defect

@router.patch("/defect-types/{defect_id}/toggle-tracking", response_model=DefectTypeSchema)
def toggle_defect_tracking(defect_id: int, db: Session = Depends(get_db)):
    """
    [PATCH] Bật/Tắt trạng thái 'needs_tracking' (QA Tracking) cho một loại lỗi.
    """
    defect = db.query(DefectType).filter(DefectType.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại lỗi này")
    
    defect.needs_tracking = not defect.needs_tracking
    db.commit()
    db.refresh(defect)
    return defect

@router.patch("/defect-types/{defect_id}/toggle-qc-tracking", response_model=DefectTypeSchema)
def toggle_qc_defect_tracking(defect_id: int, user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    [PATCH] Bật/Tắt trạng thái theo dõi cá nhân cho một loại lỗi của QC.
    Nếu không có user_id, nó sẽ toggle cột qc_tracking toàn cục (legacy).
    """
    defect = db.query(DefectType).filter(DefectType.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại lỗi này")
    
    if user_id:
        # Xử lý theo dõi cá nhân
        tracking = db.query(UserDefectTracking).filter(
            UserDefectTracking.user_id == user_id,
            UserDefectTracking.defect_id == defect_id
        ).first()
        
        if tracking:
            # Nếu đang track thì xóa đi (Un-track)
            db.delete(tracking)
            defect.is_tracked_by_me = False
        else:
            # Nếu chưa track thì thêm mới (Track)
            new_tracking = UserDefectTracking(user_id=user_id, defect_id=defect_id)
            db.add(new_tracking)
            defect.is_tracked_by_me = True
        
        db.commit()
        db.refresh(defect)
        return defect
    else:
        # Fallback: Xử lý theo dõi toàn cục
        defect.qc_tracking = not defect.qc_tracking
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

# --- ANALYTICS ENDPOINTS ---

@router.get("/daily/analytics", response_model=DailyInspectionAnalytics)
def get_daily_inspection_analytics(
    start_date: Optional[datetime.date] = None,
    end_date: Optional[datetime.date] = None,
    stage: Optional[str] = None,
    category: Optional[str] = None, # Thêm lọc theo nhóm lỗi
    group_by: Optional[str] = "date", # 'date' hoặc 'month'
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy dữ liệu phân tích lỗi (Pareto, Trend, Distribution).
    """
    # 1. Filter conditions for Records
    record_filters = []
    if start_date:
        record_filters.append(DailyInspectionRecord.inspection_date >= start_date)
    if end_date:
        record_filters.append(DailyInspectionRecord.inspection_date <= end_date)
    if stage:
        record_filters.append(DailyInspectionRecord.stage_name == stage)

    # 2. Base Records Query (Dùng để tính Tổng sản phẩm và Số phiếu)
    # QUAN TRỌNG: Không join với defect_types ở bước này để tránh mất các phiếu có 0 lỗi hoặc sai lệch số lượng sản phẩm
    base_records_query = db.query(
        DailyInspectionRecord.id,
        DailyInspectionRecord.total_products
    ).filter(*record_filters)
    
    base_records = base_records_query.all()
    record_ids = [r.id for r in base_records]
    total_records = len(record_ids)
    total_products = sum(r.total_products for r in base_records) if base_records else 0

    # 3. Calculate Total Defects for the selected category
    if not record_ids:
        summary = DailyInspectionSummary(total_records=0, total_products=0, total_defects=0, avg_defect_rate=0.0)
    else:
        defect_query = db.query(func.sum(DailyInspectionDefect.quantity))\
                         .join(DefectType, DefectType.id == DailyInspectionDefect.defect_id)\
                         .filter(DailyInspectionDefect.record_id.in_(record_ids))
        
        if category:
            defect_query = defect_query.filter(DefectType.category == category)
        
        total_defects_val = defect_query.scalar() or 0
        avg_rate = (total_defects_val / total_products * 100) if total_products > 0 else 0

        summary = DailyInspectionSummary(
            total_records = total_records,
            total_products = total_products,
            total_defects = int(total_defects_val),
            avg_defect_rate = round(float(avg_rate), 2)
        )

    # 4. Pareto Data (Top 5)
    if not record_ids:
        pareto_data = []
    else:
        pareto_base = db.query(
            DefectType.name.label("defect_name"),
            func.sum(DailyInspectionDefect.quantity).label("count")
        ).join(DailyInspectionDefect, DefectType.id == DailyInspectionDefect.defect_id)\
         .filter(DailyInspectionDefect.record_id.in_(record_ids))\
         .group_by(DefectType.name)
        
        if category:
            pareto_base = pareto_base.filter(DefectType.category == category)
            
        all_pareto_results = pareto_base.order_by(func.sum(DailyInspectionDefect.quantity).desc()).all()
        total_sum_defects = sum(item.count for item in all_pareto_results)
        
        # Chỉ lấy 5 loại lỗi cao nhất
        top_5_results = all_pareto_results[:5]
        
        pareto_data = []
        cumulative_count = 0
        for item in top_5_results:
            count = int(item.count)
            cumulative_count += count
            percentage = (count / total_sum_defects * 100) if total_sum_defects > 0 else 0
            cumulative_percentage = (cumulative_count / total_sum_defects * 100) if total_sum_defects > 0 else 0
            
            pareto_data.append(ParetoItem(
                defect_name = item.defect_name,
                count = count,
                percentage = round(percentage, 2),
                cumulative_percentage = round(cumulative_percentage, 2)
            ))

    # 5. Trend Data (Grouping logic)
    if group_by == "month":
        # Group by Month
        date_trunc = func.datefromparts(
            func.year(DailyInspectionRecord.inspection_date),
            func.month(DailyInspectionRecord.inspection_date),
            1
        )
    else:
        # Group by Date
        date_trunc = DailyInspectionRecord.inspection_date

    # Subquery để lấy số lượng lỗi theo từng record (có lọc category nếu cần)
    defect_sub_q = db.query(
        DailyInspectionDefect.record_id,
        func.sum(DailyInspectionDefect.quantity).label("cat_defects")
    ).join(DefectType, DefectType.id == DailyInspectionDefect.defect_id)
    
    if category:
        defect_sub_q = defect_sub_q.filter(DefectType.category == category)
    
    defect_sub_q = defect_sub_q.group_by(DailyInspectionDefect.record_id).subquery()

    trend_query = db.query(
        date_trunc.label("trend_date"),
        func.sum(func.coalesce(defect_sub_q.c.cat_defects, 0)).label("defect_count"),
        func.sum(DailyInspectionRecord.total_products).label("product_count")
    ).outerjoin(defect_sub_q, DailyInspectionRecord.id == defect_sub_q.c.record_id)\
     .filter(*record_filters)\
     .group_by(date_trunc)\
     .order_by(date_trunc)\
     .all()

    trend_data = [
        TrendItem(
            date = item.trend_date,
            defect_count = int(item.defect_count or 0),
            product_count = int(item.product_count or 1),
            defect_rate = round((int(item.defect_count or 0) / int(item.product_count or 1) * 100), 2)
        ) for item in trend_query
    ]

    # 6. Distribution Data
    if not record_ids:
        distribution_data = []
    else:
        dist_query = db.query(
            DefectType.category,
            func.sum(DailyInspectionDefect.quantity).label("value")
        ).join(DailyInspectionDefect, DefectType.id == DailyInspectionDefect.defect_id)\
         .filter(DailyInspectionDefect.record_id.in_(record_ids))\
         .group_by(DefectType.category)\
         .all()

        category_map = {
            'visual': 'Ngoại quan',
            'structure': 'Kết cấu',
            'material': 'Nguyên liệu',
            'other': 'Khác'
        }

        distribution_data = [
            DistributionItem(
                label = category_map.get(item.category, item.category),
                value = int(item.value or 0)
            ) for item in dist_query
        ]

    return DailyInspectionAnalytics(
        summary = summary,
        pareto = pareto_data,
        trend = trend_data,
        distribution = distribution_data
    )

