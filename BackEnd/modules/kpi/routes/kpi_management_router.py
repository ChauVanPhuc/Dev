from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
import os
import shutil
from sqlalchemy.orm import Session
from config.database import get_db
from modules.kpi.models.kpi_management import KPIChecklist, KPIEmployeeItem, KPIViolation, KPIFeedback, KPIPointRule, KPIChecklistPool, KPIItemPool
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
    items = db.query(KPIItemPool).order_by(KPIItemPool.id.desc()).all()
    if not items:
        default_items = [
            ("KPI01", "Hiệu suất máy OEE", "Điểm OEE trung bình đạt mục tiêu", "OEE >= 85%"),
            ("KPI02", "Vệ sinh 5S xưởng", "Kết quả đánh giá 5S tuần", "Điểm đánh giá >= 90"),
            ("KPI03", "Báo cáo OQA", "Số báo cáo gửi đúng hạn", "100% đúng hạn"),
            ("KPI04", "Họp team", "> 1 buổi / tuần", ">= 1 buổi"),
            ("KPI05", "Hiệu quả kiểm tra chéo & Thử nghiệm phá hủy", "> 1 báo cáo / tháng", ">= 1 báo cáo"),
            ("KPI06", "Tiến độ đánh giá nhân sự", "Hoàn thành đánh giá nhân sự", "Hoàn thành"),
            ("KPI07", "Báo cáo tình hình", ">1 báo cáo/ tháng", ">= 1 báo cáo"),
            ("KPI08", "Xây dựng CAPA", "Đóng CAPA đúng hạn", "Đúng hạn"),
            ("KPI09", "Tỷ lệ lọt lỗi", "Tỷ lệ lọt lỗi nhỏ hơn mục tiêu", "< 0.5%"),
            ("KPI10", "Tỷ lệ claim", "Tỷ lệ khiếu nại khách hàng", "0 claim"),
            ("KPI11", "Tỷ lệ sản phẩm đạt lần đầu", "Tỷ lệ sản phẩm đạt chất lượng lần đầu (FTY)", ">= 98%")
        ]
        for code, content, calc, target in default_items:
            db.add(KPIItemPool(
                kpi_code=code,
                content=content,
                calc_method=calc,
                target=target
            ))
        db.commit()
        items = db.query(KPIItemPool).order_by(KPIItemPool.id.desc()).all()
    
    return [
        {
            "id": r.id,
            "kpi_code": r.kpi_code,
            "content": r.content,
            "calc_method": r.calc_method,
            "target": r.target
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
