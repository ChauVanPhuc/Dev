from sqlalchemy.orm import Session
from modules.auth.models.accounts import Account
from modules.auth.models.departments import Department
from modules.auth.models.role import Role
from modules.production.models.stages import Stage
from modules.auth.schemas.accounts import AccountCreate, AccountUpdate
from config.security import get_password_hash

def get_accounts(db: Session, skip: int = 0, limit: int = 10, search: str = None,
                 status: str = None, sort_by: str = "id", sort_dir: str = "desc"):
    """
    Lấy danh sách tài khoản người dùng kèm theo thông tin Vai trò (Role) và Công đoạn (Stage).
    
    Phạm vi thực hiện:
    - Sử dụng SQL JOIN (Outer join) để kết nối bảng Account với Department, Role và Stage.
    - Hỗ trợ các tính năng bổ trợ:
        + Phân trang (skip, limit).
        + Tìm kiếm theo nội dung (Họ tên hoặc Mã nhân viên).
        + Lọc theo trạng thái (status).
        + Sắp xếp động theo các cột (id, full_name, employee_id, v.v.).

    Args:
        db: Kết nối cơ sở dữ liệu (SQLAlchemy Session).
        skip: Số lượng bản ghi cần bỏ qua (phục vụ phân trang).
        limit: Số lượng bản ghi tối đa lấy về.
        search: Từ khóa tìm kiếm.
        status: Trạng thái tài khoản cần lọc.
        sort_by: Tên cột cần sắp xếp.
        sort_dir: Hướng sắp xếp (asc/desc).

    Returns:
        tuple: (Danh sách các dict chứa thông tin tài khoản đầy đủ, Tổng số bản ghi thỏa điều kiện).
    """
    query = db.query(Account)

    # Lọc theo từ khóa tìm kiếm (tên hoặc mã nhân viên) - sử dụng ILIKE để không phân biệt hoa thường
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Account.full_name.ilike(search_pattern)) |
            (Account.employee_id.ilike(search_pattern))
        )

    # Lọc theo trạng thái tài khoản (ví dụ: Active, Inactive)
    if status:
        query = query.filter(Account.status == status)

    # Sắp xếp theo cột được chọn từ client
    sort_column_map = {
        "id": Account.id,
        "full_name": Account.full_name,
        "employee_id": Account.employee_id,
        "created_at": Account.created_at,
        "status": Account.status,
    }
    sort_col = sort_column_map.get(sort_by, Account.id)
    if sort_dir == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    # Tính tổng số bản ghi trước khi phân trang
    total = query.count()
    # Lấy dữ liệu thực tế theo giới hạn skip/limit
    accounts = query.offset(skip).limit(limit).all()

    # Chuyển đổi kết quả thành danh sách các dictionary dễ xử lý ở frontend, bổ sung role_name và stage_name từ bảng liên kết Department
    items = []
    for account in accounts:
        acc_dict = {c.name: getattr(account, c.name) for c in account.__table__.columns}
        
        # Lấy danh sách liên kết Department
        depts = db.query(Department).filter(Department.account_id == account.id).all()
        
        role_names = []
        stage_names = []
        for dept in depts:
            if dept.role_id:
                role = db.query(Role).filter(Role.id == dept.role_id).first()
                if role and role.name not in role_names:
                    role_names.append(role.name)
            if dept.stage_id:
                stage_obj = db.query(Stage).filter(Stage.id == dept.stage_id).first()
                if stage_obj and stage_obj.name not in stage_names:
                    stage_names.append(stage_obj.name)
                    
        acc_dict["role_name"] = ", ".join(role_names) if role_names else None
        acc_dict["stage_name"] = ", ".join(stage_names) if stage_names else None
        items.append(acc_dict)

    return items, total

def get_account_by_username(db: Session, username: str):
    """
    Truy vấn thông tin tài khoản dựa trên tên đăng nhập duy nhất.
    
    Thường dùng trong quy trình xác thực (Login) và kiểm tra tính duy nhất khi tạo mới.
    """
    return db.query(Account).filter(Account.username == username).first()

def create_account(db: Session, account: AccountCreate):
    """
    Tạo mới một tài khoản người dùng vào hệ thống.
    
    Quy trình xử lý:
    1. Băm mật khẩu (Hashing) trước khi lưu để đảm bảo bảo mật.
    2. Lưu thông tin cơ bản vào bảng Account.
    3. Lưu thông tin phân quyền và bộ phận vào bảng Department (liên kết qua account_id).
    
    Args:
        db: Session DB.
        account: Dữ liệu tài khoản từ schema AccountCreate.
        
    Returns:
        Account: Đối tượng tài khoản vừa tạo thành công.
    """
    hashed_password = get_password_hash(account.password)
    
    # 1. Tạo bản ghi Account trong Database
    db_account = Account(
        username=account.username,
        email=account.email,
        hashed_password=hashed_password,
        is_active=account.is_active,
        employee_id=account.employee_id or account.employee_code,
        full_name=account.full_name or account.name,
        status=getattr(account, 'status', None) or "Đang sử dụng"
    )
    db.add(db_account)
    db.flush() # Lưu tạm để lấy auto-increment ID cho bước tiếp theo
    
    # 2. Tạo bản ghi Department để lưu trữ Role và Stage phụ trách
    if account.stage_ids:
        for s_id in account.stage_ids:
            db_dept = Department(
                account_id=db_account.id,
                role_id=account.role_id,
                permission_id=account.permission_id,
                stage_id=s_id
            )
            db.add(db_dept)
    else:
        db_dept = Department(
            account_id=db_account.id,
            role_id=account.role_id,
            permission_id=account.permission_id,
            stage_id=account.stage_id
        )
        db.add(db_dept)
    
    # Xác nhận Transaction
    db.commit()
    # Cập nhật lại đối tượng từ DB (để lấy các trường mặc định như created_at)
    db.refresh(db_account)
    return db_account

def update_account(db: Session, account_id: int, account: AccountUpdate):
    """
    Cập nhật thông tin của một tài khoản hiện có.
    
    Hỗ trợ cập nhật từng trường (Partial update). Nếu có mật khẩu mới, 
    hệ thống sẽ tự động thực hiện băm lại mật khẩu.
    """
    db_account = db.query(Account).filter(Account.id == account_id).first()
    if db_account:
        # Chuyển schema sang dict, bỏ qua các trường không được gửi lên (unset)
        update_data = account.model_dump(exclude_unset=True)
        # Kiểm tra và xử lý mật khẩu nếu có thay đổi
        if "password" in update_data:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
        # Đồng bộ hóa các trường trùng lặp/thay thế
        if "name" in update_data and update_data["name"] is not None:
            update_data["full_name"] = update_data.pop("name")
        if "employee_code" in update_data and update_data["employee_code"] is not None:
            update_data["employee_id"] = update_data.pop("employee_code")
            
        # Gán lại giá trị cho các thuộc tính của model
        for key, value in update_data.items():
            if hasattr(db_account, key):
                setattr(db_account, key, value)
            
        db.commit()
        db.refresh(db_account)
    return db_account
