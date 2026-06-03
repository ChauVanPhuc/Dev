from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from modules.equipment.models.equipment import Equipment
from typing import List

router = APIRouter()

@router.get("/", response_model=List[dict])
def get_equipments(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tất cả thiết bị từ database.
    Tự động chèn dữ liệu mẫu nếu bảng đang trống.
    """
    equipments = db.query(Equipment).all()
    
    # [AUTO-SEED] Nếu bảng trống, tự động thêm 10 thiết bị mẫu
    if not equipments:
        import datetime
        sample_data = [
            {"name": "Thước đo điện tử", "code": "EQP-001", "type": "Đo lường", "status": "Bình thường"},
            {"name": "Máy đo độ ẩm gỗ", "code": "EQP-002", "type": "Đo lường", "status": "Cần thay mới"},
            {"name": "Máy cắt 2 đầu", "code": "EQP-003", "type": "Sản xuất", "status": "Bình thường"},
            {"name": "Máy chà nhám", "code": "EQP-004", "type": "Sản xuất", "status": "Bảo trì"},
            {"name": "Thước đo độ cong", "code": "EQP-005", "type": "Đo lường", "status": "Chưa kiểm tra"},
            {"name": "Máy nén khí", "code": "EQP-006", "type": "Phụ trợ", "status": "Bình thường"},
            {"name": "Súng phun sơn", "code": "EQP-007", "type": "Sản xuất", "status": "Bình thường"},
            {"name": "Giá phơi sản phẩm 48s", "code": "EQP-008", "type": "Giá kệ", "status": "Bình thường"},
            {"name": "Thước kẹp 300mm", "code": "EQP-009", "type": "Đo lường", "status": "Bình thường"},
            {"name": "Máy bào 4 mặt", "code": "EQP-010", "type": "Sản xuất", "status": "Cần thay mới"},
        ]
        for eq in sample_data:
            new_eq = Equipment(
                name=eq["name"],
                code=eq["code"],
                type=eq["type"],
                status=eq["status"],
                purchase_date=datetime.date.today()
            )
            db.add(new_eq)
        db.commit()
        # Lấy lại danh sách sau khi chèn
        equipments = db.query(Equipment).all()

    return [
        {
            "id": e.id,
            "name": e.name,
            "code": e.code,
            "type": e.type,
            "status": e.status,
            "purchase_date": e.purchase_date,
            "maintenance_cycle": e.maintenance_cycle
        }
        for e in equipments
    ]

@router.patch("/{equipment_id}/status")
def update_equipment_status(equipment_id: int, status: str, db: Session = Depends(get_db)):
    """
    [PATCH] Cập nhật trạng thái của thiết bị sau khi kiểm tra.
    """
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
    
    equipment.status = status
    db.commit()
    return {"status": "success", "message": f"Đã cập nhật trạng thái thiết bị {equipment.name} thành {status}"}
