import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useScreen } from '../context/ScreenContext';
import useUiStore from '../store/uiStore';

/**
 * Header component for Admin Portal Layout
 * Renders title, subtitle, sidebar toggle button and notification trigger.
 */
const Header = ({ onToggleSidebar, isSidebarCollapsed, customTitle, customSubtitle, headerExtra }) => {
  const { getScreenInfo } = useScreen();
  const screenInfo = getScreenInfo(window.location.pathname);
  const { isNotificationOpen, toggleNotification } = useUiStore();

  const title = customTitle || screenInfo.title || 'Hệ thống SmartFlow';
  const subtitle = customSubtitle || screenInfo.subtitle || '';

  return (
    <header className="admin-header">
      <div className="header-left">
        <button 
          className="toggle-sidebar-btn" 
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "Mở menu" : "Thu gọn menu"}
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="header-titles">
          <h1 className="header-page-title">{title}</h1>
          {subtitle && <p className="header-page-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {headerExtra && <div className="header-extra-content">{headerExtra}</div>}
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
