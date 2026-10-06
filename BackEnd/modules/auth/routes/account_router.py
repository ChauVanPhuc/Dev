from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from config.database import get_db
from config.security import verify_password, create_access_token
from modules.auth.schemas.accounts import Account, AccountBase, AccountCreate, AccountUpdate, Token, PaginatedAccountResponse, FCMTokenUpdate, PasswordChange
from modules.auth.controllers import account_controller
from config.settings import settings
from modules.auth.models.departments import Department
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.production.models.stages import Stage
from modules.auth.models.accounts import Account as AccountModel

router = APIRouter()

@router.post("/update-fcm-token")
def update_fcm_token(data: FCMTokenUpdate, db: Session = Depends(get_db)):
    """
    [POST] API cập nhật mã định danh thiết bị (FCM Token).
    
    API này được gọi từ app Mobile ngay sau khi người dùng đăng nhập thành công.
    Mã Token này là duy nhất cho mỗi điện thoại, dùng để Google biết cần đẩy thông báo đến máy nào.
    """
    # 1. Xóa Token này khỏi tất cả các tài khoản khác (tránh lỗi 1 máy nhiều người dùng bị nhận nhầm tin)
    # Thêm cơ chế retry để tránh lỗi Deadlock khi nhiều người cùng login
    max_retries = 3
    for i in range(max_retries):
        try:
            db.query(AccountModel).filter(AccountModel.fcm_token == data.fcm_token).update({"fcm_token": None})
            db.commit()
            break
        except Exception as e:
            db.rollback()
            if i == max_retries - 1: raise e
            import time
            time.sleep(0.1) # Đợi 100ms rồi thử lại
    
    # 2. Tìm người dùng trong Database dựa trên ID gửi từ Mobile
    user = db.query(AccountModel).filter(AccountModel.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    
    # 3. Cập nhật mã Token mới nhất vào cột fcm_token của bảng accounts
    user.fcm_token = data.fcm_token
    db.commit() # Lưu thay đổi vào SQL Server
    
    return {"message": "Đã đồng bộ mã Token thiết bị thành công"}

@router.get("/", response_model=PaginatedAccountResponse)
def list_accounts(
    page: int = 1, 
    size: int = 30,
    search: str = None,
    status: str = None,
    sort_by: str = "id",
    sort_dir: str = "desc",
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách tài khoản người dùng có phân trang.
    
    Hỗ trợ các tính năng:
    - Phân trang (page, size).
    - Tìm kiếm theo tên/username (search).
    - Lọc theo trạng thái (status).
    - Sắp xếp linh hoạt (sort_by, sort_dir).
    """
    skip = (page - 1) * size
    items, total = account_controller.get_accounts(
        db, skip=skip, limit=size, search=search,
        status=status, sort_by=sort_by, sort_dir=sort_dir
    )
    return {"items": items, "total": total, "page": page, "size": size}

@router.post("/login", response_model=Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    """
    [POST] Xử lý đăng nhập và cấp phát Access Token.
    
    Quy trình:
    1. Kiểm tra username/password từ database.
    2. Nếu hợp lệ, tạo JWT token bao gồm thông tin username.
    3. Truy vấn bổ sung thông tin phòng ban (Department), vai trò (Role), quyền (Permission) và công đoạn (Stage).
    4. Trả về token kèm Profile người dùng đầy đủ.
    """
    user = account_controller.get_account_by_username(db, username=form_data.username)
    
    # 1. Kiểm tra nếu người dùng không tồn tại
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Kiểm tra nếu tài khoản đang bị khóa
    if getattr(user, 'status', '') == "Bị khóa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa do nhập sai quá nhiều lần. Vui lòng liên hệ Admin để mở khóa.",
        )

    # 3. Xác thực mật khẩu
    if not verify_password(form_data.password, user.hashed_password):
        # Tăng số lần nhập sai
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        
        # Nếu nhập sai quá 5 lần, thực hiện khóa tài khoản
        if user.failed_login_attempts >= 5:
            user.status = "Bị khóa"
            detail_msg = "Tài khoản đã bị khóa do nhập sai quá 5 lần. Vui lòng liên hệ Admin."
        else:
            remaining = 5 - user.failed_login_attempts
            detail_msg = f"Tên đăng nhập hoặc mật khẩu không chính xác. Bạn còn {remaining} lần thử."
        
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail_msg,
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 4. Đăng nhập thành công -> Reset số lần nhập sai
    user.failed_login_attempts = 0
    db.commit()
    
    # Tạo access token với thời gian hết hạn từ cấu hình
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    # Lấy thông tin ngữ cảnh nghiệp vụ (Role/Permission/Stage) từ bảng Department
    depts = db.query(Department).filter(Department.account_id == user.id).all()
    
    role_id = getattr(user, 'role_id', None)
    role_name = None
    role_description = None
    role_ids = []
    role_names = []
    
    permission_ids = []
    permission_names = []
    permission_descriptions = []
    permissions_list = []
    
    stage_ids = []
    stage_names = []
    stage_descriptions = []
    stages_list = []

    for dept in depts:
        if dept.role_id:
            if dept.role_id not in role_ids:
                role_ids.append(dept.role_id)
            if not role_name:
                role = db.query(Role).filter(Role.id == dept.role_id).first()
                if role:
                    role_name = role.name
                    role_description = role.description
                    role_names.append(role.name)
        if dept.permission_id:
            if dept.permission_id not in permission_ids:
                permission_ids.append(dept.permission_id)
                perm = db.query(Permission).filter(Permission.id == dept.permission_id).first()
                if perm:
                    permission_names.append(perm.name)
                    permission_descriptions.append(perm.description or perm.name)
                    permissions_list.append({
                        "id": perm.id,
                        "name": perm.name,
                        "description": perm.description or perm.name
                    })
        if dept.stage_id:
            if dept.stage_id not in stage_ids:
                stage_ids.append(dept.stage_id)
                stage = db.query(Stage).filter(Stage.id == dept.stage_id).first()
                if stage:
                    stage_names.append(stage.name)
                    stage_descriptions.append(stage.description or stage.name)
                    stages_list.append({
                        "id": stage.id,
                        "name": stage.name,
                        "description": stage.description or stage.name
                    })

    if not role_name and role_id:
        role = db.query(Role).filter(Role.id == role_id).first()
        if role:
            role_name = role.name
            role_description = role.description

    if getattr(user, 'permission_id', None) and user.permission_id not in permission_ids:
        permission_ids.insert(0, user.permission_id)
        perm = db.query(Permission).filter(Permission.id == user.permission_id).first()
        if perm:
            permission_names.insert(0, perm.name)
            permission_descriptions.insert(0, perm.description or perm.name)
            permissions_list.insert(0, {
                "id": perm.id,
                "name": perm.name,
                "description": perm.description or perm.name
            })

    # Resolve department name and factory
    department_id = getattr(user, 'department_id', None)
    department_name = None
    if department_id:
        dept_obj = db.query(Department).filter(Department.id == department_id).first()
        if dept_obj:
            department_name = dept_obj.name

    factory_id = getattr(user, 'factory_id', None)
    factory_name = getattr(user, 'factory_name', None)
    if factory_id and not factory_name:
        try:
            from modules.hr.models.hr_models import HRFactoryStructure
            fac_obj = db.query(HRFactoryStructure).filter(HRFactoryStructure.id == factory_id).first()
            if fac_obj:
                factory_name = fac_obj.structure_name or fac_obj.name or fac_obj.structure_code
            else:
                factory_name = f"Nhà Máy {factory_id}"
        except Exception:
            factory_name = f"Nhà Máy {factory_id}"

    import json
    resolved_perms = account_controller.resolve_user_permissions(user, db)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "full_name": getattr(user, 'full_name', None) or user.username,
        "email": getattr(user, 'email', '') or '',
        "phone": getattr(user, 'phone', '') or '',
        "employee_id": getattr(user, 'employee_id', None) or '',
        "status": getattr(user, 'status', 'Đang sử dụng') or 'Đang sử dụng',
        "role_id": role_id or (role_ids[0] if role_ids else None),
        "role_name": role_name or '',
        "role_description": role_description or role_name or '',
        "department_id": department_id,
        "department_name": department_name or '',
        "permission_id": permission_ids[0] if permission_ids else getattr(user, 'permission_id', None),
        "permission_ids": permission_ids,
        "permission_name": ", ".join(permission_names) if permission_names else '',
        "permission_description": ", ".join(permission_descriptions) if permission_descriptions else '',
        "permissions_list": permissions_list,
        "factory_id": factory_id,
        "factory_name": factory_name or '',
        "stage_id": stage_ids[0] if stage_ids else None,
        "stage_ids": stage_ids,
        "stage_name": " | ".join(stage_names) if stage_names else '',
        "stage_description": " | ".join(stage_descriptions) if stage_descriptions else '',
        "stage_names": stage_names,
        "stages_list": stages_list,
        "id": user.id,
        "screen_permissions": json.dumps(resolved_perms),
        "permission_level": getattr(user, 'permission_level', '') or '',
        "is_mobile_allowed": getattr(user, 'is_mobile_allowed', True) if getattr(user, 'is_mobile_allowed', True) is not None else True,
        "is_web_allowed": getattr(user, 'is_web_allowed', True) if getattr(user, 'is_web_allowed', True) is not None else True
    }

@router.get("/stages")
def get_all_stages(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tất cả các công đoạn sản xuất.
    """
    stages = db.query(Stage).all()
    return [{"id": s.id, "name": s.name, "description": s.description} for s in stages]

@router.post("/", response_model=Account)
def register_user(account: AccountCreate, db: Session = Depends(get_db)):
    """
    [POST] Đăng ký một tài khoản người dùng mới.
    
    Kiểm tra sự tồn tại của username và phone trước khi tạo để tránh trùng lặp.
    """
    db_account = account_controller.get_account_by_username(db, username=account.username)
    if db_account:
        raise HTTPException(status_code=400, detail="Tên người dùng đã được đăng ký")
    
    if account.phone:
        db_phone = account_controller.get_account_by_phone(db, phone=account.phone)
        if db_phone:
            raise HTTPException(status_code=400, detail="Số điện thoại đã được đăng ký")
            
    return account_controller.create_account(db=db, account=account)

@router.get("/by-username/{username}")
def get_user_by_username(username: str, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết tài khoản theo username.
    """
    from sqlalchemy import func
    db_account = db.query(AccountModel).filter(func.lower(AccountModel.username) == username.lower()).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại")
    return get_user_detail(db_account.id, db)

@router.get("/{account_id}")
def get_user_detail(account_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết thông tin tài khoản và phân quyền liên quan (4 chiều).
    """
    db_account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại")
    
    # Lấy thông tin phân quyền từ bảng Department (junction)
    depts = db.query(Department).filter(Department.account_id == account_id).all()
    
    role_id = getattr(db_account, 'role_id', None)
    role_name = None
    role_description = None
    
    permission_ids = []
    permission_names = []
    permission_descriptions = []
    permissions_list = []
    
    stage_ids = []
    stage_names = []
    stage_descriptions = []
    stages_list = []
    
    for dept in depts:
        if dept.role_id and not role_id:
            role_id = dept.role_id
        if dept.permission_id and dept.permission_id not in permission_ids:
            permission_ids.append(dept.permission_id)
            perm = db.query(Permission).filter(Permission.id == dept.permission_id).first()
            if perm:
                permission_names.append(perm.name)
                permission_descriptions.append(perm.description or perm.name)
                permissions_list.append({
                    "id": perm.id,
                    "name": perm.name,
                    "description": perm.description or perm.name
                })
        if dept.stage_id and dept.stage_id not in stage_ids:
            stage_ids.append(dept.stage_id)
            stage = db.query(Stage).filter(Stage.id == dept.stage_id).first()
            if stage:
                stage_names.append(stage.name)
                stage_descriptions.append(stage.description or stage.name)
                stages_list.append({
                    "id": stage.id,
                    "name": stage.name,
                    "description": stage.description or stage.name
                })
            
    if role_id:
        role = db.query(Role).filter(Role.id == role_id).first()
        if role:
            role_name = role.name
            role_description = role.description

    if getattr(db_account, 'permission_id', None) and db_account.permission_id not in permission_ids:
        permission_ids.insert(0, db_account.permission_id)
        perm = db.query(Permission).filter(Permission.id == db_account.permission_id).first()
        if perm:
            permission_names.insert(0, perm.name)
            permission_descriptions.insert(0, perm.description or perm.name)
            permissions_list.insert(0, {
                "id": perm.id,
                "name": perm.name,
                "description": perm.description or perm.name
            })

    # Resolve department name
    department_id = getattr(db_account, 'department_id', None)
    department_name = None
    if department_id:
        dept_obj = db.query(Department).filter(Department.id == department_id).first()
        if dept_obj:
            department_name = dept_obj.name

    factory_id = getattr(db_account, 'factory_id', None)
    factory_name = getattr(db_account, 'factory_name', None)
    if factory_id and not factory_name:
        try:
            from modules.hr.models.hr_models import HRFactoryStructure
            fac_obj = db.query(HRFactoryStructure).filter(HRFactoryStructure.id == factory_id).first()
            if fac_obj:
                factory_name = fac_obj.structure_name or fac_obj.name or fac_obj.structure_code
            else:
                factory_name = f"Nhà Máy {factory_id}"
        except Exception:
            factory_name = f"Nhà Máy {factory_id}"

    return {
        "id": db_account.id,
        "username": db_account.username,
        "email": db_account.email,
        "phone": db_account.phone,
        "employee_id": db_account.employee_id,
        "full_name": db_account.full_name,
        "status": db_account.status,
        "is_active": db_account.is_active,
        "is_mobile_allowed": getattr(db_account, 'is_mobile_allowed', True) if getattr(db_account, 'is_mobile_allowed', True) is not None else True,
        "is_web_allowed": getattr(db_account, 'is_web_allowed', True) if getattr(db_account, 'is_web_allowed', True) is not None else True,
        "created_at": db_account.created_at,
        "role_id": role_id,
        "role_name": role_name,
        "role_description": role_description,
        "department_id": department_id,
        "department_name": department_name,
        "permission_id": getattr(db_account, 'permission_id', None) or (permission_ids[0] if permission_ids else None),
        "permission_ids": permission_ids,
        "permission_name": ", ".join(permission_names) if permission_names else '',
        "permission_description": ", ".join(permission_descriptions) if permission_descriptions else '',
        "permissions_list": permissions_list,
        "factory_id": factory_id,
        "factory_name": factory_name,
        "stage_id": stage_ids[0] if stage_ids else None,
        "stage_ids": stage_ids,
        "stage_name": " | ".join(stage_names) if stage_names else '',
        "stage_description": " | ".join(stage_descriptions) if stage_descriptions else '',
        "stage_names": stage_names,
        "stages_list": stages_list,
        "screen_permissions": db_account.screen_permissions,
        "permission_level": db_account.permission_level
    }

@router.put("/{account_id}", response_model=Account)
def update_user(account_id: int, account: AccountUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin cơ bản của một tài khoản.
    """
    if account.phone:
        phone_val = account.phone.strip()
        if phone_val:
            existing_phone = account_controller.get_account_by_phone(db, phone=phone_val)
            if existing_phone and existing_phone.id != account_id:
                raise HTTPException(status_code=400, detail="Số điện thoại đã được đăng ký bởi tài khoản khác")

    db_account = account_controller.update_account(db=db, account_id=account_id, account=account)
    if not db_account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại")
    return db_account

@router.post("/{account_id}/sync-departments/")
def sync_account_departments(account_id: int, payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Đồng bộ hóa phòng ban / vai trò / quyền / công đoạn cho một tài khoản.
    """
    # Cập nhật các cột 4 chiều trên bảng accounts
    db_account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if db_account:
        if "department_id" in payload:
            db_account.department_id = payload.get("department_id")
        if "permission_ids" in payload and payload.get("permission_ids"):
            db_account.permission_id = payload.get("permission_ids")[0]
        elif "permission_id" in payload:
            db_account.permission_id = payload.get("permission_id")
        if "factory_id" in payload:
            db_account.factory_id = payload.get("factory_id")
        if "factory_name" in payload:
            db_account.factory_name = payload.get("factory_name")

    # Xóa toàn bộ các bản ghi cũ của user này trong bảng departments
    db.query(Department).filter(Department.account_id == account_id).delete()
    
    role_id = payload.get("role_id")
    permission_id = payload.get("permission_id")
    raw_p_ids = payload.get("permission_ids")
    if raw_p_ids and isinstance(raw_p_ids, list):
        permission_ids = raw_p_ids
    elif permission_id:
        permission_ids = [permission_id]
    else:
        permission_ids = [None]

    raw_s_ids = payload.get("stage_ids")
    stage_id = payload.get("stage_id")
    if raw_s_ids and isinstance(raw_s_ids, list):
        stage_ids = raw_s_ids
    elif stage_id:
        stage_ids = [stage_id]
    else:
        stage_ids = [None]
    
    for p_id in permission_ids:
        for s_id in stage_ids:
            db_dept = Department(
                account_id=account_id,
                role_id=role_id,
                permission_id=p_id,
                stage_id=s_id
            )
            db.add(db_dept)
        
    db.commit()
    return {"message": "Đồng bộ quyền hạn phòng ban thành công"}


@router.delete("/{account_id}")
def delete_user(account_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa một tài khoản người dùng và toàn bộ liên kết departments của họ.
    """
    db_account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại")
    
    # Xóa departments liên quan trước
    db.query(Department).filter(Department.account_id == account_id).delete()
    # Xóa account
    db.delete(db_account)
    db.commit()
    return {"message": "Xóa tài khoản thành công"}

@router.get("/permissions/default")
def get_default_permissions(
    role_id: Optional[int] = None,
    permission_id: Optional[int] = None,
    permission_ids: Optional[str] = None,
    permission_level: Optional[str] = None,
    username: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy phân quyền mặc định của bộ phận/chức vụ/cấp bậc trước khi tạo tài khoản.
    """
    p_ids = []
    if permission_ids:
        try:
            p_ids = [int(x.strip()) for x in str(permission_ids).split(",") if x.strip().isdigit()]
        except Exception:
            p_ids = []
    elif permission_id:
        p_ids = [permission_id]

    resolved_actions = account_controller.resolve_permissions_by_params(
        role_id=role_id,
        permission_id=permission_id,
        permission_level=permission_level,
        username=username,
        db=db,
        permission_ids=p_ids
    )
    permissions = {}
    for screen, actions in resolved_actions.items():
        if not actions:
            permissions[screen] = "none"
        else:
            permissions[screen] = ",".join(actions)
            
    return {"permissions": permissions}

@router.get("/{account_id}/permissions")
def get_user_permissions(account_id: int, resolved: bool = False, db: Session = Depends(get_db)):
    """
    [GET] Lấy phân quyền trên từng màn hình của tài khoản.
    
    Hỗ trợ tham số resolved=True để phân giải quyền thực tế của User (kết hợp bộ phận, cấp bậc, ghi đè).
    """
    db_account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại")
    
    if resolved:
        permissions = account_controller.resolve_user_permissions(db_account, db)
    else:
        import json
        permissions = {}
        if db_account.screen_permissions:
            try:
                permissions = json.loads(db_account.screen_permissions)
            except Exception:
                permissions = {}
            
    return {"permissions": permissions}

@router.put("/{account_id}/permissions")
def update_user_permissions(account_id: int, payload: dict, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật phân quyền trên từng màn hình cho tài khoản.
    """
    db_account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại")
    
    import json
    permissions_dict = payload.get("permissions", {})
    db_account.screen_permissions = json.dumps(permissions_dict)
    db.commit()
    account_controller.invalidate_permission_cache(account_id)
    return {"message": "Cập nhật phân quyền thành công", "screen_permissions": db_account.screen_permissions}

@router.post("/{account_id}/change-password")
def change_password(account_id: int, payload: PasswordChange, db: Session = Depends(get_db)):
    """
    [POST] Đổi mật khẩu tài khoản người dùng có kiểm tra mật khẩu cũ.
    """
    db_account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại")
    
    # Xác thực mật khẩu cũ
    if not verify_password(payload.old_password, db_account.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Mật khẩu cũ không chính xác"
        )
    
    # Cập nhật mật khẩu mới
    from config.security import get_password_hash
    db_account.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}
