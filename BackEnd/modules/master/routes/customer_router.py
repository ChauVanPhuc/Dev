from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from config.database import get_db
from modules.master.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from modules.master.controllers import customer_controller

router = APIRouter()

@router.get("/")
def read_customers(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách khách hàng có hỗ trợ tìm kiếm và phân trang.
    """
    return customer_controller.get_customers(db, skip=skip, limit=limit, search=search)

@router.get("/{customer_id}", response_model=CustomerResponse)
def read_customer(customer_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy thông tin chi tiết khách hàng theo ID.
    """
    customer = customer_controller.get_customer_by_id(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin khách hàng")
    return customer

@router.post("/", response_model=CustomerResponse)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới khách hàng.
    """
    existing = customer_controller.get_customer_by_code(db, customer.code)
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã khách hàng '{customer.code}' đã tồn tại")
    return customer_controller.create_customer(db, customer)

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, customer: CustomerUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin khách hàng.
    """
    updated = customer_controller.update_customer(db, customer_id, customer)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin khách hàng để cập nhật")
    return updated

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa khách hàng.
    """
    success = customer_controller.delete_customer(db, customer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin khách hàng để xóa")
    return {"message": "Xóa thông tin khách hàng thành công"}
