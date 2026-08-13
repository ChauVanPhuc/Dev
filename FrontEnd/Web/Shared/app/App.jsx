import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import LoginPage from '@modules/Auth/Views/Login/LoginView';
import PortalLayout from '@webShared/Views/components/layout/PortalLayout';
import { ToastProvider } from '@webShared/Views/components/feedback/ToastContext';

// Import các trang Admin (Tải động)
const Dashboard = lazy(() => import('@modules/Dashboard/Views/System/DashboardView'));
const UserManagement = lazy(() => import('@modules/Auth/Views/User/UserManagementView'));
const UserCreate = lazy(() => import('@modules/Auth/Views/User/UserCreateView'));
const UserEdit = lazy(() => import('@modules/Auth/Views/User/UserEditView'));
const UserPermissionView = lazy(() => import('@modules/Auth/Views/User/UserPermissionView'));
const DepartmentManagement = lazy(() => import('@modules/Auth/Views/Department/DepartmentManagementView'));
const PositionManagement = lazy(() => import('@modules/Auth/Views/User/PositionManagementView'));
const EmployeeListView = lazy(() => import('@modules/Auth/Views/Employee/EmployeeListView'));
const OrgChartView = lazy(() => import('@modules/Auth/Views/HR/OrgChartView'));
const HierarchyChartView = lazy(() => import('@modules/Auth/Views/HR/HierarchyChartView'));
const PersonnelChartView = lazy(() => import('@modules/Auth/Views/HR/PersonnelChartView'));
const FactoryStructureView = lazy(() => import('@modules/Auth/Views/HR/FactoryStructureView'));
const HRManagementView = lazy(() => import('@modules/Auth/Views/HR/HRManagementView'));
const EmployeeManagementView = lazy(() => import('@modules/Auth/Views/Employee/EmployeeManagementView'));
const OrgStructureManagementView = lazy(() => import('@modules/Auth/Views/HR/OrgStructureManagementView'));
const HandoverList = lazy(() => import('@modules/Delivery/Views/Handover/HandoverListView'));
const IncidentLogs = lazy(() => import('@modules/System/Views/Monitor/IncidentLogsView'));
const InspectionReports = lazy(() => import('@modules/Inspection/Views/Report/InspectionReportsView'));
const QualityOverview = lazy(() => import('@modules/Inspection/Views/Report/QualityOverviewView'));
const InspectionDetail = lazy(() => import('@modules/Inspection/Views/Report/InspectionDetailView'));
const KPIReports = lazy(() => import('@modules/KPI/Views/Report/KPIReportsView'));
const KPIChecklist = lazy(() => import('@modules/KPI/Views/Checklist/KPIChecklistView'));
const KPIItems = lazy(() => import('@modules/KPI/Views/Item/KPIItemsView'));
const KPIRules = lazy(() => import('@modules/KPI/Views/Rule/KPIRulesView'));
const KPIFeedback = lazy(() => import('@modules/KPI/Views/Feedback/KPIFeedbackView'));
const ViolationHistory = lazy(() => import('@modules/KPI/Views/Violation/ViolationHistoryView'));
const ViolationForm = lazy(() => import('@modules/KPI/Views/Violation/ViolationFormView'));
const CapaHistory = lazy(() => import('@modules/CAPA/Views/Improvement/CapaHistoryView'));
const CapaForm = lazy(() => import('@modules/CAPA/Views/Improvement/CapaFormView'));
const Improvements = lazy(() => import('@modules/CAPA/Views/Improvement/ImprovementsView'));
const Hotspots = lazy(() => import('@modules/System/Views/Monitor/HotspotsView'));
const DataPackaging = lazy(() => import('@modules/System/Views/Data/DataPackagingView'));
const BackupQRManagement = lazy(() => import('@modules/System/Views/Backup/BackupQRManagementView'));
const ScreenManagement = lazy(() => import('@modules/System/Views/Screen/ScreenManagementView'));
const ScreenDetail = lazy(() => import('@modules/System/Views/Screen/ScreenDetailView'));
const SidebarManagement = lazy(() => import('@modules/System/Views/Screen/SidebarManagementView'));
const SystemConfig = lazy(() => import('@modules/System/Views/SystemConfig/SystemConfigView'));
const ScreenBugManagement = lazy(() => import('@modules/System/Views/Screen/ScreenBugManagementView'));
const ProjectProgress = lazy(() => import('@modules/System/Views/Project/ProjectProgressView'));
const DefectManagement = lazy(() => import('@modules/Inspection/Views/Defect/DefectManagementView'));
// 1. HDKT (Hướng dẫn kiểm tra)
const HDKTManagement = lazy(() => import('@modules/InspectionGuide/Views/InspectionGuideManagementView'));
const HDKTForm = lazy(() => import('@modules/InspectionGuide/Views/InspectionGuideFormView'));
const HDKTDetail = lazy(() => import('@modules/InspectionGuide/Views/InspectionGuideDetailView'));

// 2. SOS (Hướng dẫn thao tác)
const SOSManagement = lazy(() => import('@modules/SOSGuide/Views/SOSGuideManagementView'));
const SOSForm = lazy(() => import('@modules/SOSGuide/Views/SOSGuideFormView'));
const SOSDetail = lazy(() => import('@modules/SOSGuide/Views/SOSGuideDetailView'));

// 3. CTQ (Lỗi cần chú ý)
const CTQManagement = lazy(() => import('@modules/CTQGuide/Views/CTQGuideManagementView'));
const CTQForm = lazy(() => import('@modules/CTQGuide/Views/CTQGuideFormView'));
const CTQDetail = lazy(() => import('@modules/CTQGuide/Views/CTQGuideDetailView'));

const QualityRecords = lazy(() => import('@modules/QualityRecords/Views/Record/QualityRecordsListView'));
const QualityRecordsDetail = lazy(() => import('@modules/QualityRecords/Views/Record/QualityRecordsDetailView'));
const SystemMonitor = lazy(() => import('@modules/System/Views/Monitor/SystemMonitorView'));
const EquipmentManagement = lazy(() => import('@modules/Equipment/Views/Equipment/EquipmentManagementView'));
const EquipmentCategories = lazy(() => import('@modules/Equipment/Views/Equipment/EquipmentCategoriesView'));
const EquipmentHistory = lazy(() => import('@modules/Equipment/Views/Equipment/EquipmentHistoryView'));
const EquipmentTraining = lazy(() => import('@modules/Equipment/Views/Equipment/EquipmentTrainingView'));
const EquipmentHandover = lazy(() => import('@modules/Equipment/Views/Equipment/EquipmentHandoverView'));
const EquipmentDetail = lazy(() => import('@modules/Equipment/Views/Equipment/EquipmentDetailView'));
const EquipmentTrainingDetail = lazy(() => import('@modules/Equipment/Views/Equipment/EquipmentTrainingDetailView'));
const MachineManagement = lazy(() => import('@modules/Equipment/Views/Machine/MachineManagementView'));
const MachineHistory = lazy(() => import('@modules/Equipment/Views/Machine/MachineHistoryView'));
const MachineTraining = lazy(() => import('@modules/Equipment/Views/Machine/MachineTrainingView'));
const MachineDetail = lazy(() => import('@modules/Equipment/Views/Machine/MachineDetailView'));

// Import Claim module (Tải động)
const ClaimPortalLayout = lazy(() => import('../../modules/Claim/views/Portal/PortalLayout'));
const ClaimList = lazy(() => import('../../modules/Claim/views/Claim/ClaimListView'));
const PriceList = lazy(() => import('../../modules/Claim/views/Price/PriceListView'));
const ShipmentList = lazy(() => import('../../modules/Claim/views/Shipment/ShipmentListView'));

// Import Manufacture module (Tải động)
const ManufactureDashboard = lazy(() => import('@modules/Dashboard/Views/Manufacture/ManufactureDashboardView'));
const ManufacturePlan = lazy(() => import('@modules/Plan/Views/Plan/PlanListView'));
const PlanDetail = lazy(() => import('@modules/Plan/Views/Plan/PlanDetailView'));
const ManufactureHandover = lazy(() => import('@modules/Delivery/Views/Handover/DeliveryHandoverView'));
const ManufactureReceive = lazy(() => import('@modules/Delivery/Views/Receive/DeliveryReceiveView'));
const ManufactureProducts = lazy(() => import('@modules/Product/Views/List/ProductsListView'));
const ProductDetail = lazy(() => import('@modules/Product/Views/Detail/ProductDetailView'));
const ProductCreate = lazy(() => import('@modules/Product/Views/Create/ProductCreateView'));
const ProductDetailsManagement = lazy(() => import('@modules/Product/Views/Details/ProductDetailsManagementView'));
const PaintColorManagement = lazy(() => import('@modules/Product/Views/PaintColors/PaintColorManagementView'));
const TechnicalDashboard = lazy(() => import('@modules/Product/Views/Dashboard/TechnicalDashboardView'));
const TechnicalStandards = lazy(() => import('@modules/Product/Views/Standards/TechnicalStandardsView'));
const MaintenanceFacility = lazy(() => import('@modules/Equipment/Views/Maintenance/MaintenanceView'));
const ProductionDashboard = lazy(() => import('@modules/Production/Views/Dashboard/ProductionDashboardView'));
const ProductionOrders = lazy(() => import('@modules/Production/Views/Orders/ProductionOrdersView'));
const ProductionOrderCreate = lazy(() => import('@modules/Production/Views/Orders/ProductionOrderCreateView'));
const ProductionSchedule = lazy(() => import('@modules/Production/Views/Schedule/ProductionScheduleView'));
const ProductionPlans = lazy(() => import('@modules/Production/Views/Plans/ProductionPlansView'));
const ProductionRouting = lazy(() => import('@modules/Production/Views/Routing/ProductionRoutingView'));
const ManufactureOrders = lazy(() => import('@modules/Order/Views/List/OrdersListView'));
const OrderCreate = lazy(() => import('@modules/Order/Views/Create/OrderCreateView'));
const OrderDetail = lazy(() => import('@modules/Order/Views/Detail/OrderDetailView'));
const CustomerList = lazy(() => import('@modules/Order/Views/Customer/CustomerListView'));
const AddProductionPlan = lazy(() => import('@modules/Plan/Views/Plan/AddProductionPlanView'));
const ProductionProgress = lazy(() => import('@modules/Plan/Views/Progress/ProductionProgressView'));
const DeliveryTracking = lazy(() => import('@modules/Delivery/Views/Tracking/DeliveryTrackingView'));
const ExceptionDeliveries = lazy(() => import('@modules/Pallet/Views/Card/PalletCardView'));

// Import Purchasing module (Tải động)
const PurchaseRequisitionList = lazy(() => import('@modules/Purchasing/Views/Requisition/PurchaseRequisitionListView'));
const PurchaseRequisitionDetail = lazy(() => import('@modules/Purchasing/Views/Requisition/PurchaseRequisitionDetailView'));
const PurchaseOrderItemList = lazy(() => import('@modules/Purchasing/Views/Order/PurchaseOrderItemListView'));
const OrderShippingMonitoring = lazy(() => import('@modules/Purchasing/Views/Monitoring/OrderShippingMonitoringView'));

// Import ISO module (Tải động)
const ISODocumentList = lazy(() => import('@modules/ISO/Views/Document/ISODocumentListView'));
const ISOFormEditor = lazy(() => import('@modules/ISO/Views/Form/ISOFormEditorView'));
const ISOProcessEditor = lazy(() => import('@modules/ISO/Views/Process/ISOProcessEditorView'));

import { authService } from '@modules/Auth/Models/auth.service';
import { ScreenProvider } from '@shared/context/ScreenContext';

const isUserLoggedIn = () => {
  const token = authService.getToken();
  return token && token !== 'null' && token !== 'undefined' && token !== '';
};

const AccessDenied = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80vh',
    fontFamily: 'Inter, sans-serif',
    color: '#7B5233',
    padding: '20px',
    textAlign: 'center'
  }}>
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px', opacity: 0.9 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
    <h2 style={{ fontWeight: 800, margin: '0 0 10px 0', color: '#2D1A12' }}>Từ chối truy cập</h2>
    <p style={{ color: '#9CA3AF', fontWeight: 500, fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto 20px auto' }}>
      Tài khoản của bạn không được cấp quyền truy cập vào màn hình này. Vui lòng liên hệ với Quản trị viên để được hỗ trợ.
    </p>
    <button
      onClick={() => window.history.back()}
      style={{
        padding: '10px 20px',
        backgroundColor: '#7B5233',
        color: '#FFF',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '0.9rem',
        boxShadow: '0 4px 10px rgba(123, 82, 51, 0.2)',
        transition: 'background 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5D3E26'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
    >
      Quay lại trang trước
    </button>
  </div>
);



const LEGACY_RANK_MAP = {
  'none': [],
  'read': ['read'],
  'create': ['read', 'create'],
  'edit': ['read', 'create', 'edit'],
  'delete': ['read', 'create', 'edit', 'delete'],
  'approve': ['read', 'create', 'edit', 'delete', 'approve'],
  'export_import': ['read', 'create', 'edit', 'delete', 'approve', 'export_import'],
  'write': ['read', 'create', 'edit', 'delete', 'approve', 'export_import'],
};

const PermissionEnforcer = ({ permission, children }) => {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const enforce = () => {
      // 1. Tách và phân giải các quyền được phép
      let allowedActionsList = [];
      if (Array.isArray(permission)) {
        allowedActionsList = permission;
      } else if (typeof permission === 'string') {
        if (permission.includes(',')) {
          allowedActionsList = permission.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          allowedActionsList = LEGACY_RANK_MAP[permission] || [];
        }
      }
      // Chuẩn hóa 'write' thành 'export_import'
      allowedActionsList = allowedActionsList.map(act => act === 'write' ? 'export_import' : act);
      const allowedActions = new Set(allowedActionsList);

      const isInCreationContext = (element) => {
        // 1. Check URL path
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/create') || path.includes('/add') || path.includes('/new') || path.endsWith('/create') || path.endsWith('/add')) {
          return true;
        }

        // 2. Traverse up and check parent container's header/title
        let parent = element.parentElement;
        while (parent) {
          const isContainer =
            parent.classList.contains('modal') ||
            parent.classList.contains('card') ||
            parent.tagName === 'FORM' ||
            parent.style.position === 'fixed';

          if (isContainer || parent.tagName === 'BODY') {
            const headings = parent.querySelectorAll('h1, h2, h3, h4, h5, h6, .modal-title, .card-title, .section-title, [class*="title"], [class*="header"]');
            for (let h of headings) {
              const hText = (h.textContent || '').toLowerCase();
              if (
                (hText.includes('tạo') && !hText.includes('trạng thái') && !hText.includes('chỉnh sửa')) ||
                hText.includes('thêm') ||
                hText.includes('new') ||
                hText.includes('create') ||
                hText.includes('add')
              ) {
                return true;
              }
            }
            if (isContainer) break;
          }
          parent = parent.parentElement;
        }
        return false;
      };

      // 1. Disable form inputs, selects, textareas nếu không có quyền hành động tương ứng
      const inputs = containerRef.current ? containerRef.current.querySelectorAll('input, select, textarea') : [];
      inputs.forEach(input => {
        if (input.closest('.admin-sidebar') || input.closest('header') || input.closest('.admin-header')) {
          return;
        }
        let isFilterOrSearch = false;
        let parent = input.parentElement;
        while (parent) {
          const className = (parent.className || '').toString().toLowerCase();
          const id = (parent.id || '').toString().toLowerCase();

          if (
            className.includes('filter') ||
            className.includes('search') ||
            className.includes('pagination') ||
            id.includes('filter') ||
            id.includes('search')
          ) {
            isFilterOrSearch = true;
            break;
          }
          parent = parent.parentElement;
        }

        const placeholder = (input.placeholder || '').toLowerCase();
        const name = (input.name || '').toLowerCase();
        const type = (input.type || '').toLowerCase();

        if (
          placeholder.includes('tìm') ||
          placeholder.includes('lọc') ||
          placeholder.includes('search') ||
          placeholder.includes('filter') ||
          name.includes('search') ||
          name.includes('filter') ||
          type === 'search'
        ) {
          isFilterOrSearch = true;
        }

        if (!isFilterOrSearch) {
          const isCreationMode = isInCreationContext(input);
          const hasRequiredPerm = isCreationMode ? allowedActions.has('create') : allowedActions.has('edit');
          if (!hasRequiredPerm) {
            input.disabled = true;
            input.style.pointerEvents = 'none';
          }
        }
      });

      // 2. Hide mutating buttons/actions
      const buttons = containerRef.current ? containerRef.current.querySelectorAll('button, a, [role="button"], .btn, .button') : [];
      buttons.forEach(btn => {
        if (btn.closest('.admin-sidebar') || btn.closest('.sidebar-nav') || btn.closest('header') || btn.closest('.admin-header')) {
          return;
        }
        const text = (btn.textContent || '').trim().toLowerCase();
        const className = (btn.className || '').toString().toLowerCase();
        const title = (btn.getAttribute('title') || '').toLowerCase();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();

        // Skip navigation and read-only actions
        const isBypass =
          text.includes('hủy') ||
          text.includes('đóng') ||
          text.includes('quay lại') ||
          text.includes('trở lại') ||
          text === 'khác' ||
          text.includes('export') ||
          text.includes('xuất') ||
          text.includes('download') ||
          text.includes('tải về') ||
          text.includes('close') ||
          text.includes('cancel') ||
          text.includes('xem') ||
          text.includes('chi tiết') ||
          title.includes('xem') ||
          title.includes('chi tiết') ||
          ariaLabel.includes('xem') ||
          ariaLabel.includes('chi tiết') ||
          className.includes('pagination') ||
          className.includes('page-link') ||
          className.includes('tab-btn') ||
          className.includes('page-btn') ||
          btn.closest('.pagination') ||
          btn.closest('.main-tabs') ||
          btn.closest('.defect-mgmt-tabs') ||
          btn.closest('.tab-buttons');

        if (isBypass) {
          return;
        }

        // Match mutating action words
        const isAdd =
          text.includes('thêm') ||
          text.includes('tạo') ||
          text.includes('add') ||
          text.includes('create') ||
          title.includes('thêm') ||
          title.includes('tạo') ||
          ariaLabel.includes('thêm') ||
          ariaLabel.includes('tạo') ||
          className.includes('btn-add') ||
          className.includes('btn-create') ||
          className.includes('add-btn');

        const isEdit =
          text.includes('sửa') ||
          text.includes('lưu') ||
          text.includes('cập nhật') ||
          text.includes('chỉnh sửa') ||
          text.includes('xử lý') ||
          text.includes('edit') ||
          text.includes('save') ||
          text.includes('update') ||
          title.includes('sửa') ||
          title.includes('lưu') ||
          title.includes('chỉnh sửa') ||
          title.includes('edit') ||
          ariaLabel.includes('sửa') ||
          ariaLabel.includes('lưu') ||
          ariaLabel.includes('chỉnh sửa') ||
          ariaLabel.includes('edit') ||
          className.includes('btn-edit') ||
          className.includes('btn-save') ||
          className.includes('btn-update') ||
          className.includes('edit-btn') ||
          className.includes('save-btn');

        const isDelete =
          text.includes('xóa') ||
          text.includes('delete') ||
          title.includes('xóa') ||
          title.includes('delete') ||
          ariaLabel.includes('xóa') ||
          ariaLabel.includes('delete') ||
          className.includes('btn-delete') ||
          className.includes('delete-btn');

        const isApprove =
          text.includes('duyệt') ||
          text.includes('phê duyệt') ||
          text.includes('approve') ||
          title.includes('duyệt') ||
          title.includes('phê duyệt') ||
          title.includes('approve') ||
          ariaLabel.includes('duyệt') ||
          ariaLabel.includes('phê duyệt') ||
          ariaLabel.includes('approve');

        const isExportImport =
          text.includes('nhập') ||
          text.includes('import') ||
          text.includes('upload') ||
          text.includes('tải lên') ||
          className.includes('btn-import');

        const isCreationMode = isInCreationContext(btn);
        const hasMutatePerm = isCreationMode ? allowedActions.has('create') : allowedActions.has('edit');

        let shouldHide = false;
        if (!hasMutatePerm) {
          shouldHide = true;
        } else {
          if (isAdd && !allowedActions.has('create')) {
            shouldHide = true;
          } else if (isEdit) {
            const reqPerm = isCreationMode ? 'create' : 'edit';
            if (!allowedActions.has(reqPerm)) {
              shouldHide = true;
            }
          } else if (isDelete && !allowedActions.has('delete')) {
            shouldHide = true;
          } else if (isApprove && !allowedActions.has('approve')) {
            shouldHide = true;
          } else if (isExportImport && !allowedActions.has('export_import')) {
            shouldHide = true;
          }
        }

        if (shouldHide) {
          btn.style.setProperty('display', 'none', 'important');
        }
      });

      // 3. Hide edit/delete action columns in tables if read-only
      const isTableReadOnly = !allowedActions.has('edit') && !allowedActions.has('delete');
      if (isTableReadOnly) {
        const headers = containerRef.current ? containerRef.current.querySelectorAll('th') : [];
        headers.forEach((th, index) => {
          const text = (th.textContent || '').trim().toLowerCase();
          if (
            text.includes('thao tác') ||
            text.includes('hành động') ||
            text.includes('actions') ||
            text.includes('chức năng')
          ) {
            th.style.setProperty('display', 'none', 'important');

            const table = th.closest('table');
            if (table) {
              const rows = table.querySelectorAll('tbody tr');
              rows.forEach(row => {
                const cell = row.cells[index];
                if (cell) {
                  cell.style.setProperty('display', 'none', 'important');
                }
              });
            }
          }
        });
      }
    };

    // Run immediately
    enforce();

    if (!containerRef.current) return;

    // Observe changes inside page container
    const observer = new MutationObserver((mutations) => {
      enforce();
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
    };
  }, [permission]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }}>{children}</div>;
};

const ProtectedRoute = ({ permissionKey, children }) => {
  if (!isUserLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(localStorage.getItem('smartflow_user') || '{}');

  // Chặn hoàn toàn tài khoản công nhân truy cập bất kỳ route Web nào
  if (user.permission_name === 'NV SX' || user.permission_name === 'NV QC') {
    return <AccessDenied />;
  }

  const isAdmin = user.role_name === 'IT' || user.role_name === 'BGD' || user.username === 'admin';

  let permission = 'write';
  let hasExplicitPermission = false;
  try {
    const activePermsStr = localStorage.getItem('smartflow_active_permissions');
    if (activePermsStr) {
      const perms = JSON.parse(activePermsStr);
      if (perms) {
        const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
        // Tìm quyền hạn đầu tiên khác 'none' trong danh sách các khóa quyền được yêu cầu
        for (const key of keys) {
          if (perms[key] !== undefined && perms[key] !== 'none') {
            permission = perms[key];
            hasExplicitPermission = true;
            break;
          }
        }
        // Nếu không có quyền nào khác 'none' nhưng có một khóa quyền được định nghĩa rõ ràng
        if (!hasExplicitPermission) {
          for (const key of keys) {
            if (perms[key] !== undefined) {
              permission = perms[key];
              hasExplicitPermission = true;
              break;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse screen permissions:', e);
  }

  if (isAdmin && !hasExplicitPermission) {
    permission = 'write';
  }

  // Phân giải xem có hành động nào được phép không
  let allowedActions = [];
  if (Array.isArray(permission)) {
    allowedActions = permission;
  } else if (typeof permission === 'string') {
    if (permission.includes(',')) {
      allowedActions = permission.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      allowedActions = LEGACY_RANK_MAP[permission] || [];
    }
  }

  // Kiểm tra nếu bị chặn rõ ràng bởi 'none'
  const isExplicitlyNone = 
    permission === 'none' || 
    (Array.isArray(permission) && (permission.includes('none') || permission.length === 0)) ||
    (typeof permission === 'string' && permission.split(',').map(s => s.trim()).includes('none'));

  if (isExplicitlyNone) {
    return <AccessDenied />;
  }

  if (allowedActions.length === 0 && !isAdmin) {
    return <AccessDenied />;
  }

  return (
    <PermissionEnforcer permission={permission}>
      {children}
    </PermissionEnforcer>
  );
};

// Route wrappers to evaluate authentication status dynamically at render time
const LoginRoute = () => {
  return isUserLoggedIn() ? <Navigate to="/admin/dashboard" replace /> : <LoginPage />;
};

const RootRoute = () => {
  return isUserLoggedIn() ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/login" replace />;
};

// Redirect handover requests to equipment view with state payload
const EquipmentHandoverRedirect = () => {
  const { id } = useParams();
  return <Navigate to="/admin/equipment" state={{ openHandover: true, handoverId: id }} replace />;
};

/**
 * Controller chính điều phối Routing của ứng dụng
 */
function App() {
  console.log("SmartFlow App Loading...");

  return (
    <ToastProvider>
      <ScreenProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100vh',
              fontFamily: 'Inter, sans-serif',
              color: '#7B5233',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              backgroundColor: '#FAF8F6'
            }}>
              Đang tải trang...
            </div>
          }>
            <Routes>
              {/* Route Đăng nhập */}
              <Route path="/login" element={<LoginRoute />} />

              {/* Route Admin (Sử dụng Layout chung) */}
              <Route path="/admin" element={<PortalLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<UserEdit isProfile={true} />} />
                <Route path="users" element={<ProtectedRoute permissionKey="users"><UserManagement /></ProtectedRoute>} />
                <Route path="users/create" element={<ProtectedRoute permissionKey="users"><UserCreate /></ProtectedRoute>} />
                <Route path="users/edit/:id" element={<ProtectedRoute permissionKey="users"><UserEdit /></ProtectedRoute>} />
                <Route path="users/permissions/:id" element={<ProtectedRoute permissionKey="users"><UserPermissionView /></ProtectedRoute>} />
                <Route path="users/departments" element={<ProtectedRoute permissionKey="users"><DepartmentManagement /></ProtectedRoute>} />
                <Route path="users/positions" element={<ProtectedRoute permissionKey="users"><PositionManagement /></ProtectedRoute>} />
                <Route path="hr" element={<Navigate to="hr/org-chart" />} />
                <Route path="hr/org-chart" element={<ProtectedRoute permissionKey="users"><HRManagementView defaultDiagram="org-chart" /></ProtectedRoute>} />
                <Route path="hr/hierarchy" element={<ProtectedRoute permissionKey="users"><HRManagementView defaultDiagram="hierarchy" /></ProtectedRoute>} />
                <Route path="hr/personnel" element={<ProtectedRoute permissionKey="users"><HRManagementView defaultDiagram="personnel" /></ProtectedRoute>} />
                <Route path="hr/factory" element={<ProtectedRoute permissionKey="users"><HRManagementView defaultDiagram="factory" /></ProtectedRoute>} />
                <Route path="hr/structures" element={<ProtectedRoute permissionKey="users"><OrgStructureManagementView /></ProtectedRoute>} />
                <Route path="hr/employees" element={<ProtectedRoute permissionKey="users"><EmployeeListView /></ProtectedRoute>} />
                <Route path="employees" element={<ProtectedRoute permissionKey="users"><EmployeeManagementView /></ProtectedRoute>} />
                <Route path="delivery-handover" element={<ProtectedRoute permissionKey="handovers"><ManufactureHandover /></ProtectedRoute>} />
                <Route path="delivery-receive" element={<ProtectedRoute permissionKey="handovers"><ManufactureReceive /></ProtectedRoute>} />
                <Route path="manufacture-handover" element={<ProtectedRoute permissionKey="handovers"><ManufactureHandover /></ProtectedRoute>} />
                <Route path="manufacture-receive" element={<ProtectedRoute permissionKey="handovers"><ManufactureReceive /></ProtectedRoute>} />
                <Route path="handovers" element={<ProtectedRoute permissionKey="handovers"><HandoverList /></ProtectedRoute>} />
                <Route path="logs" element={<ProtectedRoute permissionKey="logs"><IncidentLogs /></ProtectedRoute>} />
                {/* 3 Mục Tài liệu ban hành hoàn toàn riêng biệt */}
                {/* 1. Hướng dẫn kiểm tra (HDKT) */}
                <Route path="inspection-guides" element={<ProtectedRoute permissionKey="inspection-guides"><HDKTManagement /></ProtectedRoute>} />
                <Route path="inspection-guides/create" element={<ProtectedRoute permissionKey="inspection-guides"><HDKTForm /></ProtectedRoute>} />
                <Route path="inspection-guides/edit/:id" element={<ProtectedRoute permissionKey="inspection-guides"><HDKTDetail /></ProtectedRoute>} />

                {/* 2. Hướng dẫn thao tác (SOS) */}
                <Route path="sos-guides" element={<ProtectedRoute permissionKey="inspection-guides"><SOSManagement /></ProtectedRoute>} />
                <Route path="sos-guides/create" element={<ProtectedRoute permissionKey="inspection-guides"><SOSForm /></ProtectedRoute>} />
                <Route path="sos-guides/edit/:id" element={<ProtectedRoute permissionKey="inspection-guides"><SOSDetail /></ProtectedRoute>} />

                {/* 3. Lỗi cần chú ý (CTQ) */}
                <Route path="ctq-guides" element={<ProtectedRoute permissionKey="inspection-guides"><CTQManagement /></ProtectedRoute>} />
                <Route path="ctq-guides/create" element={<ProtectedRoute permissionKey="inspection-guides"><CTQForm /></ProtectedRoute>} />
                <Route path="ctq-guides/edit/:id" element={<ProtectedRoute permissionKey="inspection-guides"><CTQDetail /></ProtectedRoute>} />

                <Route path="defects" element={<ProtectedRoute permissionKey="defects"><DefectManagement /></ProtectedRoute>} />
                <Route path="reports" element={<ProtectedRoute permissionKey="reports"><InspectionReports /></ProtectedRoute>} />
                <Route path="reports/detail/:type/:id" element={<ProtectedRoute permissionKey="reports"><InspectionDetail /></ProtectedRoute>} />
                <Route path="quality" element={<ProtectedRoute permissionKey="quality-records"><QualityOverview /></ProtectedRoute>} />
                <Route path="quality-records" element={<ProtectedRoute permissionKey="quality-records"><QualityRecords /></ProtectedRoute>} />
                <Route path="quality-records/:id" element={<ProtectedRoute permissionKey="quality-records"><QualityRecordsDetail /></ProtectedRoute>} />
                <Route path="iso-documents" element={<ProtectedRoute permissionKey="iso-documents"><ISODocumentList mode="documents" /></ProtectedRoute>} />
                <Route path="iso-processes" element={<ProtectedRoute permissionKey="iso-processes"><ISODocumentList mode="processes" /></ProtectedRoute>} />
                <Route path="iso-documents/edit/:id" element={<ProtectedRoute permissionKey={["iso-documents", "iso-processes"]}><ISOFormEditor /></ProtectedRoute>} />
                <Route path="iso-processes/edit/:id" element={<ProtectedRoute permissionKey="iso-processes"><ISOProcessEditor /></ProtectedRoute>} />
                <Route path="kpi" element={<ProtectedRoute permissionKey="kpi"><KPIReports /></ProtectedRoute>} />
                <Route path="kpi/checklist" element={<ProtectedRoute permissionKey="kpi"><KPIChecklist /></ProtectedRoute>} />
                <Route path="kpi/list" element={<ProtectedRoute permissionKey="kpi"><KPIItems /></ProtectedRoute>} />
                <Route path="kpi/rules" element={<ProtectedRoute permissionKey="kpi"><KPIRules /></ProtectedRoute>} />
                <Route path="kpi/feedback" element={<ProtectedRoute permissionKey="kpi"><KPIFeedback /></ProtectedRoute>} />
                <Route path="violations" element={<ProtectedRoute permissionKey="violations"><ViolationHistory /></ProtectedRoute>} />
                <Route path="violations/create" element={<ProtectedRoute permissionKey="violations"><ViolationForm /></ProtectedRoute>} />
                <Route path="violations/edit/:id" element={<ProtectedRoute permissionKey="violations"><ViolationForm /></ProtectedRoute>} />
                <Route path="capa" element={<ProtectedRoute permissionKey="capa"><CapaHistory /></ProtectedRoute>} />
                <Route path="capa/create" element={<ProtectedRoute permissionKey="capa"><CapaForm /></ProtectedRoute>} />
                <Route path="capa/edit/:id" element={<ProtectedRoute permissionKey="capa"><CapaForm /></ProtectedRoute>} />
                <Route path="feedback" element={<ProtectedRoute permissionKey="feedback"><Improvements /></ProtectedRoute>} />
                <Route path="hotspots" element={<ProtectedRoute permissionKey="hotspots"><Hotspots /></ProtectedRoute>} />
                <Route path="data" element={<ProtectedRoute permissionKey="data"><DataPackaging /></ProtectedRoute>} />
                <Route path="screens" element={<ProtectedRoute permissionKey="screens"><ScreenManagement /></ProtectedRoute>} />
                <Route path="screens/bugs" element={<ProtectedRoute permissionKey="bugs"><ScreenBugManagement /></ProtectedRoute>} />
                <Route path="screens/progress" element={<ProtectedRoute permissionKey="screens"><ProjectProgress /></ProtectedRoute>} />
                <Route path="screens/:id" element={<ProtectedRoute permissionKey="screens"><ScreenDetail /></ProtectedRoute>} />
                <Route path="sidebar" element={<ProtectedRoute permissionKey="screens"><SidebarManagement /></ProtectedRoute>} />
                <Route path="system-config" element={<ProtectedRoute permissionKey="screens"><SystemConfig /></ProtectedRoute>} />
                <Route path="monitor" element={<ProtectedRoute permissionKey="monitor"><SystemMonitor /></ProtectedRoute>} />
                <Route path="equipment" element={<ProtectedRoute permissionKey="equipment"><EquipmentManagement /></ProtectedRoute>} />
                <Route path="equipment/categories" element={<ProtectedRoute permissionKey="equipment"><EquipmentCategories /></ProtectedRoute>} />
                <Route path="equipment/history" element={<ProtectedRoute permissionKey="equipment"><EquipmentHistory /></ProtectedRoute>} />
                <Route path="equipment/training" element={<ProtectedRoute permissionKey="equipment"><EquipmentTraining /></ProtectedRoute>} />
                <Route path="equipment/handover" element={<ProtectedRoute permissionKey="equipment"><EquipmentHandoverRedirect /></ProtectedRoute>} />
                <Route path="equipment/handover/:id" element={<ProtectedRoute permissionKey="equipment"><EquipmentHandoverRedirect /></ProtectedRoute>} />
                <Route path="equipment/detail/:id" element={<ProtectedRoute permissionKey="equipment"><EquipmentDetail /></ProtectedRoute>} />
                <Route path="equipment/training/detail/:id" element={<ProtectedRoute permissionKey="equipment"><EquipmentTrainingDetail /></ProtectedRoute>} />

                {/* Machinery (Máy móc) Module */}
                <Route path="machines" element={<ProtectedRoute permissionKey="machines"><MachineManagement /></ProtectedRoute>} />
                <Route path="machines/history" element={<ProtectedRoute permissionKey="machine-history"><MachineHistory /></ProtectedRoute>} />
                <Route path="machines/training" element={<ProtectedRoute permissionKey="machine-training"><MachineTraining /></ProtectedRoute>} />
                <Route path="machines/detail/:id" element={<ProtectedRoute permissionKey="machines"><MachineDetail /></ProtectedRoute>} />

                {/* Manufacture Routes merged under /admin */}
                <Route path="manufacture-dashboard" element={<ProtectedRoute permissionKey="home"><ManufactureDashboard /></ProtectedRoute>} />
                <Route path="plan" element={<ProtectedRoute permissionKey="plan"><ManufacturePlan /></ProtectedRoute>} />
                <Route path="plan/create" element={<ProtectedRoute permissionKey="plan"><AddProductionPlan /></ProtectedRoute>} />
                <Route path="plan/:id" element={<ProtectedRoute permissionKey="plan"><PlanDetail /></ProtectedRoute>} />
                <Route path="delivery-tracking" element={<ProtectedRoute permissionKey="delivery-tracking"><DeliveryTracking /></ProtectedRoute>} />
                <Route path="production-dashboard" element={<ProtectedRoute permissionKey="plan"><ProductionDashboard /></ProtectedRoute>} />
                <Route path="production-orders" element={<ProtectedRoute permissionKey="orders"><ProductionOrders /></ProtectedRoute>} />
                <Route path="production-orders/create" element={<ProtectedRoute permissionKey="orders"><ProductionOrderCreate /></ProtectedRoute>} />
                <Route path="production-orders/edit/:id" element={<ProtectedRoute permissionKey="orders"><ProductionOrderCreate /></ProtectedRoute>} />
                <Route path="production-schedule" element={<ProtectedRoute permissionKey="plan"><ProductionSchedule /></ProtectedRoute>} />
                <Route path="production-routing" element={<ProtectedRoute permissionKey="products"><ProductionRouting /></ProtectedRoute>} />
                <Route path="technical-dashboard" element={<ProtectedRoute permissionKey="products"><TechnicalDashboard /></ProtectedRoute>} />
                <Route path="technical-standards" element={<ProtectedRoute permissionKey="products"><TechnicalStandards /></ProtectedRoute>} />
                <Route path="maintenance" element={<ProtectedRoute permissionKey="products"><MaintenanceFacility /></ProtectedRoute>} />
                <Route path="products" element={<ProtectedRoute permissionKey="products"><ManufactureProducts /></ProtectedRoute>} />
                <Route path="products/create" element={<ProtectedRoute permissionKey="products"><ProductCreate /></ProtectedRoute>} />
                <Route path="products/:id" element={<ProtectedRoute permissionKey="products"><ProductDetail /></ProtectedRoute>} />
                <Route path="product-details" element={<ProtectedRoute permissionKey="products"><ProductDetailsManagement /></ProtectedRoute>} />
                <Route path="paint-colors" element={<ProtectedRoute permissionKey="products"><PaintColorManagement /></ProtectedRoute>} />
                <Route path="progress/:id" element={<ProtectedRoute permissionKey="plan"><ProductionProgress /></ProtectedRoute>} />
                <Route path="orders" element={<ProtectedRoute permissionKey="orders"><ManufactureOrders /></ProtectedRoute>} />
                <Route path="orders/create" element={<ProtectedRoute permissionKey="orders"><OrderCreate /></ProtectedRoute>} />
                <Route path="orders/edit/:id" element={<ProtectedRoute permissionKey="orders"><OrderCreate /></ProtectedRoute>} />
                <Route path="orders/:id" element={<ProtectedRoute permissionKey="orders"><OrderDetail /></ProtectedRoute>} />
                <Route path="customers" element={<ProtectedRoute permissionKey="customers"><CustomerList /></ProtectedRoute>} />
                <Route path="backup-qrs" element={<ProtectedRoute permissionKey="backup-qrs"><BackupQRManagement /></ProtectedRoute>} />
                <Route path="exception-deliveries" element={<ProtectedRoute permissionKey="exception-deliveries"><ExceptionDeliveries /></ProtectedRoute>} />
                <Route path="purchase-requisitions" element={<ProtectedRoute permissionKey="purchase-requisitions"><PurchaseRequisitionList /></ProtectedRoute>} />
                <Route path="purchase-requisitions/:id" element={<ProtectedRoute permissionKey="purchase-requisitions"><PurchaseRequisitionDetail /></ProtectedRoute>} />
                <Route path="purchase-order-items" element={<ProtectedRoute permissionKey="purchase-order-items"><PurchaseOrderItemList /></ProtectedRoute>} />
                <Route path="order-shipping-monitoring" element={<ProtectedRoute permissionKey="order-shipping-monitoring"><OrderShippingMonitoring /></ProtectedRoute>} />
              </Route>

              {/* Route Claim (Root level but with PortalLayout) */}
              <Route path="/admin/claims" element={<ProtectedRoute permissionKey="claim"><PortalLayout /></ProtectedRoute>}>
                <Route element={<ClaimPortalLayout />}>
                  <Route index element={<ClaimList />} />
                </Route>
              </Route>

              {/* Route ChatBot - redirects to claims with chat open */}
              <Route path="/admin/chatbot" element={<Navigate to="/admin/claims?chat=true" />} />
              {/* Route Prices */}
              <Route path="/admin/prices" element={<ProtectedRoute permissionKey="prices"><PortalLayout /></ProtectedRoute>}>
                <Route element={<ClaimPortalLayout />}>
                  <Route index element={<PriceList />} />
                </Route>
              </Route>

              {/* Route Shipments */}
              <Route path="/admin/shipments" element={<ProtectedRoute permissionKey="shipments"><PortalLayout /></ProtectedRoute>}>
                <Route element={<ClaimPortalLayout />}>
                  <Route index element={<ShipmentList />} />
                </Route>
              </Route>

              {/* Legacy Redirects */}
              <Route path="/claim/*" element={<Navigate to="/admin/claims" />} />
              <Route path="/admin/claim/*" element={<Navigate to="/admin/claims" />} />

              {/* Chuyển hướng mặc định */}
              <Route path="/" element={<RootRoute />} />

              {/* Catch-all route to prevent white screen */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </Router>
      </ScreenProvider>
    </ToastProvider>
  );
}

export default App;
