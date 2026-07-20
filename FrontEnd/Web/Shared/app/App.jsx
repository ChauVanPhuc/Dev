import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import LoginPage from '@modules/Auth/Views/LoginView';
import PortalLayout from '@webShared/Views/components/layout/PortalLayout';
import { ToastProvider } from '@webShared/Views/components/feedback/ToastContext';

// Import các trang Admin
import Dashboard from '@modules/Dashboard/Views/DashboardView';
import UserManagement from '@modules/Auth/Views/UserManagementView';
import UserCreate from '@modules/Auth/Views/UserCreateView';
import UserEdit from '@modules/Auth/Views/UserEditView';
import UserPermissionView from '@modules/Auth/Views/UserPermissionView';
import DepartmentManagement from '@modules/Auth/Views/DepartmentManagementView';
import PositionManagement from '@modules/Auth/Views/PositionManagementView';
import EmployeeListView from '@modules/Auth/Views/EmployeeListView';
import OrgChartView from '@modules/Auth/Views/OrgChartView';
import HierarchyChartView from '@modules/Auth/Views/HierarchyChartView';
import PersonnelChartView from '@modules/Auth/Views/PersonnelChartView';
import FactoryStructureView from '@modules/Auth/Views/FactoryStructureView';
import HRManagementView from '@modules/Auth/Views/HRManagementView';
import HandoverList from '@modules/Delivery/Views/HandoverListView';
import IncidentLogs from '@modules/System/Views/IncidentLogsView';
import InspectionReports from '@modules/Inspection/Views/InspectionReportsView';
import KPIReports from '@modules/KPI/Views/KPIReportsView';
import KPIChecklist from '@modules/KPI/Views/KPIChecklistView';
import KPIItems from '@modules/KPI/Views/KPIItemsView';
import KPIRules from '@modules/KPI/Views/KPIRulesView';
import KPIFeedback from '@modules/KPI/Views/KPIFeedbackView';
import Improvements from '@modules/CAPA/Views/ImprovementsView';
import Hotspots from '@modules/System/Views/HotspotsView';
import DataPackaging from '@modules/System/Views/DataPackagingView';
import BackupQRManagement from '@modules/System/Views/BackupQRManagementView';
import ScreenManagement from '@modules/System/Views/ScreenManagementView';
import ScreenDetail from '@modules/System/Views/ScreenDetailView';
import ScreenBugManagement from '@modules/System/Views/ScreenBugManagementView';
import ProjectProgress from '@modules/System/Views/ProjectProgressView';
import DefectManagement from '@modules/Inspection/Views/DefectManagementView';
import QualityRecords from '@modules/QualityRecords/Views/QualityRecordsListView';
import QualityRecordsDetail from '@modules/QualityRecords/Views/QualityRecordsDetailView';
import SystemMonitor from '@modules/System/Views/SystemMonitorView';
import EquipmentManagement from '@modules/Equipment/Views/EquipmentManagementView';
import EquipmentCategories from '@modules/Equipment/Views/EquipmentCategoriesView';
import EquipmentHistory from '@modules/Equipment/Views/EquipmentHistoryView';
import EquipmentTraining from '@modules/Equipment/Views/EquipmentTrainingView';
import EquipmentHandover from '@modules/Equipment/Views/EquipmentHandoverView';
import EquipmentDetail from '@modules/Equipment/Views/EquipmentDetailView';
import EquipmentTrainingDetail from '@modules/Equipment/Views/EquipmentTrainingDetailView';
import MachineManagement from '@modules/Equipment/Views/MachineManagementView';
import MachineHistory from '@modules/Equipment/Views/MachineHistoryView';
import MachineTraining from '@modules/Equipment/Views/MachineTrainingView';
import MachineDetail from '@modules/Equipment/Views/MachineDetailView';

// Import Claim module
import ClaimPortalLayout from '../../modules/Claim/views/PortalLayout';
import ClaimList from '../../modules/Claim/views/ClaimListView';
import PriceList from '../../modules/Claim/views/PriceListView';
import ShipmentList from '../../modules/Claim/views/ShipmentListView';

// Import Manufacture module
import ManufactureDashboard from '@modules/Dashboard/Views/ManufactureDashboardView';
import ManufacturePlan from '@modules/Plan/Views/PlanListView';
import PlanDetail from '@modules/Plan/Views/PlanDetailView';
import ManufactureHandover from '@modules/Delivery/Views/DeliveryHandoverView';
import ManufactureReceive from '@modules/Delivery/Views/DeliveryReceiveView';
import ManufactureProducts from '@modules/Product/Views/ProductsListView';
import ProductDetail from '@modules/Product/Views/ProductDetailView';
import ProductCreate from '@modules/Product/Views/ProductCreateView';
import ManufactureOrders from '@modules/Order/Views/OrdersListView';
import OrderCreate from '@modules/Order/Views/OrderCreateView';
import AddProductionPlan from '@modules/Plan/Views/AddProductionPlanView';
import ProductionProgress from '@modules/Plan/Views/ProductionProgressView';
import DeliveryTracking from '@modules/Delivery/Views/DeliveryTrackingView';
import ExceptionDeliveries from '@modules/Pallet/Views/PalletCardView';

// Import Purchasing module
import PurchaseRequisitionList from '@modules/Purchasing/Views/PurchaseRequisitionListView';
import PurchaseRequisitionDetail from '@modules/Purchasing/Views/PurchaseRequisitionDetailView';
import PurchaseOrderItemList from '@modules/Purchasing/Views/PurchaseOrderItemListView';

// Import ISO module
import ISODocumentList from '@modules/ISO/Views/ISODocumentListView';
import ISOFormEditor from '@modules/ISO/Views/ISOFormEditorView';
import ISOProcessEditor from '@modules/ISO/Views/ISOProcessEditorView';

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

  if (!isAdmin && allowedActions.length === 0) {
    return <AccessDenied />;
  }

  if (allowedActions.includes('none')) {
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
        <Router>
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
              <Route path="users/permissions/:id" element={<ProtectedRoute permissionKey="users"><UserEdit /></ProtectedRoute>} />
              <Route path="users/departments" element={<ProtectedRoute permissionKey="users"><DepartmentManagement /></ProtectedRoute>} />
              <Route path="users/positions" element={<ProtectedRoute permissionKey="users"><PositionManagement /></ProtectedRoute>} />
              <Route path="hr" element={<Navigate to="hr/org-chart" />} />
              <Route path="hr/org-chart" element={<ProtectedRoute permissionKey="users"><HRManagementView /></ProtectedRoute>} />
              <Route path="hr/employees" element={<ProtectedRoute permissionKey="users"><EmployeeListView /></ProtectedRoute>} />
              <Route path="handovers" element={<ProtectedRoute permissionKey="handovers"><HandoverList /></ProtectedRoute>} />
              <Route path="logs" element={<ProtectedRoute permissionKey="logs"><IncidentLogs /></ProtectedRoute>} />
              <Route path="defects" element={<ProtectedRoute permissionKey="defects"><DefectManagement /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute permissionKey="reports"><InspectionReports /></ProtectedRoute>} />
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
              <Route path="feedback" element={<ProtectedRoute permissionKey="feedback"><Improvements /></ProtectedRoute>} />
              <Route path="hotspots" element={<ProtectedRoute permissionKey="hotspots"><Hotspots /></ProtectedRoute>} />
              <Route path="data" element={<ProtectedRoute permissionKey="data"><DataPackaging /></ProtectedRoute>} />
              <Route path="screens" element={<ProtectedRoute permissionKey="screens"><ScreenManagement /></ProtectedRoute>} />
              <Route path="screens/:id" element={<ProtectedRoute permissionKey="screens"><ScreenDetail /></ProtectedRoute>} />
              <Route path="screens/bugs" element={<ProtectedRoute permissionKey="bugs"><ScreenBugManagement /></ProtectedRoute>} />
              <Route path="screens/progress" element={<ProtectedRoute permissionKey="screens"><ProjectProgress /></ProtectedRoute>} />
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
              <Route path="plan/:id" element={<ProtectedRoute permissionKey="plan"><PlanDetail /></ProtectedRoute>} />
              <Route path="plan/create" element={<ProtectedRoute permissionKey="plan"><AddProductionPlan /></ProtectedRoute>} />
              <Route path="delivery-tracking" element={<ProtectedRoute permissionKey="delivery-tracking"><DeliveryTracking /></ProtectedRoute>} />
              <Route path="products" element={<ProtectedRoute permissionKey="products"><ManufactureProducts /></ProtectedRoute>} />
              <Route path="products/:id" element={<ProtectedRoute permissionKey="products"><ProductDetail /></ProtectedRoute>} />
              <Route path="products/create" element={<ProtectedRoute permissionKey="products"><ProductCreate /></ProtectedRoute>} />
              <Route path="progress/:id" element={<ProtectedRoute permissionKey="plan"><ProductionProgress /></ProtectedRoute>} />
              <Route path="orders" element={<ProtectedRoute permissionKey="orders"><ManufactureOrders /></ProtectedRoute>} />
              <Route path="orders/create" element={<ProtectedRoute permissionKey="orders"><OrderCreate /></ProtectedRoute>} />
              <Route path="backup-qrs" element={<ProtectedRoute permissionKey="backup-qrs"><BackupQRManagement /></ProtectedRoute>} />
              <Route path="exception-deliveries" element={<ProtectedRoute permissionKey="exception-deliveries"><ExceptionDeliveries /></ProtectedRoute>} />
              <Route path="purchase-requisitions" element={<ProtectedRoute permissionKey="purchase-requisitions"><PurchaseRequisitionList /></ProtectedRoute>} />
              <Route path="purchase-requisitions/:id" element={<ProtectedRoute permissionKey="purchase-requisitions"><PurchaseRequisitionDetail /></ProtectedRoute>} />
              <Route path="purchase-order-items" element={<ProtectedRoute permissionKey="purchase-order-items"><PurchaseOrderItemList /></ProtectedRoute>} />
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
        </Router>
      </ScreenProvider>
    </ToastProvider>
  );
}

export default App;
