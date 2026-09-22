import React from 'react';
import { Menu, Bell, LayoutDashboard } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useScreen } from '../context/ScreenContext';
import useUiStore from '../store/uiStore';

/**
 * Header component for Admin Portal Layout
 * Renders title, subtitle, sidebar toggle button, AI OCR tabs, and notification trigger.
 */
const Header = ({ onToggleSidebar, isSidebarCollapsed, customTitle, customSubtitle, headerExtra, headerRightExtra }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getScreenInfo } = useScreen();
  const screenInfo = getScreenInfo(location.pathname);
  const { isNotificationOpen, toggleNotification, toggleLpnDashboard } = useUiStore();

  const isLpnCrawlerPage = location.pathname.includes('lpn-crawler');
  const isAiOcrPage = location.pathname.includes('ai-ocr-train');
  const currentAiTab = searchParams.get('tab') || 'test';

  const handleAiTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const title = isAiOcrPage 
    ? 'Huấn Luyện & Kiểm Thử Mô Hình AI OCR Đọc Nhãn' 
    : (customTitle || screenInfo.title || 'Hệ thống SmartFlow');

  const subtitle = isAiOcrPage 
    ? '' 
    : (customSubtitle || screenInfo.subtitle || '');

  return (
    <header className="admin-header">
      <div className="header-left" style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
        <button 
          className="toggle-sidebar-btn" 
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "Mở menu" : "Thu gọn menu"}
          aria-label="Toggle Sidebar"
          style={{ flexShrink: 0 }}
        >
          <Menu size={20} />
        </button>
        <div className="header-titles" style={{ minWidth: 0, flexShrink: 0 }}>
          <h1 className="header-page-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
          {subtitle && <p className="header-page-subtitle">{subtitle}</p>}
        </div>

        {!isAiOcrPage && headerExtra && (
          <div className="header-extra-content" style={{ display: 'flex', alignItems: 'center', minWidth: 0, flexShrink: 1, marginLeft: '6px' }}>
            {headerExtra}
          </div>
        )}
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {isAiOcrPage && (
          <div className="ai-mode-tabs-header" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className={`ai-mode-tab-btn ${currentAiTab === 'training' ? 'active' : ''}`}
              onClick={() => handleAiTabChange('training')}
            >
              1. Huấn Luyện Model
            </button>
            <button
              type="button"
              className={`ai-mode-tab-btn ${currentAiTab === 'results' ? 'active' : ''}`}
              onClick={() => handleAiTabChange('results')}
            >
              2. Kết Quả & Biểu Đồ
            </button>
            <button
              type="button"
              className={`ai-mode-tab-btn ${currentAiTab === 'test' ? 'active' : ''}`}
              onClick={() => handleAiTabChange('test')}
            >
              3. Kiểm Thử Dữ Liệu Thực Tế
            </button>
          </div>
        )}

        {/* Nút Dashboard tổng quan đặt bên cạnh nút chuông khi ở màn hình LPN Crawler */}
        {isLpnCrawlerPage && (
          <button
            type="button"
            className="header-lpn-dashboard-btn"
            onClick={toggleLpnDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '34px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1.5px solid #EADCC9',
              backgroundColor: '#FFFFFF',
              color: '#4A2E1B',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 5px rgba(123, 82, 51, 0.08)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FAF6F0';
              e.currentTarget.style.borderColor = '#7B5233';
              e.currentTarget.style.color = '#7B5233';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#EADCC9';
              e.currentTarget.style.color = '#4A2E1B';
            }}
            title="Bấm để mở Dashboard tổng quan dữ liệu toàn thời gian"
          >
            <LayoutDashboard size={16} color="#7B5233" />
            <span>Dashboard</span>
          </button>
        )}

        {/* Custom Actions đặt bên cạnh nút chuông */}
        {headerRightExtra}

        <div className="header-notification-wrapper">
          <button 
            className="toggle-sidebar-btn" 
            onClick={toggleNotification}
            title="Thông báo"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="bell-badge"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
