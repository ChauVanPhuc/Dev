from ctypes import Union
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

def get_accounts(db: Session, skip: int = 0, limit: int = 30, search: str = None,
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
        if acc_dict.get("status") and ("s? d?ng" in acc_dict["status"] or "Ðang" in acc_dict["status"]):
            acc_dict["status"] = "Đang sử dụng"
        
        # Lấy danh sách liên kết Department (legacy junction)
        depts = db.query(Department).filter(Department.account_id == account.id).all()
        
        role_ids = []
        role_names = []
        stage_names = []
        permission_ids = []
        permission_names = []
        
        for dept in depts:
            if dept.role_id:
                if dept.role_id not in role_ids:
                    role_ids.append(dept.role_id)
                val = roles_cache.get(dept.role_id)
                if val and val not in role_names:
                    role_names.append(val)
            if dept.permission_id:
                if dept.permission_id not in permission_ids:
                    permission_ids.append(dept.permission_id)
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
        if acc_perm_id and acc_perm_id not in permission_ids:
            permission_ids.append(acc_perm_id)
            val = perms_cache.get(acc_perm_id)
            if val and val not in permission_names:
                permission_names.insert(0, val)

        acc_dict["permission_id"] = acc_perm_id or (permission_ids[0] if permission_ids else None)
        acc_dict["permission_ids"] = permission_ids
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
    
    primary_perm_id = account.permission_id
    if not primary_perm_id and account.permission_ids:
        primary_perm_id = account.permission_ids[0]

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
        is_web_allowed=getattr(account, 'is_web_allowed', True) if getattr(account, 'is_web_allowed', True) is not None else True,
        department_id=account.department_id,
        permission_id=primary_perm_id,
        factory_id=account.factory_id,
        factory_name=account.factory_name,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    db.add(db_account)
    db.flush() # Lưu tạm để lấy auto-increment ID cho bước tiếp theo
    
    # 2. Tạo các bản ghi Department để lưu trữ Role, Permission(s) và Stage phụ trách
    perm_list = account.permission_ids if account.permission_ids else ([account.permission_id] if account.permission_id else [None])
    stage_list = account.stage_ids if account.stage_ids else ([account.stage_id] if account.stage_id else [None])

    for p_id in perm_list:
        for s_id in stage_list:
            db_dept = Department(
                account_id=db_account.id,
                role_id=account.role_id,
                permission_id=p_id,
                stage_id=s_id
            )
            db.add(db_dept)
    
    # 3. Đồng bộ ngược lại Hồ sơ Nhân sự HREmployee (/admin/hr/employees)
    if db_account.employee_id:
        try:
            from modules.hr.models.hr_models import HREmployee
            hr_emp = db.query(HREmployee).filter(HREmployee.employee_id == db_account.employee_id).first()
            if not hr_emp:
                hr_emp = HREmployee(
                    employee_id=db_account.employee_id,
                    full_name=db_account.full_name,
                    phone=db_account.phone,
                    department_id=db_account.department_id,
                    position_id=db_account.permission_id
                )
                db.add(hr_emp)
            else:
                # Nếu nhân viên đã tồn tại, đồng bộ các thông tin phòng ban / chức vụ nếu cần
                if db_account.full_name and not hr_emp.full_name:
                    hr_emp.full_name = db_account.full_name
                if db_account.phone and not hr_emp.phone:
                    hr_emp.phone = db_account.phone
                if db_account.department_id:
                    hr_emp.department_id = db_account.department_id
                if db_account.permission_id:
                    hr_emp.position_id = db_account.permission_id
        except Exception as e:
            print(f"[CẢNH BÁO] Lỗi đồng bộ tự động HREmployee: {e}")

    # Commit toàn bộ transaction bao gồm tài khoản, phân quyền phòng ban và nhân sự
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

        # Đồng bộ ngược lại Hồ sơ Nhân sự HREmployee (/admin/hr/employees)
        if db_account.employee_id:
            try:
                from modules.hr.models.hr_models import HREmployee
                hr_emp = db.query(HREmployee).filter(HREmployee.employee_id == db_account.employee_id).first()
                if hr_emp:
                    if db_account.full_name: hr_emp.full_name = db_account.full_name
                    if db_account.phone: hr_emp.phone = db_account.phone
                    if db_account.department_id: hr_emp.department_id = db_account.department_id
                    if db_account.permission_id: hr_emp.position_id = db_account.permission_id
                    db.commit()
                else:
                    hr_emp = HREmployee(
                        employee_id=db_account.employee_id,
                        full_name=db_account.full_name,
                        phone=db_account.phone,
                        department_id=db_account.department_id,
                        position_id=db_account.permission_id
                    )
                    db.add(hr_emp)
                    db.commit()
            except Exception as e:
                print(f"[CẢNH BÁO] Lỗi đồng bộ tự động HREmployee khi update: {e}")

        db.refresh(db_account)
    return db_account

def resolve_permissions_by_params(
    role_id: Optional[int],
    permission_id: Optional[int],
    permission_level: Optional[str],
    username: Optional[str],
    db: Session,
    permission_ids: Optional[Union[list, str]] = None
) -> dict:
    """
    Phân giải quyền mặc định dựa trên Role ID, danh sách Permission ID (Vị Trí), và Cấp bậc (permission_level).
    Không áp dụng ghi đè cá nhân. Trả về dict dạng {screen_key: list_of_actions}.
    Khi có nhiều Vị Trí, hệ thống sẽ hợp nhất (union) và lấy mức quyền cao nhất cho từng màn hình.
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
        # Xác định khóa phân quyền duy nhất cho từng màn hình
        key = item.route_path
        if not key and item.screen_id:
            scr = db.query(SystemScreen).filter(SystemScreen.id == item.screen_id).first()
            if scr:
                key = scr.current_code or scr.default_code
        if not key:
            key = item.permission_key or f"sb_{item.id}"
            
        # Tìm danh sách tất cả các nhóm cha (bao gồm nhóm cha trực tiếp và nhóm gốc)
        parent_titles = set()
        curr_parent_id = item.parent_id
        while curr_parent_id:
            p_obj = next((p for p in sidebar_items if p.id == curr_parent_id), None)
            if p_obj:
                if p_obj.title:
                    parent_titles.add(p_obj.title)
                curr_parent_id = p_obj.parent_id
            else:
                break
        if not parent_titles and item.title:
            parent_titles.add(item.title)
        
        all_screens_dict[key] = parent_titles
        
    ALL_SCREENS = list(all_screens_dict.keys())
    
    # Root admin luôn có toàn bộ quyền cao nhất
    if username == "admin":
        resolved_actions = {screen: ["read", "create", "edit", "delete", "approve", "export_import"] for screen in ALL_SCREENS}
        return resolved_actions
    
    # Chuẩn hóa danh sách permission_ids
    p_id_list = []
    if permission_ids:
        if isinstance(permission_ids, (list, tuple, set)):
            p_id_list = [int(p) for p in permission_ids if p is not None]
        elif isinstance(permission_ids, str):
            p_id_list = [int(x.strip()) for x in permission_ids.split(",") if x.strip().isdigit()]
    if permission_id and permission_id not in p_id_list:
        p_id_list.append(int(permission_id))

    role_name = None
    role_default_perms = {}
    
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

    # Lấy danh sách các Permission objects
    perm_objs = []
    if p_id_list:
        perm_objs = db.query(Permission).filter(Permission.id.in_(p_id_list)).all()
    elif permission_id:
        p_single = db.query(Permission).filter(Permission.id == permission_id).first()
        if p_single:
            perm_objs = [p_single]

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

    # Tính toán allowed_screens cho khối Văn phòng / Quản lý theo Role
    allowed_screens = []
    if role_name in ("IT", "BGD"):
        allowed_screens = ALL_SCREENS
    else:
        # Lọc dựa trên nhóm menu cha trong Sidebar DB
        sx_parent_groups = {"Quản lý sản xuất", "KPI", "Quản lý KPI", "Thông tin sản xuất", "Báo cáo công việc", "Hồ sơ ISO", "Quy trình nghiệp vụ", "Kế hoạch & Sản xuất", "Tài liệu ban hành"}
        qlcl_parent_groups = {"Quản lý chất lượng", "KPI", "Quản lý KPI", "Phiếu kiểm tra", "Báo cáo CAPA", "Tạo CTQ, SOS", "Cảnh báo lỗi", "Góp ý", "QC & Chất lượng", "Tài liệu ban hành"}
        
        target_groups = sx_parent_groups if role_name == "Sx" else (qlcl_parent_groups if role_name == "QLCL" else set())
        
        for screen, p_titles in all_screens_dict.items():
            if any(t in target_groups for t in p_titles):
                allowed_screens.append(screen)
        
    level = permission_level
    if not level:
        if role_name in ("IT", "BGD"):
            level = "Xuất nhập file"
        else:
            level = "Không được phép"
    
    norm_cap = cap_map.get(level, "none")
    try:
        idx_cap = levels_hierarchy.index(norm_cap)
    except ValueError:
        idx_cap = 0

    # Khởi tạo ma trận quyền cao nhất cho từng màn hình
    screen_max_indices = {screen: 0 for screen in ALL_SCREENS}

    if not perm_objs:
        # Nếu chưa chọn Vị trí nào, áp dụng mặc định theo Cấp bậc & Bộ phận
        for screen in allowed_screens:
            screen_max_indices[screen] = idx_cap
    else:
        # Lặp qua từng Vị trí được gán và hợp nhất quyền (Union / Max)
        for perm in perm_objs:
            perm_default_perms = {}
            if perm.default_permissions:
                try:
                    perm_default_perms = json.loads(perm.default_permissions)
                except Exception:
                    perm_default_perms = {}
            
            is_worker = perm.name in ("NV SX", "NV QC")
            
            if is_worker:
                # Kế thừa trực tiếp từ Chức vụ công nhân
                for screen in ALL_SCREENS:
                    val = perm_default_perms.get(screen, "none")
                    norm_val = "export_import" if val == "write" else val
                    try:
                        p_idx = levels_hierarchy.index(norm_val)
                    except ValueError:
                        p_idx = 0
                    if p_idx > screen_max_indices[screen]:
                        screen_max_indices[screen] = p_idx
            else:
                # Khối văn phòng / quản lý
                for screen in allowed_screens:
                    base_val = perm_default_perms.get(screen, "write")
                    norm_base = base_map.get(base_val, "none")
                    try:
                        idx_base = levels_hierarchy.index(norm_base)
                    except ValueError:
                        idx_base = 0
                    
                    resolved_idx = min(idx_base, idx_cap)
                    if resolved_idx > screen_max_indices[screen]:
                        screen_max_indices[screen] = resolved_idx

    resolved_perms = {screen: levels_hierarchy[screen_max_indices[screen]] for screen in ALL_SCREENS}

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
    - Hợp nhất tất cả các Vị Trí (Chức vụ) mà user nắm giữ từ bảng Department junction.
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
    
    # Lấy thông tin Department (Bộ phận & các Chức vụ) của User
    depts = db.query(Department).filter(Department.account_id == user.id).all()
    role_id = getattr(user, 'role_id', None)
    permission_ids = []
    
    for dept in depts:
        if dept.role_id and not role_id:
            role_id = dept.role_id
        if dept.permission_id and dept.permission_id not in permission_ids:
            permission_ids.append(dept.permission_id)
            
    if getattr(user, 'permission_id', None) and user.permission_id not in permission_ids:
        permission_ids.append(user.permission_id)
    
    resolved_actions = resolve_permissions_by_params(
        role_id=role_id,
        permission_id=permission_ids[0] if permission_ids else None,
        permission_level=user.permission_level,
        username=user.username,
        db=db,
        permission_ids=permission_ids
    )
    
    # 4. Ghi đè cá nhân (ACL Overrides) - có độ ưu tiên cao nhất
    if user.screen_permissions:
        try:
            overrides = json.loads(user.screen_permissions)
            
            # Đồng bộ tự động cho nhóm Tài liệu ban hành: nếu có inspection-guides thì tự động áp dụng cho SOS và CTQ nếu chưa ghi đè riêng
            if "/admin/inspection-guides" in overrides:
                if "/admin/sos-guides" not in overrides:
                    overrides["/admin/sos-guides"] = overrides["/admin/inspection-guides"]
                if "/admin/ctq-guides" not in overrides:
                    overrides["/admin/ctq-guides"] = overrides["/admin/inspection-guides"]

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
