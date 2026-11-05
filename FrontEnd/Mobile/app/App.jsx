import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import Login from '@modules/auth/Views/LoginView'
import ProtectedRoute from '@mobile/Shared/Views/components/layout/ProtectedRoute'
import AppUpdateModal from '@mobile/Shared/Views/components/feedback/AppUpdateModal'
import ErrorBoundary from '@mobile/Shared/Views/components/feedback/ErrorBoundary'

function safeLazy(importFn) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (err1) {
      console.warn('[safeLazy] Lần nạp module 1 thất bại, thử lại sau 300ms...', err1);
      await new Promise(res => setTimeout(res, 300));
      try {
        return await importFn();
      } catch (err2) {
        console.warn('[safeLazy] Lần nạp module 2 thất bại, kiểm tra phiên bản mới...', err2);
        const reloadKey = 'sf_mobile_lazy_auto_reload';
        const last = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
        const now = Date.now();
        if (now - last > 6000) {
          sessionStorage.setItem(reloadKey, now.toString());
          const targetUrl = window.location.origin + window.location.pathname + '?_v=' + now;
          window.location.href = targetUrl;
          return new Promise(() => {}); // Giữ Suspense trong khi trình duyệt đang điều hướng
        }
        throw err2;
      }
    }
  });
}
// Lazy loading các màn hình an toàn với tự động thử lại
const DeliveryInfo = safeLazy(() => import('@modules/delivery/Views/DeliveryInfoView'))
const DeliveryCreate = safeLazy(() => import('@modules/delivery/Views/DeliveryCreateView'))
const DeliveryReceive = safeLazy(() => import('@modules/delivery/Views/DeliveryReceiveView'))
const DeliveryHistory = safeLazy(() => import('@modules/delivery/Views/DeliveryHistoryView'))
const DeliveryDetail = safeLazy(() => import('@modules/delivery/Views/DeliveryDetailView'))
const PlanTracking = safeLazy(() => import('@modules/production/Views/PlanTrackingView'))
const DailyInspection = safeLazy(() => import('@modules/inspection/Views/DailyInspectionView'))
const StageInspection = safeLazy(() => import('@modules/inspection/Views/StageInspectionView'))
const FirstArticleInspection = safeLazy(() => import('@modules/inspection/Views/FirstArticleInspectionView'))
const InspectionLogs = safeLazy(() => import('@modules/inspection/Views/InspectionLogsView'))
const ThermalPrint = safeLazy(() => import('@modules/delivery/Views/components/ThermalPrint'))
const AwardDiscipline = safeLazy(() => import('@modules/kpi/Views/AwardDisciplineView'))
const KPITracking = safeLazy(() => import('@modules/kpi/Views/KPITrackingView'))
const StaffEvaluation = safeLazy(() => import('@modules/kpi/Views/StaffEvaluationView'))
const QualityInspectionDetail = safeLazy(() => import('@modules/inspection/Views/QualityInspectionDetailView'))
const InputInspection = safeLazy(() => import('@modules/inspection/Views/InputInspectionView'))
const EquipmentList = safeLazy(() => import('@modules/equipment/Views/EquipmentListView'))
const KPIStaffList = safeLazy(() => import('@modules/kpi/Views/KPIStaffListView'))
const QualityEmployeeListMobileView = safeLazy(() => import('@modules/kpi/Views/QualityEmployeeListMobileView'))
const QualityKPIDashboardMobileView = safeLazy(() => import('@modules/kpi/Views/QualityKPIDashboardMobileView'))
const QualityOverviewMobileView = safeLazy(() => import('@modules/inspection/Views/QualityOverviewMobileView'))
const CAPAList = safeLazy(() => import('@modules/capa/Views/CAPAListView'))
const CAPAReport = safeLazy(() => import('@modules/capa/Views/CAPAReportView'))
const CAPADetail = safeLazy(() => import('@modules/capa/Views/CAPADetailView'))
const QuickReportCreate = safeLazy(() => import('@modules/quick_report/Views/QuickReportCreateView'))
const QuickReportList = safeLazy(() => import('@modules/quick_report/Views/QuickReportListView'))
const DashboardView = safeLazy(() => import('@modules/production/Views/DashboardView'))
const ProductionDashboard = safeLazy(() => import('@modules/production/Views/ProductionDashboardView'))
const ProductionOrders = safeLazy(() => import('@modules/production/Views/ProductionOrdersView'))
const ProductionOrderDetail = safeLazy(() => import('@modules/production/Views/ProductionOrderDetailView'))
const ProductionPlanSchedule = safeLazy(() => import('@modules/production/Views/ProductionPlanScheduleView'))
const ProductionTransferHistory = safeLazy(() => import('@modules/production/Views/ProductionTransferHistoryView'))
const FeedbackView = safeLazy(() => import('@modules/inspection/Views/FeedbackView'))
const CtqSosView = safeLazy(() => import('@modules/inspection/Views/CtqSosView'))
const WarningsView = safeLazy(() => import('@modules/inspection/Views/WarningsView'))
const StageAdhesionView = safeLazy(() => import('@modules/inspection/Views/StageAdhesionView'))
const StagePackagingView = safeLazy(() => import('@modules/inspection/Views/StagePackagingView'))
const StageMoistureView = safeLazy(() => import('@modules/inspection/Views/StageMoistureView'))
const StageProcessView = safeLazy(() => import('@modules/inspection/Views/StageProcessView'))
const ShapingInspectionView = safeLazy(() => import('@modules/inspection/Views/ShapingInspectionView'))
const AssemblyInspectionView = safeLazy(() => import('@modules/inspection/Views/AssemblyInspectionView'))
const PaintingInspectionView = safeLazy(() => import('@modules/inspection/Views/PaintingInspectionView'))
const PackagingInspectionView = safeLazy(() => import('@modules/inspection/Views/PackagingInspectionView'))

// Module Production V2 (CL06, CL07, CL08, CL09)
const CL06_TransferListView = safeLazy(() => import('@modules/production_v2/Views/CL06_TransferListView'))
const CL07_TransferCreateView = safeLazy(() => import('@modules/production_v2/Views/CL07_TransferCreateView'))
const CL07_BackupQRTicketView = safeLazy(() => import('@modules/production_v2/Views/CL07_BackupQRTicketView'))
const CL08_InspectionListView = safeLazy(() => import('@modules/production_v2/Views/CL08_InspectionListView'))
const CL09A_FirstSampleView = safeLazy(() => import('@modules/production_v2/Views/CL09A_FirstSampleView'))
const CL09B_ReInspectView = safeLazy(() => import('@modules/production_v2/Views/CL09B_ReInspectView'))
const CL09C_ParameterView = safeLazy(() => import('@modules/production_v2/Views/CL09C_ParameterView'))
const CL09D_ProcessView = safeLazy(() => import('@modules/production_v2/Views/CL09D_ProcessView'))
const CL09E_QAView = safeLazy(() => import('@modules/production_v2/Views/CL09E_QAView'))
const CL09F_DailyInspectionView = safeLazy(() => import('@modules/production_v2/Views/CL09F_DailyInspectionView'))
const CheckPalletView = safeLazy(() => import('@modules/pallet_check/Views/CheckPalletView'))
const CheckPalletV1View = safeLazy(() => import('@modules/pallet_check/Views/CheckPalletV1View'))
const CheckCabinetBoxView = safeLazy(() => import('@modules/cabinet_box_check/Views/CheckCabinetBoxView'))

/**
 * Hiệu ứng tải trang nhẹ cho Mobile
 */
const MobilePageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    width: '100%',
    gap: '12px'
  }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid #e5e7eb',
      borderTop: '3px solid #2563eb',
      borderRadius: '50%',
      animation: 'sfMobileSpin 0.7s linear infinite'
    }} />
    <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Đang tải...</span>
    <style>{`@keyframes sfMobileSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

/**
 * Component xử lý nút Back vật lý của Android
 */
const BackButtonHandler = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = async (event) => {
      // Nếu đang ở trang login, trang chủ hoặc các màn hình chính kiểm tra, cho phép thoát app
      if (location.pathname === '/login' || location.pathname === '/' || location.pathname === '/pallet-check' || location.pathname === '/pallet-check-v1' || location.pathname === '/cabinet-box-check') {
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
          <Suspense fallback={<MobilePageLoader />}>
            <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pallet-check" element={<CheckPalletView />} />
          <Route path="/pallet-check-v1" element={<CheckPalletV1View />} />
          <Route path="/cabinet-box-check" element={<CheckCabinetBoxView />} />
          <Route path="/kiem-tra-tu-thung" element={<Navigate to="/cabinet-box-check" replace />} />
          <Route path="/check-pallet" element={<Navigate to="/pallet-check" replace />} />
          
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
            <Route path="/admin/kpi/dashboard" element={<QualityKPIDashboardMobileView />} />
            <Route path="/kpi/dashboard" element={<QualityKPIDashboardMobileView />} />
            <Route path="/admin/quality" element={<QualityOverviewMobileView />} />
            <Route path="/quality" element={<QualityOverviewMobileView />} />
            <Route path="admin/quality" element={<QualityOverviewMobileView />} />
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
        </Suspense>
      </BackButtonHandler>
    </Router>
  </ErrorBoundary>
  )
}

export default App
