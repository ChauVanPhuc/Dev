import os
import uuid
import datetime
from typing import List, Optional
import app.models
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, Date, cast
from config.database import get_db
from modules.inspection.models.input_inspection import InputInspection
from modules.inspection.schemas.input_inspection import InputInspection as InspectionSchema, InputInspectionRead
from modules.inspection.models.defect_type import DefectType, ClientDefect, DefectGlossary
from modules.inspection.models.user_defect_tracking import UserDefectTracking
from modules.inspection.schemas.defect_type import DefectType as DefectTypeSchema, DefectTypeCreate, ClientDefect as ClientDefectSchema
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
from shared.utils.string_cleaner import clean_and_standardize_name

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
    records = db.query(DailyInspectionRecord).order_by(DailyInspectionRecord.inspection_date.desc(), DailyInspectionRecord.id.desc()).offset(skip).limit(limit).all()
    
    # [PERF] Batch load tên người kiểm tra & tên loại lỗi — 1-2 queries thay vì N queries
    inspector_ids = list({r.inspector_id for r in records if r.inspector_id})
    if inspector_ids:
        accounts = db.query(Account.id, Account.full_name).filter(Account.id.in_(inspector_ids)).all()
        name_map = {a.id: a.full_name for a in accounts}
    else:
        name_map = {}
    default_account = db.query(Account.full_name).filter(Account.is_active == True).first()
    default_qc_name = default_account[0] if default_account else "QC Hệ thống"

    for r in records:
        if r.inspector_id and r.inspector_id in name_map:
            r.inspector_name = name_map[r.inspector_id]
        else:
            # Tra cứu fallback từ phiếu stage_inspections trong ngày ở công đoạn này
            stage_rec = db.query(StageInspection.inspector_name).filter(
                StageInspection.data_json.like(f'%"stage": "{r.stage_name}"%'),
                cast(StageInspection.inspection_date, Date) == r.inspection_date,
                StageInspection.inspector_name.isnot(None),
                StageInspection.inspector_name != ''
            ).first()
            if stage_rec and stage_rec[0]:
                r.inspector_name = stage_rec[0]
            else:
                r.inspector_name = default_qc_name
    return records

@router.get("/inbound", response_model=List[InputInspectionRead])
def get_all_inbound_inspections(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách toàn bộ phiếu kiểm tra đầu vào.
    """
    records = db.query(InputInspection).order_by(InputInspection.inspected_at.desc(), InputInspection.id.desc()).offset(skip).limit(limit).all()
    
    # [PERF] Batch load tên người kiểm tra — 1 query thay vì N queries
    inspector_ids = list({r.inspector_id for r in records if r.inspector_id})
    if inspector_ids:
        accounts = db.query(Account.id, Account.full_name).filter(Account.id.in_(inspector_ids)).all()
        name_map = {a.id: a.full_name for a in accounts}
    else:
        name_map = {}
    for r in records:
        if r.inspector_id:
            r.inspector_name = name_map.get(r.inspector_id, "N/A")
        else:
            r.inspector_name = "N/A"
    return records

def sync_defects_to_daily_inspection(stage_name: str, defects_list: list, inspector_name: str, db: Session, inspected_qty: int = 0):
    import json
    if not stage_name:
        return
    
    today = datetime.date.today()
    total_added_defects = sum(int(d.get('quantity', 1)) for d in defects_list if isinstance(d, dict) and d.get('defect_id'))
    
    if total_added_defects <= 0 and inspected_qty <= 0:
        return

    # Tìm Account ID dựa trên inspector_name
    found_inspector_id = None
    if inspector_name and inspector_name.strip():
        acc = db.query(Account).filter(
            or_(
                Account.full_name.ilike(inspector_name.strip()),
                Account.username.ilike(inspector_name.strip())
            )
        ).first()
        if acc:
            found_inspector_id = acc.id

    # 1. Tìm hoặc tạo bản ghi DailyInspectionRecord trong ngày ở công đoạn này
    daily_rec = db.query(DailyInspectionRecord).filter(
        DailyInspectionRecord.stage_name == stage_name,
        cast(DailyInspectionRecord.inspection_date, Date) == today
    ).first()

    if not daily_rec:
        daily_rec = DailyInspectionRecord(
            inspection_date = today,
            stage_name      = stage_name,
            inspector_id    = found_inspector_id,
            total_products  = inspected_qty,
            total_defects   = total_added_defects,
            defect_rate     = round((total_added_defects / inspected_qty * 100), 2) if inspected_qty > 0 else 0.0
        )
        db.add(daily_rec)
        db.flush()
    else:
        if not daily_rec.inspector_id and found_inspector_id:
            daily_rec.inspector_id = found_inspector_id
        if inspected_qty > 0:
            daily_rec.total_products = (daily_rec.total_products or 0) + inspected_qty
        daily_rec.total_defects = (daily_rec.total_defects or 0) + total_added_defects
        if daily_rec.total_products and daily_rec.total_products > 0:
            daily_rec.defect_rate = round((daily_rec.total_defects / daily_rec.total_products) * 100, 2)

    # 2. Đồng bộ các lỗi chi tiết vào DailyInspectionDefect
    for d in defects_list:
        if not isinstance(d, dict):
            continue
        raw_defect_id = d.get('defect_id')
        if not raw_defect_id:
            continue
        try:
            defect_id = int(raw_defect_id)
        except (ValueError, TypeError):
            continue
        
        qty = int(d.get('quantity', 1))
        if qty <= 0:
            continue
        
        defect_item = db.query(DailyInspectionDefect).filter(
            DailyInspectionDefect.record_id == daily_rec.id,
            DailyInspectionDefect.defect_id == defect_id
        ).first()
        
        if defect_item:
            defect_item.quantity = (defect_item.quantity or 0) + qty
        else:
            defect_item = DailyInspectionDefect(
                record_id = daily_rec.id,
                defect_id = defect_id,
                quantity  = qty
            )
            db.add(defect_item)

@router.post("/stage", response_model=StageInspectionRead)
async def create_stage_inspection(
    inspection_type: str = Form(...),
    batch_no: Optional[str] = Form(None),
    product_sku: Optional[str] = Form(None),
    specification: Optional[str] = Form(None),
    inspector_name: Optional[str] = Form(None),
    conclusion: str = Form("pass"),
    notes: Optional[str] = Form(None),
    data_json: Optional[str] = Form(None),
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db)
):
    """
    [POST] Lưu kết quả kiểm tra theo công đoạn (Stage Inspection) hỗ trợ upload ảnh trực tiếp & đồng bộ lỗi.
    """
    import json
    try:
        # Xử lý lưu ảnh tải lên trực tiếp (tối đa 3 ảnh)
        image_paths = []
        for file in files[:3]:
            ext = os.path.splitext(file.filename)[1]
            filename = f"{uuid.uuid4()}{ext}"
            filepath = os.path.join(UPLOAD_DIR, filename)
            with open(filepath, "wb") as buffer:
                buffer.write(await file.read())
            image_paths.append(f"/static/uploads/inspections/{filename}")

        final_inspector_name = inspector_name
        if not final_inspector_name or not final_inspector_name.strip():
            if data_json:
                try:
                    p = json.loads(data_json) if isinstance(data_json, str) else data_json
                    if isinstance(p, dict):
                        final_inspector_name = p.get('inspector_name') or p.get('created_by')
                except Exception:
                    pass
        if not final_inspector_name or not final_inspector_name.strip():
            default_acc = db.query(Account.full_name).filter(Account.is_active == True).first()
            final_inspector_name = default_acc[0] if default_acc else "QC Hệ thống"

        new_record = StageInspection(
            inspection_type = inspection_type,
            batch_no        = batch_no,
            product_sku     = product_sku,
            specification   = specification,
            inspector_name  = final_inspector_name,
            conclusion      = conclusion,
            notes           = notes,
            data_json       = data_json,
            image_path_1    = image_paths[0] if len(image_paths) > 0 else None,
            image_path_2    = image_paths[1] if len(image_paths) > 1 else None,
            image_path_3    = image_paths[2] if len(image_paths) > 2 else None,
            images_json     = json.dumps({"Ảnh kiểm tra mẫu": image_paths}) if image_paths else None
        )
        db.add(new_record)
        
        # Đồng bộ lỗi nếu có defects trong data_json hoặc tự nhận diện theo công đoạn
        if data_json:
            try:
                parsed_data = json.loads(data_json) if isinstance(data_json, str) else data_json
                if isinstance(parsed_data, dict):
                    stage_name = parsed_data.get('stage')
                    if not stage_name:
                        stage_map = {
                            'do-am': 'Phôi gỗ',
                            'kich-thuoc': 'Định hình',
                            'ngoai-quan': 'Lắp ráp',
                            'chuc-nang': 'Thành phẩm',
                            'bam-dinh': 'Sơn',
                            'quy-trinh': 'Sản xuất'
                        }
                        stage_name = stage_map.get(inspection_type, 'Phôi gỗ')

                    defects_list = parsed_data.get('defects', [])
                    inspected_qty = parsed_data.get('inspected_qty') or parsed_data.get('total_qty', 0)

                    if stage_name and (isinstance(defects_list, list) and len(defects_list) > 0 or inspected_qty > 0):
                        sync_defects_to_daily_inspection(stage_name, defects_list, final_inspector_name, db, inspected_qty=inspected_qty)
            except Exception as sync_err:
                print(f"[STAGE SYNC ERROR] {sync_err}")

        db.commit()
        if '_inspections_swr_cache' in globals():
            _inspections_swr_cache.clear()
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
        record.inspector_name  = data.inspector_name or getattr(data, 'created_by', None) or record.inspector_name
        record.conclusion      = data.conclusion or getattr(data, 'overall_result', 'pass')
        record.notes           = data.notes
        record.data_json       = data.data_json
        record.images_json     = data.images_json
        record.updated_at      = datetime.datetime.now()
        
        db.commit()
        db.refresh(record)
        return record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật phiếu kiểm tra: {str(e)}")

@router.get("/stage", response_model=List[StageInspectionRead])
def get_stage_inspections(
    skip: int = 0,
    limit: int = 100,
    batch_no: Optional[str] = None,
    product_sku: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách phiếu kiểm tra công đoạn.
    Hỗ trợ filter theo batch_no, product_sku, month/year, và tìm kiếm text.
    """
    import json
    query = db.query(StageInspection)
    if batch_no:
        query = query.filter(StageInspection.batch_no == batch_no)
    if product_sku:
        query = query.filter(StageInspection.product_sku == product_sku)
    if month and year:
        from sqlalchemy import extract
        query = query.filter(
            extract('month', StageInspection.inspection_date) == month,
            extract('year', StageInspection.inspection_date) == year
        )
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (StageInspection.batch_no.ilike(search_term)) |
            (StageInspection.product_sku.ilike(search_term)) |
            (StageInspection.inspector_name.ilike(search_term))
        )
    records = query.order_by(StageInspection.created_at.desc(), StageInspection.id.desc()).offset(skip).limit(limit).all()
    
    for r in records:
        if not r.inspector_name or not r.inspector_name.strip():
            if r.data_json:
                try:
                    p = json.loads(r.data_json) if isinstance(r.data_json, str) else r.data_json
                    if isinstance(p, dict) and (p.get('created_by') or p.get('inspector_name')):
                        r.inspector_name = p.get('inspector_name') or p.get('created_by')
                except Exception:
                    pass
    return records

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
        part_name = clean_and_standardize_name(part_name)
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
        if '_inspections_swr_cache' in globals():
            _inspections_swr_cache.clear()
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


@router.post("/upload-ocr")
async def upload_ocr_image(
    file: UploadFile = File(...)
):
    """
    [POST] Nhận file ảnh thước kẹp/máy đo độ ẩm, thực hiện AI OCR nhận diện số LCD (in-memory) và trả về kết quả số.
    Hỗ trợ cả AI Local (Local Gemini Proxy / Ollama / Cloud Local AI), OpenRouter, Groq Cloud và Fallback Pytesseract.
    """
    import base64
    import requests
    import re

    def parse_ocr_number(text: str) -> float | None:
        if not text:
            return None
        bad_keywords = ["cannot see", "can't see", "don't have eyes", "text-based", "unable to parse", "error", "sorry", "assist", "impossible"]
        for kw in bad_keywords:
            if kw in text.lower():
                return None

        clean_text = text.replace('`', '').replace('*', '').strip()

        # 1. Ưu tiên tìm số thực có dấu chấm thập phân (VD: 11.0, 10.5, 12.3)
        floats = re.findall(r"\b\d+\.\d+\b", clean_text)
        if floats:
            for f in reversed(floats):
                try:
                    val = float(f)
                    if 0.0 <= val <= 999.0:
                        return val
                except ValueError:
                    pass

        # 2. Tìm tất cả chữ số bất kỳ
        nums = re.findall(r"[-+]?\d*\.\d+|\d+", clean_text)
        if nums:
            for n in reversed(nums):
                try:
                    val = float(n)
                    if 0.0 <= val <= 999.0 and val != 200.0:
                        return val
                except ValueError:
                    pass
        return None

    smart_prompt = (
        "You are a high-precision OCR AI. Read the display on this industrial measurement tool (caliper or moisture meter). "
        "Focus ONLY on the primary large digits showing the measurement result. Ignore auxiliary digits like temperature (e.g., '32 C', '20 C'), target/set points (e.g., '12.0'), and hands/fingers. "
        "If the screen shows '>11.0 %MC' or '11.0 %MC', ignore the '>' and extract only the float number '11.0' (or '10.0' if it shows 10.0). "
        "Carefully inspect if the digits are 10.0, 11.0, or other floats. Return ONLY the clean extracted float number, nothing else."
    )

    try:
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        extracted_value = None

        # 1. Local AI & Cloud Local AI Endpoints
        local_candidates = [
            # Candidate 1: Local Gemini Proxy (PC C:\AI)
            (
                os.getenv("LOCAL_GEMINI_URL", "http://localhost:8081/v1/chat/completions"),
                os.getenv("LOCAL_GEMINI_MODEL", "gemini-3.5-flash-thinking"),
                os.getenv("LOCAL_GEMINI_API_KEY", "sk-gemini")
            ),
            # Candidate 2: Cloud Local AI / Ollama
            (
                os.getenv("LOCAL_AI_URL", "https://ai.smartflowg7.cloud/v1/chat/completions"),
                os.getenv("LOCAL_AI_MODEL", "qwen2.5:3b"),
                os.getenv("LOCAL_AI_API_KEY", "")
            ),
            # Candidate 3: Ollama Local Default
            (
                "http://localhost:11434/v1/chat/completions",
                "llama3.2-vision",
                ""
            )
        ]

        for url, model, api_key in local_candidates:
            if extracted_value is not None:
                break
            if not url:
                continue
            try:
                headers = {"Content-Type": "application/json"}
                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"

                payload = {
                    "model": model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": smart_prompt},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                            ]
                        }
                    ],
                    "temperature": 0.0,
                    "max_tokens": 20
                }

                res = requests.post(url, json=payload, headers=headers, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        ai_text = choices[0].get("message", {}).get("content", "").strip()
                        print(f"[OCR DEBUG] Local AI ({url}) text: {ai_text}")
                        extracted_value = parse_ocr_number(ai_text)
                        if extracted_value is not None:
                            print(f"[OCR DEBUG] Extracted from Local AI: {extracted_value}")
            except Exception as local_err:
                print(f"[OCR DEBUG] Local AI ({url}) skipped: {local_err}")

        # 2. OpenRouter - google/gemini-2.5-flash
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if extracted_value is None and openrouter_key:
            try:
                url = "https://openrouter.ai/api/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "google/gemini-2.5-flash",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": smart_prompt},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                            ]
                        }
                    ],
                    "max_tokens": 15,
                    "temperature": 0.0
                }
                res = requests.post(url, json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        ai_text = choices[0].get("message", {}).get("content", "").strip()
                        print(f"[OCR DEBUG] OpenRouter Gemini text: {ai_text}")
                        extracted_value = parse_ocr_number(ai_text)
                        if extracted_value is not None:
                            print(f"[OCR DEBUG] OpenRouter Gemini extracted: {extracted_value}")
            except Exception as or_err:
                print(f"Lỗi gọi OpenRouter OCR: {or_err}")

        # 3. OpenRouter - meta-llama/llama-3.2-11b-vision-instruct
        if extracted_value is None and openrouter_key:
            try:
                url = "https://openrouter.ai/api/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "meta-llama/llama-3.2-11b-vision-instruct",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": smart_prompt},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                            ]
                        }
                    ],
                    "max_tokens": 15,
                    "temperature": 0.0
                }
                res = requests.post(url, json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        ai_text = choices[0].get("message", {}).get("content", "").strip()
                        print(f"[OCR DEBUG] OpenRouter Llama text: {ai_text}")
                        extracted_value = parse_ocr_number(ai_text)
                        if extracted_value is not None:
                            print(f"[OCR DEBUG] OpenRouter Llama extracted: {extracted_value}")
            except Exception as or_llama_err:
                print(f"Lỗi gọi OpenRouter Llama Vision OCR: {or_llama_err}")

        # 4. Groq Cloud Vision
        groq_key = os.getenv("GROQ_API_KEY")
        if extracted_value is None and groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_key)
                chat_completion = client.chat.completions.create(
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": smart_prompt},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                            ]
                        }
                    ],
                    model="llama-3.2-11b-vision-preview",
                    temperature=0.0,
                    max_tokens=10
                )
                ai_text = chat_completion.choices[0].message.content.strip()
                print(f"[OCR DEBUG] Groq text: {ai_text}")
                extracted_value = parse_ocr_number(ai_text)
                if extracted_value is not None:
                    print(f"[OCR DEBUG] Groq extracted: {extracted_value}")
            except Exception as groq_err:
                print(f"Lỗi gọi Groq AI OCR: {groq_err}")

        # 5. Fallback Pytesseract / PIL
        if extracted_value is None:
            try:
                import pytesseract
                from PIL import Image, ImageEnhance
                import io

                img = Image.open(io.BytesIO(contents)).convert('L')
                enhancer = ImageEnhance.Contrast(img)
                img_contrast = enhancer.enhance(2.0)

                ocr_text = pytesseract.image_to_string(img_contrast, config='--psm 6 -c tessedit_char_whitelist=0123456789.')
                print(f"[OCR DEBUG] Pytesseract text: {ocr_text}")
                extracted_value = parse_ocr_number(ocr_text)
                if extracted_value is not None:
                    print(f"[OCR DEBUG] Pytesseract extracted: {extracted_value}")
            except Exception as tess_err:
                print(f"Lỗi pytesseract fallback: {tess_err}")

        print(f"[OCR DEBUG] Final Extracted Value: {extracted_value}")
        return {"value": extracted_value}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý OCR: {str(e)}")


@router.get("/inbound/po/{order_code}")
def get_inbound_inspections_by_po(order_code: str, db: Session = Depends(get_db)):
    """
    [GET] Lấy lịch sử kiểm tra đầu vào của một PO dựa trên mã order_code.
    Tự động tìm kiếm các bản ghi kiểm tra liên quan đến đơn hàng này thông qua cont_name hoặc mapping.
    """
    from modules.delivery.models.order import Order
    order = db.query(Order).filter(Order.order_code == order_code).first()
    if not order:
        return []

    # Tìm các bản ghi kiểm tra liên quan đến đơn hàng này
    # Sử dụng ilike để khớp linh hoạt (VD: 'APT-0069' khớp với 'APT-0069-05')
    search_term = order_code.split('-')[0] + '-' + order_code.split('-')[1] if '-' in order_code else order_code

    query = db.query(InputInspection).filter(
        or_(
            InputInspection.cont_name == order_code,
            InputInspection.cont_name == search_term,
            InputInspection.cont_name.ilike(f"%{search_term}%"),
            InputInspection.cont_name == order.production_code,
            InputInspection.part_name.ilike(f"%{order_code}%")
        )
    ).order_by(InputInspection.inspected_at.desc())

    inspections = query.all()
    results = []

    for r in inspections:
        inspector = db.query(Account).filter(Account.id == r.inspector_id).first() if r.inspector_id else None
        results.append({
            "id": r.id,
            "created_at": r.inspected_at, # Mapping inspected_at -> created_at for frontend
            "part_name": r.part_name,
            "specification": r.specification,  # [FIX] Specification chứa kích thước
            "inspector_name": inspector.full_name if inspector else "---",
            "result": "Pass" if r.result == "Đạt" else "Fail", # Mapping for frontend
            "note": r.note,
            "images": [img for img in [r.image_path_1, r.image_path_2, r.image_path_3] if img]
        })

    return results

import time
import threading
from functools import wraps

class SWRCache:
    def __init__(self, ttl=5.0):
        self.ttl = ttl
        self.cache = {}
        self.lock = threading.Lock()

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_args = []
            for arg in args:
                if not hasattr(arg, 'execute') and not hasattr(arg, 'commit'):
                    cache_args.append(arg)
            cache_kwargs = {}
            for k, v in kwargs.items():
                if k not in ('db', 'background_tasks') and not hasattr(v, 'execute') and not hasattr(v, 'commit'):
                    cache_kwargs[k] = v
            key = (func.__name__, tuple(cache_args), frozenset(cache_kwargs.items()))
            
            current_time = time.time()
            if key in self.cache:
                cached_time, cached_data, is_updating = self.cache[key]
                if current_time - cached_time < self.ttl:
                    return cached_data
                if is_updating:
                    return cached_data
                with self.lock:
                    cached_time, cached_data, is_updating = self.cache.get(key, (0, None, False))
                    if is_updating:
                        return cached_data
                    self.cache[key] = (cached_time, cached_data, True)
                try:
                    fresh_data = func(*args, **kwargs)
                    self.cache[key] = (time.time(), fresh_data, False)
                    return fresh_data
                except Exception as e:
                    self.cache[key] = (cached_time, cached_data, False)
                    return cached_data
            else:
                with self.lock:
                    if key in self.cache:
                        return self.cache[key][1]
                    fresh_data = func(*args, **kwargs)
                    self.cache[key] = (time.time(), fresh_data, False)
                    return fresh_data
        return wrapper

    def clear(self):
        with self.lock:
            self.cache.clear()

_inspections_swr_cache = SWRCache(ttl=5.0)

@router.get("/plan/{plan_id}", response_model=List[InspectionSchema])
@_inspections_swr_cache
def get_inspections_by_plan(plan_id: int, stage: Optional[str] = None, db: Session = Depends(get_db)):
    """
    [GET] Lấy tất cả kết quả KT đầu vào & kiểm tra mẫu đầu tiên theo KHSX. Có thể lọc theo công đoạn.
    """
    # 1. Lấy kết quả từ bảng InputInspection (Kiểm tra đầu vào)
    query_inbound = db.query(InputInspection).with_hint(InputInspection, 'WITH (NOLOCK)').filter(InputInspection.plan_id == plan_id)
    if stage:
        query_inbound = query_inbound.filter(InputInspection.stage == stage)
    inbound_inspections = query_inbound.all()
    for insp in inbound_inspections:
        insp.inspection_type = "dau-vao" 

    # 2. Tìm các PO (order_code) tương ứng với plan_id này để lấy kết quả Kiểm tra mẫu đầu tiên (StageInspection)
    from modules.delivery.models.order import Order
    orders = db.query(Order.order_code).filter(Order.plan_id == plan_id).all()
    po_codes = [o[0] for o in orders if o[0]]

    stage_inspections = []
    if po_codes:
        query_stage = db.query(StageInspection).filter(
            StageInspection.inspection_type == 'mau-dau-tien',
            StageInspection.batch_no.in_(po_codes)
        )
        raw_stages = query_stage.all()
        
        for si in raw_stages:
            actual_stage = ""
            if si.data_json:
                try:
                    import json
                    pj = json.loads(si.data_json) if isinstance(si.data_json, str) else si.data_json
                    if isinstance(pj, dict):
                        actual_stage = pj.get("stage", "")
                except Exception:
                    pass

            # Lọc theo công đoạn nếu có truyền tham số
            if stage and stage.strip():
                def fuzzy_stage_match(filter_str, actual_str):
                    if not filter_str or not actual_str:
                        return False
                    import re
                    import unicodedata
                    
                    def get_words(s):
                        # Thay thế thủ công ký tự Đ/đ và Ð
                        s_clean = s.replace('đ', 'd').replace('Đ', 'd').replace('Ð', 'd').replace('ð', 'd')
                        nfkd = unicodedata.normalize('NFKD', s_clean)
                        # Giữ lại các ký tự không phải dấu phụ (non-spacing marks)
                        clean_str = "".join([c for c in nfkd if not unicodedata.combining(c)]).lower()
                        # Lấy danh sách các từ có chữ và số dài từ 2 ký tự trở lên
                        return re.findall(r'[a-z0-9]{2,}', clean_str)

                    words_filter = set(get_words(filter_str))
                    words_actual = set(get_words(actual_str))
                    
                    # Nếu có bất kỳ sự giao nhau nào (trùng khớp từ)
                    common = words_filter.intersection(words_actual)
                    if len(common) >= 2:
                        return True
                    if 'nm2' in words_filter and 'nm2' in words_actual:
                        return True
                    if 'nm1' in words_filter and 'nm1' in words_actual:
                        return True
                    
                    # Fallback cho so khớp chứa
                    s_f = "".join(words_filter)
                    s_a = "".join(words_actual)
                    return s_f in s_a or s_a in s_f

                if not fuzzy_stage_match(stage, actual_stage):
                    print(f"[DEBUG] Skipped due to stage mismatch: filter='{stage}' vs actual='{actual_stage}'")
                    continue

            mock_insp = InputInspection(
                id              = si.id,
                plan_id         = plan_id,
                part_name       = si.product_sku or "Không xác định",
                specification   = si.specification,
                cont_name       = si.batch_no, # Mã PO
                stage           = actual_stage or stage or "Kiểm tra mẫu",
                inspector_id    = None,
                inspected_at    = si.created_at,
                measured_length = None,
                measured_width  = None,
                measured_height = None,
                result          = "Đạt" if si.conclusion == "pass" else "Không đạt",
                note            = si.notes,
                image_path_1    = si.image_path_1,
                image_path_2    = si.image_path_2,
                image_path_3    = si.image_path_3
            )
            mock_insp.inspection_type = "mau-dau-tien"
            stage_inspections.append(mock_insp)

    # Gộp cả 2 danh sách lại và sắp xếp theo thời gian kiểm tra mới nhất giảm dần
    all_inspections = list(inbound_inspections) + stage_inspections
    all_inspections.sort(key=lambda x: x.inspected_at or datetime.datetime.min, reverse=True)
    return all_inspections


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
        is_active=data.is_active,
        code=data.code,
        aql_class=data.aql_class
    )
    db.add(defect)
    db.commit()
    db.refresh(defect)
    return defect

@router.post("/defect-types/import")
async def import_defect_types_from_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    [POST] Import danh mục phân loại lỗi từ file Excel (sheets: 'Lỗi G7', 'Lỗi khách', 'Bảng phân loại').
    """
    import pandas as pd
    import json
    from io import BytesIO

    STAGE_MAPPINGS = {
        "MAT": ["NM1 - Định hình 1", "NM1 - Định hình ván 1", "NM2 - Định hình mặt tiền 2", "NM2 - Định hình tủ 2", "NM3 - Tạo phôi 3", "NM3 - Định hình 3"],
        "STR": ["NM1 - Lắp ráp, chà nhám 1", "NM2 - Lắp ráp mặt tiền 2", "NM2 - Lắp ráp tủ 2", "NM3 - Lắp ráp 3"],
        "PAI": ["NM1 - Sơn 1", "NM2 - Sơn Pallet 2", "NM2 - Sơn treo 2", "NM3 - Sơn 3"],
        "APP": ["NM1 - Đóng gói 1", "NM2 - Đóng gói 2", "NM3 - Đóng gói 3"]
    }
    CATEGORY_MAPPINGS = {
        "MAT": "material",
        "STR": "structure",
        "PAI": "paint",
        "APP": "visual"
    }

    def clean_val(val):
        if pd.isna(val) or val is None:
            return None
        s = str(val).strip()
        return s if s else None

    try:
        contents = await file.read()
        excel_file = BytesIO(contents)
        
        xl = pd.ExcelFile(excel_file)
        g7_count = 0
        client_count = 0

        if "Lỗi G7" in xl.sheet_names:
            df_g7 = pd.read_excel(xl, sheet_name="Lỗi G7")
            for idx, row in df_g7.iterrows():
                code = clean_val(row.get("Mã Lỗi"))
                name = clean_val(row.get("Tên Lỗi Ngắn Gọn"))
                aql = clean_val(row.get("Phân Loại AQL"))
                desc = clean_val(row.get("Mô Tả Chi Tiết Tiêu Chuẩn Ghi Nhật Ký"))
                raw_cat = clean_val(row.get("Phân loại"))

                if not code or not name:
                    continue

                category = CATEGORY_MAPPINGS.get(raw_cat, "other")
                stages_list = STAGE_MAPPINGS.get(raw_cat, [])
                stages_json = json.dumps(stages_list, ensure_ascii=False)

                defect = db.query(DefectType).filter(DefectType.code == code).first()
                if not defect:
                    defect = DefectType(code=code)
                    db.add(defect)

                defect.name = name
                defect.category = category
                defect.stage = stages_json
                defect.description = desc
                defect.aql_class = aql
                defect.is_active = True
                if aql in ["Critical", "Major"]:
                    defect.needs_tracking = True
                
                g7_count += 1
            db.commit()

        if "Lỗi khách" in xl.sheet_names:
            df_client = pd.read_excel(xl, sheet_name="Lỗi khách")
            for idx, row in df_client.iterrows():
                c_code = clean_val(row.get("MÃ LỖI"))
                c_name = clean_val(row.get("TÊN LỖI"))
                c_name_en = clean_val(row.get("TÊN TIẾNG ANH"))
                minor = clean_val(row.get("MINOR"))
                major = clean_val(row.get("MAJOR"))
                critical = clean_val(row.get("CRITICAL"))
                method = clean_val(row.get("PHƯƠNG PHÁP XÁC ĐỊNH"))
                g7_code = clean_val(row.get("Mã lỗi tại G7"))

                if not c_code or not c_name:
                    continue

                g7_defect = None
                if g7_code:
                    g7_defect = db.query(DefectType).filter(DefectType.code == g7_code).first()

                client_def = db.query(ClientDefect).filter(ClientDefect.code == c_code).first()
                if not client_def:
                    client_def = ClientDefect(code=c_code)
                    db.add(client_def)

                client_def.name = c_name
                client_def.name_en = c_name_en
                client_def.minor_criteria = minor
                client_def.major_criteria = major
                client_def.critical_criteria = critical
                client_def.detection_method = method
                client_def.g7_code = g7_code
                if g7_defect:
                    client_def.defect_type_id = g7_defect.id
                client_def.is_active = True
                client_count += 1
            db.commit()

        return {
            "message": f"Nhập dữ liệu thành công! {g7_count} lỗi G7, {client_count} lỗi khách hàng.",
            "g7_count": g7_count,
            "client_count": client_count
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi import file Excel: {str(e)}")

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
    defect.code = data.code
    defect.aql_class = data.aql_class
    
    db.commit()
    db.refresh(defect)
    return defect

@router.get("/client-defects", response_model=List[ClientDefectSchema])
def get_client_defects(
    g7_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách các lỗi phía khách hàng.
    """
    query = db.query(ClientDefect)
    if g7_code:
        query = query.filter(ClientDefect.g7_code == g7_code)
    return query.all()

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


# --- TRẠNG THÁI XÁC NHẬN PHIẾU KIỂM TRA (NEW ENDPOINTS) ---
from fastapi import Body

def get_inspectionTypeLabel_local(t: str) -> str:
    mapping = {
        'dau-vao': 'Nhập kho',
        'nhap-kho': 'Nhập kho',
        'do-am': 'Độ ẩm',
        'kich-thuoc': 'Kích thước',
        'ngoai-quan': 'Ngoại quan',
        'chuc-nang': 'Chức năng',
        'cong-doan': 'Kiểm tra công đoạn',
        'bam-dinh': 'Kiểm tra bám dính',
        'sau-dong-goi': 'Kiểm tra sau đóng gói',
        'phu-kien': 'Kiểm tra phụ kiện',
        'quy-trinh': 'Kiểm tra quy trình',
        'mau-dau-tien': 'Kiểm tra mẫu đầu tiên'
    }
    return mapping.get(t, t or 'Kiểm tra công đoạn')

@router.get("/input/{id}", response_model=InputInspectionRead)
def get_input_inspection(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết một phiếu kiểm tra đầu vào.
    """
    record = db.query(InputInspection).filter(InputInspection.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu kiểm tra đầu vào")
    
    # Lấy tên QC
    if record.inspector_id:
        inspector = db.query(Account).filter(Account.id == record.inspector_id).first()
        record.inspector_name = inspector.full_name if inspector else "N/A"
    else:
        record.inspector_name = "N/A"
        
    return record

@router.get("/pending")
def get_pending_inspections(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách phiếu kiểm tra chưa xác nhận trong 24 giờ qua.
    Gộp cả phiếu đầu vào (Input) và phiếu công đoạn (Stage).
    """
    time_limit = datetime.datetime.now() - datetime.timedelta(hours=24)
    
    # 1. Truy vấn các phiếu StageInspection chưa xác nhận trong 24h
    stage_query = db.query(StageInspection).filter(
        StageInspection.is_confirmed == False,
        StageInspection.created_at >= time_limit
    ).order_by(StageInspection.created_at.desc()).all()
    
    # 2. Truy vấn các phiếu InputInspection chưa xác nhận trong 24h
    inbound_query = db.query(InputInspection).filter(
        InputInspection.is_confirmed == False,
        InputInspection.inspected_at >= time_limit
    ).order_by(InputInspection.inspected_at.desc()).all()
    
    pending_tasks = []
    
    # Map StageInspections
    for item in stage_query:
        type_label = get_inspectionTypeLabel_local(item.inspection_type)
        pending_tasks.append({
            "id": item.id,
            "type": "stage",
            "task_name": f"Xác nhận phiếu kiểm tra công đoạn #{item.id} - PO: {item.batch_no or 'N/A'}",
            "category": type_label,
            "priority": 3,
            "status": "Chưa Làm",
            "recorded_date": item.created_at,
            "completion_date": item.created_at,
            "notes": item.notes or "Chờ xác nhận kết quả kiểm tra công đoạn"
        })
        
    # Map InputInspections
    for item in inbound_query:
        pending_tasks.append({
            "id": item.id,
            "type": "input",
            "task_name": f"Xác nhận phiếu kiểm tra đầu vào #{item.id} - Linh kiện: {item.part_name}",
            "category": "Kiểm tra đầu vào (IQC)",
            "priority": 3,
            "status": "Chưa Làm",
            "recorded_date": item.inspected_at,
            "completion_date": item.inspected_at,
            "notes": item.note or "Chờ xác nhận kích thước linh kiện nhập kho"
        })
        
    # Sắp xếp theo ngày ghi nhận giảm dần
    pending_tasks.sort(key=lambda x: x["recorded_date"], reverse=True)
    
    # Thêm số thứ tự STT sau khi sắp xếp
    for i, task in enumerate(pending_tasks):
        task["stt"] = f"{(i+1):02d}"
        
    return pending_tasks


@router.post("/confirm/{type}/{id}")
def confirm_inspection(type: str, id: int, confirmed_by: Optional[int] = Body(None, embed=True), db: Session = Depends(get_db)):
    """
    [POST] Xác nhận phiếu kiểm tra.
    type: 'stage' hoặc 'input'.
    """
    if type == "stage":
        record = db.query(StageInspection).filter(StageInspection.id == id).first()
    elif type == "input":
        record = db.query(InputInspection).filter(InputInspection.id == id).first()
    else:
        raise HTTPException(status_code=400, detail="Loại phiếu kiểm tra không hợp lệ. Chỉ chấp nhận 'stage' hoặc 'input'")
        
    if not record:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy phiếu kiểm tra {type} có ID {id}")
        
    record.is_confirmed = True
    record.confirmed_at = datetime.datetime.now()
    if confirmed_by:
        record.confirmed_by = confirmed_by
        
    try:
        db.commit()
        db.refresh(record)
        return {
            "message": "Xác nhận phiếu kiểm tra thành công",
            "type": type,
            "id": id,
            "is_confirmed": record.is_confirmed,
            "confirmed_at": record.confirmed_at,
            "confirmed_by": record.confirmed_by
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu xác nhận: {str(e)}")


