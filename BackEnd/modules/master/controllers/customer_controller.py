from sqlalchemy.orm import Session
from sqlalchemy import or_
from modules.master.models.customer import Customer
from modules.master.schemas.customer import CustomerCreate, CustomerUpdate

def get_customers(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(Customer)
    if search:
        search_like = f"%{search}%"
        query = query.filter(
            or_(
                Customer.code.like(search_like),
                Customer.name.like(search_like),
                Customer.contact_person.like(search_like),
                Customer.phone.like(search_like),
                Customer.tax_code.like(search_like)
            )
        )
    total = query.count()
    items = query.order_by(Customer.id.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total}

def get_customer_by_id(db: Session, customer_id: int):
    return db.query(Customer).filter(Customer.id == customer_id).first()

def get_customer_by_code(db: Session, code: str):
    return db.query(Customer).filter(Customer.code == code).first()

def create_customer(db: Session, customer: CustomerCreate):
    db_customer = Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def update_customer(db: Session, customer_id: int, customer: CustomerUpdate):
    db_customer = get_customer_by_id(db, customer_id)
    if not db_customer:
        return None
    update_data = customer.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_customer, key, value)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def delete_customer(db: Session, customer_id: int):
    db_customer = get_customer_by_id(db, customer_id)
    if not db_customer:
        return False
    db.delete(db_customer)
    db.commit()
    return True
