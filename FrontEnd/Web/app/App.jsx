import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@web/Auth/Views/LoginView';
import AdminLayout from '@web/Shared/Views/components/layout/AdminLayout';

// Import các trang Admin
import Dashboard from '@web/Dashboard/Views/DashboardView';
import UserManagement from '@web/Auth/Views/UserManagementView';
import UserCreate from '@web/Auth/Views/UserCreateView';
import UserEdit from '@web/Auth/Views/UserEditView';
import HandoverList from '@web/Delivery/Views/HandoverListView';
import IncidentLogs from '@web/System/Views/IncidentLogsView';
import InspectionReports from '@web/Inspection/Views/InspectionReportsView';
import KPIReports from '@web/KPI/Views/KPIReportsView';
import Improvements from '@web/CAPA/Views/ImprovementsView';
import Hotspots from '@web/System/Views/HotspotsView';
import DataPackaging from '@web/System/Views/DataPackagingView';
import BackupQRManagement from '@web/System/Views/BackupQRManagementView';
import ScreenManagement from '@web/System/Views/ScreenManagementView';
import ScreenDetail from '@web/System/Views/ScreenDetailView';

// Import Manufacture module
import ManufactureLayout from '@web/Shared/Views/components/layout/ManufactureLayout';
import ManufactureDashboard from '@web/Dashboard/Views/ManufactureDashboardView';
import ManufacturePlan from '@web/Plan/Views/PlanListView';
import PlanDetail from '@web/Plan/Views/PlanDetailView';
import ManufactureHandover from '@web/Delivery/Views/DeliveryHandoverView';
import ManufactureReceive from '@web/Delivery/Views/DeliveryReceiveView';
import ManufactureProducts from '@web/Product/Views/ProductsListView';
import ProductDetail from '@web/Product/Views/ProductDetailView';
import ProductCreate from '@web/Product/Views/ProductCreateView';
import ManufactureOrders from '@web/Order/Views/OrdersListView';
import OrderCreate from '@web/Order/Views/OrderCreateView';
import AddProductionPlan from '@web/Plan/Views/AddProductionPlanView';
import ProductionProgress from '@web/Plan/Views/ProductionProgressView';
import DeliveryTracking from '@web/Delivery/Views/DeliveryTrackingView';
import ExceptionDeliveries from '@web/Pallet/Views/PalletCardView';

import { authService } from '@web/Auth/Models/auth.service';
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
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="users/create" element={<UserCreate />} />
            <Route path="users/edit/:id" element={<UserEdit />} />
            <Route path="handovers" element={<HandoverList />} />
            <Route path="logs" element={<IncidentLogs />} />
            <Route path="reports" element={<InspectionReports />} />
            <Route path="kpi" element={<KPIReports />} />
            <Route path="feedback" element={<Improvements />} />
            <Route path="hotspots" element={<Hotspots />} />
            <Route path="data" element={<DataPackaging />} />
            <Route path="screens" element={<ScreenManagement />} />
            <Route path="screens/:id" element={<ScreenDetail />} />
          </Route>

          {/* Route Manufacture */}
          <Route path="/manufacture" element={<ManufactureLayout />}>
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
