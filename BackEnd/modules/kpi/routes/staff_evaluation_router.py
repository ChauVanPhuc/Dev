from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from modules.kpi.models.staff_evaluation import StaffEvaluation
from modules.kpi.schemas.staff_evaluation import StaffEvaluationUpdate
import json
from typing import List

router = APIRouter()

def seed_staff_evaluations(db: Session):
    # Khởi tạo kpi_details mẫu
    kpis_khấn = [
        {"id": 1, "content": "Tuân thủ quy trình", "goal": "110", "actual": "80"},
        {"id": 2, "content": "Tỷ lệ lỗi phát hiện", "goal": "1.5%", "actual": "1.5%"},
        {"id": 3, "content": "Tỷ lệ lỗi lọt lưới", "goal": "1.5%", "actual": "1.5%"},
        {"id": 4, "content": "Tỷ lệ lỗi rework", "goal": "1.5%", "actual": "1.5%"},
        {"id": 5, "content": "Điểm báo cáo", "goal": "100", "actual": "100"}
    ]
    kpis_lương = [
        {"id": 1, "content": "Tuân thủ quy trình", "goal": "100", "actual": "105"},
        {"id": 2, "content": "Tỷ lệ lỗi phát hiện", "goal": "1.5%", "actual": "1.2%"},
        {"id": 3, "content": "Tỷ lệ lỗi lọt lưới", "goal": "1.5%", "actual": "1.0%"},
        {"id": 4, "content": "Tỷ lệ lỗi rework", "goal": "1.5%", "actual": "1.5%"},
        {"id": 5, "content": "Điểm báo cáo", "goal": "100", "actual": "100"}
    ]
    kpis_anh = [
        {"id": 1, "content": "Tuân thủ quy trình", "goal": "105", "actual": "105"},
        {"id": 2, "content": "Tỷ lệ lỗi phát hiện", "goal": "1.5%", "actual": "1.5%"},
        {"id": 3, "content": "Tỷ lệ lỗi lọt lưới", "goal": "1.5%", "actual": "1.5%"},
        {"id": 4, "content": "Tỷ lệ lỗi rework", "goal": "1.5%", "actual": "1.5%"},
        {"id": 5, "content": "Điểm báo cáo", "goal": "100", "actual": "100"}
    ]

    db.add(StaffEvaluation(
        staff_name="Hồ Sỹ Khấn", stage="Định hình 1", level="A", department="QLCL",
        goal_score=110.0, actual_score=80.0, status="Chưa đánh giá", rating="A",
        manager_note="", proposed_action="", kpi_details=json.dumps(kpis_khấn)
    ))
    db.add(StaffEvaluation(
        staff_name="Nguyễn Văn Lương", stage="Định hình 1", level="A", department="QLCL",
        goal_score=100.0, actual_score=110.0, status="Đã đánh giá", rating="A",
        manager_note="Thực hiện tốt chỉ tiêu tháng", proposed_action="Duy trì năng suất", kpi_details=json.dumps(kpis_lương)
    ))
    db.add(StaffEvaluation(
        staff_name="Trần Thị Anh", stage="Định hình 1", level="A", department="QLCL",
        goal_score=105.0, actual_score=105.0, status="Đã đánh giá", rating="B",
        manager_note="Hoàn thành vừa đủ mục tiêu đặt ra", proposed_action="Nâng cao chất lượng", kpi_details=json.dumps(kpis_anh)
    ))
    db.commit()

@router.get("/", response_model=List[dict])
def get_staff_evaluations(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách nhân sự đánh giá.
    Nếu rỗng, tự động seed dữ liệu.
    """
    records = db.query(StaffEvaluation).order_by(StaffEvaluation.id.desc()).all()
    if not records:
        seed_staff_evaluations(db)
        records = db.query(StaffEvaluation).order_by(StaffEvaluation.id.desc()).all()
        
    return [
        {
            "id": r.id,
            "staff_name": r.staff_name,
            "stage": r.stage,
            "level": r.level,
            "department": r.department,
            "goal_score": r.goal_score,
            "actual_score": r.actual_score,
            "status": r.status,
            "rating": r.rating,
            "manager_note": r.manager_note,
            "proposed_action": r.proposed_action,
            "kpi_details": r.kpi_details
        } for r in records
    ]

@router.get("/{eval_id}", response_model=dict)
def get_staff_evaluation_detail(eval_id: int, db: Session = Depends(get_db)):
    """
    [GET] Chi tiết đánh giá nhân sự theo ID
    """
    r = db.query(StaffEvaluation).filter(StaffEvaluation.id == eval_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá nhân sự")
    return {
        "id": r.id,
        "staff_name": r.staff_name,
        "stage": r.stage,
        "level": r.level,
        "department": r.department,
        "goal_score": r.goal_score,
        "actual_score": r.actual_score,
        "status": r.status,
        "rating": r.rating,
        "manager_note": r.manager_note,
        "proposed_action": r.proposed_action,
        "kpi_details": r.kpi_details
    }

@router.put("/{eval_id}", response_model=dict)
def update_staff_evaluation(eval_id: int, payload: StaffEvaluationUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật đánh giá xếp loại thái độ, nhận xét của quản lý
    """
    r = db.query(StaffEvaluation).filter(StaffEvaluation.id == eval_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá nhân sự")
        
    if payload.rating is not None:
        r.rating = payload.rating
    if payload.manager_note is not None:
        r.manager_note = payload.manager_note
    if payload.proposed_action is not None:
        r.proposed_action = payload.proposed_action
    
    r.status = "Đã đánh giá" # Chuyển trạng thái khi cập nhật
    
    db.commit()
    return {"status": "success", "message": "Cập nhật đánh giá nhân sự thành công"}
