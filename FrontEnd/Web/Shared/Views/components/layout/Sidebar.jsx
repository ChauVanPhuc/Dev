import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import "@assets/sidebar.css";
import amandaPhoto from '@mobile/assets/logo-no-bg.png';

/**
 * View: Component Sidebar tái sử dụng & linh hoạt trạng thái
 * Tự động chuyển đổi menu giữa Admin và Manufacture dựa trên URL
 */
const Sidebar = ({ active, onLogout, onClose, uploads = [] }) => {
  const location = useLocation();

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const isAdmin = location.pathname.startsWith('/admin');

  // Khai báo menu items cho Admin
  const adminMenuItems = [
    {
      id: 'dashboard',
      path: '/admin/dashboard',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      text: 'Trang chủ'
    },
    {
      id: 'users',
      path: '/admin/users',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      text: 'Quản lý người dùng'
    },
    {
      id: 'handovers',
      path: '/admin/handovers',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      text: 'Danh sách bàn giao'
    },
    {
      id: 'logs',
      path: '/admin/logs',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        </svg>
      ),
      text: 'Lỗi ghi nhận'
    },
    {
      id: 'defects',
      path: '/admin/defects',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
      ),
      text: 'Quản lý danh mục lỗi'
    },
    {
      id: 'reports',
      path: '/admin/reports',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      text: 'Báo cáo kiểm tra'
    },
    {
      id: 'quality-records',
      path: '/admin/quality-records',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M16 13H8"></path>
          <path d="M16 17H8"></path>
          <path d="M10 9H8"></path>
        </svg>
      ),
      text: 'Hồ sơ chất lượng'
    },
    {
      id: 'claim',
      path: '/admin/claims',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      text: 'Quản lý khiếu nại'
    },
    {
      id: 'prices',
      path: '/admin/prices',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
      text: 'Danh sách giá tủ'
    },
    {
      id: 'shipments',
      path: '/admin/shipments',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      ),
      text: 'Danh sách lô hàng container'
    },
    {
      id: 'chatbot',
      path: '/admin/chatbot',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          <path d="M8 10h.01"></path>
          <path d="M12 10h.01"></path>
          <path d="M16 10h.01"></path>
        </svg>
      ),
      text: 'Chat Bot'
    },
    {
      id: 'kpi',
      path: '/admin/kpi',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
      ),
      text: 'Báo cáo KPI'
    },
    {
      id: 'feedback',
      path: '/admin/feedback',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      text: 'Góp ý cải tiến'
    },
    {
      id: 'hotspots',
      path: '/admin/hotspots',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      ),
      text: 'Điểm nóng cần chú ý'
    },
    {
      id: 'data',
      path: '/admin/data',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      ),
      text: 'Đóng gói dữ liệu'
    },
    {
      id: 'screens',
      path: '/admin/screens',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      ),
      text: 'Quản lý màn hình'
    },
    {
      id: 'monitor',
      path: '/admin/monitor',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
          <path d="M6 12h4l2-6 2 12 2-6h4"></path>
        </svg>
      ),
      text: 'Giám sát hệ thống'
    }
  ];

  // Khai báo menu items cho Manufacture
  const manufactureMenuItems = [
    {
      id: 'home',
      path: '/manufacture/dashboard',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      text: 'Trang chủ'
    },
    {
      id: 'plan',
      path: '/manufacture/plan',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      text: 'Kế hoạch'
    },
    {
      id: 'delivery-tracking',
      path: '/manufacture/delivery-tracking',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      text: 'Theo dõi bàn giao'
    },
    {
      id: 'products',
      path: '/manufacture/products',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      ),
      text: 'Sản phẩm mẫu (BOM)'
    },
    {
      id: 'backup-qrs',
      path: '/manufacture/backup-qrs',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <rect x="7" y="7" width="3" height="3"></rect>
          <rect x="14" y="7" width="3" height="3"></rect>
          <rect x="7" y="14" width="3" height="3"></rect>
          <path d="M14 14h3v3h-3z"></path>
        </svg>
      ),
      text: 'Quản lý mã QR'
    },
    {
      id: 'exception-deliveries',
      path: '/manufacture/exception-deliveries',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      ),
      text: 'Quản Lý Phiếu Ngoại Lệ'
    }
  ];

  const menuItems = isAdmin ? adminMenuItems : manufactureMenuItems;

  return (
    <>
      <div
        className={`sidebar-overlay ${active ? 'visible' : ''}`}
        onClick={onClose}
      ></div>

      <aside className={`admin-sidebar ${active ? 'active' : ''}`} style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB' }}>
        {/* User profile section */}
        <div style={{ 
          padding: '20px', 
          display: 'flex', 
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#7B5233',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Circular avatar logo */}
          <div style={{ 
            width: '45px', 
            height: '45px', 
            backgroundColor: '#FFFFFF', 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.2)',
            flexShrink: 0
          }}>
            <img src={amandaPhoto} alt="Avatar" style={{ width: '80%', height: 'auto' }} />
          </div>

          {/* Account info */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isAdmin ? 'Quản trị viên (Admin)' : 'Nhà máy sản xuất'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              amanda@mail.com
            </span>
          </div>

          {/* Logout button */}
          <button onClick={onLogout} title="Đăng xuất" style={{ 
            background: 'rgba(255,255,255,0.15)', 
            border: 'none', 
            borderRadius: '8px', 
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
              <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
          </button>
        </div>

        {/* Navigation items */}
        <nav className="sidebar-nav" style={{ padding: '20px 0' }}>
          <ul className="nav-list" style={{ listStyle: 'none', padding: 0 }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/admin/dashboard' && item.path !== '/manufacture/dashboard' && location.pathname.startsWith(item.path));

              return (
                <li key={item.id} className="nav-item">
                  <Link to={item.path}
                    onClick={handleLinkClick}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 20px',
                      textDecoration: 'none',
                      color: isActive ? '#A0301B' : '#6B7280',
                      backgroundColor: isActive ? '#FFF5F5' : 'transparent',
                      borderLeft: isActive ? '4px solid #A0301B' : '4px solid transparent',
                      fontWeight: isActive ? '700' : '500',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <span className="nav-icon" style={{ marginRight: '12px', color: isActive ? '#A0301B' : '#6B7280' }}>
                      {item.icon}
                    </span>
                    <span className="nav-text" style={{ fontSize: '0.9rem' }}>{item.text}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Manufacture progress bar for file uploads */}
        {!isAdmin && uploads && uploads.length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            margin: 'auto 15px 20px 15px',
            maxHeight: '300px',
            overflowY: 'auto',
            paddingRight: '5px'
          }}>
            {uploads.map((upload) => (
              <div key={upload.id} style={{
                padding: '12px',
                backgroundColor: upload.status === 'error' ? '#FEF2F2' : '#FDF2F2',
                borderRadius: '12px',
                border: `1px solid ${upload.status === 'error' ? '#FCA5A5' : 'rgba(160, 48, 27, 0.15)'}`,
                boxShadow: '0 4px 12px rgba(160, 48, 27, 0.08)',
                animation: 'slideUp 0.4s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: upload.status === 'error' ? '#DC2626' : '#A0301B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {upload.fileName}
                  </span>
                  <span style={{ fontSize: '10px', color: '#A0301B', fontWeight: '900' }}>{upload.progress}%</span>
                </div>
                
                <div style={{ height: '5px', backgroundColor: 'rgba(160, 48, 27, 0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ 
                    width: `${upload.progress}%`, 
                    height: '100%', 
                    backgroundColor: upload.status === 'error' ? '#EF4444' : '#A0301B', 
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: upload.status === 'error' ? 'none' : '0 0 8px rgba(160, 48, 27, 0.2)'
                  }} />
                </div>
                
                <div style={{ fontSize: '9px', color: '#7B5233', display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {upload.status === 'uploading' && (
                      <div style={{ width: '8px', height: '8px', border: '1.5px solid #A0301B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mgmtSpin 0.8s linear infinite' }} />
                    )}
                    <span>
                      {upload.status === 'uploading' ? 'Đang xử lý...' : 
                       upload.status === 'completed' ? 'Hoàn thành' : 'Lỗi'}
                    </span>
                  </div>
                  <span>{upload.processed}/{upload.total || '?'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="sidebar-footer" style={{
          padding: '0 25px 20px',
          color: '#A0301B',
          fontSize: '0.7rem',
          fontWeight: '700',
          opacity: 0.6
        }}>
          SmartFlow v1.1.5
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
