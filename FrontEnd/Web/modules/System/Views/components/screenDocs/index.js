// Mobile Screens
import MobileLogin from './Mobile/Login';
import DeliveryInfo from './Mobile/DeliveryInfo';
import DeliveryCreate from './Mobile/DeliveryCreate';
import DeliveryReceive from './Mobile/DeliveryReceive';
import InboundInspection from './Mobile/InboundInspection';
import PlanTracking from './Mobile/PlanTracking';
import DailyInspection from './Mobile/DailyInspection';
import StageInspection from './Mobile/StageInspection';
import InspectionHistory from './Mobile/InspectionHistory';
import KPITracking from './Mobile/KPITracking';
import StaffEvaluation from './Mobile/StaffEvaluation';
import KPIStaffList from './Mobile/KPIStaffList';
import AwardsDiscipline from './Mobile/AwardsDiscipline';
import EquipmentList from './Mobile/EquipmentList';
import QualityInspectionDetail from './Mobile/QualityInspectionDetail';
import ThermalPrint from './Mobile/ThermalPrint';
import CapaList from './Mobile/CapaList';
import CapaReport from './Mobile/CapaReport';
import CapaDetail from './Mobile/CapaDetail';

// Admin Screens
import AdminLogin from './Admin/Login';
import Dashboard from './Admin/Dashboard';
import UserManagement from './Admin/UserManagement';
import UserCreate from './Admin/UserCreate';
import UserEdit from './Admin/UserEdit';
import HandoverList from './Admin/HandoverList';
import IncidentLogs from './Admin/IncidentLogs';
import InspectionReports from './Admin/InspectionReports';
import KPIReports from './Admin/KPIReports';
import Improvements from './Admin/Improvements';
import Hotspots from './Admin/Hotspots';
import DataPackaging from './Admin/DataPackaging';
import BackupQRManagement from './Admin/BackupQRManagement';

// Manufacture Screens
import ProductionOverview from './Manufacture/ProductionOverview';
import ProductionPlan from './Manufacture/ProductionPlan';
import PlanDetail from './Manufacture/PlanDetail';
import PlanCreate from './Manufacture/PlanCreate';
import ProductionOrder from './Manufacture/ProductionOrder';
import OrderCreate from './Manufacture/OrderCreate';
import ProductCatalog from './Manufacture/ProductCatalog';
import ProductDetail from './Manufacture/ProductDetail';
import ProductCreate from './Manufacture/ProductCreate';
import ProductionProgress from './Manufacture/ProductionProgress';
import DeliveryTracking from './Manufacture/DeliveryTracking';
import ExceptionDeliveries from './Manufacture/ExceptionDeliveries';

const SCREEN_DOCS = {
  Web: {
    'dangnhap': AdminLogin,
    'trangchu': Dashboard,
    'quanlynguoidung': UserManagement,
    'taonguoidungmoi': UserCreate,
    'chinhsuanguoidung': UserEdit,
    'danhsachbangiao': HandoverList,
    'nhatkysuco': IncidentLogs,
    'baocaokiemtra': InspectionReports,
    'baocaokpi': KPIReports,
    'gopycaitien': Improvements,
    'diemnongcanchuy': Hotspots,
    'dulieudonggoi': DataPackaging,
    'quanlyqrduphong': BackupQRManagement,
    
    'tongquansanxuat': ProductionOverview,
    'kehoachsanxuat': ProductionPlan,
    'chitietkehoach': PlanDetail,
    'themkehoachsanxuat': PlanCreate,
    'donhangsanxuat': ProductionOrder,
    'taodonhang': OrderCreate,
    'danhmucsanpham': ProductCatalog,
    'chitietsanpham': ProductDetail,
    'themsanpham': ProductCreate,
    'tiendosanxuat': ProductionProgress,
    'theodoigiaohang': DeliveryTracking,
    'thepalletngoaile': ExceptionDeliveries,
  },
  Mobile: {
    'dangnhap': MobileLogin,
    'thongtingiaohang': DeliveryInfo,
    'taophieugiaohang': DeliveryCreate,
    'nhanhang': DeliveryReceive,
    'kiemtradauvao': InboundInspection,
    'theodoikehoach': PlanTracking,
    'kiemtrahangngay': DailyInspection,
    'kiemtracongdoan': StageInspection,
    'lichsukiemtra': InspectionHistory,
    'theodoikpi': KPITracking,
    'danhgianhanvien': StaffEvaluation,
    'danhsachkpinhanvien': KPIStaffList,
    'khenthuongkyluat': AwardsDiscipline,
    'danhsachthietbi': EquipmentList,
    'chitietkiemtrachatluong': QualityInspectionDetail,
    'innhiet': ThermalPrint,
    'danhsachcapa': CapaList,
    'baocaocapa': CapaReport,
    'chitietcapa': CapaDetail,
  }
};

export default SCREEN_DOCS;
