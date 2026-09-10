from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from config.database import get_db
from config.settings import get_upload_dir
from modules.kpi.models.award_discipline import AwardDiscipline
from modules.kpi.schemas.award_discipline import AwardDisciplineCreate, AwardDisciplineUpdate, AwardDisciplineStatusUpdate
from typing import List, Optional
from datetime import datetime
import csv
import io
import os
import uuid

router = APIRouter()

def serialize_record(r):
    """Helper: serialize một bản ghi AwardDiscipline thành dict."""
    return {
        "id": r.id,
        "staff_name": r.staff_name,
        "issue": r.issue,
        "note": r.note,
        "impact": r.impact,
        "points": r.points,
        "date": r.date,
        "evidence_images": r.evidence_images,
        "rule_code": r.rule_code,
        "rule_name": r.rule_name,
        "severity": r.severity,
        "employee_id": r.employee_id,
        "department": r.department,
        "position": r.position,
        "section": r.section,
        "violation_time": r.violation_time,
        "reporter_name": r.reporter_name,
        "description": r.description,
        "status": r.status or "pending",
        "created_at": r.created_at.isoformat() if r.created_at else None
    }


@router.get("/", response_model=dict)
def get_award_disciplines(
    month: Optional[int] = Query(None, description="Lọc theo tháng (1-12)"),
    year: Optional[int] = Query(None, description="Lọc theo năm"),
    status: Optional[str] = Query(None, description="Lọc theo trạng thái: pending, tracking, approved, rejected"),
    severity: Optional[str] = Query(None, description="Lọc theo mức độ: Nghiêm trọng, Cao, Trung bình, Nhẹ"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên nhân sự, mã quy tắc..."),
    sort_order: Optional[str] = Query("desc", description="Sắp xếp: desc (mới nhất) hoặc asc (cũ nhất)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách vi phạm / khen thưởng kỷ luật.
    Hỗ trợ lọc theo tháng, năm, trạng thái, mức độ và tìm kiếm. Có phân trang và sắp xếp.
    """
    query = db.query(AwardDiscipline)

    # Lọc theo trạng thái (NULL cũng được coi là 'pending')
    if status:
        if status == 'pending':
            query = query.filter(
                (AwardDiscipline.status == 'pending') | (AwardDiscipline.status == None)
            )
        else:
            query = query.filter(AwardDiscipline.status == status)

    # Lọc theo mức độ
    if severity:
        query = query.filter(
            (AwardDiscipline.severity == severity) | (AwardDiscipline.impact == severity)
        )

    # Lọc theo tháng/năm (dựa trên trường date "dd.mm.yyyy" hoặc created_at)
    if month and year:
        month_str = f".{str(month).zfill(2)}.{year}"
        query = query.filter(AwardDiscipline.date.contains(month_str))
    elif month:
        month_str = f".{str(month).zfill(2)}."
        query = query.filter(AwardDiscipline.date.contains(month_str))
    elif year:
        year_str = f".{year}"
        query = query.filter(AwardDiscipline.date.endswith(str(year)))

    # Tìm kiếm
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (AwardDiscipline.staff_name.ilike(search_pattern)) |
            (AwardDiscipline.rule_code.ilike(search_pattern)) |
            (AwardDiscipline.rule_name.ilike(search_pattern)) |
            (AwardDiscipline.issue.ilike(search_pattern)) |
            (AwardDiscipline.employee_id.ilike(search_pattern)) |
            (AwardDiscipline.reporter_name.ilike(search_pattern))
        )

    total = query.count()
    if sort_order == "asc":
        order_clause = AwardDiscipline.id.asc()
    else:
        order_clause = AwardDiscipline.id.desc()

    records = query.order_by(order_clause).offset(skip).limit(limit).all()

    # Seed dữ liệu mẫu nếu trống
    if total == 0 and not status and not search and not month:
        seed_records = [
            AwardDiscipline(
                staff_name="Bùi Công Sự", issue="Bỏ qua bước đo độ ẩm phôi gỗ", note="Ghi nhận vi phạm từ quy trình QC sơn mạ",
                impact="Nặng", points=15, date=datetime.now().strftime("%d.%m.%Y"),
                rule_code="VP-001", rule_name="Bỏ qua bước đo độ ẩm phôi gỗ",
                severity="Nặng", employee_id="NV_QC_001", department="Tổ Sơn Mạ",
                position="Nhân sự QC", section="Tổ Sơn Mạ", violation_time=datetime.now().strftime("%H:%M | %d/%m/%Y"),
                reporter_name="QC Lead", status="approved",
                evidence_images="[]", created_at=datetime.utcnow()
            ),
            AwardDiscipline(
                staff_name="Ngô Diễm My", issue="Thiếu tem mẫu", note="Kiểm tra phát hiện thiếu tem mẫu trên cont hàng",
                impact="Cao", points=50, date=datetime.now().strftime("%d.%m.%Y"),
                rule_code="CAPA-01", rule_name="Vi phạm quy trình sản xuất",
                severity="Nghiêm trọng", employee_id="NV001", department="Sản xuất",
                position="Công nhân", section="Tổ 1", violation_time=datetime.now().strftime("%H:%M | %d/%m/%Y"),
                reporter_name="Nguyễn Văn A", status="tracking",
                evidence_images="[]", created_at=datetime.utcnow()
            ),
            AwardDiscipline(
                staff_name="Nguyễn Văn A", issue="Sai kích thước", note="Sai kích thước sản phẩm theo đơn hàng",
                impact="Trung bình", points=30, date=datetime.now().strftime("%d.%m.%Y"),
                rule_code="CAPA-01", rule_name="Vi phạm quy trình sản xuất",
                severity="Nhẹ", employee_id="NV002", department="QC",
                position="Nhân viên QC", section="Tổ 2", violation_time=datetime.now().strftime("%H:%M | %d/%m/%Y"),
                reporter_name="Trần Thị B", status="pending",
                evidence_images="[]", created_at=datetime.utcnow()
            ),
        ]
        for rec in seed_records:
            db.add(rec)
        db.commit()
        records = db.query(AwardDiscipline).order_by(AwardDiscipline.id.desc()).limit(limit).all()
        total = len(records)

    return {
        "items": [serialize_record(r) for r in records],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/stats", response_model=dict)
def get_violation_stats(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy thống kê nhanh số lượng vi phạm theo trạng thái.
    """
    query = db.query(AwardDiscipline)
    if month and year:
        month_str = f".{str(month).zfill(2)}.{year}"
        query = query.filter(AwardDiscipline.date.contains(month_str))

    all_records = query.all()
    pending_count = sum(1 for r in all_records if (r.status or "pending") == "pending")
    tracking_count = sum(1 for r in all_records if (r.status or "") == "tracking")
    approved_count = sum(1 for r in all_records if (r.status or "") == "approved")

    return {
        "total": len(all_records),
        "pending": pending_count,
        "tracking": tracking_count,
        "approved": approved_count
    }


@router.get("/export")
def export_violations(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    [GET] Xuất danh sách vi phạm ra CSV.
    """
    query = db.query(AwardDiscipline)
    if month and year:
        month_str = f".{str(month).zfill(2)}.{year}"
        query = query.filter(AwardDiscipline.date.contains(month_str))

    records = query.order_by(AwardDiscipline.id.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Mã quy tắt", "Tên quy tắt", "Mức độ", "Mã nhân sự", "Tên nhân sự",
        "Phòng ban", "Vị trí", "Bộ phận", "Thời gian vi phạm",
        "Người phát hiện", "Ghi chú", "Trạng thái", "Điểm"
    ])
    for r in records:
        writer.writerow([
            r.rule_code or "", r.rule_name or r.issue or "", r.severity or r.impact or "",
            r.employee_id or "", r.staff_name or "",
            r.department or "", r.position or "", r.section or "",
            r.violation_time or r.date or "", r.reporter_name or "",
            r.note or "", r.status or "pending", r.points or 0
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=violations_export.csv"}
    )


@router.get("/{id}", response_model=dict)
def get_award_discipline_detail(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết 1 vi phạm.
    """
    item = db.query(AwardDiscipline).filter(AwardDiscipline.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi vi phạm")
    return serialize_record(item)


@router.post("/", response_model=dict)
def create_award_discipline(payload: AwardDisciplineCreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới vi phạm / khen thưởng kỷ luật.
    """
    new_record = AwardDiscipline(
        staff_name=payload.staff_name,
        issue=payload.issue,
        note=payload.note,
        impact=payload.impact,
        points=payload.points,
        date=payload.date,
        evidence_images=payload.evidence_images or "[]",
        rule_code=payload.rule_code,
        rule_name=payload.rule_name,
        severity=payload.severity,
        employee_id=payload.employee_id,
        department=payload.department,
        position=payload.position,
        section=payload.section,
        violation_time=payload.violation_time,
        reporter_name=payload.reporter_name,
        description=payload.description,
        status=payload.status or "pending",
        created_at=datetime.utcnow()
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return {"status": "success", "id": new_record.id, "message": "Tạo báo cáo vi phạm thành công"}


@router.put("/{id}", response_model=dict)
def update_award_discipline(id: int, payload: AwardDisciplineUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật vi phạm.
    """
    item = db.query(AwardDiscipline).filter(AwardDiscipline.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi vi phạm")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return {"status": "success", "id": item.id, "message": "Cập nhật vi phạm thành công"}


@router.put("/{id}/status", response_model=dict)
def update_violation_status(id: int, payload: AwardDisciplineStatusUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Duyệt / Từ chối vi phạm (cập nhật trạng thái).
    """
    item = db.query(AwardDiscipline).filter(AwardDiscipline.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi vi phạm")

    valid_statuses = ["pending", "tracking", "approved", "rejected"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Trạng thái không hợp lệ. Cho phép: {', '.join(valid_statuses)}")

    item.status = payload.status
    db.commit()
    return {"status": "success", "id": item.id, "message": f"Cập nhật trạng thái thành '{payload.status}'"}


@router.delete("/{id}", response_model=dict)
def delete_award_discipline(id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa vi phạm.
    """
    item = db.query(AwardDiscipline).filter(AwardDiscipline.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi vi phạm")

    db.delete(item)
    db.commit()
    return {"status": "success", "message": "Xóa vi phạm thành công"}


@router.post("/upload-image", response_model=dict)
async def upload_violation_image(file: UploadFile = File(...)):
    """
    [POST] Upload ảnh bằng chứng vi phạm.
    """
    upload_dir = get_upload_dir("violations")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "status": "success",
        "filename": filename,
        "path": f"/uploads/violations/{filename}",
        "message": "Upload ảnh thành công"
    }
