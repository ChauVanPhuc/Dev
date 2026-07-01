from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from config.database import get_db
from modules.equipment.models.equipment import Equipment, EquipmentInspection, EquipmentTraining
from typing import List, Optional
from pydantic import BaseModel
import datetime
import json

router = APIRouter()

# Schema declarations
class EquipmentManualStep(BaseModel):
    step: int
    title: str
    image_url: Optional[str] = None

class EquipmentBase(BaseModel):
    name: str
    code: str
    type: Optional[str] = None
    status: Optional[str] = "Bình thường"
    purchase_date: Optional[datetime.date] = None
    maintenance_cycle: Optional[int] = 30
    department: Optional[str] = None
    owner_name: Optional[str] = None
    calibration_date: Optional[datetime.date] = None
    handover_date: Optional[datetime.date] = None
    check_date: Optional[datetime.date] = None
    attachment_pdf: Optional[str] = None
    images: Optional[str] = None
    user_manual_steps: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(EquipmentBase):
    pass

class InspectionCreate(BaseModel):
    performed_by: Optional[str] = None
    verified_by: Optional[str] = None
    check_date: Optional[datetime.date] = None
    calibration_date: Optional[datetime.date] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class TrainingCreate(BaseModel):
    trainer: Optional[str] = None
    summary: Optional[str] = None
    training_date: Optional[datetime.date] = None
    evaluation_date: Optional[datetime.date] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    uploader: Optional[str] = None
    upload_date: Optional[datetime.date] = None
    evaluation_result: Optional[str] = None
    file_content_preview: Optional[str] = None

@router.get("/", response_model=List[dict])
def get_equipments(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tất cả thiết bị từ database.
    Tự động chèn dữ liệu mẫu nâng cấp nếu bảng đang trống.
    """
    equipments = db.query(Equipment).order_by(Equipment.id.desc()).all()
    
    # [AUTO-SEED] Nếu bảng trống, tự động thêm 5 thiết bị mẫu đầy đủ thông tin
    if not equipments:
        sample_data = [
            {
                "name": "Thước đo điện tử", "code": "EQP-001", "type": "Đo lường", "status": "Bình thường",
                "department": "Quản lý chất lượng", "owner_name": "Nguyễn Văn A",
                "calibration_date": datetime.date(2026, 6, 20), "handover_date": datetime.date(2026, 6, 20),
                "check_date": datetime.date(2026, 6, 22), "attachment_pdf": "bien_ban_ban_giao_001.pdf",
                "images": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200,https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=200",
                "user_manual_steps": json.dumps([
                    {"step": 1, "title": "Bấm nút mở nguồn điện phía trên tay cầm.", "image_url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200"},
                    {"step": 2, "title": "Đưa mỏ kẹp thước vào sát chi tiết gỗ cần đo.", "image_url": "https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=200"},
                    {"step": 3, "title": "Xem thông số hiển thị trực tiếp trên màn hình LED.", "image_url": None}
                ])
            },
            {
                "name": "Máy đo độ ẩm gỗ", "code": "EQP-002", "type": "Đo lường", "status": "Cần thay mới",
                "department": "Quản lý chất lượng", "owner_name": "Nguyễn Văn A",
                "calibration_date": datetime.date(2026, 5, 10), "handover_date": datetime.date(2026, 5, 10),
                "check_date": datetime.date(2026, 5, 12), "attachment_pdf": "bien_ban_ban_giao_002.pdf",
                "images": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200",
                "user_manual_steps": json.dumps([
                    {"step": 1, "title": "Khởi động thiết bị đo độ ẩm.", "image_url": None},
                    {"step": 2, "title": "Cắm 2 kim đo ngập sâu vào thân gỗ.", "image_url": None}
                ])
            },
            {
                "name": "Máy cắt 2 đầu", "code": "EQP-003", "type": "Sản xuất", "status": "Bình thường",
                "department": "Tổ đóng gói", "owner_name": "Nguyễn Văn B",
                "calibration_date": datetime.date(2026, 3, 1), "handover_date": datetime.date(2026, 3, 2),
                "check_date": datetime.date(2026, 6, 25), "attachment_pdf": "bien_ban_ban_giao_003.pdf",
                "images": "", "user_manual_steps": "[]"
            },
            {
                "name": "Máy chà nhám", "code": "EQP-004", "type": "Sản xuất", "status": "Bảo trì",
                "department": "Tổ chà nhám", "owner_name": "Nguyễn Văn C",
                "calibration_date": datetime.date(2026, 4, 15), "handover_date": datetime.date(2026, 4, 15),
                "check_date": datetime.date(2026, 6, 18), "attachment_pdf": "bien_ban_ban_giao_004.pdf",
                "images": "", "user_manual_steps": "[]"
            },
            {
                "name": "Thước đo độ cong", "code": "EQP-005", "type": "Đo lường", "status": "Chưa kiểm tra",
                "department": "Quản lý chất lượng", "owner_name": "Nguyễn Văn D",
                "calibration_date": datetime.date(2026, 2, 20), "handover_date": datetime.date(2026, 2, 20),
                "check_date": datetime.date(2026, 6, 20), "attachment_pdf": "",
                "images": "", "user_manual_steps": "[]"
            }
        ]
        for eq in sample_data:
            new_eq = Equipment(
                name=eq["name"],
                code=eq["code"],
                type=eq["type"],
                status=eq["status"],
                purchase_date=datetime.date.today(),
                maintenance_cycle=30,
                department=eq["department"],
                owner_name=eq["owner_name"],
                calibration_date=eq["calibration_date"],
                handover_date=eq["handover_date"],
                check_date=eq["check_date"],
                attachment_pdf=eq["attachment_pdf"],
                images=eq["images"],
                user_manual_steps=eq["user_manual_steps"]
            )
            db.add(new_eq)
        db.commit()
        
        # Thêm lịch sử kiểm tra mẫu
        equipments = db.query(Equipment).all()
        for eq in equipments:
            insp1 = EquipmentInspection(
                equipment_id=eq.id, performed_by="Nguyễn Văn A", verified_by="Nguyễn Văn B",
                check_date=datetime.date(2026, 6, 1), calibration_date=datetime.date(2026, 6, 2),
                status="Bình thường", notes="Thiết bị hoạt động ổn định, sai số trong phạm vi cho phép."
            )
            insp2 = EquipmentInspection(
                equipment_id=eq.id, performed_by="Nguyễn Văn A", verified_by="Nguyễn Văn B",
                check_date=datetime.date(2026, 6, 22), calibration_date=datetime.date(2026, 6, 22),
                status=eq.status, notes="Kiểm định định kỳ hàng tháng."
            )
            db.add(insp1)
            db.add(insp2)
            
            # Thêm đào tạo mẫu
            train1 = EquipmentTraining(
                equipment_id=eq.id, trainer="Nguyễn Văn C", summary="Hướng dẫn sử dụng và bảo dưỡng định kỳ.",
                training_date=datetime.date(2026, 6, 10), evaluation_date=datetime.date(2026, 6, 12),
                file_name="tai_lieu_dao_tao_01.pdf", file_type="Đào tạo sử dụng",
                uploader="admin", upload_date=datetime.date(2026, 6, 10),
                evaluation_result="Đạt yêu cầu vận hành an toàn",
                file_content_preview="TÀI LIỆU ĐÀO TẠO THIẾT BỊ\n\n1. Chuẩn bị trước khi vận hành\n2. Các bước vận hành chuẩn (SOP)\n3. Khắc phục sự cố cơ bản\n4. Quy tắc an toàn lao động."
            )
            db.add(train1)
        db.commit()
        equipments = db.query(Equipment).order_by(Equipment.id.desc()).all()

    return [
        {
            "id": e.id,
            "name": e.name,
            "code": e.code,
            "type": e.type,
            "status": e.status,
            "purchase_date": e.purchase_date,
            "maintenance_cycle": e.maintenance_cycle,
            "department": e.department,
            "owner_name": e.owner_name,
            "calibration_date": e.calibration_date,
            "handover_date": e.handover_date,
            "check_date": e.check_date,
            "attachment_pdf": e.attachment_pdf,
            "images": e.images,
            "user_manual_steps": e.user_manual_steps
        }
        for e in equipments
    ]

@router.post("/", response_model=dict)
def create_equipment(eq: EquipmentCreate, db: Session = Depends(get_db)):
    """
    [POST] Khai báo thiết bị mới.
    """
    exists = db.query(Equipment).filter(Equipment.code == eq.code).first()
    if exists:
        raise HTTPException(status_code=400, detail="Mã thiết bị đã tồn tại trong hệ thống")
        
    new_eq = Equipment(
        name=eq.name,
        code=eq.code,
        type=eq.type,
        status=eq.status,
        purchase_date=eq.purchase_date or datetime.date.today(),
        maintenance_cycle=eq.maintenance_cycle or 30,
        department=eq.department,
        owner_name=eq.owner_name,
        calibration_date=eq.calibration_date,
        handover_date=eq.handover_date,
        check_date=eq.check_date,
        attachment_pdf=eq.attachment_pdf,
        images=eq.images,
        user_manual_steps=eq.user_manual_steps or "[]"
    )
    db.add(new_eq)
    db.commit()
    db.refresh(new_eq)
    return {"status": "success", "id": new_eq.id, "message": "Đã tạo thiết bị mới thành công"}

@router.put("/{equipment_id}", response_model=dict)
def update_equipment(equipment_id: int, eq: EquipmentUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin bàn giao thiết bị.
    """
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
        
    equipment.name = eq.name
    equipment.code = eq.code
    equipment.type = eq.type
    equipment.status = eq.status
    equipment.purchase_date = eq.purchase_date
    equipment.maintenance_cycle = eq.maintenance_cycle
    equipment.department = eq.department
    equipment.owner_name = eq.owner_name
    equipment.calibration_date = eq.calibration_date
    equipment.handover_date = eq.handover_date
    equipment.check_date = eq.check_date
    equipment.attachment_pdf = eq.attachment_pdf
    equipment.images = eq.images
    equipment.user_manual_steps = eq.user_manual_steps
    
    db.commit()
    return {"status": "success", "message": f"Đã cập nhật thiết bị {eq.name} thành công"}

@router.patch("/{equipment_id}/status")
def update_equipment_status(equipment_id: int, status: str, db: Session = Depends(get_db)):
    """
    [PATCH] Cập nhật nhanh trạng thái của thiết bị.
    """
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
    
    equipment.status = status
    db.commit()
    return {"status": "success", "message": f"Đã cập nhật trạng thái thiết bị {equipment.name} thành {status}"}

@router.delete("/{equipment_id}")
def delete_equipment(equipment_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa thiết bị khỏi hệ thống.
    """
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
    
    # Xóa lịch sử kiểm tra và đào tạo liên quan
    db.query(EquipmentInspection).filter(EquipmentInspection.equipment_id == equipment_id).delete()
    db.query(EquipmentTraining).filter(EquipmentTraining.equipment_id == equipment_id).delete()
    db.delete(equipment)
    db.commit()
    return {"status": "success", "message": f"Đã xóa thiết bị {equipment.name} thành công"}

# --- ENDPOINTS CHO LỊCH SỬ KIỂM TRA / HIỆU CHUẨN ---

@router.get("/inspections", response_model=List[dict])
def get_all_inspections(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách toàn bộ lịch sử kiểm tra thiết bị.
    """
    insps = db.query(EquipmentInspection).order_by(EquipmentInspection.id.desc()).all()
    results = []
    for insp in insps:
        eq = db.query(Equipment).filter(Equipment.id == insp.equipment_id).first()
        results.append({
            "id": insp.id,
            "equipment_id": insp.equipment_id,
            "equipment_code": eq.code if eq else "—",
            "equipment_name": eq.name if eq else "—",
            "performed_by": insp.performed_by,
            "verified_by": insp.verified_by,
            "check_date": insp.check_date,
            "calibration_date": insp.calibration_date,
            "status": insp.status,
            "notes": insp.notes
        })
    return results

@router.get("/{equipment_id}/inspections", response_model=List[dict])
def get_equipment_inspections(equipment_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy lịch sử kiểm tra của 1 thiết bị cụ thể.
    """
    insps = db.query(EquipmentInspection).filter(EquipmentInspection.equipment_id == equipment_id).order_by(EquipmentInspection.check_date.desc()).all()
    return [
        {
            "id": i.id,
            "performed_by": i.performed_by,
            "verified_by": i.verified_by,
            "check_date": i.check_date,
            "calibration_date": i.calibration_date,
            "status": i.status,
            "notes": i.notes
        }
        for i in insps
    ]

@router.post("/{equipment_id}/inspections", response_model=dict)
def create_equipment_inspection(equipment_id: int, insp: InspectionCreate, db: Session = Depends(get_db)):
    """
    [POST] Thêm lịch sử kiểm tra mới cho thiết bị.
    """
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
        
    new_insp = EquipmentInspection(
        equipment_id=equipment_id,
        performed_by=insp.performed_by,
        verified_by=insp.verified_by,
        check_date=insp.check_date or datetime.date.today(),
        calibration_date=insp.calibration_date,
        status=insp.status or equipment.status,
        notes=insp.notes
    )
    db.add(new_insp)
    
    # Cập nhật ngày kiểm tra cuối và trạng thái của thiết bị
    equipment.check_date = new_insp.check_date
    if insp.status:
        equipment.status = insp.status
    if insp.calibration_date:
        equipment.calibration_date = insp.calibration_date
        
    db.commit()
    return {"status": "success", "message": "Đã thêm nhật ký kiểm định thành công"}

# --- ENDPOINTS CHO NHẬT KÝ ĐÀO TẠO ---

@router.get("/trainings", response_model=List[dict])
def get_all_trainings(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách toàn bộ thông tin đào tạo thiết bị.
    """
    trains = db.query(EquipmentTraining).order_by(EquipmentTraining.id.desc()).all()
    results = []
    for train in trains:
        eq = db.query(Equipment).filter(Equipment.id == train.equipment_id).first()
        results.append({
            "id": train.id,
            "equipment_id": train.equipment_id,
            "equipment_code": eq.code if eq else "—",
            "equipment_name": eq.name if eq else "—",
            "trainer": train.trainer,
            "summary": train.summary,
            "training_date": train.training_date,
            "evaluation_date": train.evaluation_date,
            "file_name": train.file_name,
            "file_type": train.file_type,
            "uploader": train.uploader,
            "upload_date": train.upload_date,
            "evaluation_result": train.evaluation_result,
            "file_content_preview": train.file_content_preview
        })
    return results

@router.get("/{equipment_id}/trainings", response_model=List[dict])
def get_equipment_trainings(equipment_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy nhật ký đào tạo của 1 thiết bị cụ thể.
    """
    trains = db.query(EquipmentTraining).filter(EquipmentTraining.equipment_id == equipment_id).order_by(EquipmentTraining.training_date.desc()).all()
    return [
        {
            "id": t.id,
            "trainer": t.trainer,
            "summary": t.summary,
            "training_date": t.training_date,
            "evaluation_date": t.evaluation_date,
            "file_name": t.file_name,
            "file_type": t.file_type,
            "uploader": t.uploader,
            "upload_date": t.upload_date,
            "evaluation_result": t.evaluation_result,
            "file_content_preview": t.file_content_preview
        }
        for t in trains
    ]

@router.post("/{equipment_id}/trainings", response_model=dict)
def create_equipment_training(equipment_id: int, train: TrainingCreate, db: Session = Depends(get_db)):
    """
    [POST] Thêm nhật ký đào tạo mới cho thiết bị.
    """
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
        
    new_train = EquipmentTraining(
        equipment_id=equipment_id,
        trainer=train.trainer,
        summary=train.summary,
        training_date=train.training_date or datetime.date.today(),
        evaluation_date=train.evaluation_date,
        file_name=train.file_name,
        file_type=train.file_type or "Đào tạo sử dụng",
        uploader=train.uploader or "admin",
        upload_date=train.upload_date or datetime.date.today(),
        evaluation_result=train.evaluation_result,
        file_content_preview=train.file_content_preview
    )
    db.add(new_train)
    db.commit()
    return {"status": "success", "message": "Đã thêm thông tin đào tạo thành công"}

@router.delete("/{equipment_id}")
def delete_equipment(equipment_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa thiết bị khỏi database.
    """
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
    
    # Xóa các bản ghi liên quan trong bảng inspections và trainings trước
    db.query(EquipmentInspection).filter(EquipmentInspection.equipment_id == equipment_id).delete()
    db.query(EquipmentTraining).filter(EquipmentTraining.equipment_id == equipment_id).delete()
    
    db.delete(equipment)
    db.commit()
    return {"status": "success", "message": "Đã xóa thiết bị thành công"}

