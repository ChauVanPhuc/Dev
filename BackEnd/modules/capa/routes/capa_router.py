from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from modules.capa.models.capa import CAPA
from modules.capa.models.capa_occurrence import CAPAOccurrence
from modules.capa.models.capa_evaluation import CAPAEvaluation
from modules.capa.schemas.capa import CAPAOccurrenceUpdate, CAPAEvaluationCreate
from typing import List
import json

router = APIRouter()

def seed_capas(db: Session):
    # 1. CAPA 1: Cong venh
    c1 = CAPA(
        error_name="Cong vênh",
        description="Cánh cửa bị cong dẫn đến đóng không được khít",
        severity="Nghiêm trọng",
        assigned_person="Hà Minh Xuân",
        images="[]"
    )
    db.add(c1)
    db.flush() # Lấy ID của c1
    
    # Occurrences cho c1
    o1_2 = CAPAOccurrence(
        capa_id=c1.id,
        occurrence_number=2,
        occurrence_date="27/08/2025",
        container_code="APT0056",
        product_name="T48s",
        quantity=12,
        issue_detail="T48s bị cong cánh cửa quá 2mm, cánh cửa ko che được",
        inspector_name="Hà Minh Xuân",
        status="Chờ đánh giá",
        main_cause="",
        corrective_action=""
    )
    db.add(o1_2)
    db.flush()

    o1_1 = CAPAOccurrence(
        capa_id=c1.id,
        occurrence_number=1,
        occurrence_date="27/08/2024",
        container_code="APT0042",
        product_name="T48s",
        quantity=150,
        issue_detail="Cánh cửa bị cong lệch mép",
        inspector_name="Hà Minh Xuân",
        status="Đã đóng",
        main_cause="Độ ẩm vượt mức tiêu chuẩn",
        corrective_action="Hồi ẩm trước khi kiểm tra"
    )
    db.add(o1_1)
    db.flush()

    # Evaluations cho c1 occurrences
    db.add(CAPAEvaluation(
        occurrence_id=o1_2.id,
        content="Kiểm tra thao tác lụa phôi",
        execution_date="28/04/2025",
        executor="Hà Minh Xuân",
        result="Chưa đg",
        notes="",
        images="[]"
    ))
    db.add(CAPAEvaluation(
        occurrence_id=o1_1.id,
        content="Check thao tác lụa phôi",
        execution_date="22/11/2025",
        executor="Hà Minh Xuân",
        result="Chưa đg",
        notes="",
        images="[]"
    ))
    db.add(CAPAEvaluation(
        occurrence_id=o1_1.id,
        content="Check độ ẩm",
        execution_date="22/11/2025",
        executor="Đặng Minh Tuấn",
        result="Fail",
        notes="",
        images="[]"
    ))
    db.add(CAPAEvaluation(
        occurrence_id=o1_1.id,
        content="Check ngoại quan",
        execution_date="22/11/2025",
        executor="Đặng Văn Nam",
        result="Pass",
        notes="",
        images="[]"
    ))

    # 2. CAPA 2: Khong dong mau
    c2 = CAPA(
        error_name="Không đồng màu",
        description="Sản phẩm bị lệch màu sơn phủ bề mặt ngoài",
        severity="Nặng",
        assigned_person="Đặng Minh Tuấn",
        images="[]"
    )
    db.add(c2)
    db.flush()

    o2_1 = CAPAOccurrence(
        capa_id=c2.id,
        occurrence_number=1,
        occurrence_date="22/11/2025",
        container_code="APT0043",
        product_name="T49s",
        quantity=1,
        issue_detail="Sản phẩm sơn lót lệch màu sơn phủ ngoài 5%",
        inspector_name="Đặng Minh Tuấn",
        status="Đã đóng",
        main_cause="Tỉ lệ pha dung môi chưa chính xác",
        corrective_action="Pha theo đúng tỉ lệ định lượng chuẩn"
    )
    db.add(o2_1)
    db.flush()

    # 3. CAPA 3: Sai tem nhan
    c3 = CAPA(
        error_name="Sai tem nhãn",
        description="Tem mã vạch dán sai vị trí hoặc sai thông tin lô sản xuất",
        severity="Nhẹ",
        assigned_person="Đặng Văn Nam",
        images="[]"
    )
    db.add(c3)
    db.flush()

    o3_1 = CAPAOccurrence(
        capa_id=c3.id,
        occurrence_number=1,
        occurrence_date="22/11/2025",
        container_code="APT0044",
        product_name="T50s",
        quantity=3,
        issue_detail="Nhầm lẫn tem nhãn thùng hàng",
        inspector_name="Đặng Văn Nam",
        status="Chờ đánh giá",
        main_cause="",
        corrective_action=""
    )
    db.add(o3_1)
    db.flush()

    db.add(CAPAEvaluation(
        occurrence_id=o3_1.id,
        content="Kiểm tra tem mã vạch",
        execution_date="22/11/2025",
        executor="Đặng Văn Nam",
        result="Chưa đg",
        notes="",
        images="[]"
    ))
    
    db.commit()

@router.get("/", response_model=List[dict])
def get_capas(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách CAPA tổng thể (MH-23)
    """
    records = db.query(CAPA).all()
    if not records:
        seed_capas(db)
        records = db.query(CAPA).all()
        
    result_list = []
    for r in records:
        # Tìm ngày ghi nhận mới nhất và số lần ghi nhận
        occurrences = r.occurrences
        count = len(occurrences)
        latest_date = ""
        if count > 0:
            # Lấy occurrence có number lớn nhất làm mới nhất
            sorted_occ = sorted(occurrences, key=lambda x: x.occurrence_number, reverse=True)
            latest_date = sorted_occ[0].occurrence_date
            
        result_list.append({
            "id": r.id,
            "error_name": r.error_name,
            "description": r.description,
            "severity": r.severity,
            "assigned_person": r.assigned_person,
            "latest_date": latest_date,
            "occurrence_count": count
        })
    return result_list

@router.get("/{capa_id}", response_model=dict)
def get_capa_detail(capa_id: int, db: Session = Depends(get_db)):
    """
    [GET] Chi tiết CAPA và danh sách các lần ghi nhận (MH-24)
    """
    c = db.query(CAPA).filter(CAPA.id == capa_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Không tìm thấy CAPA")
        
    occurrences_data = []
    for occ in c.occurrences:
        occurrences_data.append({
            "id": occ.id,
            "occurrence_number": occ.occurrence_number,
            "occurrence_date": occ.occurrence_date,
            "container_code": occ.container_code,
            "product_name": occ.product_name,
            "quantity": occ.quantity,
            "inspector_name": occ.inspector_name,
            "status": occ.status
        })
        
    return {
        "id": c.id,
        "error_name": c.error_name,
        "description": c.description,
        "severity": c.severity,
        "assigned_person": c.assigned_person,
        "images": c.images,
        "occurrences": sorted(occurrences_data, key=lambda x: x["occurrence_number"], reverse=True)
    }

@router.get("/{capa_id}/occurrences/{occurrence_id}", response_model=dict)
def get_capa_occurrence_detail(capa_id: int, occurrence_id: int, db: Session = Depends(get_db)):
    """
    [GET] Chi tiết 1 lần ghi nhận CAPA bao gồm thông tin ghi nhận, điều tra và đánh giá (MH-25)
    """
    occ = db.query(CAPAOccurrence).filter(
        CAPAOccurrence.capa_id == capa_id, 
        CAPAOccurrence.id == occurrence_id
    ).first()
    
    if not occ:
        raise HTTPException(status_code=404, detail="Không tìm thấy lần ghi nhận CAPA")
        
    evaluations_data = []
    for ev in occ.evaluations:
        evaluations_data.append({
            "id": ev.id,
            "content": ev.content,
            "execution_date": ev.execution_date,
            "executor": ev.executor,
            "result": ev.result,
            "notes": ev.notes,
            "images": ev.images
        })
        
    return {
        "id": occ.id,
        "capa_id": occ.capa_id,
        "occurrence_number": occ.occurrence_number,
        "occurrence_date": occ.occurrence_date,
        "container_code": occ.container_code,
        "product_name": occ.product_name,
        "quantity": occ.quantity,
        "inspector_name": occ.inspector_name,
        "status": occ.status,
        "issue_detail": occ.issue_detail,
        "main_cause": occ.main_cause,
        "corrective_action": occ.corrective_action,
        "evaluations": evaluations_data
    }

@router.put("/{capa_id}/occurrences/{occurrence_id}/investigation", response_model=dict)
def update_capa_investigation(
    capa_id: int, 
    occurrence_id: int, 
    payload: CAPAOccurrenceUpdate, 
    db: Session = Depends(get_db)
):
    """
    [PUT] Cập nhật thông tin điều tra (Nguyên nhân chính và hành động khắc phục) (MH-25)
    """
    occ = db.query(CAPAOccurrence).filter(
        CAPAOccurrence.capa_id == capa_id, 
        CAPAOccurrence.id == occurrence_id
    ).first()
    
    if not occ:
        raise HTTPException(status_code=404, detail="Không tìm thấy lần ghi nhận CAPA")
        
    if payload.main_cause is not None:
        occ.main_cause = payload.main_cause
    if payload.corrective_action is not None:
        occ.corrective_action = payload.corrective_action
    if payload.status is not None:
        occ.status = payload.status
        
    db.commit()
    return {"status": "success", "message": "Cập nhật thông tin điều tra CAPA thành công"}

@router.post("/{capa_id}/occurrences/{occurrence_id}/evaluations", response_model=dict)
def add_capa_evaluation(
    capa_id: int, 
    occurrence_id: int, 
    payload: CAPAEvaluationCreate, 
    db: Session = Depends(get_db)
):
    """
    [POST] Thêm mới dòng đánh giá kiểm tra CAPA từ Modal Popup (MH-25 Dialog)
    """
    occ = db.query(CAPAOccurrence).filter(
        CAPAOccurrence.capa_id == capa_id, 
        CAPAOccurrence.id == occurrence_id
    ).first()
    
    if not occ:
        raise HTTPException(status_code=404, detail="Không tìm thấy lần ghi nhận CAPA")
        
    new_ev = CAPAEvaluation(
        occurrence_id=occ.id,
        content=payload.content,
        execution_date=payload.execution_date,
        executor=payload.executor,
        result=payload.result or "Chưa đg",
        notes=payload.notes,
        images=payload.images or "[]"
    )
    db.add(new_ev)
    db.commit()
    db.refresh(new_ev)
    return {"status": "success", "id": new_ev.id, "message": "Thêm đánh giá CAPA thành công"}
