import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import "@assets/sidebar.css";
import amandaPhoto from '@assets/Logo remove bg.png';

/**
 * View: Component Sidebar tái sử dụng & linh hoạt trạng thái
 * Cập nhật cấu trúc menu đa phân hệ và đa cấp hoàn chỉnh theo sơ đồ thiết kế mới nhất.
 */
const Sidebar = ({ active, collapsed, onToggleCollapse, onLogout, onClose, uploads = [] }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const isBlocked = () => false;

  // Cấu trúc Menu đa cấp chi tiết theo hình mẫu thiết kế
  const menuStructure = [
    {
      id: 'quality',
      type: 'group',
      text: 'Module chất lượng',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 11l2 2 4-4" />
        </svg>
      ),
      children: [
        { 
          id: 'defects', 
          path: '/admin/defects', 
          text: 'Mã Lỗi',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )
        },
        { 
          id: 'claim', 
          path: '/admin/claims', 
          text: 'Claim khách hàng',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="14" x2="12.01" y2="14" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'business',
      type: 'group',
      text: 'Quản lý kinh doanh',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      children: [
        { 
          id: 'prices', 
          path: '/admin/prices', 
          text: 'Quản lý giá tủ',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'crawler',
      type: 'group',
      text: 'Crawl & Tích hợp',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      ),
      children: [
        {
          id: 'lpn-crawler',
          path: '/admin/lpn-crawler',
          text: 'Crawl dữ liệu LPN',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          )
        },
        {
          id: 'ai-ocr-train',
          path: '/admin/ai-ocr-train',
          text: 'Train Hình ảnh',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          )
        }
      ]
    }
  ];

  // Helper check xem group co child nao dang active ko
  const hasActiveChild = (group) => {
    if (!group.children) return false;
    return group.children.some(child => {
      const hasQuery = child.path.includes('?');
      if (hasQuery) {
        return (location.pathname + location.search) === child.path;
      }
      return location.pathname === child.path || 
             (child.path !== '/admin/dashboard' && child.path !== '/admin/manufacture-dashboard' && location.pathname.startsWith(child.path));
    });
  };

  // Khoi tao state expand cho cac group
  const getInitialExpandedState = () => {
    const initialState = {};

    menuStructure.forEach(group => {
      if (group.type === 'group') {
        const hasActive = hasActiveChild(group);
        if (hasActive) {
          initialState[group.id] = true;
        }
      }
    });
    return initialState;
  };

  const [expandedGroups, setExpandedGroups] = React.useState(getInitialExpandedState);

  // Auto expand group khi location thay doi
  React.useEffect(() => {
    let activeGroupId = null;
    menuStructure.forEach(group => {
      if (group.type === 'group') {
        const hasActive = hasActiveChild(group);
        if (hasActive) {
          activeGroupId = group.id;
        }
      }
    });

    const nextState = {};
    if (activeGroupId) {
      nextState[activeGroupId] = true;
    }
    setExpandedGroups(nextState);
  }, [location.pathname, location.search]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const isAlreadyExpanded = !!prev[groupId];
      // Accordion style: chỉ mở tối đa 1 nhóm menu tại một thời điểm
      const nextState = {};
      if (!isAlreadyExpanded) {
        nextState[groupId] = true;
      }
      return nextState;
    });
  };

  const renderDirectLink = (item) => {
    const hasQuery = item.path.includes('?');
    const isActive = hasQuery
      ? (location.pathname + location.search) === item.path
      : (location.pathname === item.path || 
        (item.path !== '/admin/dashboard' && item.path !== '/admin/manufacture-dashboard' && location.pathname.startsWith(item.path)));

    return (
      <div key={item.id} className="nav-item" style={{ marginBottom: '4px' }}>
        <Link 
          to={item.path}
          onClick={handleLinkClick}
          className={`nav-link-direct ${isActive ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            textDecoration: 'none',
            color: isActive ? '#5D3B32' : '#4B5563',
            backgroundColor: isActive ? '#FAF6F0' : 'transparent',
            fontWeight: isActive ? '800' : '600',
            transition: 'all 0.3s ease',
            borderRadius: '12px',
            outline: 'none',
            marginBottom: '4px'
          }}
        >
          <span className="nav-icon" style={{ marginRight: '12px', display: 'flex', alignItems: 'center', color: isActive ? '#5D3B32' : '#6B7280' }}>
            {item.icon}
          </span>
          <span className="nav-text" style={{ fontSize: '0.9rem' }}>{item.text}</span>
        </Link>
      </div>
    );
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${active ? 'visible' : ''}`}
        onClick={onClose}
      ></div>

      <aside className={`admin-sidebar ${active ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`} style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB' }}>
        {/* User profile section */}
        <div 
          onClick={collapsed ? onToggleCollapse : undefined}
          style={{ 
            padding: '20px', 
            display: 'flex', 
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#7B5233',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            cursor: collapsed ? 'pointer' : 'default',
            position: 'relative'
          }}
          title={collapsed ? 'Mở rộng menu' : undefined}
        >
          {/* Circular avatar logo */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              navigate('/admin/profile');
              if (onClose) onClose();
            }}
            style={{ 
              width: '45px', 
              height: '45px', 
              backgroundColor: '#FFFFFF', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.2)',
              flexShrink: 0,
              cursor: 'pointer'
            }}
            title="Trang cá nhân"
          >
            <img src={amandaPhoto} alt="Avatar" style={{ width: '80%', height: 'auto' }} />
          </div>

          {/* System info */}
          {!collapsed && (
            <div 
              style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                SmartFlow Claim_v2
              </span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Hệ thống Quản lý Khiếu nại
              </span>
            </div>
          )}
        </div>



        {/* Navigation items - Collapsible Grouped layout */}
        <nav className="sidebar-nav" style={{ padding: '15px 10px', overflowY: 'auto', flex: 1 }}>
          {menuStructure.map(item => {
            if (item.type === 'link') {
              if (isBlocked(item.id)) return null;
              return item;
            } else if (item.type === 'group') {
              const visibleChildren = item.children.filter(child => !isBlocked(child.id));
              if (visibleChildren.length === 0) return null;
              return { ...item, children: visibleChildren };
            }
            return null;
          }).filter(Boolean).map(item => {
            if (item.type === 'link') {
              return renderDirectLink(item);
            } else if (item.type === 'group') {
              const isExpanded = !!expandedGroups[item.id];
              const isGroupActive = hasActiveChild(item);
              
              return (
                <div key={item.id} className="sidebar-group-container" style={{ marginBottom: '6px' }}>
                  <button 
                    onClick={() => toggleGroup(item.id)}
                    className={`sidebar-group-header ${isGroupActive ? 'active' : ''}`}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: 'none',
                      background: isGroupActive ? '#FAF6F0' : 'transparent',
                      color: isGroupActive ? '#5D3B32' : '#4B5563',
                      fontWeight: isGroupActive ? '800' : '600',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.3s ease',
                      outline: 'none',
                      marginBottom: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', color: isGroupActive ? '#5D3B32' : '#6B7280' }}>
                        {item.icon}
                      </span>
                      <span className="nav-text" style={{ fontSize: '0.9rem' }}>{item.text}</span>
                    </div>
                    <span className="chevron-icon" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
                      transition: 'transform 0.2s ease',
                      color: isGroupActive ? '#5D3B32' : '#A0A3A8'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </span>
                  </button>
                  {isExpanded && (
                    <ul className="sidebar-group-children" style={{ listStyle: 'none', padding: '2px 0 6px 0', margin: 0 }}>
                      {item.children.map(child => {
                        const hasQuery = child.path.includes('?');
                        const isChildActive = hasQuery
                          ? (location.pathname + location.search) === child.path
                          : (location.pathname === child.path || 
                            (child.path !== '/admin/dashboard' && child.path !== '/admin/manufacture-dashboard' && location.pathname.startsWith(child.path)));

                        return (
                          <li key={child.id} className="nav-item" style={{ marginBottom: '2px' }}>
                            <Link 
                              to={child.path}
                              onClick={handleLinkClick}
                              className={`nav-link-child ${isChildActive ? 'active' : ''}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px 16px 10px 36px',
                                textDecoration: 'none',
                                color: isChildActive ? '#5D3B32' : '#6B7280',
                                backgroundColor: isChildActive ? '#FAF6F0' : 'transparent',
                                fontWeight: isChildActive ? '800' : '500',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s ease',
                                borderRadius: '8px',
                                outline: 'none'
                              }}
                            >
                              <span className="nav-icon" style={{ marginRight: '10px', display: 'flex', alignItems: 'center', color: isChildActive ? '#5D3B32' : '#9CA3AF' }}>
                                {child.icon}
                              </span>
                              <span className="nav-text">{child.text}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            }
            return null;
          })}
        </nav>

        {/* Manufacture progress bar for file uploads */}
        {!collapsed && uploads && uploads.length > 0 && (
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

      </aside>
    </>
  );
};

export default Sidebar;
