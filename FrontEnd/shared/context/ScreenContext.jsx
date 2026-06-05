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
    // Ho tro ca duong dan dong co tham so (vi du: /manufacture/plan/123 -> /manufacture/plan/:id)
    let matchedPath = path;
    
    // Xu ly phat hien va chuan hoa cac duong dan co :id hoac cac tham so dong khac
    const paths = Object.keys(screensMap);
    const found = paths.find(p => {
      if (!p.includes(':')) return p === path;
      // Chuyen '/manufacture/plan/:id' thanh regex '^/manufacture/plan/[^/]+$'
      const regexPattern = '^' + p.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
      const regex = new RegExp(regexPattern);
      return regex.test(path);
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
        screenCode: '',
        title: 'Quản lý danh mục lỗi',
        subtitle: 'Cấu hình danh sách các lỗi kiểm tra chất lượng',
        isActive: true
      };
    }
    if (path.includes('screens')) {
      return {
        screenCode: '',
        title: 'Quản lý Màn hình',
        subtitle: 'Cấu hình và thiết kế giao diện',
        isActive: true
      };
    }
    if (path.includes('users')) {
      return {
        screenCode: '',
        title: 'Quản lý người dùng',
        subtitle: 'Phân quyền cho tài khoản',
        isActive: true
      };
    }
    if (path.includes('dashboard')) {
      return {
        screenCode: '',
        title: 'Trang chủ',
        subtitle: 'Tổng quan hệ thống',
        isActive: true
      };
    }
    if (path.includes('handovers')) {
      return {
        screenCode: '',
        title: 'Danh sách bàn giao',
        subtitle: 'Quản lý tài sản và bàn giao',
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
