import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@modules/Auth/Views/LoginView';
import PortalLayout from '@webShared/Views/components/layout/PortalLayout';

// Import các trang Admin
import Dashboard from '@modules/Dashboard/Views/DashboardView';
import UserManagement from '@modules/Auth/Views/UserManagementView';
import UserCreate from '@modules/Auth/Views/UserCreateView';
import UserEdit from '@modules/Auth/Views/UserEditView';
import HandoverList from '@modules/Delivery/Views/HandoverListView';
import IncidentLogs from '@modules/System/Views/IncidentLogsView';
import InspectionReports from '@modules/Inspection/Views/InspectionReportsView';
import KPIReports from '@modules/KPI/Views/KPIReportsView';
import Improvements from '@modules/CAPA/Views/ImprovementsView';
import Hotspots from '@modules/System/Views/HotspotsView';
import DataPackaging from '@modules/System/Views/DataPackagingView';
import BackupQRManagement from '@modules/System/Views/BackupQRManagementView';
import ScreenManagement from '@modules/System/Views/ScreenManagementView';
import ScreenDetail from '@modules/System/Views/ScreenDetailView';
import DefectManagement from '@modules/Inspection/Views/DefectManagementView';

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

import { authService } from '@modules/Auth/Models/auth.service';
import { ScreenProvider } from '@shared/context/ScreenContext';

/**
 * Controller chính điều phối Routing của ứng dụng
 */
function App() {
  const isAuthenticated = !!authService.getToken();

  return (
    <ScreenProvider>
      <Router>
        <Routes>
          {/* Route Đăng nhập */}
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/admin/dashboard" /> : <LoginPage />
          } />

          {/* Route Admin (Sử dụng Layout chung) */}
          <Route path="/admin" element={<PortalLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="users/create" element={<UserCreate />} />
            <Route path="users/edit/:id" element={<UserEdit />} />
            <Route path="handovers" element={<HandoverList />} />
            <Route path="logs" element={<IncidentLogs />} />
            <Route path="defects" element={<DefectManagement />} />
            <Route path="reports" element={<InspectionReports />} />
            <Route path="kpi" element={<KPIReports />} />
            <Route path="feedback" element={<Improvements />} />
            <Route path="hotspots" element={<Hotspots />} />
            <Route path="data" element={<DataPackaging />} />
            <Route path="screens" element={<ScreenManagement />} />
            <Route path="screens/:id" element={<ScreenDetail />} />
          </Route>

          {/* Route Manufacture */}
          <Route path="/manufacture" element={<PortalLayout />}>
            <Route index element={<Navigate to="/manufacture/dashboard" />} />
            <Route path="dashboard" element={<ManufactureDashboard />} />
            <Route path="plan" element={<ManufacturePlan />} />
            <Route path="plan/:id" element={<PlanDetail />} />
            <Route path="plan/create" element={<AddProductionPlan />} />
            <Route path="delivery-tracking" element={<DeliveryTracking />} />
            <Route path="products" element={<ManufactureProducts />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="products/create" element={<ProductCreate />} />
            <Route path="progress/:id" element={<ProductionProgress />} />
            <Route path="orders" element={<ManufactureOrders />} />
            <Route path="orders/create" element={<OrderCreate />} />
            <Route path="backup-qrs" element={<BackupQRManagement />} />
            <Route path="exception-deliveries" element={<ExceptionDeliveries />} />
          </Route>

          {/* Chuyển hướng mặc định */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/admin/dashboard" : "/login"} />} />
        </Routes>
      </Router>
    </ScreenProvider>
  );
}

export default App;
