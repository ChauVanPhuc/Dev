import os
import datetime
import hashlib
import uuid
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from modules.iso_signature.models.iso_signature_model import ISOSignature
from modules.iso_signature.schemas.iso_signature_schema import ISOSignatureCreate, ISOSignatureUpdate

# Thư mục lưu tệp chữ ký chuẩn
try:
    from config.settings import get_upload_dir
    SIGNATURE_UPLOAD_DIR = get_upload_dir("signatures")
except Exception:
    SIGNATURE_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "uploads", "signatures")
    os.makedirs(SIGNATURE_UPLOAD_DIR, exist_ok=True)

class ISOSignatureService:
    @staticmethod
    def seed_initial_signatures_if_empty(db: Session):
        """Khởi tạo dữ liệu mẫu phong phú nếu bảng chữ ký chưa có bản ghi nào"""
        count = db.query(ISOSignature).count()
        if count > 0:
            return

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Mẫu 1: Trưởng phòng QLCL - Chữ ký ảnh tải lên (SVG path / data base64)
        sig1 = ISOSignature(
            user_code="nam.dv",
            full_name="Đặng Văn Nam",
            department="QLCL",
            position="Trưởng phòng QLCL",
            approval_level="Cấp phòng",
            signature_type="HANDWRITTEN_IMAGE",
            image_path="",
            signature_data="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='70' viewBox='0 0 180 70'><path d='M20,45 Q40,15 65,35 T110,30 T150,25 Q130,55 90,52 T35,48' fill='none' stroke='%23003399' stroke-width='2.5' stroke-linecap='round'/><text x='115' y='60' font-family='sans-serif' font-size='10' fill='%23666'>DV Nam</text></svg>",
            is_default=True,
            is_active=True,
            notes="Chữ ký tay chính thức của Trưởng phòng QLCL phục vụ ký duyệt quy trình và biểu mẫu cấp phòng",
            created_at=now_str,
            updated_at=now_str
        )

        # Mẫu 2: Ban Giám Đốc - Chữ ký điện tử / Chứng thư số
        hash_bgd = hashlib.sha256("SMARTFLOW_BGD_DIGITAL_SIGNATURE_2026".encode()).hexdigest()
        sig2 = ISOSignature(
            user_code="Tam",
            full_name="Lương Thị Thanh Tâm",
            department="BGD",
            position="Giám Đốc",
            approval_level="Cấp công ty",
            signature_type="DIGITAL",
            digital_cert_provider="SmartFlow Corporate PKI (Viettel-CA)",
            digital_serial_no="54:02:FA:7E:99:20:26:01",
            digital_valid_from="2026-01-01",
            digital_valid_to="2028-12-31",
            digital_hash=f"SHA256:{hash_bgd[:32]}...",
            is_default=True,
            is_active=True,
            notes="Chứng thư số cấp cao của Ban Giám Đốc dùng cho phê duyệt ban hành tài liệu và quy trình toàn công ty",
            created_at=now_str,
            updated_at=now_str
        )

        # Mẫu 3: Quản lý Tài liệu ISO - Chữ ký ảnh
        sig3 = ISOSignature(
            user_code="mai.pt",
            full_name="Phạm Thị Mai",
            department="QLCL",
            position="Kiểm soát Tài liệu & Hệ thống ISO",
            approval_level="Cấp phòng",
            signature_type="HANDWRITTEN_IMAGE",
            signature_data="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='70' viewBox='0 0 180 70'><path d='M20,38 Q50,15 80,42 T130,28 Q155,40 160,30 M40,55 L140,50' fill='none' stroke='%23003399' stroke-width='2' stroke-linecap='round'/><text x='120' y='63' font-family='sans-serif' font-size='10' fill='%23666'>PT Mai</text></svg>",
            is_default=False,
            is_active=True,
            notes="Chữ ký soát xét và rà soát hồ sơ tài liệu ISO",
            created_at=now_str,
            updated_at=now_str
        )

        db.add_all([sig1, sig2, sig3])
        db.commit()

    @staticmethod
    def get_stats(db: Session) -> Dict[str, int]:
        """Thống kê số lượng chữ ký theo các tiêu chí KPI"""
        ISOSignatureService.seed_initial_signatures_if_empty(db)
        
        all_sigs = db.query(ISOSignature).all()
        total = len(all_sigs)
        handwritten_image_count = sum(1 for s in all_sigs if s.signature_type == "HANDWRITTEN_IMAGE")
        handwritten_draw_count = sum(1 for s in all_sigs if s.signature_type == "HANDWRITTEN_DRAW")
        digital_count = sum(1 for s in all_sigs if s.signature_type == "DIGITAL")
        active_count = sum(1 for s in all_sigs if s.is_active is True)
        inactive_count = total - active_count

        return {
            "total": total,
            "handwritten_image_count": handwritten_image_count,
            "handwritten_draw_count": handwritten_draw_count,
            "digital_count": digital_count,
            "active_count": active_count,
            "inactive_count": inactive_count
        }

    @staticmethod
    def get_signatures_list(
        db: Session,
        keyword: Optional[str] = None,
        signature_type: Optional[str] = "all",
        department: Optional[str] = "all",
        approval_level: Optional[str] = "all",
        is_active: Optional[str] = "all"
    ) -> List[Dict[str, Any]]:
        """Lấy danh sách chữ ký kèm bộ lọc linh hoạt"""
        ISOSignatureService.seed_initial_signatures_if_empty(db)

        query = db.query(ISOSignature)

        if signature_type and signature_type != "all":
            query = query.filter(ISOSignature.signature_type == signature_type)

        if department and department != "all":
            query = query.filter(ISOSignature.department == department)

        if approval_level and approval_level != "all":
            query = query.filter(ISOSignature.approval_level == approval_level)

        if is_active and is_active != "all":
            if is_active.lower() in ["true", "1", "active", "hoat_dong"]:
                query = query.filter(ISOSignature.is_active == True)
            elif is_active.lower() in ["false", "0", "inactive", "tam_khoa"]:
                query = query.filter(ISOSignature.is_active == False)

        items = query.order_by(desc(ISOSignature.id)).all()

        if keyword and keyword.strip():
            kw = keyword.strip().lower()
            items = [
                s for s in items if (
                    kw in (s.full_name or "").lower() or
                    kw in (s.user_code or "").lower() or
                    kw in (s.position or "").lower() or
                    kw in (s.department or "").lower() or
                    kw in (s.digital_cert_provider or "").lower()
                )
            ]

        results = []
        for s in items:
            results.append({
                "id": s.id,
                "user_id": s.user_id,
                "user_code": s.user_code or "",
                "full_name": s.full_name or "",
                "department": s.department or "CHUNG",
                "position": s.position or "",
                "approval_level": s.approval_level or "Cả hai",
                "signature_type": s.signature_type,
                "image_path": s.image_path or "",
                "signature_data": s.signature_data or "",
                "digital_cert_provider": s.digital_cert_provider or "",
                "digital_serial_no": s.digital_serial_no or "",
                "digital_valid_from": s.digital_valid_from or "",
                "digital_valid_to": s.digital_valid_to or "",
                "digital_hash": s.digital_hash or "",
                "is_default": bool(s.is_default),
                "is_active": bool(s.is_active),
                "notes": s.notes or "",
                "created_at": s.created_at or "",
                "updated_at": s.updated_at or s.created_at or ""
            })

        return results

    @staticmethod
    def get_by_id(db: Session, signature_id: int) -> Optional[Dict[str, Any]]:
        s = db.query(ISOSignature).filter(ISOSignature.id == signature_id).first()
        if not s:
            return None
        return {
            "id": s.id,
            "user_id": s.user_id,
            "user_code": s.user_code or "",
            "full_name": s.full_name or "",
            "department": s.department or "CHUNG",
            "position": s.position or "",
            "approval_level": s.approval_level or "Cả hai",
            "signature_type": s.signature_type,
            "image_path": s.image_path or "",
            "signature_data": s.signature_data or "",
            "digital_cert_provider": s.digital_cert_provider or "",
            "digital_serial_no": s.digital_serial_no or "",
            "digital_valid_from": s.digital_valid_from or "",
            "digital_valid_to": s.digital_valid_to or "",
            "digital_hash": s.digital_hash or "",
            "is_default": bool(s.is_default),
            "is_active": bool(s.is_active),
            "notes": s.notes or "",
            "created_at": s.created_at or "",
            "updated_at": s.updated_at or s.created_at or ""
        }

    @staticmethod
    def create_signature(db: Session, payload: ISOSignatureCreate) -> Dict[str, Any]:
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Tự động sinh mã băm xác thực nếu là chữ ký điện tử mà chưa có hash
        dig_hash = payload.digital_hash
        serial = payload.digital_serial_no
        if payload.signature_type == "DIGITAL":
            if not serial:
                serial = f"SF-PKI-{uuid.uuid4().hex[:8].upper()}"
            if not dig_hash:
                raw_token = f"{payload.full_name}:{serial}:{now_str}"
                dig_hash = f"SHA256:{hashlib.sha256(raw_token.encode()).hexdigest()[:32]}..."

        # Nếu đặt là default, reset các default khác của cùng người này
        if payload.is_default and payload.full_name:
            db.query(ISOSignature).filter(ISOSignature.full_name == payload.full_name).update({"is_default": False})

        new_sig = ISOSignature(
            user_id=payload.user_id,
            user_code=payload.user_code or "",
            full_name=payload.full_name.strip(),
            department=payload.department or "CHUNG",
            position=payload.position or "",
            approval_level=payload.approval_level or "Cả hai",
            signature_type=payload.signature_type,
            image_path=payload.image_path or "",
            signature_data=payload.signature_data or "",
            digital_cert_provider=payload.digital_cert_provider or "",
            digital_serial_no=serial or "",
            digital_valid_from=payload.digital_valid_from or "",
            digital_valid_to=payload.digital_valid_to or "",
            digital_hash=dig_hash or "",
            is_default=payload.is_default if payload.is_default is not None else True,
            is_active=payload.is_active if payload.is_active is not None else True,
            notes=payload.notes or "",
            created_at=now_str,
            updated_at=now_str
        )
        db.add(new_sig)
        db.commit()
        db.refresh(new_sig)

        return {
            "success": True,
            "message": f"Đã khởi tạo chữ ký cho '{new_sig.full_name}' thành công!",
            "id": new_sig.id
        }

    @staticmethod
    def update_signature(db: Session, signature_id: int, payload: ISOSignatureUpdate) -> Dict[str, Any]:
        sig = db.query(ISOSignature).filter(ISOSignature.id == signature_id).first()
        if not sig:
            raise ValueError(f"Không tìm thấy chữ ký ID #{signature_id}")

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(sig, key, value)

        sig.updated_at = now_str
        db.commit()
        db.refresh(sig)

        return {
            "success": True,
            "message": f"Đã cập nhật thông tin chữ ký '{sig.full_name}' thành công!",
            "id": sig.id
        }

    @staticmethod
    def toggle_status(db: Session, signature_id: int) -> Dict[str, Any]:
        sig = db.query(ISOSignature).filter(ISOSignature.id == signature_id).first()
        if not sig:
            raise ValueError(f"Không tìm thấy chữ ký ID #{signature_id}")

        sig.is_active = not bool(sig.is_active)
        sig.updated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        db.commit()

        status_text = "Đang sử dụng" if sig.is_active else "Tạm khóa"
        return {
            "success": True,
            "message": f"Đã chuyển trạng thái chữ ký của '{sig.full_name}' sang '{status_text}'",
            "is_active": sig.is_active
        }

    @staticmethod
    def delete_signature(db: Session, signature_id: int) -> Dict[str, Any]:
        sig = db.query(ISOSignature).filter(ISOSignature.id == signature_id).first()
        if not sig:
            raise ValueError(f"Không tìm thấy chữ ký ID #{signature_id}")

        name = sig.full_name
        db.delete(sig)
        db.commit()

        return {
            "success": True,
            "message": f"Đã xóa thành công chữ ký của '{name}'"
        }
