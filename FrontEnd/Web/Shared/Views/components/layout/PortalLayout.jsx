import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, ArrowLeft, Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import BeautifulModal from '../feedback/BeautifulModal';
import ActivityFeed from '@modules/Dashboard/Views/components/ActivityFeed';
import { authService } from '@modules/Auth/Models/auth.service';
import { useScreen } from '@shared/context/ScreenContext';

/**
 * Layout: Khung bao quát chung (PortalLayout) cho cả hai module Admin và Manufacture.
 * Cung cấp Sidebar động, Header, Hộp thoại thông báo BeautifulModal, 
 * và tích hợp cơ chế Tải lên ngầm (Global Upload) cho Manufacture.
 */
const PortalLayout = () => {
  const [sidebarActive, setSidebarActive] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [customTitle, setCustomTitle] = useState(null);
  const [customSubtitle, setCustomSubtitle] = useState(null);
  const [customScreenCode, setCustomScreenCode] = useState(null);
  const [headerExtra, setHeaderExtra] = useState(null);
  const [modalConfig, setModalConfig] = useState({ visible: false, title: '', message: '', type: 'info' });
  const [uploads, setUploads] = useState([]);

  const notificationRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { getScreenInfo } = useScreen();

  const isAdmin = location.pathname.startsWith('/admin');

  // --- OUTSIDE CLICK FOR NOTIFICATIONS ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- LOGOUT HANDLER ---
  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // --- MODAL DIALOG DISPLAY ---
  const showModal = (title, message, type = 'info') => {
    setModalConfig({ visible: true, title, message, type });
  };

  // --- GLOBAL MULTI-UPLOAD STATE HANDLERS ---
  const updateUpload = (id, delta) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...delta } : u));
  };

  const removeUpload = (id) => {
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.id !== id));
    }, 5000);
  };

  const startGlobalUpload = async (file, endpoint, onComplete) => {
    const uploadId = Date.now().toString();
    const newUpload = {
      id: uploadId,
      active: true,
      progress: 0,
      processed: 0,
      total: 0,
      fileName: file.name,
      status: 'uploading'
    };

    setUploads(prev => [...prev, newUpload]);
    await new Promise(r => setTimeout(r, 100));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { API_URL } = await import('@webShared/Services/api.service');
      const response = await fetch(`${API_URL}${endpoint.replace(/^\/+/, '')}`, {
        method: 'POST',
        body: formData,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });

      if (!response.ok) throw new Error('Lỗi kết nối server');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialLine = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value || new Uint8Array(), { stream: true });
        const lines = (partialLine + chunk).split('\n');
        partialLine = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.total !== undefined) updateUpload(uploadId, { total: data.total });
            if (data.processed !== undefined) {
              updateUpload(uploadId, { processed: data.processed });
              setUploads(prev => prev.map(u => {
                if (u.id === uploadId) {
                  const p = Math.round((data.processed / (u.total || 1)) * 100);
                  return { ...u, progress: p > 100 ? 100 : p };
                }
                return u;
              }));
            }
            if (data.status === 'completed') {
              updateUpload(uploadId, { status: 'completed', progress: 100 });
              showModal("Thành công", `Đã xử lý xong file ${file.name}`, "success");
              if (onComplete) onComplete(data);
              removeUpload(uploadId);
              return;
            }
          } catch (e) {}
        }
      }
    } catch (error) {
      console.error("Lỗi upload ngầm:", error);
      updateUpload(uploadId, { status: 'error' });
      showModal("Lỗi", `Không thể upload file ${file.name}`, "error");
      removeUpload(uploadId);
    }
  };

  // --- MEMOIZE CONTEXT TO PREVENT UNNECESSARY CHILD RE-RENDERS ---
  const outletContext = React.useMemo(() => ({
    setCustomTitle, 
    setCustomSubtitle, 
    setCustomScreenCode,
    setHeaderExtra, 
    showModal,
    startGlobalUpload,
    activeUploads: uploads.length
  }), [uploads.length]); // Only update when upload count changes, setters are stable

  // --- PREVIEW MODE HANDLER ---
  const queryParams = new URLSearchParams(location.search);
  const isPreview = queryParams.get('preview') === 'true';

  if (isPreview) {
    return (
      <div className="preview-mode-layout" style={{ background: '#FAF6F0', minHeight: '100vh', padding: '15px' }}>
        <Outlet context={{ 
          setCustomTitle: () => {}, 
          setCustomSubtitle: () => {}, 
          setCustomScreenCode: () => {},
          setHeaderExtra: () => {}, 
          showModal,
          startGlobalUpload: () => {},
          activeUploads: 0
        }} />
      </div>
    );
  }

  // --- DYNAMIC HEADER TITLE MANAGEMENT ---
  const getPageTitles = () => {
    if (customTitle) {
      return { 
        screenCode: customScreenCode || '', 
        title: customTitle, 
        subtitle: customSubtitle || (isAdmin ? 'ERP G7 Admin' : 'ERP G7 Manufacture') 
      };
    }
    return getScreenInfo(location.pathname);
  };

  const { screenCode, title, subtitle } = getPageTitles();

  // Reset custom headers on transition
  useEffect(() => {
    setCustomTitle(null);
    setCustomSubtitle(null);
    setCustomScreenCode(null);
    setHeaderExtra(null);
  }, [location.pathname]);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const showBackButton = pathSegments.length >= 3;

  return (
    <div className="admin-layout">
      {/* Backdrop for Mobile Sidebar */}
      {sidebarActive && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarActive(false)}
        ></div>
      )}

      {/* Unified State-Aware Sidebar */}
      <Sidebar 
        active={sidebarActive} 
        onLogout={handleLogout} 
        onClose={() => setSidebarActive(false)}
        uploads={uploads}
      />

      {/* Main Content Pane */}
      <div className="admin-main">
        {/* Header Section */}
        <header className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="header-left">
              <button 
                className="toggle-sidebar-btn"
                onClick={() => setSidebarActive(!sidebarActive)}
              >
                <Menu size={20} />
              </button>
              <div className="header-titles">
                <h2 className="header-page-title">{title}</h2>
                <p className="header-page-subtitle">
                  {screenCode && <span>{screenCode} · </span>}
                  {subtitle}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {headerExtra && <div className="header-extra-content">{headerExtra}</div>}

              {/* Back button logic */}
              {showBackButton && (
                <button 
                  onClick={() => navigate(-1)}
                  style={{
                    background: 'none',
                    border: '1.5px solid #7B5233',
                    color: '#7B5233',
                    padding: '8px 20px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(123, 82, 51, 0.05)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
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
                  <ArrowLeft size={16} /> Quay lại
                </button>
              )}

              {/* Notification dropdown (Only for Admin dashboard/pages) */}
              {isAdmin && (
                <div className="header-notification-wrapper" ref={notificationRef}>
                  <button 
                    className="header-notification-bell"
                    onClick={() => setShowNotifications(!showNotifications)}
                    style={{
                      background: '#FAF6F0',
                      border: '1px solid #EADCC9',
                      color: '#7B5233',
                      padding: '8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Bell size={20} />
                    <span className="bell-badge"></span>
                  </button>

                  {showNotifications && (
                    <div className="header-notifications-dropdown">
                      <ActivityFeed />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Core dynamic content template */}
        <div className="dashboard-content">
          <Outlet context={outletContext} />
        </div>
      </div>

      {/* Global alert modal */}
      {modalConfig.visible && (
        <BeautifulModal
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          onClose={() => setModalConfig(prev => ({ ...prev, visible: false }))}
        />
      )}

      {/* Inline styles for Portal Layout structure */}
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background-color: #FAFAFA;
          position: relative;
          max-width: 100vw;
          overflow-x: clip;
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
          margin-left: 0;
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow-x: clip;
          position: relative;
        }
        @media (min-width: 993px) {
          .admin-main {
            margin-left: 260px;
            width: calc(100% - 260px);
          }
          .toggle-sidebar-btn {
            display: none !important;
          }
        }
        .admin-header {
          padding: 10px 24px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 900;
          height: 60px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .header-page-title {
          font-size: 1.25rem;
          color: #2D1A12;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .header-page-subtitle {
          font-size: 0.85rem;
          color: #8D6E63;
          margin: 2px 0 0 0;
          font-weight: 500;
        }
        .dashboard-content {
          padding: 12px 24px;
          flex: 1;
          background-color: #F8FAFC;
          min-height: calc(100vh - 60px);
        }
        .toggle-sidebar-btn {
          background: #FAF6F0;
          border: 1px solid #EADCC9;
          color: #7B5233;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .toggle-sidebar-btn:hover {
          background: #FAF6F0;
          color: #5D4037;
          border-color: #7B5233;
        }
        .header-notification-wrapper {
          position: relative;
        }
        .bell-badge {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 8px;
          height: 8px;
          background: #EF4444;
          border-radius: 50%;
          border: 1.5px solid #FFFFFF;
        }
        .header-notifications-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 1100;
          box-shadow: 0 10px 25px rgba(0,0,0,0.12);
          border-radius: 12px;
          overflow: hidden;
        }

        /* ── RESPONSIVE MOBILE ADJUSTMENTS ── */
        @media (max-width: 768px) {
          .admin-main {
            margin-left: 0;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
          }
          .admin-header {
            padding: 0 16px !important;
            height: 60px !important;
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
          }
          .header-left {
            gap: 12px !important;
            flex: 1 !important;
            min-width: 0 !important;
          }
          .header-titles {
            min-width: 0 !important;
            flex: 1 !important;
          }
          .header-page-title {
            font-size: 1.1rem !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .header-page-subtitle {
            font-size: 0.7rem !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .toggle-sidebar-btn {
            display: inline-flex !important;
            flex-shrink: 0 !important;
          }
          
          /* Main container safety constraints */
          .dashboard-content {
            padding: 8px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
        }
      `}} />
    </div>
  );
};

export default PortalLayout;
