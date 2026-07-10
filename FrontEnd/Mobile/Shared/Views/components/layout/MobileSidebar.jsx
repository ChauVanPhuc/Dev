import { useState, useEffect } from 'react'
import { 
  LayoutGrid,
  Users,
  MessageSquare,
  Gamepad2,
  Bell,
  Smile,
  Grid,
  Coins,
  Cookie,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Truck
} from 'lucide-react'
import useUiStore from '@shared/store/uiStore'
import useAuthStore from '@modules/auth/Models/authModel'
import { useNavigate, useLocation } from 'react-router-dom'
import UserProfileCard from '../user/UserProfileCard'

const BUILT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

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

  // State quản lý các mục đang mở rộng (collapsible)
  const [expandedItems, setExpandedItems] = useState(() => {
    const list = [];
    if (location.pathname.startsWith('/inspection-') || location.pathname === '/logs' || location.pathname === '/input-inspection') {
      list.push('inspections');
    }
    if (location.pathname.startsWith('/kpi')) {
      list.push('reports');
    }
    if (location.pathname === '/plan' || location.pathname.startsWith('/delivery-info') || location.pathname.startsWith('/delivery-create') || location.pathname.startsWith('/delivery-receive') || location.pathname === '/delivery-history') {
      list.push('production_info');
    }
    return list;
  });

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

  const mapPathToPermissionKey = (pathname) => {
    const path = pathname.replace(/\/$/, '') || '/';
    
    if (path.startsWith('/delivery-info')) return 'mobile_delivery-info';
    if (path.startsWith('/delivery-history')) return 'mobile_delivery-info';
    if (path.startsWith('/delivery-create')) return 'mobile_delivery-create';
    if (path.startsWith('/delivery-receive')) return 'mobile_delivery-receive';
    if (path.startsWith('/plan')) return 'mobile_plan';
    if (path.startsWith('/inspection-daily')) return 'mobile_inspection-daily';
    if (path.startsWith('/inspection-first-article')) return 'mobile_inspection-first-article';
    if (path.startsWith('/inspection-stage-moisture')) return 'mobile_inspection-stage-moisture';
    if (path.startsWith('/inspection-stage-process')) return 'mobile_inspection-stage-process';
    if (path.startsWith('/inspection-stage-adhesion')) return 'mobile_inspection-stage-adhesion';
    if (path.startsWith('/inspection-stage')) return 'mobile_inspection-stage';
    if (path.startsWith('/logs')) return 'mobile_logs';
    if (path.startsWith('/thermal-print')) return 'mobile_thermal-print';
    if (path.startsWith('/awards')) return 'mobile_awards';
    if (path.startsWith('/kpi-staff')) return 'mobile_kpi-staff';
    if (path.startsWith('/kpi')) return 'mobile_kpi';
    if (path.startsWith('/staff-evaluation')) return 'mobile_staff-evaluation';
    if (path.startsWith('/quality-detail')) return 'mobile_quality-detail';
    if (path.startsWith('/input-inspection')) return 'mobile_input-inspection';
    if (path.startsWith('/equipment-list')) return 'mobile_equipment-list';
    if (path.startsWith('/capa-list')) return 'mobile_capa-list';
    if (path.startsWith('/capa-report')) return 'mobile_capa-report';
    if (path.startsWith('/capa-detail')) return 'mobile_capa-detail';
    if (path.startsWith('/feedback')) return 'mobile_feedback';
    
    return null;
  };

  const checkItemVisible = (path) => {
    if (!path || path === '#' || path === '/dashboard') return true;
    const key = mapPathToPermissionKey(path);
    if (!key) return true;
    const userPerm = permissions?.[key];
    return userPerm && userPerm !== 'none' && userPerm.split(',').map(p => p.trim()).includes('read');
  };

  // Mockup Raw Menu Items
  const rawMenuItems = [
    { id: 'dashboard', label: 'Trang chủ', icon: LayoutGrid, path: '/dashboard' },
    {
      id: 'production_info',
      label: 'Thông tin sản xuất',
      icon: Users,
      hasSub: true,
      items: [
        { label: 'Kế hoạch sản xuất', path: '/plan' },
        { label: 'Thông tin bàn giao', path: '/delivery-info', state: { activeTab: 'plan' } },
        { label: 'Lịch sử bàn giao', path: '/delivery-history' }
      ]
    },
    { 
      id: 'inspections', 
      label: 'Phiếu kiểm tra', 
      icon: MessageSquare, 
      hasSub: true,
      items: [
        { label: 'Kiểm tra nhập kho', path: '/inspection-stage' },
        { label: 'Kiểm tra độ ẩm', path: '/inspection-stage-moisture' },
        { label: 'Kiểm tra quy trình', path: '/inspection-stage-process' },
        { label: 'Kiểm tra mẫu đầu tiên', path: '/inspection-first-article' },
        { label: 'Kiểm tra bám dính', path: '/inspection-stage-adhesion' },
        { label: 'Kiểm tra thông số', path: '/input-inspection' },
        { label: 'Nhập lỗi', path: '/inspection-daily' },
        { label: 'Lịch sử kiểm tra', path: '/logs' }
      ] 
    },
    { 
      id: 'reports', 
      label: 'Báo cáo công việc', 
      icon: Gamepad2, 
      hasSub: true,
      items: [
        { label: 'Theo dõi KPI', path: '/kpi' },
        { label: 'Báo cáo công việc', path: '/kpi-staff' }
      ] 
    },
    { id: 'capa', label: 'Báo cáo CAPA', icon: Bell, path: '/capa-list' },
    { id: 'ctq_sos', label: 'Tạo CTQ, SOS', icon: Smile, path: '/ctq-sos' },
    { id: 'violations', label: 'Báo cáo vi phạm', icon: Grid, path: '/awards' },
    { id: 'warnings', label: 'Cảnh báo lỗi', icon: Coins, path: '/warnings' },
    { id: 'feedback', label: 'Góp ý', icon: Cookie, path: '/feedback' }
  ];

  const menuItems = rawMenuItems
    .map(item => {
      if (item.hasSub) {
        return {
          ...item,
          items: item.items.filter(sub => checkItemVisible(sub.path))
        };
      }
      return item;
    })
    .filter(item => {
      if (isAdmin) return true;
      if (item.hasSub) {
        return item.items.length > 0;
      } else {
        return checkItemVisible(item.path);
      }
    });

  const isActive = (path, state = null) => {
    if (location.pathname !== path) return false;
    if (state) {
      if (path === '/delivery-info') {
        const currentTab = (location.state && location.state.activeTab) || 'plan';
        return state.activeTab === currentTab;
      }
      if (!location.state) return false;
      return Object.keys(state).every(k => location.state[k] === state[k]);
    }
    return true;
  };

  const isMenuRowActive = (item) => {
    if (item.hasSub) {
      return item.items.some(sub => isActive(sub.path, sub.state));
    }
    return isActive(item.path, item.state);
  };

  const isExpanded = (id) => expandedItems.includes(id)

  const handleNavigate = (path, state = null) => {
    if (path === '#') return;
    navigate(path, { state })
    setSidebarOpen(false)
  }

  const getStyleForItem = (item, isSub = false) => {
    const active = isMenuRowActive(item);
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
            zIndex: 100
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
          zIndex: 101,
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
          {menuItems.map((item) => (
            <div key={item.id}>
              <div 
                onClick={() => item.hasSub ? toggleExpand(item.id) : handleNavigate(item.path, item.state)}
                style={getStyleForItem(item, false)}
              >
                <item.icon size={20} color={isMenuRowActive(item) ? '#5d3b32' : '#666'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.hasSub && (
                  isExpanded(item.id) 
                    ? <ChevronDown size={18} color="#5d3b32" strokeWidth={3} /> 
                    : <ChevronRight size={18} color="#999" />
                )}
              </div>

              {item.hasSub && isExpanded(item.id) && (
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px' }}>
                  {item.items.map(sub => (
                    <div 
                      key={sub.label} 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(sub.path, sub.state);
                      }}
                      style={getStyleForItem(sub, true)}
                    >
                      <item.icon size={16} color={isActive(sub.path, sub.state) ? '#5d3b32' : '#888'} />
                      <span>{sub.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
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
