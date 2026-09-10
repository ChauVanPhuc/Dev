# -*- coding: utf-8 -*-
"""
Daily JSON Backup Manager for SmartFlow Quản lý Claim.
Exports database snapshots to Data/backup/DDMMYYYY/ on backend startup.
Uses atomic JSON writes (*.tmp.json -> validate -> replace) and is fault-tolerant.
"""

import json
import logging
from datetime import datetime, date, time
from decimal import Decimal
from uuid import UUID
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session
from app.core.path_manager import BACKUP_ROOT

logger = logging.getLogger("backup_service")
logger.setLevel(logging.INFO)

class CustomJSONEncoder(json.JSONEncoder):
    """
    JSON encoder supporting SQL Server datatypes: datetime, date, time, Decimal, UUID, None.
    """
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date, time)):
            return obj.isoformat()
        if isinstance(obj, (Decimal, UUID)):
            return str(obj)
        try:
            return super().default(obj)
        except TypeError:
            return str(obj)

def write_atomic_json(target_path: Path, data: Any):
    """
    Atomically writes JSON data to target_path using a temporary file.
    Validates written content before replacing target file.
    """
    temp_path = target_path.with_name(f"{target_path.name}.tmp")
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, cls=CustomJSONEncoder)
            f.flush()
            
        # Validate written JSON syntax
        with open(temp_path, "r", encoding="utf-8") as f:
            json.load(f)
            
        # Atomic replace
        temp_path.replace(target_path)
    except Exception as e:
        logger.error(f"Failed atomic write for {target_path}: {e}")
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass
        raise e

def run_daily_backup(db: Session):
    """
    Runs daily backup of SQL Server database to JSON files inside Data/backup/DDMMYYYY/.
    Fault-tolerant: failures are logged without interrupting application startup.
    """
    try:
        today_str = datetime.now().strftime("%d%m%Y")
        daily_backup_dir = BACKUP_ROOT / today_str
        daily_backup_dir.mkdir(parents=True, exist_ok=True)
        
        # 1. Backup error_codes (Defect Types, Client Defects, Defect Glossaries)
        try:
            from app.modules.defect.models import DefectType, ClientDefect, DefectGlossary
            
            defect_types = [
                {
                    "id": d.id,
                    "code": d.code,
                    "name": d.name,
                    "category": d.category,
                    "stage": d.stage,
                    "description": d.description,
                    "aql_class": d.aql_class,
                    "needs_tracking": d.needs_tracking,
                    "qc_tracking": d.qc_tracking,
                    "is_active": d.is_active
                }
                for d in db.query(DefectType).all()
            ]
            
            client_defects = [
                {
                    "id": c.id,
                    "code": c.code,
                    "name": c.name,
                    "name_en": c.name_en,
                    "minor_criteria": c.minor_criteria,
                    "major_criteria": c.major_criteria,
                    "critical_criteria": c.critical_criteria,
                    "detection_method": c.detection_method,
                    "g7_code": c.g7_code,
                    "defect_type_id": c.defect_type_id,
                    "is_active": c.is_active
                }
                for c in db.query(ClientDefect).all()
            ]
            
            defect_glossaries = [
                {
                    "id": g.id,
                    "source": g.source,
                    "code": g.code,
                    "description": g.description
                }
                for g in db.query(DefectGlossary).all()
            ]
            
            error_codes_data = {
                "backup_at": datetime.now().isoformat(),
                "defect_types": defect_types,
                "client_defects": client_defects,
                "defect_glossaries": defect_glossaries
            }
            write_atomic_json(daily_backup_dir / "error_codes.json", error_codes_data)
        except Exception as err:
            logger.error(f"Error backing up error_codes.json: {err}")

        # 2. Backup claims (Customer Claims)
        try:
            from app.modules.claim.models import CustomerClaim
            
            claims_list = [
                {
                    "id": c.id,
                    "claim_code": c.claim_code,
                    "customer_name": c.customer_name,
                    "product_name": c.product_name,
                    "order_code": c.order_code,
                    "company_error_code": c.company_error_code,
                    "description": c.description,
                    "severity": c.severity,
                    "status": c.status,
                    "lpn": c.lpn,
                    "container_no": c.container_no,
                    "action": c.action,
                    "period": c.period,
                    "image_paths": c.image_paths,
                    "image_captions": c.image_captions,
                    "created_at": c.created_at,
                    "resolved_at": c.resolved_at
                }
                for c in db.query(CustomerClaim).all()
            ]
            
            claims_data = {
                "backup_at": datetime.now().isoformat(),
                "customer_claims": claims_list
            }
            write_atomic_json(daily_backup_dir / "claims.json", claims_data)
        except Exception as err:
            logger.error(f"Error backing up claims.json: {err}")

        # 3. Backup cabinet_prices (Cabinet Unit Prices)
        try:
            from app.modules.price.models import CabinetPrice
            
            prices_list = [
                {
                    "id": p.id,
                    "cabinet_code": p.cabinet_code,
                    "cabinet_name": p.cabinet_name,
                    "material": p.material,
                    "dimensions": p.dimensions,
                    "base_price": p.base_price,
                    "sale_price": p.sale_price,
                    "status": p.status,
                    "last_updated": p.last_updated
                }
                for p in db.query(CabinetPrice).all()
            ]
            
            cabinet_prices_data = {
                "backup_at": datetime.now().isoformat(),
                "cabinet_prices": prices_list
            }
            write_atomic_json(daily_backup_dir / "cabinet_prices.json", cabinet_prices_data)
        except Exception as err:
            logger.error(f"Error backing up cabinet_prices.json: {err}")

        logger.info(f"Successfully completed daily JSON database backup in {daily_backup_dir}")
    except Exception as top_err:
        logger.error(f"Daily backup encountered top-level error: {top_err}")
