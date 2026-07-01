from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from modules.kpi.models.award_discipline import AwardDiscipline
from modules.kpi.schemas.award_discipline import AwardDisciplineCreate
from typing import List

router = APIRouter()

@router.get("/", response_model=List[dict])
def get_award_disciplines(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách khen thưởng, kỷ luật.
    Nếu trống, tự động seed 1 dòng mẫu.
    """
    records = db.query(AwardDiscipline).order_by(AwardDiscipline.id.desc()).all()
    if not records:
        initial_record = AwardDiscipline(
            staff_name="Hồ Sỹ Khấn",
            issue="Thiếu tem mẫu",
            note="Kiểm tra phát hiện thiếu tem mẫu trên cont hàng",
            impact="Cao",
            points=50,
            date="22.01.2026",
            evidence_images="[]"
        )
        db.add(initial_record)
        db.commit()
        records = [initial_record]
    
    return [
        {
            "id": r.id,
            "staff_name": r.staff_name,
            "issue": r.issue,
            "note": r.note,
            "impact": r.impact,
            "points": r.points,
            "date": r.date,
            "evidence_images": r.evidence_images
        } for r in records
    ]

@router.post("/", response_model=dict)
def create_award_discipline(payload: AwardDisciplineCreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới kỷ luật / khen thưởng
    """
    new_record = AwardDiscipline(
        staff_name=payload.staff_name,
        issue=payload.issue,
        note=payload.note,
        impact=payload.impact,
        points=payload.points,
        date=payload.date,
        evidence_images=payload.evidence_images or "[]"
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return {"status": "success", "id": new_record.id, "message": "Lưu khen thưởng/kỷ luật thành công"}
