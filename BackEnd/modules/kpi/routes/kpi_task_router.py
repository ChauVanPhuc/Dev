# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from config.database import get_db
from modules.kpi.models.kpi_task import KPITask, KPITaskChecklistCriteria
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class CriteriaSchema(BaseModel):
    stt: Optional[int] = 1
    criteria_name: str
    max_score: Optional[float] = 10.0
    achieved_score: Optional[float] = 0.0
    evaluation: Optional[str] = "Đạt"
    note: Optional[str] = ""

class KPITaskCreateSchema(BaseModel):
    task_code: str
    task_name: str
    assigner: str
    assignee: str
    deadline: Optional[str] = ""
    priority: Optional[str] = "Trung bình"
    status: Optional[str] = "Đang thực hiện"
    target_score: Optional[float] = 120.0
    achieved_score: Optional[float] = 40.0
    description: Optional[str] = ""
    criterias: Optional[List[CriteriaSchema]] = []

class KPITaskUpdateSchema(BaseModel):
    task_name: Optional[str] = None
    assigner: Optional[str] = None
    assignee: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    target_score: Optional[float] = None
    achieved_score: Optional[float] = None
    description: Optional[str] = None
    criterias: Optional[List[CriteriaSchema]] = None

@router.get("/", response_model=List[dict])
def get_kpi_tasks(
    search: Optional[str] = None,
    assignee: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách phiếu Nhiệm vụ CL.03.2.
    Nếu chưa có dữ liệu, tự động khởi tạo dữ liệu mẫu CL.03.2 chuẩn.
    """
    query = db.query(KPITask).order_by(KPITask.id.desc())
    if assignee:
        query = query.filter(KPITask.assignee.ilike(f"%{assignee}%"))
    if search:
        query = query.filter(
            (KPITask.task_code.ilike(f"%{search}%")) | 
            (KPITask.task_name.ilike(f"%{search}%"))
        )
    
    tasks = query.all()

    # Auto seed mẫu nhiệm vụ CL.03.2 nếu db trống
    if not tasks and not search and not assignee:
        sample_task = KPITask(
            task_code="CL.03.2",
            task_name=u"Thông tin nhiệm vụ kiểm tra chất lượng ca 1",
            assigner=u"Nguyễn Văn Trưởng (Lead QC)",
            assignee=u"Trần Văn An (QC Staff)",
            deadline="2026-08-30 17:00",
            priority=u"Cao",
            status=u"Đang thực hiện",
            target_score=120.0,
            achieved_score=40.0,
            description=u"Thực hiện kiểm tra các chỉ tiêu ISO & Checklist tiêu chuẩn công đoạn định hình xưởng 1."
        )
        db.add(sample_task)
        db.commit()
        db.refresh(sample_task)

        # Seed sample criteria
        sample_criterias = [
            KPITaskChecklistCriteria(task_id=sample_task.id, stt=1, criteria_name=u"Kiểm tra tem nhãn nguyên vật liệu", max_score=30.0, achieved_score=10.0, evaluation=u"Đạt", note=u"Đầy đủ tem nhãn"),
            KPITaskChecklistCriteria(task_id=sample_task.id, stt=2, criteria_name=u"Đo kích thước ngoại quan bằng thước kẹp", max_score=40.0, achieved_score=20.0, evaluation=u"Đạt", note=u"Sai lệch trong khoảng cho phép"),
            KPITaskChecklistCriteria(task_id=sample_task.id, stt=3, criteria_name=u"Báo cáo sự cố khi có lỗi lặp lại quá 3 lần", max_score=30.0, achieved_score=10.0, evaluation=u"Đạt", note=u"Ghi chép đầy đủ"),
            KPITaskChecklistCriteria(task_id=sample_task.id, stt=4, criteria_name=u"Vệ sinh 5S khu vực bàn kiểm định", max_score=20.0, achieved_score=0.0, evaluation=u"Chưa đạt", note=u"Cần dọn dẹp lại cuối ca")
        ]
        db.add_all(sample_criterias)
        db.commit()
        tasks = [sample_task]

    result = []
    for t in tasks:
        crits = db.query(KPITaskChecklistCriteria).filter(KPITaskChecklistCriteria.task_id == t.id).order_by(KPITaskChecklistCriteria.stt.asc()).all()
        result.append({
            "id": t.id,
            "task_code": t.task_code,
            "task_name": t.task_name,
            "assigner": t.assigner,
            "assignee": t.assignee,
            "deadline": t.deadline,
            "priority": t.priority,
            "status": t.status,
            "target_score": t.target_score,
            "achieved_score": t.achieved_score,
            "description": t.description,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "",
            "criterias": [
                {
                    "id": c.id,
                    "stt": c.stt,
                    "criteria_name": c.criteria_name,
                    "max_score": c.max_score,
                    "achieved_score": c.achieved_score,
                    "evaluation": c.evaluation,
                    "note": c.note
                }
                for c in crits
            ]
        })
    return result

@router.get("/{task_id}", response_model=dict)
def get_kpi_task_detail(task_id: int, db: Session = Depends(get_db)):
    t = db.query(KPITask).filter(KPITask.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")
    
    crits = db.query(KPITaskChecklistCriteria).filter(KPITaskChecklistCriteria.task_id == t.id).order_by(KPITaskChecklistCriteria.stt.asc()).all()
    return {
        "id": t.id,
        "task_code": t.task_code,
        "task_name": t.task_name,
        "assigner": t.assigner,
        "assignee": t.assignee,
        "deadline": t.deadline,
        "priority": t.priority,
        "status": t.status,
        "target_score": t.target_score,
        "achieved_score": t.achieved_score,
        "description": t.description,
        "created_at": t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "",
        "criterias": [
            {
                "id": c.id,
                "stt": c.stt,
                "criteria_name": c.criteria_name,
                "max_score": c.max_score,
                "achieved_score": c.achieved_score,
                "evaluation": c.evaluation,
                "note": c.note
            }
            for c in crits
        ]
    }

@router.post("/", response_model=dict)
def create_kpi_task(data: KPITaskCreateSchema, db: Session = Depends(get_db)):
    existing = db.query(KPITask).filter(KPITask.task_code == data.task_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã nhiệm vụ đã tồn tại")
    
    new_task = KPITask(
        task_code=data.task_code,
        task_name=data.task_name,
        assigner=data.assigner,
        assignee=data.assignee,
        deadline=data.deadline,
        priority=data.priority,
        status=data.status,
        target_score=data.target_score,
        achieved_score=data.achieved_score,
        description=data.description
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    if data.criterias:
        for idx, item in enumerate(data.criterias, 1):
            crit = KPITaskChecklistCriteria(
                task_id=new_task.id,
                stt=item.stt or idx,
                criteria_name=item.criteria_name,
                max_score=item.max_score,
                achieved_score=item.achieved_score,
                evaluation=item.evaluation,
                note=item.note
            )
            db.add(crit)
        db.commit()

    return {"status": "success", "id": new_task.id, "message": "Tạo nhiệm vụ CL.03.2 thành công"}

@router.put("/{task_id}", response_model=dict)
def update_kpi_task(task_id: int, data: KPITaskUpdateSchema, db: Session = Depends(get_db)):
    t = db.query(KPITask).filter(KPITask.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")

    update_dict = data.model_dump(exclude_unset=True)
    criterias_data = update_dict.pop("criterias", None)

    for field, val in update_dict.items():
        if val is not None:
            setattr(t, field, val)

    if criterias_data is not None:
        # Xóa cũ và ghi đè mới
        db.query(KPITaskChecklistCriteria).filter(KPITaskChecklistCriteria.task_id == t.id).delete()
        for idx, item in enumerate(criterias_data, 1):
            crit = KPITaskChecklistCriteria(
                task_id=t.id,
                stt=item.get("stt") or idx,
                criteria_name=item.get("criteria_name"),
                max_score=item.get("max_score", 10.0),
                achieved_score=item.get("achieved_score", 0.0),
                evaluation=item.get("evaluation", "Đạt"),
                note=item.get("note", "")
            )
            db.add(crit)

    db.commit()
    return {"status": "success", "message": "Cập nhật nhiệm vụ CL.03.2 thành công"}
