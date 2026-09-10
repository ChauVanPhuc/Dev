import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BeautifulModal from '../components/BeautifulModal';
import { ClaimSuccessSummaryModal } from '../../modules/claim/components/ClaimSuccessSummaryModal';
import useUiStore from '../store/uiStore';

/**
 * Main Admin Layout Shell
 * Manages responsive sidebar, header, navigation shell, and modal notifications.
 */
const AdminLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const [customTitle, setCustomTitle] = useState(null);
  const [customSubtitle, setCustomSubtitle] = useState(null);
  const [customScreenCode, setCustomScreenCode] = useState(null);
  const [headerExtra, setHeaderExtra] = useState(null);
  const [modalConfig, setModalConfig] = useState({ visible: false, title: '', message: '', type: 'info' });

  const {
    claimIngestionProgress,
    setClaimIngestionProgress,
    claimImportError,
    setClaimImportError,
    claimSuccessSummary,
    setClaimSuccessSummary
  } = useUiStore();

  const showModal = (title, message, type = 'info') => {
    setModalConfig({ visible: true, title, message, type });
  };

  // Auto-dismiss import success notification pill after 3.5s ONLY when truly completed
  useEffect(() => {
    if (claimIngestionProgress?.isOpen) {
      const isCompleted = claimIngestionProgress.isCompleted === true;
      if (isCompleted) {
        const timer = setTimeout(() => {
          setClaimIngestionProgress(prev => ({ ...prev, isOpen: false }));
        }, 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [claimIngestionProgress?.isOpen, claimIngestionProgress?.isCompleted, setClaimIngestionProgress]);

  // Close mobile sidebar and reset custom header on route changes
  useEffect(() => {
    setIsMobileOpen(false);
    setCustomTitle(null);
    setCustomSubtitle(null);
    setCustomScreenCode(null);
    setHeaderExtra(null);
  }, [location.pathname]);

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 992) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const outletContext = useMemo(() => ({
    setCustomTitle,
    setCustomSubtitle,
    setCustomScreenCode,
    setHeaderExtra,
    showModal,
    startGlobalUpload: () => {},
    activeUploads: 0
  }), []);

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <Sidebar 
        active={isMobileOpen}
        collapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        onClose={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className={`admin-main ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header 
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isCollapsed}
          customTitle={customTitle}
          customSubtitle={customSubtitle}
          headerExtra={headerExtra}
        />

        <main className="dashboard-content">
          <div className="page-container">
            <Outlet context={outletContext} />
          </div>
        </main>
      </div>

      {/* Alert / Info Modal */}
      {modalConfig.visible && (
        <BeautifulModal
          visible={modalConfig.visible}
          onClose={() => setModalConfig(prev => ({ ...prev, visible: false }))}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
        />
      )}

      {/* Global Modals for Claim background tasks */}
      {claimImportError?.isOpen && (
        <BeautifulModal
          visible={claimImportError.isOpen}
          onClose={() => setClaimImportError({ isOpen: false, message: '' })}
          title="Lỗi xử lý file PDF"
          message={claimImportError.message}
          type="error"
        />
      )}

      {claimSuccessSummary?.isOpen && (
        <ClaimSuccessSummaryModal
          isOpen={claimSuccessSummary.isOpen}
          onClose={() => setClaimSuccessSummary({ isOpen: false })}
          batchId={claimSuccessSummary.batchId}
          claimsCount={claimSuccessSummary.claimsCount}
          photoCount={claimSuccessSummary.photoCount}
          warningsCount={claimSuccessSummary.warningsCount}
          warnings={claimSuccessSummary.warnings}
          fileStats={claimSuccessSummary.fileStats}
        />
      )}

      {/* FLOATING STEP-BY-STEP PROGRESS CARD */}
      {claimIngestionProgress?.isOpen && (() => {
        const rawText = claimIngestionProgress.statusText || `Đang xử lý PDF (${claimIngestionProgress.progress}%)`;
        const isCompleted = claimIngestionProgress.isCompleted === true;
        const cleanText = rawText.replace(/^[✓⚠]\s*/, '');

        return (
          <div className="compact-progress-pill-container" style={{
            position: 'fixed',
            top: '75px',
            right: '24px',
            zIndex: 2000,
            pointerEvents: 'auto'
          }}>
            <div 
              className="compact-progress-pill"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isCompleted ? '#2E7D32' : '#7B5233',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: '600',
                boxShadow: isCompleted ? '0 4px 12px rgba(46, 125, 50, 0.35)' : '0 4px 12px rgba(45, 26, 18, 0.25)',
                border: isCompleted ? '1px solid #A5D6A7' : '1px solid #EADCC9',
                transition: 'all 0.3s ease'
              }}
            >
              {isCompleted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg style={{ color: '#FFFFFF', animation: 'spin 1.2s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"></circle>
                </svg>
              )}
              <span>{cleanText}</span>
              <button
                type="button"
                onClick={() => setClaimIngestionProgress(prev => ({ ...prev, isOpen: false }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginLeft: '6px',
                  padding: '0 2px',
                  lineHeight: 1,
                  opacity: 0.85
                }}
                title="Đóng thông báo"
              >
                &times;
              </button>
            </div>
          </div>
        );
      })()}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .admin-layout {
          display: flex;
          height: 100vh;
          max-height: 100vh;
          background-color: #FAFAFA;
          position: relative;
          max-width: 100vw;
          overflow: hidden !important;
        }

        :root {
          --page-gutter: 14px;
        }

        @media (min-width: 1440px) {
          :root {
            --page-gutter: 16px;
          }
        }

        @media (max-width: 768px) {
          :root {
            --page-gutter: 8px;
          }
        }

        .dashboard-content {
          flex: 1;
          height: calc(100vh - 60px) !important;
          max-height: calc(100vh - 60px) !important;
          overflow: hidden !important;
          background-color: #F8FAFC !important;
          display: flex;
          flex-direction: column;
          align-items: stretch !important;
          padding: 12px var(--page-gutter, 14px) !important;
          box-sizing: border-box;
          width: 100% !important;
        }

        .page-container {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          flex: 1;
          box-sizing: border-box;
          overflow: hidden;
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
          height: 100vh;
          max-height: 100vh;
          overflow: hidden !important;
          position: relative;
        }

        @media (min-width: 993px) {
          .admin-main {
            margin-left: 260px;
            width: calc(100% - 260px);
          }
          .admin-main.sidebar-collapsed {
            margin-left: 0 !important;
            width: 100% !important;
          }
          .admin-sidebar.collapsed {
            width: 0 !important;
            border-right: none !important;
            transform: translateX(-100%) !important;
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

        @media (max-width: 768px) {
          .admin-main {
            margin-left: 0;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
          }
          .admin-header {
            padding: 0 16px !important;
            height: 50px !important;
            background-color: #FAF6F0 !important;
            border-bottom: 1px solid #EADCC9 !important;
          }
          .dashboard-content {
            padding: 8px !important;
          }
        }
      `}} />
    </div>
  );
};

export default AdminLayout;
