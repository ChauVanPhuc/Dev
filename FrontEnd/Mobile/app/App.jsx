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
import InputInspection from '@modules/inspection/Views/InputInspectionView'
import EquipmentList from '@modules/equipment/Views/EquipmentListView'
import KPIStaffList from '@modules/kpi/Views/KPIStaffListView'
import CAPAList from '@modules/capa/Views/CAPAListView'
import CAPAReport from '@modules/capa/Views/CAPAReportView'
import CAPADetail from '@modules/capa/Views/CAPADetailView'
import DashboardView from '@modules/production/Views/DashboardView'
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
    <Router>
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
            <Route path="/capa-list" element={<CAPAList />} />
            <Route path="/capa-report/:id" element={<CAPAReport />} />
            <Route path="/capa-detail/:capaId/:occurrenceId" element={<CAPADetail />} />
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/feedback" element={<FeedbackView />} />
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
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BackButtonHandler>
    </Router>
  )
}

export default App
