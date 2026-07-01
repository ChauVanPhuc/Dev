from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from modules.kpi.models.kpi import KPI
from modules.kpi.schemas.kpi import KPICreate, KPIUpdate
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[dict])
def get_kpis(
    period_type: Optional[str] = None,
    period_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách KPI từ database theo bộ lọc.
    Nếu bảng đang trống, tự động sinh 160 dòng dữ liệu mẫu để test.
    """
    query = db.query(KPI).order_by(KPI.id.desc())
    if period_type:
        query = query.filter(KPI.period_type == period_type)
    if period_name:
        query = query.filter(KPI.period_name == period_name)
    
    kpis = query.all()
    
    # [AUTO-SEED] Nếu bảng trống, tạo ngay 160 dòng mẫu test
    if not db.query(KPI).first():
        import random
        print("Bảng kpis đang trống. Bắt đầu tự động chèn 160 dòng dữ liệu mẫu...")
        
        # 1. Sinh 12 tháng x 5 chỉ tiêu = 60 dòng
        for m in range(1, 13):
            month_name = f"Tháng {m}"
            
            # Chỉ tiêu 1: Tỷ lệ hàng đạt lần đầu (Target 95.0)
            act1 = round(random.uniform(82.0, 97.0), 1)
            db.add(KPI(
                content='Tỷ lệ hàng đạt lần đầu', target=95.0, actual=act1,
                status='success' if act1 >= 95.0 else 'danger',
                period_type='Theo tháng', period_name=month_name
            ))
            # Chỉ tiêu 2: Tỷ lệ lỗi phát hiện (Target 95.0)
            act2 = round(random.uniform(93.0, 99.0), 1)
            db.add(KPI(
                content='Tỷ lệ lỗi phát hiện', target=95.0, actual=act2,
                status='success' if act2 >= 95.0 else 'danger',
                period_type='Theo tháng', period_name=month_name
            ))
            # Chỉ tiêu 3: Điểm kỷ luật (Target 100.0)
            act3 = random.choice([95.0, 98.0, 100.0])
            db.add(KPI(
                content='Điểm kỷ luật', target=100.0, actual=act3,
                status='neutral' if act3 == 100.0 else 'danger',
                period_type='Theo tháng', period_name=month_name
            ))
            # Chỉ tiêu 4: Tỷ lệ hàng đạt chất lượng (Target 99.5)
            act4 = round(random.uniform(99.0, 100.0), 1)
            db.add(KPI(
                content='Tỷ lệ hàng đạt chất lượng', target=99.5, actual=act4,
                status='neutral' if act4 == 99.5 else ('success' if act4 > 99.5 else 'danger'),
                period_type='Theo tháng', period_name=month_name
            ))
            # Chỉ tiêu 5: Năng suất công việc (Target 100.0)
            act5 = random.choice([90.0, 100.0, 105.0])
            db.add(KPI(
                content='Năng suất công việc', target=100.0, actual=act5,
                status='neutral' if act5 == 100.0 else ('success' if act5 > 100.0 else 'danger'),
                period_type='Theo tháng', period_name=month_name
            ))

        # 2. Sinh 20 tuần x 5 chỉ tiêu = 100 dòng
        for w in range(1, 21):
            week_name = f"Tuần {w}"
            
            # Chỉ tiêu 1
            act1 = round(random.uniform(82.0, 97.0), 1)
            db.add(KPI(
                content='Tỷ lệ hàng đạt lần đầu', target=95.0, actual=act1,
                status='success' if act1 >= 95.0 else 'danger',
                period_type='Theo tuần', period_name=week_name
            ))
            # Chỉ tiêu 2
            act2 = round(random.uniform(93.0, 99.0), 1)
            db.add(KPI(
                content='Tỷ lệ lỗi phát hiện', target=95.0, actual=act2,
                status='success' if act2 >= 95.0 else 'danger',
                period_type='Theo tuần', period_name=week_name
            ))
            # Chỉ tiêu 3
            act3 = random.choice([95.0, 98.0, 100.0])
            db.add(KPI(
                content='Điểm kỷ luật', target=100.0, actual=act3,
                status='neutral' if act3 == 100.0 else 'danger',
                period_type='Theo tuần', period_name=week_name
            ))
            # Chỉ tiêu 4
            act4 = round(random.uniform(99.0, 100.0), 1)
            db.add(KPI(
                content='Tỷ lệ hàng đạt chất lượng', target=99.5, actual=act4,
                status='neutral' if act4 == 99.5 else ('success' if act4 > 99.5 else 'danger'),
                period_type='Theo tuần', period_name=week_name
            ))
            # Chỉ tiêu 5
            act5 = random.choice([90.0, 100.0, 105.0])
            db.add(KPI(
                content='Năng suất công việc', target=100.0, actual=act5,
                status='neutral' if act5 == 100.0 else ('success' if act5 > 100.0 else 'danger'),
                period_type='Theo tuần', period_name=week_name
            ))
            
        db.commit()
        # Query lại sau khi seed thành công
        query = db.query(KPI).order_by(KPI.id.desc())
        if period_type:
            query = query.filter(KPI.period_type == period_type)
        if period_name:
            query = query.filter(KPI.period_name == period_name)
        kpis = query.all()

    return [
        {
            "id": k.id,
            "content": k.content,
            "target": k.target,
            "actual": k.actual,
            "status": k.status,
            "period_type": k.period_type,
            "period_name": k.period_name
        }
        for k in kpis
    ]

@router.post("/", response_model=dict)
def create_kpi(kpi_in: KPICreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới một chỉ tiêu KPI.
    """
    new_kpi = KPI(
        content=kpi_in.content,
        target=kpi_in.target,
        actual=kpi_in.actual,
        status=kpi_in.status,
        period_type=kpi_in.period_type,
        period_name=kpi_in.period_name
    )
    db.add(new_kpi)
    db.commit()
    db.refresh(new_kpi)
    return {"status": "success", "id": new_kpi.id, "message": "Tạo KPI thành công"}

@router.patch("/{kpi_id}", response_model=dict)
def update_kpi(kpi_id: int, kpi_in: KPIUpdate, db: Session = Depends(get_db)):
    """
    [PATCH] Cập nhật một số trường của KPI theo ID.
    """
    kpi = db.query(KPI).filter(KPI.id == kpi_id).first()
    if not kpi:
        raise HTTPException(status_code=404, detail="Không tìm thấy chỉ số KPI")
    
    update_data = kpi_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(kpi, field, value)
        
    db.commit()
    return {"status": "success", "message": "Cập nhật KPI thành công"}
