# -*- coding: utf-8 -*-
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models.pallet_check_model import PalletCheckContainer, PalletCheckRecord
from ..schemas.pallet_check_schema import ContainerCreatePayload

class PalletCheckController:
    @staticmethod
    def save_container(payload: ContainerCreatePayload, db: Session) -> Dict[str, Any]:
        """
        Lưu hoặc cập nhật một hồ sơ Container kiểm tra kèm toàn bộ Pallet vào CSDL.
        """
        # Kiểm tra xem Container đã tồn tại chưa, nếu có thì xóa cũ để ghi đè phiên bản mới
        existing = db.query(PalletCheckContainer).filter(PalletCheckContainer.id == payload.id).first()
        if existing:
            db.delete(existing)
            db.flush()

        audit_res = payload.auditResult or {}
        is_valid = audit_res.get("isValid", True) if isinstance(audit_res, dict) else True

        total_scans = 0
        total_boxes = 0

        new_container = PalletCheckContainer(
            id=payload.id,
            name=payload.name,
            inspector=payload.inspector or "Nguyễn A",
            status=payload.status or "completed",
            is_valid=is_valid,
            total_pallets=len(payload.pallets or []),
            audit_result=json.dumps(audit_res, ensure_ascii=False) if audit_res else None,
            completed_at=payload.completedAt or datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            created_at=datetime.utcnow()
        )
        db.add(new_container)
        db.flush()

        # Tạo từng Pallet con
        for p in (payload.pallets or []):
            st_data = p.standing or {}
            rf_data = p.roof or {}

            st_skus = st_data.get("skus", [])
            st_lpns = st_data.get("lpns", [])
            rf_skus = rf_data.get("skus", [])
            rf_lpns = rf_data.get("lpns", [])

            p_scans = (p.totalScans or 0) or (len(st_skus) + len(st_lpns) + len(rf_skus) + len(rf_lpns))
            total_scans += p_scans

            st_count = len(st_skus)
            rf_count = len(rf_skus)
            p_boxes = round((st_count + rf_count) / 2) or (len(st_lpns) + len(rf_lpns)) or 5
            total_boxes += p_boxes

            pallet_record = PalletCheckRecord(
                id=p.palletId,
                container_id=new_container.id,
                pallet_index=p.palletIndex,
                status=p.status or "pass",
                has_roof=bool(rf_data.get("hasRoof")) or (len(rf_skus) > 0 or len(rf_lpns) > 0),
                standing_standard_sku=st_data.get("standardSku"),
                standing_standard_lpn=st_data.get("standardLpn"),
                standing_skus_count=len(st_skus),
                standing_lpns_count=len(st_lpns),
                standing_data=json.dumps(st_data, ensure_ascii=False),
                roof_standard_sku=rf_data.get("standardSku"),
                roof_standard_lpn=rf_data.get("standardLpn"),
                roof_skus_count=len(rf_skus),
                roof_lpns_count=len(rf_lpns),
                roof_data=json.dumps(rf_data, ensure_ascii=False),
                total_scans=p_scans,
                timestamp_str=p.timestamp or datetime.now().strftime("%H:%M:%S"),
                created_at=datetime.utcnow()
            )
            db.add(pallet_record)

        new_container.total_scans = total_scans
        new_container.total_boxes = total_boxes
        db.commit()
        db.refresh(new_container)

        return PalletCheckController._format_container(new_container)

    @staticmethod
    def get_containers(db: Session, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Lấy danh sách Container đã kiểm tra theo thứ tự mới nhất.
        """
        containers = db.query(PalletCheckContainer).order_by(PalletCheckContainer.created_at.desc()).limit(limit).all()
        return [PalletCheckController._format_container(c) for c in containers]

    @staticmethod
    def get_container(container_id: str, db: Session) -> Optional[Dict[str, Any]]:
        """
        Lấy chi tiết một Container.
        """
        c = db.query(PalletCheckContainer).filter(PalletCheckContainer.id == container_id).first()
        if not c:
            return None
        return PalletCheckController._format_container(c)

    @staticmethod
    def delete_container(container_id: str, db: Session) -> bool:
        """
        Xóa một Container và toàn bộ các Pallet liên quan.
        """
        c = db.query(PalletCheckContainer).filter(PalletCheckContainer.id == container_id).first()
        if not c:
            return False
        db.delete(c)
        db.commit()
        return True

    @staticmethod
    def _format_container(c: PalletCheckContainer) -> Dict[str, Any]:
        """
        Chuyển đổi ORM Model thành JSON object tương thích 100% với Frontend Mobile & Web.
        """
        audit_res = None
        if c.audit_result:
            try:
                audit_res = json.loads(c.audit_result)
            except Exception:
                pass

        pallets_list = []
        for p in (c.pallets or []):
            st_data = {}
            if p.standing_data:
                try:
                    st_data = json.loads(p.standing_data)
                except Exception:
                    pass

            rf_data = {}
            if p.roof_data:
                try:
                    rf_data = json.loads(p.roof_data)
                except Exception:
                    pass

            pallets_list.append({
                "palletIndex": p.pallet_index,
                "palletId": p.id,
                "status": p.status,
                "timestamp": p.timestamp_str,
                "standing": st_data,
                "roof": rf_data,
                "totalScans": p.total_scans
            })

        return {
            "id": c.id,
            "name": c.name,
            "inspector": c.inspector or "Nguyễn A",
            "status": c.status,
            "isValid": c.is_valid,
            "completedAt": c.completed_at or (c.created_at.strftime("%d/%m/%Y %H:%M:%S") if c.created_at else None),
            "createdAt": c.created_at.strftime("%d/%m/%Y %H:%M:%S") if c.created_at else None,
            "totalPallets": c.total_pallets,
            "totalBoxes": c.total_boxes,
            "totalScans": c.total_scans,
            "auditResult": audit_res,
            "pallets": pallets_list
        }

