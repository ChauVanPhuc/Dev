from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime
from modules.auth.models.accounts import Account
from modules.auth.models.departments import Department
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
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
        "phone": Account.phone,
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

    # Chuyển đổi kết quả thành danh sách các dictionary dễ xử lý ở frontend, bổ sung role_name, department_name, permission_name, factory_name và stage_name
    items = []
    # Cache lookup maps for high performance
    roles_cache = {r.id: (r.name or r.description) for r in db.query(Role).all()}
    depts_cache = {d.id: (d.name or d.code or f"BP-{d.id}") for d in db.query(Department).all()}
    perms_cache = {p.id: (p.name or p.description) for p in db.query(Permission).all()}

    for account in accounts:
        acc_dict = {c.name: getattr(account, c.name) for c in account.__table__.columns}
        
        # Lấy danh sách liên kết Department (legacy junction)
        depts = db.query(Department).filter(Department.account_id == account.id).all()
        
        role_ids = []
        role_names = []
        stage_names = []
        permission_names = []
        
        for dept in depts:
            if dept.role_id:
                if dept.role_id not in role_ids:
                    role_ids.append(dept.role_id)
                val = roles_cache.get(dept.role_id)
                if val and val not in role_names:
                    role_names.append(val)
            if dept.permission_id:
                val = perms_cache.get(dept.permission_id)
                if val and val not in permission_names:
                    permission_names.append(val)
            if dept.stage_id:
                stage_obj = db.query(Stage).filter(Stage.id == dept.stage_id).first()
                if stage_obj and stage_obj.name not in stage_names:
                    stage_names.append(stage_obj.name)
                    
        acc_dict["role_id"] = role_ids[0] if role_ids else None
        acc_dict["role_name"] = ", ".join(role_names) if role_names else None
        
        # Resolve department (Bộ phận)
        acc_dept_id = getattr(account, 'department_id', None)
        if acc_dept_id:
            acc_dict["department_id"] = acc_dept_id
            acc_dict["department_name"] = depts_cache.get(acc_dept_id)
        else:
            acc_dict["department_name"] = None
            
        # Resolve permission (Vị trí)
        acc_perm_id = getattr(account, 'permission_id', None)
        if acc_perm_id:
            acc_dict["permission_id"] = acc_perm_id
            acc_dict["permission_name"] = perms_cache.get(acc_perm_id) or (", ".join(permission_names) if permission_names else None)
        else:
            acc_dict["permission_name"] = ", ".join(permission_names) if permission_names else None
            
        # Resolve factory (Nhà máy)
        acc_dict["factory_id"] = getattr(account, 'factory_id', None)
        acc_dict["factory_name"] = getattr(account, 'factory_name', None)

        acc_dict["stage_name"] = ", ".join(stage_names) if stage_names else None
        items.append(acc_dict)

    return items, total

def get_account_by_username(db: Session, username: str):
    """
    Truy vấn thông tin tài khoản dựa trên tên đăng nhập duy nhất.
    
    Thường dùng trong quy trình xác thực (Login) và kiểm tra tính duy nhất khi tạo mới.
    """
    return db.query(Account).filter(Account.username == username).first()

def get_account_by_phone(db: Session, phone: str):
    """
    Truy vấn thông tin tài khoản dựa trên số điện thoại duy nhất.
    """
    if not phone:
        return None
    return db.query(Account).filter(Account.phone == phone).first()

def create_account(db: Session, account: AccountCreate):
    """
    Tạo mới một tài khoản người dùng vào hệ thống.
    
    Quy trình xử lý:
    1. Băm mật khẩu (Hashing) trước khi lưu để đảm bảo bảo mật.
    2. Lưu thông tin cơ bản và 4 chiều phân quyền vào bảng Account.
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
        phone=account.phone,
        hashed_password=hashed_password,
        is_active=account.is_active,
        employee_id=account.employee_id or account.employee_code,
        full_name=account.full_name or account.name,
        status=getattr(account, 'status', None) or "Đang sử dụng",
        permission_level=account.permission_level,
        is_mobile_allowed=getattr(account, 'is_mobile_allowed', True) if getattr(account, 'is_mobile_allowed', True) is not None else True,
        department_id=account.department_id,
        permission_id=account.permission_id,
        factory_id=account.factory_id,
        factory_name=account.factory_name,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
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

def resolve_permissions_by_params(
    role_id: Optional[int],
    permission_id: Optional[int],
    permission_level: Optional[str],
    username: Optional[str],
    db: Session
) -> dict:
    """
    Phân giải quyền mặc định dựa trên Role ID, Permission ID, và Cấp bậc (permission_level).
    Không áp dụng ghi đè cá nhân. Trả về dict dạng {screen_key: list_of_actions}.
    """
    import json
    from modules.system.models.system_sidebar import SystemSidebar
    from modules.system.models.system_screen import SystemScreen
    from modules.auth.models.role import Role
    from modules.auth.models.permissions import Permission

    # 1. Lấy toàn bộ các menu/màn hình từ Sidebar database đang active
    sidebar_items = db.query(SystemSidebar).filter(SystemSidebar.is_active == True).all()
    
    # Xây dựng danh sách ALL_SCREENS và mapping sang thông tin cha
    all_screens_dict = {}
    for item in sidebar_items:
        if not item.parent_id:
            continue
        # Xác định khóa phân quyền duy nhất cho từng màn hình
        key = item.route_path
        if not key and item.screen_id:
            scr = db.query(SystemScreen).filter(SystemScreen.id == item.screen_id).first()
            if scr:
                key = scr.current_code or scr.default_code
        if not key:
            key = item.permission_key or f"sb_{item.id}"
            
        # Tìm nhóm cha
        parent = next((p for p in sidebar_items if p.id == item.parent_id), None)
        parent_title = parent.title if parent else ""
        
        all_screens_dict[key] = parent_title
        
    ALL_SCREENS = list(all_screens_dict.keys())
    
    # 2. Quyền mặc định hệ thống ban đầu (Default deny)
    resolved_perms = {screen: "none" for screen in ALL_SCREENS}
    
    # Root admin luôn có toàn bộ quyền cao nhất
    if username == "admin":
        resolved_actions = {screen: ["read", "create", "edit", "delete", "approve", "export_import"] for screen in ALL_SCREENS}
        return resolved_actions
    
    role_name = None
    role_default_perms = {}
    permission_name = None
    permission_default_perms = {}
    
    # Lấy tên và quyền mặc định của Chức vụ (Permission)
    if permission_id:
        perm = db.query(Permission).filter(Permission.id == permission_id).first()
        if perm:
            permission_name = perm.name
            if perm.default_permissions:
                try:
                    permission_default_perms = json.loads(perm.default_permissions)
                except Exception:
                    permission_default_perms = {}
                    
    # Lấy tên và quyền mặc định của Bộ phận (Role)
    if role_id:
        role = db.query(Role).filter(Role.id == role_id).first()
        if role:
            role_name = role.name
            if role.default_permissions:
                try:
                    role_default_perms = json.loads(role.default_permissions)
                except Exception:
                    role_default_perms = {}
    
    # Kiểm tra nếu là Khối Công nhân trực tiếp (NV SX, NV QC)
    if permission_name in ("NV SX", "NV QC"):
        # Kế thừa trực tiếp từ Chức vụ (permissions.default_permissions)
        for screen in ALL_SCREENS:
            val = permission_default_perms.get(screen, "none")
            if val == "write":
                resolved_perms[screen] = "export_import"
            else:
                resolved_perms[screen] = val
    else:
        # Khối Văn phòng / Quản lý
        allowed_screens = []
        if role_name in ("IT", "BGD"):
            allowed_screens = ALL_SCREENS
        else:
            # Lọc dựa trên nhóm menu cha trong Sidebar DB
            sx_parent_groups = {"Quản lý sản xuất", "KPI", "Quản lý KPI", "Thông tin sản xuất", "Báo cáo công việc", "Hồ sơ ISO", "Quy trình nghiệp vụ", "Kế hoạch & Sản xuất"}
            qlcl_parent_groups = {"Quản lý chất lượng", "KPI", "Quản lý KPI", "Phiếu kiểm tra", "Báo cáo CAPA", "Tạo CTQ, SOS", "Cảnh báo lỗi", "Góp ý", "QC & Chất lượng"}
            
            target_groups = sx_parent_groups if role_name == "Sx" else (qlcl_parent_groups if role_name == "QLCL" else set())
            
            for screen, parent_title in all_screens_dict.items():
                if parent_title in target_groups:
                    allowed_screens.append(screen)
            
        level = permission_level
        if not level:
            if role_name in ("IT", "BGD"):
                level = "Xuất nhập file"
            else:
                level = "Không được phép"
        
        # Phân cấp thứ tự các quyền
        levels_hierarchy = ["none", "read", "create", "edit", "delete", "approve", "export_import"]
        
        base_map = {
            "none": "none",
            "read": "read",
            "write": "export_import",
            "export_import": "export_import",
        }
        
        cap_map = {
            "Không được phép": "none",
            "Chỉ xem": "read",
            "Thêm": "create",
            "Sửa": "edit",
            "Xóa": "delete",
            "Duyệt": "approve",
            "Xuất nhập file": "export_import"
        }
        
        norm_cap = cap_map.get(level, "none")
        try:
            idx_cap = levels_hierarchy.index(norm_cap)
        except ValueError:
            idx_cap = 0
        
        # Áp dụng quyền mặc định của chức vụ và lọc giới hạn qua permission_level
        for screen in allowed_screens:
            base_val = permission_default_perms.get(screen, "write")
            norm_base = base_map.get(base_val, "none")
            try:
                idx_base = levels_hierarchy.index(norm_base)
            except ValueError:
                idx_base = 0
            
            # Quyền thực tế sau khi áp dụng cấp bậc giới hạn (min)
            resolved_idx = min(idx_base, idx_cap)
            resolved_perms[screen] = levels_hierarchy[resolved_idx]

    legacy_rank_map = {
        "none": [],
        "read": ["read"],
        "create": ["read", "create", "export_import"],
        "edit": ["read", "create", "edit", "export_import"],
        "delete": ["read", "create", "edit", "delete", "export_import"],
        "approve": ["read", "create", "edit", "delete", "approve", "export_import"],
        "export_import": ["read", "create", "edit", "delete", "approve", "export_import"],
        "write": ["read", "create", "edit", "delete", "approve", "export_import"],
    }

    # Chuyển đổi các quyền mặc định thành danh sách hành động
    resolved_actions = {}
    for screen, val in resolved_perms.items():
        resolved_actions[screen] = legacy_rank_map.get(val, [])

    return resolved_actions

def resolve_user_permissions(user, db: Session) -> dict:
    """
    Phân giải quyền thực tế của User cho từng màn hình từ Sidebar DB:
    - IT/BGD: Toàn bộ màn hình hệ thống.
    - Sx: Chỉ các màn hình thuộc Module sản xuất và KPI. Các màn hình khác là 'none'.
    - QLCL: Chỉ các màn hình thuộc Module chất lượng và KPI. Các màn hình khác là 'none'.
    - Khối Công nhân trực tiếp (NV SX, NV QC): Kế thừa trực tiếp từ Chức Vụ (permissions.default_permissions) mà không lọc qua permission_level.
    - Lọc qua Cấp bậc quyền hạn (permission_level) đối với văn phòng/quản lý:
      + Không được phép -> 'none' cho tất cả.
      + Chỉ xem -> 'read' cho tất cả màn hình được phép.
      + Thêm / Sửa / Xóa / Duyệt / Xuất nhập file -> Giới hạn cấp bậc (min) đối với mặc định bộ phận.
    - Ghi đè cá nhân (ACL Overrides) ở accounts.screen_permissions có độ ưu tiên cao nhất,
      chứa các quyền hạn chi tiết trên từng trang.
    """
    import json
    
    # Lấy thông tin Department (Bộ phận & Chức vụ) của User
    dept = db.query(Department).filter(Department.account_id == user.id).first()
    role_id = dept.role_id if dept else None
    permission_id = dept.permission_id if dept else None
    
    resolved_actions = resolve_permissions_by_params(
        role_id=role_id,
        permission_id=permission_id,
        permission_level=user.permission_level,
        username=user.username,
        db=db
    )
    
    # 4. Ghi đè cá nhân (ACL Overrides) - có độ ưu tiên cao nhất
    if user.screen_permissions:
        try:
            overrides = json.loads(user.screen_permissions)
            legacy_rank_map = {
                "none": [],
                "read": ["read"],
                "create": ["read", "create"],
                "edit": ["read", "create", "edit"],
                "delete": ["read", "create", "edit", "delete"],
                "approve": ["read", "create", "edit", "delete", "approve"],
                "export_import": ["read", "create", "edit", "delete", "approve", "export_import"],
                "write": ["read", "create", "edit", "delete", "approve", "export_import"],
            }
            for screen, val in overrides.items():
                if screen in resolved_actions:
                    # Phân tích giá trị ghi đè
                    actions = []
                    if isinstance(val, list):
                        actions = val
                    elif isinstance(val, str):
                        if "," in val:
                            actions = [a.strip() for a in val.split(",") if a.strip()]
                        else:
                            actions = legacy_rank_map.get(val, [])
                    
                    # Chuẩn hóa 'write' thành 'export_import' và lọc hành động hợp lệ
                    valid_actions = ["read", "create", "edit", "delete", "approve", "export_import"]
                    normalized_actions = []
                    for act in actions:
                        norm = "export_import" if act == "write" else act
                        if norm in valid_actions:
                            normalized_actions.append(norm)
                            
                    # Nếu ghi đè trống hoặc là ['none'], coi như chặn hoàn toàn
                    if not normalized_actions or "none" in actions:
                        resolved_actions[screen] = []
                    else:
                        resolved_actions[screen] = normalized_actions
        except Exception:
            pass
            
    # Chuyển đổi ngược lại thành chuỗi phân tách bằng dấu phẩy
    final_resolved = {}
    for screen, actions in resolved_actions.items():
        if not actions:
            final_resolved[screen] = "none"
        else:
            final_resolved[screen] = ",".join(actions)
            
    return final_resolved
