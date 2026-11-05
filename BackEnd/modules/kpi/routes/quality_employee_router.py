# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import math

from config.database import get_db, engine, Base
from modules.kpi.models.quality_employee import QualityEmployee
from modules.hr.models.hr_models import HREmployee
from fastapi.responses import StreamingResponse
from modules.kpi.services.kpi_excel_exporter import generate_monthly_kpi_excel

# Khởi tạo bảng nếu chưa có
QualityEmployee.__table__.create(bind=engine, checkfirst=True)

router = APIRouter()

# --- Pydantic Schemas ---
class QualityEmployeeBase(BaseModel):
    employee_id: str
    full_name: str
    department: Optional[str] = "Phòng QLCL"
    stage: Optional[str] = "QLCL"
    factory: Optional[str] = "Nhà máy 1"
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = "Đang làm việc"
    latest_rating: Optional[str] = "A"
    note: Optional[str] = None

class QualityEmployeeCreate(QualityEmployeeBase):
    pass

class QualityEmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    stage: Optional[str] = None
    factory: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    latest_rating: Optional[str] = None
    note: Optional[str] = None

class QualityEmployeeResponse(QualityEmployeeBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- API Endpoints ---

@router.post("/seed-initial-data")
def seed_initial_quality_employees(db: Session = Depends(get_db)):
    """
    Tự động khởi tạo 26 nhân sự QC/QA thực tế vào bảng quality_employees nếu bảng chưa có dữ liệu.
    """
    existing_count = db.query(QualityEmployee).count()
    if existing_count > 0:
        return {"message": f"Bảng quality_employees đã có {existing_count} nhân sự.", "count": existing_count}

    initial_list = [
        {"employee_id": "NV_QLCL_001", "full_name": "Đặng Văn Nam", "department": "Phòng QLCL", "stage": "Kiểm định QLCL", "factory": "Nhà máy 1", "latest_rating": "A"},
        {"employee_id": "NV_QLCL_002", "full_name": "Đặng Quý Hải", "department": "Phòng QLCL", "stage": "Định hình 1", "factory": "Nhà máy 1", "latest_rating": "A"},
        {"employee_id": "NV_QLCL_003", "full_name": "Hà Đình Thành", "department": "Phòng QLCL", "stage": "Định hình 2", "factory": "Nhà máy 1", "latest_rating": "B"},
        {"employee_id": "NV_QLCL_004", "full_name": "Đậu Thị Tâm", "department": "Phòng QLCL", "stage": "Chuẩn bị NL", "factory": "Nhà máy 1", "latest_rating": "A"},
        {"employee_id": "NV_QLCL_005", "full_name": "Huỳnh Hoàng Sơn", "department": "Bộ phận QC NM2", "stage": "Gia công CNC", "factory": "Nhà máy 2", "latest_rating": "A"},
        {"employee_id": "NV_QLCL_006", "full_name": "Hồ Sỹ Khấn", "department": "Bộ phận QC NM2", "stage": "Sơn sấy", "factory": "Nhà máy 2", "latest_rating": "B"},
        {"employee_id": "NV_QLCL_007", "full_name": "Phan Thị Lương", "department": "Bộ phận QC NM2", "stage": "Lắp ráp", "factory": "Nhà máy 2", "latest_rating": "A"},
        {"employee_id": "NV_QLCL_008", "full_name": "Đỗ Hữu Phúc", "department": "Bộ phận QC NM3", "stage": "Đóng gói", "factory": "Nhà máy 3", "latest_rating": "B"},
        {"employee_id": "NV_QLCL_009", "full_name": "Phạm Thị Mai", "department": "Bộ phận QC NM3", "stage": "Kiểm thành phẩm", "factory": "Nhà máy 3", "latest_rating": "A"},
        {"employee_id": "NV_QLCL_010", "full_name": "Nguyễn Thị Mỹ Kim", "department": "Bộ phận QC NM3", "stage": "Xuất hàng", "factory": "Nhà máy 3", "latest_rating": "C"},
        {"employee_id": "NV_QLCL_011", "full_name": "Nguyễn Văn Tiến", "department": "Phòng QA", "stage": "Đánh giá QA", "factory": "Nhà máy 1", "latest_rating": "A"},
        {"employee_id": "NV_QLCL_012", "full_name": "Hà Minh Xuân", "department": "Bộ phận QC NM1", "stage": "Ép nhựa", "factory": "Nhà máy 1", "latest_rating": "B"},
        {"employee_id": "NV_QLCL_013", "full_name": "Dương Thị Lệ Uyên", "department": "Bộ phận QC NM2", "stage": "Xử lý bề mặt", "factory": "Nhà máy 2", "latest_rating": "A"},
        {"employee_id": "NV_QLCL_015", "full_name": "Đặng Minh Tuấn", "department": "Bộ phận QC NM2", "stage": "Gia công CNC", "factory": "Nhà máy 2", "latest_rating": "B"},
        {"employee_id": "NV_QLCL_016", "full_name": "Trần Thị Ánh", "department": "Bộ phận QC NM1", "stage": "Định hình 1", "factory": "Nhà máy 1", "latest_rating": "A"},
        {"employee_id": "NV_QLCL_017", "full_name": "Bùi Công Sự", "department": "Bộ phận QC NM2", "stage": "Gia công", "factory": "Nhà máy 2", "latest_rating": "B"},
        {"employee_id": "NV_QLCL_018", "full_name": "Nguyễn Thị Phương", "department": "Bộ phận QC NM3", "stage": "Đóng gói", "factory": "Nhà máy 3", "latest_rating": "A"},
        {"employee_id": "NV_QLCL_019", "full_name": "Dương Văn Toàn", "department": "Bộ phận QC NM3", "stage": "Xuất hàng", "factory": "Nhà máy 3", "latest_rating": "C"},
        {"employee_id": "NV_QLCL_020", "full_name": "Nguyễn Thị Thu Thủy", "department": "Bộ phận Sản xuất", "stage": "Sản xuất 1", "factory": "Nhà máy 1", "latest_rating": "B"},
        {"employee_id": "NV_QLCL_021", "full_name": "Bùi Thị Tình", "department": "Bộ phận Sản xuất", "stage": "Sản xuất 2", "factory": "Nhà máy 1", "latest_rating": "B"},
        {"employee_id": "NV_QLCL_022", "full_name": "Đỗ Thị Kim Hiền", "department": "Bộ phận Sản xuất", "stage": "Nhân Viên SX", "factory": "Nhà máy 2", "latest_rating": "C"},
        {"employee_id": "NV_QLCL_023", "full_name": "Huỳnh Thị Diễm Trinh", "department": "Bộ phận Sản xuất", "stage": "Nhân Viên SX", "factory": "Nhà máy 2", "latest_rating": "B"},
        {"employee_id": "NV_QLCL_024", "full_name": "Bùi Hồng Hạnh", "department": "Bộ phận Sản xuất", "stage": "Đóng gói SX", "factory": "Nhà máy 3", "latest_rating": "B"},
        {"employee_id": "NV_QLCL_025", "full_name": "Huỳnh Thị Diễm Lài", "department": "Bộ phận Sản xuất", "stage": "Kiểm thành phẩm", "factory": "Nhà máy 3", "latest_rating": "A"}
    ]

    count = 0
    for item in initial_list:
        emp = QualityEmployee(**item)
        db.add(emp)
        count += 1

    db.commit()
    return {"message": f"Khởi tạo thành công {count} nhân sự Quản lý Chất lượng vào Database!", "count": count}

@router.get("", include_in_schema=False)
@router.get("/")
def get_quality_employees(
    page: int = 1,
    size: Optional[int] = None,
    limit: Optional[int] = None,
    search: Optional[str] = None,
    factory: Optional[str] = None,
    stage: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db)
):
    actual_size = size or limit or 50
    query = db.query(QualityEmployee)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (QualityEmployee.employee_id.like(search_filter)) |
            (QualityEmployee.full_name.like(search_filter)) |
            (QualityEmployee.stage.like(search_filter)) |
            (QualityEmployee.department.like(search_filter))
        )

    if factory:
        query = query.filter(QualityEmployee.factory == factory)
    if stage:
        query = query.filter(QualityEmployee.stage == stage)
    if department:
        query = query.filter(QualityEmployee.department == department)

    total = query.count()
    pages = math.ceil(total / actual_size) if actual_size > 0 else 1
    items = query.order_by(QualityEmployee.id.asc()).offset((page - 1) * actual_size).limit(actual_size).all()

    return {
        "items": [QualityEmployeeResponse.model_validate(i) for i in items],
        "total": total,
        "page": page,
        "size": actual_size,
        "pages": pages
    }

class ExportKPIExcelRequest(BaseModel):
    month: int = 9
    year: int = 2026
    scope: str = "ALL"  # ALL, QLCL_ONLY, QCSX_ONLY
    factory: Optional[str] = None


@router.post("/kpi/export-excel")
def export_kpi_excel_post(payload: ExportKPIExcelRequest, db: Session = Depends(get_db)):
    """
    Xuất báo cáo kết quả thực hiện KPI theo tháng ra file Excel chuẩn format 'CL_KPI tháng 9.xlsx'
    """
    output = generate_monthly_kpi_excel(
        db=db,
        month=payload.month,
        year=payload.year,
        scope=payload.scope,
        factory=payload.factory
    )
    filename = f"CL_KPI_Thang_{payload.month:02d}_{payload.year}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/kpi/export-excel")
def export_kpi_excel_get(
    month: int = Query(9, ge=1, le=12),
    year: int = Query(2026, ge=2020),
    scope: str = Query("ALL"),
    factory: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    [GET] Hỗ trợ tải trực tiếp báo cáo KPI tháng qua URL
    """
    output = generate_monthly_kpi_excel(
        db=db,
        month=month,
        year=year,
        scope=scope,
        factory=factory
    )
    filename = f"CL_KPI_Thang_{month:02d}_{year}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{id}", response_model=QualityEmployeeResponse)
def get_quality_employee_detail(id: int, db: Session = Depends(get_db)):
    emp = db.query(QualityEmployee).filter(QualityEmployee.id == id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân sự Quản lý Chất lượng")
    return emp

@router.post("/", response_model=QualityEmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_quality_employee(data: QualityEmployeeCreate, db: Session = Depends(get_db)):
    existing = db.query(QualityEmployee).filter(QualityEmployee.employee_id == data.employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã nhân sự này đã tồn tại trong bảng QLCL")
    
    new_emp = QualityEmployee(**data.model_dump())
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    return new_emp

@router.put("/{id}", response_model=QualityEmployeeResponse)
def update_quality_employee(id: int, data: QualityEmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(QualityEmployee).filter(QualityEmployee.id == id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân sự Quản lý Chất lượng")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(emp, key, value)
            
    db.commit()
    db.refresh(emp)
    return emp

@router.delete("/{id}")
def delete_quality_employee(id: int, db: Session = Depends(get_db)):
    emp = db.query(QualityEmployee).filter(QualityEmployee.id == id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân sự Quản lý Chất lượng")
    
    db.delete(emp)
    db.commit()
    return {"message": "Đã xóa nhân sự khỏi bảng Quản lý Chất lượng thành công"}
