# -*- coding: utf-8 -*-
"""
Script seed toàn bộ dữ liệu chuẩn hóa cho module Quản lý Màn hình (/admin/screens)
Bao gồm toàn bộ màn hình Web và Mobile, các components/nút bấm chi tiết, hướng dẫn quy trình và liên kết Sidebar.
"""
import sys
import os
import json
from datetime import datetime

# Setup import path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db, engine, Base
import modules.system.models.system_screen
import modules.system.models.system_component
import modules.system.models.system_guide
import modules.system.models.system_sidebar

def safe_print(msg):
    try:
        print(msg)
    except Exception:
        try:
            print(msg.encode('ascii', errors='backslashreplace').decode('ascii'))
        except Exception:
            pass

def build_technical_details(handler_name, details, user_guide, called_apis, database_tables, code_snippet):
    data = {
        "handler_name": handler_name,
        "details": details,
        "user_guide": user_guide,
        "called_apis": called_apis if isinstance(called_apis, list) else [called_apis],
        "database_tables": database_tables if isinstance(database_tables, list) else [database_tables],
        "code_snippet": code_snippet
    }
    return json.dumps(data, ensure_ascii=False)

# ==========================================
# 1. DANH SÁCH MÀN HÌNH WEB
# ==========================================
WEB_SCREENS = [
    # ── Phân hệ 1: Quản lý hệ thống & Đăng nhập ──
    {
        "platform": "Web",
        "route_path": "/login",
        "backend_path": "/api/v1/accounts/login",
        "default_code": "AD01",
        "current_code": "AD01",
        "title": "Đăng nhập hệ thống",
        "subtitle": "Xác thực tài khoản người dùng và phân quyền truy cập",
        "status": "Hoàn thành",
        "target_date": "2026-03-01",
        "components": [
            {
                "name": "LoginForm",
                "type": "UI Component",
                "description": "Form nhập thông tin tài khoản đăng nhập hệ thống.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/Login/LoginView.jsx",
                "tech": {
                    "handler_name": "handleLoginSubmit",
                    "details": "Kiểm tra tính hợp lệ của tài khoản, mã hóa và gửi yêu cầu đăng nhập.",
                    "user_guide": "Nhập tên tài khoản hoặc mã nhân viên cùng mật khẩu được cấp.",
                    "called_apis": ["POST /api/v1/accounts/login"],
                    "database_tables": ["accounts", "employees"],
                    "code_snippet": "const handleLogin = async (e) => {\n  e.preventDefault();\n  const res = await authService.login(credentials);\n  if (res.token) navigate('/admin/dashboard');\n};"
                }
            },
            {
                "name": "RememberMeCheckbox",
                "type": "UI Component",
                "description": "Ghi nhớ phiên đăng nhập trên thiết bị hiện tại.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/Login/LoginView.jsx",
                "tech": {
                    "handler_name": "handleRememberMeToggle",
                    "details": "Lưu trữ refresh token vào LocalStorage/Encrypted Cookie.",
                    "user_guide": "Tích chọn để duy trì trạng thái đăng nhập cho những lần sau.",
                    "called_apis": ["N/A"],
                    "database_tables": ["accounts"],
                    "code_snippet": "const toggleRemember = (checked) => setRememberMe(checked);"
                }
            },
            {
                "name": "LoginButton",
                "type": "UI Component",
                "description": "Nút thực hiện đăng nhập và chuyển hướng vào trang chính.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/Login/LoginView.jsx",
                "tech": {
                    "handler_name": "onLoginButtonClick",
                    "details": "Kích hoạt hiệu ứng loading và submit dữ liệu form.",
                    "user_guide": "Bấm nút Đăng nhập sau khi đã điền đầy đủ thông tin.",
                    "called_apis": ["POST /api/v1/accounts/login"],
                    "database_tables": ["accounts"],
                    "code_snippet": "<button type='submit' className='btn-primary' disabled={loading}>Đăng nhập</button>"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Nhập thông tin xác thực",
                "related_components": "LoginForm, UsernameInput, PasswordInput",
                "description": "Người dùng nhập tên đăng nhập và mật khẩu được cấp bởi phòng IT/Quản trị hệ thống."
            },
            {
                "step_number": 2,
                "title": "Xác thực và chuyển hướng",
                "related_components": "LoginButton",
                "description": "Hệ thống xác thực JWT token, phân quyền theo vai trò và chuyển hướng tới Dashboard tương ứng."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/dashboard",
        "backend_path": "/api/v1/dashboard/stats",
        "default_code": "AD02",
        "current_code": "AD02",
        "title": "Trang chủ / Dashboard",
        "subtitle": "Bảng tổng quan chỉ số vận hành toàn bộ hệ thống SmartFlow",
        "status": "Hoàn thành",
        "target_date": "2026-03-05",
        "components": [
            {
                "name": "StatCardsSummary",
                "type": "UI Component",
                "description": "Khối thẻ hiển thị tổng số lệnh sản xuất, tỷ lệ lỗi QC và tiến độ giao hàng.",
                "file_path": "/FrontEnd/Web/modules/Dashboard/Views/System/DashboardView.jsx",
                "tech": {
                    "handler_name": "fetchDashboardStats",
                    "details": "Hiển thị 4 thẻ thống kê tổng hợp thời gian thực.",
                    "user_guide": "Theo dõi nhanh số liệu biến động trong ngày hoặc theo tuần.",
                    "called_apis": ["GET /api/v1/dashboard/stats"],
                    "database_tables": ["production_orders", "qc_logs", "deliveries"],
                    "code_snippet": "const loadStats = async () => {\n  const data = await dashboardService.getStats();\n  setStats(data);\n};"
                }
            },
            {
                "name": "QCErrorTrendChart",
                "type": "UI Component",
                "description": "Biểu đồ đường thể hiện xu hướng tỷ lệ lỗi chất lượng qua các ca.",
                "file_path": "/FrontEnd/Web/modules/Dashboard/Views/System/DashboardView.jsx",
                "tech": {
                    "handler_name": "renderTrendChart",
                    "details": "Vẽ biểu đồ tương tác sử dụng Recharts/Chart.js.",
                    "user_guide": "Rê chuột vào các điểm dữ liệu để xem số lượng lỗi chi tiết.",
                    "called_apis": ["GET /api/v1/qc/trends"],
                    "database_tables": ["qc_logs", "defect_types"],
                    "code_snippet": "<ResponsiveContainer width='100%' height={300}><LineChart data={trendData} /></ResponsiveContainer>"
                }
            },
            {
                "name": "ReloadDataBtn",
                "type": "UI Component",
                "description": "Nút làm mới toàn bộ số liệu thống kê trên Dashboard.",
                "file_path": "/FrontEnd/Web/modules/Dashboard/Views/System/DashboardView.jsx",
                "tech": {
                    "handler_name": "handleReloadClick",
                    "details": "Gọi lại các API thống kê và cập nhật trạng thái giao diện.",
                    "user_guide": "Nhấn để cập nhật ngay số liệu mới nhất khi có biến động sản xuất.",
                    "called_apis": ["GET /api/v1/dashboard/stats"],
                    "database_tables": ["production_orders", "qc_logs"],
                    "code_snippet": "const handleRefresh = () => fetchDashboardData();"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xem thống kê tổng quan",
                "related_components": "StatCardsSummary",
                "description": "Quan sát các chỉ số chính gồm: Số LSX đang chạy, tỷ lệ đạt QC, phiếu chờ nhận bàn giao."
            },
            {
                "step_number": 2,
                "title": "Phân tích xu hướng lỗi",
                "related_components": "QCErrorTrendChart",
                "description": "Theo dõi biểu đồ lỗi để phát hiện sớm các công đoạn có tỷ lệ phế phẩm tăng cao."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/users",
        "backend_path": "/api/v1/accounts",
        "default_code": "AD03",
        "current_code": "AD03",
        "title": "Quản lý tài khoản",
        "subtitle": "Quản lý danh sách tài khoản, thông tin nhân sự và trạng thái hoạt động",
        "status": "Hoàn thành",
        "target_date": "2026-03-01",
        "components": [
            {
                "name": "UserTable",
                "type": "UI Component",
                "description": "Bảng hiển thị danh sách tài khoản người dùng với các cột thông tin chi tiết.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/UserManagementView.jsx",
                "tech": {
                    "handler_name": "fetchUserList",
                    "details": "Hiển thị mã NV, họ tên, username, bộ phận, vai trò, trạng thái.",
                    "user_guide": "Xem danh sách và click vào từng dòng để xem chi tiết hoặc phân quyền.",
                    "called_apis": ["GET /api/v1/accounts"],
                    "database_tables": ["accounts", "employees", "departments"],
                    "code_snippet": "const fetchUsers = async () => {\n  const res = await userService.getUsers(filters);\n  setUsers(res.data);\n};"
                }
            },
            {
                "name": "CreateUserBtn",
                "type": "UI Component",
                "description": "Nút điều hướng sang màn hình thêm mới tài khoản nhân sự.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/UserManagementView.jsx",
                "tech": {
                    "handler_name": "navigateToCreateUser",
                    "details": "Điều hướng tới route /admin/users/create.",
                    "user_guide": "Bấm nút 'Thêm tài khoản' để mở biểu mẫu nhập thông tin người dùng mới.",
                    "called_apis": ["N/A"],
                    "database_tables": ["accounts"],
                    "code_snippet": "<button onClick={() => navigate('/admin/users/create')}>Thêm người dùng</button>"
                }
            },
            {
                "name": "UserSearchInput",
                "type": "UI Component",
                "description": "Ô tìm kiếm nhanh theo mã nhân viên hoặc họ tên.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/UserManagementView.jsx",
                "tech": {
                    "handler_name": "handleSearchChange",
                    "details": "Lọc danh sách người dùng với cơ chế debounce 400ms.",
                    "user_guide": "Nhập từ khóa cần tìm và danh sách sẽ tự động lọc.",
                    "called_apis": ["GET /api/v1/accounts?search=..."],
                    "database_tables": ["accounts", "employees"],
                    "code_snippet": "const handleSearch = (e) => setSearchTerm(e.target.value);"
                }
            },
            {
                "name": "ExportExcelBtn",
                "type": "UI Component",
                "description": "Nút xuất danh sách tài khoản ra tệp Excel (.xlsx).",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/UserManagementView.jsx",
                "tech": {
                    "handler_name": "exportUserExcel",
                    "details": "Tạo file Excel chứa toàn bộ danh sách tài khoản hiện hữu.",
                    "user_guide": "Nhấn để tải về file Excel danh sách nhân sự.",
                    "called_apis": ["GET /api/v1/accounts/export"],
                    "database_tables": ["accounts"],
                    "code_snippet": "const handleExport = () => userService.exportExcel();"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tìm kiếm và lọc tài khoản",
                "related_components": "UserSearchInput, DepartmentFilter",
                "description": "Sử dụng thanh tìm kiếm hoặc dropdown phòng ban để tìm đúng nhân sự cần thao tác."
            },
            {
                "step_number": 2,
                "title": "Chỉnh sửa hoặc phân quyền",
                "related_components": "UserTable, UserRowActionMenu",
                "description": "Nhấp nút Thao tác trên từng dòng để Chỉnh sửa thông tin hoặc Phân quyền màn hình."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/users/create",
        "backend_path": "/api/v1/accounts",
        "default_code": "AD03.1",
        "current_code": "AD03.1",
        "title": "Thêm mới tài khoản",
        "subtitle": "Khởi tạo tài khoản người dùng, chọn phòng ban, chức vụ và công đoạn",
        "status": "Hoàn thành",
        "target_date": "2026-03-01",
        "components": [
            {
                "name": "UserForm",
                "type": "UI Component",
                "description": "Biểu mẫu nhập đầy đủ thông tin nhân sự và tài khoản đăng nhập.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/UserCreateView.jsx",
                "tech": {
                    "handler_name": "handleUserSubmit",
                    "details": "Kiểm tra tính hợp lệ dữ liệu mã NV, username trùng lặp trước khi gửi tạo mới.",
                    "user_guide": "Điền đầy đủ các mục có dấu sao đỏ (*).",
                    "called_apis": ["POST /api/v1/accounts"],
                    "database_tables": ["accounts", "employees"],
                    "code_snippet": "const handleSubmit = async (formData) => {\n  await userService.createUser(formData);\n  navigate('/admin/users');\n};"
                }
            },
            {
                "name": "SaveUserBtn",
                "type": "UI Component",
                "description": "Nút lưu thông tin tài khoản người dùng mới vào cơ sở dữ liệu.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/UserCreateView.jsx",
                "tech": {
                    "handler_name": "onSaveUserClick",
                    "details": "Thực hiện validate form và gửi payload tạo mới.",
                    "user_guide": "Bấm 'Lưu' để hoàn tất quá trình tạo tài khoản.",
                    "called_apis": ["POST /api/v1/accounts"],
                    "database_tables": ["accounts"],
                    "code_snippet": "<button type='submit' className='btn-primary'>Lưu tài khoản</button>"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Điền thông tin định danh",
                "related_components": "UserForm",
                "description": "Nhập mã nhân viên, họ tên, tên đăng nhập và mật khẩu khởi tạo."
            },
            {
                "step_number": 2,
                "title": "Chọn phòng ban & vai trò",
                "related_components": "DepartmentSelect, RoleSelect",
                "description": "Gán phòng ban công tác và chọn vai trò quyền hạn tương ứng."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/users/edit/:id",
        "backend_path": "/api/v1/accounts/{id}",
        "default_code": "AD03.2",
        "current_code": "AD03.2",
        "title": "Chỉnh sửa tài khoản",
        "subtitle": "Cập nhật thông tin tài khoản, đặt lại mật khẩu và trạng thái hoạt động",
        "status": "Hoàn thành",
        "target_date": "2026-03-01",
        "components": [
            {
                "name": "UserEditForm",
                "type": "UI Component",
                "description": "Biểu mẫu chỉnh sửa thông tin tài khoản hiện tại.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/UserEditView.jsx",
                "tech": {
                    "handler_name": "handleUpdateUser",
                    "details": "Tải dữ liệu người dùng theo ID và gửi bản cập nhật.",
                    "user_guide": "Thay đổi các thông tin cần sửa đổi.",
                    "called_apis": ["GET /api/v1/accounts/{id}", "PUT /api/v1/accounts/{id}"],
                    "database_tables": ["accounts", "employees"],
                    "code_snippet": "const handleUpdate = async () => await userService.update(id, formData);"
                }
            },
            {
                "name": "ResetPasswordBtn",
                "type": "UI Component",
                "description": "Nút mở hộp thoại đặt lại mật khẩu cho người dùng.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/UserEditView.jsx",
                "tech": {
                    "handler_name": "handleResetPassword",
                    "details": "Gửi yêu cầu reset mật khẩu về mặc định hoặc mật khẩu mới.",
                    "user_guide": "Bấm nút để đặt lại mật khẩu mới khi nhân sự quên mật khẩu.",
                    "called_apis": ["POST /api/v1/accounts/{id}/reset-password"],
                    "database_tables": ["accounts"],
                    "code_snippet": "const resetPass = async () => await userService.resetPassword(id, newPass);"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Cập nhật thông tin",
                "related_components": "UserEditForm",
                "description": "Chỉnh sửa các trường thông tin cần cập nhật và nhấn nút Lưu thay đổi."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/users/permissions/:id",
        "backend_path": "/api/v1/accounts/{id}/permissions",
        "default_code": "AD03.3",
        "current_code": "AD03.3",
        "title": "Phân quyền tài khoản",
        "subtitle": "Thiết lập ma trận quyền xem, tạo, sửa, xóa, duyệt và xuất nhập dữ liệu",
        "status": "Hoàn thành",
        "target_date": "2026-03-02",
        "components": [
            {
                "name": "PermissionMatrixTable",
                "type": "UI Component",
                "description": "Bảng ma trận quyền hạn theo từng màn hình và tính năng trong hệ thống.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/UserPermissionView.jsx",
                "tech": {
                    "handler_name": "handlePermissionChange",
                    "details": "Quản lý trạng thái các quyền read, create, edit, delete, approve, export_import theo từng mã màn hình.",
                    "user_guide": "Tích chọn các quyền hạn tương ứng với từng chức năng cho tài khoản.",
                    "called_apis": ["GET /api/v1/accounts/{id}/permissions", "PUT /api/v1/accounts/{id}/permissions"],
                    "database_tables": ["accounts", "permissions", "system_screens"],
                    "code_snippet": "const savePerms = async () => await permissionService.save(id, permData);"
                }
            },
            {
                "name": "SavePermissionBtn",
                "type": "UI Component",
                "description": "Nút lưu cấu hình phân quyền vừa thiết lập.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/UserPermissionView.jsx",
                "tech": {
                    "handler_name": "onSavePermissions",
                    "details": "Đóng gói JSON quyền và lưu vào CSDL.",
                    "user_guide": "Bấm 'Lưu quyền' để áp dụng ngay lập tức cho tài khoản.",
                    "called_apis": ["PUT /api/v1/accounts/{id}/permissions"],
                    "database_tables": ["permissions"],
                    "code_snippet": "<button onClick={handleSave} className='btn-primary'>Lưu phân quyền</button>"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Thiết lập quyền màn hình",
                "related_components": "PermissionMatrixTable",
                "description": "Chọn các ô quyền hạn chi tiết cho từng phân hệ hoặc sử dụng nút Chọn tất cả."
            },
            {
                "step_number": 2,
                "title": "Lưu và áp dụng",
                "related_components": "SavePermissionBtn",
                "description": "Lưu thiết lập; người dùng sẽ có hiệu lực quyền mới ngay trong phiên làm việc tiếp theo."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/users/departments",
        "backend_path": "/api/v1/departments",
        "default_code": "AD03.4",
        "current_code": "AD03.4",
        "title": "Quản lý phòng ban",
        "subtitle": "Danh mục cơ cấu các phòng ban, xưởng sản xuất và bộ phận nghiệp vụ",
        "status": "Hoàn thành",
        "target_date": "2026-03-02",
        "components": [
            {
                "name": "DepartmentTable",
                "type": "UI Component",
                "description": "Bảng danh sách các phòng ban với mã, tên, trưởng bộ phận và số lượng nhân sự.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/Department/DepartmentManagementView.jsx",
                "tech": {
                    "handler_name": "fetchDepartments",
                    "details": "Hiển thị danh sách phòng ban và thống kê nhân sự.",
                    "user_guide": "Xem và quản lý phòng ban trong toàn công ty.",
                    "called_apis": ["GET /api/v1/departments"],
                    "database_tables": ["departments", "employees"],
                    "code_snippet": "const loadDept = async () => setDepartments(await deptService.getAll());"
                }
            },
            {
                "name": "AddDepartmentBtn",
                "type": "UI Component",
                "description": "Nút mở popup thêm mới phòng ban.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/Department/DepartmentManagementView.jsx",
                "tech": {
                    "handler_name": "openAddDeptModal",
                    "details": "Mở modal nhập mã và tên phòng ban.",
                    "user_guide": "Bấm để tạo thêm phòng ban hoặc bộ phận mới.",
                    "called_apis": ["POST /api/v1/departments"],
                    "database_tables": ["departments"],
                    "code_snippet": "<button onClick={() => setShowAddModal(true)}>Thêm phòng ban</button>"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tạo mới phòng ban",
                "related_components": "AddDepartmentBtn",
                "description": "Nhập mã phòng ban, tên tiếng Việt, mô tả và chọn trưởng bộ phận."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/users/positions",
        "backend_path": "/api/v1/positions",
        "default_code": "AD03.5",
        "current_code": "AD03.5",
        "title": "Quản lý chức vụ",
        "subtitle": "Danh mục chức danh nghề nghiệp, cấp bậc và vai trò công tác",
        "status": "Hoàn thành",
        "target_date": "2026-03-02",
        "components": [
            {
                "name": "PositionTable",
                "type": "UI Component",
                "description": "Bảng danh mục chức vụ và cấp bậc trong hệ thống.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/PositionManagementView.jsx",
                "tech": {
                    "handler_name": "fetchPositions",
                    "details": "Tải danh sách chức vụ từ CSDL.",
                    "user_guide": "Xem và quản lý các chức danh chức vụ.",
                    "called_apis": ["GET /api/v1/positions"],
                    "database_tables": ["positions"],
                    "code_snippet": "const loadPos = async () => setPositions(await posService.getAll());"
                }
            },
            {
                "name": "AddPositionBtn",
                "type": "UI Component",
                "description": "Nút tạo thêm chức vụ mới.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/User/PositionManagementView.jsx",
                "tech": {
                    "handler_name": "openAddPosModal",
                    "details": "Mở modal thêm chức danh.",
                    "user_guide": "Nhấn để tạo thêm vị trí chức vụ.",
                    "called_apis": ["POST /api/v1/positions"],
                    "database_tables": ["positions"],
                    "code_snippet": "<button onClick={() => setShowModal(true)}>Thêm chức vụ</button>"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Quản lý chức danh",
                "related_components": "PositionTable, AddPositionBtn",
                "description": "Khai báo chức danh để phân bổ cho nhân sự trong hồ sơ nhân viên."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/monitor",
        "backend_path": "/api/v1/system/monitor",
        "default_code": "AD04",
        "current_code": "AD04",
        "title": "Giám sát hệ thống",
        "subtitle": "Theo dõi hiệu năng máy chủ, CPU, RAM, ổ cứng và phiên làm việc",
        "status": "Hoàn thành",
        "target_date": "2026-03-03",
        "components": [
            {
                "name": "CpuRamDiskGauge",
                "type": "UI Component",
                "description": "Đồng hồ đo phần trăm tài nguyên sử dụng phần cứng của máy chủ Backend.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Monitor/SystemMonitorView.jsx",
                "tech": {
                    "handler_name": "fetchSystemMetrics",
                    "details": "Truy vấn mức sử dụng CPU, RAM, Disk qua thư viện psutil.",
                    "user_guide": "Theo dõi tình trạng tải của hệ thống máy chủ.",
                    "called_apis": ["GET /api/v1/system/metrics"],
                    "database_tables": ["system_metrics"],
                    "code_snippet": "const loadMetrics = async () => setMetrics(await monitorService.getMetrics());"
                }
            },
            {
                "name": "ActiveSessionsTable",
                "type": "UI Component",
                "description": "Bảng hiển thị các phiên làm việc và tài khoản đang trực tuyến.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Monitor/SystemMonitorView.jsx",
                "tech": {
                    "handler_name": "fetchActiveSessions",
                    "details": "Liệt kê danh sách IP, thiết bị và thời gian đăng nhập gần nhất.",
                    "user_guide": "Theo dõi người dùng đang hoạt động trong hệ thống.",
                    "called_apis": ["GET /api/v1/system/sessions"],
                    "database_tables": ["accounts", "user_sessions"],
                    "code_snippet": "<Table data={sessions} columns={sessionColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Kiểm tra tải máy chủ",
                "related_components": "CpuRamDiskGauge",
                "description": "Quan sát biểu đồ CPU/RAM nếu vượt quá 85% cần xem xét giải phóng tài nguyên."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/screens",
        "backend_path": "/api/v1/system/screens",
        "default_code": "AD05",
        "current_code": "AD05",
        "title": "Danh sách màn hình",
        "subtitle": "Quản lý toàn bộ danh mục màn hình hệ thống, đặc tả chi tiết và trạng thái",
        "status": "Hoàn thành",
        "target_date": "2026-03-03",
        "components": [
            {
                "name": "ScreenGridTable",
                "type": "UI Component",
                "description": "Bảng hiển thị đầy đủ các màn hình Web và Mobile kèm phân hệ, trạng thái và lỗi phát sinh.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/ScreenManagementView.jsx",
                "tech": {
                    "handler_name": "fetchScreensData",
                    "details": "Tải danh sách màn hình từ API /api/v1/system/screens, hỗ trợ lọc đa tiêu chí.",
                    "user_guide": "Xem danh sách và click đúp hoặc bấm icon mắt để mở chi tiết đặc tả màn hình.",
                    "called_apis": ["GET /api/v1/system/screens"],
                    "database_tables": ["system_screens", "system_components", "screen_bugs"],
                    "code_snippet": "const loadScreens = async () => {\n  const data = await screenService.getScreens();\n  setScreens(data);\n};"
                }
            },
            {
                "name": "SubsystemFilter",
                "type": "UI Component",
                "description": "Dropdown lọc màn hình theo phân hệ chức năng nghiệp vụ.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/ScreenManagementView.jsx",
                "tech": {
                    "handler_name": "handleSubsystemFilterChange",
                    "details": "Lọc các màn hình theo Trang chủ, Quản lý hệ thống, Nhân sự, Sản xuất, Chất lượng, Kinh doanh, Kỹ thuật, Bảo trì, KPI.",
                    "user_guide": "Chọn phân hệ để thu hẹp phạm vi màn hình cần xem.",
                    "called_apis": ["N/A"],
                    "database_tables": ["system_screens"],
                    "code_snippet": "const filterBySubsystem = (sub) => setSubsystemFilter(sub);"
                }
            },
            {
                "name": "PlatformFilter",
                "type": "UI Component",
                "description": "Bộ lọc chuyển đổi giữa nền tảng Web và Mobile.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/ScreenManagementView.jsx",
                "tech": {
                    "handler_name": "handlePlatformFilterChange",
                    "details": "Lọc theo platform = 'Web' hoặc 'Mobile'.",
                    "user_guide": "Chọn Web hoặc Mobile để xem danh sách màn hình theo nền tảng.",
                    "called_apis": ["N/A"],
                    "database_tables": ["system_screens"],
                    "code_snippet": "<select value={platform} onChange={(e) => setPlatform(e.target.value)} />"
                }
            },
            {
                "name": "ExportDocxBtn",
                "type": "UI Component",
                "description": "Nút xuất khẩu tài liệu đặc tả màn hình ra file Word (.docx) hoặc Excel.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/ScreenManagementView.jsx",
                "tech": {
                    "handler_name": "handleExportDetailDocx",
                    "details": "Gửi yêu cầu xuất tài liệu đặc tả tổng hợp hoặc theo từng màn hình.",
                    "user_guide": "Chọn các màn hình cần xuất và bấm 'Xuất tài liệu đặc tả'.",
                    "called_apis": ["POST /api/v1/system/screens/export-detail"],
                    "database_tables": ["system_screens", "system_components", "system_guides"],
                    "code_snippet": "const handleExport = () => screenService.exportDetail(selectedIds);"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Lọc và tìm kiếm màn hình",
                "related_components": "SubsystemFilter, PlatformFilter, SearchScreenInput",
                "description": "Chọn nền tảng Web hoặc Mobile và phân hệ tương ứng để xem danh sách các màn hình."
            },
            {
                "step_number": 2,
                "title": "Xem chi tiết đặc tả kỹ thuật",
                "related_components": "ScreenGridTable",
                "description": "Nhấp vào dòng màn hình để mở trang đặc tả bao gồm danh sách components, API, CSDL và các bước hướng dẫn."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/screens/:id",
        "backend_path": "/api/v1/system/screens/{id}",
        "default_code": "AD05.1",
        "current_code": "AD05.1",
        "title": "Chi tiết & Đặc tả màn hình",
        "subtitle": "Xem và chỉnh sửa đặc tả chi tiết, danh sách nút bấm, components và luồng nghiệp vụ",
        "status": "Hoàn thành",
        "target_date": "2026-03-03",
        "components": [
            {
                "name": "ScreenMetadataCard",
                "type": "UI Component",
                "description": "Thẻ hiển thị thông tin cơ bản: Mã màn hình, Route, Backend API, Trạng thái.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/ScreenDetailView.jsx",
                "tech": {
                    "handler_name": "fetchScreenDetail",
                    "details": "Tải chi tiết màn hình kèm danh sách components, guides và bugs.",
                    "user_guide": "Xem và chỉnh sửa thông tin tổng quát của màn hình.",
                    "called_apis": ["GET /api/v1/system/screens/{id}", "PUT /api/v1/system/screens/{id}"],
                    "database_tables": ["system_screens"],
                    "code_snippet": "const loadScreen = async () => setScreen(await screenService.getScreenById(id));"
                }
            },
            {
                "name": "ComponentListSection",
                "type": "UI Component",
                "description": "Danh sách các nút bấm, biểu mẫu, bảng dữ liệu và thành phần giao diện của màn hình.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/ScreenDetailView.jsx",
                "tech": {
                    "handler_name": "renderComponentList",
                    "details": "Hiển thị chi tiết từng component kèm handler, APIs gọi, bảng CSDL và đoạn mã code mẫu.",
                    "user_guide": "Xem đặc tả kỹ thuật của từng nút bấm trên giao diện.",
                    "called_apis": ["GET /api/v1/system/screens/{id}/components"],
                    "database_tables": ["system_components"],
                    "code_snippet": "<ComponentList items={screen.components} onEdit={handleEditComp} />"
                }
            },
            {
                "name": "GuideFlowSection",
                "type": "UI Component",
                "description": "Quy trình các bước hướng dẫn người dùng thực hiện thao tác trên màn hình.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/ScreenDetailView.jsx",
                "tech": {
                    "handler_name": "renderGuideSteps",
                    "details": "Hiển thị thứ tự các bước thao tác nghiệp vụ chuẩn hóa.",
                    "user_guide": "Đọc hướng dẫn từng bước để sử dụng đúng quy trình.",
                    "called_apis": ["GET /api/v1/system/screens/{id}/guides"],
                    "database_tables": ["system_guides"],
                    "code_snippet": "<GuideFlow steps={screen.guides} />"
                }
            },
            {
                "name": "AddComponentBtn",
                "type": "UI Component",
                "description": "Nút thêm mới một component hoặc nút bấm vào đặc tả màn hình.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/ScreenDetailView.jsx",
                "tech": {
                    "handler_name": "openAddComponentModal",
                    "details": "Mở popup điền thông tin component, API và file path.",
                    "user_guide": "Bấm để bổ sung thêm nút bấm hoặc thành phần mới cho màn hình.",
                    "called_apis": ["POST /api/v1/system/screens/{id}/components"],
                    "database_tables": ["system_components"],
                    "code_snippet": "<button onClick={() => setShowAddComp(true)}>Thêm Component</button>"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Kiểm tra danh sách thành phần",
                "related_components": "ComponentListSection",
                "description": "Xem chi tiết từng nút bấm xem đã gắn đúng API backend và bảng CSDL liên quan chưa."
            },
            {
                "step_number": 2,
                "title": "Xem hướng dẫn thao tác",
                "related_components": "GuideFlowSection",
                "description": "Xem các bước chuẩn nghiệp vụ từ khi mở màn hình tới khi hoàn tất lưu dữ liệu."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/screens/bugs",
        "backend_path": "/api/v1/system/bugs",
        "default_code": "AD05.2",
        "current_code": "AD05.2",
        "title": "Quản lý lỗi màn hình",
        "subtitle": "Theo dõi, tiếp nhận và phân công xử lý các lỗi phát sinh trên từng màn hình",
        "status": "Hoàn thành",
        "target_date": "2026-03-03",
        "components": [
            {
                "name": "BugKanbanBoard",
                "type": "UI Component",
                "description": "Bảng Kanban theo dõi trạng thái lỗi: Mới tạo, Đang sửa, Đã fix, Hoàn tất.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/ScreenBugManagementView.jsx",
                "tech": {
                    "handler_name": "fetchBugsList",
                    "details": "Kéo thả cập nhật trạng thái lỗi giữa các cột.",
                    "user_guide": "Theo dõi tiến độ sửa lỗi của đội ngũ kỹ thuật IT.",
                    "called_apis": ["GET /api/v1/system/bugs", "PUT /api/v1/system/bugs/{id}/status"],
                    "database_tables": ["screen_bugs", "system_screens"],
                    "code_snippet": "const handleStatusChange = async (bugId, status) => await bugService.updateStatus(bugId, status);"
                }
            },
            {
                "name": "CreateBugBtn",
                "type": "UI Component",
                "description": "Nút mở biểu mẫu báo cáo lỗi phát sinh trên màn hình.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/ScreenBugManagementView.jsx",
                "tech": {
                    "handler_name": "openCreateBugModal",
                    "details": "Mở popup nhập tiêu đề lỗi, màn hình xảy ra lỗi, mức độ nghiêm trọng và ảnh chụp minh chứng.",
                    "user_guide": "Nhấn để ghi nhận lỗi mới cần sửa.",
                    "called_apis": ["POST /api/v1/system/bugs"],
                    "database_tables": ["screen_bugs"],
                    "code_snippet": "<button onClick={() => setShowBugModal(true)}>Báo cáo lỗi mới</button>"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tạo báo cáo lỗi",
                "related_components": "CreateBugBtn",
                "description": "Chọn màn hình xảy ra lỗi, mô tả chi tiết các bước tái hiện và tải ảnh đính kèm."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/screens/progress",
        "backend_path": "/api/v1/system/screens/progress",
        "default_code": "AD05.3",
        "current_code": "AD05.3",
        "title": "Tiến độ dự án",
        "subtitle": "Bảng điều khiển theo dõi tiến độ phát triển và hoàn thiện các màn hình",
        "status": "Hoàn thành",
        "target_date": "2026-03-03",
        "components": [
            {
                "name": "ModuleProgressBar",
                "type": "UI Component",
                "description": "Thanh tiến độ tổng quan phần trăm hoàn thành theo từng phân hệ chức năng.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Project/ProjectProgressView.jsx",
                "tech": {
                    "handler_name": "fetchProgressData",
                    "details": "Tính toán phần trăm màn hình ở trạng thái 'Hoàn thành' trên tổng số màn hình.",
                    "user_guide": "Xem tỷ lệ hoàn thành dự án theo thời gian thực.",
                    "called_apis": ["GET /api/v1/system/screens/progress"],
                    "database_tables": ["system_screens"],
                    "code_snippet": "const loadProgress = async () => setProgress(await screenService.getProgress());"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Theo dõi tiến độ phát triển",
                "related_components": "ModuleProgressBar",
                "description": "Quan sát biểu đồ hoàn thiện để đảm bảo tiến độ bàn giao đúng kế hoạch."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/sidebar",
        "backend_path": "/api/v1/system/sidebar",
        "default_code": "AD06",
        "current_code": "AD06",
        "title": "Cấu hình Sidebar",
        "subtitle": "Tùy chỉnh cây danh mục menu bên trái cho Web và Mobile",
        "status": "Hoàn thành",
        "target_date": "2026-03-04",
        "components": [
            {
                "name": "SidebarTreeDragDrop",
                "type": "UI Component",
                "description": "Cây danh mục Sidebar cho phép kéo thả sắp xếp thứ tự và phân cấp cha-con.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/SidebarManagementView.jsx",
                "tech": {
                    "handler_name": "handleDragEnd",
                    "details": "Cập nhật sort_order và parent_id cho các mục menu.",
                    "user_guide": "Kéo thả các mục menu để thay đổi vị trí hiển thị trên thanh Sidebar.",
                    "called_apis": ["GET /api/v1/system/sidebar", "PUT /api/v1/system/sidebar/reorder"],
                    "database_tables": ["system_sidebars", "system_screens"],
                    "code_snippet": "const onDragEnd = (result) => updateSidebarOrder(result);"
                }
            },
            {
                "name": "AddMenuBtn",
                "type": "UI Component",
                "description": "Nút thêm một mục menu mới vào thanh Sidebar.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Screen/SidebarManagementView.jsx",
                "tech": {
                    "handler_name": "openAddMenuModal",
                    "details": "Mở modal chọn màn hình liên kết, icon và tiêu đề hiển thị.",
                    "user_guide": "Nhấn để thêm menu mới vào danh sách.",
                    "called_apis": ["POST /api/v1/system/sidebar"],
                    "database_tables": ["system_sidebars"],
                    "code_snippet": "<button onClick={() => setShowAddModal(true)}>Thêm mục menu</button>"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Sắp xếp cấu trúc menu",
                "related_components": "SidebarTreeDragDrop",
                "description": "Kéo thả các mục menu hoặc nhóm chức năng để thay đổi thứ tự hiển thị trên Sidebar."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/system-config",
        "backend_path": "/api/v1/system/config",
        "default_code": "AD07",
        "current_code": "AD07",
        "title": "Cấu hình hệ thống",
        "subtitle": "Thiết lập thông tin doanh nghiệp, máy chủ email SMTP và quy tắc hệ thống",
        "status": "Hoàn thành",
        "target_date": "2026-03-04",
        "components": [
            {
                "name": "CompanyInfoForm",
                "type": "UI Component",
                "description": "Biểu mẫu cấu hình tên công ty, logo, địa chỉ và thông tin liên hệ trên các phiếu in.",
                "file_path": "/FrontEnd/Web/modules/System/Views/SystemConfig/SystemConfigView.jsx",
                "tech": {
                    "handler_name": "saveCompanyConfig",
                    "details": "Lưu cấu hình tổng quát hệ thống vào bảng settings.",
                    "user_guide": "Cập nhật thông tin doanh nghiệp để tự động in trên tiêu đề báo cáo.",
                    "called_apis": ["GET /api/v1/system/config", "POST /api/v1/system/config"],
                    "database_tables": ["system_configs"],
                    "code_snippet": "const handleSave = async () => await configService.save(configData);"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Cập nhật thông tin hệ thống",
                "related_components": "CompanyInfoForm",
                "description": "Nhập tên công ty, số điện thoại, tải logo thương hiệu và lưu cấu hình."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/data",
        "backend_path": "/api/v1/data-packages",
        "default_code": "AD08",
        "current_code": "AD08",
        "title": "Đóng gói dữ liệu & Backup",
        "subtitle": "Sao lưu dữ liệu định kỳ, xuất gói dữ liệu và phục hồi cơ sở dữ liệu",
        "status": "Hoàn thành",
        "target_date": "2026-03-04",
        "components": [
            {
                "name": "PackageListTable",
                "type": "UI Component",
                "description": "Bảng danh sách các gói sao lưu cơ sở dữ liệu và dữ liệu kinh doanh.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Data/DataPackagingView.jsx",
                "tech": {
                    "handler_name": "fetchDataPackages",
                    "details": "Hiển thị tên gói, dung lượng, thời gian tạo và nút tải về.",
                    "user_guide": "Xem danh sách các bản backup và tải về máy khi cần.",
                    "called_apis": ["GET /api/v1/data-packages"],
                    "database_tables": ["data_packages"],
                    "code_snippet": "<Table data={packages} columns={packageColumns} />"
                }
            },
            {
                "name": "CreatePackageBtn",
                "type": "UI Component",
                "description": "Nút kích hoạt sao lưu và đóng gói dữ liệu tức thì.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Data/DataPackagingView.jsx",
                "tech": {
                    "handler_name": "handleCreateBackup",
                    "details": "Gửi yêu cầu dump database ra tệp nén .bak hoặc .zip.",
                    "user_guide": "Bấm 'Tạo bản sao lưu mới' để lưu trữ an toàn dữ liệu hiện tại.",
                    "called_apis": ["POST /api/v1/data-packages/create"],
                    "database_tables": ["data_packages"],
                    "code_snippet": "const createBackup = async () => await dataService.createPackage();"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tạo bản sao lưu",
                "related_components": "CreatePackageBtn",
                "description": "Nhấn nút tạo bản sao lưu và chờ hệ thống đóng gói tệp dữ liệu hoàn tất."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/backup-qrs",
        "backend_path": "/api/v1/backup-qrs",
        "default_code": "AD09",
        "current_code": "AD09",
        "title": "Quản lý mã QR tạm",
        "subtitle": "Khởi tạo, in ấn và theo dõi các mã QR dự phòng dùng cho luân chuyển công đoạn",
        "status": "Hoàn thành",
        "target_date": "2026-03-04",
        "components": [
            {
                "name": "BackupQRTable",
                "type": "UI Component",
                "description": "Bảng danh sách mã QR tạm với trạng thái: Chưa dùng, Đang dùng, Đã hủy.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Backup/BackupQRManagementView.jsx",
                "tech": {
                    "handler_name": "fetchBackupQRs",
                    "details": "Quản lý vòng đời mã QR dự phòng chống nghẽn chuyền sản xuất.",
                    "user_guide": "Theo dõi các mã QR tạm đã phát hành cho xưởng.",
                    "called_apis": ["GET /api/v1/backup-qrs"],
                    "database_tables": ["backup_qrs"],
                    "code_snippet": "const loadQRs = async () => setQrs(await qrService.getAll());"
                }
            },
            {
                "name": "GenerateQRBtn",
                "type": "UI Component",
                "description": "Nút tạo hàng loạt mã QR tạm theo số lượng yêu cầu.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Backup/BackupQRManagementView.jsx",
                "tech": {
                    "handler_name": "handleGenerateQRs",
                    "details": "Sinh mã hash ngẫu nhiên không trùng lặp và lưu vào CSDL.",
                    "user_guide": "Nhập số lượng mã cần in và bấm 'Tạo mã QR'.",
                    "called_apis": ["POST /api/v1/backup-qrs/generate"],
                    "database_tables": ["backup_qrs"],
                    "code_snippet": "const generateQRs = async (qty) => await qrService.generate(qty);"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tạo và in mã QR tạm",
                "related_components": "GenerateQRBtn, PrintQRSheetBtn",
                "description": "Tạo số lượng thẻ QR cần thiết và in phát cho tổ trưởng để dùng khi mất mạng hoặc sự cố thiết bị."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/feedback",
        "backend_path": "/api/v1/feedback",
        "default_code": "AD10",
        "current_code": "AD10",
        "title": "Theo dõi góp ý & Cải tiến",
        "subtitle": "Tiếp nhận các phản hồi, đề xuất cải tiến quy trình từ công nhân và nhân viên",
        "status": "Hoàn thành",
        "target_date": "2026-03-05",
        "components": [
            {
                "name": "FeedbackTable",
                "type": "UI Component",
                "description": "Bảng hiển thị các phản hồi góp ý từ ứng dụng Mobile.",
                "file_path": "/FrontEnd/Web/modules/CAPA/Views/Improvement/ImprovementsView.jsx",
                "tech": {
                    "handler_name": "fetchFeedbacks",
                    "details": "Hiển thị người gửi, nội dung góp ý, hình ảnh và trạng thái xử lý.",
                    "user_guide": "Xem và phản hồi lại ý kiến của người lao động.",
                    "called_apis": ["GET /api/v1/feedback"],
                    "database_tables": ["feedbacks"],
                    "code_snippet": "<Table data={feedbacks} columns={feedbackColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xử lý góp ý",
                "related_components": "FeedbackTable",
                "description": "Xem chi tiết nội dung đề xuất và chuyển thành hành động cải tiến hoặc phản hồi lại người gửi."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/logs",
        "backend_path": "/api/v1/incident-logs",
        "default_code": "AD11",
        "current_code": "AD11",
        "title": "Nhật ký sự cố kỹ thuật",
        "subtitle": "Tra cứu lịch sử ghi nhận sự cố máy móc, lỗi chất lượng và gián đoạn sản xuất",
        "status": "Hoàn thành",
        "target_date": "2026-03-05",
        "components": [
            {
                "name": "LogDataTable",
                "type": "UI Component",
                "description": "Bảng dữ liệu nhật ký sự cố chi tiết kèm mức độ nghiêm trọng và thời gian khắc phục.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Monitor/IncidentLogsView.jsx",
                "tech": {
                    "handler_name": "fetchIncidentLogs",
                    "details": "Tải danh sách sự cố từ CSDL, lọc theo ngày và mức độ.",
                    "user_guide": "Tra cứu nguyên nhân và giải pháp đã áp dụng cho các sự cố trong quá khứ.",
                    "called_apis": ["GET /api/v1/incident-logs"],
                    "database_tables": ["incident_logs"],
                    "code_snippet": "const loadLogs = async () => setLogs(await logService.getLogs(filters));"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tra cứu nhật ký sự cố",
                "related_components": "LogDataTable",
                "description": "Lọc theo khoảng ngày và vị trí xảy ra sự cố để xuất báo cáo đánh giá rủi ro."
            }
        ]
    },

    # ── Phân hệ 2: Quản lý nhân sự (HR) ──
    {
        "platform": "Web",
        "route_path": "/admin/hr/org-chart",
        "backend_path": "/api/v1/hr/org-chart",
        "default_code": "HS01",
        "current_code": "HS01",
        "title": "Sơ đồ tổ chức nhân sự",
        "subtitle": "Sơ đồ cây phân cấp cấu trúc tổ chức toàn bộ công ty",
        "status": "Hoàn thành",
        "target_date": "2026-03-05",
        "components": [
            {
                "name": "InteractiveOrgTree",
                "type": "UI Component",
                "description": "Cây sơ đồ tổ chức tương tác có thể phóng to, thu nhỏ và đóng mở các nhánh.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/HR/OrgChartView.jsx",
                "tech": {
                    "handler_name": "renderOrgTree",
                    "details": "Sử dụng D3.js / React Flow để vẽ cây tổ chức phân cấp động.",
                    "user_guide": "Click vào nút cộng/trừ trên các khối để mở rộng hoặc thu gọn nhánh phòng ban.",
                    "called_apis": ["GET /api/v1/hr/org-chart"],
                    "database_tables": ["org_structures", "employees", "departments"],
                    "code_snippet": "<OrgTreeCanvas data={orgData} onNodeClick={handleNodeClick} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xem cơ cấu tổ chức",
                "related_components": "InteractiveOrgTree",
                "description": "Xem phân bổ nhân sự từ Ban Giám Đốc xuống các Khối, Phòng ban và Xưởng sản xuất."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/hr/employees",
        "backend_path": "/api/v1/employees",
        "default_code": "HS05",
        "current_code": "HS05",
        "title": "Danh sách nhân viên",
        "subtitle": "Hồ sơ nhân sự toàn diện: thông tin cá nhân, hợp đồng, chức vụ và công đoạn",
        "status": "Hoàn thành",
        "target_date": "2026-03-05",
        "components": [
            {
                "name": "EmployeeTable",
                "type": "UI Component",
                "description": "Bảng hồ sơ nhân viên với hình ảnh, mã nhân sự, chức danh và trạng thái hợp đồng.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/Employee/EmployeeListView.jsx",
                "tech": {
                    "handler_name": "fetchEmployees",
                    "details": "Tải danh sách nhân sự kèm thông tin bộ phận và công đoạn sản xuất trực thuộc.",
                    "user_guide": "Tra cứu thông tin liên hệ và hồ sơ nhân sự của từng nhân viên.",
                    "called_apis": ["GET /api/v1/employees"],
                    "database_tables": ["employees", "departments", "positions", "stages"],
                    "code_snippet": "const loadEmp = async () => setEmployees(await employeeService.getAll(filters));"
                }
            },
            {
                "name": "ImportExcelBtn",
                "type": "UI Component",
                "description": "Nút nhập hàng loạt danh sách nhân viên từ tệp Excel chuẩn.",
                "file_path": "/FrontEnd/Web/modules/Auth/Views/Employee/EmployeeListView.jsx",
                "tech": {
                    "handler_name": "handleImportExcel",
                    "details": "Đọc file Excel, validate dữ liệu và import hàng loạt vào CSDL.",
                    "user_guide": "Tải mẫu file Excel, điền thông tin và bấm 'Nhập Excel'.",
                    "called_apis": ["POST /api/v1/employees/import-excel"],
                    "database_tables": ["employees"],
                    "code_snippet": "const handleImport = (file) => employeeService.importExcel(file);"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tìm kiếm và xuất hồ sơ",
                "related_components": "EmployeeTable, ExportExcelBtn",
                "description": "Lọc theo phòng ban và xuất dữ liệu danh sách nhân sự ra tệp Excel khi cần kiểm toán."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/hr/assessments",
        "backend_path": "/api/v1/hr/assessments",
        "default_code": "HS07",
        "current_code": "HS07",
        "title": "Đánh giá năng lực & Tuyển dụng",
        "subtitle": "Ngân hàng câu hỏi trắc nghiệm, tạo đề thi sát hạch và chấm điểm ứng viên tự động",
        "status": "Hoàn thành",
        "target_date": "2026-03-05",
        "components": [
            {
                "name": "AssessmentTable",
                "type": "UI Component",
                "description": "Bảng danh sách các bài thi sát hạch và kết quả kiểm tra năng lực của ứng viên.",
                "file_path": "/FrontEnd/Web/modules/HR/Views/Assessment/AssessmentListView.jsx",
                "tech": {
                    "handler_name": "fetchAssessments",
                    "details": "Hiển thị mã bài thi, vị trí tuyển dụng, điểm số và trạng thái đạt/không đạt.",
                    "user_guide": "Xem kết quả bài kiểm tra của các ứng viên dự tuyển.",
                    "called_apis": ["GET /api/v1/hr/assessments"],
                    "database_tables": ["assessments", "candidate_quizzes"],
                    "code_snippet": "const loadAssessments = async () => setAssessments(await hrService.getAssessments());"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tạo bài thi sát hạch",
                "related_components": "AssessmentTable",
                "description": "Tạo mã đề thi mới và gửi mã QR / liên kết cho ứng viên làm bài trực tuyến."
            }
        ]
    },

    # ── Phân hệ 3: Hồ sơ ISO & Tài liệu ban hành ──
    {
        "platform": "Web",
        "route_path": "/admin/iso-documents",
        "backend_path": "/api/v1/iso/documents",
        "default_code": "ISO01",
        "current_code": "ISO01",
        "title": "Quản lý mẫu tài liệu ISO",
        "subtitle": "Kho lưu trữ và thiết kế biểu mẫu tiêu chuẩn chất lượng ISO 9001",
        "status": "Hoàn thành",
        "target_date": "2026-03-06",
        "components": [
            {
                "name": "ISODocumentTable",
                "type": "UI Component",
                "description": "Bảng danh mục biểu mẫu ISO kèm số hiệu, lần ban hành và trạng thái phê duyệt.",
                "file_path": "/FrontEnd/Web/modules/ISO/Views/Document/ISODocumentListView.jsx",
                "tech": {
                    "handler_name": "fetchISODocs",
                    "details": "Hiển thị danh sách tài liệu biểu mẫu ISO phân quyền theo phòng ban.",
                    "user_guide": "Tra cứu và tải về các mẫu biểu phục vụ kiểm soát chất lượng.",
                    "called_apis": ["GET /api/v1/iso/documents"],
                    "database_tables": ["iso_documents"],
                    "code_snippet": "<Table data={isoDocs} columns={isoColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tra cứu biểu mẫu ISO",
                "related_components": "ISODocumentTable",
                "description": "Lọc theo danh mục tài liệu để xem hoặc chỉnh sửa phiên bản mới nhất."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/iso-processes",
        "backend_path": "/api/v1/iso/processes",
        "default_code": "ISO02",
        "current_code": "ISO02",
        "title": "Quy trình nghiệp vụ ISO",
        "subtitle": "Quản lý các lưu đồ và tài liệu quy trình vận hành chuẩn (SOP)",
        "status": "Hoàn thành",
        "target_date": "2026-03-06",
        "components": [
            {
                "name": "ProcessFlowList",
                "type": "UI Component",
                "description": "Danh sách các quy trình nghiệp vụ chuẩn kèm sơ đồ lưu đồ tương tác.",
                "file_path": "/FrontEnd/Web/modules/ISO/Views/Document/ISODocumentListView.jsx",
                "tech": {
                    "handler_name": "fetchISOProcesses",
                    "details": "Hiển thị danh mục quy trình nghiệp vụ.",
                    "user_guide": "Xem quy trình từng bước của từng phòng ban nghiệp vụ.",
                    "called_apis": ["GET /api/v1/iso/processes"],
                    "database_tables": ["iso_processes"],
                    "code_snippet": "const loadProcesses = async () => setProcesses(await isoService.getProcesses());"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xem lưu đồ quy trình",
                "related_components": "ProcessFlowList",
                "description": "Nhấp vào quy trình để xem chi tiết lưu đồ luồng tương tác giữa các bộ phận."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/inspection-guides",
        "backend_path": "/api/v1/inspection-guides",
        "default_code": "HD01",
        "current_code": "HD01",
        "title": "Hướng dẫn kiểm tra (HDKT)",
        "subtitle": "Ban hành tiêu chuẩn và tiêu chí kiểm tra chất lượng cho từng sản phẩm và công đoạn",
        "status": "Hoàn thành",
        "target_date": "2026-03-06",
        "components": [
            {
                "name": "HDKTTable",
                "type": "UI Component",
                "description": "Bảng tài liệu hướng dẫn kiểm tra theo mã sản phẩm và công đoạn.",
                "file_path": "/FrontEnd/Web/modules/InspectionGuide/Views/InspectionGuideManagementView.jsx",
                "tech": {
                    "handler_name": "fetchHDKTList",
                    "details": "Hiển thị mã HDKT, sản phẩm áp dụng, công đoạn và ngày hiệu lực.",
                    "user_guide": "Tra cứu hướng dẫn kiểm tra chuẩn cho công nhân và QC.",
                    "called_apis": ["GET /api/v1/inspection-guides"],
                    "database_tables": ["inspection_guides", "products", "stages"],
                    "code_snippet": "<Table data={hdktList} columns={hdktColumns} />"
                }
            },
            {
                "name": "CreateHDKTBtn",
                "type": "UI Component",
                "description": "Nút soạn thảo tài liệu hướng dẫn kiểm tra mới.",
                "file_path": "/FrontEnd/Web/modules/InspectionGuide/Views/InspectionGuideManagementView.jsx",
                "tech": {
                    "handler_name": "navigateToCreateHDKT",
                    "details": "Chuyển sang trang soạn thảo tiêu chuẩn HDKT.",
                    "user_guide": "Bấm để lập tiêu chuẩn kiểm tra cho sản phẩm mới.",
                    "called_apis": ["N/A"],
                    "database_tables": ["inspection_guides"],
                    "code_snippet": "<button onClick={() => navigate('/admin/inspection-guides/create')}>Thêm mới HDKT</button>"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Ban hành hướng dẫn kiểm tra",
                "related_components": "CreateHDKTBtn",
                "description": "Tạo mới tài liệu HDKT, nhập các tiêu chí dung sai, phương pháp kiểm tra và ảnh mẫu chuẩn."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/sos-guides",
        "backend_path": "/api/v1/sos-guides",
        "default_code": "HD02",
        "current_code": "HD02",
        "title": "Hướng dẫn thao tác (SOS)",
        "subtitle": "Tài liệu bảng chỉ dẫn thao tác chuẩn tại từng vị trí làm việc trong xưởng",
        "status": "Hoàn thành",
        "target_date": "2026-03-06",
        "components": [
            {
                "name": "SOSTable",
                "type": "UI Component",
                "description": "Bảng danh mục hướng dẫn thao tác SOS theo công đoạn và thiết bị.",
                "file_path": "/FrontEnd/Web/modules/SOSGuide/Views/SOSGuideManagementView.jsx",
                "tech": {
                    "handler_name": "fetchSOSList",
                    "details": "Hiển thị mã SOS, trạm làm việc, dụng cụ yêu cầu và lưu ý an toàn.",
                    "user_guide": "Xem và in bảng hướng dẫn treo tại vị trí công nhân làm việc.",
                    "called_apis": ["GET /api/v1/sos-guides"],
                    "database_tables": ["sos_guides"],
                    "code_snippet": "<Table data={sosList} columns={sosColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xem và in tài liệu SOS",
                "related_components": "SOSTable",
                "description": "In tài liệu thao tác chuẩn dán tại từng bàn máy để hướng dẫn công nhân mới."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/ctq-guides",
        "backend_path": "/api/v1/ctq-guides",
        "default_code": "HD03",
        "current_code": "HD03",
        "title": "Lỗi cần chú ý (CTQ)",
        "subtitle": "Danh mục các điểm kiểm soát chất lượng trọng yếu và cảnh báo lỗi thường gặp",
        "status": "Hoàn thành",
        "target_date": "2026-03-06",
        "components": [
            {
                "name": "CTQTable",
                "type": "UI Component",
                "description": "Bảng tổng hợp các lỗi trọng yếu CTQ kèm ảnh minh họa và biện pháp phòng ngừa.",
                "file_path": "/FrontEnd/Web/modules/CTQGuide/Views/CTQGuideManagementView.jsx",
                "tech": {
                    "handler_name": "fetchCTQList",
                    "details": "Tải danh sách các điểm kiểm soát chất lượng then chốt.",
                    "user_guide": "Tra cứu các lỗi nghiêm trọng cần đặc biệt lưu ý kiểm tra.",
                    "called_apis": ["GET /api/v1/ctq-guides"],
                    "database_tables": ["ctq_guides", "defect_types"],
                    "code_snippet": "<Table data={ctqList} columns={ctqColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Kiểm soát điểm nóng CTQ",
                "related_components": "CTQTable",
                "description": "Xem chi tiết nguyên nhân gốc rễ và hướng dẫn thao tác để tránh lỗi lặp lại."
            }
        ]
    },

    # ── Phân hệ 4 (Bổ sung): Quản lý sản xuất ──
    {
        "platform": "Web",
        "route_path": "/admin/production-schedule",
        "backend_path": "/api/v1/production-schedule",
        "default_code": "SX03",
        "current_code": "SX03",
        "title": "Lịch sản xuất & Gantt Chart",
        "subtitle": "Điều độ tiến độ gia công chi tiết theo trạm máy và tổ sản xuất",
        "status": "Hoàn thành",
        "target_date": "2026-03-07",
        "components": [
            {
                "name": "GanttScheduleTimeline",
                "type": "UI Component",
                "description": "Biểu đồ Gantt trực quan thời gian bắt đầu và kết thúc của từng lệnh sản xuất.",
                "file_path": "/FrontEnd/Web/modules/Production/Views/Schedule/ProductionScheduleView.jsx",
                "tech": {
                    "handler_name": "fetchGanttData",
                    "details": "Hiển thị dòng thời gian gia công theo từng máy và công đoạn.",
                    "user_guide": "Kéo thả các thanh công việc để điều chỉnh thời gian thực hiện.",
                    "called_apis": ["GET /api/v1/production-schedule"],
                    "database_tables": ["production_schedules", "machines"],
                    "code_snippet": "<GanttChart timeline={scheduleTimeline} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Điều độ tiến độ",
                "related_components": "GanttScheduleTimeline",
                "description": "Sắp xếp thứ tự ưu tiên các đơn hàng gấp trên biểu đồ Gantt."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/production-routing",
        "backend_path": "/api/v1/production-routing",
        "default_code": "SX05",
        "current_code": "SX05",
        "title": "Quy trình sản xuất (Routing)",
        "subtitle": "Thiết lập thứ tự công đoạn gia công công nghệ cho từng dòng sản phẩm",
        "status": "Hoàn thành",
        "target_date": "2026-03-07",
        "components": [
            {
                "name": "RoutingTable",
                "type": "UI Component",
                "description": "Bảng danh mục quy trình công nghệ chuẩn của các mã hàng.",
                "file_path": "/FrontEnd/Web/modules/Production/Views/Routing/ProductionRoutingView.jsx",
                "tech": {
                    "handler_name": "fetchRoutings",
                    "details": "Hiển thị chuỗi các công đoạn: Phôi -> Định hình -> Lắp ráp -> Sơn -> Đóng gói.",
                    "user_guide": "Xem và cấu hình thứ tự chuyền gia công cho sản phẩm.",
                    "called_apis": ["GET /api/v1/production-routing"],
                    "database_tables": ["production_routings", "stages"],
                    "code_snippet": "<RoutingFlow steps={routingSteps} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Cấu hình quy trình công nghệ",
                "related_components": "RoutingTable",
                "description": "Khai báo các bước chuyển đổi trạng thái sản phẩm qua từng phân xưởng."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/delivery-tracking",
        "backend_path": "/api/v1/delivery-tracking",
        "default_code": "SX06",
        "current_code": "SX06",
        "title": "Kế hoạch bàn giao",
        "subtitle": "Theo dõi lộ trình và trạng thái các kiện hàng bán thành phẩm đang di chuyển",
        "status": "Hoàn thành",
        "target_date": "2026-03-07",
        "components": [
            {
                "name": "TrackingKanban",
                "type": "UI Component",
                "description": "Bảng Kanban theo dõi các kiện hàng đang bàn giao giữa các xưởng.",
                "file_path": "/FrontEnd/Web/modules/Delivery/Views/Tracking/DeliveryTrackingView.jsx",
                "tech": {
                    "handler_name": "fetchDeliveryTracking",
                    "details": "Hiển thị trạng thái các đợt giao nhận theo thời gian thực.",
                    "user_guide": "Theo dõi tiến độ nhận hàng của các công đoạn.",
                    "called_apis": ["GET /api/v1/delivery-tracking"],
                    "database_tables": ["deliveries"],
                    "code_snippet": "<TrackingKanban columns={trackingCols} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Giám sát bàn giao",
                "related_components": "TrackingKanban",
                "description": "Kiểm tra các kiện hàng đang chuyển giao để tránh tồn đọng tại trạm trung gian."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/exception-deliveries",
        "backend_path": "/api/v1/pallet-cards",
        "default_code": "SX10",
        "current_code": "SX10",
        "title": "Phiếu ngoại lệ (Pallet Card)",
        "subtitle": "Quản lý thẻ pallet ngoại lệ, hàng sửa chữa (Rework) và xử lý sự cố giao nhận",
        "status": "Hoàn thành",
        "target_date": "2026-03-07",
        "components": [
            {
                "name": "PalletTable",
                "type": "UI Component",
                "description": "Bảng theo dõi các thẻ Pallet chứa linh kiện cần xử lý lại hoặc tách lô.",
                "file_path": "/FrontEnd/Web/modules/Pallet/Views/Card/PalletCardView.jsx",
                "tech": {
                    "handler_name": "fetchPalletCards",
                    "details": "Quản lý thẻ nhận diện đặc biệt cho hàng phế phẩm/sửa chữa.",
                    "user_guide": "Tra cứu thông tin lô hàng ngoại lệ cần theo dõi riêng.",
                    "called_apis": ["GET /api/v1/pallet-cards"],
                    "database_tables": ["pallet_cards"],
                    "code_snippet": "<Table data={pallets} columns={palletCols} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xử lý hàng ngoại lệ",
                "related_components": "PalletTable",
                "description": "In thẻ Pallet màu riêng để công nhân nhận diện lô hàng cần tái chế hoặc sửa chữa."
            }
        ]
    },

    # ── Phân hệ 5 (Bổ sung): Quản lý chất lượng ──
    {
        "platform": "Web",
        "route_path": "/admin/reports",
        "backend_path": "/api/v1/inspection-reports",
        "default_code": "CL03",
        "current_code": "CL03",
        "title": "Báo cáo kiểm tra QC",
        "subtitle": "Tổng hợp kết quả kiểm tra chất lượng theo ngày, ca, tổ và nhân viên kiểm định",
        "status": "Hoàn thành",
        "target_date": "2026-03-08",
        "components": [
            {
                "name": "ReportTable",
                "type": "UI Component",
                "description": "Bảng tổng hợp số lượng kiểm tra, số lỗi và tỷ lệ đạt chất lượng chi tiết.",
                "file_path": "/FrontEnd/Web/modules/Inspection/Views/Report/InspectionReportsView.jsx",
                "tech": {
                    "handler_name": "fetchQCReports",
                    "details": "Tổng hợp báo cáo kiểm định từ dữ liệu nhật ký QC di động.",
                    "user_guide": "Lọc theo ngày hoặc xưởng để xuất báo cáo chất lượng ca.",
                    "called_apis": ["GET /api/v1/inspection-reports"],
                    "database_tables": ["qc_logs", "quality_records"],
                    "code_snippet": "<Table data={qcReports} columns={qcReportColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xuất báo cáo ca",
                "related_components": "ReportTable",
                "description": "Tổng hợp và xuất báo cáo tỷ lệ đạt chất lượng nộp cho Ban Giám Đốc."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/hotspots",
        "backend_path": "/api/v1/hotspots",
        "default_code": "CL07",
        "current_code": "CL07",
        "title": "Điểm nóng cần chú ý",
        "subtitle": "Bảng cảnh báo tức thời các công đoạn có tỷ lệ phế phẩm hoặc sự cố tăng đột biến",
        "status": "Hoàn thành",
        "target_date": "2026-03-08",
        "components": [
            {
                "name": "HotspotGrid",
                "type": "UI Component",
                "description": "Lưới cảnh báo điểm nóng chất lượng nhấp nháy theo thời gian thực.",
                "file_path": "/FrontEnd/Web/modules/System/Views/Monitor/HotspotsView.jsx",
                "tech": {
                    "handler_name": "fetchHotspots",
                    "details": "Phát hiện tự động các điểm spike lỗi vượt ngưỡng kiểm soát (UCL).",
                    "user_guide": "Quan sát các vị trí màu đỏ để cử cán bộ kỹ thuật xuống hỗ trợ xử lý ngay.",
                    "called_apis": ["GET /api/v1/hotspots"],
                    "database_tables": ["hotspots", "qc_logs"],
                    "code_snippet": "<HotspotCards alerts={hotspotAlerts} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xử lý điểm nóng",
                "related_components": "HotspotGrid",
                "description": "Kiểm tra nguyên nhân tại xưởng và xác nhận khắc phục khi tỷ lệ lỗi trở về mức an toàn."
            }
        ]
    },

    # ── Phân hệ 6 (Bổ sung): Quản lý kinh doanh & Mua hàng ──
    {
        "platform": "Web",
        "route_path": "/admin/shipments",
        "backend_path": "/api/v1/shipments",
        "default_code": "KD03",
        "current_code": "KD03",
        "title": "Lịch xuất Container",
        "subtitle": "Kế hoạch đóng container, thời gian kéo cont và lịch tàu xuất khẩu",
        "status": "Hoàn thành",
        "target_date": "2026-03-09",
        "components": [
            {
                "name": "ShipmentCalendar",
                "type": "UI Component",
                "description": "Lịch xuất hàng và thông tin số cont, số chì (seal) cùng hãng tàu vận chuyển.",
                "file_path": "/FrontEnd/Web/modules/Claim/views/Claim/ClaimListView.jsx",
                "tech": {
                    "handler_name": "fetchShipments",
                    "details": "Quản lý kế hoạch xuất cảng cho các đơn hàng xuất khẩu.",
                    "user_guide": "Theo dõi ngày đóng hàng để điều phối thành phẩm đóng gói kịp thời.",
                    "called_apis": ["GET /api/v1/shipments"],
                    "database_tables": ["shipments", "orders"],
                    "code_snippet": "<ShipmentCalendar events={shipmentEvents} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Theo dõi lịch tàu",
                "related_components": "ShipmentCalendar",
                "description": "Đảm bảo thành phẩm được kiểm duyệt QA trước giờ đóng container tối thiểu 24 giờ."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/prices",
        "backend_path": "/api/v1/product-prices",
        "default_code": "KD02",
        "current_code": "KD02",
        "title": "Bảng đơn giá sản phẩm",
        "subtitle": "Bảng giá chào thầu, giá bán FOB/EXW và chính sách chiết khấu theo khách hàng",
        "status": "Hoàn thành",
        "target_date": "2026-03-09",
        "components": [
            {
                "name": "PriceListTable",
                "type": "UI Component",
                "description": "Bảng giá niêm yết của từng sản phẩm kèm lịch sử biến động giá.",
                "file_path": "/FrontEnd/Web/modules/Claim/views/Price/PriceListView.jsx",
                "tech": {
                    "handler_name": "fetchPriceList",
                    "details": "Quản lý đơn giá sản phẩm theo từng thời điểm.",
                    "user_guide": "Tra cứu và cập nhật đơn giá xuất khẩu của các dòng sản phẩm.",
                    "called_apis": ["GET /api/v1/product-prices"],
                    "database_tables": ["product_prices"],
                    "code_snippet": "<Table data={prices} columns={priceColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Cập nhật bảng giá",
                "related_components": "PriceListTable",
                "description": "Điều chỉnh đơn giá khi có biến động chi phí nguyên vật liệu đầu vào."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/purchase-requisitions",
        "backend_path": "/api/v1/purchase-requisitions",
        "default_code": "KD05",
        "current_code": "KD05",
        "title": "Yêu cầu mua hàng (PR/PO)",
        "subtitle": "Quản lý đề xuất mua nguyên vật liệu, phụ kiện và phê duyệt đơn đặt hàng nhà cung cấp",
        "status": "Hoàn thành",
        "target_date": "2026-03-09",
        "components": [
            {
                "name": "PRTable",
                "type": "UI Component",
                "description": "Bảng theo dõi phiếu yêu cầu mua sắm và tiến độ duyệt mua của Ban Giám Đốc.",
                "file_path": "/FrontEnd/Web/modules/Purchasing/Views/Requisition/PurchaseRequisitionListView.jsx",
                "tech": {
                    "handler_name": "fetchPurchaseRequisitions",
                    "details": "Quản lý luồng phê duyệt mua hàng cho dự án sản xuất.",
                    "user_guide": "Lập và theo dõi các đề xuất mua vật tư nhà máy.",
                    "called_apis": ["GET /api/v1/purchase-requisitions"],
                    "database_tables": ["purchase_requisitions"],
                    "code_snippet": "<Table data={prs} columns={prColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Lập phiếu yêu cầu mua",
                "related_components": "PRTable",
                "description": "Tạo phiếu đề xuất vật tư cần mua dựa trên định mức BOM của đơn hàng."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/order-shipping-monitoring",
        "backend_path": "/api/v1/order-shipping",
        "default_code": "KD06",
        "current_code": "KD06",
        "title": "Giám sát vận chuyển",
        "subtitle": "Theo dõi hành trình xe tải, container và trạng thái giao nhận tới kho khách hàng",
        "status": "Hoàn thành",
        "target_date": "2026-03-09",
        "components": [
            {
                "name": "ShippingTrackerTable",
                "type": "UI Component",
                "description": "Bảng theo dõi định vị và thời gian dự kiến đến (ETA) của các chuyến hàng.",
                "file_path": "/FrontEnd/Web/modules/Purchasing/Views/Monitoring/OrderShippingMonitoringView.jsx",
                "tech": {
                    "handler_name": "fetchShippingStatus",
                    "details": "Cập nhật trạng thái giao hàng từ đơn vị vận chuyển.",
                    "user_guide": "Theo dõi chuyến hàng đang trên đường giao tới cảng hoặc khách.",
                    "called_apis": ["GET /api/v1/order-shipping"],
                    "database_tables": ["order_shippings"],
                    "code_snippet": "<Table data={shippings} columns={shippingColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Giám sát lộ trình",
                "related_components": "ShippingTrackerTable",
                "description": "Kiểm tra biên bản giao nhận có chữ ký người nhận sau khi xe đến đích."
            }
        ]
    },

    # ── Phân hệ 7 (Bổ sung): Bảo trì - Cơ sở hạ tầng ──
    {
        "platform": "Web",
        "route_path": "/admin/machines/history",
        "backend_path": "/api/v1/machines/history",
        "default_code": "BT02",
        "current_code": "BT02",
        "title": "Lịch sử bảo trì máy móc",
        "subtitle": "Nhật ký sửa chữa, thay thế phụ tùng và bảo dưỡng định kỳ các máy trong xưởng",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "MaintenanceLogTable",
                "type": "UI Component",
                "description": "Bảng lịch sử bảo dưỡng kèm chi phí linh kiện và kỹ thuật viên thực hiện.",
                "file_path": "/FrontEnd/Web/modules/Equipment/Views/Machine/MachineHistoryView.jsx",
                "tech": {
                    "handler_name": "fetchMachineHistory",
                    "details": "Theo dõi tổng số giờ vận hành và chu kỳ bôi trơn máy.",
                    "user_guide": "Xem lý lịch sửa chữa của từng máy móc thiết bị.",
                    "called_apis": ["GET /api/v1/machines/history"],
                    "database_tables": ["machine_histories"],
                    "code_snippet": "<Table data={history} columns={historyColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Ghi nhận bảo dưỡng",
                "related_components": "MaintenanceLogTable",
                "description": "Cập nhật ngày bảo dưỡng và phụ tùng thay thế sau mỗi kỳ kiểm tra máy."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/machines/training",
        "backend_path": "/api/v1/machines/training",
        "default_code": "BT03",
        "current_code": "BT03",
        "title": "Đào tạo vận hành máy",
        "subtitle": "Kho tài liệu, video hướng dẫn và chứng chỉ an toàn vận hành máy cho công nhân",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "MachineTrainingList",
                "type": "UI Component",
                "description": "Danh sách các khóa đào tạo an toàn máy móc và danh sách công nhân đã qua sát hạch.",
                "file_path": "/FrontEnd/Web/modules/Equipment/Views/Machine/MachineTrainingView.jsx",
                "tech": {
                    "handler_name": "fetchMachineTrainings",
                    "details": "Quản lý cấp chứng chỉ vận hành máy CNC, máy cưa, máy chà nhám.",
                    "user_guide": "Theo dõi nhân sự đủ điều kiện được phép thao tác máy móc nguy hiểm.",
                    "called_apis": ["GET /api/v1/machines/training"],
                    "database_tables": ["machine_trainings"],
                    "code_snippet": "<TrainingView courses={trainings} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tổ chức sát hạch",
                "related_components": "MachineTrainingList",
                "description": "Tổ chức kiểm tra định kỳ để cấp phép cho công nhân vận hành máy mới."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/equipment/categories",
        "backend_path": "/api/v1/equipment-categories",
        "default_code": "BT05",
        "current_code": "BT05",
        "title": "Danh mục nhóm thiết bị",
        "subtitle": "Phân nhóm dụng cụ đo lường và thiết bị kiểm tra theo chủng loại và tính năng",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "CategoryTable",
                "type": "UI Component",
                "description": "Bảng phân loại nhóm thiết bị đo (Cơ khí, Điện tử, Quang học, Hóa chất).",
                "file_path": "/FrontEnd/Web/modules/Equipment/Views/Equipment/EquipmentCategoriesView.jsx",
                "tech": {
                    "handler_name": "fetchEquipmentCategories",
                    "details": "Quản lý phân cấp danh mục thiết bị đo lường.",
                    "user_guide": "Thêm mới hoặc chỉnh sửa nhóm thiết bị.",
                    "called_apis": ["GET /api/v1/equipment-categories"],
                    "database_tables": ["equipment_categories"],
                    "code_snippet": "<Table data={categories} columns={categoryColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Quản lý nhóm thiết bị",
                "related_components": "CategoryTable",
                "description": "Phân loại rõ nhóm thiết bị để thiết lập chu kỳ hiệu chuẩn phù hợp."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/equipment/history",
        "backend_path": "/api/v1/equipments/history",
        "default_code": "BT06",
        "current_code": "BT06",
        "title": "Lịch sử kiểm định thiết bị",
        "subtitle": "Hồ sơ hiệu chuẩn, sai số đo lường và giấy chứng nhận kiểm định của cơ quan đo lường",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "CalibrationHistoryTable",
                "type": "UI Component",
                "description": "Bảng lưu trữ các lần hiệu chuẩn và giấy chứng nhận kiểm định hợp quy.",
                "file_path": "/FrontEnd/Web/modules/Equipment/Views/Equipment/EquipmentHistoryView.jsx",
                "tech": {
                    "handler_name": "fetchCalibrationHistory",
                    "details": "Lưu trữ lịch sử sai số và ngày hiệu chuẩn kế tiếp.",
                    "user_guide": "Xem kết quả kiểm định của từng thiết bị đo.",
                    "called_apis": ["GET /api/v1/equipments/history"],
                    "database_tables": ["equipment_calibrations"],
                    "code_snippet": "<Table data={calibrationLogs} columns={calibColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Theo dõi hạn hiệu chuẩn",
                "related_components": "CalibrationHistoryTable",
                "description": "Gửi thiết bị đi kiểm chuẩn trước ngày hết hạn hiệu lực tối thiểu 15 ngày."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/equipment/training",
        "backend_path": "/api/v1/equipments/training",
        "default_code": "BT07",
        "current_code": "BT07",
        "title": "Đào tạo thiết bị đo",
        "subtitle": "Hướng dẫn sử dụng đúng phương pháp các dụng cụ đo kiểm chất lượng cho nhân viên QC",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "EquipmentTrainingTable",
                "type": "UI Component",
                "description": "Bảng chương trình đào tạo thao tác thiết bị đo lường chuẩn xác.",
                "file_path": "/FrontEnd/Web/modules/Equipment/Views/Equipment/EquipmentTrainingView.jsx",
                "tech": {
                    "handler_name": "fetchEquipmentTrainings",
                    "details": "Đào tạo cách cầm thước kẹp, đo độ ẩm gỗ đúng kỹ thuật.",
                    "user_guide": "Đăng ký và theo dõi danh sách nhân viên đã được hướng dẫn sử dụng thiết bị.",
                    "called_apis": ["GET /api/v1/equipments/training"],
                    "database_tables": ["equipment_trainings"],
                    "code_snippet": "<TrainingTable items={eqTrainings} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Huấn luyện nhân viên đo",
                "related_components": "EquipmentTrainingTable",
                "description": "Đảm bảo 100% nhân viên kiểm tra chất lượng nắm vững thao tác đo lường không để xảy ra sai số."
            }
        ]
    },

    # ── Phân hệ 8 (Bổ sung): Quản lý KPI ──
    {
        "platform": "Web",
        "route_path": "/admin/kpi/dashboard",
        "backend_path": "/api/v1/kpi/dashboard",
        "default_code": "KPI02",
        "current_code": "KPI02",
        "title": "Dashboard KPI trực quan",
        "subtitle": "Bảng điều khiển trực quan các chỉ số mục tiêu chất lượng và hiệu suất toàn công ty",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "KPISummaryCards",
                "type": "UI Component",
                "description": "Khối thẻ đo lường phần trăm hoàn thành mục tiêu KPI tổng hợp.",
                "file_path": "/FrontEnd/Web/modules/KPI/Views/Report/QualityKPIDashboardView.jsx",
                "tech": {
                    "handler_name": "fetchKPIDashboardData",
                    "details": "Hiển thị biểu đồ radar và thanh đo tiến độ đạt mục tiêu năm.",
                    "user_guide": "Theo dõi tổng thể mức độ hoàn thành chỉ tiêu của toàn nhà máy.",
                    "called_apis": ["GET /api/v1/kpi/dashboard"],
                    "database_tables": ["kpi_reports"],
                    "code_snippet": "<KPIDashboard stats={kpiStats} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Đánh giá mục tiêu chất lượng",
                "related_components": "KPISummaryCards",
                "description": "So sánh kết quả thực tế với chỉ tiêu mục tiêu chất lượng đã ban hành đầu năm."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/kpi/quality-employees",
        "backend_path": "/api/v1/kpi/quality-employees",
        "default_code": "KPI05",
        "current_code": "KPI05",
        "title": "Nhân sự Quản lý Chất lượng",
        "subtitle": "Bảng phân bổ vị trí, công đoạn và đánh giá tay nghề của đội ngũ QC/QA",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "QCEmployeeTable",
                "type": "UI Component",
                "description": "Bảng danh sách nhân sự bộ phận Quản lý Chất lượng kèm công đoạn phụ trách.",
                "file_path": "/FrontEnd/Web/modules/KPI/Views/QualityEmployeeListView.jsx",
                "tech": {
                    "handler_name": "fetchQCEmployees",
                    "details": "Quản lý nhân lực kiểm tra chất lượng theo từng tổ sản xuất.",
                    "user_guide": "Phân công nhân sự QC kiểm tra tại các công đoạn trọng điểm.",
                    "called_apis": ["GET /api/v1/kpi/quality-employees"],
                    "database_tables": ["employees", "stages"],
                    "code_snippet": "<Table data={qcStaff} columns={qcColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Phân bổ nhân lực QC",
                "related_components": "QCEmployeeTable",
                "description": "Gán nhân viên QC có năng lực cao phụ trách các công đoạn phức tạp."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/kpi/checklist",
        "backend_path": "/api/v1/kpi/checklists",
        "default_code": "KPI06",
        "current_code": "KPI06",
        "title": "Checklist tiêu chí KPI",
        "subtitle": "Bộ câu hỏi và tiêu chí đánh giá năng lực, chất lượng sản phẩm và kỷ luật",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "ChecklistTreeTable",
                "type": "UI Component",
                "description": "Bảng danh mục câu hỏi checklist chấm điểm thi đua nhân sự.",
                "file_path": "/FrontEnd/Web/modules/KPI/Views/Checklist/KPIChecklistView.jsx",
                "tech": {
                    "handler_name": "fetchKPIChecklists",
                    "details": "Quản lý trọng số và điểm tối đa của từng tiêu chí đánh giá.",
                    "user_guide": "Thiết lập tiêu chuẩn chấm điểm đánh giá thi đua.",
                    "called_apis": ["GET /api/v1/kpi/checklists"],
                    "database_tables": ["kpi_checklists"],
                    "code_snippet": "<Table data={checklists} columns={checklistColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Cấu hình tiêu chí",
                "related_components": "ChecklistTreeTable",
                "description": "Nhập các câu hỏi kiểm tra kỹ năng và thang điểm đánh giá."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/kpi/list",
        "backend_path": "/api/v1/kpi/items",
        "default_code": "KPI07",
        "current_code": "KPI07",
        "title": "Danh sách chỉ số KPI",
        "subtitle": "Danh mục các chỉ số đo lường hiệu suất then chốt (KPI) áp dụng cho các bộ phận",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "KPIItemsTable",
                "type": "UI Component",
                "description": "Bảng danh mục các chỉ số KPI: Tỷ lệ lỗi phế phẩm, Năng suất m3/ngày, Giao hàng đúng hạn.",
                "file_path": "/FrontEnd/Web/modules/KPI/Views/Item/KPIItemsView.jsx",
                "tech": {
                    "handler_name": "fetchKPIItems",
                    "details": "Quản lý định nghĩa và công thức đo lường KPI.",
                    "user_guide": "Tra cứu các chỉ tiêu KPI đang áp dụng.",
                    "called_apis": ["GET /api/v1/kpi/items"],
                    "database_tables": ["kpi_items"],
                    "code_snippet": "<Table data={kpiItems} columns={itemColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Thiết lập chỉ số",
                "related_components": "KPIItemsTable",
                "description": "Khai báo chỉ số mới kèm đơn vị tính và tần suất đo lường."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/kpi/rules",
        "backend_path": "/api/v1/kpi/rules",
        "default_code": "KPI08",
        "current_code": "KPI08",
        "title": "Quy tắc tính điểm KPI",
        "subtitle": "Quy định mức thưởng/phạt điểm, tỷ trọng % các nhóm tiêu chí và công thức tính điểm",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "RuleMatrixTable",
                "type": "UI Component",
                "description": "Bảng cấu hình ma trận quy tắc tính thưởng phạt điểm thi đua.",
                "file_path": "/FrontEnd/Web/modules/KPI/Views/Rule/KPIRulesView.jsx",
                "tech": {
                    "handler_name": "fetchKPIRules",
                    "details": "Quản lý công thức tính điểm tự động từ dữ liệu nhật ký sự cố và phế phẩm.",
                    "user_guide": "Xem và điều chỉnh các mức điểm phạt cho từng lỗi vi phạm.",
                    "called_apis": ["GET /api/v1/kpi/rules"],
                    "database_tables": ["kpi_rules"],
                    "code_snippet": "<Table data={rules} columns={ruleColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Cấu hình quy tắc",
                "related_components": "RuleMatrixTable",
                "description": "Cập nhật mức trừ điểm đối với các lỗi vi phạm nghiêm trọng."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/kpi/feedback",
        "backend_path": "/api/v1/kpi/feedback",
        "default_code": "KPI09",
        "current_code": "KPI09",
        "title": "Phản hồi đánh giá KPI",
        "subtitle": "Tiếp nhận và giải quyết khiếu nại về điểm đánh giá KPI từ người lao động",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "FeedbackReviewTable",
                "type": "UI Component",
                "description": "Bảng danh sách các đơn khiếu nại điểm đánh giá KPI của nhân viên.",
                "file_path": "/FrontEnd/Web/modules/KPI/Views/Feedback/KPIFeedbackView.jsx",
                "tech": {
                    "handler_name": "fetchKPIFeedbacks",
                    "details": "Xem xét và điều chỉnh lại điểm đánh giá khi có bằng chứng xác đáng.",
                    "user_guide": "Hội đồng thi đua xem xét và phê duyệt điều chỉnh điểm.",
                    "called_apis": ["GET /api/v1/kpi/feedback"],
                    "database_tables": ["kpi_feedbacks"],
                    "code_snippet": "<Table data={disputes} columns={disputeColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Giải quyết khiếu nại",
                "related_components": "FeedbackReviewTable",
                "description": "Xem xét giải trình của nhân viên và bấm Duyệt điều chỉnh điểm nếu hợp lý."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/production-dashboard",
        "backend_path": "/api/v1/production/stats",
        "default_code": "SX01",
        "current_code": "SX01",
        "title": "Trang tổng quan sản xuất",
        "subtitle": "Bảng điều khiển trực quan sản lượng, tiến độ và năng suất các tổ xưởng",
        "status": "Hoàn thành",
        "target_date": "2026-03-07",
        "components": [
            {
                "name": "ProductionKPIWidgets",
                "type": "UI Component",
                "description": "Khối widget hiển thị tổng số chi tiết đã gia công, tồn dở dang (WIP) và hiệu suất chuyền.",
                "file_path": "/FrontEnd/Web/modules/Production/Views/Dashboard/ProductionDashboardView.jsx",
                "tech": {
                    "handler_name": "fetchProdDashboard",
                    "details": "Tổng hợp sản lượng theo ca và so sánh với kế hoạch.",
                    "user_guide": "Theo dõi năng suất làm việc của toàn bộ nhà xưởng.",
                    "called_apis": ["GET /api/v1/production/stats"],
                    "database_tables": ["production_orders", "production_plans", "deliveries"],
                    "code_snippet": "<ProductionStats stats={prodStats} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Theo dõi sản lượng xưởng",
                "related_components": "ProductionKPIWidgets",
                "description": "Đánh giá mức độ hoàn thành đơn hàng theo thời gian thực."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/production-orders",
        "backend_path": "/api/v1/production-orders",
        "default_code": "SX02",
        "current_code": "SX02",
        "title": "Lệnh sản xuất (LSX)",
        "subtitle": "Quản lý phát hành, theo dõi tiến độ và trạng thái các lệnh sản xuất",
        "status": "Hoàn thành",
        "target_date": "2026-03-07",
        "components": [
            {
                "name": "OrderListTable",
                "type": "UI Component",
                "description": "Bảng danh sách lệnh sản xuất kèm mã LSX, khách hàng, số lượng và ngày giao hàng.",
                "file_path": "/FrontEnd/Web/modules/Production/Views/Orders/ProductionOrdersView.jsx",
                "tech": {
                    "handler_name": "fetchOrders",
                    "details": "Hiển thị danh sách LSX với thanh tiến độ hoàn thành theo từng công đoạn.",
                    "user_guide": "Xem tiến độ và nhấp vào LSX để xem chi tiết linh kiện.",
                    "called_apis": ["GET /api/v1/production-orders"],
                    "database_tables": ["production_orders", "products"],
                    "code_snippet": "<Table data={orders} columns={orderColumns} />"
                }
            },
            {
                "name": "CreateOrderBtn",
                "type": "UI Component",
                "description": "Nút mở biểu mẫu tạo mới Lệnh sản xuất.",
                "file_path": "/FrontEnd/Web/modules/Production/Views/Orders/ProductionOrdersView.jsx",
                "tech": {
                    "handler_name": "openCreateOrderModal",
                    "details": "Điều hướng tới trang lập lệnh sản xuất mới.",
                    "user_guide": "Bấm để phát hành lệnh sản xuất cho xưởng.",
                    "called_apis": ["N/A"],
                    "database_tables": ["production_orders"],
                    "code_snippet": "<button onClick={() => navigate('/admin/production-orders/create')}>Tạo LSX</button>"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Phát hành lệnh sản xuất",
                "related_components": "CreateOrderBtn",
                "description": "Tạo LSX từ đơn hàng bán, chọn mã sản phẩm và số lượng cần sản xuất."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/plan",
        "backend_path": "/api/v1/production-plans",
        "default_code": "SX04",
        "current_code": "SX04",
        "title": "Kế hoạch sản xuất",
        "subtitle": "Lập kế hoạch phân bổ sản lượng theo tuần/tháng cho từng tổ công đoạn",
        "status": "Hoàn thành",
        "target_date": "2026-03-07",
        "components": [
            {
                "name": "PlanTable",
                "type": "UI Component",
                "description": "Bảng kế hoạch sản xuất chi tiết theo ca và định mức ngày.",
                "file_path": "/FrontEnd/Web/modules/Plan/Views/Plan/PlanListView.jsx",
                "tech": {
                    "handler_name": "fetchPlans",
                    "details": "Hiển thị mục tiêu kế hoạch và sản lượng thực tế đạt được.",
                    "user_guide": "Theo dõi mức độ bám sát kế hoạch của các xưởng.",
                    "called_apis": ["GET /api/v1/production-plans"],
                    "database_tables": ["production_plans"],
                    "code_snippet": "<Table data={plans} columns={planColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Lập kế hoạch tháng",
                "related_components": "PlanTable",
                "description": "Phân bổ số lượng sản phẩm cần gia công cho từng tổ xưởng theo lịch giao hàng."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/handovers",
        "backend_path": "/api/v1/deliveries",
        "default_code": "SX07",
        "current_code": "SX07",
        "title": "Danh sách bàn giao",
        "subtitle": "Biên bản giao nhận linh kiện bán thành phẩm giữa các công đoạn sản xuất",
        "status": "Hoàn thành",
        "target_date": "2026-03-07",
        "components": [
            {
                "name": "HandoverTable",
                "type": "UI Component",
                "description": "Bảng danh sách các phiếu bàn giao kèm số lượng giao, nhận, trả về và kết quả kiểm QC.",
                "file_path": "/FrontEnd/Web/modules/Delivery/Views/Handover/HandoverListView.jsx",
                "tech": {
                    "handler_name": "fetchHandovers",
                    "details": "Hiển thị toàn bộ biên bản bàn giao trong hệ thống.",
                    "user_guide": "Kiểm tra tình trạng xác nhận giao nhận giữa các khâu.",
                    "called_apis": ["GET /api/v1/deliveries"],
                    "database_tables": ["deliveries", "delivery_details"],
                    "code_snippet": "<Table data={handovers} columns={handoverColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Theo dõi giao nhận nội bộ",
                "related_components": "HandoverTable",
                "description": "Kiểm tra các phiếu chưa được xác nhận nhận hàng để đôn đốc tổ nhận kiểm đếm."
            }
        ]
    },

    # ── Phân hệ 5: Quản lý chất lượng (QC / QA) ──
    {
        "platform": "Web",
        "route_path": "/admin/quality-records",
        "backend_path": "/api/v1/quality-records",
        "default_code": "CL01",
        "current_code": "CL01",
        "title": "Hồ sơ chất lượng",
        "subtitle": "Lưu trữ đầy đủ biên bản kiểm tra chất lượng của từng lô hàng và công đoạn",
        "status": "Hoàn thành",
        "target_date": "2026-03-08",
        "components": [
            {
                "name": "RecordTable",
                "type": "UI Component",
                "description": "Bảng hồ sơ chất lượng với mã lô, số lượng kiểm tra, số lỗi và tỷ lệ đạt.",
                "file_path": "/FrontEnd/Web/modules/QualityRecords/Views/Record/QualityRecordsListView.jsx",
                "tech": {
                    "handler_name": "fetchQualityRecords",
                    "details": "Hiển thị danh sách hồ sơ kiểm tra chất lượng hoàn chỉnh.",
                    "user_guide": "Xem và in phiếu chứng nhận chất lượng cho từng lô hàng.",
                    "called_apis": ["GET /api/v1/quality-records"],
                    "database_tables": ["quality_records", "qc_logs"],
                    "code_snippet": "<Table data={records} columns={recordColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tra cứu hồ sơ xuất xưởng",
                "related_components": "RecordTable",
                "description": "Tìm kiếm theo mã LOT hoặc mã LSX để trích xuất toàn bộ dữ liệu kiểm tra phục vụ kiểm toán."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/defects",
        "backend_path": "/api/v1/defect-types",
        "default_code": "CL02",
        "current_code": "CL02",
        "title": "Danh mục lỗi (Defects)",
        "subtitle": "Chuẩn hóa bảng mã lỗi, nhóm lỗi và mức độ nghiêm trọng trong sản xuất",
        "status": "Hoàn thành",
        "target_date": "2026-03-08",
        "components": [
            {
                "name": "DefectTable",
                "type": "UI Component",
                "description": "Bảng danh mục các loại lỗi chất lượng kèm hình ảnh mô tả lỗi trực quan.",
                "file_path": "/FrontEnd/Web/modules/Inspection/Views_v2/Defect/DefectManagementView.jsx",
                "tech": {
                    "handler_name": "fetchDefects",
                    "details": "Tải danh sách phân loại lỗi theo công đoạn: Phôi, Lắp ráp, Sơn, Đóng gói.",
                    "user_guide": "Quản lý mã định danh lỗi phục vụ thống kê phân tích Pareto.",
                    "called_apis": ["GET /api/v1/defect-types"],
                    "database_tables": ["defect_types", "stages"],
                    "code_snippet": "<Table data={defects} columns={defectColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Cấu hình danh mục lỗi",
                "related_components": "DefectTable",
                "description": "Bổ sung các lỗi mới phát sinh và đính kèm ảnh chuẩn để công nhân nhận diện chính xác."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/capa",
        "backend_path": "/api/v1/capa",
        "default_code": "CL06",
        "current_code": "CL06",
        "title": "Quản lý CAPA",
        "subtitle": "Quản lý các hành động khắc phục phòng ngừa lỗi chất lượng tái diễn",
        "status": "Hoàn thành",
        "target_date": "2026-03-08",
        "components": [
            {
                "name": "CAPATable",
                "type": "UI Component",
                "description": "Bảng theo dõi phiếu yêu cầu CAPA, hạn xử lý và kết quả đánh giá hiệu lực.",
                "file_path": "/FrontEnd/Web/modules/CAPA/Views/Improvement/CapaHistoryView.jsx",
                "tech": {
                    "handler_name": "fetchCAPAList",
                    "details": "Quản lý chu trình PDCA của các hành động khắc phục chất lượng.",
                    "user_guide": "Theo dõi tiến độ thực hiện các biện pháp ngăn ngừa lỗi của các bộ phận.",
                    "called_apis": ["GET /api/v1/capa"],
                    "database_tables": ["capa_requests", "capa_actions"],
                    "code_snippet": "<Table data={capaList} columns={capaColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Khởi tạo và đóng CAPA",
                "related_components": "CAPATable",
                "description": "Phát hành phiếu CAPA khi có lỗi lặp lại và theo dõi cho tới khi biện pháp khắc phục được nghiệm thu."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/claims",
        "backend_path": "/api/v1/claims",
        "default_code": "CL08",
        "current_code": "CL08",
        "title": "Khiếu nại khách hàng (Claims)",
        "subtitle": "Ghi nhận và xử lý các phản ánh khiếu nại chất lượng từ đối tác khách hàng",
        "status": "Hoàn thành",
        "target_date": "2026-03-08",
        "components": [
            {
                "name": "ClaimTable",
                "type": "UI Component",
                "description": "Bảng danh sách khiếu nại chất lượng, chi phí bồi hoàn và trạng thái giải quyết.",
                "file_path": "/FrontEnd/Web/modules/Claim/views/Claim/ClaimListView.jsx",
                "tech": {
                    "handler_name": "fetchClaims",
                    "details": "Theo dõi thông tin claim của từng khách hàng và liên kết với LSX gốc.",
                    "user_guide": "Xem và xử lý các sự cố chất lượng từ phản hồi của khách hàng.",
                    "called_apis": ["GET /api/v1/claims"],
                    "database_tables": ["claims", "customers"],
                    "code_snippet": "<Table data={claims} columns={claimColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Ghi nhận khiếu nại",
                "related_components": "ClaimTable",
                "description": "Tiếp nhận thông tin lỗi từ khách hàng, điều tra nguyên nhân và đưa ra phương án đền bù/sửa chữa."
            }
        ]
    },

    # ── Phân hệ 6: Quản lý kinh doanh & Kỹ thuật ──
    {
        "platform": "Web",
        "route_path": "/admin/products",
        "backend_path": "/api/v1/products",
        "default_code": "KT01",
        "current_code": "KT01",
        "title": "BOM sản phẩm & Bản vẽ",
        "subtitle": "Quản lý cơ sở dữ liệu sản phẩm, cây cấu trúc linh kiện (BOM) và bản vẽ 2D/3D",
        "status": "Hoàn thành",
        "target_date": "2026-03-09",
        "components": [
            {
                "name": "ProductTable",
                "type": "UI Component",
                "description": "Bảng danh mục sản phẩm kèm hình ảnh đại diện, kích thước và bản vẽ kỹ thuật.",
                "file_path": "/FrontEnd/Web/modules/Product/Views/List/ProductsListView.jsx",
                "tech": {
                    "handler_name": "fetchProducts",
                    "details": "Hiển thị danh sách sản phẩm và hỗ trợ xem cây BOM chi tiết.",
                    "user_guide": "Tra cứu cấu tạo và thông số kỹ thuật của từng mã hàng.",
                    "called_apis": ["GET /api/v1/products"],
                    "database_tables": ["products", "product_details"],
                    "code_snippet": "<Table data={products} columns={productColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Khai báo sản phẩm mới",
                "related_components": "ProductTable",
                "description": "Nhập mã sản phẩm, mô tả, tải bản vẽ PDF và cấu hình danh mục chi tiết cấu thành."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/material-boms",
        "backend_path": "/api/v1/material-boms",
        "default_code": "KT02",
        "current_code": "KT02",
        "title": "BOM vật tư chi tiết",
        "subtitle": "Định mức nguyên vật liệu, phụ kiện đóng gói và sơn cho từng sản phẩm",
        "status": "Hoàn thành",
        "target_date": "2026-03-09",
        "components": [
            {
                "name": "MaterialBOMTable",
                "type": "UI Component",
                "description": "Bảng định mức vật tư tiêu hao (gỗ, ốc vít, keo, sơn, bao bì) trên 1 đơn vị sản phẩm.",
                "file_path": "/FrontEnd/Web/modules/Product/Views/Materials/MaterialBOMsView.jsx",
                "tech": {
                    "handler_name": "fetchMaterialBOMs",
                    "details": "Tính toán nhu cầu nguyên vật liệu tự động cho đơn hàng sản xuất.",
                    "user_guide": "Quản lý và cập nhật định mức vật tư tiêu hao.",
                    "called_apis": ["GET /api/v1/material-boms"],
                    "database_tables": ["material_boms", "materials"],
                    "code_snippet": "<Table data={materialBOMs} columns={bomColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Thiết lập định mức vật tư",
                "related_components": "MaterialBOMTable",
                "description": "Khai báo lượng tiêu hao gỗ m3, lượng sơn kg, phụ kiện trên từng sản phẩm."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/orders",
        "backend_path": "/api/v1/orders",
        "default_code": "KD01",
        "current_code": "KD01",
        "title": "Danh sách đơn hàng bán",
        "subtitle": "Quản lý hợp đồng thương mại, đơn đặt hàng từ khách hàng và tiến độ giao hàng",
        "status": "Hoàn thành",
        "target_date": "2026-03-09",
        "components": [
            {
                "name": "OrdersTable",
                "type": "UI Component",
                "description": "Bảng danh sách đơn hàng xuất khẩu, số container và tiến độ hoàn thành.",
                "file_path": "/FrontEnd/Web/modules/Order/Views/List/OrdersListView.jsx",
                "tech": {
                    "handler_name": "fetchSalesOrders",
                    "details": "Quản lý đơn hàng thương mại và điều phối vào lệnh sản xuất.",
                    "user_guide": "Theo dõi trạng thái giao hàng cho từng hợp đồng khách hàng.",
                    "called_apis": ["GET /api/v1/orders"],
                    "database_tables": ["orders", "customers"],
                    "code_snippet": "<Table data={orders} columns={salesOrderColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tiếp nhận đơn hàng",
                "related_components": "OrdersTable",
                "description": "Nhập đơn hàng mới từ đối tác và chuyển thông tin sang bộ phận Kế hoạch sản xuất."
            }
        ]
    },

    # ── Phân hệ 7: Bảo trì - Cơ sở hạ tầng ──
    {
        "platform": "Web",
        "route_path": "/admin/machines",
        "backend_path": "/api/v1/machines",
        "default_code": "BT01",
        "current_code": "BT01",
        "title": "Danh sách máy móc",
        "subtitle": "Quản lý hồ sơ máy móc, thông số kỹ thuật và trạng thái vận hành tại xưởng",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "MachineTable",
                "type": "UI Component",
                "description": "Bảng danh mục máy móc nhà xưởng kèm vị trí lắp đặt và tình trạng hoạt động.",
                "file_path": "/FrontEnd/Web/modules/Equipment/Views/Machine/MachineManagementView.jsx",
                "tech": {
                    "handler_name": "fetchMachines",
                    "details": "Hiển thị mã máy, model, năm sản xuất, xưởng đặt và hạn bảo dưỡng kế tiếp.",
                    "user_guide": "Xem và quản lý hồ sơ kỹ thuật máy móc trong toàn bộ nhà máy.",
                    "called_apis": ["GET /api/v1/machines"],
                    "database_tables": ["machines"],
                    "code_snippet": "<Table data={machines} columns={machineColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Quản lý máy móc thiết bị",
                "related_components": "MachineTable",
                "description": "Theo dõi lịch bảo trì định kỳ để tránh sự cố dừng chuyền đột xuất."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/equipment",
        "backend_path": "/api/v1/equipments",
        "default_code": "BT04",
        "current_code": "BT04",
        "title": "Danh mục thiết bị đo",
        "subtitle": "Quản lý dụng cụ đo lường (thước kẹp, máy đo độ ẩm, dưỡng kiểm) và lịch hiệu chuẩn",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "EquipmentTable",
                "type": "UI Component",
                "description": "Bảng thiết bị đo lường kiểm tra chất lượng kèm chu kỳ kiểm định.",
                "file_path": "/FrontEnd/Web/modules/Equipment/Views/Equipment/EquipmentManagementView.jsx",
                "tech": {
                    "handler_name": "fetchEquipments",
                    "details": "Cảnh báo các thiết bị đo sắp hết hạn hiệu chuẩn.",
                    "user_guide": "Theo dõi tình trạng chính xác của dụng cụ đo chất lượng.",
                    "called_apis": ["GET /api/v1/equipments"],
                    "database_tables": ["equipments"],
                    "code_snippet": "<Table data={equipments} columns={eqColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Kiểm định dụng cụ đo",
                "related_components": "EquipmentTable",
                "description": "Gửi thiết bị đi kiểm chuẩn định kỳ và cập nhật giấy chứng nhận vào hệ thống."
            }
        ]
    },

    # ── Phân hệ 8: Quản lý KPI ──
    {
        "platform": "Web",
        "route_path": "/admin/kpi",
        "backend_path": "/api/v1/kpi/reports",
        "default_code": "KPI01",
        "current_code": "KPI01",
        "title": "Báo cáo KPI tổng hợp",
        "subtitle": "Thống kê điểm đánh giá hiệu quả công việc và xếp loại thi đua nhân sự",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "KPIReportTable",
                "type": "UI Component",
                "description": "Bảng tổng hợp điểm KPI của từng phòng ban và từng nhân viên theo kỳ đánh giá.",
                "file_path": "/FrontEnd/Web/modules/KPI/Views/Report/KPIReportsView.jsx",
                "tech": {
                    "handler_name": "fetchKPIReports",
                    "details": "Tổng hợp điểm hoàn thành mục tiêu, điểm chuyên cần và điểm trừ vi phạm chất lượng.",
                    "user_guide": "Xem bảng xếp loại thành tích để phục vụ xét thưởng hàng tháng.",
                    "called_apis": ["GET /api/v1/kpi/reports"],
                    "database_tables": ["kpi_reports", "employees"],
                    "code_snippet": "<Table data={kpiReports} columns={kpiColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xem và xuất báo cáo KPI",
                "related_components": "KPIReportTable",
                "description": "Lọc theo tháng/quý để xem tổng điểm xếp loại của toàn bộ công ty."
            }
        ]
    },
    {
        "platform": "Web",
        "route_path": "/admin/violations",
        "backend_path": "/api/v1/violations",
        "default_code": "KPI10",
        "current_code": "KPI10",
        "title": "Lịch sử vi phạm quy trình",
        "subtitle": "Biên bản xử lý vi phạm nội quy, an toàn lao động và lỗi chất lượng nghiêm trọng",
        "status": "Hoàn thành",
        "target_date": "2026-03-10",
        "components": [
            {
                "name": "ViolationTable",
                "type": "UI Component",
                "description": "Bảng ghi nhận các biên bản vi phạm kỷ luật kèm mức trừ điểm KPI tương ứng.",
                "file_path": "/FrontEnd/Web/modules/KPI/Views/Violation/ViolationHistoryView.jsx",
                "tech": {
                    "handler_name": "fetchViolations",
                    "details": "Hiển thị nhân viên vi phạm, điều khoản vi phạm, mức độ và người lập biên bản.",
                    "user_guide": "Tra cứu các trường hợp vi phạm quy định làm việc.",
                    "called_apis": ["GET /api/v1/violations"],
                    "database_tables": ["violations", "employees"],
                    "code_snippet": "<Table data={violations} columns={violationColumns} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Lập biên bản vi phạm",
                "related_components": "ViolationTable",
                "description": "Ghi nhận lỗi vi phạm quy trình thao tác và trừ điểm KPI tương ứng."
            }
        ]
    }
]

# ==========================================
# 2. DANH SÁCH MÀN HÌNH MOBILE
# ==========================================
MOBILE_SCREENS = [
    {
        "platform": "Mobile",
        "route_path": "/login",
        "backend_path": "/api/v1/accounts/login",
        "default_code": "MB01",
        "current_code": "MB01",
        "title": "Đăng nhập Mobile",
        "subtitle": "Đăng nhập ứng dụng di động SmartFlow cho công nhân và giám sát",
        "status": "Hoàn thành",
        "target_date": "2026-03-01",
        "components": [
            {
                "name": "MobileLoginHeader",
                "type": "UI Component",
                "description": "Khối tiêu đề và logo ứng dụng Mobile SmartFlow.",
                "file_path": "/FrontEnd/Mobile/modules/auth/Views/LoginView.jsx",
                "tech": {
                    "handler_name": "renderHeader",
                    "details": "Hiển thị logo công ty và form đăng nhập nhanh.",
                    "user_guide": "Mở ứng dụng trên điện thoại di động.",
                    "called_apis": ["N/A"],
                    "database_tables": ["accounts"],
                    "code_snippet": "<MobileHeader logo='/assets/logo.png' />"
                }
            },
            {
                "name": "SubmitLoginBtn",
                "type": "UI Component",
                "description": "Nút bấm xác thực đăng nhập trên điện thoại.",
                "file_path": "/FrontEnd/Mobile/modules/auth/Views/LoginView.jsx",
                "tech": {
                    "handler_name": "handleMobileLogin",
                    "details": "Gửi request JWT đăng nhập và lưu token vào bộ nhớ thiết bị.",
                    "user_guide": "Bấm để đăng nhập vào ca làm việc.",
                    "called_apis": ["POST /api/v1/accounts/login"],
                    "database_tables": ["accounts"],
                    "code_snippet": "const login = async () => await mobileAuth.login(user, pass);"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Đăng nhập đầu ca",
                "related_components": "SubmitLoginBtn",
                "description": "Công nhân nhập mã nhân viên hoặc quét thẻ để vào ứng dụng."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/dashboard",
        "backend_path": "/api/v1/production/stats",
        "default_code": "MB02",
        "current_code": "MB02",
        "title": "Trang chủ & Menu Mobile",
        "subtitle": "Bảng điều khiển nhanh các tác vụ trong ca của người lao động",
        "status": "Hoàn thành",
        "target_date": "2026-03-01",
        "components": [
            {
                "name": "QuickActionGrid",
                "type": "UI Component",
                "description": "Lưới các nút truy cập nhanh: Tạo phiếu luân chuyển, Kiểm tra QC, Báo cáo sự cố.",
                "file_path": "/FrontEnd/Mobile/modules/production/Views/ProductionDashboardView.jsx",
                "tech": {
                    "handler_name": "handleNavigateAction",
                    "details": "Chuyển nhanh tới các chức năng chính.",
                    "user_guide": "Bấm vào các icon để mở chức năng cần làm việc.",
                    "called_apis": ["N/A"],
                    "database_tables": ["accounts"],
                    "code_snippet": "<ActionGrid items={quickActions} onItemClick={handleNav} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Chọn chức năng làm việc",
                "related_components": "QuickActionGrid",
                "description": "Nhấn vào biểu tượng chức năng tương ứng để bắt đầu thao tác trong ca."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/production_v2/transfer",
        "backend_path": "/api/v1/production-transfers",
        "default_code": "MB07",
        "current_code": "MB07",
        "title": "Tạo phiếu luân chuyển (CL07)",
        "subtitle": "Khởi tạo phiếu chuyển linh kiện bán thành phẩm sang công đoạn kế tiếp",
        "status": "Hoàn thành",
        "target_date": "2026-03-02",
        "components": [
            {
                "name": "TransferForm",
                "type": "UI Component",
                "description": "Biểu mẫu nhập mã LOT, số lượng giao và chọn công đoạn nhận.",
                "file_path": "/FrontEnd/Mobile/modules/production_v2/Views/CL07_TransferCreateView.jsx",
                "tech": {
                    "handler_name": "handleSubmitTransfer",
                    "details": "Lưu phiếu luân chuyển và sinh mã QR bàn giao.",
                    "user_guide": "Nhập số lượng thực tế giao và bấm Tạo phiếu.",
                    "called_apis": ["POST /api/v1/production-transfers"],
                    "database_tables": ["deliveries", "delivery_details"],
                    "code_snippet": "const createTransfer = async () => await transferService.create(transferData);"
                }
            },
            {
                "name": "PrintThermalTicketBtn",
                "type": "UI Component",
                "description": "Nút in tem nhiệt gắn lên kiện hàng vừa bàn giao.",
                "file_path": "/FrontEnd/Mobile/modules/production_v2/Views/CL07_TransferCreateView.jsx",
                "tech": {
                    "handler_name": "handlePrintThermal",
                    "details": "Gửi lệnh in qua kết nối Bluetooth tới máy in tem di động.",
                    "user_guide": "Bấm in và dán tem lên pallet hàng.",
                    "called_apis": ["POST /api/v1/devices/thermal-printer"],
                    "database_tables": ["deliveries"],
                    "code_snippet": "const printTicket = () => printerService.print(ticketData);"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Tạo phiếu luân chuyển",
                "related_components": "TransferForm",
                "description": "Chọn công đoạn nhận, nhập số lượng linh kiện hoàn thành và xác nhận tạo phiếu."
            },
            {
                "step_number": 2,
                "title": "In tem nhiệt dán kiện",
                "related_components": "PrintThermalTicketBtn",
                "description": "In phiếu tem nhiệt dán lên thùng/pallet để công đoạn sau quét nhận."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/production_v2/transfer-list",
        "backend_path": "/api/v1/production-transfers",
        "default_code": "MB08",
        "current_code": "MB08",
        "title": "Danh sách luân chuyển (CL06)",
        "subtitle": "Tra cứu lịch sử và trạng thái tiếp nhận các kiện hàng luân chuyển",
        "status": "Hoàn thành",
        "target_date": "2026-03-02",
        "components": [
            {
                "name": "TransferCardList",
                "type": "UI Component",
                "description": "Danh sách các thẻ luân chuyển kèm trạng thái: Chờ nhận, Đã nhận, Bị trả về.",
                "file_path": "/FrontEnd/Mobile/modules/production_v2/Views/CL06_TransferListView.jsx",
                "tech": {
                    "handler_name": "fetchTransferList",
                    "details": "Hiển thị danh sách các phiếu giao nhận nội bộ.",
                    "user_guide": "Xem các kiện hàng đang trên đường chuyển giao.",
                    "called_apis": ["GET /api/v1/production-transfers"],
                    "database_tables": ["deliveries"],
                    "code_snippet": "<TransferList cards={transferCards} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Kiểm tra tiến độ luân chuyển",
                "related_components": "TransferCardList",
                "description": "Theo dõi xem công đoạn kế tiếp đã quét nhận kiện hàng hay chưa."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/production_v2/inspection",
        "backend_path": "/api/v1/qc/inspections",
        "default_code": "MB10",
        "current_code": "MB10",
        "title": "Tạo phiếu kiểm tra chất lượng",
        "subtitle": "Ghi nhận kết quả kiểm tra mẫu đầu chuyền, kiểm tra thông số và QC định kỳ",
        "status": "Hoàn thành",
        "target_date": "2026-03-02",
        "components": [
            {
                "name": "SampleCheckForm",
                "type": "UI Component",
                "description": "Biểu mẫu chấm điểm chất lượng, ghi nhận số lượng mẫu đạt và phế phẩm.",
                "file_path": "/FrontEnd/Mobile/modules/production_v2/Views/CL09A_FirstSampleView.jsx",
                "tech": {
                    "handler_name": "submitQCReport",
                    "details": "Lưu kết quả kiểm tra chất lượng kèm chữ ký và ảnh minh chứng lỗi.",
                    "user_guide": "Đo kích thước mẫu, đánh dấu Đạt/Không đạt và bấm gửi kết quả.",
                    "called_apis": ["POST /api/v1/qc/inspections"],
                    "database_tables": ["qc_logs", "defect_types"],
                    "code_snippet": "const submitQC = async () => await qcService.saveInspection(qcData);"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Kiểm tra và ghi nhận kết quả",
                "related_components": "SampleCheckForm",
                "description": "Kiểm tra mẫu theo tiêu chuẩn HDKT và nhập kết quả đo lên ứng dụng Mobile."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/production_v2/inspection-list",
        "backend_path": "/api/v1/qc/inspections",
        "default_code": "MB10.1",
        "current_code": "MB10.1",
        "title": "Danh sách kiểm tra chất lượng",
        "subtitle": "Lịch sử các phiếu kiểm tra QC đã thực hiện trong ca",
        "status": "Hoàn thành",
        "target_date": "2026-03-02",
        "components": [
            {
                "name": "InspectionListCards",
                "type": "UI Component",
                "description": "Danh sách các thẻ kết quả kiểm tra chất lượng theo ca.",
                "file_path": "/FrontEnd/Mobile/modules/production_v2/Views/CL08_InspectionListView.jsx",
                "tech": {
                    "handler_name": "fetchInspectionList",
                    "details": "Hiển thị danh sách phiếu kiểm tra QC.",
                    "user_guide": "Xem lại các phiếu kiểm tra đã gửi.",
                    "called_apis": ["GET /api/v1/qc/inspections"],
                    "database_tables": ["qc_logs"],
                    "code_snippet": "<InspectionList items={inspections} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xem lịch sử kiểm tra",
                "related_components": "InspectionListCards",
                "description": "Tra cứu lại các phiếu QC đã hoàn thành trong ngày."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/production/orders",
        "backend_path": "/api/v1/production-orders",
        "default_code": "MB03",
        "current_code": "MB03",
        "title": "Lệnh sản xuất Mobile",
        "subtitle": "Tra cứu chi tiết và tiến độ lệnh sản xuất trên thiết bị cầm tay",
        "status": "Hoàn thành",
        "target_date": "2026-03-03",
        "components": [
            {
                "name": "OrderMobileCardList",
                "type": "UI Component",
                "description": "Thẻ hiển thị thông tin lệnh sản xuất và số lượng cần hoàn thành.",
                "file_path": "/FrontEnd/Mobile/modules/production/Views/ProductionOrdersView.jsx",
                "tech": {
                    "handler_name": "fetchMobileOrders",
                    "details": "Tải danh sách LSX đang chạy tại xưởng.",
                    "user_guide": "Bấm vào LSX để xem chi tiết linh kiện.",
                    "called_apis": ["GET /api/v1/production-orders"],
                    "database_tables": ["production_orders"],
                    "code_snippet": "<OrderCards orders={orders} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xem thông tin lệnh",
                "related_components": "OrderMobileCardList",
                "description": "Kiểm tra số lượng và yêu cầu kỹ thuật của lệnh sản xuất."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/production/plans",
        "backend_path": "/api/v1/production-schedule",
        "default_code": "MB05",
        "current_code": "MB05",
        "title": "Lịch sản xuất Mobile",
        "subtitle": "Xem lịch trình phân ca và kế hoạch làm việc trong ngày",
        "status": "Hoàn thành",
        "target_date": "2026-03-03",
        "components": [
            {
                "name": "ShiftScheduleCard",
                "type": "UI Component",
                "description": "Lịch phân ca và mục tiêu sản lượng ca làm việc.",
                "file_path": "/FrontEnd/Mobile/modules/production/Views/ProductionPlanScheduleView.jsx",
                "tech": {
                    "handler_name": "fetchShiftSchedule",
                    "details": "Hiển thị lịch công tác của tổ xưởng.",
                    "user_guide": "Xem mục tiêu số lượng cần đạt trong ca.",
                    "called_apis": ["GET /api/v1/production-schedule"],
                    "database_tables": ["production_plans"],
                    "code_snippet": "<ScheduleView schedule={shiftData} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xem kế hoạch ca",
                "related_components": "ShiftScheduleCard",
                "description": "Nắm rõ mục tiêu sản lượng được giao đầu ca."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/capa-list",
        "backend_path": "/api/v1/capa",
        "default_code": "MB34",
        "current_code": "MB34",
        "title": "Báo cáo CAPA Mobile",
        "subtitle": "Theo dõi và cập nhật tiến độ các hành động khắc phục chất lượng",
        "status": "Hoàn thành",
        "target_date": "2026-03-03",
        "components": [
            {
                "name": "CAPACardList",
                "type": "UI Component",
                "description": "Danh sách các phiếu CAPA được giao xử lý cho người dùng hiện tại.",
                "file_path": "/FrontEnd/Mobile/modules/capa/Views/CAPAListView.jsx",
                "tech": {
                    "handler_name": "fetchMyCAPAs",
                    "details": "Tải danh sách hành động khắc phục cần thực hiện.",
                    "user_guide": "Bấm vào phiếu để cập nhật hình ảnh và kết quả khắc phục.",
                    "called_apis": ["GET /api/v1/capa"],
                    "database_tables": ["capa_requests"],
                    "code_snippet": "<CAPAList cards={myCapas} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Cập nhật tiến độ CAPA",
                "related_components": "CAPACardList",
                "description": "Tải ảnh minh chứng sau khi đã sửa chữa/khắc phục lỗi."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/quick-report-create",
        "backend_path": "/api/v1/quick-reports",
        "default_code": "MB37",
        "current_code": "MB37",
        "title": "Tạo báo cáo nhanh sự cố",
        "subtitle": "Gửi cảnh báo sự cố dừng máy, thiếu vật tư hoặc lỗi chất lượng khẩn cấp",
        "status": "Hoàn thành",
        "target_date": "2026-03-04",
        "components": [
            {
                "name": "QuickReportForm",
                "type": "UI Component",
                "description": "Biểu mẫu gửi báo cáo nhanh kèm ghi âm giọng nói và chụp ảnh hiện trường.",
                "file_path": "/FrontEnd/Mobile/modules/quick_report/Views/QuickReportCreateView.jsx",
                "tech": {
                    "handler_name": "sendQuickIncidentReport",
                    "details": "Gửi thông báo đẩy khẩn cấp tới quản lý và tổ bảo trì.",
                    "user_guide": "Chụp ảnh sự cố, ghi chú nhanh và bấm Gửi khẩn cấp.",
                    "called_apis": ["POST /api/v1/quick-reports"],
                    "database_tables": ["quick_reports", "incident_logs"],
                    "code_snippet": "const sendReport = async () => await quickReportService.send(reportData);"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Báo cáo sự cố khẩn",
                "related_components": "QuickReportForm",
                "description": "Gửi ngay thông báo khi máy hỏng hoặc phát sinh lỗi hàng loạt để được hỗ trợ kịp thời."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/quick-report-list",
        "backend_path": "/api/v1/quick-reports",
        "default_code": "MB38",
        "current_code": "MB38",
        "title": "Lịch sử báo cáo sự cố",
        "subtitle": "Theo dõi phản hồi và trạng thái xử lý các sự cố đã gửi",
        "status": "Hoàn thành",
        "target_date": "2026-03-04",
        "components": [
            {
                "name": "QuickReportCards",
                "type": "UI Component",
                "description": "Danh sách các báo cáo sự cố đã gửi và phản hồi từ quản lý.",
                "file_path": "/FrontEnd/Mobile/modules/quick_report/Views/QuickReportListView.jsx",
                "tech": {
                    "handler_name": "fetchQuickReportHistory",
                    "details": "Hiển thị trạng thái tiếp nhận và xử lý sự cố.",
                    "user_guide": "Xem kết quả giải quyết của tổ bảo trì/kỹ thuật.",
                    "called_apis": ["GET /api/v1/quick-reports"],
                    "database_tables": ["quick_reports"],
                    "code_snippet": "<ReportList cards={reportHistory} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Theo dõi xử lý sự cố",
                "related_components": "QuickReportCards",
                "description": "Kiểm tra xem bộ phận kỹ thuật đã khắc phục xong sự cố hay chưa."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/awards",
        "backend_path": "/api/v1/violations",
        "default_code": "MB39",
        "current_code": "MB39",
        "title": "Báo cáo vi phạm Mobile",
        "subtitle": "Ghi nhận vi phạm quy trình làm việc và an toàn lao động tại xưởng",
        "status": "Hoàn thành",
        "target_date": "2026-03-04",
        "components": [
            {
                "name": "ViolationFormCard",
                "type": "UI Component",
                "description": "Phiếu ghi nhận vi phạm tại hiện trường.",
                "file_path": "/FrontEnd/Mobile/modules/kpi/Views/AwardDisciplineView.jsx",
                "tech": {
                    "handler_name": "submitViolationReport",
                    "details": "Lập biên bản vi phạm có hình ảnh và chữ ký.",
                    "user_guide": "Tổ trưởng hoặc QC lập biên bản khi phát hiện lỗi vi phạm quy trình.",
                    "called_apis": ["POST /api/v1/violations"],
                    "database_tables": ["violations"],
                    "code_snippet": "const recordViolation = async () => await violationService.create(violationData);"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Lập biên bản tại xưởng",
                "related_components": "ViolationFormCard",
                "description": "Ghi nhận vi phạm để làm căn cứ đánh giá thi đua cuối tháng."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/kpi-staff",
        "backend_path": "/api/v1/kpi/staff-evaluation",
        "default_code": "MB41",
        "current_code": "MB41",
        "title": "Đánh giá nhân sự Mobile",
        "subtitle": "Chấm điểm hiệu quả công việc và thái độ làm việc của tổ viên",
        "status": "Hoàn thành",
        "target_date": "2026-03-04",
        "components": [
            {
                "name": "StaffListForReview",
                "type": "UI Component",
                "description": "Danh sách nhân sự trong tổ kèm thanh trượt chấm điểm nhanh.",
                "file_path": "/FrontEnd/Mobile/modules/kpi/Views/KPIStaffListView.jsx",
                "tech": {
                    "handler_name": "saveStaffEvaluation",
                    "details": "Tổ trưởng chấm điểm đánh giá năng suất và chất lượng cho từng thành viên.",
                    "user_guide": "Kéo thanh trượt để chấm điểm và bấm Lưu.",
                    "called_apis": ["POST /api/v1/kpi/staff-evaluation"],
                    "database_tables": ["kpi_evaluations"],
                    "code_snippet": "const saveScore = async () => await kpiService.saveScore(scoreData);"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Chấm điểm định kỳ",
                "related_components": "StaffListForReview",
                "description": "Đánh giá công tâm dựa trên kết quả sản lượng và tỷ lệ lỗi phế phẩm của công nhân."
            }
        ]
    },
    {
        "platform": "Mobile",
        "route_path": "/kpi-quality-employees",
        "backend_path": "/api/v1/kpi/quality-employees",
        "default_code": "MB42",
        "current_code": "MB42",
        "title": "Nhân sự Quản lý Chất lượng Mobile",
        "subtitle": "Danh sách phân công nhân sự QC kiểm tra tại các công đoạn",
        "status": "Hoàn thành",
        "target_date": "2026-03-04",
        "components": [
            {
                "name": "QCEmployeeListMobile",
                "type": "UI Component",
                "description": "Danh sách nhân viên QC và công đoạn được phân công phụ trách.",
                "file_path": "/FrontEnd/Mobile/modules/kpi/Views/QualityEmployeeListMobileView.jsx",
                "tech": {
                    "handler_name": "fetchQCStaff",
                    "details": "Hiển thị thông tin phân bổ nhân lực kiểm tra chất lượng.",
                    "user_guide": "Xem nhân sự QC phụ trách tại từng công đoạn.",
                    "called_apis": ["GET /api/v1/kpi/quality-employees"],
                    "database_tables": ["employees", "stages"],
                    "code_snippet": "<QCStaffList staff={qcStaff} />"
                }
            }
        ],
        "guides": [
            {
                "step_number": 1,
                "title": "Xem phân công kiểm tra",
                "related_components": "QCEmployeeListMobile",
                "description": "Nắm rõ công đoạn và sản phẩm được giao phụ trách kiểm soát chất lượng."
            }
        ]
    }
]

def seed_full_screens():
    safe_print("=" * 60)
    safe_print("BẮT ĐẦU NẠP DỮ LIỆU ĐẦY ĐỦ CHO MODULE QUẢN LÝ MÀN HÌNH")
    safe_print("=" * 60)
    
    # Đảm bảo bảng tồn tại
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    
    try:
        all_screens = WEB_SCREENS + MOBILE_SCREENS
        total_screens = len(all_screens)
        inserted_screens = 0
        updated_screens = 0
        total_components = 0
        total_guides = 0
        
        for screen_data in all_screens:
            platform = screen_data["platform"]
            route_path = screen_data["route_path"]
            default_code = screen_data["default_code"]
            current_code = screen_data["current_code"]
            title = screen_data["title"]
            subtitle = screen_data.get("subtitle", "")
            backend_path = screen_data.get("backend_path", "")
            status = screen_data.get("status", "Hoàn thành")
            target_date = screen_data.get("target_date", "2026-03-15")
            
            # Kiểm tra xem màn hình đã tồn tại chưa (theo platform + route_path hoặc default_code)
            check_screen = text("""
                SELECT id FROM system_screens 
                WHERE platform = :platform AND (route_path = :route_path OR default_code = :default_code)
            """)
            existing = db.execute(check_screen, {
                "platform": platform,
                "route_path": route_path,
                "default_code": default_code
            }).fetchone()
            
            screen_id = None
            if existing:
                screen_id = existing[0]
                update_screen_sql = text("""
                    UPDATE system_screens 
                    SET title = :title, subtitle = :subtitle, route_path = :route_path,
                        backend_path = :backend_path, current_code = :current_code,
                        default_code = :default_code, status = :status, target_date = :target_date,
                        is_active = 1, updated_at = :updated_at
                    WHERE id = :id
                """)
                db.execute(update_screen_sql, {
                    "id": screen_id,
                    "title": title,
                    "subtitle": subtitle,
                    "route_path": route_path,
                    "backend_path": backend_path,
                    "current_code": current_code,
                    "default_code": default_code,
                    "status": status,
                    "target_date": target_date,
                    "updated_at": datetime.now()
                })
                updated_screens += 1
                safe_print(f"[*] Cập nhật màn hình [{platform}] {default_code} - {title}")
            else:
                insert_screen_sql = text("""
                    INSERT INTO system_screens (platform, route_path, backend_path, default_code, current_code, title, subtitle, is_active, status, target_date, updated_at)
                    OUTPUT INSERTED.id
                    VALUES (:platform, :route_path, :backend_path, :default_code, :current_code, :title, :subtitle, 1, :status, :target_date, :updated_at)
                """)
                res = db.execute(insert_screen_sql, {
                    "platform": platform,
                    "route_path": route_path,
                    "backend_path": backend_path,
                    "default_code": default_code,
                    "current_code": current_code,
                    "title": title,
                    "subtitle": subtitle,
                    "status": status,
                    "target_date": target_date,
                    "updated_at": datetime.now()
                })
                screen_id = res.fetchone()[0]
                inserted_screens += 1
                safe_print(f"[+] Thêm mới màn hình [{platform}] {default_code} - {title} (ID: {screen_id})")
                
            # ── BỔ SUNG COMPONENTS / NÚT BẤM ──
            components = screen_data.get("components", [])
            for comp in components:
                name = comp["name"]
                comp_type = comp.get("type", "UI Component")
                desc = comp.get("description", "")
                file_path = comp.get("file_path", "")
                tech_data = comp.get("tech", {})
                
                tech_json = build_technical_details(
                    handler_name=tech_data.get("handler_name", "handleClick"),
                    details=tech_data.get("details", desc),
                    user_guide=tech_data.get("user_guide", "Nhấn hoặc nhập để thực hiện thao tác."),
                    called_apis=tech_data.get("called_apis", [backend_path or "/api/v1/data"]),
                    database_tables=tech_data.get("database_tables", ["system_screens"]),
                    code_snippet=tech_data.get("code_snippet", "")
                )
                
                # Check component exists
                check_comp = text("""
                    SELECT id FROM system_components 
                    WHERE screen_id = :screen_id AND name = :name
                """)
                existing_comp = db.execute(check_comp, {"screen_id": screen_id, "name": name}).fetchone()
                
                if existing_comp:
                    update_comp_sql = text("""
                        UPDATE system_components 
                        SET type = :type, description = :description, technical_details = :technical_details,
                            file_path = :file_path, is_active = 1, updated_at = :updated_at
                        WHERE id = :id
                    """)
                    db.execute(update_comp_sql, {
                        "id": existing_comp[0],
                        "type": comp_type,
                        "description": desc,
                        "technical_details": tech_json,
                        "file_path": file_path,
                        "updated_at": datetime.now()
                    })
                else:
                    insert_comp_sql = text("""
                        INSERT INTO system_components (screen_id, name, type, description, technical_details, file_path, is_active, updated_at)
                        VALUES (:screen_id, :name, :type, :description, :technical_details, :file_path, 1, :updated_at)
                    """)
                    db.execute(insert_comp_sql, {
                        "screen_id": screen_id,
                        "name": name,
                        "type": comp_type,
                        "description": desc,
                        "technical_details": tech_json,
                        "file_path": file_path,
                        "updated_at": datetime.now()
                    })
                    total_components += 1
                    
            # ── BỔ SUNG GUIDES (HƯỚNG DẪN THAO TÁC) ──
            guides = screen_data.get("guides", [])
            for guide in guides:
                step_num = guide["step_number"]
                guide_title = guide["title"]
                related = guide.get("related_components", "")
                guide_desc = guide.get("description", "")
                
                check_guide = text("""
                    SELECT id FROM system_guides 
                    WHERE screen_id = :screen_id AND step_number = :step_number
                """)
                existing_guide = db.execute(check_guide, {"screen_id": screen_id, "step_number": step_num}).fetchone()
                
                if existing_guide:
                    update_guide_sql = text("""
                        UPDATE system_guides 
                        SET title = :title, related_components = :related_components, 
                            description = :description, updated_at = :updated_at
                        WHERE id = :id
                    """)
                    db.execute(update_guide_sql, {
                        "id": existing_guide[0],
                        "title": guide_title,
                        "related_components": related,
                        "description": guide_desc,
                        "updated_at": datetime.now()
                    })
                else:
                    insert_guide_sql = text("""
                        INSERT INTO system_guides (screen_id, step_number, title, related_components, description, updated_at)
                        VALUES (:screen_id, :step_number, :title, :related_components, :description, :updated_at)
                    """)
                    db.execute(insert_guide_sql, {
                        "screen_id": screen_id,
                        "step_number": step_num,
                        "title": guide_title,
                        "related_components": related,
                        "description": guide_desc,
                        "updated_at": datetime.now()
                    })
                    total_guides += 1

        db.commit()
        safe_print("-" * 60)
        safe_print(f"Tổng kết Màn hình: {inserted_screens} thêm mới, {updated_screens} cập nhật (Tổng {total_screens})")
        safe_print(f"Đã nạp {total_components} Components/Buttons và {total_guides} Hướng dẫn thao tác.")
        
        # ── ĐỒNG BỘ LIÊN KẾT VỚI SIDEBAR ──
        safe_print("Đang đồng bộ liên kết screen_id vào bảng system_sidebars...")
        link_sidebar_sql = text("""
            UPDATE s
            SET s.screen_id = sc.id
            FROM system_sidebars s
            INNER JOIN system_screens sc ON s.platform = sc.platform AND s.route_path = sc.route_path
        """)
        db.execute(link_sidebar_sql)
        db.commit()
        safe_print("[SUCCESS] Hoàn tất đồng bộ toàn bộ dữ liệu Quản lý màn hình!")
        safe_print("=" * 60)
        
    except Exception as e:
        db.rollback()
        safe_print(f"[ERROR] Lỗi khi nạp dữ liệu: {str(e)}")
        raise e

if __name__ == "__main__":
    seed_full_screens()
