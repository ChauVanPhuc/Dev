from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from config.database import get_db
from modules.production.models.stages import Stage
from modules.production.schemas.stages import Stage as StageSchema, StageCreate, StageUpdate

router = APIRouter()

def normalize_and_reorder_stages(db: Session, target_stage_id: Optional[int] = None, old_seq: Optional[int] = None, new_seq: Optional[int] = None):
    """
    Tự động dịch chuyển (shift) các công đoạn khác khi thứ tự thay đổi
    và đếm lại toàn bộ danh sách liên tục 1, 2, 3...
    """
    stages = db.query(Stage).order_by(Stage.sequence.asc(), Stage.id.asc()).all()
    
    if target_stage_id and old_seq is not None and new_seq is not None and old_seq != new_seq:
        for s in stages:
            if s.id == target_stage_id:
                continue
            if new_seq < old_seq:
                # Đẩy lên trước: các công đoạn trong khoảng [new_seq, old_seq - 1] sẽ tự động dịch xuống (+1)
                if new_seq <= s.sequence < old_seq:
                    s.sequence += 1
            else:
                # Đẩy xuống sau: các công đoạn trong khoảng [old_seq + 1, new_seq] sẽ tự động dịch lên (-1)
                if old_seq < s.sequence <= new_seq:
                    s.sequence -= 1

    # Sắp xếp và đánh lại thứ tự liên tục 1, 2, 3...
    stages = sorted(stages, key=lambda x: (x.sequence, x.id))
    for idx, s in enumerate(stages, start=1):
        s.sequence = idx
    
    db.commit()


@router.get("", response_model=List[StageSchema])
@router.get("/", response_model=List[StageSchema])
def read_stages(include_inactive: bool = Query(True), db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tất cả các công đoạn (Stages) trong hệ thống.
    Sắp xếp theo thứ tự (sequence).
    """
    # Auto normalize duplicates on fetch
    normalize_and_reorder_stages(db)
    query = db.query(Stage)
    if not include_inactive:
        query = query.filter(Stage.is_active == True)
    return query.order_by(Stage.sequence.asc(), Stage.id.asc()).all()


@router.post("", response_model=StageSchema)
@router.post("/", response_model=StageSchema)
def create_stage(data: StageCreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới một công đoạn sản xuất.
    - Mã CĐ tự sinh nếu để trống (CD01, CD02...)
    - Thứ tự tự sinh nếu <= 0 (Lấy max sequence + 1). Nếu nhập vị trí chèn, tự đẩy các bước sau xuống +1.
    """
    clean_name = data.name.strip()
    existing = db.query(Stage).filter(Stage.name == clean_name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Công đoạn '{clean_name}' đã tồn tại!")
    
    max_seq = db.query(func.max(Stage.sequence)).scalar() or 0
    seq = data.sequence if (data.sequence and data.sequence > 0) else (max_seq + 1)

    code = data.code.strip() if data.code else ""
    if not code:
        max_id = db.query(func.max(Stage.id)).scalar() or 0
        code = f"CD{max_id + 1:02d}"
    else:
        existing_code = db.query(Stage).filter(Stage.code == code).first()
        if existing_code:
            raise HTTPException(status_code=400, detail=f"Mã công đoạn '{code}' đã tồn tại!")

    if seq <= max_seq:
        db.query(Stage).filter(Stage.sequence >= seq).update({Stage.sequence: Stage.sequence + 1}, synchronize_session=False)

    new_stage = Stage(
        code=code,
        name=clean_name,
        description=data.description.strip() if data.description else None,
        sequence=seq,
        is_active=data.is_active if data.is_active is not None else True
    )
    db.add(new_stage)
    db.commit()
    db.refresh(new_stage)

    normalize_and_reorder_stages(db)
    db.refresh(new_stage)
    return new_stage


@router.put("/{stage_id}", response_model=StageSchema)
def update_stage(stage_id: int, data: StageUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin công đoạn sản xuất. Tự động dịch chuyển thứ tự công đoạn khác khi đổi vị trí.
    """
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Không tìm thấy công đoạn!")
    
    old_seq = stage.sequence
    update_data = data.model_dump(exclude_unset=True)

    if 'code' in update_data and update_data['code']:
        clean_code = update_data['code'].strip()
        existing = db.query(Stage).filter(Stage.code == clean_code, Stage.id != stage_id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Mã công đoạn '{clean_code}' đã tồn tại!")
        update_data['code'] = clean_code

    if 'name' in update_data and update_data['name']:
        clean_name = update_data['name'].strip()
        existing = db.query(Stage).filter(Stage.name == clean_name, Stage.id != stage_id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Tên công đoạn '{clean_name}' đã tồn tại!")
        update_data['name'] = clean_name

    new_seq = update_data.get('sequence', old_seq)
    for key, value in update_data.items():
        setattr(stage, key, value)

    db.commit()

    if new_seq != old_seq:
        normalize_and_reorder_stages(db, target_stage_id=stage_id, old_seq=old_seq, new_seq=new_seq)
    else:
        normalize_and_reorder_stages(db)

    db.refresh(stage)
    return stage


@router.delete("/{stage_id}")
def delete_stage(stage_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa công đoạn sản xuất. Gỡ bỏ liên kết và tự động sắp xếp lại thứ tự liên tục.
    """
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Không tìm thấy công đoạn!")
    
    stage.permissions.clear()
    db.delete(stage)
    db.commit()

    normalize_and_reorder_stages(db)
    return {"message": f"Đã xóa công đoạn '{stage.name}' thành công"}
