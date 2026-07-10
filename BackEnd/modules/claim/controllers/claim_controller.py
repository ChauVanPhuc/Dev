# -*- coding: utf-8 -*-
import json
import logging
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from datetime import datetime
from modules.claim.models.claim_models import CustomerClaim, CabinetPrice, ContainerShipment
from modules.claim.schemas.claim_schemas import CustomerClaimCreate, CustomerClaimUpdate, CabinetPriceCreate, CabinetPriceUpdate, ContainerShipmentCreate, ContainerShipmentUpdate

logger = logging.getLogger("claim_controller")

# --- CUSTOMER CLAIM CONTROLLER ---
def get_claims(db: Session, skip: int = 0, limit: int = 10000, search: str = None, status: str = None, year: int = None):
    query = db.query(CustomerClaim)
    if status:
        query = query.filter(CustomerClaim.status == status)
    if year:
        # Filter by year in period field (format: MM-YYYY)
        query = query.filter(CustomerClaim.period.like(f"%-{year}"))
    if search:
        query = query.filter(
            or_(
                CustomerClaim.claim_code.like(f"%{search}%"),
                CustomerClaim.customer_name.like(f"%{search}%"),
                CustomerClaim.product_name.like(f"%{search}%"),
                CustomerClaim.order_code.like(f"%{search}%"),
                CustomerClaim.lpn.like(f"%{search}%"),
                CustomerClaim.container_no.like(f"%{search}%")
            )
        )
    total = query.count()
    items = query.order_by(desc(CustomerClaim.id)).offset(skip).limit(limit).all()
    return items, total

def get_claim_by_id(db: Session, claim_id: int):
    item = db.query(CustomerClaim).filter(CustomerClaim.id == claim_id).first()
    return item


def create_claim(db: Session, claim: CustomerClaimCreate):
    # Check for duplicate claim_code BEFORE inserting to avoid IntegrityError
    if claim.claim_code:
        existing = db.query(CustomerClaim).filter(
            CustomerClaim.claim_code == claim.claim_code
        ).first()
        if existing:
            # Self-healing: if the existing record doesn't have image paths, but the new claim does, update it
            has_existing_images = existing.image_paths and existing.image_paths not in ("[]", "")
            if not has_existing_images and claim.image_paths:
                img_paths = claim.image_paths
                if isinstance(img_paths, list):
                    img_paths = json.dumps(img_paths)
                img_caps = claim.image_captions
                if isinstance(img_caps, list):
                    img_caps = json.dumps(img_caps)
                
                existing.image_paths = img_paths
                existing.image_captions = img_caps
                db.commit()
                db.refresh(existing)
                logger.info(f"Updated existing claim {claim.claim_code} with new image paths")
            else:
                logger.info(f"Claim code {claim.claim_code} already exists in DB - skipping insert")
            return existing  # Return updated/existing record


    # Prepare image fields as JSON strings
    img_paths = claim.image_paths
    if isinstance(img_paths, list):
        img_paths = json.dumps(img_paths)
    
    img_caps = claim.image_captions
    if isinstance(img_caps, list):
        img_caps = json.dumps(img_caps)

    db_claim = CustomerClaim(
        claim_code=claim.claim_code,
        customer_name=claim.customer_name or "",
        product_name=claim.product_name,
        order_code=claim.order_code or "",
        company_error_code=claim.company_error_code or "",
        description=claim.description or "",
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
    logger.info(f"Successfully inserted claim with code {claim.claim_code}")
    return db_claim

def update_claim(db: Session, claim_id: int, claim_data: CustomerClaimUpdate):
    db_claim = db.query(CustomerClaim).filter(CustomerClaim.id == claim_id).first()
    if not db_claim:
        return None
    
    update_dict = claim_data.model_dump(exclude_unset=True)
    
    # Nếu đổi trạng thái thành "Resolved", tự động set resolved_at
    if "status" in update_dict and update_dict["status"] == "Resolved" and db_claim.status != "Resolved":
        db_claim.resolved_at = datetime.now()
    elif "status" in update_dict and update_dict["status"] != "Resolved":
        db_claim.resolved_at = None

    for key, value in update_dict.items():
        if value is None and key in ["customer_name", "order_code", "company_error_code", "description"]:
            value = ""
        
        # Handle list serialization
        if key in ["image_paths", "image_captions"] and isinstance(value, list):
            value = json.dumps(value)
            
        setattr(db_claim, key, value)
        
    db.commit()
    db.refresh(db_claim)
    return db_claim

def delete_claim(db: Session, claim_id: int):
    db_claim = get_claim_by_id(db, claim_id)
    if not db_claim:
        return False
    db.delete(db_claim)
    db.commit()
    return True


# --- CABINET PRICE CONTROLLER ---
def get_cabinet_prices(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(CabinetPrice)
    if search:
        query = query.filter(
            or_(
                CabinetPrice.cabinet_code.like(f"%{search}%"),
                CabinetPrice.cabinet_name.like(f"%{search}%"),
                CabinetPrice.material.like(f"%{search}%")
            )
        )
    total = query.count()
    items = query.order_by(CabinetPrice.cabinet_code).offset(skip).limit(limit).all()
    return items, total

def get_cabinet_price_by_id(db: Session, price_id: int):
    return db.query(CabinetPrice).filter(CabinetPrice.id == price_id).first()

def create_cabinet_price(db: Session, price: CabinetPriceCreate):
    db_price = CabinetPrice(
        cabinet_code=price.cabinet_code,
        cabinet_name=price.cabinet_name,
        material=price.material or "",
        dimensions=price.dimensions or "",
        base_price=price.base_price,
        sale_price=price.sale_price,
        status=price.status or "Active"
    )
    db.add(db_price)
    db.commit()
    db.refresh(db_price)
    return db_price

def update_cabinet_price(db: Session, price_id: int, price_data: CabinetPriceUpdate):
    db_price = get_cabinet_price_by_id(db, price_id)
    if not db_price:
        return None
    
    update_dict = price_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is None and key in ["material", "dimensions"]:
            value = ""
        setattr(db_price, key, value)
        
    db.commit()
    db.refresh(db_price)
    return db_price

def delete_cabinet_price(db: Session, price_id: int):
    db_price = get_cabinet_price_by_id(db, price_id)
    if not db_price:
        return False
    db.delete(db_price)
    db.commit()
    return True


# --- CONTAINER SHIPMENT CONTROLLER ---
def get_shipments(db: Session, skip: int = 0, limit: int = 100, search: str = None, status: str = None):
    query = db.query(ContainerShipment)
    if status:
        query = query.filter(ContainerShipment.status == status)
    if search:
        query = query.filter(
            or_(
                ContainerShipment.shipment_code.like(f"%{search}%"),
                ContainerShipment.container_number.like(f"%{search}%"),
                ContainerShipment.seal_number.like(f"%{search}%"),
                ContainerShipment.destination_port.like(f"%{search}%")
            )
        )
    total = query.count()
    items = query.order_by(desc(ContainerShipment.created_at)).offset(skip).limit(limit).all()
    return items, total

def get_shipment_by_id(db: Session, shipment_id: int):
    return db.query(ContainerShipment).filter(ContainerShipment.id == shipment_id).first()

def create_shipment(db: Session, shipment: ContainerShipmentCreate):
    db_shipment = ContainerShipment(
        shipment_code=shipment.shipment_code,
        container_number=shipment.container_number,
        seal_number=shipment.seal_number or "",
        destination_port=shipment.destination_port,
        etd=shipment.etd,
        eta=shipment.eta,
        status=shipment.status or "Draft",
        total_value=shipment.total_value or 0.0
    )
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

def update_shipment(db: Session, shipment_id: int, shipment_data: ContainerShipmentUpdate):
    db_shipment = get_shipment_by_id(db, shipment_id)
    if not db_shipment:
        return None
    
    update_dict = shipment_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is None and key in ["seal_number"]:
            value = ""
        setattr(db_shipment, key, value)
        
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

def delete_shipment(db: Session, shipment_id: int):
    db_shipment = get_shipment_by_id(db, shipment_id)
    if not db_shipment:
        return False
    db.delete(db_shipment)
    db.commit()
    return True

# Defect controller functions removed - using inspection module's ClientDefect instead
