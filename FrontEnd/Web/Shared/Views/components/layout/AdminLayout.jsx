import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { authService } from '@web/Auth/Models/auth.service';
import { useScreen } from '@shared/context/ScreenContext';

/**
 * Layout: Khung bao quát chung cho tất cả các trang Admin
 * Chứa Sidebar, Header và cơ chế điều phối nội dung
 */
const AdminLayout = () => {
  const [sidebarActive, setSidebarActive] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { getScreenInfo } = useScreen();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const queryParams = new URLSearchParams(location.search);
  const isPreview = queryParams.get('preview') === 'true';

  if (isPreview) {
    return (
      <div className="preview-mode-layout" style={{ background: '#FAF6F0', minHeight: '100vh', padding: '15px' }}>
        <Outlet />
      </div>
    );
  }

  const { screenCode, title, subtitle } = getScreenInfo(location.pathname);

  return (
    <div className="admin-layout">
      {/* Backdrop cho Mobile */}
      {sidebarActive && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarActive(false)}
        ></div>
      )}

      {/* Sidebar tái sử dụng */}
      <Sidebar 
        active={sidebarActive} 
        onLogout={handleLogout} 
      />

      {/* Vùng nội dung chính */}
      <div className="admin-main">
        {/* Header chung */}
        <header className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="header-left">
              <button 
                className="toggle-sidebar-btn"
                onClick={() => setSidebarActive(!sidebarActive)}
              >
                ☰
              </button>
              <div className="header-titles">
                <h2 className="header-page-title">{title}</h2>
                <p className="header-page-subtitle">
                  {screenCode && <span>{screenCode} · </span>}
                  {subtitle}
                </p>
              </div>
            </div>

            {location.pathname.includes('screens/') && (
              <button 
                onClick={() => navigate('/admin/screens')}
                style={{
                  background: 'none',
                  border: '1px solid #7B5233',
                  color: '#7B5233',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#7B5233';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#7B5233';
                }}
              >
                ← Quay lại
              </button>
            )}
          </div>
        </header>

        {/* Nội dung thay đổi theo Route */}
        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background-color: #F8F9FA;
          position: relative;
        }
        .sidebar-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 999;
          backdrop-filter: blur(2px);
        }
        .admin-main {
          flex: 1;
          margin-left: var(--sidebar-width);
          transition: var(--transition);
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .admin-header {
          padding: 15px 30px;
          background: white;
          border-bottom: 1px solid #eee;
          position: sticky;
          top: 0;
          z-index: 900;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .header-page-title {
          font-size: 1.5rem;
          color: #2D1A12;
          font-weight: 700;
          margin: 0;
        }
        .header-page-subtitle {
          font-size: 0.9rem;
          color: #888;
          margin: 0;
        }
        .dashboard-content {
          padding: 30px;
          flex: 1;
          background-color: #F8F9FA;
        }

        /* Responsive */
        @media (min-width: 993px) {
          .toggle-sidebar-btn {
            display: none !important;
          }
        }
        @media (max-width: 992px) {
          .admin-main {
            margin-left: 80px;
          }
        }
        @media (max-width: 768px) {
          .admin-main {
            margin-left: 0;
          }
          .toggle-sidebar-btn {
            display: block;
          }
           .dashboard-content {
            padding: 15px;
          }
        }
      `}} />
    </div>
  );
};

export default AdminLayout;
