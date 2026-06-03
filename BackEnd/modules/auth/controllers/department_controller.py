from sqlalchemy.orm import Session
from modules.auth.models.departments import Department
from modules.auth.schemas.departments import DepartmentCreate

from sqlalchemy.orm import Session
from modules.auth.models.departments import Department
from modules.auth.schemas.departments import DepartmentCreate

def get_departments(db: Session, skip: int = 0, limit: int = 100):
    """
    Lấy danh sách thông tin phân bổ nhân viên vào các bộ phận/vai trò/công đoạn.
    
    Hàm này truy vấn bảng Department - bảng trung gian kết nối giữa 
    Tài khoản (Account), Vai trò (Role), Quyền hạn (Permission) và Công đoạn (Stage).
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        skip: Số lượng bản ghi bỏ qua (phân trang).
        limit: Số lượng bản ghi tối đa lấy về.
        
    Returns:
        List[Department]: Danh sách các bản ghi phân bổ bộ phận.
    """
    return db.query(Department).order_by(Department.id).offset(skip).limit(limit).all()

def create_department(db: Session, department: DepartmentCreate):
    """
    Tạo mới một bản ghi phân bổ bộ phận cho nhân viên.
    
    Được sử dụng khi gán vai trò hoặc công đoạn sản xuất cho một tài khoản cụ thể.
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        department: Dữ liệu phân bổ (account_id, role_id, stage_id...).
        
    Returns:
        Department: Bản ghi phân bổ vừa tạo.
    """
    db_dept = Department(**department.model_dump())
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept
