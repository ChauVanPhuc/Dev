# -*- coding: utf-8 -*-
import json
import logging
import re
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.modules.claim.models import CustomerClaim
from app.modules.claim.schemas import CustomerClaimCreate, CustomerClaimUpdate

logger = logging.getLogger("claim_service")

def parse_period_sort_key(c):
    p = str(c.period or '').strip()
    m1 = re.match(r'^(\d{1,2})[-/](\d{4})$', p)
    if m1:
        return (int(m1.group(2)), int(m1.group(1)), c.created_at or datetime.min, c.id or 0)
    m2 = re.match(r'^(\d{4})[-/](\d{1,2})$', p)
    if m2:
        return (int(m2.group(1)), int(m2.group(2)), c.created_at or datetime.min, c.id or 0)
    return (0, 0, c.created_at or datetime.min, c.id or 0)

def get_claims(db: Session, skip: int = 0, limit: int = 10000, search: str = None, status: str = None, year: int = None):
    query = db.query(CustomerClaim)
    if status:
        query = query.filter(CustomerClaim.status == status)
    if year:
        query = query.filter(CustomerClaim.period.like(f"%-{year}"))
    if search:
        query = query.filter(
            or_(
                CustomerClaim.claim_code.like(f"%{search}%"),
                CustomerClaim.product_name.like(f"%{search}%"),
                CustomerClaim.order_code.like(f"%{search}%"),
                CustomerClaim.company_error_code.like(f"%{search}%"),
                CustomerClaim.description.like(f"%{search}%"),
                CustomerClaim.lpn.like(f"%{search}%"),
                CustomerClaim.container_no.like(f"%{search}%")
            )
        )
    total = query.count()
    items = query.all()
    items.sort(key=parse_period_sort_key, reverse=True)
    if skip or limit < 10000:
        items = items[skip:skip+limit]
    return items, total

def get_claim_by_id(db: Session, claim_id: int):
    return db.query(CustomerClaim).filter(CustomerClaim.id == claim_id).first()

def get_claim_by_code(db: Session, claim_code: str):
    return db.query(CustomerClaim).filter(CustomerClaim.claim_code == claim_code).first()

def create_claim(db: Session, claim: CustomerClaimCreate):
    img_paths = json.dumps(claim.image_paths) if claim.image_paths else None
    img_caps = json.dumps(claim.image_captions) if claim.image_captions else None
    
    db_claim = CustomerClaim(
        claim_code=claim.claim_code,
        customer_name=claim.customer_name or "Atlas",
        product_name=claim.product_name,
        order_code=claim.order_code,
        company_error_code=claim.company_error_code,
        description=claim.description,
        severity=claim.severity or "Medium",
        status=claim.status or "Received",
        lpn=claim.lpn,
        container_no=claim.container_no,
        action=claim.action,
        period=claim.period,
        image_paths=img_paths,
        image_captions=img_caps
    )
    db.add(db_claim)
    db.commit()
    db.refresh(db_claim)
    return db_claim

def update_claim(db: Session, claim_id: int, claim_data: CustomerClaimUpdate):
    db_claim = get_claim_by_id(db, claim_id)
    if not db_claim:
        return None
        
    update_dict = claim_data.model_dump(exclude_unset=True)
    if "image_paths" in update_dict and update_dict["image_paths"] is not None:
        update_dict["image_paths"] = json.dumps(update_dict["image_paths"])
    if "image_captions" in update_dict and update_dict["image_captions"] is not None:
        update_dict["image_captions"] = json.dumps(update_dict["image_captions"])
        
    for key, value in update_dict.items():
        if value is None and key in ["customer_name", "order_code", "company_error_code", "description"]:
            value = ""
        setattr(db_claim, key, value)
        
    db.commit()
    db.refresh(db_claim)
    return db_claim

def clean_claim_input_archives_if_empty(db: Session):
    """
    If all CustomerClaim records in SQL database have been deleted (remaining == 0),
    clean up all input archive files in Data/input/claims/pdf/claim_info/ and Data/input/claims/excel/.
    """
    try:
        remaining_count = db.query(CustomerClaim).count()
        if remaining_count == 0:
            from app.core.path_manager import CLAIMS_CLAIM_INFO_PDF, CLAIMS_INPUT_EXCEL
            
            # Clean claim_info PDF inputs
            if CLAIMS_CLAIM_INFO_PDF.exists():
                for f in CLAIMS_CLAIM_INFO_PDF.iterdir():
                    if f.is_file():
                        try:
                            f.unlink()
                        except Exception as e:
                            logger.warning(f"Could not remove input file {f}: {e}")

            # Clean claim Excel inputs
            if CLAIMS_INPUT_EXCEL.exists():
                for f in CLAIMS_INPUT_EXCEL.iterdir():
                    if f.is_file():
                        try:
                            f.unlink()
                        except Exception as e:
                            logger.warning(f"Could not remove input file {f}: {e}")

            logger.info("✓ Cleaned Data/input/claims archive files because all claims were deleted.")
    except Exception as err:
        logger.error(f"Error checking and cleaning claim input archives: {err}")

def delete_claim(db: Session, claim_id: int):
    db_claim = get_claim_by_id(db, claim_id)
    if not db_claim:
        return False
    db.delete(db_claim)
    db.commit()
    
    # Auto-clean input archive files if all claim records are deleted
    clean_claim_input_archives_if_empty(db)
    return True
