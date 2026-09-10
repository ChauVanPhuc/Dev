import React, { createContext, useContext, useState } from 'react';

const ScreenContext = createContext(null);

export const ScreenProvider = ({ children }) => {
  const [screensMap] = useState({});
  const [loading] = useState(false);

  const refreshScreens = async () => {};

  const getScreenInfo = (path) => {
    if (path.includes('defects')) {
      return {
        screenCode: 'AD12',
        title: 'Quản lý danh mục lỗi',
        subtitle: 'Cấu hình danh sách các lỗi kiểm tra chất lượng',
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

    return {
      screenCode: '',
      title: 'Hệ thống SmartFlow',
      subtitle: 'Quản lý Claim, Giá tủ và Danh mục lỗi',
      isActive: true
    };
  };

  return (
    <ScreenContext.Provider value={{ screens: screensMap, loading, refreshScreens, getScreenInfo }}>
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
