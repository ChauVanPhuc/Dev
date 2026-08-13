import React, { createContext, useContext, useState, useEffect } from 'react';
import { screenService } from '@modules/System/Models/screen.service';

const ScreenContext = createContext(null);

export const DEFAULT_SCREENS_REGISTRY = {
  "/login": { code: "LG01", title: "Đăng nhập", subtitle: "Xác thực truy cập hệ thống" },
  "/admin/dashboard": { code: "TC01", title: "Bảng điều khiển hệ thống", subtitle: "Tổng quan vận hành và chỉ số KPI toàn nhà máy" },
  "/admin/profile": { code: "HS01", title: "Hồ sơ cá nhân", subtitle: "Thông tin tài khoản và phân quyền người dùng" },
  "/admin/users": { code: "HT01", title: "Quản lý tài khoản", subtitle: "Danh sách người dùng và phân quyền truy cập" },
  "/admin/users/create": { code: "HT02", title: "Thêm mới tài khoản", subtitle: "Tạo người dùng mới trong hệ thống" },
  "/admin/users/edit/:id": { code: "HT03", title: "Chỉnh sửa tài khoản", subtitle: "Cập nhật thông tin và phân quyền người dùng" },
  "/admin/users/permissions/:id": { code: "HT04", title: "Phân quyền tài khoản", subtitle: "Cấu hình quyền hạn theo chức năng" },
  "/admin/users/departments": { code: "HT05", title: "Quản lý phòng ban", subtitle: "Danh mục phòng ban và phân cấp trực thuộc" },
  "/admin/users/positions": { code: "HT06", title: "Quản lý vị trí", subtitle: "Danh mục chức danh và vị trí công việc" },
  "/admin/hr/org-chart": { code: "NS01", title: "Sơ đồ tổ chức", subtitle: "Cây cơ cấu tổ chức nhân sự toàn doanh nghiệp" },
  "/admin/hr/hierarchy": { code: "NS02", title: "Sơ đồ cấp bậc", subtitle: "Cấu trúc phân cấp quản trị và báo cáo" },
  "/admin/hr/personnel": { code: "NS03", title: "Sơ đồ nhân sự", subtitle: "Phân bổ nhân sự theo bộ phận và vị trí" },
  "/admin/hr/factory": { code: "NS04", title: "Cấu trúc nhà máy", subtitle: "Sơ đồ phân bổ nhân lực tại các phân xưởng" },
  "/admin/hr/structures": { code: "NS05", title: "Quản lý cấu trúc nhân sự", subtitle: "Thiết lập phân cấp và chốt chặn quy trình" },
  "/admin/hr/employees": { code: "NS06", title: "Hồ sơ nhân viên", subtitle: "Quản lý danh sách và hồ sơ nhân sự" },
  "/admin/employees": { code: "NS07", title: "Quản lý nhân sự", subtitle: "Thông tin hồ sơ và chức danh chi tiết" },
  "/admin/handovers": { code: "GH01", title: "Danh sách bàn giao", subtitle: "Theo dõi và quản lý các biên bản giao nhận hàng hóa" },
  "/admin/manufacture-handover": { code: "GH02", title: "Bàn giao sản xuất", subtitle: "Lập và theo dõi phiếu bàn giao sản phẩm sản xuất" },
  "/admin/manufacture-receive": { code: "GH03", title: "Nhận hàng sản xuất", subtitle: "Xác nhận và tiếp nhận thành phẩm giao nộp" },
  "/admin/logs": { code: "HT07", title: "Nhật ký hệ thống", subtitle: "Ghi nhận sự cố và lịch sử thao tác người dùng" },
  "/admin/inspection-guides": { code: "HD01", title: "Hướng dẫn kiểm tra HDKT", subtitle: "Quy chuẩn hướng dẫn kiểm tra chất lượng sản phẩm" },
  "/admin/inspection-guides/create": { code: "HD02", title: "Tạo mới HDKT", subtitle: "Thiết lập tiêu chuẩn hướng dẫn kiểm tra mới" },
  "/admin/inspection-guides/edit/:id": { code: "HD03", title: "Chi tiết HDKT", subtitle: "Cập nhật nội dung tiêu chuẩn kiểm tra" },
  "/admin/sos-guides": { code: "HD04", title: "Hướng dẫn thao tác SOS", subtitle: "Quy trình thao tác chuẩn tại từng công đoạn" },
  "/admin/sos-guides/create": { code: "HD05", title: "Tạo mới SOS", subtitle: "Xây dựng hướng dẫn thao tác chuẩn" },
  "/admin/sos-guides/edit/:id": { code: "HD06", title: "Chi tiết SOS", subtitle: "Chỉnh sửa quy chuẩn thao tác công đoạn" },
  "/admin/ctq-guides": { code: "HD07", title: "Đặc tính trọng yếu CTQ", subtitle: "Tiêu chuẩn kiểm soát các thông số chất lượng then chốt" },
  "/admin/ctq-guides/create": { code: "HD08", title: "Tạo mới CTQ", subtitle: "Thiết lập tiêu chuẩn kiểm soát trọng yếu" },
  "/admin/ctq-guides/edit/:id": { code: "HD09", title: "Chi tiết CTQ", subtitle: "Cập nhật tiêu chí kiểm soát chất lượng then chốt" },
  "/admin/defects": { code: "CL01", title: "Danh mục lỗi sản phẩm", subtitle: "Quản lý mã lỗi và phân loại nguyên nhân phát sinh" },
  "/admin/reports": { code: "CL02", title: "Báo cáo kiểm tra", subtitle: "Tổng hợp kết quả kiểm tra chất lượng định kỳ" },
  "/admin/reports/detail/:type/:id": { code: "CL03", title: "Chi tiết kiểm tra", subtitle: "Biên bản đánh giá chất lượng chi tiết" },
  "/admin/quality": { code: "CL04", title: "Tổng quan chất lượng", subtitle: "Theo dõi tỷ lệ lỗi và năng suất chất lượng toàn nhà máy" },
  "/admin/quality-records": { code: "CL05", title: "Hồ sơ chất lượng", subtitle: "Lưu trữ biên bản kiểm tra công đoạn và đầu vào" },
  "/admin/quality-records/:id": { code: "CL06", title: "Chi tiết hồ sơ chất lượng", subtitle: "Xem và xác nhận biên bản kiểm tra" },
  "/admin/iso-documents": { code: "ISO1", title: "Tài liệu ISO", subtitle: "Hệ thống quy trình và tài liệu tiêu chuẩn ISO" },
  "/admin/iso-processes": { code: "ISO2", title: "Quy trình ISO", subtitle: "Sơ đồ và luồng thực thi quy trình tiêu chuẩn" },
  "/admin/iso-documents/edit/:id": { code: "ISO3", title: "Chỉnh sửa tài liệu ISO", subtitle: "Soạn thảo biểu mẫu và tài liệu ISO" },
  "/admin/iso-processes/edit/:id": { code: "ISO4", title: "Chỉnh sửa quy trình ISO", subtitle: "Cập nhật các bước và điều kiện quy trình" },
  "/admin/kpi": { code: "KPI1", title: "Báo cáo KPI", subtitle: "Đánh giá hiệu suất làm việc và chỉ tiêu chất lượng" },
  "/admin/kpi/checklist": { code: "KPI2", title: "Checklist đánh giá", subtitle: "Bảng kiểm tra đánh giá định kỳ theo tiêu chí" },
  "/admin/kpi/items": { code: "KPI3", title: "Hạng mục KPI", subtitle: "Danh mục các chỉ số đánh giá trọng yếu" },
  "/admin/kpi/list": { code: "KPI3", title: "Danh sách chỉ số KPI", subtitle: "Quản lý danh mục chỉ số hiệu suất" },
  "/admin/kpi/rules": { code: "KPI4", title: "Quy tắc thưởng phạt KPI", subtitle: "Thiết lập thang điểm và mức độ thưởng phạt" },
  "/admin/kpi/feedback": { code: "KPI5", title: "Phản hồi đánh giá", subtitle: "Ý kiến đóng góp và cải tiến chất lượng đánh giá" },
  "/admin/violations": { code: "VP01", title: "Lịch sử vi phạm", subtitle: "Ghi nhận và xử lý các sự vụ vi phạm quy trình" },
  "/admin/violations/create": { code: "VP02", title: "Lập biên bản vi phạm", subtitle: "Tạo mới biên bản ghi nhận sai lỗi hoặc vi phạm" },
  "/admin/violations/edit/:id": { code: "VP03", title: "Chi tiết biên bản vi phạm", subtitle: "Cập nhật quá trình xử lý vi phạm" },
  "/admin/capa": { code: "CP01", title: "Hành động khắc phục CAPA", subtitle: "Theo dõi tiến độ khắc phục và phòng ngừa sự cố" },
  "/admin/capa/create": { code: "CP02", title: "Lập phiếu CAPA", subtitle: "Khởi tạo yêu cầu hành động khắc phục phòng ngừa" },
  "/admin/capa/edit/:id": { code: "CP03", title: "Chi tiết phiếu CAPA", subtitle: "Phân tích nguyên nhân và phương án giải quyết" },
  "/admin/feedback": { code: "CP04", title: "Sáng kiến cải tiến", subtitle: "Đề xuất và theo dõi các sáng kiến Kaizen" },
  "/admin/hotspots": { code: "HT08", title: "Bản đồ nhiệt lỗi Hotspots", subtitle: "Phân tích điểm nóng phát sinh lỗi trên chuyền" },
  "/admin/data": { code: "HT09", title: "Đóng gói dữ liệu", subtitle: "Sao lưu và trích xuất gói dữ liệu hệ thống" },
  "/admin/screens": { code: "HT10", title: "Quản lý màn hình", subtitle: "Cấu hình mã màn hình, tiêu đề và phân hệ trực quan" },
  "/admin/screens/bugs": { code: "HT11", title: "Quản lý lỗi màn hình", subtitle: "Tiếp nhận và xử lý phản ánh lỗi giao diện/tính năng" },
  "/admin/screens/progress": { code: "HT12", title: "Tiến độ dự án", subtitle: "Theo dõi tỷ lệ hoàn thiện các màn hình và chức năng" },
  "/admin/screens/:id": { code: "HT13", title: "Đặc tả chi tiết màn hình", subtitle: "Thiết kế thành phần và kịch bản nghiệp vụ" },
  "/admin/sidebar": { code: "HT14", title: "Quản lý menu điều hướng", subtitle: "Thiết lập cấu trúc thanh điều hướng sidebar" },
  "/admin/system-config": { code: "HT15", title: "Cấu hình hệ thống", subtitle: "Thông số kỹ thuật và thiết lập tham số ERP" },
  "/admin/system-monitor": { code: "HT16", title: "Giám sát tài nguyên", subtitle: "Theo dõi hiệu năng máy chủ và tiến trình nền" },
  "/admin/monitor": { code: "HT16", title: "Giám sát hệ thống", subtitle: "Tình trạng hoạt động của các dịch vụ hệ thống" },
  "/admin/equipment": { code: "TB01", title: "Quản lý trang thiết bị", subtitle: "Theo dõi tình trạng và phân bổ thiết bị" },
  "/admin/equipment/categories": { code: "TB02", title: "Danh mục thiết bị", subtitle: "Phân loại trang thiết bị và nhóm công cụ" },
  "/admin/equipment/history": { code: "TB03", title: "Lịch sử thiết bị", subtitle: "Nhật ký vận hành, bảo dưỡng và bàn giao" },
  "/admin/equipment/training": { code: "TB04", title: "Đào tạo thiết bị", subtitle: "Kế hoạch hướng dẫn sử dụng và vận hành thiết bị" },
  "/admin/equipment/handover": { code: "TB05", title: "Bàn giao thiết bị", subtitle: "Biên bản bàn giao công cụ dụng cụ" },
  "/admin/equipment/handover/:id": { code: "TB06", title: "Chi tiết bàn giao thiết bị", subtitle: "Xem biên bản giao nhận trang thiết bị" },
  "/admin/equipment/detail/:id": { code: "TB07", title: "Hồ sơ thiết bị", subtitle: "Thông số kỹ thuật và lý lịch chi tiết" },
  "/admin/equipment/training/detail/:id": { code: "TB08", title: "Chi tiết đào tạo thiết bị", subtitle: "Nội dung khóa huấn luyện vận hành thiết bị" },
  "/admin/machines": { code: "MM01", title: "Quản lý máy móc", subtitle: "Danh sách dây chuyền và máy móc sản xuất" },
  "/admin/machines/history": { code: "MM02", title: "Lịch sử máy móc", subtitle: "Nhật ký bảo trì và sự cố máy" },
  "/admin/machines/training": { code: "MM03", title: "Đào tạo vận hành máy", subtitle: "Quy trình đào tạo an toàn và kỹ thuật vận hành máy" },
  "/admin/machines/detail/:id": { code: "MM04", title: "Hồ sơ máy móc", subtitle: "Thông tin chi tiết và thông số kỹ thuật máy móc" },
  "/admin/manufacture-dashboard": { code: "SX01", title: "Bảng điều khiển sản xuất", subtitle: "Chỉ số sản lượng và tiến độ phân xưởng" },
  "/admin/plan": { code: "SX02", title: "Kế hoạch sản xuất", subtitle: "Lập và theo dõi kế hoạch thực thi đơn hàng" },
  "/admin/plan/create": { code: "SX03", title: "Lập kế hoạch sản xuất", subtitle: "Khởi tạo kế hoạch sản xuất mới" },
  "/admin/plan/:id": { code: "SX04", title: "Chi tiết kế hoạch", subtitle: "Xem tiến độ và phân bổ công đoạn đơn hàng" },
  "/admin/delivery-tracking": { code: "GH04", title: "Theo dõi giao nhận", subtitle: "Giám sát lộ trình và trạng thái vận chuyển hàng" },
  "/admin/production-dashboard": { code: "SX05", title: "Bảng điều khiển vận hành", subtitle: "Theo dõi năng suất chuyền và hiệu suất OEE" },
  "/admin/production-orders": { code: "SX06", title: "Lệnh sản xuất", subtitle: "Danh sách lệnh sản xuất và định mức vật tư" },
  "/admin/production-orders/:id": { code: "SX07", title: "Chi tiết lệnh sản xuất", subtitle: "Theo dõi cấp phát và tiến độ hoàn thành lệnh" },
  "/admin/production-schedule": { code: "SX08", title: "Lịch trình sản xuất", subtitle: "Phân bổ thời gian biểu cho từng công đoạn" },
  "/admin/production-routing": { code: "SX09", title: "Quy trình công nghệ routing", subtitle: "Định tuyến công đoạn sản xuất cho sản phẩm" },
  "/admin/technical-dashboard": { code: "KT01", title: "Tổng quan kỹ thuật", subtitle: "Chỉ số tiêu chuẩn kỹ thuật và định mức sản phẩm" },
  "/admin/technical-standards": { code: "KT02", title: "Tiêu chuẩn kỹ thuật", subtitle: "Quản lý dung sai và thông số kỹ thuật sản phẩm" },
  "/admin/maintenance": { code: "BT01", title: "Bảo trì cơ sở hạ tầng", subtitle: "Kế hoạch bảo dưỡng và kiểm định định kỳ" },
  "/admin/products": { code: "SP01", title: "Danh mục sản phẩm", subtitle: "Quản lý mã sản phẩm, BOM và quy cách" },
  "/admin/products/create": { code: "SP02", title: "Tạo mới sản phẩm", subtitle: "Khai báo sản phẩm và cấu trúc BOM mới" },
  "/admin/products/:id": { code: "SP03", title: "Chi tiết sản phẩm", subtitle: "Thông tin chi tiết, định mức và công đoạn" },
  "/admin/product-details": { code: "SP04", title: "Thuộc tính sản phẩm", subtitle: "Quản lý chi tiết thông số và biến thể linh kiện" },
  "/admin/paint-colors": { code: "SP05", title: "Màu sơn", subtitle: "Danh mục màu sơn tiêu chuẩn và công thức pha" },
  "/admin/progress/:id": { code: "SX10", title: "Tiến độ sản xuất", subtitle: "Báo cáo tiến độ chi tiết theo từng đơn hàng" },
  "/admin/production-progress/:id": { code: "SX10", title: "Tiến độ sản xuất", subtitle: "Báo cáo tiến độ chi tiết theo từng đơn hàng" },
  "/admin/orders": { code: "DH01", title: "Đơn hàng sản xuất", subtitle: "Quản lý đơn hàng khách hàng và hợp đồng" },
  "/admin/orders/create": { code: "DH02", title: "Tạo mới đơn hàng", subtitle: "Khởi tạo đơn đặt hàng mới từ khách hàng" },
  "/admin/orders/edit/:id": { code: "DH03", title: "Chỉnh sửa đơn hàng", subtitle: "Cập nhật số lượng, thời gian và sản phẩm đơn hàng" },
  "/admin/orders/:id": { code: "DH04", title: "Chi tiết đơn hàng", subtitle: "Xem thông tin đơn hàng và tiến độ thực hiện" },
  "/admin/customers": { code: "DH05", title: "Danh mục khách hàng", subtitle: "Hồ sơ đối tác và lịch sử giao dịch" },
  "/admin/backup-qrs": { code: "QR01", title: "Mã QR dự phòng", subtitle: "Quản lý và cấp phát mã QR dự phòng cho chuyền" },
  "/admin/exception-deliveries": { code: "GH05", title: "Giao hàng ngoại lệ", subtitle: "Xử lý các trường hợp giao hàng bất thường hoặc hoàn hàng" },
  "/admin/purchase-requisitions": { code: "MH01", title: "Yêu cầu mua hàng", subtitle: "Danh sách phiếu đề nghị vật tư mua sắm" },
  "/admin/purchase-requisitions/:id": { code: "MH02", title: "Chi tiết yêu cầu mua hàng", subtitle: "Phê duyệt và theo dõi trạng thái đề xuất mua hàng" },
  "/admin/purchase-order-items": { code: "MH03", title: "Hạng mục đặt hàng", subtitle: "Quản lý các mặt hàng trong đơn mua sắm" },
  "/admin/order-shipping-monitoring": { code: "MH04", title: "Giám sát giao hàng NCC", subtitle: "Theo dõi tiến độ giao hàng từ nhà cung cấp" },
  "/admin/claims": { code: "CL05", title: "Khiếu nại khách hàng", subtitle: "Tiếp nhận và xử lý khiếu nại sản phẩm từ khách hàng" },
  "/admin/prices": { code: "CL06", title: "Bảng giá khiếu nại", subtitle: "Bảng giá quy định bồi thường và xử lý khiếu nại" },
  "/admin/shipments": { code: "CL07", title: "Lô hàng giao nộp", subtitle: "Quản lý danh sách các lô hàng xuất xưởng" }
};

export const ScreenProvider = ({ children }) => {
  const [screensMap, setScreensMap] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchScreens = async () => {
    try {
      setLoading(true);
      const data = await screenService.getScreensMap('Web');
      setScreensMap(data || {});
    } catch (error) {
      console.error('Failed to fetch screen configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreens();
  }, []);

  const normalizePathForMatching = (p) => {
    if (!p) return '';
    return p
      .trim()
      .replace(/^\//, '')
      .replace(/^(api\/v\d+\/|api\/|admin\/|manufacture\/)/i, '')
      .replace(/\/$/, '');
  };

  const getScreenInfo = (path) => {
    if (!path) {
      return {
        screenCode: '',
        title: 'Hệ thống ERP G7',
        subtitle: 'Quản trị dự án',
        isActive: true
      };
    }

    const lookupPathNormalized = normalizePathForMatching(path);
    const dbScreensList = Object.values(screensMap || {});

    // 1. PRIMARY MATCH: Search screensMap by backend_path
    let matchedScreen = dbScreensList.find(s => {
      if (!s.backend_path) return false;
      const bNorm = normalizePathForMatching(s.backend_path);
      if (!bNorm.includes(':')) return bNorm === lookupPathNormalized;
      const regexPattern = '^' + bNorm.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
      try { return new RegExp(regexPattern).test(lookupPathNormalized); } catch { return false; }
    });

    // 2. SECONDARY MATCH: Search screensMap by route_path
    if (!matchedScreen) {
      matchedScreen = dbScreensList.find(s => {
        if (!s.route_path) return false;
        const rNorm = normalizePathForMatching(s.route_path);
        if (!rNorm.includes(':')) return rNorm === lookupPathNormalized;
        const regexPattern = '^' + rNorm.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
        try { return new RegExp(regexPattern).test(lookupPathNormalized); } catch { return false; }
      });
    }

    if (matchedScreen) {
      return {
        screenCode: matchedScreen.current_code || matchedScreen.default_code || '',
        title: matchedScreen.title || '',
        subtitle: matchedScreen.subtitle || '',
        isActive: matchedScreen.is_active !== false
      };
    }

    // 3. Match against DEFAULT_SCREENS_REGISTRY
    if (DEFAULT_SCREENS_REGISTRY[path]) {
      const def = DEFAULT_SCREENS_REGISTRY[path];
      return {
        screenCode: def.code || '',
        title: def.title || '',
        subtitle: def.subtitle || '',
        isActive: true
      };
    }

    const defaultPaths = Object.keys(DEFAULT_SCREENS_REGISTRY);
    let defKey = defaultPaths.find(p => normalizePathForMatching(p) === lookupPathNormalized);
    if (!defKey) {
      defKey = defaultPaths.find(p => {
        const pNorm = normalizePathForMatching(p);
        if (!pNorm.includes(':')) return false;
        const regexPattern = '^' + pNorm.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
        try {
          return new RegExp(regexPattern).test(lookupPathNormalized);
        } catch {
          return false;
        }
      });
    }

    if (defKey && DEFAULT_SCREENS_REGISTRY[defKey]) {
      const def = DEFAULT_SCREENS_REGISTRY[defKey];
      return {
        screenCode: def.code || '',
        title: def.title || '',
        subtitle: def.subtitle || '',
        isActive: true
      };
    }

    // Default fallback if not matched
    return {
      screenCode: '',
      title: 'Hệ thống ERP G7',
      subtitle: 'Quản trị dự án',
      isActive: true
    };
  };

  return (
    <ScreenContext.Provider value={{ screens: screensMap, loading, refreshScreens: fetchScreens, getScreenInfo }}>
      {children}
    </ScreenContext.Provider>
  );
};

export const useScreen = () => {
  const context = useContext(ScreenContext);
  if (!context) {
    throw new Error('useScreen must be used within a ScreenProvider');
  }
  return context;
};
