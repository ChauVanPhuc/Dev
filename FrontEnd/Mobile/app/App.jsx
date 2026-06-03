import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import Login from '@modules/auth/Views/LoginView'
import DeliveryInfo from '@modules/delivery/Views/DeliveryInfoView'
import DeliveryCreate from '@modules/delivery/Views/DeliveryCreateView'
import DeliveryReceive from '@modules/delivery/Views/DeliveryReceiveView'
import PlanTracking from '@modules/production/Views/PlanTrackingView'
import DailyInspection from '@modules/inspection/Views/DailyInspectionView'
import StageInspection from '@modules/inspection/Views/StageInspectionView'
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
            <Route path="/plan" element={<PlanTracking />} />
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
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BackButtonHandler>
    </Router>
  )
}

export default App
