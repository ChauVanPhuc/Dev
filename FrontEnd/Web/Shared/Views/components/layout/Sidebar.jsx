import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import "@assets/sidebar.css";
import amandaPhoto from '@mobile/assets/logo-no-bg.png';
import * as Icons from 'lucide-react';
import api from '@webShared/Services/api.service';

/**
 * View: Component Sidebar tái sử dụng & linh hoạt trạng thái
 * Cập nhật cấu trúc menu đa phân hệ và đa cấp hoàn chỉnh theo sơ đồ thiết kế mới nhất.
 */

const DynamicIcon = ({ name, size = 20, ...props }) => {
  const IconComponent = Icons[name] || Icons.Circle;
  return <IconComponent size={size} {...props} />;
};

const Sidebar = ({ active, collapsed, onToggleCollapse, onLogout, onClose, uploads = [] }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuList, setMenuList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedGroups, setExpandedGroups] = React.useState({});

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const user = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const isAdmin = user.role_name === 'IT' || user.role_name === 'BGD' || user.username === 'admin';

  let activePermissions = {};
  try {
    activePermissions = JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
  } catch (e) {
    console.error('Failed to parse screen permissions in Sidebar:', e);
  }

  React.useEffect(() => {
    const fetchSidebar = async () => {
      try {
        const data = await api.get('/system/sidebar?platform=Web');
        setMenuList(data);
      } catch (err) {
        console.error('Failed to fetch sidebar menus:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSidebar();
  }, []);

  const isBlocked = (item) => {
    let key = item.permission_key;
    if (!key) {
      key = item.route_path || `sb_${item.id}`;
    }
    if (!key) return false;
    const perm = activePermissions[key];

    // 1. Kiểm tra chặn rõ ràng (Explicit block)
    if (perm === 'none') return true;
    if (Array.isArray(perm)) {
      return perm.length === 0 || perm.includes('none');
    }
    if (typeof perm === 'string' && perm.split(',').map(s => s.trim()).includes('none')) {
      return true;
    }

    // 2. Mặc định đối với admin/IT/BGD (nếu không bị chặn rõ ràng ở trên)
    if (isAdmin) return false;

    // 3. Với các tài khoản thường, nếu chưa cấu hình (undefined/null) thì mặc định chặn
    return perm === undefined || perm === null;
  };

  // Helper to check if a route is active
  const checkIsActive = (item) => {
    if (!item.route_path) return false;
    const hasQuery = item.route_path.includes('?');
    if (hasQuery) {
      return (location.pathname + location.search) === item.route_path;
    }

    // 1. Exact match
    if (location.pathname === item.route_path) {
      return true;
    }

    // 2. Prefix match
    if (item.route_path !== '/admin/dashboard' &&
      item.route_path !== '/admin/manufacture-dashboard' &&
      (location.pathname.startsWith(item.route_path + '/') || location.pathname.startsWith(item.route_path + '?'))) {

      // Check if there is another item in the sidebar that matches the pathname exactly
      let hasExactMatchSibling = false;
      for (const group of menuList) {
        if (!group.children || group.children.length === 0) {
          if (location.pathname === group.route_path) {
            hasExactMatchSibling = true;
            break;
          }
        } else if (group.children) {
          for (const child of group.children) {
            if (location.pathname === child.route_path) {
              hasExactMatchSibling = true;
              break;
            }
          }
        }
        if (hasExactMatchSibling) break;
      }

      return !hasExactMatchSibling;
    }

    return false;
  };

  // Helper check xem group co child nao dang active ko
  const hasActiveChild = (group) => {
    if (group.title === 'Quản lý hệ thống' && (location.pathname === '/admin/monitor' || location.pathname === '/admin/monitor/')) {
      return true;
    }
    if (!group.children) return false;
    return group.children.some(child => checkIsActive(child));
  };

  React.useEffect(() => {
    if (menuList.length === 0) return;

    let activeGroupId = null;

    // 1. Kiểm tra xem nhóm đang mở ĐÃ chứa trang con active này chưa (giữ nguyên nhóm để không nhảy sang nhóm khác)
    for (const groupIdStr in expandedGroups) {
      if (expandedGroups[groupIdStr]) {
        const groupId = parseInt(groupIdStr);
        const group = menuList.find(g => g.id === groupId);
        if (group && hasActiveChild(group)) {
          activeGroupId = groupId;
          break;
        }
      }
    }

    // 2. Nếu chưa nhóm nào mở chứa route active này, tìm nhóm ĐẦU TIÊN chứa nó
    if (activeGroupId === null) {
      for (const group of menuList) {
        if (hasActiveChild(group)) {
          activeGroupId = group.id;
          break;
        }
      }
    }

    const nextState = {};

    // 3. Nếu tìm thấy nhóm phù hợp -> CHỈ MỞ nhóm đó (Accordion style)
    if (activeGroupId !== null) {
      nextState[activeGroupId] = true;
    } else {
      // 4. Mặc định cho IT/Admin
      const role = user.role_name;
      if (role === 'IT' || user.username === 'admin') {
        nextState[2] = true;
      } else if (role === 'Sx') {
        nextState[21] = true;
      } else if (role === 'QLCL') {
        nextState[27] = true;
      } else if (role === 'NS' || role === 'HR') {
        nextState[10] = true;
      }
    }

    setExpandedGroups(nextState);
  }, [menuList, location.pathname, location.search]);

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
    const isActive = checkIsActive(item);

    return (
      <div key={item.id} className="nav-item" style={{ marginBottom: '4px' }}>
        <Link
          to={item.route_path}
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
            <DynamicIcon name={item.icon} size={18} />
          </span>
          <span className="nav-text" style={{ fontSize: '0.9rem' }}>{item.title}</span>
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

      <aside className={`admin-sidebar ${active ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`} style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
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
            position: 'relative',
            flexShrink: 0
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

          {/* Account info */}
          {!collapsed && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigate('/admin/profile');
                if (onClose) onClose();
              }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', cursor: 'pointer' }}
              title="Trang cá nhân"
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.full_name || user.username || 'Hệ thống SmartFlow'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email || 'smartflow@mail.com'}
              </span>
              <div style={{ marginTop: '4px', display: 'flex' }}>
                <span style={{
                  fontSize: '0.65rem',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  Vai trò: {user.role_name || 'N/A'}{isAdmin ? ' (Admin)' : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation items - Collapsible Grouped layout */}
        <nav className="sidebar-nav" style={{ padding: '15px 10px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#7B5233', fontSize: '0.85rem', fontWeight: 'bold' }}>
              Đang tải danh mục...
            </div>
          ) : (
            menuList.map(item => {
              if (!item.children || item.children.length === 0) {
                if (isBlocked(item)) return null;
                return item;
              } else {
                let visibleChildren = item.children.filter(child => !isBlocked(child));

                // Yêu cầu: "Quản lý sản xuất" chỉ hiển thị 3 mục: Lệnh sản xuất, Quy trình - kế hoạch, Danh sách bàn giao. Các mục khác tạm ẩn.
                if (item.title === 'Quản lý sản xuất') {
                  visibleChildren = [
                    { id: 21, parent_id: 19, title: 'Lệnh sản xuất', route_path: '/admin/production-orders', icon: 'Handshake' },
                    { id: 24, parent_id: 19, title: 'Quy trình - kế hoạch', route_path: '/admin/production-routing', icon: 'Handshake' },
                    { id: 25, parent_id: 19, title: 'Danh sách bàn giao', route_path: '/admin/delivery-tracking', icon: 'Handshake' }
                  ];
                }

                if (visibleChildren.length === 0) return null;
                return { ...item, children: visibleChildren };
              }
            }).filter(Boolean).map(item => {
              if (!item.children || item.children.length === 0) {
                return renderDirectLink(item);
              } else {
                const isExpanded = !!expandedGroups[item.id];
                const isGroupActive = isExpanded && hasActiveChild(item);

                return (
                  <div key={item.id} className="sidebar-group-container" style={{ marginBottom: '6px' }}>
                    <button
                      onClick={() => {
                        toggleGroup(item.id);
                        if (item.title === 'Quản lý hệ thống') {
                          navigate('/admin/monitor');
                        }
                        if (item.title === 'Quản lý nhân sự') {
                          navigate('/admin/hr/org-chart');
                        }
                        if (item.title === 'Quản lý chất lượng') {
                          navigate('/admin/quality');
                        }
                        if (item.title === 'Quản lý sản xuất') {
                          navigate('/admin/production-orders');
                        }
                      }}
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
                          <DynamicIcon name={item.icon} size={18} />
                        </span>
                        <span className="nav-text" style={{ fontSize: '0.9rem' }}>{item.title}</span>
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
                          const isChildActive = checkIsActive(child);

                          return (
                            <li key={child.id} className="nav-item" style={{ marginBottom: '2px' }}>
                              <Link
                                to={child.route_path}
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
                                  <DynamicIcon name={child.icon} size={14} />
                                </span>
                                <span className="nav-text">{child.title}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              }
            })
          )}
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
