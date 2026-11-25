/**
 * routeTitleResolver.js
 * Bộ ánh xạ và chuẩn hóa tiêu đề trang động theo URL/Route và tham số tab trong hệ thống ERP G7.
 */

export const ROUTE_TITLE_MAP = {
  // Trang chủ & Hệ thống
  '/admin': 'Trang chủ',
  '/admin/dashboard': 'Trang chủ',
  '/admin/profile': 'Thông tin cá nhân',
  '/admin/monitor': 'Giám sát hệ thống',
  '/admin/screens': 'Danh sách màn hình',
  '/admin/screens/bugs': 'Quản lý lỗi màn hình',
  '/admin/screens/progress': 'Tiến độ dự án',
  '/admin/data': 'Đóng gói dữ liệu',
  '/admin/sidebar': 'Cấu hình Sidebar',
  '/admin/backup-qrs': 'Quản lý mã QR tạm',
  '/admin/system-config': 'Cấu hình hệ thống',

  // Quản trị tài khoản & Nhân sự
  '/admin/users': 'Quản lý tài khoản',
  '/admin/users/create': 'Thêm mới tài khoản',
  '/admin/users/departments': 'Quản lý phòng ban',
  '/admin/users/positions': 'Quản lý chức vụ',
  '/admin/hr/org-chart': 'Sơ đồ tổ chức',
  '/admin/hr/hierarchy': 'Sơ đồ cấp bậc',
  '/admin/hr/personnel': 'Sơ đồ nhân sự',
  '/admin/hr/factory': 'Cơ cấu nhà máy',
  '/admin/hr/structures': 'Cơ cấu tổ chức',
  '/admin/hr/employees': 'Danh sách nhân viên',
  '/admin/hr/assessments': 'Đánh giá năng lực',
  '/admin/employees': 'Quản lý nhân viên',

  // Quản lý chất lượng & Khiếu nại
  '/admin/defects': 'Danh sách lỗi',
  '/admin/defects-v2': 'Danh sách lỗi',
  '/admin/defect-dashboard-v2': 'Tổng quan chất lượng',
  '/admin/claim-dashboard': 'Dashboard Khiếu nại',
  '/admin/claims': 'Khiếu nại khách hàng',
  '/admin/capa': 'Quản lý CAPA',
  '/admin/capa/create': 'Thêm mới CAPA',
  '/admin/quality-records': 'Hồ sơ chất lượng',
  '/admin/quality-overview-v2': 'Tổng quan chất lượng',
  '/admin/quality': 'Tổng quan chất lượng',
  '/admin/quality/parameter': 'Thông số chất lượng',
  '/admin/quality-reports': 'Báo cáo Điều hành',
  '/admin/reports': 'Báo cáo kiểm tra',
  '/admin/reports-v2': 'Báo cáo kiểm tra',
  '/admin/handovers': 'Danh sách bàn giao',
  '/admin/delivery-handover': 'Bàn giao sản xuất',
  '/admin/delivery-receive': 'Tiếp nhận bàn giao',
  '/admin/manufacture-handover': 'Bàn giao sản xuất',
  '/admin/manufacture-receive': 'Tiếp nhận bàn giao',
  '/admin/hotspots': 'Điểm nóng cần chú ý',
  '/admin/logs': 'Nhật ký sự cố',
  '/admin/feedback': 'Quản lý góp ý',
  '/admin/quick-reports': 'Góp ý & Báo cáo nhanh',

  // Mục tiêu & Đánh giá KPI
  '/admin/kpi': 'Báo cáo KPI',
  '/admin/kpi/dashboard': 'Mục tiêu Chất Lượng',
  '/admin/kpi/personnel': 'Danh sách & Sơ đồ nhân sự',
  '/admin/kpi/quality-profiles': 'Hồ sơ chất lượng',
  '/admin/kpi/quality-employees': 'Danh sách nhân sự',
  '/admin/kpi/staff-evaluations': 'Đánh giá nhân viên',
  '/admin/kpi/checklist': 'Danh mục mẫu Checklist',
  '/admin/kpi/list': 'Danh mục tiêu chí KPI',
  '/admin/kpi/rules': 'Quy tắc cộng trừ điểm',
  '/admin/kpi/feedback': 'Phản hồi KPI',
  '/admin/violations': 'Danh sách vi phạm',
  '/admin/violations/create': 'Lập biên bản vi phạm',

  // Tài liệu ban hành & Tiêu chuẩn
  '/admin/inspection-guides': 'Hướng dẫn kiểm tra (HDKT)',
  '/admin/sos-guides': 'Hướng dẫn thao tác (SOS)',
  '/admin/ctq-guides': 'Lỗi cần chú ý (CTQ)',
  '/admin/iso-documents': 'Quản lý mẫu tài liệu',
  '/admin/iso-processes': 'Quy trình nghiệp vụ',
  '/admin/iso-records': 'Quản lý hồ sơ',
  '/admin/iso-approvals': 'Hồ sơ cần duyệt',
  '/admin/iso-signatures': 'Quản lý Chữ ký',

  // Kinh doanh & Xuất nhập khẩu & Tích hợp
  '/admin/export-orders': 'Đơn hàng xuất khẩu',
  '/admin/shipments': 'Thời gian xuất cont',
  '/admin/prices': 'Đơn giá sản phẩm',
  '/admin/purchase-requisitions': 'Danh sách đơn hàng',
  '/admin/order-shipping-monitoring': 'Giám sát vận chuyển',
  '/admin/lpn-crawler': 'Crawl dữ liệu LPN',
  '/admin/ai-ocr-train': 'Huấn luyện AI OCR',
  '/admin/pallet-check': 'Kiểm tra Pallet / Cont',

  // Quản lý kho
  '/admin/warehouse': 'Quản lý kho',
  '/admin/warehouse/goods-receipt': 'Nhập kho',
  '/admin/warehouse/goods-issue': 'Xuất kho',
  '/admin/warehouse/management': 'Quản lý kho',
  '/admin/warehouse/rejected-goods': 'Hàng trả về / Hàng loại',

  // Thiết bị & Đơn vị tính
  '/admin/units': 'Quản lý đơn vị tính',
  '/admin/device-configuration': 'Cấu hình thiết bị',
  '/admin/equipment': 'Quản lý người dùng thiết bị',
  '/admin/equipment/categories': 'Danh mục thiết bị',
  '/admin/equipment/history': 'Lịch sử thiết bị',
  '/admin/equipment/training': 'Đào tạo thiết bị',
  '/admin/equipment/handover': 'Bàn giao thiết bị',
  '/admin/machines': 'Danh sách thiết bị',
  '/admin/machines/history': 'Lịch sử bảo trì',
  '/admin/machines/training': 'Hướng dẫn sử dụng thiết bị',

  // Quản lý sản xuất & Kỹ thuật
  '/admin/production-dashboard': 'Trang tổng quan',
  '/admin/production-orders': 'Lệnh sản xuất',
  '/admin/production-schedule': 'Lịch sản xuất',
  '/admin/daily-production': 'Hôm nay sản xuất gì',
  '/admin/plan': 'Kế hoạch sản xuất',
  '/admin/production-routing': 'Quy trình sản xuất',
  '/admin/sample-process': 'QTSX mẫu',
  '/admin/delivery-tracking': 'Kế hoạch bàn giao',
  '/admin/exception-deliveries': 'Phiếu ngoại lệ',
  '/admin/manufacture-dashboard': 'Tổng quan sản xuất',
  '/admin/products': 'BOM sản phẩm',
  '/admin/product-details': 'Chi tiết sản phẩm',
  '/admin/paint-colors': 'Bảng màu sơn',
  '/admin/material-boms': 'BOM vật tư',
  '/admin/technical-dashboard': 'Tổng quan kỹ thuật',
  '/admin/technical-standards': 'Tiêu chuẩn kỹ thuật',
  '/admin/maintenance': 'Bảo trì - cơ sở hạ tầng',
  '/admin/orders': 'Đơn hàng sản xuất',
  '/admin/customers': 'Danh sách khách hàng'
};

/**
 * Phân giải tiêu đề động dựa trên pathname và query params (hỗ trợ các tab con)
 */
export const resolvePageTitle = (pathname = '', search = '') => {
  if (!pathname) return 'Trang chủ';

  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search || '');
  const tab = searchParams.get('tab');
  const page = searchParams.get('page');

  // 1. Xử lý các màn hình có tab chức năng chuyên biệt
  if (cleanPath === '/admin/defects' || cleanPath === '/admin/defect-dashboard-v2') {
    if (tab === 'dashboard' || tab === 'analytics' || cleanPath === '/admin/defect-dashboard-v2') {
      if (page === 'page2') return 'Phân tích lỗi';
      if (page === 'page3') return 'Kiểm soát & hành động';
      if (page === 'page4') return 'Khiếu nại khách hàng';
      return 'Tổng quan chất lượng';
    }
    if (tab === 'field') return 'Lỗi hiện trường';
    if (tab === 'complaint') return 'Khiếu nại khách hàng';
    if (tab === 'capa') return 'Quản lý CAPA';
    return 'Danh sách lỗi';
  }

  if (cleanPath === '/admin/claims') {
    if (tab === 'dashboard') {
      return 'Dashboard Khiếu nại khách hàng';
    }
    return 'Khiếu nại khách hàng';
  }

  if (cleanPath === '/admin/products') {
    if (tab === 'materials') {
      return 'BOM vật tư';
    }
    return 'BOM sản phẩm';
  }

  // 2. Tra cứu theo bảng ROUTE_TITLE_MAP chính xác
  if (ROUTE_TITLE_MAP[cleanPath]) {
    return ROUTE_TITLE_MAP[cleanPath];
  }

  // 3. Khớp các trang con (Edit/Create/Detail lồng nhau)
  if (cleanPath.startsWith('/admin/users/permissions/')) return 'Phân quyền người dùng';
  if (cleanPath.startsWith('/admin/users/edit/')) return 'Chỉnh sửa tài khoản';
  if (cleanPath.startsWith('/admin/inspection-guides/edit/')) return 'Chỉnh sửa HDKT';
  if (cleanPath.startsWith('/admin/sos-guides/edit/')) return 'Chỉnh sửa SOS';
  if (cleanPath.startsWith('/admin/ctq-guides/edit/')) return 'Chỉnh sửa CTQ';
  if (cleanPath.startsWith('/admin/iso-documents/edit/')) return 'Chỉnh sửa mẫu tài liệu ISO';
  if (cleanPath.startsWith('/admin/iso-processes/edit/')) return 'Chỉnh sửa quy trình ISO';
  if (cleanPath.startsWith('/admin/iso-records/')) return 'Chi tiết hồ sơ ISO';
  if (cleanPath.startsWith('/admin/reports/detail/')) return 'Chi tiết báo cáo kiểm tra';
  if (cleanPath.startsWith('/admin/quality-records/')) return 'Chi tiết hồ sơ chất lượng';
  if (cleanPath.startsWith('/admin/violations/edit/')) return 'Chỉnh sửa biên bản vi phạm';
  if (cleanPath.startsWith('/admin/capa/edit/')) return 'Chỉnh sửa CAPA';
  if (cleanPath.startsWith('/admin/equipment/training/detail/')) return 'Chi tiết đào tạo thiết bị';
  if (cleanPath.startsWith('/admin/equipment/detail/')) return 'Chi tiết thiết bị';
  if (cleanPath.startsWith('/admin/equipment/handover/')) return 'Bàn giao thiết bị';
  if (cleanPath.startsWith('/admin/machines/detail/')) return 'Chi tiết máy móc';
  if (cleanPath.startsWith('/admin/screens/')) return 'Chi tiết màn hình';
  if (cleanPath.startsWith('/admin/products/')) return 'Chi tiết BOM sản phẩm';
  if (cleanPath.startsWith('/admin/production-orders/')) return 'Chi tiết lệnh sản xuất';
  if (cleanPath === '/admin/daily-production/create') return 'Thiết lập gộp Cont & SX hôm nay';
  if (cleanPath.startsWith('/admin/daily-production/edit/')) return 'Chỉnh sửa bảng SX hôm nay';
  if (cleanPath.startsWith('/admin/daily-production/')) return 'Chi tiết bảng SX hôm nay';
  if (cleanPath.startsWith('/admin/plan/')) return 'Chi tiết kế hoạch sản xuất';
  if (cleanPath.startsWith('/admin/orders/')) return 'Chi tiết đơn hàng sản xuất';
  if (cleanPath.startsWith('/admin/export-orders/')) return 'Chi tiết đơn hàng xuất khẩu';
  if (cleanPath.startsWith('/admin/purchase-requisitions/')) return 'Chi tiết đơn mua hàng';

  // 4. Khớp theo prefix dài nhất nếu có
  const sortedKeys = Object.keys(ROUTE_TITLE_MAP).sort((a, b) => b.length - a.length);
  for (const routeKey of sortedKeys) {
    if (routeKey !== '/admin' && cleanPath.startsWith(routeKey)) {
      return ROUTE_TITLE_MAP[routeKey];
    }
  }

  // Fallback thân thiện
  const lastSegment = cleanPath.split('/').filter(Boolean).pop();
  if (lastSegment) {
    return lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  return 'Trang chủ';
};

export default resolvePageTitle;

