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

def ensure_staff_evaluations_columns(db: Session):
    """
    Tự động kiểm tra và thêm các cột mới vào bảng staff_evaluations trong SQL Server nếu chưa có.
    """
    from sqlalchemy import text
    columns_to_add = [
        ("employee_id", "NVARCHAR(50) NULL"),
        ("eval_date", "NVARCHAR(50) NULL"),
        ("achievements", "NVARCHAR(1000) NULL"),
        ("limitations", "NVARCHAR(1000) NULL"),
        ("improvement_plan", "NVARCHAR(1000) NULL"),
        ("proposals", "NVARCHAR(1000) NULL"),
    ]
    for col_name, col_type in columns_to_add:
        try:
            db.execute(text(f"""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID('staff_evaluations') 
                    AND name = '{col_name}'
                )
                BEGIN
                    ALTER TABLE staff_evaluations ADD {col_name} {col_type};
                END
            """))
            db.commit()
        except Exception:
            db.rollback()

@router.get("/", response_model=List[dict])
def get_staff_evaluations(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách nhân sự đánh giá.
    Nếu rỗng, tự động seed dữ liệu.
    """
    ensure_staff_evaluations_columns(db)
    records = db.query(StaffEvaluation).order_by(StaffEvaluation.id.desc()).all()
    if not records:
        seed_staff_evaluations(db)
        records = db.query(StaffEvaluation).order_by(StaffEvaluation.id.desc()).all()
        
    return [
        {
            "id": r.id,
            "employee_id": getattr(r, 'employee_id', None),
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
            "kpi_details": r.kpi_details,
            "eval_date": getattr(r, 'eval_date', None),
            "achievements": getattr(r, 'achievements', None),
            "limitations": getattr(r, 'limitations', None),
            "improvement_plan": getattr(r, 'improvement_plan', None),
            "proposals": getattr(r, 'proposals', None)
        } for r in records
    ]

@router.post("/", response_model=dict)
def create_staff_evaluation(payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới một bản ghi đánh giá nhân sự từ Mobile/Web
    """
    ensure_staff_evaluations_columns(db)
    import json
    new_eval = StaffEvaluation(
        employee_id=payload.get("employee_id"),
        staff_name=payload.get("staff_name") or "Nhân sự",
        stage=payload.get("stage") or "QLCL",
        level=payload.get("level") or "A",
        department=payload.get("department") or "Phòng QA/QC",
        goal_score=float(payload.get("goal_score") or 100.0),
        actual_score=float(payload.get("actual_score") or 0.0),
        status=payload.get("status") or "Đã đánh giá",
        rating=payload.get("rating") or "A",
        manager_note=payload.get("manager_note") or "",
        proposed_action=payload.get("proposed_action") or "",
        eval_date=payload.get("eval_date") or "",
        achievements=payload.get("achievements") or "",
        limitations=payload.get("limitations") or "",
        improvement_plan=payload.get("improvement_plan") or "",
        proposals=payload.get("proposals") or "",
        kpi_details=payload.get("kpi_details") if isinstance(payload.get("kpi_details"), str) else json.dumps(payload.get("kpi_details") or [])
    )
    db.add(new_eval)
    db.commit()
    db.refresh(new_eval)
    return {"status": "success", "id": new_eval.id, "message": "Tạo mới đánh giá nhân sự thành công"}

@router.get("/{eval_id}", response_model=dict)
def get_staff_evaluation_detail(eval_id: int, db: Session = Depends(get_db)):
    """
    [GET] Chi tiết đánh giá nhân sự theo ID
    """
    ensure_staff_evaluations_columns(db)
    r = db.query(StaffEvaluation).filter(StaffEvaluation.id == eval_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá nhân sự")
    return {
        "id": r.id,
        "employee_id": getattr(r, 'employee_id', None),
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
        "kpi_details": r.kpi_details,
        "eval_date": getattr(r, 'eval_date', None),
        "achievements": getattr(r, 'achievements', None),
        "limitations": getattr(r, 'limitations', None),
        "improvement_plan": getattr(r, 'improvement_plan', None),
        "proposals": getattr(r, 'proposals', None)
    }

@router.put("/{eval_id}", response_model=dict)
def update_staff_evaluation(eval_id: int, payload: dict, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật đánh giá xếp loại thái độ, nhận xét của quản lý
    """
    ensure_staff_evaluations_columns(db)
    r = db.query(StaffEvaluation).filter(StaffEvaluation.id == eval_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá nhân sự")
        
    for k, v in payload.items():
        if hasattr(r, k) and v is not None:
            setattr(r, k, v)
    
    r.status = "Đã đánh giá" # Chuyển trạng thái khi cập nhật
    
    db.commit()
    return {"status": "success", "message": "Cập nhật đánh giá nhân sự thành công"}
