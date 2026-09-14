# -*- coding: utf-8 -*-
from typing import List, Optional
from sqlalchemy.orm import Session
from modules.inspection_guide.models.inspection_form_type import InspectionFormType

DEFAULT_FORM_TYPES = [
    {
        "code": "first_sample",
        "name": "Kiểm tra mẫu lần đầu",
        "short_name": "Mẫu lần đầu",
        "description": "Phiếu kiểm tra sản phẩm mẫu đầu chuyền trước khi bắt đầu sản xuất",
        "route_path": "/production_v2/inspection/first-sample",
        "icon": "FileCheck",
        "color": "#0284C7",
        "bg_color": "#F0F9FF",
        "display_order": 1,
        "is_active": True,
        "is_system": True,
    },
    {
        "code": "re_inspect",
        "name": "Kiểm tra lại",
        "short_name": "Kiểm tra lại",
        "description": "Phiếu tái kiểm tra các lô sản phẩm đã qua khắc phục / xử lý lại",
        "route_path": "/production_v2/inspection/re-inspect",
        "icon": "RotateCcw",
        "color": "#D97706",
        "bg_color": "#FFFBEB",
        "display_order": 2,
        "is_active": True,
        "is_system": True,
    },
    {
        "code": "parameter",
        "name": "Kiểm tra thông số",
        "short_name": "Thông số",
        "description": "Phiếu đo đạc và kiểm tra thông số kỹ thuật (độ ẩm, nhiệt độ...)",
        "route_path": "/production_v2/inspection/parameter",
        "icon": "Sliders",
        "color": "#7C3AED",
        "bg_color": "#F5F3FF",
        "display_order": 3,
        "is_active": True,
        "is_system": True,
    },
    {
        "code": "process",
        "name": "Kiểm tra quy trình",
        "short_name": "Quy trình",
        "description": "Phiếu kiểm soát tuân thủ quy trình và thao tác công đoạn",
        "route_path": "/production_v2/inspection/process",
        "icon": "Layers",
        "color": "#059669",
        "bg_color": "#ECFDF5",
        "display_order": 4,
        "is_active": True,
        "is_system": True,
    },
    {
        "code": "qa",
        "name": "Vấn đáp",
        "short_name": "Vấn đáp",
        "description": "Phiếu vấn đáp và đánh giá kiến thức nghiệp vụ QA/QC",
        "route_path": "/production_v2/inspection/qa",
        "icon": "HelpCircle",
        "color": "#E11D48",
        "bg_color": "#FFF1F2",
        "display_order": 5,
        "is_active": True,
        "is_system": True,
    },
    {
        "code": "daily",
        "name": "Ghi nhận lỗi hằng ngày",
        "short_name": "Lỗi hằng ngày",
        "description": "Phiếu ghi nhận nhanh lỗi và sự không phù hợp phát sinh trong ngày",
        "route_path": "/production_v2/inspection/daily",
        "icon": "AlertTriangle",
        "color": "#F97316",
        "bg_color": "#FFF7ED",
        "display_order": 6,
        "is_active": True,
        "is_system": True,
    },
]


def list_form_types(db: Session, include_inactive: bool = False) -> List[InspectionFormType]:
    query = db.query(InspectionFormType)
    if not include_inactive:
        query = query.filter(InspectionFormType.is_active == True)
    return query.order_by(InspectionFormType.display_order.asc(), InspectionFormType.id.asc()).all()


def get_form_type(db: Session, type_id: int) -> Optional[InspectionFormType]:
    return db.query(InspectionFormType).filter(InspectionFormType.id == type_id).first()


def get_form_type_by_code(db: Session, code: str) -> Optional[InspectionFormType]:
    return db.query(InspectionFormType).filter(InspectionFormType.code == code).first()


def create_form_type(db: Session, **kwargs) -> InspectionFormType:
    code = kwargs.get("code", "").strip()
    existing = get_form_type_by_code(db, code)
    if existing:
        raise ValueError(f"Mã loại phiếu '{code}' đã tồn tại trong hệ thống.")

    item = InspectionFormType(**kwargs)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_form_type(db: Session, item: InspectionFormType, **kwargs) -> InspectionFormType:
    for key, value in kwargs.items():
        if hasattr(item, key) and key not in ("id", "code", "created_at"):
            setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


def delete_form_type(db: Session, item: InspectionFormType):
    if item.is_system:
        raise ValueError("Không thể xóa loại phiếu mặc định của hệ thống. Bạn có thể chọn Tắt kích hoạt thay vì xóa.")
    db.delete(item)
    db.commit()


def seed_default_form_types(db: Session):
    count = db.query(InspectionFormType).count()
    if count == 0:
        for d in DEFAULT_FORM_TYPES:
            db.add(InspectionFormType(**d))
        db.commit()
