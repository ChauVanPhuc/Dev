import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import * as Icons from 'lucide-react'
import useUiStore from '@shared/store/uiStore'
import useAuthStore from '@modules/auth/Models/authModel'
import { useNavigate, useLocation } from 'react-router-dom'
import UserProfileCard from '../user/UserProfileCard'
import apiClient from '@shared/services/api'

const BUILT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

// DynamicIcon resolver
const DynamicIcon = ({ name, fallbackName, size = 20, color = '#666' }) => {
  const iconName = name || fallbackName || 'HelpCircle';
  const IconComponent = Icons[iconName] || Icons.HelpCircle;
  return <IconComponent size={size} color={color} />;
};

/**
 * Sidebar Component
 * Menu chuyển trang phong cách Mobile ERP.
 */
const Sidebar = () => {
  const { isSidebarOpen, setSidebarOpen } = useUiStore()
  const { user, setUser, permissions } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [showProfile, setShowProfile] = useState(false)
  const [appVersion] = useState(BUILT_VERSION)

  const [menuList, setMenuList] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState([])

  useEffect(() => {
    const fetchSidebar = async () => {
      try {
        const response = await apiClient.get('/system/sidebar?platform=Mobile')
        let items = Array.isArray(response.data) ? [...response.data] : [];

        if (items && items.length > 0) {
          setMenuList(items);
        } else {
          throw new Error('Empty sidebar list from server');
        }
      } catch (err) {
        console.error('Failed to load Mobile sidebar, using default structured menu:', err)
        setMenuList([
          {
            id: 'm-home',
            title: 'Trang chủ',
            route_path: '/dashboard',
            icon: 'LayoutGrid',
            is_active: true
          },
          {
            id: 'm-quality-management',
            title: 'Quản lý chất lượng',
            route_path: '/admin/kpi/dashboard',
            icon: 'Target',
            is_active: true
          },
          {
            id: 'm-create-ticket',
            title: 'Khởi tạo phiếu',
            route_path: '#',
            icon: 'FolderPlus',
            is_active: true,
            children: [
              { id: 'sub-pv2-1', title: 'Tạo phiếu luân chuyển', route_path: '/production_v2/transfer', icon: 'FilePlus' },
              { id: 'sub-pv2-2', title: 'Danh sách luân chuyển', route_path: '/production_v2/transfer-list', icon: 'ListOrdered' },
              { id: 'sub-pv2-3', title: 'Tạo phiếu kiểm tra', route_path: '/production_v2/inspection', icon: 'ClipboardCheck' },
              { id: 'sub-pv2-4', title: 'Danh sách kiểm tra', route_path: '/production_v2/inspection-list', icon: 'ClipboardList' }
            ]
          },
          {
            id: 'm-prod-info',
            title: 'Thông tin sản xuất',
            route_path: '#',
            icon: 'Factory',
            is_active: true,
            children: [
              { id: 'sub-prod-1', title: 'Lệnh sản xuất', route_path: '/production/orders', icon: 'ClipboardList' },
              { id: 'sub-prod-2', title: 'Kế hoạch sản xuất', route_path: '/production/plans', icon: 'Calendar' },
              { id: 'sub-prod-3', title: 'Lịch sử luân chuyển', route_path: '/production_v2/transfer-list', icon: 'History' }
            ]
          },
          {
            id: 'm-report-group',
            title: 'Lập báo cáo',
            route_path: '#',
            icon: 'FileBarChart',
            is_active: true,
            children: [
              { id: 'sub-rep-1', title: 'Theo dõi CAPA', route_path: '/capa-list', icon: 'ShieldAlert' },
              { id: 'sub-rep-2', title: 'Tạo báo cáo nhanh', route_path: '/quick-report-create', icon: 'Zap' },
              { id: 'sub-rep-3', title: 'Lịch sử báo cáo', route_path: '/quick-report-list', icon: 'FileText' }
            ]
          },
          {
            id: 'm-violation',
            title: 'Báo cáo vi phạm',
            route_path: '/awards',
            icon: 'AlertTriangle',
            is_active: true
          },
          {
            id: 'm-hr-kpi',
            title: 'Đánh giá nhân sự',
            route_path: '/kpi-staff',
            icon: 'Award',
            is_active: true
          },
          {
            id: 'm-quality-employees',
            title: 'Nhân sự Quản lý Chất lượng',
            route_path: '/kpi-quality-employees',
            icon: 'UserCheck',
            is_active: true
          },
          {
            id: 'm-quality-confirm',
            title: 'Xác nhận phiếu kiểm tra',
            route_path: '/admin/quality',
            icon: 'ShieldCheck',
            is_active: true
          }
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchSidebar()
  }, [])

  const toggleExpand = (id) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const userRoleStr = (user?.role_name || user?.role_description || '').toLowerCase();
  const userPermStr = (user?.permission_name || user?.permission_description || '').toLowerCase();
  const userNameStr = (user?.full_name || user?.username || '').toLowerCase();
  const combinedAuthStr = `${userRoleStr} | ${userPermStr} | ${userNameStr}`;
  
  const isAdmin = combinedAuthStr.includes('admin') || combinedAuthStr.includes('it') || combinedAuthStr.includes('bgd');

  const checkItemVisible = (item) => {
    if (isAdmin) return true;
    if (!permissions || Object.keys(permissions).length === 0) return true;

    const candidates = [
      item.route_path,
      item.route_path ? item.route_path.replace(/^\//, '') : null,
      item.permission_key,
      item.permission_key ? item.permission_key.replace(/^mobile_/, '') : null,
      item.permission_key ? `/${item.permission_key.replace(/^mobile_/, '').replace(/^\//, '')}` : null
    ].filter(Boolean);

    for (const key of candidates) {
      const userPerm = permissions[key];
      if (userPerm !== undefined) {
        if (userPerm === 'none' || userPerm === '') return false;
        const actions = userPerm.split(',').map(p => p.trim());
        if (actions.includes('read') || actions.includes('create') || actions.includes('write') || actions.includes('edit')) {
          return true;
        }
        return false;
      }
    }
    return true;
  };

  const menuItems = menuList
    .map(item => {
      const hasSub = item.children && item.children.length > 0;
      if (hasSub) {
        return {
          ...item,
          hasSub,
          children: item.children.filter(sub => checkItemVisible(sub))
        };
      }
      return { ...item, hasSub };
    })
    .filter(item => {
      if (isAdmin) return true;
      if (item.hasSub) {
        return item.children.length > 0;
      } else {
        return checkItemVisible(item);
      }
    });

  const isActive = (path) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const isMenuRowActive = (item) => {
    if (item.hasSub) {
      return item.children.some(sub => isActive(sub.route_path));
    }
    return isActive(item.route_path);
  };

  const isExpanded = (id) => expandedItems.includes(id)

  const handleNavigate = (path) => {
    if (!path || path === '#') return;
    const cleanPath = (path.startsWith('/') || path.startsWith('http')) ? path : '/' + path;
    navigate(cleanPath);
    setSidebarOpen(false);
  };

  const getStyleForItem = (item, isSub = false) => {
    const active = isSub ? isActive(item.route_path) : isMenuRowActive(item);
    return {
      padding: isSub ? '10px 15px' : '12px 15px',
      paddingLeft: isSub ? '40px' : '15px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      color: active ? '#5d3b32' : '#666',
      backgroundColor: active ? '#faf4ee' : 'transparent',
      marginBottom: '4px',
      cursor: 'pointer',
      fontWeight: active ? '700' : '500',
      fontSize: isSub ? '0.92rem' : '0.96rem',
      transition: 'all 0.2s ease'
    };
  };

  return (
    <>
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 15000
          }}
        />
      )}

      <div 
        className="sidebar-container"
        style={{
          position: 'absolute',
          left: isSidebarOpen ? 0 : '-280px',
          top: 0,
          bottom: 0,
          width: '280px',
          backgroundColor: '#fff',
          zIndex: 15001,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
          transition: 'left 0.25s ease-in-out'
        }}
      >
        {/* User Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, var(--primary-color) 0%, #6b3a25 100%)',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div
            onClick={() => setShowProfile(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '50px',
              padding: '8px 16px 8px 8px',
              backdropFilter: 'none'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '1.5px solid rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: '900',
              color: '#fff',
              flexShrink: 0
            }}>
              {(() => {
                const role = (user?.role_name || user?.role_description || '').toLowerCase();
                if (role.includes('chất lượng') || role.includes('qc')) return 'QC';
                if (role.includes('sản xuất') || role.includes('sx')) return 'SX';
                if (role.includes('admin')) return 'AD';
                return (user?.role_name || user?.role_description || 'U').charAt(0).toUpperCase();
              })()}
            </div>
            <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              {user?.full_name || user?.username || 'Người dùng'}
            </span>
          </div>
        </div>

        {showProfile && <UserProfileCard onClose={() => setShowProfile(false)} />}

        {/* Menu Items Section */}
        <div 
          className="sidebar-menu"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '15px 10px'
          }}
        >
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#7B5233', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Đang tải danh mục...
            </div>
          ) : (
            menuItems.map((item) => (
              <div key={item.id}>
                <div 
                  onClick={() => item.hasSub ? toggleExpand(item.id) : handleNavigate(item.route_path)}
                  style={getStyleForItem(item, false)}
                >
                  <DynamicIcon name={item.icon} size={20} color={isMenuRowActive(item) ? '#5d3b32' : '#666'} />
                  <span style={{ flex: 1 }}>{item.title}</span>
                  {item.hasSub && (
                    isExpanded(item.id) 
                      ? <ChevronDown size={18} color="#5d3b32" strokeWidth={3} /> 
                      : <ChevronRight size={18} color="#999" />
                  )}
                </div>

                {item.hasSub && isExpanded(item.id) && (
                  <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px' }}>
                    {item.children.map(sub => (
                      <div 
                        key={sub.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(sub.route_path);
                        }}
                        style={getStyleForItem(sub, true)}
                      >
                        {sub.icon && sub.icon !== item.icon ? (
                          <DynamicIcon name={sub.icon} size={16} color={isActive(sub.route_path) ? '#5d3b32' : '#888'} />
                        ) : (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isActive(sub.route_path) ? '#5d3b32' : '#cbd5e1', flexShrink: 0, marginLeft: 5, marginRight: 5 }} />
                        )}
                        <span>{sub.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Section */}
        <div 
          className="sidebar-footer"
          style={{
            padding: '15px',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: '#a01c1c',
            borderTop: '1px solid #eee',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <span>2026 - xây dựng bởi VINA G7</span>
          <span style={{ fontSize: '0.7rem', color: '#999' }}>Phiên bản v{appVersion}</span>
        </div>
      </div>
    </>
  )
}

export default Sidebar;
