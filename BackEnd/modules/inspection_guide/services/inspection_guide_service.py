# -*- coding: utf-8 -*-
import os
import uuid
import shutil
from typing import List, Optional
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_, func

from modules.inspection_guide.models.inspection_guide import (
    InspectionGuide,
    InspectionGuideStep,
    InspectionGuideSubStep,
    InspectionGuideStepImage,
    InspectionGuideAssignment,
)
from modules.inspection_guide.models.inspection_parameter import (
    InspectionParameter,
    InspectionGuideParameter,
)
from modules.inspection_guide.models.inspection_form_type import InspectionFormType
from modules.production.models.stages import Stage

from config.settings import get_upload_dir

UPLOAD_DIR = get_upload_dir("inspection_guides")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_IMAGES_PER_STEP = 10
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def _guide_folder(guide_id: int) -> str:
    folder = os.path.join(UPLOAD_DIR, str(guide_id))
    os.makedirs(folder, exist_ok=True)
    return folder


def _delete_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


def _validate_image(file: UploadFile):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Loại file {file.content_type} không được hỗ trợ.")
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File quá lớn (tối đa 5MB).")


# --- Guides ---
def list_guides(db: Session, skip: int = 0, limit: int = 50, search: str = "", inspection_type: Optional[str] = None, doc_type: Optional[str] = None):
    query = db.query(InspectionGuide).filter(InspectionGuide.deleted_at.is_(None)).options(
        selectinload(InspectionGuide.steps).selectinload(InspectionGuideStep.sub_steps),
        selectinload(InspectionGuide.steps).selectinload(InspectionGuideStep.images),
        selectinload(InspectionGuide.assignments)
    )
    if search:
        query = query.filter(or_(
            InspectionGuide.name.ilike(f"%{search}%"),
            InspectionGuide.code.ilike(f"%{search}%")
        ))
    if doc_type and doc_type != 'all':
        query = query.filter(InspectionGuide.doc_type == doc_type)
    if inspection_type and inspection_type != 'all':
        query = query.join(InspectionGuide.assignments).filter(
            InspectionGuideAssignment.inspection_type == inspection_type,
            InspectionGuideAssignment.is_active == True
        )
    total = query.count()
    items = query.order_by(InspectionGuide.id.desc()).offset(skip).limit(limit).all()
    return items, total


def get_guide(db: Session, guide_id: int) -> Optional[InspectionGuide]:
    return db.query(InspectionGuide).filter(
        InspectionGuide.id == guide_id,
        InspectionGuide.deleted_at.is_(None)
    ).options(
        selectinload(InspectionGuide.steps).selectinload(InspectionGuideStep.sub_steps),
        selectinload(InspectionGuide.steps).selectinload(InspectionGuideStep.images),
        selectinload(InspectionGuide.assignments),
    ).first()


def create_guide(db: Session, code: str, name: str, description: Optional[str], user_id: Optional[int] = None, doc_type: str = "HDKT") -> InspectionGuide:
    if db.query(InspectionGuide).filter(InspectionGuide.code == code).first():
        raise HTTPException(status_code=400, detail=f"Mã hướng dẫn {code} đã tồn tại.")
    guide = InspectionGuide(code=code, name=name, description=description, created_by=user_id, doc_type=doc_type or "HDKT")
    db.add(guide)
    db.commit()
    db.refresh(guide)
    return guide


def generate_next_code(db: Session, doc_type: str = "SOS") -> str:
    """
    Tự động sinh mã kế tiếp theo chuẩn doanh nghiệp:
    - SOS: G7.CL.SOS.xxx (VD: G7.CL.SOS.001)
    - HDKT: G7.CL.HDKT.xxx (hoặc HDKT-xxx)
    - CTQ: G7.CL.CTQ.xxx (hoặc CTQ-xxx)
    """
    prefix_map = {
        "SOS": "G7.CL.SOS.",
        "HDKT": "G7.CL.HDKT.",
        "CTQ": "G7.CL.CTQ."
    }
    prefix = prefix_map.get(doc_type.upper(), f"G7.CL.{doc_type.upper()}.")

    # Lấy tất cả mã hiện tại
    existing_guides = db.query(InspectionGuide.code).filter(
        InspectionGuide.deleted_at.is_(None)
    ).all()
    
    existing_codes = {g[0].upper().strip() for g in existing_guides if g[0]}
    
    # Tìm số thứ tự chưa sử dụng
    num = 1
    while True:
        candidate = f"{prefix}{num:03d}"
        if candidate not in existing_codes:
            return candidate
        num += 1


def update_guide(db: Session, guide: InspectionGuide, name: Optional[str], description: Optional[str], is_active: Optional[bool], doc_type: Optional[str] = None):
    if name is not None:
        guide.name = name
    if description is not None:
        guide.description = description
    if is_active is not None:
        guide.is_active = is_active
    if doc_type is not None:
        guide.doc_type = doc_type
    guide.updated_at = func.now()
    db.commit()
    db.refresh(guide)
    return guide


def delete_guide(db: Session, guide: InspectionGuide):
    for step in guide.steps:
        for img in step.images:
            _delete_file(os.path.join(UPLOAD_DIR, str(guide.id), img.file_name))
    db.delete(guide)
    db.commit()
    try:
        shutil.rmtree(_guide_folder(guide.id), ignore_errors=True)
    except Exception:
        pass


# --- Steps ---
def create_step(db: Session, guide_id: int, step_no: int, title: str, content: Optional[str]) -> InspectionGuideStep:
    step = InspectionGuideStep(guide_id=guide_id, step_no=step_no, title=title, content=content)
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


def update_step(db: Session, step: InspectionGuideStep, step_no: Optional[int], title: Optional[str], content: Optional[str]):
    if step_no is not None:
        step.step_no = step_no
    if title is not None:
        step.title = title
    if content is not None:
        step.content = content
    db.commit()
    db.refresh(step)
    return step


def delete_step(db: Session, step: InspectionGuideStep):
    for img in step.images:
        _delete_file(os.path.join(UPLOAD_DIR, str(step.guide_id), img.file_name))
    db.delete(step)
    db.commit()


def reorder_steps(db: Session, guide_id: int, step_ids: List[int]):
    for idx, step_id in enumerate(step_ids, start=1):
        db.query(InspectionGuideStep).filter(
            InspectionGuideStep.id == step_id,
            InspectionGuideStep.guide_id == guide_id
        ).update({"step_no": idx})
    db.commit()


# --- Sub-steps ---
def create_sub_step(db: Session, step_id: int, sub_step_no: int, content: Optional[str] = None, title: Optional[str] = None):
    sub = InspectionGuideSubStep(step_id=step_id, sub_step_no=sub_step_no, title=title, content=content)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def update_sub_step(db: Session, sub: InspectionGuideSubStep, sub_step_no: Optional[int], content: Optional[str], title: Optional[str] = None):
    if sub_step_no is not None:
        sub.sub_step_no = sub_step_no
    if title is not None:
        sub.title = title
    if content is not None:
        sub.content = content
    db.commit()
    db.refresh(sub)
    return sub


def delete_sub_step(db: Session, sub: InspectionGuideSubStep):
    db.delete(sub)
    db.commit()


def reorder_sub_steps(db: Session, step_id: int, sub_step_ids: List[int]):
    for idx, sub_id in enumerate(sub_step_ids, start=1):
        db.query(InspectionGuideSubStep).filter(
            InspectionGuideSubStep.id == sub_id,
            InspectionGuideSubStep.step_id == step_id
        ).update({"sub_step_no": idx})
    db.commit()


# --- Images ---
def upload_images(db: Session, guide_id: int, step_id: int, files: List[UploadFile], max_total: int = MAX_IMAGES_PER_STEP) -> List[InspectionGuideStepImage]:
    step = db.query(InspectionGuideStep).filter(
        InspectionGuideStep.id == step_id,
        InspectionGuideStep.guide_id == guide_id
    ).first()
    if not step:
        raise HTTPException(status_code=404, detail="Không tìm thấy bước.")
    current = db.query(InspectionGuideStepImage).filter(InspectionGuideStepImage.step_id == step_id).count()
    if current + len(files) > max_total:
        raise HTTPException(status_code=400, detail=f"Mỗi bước chỉ được tối đa {max_total} ảnh.")
    folder = _guide_folder(guide_id)
    result = []
    for idx, file in enumerate(files):
        _validate_image(file)
        ext = os.path.splitext(file.filename or "")[1].lower()
        if not ext:
            ext = ".jpg"
        filename = f"S{step_id}_{uuid.uuid4().hex[:8]}{ext}"
        path = os.path.join(folder, filename)
        with open(path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        url = f"/static/uploads/inspection_guides/{guide_id}/{filename}"
        img = InspectionGuideStepImage(
            step_id=step_id,
            guide_id=guide_id,
            file_name=filename,
            image_url=url,
            display_order=current + idx
        )
        db.add(img)
        result.append(img)
    db.commit()
    for img in result:
        db.refresh(img)
    return result


def delete_image(db: Session, image: InspectionGuideStepImage):
    _delete_file(os.path.join(UPLOAD_DIR, str(image.guide_id), image.file_name))
    db.delete(image)
    db.commit()


TYPE_NORMALIZE = {
    'mau-dau-tien': 'first_sample',
    'mau_dau_tien': 'first_sample',
    're-inspect': 're_inspect',
    'kiem_tra_lai': 're_inspect',
    'do-am': 'parameter',
    'bam-dinh': 'parameter',
    'thong_so': 'parameter',
    'quy-trinh': 'process',
    'quy_trinh': 'process',
    'van_dap': 'qa',
    'dau-vao': 'input_inspection',
    'dau_vao': 'input_inspection',
    'sau-dong-goi': 'packaging_inspection',
    'sau_dong_goi': 'packaging_inspection',
}


def check_assignment_conflicts(db: Session, guide_id: Optional[int], assignments_data: List[dict]) -> List[dict]:
    """
    Kiểm tra ràng buộc: Một cặp (inspection_type, stage_id) chỉ được phép gán cho DUY NHẤT 1 HDKT.
    - Cùng phiếu khác công đoạn: HỢP LỆ.
    - Cùng phiếu cùng công đoạn: XUNG ĐỘT (nếu thuộc về HDKT khác).
    """
    conflicts = []
    if not assignments_data:
        return conflicts

    # Lấy map tên loại phiếu và tên công đoạn
    form_types = {}
    try:
        for ft in db.query(InspectionFormType).all():
            form_types[ft.code] = ft.name
    except Exception:
        pass

    fallback_types = {
        'first_sample': 'Kiểm tra mẫu lần đầu',
        're_inspect': 'Kiểm tra lại',
        'parameter': 'Kiểm tra thông số',
        'process': 'Kiểm tra quy trình',
        'qa': 'Vấn đáp',
        'daily': 'Ghi nhận lỗi hằng ngày',
        'input_inspection': 'Nhập kho nguyên liệu (IQC)',
        'packaging_inspection': 'Sau đóng gói (OQC)'
    }

    stage_ids = [a.get("stage_id") for a in assignments_data if a.get("stage_id")]
    stages_map = {}
    if stage_ids:
        try:
            stages = db.query(Stage).filter(Stage.id.in_(stage_ids)).all()
            for s in stages:
                stages_map[s.id] = s.name
        except Exception:
            pass

    for a in assignments_data:
        raw_type = a.get("inspection_type", "first_sample")
        itype = TYPE_NORMALIZE.get(raw_type, raw_type)
        stage_id = a.get("stage_id")
        if stage_id == 0 or stage_id == "":
            stage_id = None

        query = db.query(InspectionGuideAssignment).join(
            InspectionGuide, InspectionGuideAssignment.guide_id == InspectionGuide.id
        ).filter(
            InspectionGuideAssignment.is_active == True,
            InspectionGuide.deleted_at.is_(None),
            InspectionGuide.is_active == True,
            InspectionGuideAssignment.inspection_type == itype
        )

        if guide_id:
            query = query.filter(InspectionGuideAssignment.guide_id != guide_id)

        if stage_id is not None:
            query = query.filter(InspectionGuideAssignment.stage_id == stage_id)
        else:
            query = query.filter(InspectionGuideAssignment.stage_id.is_(None))

        existing = query.first()
        if existing:
            other_guide = existing.guide
            type_name = form_types.get(itype) or fallback_types.get(itype) or itype
            stage_name = stages_map.get(stage_id) if stage_id else "Tất cả công đoạn"
            
            conflicts.append({
                "inspection_type": itype,
                "inspection_type_name": type_name,
                "stage_id": stage_id,
                "stage_name": stage_name,
                "conflicting_guide_id": other_guide.id,
                "conflicting_guide_code": other_guide.code,
                "conflicting_guide_name": other_guide.name,
                "message": f"Loại phiếu [{type_name}] ở công đoạn [{stage_name}] đã được gán cho tài liệu [{other_guide.code} - {other_guide.name}]. Vui lòng chọn công đoạn khác hoặc gỡ liên kết ở HDKT cũ."
            })

    return conflicts


def set_assignments(db: Session, guide_id: int, assignments_data: List[dict]):
    # Kiểm tra xung đột quy tắc 1 cặp (Loại phiếu, Công đoạn) chỉ có 1 HDKT
    conflicts = check_assignment_conflicts(db, guide_id, assignments_data)
    if conflicts:
        raise HTTPException(
            status_code=400,
            detail=conflicts[0]["message"]
        )

    db.query(InspectionGuideAssignment).filter(
        InspectionGuideAssignment.guide_id == guide_id
    ).delete()
    for a in assignments_data:
        raw_type = a.get("inspection_type", "first_sample")
        itype = TYPE_NORMALIZE.get(raw_type, raw_type)
        stage_id = a.get("stage_id")
        if stage_id == 0 or stage_id == "":
            stage_id = None
        item = InspectionGuideAssignment(
            guide_id=guide_id,
            inspection_type=itype,
            product_id=a.get("product_id"),
            category_id=a.get("category_id"),
            stage_id=stage_id,
            is_active=a.get("is_active", True)
        )
        db.add(item)
    db.commit()


def get_mobile_guide(
    db: Session,
    inspection_type: str,
    product_id: Optional[int] = None,
    category_id: Optional[int] = None,
    stage_id: Optional[int] = None,
    parameter: Optional[str] = None,
    parameter_id: Optional[int] = None,
):
    # Alias mapping for backwards compatibility
    type_aliases = [inspection_type]
    alias_map = {
        'first_sample': ['first_sample', 'mau-dau-tien', 'mau_dau_tien'],
        'mau-dau-tien': ['first_sample', 'mau-dau-tien', 'mau_dau_tien'],
        're_inspect': ['re_inspect', 're-inspect', 'kiem_tra_lai', 'first_sample', 'mau-dau-tien', 'mau_dau_tien'],
        'parameter': ['parameter', 'thong_so', 'do-am', 'bam-dinh'],
        'thong_so': ['parameter', 'thong_so', 'do-am', 'bam-dinh'],
        'do-am': ['parameter', 'thong_so', 'do-am', 'bam-dinh'],
        'bam-dinh': ['parameter', 'thong_so', 'do-am', 'bam-dinh'],
        'process': ['process', 'quy-trinh', 'quy_trinh'],
        'qa': ['qa', 'van_dap'],
        'input_inspection': ['input_inspection', 'dau-vao', 'dau_vao'],
        'packaging_inspection': ['packaging_inspection', 'sau-dong-goi', 'sau_dong_goi'],
    }
    if inspection_type in alias_map:
        type_aliases = alias_map[inspection_type]

    # Resolve target parameter ID if parameter code or name or id is passed
    target_param_id = parameter_id
    if target_param_id is None and parameter:
        if isinstance(parameter, int) or (isinstance(parameter, str) and parameter.isdigit()):
            target_param_id = int(parameter)
        else:
            param_obj = db.query(InspectionParameter).filter(
                or_(
                    InspectionParameter.code == parameter,
                    InspectionParameter.name == parameter
                )
            ).first()
            if param_obj:
                target_param_id = param_obj.id

    base_query = db.query(InspectionGuide).join(InspectionGuide.assignments).filter(
        InspectionGuide.is_active == True,
        InspectionGuide.deleted_at.is_(None),
        InspectionGuideAssignment.is_active == True,
        InspectionGuideAssignment.inspection_type.in_(type_aliases)
    )

    filters = []
    if product_id is not None and stage_id is not None:
        filters.append(and_(
            InspectionGuideAssignment.product_id == product_id,
            InspectionGuideAssignment.stage_id == stage_id
        ))
    if product_id is not None:
        filters.append(and_(
            InspectionGuideAssignment.product_id == product_id,
            InspectionGuideAssignment.stage_id.is_(None)
        ))
    if stage_id is not None:
        filters.append(and_(
            InspectionGuideAssignment.stage_id == stage_id,
            InspectionGuideAssignment.product_id.is_(None)
        ))
    if category_id is not None:
        filters.append(and_(
            InspectionGuideAssignment.category_id == category_id,
            InspectionGuideAssignment.product_id.is_(None),
            InspectionGuideAssignment.stage_id.is_(None)
        ))
    filters.append(and_(
        InspectionGuideAssignment.product_id.is_(None),
        InspectionGuideAssignment.category_id.is_(None),
        InspectionGuideAssignment.stage_id.is_(None)
    ))

    is_param_mode = (
        inspection_type in ['parameter', 'thong_so', 'do-am', 'bam-dinh']
        or target_param_id is not None
        or parameter is not None
        or parameter_id is not None
    )

    # If parameter was specified (e.g. for parameter inspection):
    # Match guide specifically linked to this parameter
    if target_param_id is not None:
        param_query = base_query.join(
            InspectionGuideParameter,
            and_(
                InspectionGuideParameter.guide_id == InspectionGuide.id,
                InspectionGuideParameter.parameter_id == target_param_id,
                InspectionGuideParameter.is_active == True
            )
        )
        for f in filters:
            candidate = param_query.filter(f).options(
                selectinload(InspectionGuide.steps).selectinload(InspectionGuideStep.sub_steps),
                selectinload(InspectionGuide.steps).selectinload(InspectionGuideStep.images),
                selectinload(InspectionGuide.guide_parameters).selectinload(InspectionGuideParameter.parameter),
            ).first()
            if candidate:
                return candidate

        # If parameter was specified but no guide was assigned to it,
        # DO NOT fall back to unrelated guides!
        return None

    # If in parameter inspection mode but no valid parameter was provided/found:
    if is_param_mode:
        return None

    # Standard search across filters for other inspection types (first_sample, process, re_inspect, qa...)
    for f in filters:
        candidate = base_query.filter(f).options(
            selectinload(InspectionGuide.steps).selectinload(InspectionGuideStep.sub_steps),
            selectinload(InspectionGuide.steps).selectinload(InspectionGuideStep.images),
            selectinload(InspectionGuide.guide_parameters).selectinload(InspectionGuideParameter.parameter),
        ).first()
        if candidate:
            return candidate
    return None


# ==================== INSPECTION PARAMETERS CRUD ====================

def list_parameters(db: Session, include_inactive: bool = False):
    query = db.query(InspectionParameter)
    if not include_inactive:
        query = query.filter(InspectionParameter.is_active == True)
    return query.order_by(InspectionParameter.display_order, InspectionParameter.id).all()


def get_parameter(db: Session, param_id: int):
    return db.query(InspectionParameter).filter(InspectionParameter.id == param_id).first()


def create_parameter(db: Session, code: str, name: str, unit: str = None,
                     default_min: float = None, default_max: float = None,
                     display_order: int = 0):
    existing = db.query(InspectionParameter).filter(InspectionParameter.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã thông số '{code}' đã tồn tại.")
    param = InspectionParameter(
        code=code, name=name, unit=unit,
        default_min=default_min, default_max=default_max,
        display_order=display_order
    )
    db.add(param)
    db.commit()
    db.refresh(param)
    return param


def update_parameter(db: Session, param: InspectionParameter, **kwargs):
    for key, value in kwargs.items():
        if value is not None and hasattr(param, key):
            setattr(param, key, value)
    db.commit()
    db.refresh(param)
    return param


def delete_parameter(db: Session, param: InspectionParameter):
    db.delete(param)
    db.commit()


def set_guide_parameters(db: Session, guide_id: int, parameter_ids: List[int]):
    """Gán danh sách thông số cho hướng dẫn kiểm tra."""
    db.query(InspectionGuideParameter).filter(
        InspectionGuideParameter.guide_id == guide_id
    ).delete()
    for pid in parameter_ids:
        item = InspectionGuideParameter(
            guide_id=guide_id,
            parameter_id=pid,
            is_active=True
        )
        db.add(item)
    db.commit()


def seed_default_parameters(db: Session):
    """Seed 5 thông số mặc định nếu bảng trống."""
    count = db.query(InspectionParameter).count()
    if count > 0:
        return
    defaults = [
        {"code": "do_am", "name": "Độ ẩm", "unit": "%", "default_min": 6, "default_max": 14, "display_order": 1},
        {"code": "nhiet_do", "name": "Nhiệt độ", "unit": "°C", "default_min": 15, "default_max": 45, "display_order": 2},
        {"code": "anh_sang", "name": "Ánh sáng", "unit": "Lux", "default_min": 300, "default_max": 1000, "display_order": 3},
        {"code": "do_bong", "name": "Độ bóng sơn", "unit": "GU", "default_min": 0, "default_max": 100, "display_order": 4},
        {"code": "do_day", "name": "Độ dày màng sơn", "unit": "µm", "default_min": 20, "default_max": 200, "display_order": 5},
    ]
    for d in defaults:
        db.add(InspectionParameter(**d))
    db.commit()
