from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import random
from datetime import datetime

from config.database import get_db
from modules.system.models.data_package import DataPackage
from modules.system.schemas.data_package import (
    DataPackageCreate,
    DataPackageUpdate,
    DataPackageResponse
)
from shared.utils.timezone import get_vietnam_time

router = APIRouter()

def seed_initial_packages(db: Session):
    """Khởi tạo 5 bản ghi mặc định nếu bảng trống"""
    count = db.query(DataPackage).count()
    if count == 0:
        sample_packages = [
            DataPackage(
                code='PKG-20260723-001',
                product_name='Carton 5 lớp chuẩn',
                qr_start='SF-QR-250001',
                qr_end='SF-QR-250100',
                quantity=100,
                status='Synced',
                creator='Nguyễn Văn Hùng',
                created_at=datetime(2026, 7, 23, 7, 15, 0),
                sync_error_msg=''
            ),
            DataPackage(
                code='PKG-20260722-005',
                product_name='Tấm lót nhựa định hình',
                qr_start='SF-QR-249801',
                qr_end='SF-QR-250000',
                quantity=200,
                status='Synced',
                creator='Trần Thị Thuỷ',
                created_at=datetime(2026, 7, 22, 16, 45, 0),
                sync_error_msg=''
            ),
            DataPackage(
                code='PKG-20260722-004',
                product_name='Carton 3 lớp xuất khẩu',
                qr_start='SF-QR-249701',
                qr_end='SF-QR-249800',
                quantity=100,
                status='Pending',
                creator='Lê Văn Nam',
                created_at=datetime(2026, 7, 22, 10, 30, 0),
                sync_error_msg=''
            ),
            DataPackage(
                code='PKG-20260721-003',
                product_name='Băng dính dán thùng 5cm',
                qr_start='SF-QR-249201',
                qr_end='SF-QR-249700',
                quantity=500,
                status='Error',
                creator='Nguyễn Văn Hùng',
                created_at=datetime(2026, 7, 21, 14, 20, 0),
                sync_error_msg='Kết nối máy chủ biên lỗi cổng 8080 (Timeout)'
            ),
            DataPackage(
                code='PKG-20260721-002',
                product_name='Túi PE chống ẩm',
                qr_start='SF-QR-249001',
                qr_end='SF-QR-249200',
                quantity=200,
                status='Synced',
                creator='Phạm Đức Anh',
                created_at=datetime(2026, 7, 21, 9, 15, 0),
                sync_error_msg=''
            )
        ]
        db.add_all(sample_packages)
        db.commit()

@router.get("", response_model=List[DataPackageResponse])
def get_data_packages(db: Session = Depends(get_db)):
    """Lấy danh sách các gói dữ liệu đóng gói"""
    seed_initial_packages(db)
    packages = db.query(DataPackage).order_by(DataPackage.id.desc()).all()
    return packages

@router.post("", response_model=DataPackageResponse)
def create_data_package(
    pkg_in: DataPackageCreate,
    db: Session = Depends(get_db)
):
    """Tạo gói dữ liệu đóng gói mới với sinh mã tự động"""
    now = get_vietnam_time()
    date_str = now.strftime("%Y%m%d")
    
    # Tìm mã cao nhất trong ngày
    prefix = f"PKG-{date_str}-"
    latest_pkg = (
        db.query(DataPackage)
        .filter(DataPackage.code.like(f"{prefix}%"))
        .order_by(DataPackage.id.desc())
        .first()
    )
    
    seq = 1
    if latest_pkg and latest_pkg.code:
        try:
            seq = int(latest_pkg.code.split("-")[-1]) + 1
        except Exception:
            seq = db.query(DataPackage).count() + 1
            
    code = f"{prefix}{seq:03d}"
    
    # Tìm dải QR tiếp theo
    last_qr_pkg = db.query(DataPackage).filter(DataPackage.qr_end.isnot(None)).order_by(DataPackage.id.desc()).first()
    start_qr_num = 250101
    if last_qr_pkg and last_qr_pkg.qr_end and last_qr_pkg.qr_end.startswith("SF-QR-"):
        try:
            start_qr_num = int(last_qr_pkg.qr_end.replace("SF-QR-", "")) + 1
        except Exception:
            pass
            
    end_qr_num = start_qr_num + pkg_in.quantity - 1
    qr_start = f"SF-QR-{start_qr_num}"
    qr_end = f"SF-QR-{end_qr_num}"

    new_package = DataPackage(
        code=code,
        product_name=pkg_in.product_name,
        qr_start=qr_start,
        qr_end=qr_end,
        quantity=pkg_in.quantity,
        status="Pending",
        creator=pkg_in.creator or "Quản trị hệ thống",
        notes=pkg_in.notes,
        sync_error_msg=""
    )
    db.add(new_package)
    db.commit()
    db.refresh(new_package)
    return new_package

@router.post("/{id}/sync", response_model=DataPackageResponse)
def sync_data_package(id: int, db: Session = Depends(get_db)):
    """Đồng bộ gói dữ liệu với máy chủ biên"""
    pkg = db.query(DataPackage).filter(DataPackage.id == id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói dữ liệu.")
    
    # Giả lập thành công hoặc lỗi ngẫu nhiên 10%
    if random.random() < 0.9:
        pkg.status = "Synced"
        pkg.sync_error_msg = ""
    else:
        pkg.status = "Error"
        pkg.sync_error_msg = "Lỗi phản hồi máy chủ biên (Timeout 5000ms)"
        
    pkg.updated_at = get_vietnam_time()
    db.commit()
    db.refresh(pkg)
    return pkg

@router.post("/sync-all", response_model=List[DataPackageResponse])
def sync_all_data_packages(db: Session = Depends(get_db)):
    """Đồng bộ tất cả các gói dữ liệu chưa đồng bộ hoặc bị lỗi"""
    packages = db.query(DataPackage).filter(DataPackage.status.in_(["Pending", "Error"])).all()
    for pkg in packages:
        pkg.status = "Synced"
        pkg.sync_error_msg = ""
        pkg.updated_at = get_vietnam_time()
    db.commit()
    
    all_packages = db.query(DataPackage).order_by(DataPackage.id.desc()).all()
    return all_packages

@router.delete("/{id}")
def delete_data_package(id: int, db: Session = Depends(get_db)):
    """Xóa một gói dữ liệu"""
    pkg = db.query(DataPackage).filter(DataPackage.id == id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói dữ liệu.")
    db.delete(pkg)
    db.commit()
    return {"message": f"Đã xóa thành công gói dữ liệu {pkg.code}"}
