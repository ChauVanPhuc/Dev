# -*- coding: utf-8 -*-
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from ..models.pallet_check_model import PalletCheckContainer, PalletCheckRecord
from ..schemas.pallet_check_schema import ContainerCreatePayload, ContainerUpdatePayload

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

        inspector_name = (payload.inspector or "").strip()
        if not inspector_name or inspector_name == "Nguyễn A":
            inspector_name = payload.inspector or "Chưa xác định"

        new_container = PalletCheckContainer(
            id=payload.id,
            name=payload.name,
            inspector=inspector_name,
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

            # Đảm bảo mã Pallet ID là duy nhất toàn cục tránh lỗi đụng độ Primary Key
            raw_pallet_id = (p.palletId or '').strip()
            if not raw_pallet_id:
                unique_pallet_id = f"PL-{new_container.id}-P{p.palletIndex:02d}"
            elif new_container.id in raw_pallet_id:
                unique_pallet_id = raw_pallet_id
            else:
                unique_pallet_id = f"{new_container.id}_{raw_pallet_id}"

            pallet_record = PalletCheckRecord(
                id=unique_pallet_id,
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
    def update_container(container_id: str, payload: ContainerUpdatePayload, db: Session) -> Optional[Dict[str, Any]]:
        """
        Cập nhật thông tin Container và danh sách Pallet trong CSDL SQL Server (Admin).
        """
        cont = db.query(PalletCheckContainer).filter(PalletCheckContainer.id == container_id).first()
        if not cont:
            return None

        if payload.name is not None:
            cont.name = payload.name
        if payload.inspector is not None:
            cont.inspector = payload.inspector
        if payload.status is not None:
            cont.status = payload.status
        if payload.completedAt is not None:
            cont.completed_at = payload.completedAt

        if payload.auditResult is not None:
            cont.audit_result = json.dumps(payload.auditResult, ensure_ascii=False)
            if isinstance(payload.auditResult, dict) and "isValid" in payload.auditResult:
                cont.is_valid = bool(payload.auditResult["isValid"])

        # Cập nhật danh sách Pallets nếu được truyền lên
        if payload.pallets is not None:
            # Xóa các Pallet cũ của container
            db.query(PalletCheckRecord).filter(PalletCheckRecord.container_id == container_id).delete(synchronize_session=False)
            db.flush()

            total_scans = 0
            total_boxes = 0

            for p in payload.pallets:
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

                raw_pallet_id = (p.palletId or '').strip()
                if not raw_pallet_id:
                    unique_pallet_id = f"PL-{cont.id}-P{p.palletIndex:02d}"
                elif cont.id in raw_pallet_id:
                    unique_pallet_id = raw_pallet_id
                else:
                    unique_pallet_id = f"{cont.id}_{raw_pallet_id}"

                pallet_record = PalletCheckRecord(
                    id=unique_pallet_id,
                    container_id=cont.id,
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

            cont.total_pallets = len(payload.pallets)
            cont.total_scans = total_scans
            cont.total_boxes = total_boxes

        cont.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(cont)
        return PalletCheckController._format_container(cont)

    @staticmethod
    def get_containers(
        db: Session, 
        limit: int = 100,
        page: Optional[int] = None,
        page_size: Optional[int] = None,
        search: Optional[str] = None,
        status: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Lấy danh sách Container đã kiểm tra theo thứ tự mới nhất (kèm tổng số lượng).
        Hỗ trợ phân trang qua page và page_size, tìm kiếm theo tên/mã/người kiểm, và lọc theo trạng thái hợp lệ.
        """
        query = db.query(PalletCheckContainer)

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    PalletCheckContainer.name.ilike(term),
                    PalletCheckContainer.id.ilike(term),
                    PalletCheckContainer.inspector.ilike(term)
                )
            )

        if status and status.strip():
            s = status.strip().lower()
            if s == "valid":
                query = query.filter(PalletCheckContainer.is_valid == True)
            elif s in ("invalid", "warning", "error"):
                query = query.filter(PalletCheckContainer.is_valid == False)
            elif s == "completed":
                query = query.filter(PalletCheckContainer.status == "completed")

        total_count = query.count()
        query = query.order_by(PalletCheckContainer.created_at.desc())
        if page is not None and page_size is not None and page > 0 and page_size > 0:
            offset = (page - 1) * page_size
            containers = query.offset(offset).limit(page_size).all()
        else:
            containers = query.limit(limit).all()
        return [PalletCheckController._format_container(c) for c in containers], total_count

    @staticmethod
    def get_stats(db: Session) -> Dict[str, Any]:
        """
        Thống kê tổng quan dữ liệu Quét Container phục vụ 4 thẻ KPI Dashboard Web.
        """
        total_containers = db.query(PalletCheckContainer).count()
        valid_containers = db.query(PalletCheckContainer).filter(PalletCheckContainer.is_valid == True).count()
        warning_containers = db.query(PalletCheckContainer).filter(PalletCheckContainer.is_valid == False).count()

        totals = db.query(
            func.coalesce(func.sum(PalletCheckContainer.total_pallets), 0),
            func.coalesce(func.sum(PalletCheckContainer.total_boxes), 0),
            func.coalesce(func.sum(PalletCheckContainer.total_scans), 0)
        ).first()

        total_pallets = int(totals[0]) if totals else 0
        total_boxes = int(totals[1]) if totals else 0
        total_scans = int(totals[2]) if totals else 0

        return {
            "totalContainers": total_containers,
            "validContainers": valid_containers,
            "warningContainers": warning_containers,
            "totalPallets": total_pallets,
            "totalBoxes": total_boxes,
            "totalScans": total_scans
        }

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
