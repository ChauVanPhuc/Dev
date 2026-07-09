import React, { createContext, useContext, useState, useEffect } from 'react';
import { screenService } from '@modules/System/Models/screen.service';

const ScreenContext = createContext(null);

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

  const getScreenInfo = (path) => {
    // Custom override for machinery details
    if (path.includes('/machines/detail/')) {
      return {
        screenCode: 'MC37.5',
        title: 'Thông tin thiết bị máy móc',
        subtitle: 'Hồ sơ chi tiết thiết bị máy móc, lịch sử bảo dưỡng và hướng dẫn vận hành chuẩn.',
        isActive: true
      };
    }

    // Virtual Path Rewriter: Anh xa cac duong dan moi duoi /admin nguoc lai thanh /manufacture de khop DB cu
    let lookupPath = path;
    if (path === '/admin/manufacture-dashboard') {
      lookupPath = '/manufacture/dashboard';
    } else {
      const manufactureKeys = ['plan', 'delivery-tracking', 'products', 'progress', 'orders', 'backup-qrs', 'exception-deliveries'];
      const matchingKey = manufactureKeys.find(key => path.startsWith(`/admin/${key}`));
      if (matchingKey) {
        lookupPath = path.replace(`/admin/${matchingKey}`, `/manufacture/${matchingKey}`);
      }
    }

    // Ho tro ca duong dan dong co tham so (vi du: /manufacture/plan/123 -> /manufacture/plan/:id)
    let matchedPath = lookupPath;
    
    // Xu ly phat hien va chuan hoa cac duong dan co :id hoac cac tham so dong khac
    const paths = Object.keys(screensMap);
    const found = paths.find(p => {
      if (!p.includes(':')) return p === lookupPath;
      // Chuyen '/manufacture/plan/:id' thanh regex '^/manufacture/plan/[^/]+$'
      const regexPattern = '^' + p.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
      const regex = new RegExp(regexPattern);
      return regex.test(lookupPath);
    });

    if (found) {
      matchedPath = found;
    }

    const screen = screensMap[matchedPath];
    if (screen) {
      return {
        screenCode: screen.current_code,
        title: screen.title,
        subtitle: screen.subtitle,
        isActive: screen.is_active
      };
    }

    // Dynamic fallback titles based on route
    if (path.includes('defects')) {
      return {
        screenCode: 'AD12',
        title: 'Quản lý danh mục lỗi',
        subtitle: 'Cấu hình danh sách các lỗi kiểm tra chất lượng',
        isActive: true
      };
    }
    if (path.includes('screens')) {
      return {
        screenCode: 'AD14',
        title: 'Quản lý Màn hình',
        subtitle: 'Cấu hình và thiết kế giao diện',
        isActive: true
      };
    }
    if (path.includes('users')) {
      return {
        screenCode: 'AD3',
        title: 'Quản lý người dùng',
        subtitle: 'Phân quyền cho tài khoản',
        isActive: true
      };
    }
    if (path.includes('dashboard')) {
      return {
        screenCode: 'AD2',
        title: 'Trang chủ',
        subtitle: 'Tổng quan hệ thống',
        isActive: true
      };
    }
    if (path.includes('handovers')) {
      return {
        screenCode: 'AD4',
        title: 'Danh sách bàn giao',
        subtitle: 'Quản lý tài sản và bàn giao',
        isActive: true
      };
    }
    if (path.includes('quality-records')) {
      return {
        screenCode: 'AD13',
        title: 'Hồ sơ chất lượng',
        subtitle: 'Nhật ký và hồ sơ kiểm soát chất lượng',
        isActive: true
      };
    }
    if (path.includes('monitor')) {
      return {
        screenCode: 'AD15',
        title: 'Giám sát hệ thống & CSDL',
        subtitle: 'Theo dõi thời gian thực tài nguyên CPU, RAM, ổ đĩa và giới hạn kết nối của SQL Server',
        isActive: true
      };
    }
    if (path.includes('claims')) {
      return {
        screenCode: 'CL1',
        title: 'Khiếu nại khách hàng (Claim)',
        subtitle: 'Quản lý và giải quyết các khiếu nại chất lượng sản phẩm',
        isActive: true
      };
    }
    if (path.includes('prices')) {
      return {
        screenCode: 'CL2',
        title: 'Quản lý đơn giá',
        subtitle: 'Quản lý đơn giá sản phẩm và cấu hình chi phí',
        isActive: true
      };
    }
    if (path.includes('shipments')) {
      return {
        screenCode: 'CL3',
        title: 'Thông tin giao hàng (Claim)',
        subtitle: 'Theo dõi thông tin xuất xưởng hàng hóa khiếu nại',
        isActive: true
      };
    }

    // Default fallback
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
