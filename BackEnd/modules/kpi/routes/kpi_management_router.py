from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
import os
import shutil
from sqlalchemy.orm import Session
from config.database import get_db
from modules.kpi.models.kpi_management import KPIChecklist, KPIEmployeeItem, KPIViolation, KPIFeedback, KPIPointRule, KPIChecklistPool, KPIItemPool, KPITrainingPlan, KPIMonthlyScore, KPIAuditLog
from modules.auth.models.accounts import Account
from modules.auth.models.employees import Employee
from modules.auth.models.departments import Department
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.kpi.models.award_discipline import AwardDiscipline
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import random
import hashlib

router = APIRouter()

# --- PYDANTIC SCHEMAS ---

class KPIChecklistBase(BaseModel):
    task_code: str
    content: str
    frequency: str
    status_today: str
    perform_count: int
    last_performed: Optional[str] = None
    result: Optional[str] = None

class KPIChecklistCreate(KPIChecklistBase):
    employee_id: str

class KPIEmployeeItemBase(BaseModel):
    kpi_code: str
    content: str
    score: int
    calc_method: str
    target: str
    actual: Optional[str] = None
    status: Optional[str] = None
    icon: Optional[str] = None

class KPIEmployeeItemCreate(KPIEmployeeItemBase):
    employee_id: str

class KPIViolationBase(BaseModel):
    violation_code: str
    content: str
    calculation: str
    violation_time: str
    performer: str
    note: Optional[str] = None

class KPIViolationCreate(KPIViolationBase):
    employee_id: str

class KPIFeedbackBase(BaseModel):
    feedback_code: str
    type: str
    content: str
    feedback_time: str
    reviewer: str

class KPIFeedbackCreate(KPIFeedbackBase):
    employee_id: str

class KPIPointRuleBase(BaseModel):
    rule_code: str
    content: str
    points: int
    impact: str
    note: Optional[str] = None

class KPIChecklistPoolBase(BaseModel):
    task_code: str
    content: str
    frequency: str

class KPIItemPoolBase(BaseModel):
    kpi_code: str
    content: str
    calc_method: str
    target: str

class KPITrainingPlanBase(BaseModel):
    code: str
    name: str
    target: str
    time: str
    teacher: str
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    status: Optional[str] = "Sắp diễn ra"

# --- DEFAULT DATA GENERATOR (SEEDERS) ---

def seed_employee_defaults(db: Session, employee_id: str):
    """
    Sinh các công việc checklist và kpi mẫu cho nhân sự nếu họ chưa có.
    """
    # Sinh seed ngẫu nhiên nhưng cố định dựa trên mã nhân sự để đảm bảo dữ liệu không bị thay đổi mỗi lần load
    seed_val = int(hashlib.md5(employee_id.encode('utf-8')).hexdigest(), 16) % 10000000
    rng = random.Random(seed_val)

    # 1. Checklist mẫu tiếng Việt (trích từ ảnh 2)
    existing_checklist = db.query(KPIChecklist).filter(KPIChecklist.employee_id == employee_id).first()
    if not existing_checklist:
        checklist_pool = [
            ("Duyệt báo cáo", "Hàng ngày"),
            ("Họp giao việc đầu ca", "Hàng ngày"),
            ("Báo cáo các hình hình chất lượng", "Hằng tháng"),
            ("Kiểm tra ngẫu nhiên (Spot-check)", "Hàng ngày"),
            ("Gửi cảnh báo lỗi", "Hàng tuần"),
            ("Phân tích Pareto & Đóng CAPA", "Hàng tuần"),
            ("Kiểm tra nhật ký ghi chép", "Hàng tuần"),
            ("Báo cáo xu hướng lỗi hằng tháng", "Hàng tuần"),
            ("Báo phép, công, tăng ca", "Hàng ngày"),
            ("Theo dõi hồ sơ chất lượng", "Hàng tháng"),
            ("Đi tuần xưởng", "Hàng ngày"),
            ("Kiểm tra thiết bị", "Hàng ngày"),
            ("Họp giao ca đứng (Toolbox)", "Hàng ngày"),
            ("Kiểm tra chéo ngẫu nhiên & Test lỗi", "Hàng ngày"),
            ("Đóng CAPA", "Khi phát sinh"),
            ("Đánh giá nhân sự", "Hằng tháng"),
            ("Báo cáo tình hình", "Hằng tuần"),
            ("Ký duyệt đầu mẫu (FAI)", "Hàng ngày"),
            ("Thực thi & Theo dõi CAPA tại chỗ", "Liên tục trong ca"),
            ("Cập nhật sự thay đổi bản vẽ", "Hằng tháng"),
        ]
        # Xáo trộn và lấy một số lượng ngẫu nhiên từ 7 đến 12 công việc cho nhân sự này
        num_tasks = rng.randint(7, 12)
        selected_tasks = rng.sample(checklist_pool, num_tasks)
        
        for idx, (content, freq) in enumerate(selected_tasks):
            code = f"CV{idx+1:02d}"
            status_today = rng.choice(["Đã hoàn thành", "Chưa hoàn thành"])
            perform_count = rng.randint(1, 3) if status_today == "Đã hoàn thành" else 0
            last_performed = "2026-06-30" if status_today == "Đã hoàn thành" else "-"
            result = rng.choice(["Đầy đủ dữ liệu", "Đạt chuẩn QC", "Đạt yêu cầu", "Tốt"]) if status_today == "Đã hoàn thành" else "-"
            
            db.add(KPIChecklist(
                employee_id=employee_id,
                task_code=code,
                content=content,
                frequency=freq,
                status_today=status_today,
                perform_count=perform_count,
                last_performed=last_performed,
                result=result
            ))

    # 2. KPI mẫu tiếng Việt (trích từ ảnh 1)
    existing_kpis = db.query(KPIEmployeeItem).filter(KPIEmployeeItem.employee_id == employee_id).first()
    if not existing_kpis:
        kpi_pool = [
            ("duyệt báo cáo đúng hạn", 100, "Số báo cáo chất lượng được phê duyệt /Tổng số báo cáo cần duyệt phát sinh", ">= 95%", "97%"),
            ("duy trì họp giao việc đầu ca", 50, ">= 1 Biên bản họp/ tuần", "100%", "100%"),
            ("Tiến độ báo cáo tình hình chất lượng tháng", 50, "Báo cáo tháng ở trạng thái gửi trước ngày 25 hằng tháng", "100%", "92%"),
            ("kiem tra ngẫu nhiên", 50, "> 20 lượt", "> 20 lượt", "22 lượt"),
            ("phản hồi va gửi cảnh báo lỗi kịp thời", 50, ">5 lượt mỗi tuần", "> 5 lượt", "6 lượt"),
            ("đóng biên bản khắc phục (CAPA) đúng hạn", 100, "CAPA được gửi và đúng hạn", "100%", "100%"),
            ("Gửi cảnh báo", 50, "Cảnh báo lỗi mỗi tuần", "> 1 cảnh báo", "2 cảnh báo"),
            ("Lưu lại lịch sử cơm, tăng ca", 50, "> 23 dòng trên tháng", "> 23 dòng", "24 dòng"),
            ("Kiểm tra thiết bị", 50, ">5 lượt mỗi tuần", "> 5 lượt", "4 lượt"),
            ("Họp team", 30, "> 1 buổi / tuần", ">= 1 buổi", "1 buổi"),
            ("Hiệu quả kiểm tra chéo & Thử nghiệm phá hủy", 50, "> 1 báo cáo / tháng", ">= 1 báo cáo", "1 báo cáo"),
            ("Tiến độ đánh giá nhân sự", 50, "Hoàn thành đánh giá nhân sự", "Hoàn thành", "Hoàn thành"),
            ("Báo cáo tình hình", 50, ">1 báo cáo/ tháng", ">= 1 báo cáo", "1 báo cáo"),
            ("Xây dựng CAPA", 50, "Đóng CAPA đúng hạn", "Đúng hạn", "Đúng hạn"),
            ("Tỷ lệ lọt lỗi", 100, "Tỷ lệ lọt lỗi nhỏ hơn mục tiêu", "< 0.5%", "0.2%"),
            ("Tỷ lệ claim", 100, "Tỷ lệ khiếu nại khách hàng", "0 claim", "0 claim"),
            ("Tỷ lệ sản phẩm đạt lần đầu", 100, "Tỷ lệ sản phẩm đạt chất lượng lần đầu (FTY)", ">= 98%", "98.5%"),
        ]
        # Xáo trộn và lấy từ 4 đến 7 KPI chỉ số
        num_kpis = rng.randint(4, 7)
        selected_kpis = rng.sample(kpi_pool, num_kpis)
        
        base_score = 100 // num_kpis
        remainder = 100 % num_kpis
        
        for idx, (content, score, calc, target, actual) in enumerate(selected_kpis):
            code = f"KPI{idx+1:02d}"
            status = rng.choice(["Đạt KPI", "Chưa đạt KPI"])
            icon = "check" if status == "Đạt KPI" else "x"
            item_score = base_score + (remainder if idx == 0 else 0)
            
            db.add(KPIEmployeeItem(
                employee_id=employee_id,
                kpi_code=code,
                content=content,
                score=item_score,
                calc_method=calc,
                target=target,
                actual=actual,
                status=status,
                icon=icon
            ))

    # 3. Vi phạm mẫu (Quy tắc cộng trừ điểm)
    existing_violations = db.query(KPIViolation).filter(KPIViolation.employee_id == employee_id).first()
    if not existing_violations:
        default_violations = [
            ("VP01", "Thiếu form mẫu bản vẽ kiểm tra", "-10", "2026-06-28 09:15", "Quản lý QC", "Phát hiện trong lúc đi tuần xưởng"),
            ("VP02", "Đóng góp sáng kiến cải tiến quy trình đóng gói", "+50", "2026-06-29 14:00", "Trưởng phòng", "Đã được phê duyệt áp dụng thực tế"),
        ]
        for code, content, calc, time_str, perf, note in default_violations:
            db.add(KPIViolation(
                employee_id=employee_id,
                violation_code=code,
                content=content,
                calculation=calc,
                violation_time=time_str,
                performer=perf,
                note=note
            ))

    # 4. Nhận xét mẫu
    existing_feedbacks = db.query(KPIFeedback).filter(KPIFeedback.employee_id == employee_id).first()
    if not existing_feedbacks:
        default_feedbacks = [
            ("NX01", "Thành tích nổi bật", "Hoàn thành xuất sắc nhiệm vụ cải tiến quy trình kiểm tra đầu vào, giảm 15% thời gian chờ.", "2026-06-30", "Quản lý QC"),
            ("NX02", "Những khó khăn", "Thiết bị kiểm thử thi thoảng chập chờn gây ảnh hưởng đến năng suất thực tế.", "2026-06-30", "Quản lý QC"),
            ("NX03", "Đề xuất", "Đề xuất nâng cấp phần mềm firmware của máy đo hoặc trang bị thêm 1 máy dự phòng.", "2026-06-30", "Quản lý QC"),
        ]
        for code, type_str, content, time_str, rev in default_feedbacks:
            db.add(KPIFeedback(
                employee_id=employee_id,
                feedback_code=code,
                type=type_str,
                content=content,
                feedback_time=time_str,
                reviewer=rev
            ))

    db.commit()

# --- API ENDPOINTS ---

# 1. Get employees list for dropdown/sidebar selector
@router.get("/employees", response_model=List[dict])
def get_kpi_employees(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách nhân viên có mã nhân sự để phân quyền và quản lý KPI.
    """
    employees = db.query(Employee).order_by(Employee.id.desc()).all()
    
    # Đảm bảo gieo dữ liệu mẫu cho mỗi nhân viên để có dữ liệu trực quan
    for emp in employees:
        seed_employee_defaults(db, emp.employee_id)
        
    res = []
    for emp in employees:
        res.append({
            "employee_id": emp.employee_id,
            "full_name": emp.full_name,
            "username": emp.employee_id,
            "department": emp.department or "Hành chính",
            "position": emp.position or "Nhân Viên",
            "status": emp.status or "Đang làm việc",
            "created_at": "-"
        })
    return res

# 2. Checklist công việc CRUD
@router.get("/checklists", response_model=List[dict])
def get_checklists(employee_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(KPIChecklist)
    if employee_id:
        query = query.filter(KPIChecklist.employee_id == employee_id)
    items = query.order_by(KPIChecklist.id.desc()).all()
    return [
        {
            "id": idx.id,
            "employee_id": idx.employee_id,
            "task_code": idx.task_code,
            "content": idx.content,
            "frequency": idx.frequency,
            "status_today": idx.status_today,
            "perform_count": idx.perform_count,
            "last_performed": idx.last_performed,
            "result": idx.result
        }
        for idx in items
    ]

@router.post("/checklists", response_model=dict)
def create_checklist(item: KPIChecklistCreate, db: Session = Depends(get_db)):
    db_item = KPIChecklist(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"status": "success", "id": db_item.id, "message": "Thêm công việc checklist thành công"}

@router.put("/checklists/{id}", response_model=dict)
def update_checklist(id: int, item: KPIChecklistBase, db: Session = Depends(get_db)):
    db_item = db.query(KPIChecklist).filter(KPIChecklist.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục checklist")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    return {"status": "success", "message": "Cập nhật công việc checklist thành công"}

@router.delete("/checklists/{id}", response_model=dict)
def delete_checklist(id: int, db: Session = Depends(get_db)):
    db_item = db.query(KPIChecklist).filter(KPIChecklist.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục checklist")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Xóa công việc checklist thành công"}

@router.post("/upload-file", response_model=dict)
async def upload_kpi_file(file: UploadFile = File(...)):
    static_uploads = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "uploads"))
    os.makedirs(static_uploads, exist_ok=True)
    
    file_location = os.path.join(static_uploads, file.filename)
    with open(file_location, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {
        "status": "success",
        "fileName": file.filename,
        "fileUrl": f"/uploads/{file.filename}"
    }

# 3. Danh sách KPI CRUD
@router.get("/employee-items", response_model=List[dict])
def get_employee_kpis(employee_id: str, db: Session = Depends(get_db)):
    items = db.query(KPIEmployeeItem).filter(KPIEmployeeItem.employee_id == employee_id).order_by(KPIEmployeeItem.id.desc()).all()
    return [
        {
            "id": idx.id,
            "employee_id": idx.employee_id,
            "kpi_code": idx.kpi_code,
            "content": idx.content,
            "score": idx.score,
            "calc_method": idx.calc_method,
            "target": idx.target,
            "actual": idx.actual,
            "status": idx.status,
            "icon": idx.icon
        }
        for idx in items
    ]

@router.post("/employee-items", response_model=dict)
def create_employee_kpi(item: KPIEmployeeItemCreate, db: Session = Depends(get_db)):
    db_item = KPIEmployeeItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"status": "success", "id": db_item.id, "message": "Thêm chỉ số KPI thành công"}

@router.put("/employee-items/{id}", response_model=dict)
def update_employee_kpi(id: int, item: KPIEmployeeItemBase, db: Session = Depends(get_db)):
    db_item = db.query(KPIEmployeeItem).filter(KPIEmployeeItem.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy chỉ số KPI")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    return {"status": "success", "message": "Cập nhật chỉ số KPI thành công"}

@router.delete("/employee-items/{id}", response_model=dict)
def delete_employee_kpi(id: int, db: Session = Depends(get_db)):
    db_item = db.query(KPIEmployeeItem).filter(KPIEmployeeItem.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy chỉ số KPI")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Xóa chỉ số KPI thành công"}

# 4. Quy tắc cộng trừ điểm (Violations) CRUD
@router.get("/violations", response_model=List[dict])
def get_violations(employee_id: str, db: Session = Depends(get_db)):
    # 1. Lấy dữ liệu vi phạm thủ công từ admin
    items = db.query(KPIViolation).filter(KPIViolation.employee_id == employee_id).order_by(KPIViolation.id.desc()).all()
    res = [
        {
            "id": str(idx.id),
            "employee_id": idx.employee_id,
            "violation_code": idx.violation_code,
            "content": idx.content,
            "calculation": idx.calculation,
            "violation_time": idx.violation_time,
            "performer": idx.performer,
            "note": idx.note or "",
            "impact": "-",
            "evidence_images": "[]"
        }
        for idx in items
    ]

    # 2. Lấy dữ liệu đồng bộ từ báo cáo QC Mobile (award_disciplines)
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if emp:
        name_queries = []
        if emp.full_name:
            name_queries.append(emp.full_name)
        
        if name_queries:
            qc_records = db.query(AwardDiscipline).filter(AwardDiscipline.staff_name.in_(name_queries)).all()
            for r in qc_records:
                calc = f"-{r.points}" if r.points > 0 else f"{r.points}"
                code = f"QC{r.id:02d}"
                res.append({
                    "id": f"qc-{r.id}",
                    "employee_id": employee_id,
                    "violation_code": code,
                    "content": r.issue,
                    "calculation": calc,
                    "violation_time": r.date,
                    "performer": "QC Mobile App",
                    "note": r.note or "",
                    "impact": r.impact or "Thấp",
                    "evidence_images": r.evidence_images or "[]"
                })
    return res

@router.post("/violations", response_model=dict)
def create_violation(item: KPIViolationCreate, db: Session = Depends(get_db)):
    db_item = KPIViolation(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"status": "success", "id": db_item.id, "message": "Thêm lỗi vi phạm/cộng điểm thành công"}

@router.put("/violations/{id}", response_model=dict)
def update_violation(id: int, item: KPIViolationBase, db: Session = Depends(get_db)):
    db_item = db.query(KPIViolation).filter(KPIViolation.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy lỗi vi phạm/cộng điểm")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    return {"status": "success", "message": "Cập nhật lỗi vi phạm/cộng điểm thành công"}

@router.delete("/violations/{id}", response_model=dict)
def delete_violation(id: int, db: Session = Depends(get_db)):
    db_item = db.query(KPIViolation).filter(KPIViolation.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy lỗi vi phạm/cộng điểm")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Xóa lỗi vi phạm/cộng điểm thành công"}

# 5. Phản hồi và nhận xét CRUD
@router.get("/feedbacks", response_model=List[dict])
def get_feedbacks(employee_id: str, db: Session = Depends(get_db)):
    items = db.query(KPIFeedback).filter(KPIFeedback.employee_id == employee_id).order_by(KPIFeedback.id.desc()).all()
    return [
        {
            "id": idx.id,
            "employee_id": idx.employee_id,
            "feedback_code": idx.feedback_code,
            "type": idx.type,
            "content": idx.content,
            "feedback_time": idx.feedback_time,
            "reviewer": idx.reviewer
        }
        for idx in items
    ]

@router.post("/feedbacks", response_model=dict)
def create_feedback(item: KPIFeedbackCreate, db: Session = Depends(get_db)):
    db_item = KPIFeedback(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"status": "success", "id": db_item.id, "message": "Thêm nhận xét phản hồi thành công"}

@router.put("/feedbacks/{id}", response_model=dict)
def update_feedback(id: int, item: KPIFeedbackBase, db: Session = Depends(get_db)):
    db_item = db.query(KPIFeedback).filter(KPIFeedback.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhận xét phản hồi")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    return {"status": "success", "message": "Cập nhật nhận xét phản hồi thành công"}

@router.delete("/feedbacks/{id}", response_model=dict)
def delete_feedback(id: int, db: Session = Depends(get_db)):
    db_item = db.query(KPIFeedback).filter(KPIFeedback.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhận xét phản hồi")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Xóa nhận xét phản hồi thành công"}

# 6. Quy tắc cộng trừ điểm chung (Global Point Rules) CRUD
@router.get("/point-rules", response_model=List[dict])
def get_point_rules(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách luật chung. Nếu trống, tự động seed 5 luật mẫu.
    """
    items = db.query(KPIPointRule).order_by(KPIPointRule.id.desc()).all()
    if not items:
        default_rules = [
            ("RL01", "Thiếu tem mẫu", -50, "Cao", "Thiếu tem trên sản phẩm hoặc thùng carton"),
            ("RL02", "Sai kích thước", -30, "Cao", "Kích thước lệch ngoài dung sai bản vẽ"),
            ("RL03", "Bề mặt trầy xước", -20, "Trung bình", "Trầy xước bề mặt ngoại quan"),
            ("RL04", "Đi muộn", -10, "Thấp", "Vi phạm thời gian làm việc ca"),
            ("RL05", "Đóng góp sáng kiến cải tiến", 50, "Trung bình", "Cải tiến quy trình tăng năng suất")
        ]
        for code, content, pts, imp, note in default_rules:
            db.add(KPIPointRule(
                rule_code=code,
                content=content,
                points=pts,
                impact=imp,
                note=note
            ))
        db.commit()
        items = db.query(KPIPointRule).order_by(KPIPointRule.id.desc()).all()
    
    return [
        {
            "id": r.id,
            "rule_code": r.rule_code,
            "content": r.content,
            "points": r.points,
            "impact": r.impact,
            "note": r.note or ""
        }
        for r in items
    ]

@router.post("/point-rules", response_model=dict)
def create_point_rule(item: KPIPointRuleBase, db: Session = Depends(get_db)):
    db_item = KPIPointRule(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"status": "success", "id": db_item.id, "message": "Thêm điều luật thành công"}

@router.put("/point-rules/{id}", response_model=dict)
def update_point_rule(id: int, item: KPIPointRuleBase, db: Session = Depends(get_db)):
    db_item = db.query(KPIPointRule).filter(KPIPointRule.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy điều luật")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    return {"status": "success", "message": "Cập nhật điều luật thành công"}

@router.delete("/point-rules/{id}", response_model=dict)
def delete_point_rule(id: int, db: Session = Depends(get_db)):
    db_item = db.query(KPIPointRule).filter(KPIPointRule.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy điều luật")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Xóa điều luật thành công"}

# 7. Danh mục Checklist mẫu chung (Checklist Pool) CRUD
@router.get("/checklist-pool", response_model=List[dict])
def get_checklist_pool(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách checklist mẫu chung. Nếu trống, tự động seed các giá trị mặc định.
    """
    items = db.query(KPIChecklistPool).order_by(KPIChecklistPool.id.desc()).all()
    if not items:
        default_items = [
            ("CV01", "Báo cáo OQA", "Hàng ngày"),
            ("CV02", "Vệ sinh 5S", "Hàng ngày"),
            ("CV03", "Báo cáo năng suất thiết bị OEE", "Hàng tuần"),
            ("CV04", "Họp giao ban", "Hàng ngày"),
            ("CV05", "Kiểm tra chéo công việc", "Hàng tuần"),
            ("CV06", "Thử nghiệm phá hủy mẫu", "Hằng tháng"),
            ("CV07", "Báo cáo hiệu suất máy", "Khi phát sinh"),
            ("CV08", "Họp team tuần", "Hàng tuần"),
            ("CV09", "Cập nhật CAPA", "Hằng tháng")
        ]
        for code, content, freq in default_items:
            db.add(KPIChecklistPool(
                task_code=code,
                content=content,
                frequency=freq
            ))
        db.commit()
        items = db.query(KPIChecklistPool).order_by(KPIChecklistPool.id.desc()).all()
    
    return [
        {
            "id": r.id,
            "task_code": r.task_code,
            "content": r.content,
            "frequency": r.frequency
        }
        for r in items
    ]

@router.post("/checklist-pool", response_model=dict)
def create_checklist_pool_item(item: KPIChecklistPoolBase, db: Session = Depends(get_db)):
    db_item = KPIChecklistPool(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"status": "success", "id": db_item.id, "message": "Thêm mẫu checklist thành công"}

@router.put("/checklist-pool/{id}", response_model=dict)
def update_checklist_pool_item(id: int, item: KPIChecklistPoolBase, db: Session = Depends(get_db)):
    db_item = db.query(KPIChecklistPool).filter(KPIChecklistPool.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu checklist")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    return {"status": "success", "message": "Cập nhật mẫu checklist thành công"}

@router.delete("/checklist-pool/{id}", response_model=dict)
def delete_checklist_pool_item(id: int, db: Session = Depends(get_db)):
    db_item = db.query(KPIChecklistPool).filter(KPIChecklistPool.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu checklist")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Xóa mẫu checklist thành công"}

# 8. Danh mục KPI mẫu chung (KPI Pool) CRUD
@router.get("/kpi-pool", response_model=List[dict])
def get_kpi_pool(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách KPI mẫu chung. Nếu trống, tự động seed các giá trị mặc định.
    """
    items = db.query(KPIItemPool).order_by(KPIItemPool.id.asc()).all()
    if not items:
        default_items = [
            ("KPI01", "Tỷ lệ lỗi lọt lưới do vật tư đầu vào", "(Số lô lỗi phát hiện) / (Tổng số lô lỗi thực tế dựa trên Phiếu NCR) * 100", "> 98%", "A"),
            ("KPI02", "Tỷ lệ hoàn thành CAPA đúng hạn", "(Số phiếu quá hạn 5 ngày) / (Tổng số phiếu nhận) * 100", "> 98%", "B"),
            ("KPI03", "Số lần sai sót nghiệp vụ (Báo cáo, quy trình...)", "Mỗi một báo cáo ghi nhận đều -2%", "> 96%", "C"),
            ("KPI04", "Tỷ lệ ngày công làm việc", "(Số ngày đi làm) / (Tổng số ngày cần đi làm) * 100", "> 97%", "D"),
            ("KPI05", "Tỷ lệ tham gia đào tạo", "(Số lần tham gia đào tạo) / (Tổng số lần cần tham gia đào tạo) * 100", "100%", "E"),
            ("KPI06", "Tỷ lệ tuân thủ tuần tra mẫu (30 phút/lần)", "Mỗi một báo cáo sai sót được phòng QA ghi nhận đều -2%", ">= 98%", "C"),
            ("KPI07", "Tỷ lệ lọt pass hàng thành công (Pallet)", "(1 - (Tổng số pallet bị trả về / Tổng số pallet được bàn giao)) * 100", "100%", "A"),
            ("KPI08", "Tỷ lệ tuân thủ tuần tra mẫu đầu tiên", "Mỗi một báo cáo ghi nhận đều -2%", ">= 98%", "C"),
            ("KPI09", "Tỷ lệ pass hàng thành công (Sản phẩm)", "(1 - (Tổng số sản phẩm bị trả về / Tổng số sản phẩm được bàn giao)) * 100", "> 95%", "A"),
            ("KPI10", "Tỷ lệ hàng đạt final", "(Tổng cont final đạt + cont Final fail (được xử lý trong 24h)) / Tổng số cont được final * 100", "100%", "A"),
            ("KPI11", "Tỷ lệ khiếu nại từ khách hàng", "(Tổng tiền phạt) / (Tổng doanh thu) * 100", "< 98%", "F"),
            ("KPI12", "Tỷ lệ pass hàng thành công (Mục tiêu tối đa)", "(1 - (Tổng số sản phẩm bị trả về / Tổng số sản phẩm được bàn giao)) * 100", "100%", "A"),
            ("KPI13", "Tỷ lệ tuân thủ tuần tra mẫu (Mục tiêu tối đa)", "Mỗi một báo cáo ghi nhận đều -2%", "100%", "C")
        ]
        for code, content, calc, target, cat in default_items:
            db.add(KPIItemPool(
                kpi_code=code,
                content=content,
                calc_method=calc,
                target=target,
                category=cat
            ))
        db.commit()
        items = db.query(KPIItemPool).order_by(KPIItemPool.id.asc()).all()
    
    return [
        {
            "id": r.id,
            "kpi_code": r.kpi_code,
            "content": r.content,
            "calc_method": r.calc_method,
            "target": r.target,
            "category": r.category or "D"
        }
        for r in items
    ]


@router.post("/kpi-pool", response_model=dict)
def create_kpi_pool_item(item: KPIItemPoolBase, db: Session = Depends(get_db)):
    db_item = KPIItemPool(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"status": "success", "id": db_item.id, "message": "Thêm mẫu KPI thành công"}

@router.put("/kpi-pool/{id}", response_model=dict)
def update_kpi_pool_item(id: int, item: KPIItemPoolBase, db: Session = Depends(get_db)):
    db_item = db.query(KPIItemPool).filter(KPIItemPool.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu KPI")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    return {"status": "success", "message": "Cập nhật mẫu KPI thành công"}

@router.delete("/kpi-pool/{id}", response_model=dict)
def delete_kpi_pool_item(id: int, db: Session = Depends(get_db)):
    db_item = db.query(KPIItemPool).filter(KPIItemPool.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu KPI")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Xóa mẫu KPI thành công"}

@router.get("/export-data", response_model=dict)
def get_export_data(db: Session = Depends(get_db)):
    employees = db.query(Employee).all()
    emp_list = []
    
    checklists = db.query(KPIChecklist).all()
    kpis = db.query(KPIEmployeeItem).all()
    violations = db.query(KPIViolation).all()
    qc_records = db.query(AwardDiscipline).all()

    for e in employees:
        if not e.employee_id:
            continue
            
        dept_str = e.department or "Hành chính"
        pos_str = e.position or "Nhân Viên"

        emp_checks = [c for c in checklists if c.employee_id == e.employee_id]
        emp_kpis = [k for k in kpis if k.employee_id == e.employee_id]
        emp_viols = [v for v in violations if v.employee_id == e.employee_id]
        
        name_queries = []
        if e.full_name:
            name_queries.append(e.full_name)
        emp_qc = [r for r in qc_records if r.staff_name in name_queries] if name_queries else []

        completed_checklist = sum(1 for c in emp_checks if c.status_today == 'Đã hoàn thành')
        total_checklist = len(emp_checks)
        checklist_progress = f"{completed_checklist}/{total_checklist}" if total_checklist > 0 else "0/0"

        achieved_kpis = sum(1 for k in emp_kpis if k.status == 'Đạt KPI')
        total_kpis = len(emp_kpis)
        kpi_progress = f"{achieved_kpis}/{total_kpis}" if total_kpis > 0 else "0/0"
        
        kpi_pct = 0.0
        if total_kpis > 0:
            kpi_pct = (achieved_kpis / total_kpis) * 100.0
            
        points_manual = 0
        for v in emp_viols:
            try:
                points_manual += int(v.calculation)
            except:
                pass
        points_qc = sum(-r.points for r in emp_qc)
        total_violations_count = len(emp_viols) + len(emp_qc)
        total_points_change = points_manual + points_qc

        rating = "Trung bình"
        if kpi_pct >= 90:
            rating = "Xuất sắc"
        elif kpi_pct >= 75:
            rating = "Khá"
        elif kpi_pct >= 50:
            rating = "Trung bình"
        else:
            rating = "Yếu"

        emp_list.append({
            "employee_id": e.employee_id,
            "full_name": e.full_name or e.username,
            "department": dept_str,
            "position": pos_str,
            "kpi_performance": f"{kpi_pct:.1f}% ({kpi_progress})",
            "checklist_progress": checklist_progress,
            "rating": rating,
            "violations_count": total_violations_count,
            "points_change": f"{total_points_change:+}đ"
        })

    check_list = []
    for c in checklists:
        emp = next((e for e in employees if e.employee_id == c.employee_id), None)
        emp_name = (emp.full_name or emp.username) if emp else "-"
        check_list.append({
            "employee_id": c.employee_id,
            "full_name": emp_name,
            "task_code": c.task_code,
            "content": c.content,
            "frequency": c.frequency,
            "status_today": c.status_today,
            "perform_count": c.perform_count,
            "last_performed": c.last_performed or "-",
            "result": c.result or "-"
        })

    kpi_list = []
    for k in kpis:
        emp = next((e for e in employees if e.employee_id == k.employee_id), None)
        emp_name = (emp.full_name or emp.username) if emp else "-"
        kpi_list.append({
            "employee_id": k.employee_id,
            "full_name": emp_name,
            "kpi_code": k.kpi_code,
            "content": k.content,
            "score": k.score,
            "calc_method": k.calc_method,
            "target": k.target,
            "actual": k.actual or "-",
            "status": k.status or "Chưa đánh giá"
        })

    viol_list = []
    for v in violations:
        emp = next((e for e in employees if e.employee_id == v.employee_id), None)
        emp_name = (emp.full_name or emp.username) if emp else "-"
        viol_list.append({
            "employee_id": v.employee_id,
            "full_name": emp_name,
            "violation_code": v.violation_code,
            "content": v.content,
            "impact": "-",
            "calculation": v.calculation,
            "violation_time": v.violation_time,
            "performer": v.performer,
            "note": v.note or "-"
        })

    for e in employees:
        if not e.employee_id:
            continue
        name_queries = []
        if e.full_name:
            name_queries.append(e.full_name)
        if e.username:
            name_queries.append(e.username)
        
        if name_queries:
            emp_qc = [r for r in qc_records if r.staff_name in name_queries]
            for r in emp_qc:
                calc = f"-{r.points}" if r.points > 0 else f"{r.points}"
                code = f"QC{r.id:02d}"
                viol_list.append({
                    "employee_id": e.employee_id,
                    "full_name": e.full_name or e.username,
                    "violation_code": code,
                    "content": r.issue,
                    "impact": r.impact or "Thấp",
                    "calculation": calc,
                    "violation_time": r.date,
                    "performer": "QC Mobile App",
                    "note": r.note or "-"
                })

    return {
        "employees": emp_list,
        "checklists": check_list,
        "kpis": kpi_list,
        "violations": viol_list
    }

# 9. Kế hoạch đào tạo CRUD (/training-plans)
@router.get("/training-plans", response_model=List[dict])
def get_training_plans(db: Session = Depends(get_db)):
    items = db.query(KPITrainingPlan).order_by(KPITrainingPlan.id.desc()).all()
    return [
        {
            "id": r.id,
            "code": r.code,
            "name": r.name,
            "target": r.target,
            "time": r.time,
            "teacher": r.teacher,
            "file_name": r.file_name or "",
            "file_url": r.file_url or "",
            "status": r.status or "Sắp diễn ra"
        }
        for r in items
    ]

@router.post("/training-plans", response_model=dict)
def create_training_plan(item: KPITrainingPlanBase, db: Session = Depends(get_db)):
    db_item = KPITrainingPlan(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"status": "success", "id": db_item.id, "message": "Thêm kế hoạch đào tạo thành công"}

@router.put("/training-plans/{id}", response_model=dict)
def update_training_plan(id: int, item: KPITrainingPlanBase, db: Session = Depends(get_db)):
    db_item = db.query(KPITrainingPlan).filter(KPITrainingPlan.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch đào tạo")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    return {"status": "success", "message": "Cập nhật kế hoạch đào tạo thành công"}

@router.delete("/training-plans/{id}", response_model=dict)
def delete_training_plan(id: int, db: Session = Depends(get_db)):
    db_item = db.query(KPITrainingPlan).filter(KPITrainingPlan.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch đào tạo")
    db.delete(db_item)
    db.commit()
    return {"status": "success", "message": "Xóa kế hoạch đào tạo thành công"}


def filter_inspections_by_kpi_code(kpi_code: str, inspections: list) -> list:
    if not kpi_code or not inspections:
        return inspections
    
    code = kpi_code.upper().strip()
    res = []
    
    for i in inspections:
        stage = str(getattr(i, 'stage', '') or '').lower()
        itype = str(getattr(i, 'inspection_type', '') or '').lower()
        cont = str(getattr(i, 'cont_name', '') or '').lower()
        pallet = str(getattr(i, 'pallet_code', '') or '').lower()

        if code == 'KPI01': # IQC Vật tư đầu vào
            if 'đầu vào' in stage or 'nhập kho' in stage or 'iqc' in itype or 'vật tư' in stage:
                res.append(i)
        elif code in ['KPI06', 'KPI13']: # Patrol Tuần tra
            if 'patrol' in itype or 'tuần tra' in stage or 'tuần tra' in itype:
                res.append(i)
        elif code == 'KPI07': # Pallet bàn giao kho
            if 'pallet' in stage or 'pallet' in itype or (pallet and pallet.startswith('pl')):
                res.append(i)
        elif code == 'KPI08': # First Article Mẫu đầu tiên
            if itype == 'first_sample' or 'mẫu đầu' in stage or 'first' in stage:
                res.append(i)
        elif code in ['KPI09', 'KPI12']: # PQC Công đoạn Sản phẩm
            if any(s in stage for s in ['định hình', 'tạo phôi', 'lắp ráp', 'sơn', 'phôi', 'pqc', 'công đoạn']) or itype == 'first_sample':
                res.append(i)
        elif code == 'KPI10': # OQC Cont Final
            if itype == 'final' or bool(cont) or 'final' in stage or 'oqc' in stage or 'xuất hàng' in stage:
                res.append(i)
        else:
            res.append(i)

    return res


def calculate_employee_kpi_score(db: Session, employee_id: str, month: int, year: int):
    # 1. Fetch employee details for name matching
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    emp_name = emp.full_name if emp else ""

    # 2. Fetch employee KPI items
    raw_kpi_items = db.query(KPIEmployeeItem).filter(KPIEmployeeItem.employee_id == employee_id).all()

    # If no KPI items assigned yet, fetch from global pool KPIItemPool
    if not raw_kpi_items:
        pool_items = db.query(KPIItemPool).order_by(KPIItemPool.id.asc()).all()
        kpi_items = []
        for p in pool_items:
            kpi_items.append(KPIEmployeeItem(
                employee_id=employee_id,
                kpi_code=p.kpi_code,
                content=p.content,
                score=20,
                calc_method=p.calc_method,
                target=p.target,
                actual=p.target,
                status="Đang theo dõi",
                category=p.category or "D"
            ))
    else:
        # Gom/Lọc trùng tự động các mục có trùng tên nội dung
        seen_keys = set()
        kpi_items = []
        for item in raw_kpi_items:
            key = (item.content or '').strip().lower()
            if key not in seen_keys:
                seen_keys.add(key)
                kpi_items.append(item)

    processed_details = []
    total_weighted_earned = 0.0
    total_weight = 0.0

    # Danh sách giá trị mặc định/seed cần bỏ qua (không phải dữ liệu thực tế)
    DEFAULT_PLACEHOLDERS = {'95%', '95.0%', '97%', '97.0%', '98%', '98.0%', '100%'}

    for item in kpi_items:
        cat = getattr(item, 'category', None) or "D"
        raw_actual = (item.actual or '').strip()
        weight = item.score or 20

        calc_actual = raw_actual
        earned_percentage = 100.0

        if cat == 'A':
            try:
                from modules.inspection.models.input_inspection import InputInspection
                query = db.query(InputInspection)
                if emp_name:
                    query = query.filter(InputInspection.inspector_name.ilike(f"%{emp_name}%"))
                inspections = query.all()
                month_filtered = [i for i in inspections if getattr(i, 'inspected_at', None) and i.inspected_at.month == month and i.inspected_at.year == year]

                # Lọc riêng theo đúng loại công đoạn và mã KPI để không nhảy trùng số liệu
                filtered = filter_inspections_by_kpi_code(item.kpi_code, month_filtered)

                if filtered:
                    ticket_rates = []
                    for i in filtered:
                        sample = float(getattr(i, 'sample_qty', None) or getattr(i, 'required_qty', None) or 0)
                        err = float(getattr(i, 'error_qty', None) or 0)
                        
                        if sample > 0:
                            rate = max(0.0, min(100.0, ((sample - err) / sample) * 100.0))
                        else:
                            res_str = str(getattr(i, 'result', None) or getattr(i, 'conclusion', None) or 'PASS').upper()
                            rate = 100.0 if res_str in ['PASS', 'ĐẠT', 'SUCCESS', 'OK'] else 0.0
                        
                        ticket_rates.append(rate)

                    calc_rate = round(sum(ticket_rates) / len(ticket_rates), 1)
                    calc_actual = f"{calc_rate:.1f}%"
                    earned_percentage = calc_rate
                else:
                    earned_percentage = 100.0
                    calc_actual = "Chưa có dữ liệu"
            except Exception:
                earned_percentage = 100.0
                calc_actual = "Chưa có dữ liệu"

        elif cat == 'B':
            try:
                from modules.capa.models.capa import CAPA
                capas = db.query(CAPA).all()
                if emp_name:
                    capas = [c for c in capas if emp_name.lower() in (c.handler_name or '').lower() or emp_name.lower() in (c.creator_name or '').lower()]
                
                filtered_capas = [c for c in capas if getattr(c, 'created_at', None) and c.created_at.month == month and c.created_at.year == year]
                if filtered_capas:
                    overdue = sum(1 for c in filtered_capas if 'quá hạn' in (c.ticket_status or '').lower())
                    rate = round(((len(filtered_capas) - overdue) / len(filtered_capas)) * 100, 1)
                    calc_actual = f"{rate:.1f}%"
                    earned_percentage = rate
                else:
                    earned_percentage = 100.0
                    calc_actual = "Chưa có dữ liệu"
            except Exception:
                earned_percentage = 100.0
                calc_actual = "Chưa có dữ liệu"

        elif cat == 'C':
            try:
                v_query = db.query(AwardDiscipline)
                if employee_id:
                    v_query = v_query.filter(AwardDiscipline.employee_id == employee_id)
                violations = v_query.all()
                filtered_v = [v for v in violations if getattr(v, 'created_at', None) and v.created_at.month == month and v.created_at.year == year]
                if filtered_v:
                    v_count = len(filtered_v)
                    calc_rate = max(0.0, 100.0 - (v_count * 2.0))
                    calc_actual = f"{calc_rate:.1f}%"
                    earned_percentage = calc_rate
                else:
                    # Kiểm tra xem nhân sự có hoạt động kiểm tra trong tháng không
                    from modules.inspection.models.input_inspection import InputInspection
                    emp_insps = db.query(InputInspection).filter(InputInspection.inspector_name.ilike(f"%{emp_name}%")).all() if emp_name else []
                    m_insps = [i for i in emp_insps if i.inspected_at and i.inspected_at.month == month and i.inspected_at.year == year]
                    if m_insps:
                        earned_percentage = 100.0
                        calc_actual = "100.0%"
                    else:
                        earned_percentage = 100.0
                        calc_actual = "Chưa có dữ liệu"
            except Exception:
                earned_percentage = 100.0
                calc_actual = "Chưa có dữ liệu"

        elif cat == 'D':
            try:
                from modules.inspection.models.input_inspection import InputInspection
                query = db.query(InputInspection)
                if emp_name:
                    query = query.filter(InputInspection.inspector_name.ilike(f"%{emp_name}%"))
                inspections = query.all()
                filtered = [i for i in inspections if i.inspected_at and i.inspected_at.month == month and i.inspected_at.year == year]
                if filtered:
                    distinct_days = len(set(i.inspected_at.date() for i in filtered if i.inspected_at))
                    attendance_rate = min(100.0, round((distinct_days / 26.0) * 100, 1))
                    calc_actual = f"{attendance_rate:.1f}%"
                    earned_percentage = attendance_rate
                else:
                    earned_percentage = 100.0
                    calc_actual = "Chưa có dữ liệu"
            except Exception:
                earned_percentage = 100.0
                calc_actual = "Chưa có dữ liệu"

        elif cat == 'E':
            try:
                t_plans = db.query(KPITrainingPlan).all()
                filtered_t = [t for t in t_plans if getattr(t, 'created_at', None) and t.created_at.month == month and t.created_at.year == year]
                if filtered_t:
                    completed = sum(1 for t in filtered_t if (t.status or '').lower() in ['hoàn thành', 'đã diễn ra'])
                    rate = round((completed / len(filtered_t)) * 100, 1)
                    calc_actual = f"{rate:.1f}%"
                    earned_percentage = rate
                else:
                    earned_percentage = 100.0
                    calc_actual = "Chưa có dữ liệu"
            except Exception:
                earned_percentage = 100.0
                calc_actual = "Chưa có dữ liệu"

        elif cat == 'F':
            try:
                from modules.claim.models.claim_models import CustomerClaim
                claims = db.query(CustomerClaim).all()
                filtered_c = [c for c in claims if getattr(c, 'created_at', None) and c.created_at.month == month and c.created_at.year == year]
                if filtered_c:
                    earned_percentage = max(0.0, 100.0 - (len(filtered_c) * 5.0))
                    calc_actual = f"{earned_percentage:.1f}% ({len(filtered_c)} khiếu nại)"
                else:
                    earned_percentage = 100.0
                    calc_actual = "Chưa có dữ liệu"
            except Exception:
                earned_percentage = 100.0
                calc_actual = "Chưa có dữ liệu"

        total_weighted_earned += (earned_percentage * weight)
        total_weight += weight

        processed_details.append({
            "id": getattr(item, 'id', 0),
            "kpi_code": item.kpi_code,
            "content": item.content,
            "score": weight,
            "calc_method": item.calc_method,
            "target": item.target,
            "actual": calc_actual,
            "earned_percentage": round(earned_percentage, 1),
            "category": cat
        })

    kpi_score = round(total_weighted_earned / total_weight, 1) if total_weight > 0 else 95.0

    violation_score = 0.0
    try:
        adv_list = db.query(AwardDiscipline).all()
        if employee_id or emp_name:
            adv_list = [v for v in adv_list if (employee_id and v.employee_id == employee_id) or (emp_name and emp_name.lower() in (v.staff_name or '').lower())]
        violation_score = float(sum(abs(v.points or 0) for v in adv_list))
    except Exception:
        violation_score = 0.0

    manager_score = 0.0
    try:
        from modules.kpi.models.staff_evaluation import StaffEvaluation
        evals = db.query(StaffEvaluation).filter(StaffEvaluation.employee_id == employee_id).all()
        if evals:
            manager_score = float(sum(e.actual_score or 0 for e in evals if e.actual_score))
    except Exception:
        manager_score = 0.0

    total_score = max(0.0, round(kpi_score + manager_score - violation_score, 1))

    rating = "A"
    if total_score >= 105:
        rating = "A+"
    elif total_score >= 90:
        rating = "A"
    elif total_score >= 75:
        rating = "B"
    elif total_score >= 60:
        rating = "C"
    else:
        rating = "D"

    import json
    monthly_record = db.query(KPIMonthlyScore).filter(
        KPIMonthlyScore.employee_id == employee_id,
        KPIMonthlyScore.month == month,
        KPIMonthlyScore.year == year
    ).first()

    if not monthly_record:
        monthly_record = KPIMonthlyScore(
            employee_id=employee_id,
            month=month,
            year=year,
            kpi_score=kpi_score,
            checklist_score=100.0,
            violation_score=violation_score,
            manager_score=manager_score,
            total_score=total_score,
            rating=rating,
            details_json=json.dumps(processed_details, ensure_ascii=False)
        )
        db.add(monthly_record)
    else:
        monthly_record.kpi_score = kpi_score
        monthly_record.violation_score = violation_score
        monthly_record.manager_score = manager_score
        monthly_record.total_score = total_score
        monthly_record.rating = rating
        monthly_record.details_json = json.dumps(processed_details, ensure_ascii=False)

    db.commit()
    db.refresh(monthly_record)

    return {
        "id": monthly_record.id,
        "employee_id": employee_id,
        "month": month,
        "year": year,
        "kpi_score": monthly_record.kpi_score,
        "checklist_score": monthly_record.checklist_score,
        "violation_score": monthly_record.violation_score,
        "manager_score": monthly_record.manager_score,
        "total_score": monthly_record.total_score,
        "rating": monthly_record.rating,
        "details": processed_details
    }


@router.get("/calculate-score", response_model=dict)
def get_calculated_kpi_score(
    employee_id: str = Query(...),
    month: int = Query(9),
    year: int = Query(2026),
    db: Session = Depends(get_db)
):
    """
    [GET] Tính toán lại điểm số KPI realtime cho nhân sự dựa trên dữ liệu thực tế.
    """
    return calculate_employee_kpi_score(db, employee_id, month, year)


@router.get("/monthly-score", response_model=dict)
def get_monthly_kpi_score(
    employee_id: str = Query(...),
    month: int = Query(9),
    year: int = Query(2026),
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy điểm số KPI đã lưu theo tháng của nhân viên.
    """
    record = db.query(KPIMonthlyScore).filter(
        KPIMonthlyScore.employee_id == employee_id,
        KPIMonthlyScore.month == month,
        KPIMonthlyScore.year == year
    ).first()

    if not record:
        return calculate_employee_kpi_score(db, employee_id, month, year)

    import json
    details = []
    if record.details_json:
        try:
            details = json.loads(record.details_json)
        except Exception:
            details = []

    return {
        "id": record.id,
        "employee_id": record.employee_id,
        "month": record.month,
        "year": record.year,
        "kpi_score": record.kpi_score,
        "checklist_score": record.checklist_score,
        "violation_score": record.violation_score,
        "manager_score": record.manager_score,
        "total_score": record.total_score,
        "rating": record.rating,
        "details": details
    }


@router.put("/employee-items/{id}/actual", response_model=dict)
def update_kpi_employee_item_actual(id: int, payload: KPIActualUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật giá trị thực tế (actual) cho 1 KPI item của nhân sự (dành cho KPI nhập thủ công) và ghi Audit Log.
    """
    item = db.query(KPIEmployeeItem).filter(KPIEmployeeItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục KPI")

    old_val = item.actual
    item.actual = payload.actual

    # Record Audit Log
    audit = KPIAuditLog(
        item_id=item.id,
        employee_id=item.employee_id,
        kpi_code=item.kpi_code or "KPI04",
        old_value=old_val,
        new_value=payload.actual,
        modified_by="Quản lý QC",
        reason="Cập nhật giá trị thực tế từ giao diện Web"
    )
    db.add(audit)

    db.commit()
    db.refresh(item)
    return {"status": "success", "id": item.id, "actual": item.actual, "message": "Cập nhật giá trị thực tế và ghi Audit Log thành công"}


@router.get("/score-evidence", response_model=dict)
def get_kpi_score_evidence(
    employee_id: str = Query(...),
    kpi_code: str = Query(...),
    month: int = Query(9),
    year: int = Query(2026),
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách các bản ghi dữ liệu gốc (Raw Evidence Records) chứng minh cho kết quả tính toán KPI.
    """
    emp_name = ""
    try:
        from modules.kpi.models.quality_employee import QualityEmployee
        emp = db.query(QualityEmployee).filter(QualityEmployee.employee_id == employee_id).first()
        if emp:
            emp_name = emp.full_name
    except Exception:
        pass

    if not emp_name:
        try:
            emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
            if emp:
                emp_name = emp.full_name
        except Exception:
            pass

    # Find KPI Item definition
    pool_item = db.query(KPIItemPool).filter(KPIItemPool.kpi_code == kpi_code).first()
    emp_item = db.query(KPIEmployeeItem).filter(
        KPIEmployeeItem.employee_id == employee_id,
        KPIEmployeeItem.kpi_code == kpi_code
    ).first()

    content = emp_item.content if emp_item else (pool_item.content if pool_item else kpi_code)
    target = emp_item.target if emp_item else (pool_item.target if pool_item else ">= 95%")
    category = emp_item.category if (emp_item and emp_item.category) else (pool_item.category if (pool_item and pool_item.category) else "D")
    calc_method = emp_item.calc_method if emp_item else (pool_item.calc_method if pool_item else "")

    records = []
    summary_text = ""

    def clean_img(raw):
        if not raw:
            return None
        s = str(raw).strip()
        if s in ['', '[]', '{}', 'null', 'undefined']:
            return None
        if s.startswith('['):
            try:
                import json
                p = json.loads(s)
                if isinstance(p, list):
                    c = [x for x in p if x and str(x).strip() not in ['', '[]', '{}', 'null']]
                    return c if c else None
            except Exception:
                pass
        return s

    # --- CATEGORY A: QC Inspections ---
    if category == 'A':
        try:
            from modules.inspection.models.input_inspection import InputInspection
            query = db.query(InputInspection)
            if emp_name:
                query = query.filter(InputInspection.inspector_name.ilike(f"%{emp_name}%"))
            all_inspections = query.all()
            month_filtered = [i for i in all_inspections if getattr(i, 'inspected_at', None) and i.inspected_at.month == month and i.inspected_at.year == year]
            filtered = filter_inspections_by_kpi_code(kpi_code, month_filtered)

            ticket_rates = []
            for i in filtered:
                sample = int(getattr(i, 'sample_qty', None) or getattr(i, 'required_qty', None) or 0)
                err = int(getattr(i, 'error_qty', None) or 0)
                res_str = str(getattr(i, 'result', None) or getattr(i, 'conclusion', None) or 'PASS').upper()
                is_pass = res_str in ['PASS', 'ĐẠT', 'SUCCESS', 'OK']

                if sample > 0:
                    t_rate = round(max(0.0, min(100.0, ((sample - err) / float(sample)) * 100.0)), 1)
                else:
                    t_rate = 100.0 if is_pass else 0.0

                ticket_rates.append(t_rate)

                title_val = getattr(i, 'part_name', None) or getattr(i, 'cont_name', None) or getattr(i, 'stage_name', None) or "Kiểm tra chất lượng lô hàng"
                note_val = getattr(i, 'note', None) or getattr(i, 'notes', None) or f"Mẫu kiểm: {sample}, Số lỗi: {err}"
                img_val = clean_img(getattr(i, 'images_json', None) or getattr(i, 'image_path_1', None) or getattr(i, 'image_path_2', None) or getattr(i, 'image_path_3', None))

                records.append({
                    "id": i.id,
                    "code": getattr(i, 'ticket_code', None) or f"DA-{i.id:04d}",
                    "title": title_val,
                    "date": i.inspected_at.strftime("%d/%m/%Y %H:%M") if getattr(i, 'inspected_at', None) else "01/09/2026",
                    "result": f"{t_rate:.1f}%",
                    "sample_qty": sample,
                    "error_qty": err,
                    "is_pass": is_pass,
                    "performer": getattr(i, 'inspector_name', None) or emp_name,
                    "note": note_val,
                    "images": img_val,
                    "nav_url": f"/admin/quality/reports?search={getattr(i, 'ticket_code', '') or ''}"
                })
            
            if filtered:
                avg_rate = round(sum(ticket_rates) / len(ticket_rates), 1) if ticket_rates else 100.0
                summary_text = f"Tỷ lệ % Đạt trung bình: {avg_rate}% ({len(filtered)} phiếu kiểm tra do {emp_name or 'nhân sự'} thực hiện)"
            else:
                summary_text = f"Nhân sự {emp_name or employee_id} chưa phát sinh phiếu kiểm tra QC nào trong Tháng {month}/{year}"
        except Exception as e:
            summary_text = f"Dữ liệu kiểm tra QC trực tuyến ({str(e)})"

    # --- CATEGORY B: CAPA ---
    elif category == 'B':
        try:
            from modules.capa.models.capa import CAPA
            capas = db.query(CAPA).all()
            if emp_name:
                capas = [c for c in capas if emp_name.lower() in (getattr(c, 'handler_name', '') or '').lower() or emp_name.lower() in (getattr(c, 'creator_name', '') or '').lower()]
            
            overdue_count = 0
            for c in capas:
                is_overdue = 'quá hạn' in (getattr(c, 'ticket_status', '') or '').lower()
                if is_overdue:
                    overdue_count += 1
                records.append({
                    "id": c.id,
                    "code": getattr(c, 'code', None) or getattr(c, 'ticket_code', None) or f"CAPA-{c.id:03d}",
                    "title": getattr(c, 'issue_description', None) or getattr(c, 'title', None) or getattr(c, 'content', None) or "Hành động khắc phục CAPA",
                    "date": c.created_at.strftime("%d/%m/%Y") if getattr(c, 'created_at', None) else "15/08/2026",
                    "result": "Quá hạn" if is_overdue else "Hoàn thành đúng hạn",
                    "performer": getattr(c, 'handler_name', None) or emp_name,
                    "note": f"Hạn chót: {getattr(c, 'due_date', None) or 'Theo dõi'}",
                    "images": clean_img(getattr(c, 'images', None) or getattr(c, 'evidence_image', None)),
                    "nav_url": f"/admin/capa?search={getattr(c, 'code', '') or ''}"
                })

            if capas:
                rate = round(((len(capas) - overdue_count) / len(capas)) * 100, 1)
                summary_text = f"Tỷ lệ đúng hạn: {rate}% ({len(capas) - overdue_count} / {len(capas)} phiếu CAPA do {emp_name} phụ trách)"
            else:
                summary_text = f"Không có phiếu CAPA nào cho {emp_name or employee_id} trong Tháng {month}/{year}"
        except Exception:
            summary_text = "Dữ liệu hành động khắc phục CAPA"

    # --- CATEGORY C: Patrol / Violation ---
    elif category == 'C':
        try:
            v_query = db.query(AwardDiscipline)
            if employee_id or emp_name:
                v_query = v_query.filter(AwardDiscipline.employee_id == employee_id)
            violations = v_query.all()
            
            for v in violations:
                raw_imgs = clean_img(getattr(v, 'evidence_images', None) or getattr(v, 'images', None) or getattr(v, 'image', None))
                records.append({
                    "id": v.id,
                    "code": f"VP-{v.id:03d}",
                    "title": getattr(v, 'rule_name', None) or getattr(v, 'issue', None) or getattr(v, 'description', None) or "Vi phạm quy trình tuần tra QC",
                    "date": getattr(v, 'violation_time', None) or getattr(v, 'date', None) or "25/08/2026",
                    "result": f"-{abs(getattr(v, 'points', 2) or 2)} điểm",
                    "performer": getattr(v, 'staff_name', None) or emp_name,
                    "note": f"Ghi nhận bởi: {getattr(v, 'reporter_name', None) or 'Quản lý'}",
                    "images": raw_imgs,
                    "nav_url": f"/admin/kpi/dashboard?tab=violations_list&search=VP-{v.id:03d}"
                })
            
            if violations:
                summary_text = f"Ghi nhận {len(violations)} lần vi phạm/sai sót đối với {emp_name or employee_id} (Mỗi lần -2%)"
            else:
                summary_text = f"Không phát sinh biên bản vi phạm/sai sót nào đối với {emp_name or employee_id} trong Tháng {month}/{year} (Đạt 100% tuân thủ)"
        except Exception:
            summary_text = "Dữ liệu vi phạm từ Mobile App"

    # --- CATEGORY D: Reports / Báo cáo tình hình ---
    elif category == 'D':
        try:
            from modules.inspection.models.input_inspection import InputInspection
            query = db.query(InputInspection)
            if emp_name:
                query = query.filter(InputInspection.inspector_name.ilike(f"%{emp_name}%"))
            all_inspections = query.all()
            filtered = [i for i in all_inspections if getattr(i, 'inspected_at', None) and i.inspected_at.month == month and i.inspected_at.year == year]

            for i in filtered:
                title_val = f"Báo cáo kiểm tra - {getattr(i, 'part_name', None) or getattr(i, 'cont_name', None) or 'Lô hàng'}"
                note_val = getattr(i, 'note', None) or getattr(i, 'notes', None) or "Báo cáo tình hình kiểm tra thực tế"
                img_val = clean_img(getattr(i, 'images_json', None) or getattr(i, 'image_path_1', None) or getattr(i, 'image_path_2', None) or getattr(i, 'image_path_3', None))

                records.append({
                    "id": i.id,
                    "code": getattr(i, 'ticket_code', None) or f"BC-{i.id:04d}",
                    "title": title_val,
                    "date": i.inspected_at.strftime("%d/%m/%Y %H:%M") if getattr(i, 'inspected_at', None) else "",
                    "result": str(getattr(i, 'result', None) or getattr(i, 'conclusion', None) or "Đã hoàn thành"),
                    "performer": getattr(i, 'inspector_name', None) or emp_name,
                    "note": note_val,
                    "images": img_val,
                    "nav_url": f"/admin/quality/reports?search={getattr(i, 'ticket_code', '') or ''}"
                })

            if filtered:
                summary_text = f"Tổng cộng {len(filtered)} báo cáo tình hình do {emp_name or employee_id} thực hiện trong Tháng {month}/{year}"
            else:
                summary_text = f"Chưa phát sinh báo cáo tình hình nào do {emp_name or employee_id} thực hiện trong Tháng {month}/{year}"
        except Exception:
            summary_text = "Dữ liệu báo cáo tình hình"

    # --- CATEGORY E: Training ---
    elif category == 'E':
        try:
            t_plans = db.query(KPITrainingPlan).all()
            filtered_t = [t for t in t_plans if getattr(t, 'created_at', None) and t.created_at.month == month and t.created_at.year == year]
            for t in filtered_t:
                records.append({
                    "id": t.id,
                    "code": getattr(t, 'code', None) or f"ĐT-{t.id:03d}",
                    "title": getattr(t, 'name', None) or "Kế hoạch đào tạo nghiệp vụ",
                    "date": getattr(t, 'time', None) or "Tháng 9/2026",
                    "result": getattr(t, 'status', None) or "Đã hoàn thành",
                    "performer": emp_name or getattr(t, 'teacher', 'Giảng viên'),
                    "note": f"Mục tiêu: {getattr(t, 'target', 'Tham gia đầy đủ')}",
                    "images": None,
                    "nav_url": "/admin/kpi/items"
                })
            if filtered_t:
                summary_text = f"Ghi nhận {len(filtered_t)} chương trình đào tạo trong Tháng {month}/{year}"
            else:
                summary_text = f"Chưa có chương trình đào tạo phân công cho {emp_name or employee_id} trong Tháng {month}/{year}"
        except Exception:
            summary_text = "Dữ liệu kế hoạch đào tạo"

    # --- CATEGORY F: Customer Claims ---
    elif category == 'F':
        try:
            from modules.claim.models.claim_models import CustomerClaim
            claims = db.query(CustomerClaim).all()
            filtered_c = [c for c in claims if getattr(c, 'created_at', None) and c.created_at.month == month and c.created_at.year == year]
            for c in filtered_c:
                records.append({
                    "id": c.id,
                    "code": getattr(c, 'claim_code', None) or f"CLM-{c.id:03d}",
                    "title": f"Khiếu nại từ {getattr(c, 'customer_name', 'Khách hàng')}",
                    "date": c.claim_date.strftime("%d/%m/%Y") if getattr(c, 'claim_date', None) else "",
                    "result": "Khiếu nại",
                    "performer": emp_name,
                    "note": f"Phạt: {getattr(c, 'penalty_amount', 0):,} VNĐ",
                    "images": clean_img(getattr(c, 'evidence_image', None) or getattr(c, 'images', None)),
                    "nav_url": f"/admin/claim?search={getattr(c, 'claim_code', '') or ''}"
                })
            if filtered_c:
                summary_text = f"Ghi nhận {len(filtered_c)} khiếu nại liên quan trong Tháng {month}/{year}"
            else:
                summary_text = f"Không có khiếu nại khách hàng nào đối với {emp_name or employee_id} trong Tháng {month}/{year}"
        except Exception:
            summary_text = "Dữ liệu khiếu nại khách hàng"

    return {
        "employee_id": employee_id,
        "kpi_code": kpi_code,
        "kpi_name": content,
        "category": category,
        "target": target,
        "calc_method": calc_method,
        "summary_text": summary_text,
        "records_count": len(records),
        "records": records
    }



