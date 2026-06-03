# -*- coding: utf-8 -*-
"""
SmartFlow v2 Migration and Code Splitting Script
This script automates the refactoring and directory partitioning of ERP_G7 into SmartFlow_v2.
"""

import os
import shutil
import re

def safe_copy(src, dest):
    dest_dir = os.path.dirname(dest)
    if dest_dir:
        try:
            os.makedirs(dest_dir, exist_ok=True)
        except Exception:
            pass
    try:
        shutil.copy2(src, dest)
    except Exception:
        try:
            with open(src, "r", encoding="utf-8", errors="ignore") as f_src:
                content = f_src.read()
            with open(dest, "w", encoding="utf-8") as f_dest:
                f_dest.write(content)
        except Exception as e:
            print(f"Warning: Failed to copy {src} to {dest}: {e}")

SRC_ROOT = r"C:\Test\ERP_G7"
DEST_ROOT = r"c:\SmartFlow_v2"

# 1. Directories to Create
dirs_to_create = [
    # root & docs
    "docs/architecture", "docs/api", "docs/database", "docs/deployment", "docs/workflows",
    # BackEnd core structure
    "BackEnd/app", "BackEnd/config", "BackEnd/scripts", "BackEnd/tests", "BackEnd/static",
    "BackEnd/database/migrations", "BackEnd/database/seeders", "BackEnd/database/backups",
    "BackEnd/shared/constants", "BackEnd/shared/exceptions", "BackEnd/shared/middlewares",
    "BackEnd/shared/services", "BackEnd/shared/utils", "BackEnd/shared/validators", "BackEnd/shared/security",
    # FrontEnd shared structure
    "FrontEnd/shared/assets/images", "FrontEnd/shared/assets/icons", "FrontEnd/shared/assets/fonts",
    "FrontEnd/shared/styles", "FrontEnd/shared/services", "FrontEnd/shared/hooks", "FrontEnd/shared/store", "FrontEnd/shared/context",
    "FrontEnd/shared/utils", "FrontEnd/shared/constants", "FrontEnd/shared/types",
    # FrontEnd Mobile shared & app
    "FrontEnd/Mobile/app", "FrontEnd/Mobile/assets/images", "FrontEnd/Mobile/assets/icons", "FrontEnd/Mobile/styles",
    "FrontEnd/Mobile/Shared/Models", "FrontEnd/Mobile/Shared/Services", "FrontEnd/Mobile/Shared/Controllers",
    "FrontEnd/Mobile/Shared/Views/components/ui", "FrontEnd/Mobile/Shared/Views/components/form",
    "FrontEnd/Mobile/Shared/Views/components/layout", "FrontEnd/Mobile/Shared/Views/components/feedback", "FrontEnd/Mobile/Shared/Views/components/media",
    "FrontEnd/Mobile/Shared/Views/components/user",
    # FrontEnd Web shared & app
    "FrontEnd/Web/app", "FrontEnd/Web/assets/images", "FrontEnd/Web/assets/icons", "FrontEnd/Web/styles",
    "FrontEnd/Web/Shared/Models", "FrontEnd/Web/Shared/Services", "FrontEnd/Web/Shared/Controllers",
    "FrontEnd/Web/Shared/Views/components/ui", "FrontEnd/Web/Shared/Views/components/form",
    "FrontEnd/Web/Shared/Views/components/layout", "FrontEnd/Web/Shared/Views/components/feedback", "FrontEnd/Web/Shared/Views/components/media",
    "FrontEnd/Web/Shared/Views/components/user",
]

# BackEnd Modules
backend_modules = ["auth", "delivery", "inspection", "kpi", "capa", "equipment", "notification", "report", "production", "master", "system"]
for m in backend_modules:
    dirs_to_create.extend([
        f"BackEnd/modules/{m}/controllers",
        f"BackEnd/modules/{m}/models",
        f"BackEnd/modules/{m}/services",
        f"BackEnd/modules/{m}/schemas",
        f"BackEnd/modules/{m}/repositories",
        f"BackEnd/modules/{m}/routes",
        f"BackEnd/modules/{m}/validators",
        f"BackEnd/modules/{m}/tests",
    ])

# FrontEnd Mobile Modules
mobile_modules = ["Auth", "Delivery", "Inspection", "KPI", "CAPA", "Equipment", "Notification", "Report", "Production"]
for m in mobile_modules:
    dirs_to_create.extend([
        f"FrontEnd/Mobile/{m}/Models",
        f"FrontEnd/Mobile/{m}/Views/components",
        f"FrontEnd/Mobile/{m}/Controllers",
    ])

# FrontEnd Web Modules
web_modules = ["Auth", "Dashboard", "Delivery", "Inspection", "KPI", "CAPA", "Equipment", "Notification", "Report", "Order", "Pallet", "Product", "Plan", "System"]
for m in web_modules:
    dirs_to_create.extend([
        f"FrontEnd/Web/{m}/Models",
        f"FrontEnd/Web/{m}/Views/components",
        f"FrontEnd/Web/{m}/Controllers",
    ])

# Explicit Backend Model Mapping
backend_model_map = {
    # auth
    "accounts.py": "BackEnd/modules/auth/models/accounts.py",
    "role.py": "BackEnd/modules/auth/models/role.py",
    "permissions.py": "BackEnd/modules/auth/models/permissions.py",
    "departments.py": "BackEnd/modules/auth/models/departments.py",
    "associations.py": "BackEnd/modules/auth/models/associations.py",
    # delivery
    "deliveries.py": "BackEnd/modules/delivery/models/deliveries.py",
    "delivery_details.py": "BackEnd/modules/delivery/models/delivery_details.py",
    "delivery_images.py": "BackEnd/modules/delivery/models/delivery_images.py",
    "delivery_qc.py": "BackEnd/modules/delivery/models/delivery_qc.py",
    "delivery_returns.py": "BackEnd/modules/delivery/models/delivery_returns.py",
    "pallet_card.py": "BackEnd/modules/delivery/models/pallet_card.py",
    "order.py": "BackEnd/modules/delivery/models/order.py",
    "order_item.py": "BackEnd/modules/delivery/models/order_item.py",
    # inspection
    "daily_inspection.py": "BackEnd/modules/inspection/models/daily_inspection.py",
    "stage_inspection.py": "BackEnd/modules/inspection/models/stage_inspection.py",
    "input_inspection.py": "BackEnd/modules/inspection/models/input_inspection.py",
    "defect_type.py": "BackEnd/modules/inspection/models/defect_type.py",
    "checklist.py": "BackEnd/modules/inspection/models/checklist.py",
    # kpi
    "kpi.py": "BackEnd/modules/kpi/models/kpi.py",
    "staff_evaluation.py": "BackEnd/modules/kpi/models/staff_evaluation.py",
    "award_discipline.py": "BackEnd/modules/kpi/models/award_discipline.py",
    # capa
    "capa.py": "BackEnd/modules/capa/models/capa.py",
    "capa_occurrence.py": "BackEnd/modules/capa/models/capa_occurrence.py",
    "capa_evaluation.py": "BackEnd/modules/capa/models/capa_evaluation.py",
    # equipment
    "equipment.py": "BackEnd/modules/equipment/models/equipment.py",
    # notification
    "notifications.py": "BackEnd/modules/notification/models/notifications.py",
    # production
    "product.py": "BackEnd/modules/production/models/product.py",
    "product_plan.py": "BackEnd/modules/production/models/product_plan.py",
    "category.py": "BackEnd/modules/production/models/category.py",
    "bom_detail.py": "BackEnd/modules/production/models/bom_detail.py",
    "stages.py": "BackEnd/modules/production/models/stages.py",
    # master
    "master_product.py": "BackEnd/modules/master/models/master_product.py",
    "master_category.py": "BackEnd/modules/master/models/master_category.py",
    "master_bom_detail.py": "BackEnd/modules/master/models/master_bom_detail.py",
    # system
    "system_component.py": "BackEnd/modules/system/models/system_component.py",
    "system_screen.py": "BackEnd/modules/system/models/system_screen.py",
    "backup_qr.py": "BackEnd/modules/system/models/backup_qr.py",
}

# Explicit Backend Schema Mapping
backend_schema_map = {
    # auth
    "accounts.py": "BackEnd/modules/auth/schemas/accounts.py",
    "role.py": "BackEnd/modules/auth/schemas/role.py",
    "permissions.py": "BackEnd/modules/auth/schemas/permissions.py",
    "departments.py": "BackEnd/modules/auth/schemas/departments.py",
    # delivery
    "deliveries.py": "BackEnd/modules/delivery/schemas/deliveries.py",
    "delivery_details.py": "BackEnd/modules/delivery/schemas/delivery_details.py",
    "delivery_images.py": "BackEnd/modules/delivery/schemas/delivery_images.py",
    "delivery_returns.py": "BackEnd/modules/delivery/schemas/delivery_returns.py",
    "pallet_card.py": "BackEnd/modules/delivery/schemas/pallet_card.py",
    "order.py": "BackEnd/modules/delivery/schemas/order.py",
    # inspection
    "daily_inspection.py": "BackEnd/modules/inspection/schemas/daily_inspection.py",
    "stage_inspection.py": "BackEnd/modules/inspection/schemas/stage_inspection.py",
    "input_inspection.py": "BackEnd/modules/inspection/schemas/input_inspection.py",
    "defect_type.py": "BackEnd/modules/inspection/schemas/defect_type.py",
    "checklist.py": "BackEnd/modules/inspection/schemas/checklist.py",
    # kpi
    "kpi.py": "BackEnd/modules/kpi/schemas/kpi.py",
    "staff_evaluation.py": "BackEnd/modules/kpi/schemas/staff_evaluation.py",
    "award_discipline.py": "BackEnd/modules/kpi/schemas/award_discipline.py",
    # capa
    "capa.py": "BackEnd/modules/capa/schemas/capa.py",
    # equipment
    "equipment.py": "BackEnd/modules/equipment/schemas/equipment.py",
    # notification
    "notifications.py": "BackEnd/modules/notification/schemas/notifications.py",
    # production
    "product.py": "BackEnd/modules/production/schemas/product.py",
    "product_plan.py": "BackEnd/modules/production/schemas/product_plan.py",
    "category.py": "BackEnd/modules/production/schemas/category.py",
    "bom_detail.py": "BackEnd/modules/production/schemas/bom_detail.py",
    "stages.py": "BackEnd/modules/production/schemas/stages.py",
    # master
    "master_product.py": "BackEnd/modules/master/schemas/master_product.py",
    "master_category.py": "BackEnd/modules/master/schemas/master_category.py",
    "master_bom_detail.py": "BackEnd/modules/master/schemas/master_bom_detail.py",
    # system
    "system_component.py": "BackEnd/modules/system/schemas/system_component.py",
    "system_screen.py": "BackEnd/modules/system/schemas/system_screen.py",
}

# Explicit Backend Controller Mapping
backend_controller_map = {
    "account_controller.py": "BackEnd/modules/auth/controllers/account_controller.py",
    "role_controller.py": "BackEnd/modules/auth/controllers/role_controller.py",
    "permission_controller.py": "BackEnd/modules/auth/controllers/permission_controller.py",
    "department_controller.py": "BackEnd/modules/auth/controllers/department_controller.py",
    "delivery_controller.py": "BackEnd/modules/delivery/controllers/delivery_controller.py",
    "order_controller.py": "BackEnd/modules/delivery/controllers/order_controller.py",
    "production_controller.py": "BackEnd/modules/production/controllers/production_controller.py",
    "product_controller.py": "BackEnd/modules/production/controllers/product_controller.py",
    "category_controller.py": "BackEnd/modules/production/controllers/category_controller.py",
    "master_product_controller.py": "BackEnd/modules/master/controllers/master_product_controller.py",
}

# Explicit Backend Router/Endpoint Mapping
backend_router_map = {
    # auth
    "account_router.py": "BackEnd/modules/auth/routes/account_router.py",
    "role_router.py": "BackEnd/modules/auth/routes/role_router.py",
    "permission_router.py": "BackEnd/modules/auth/routes/permission_router.py",
    # delivery
    "delivery_router.py": "BackEnd/modules/delivery/routes/delivery_router.py",
    "return_router.py": "BackEnd/modules/delivery/routes/return_router.py",
    "pallet_router.py": "BackEnd/modules/delivery/routes/pallet_router.py",
    "order_router.py": "BackEnd/modules/delivery/routes/order_router.py",
    # inspection
    "inspection_router.py": "BackEnd/modules/inspection/routes/inspection_routes.py",
    "qc_router.py": "BackEnd/modules/inspection/routes/qc_routes.py",
    # kpi
    "kpi_router.py": "BackEnd/modules/kpi/routes/kpi_router.py",
    "staff_evaluation_router.py": "BackEnd/modules/kpi/routes/staff_evaluation_router.py",
    "award_discipline_router.py": "BackEnd/modules/kpi/routes/award_discipline_router.py",
    # capa
    "capa_router.py": "BackEnd/modules/capa/routes/capa_router.py",
    # equipment
    "equipment_router.py": "BackEnd/modules/equipment/routes/equipment_router.py",
    # notification
    "notification_router.py": "BackEnd/modules/notification/routes/notification_router.py",
    # production
    "product_plan_router.py": "BackEnd/modules/production/routes/product_plan_router.py",
    "production_router.py": "BackEnd/modules/production/routes/production_router.py",
    "product_router.py": "BackEnd/modules/production/routes/product_router.py",
    "category_router.py": "BackEnd/modules/production/routes/category_router.py",
    "stage_router.py": "BackEnd/modules/production/routes/stage_router.py",
    # master
    "master_product_router.py": "BackEnd/modules/master/routes/master_product_router.py",
    # system
    "system_router.py": "BackEnd/modules/system/routes/system_router.py",
    "screen_router.py": "BackEnd/modules/system/routes/screen_router.py",
}

# Explicit FrontEnd Mobile Screen Mapping
mobile_screen_map = {
    "Login.jsx": "FrontEnd/Mobile/Auth/Views/LoginView.jsx",
    "DeliveryInfo.jsx": "FrontEnd/Mobile/Delivery/Views/DeliveryInfoView.jsx",
    "DeliveryCreate.jsx": "FrontEnd/Mobile/Delivery/Views/DeliveryCreateView.jsx",
    "DeliveryReceive.jsx": "FrontEnd/Mobile/Delivery/Views/DeliveryReceiveView.jsx",
    "ThermalPrint.jsx": "FrontEnd/Mobile/Delivery/Views/components/ThermalPrint.jsx",
    "DailyInspection.jsx": "FrontEnd/Mobile/Inspection/Views/DailyInspectionView.jsx",
    "StageInspection.jsx": "FrontEnd/Mobile/Inspection/Views/StageInspectionView.jsx",
    "InspectionLogs.jsx": "FrontEnd/Mobile/Inspection/Views/InspectionLogsView.jsx",
    "InputInspection.jsx": "FrontEnd/Mobile/Inspection/Views/InputInspectionView.jsx",
    "QualityInspectionDetail.jsx": "FrontEnd/Mobile/Inspection/Views/QualityInspectionDetailView.jsx",
    "KPITracking.jsx": "FrontEnd/Mobile/KPI/Views/KPITrackingView.jsx",
    "KPIStaffList.jsx": "FrontEnd/Mobile/KPI/Views/KPIStaffListView.jsx",
    "StaffEvaluation.jsx": "FrontEnd/Mobile/KPI/Views/StaffEvaluationView.jsx",
    "AwardDiscipline.jsx": "FrontEnd/Mobile/KPI/Views/AwardDisciplineView.jsx",
    "CAPAList.jsx": "FrontEnd/Mobile/CAPA/Views/CAPAListView.jsx",
    "CAPAReport.jsx": "FrontEnd/Mobile/CAPA/Views/CAPAReportView.jsx",
    "CAPADetail.jsx": "FrontEnd/Mobile/CAPA/Views/CAPADetailView.jsx",
    "EquipmentList.jsx": "FrontEnd/Mobile/Equipment/Views/EquipmentListView.jsx",
    "PlanTracking.jsx": "FrontEnd/Mobile/Production/Views/PlanTrackingView.jsx",
}

# Explicit FrontEnd Mobile Component Mapping
mobile_component_map = {
    "Button.jsx": "FrontEnd/Mobile/Shared/Views/components/ui/Button.jsx",
    "Input.jsx": "FrontEnd/Mobile/Shared/Views/components/ui/Input.jsx",
    "DataTable.jsx": "FrontEnd/Mobile/Shared/Views/components/ui/DataTable.jsx",
    "ProgressBar.jsx": "FrontEnd/Mobile/Shared/Views/components/ui/ProgressBar.jsx",
    "Tabs.jsx": "FrontEnd/Mobile/Shared/Views/components/ui/Tabs.jsx",
    "CollapsibleCard.jsx": "FrontEnd/Mobile/Shared/Views/components/ui/CollapsibleCard.jsx",
    "Stepper.jsx": "FrontEnd/Mobile/Shared/Views/components/ui/Stepper.jsx",
    
    "FormInput.jsx": "FrontEnd/Mobile/Shared/Views/components/form/FormInput.jsx",
    "FormSelect.jsx": "FrontEnd/Mobile/Shared/Views/components/form/FormSelect.jsx",
    "FormSearchSelect.jsx": "FrontEnd/Mobile/Shared/Views/components/form/FormSearchSelect.jsx",
    "FormMultiSearchSelect.jsx": "FrontEnd/Mobile/Shared/Views/components/form/FormMultiSearchSelect.jsx",
    "CustomSelect.jsx": "FrontEnd/Mobile/Shared/Views/components/form/CustomSelect.jsx",
    "SearchableSelect.jsx": "FrontEnd/Mobile/Shared/Views/components/form/SearchableSelect.jsx",
    
    "Layout.jsx": "FrontEnd/Mobile/Shared/Views/components/layout/MobileLayout.jsx",
    "Sidebar.jsx": "FrontEnd/Mobile/Shared/Views/components/layout/MobileSidebar.jsx",
    "PageHeader.jsx": "FrontEnd/Mobile/Shared/Views/components/layout/MobilePageHeader.jsx",
    "ProtectedRoute.jsx": "FrontEnd/Mobile/Shared/Views/components/layout/ProtectedRoute.jsx",
    
    "ConfirmModal.jsx": "FrontEnd/Mobile/Shared/Views/components/feedback/ConfirmModal.jsx",
    "MessageModal.jsx": "FrontEnd/Mobile/Shared/Views/components/feedback/MessageModal.jsx",
    "AppUpdateModal.jsx": "FrontEnd/Mobile/Shared/Views/components/feedback/AppUpdateModal.jsx",
    
    "QRScanner.jsx": "FrontEnd/Mobile/Shared/Views/components/media/QRScanner.jsx",
    "QRDisplayModal.jsx": "FrontEnd/Mobile/Shared/Views/components/media/QRDisplayModal.jsx",
    "NgrokImage.jsx": "FrontEnd/Mobile/Shared/Views/components/media/NgrokImage.jsx",
    
    "UserProfileCard.jsx": "FrontEnd/Mobile/Shared/Views/components/user/UserProfileCard.jsx",
    
    "PalletCardModal.jsx": "FrontEnd/Mobile/Delivery/Views/components/PalletCardModal.jsx",
    "PlanDetailsModal.jsx": "FrontEnd/Mobile/Delivery/Views/components/PlanDetailsModal.jsx",
    "QuickCreateModal.jsx": "FrontEnd/Mobile/Delivery/Views/components/QuickCreateModal.jsx",
    
    "NotificationBanner.jsx": "FrontEnd/Mobile/Notification/Views/components/NotificationBanner.jsx",
    "NotificationListener.jsx": "FrontEnd/Mobile/Notification/Views/components/NotificationListener.jsx",
    "NotificationSidebar.jsx": "FrontEnd/Mobile/Notification/Views/components/NotificationSidebar.jsx",
}

# Explicit FrontEnd Web Page Mapping
web_page_map = {
    # Admin Pages
    "Login.jsx": "FrontEnd/Web/Auth/Views/LoginView.jsx",
    "Dashboard.jsx": "FrontEnd/Web/Dashboard/Views/DashboardView.jsx",
    "BackupQRManagement.jsx": "FrontEnd/Web/System/Views/BackupQRManagementView.jsx",
    "DataPackaging.jsx": "FrontEnd/Web/System/Views/DataPackagingView.jsx",
    "HandoverList.jsx": "FrontEnd/Web/Delivery/Views/HandoverListView.jsx",
    "Hotspots.jsx": "FrontEnd/Web/System/Views/HotspotsView.jsx",
    "Improvements.jsx": "FrontEnd/Web/CAPA/Views/ImprovementsView.jsx",
    "IncidentLogs.jsx": "FrontEnd/Web/System/Views/IncidentLogsView.jsx",
    "InspectionReports.jsx": "FrontEnd/Web/Inspection/Views/InspectionReportsView.jsx",
    "KPIReports.jsx": "FrontEnd/Web/KPI/Views/KPIReportsView.jsx",
    "ScreenDetail.jsx": "FrontEnd/Web/System/Views/ScreenDetailView.jsx",
    "ScreenManagement.jsx": "FrontEnd/Web/System/Views/ScreenManagementView.jsx",
    "UserCreate.jsx": "FrontEnd/Web/Auth/Views/UserCreateView.jsx",
    "UserEdit.jsx": "FrontEnd/Web/Auth/Views/UserEditView.jsx",
    "UserManagement.jsx": "FrontEnd/Web/Auth/Views/UserManagementView.jsx",
    
    # Manufacture Pages
    "AddProductionPlan.jsx": "FrontEnd/Web/Plan/Views/AddProductionPlanView.jsx",
    "DeliveryTracking.jsx": "FrontEnd/Web/Delivery/Views/DeliveryTrackingView.jsx",
    "Handover.jsx": "FrontEnd/Web/Delivery/Views/DeliveryHandoverView.jsx",
    "OrderCreate.jsx": "FrontEnd/Web/Order/Views/OrderCreateView.jsx",
    "Orders.jsx": "FrontEnd/Web/Order/Views/OrdersListView.jsx",
    "PalletCard.jsx": "FrontEnd/Web/Pallet/Views/PalletCardView.jsx",
    "Plan.jsx": "FrontEnd/Web/Plan/Views/PlanListView.jsx",
    "PlanDetail.jsx": "FrontEnd/Web/Plan/Views/PlanDetailView.jsx",
    "ProductCreate.jsx": "FrontEnd/Web/Product/Views/ProductCreateView.jsx",
    "ProductDetail.jsx": "FrontEnd/Web/Product/Views/ProductDetailView.jsx",
    "ProductionProgress.jsx": "FrontEnd/Web/Plan/Views/ProductionProgressView.jsx",
    "Products.jsx": "FrontEnd/Web/Product/Views/ProductsListView.jsx",
    "Receive.jsx": "FrontEnd/Web/Delivery/Views/DeliveryReceiveView.jsx",
}

# Explicit FrontEnd Web Component Mapping
web_component_map = {
    "ActivityFeed.jsx": "FrontEnd/Web/Dashboard/Views/components/ActivityFeed.jsx",
    "AdminLayout.jsx": "FrontEnd/Web/Shared/Views/components/layout/AdminLayout.jsx",
    "BeautifulModal.jsx": "FrontEnd/Web/Shared/Views/components/feedback/BeautifulModal.jsx",
    "ManufactureLayout.jsx": "FrontEnd/Web/Shared/Views/components/layout/ManufactureLayout.jsx",
    "ManufactureSidebar.jsx": "FrontEnd/Web/Shared/Views/components/layout/ManufactureSidebar.jsx",
    "PriorityManagerModal.jsx": "FrontEnd/Web/Shared/Views/components/feedback/PriorityManagerModal.jsx",
    "Sidebar.jsx": "FrontEnd/Web/Shared/Views/components/layout/Sidebar.jsx",
}

def clean_dest_folder():
    print("Cleaning and initializing destination workspace...")
    for item in os.listdir(DEST_ROOT):
        # Keep directory tree markdown file and migrate script intact
        if item in ["SMARTFLOW_V2_DIRECTORY_TREE.md", "migrate.py"]:
            continue
        path = os.path.join(DEST_ROOT, item)
        try:
            if os.path.isdir(path):
                # Try renaming first to avoid WinError 5 pending deletion locks on Windows
                temp_dir = path + "_to_delete"
                try:
                    if os.path.exists(temp_dir):
                        shutil.rmtree(temp_dir, ignore_errors=True)
                    os.rename(path, temp_dir)
                    shutil.rmtree(temp_dir, ignore_errors=True)
                except Exception:
                    shutil.rmtree(path, ignore_errors=True)
            else:
                os.remove(path)
        except Exception as e:
            print(f"Warning: Could not remove {path}: {e}")

def create_directories():
    print("Creating SmartFlow v2 directory structure...")
    for d in dirs_to_create:
        full_path = os.path.join(DEST_ROOT, d)
        try:
            os.makedirs(full_path, exist_ok=True)
        except Exception as e:
            if os.path.exists(full_path) and os.path.isdir(full_path):
                continue
            print(f"Warning: Could not create directory {full_path}: {e}")

def copy_root_and_docs():
    print("Copying documentation, root configs and utility scripts...")
    
    # Docs
    src_doc = os.path.join(SRC_ROOT, "Document")
    dest_doc = os.path.join(DEST_ROOT, "docs")
    if os.path.exists(src_doc):
        # copy subfiles
        for root, dirs, files in os.walk(src_doc):
            for file in files:
                src_file = os.path.join(root, file)
                rel_path = os.path.relpath(src_file, src_doc)
                dest_file = os.path.join(dest_doc, rel_path)
                os.makedirs(os.path.dirname(dest_file), exist_ok=True)
                safe_copy(src_file, dest_file)
                
    # Root Scripts and batch files
    root_files = [
        ".gitignore", "CHANGELOG.md", "ONE_CLICK_PUBLISH.bat", "PUBLISH.sh",
        "README.md", "RUN_ALL_TESTS.bat", "SETUP_GUIDE.md", "SETUP_TEST_ENV.bat",
        "run_project.bat", "start_server.bat"
    ]
    for rf in root_files:
        src_f = os.path.join(SRC_ROOT, rf)
        dest_f = os.path.join(DEST_ROOT, rf)
        if os.path.exists(src_f):
            safe_copy(src_f, dest_f)

    # Patch start_server.bat
    dest_start_server = os.path.join(DEST_ROOT, "start_server.bat")
    if os.path.exists(dest_start_server):
        try:
            with open(dest_start_server, "r", encoding="utf-8") as f:
                content = f.read()
            content = content.replace("uvicorn src.app.main:app", "uvicorn app.main:app")
            with open(dest_start_server, "w", encoding="utf-8") as f:
                f.write(content)
            print("[OK] Patched start_server.bat")
        except Exception as e:
            print(f"Warning: Could not patch start_server.bat: {e}")

    # Patch run_project.bat
    dest_run_project = os.path.join(DEST_ROOT, "run_project.bat")
    if os.path.exists(dest_run_project):
        try:
            with open(dest_run_project, "r", encoding="utf-8") as f:
                content = f.read()
            content = content.replace("cd /d %~dp0Mobile", "cd /d %~dp0FrontEnd\\Mobile")
            content = content.replace('cd /d "%REAL_ROOT%Mobile"', 'cd /d "%REAL_ROOT%FrontEnd\\Mobile"')
            content = content.replace("cd Mobile", "cd FrontEnd\\Mobile")
            content = content.replace("Mobile\\android", "FrontEnd\\Mobile\\android")
            content = content.replace("migrations\\rebuild_indexes.py", "database\\migrations\\rebuild_indexes.py")
            with open(dest_run_project, "w", encoding="utf-8") as f:
                f.write(content)
            print("[OK] Patched run_project.bat")
        except Exception as e:
            print(f"Warning: Could not patch run_project.bat: {e}")

    # Patch ONE_CLICK_PUBLISH.bat
    dest_publish = os.path.join(DEST_ROOT, "ONE_CLICK_PUBLISH.bat")
    if os.path.exists(dest_publish):
        try:
            with open(dest_publish, "r", encoding="utf-8") as f:
                content = f.read()
            content = content.replace("Get-Content Mobile/package.json", "Get-Content FrontEnd/Mobile/package.json")
            content = content.replace("python scripts\\bump_version.py", "python BackEnd\\scripts\\bump_version.py")
            content = content.replace('cd /d "%REAL_ROOT%Mobile"', 'cd /d "%REAL_ROOT%FrontEnd\\Mobile"')
            content = content.replace("cd Mobile", "cd FrontEnd\\Mobile")
            content = content.replace('set "SOURCE=Mobile\\android', 'set "SOURCE=FrontEnd\\Mobile\\android')
            content = content.replace('BackEnd\\src\\static\\apps', 'BackEnd\\static\\apps')
            with open(dest_publish, "w", encoding="utf-8") as f:
                f.write(content)
            print("[OK] Patched ONE_CLICK_PUBLISH.bat")
        except Exception as e:
            print(f"Warning: Could not patch ONE_CLICK_PUBLISH.bat: {e}")

    # Patch SETUP_TEST_ENV.bat
    dest_setup_env = os.path.join(DEST_ROOT, "SETUP_TEST_ENV.bat")
    if os.path.exists(dest_setup_env):
        try:
            with open(dest_setup_env, "r", encoding="utf-8") as f:
                content = f.read()
            content = content.replace('cd /d "%~dp0Mobile"', 'cd /d "%~dp0FrontEnd\\Mobile"')
            with open(dest_setup_env, "w", encoding="utf-8") as f:
                f.write(content)
            print("[OK] Patched SETUP_TEST_ENV.bat")
        except Exception as e:
            print(f"Warning: Could not patch SETUP_TEST_ENV.bat: {e}")

    # Patch RUN_ALL_TESTS.bat
    dest_run_tests = os.path.join(DEST_ROOT, "RUN_ALL_TESTS.bat")
    if os.path.exists(dest_run_tests):
        try:
            with open(dest_run_tests, "r", encoding="utf-8") as f:
                content = f.read()
            content = content.replace('call pytest ../tests/backend/', 'call pytest tests/')
            content = content.replace('cd /d "%~dp0Mobile"', 'cd /d "%~dp0FrontEnd\\Mobile"')
            with open(dest_run_tests, "w", encoding="utf-8") as f:
                f.write(content)
            print("[OK] Patched RUN_ALL_TESTS.bat")
        except Exception as e:
            print(f"Warning: Could not patch RUN_ALL_TESTS.bat: {e}")

def copy_backend_files():
    print("Copying and distributing BackEnd source code...")
    
    # BackEnd Root Configs
    be_root_files = ["requirements.txt", ".env.example", ".env", "DEVELOPER_ADVANCED_DOCS.md", "DEVELOPER_BACKEND.md", "README.md"]
    for f in be_root_files:
        src_f = os.path.join(SRC_ROOT, "BackEnd", f)
        dest_f = os.path.join(DEST_ROOT, "BackEnd", f)
        if os.path.exists(src_f):
            safe_copy(src_f, dest_f)
            
    # BackEnd core & configs
    core_dir = os.path.join(SRC_ROOT, "BackEnd", "src", "app", "core")
    if os.path.exists(core_dir):
        # copy timezone & banner
        safe_copy(os.path.join(core_dir, "banner.py"), os.path.join(DEST_ROOT, "BackEnd", "shared", "utils", "banner.py"))
        safe_copy(os.path.join(core_dir, "timezone.py"), os.path.join(DEST_ROOT, "BackEnd", "shared", "utils", "timezone.py"))
        # config files
        safe_copy(os.path.join(core_dir, "config.py"), os.path.join(DEST_ROOT, "BackEnd", "config", "settings.py"))
        safe_copy(os.path.join(core_dir, "database.py"), os.path.join(DEST_ROOT, "BackEnd", "config", "database.py"))
        safe_copy(os.path.join(core_dir, "security.py"), os.path.join(DEST_ROOT, "BackEnd", "config", "security.py"))
        # services
        safe_copy(os.path.join(core_dir, "firebase_utils.py"), os.path.join(DEST_ROOT, "BackEnd", "shared", "services", "notification_service.py"))
        safe_copy(os.path.join(core_dir, "socket_manager.py"), os.path.join(DEST_ROOT, "BackEnd", "shared", "services", "websocket_service.py"))
        
    # BackEnd Models
    models_dir = os.path.join(SRC_ROOT, "BackEnd", "src", "app", "models")
    if os.path.exists(models_dir):
        for f, dest_rel in backend_model_map.items():
            src_f = os.path.join(models_dir, f)
            dest_f = os.path.join(DEST_ROOT, dest_rel)
            if os.path.exists(src_f):
                safe_copy(src_f, dest_f)
                
    # BackEnd Schemas
    schemas_dir = os.path.join(SRC_ROOT, "BackEnd", "src", "app", "schemas")
    if os.path.exists(schemas_dir):
        for f, dest_rel in backend_schema_map.items():
            src_f = os.path.join(schemas_dir, f)
            dest_f = os.path.join(DEST_ROOT, dest_rel)
            if os.path.exists(src_f):
                safe_copy(src_f, dest_f)
                
    # BackEnd Controllers
    controllers_dir = os.path.join(SRC_ROOT, "BackEnd", "src", "app", "controllers")
    if os.path.exists(controllers_dir):
        for f, dest_rel in backend_controller_map.items():
            src_f = os.path.join(controllers_dir, f)
            dest_f = os.path.join(DEST_ROOT, dest_rel)
            if os.path.exists(src_f):
                safe_copy(src_f, dest_f)
                
    # BackEnd Endpoints
    endpoints_dir = os.path.join(SRC_ROOT, "BackEnd", "src", "app", "api", "v1", "endpoints")
    if os.path.exists(endpoints_dir):
        for f, dest_rel in backend_router_map.items():
            src_f = os.path.join(endpoints_dir, f)
            dest_f = os.path.join(DEST_ROOT, dest_rel)
            if os.path.exists(src_f):
                safe_copy(src_f, dest_f)
                
    # App main router & entry
    app_main = os.path.join(SRC_ROOT, "BackEnd", "src", "app", "main.py")
    dest_main = os.path.join(DEST_ROOT, "BackEnd", "app", "main.py")
    if os.path.exists(app_main):
        safe_copy(app_main, dest_main)
        try:
            with open(dest_main, "r", encoding="utf-8") as f:
                content = f.read()
            # Patch paths for Static and Dist in main.py
            content = content.replace('os.path.join(os.path.dirname(__file__), "..", "..", "static")', 'os.path.join(os.path.dirname(__file__), "..", "static")')
            content = content.replace('os.path.join(os.path.dirname(__file__), "..", "..", "..", "Mobile", "dist")', 'os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "Mobile", "dist")')
            content = content.replace('os.path.join(os.path.dirname(__file__), "..", "..", "..", "FrontEnd", "dist")', 'os.path.join(os.path.dirname(__file__), "..", "..", "FrontEnd", "dist")')
            with open(dest_main, "w", encoding="utf-8") as f:
                f.write(content)
            print("[OK] Patched main.py paths")
        except Exception as e:
            print(f"Warning: Could not patch main.py: {e}")
        
    # Database seeders and migrations
    seeders_src = [
        "seed_system_components.py", "seed_roles_permissions.py", 
        "seed_equipments.py"
    ]
    for seeder in seeders_src:
        # Check in root BackEnd
        src_s = os.path.join(SRC_ROOT, "BackEnd", seeder)
        if not os.path.exists(src_s):
            # Check in src/app
            src_s = os.path.join(SRC_ROOT, "BackEnd", "src", "app", seeder)
        if os.path.exists(src_s):
            safe_copy(src_s, os.path.join(DEST_ROOT, "BackEnd", "database", "seeders", seeder))
            
    # Migrations folder
    mig_src = os.path.join(SRC_ROOT, "BackEnd", "migrations")
    if os.path.exists(mig_src):
        for root, dirs, files in os.walk(mig_src):
            for file in files:
                safe_copy(os.path.join(root, file), os.path.join(DEST_ROOT, "BackEnd", "database", "migrations", file))

    # Scripts
    scripts_src = os.path.join(SRC_ROOT, "BackEnd", "src", "scripts")
    if os.path.exists(scripts_src):
        for file in os.listdir(scripts_src):
            if file.endswith(".py"):
                safe_copy(os.path.join(scripts_src, file), os.path.join(DEST_ROOT, "BackEnd", "scripts", file))
                
    # Copy and patch bump_version.py to fit the new directory structure
    src_bump = os.path.join(SRC_ROOT, "scripts", "bump_version.py")
    dest_bump = os.path.join(DEST_ROOT, "BackEnd", "scripts", "bump_version.py")
    if os.path.exists(src_bump):
        safe_copy(src_bump, dest_bump)
        try:
            with open(dest_bump, "r", encoding="utf-8") as f:
                content = f.read()
            # Replace Mobile with FrontEnd/Mobile
            content = content.replace('"Mobile", "package.json"', '"FrontEnd", "Mobile", "package.json"')
            content = content.replace('"Mobile", "android"', '"FrontEnd", "Mobile", "android"')
            # Replace system_router.py with system.py
            content = content.replace('"BackEnd", "src", "app", "api\\v1", "endpoints", "system_router.py"', '"BackEnd", "app", "api", "system.py"')
            content = content.replace('"BackEnd", "src", "app", "api/v1", "endpoints", "system_router.py"', '"BackEnd", "app", "api", "system.py"')
            # Update Publish_APK.bat path replacement to ONE_CLICK_PUBLISH.bat
            content = content.replace('"Publish_APK.bat"', '"ONE_CLICK_PUBLISH.bat"')
            with open(dest_bump, "w", encoding="utf-8") as f:
                f.write(content)
            print("[OK] Copied and patched bump_version.py")
        except Exception as e:
            print(f"Warning: Could not patch bump_version.py: {e}")
                
    # Tests backend
    test_src = os.path.join(SRC_ROOT, "tests", "backend")
    if os.path.exists(test_src):
        for file in os.listdir(test_src):
            if file.endswith(".py"):
                safe_copy(os.path.join(test_src, file), os.path.join(DEST_ROOT, "BackEnd", "tests", file))

    # Copy static assets folder
    static_src = os.path.join(SRC_ROOT, "BackEnd", "src", "static")
    static_dest = os.path.join(DEST_ROOT, "BackEnd", "static")
    if os.path.exists(static_src):
        for root, dirs, files in os.walk(static_src):
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), static_src)
                dest_file = os.path.join(static_dest, rel_path)
                os.makedirs(os.path.dirname(dest_file), exist_ok=True)
                safe_copy(os.path.join(root, file), dest_file)
        print("[OK] Copied static assets folder")

def copy_frontend_files():
    print("Copying and distributing FrontEnd files (Mobile & Web)...")
    
    # 1. MOBILE FILES
    mobile_src = os.path.join(SRC_ROOT, "Mobile")
    mobile_dest = os.path.join(DEST_ROOT, "FrontEnd", "Mobile")
    
    # Mobile root files
    mob_root_files = [
        "package.json", "package-lock.json", "vite.config.js", "capacitor.config.json",
        "jsconfig.json", "eslint.config.js", "index.html", "vitest.config.js", ".eslintrc.cjs"
    ]
    for rf in mob_root_files:
        src_f = os.path.join(mobile_src, rf)
        dest_f = os.path.join(mobile_dest, rf)
        if os.path.exists(src_f):
            safe_copy(src_f, dest_f)
            
    # Mobile src roots
    safe_copy(os.path.join(mobile_src, "src", "App.jsx"), os.path.join(mobile_dest, "app", "App.jsx"))
    safe_copy(os.path.join(mobile_src, "src", "main.jsx"), os.path.join(mobile_dest, "app", "bootstrap.jsx"))
    safe_copy(os.path.join(mobile_src, "src", "App.css"), os.path.join(mobile_dest, "styles", "components.css"))
    safe_copy(os.path.join(mobile_src, "src", "index.css"), os.path.join(mobile_dest, "styles", "index.css"))
    if os.path.exists(os.path.join(mobile_src, "src", "setupTests.js")):
        safe_copy(os.path.join(mobile_src, "src", "setupTests.js"), os.path.join(mobile_dest, "app", "setupTests.js"))
        
    # Mobile screens
    screen_src = os.path.join(mobile_src, "src", "Views", "screens")
    if os.path.exists(screen_src):
        for f, dest_rel in mobile_screen_map.items():
            src_f = os.path.join(screen_src, f)
            dest_f = os.path.join(DEST_ROOT, dest_rel)
            if os.path.exists(src_f):
                safe_copy(src_f, dest_f)
                
    # Mobile components
    comp_src = os.path.join(mobile_src, "src", "Views", "components")
    if os.path.exists(comp_src):
        for f, dest_rel in mobile_component_map.items():
            src_f = os.path.join(comp_src, f)
            dest_f = os.path.join(DEST_ROOT, dest_rel)
            if os.path.exists(src_f):
                safe_copy(src_f, dest_f)
                
    # Mobile controllers
    mc_src = os.path.join(mobile_src, "src", "Controllers")
    if os.path.exists(mc_src):
        # authController
        safe_copy(os.path.join(mc_src, "authController.js"), os.path.join(DEST_ROOT, "FrontEnd", "Mobile", "Auth", "Controllers", "authController.js"))
        # planController
        safe_copy(os.path.join(mc_src, "planController.js"), os.path.join(DEST_ROOT, "FrontEnd", "Mobile", "Production", "Controllers", "planController.js"))
        # NotificationController
        safe_copy(os.path.join(mc_src, "NotificationController.jsx"), os.path.join(DEST_ROOT, "FrontEnd", "Mobile", "Notification", "Controllers", "NotificationController.jsx"))
        
    # Mobile models
    mm_src = os.path.join(mobile_src, "src", "Models")
    if os.path.exists(mm_src):
        safe_copy(os.path.join(mm_src, "AuthModel.js"), os.path.join(DEST_ROOT, "FrontEnd", "Mobile", "Auth", "Models", "authModel.js"))
        safe_copy(os.path.join(mm_src, "ProductionModel.js"), os.path.join(DEST_ROOT, "FrontEnd", "Mobile", "Production", "Models", "productionModel.js"))
        
    # Mobile store -> shared / specific
    ms_src = os.path.join(mobile_src, "src", "store")
    if os.path.exists(ms_src):
        safe_copy(os.path.join(ms_src, "notificationStore.js"), os.path.join(DEST_ROOT, "FrontEnd", "shared", "store", "notificationStore.js"))
        safe_copy(os.path.join(ms_src, "pendingQCStore.js"), os.path.join(DEST_ROOT, "FrontEnd", "Mobile", "Delivery", "Models", "pendingQCStore.js"))
        safe_copy(os.path.join(ms_src, "uiStore.js"), os.path.join(DEST_ROOT, "FrontEnd", "shared", "store", "uiStore.js"))
        
    # Mobile services -> shared / specific
    msv_src = os.path.join(mobile_src, "src", "services")
    if os.path.exists(msv_src):
        safe_copy(os.path.join(msv_src, "api.js"), os.path.join(DEST_ROOT, "FrontEnd", "shared", "services", "api.js"))
        safe_copy(os.path.join(msv_src, "pushNotificationService.js"), os.path.join(DEST_ROOT, "FrontEnd", "shared", "services", "pushNotificationService.js"))
        safe_copy(os.path.join(msv_src, "returnService.js"), os.path.join(DEST_ROOT, "FrontEnd", "shared", "services", "returnService.js"))
        
    # Config.js
    if os.path.exists(os.path.join(mobile_src, "src", "Config.js")):
        safe_copy(os.path.join(mobile_src, "src", "Config.js"), os.path.join(DEST_ROOT, "FrontEnd", "shared", "constants", "appConfig.js"))

    # Mobile Assets
    mob_asset = os.path.join(mobile_src, "src", "assets")
    if os.path.exists(mob_asset):
        for root, dirs, files in os.walk(mob_asset):
            for file in files:
                safe_copy(os.path.join(root, file), os.path.join(DEST_ROOT, "FrontEnd", "Mobile", "assets", file))

    # 2. WEB FRONTEND FILES
    web_src = os.path.join(SRC_ROOT, "FrontEnd")
    web_dest = os.path.join(DEST_ROOT, "FrontEnd")
    
    # Web root files
    web_root_files = ["package.json", "package-lock.json", "vite.config.js", "eslint.config.js", "index.html"]
    for rf in web_root_files:
        src_f = os.path.join(web_src, rf)
        dest_f = os.path.join(web_dest, rf)
        if os.path.exists(src_f):
            safe_copy(src_f, dest_f)
            
    # Web App / boots
    safe_copy(os.path.join(web_src, "src", "App.jsx"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "app", "App.jsx"))
    safe_copy(os.path.join(web_src, "src", "main.jsx"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "app", "bootstrap.jsx"))
    safe_copy(os.path.join(web_src, "src", "App.css"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "styles", "web.css"))
    safe_copy(os.path.join(web_src, "src", "index.css"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "styles", "index.css"))
    
    # Web Pages (Admin & Manufacture)
    web_pages_root = os.path.join(web_src, "src", "pages")
    if os.path.exists(os.path.join(web_pages_root, "Login.jsx")):
        safe_copy(os.path.join(web_pages_root, "Login.jsx"), os.path.join(DEST_ROOT, "FrontEnd/Web/Auth/Views/LoginView.jsx"))

    pages_admin_src = os.path.join(web_src, "src", "pages", "Admin")
    if os.path.exists(pages_admin_src):
        for f in os.listdir(pages_admin_src):
            if f.endswith(".jsx") and f in web_page_map:
                safe_copy(os.path.join(pages_admin_src, f), os.path.join(DEST_ROOT, web_page_map[f]))
        # copy screenDocs
        sd_src = os.path.join(pages_admin_src, "screenDocs")
        if os.path.exists(sd_src):
            shutil.copytree(sd_src, os.path.join(DEST_ROOT, "FrontEnd", "Web", "System", "Views", "components", "screenDocs"), dirs_exist_ok=True)
                
    pages_mfg_src = os.path.join(web_src, "src", "pages", "Manufacture")
    if os.path.exists(pages_mfg_src):
        for f in os.listdir(pages_mfg_src):
            if f.endswith(".jsx") and f in web_page_map:
                safe_copy(os.path.join(pages_mfg_src, f), os.path.join(DEST_ROOT, web_page_map[f]))
                
    # Web components
    wcomp_src = os.path.join(web_src, "src", "components")
    if os.path.exists(wcomp_src):
        for f in os.listdir(wcomp_src):
            if f.endswith(".jsx") and f in web_component_map:
                safe_copy(os.path.join(wcomp_src, f), os.path.join(DEST_ROOT, web_component_map[f]))
        # copy ScreenSimulation
        ss_src = os.path.join(wcomp_src, "ScreenSimulation")
        if os.path.exists(ss_src):
            shutil.copytree(ss_src, os.path.join(DEST_ROOT, "FrontEnd", "Web", "System", "Views", "components", "ScreenSimulation"), dirs_exist_ok=True)

    # Web services
    wserv_src = os.path.join(web_src, "src", "services")
    if os.path.exists(wserv_src):
        # api.service.js
        safe_copy(os.path.join(wserv_src, "api.service.js"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "Shared", "Services", "api.service.js"))
        # auth.service.js
        safe_copy(os.path.join(wserv_src, "auth.service.js"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "Auth", "Models", "auth.service.js"))
        # bom.service.js
        safe_copy(os.path.join(wserv_src, "bom.service.js"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "Product", "Models", "bom.service.js"))
        # delivery.service.js
        safe_copy(os.path.join(wserv_src, "delivery.service.js"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "Delivery", "Models", "delivery.service.js"))
        # order.service.js
        safe_copy(os.path.join(wserv_src, "order.service.js"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "Order", "Models", "order.service.js"))
        # pallet.service.js
        safe_copy(os.path.join(wserv_src, "pallet.service.js"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "Pallet", "Models", "pallet.service.js"))
        # plan.service.js
        safe_copy(os.path.join(wserv_src, "plan.service.js"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "Plan", "Models", "plan.service.js"))
        # product.service.js
        safe_copy(os.path.join(wserv_src, "product.service.js"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "Product", "Models", "product.service.js"))
        # screen.service.js
        safe_copy(os.path.join(wserv_src, "screen.service.js"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "System", "Models", "screen.service.js"))
        
    # Web Assets
    web_asset = os.path.join(web_src, "src", "assets")
    if os.path.exists(web_asset):
        for root, dirs, files in os.walk(web_asset):
            for file in files:
                safe_copy(os.path.join(root, file), os.path.join(DEST_ROOT, "FrontEnd", "Web", "assets", file))

    # Web Hooks, Contexts, and Common Layouts
    web_hooks_src = os.path.join(web_src, "src", "hooks")
    if os.path.exists(web_hooks_src):
        for file in os.listdir(web_hooks_src):
            if file.endswith(".js"):
                safe_copy(os.path.join(web_hooks_src, file), os.path.join(DEST_ROOT, "FrontEnd", "shared", "hooks", file))

    mob_hooks_src = os.path.join(mobile_src, "src", "Hooks")
    if os.path.exists(mob_hooks_src):
        for file in os.listdir(mob_hooks_src):
            if file.endswith(".js"):
                safe_copy(os.path.join(mob_hooks_src, file), os.path.join(DEST_ROOT, "FrontEnd", "shared", "hooks", file))

    web_context_src = os.path.join(web_src, "src", "context")
    if os.path.exists(web_context_src):
        for file in os.listdir(web_context_src):
            if file.endswith((".js", ".jsx")):
                safe_copy(os.path.join(web_context_src, file), os.path.join(DEST_ROOT, "FrontEnd", "shared", "context", file))

    # Common Web components & layout
    web_common_views = os.path.join(web_src, "src", "Common", "Views")
    if os.path.exists(web_common_views):
        if os.path.exists(os.path.join(web_common_views, "Layout.jsx")):
            safe_copy(os.path.join(web_common_views, "Layout.jsx"), os.path.join(DEST_ROOT, "FrontEnd", "Web", "Shared", "Views", "components", "layout", "WebLayout.jsx"))

    web_common_models = os.path.join(web_src, "src", "Common", "Models")
    if os.path.exists(web_common_models):
        if os.path.exists(os.path.join(web_common_models, "api.js")):
            safe_copy(os.path.join(web_common_models, "api.js"), os.path.join(DEST_ROOT, "FrontEnd", "shared", "services", "webApi.js"))

def create_centralized_reexports():
    print("Creating BackEnd centralized re-exports for backward compatibility...")
    
    # Models re-export
    models_content = """# -*- coding: utf-8 -*-
from config.database import Base
from modules.auth.models.accounts import Account
from modules.production.models.category import Category
from modules.delivery.models.deliveries import Delivery
from modules.delivery.models.delivery_details import DeliveryDetails
from modules.delivery.models.delivery_images import DeliveryImage
from modules.auth.models.departments import Department
from modules.production.models.bom_detail import BOMDetail
from modules.delivery.models.order import Order
from modules.delivery.models.order_item import OrderItem
from modules.auth.models.permissions import Permission
from modules.production.models.product import Product
from modules.production.models.product_plan import ProductPlan
from modules.auth.models.role import Role
from modules.production.models.stages import Stage
from modules.notification.models.notifications import Notification
from modules.master.models.master_category import MasterCategory
from modules.master.models.master_product import MasterProduct
from modules.master.models.master_bom_detail import MasterBOMDetail
from modules.delivery.models.delivery_qc import DeliveryQC
from modules.delivery.models.delivery_returns import DeliveryReturn
from modules.auth.models.associations import permission_stage, role_permission
from modules.system.models.backup_qr import BackupQRCode
from modules.delivery.models.pallet_card import PalletCard
from modules.kpi.models.kpi import KPI
from modules.kpi.models.award_discipline import AwardDiscipline
from modules.kpi.models.staff_evaluation import StaffEvaluation
from modules.capa.models.capa import CAPA
from modules.capa.models.capa_occurrence import CAPAOccurrence
from modules.capa.models.capa_evaluation import CAPAEvaluation
from modules.system.models.system_screen import SystemScreen
from modules.system.models.system_component import SystemComponent

__all__ = [
    "Base", "Account", "Category", "Delivery", "DeliveryDetails", "DeliveryImage",
    "Department", "BOMDetail", "Order", "OrderItem", "Permission", "Product",
    "ProductPlan", "Role", "Stage", "Notification", "MasterCategory", "MasterProduct",
    "MasterBOMDetail", "DeliveryQC", "DeliveryReturn", "permission_stage", "role_permission",
    "BackupQRCode", "PalletCard", "KPI", "AwardDiscipline", "StaffEvaluation", "CAPA",
    "CAPAOccurrence", "CAPAEvaluation", "SystemScreen", "SystemComponent"
]
"""
    with open(os.path.join(DEST_ROOT, "BackEnd", "app", "models.py"), "w", encoding="utf-8") as f:
        f.write(models_content)
        
    # Schemas re-export
    schemas_content = """# -*- coding: utf-8 -*-
from modules.auth.schemas.accounts import *
from modules.auth.schemas.role import *
from modules.auth.schemas.permissions import *
from modules.auth.schemas.departments import *
from modules.delivery.schemas.deliveries import *
from modules.delivery.schemas.delivery_details import *
from modules.delivery.schemas.delivery_images import *
from modules.delivery.schemas.delivery_returns import *
from modules.delivery.schemas.pallet_card import *
from modules.delivery.schemas.order import *
from modules.inspection.schemas.daily_inspection import *
from modules.inspection.schemas.stage_inspection import *
from modules.inspection.schemas.input_inspection import *
from modules.inspection.schemas.defect_type import *
from modules.inspection.schemas.checklist import *
from modules.kpi.schemas.kpi import *
from modules.kpi.schemas.staff_evaluation import *
from modules.kpi.schemas.award_discipline import *
from modules.capa.schemas.capa import *
from modules.equipment.schemas.equipment import *
from modules.notification.schemas.notifications import *
from modules.production.schemas.product import *
from modules.production.schemas.product_plan import *
from modules.production.schemas.category import *
from modules.production.schemas.bom_detail import *
from modules.production.schemas.stages import *
from modules.master.schemas.master_product import *
from modules.master.schemas.master_category import *
from modules.master.schemas.master_bom_detail import *
from modules.system.schemas.system_component import *
from modules.system.schemas.system_screen import *
"""
    with open(os.path.join(DEST_ROOT, "BackEnd", "app", "schemas.py"), "w", encoding="utf-8") as f:
        f.write(schemas_content)
        
    # Backend central routes
    routes_content = """# -*- coding: utf-8 -*-
from fastapi import APIRouter
from modules.production.routes import product_router, category_router, product_plan_router, production_router, stage_router
from modules.master.routes import master_product_router
from modules.delivery.routes import order_router, delivery_router, return_router, pallet_router
from modules.auth.routes import account_router, role_router, permission_router
from modules.notification.routes import notification_router
from modules.inspection.routes import qc_router, inspection_router
from modules.equipment.routes import equipment_router
from modules.kpi.routes import kpi_router, award_discipline_router, staff_evaluation_router
from modules.capa.routes import capa_router
from modules.system.routes import system_router, screen_router

api_router = APIRouter()

api_router.include_router(product_router.router, prefix="/products", tags=["products"])
api_router.include_router(master_product_router.router, prefix="/master-products", tags=["master-products"])
api_router.include_router(category_router.router, prefix="/categories", tags=["categories"])
api_router.include_router(order_router.router, prefix="/orders", tags=["orders"])
api_router.include_router(account_router.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(role_router.router, prefix="/roles", tags=["roles"])
api_router.include_router(permission_router.router, prefix="/permissions", tags=["permissions"])
api_router.include_router(stage_router.router, prefix="/stages", tags=["stages"])
api_router.include_router(product_plan_router.router, prefix="/plans", tags=["plans"])
api_router.include_router(production_router.router, prefix="/production-plans", tags=["production_plans"])
api_router.include_router(delivery_router.router, prefix="/deliveries", tags=["deliveries"])
api_router.include_router(notification_router.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(qc_router.router, prefix="/qc", tags=["qc"])
api_router.include_router(return_router.router, prefix="/returns", tags=["returns"])
api_router.include_router(system_router.router, prefix="/system", tags=["system"])
api_router.include_router(inspection_router.router, prefix="/inspections", tags=["inspections"])
api_router.include_router(equipment_router.router, prefix="/equipments", tags=["equipments"])
api_router.include_router(pallet_router.router, prefix="/pallet-cards", tags=["pallet-cards"])
api_router.include_router(kpi_router.router, prefix="/kpis", tags=["kpis"])
api_router.include_router(award_discipline_router.router, prefix="/awards-discipline", tags=["awards-discipline"])
api_router.include_router(staff_evaluation_router.router, prefix="/staff-evaluations", tags=["staff-evaluations"])
api_router.include_router(screen_router.router, prefix="/screens", tags=["screens"])
api_router.include_router(capa_router.router, prefix="/capas", tags=["capas"])

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from modules.auth.models.departments import Department

@api_router.delete("/dept/{dept_id}")
def delete_department_mapping(dept_id: int, db: Session = Depends(get_db)):
    db_dept = db.query(Department).filter(Department.id == dept_id).first()
    if not db_dept:
        raise HTTPException(status_code=404, detail="Không tìm thấy liên kết phòng ban này")
    db.delete(db_dept)
    db.commit()
    return {"message": "Xóa liên kết phòng ban thành công"}
"""
    with open(os.path.join(DEST_ROOT, "BackEnd", "app", "routes.py"), "w", encoding="utf-8") as f:
        f.write(routes_content)

def refactor_backend_code():
    print("Refactoring Backend python import statements...")
    
    # Replacement mapping
    replaces = [
        (r"from src\.app\.core\.database import", "from config.database import"),
        (r"from src\.app\.core\.security import", "from config.security import"),
        (r"from src\.app\.core\.config import", "from config.settings import"),
        (r"from src\.app\.core\.banner import", "from shared.utils.banner import"),
        (r"from src\.app\.core\.timezone import", "from shared.utils.timezone import"),
        (r"from src\.app\.core\.firebase_utils import", "from shared.services.notification_service import"),
        (r"from src\.app\.core\.socket_manager import", "from shared.services.websocket_service import"),
        
        # models
        (r"from src\.app\.models\.base import", "from config.database import"),
        (r"from src\.app\.models import", "from app.models import"),
        (r"from src\.app import models", "from app import models"),
        (r"import src\.app\.models", "import app.models"),
        
        # specific models
        (r"from src\.app\.models\.accounts import", "from modules.auth.models.accounts import"),
        (r"from src\.app\.models\.role import", "from modules.auth.models.role import"),
        (r"from src\.app\.models\.permissions import", "from modules.auth.models.permissions import"),
        (r"from src\.app\.models\.departments import", "from modules.auth.models.departments import"),
        (r"from src\.app\.models\.associations import", "from modules.auth.models.associations import"),
        (r"from src\.app\.models\.deliveries import", "from modules.delivery.models.deliveries import"),
        (r"from src\.app\.models\.delivery_details import", "from modules.delivery.models.delivery_details import"),
        (r"from src\.app\.models\.delivery_images import", "from modules.delivery.models.delivery_images import"),
        (r"from src\.app\.models\.delivery_qc import", "from modules.delivery.models.delivery_qc import"),
        (r"from src\.app\.models\.delivery_returns import", "from modules.delivery.models.delivery_returns import"),
        (r"from src\.app\.models\.pallet_card import", "from modules.delivery.models.pallet_card import"),
        (r"from src\.app\.models\.order import", "from modules.delivery.models.order import"),
        (r"from src\.app\.models\.order_item import", "from modules.delivery.models.order_item import"),
        
        # schemas
        (r"from src\.app\.schemas import", "from app.schemas import"),
        (r"from src\.app\.schemas\.accounts import", "from modules.auth.schemas.accounts import"),
        (r"from src\.app\.schemas\.role import", "from modules.auth.schemas.role import"),
        (r"from src\.app\.schemas\.permissions import", "from modules.auth.schemas.permissions import"),
        (r"from src\.app\.schemas\.departments import", "from modules.auth.schemas.departments import"),
        (r"from src\.app\.schemas\.deliveries import", "from modules.delivery.schemas.deliveries import"),
        (r"from src\.app\.schemas\.delivery_details import", "from modules.delivery.schemas.delivery_details import"),
        (r"from src\.app\.schemas\.delivery_images import", "from modules.delivery.schemas.delivery_images import"),
        (r"from src\.app\.schemas\.delivery_returns import", "from modules.delivery.schemas.delivery_returns import"),
        (r"from src\.app\.schemas\.pallet_card import", "from modules.delivery.schemas.pallet_card import"),
        (r"from src\.app\.schemas\.order import", "from modules.delivery.schemas.order import"),
        
        # controllers
        (r"from src\.app\.controllers import", "from app.controllers import"),
        (r"from src\.app\.controllers\.account_controller import", "from modules.auth.controllers.account_controller import"),
        (r"from src\.app\.controllers\.role_controller import", "from modules.auth.controllers.role_controller import"),
        (r"from src\.app\.controllers\.permission_controller import", "from modules.auth.controllers.permission_controller import"),
        (r"from src\.app\.controllers\.department_controller import", "from modules.auth.controllers.department_controller import"),
        (r"from src\.app\.controllers\.delivery_controller import", "from modules.delivery.controllers.delivery_controller import"),
        (r"from src\.app\.controllers\.order_controller import", "from modules.delivery.controllers.order_controller import"),
        
        # routers / api
        (r"from src\.app\.api\.v1\.api import api_router", "from app.routes import api_router"),
        (r"from src\.app\.api\.v1\.endpoints import", "from app.routes import"),
    ]

    be_dir = os.path.join(DEST_ROOT, "BackEnd")
    for root, dirs, files in os.walk(be_dir):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    modified = content
                    for pattern, replacement in replaces:
                        modified = re.sub(pattern, replacement, modified)
                        
                    # Fix specific imports in main.py
                    if file == "main.py":
                        modified = re.sub(
                            r"from migrations\.create_system_screens_table import upgrade as upgrade_screens",
                            "from database.migrations.create_system_screens_table import upgrade as upgrade_screens",
                            modified
                        )
                        modified = re.sub(
                            r"from seed_system_components import seed_components",
                            "from database.seeders.seed_system_components import seed_components",
                            modified
                        )
                        modified = re.sub(
                            r"from src\.app\.modules\.authorization\.models import Account",
                            "from modules.auth.models.accounts import Account",
                            modified
                        )
                        modified = re.sub(
                            r"from src\.app\.modules\.authorization\.crud import hash_password",
                            "from modules.auth.services.auth_crud import hash_password", # wait, we will create a dummy hash_password or let it import from security
                            modified
                        )
                        # Fix security imports
                        modified = re.sub(
                            r"from config\.security import hash_password",
                            "from config.security import", # wait, if hash_password is in security, it's fine.
                            modified
                        )
                        # If main.py imports auth/crud, let's change it to config.security
                        modified = re.sub(
                            r"from modules\.auth\.services\.auth_crud import hash_password",
                            "from config.security import pwd_context\n\ndef hash_password(password: str):\n    return pwd_context.hash(password)\n",
                            modified
                        )
                        
                    if modified != content:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(modified)
                except Exception as e:
                    print(f"Error refactoring {file}: {e}")

def refactor_frontend_code():
    print("Refactoring Frontend import paths (Mobile & Web)...")
    
    fe_dir = os.path.join(DEST_ROOT, "FrontEnd")
    for root, dirs, files in os.walk(fe_dir):
        for file in files:
            if file.endswith((".js", ".jsx", ".css")):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    modified = content
                    
                    # 1. Update relative imports to use the proposed aliases @shared, @mobile, @web
                    # E.g. '../../../../shared/services/api' -> '@shared/services/api'
                    # E.g. '../../../../SmartFlow/FrontEnd/Mobile/Login/Views/LoginView' -> '@mobile/Auth/Views/LoginView'
                    modified = re.sub(
                        r"['\"].*?\/SmartFlow\/FrontEnd\/Mobile\/Login\/Views\/LoginView['\"]",
                        "'@mobile/Auth/Views/LoginView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/SmartFlow\/FrontEnd\/Mobile\/Delivery\/Views\/DeliveryInfoView['\"]",
                        "'@mobile/Delivery/Views/DeliveryInfoView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/SmartFlow\/FrontEnd\/Mobile\/Delivery\/Views\/DeliveryCreateView['\"]",
                        "'@mobile/Delivery/Views/DeliveryCreateView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/SmartFlow\/FrontEnd\/Mobile\/Delivery\/Views\/DeliveryReceiveView['\"]",
                        "'@mobile/Delivery/Views/DeliveryReceiveView'",
                        modified
                    )
                    
                    # Store, Services & Hooks
                    modified = re.sub(
                        r"['\"].*?\/store\/notificationStore['\"]",
                        "'@shared/store/notificationStore'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/store\/uiStore['\"]",
                        "'@shared/store/uiStore'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/store\/pendingQCStore['\"]",
                        "'@mobile/Delivery/Models/pendingQCStore'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/services\/api['\"]",
                        "'@shared/services/api'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/services\/pushNotificationService['\"]",
                        "'@shared/services/pushNotificationService'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/services\/returnService['\"]",
                        "'@shared/services/returnService'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/Config['\"]",
                        "'@shared/constants/appConfig'",
                        modified
                    )
                    
                    # Screens mapping in Mobile
                    modified = re.sub(
                        r"['\"].*?\/screens\/PlanTracking['\"]",
                        "'@mobile/Production/Views/PlanTrackingView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/DailyInspection['\"]",
                        "'@mobile/Inspection/Views/DailyInspectionView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/StageInspection['\"]",
                        "'@mobile/Inspection/Views/StageInspectionView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/InspectionLogs['\"]",
                        "'@mobile/Inspection/Views/InspectionLogsView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/InputInspection['\"]",
                        "'@mobile/Inspection/Views/InputInspectionView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/QualityInspectionDetail['\"]",
                        "'@mobile/Inspection/Views/QualityInspectionDetailView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/KPITracking['\"]",
                        "'@mobile/KPI/Views/KPITrackingView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/KPIStaffList['\"]",
                        "'@mobile/KPI/Views/KPIStaffListView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/StaffEvaluation['\"]",
                        "'@mobile/KPI/Views/StaffEvaluationView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/AwardDiscipline['\"]",
                        "'@mobile/KPI/Views/AwardDisciplineView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/CAPAList['\"]",
                        "'@mobile/CAPA/Views/CAPAListView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/CAPAReport['\"]",
                        "'@mobile/CAPA/Views/CAPAReportView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/CAPADetail['\"]",
                        "'@mobile/CAPA/Views/CAPADetailView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/EquipmentList['\"]",
                        "'@mobile/Equipment/Views/EquipmentListView'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/screens\/ThermalPrint['\"]",
                        "'@mobile/Delivery/Views/components/ThermalPrint'",
                        modified
                    )
                    
                    # Components in Mobile
                    modified = re.sub(
                        r"['\"].*?\/components\/ProtectedRoute['\"]",
                        "'@mobile/Shared/Views/components/layout/ProtectedRoute'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/components\/AppUpdateModal['\"]",
                        "'@mobile/Shared/Views/components/feedback/AppUpdateModal'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/components\/layout\/Layout['\"]",
                        "'@mobile/Shared/Views/components/layout/MobileLayout'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/components\/layout\/Sidebar['\"]",
                        "'@mobile/Shared/Views/components/layout/MobileSidebar'",
                        modified
                    )
                    modified = re.sub(
                        r"['\"].*?\/components\/layout\/Header['\"]",
                        "'@mobile/Shared/Views/components/layout/MobilePageHeader'",
                        modified
                    )

                    # Mobile Controllers & Models
                    modified = re.sub(r"['\"].*?\/Controllers\/authController['\"]", "'@mobile/Auth/Controllers/authController'", modified)
                    modified = re.sub(r"['\"].*?\/Controllers\/planController['\"]", "'@mobile/Production/Controllers/planController'", modified)
                    modified = re.sub(r"['\"].*?\/Controllers\/NotificationController['\"]", "'@mobile/Notification/Controllers/NotificationController'", modified)
                    modified = re.sub(r"['\"].*?\/models\/authModel['\"]", "'@mobile/Auth/Models/authModel'", modified)
                    modified = re.sub(r"['\"].*?\/Models\/ProductionModel['\"]", "'@mobile/Production/Models/productionModel'", modified)

                    # Mobile UI Components
                    modified = re.sub(r"['\"].*?\/components\/Button['\"]", "'@mobile/Shared/Views/components/ui/Button'", modified)
                    modified = re.sub(r"['\"].*?\/components\/Input['\"]", "'@mobile/Shared/Views/components/ui/Input'", modified)
                    modified = re.sub(r"['\"].*?\/components\/DataTable['\"]", "'@mobile/Shared/Views/components/ui/DataTable'", modified)
                    modified = re.sub(r"['\"].*?\/components\/ProgressBar['\"]", "'@mobile/Shared/Views/components/ui/ProgressBar'", modified)
                    modified = re.sub(r"['\"].*?\/components\/Tabs['\"]", "'@mobile/Shared/Views/components/ui/Tabs'", modified)
                    modified = re.sub(r"['\"].*?\/components\/CollapsibleCard['\"]", "'@mobile/Shared/Views/components/ui/CollapsibleCard'", modified)
                    modified = re.sub(r"['\"].*?\/components\/Stepper['\"]", "'@mobile/Shared/Views/components/ui/Stepper'", modified)

                    # Mobile Form Components
                    modified = re.sub(r"['\"].*?\/components\/FormInput['\"]", "'@mobile/Shared/Views/components/form/FormInput'", modified)
                    modified = re.sub(r"['\"].*?\/components\/FormSelect['\"]", "'@mobile/Shared/Views/components/form/FormSelect'", modified)
                    modified = re.sub(r"['\"].*?\/components\/FormSearchSelect['\"]", "'@mobile/Shared/Views/components/form/FormSearchSelect'", modified)
                    modified = re.sub(r"['\"].*?\/components\/FormMultiSearchSelect['\"]", "'@mobile/Shared/Views/components/form/FormMultiSearchSelect'", modified)
                    modified = re.sub(r"['\"].*?\/components\/CustomSelect['\"]", "'@mobile/Shared/Views/components/form/CustomSelect'", modified)
                    modified = re.sub(r"['\"].*?\/components\/SearchableSelect['\"]", "'@mobile/Shared/Views/components/form/SearchableSelect'", modified)

                    # Mobile Media, User & Specific Components
                    modified = re.sub(r"['\"].*?\/components\/QRScanner['\"]", "'@mobile/Shared/Views/components/media/QRScanner'", modified)
                    modified = re.sub(r"['\"].*?\/components\/QRDisplayModal['\"]", "'@mobile/Shared/Views/components/media/QRDisplayModal'", modified)
                    modified = re.sub(r"['\"].*?\/components\/NgrokImage['\"]", "'@mobile/Shared/Views/components/media/NgrokImage'", modified)
                    modified = re.sub(r"['\"].*?\/components\/UserProfileCard['\"]", "'@mobile/Shared/Views/components/user/UserProfileCard'", modified)
                    modified = re.sub(r"['\"].*?\/components\/PalletCardModal['\"]", "'@mobile/Delivery/Views/components/PalletCardModal'", modified)
                    modified = re.sub(r"['\"].*?\/components\/PlanDetailsModal['\"]", "'@mobile/Delivery/Views/components/PlanDetailsModal'", modified)
                    modified = re.sub(r"['\"].*?\/components\/QuickCreateModal['\"]", "'@mobile/Delivery/Views/components/QuickCreateModal'", modified)
                    modified = re.sub(r"['\"].*?\/components\/NotificationBanner['\"]", "'@mobile/Notification/Views/components/NotificationBanner'", modified)
                    modified = re.sub(r"['\"].*?\/components\/NotificationListener['\"]", "'@mobile/Notification/Views/components/NotificationListener'", modified)
                    modified = re.sub(r"['\"].*?\/components\/NotificationSidebar['\"]", "'@mobile/Notification/Views/components/NotificationSidebar'", modified)

                    # Mobile Assets
                    modified = re.sub(r"['\"].*?\/assets\/[iI][mM][gG]\/(.*?)['\"]", r"'@mobile/assets/\1'", modified)

                    # Web Hooks, Contexts, and Common Layouts
                    modified = re.sub(r"['\"].*?\/hooks\/useAuth['\"]", "'@shared/hooks/useAuth'", modified)
                    modified = re.sub(r"['\"].*?\/hooks\/useProducts['\"]", "'@shared/hooks/useProducts'", modified)
                    modified = re.sub(r"['\"].*?\/Hooks\/useLongPress['\"]", "'@shared/hooks/useLongPress'", modified)
                    modified = re.sub(r"['\"].*?\/Hooks\/useWebSocket['\"]", "'@shared/hooks/useWebSocket'", modified)
                    modified = re.sub(r"['\"].*?\/context\/ScreenContext['\"]", "'@shared/context/ScreenContext'", modified)
                    modified = re.sub(r"['\"].*?\/Common\/Views\/Layout['\"]", "'@web/Shared/Views/components/layout/WebLayout'", modified)
                    modified = re.sub(r"['\"].*?\/Common\/Models\/api['\"]", "'@shared/services/webApi'", modified)

                    # Web specific services
                    modified = re.sub(r"['\"].*?\/services\/api\.service['\"]", "'@web/Shared/Services/api.service'", modified)
                    modified = re.sub(r"['\"].*?\/services\/auth\.service['\"]", "'@web/Auth/Models/auth.service'", modified)
                    modified = re.sub(r"['\"].*?\/services\/bom\.service['\"]", "'@web/Product/Models/bom.service'", modified)
                    modified = re.sub(r"['\"].*?\/services\/delivery\.service['\"]", "'@web/Delivery/Models/delivery.service'", modified)
                    modified = re.sub(r"['\"].*?\/services\/order\.service['\"]", "'@web/Order/Models/order.service'", modified)
                    modified = re.sub(r"['\"].*?\/services\/pallet\.service['\"]", "'@web/Pallet/Models/pallet.service'", modified)
                    modified = re.sub(r"['\"].*?\/services\/plan\.service['\"]", "'@web/Plan/Models/plan.service'", modified)
                    modified = re.sub(r"['\"].*?\/services\/product\.service['\"]", "'@web/Product/Models/product.service'", modified)
                    modified = re.sub(r"['\"].*?\/services\/screen\.service['\"]", "'@web/System/Models/screen.service'", modified)

                    if modified != content:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(modified)
                except Exception as e:
                    print(f"Error refactoring frontend file {file}: {e}")

def main():
    print("Starting SmartFlow v2 Code Migrator...")
    try:
        clean_dest_folder()
        create_directories()
        copy_root_and_docs()
        copy_backend_files()
        copy_frontend_files()
        create_centralized_reexports()
        refactor_backend_code()
        refactor_frontend_code()
        print("\nSUCCESS: SmartFlow v2 migration and code splitting completed successfully!")
    except Exception as e:
        print(f"\nFATAL ERROR during migration: {e}")

if __name__ == "__main__":
    main()
