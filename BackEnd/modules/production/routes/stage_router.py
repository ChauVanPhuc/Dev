from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from modules.production.models.stages import Stage
from modules.production.schemas.stages import Stage as StageSchema, StageCreate, StageUpdate

router = APIRouter()

@router.get("/", response_model=List[StageSchema])
def read_stages(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tất cả các công đoạn (Stages) trong hệ thống.
    """
    return db.query(Stage).all()


@router.post("/", response_model=StageSchema)
def create_stage(data: StageCreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới một công đoạn sản xuất.
    """
    existing = db.query(Stage).filter(Stage.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Công đoạn '{data.name}' đã tồn tại!")
    new_stage = Stage(name=data.name, description=data.description)
    db.add(new_stage)
    db.commit()
    db.refresh(new_stage)
    return new_stage


@router.put("/{stage_id}", response_model=StageSchema)
def update_stage(stage_id: int, data: StageUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin công đoạn sản xuất.
    """
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Không tìm thấy công đoạn!")
    update_data = data.model_dump(exclude_unset=True)
    # Remove sequence_order since DB doesn't have this column
    update_data.pop('sequence_order', None)
    for key, value in update_data.items():
        setattr(stage, key, value)
    db.commit()
    db.refresh(stage)
    return stage


@router.delete("/{stage_id}")
def delete_stage(stage_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa công đoạn sản xuất. Kiểm tra ràng buộc permission_stage trước khi xóa.
    """
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Không tìm thấy công đoạn!")
    if stage.permissions and len(stage.permissions) > 0:
        perm_names = ", ".join([p.name for p in stage.permissions])
        raise HTTPException(
            status_code=400,
            detail=f"Không thể xóa: Công đoạn đang được gán cho chức vụ: {perm_names}"
        )
    db.delete(stage)
    db.commit()
    return {"message": f"Đã xóa công đoạn '{stage.name}' thành công"}
