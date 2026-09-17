import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import Login from '@modules/auth/Views/LoginView'
import DeliveryInfo from '@modules/delivery/Views/DeliveryInfoView'
import DeliveryCreate from '@modules/delivery/Views/DeliveryCreateView'
import DeliveryReceive from '@modules/delivery/Views/DeliveryReceiveView'
import DeliveryHistory from '@modules/delivery/Views/DeliveryHistoryView'
import DeliveryDetail from '@modules/delivery/Views/DeliveryDetailView'
import PlanTracking from '@modules/production/Views/PlanTrackingView'
import DailyInspection from '@modules/inspection/Views/DailyInspectionView'
import StageInspection from '@modules/inspection/Views/StageInspectionView'
import FirstArticleInspection from '@modules/inspection/Views/FirstArticleInspectionView'
import InspectionLogs from '@modules/inspection/Views/InspectionLogsView'
import ThermalPrint from '@modules/delivery/Views/components/ThermalPrint'
import AwardDiscipline from '@modules/kpi/Views/AwardDisciplineView'
import KPITracking from '@modules/kpi/Views/KPITrackingView'
import StaffEvaluation from '@modules/kpi/Views/StaffEvaluationView'
import QualityInspectionDetail from '@modules/inspection/Views/QualityInspectionDetailView'
import ProtectedRoute from '@mobile/Shared/Views/components/layout/ProtectedRoute'
import AppUpdateModal from '@mobile/Shared/Views/components/feedback/AppUpdateModal'
import ErrorBoundary from '@mobile/Shared/Views/components/feedback/ErrorBoundary'
import InputInspection from '@modules/inspection/Views/InputInspectionView'
import EquipmentList from '@modules/equipment/Views/EquipmentListView'
import KPIStaffList from '@modules/kpi/Views/KPIStaffListView'
import QualityEmployeeListMobileView from '@modules/kpi/Views/QualityEmployeeListMobileView'
import CAPAList from '@modules/capa/Views/CAPAListView'
import CAPAReport from '@modules/capa/Views/CAPAReportView'
import CAPADetail from '@modules/capa/Views/CAPADetailView'
import QuickReportCreate from '@modules/quick_report/Views/QuickReportCreateView'
import QuickReportList from '@modules/quick_report/Views/QuickReportListView'
import DashboardView from '@modules/production/Views/DashboardView'
import ProductionDashboard from '@modules/production/Views/ProductionDashboardView'
import ProductionOrders from '@modules/production/Views/ProductionOrdersView'
import ProductionOrderDetail from '@modules/production/Views/ProductionOrderDetailView'
import ProductionPlanSchedule from '@modules/production/Views/ProductionPlanScheduleView'
import ProductionTransferHistory from '@modules/production/Views/ProductionTransferHistoryView'
import FeedbackView from '@modules/inspection/Views/FeedbackView'
import CtqSosView from '@modules/inspection/Views/CtqSosView'
import WarningsView from '@modules/inspection/Views/WarningsView'
import StageAdhesionView from '@modules/inspection/Views/StageAdhesionView'
import StagePackagingView from '@modules/inspection/Views/StagePackagingView'
import StageMoistureView from '@modules/inspection/Views/StageMoistureView'
import StageProcessView from '@modules/inspection/Views/StageProcessView'
import ShapingInspectionView from '@modules/inspection/Views/ShapingInspectionView'
import AssemblyInspectionView from '@modules/inspection/Views/AssemblyInspectionView'
import PaintingInspectionView from '@modules/inspection/Views/PaintingInspectionView'
import PackagingInspectionView from '@modules/inspection/Views/PackagingInspectionView'

// Module Production V2 (CL06, CL07, CL08, CL09)
import CL06_TransferListView from '@modules/production_v2/Views/CL06_TransferListView'
import CL07_TransferCreateView from '@modules/production_v2/Views/CL07_TransferCreateView'
import CL07_BackupQRTicketView from '@modules/production_v2/Views/CL07_BackupQRTicketView'
import CL08_InspectionListView from '@modules/production_v2/Views/CL08_InspectionListView'
import CL09A_FirstSampleView from '@modules/production_v2/Views/CL09A_FirstSampleView'
import CL09B_ReInspectView from '@modules/production_v2/Views/CL09B_ReInspectView'
import CL09C_ParameterView from '@modules/production_v2/Views/CL09C_ParameterView'
import CL09D_ProcessView from '@modules/production_v2/Views/CL09D_ProcessView'
import CL09E_QAView from '@modules/production_v2/Views/CL09E_QAView'
import CL09F_DailyInspectionView from '@modules/production_v2/Views/CL09F_DailyInspectionView'

/**
 * Component xử lý nút Back vật lý của Android
 */
const BackButtonHandler = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = async (event) => {
      // Nếu đang ở trang login hoặc trang chủ, cho phép thoát app
      if (location.pathname === '/login' || location.pathname === '/') {
        CapApp.exitApp();
      } else {
        // Ngược lại, quay lại trang trước đó trong lịch sử router
        navigate(-1);
      }
    };

    const listener = CapApp.addListener('backButton', handleBackButton);

    return () => {
      listener.then(l => l.remove());
    };
  }, [navigate, location]);

  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BackButtonHandler>
          <AppUpdateModal />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          
          {/* Các route yêu cầu đăng nhập */}
          <Route element={<ProtectedRoute />}>
            <Route path="/delivery-info" element={<DeliveryInfo />} />
            <Route path="/delivery-create" element={<DeliveryCreate />} />
            <Route path="/delivery-receive/:id" element={<DeliveryReceive />} />
            <Route path="/delivery-history" element={<DeliveryHistory />} />
            <Route path="/delivery-detail/:id" element={<DeliveryDetail />} />
            <Route path="/plan" element={<PlanTracking defaultTab="progress" />} />
            <Route path="/plan-calendar" element={<PlanTracking defaultTab="calendar" />} />
            <Route path="/plan-create" element={<PlanTracking defaultTab="create" />} />
            <Route path="/inspection-daily" element={<DailyInspection />} />
            <Route path="/inspection-stage" element={<StageInspection />} />
            <Route path="/logs" element={<InspectionLogs />} />
            <Route path="/thermal-print" element={<ThermalPrint />} />
            <Route path="/awards" element={<AwardDiscipline />} />
            <Route path="/kpi" element={<KPITracking />} />
            <Route path="/staff-evaluation/:id" element={<StaffEvaluation />} />
            <Route path="/quality-detail/:id/:category" element={<QualityInspectionDetail />} />
            <Route path="/input-inspection" element={<InputInspection />} />
            <Route path="/equipment-list" element={<EquipmentList />} />
            <Route path="/kpi-staff" element={<KPIStaffList />} />
            <Route path="/kpi-quality-employees" element={<QualityEmployeeListMobileView />} />
            <Route path="/capa-list" element={<CAPAList />} />
            <Route path="/mobile/capa/list" element={<CAPAList />} />
            <Route path="/capa-report/:id" element={<CAPAReport />} />
            <Route path="/capa-detail/:id" element={<CAPADetail />} />
            <Route path="/mobile/capa/detail/:id" element={<CAPADetail />} />
            <Route path="/capa-detail/:capaId/:occurrenceId" element={<CAPADetail />} />
            <Route path="/dashboard" element={<ProductionDashboard />} />
            <Route path="/production/dashboard" element={<ProductionDashboard />} />
            <Route path="/production/orders" element={<ProductionOrders />} />
            <Route path="/production/order-detail" element={<ProductionOrderDetail />} />
            <Route path="/production/order-detail/:poCode" element={<ProductionOrderDetail />} />
            <Route path="/production/plans" element={<ProductionPlanSchedule />} />
            <Route path="/production/transfers" element={<ProductionTransferHistory />} />
            <Route path="/feedback" element={<FeedbackView />} />
            <Route path="/quick-report-create" element={<QuickReportCreate />} />
            <Route path="/mobile/quick-report/create" element={<QuickReportCreate />} />
            <Route path="/quick-report-list" element={<QuickReportList />} />
            <Route path="/mobile/quick-report/list" element={<QuickReportList />} />
            <Route path="/reports" element={<QuickReportList />} />
            <Route path="/ctq-sos" element={<CtqSosView />} />
            <Route path="/warnings" element={<WarningsView />} />
            <Route path="/inspection-stage-adhesion" element={<StageAdhesionView />} />
            <Route path="/inspection-stage-moisture" element={<StageMoistureView />} />
            <Route path="/inspection-stage-process" element={<StageProcessView />} />
            <Route path="/inspection-stage-packaging" element={<StagePackagingView />} />
            <Route path="/inspection-daily-shaping" element={<ShapingInspectionView />} />
            <Route path="/inspection-daily-assembly" element={<AssemblyInspectionView />} />
            <Route path="/inspection-daily-painting" element={<PaintingInspectionView />} />
            <Route path="/inspection-daily-packaging" element={<PackagingInspectionView />} />
            <Route path="/inspection-first-article" element={<FirstArticleInspection />} />

            {/* Production V2 Routes */}
            <Route path="/production_v2/transfer-list" element={<CL06_TransferListView />} />
            <Route path="/production_v2/transfer" element={<CL07_TransferCreateView />} />
            <Route path="/production_v2/transfer/:id" element={<CL07_TransferCreateView />} />
            <Route path="/production_v2/backup-qr/:code" element={<CL07_BackupQRTicketView />} />
            <Route path="/production_v2/backup-qr" element={<CL07_BackupQRTicketView />} />
            <Route path="/production_v2/inspection-list" element={<CL08_InspectionListView />} />
            <Route path="/production_v2/inspection/first-sample" element={<CL09A_FirstSampleView />} />
            <Route path="/production_v2/inspection/first-sample/:id" element={<CL09A_FirstSampleView />} />
            <Route path="/production_v2/inspection/re-inspect" element={<CL09B_ReInspectView />} />
            <Route path="/production_v2/inspection/re-inspect/:id" element={<CL09B_ReInspectView />} />
            <Route path="/production_v2/inspection/parameter" element={<CL09C_ParameterView />} />
            <Route path="/production_v2/inspection/parameter/:id" element={<CL09C_ParameterView />} />
            <Route path="/production_v2/inspection/process" element={<CL09D_ProcessView />} />
            <Route path="/production_v2/inspection/process/:id" element={<CL09D_ProcessView />} />
            <Route path="/production_v2/inspection/qa" element={<CL09E_QAView />} />
            <Route path="/production_v2/inspection/qa/:id" element={<CL09E_QAView />} />
            <Route path="/production_v2/inspection/daily" element={<CL09F_DailyInspectionView />} />
            <Route path="/production_v2/inspection/daily/:id" element={<CL09F_DailyInspectionView />} />
            <Route path="/production_v2/inspection" element={<Navigate to="/production_v2/inspection/first-sample" replace />} />
            <Route path="/production_v2/inspection/:id" element={<Navigate to="/production_v2/inspection/first-sample" replace />} />

            {/* Compatibility routes for /production-v2 (hyphen) */}
            <Route path="/production-v2/transfer-list" element={<CL06_TransferListView />} />
            <Route path="/production-v2/transfer" element={<CL07_TransferCreateView />} />
            <Route path="/production-v2/transfer/:id" element={<CL07_TransferCreateView />} />
            <Route path="/production-v2/backup-qr/:code" element={<CL07_BackupQRTicketView />} />
            <Route path="/production-v2/backup-qr" element={<CL07_BackupQRTicketView />} />
            <Route path="/production-v2/inspection-list" element={<CL08_InspectionListView />} />
            <Route path="/production-v2/inspection/first-sample" element={<CL09A_FirstSampleView />} />
            <Route path="/production-v2/inspection/first-sample/:id" element={<CL09A_FirstSampleView />} />
            <Route path="/production-v2/inspection/re-inspect" element={<CL09B_ReInspectView />} />
            <Route path="/production-v2/inspection/re-inspect/:id" element={<CL09B_ReInspectView />} />
            <Route path="/production-v2/inspection/parameter" element={<CL09C_ParameterView />} />
            <Route path="/production-v2/inspection/parameter/:id" element={<CL09C_ParameterView />} />
            <Route path="/production-v2/inspection/process" element={<CL09D_ProcessView />} />
            <Route path="/production-v2/inspection/process/:id" element={<CL09D_ProcessView />} />
            <Route path="/production-v2/inspection/qa" element={<CL09E_QAView />} />
            <Route path="/production-v2/inspection/qa/:id" element={<CL09E_QAView />} />
            <Route path="/production-v2/inspection/daily" element={<CL09F_DailyInspectionView />} />
            <Route path="/production-v2/inspection/daily/:id" element={<CL09F_DailyInspectionView />} />
            <Route path="/production-v2/inspection" element={<Navigate to="/production_v2/inspection/first-sample" replace />} />
            <Route path="/production-v2/inspection/:id" element={<Navigate to="/production_v2/inspection/first-sample" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BackButtonHandler>
    </Router>
  </ErrorBoundary>
  )
}

export default App
