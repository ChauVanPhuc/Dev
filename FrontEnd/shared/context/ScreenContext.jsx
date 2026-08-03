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
    if (path.includes('screens/bugs')) {
      return {
        screenCode: 'HD06',
        title: 'Danh sách lỗi hệ thống',
        subtitle: 'HD06: Hiển thị danh sách các lỗi được ghi nhận trên hệ thống',
        isActive: true
      };
    }
    if (path.includes('screens/progress')) {
      return {
        screenCode: 'HD07',
        title: 'Tiến độ thực hiện',
        subtitle: 'HD07: Tổng quan về tiến độ dự án',
        isActive: true
      };
    }

    // Custom override for machinery details
    if (path.includes('/machines/detail/')) {
      return {
        screenCode: 'MC37.5',
        title: 'Thông tin thiết bị máy móc',
        subtitle: 'Hồ sơ chi tiết thiết bị máy móc, lịch sử bảo dưỡng và hướng dẫn vận hành chuẩn.',
        isActive: true
      };
    }

    if (path.includes('order-shipping-monitoring')) {
      return {
        screenCode: 'KD04',
        title: 'Quản lý kinh doanh',
        subtitle: 'KD04: Giám sát tiến độ đơn hàng',
        isActive: true
      };
    }

    if (path.includes('production-dashboard')) {
      const dbScreen = screensMap['/admin/production-dashboard'];
      return {
        screenCode: dbScreen?.current_code || 'SX00',
        title: dbScreen?.title || 'Quản lý sản xuất',
        subtitle: dbScreen?.subtitle || 'SX00: Tổng quan phân hệ quản lý sản xuất',
        isActive: true
      };
    }
    if (path.includes('production-orders')) {
      const dbScreen = screensMap['/admin/production-orders'];
      return {
        screenCode: dbScreen?.current_code || 'SX01',
        title: dbScreen?.title || 'Lệnh sản xuất',
        subtitle: dbScreen?.subtitle || 'SX01: Danh sách lệnh sản xuất',
        isActive: true
      };
    }
    if (path.includes('production-schedule')) {
      const dbScreen = screensMap['/admin/production-schedule'];
      return {
        screenCode: dbScreen?.current_code || 'SX02',
        title: dbScreen?.title || 'Lịch sản xuất',
        subtitle: dbScreen?.subtitle || 'SX02: Tiến độ & lịch sản xuất nhà máy/xưởng',
        isActive: true
      };
    }
    if (path.includes('production-routing')) {
      const dbScreen = screensMap['/admin/production-routing'];
      return {
        screenCode: dbScreen?.current_code || 'SX04',
        title: dbScreen?.title || 'Quy trình sản xuất',
        subtitle: dbScreen?.subtitle || 'SX04: Sơ đồ luồng & quy trình sản xuất',
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

    const normalizePathForMatching = (p) => {
      if (!p) return '';
      return p.replace(/^\//, '').replace(/^(admin|manufacture)\//, '');
    };

    const lookupPathNormalized = normalizePathForMatching(lookupPath);
    
    // Xu ly phat hien va chuan hoa cac duong dan co :id hoac cac tham so dong khac
    const paths = Object.keys(screensMap);
    const found = paths.find(p => {
      const pNormalized = normalizePathForMatching(p);
      if (!pNormalized.includes(':')) {
        return pNormalized === lookupPathNormalized;
      }
      // Chuyen 'plan/:id' thanh regex '^plan/[^/]+$'
      const regexPattern = '^' + pNormalized.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
      const regex = new RegExp(regexPattern);
      return regex.test(lookupPathNormalized);
    });

    const screen = found ? screensMap[found] : null;
    if (screen) {
      return {
        screenCode: screen.current_code,
        title: screen.title,
        subtitle: screen.subtitle,
        isActive: screen.is_active
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
