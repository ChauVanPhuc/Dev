from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from modules.kpi.models.staff_evaluation import StaffEvaluation
from modules.kpi.models.quality_employee import QualityEmployee
from modules.kpi.models.kpi_management import KPIEmployeeItem
import json
from typing import List, Optional
from datetime import datetime

router = APIRouter()

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

def sync_evaluation_to_kpi(db: Session, eval_obj: StaffEvaluation):
    """
    Sau khi có đánh giá, tự động đồng bộ điểm và xếp loại này sang QualityEmployee và KPI Items
    """
    try:
        emp_code = str(eval_obj.employee_id or "").strip()
        emp_name = str(eval_obj.staff_name or "").strip()
        score_val = float(eval_obj.actual_score or 0.0)
        rating_val = str(eval_obj.rating or "A").strip()

        # 1. Cập nhật latest_rating trong bảng QualityEmployee
        qe = db.query(QualityEmployee).filter(
            (QualityEmployee.employee_id == emp_code) | (QualityEmployee.full_name == emp_name)
        ).first()
        if qe:
            qe.latest_rating = rating_val

        # 2. Cập nhật các chỉ số KPI liên quan đến Đánh giá từ Trưởng phòng / Quản lý
        kpi_items = db.query(KPIEmployeeItem).filter(
            (KPIEmployeeItem.employee_id == emp_code) | (KPIEmployeeItem.employee_id == emp_name)
        ).all()
        for item in kpi_items:
            cm = str(item.calc_method or "").lower()
            content = str(item.content or "").lower()
            if cm == "manager_score" or ("đánh giá" in content and ("trưởng phòng" in content or "quản lý" in content)):
                item.actual = f"{score_val:.0f} điểm (Loại {rating_val})"
                item.status = "Đạt KPI" if score_val >= 80 else "Chưa đạt KPI"

        db.commit()
    except Exception as e:
        print("[WARNING] sync_evaluation_to_kpi error:", e)

@router.get("", include_in_schema=False)
@router.get("/", response_model=List[dict])
def get_staff_evaluations(
    search: Optional[str] = None,
    department: Optional[str] = None,
    stage: Optional[str] = None,
    rating: Optional[str] = None,
    status: Optional[str] = None,
    factory: Optional[str] = None,
    month: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách đánh giá nhân sự, hỗ trợ đầy đủ bộ lọc và mapping thông tin nhà máy.
    """
    ensure_staff_evaluations_columns(db)

    # Lấy thông tin nhân viên từ bảng QualityEmployee để bổ sung metadata
    employees = db.query(QualityEmployee).all()
    emp_map = {str(e.employee_id).strip(): e for e in employees if e.employee_id}
    name_map = {str(e.full_name).strip(): e for e in employees if e.full_name}

    records = db.query(StaffEvaluation).order_by(StaffEvaluation.id.desc()).all()

    result = []
    for r in records:
        emp_code = str(getattr(r, 'employee_id', '') or '').strip()
        staff_name = str(r.staff_name or '').strip()
        
        qe = emp_map.get(emp_code) or name_map.get(staff_name)
        fac = qe.factory if qe and qe.factory else "Nhà máy chung"
        phone = qe.phone if qe and qe.phone else ""
        email = qe.email if qe and qe.email else ""
        dept = r.department or (qe.department if qe else "QLCL")
        stg = r.stage or (qe.stage if qe else "")
        eval_dt = getattr(r, 'eval_date', None) or ""

        # Lọc dữ liệu nếu có query param
        if search and isinstance(search, str):
            s_lower = search.lower().strip()
            if s_lower not in emp_code.lower() and s_lower not in staff_name.lower():
                continue

        if department and isinstance(department, str) and department.strip() and department.lower() != 'all':
            if dept.lower() != department.lower().strip():
                continue

        if stage and isinstance(stage, str) and stage.strip() and stage.lower() != 'all':
            if stg.lower() != stage.lower().strip():
                continue

        if rating and isinstance(rating, str) and rating.strip() and rating.lower() != 'all':
            if (r.rating or '').upper() != rating.upper().strip():
                continue

        if status and isinstance(status, str) and status.strip() and status.lower() != 'all':
            if (r.status or '').lower() != status.lower().strip():
                continue

        if factory and isinstance(factory, str) and factory.strip() and factory.lower() != 'all':
            if fac.lower() != factory.lower().strip():
                continue

        if month and isinstance(month, str) and month.strip() and month.lower() != 'all':
            m_clean = month.strip()
            if not (m_clean in eval_dt):
                continue

        result.append({
            "id": r.id,
            "employee_id": emp_code or None,
            "staff_name": staff_name,
            "stage": stg,
            "level": r.level,
            "department": dept,
            "factory": fac,
            "phone": phone,
            "email": email,
            "goal_score": r.goal_score,
            "actual_score": r.actual_score,
            "status": r.status,
            "rating": r.rating,
            "manager_note": r.manager_note,
            "proposed_action": r.proposed_action,
            "kpi_details": r.kpi_details,
            "eval_date": eval_dt,
            "achievements": getattr(r, 'achievements', None),
            "limitations": getattr(r, 'limitations', None),
            "improvement_plan": getattr(r, 'improvement_plan', None),
            "proposals": getattr(r, 'proposals', None)
        })

    return result

@router.post("", include_in_schema=False)
@router.post("/", response_model=dict)
def create_staff_evaluation(payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới một bản ghi đánh giá nhân sự từ Web / Mobile
    """
    ensure_staff_evaluations_columns(db)
    
    emp_code = payload.get("employee_id")
    staff_name = payload.get("staff_name")
    stage = payload.get("stage")
    department = payload.get("department")

    # Tự động điền thông tin nhân sự nếu thiếu
    if emp_code:
        qe = db.query(QualityEmployee).filter(QualityEmployee.employee_id == str(emp_code).strip()).first()
        if qe:
            if not staff_name:
                staff_name = qe.full_name
            if not stage:
                stage = qe.stage
            if not department:
                department = qe.department

    new_eval = StaffEvaluation(
        employee_id=emp_code,
        staff_name=staff_name or "Nhân sự",
        stage=stage or "QLCL",
        level=payload.get("level") or "A",
        department=department or "Phòng QA/QC",
        goal_score=float(payload.get("goal_score") or 100.0),
        actual_score=float(payload.get("actual_score") or 0.0),
        status=payload.get("status") or "Đã đánh giá",
        rating=payload.get("rating") or "A",
        manager_note=payload.get("manager_note") or "",
        proposed_action=payload.get("proposed_action") or "",
        eval_date=payload.get("eval_date") or datetime.now().strftime("%d/%m/%Y"),
        achievements=payload.get("achievements") or "",
        limitations=payload.get("limitations") or "",
        improvement_plan=payload.get("improvement_plan") or "",
        proposals=payload.get("proposals") or "",
        kpi_details=payload.get("kpi_details") if isinstance(payload.get("kpi_details"), str) else json.dumps(payload.get("kpi_details") or [])
    )
    db.add(new_eval)
    db.commit()
    db.refresh(new_eval)
    sync_evaluation_to_kpi(db, new_eval)
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
    
    emp_code = getattr(r, 'employee_id', None)
    qe = None
    if emp_code:
        qe = db.query(QualityEmployee).filter(QualityEmployee.employee_id == str(emp_code).strip()).first()
    elif r.staff_name:
        qe = db.query(QualityEmployee).filter(QualityEmployee.full_name == r.staff_name).first()

    return {
        "id": r.id,
        "employee_id": emp_code,
        "staff_name": r.staff_name,
        "stage": r.stage or (qe.stage if qe else ""),
        "level": r.level,
        "department": r.department or (qe.department if qe else "QLCL"),
        "factory": qe.factory if qe else "Nhà máy chung",
        "phone": qe.phone if qe else "",
        "email": qe.email if qe else "",
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
    [PUT] Cập nhật đánh giá xếp loại, nhận xét của quản lý
    """
    ensure_staff_evaluations_columns(db)
    r = db.query(StaffEvaluation).filter(StaffEvaluation.id == eval_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá nhân sự")
        
    for k, v in payload.items():
        if hasattr(r, k) and v is not None:
            setattr(r, k, v)
    
    if "status" not in payload:
        r.status = "Đã đánh giá" # Mặc định hoàn tất đánh giá khi cập nhật
    
    db.commit()
    sync_evaluation_to_kpi(db, r)
    return {"status": "success", "message": "Cập nhật đánh giá nhân sự thành công"}

@router.delete("/{eval_id}", response_model=dict)
def delete_staff_evaluation(eval_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa một bản ghi đánh giá nhân sự
    """
    ensure_staff_evaluations_columns(db)
    r = db.query(StaffEvaluation).filter(StaffEvaluation.id == eval_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá nhân sự")
    db.delete(r)
    db.commit()
    return {"status": "success", "message": "Xóa đánh giá nhân sự thành công"}
