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
  const [expandedSubGroups, setExpandedSubGroups] = React.useState({});

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const toggleSubGroup = (subId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpandedSubGroups(prev => ({
      ...prev,
      [subId]: !prev[subId]
    }));
  };

  const user = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const isAdmin = user.role_name === 'IT' || user.role_name === 'BGD' || user.username === 'admin';

  const [activePermissions, setActivePermissions] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
    } catch {
      return {};
    }
  });

  React.useEffect(() => {
    const handleUpdated = (e) => {
      if (e?.detail) {
        setActivePermissions(e.detail);
      } else {
        try {
          setActivePermissions(JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}'));
        } catch {}
      }
    };
    window.addEventListener('smartflow_permissions_updated', handleUpdated);
    return () => window.removeEventListener('smartflow_permissions_updated', handleUpdated);
  }, []);

  React.useEffect(() => {
    const fetchSidebar = async () => {
      try {
        const data = await api.get('/system/sidebar?platform=Web');
        let list = Array.isArray(data) ? [...data] : [];
        
        // Đảm bảo "Quản Lý Góp Ý" luôn xuất hiện ở cấp cao nhất (ngang cấp Quản lý hệ thống)
        const hasFeedbackRoot = list.some(item => (!item.parent_id || item.parent_id === null) && (item.route_path === '/admin/feedback' || item.title === 'Quản Lý Góp Ý'));
        if (!hasFeedbackRoot) {
          const sysIdx = list.findIndex(item => item.title === 'Quản lý hệ thống');
          const feedbackItem = {
            id: 7,
            parent_id: null,
            title: 'Quản Lý Góp Ý',
            route_path: '/admin/feedback',
            icon: 'MessageSquare',
            sort_order: 3,
            is_active: true,
            children: []
          };
          if (sysIdx !== -1) {
            list.splice(sysIdx + 1, 0, feedbackItem);
          } else {
            list.push(feedbackItem);
          }
        }

        // 1. Chuẩn hóa nhóm "Module chất lượng": Đổi tên và icon ShieldCheck, đưa Dashboard Thống Kê, Mã Lỗi, Claim khách hàng lên đầu
        const qualityGroup = list.find(item => item.title === 'Quản lý chất lượng' || item.title === 'Quản lý Chất Lượng' || item.title === 'Module chất lượng' || item.id === 28);
        if (qualityGroup) {
          qualityGroup.title = 'Module chất lượng';
          qualityGroup.icon = 'ShieldCheck';
        }

        // 2. Chuẩn hóa nhóm "Quản lý kinh doanh": Đổi icon sang Code (<>) chuẩn theo thiết kế
        const bizGroup = list.find(item => item.title === 'Quản lý kinh doanh');
        if (bizGroup) {
          bizGroup.icon = 'Code';
        }

        // 3. Đảm bảo nhóm "Crawl & Tích hợp" (icon Globe) luôn xuất hiện
        const hasCrawler = list.some(item => item.title === 'Crawl & Tích hợp' || item.id === 'crawler');
        if (!hasCrawler) {
          const crawlerGroup = {
            id: 'crawler',
            parent_id: null,
            title: 'Crawl & Tích hợp',
            route_path: '#',
            icon: 'Globe',
            sort_order: 90,
            is_active: true,
            children: [
              { id: 'sub-lpn-crawler', title: 'Crawl dữ liệu LPN', route_path: '/admin/lpn-crawler', icon: 'Database', is_active: true },
              { id: 'sub-ai-ocr-train', title: 'Train Hình ảnh', route_path: '/admin/ai-ocr-train', icon: 'Cpu', is_active: true }
            ]
          };
          const bizIdx = list.findIndex(item => item.title === 'Quản lý kinh doanh');
          if (bizIdx !== -1) {
            list.splice(bizIdx + 1, 0, crawlerGroup);
          } else {
            list.push(crawlerGroup);
          }
        }

        // Loại bỏ bất kỳ Quản Lý Góp Ý nào còn sót trong danh sách con của các nhóm (ví dụ Quản lý hệ thống hay Quản lý chất lượng)
        list = list.map(item => {
          if (item.children && item.children.length > 0) {
            return {
              ...item,
              children: item.children.filter(c => c.route_path !== '/admin/feedback' && c.route_path !== '/admin/quick-reports')
            };
          }
          return item;
        });

        // Đảm bảo "Cấu hình hệ thống" luôn xuất hiện trong nhóm "Quản lý hệ thống"
        const sysGroup = list.find(item => item.title === 'Quản lý hệ thống' || item.id === 2);
        if (sysGroup && Array.isArray(sysGroup.children)) {
          const hasSystemConfig = sysGroup.children.some(c => c.route_path === '/admin/system-config');
          if (!hasSystemConfig) {
            sysGroup.children.push({
              id: 3113,
              parent_id: sysGroup.id,
              title: 'Cấu hình hệ thống',
              route_path: '/admin/system-config',
              icon: 'Sliders',
              sort_order: 10,
              is_active: true,
              permission_key: 'screens'
            });
          }
        }

        setMenuList(list);
      } catch (err) {
        console.error('Failed to fetch sidebar menus:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSidebar();
  }, []);

  const isBlocked = (item) => {
    let key = item.route_path || item.permission_key || `sb_${item.id}`;
    if (!key) return false;
    let perm = activePermissions[key] || (item.permission_key ? activePermissions[item.permission_key] : undefined);

    // Fallback: nếu chưa cấu hình riêng cho SOS/CTQ, kế thừa quyền từ inspection-guides
    if (perm === undefined && (item.route_path === '/admin/sos-guides' || item.route_path === '/admin/ctq-guides')) {
      perm = activePermissions['/admin/inspection-guides'] || activePermissions['inspection-guides'];
    }

    // Cho phép hiển thị Dashboard KPI nếu là kpi route
    if (item.route_path === '/admin/kpi/dashboard' || item.permission_key === 'kpi') {
      const kpiPerm = activePermissions['/admin/kpi/dashboard'] || activePermissions['kpi'];
      if (kpiPerm !== 'none') return false;
    }

    // Cho phép hiển thị Quản Lý Góp Ý
    if (item.route_path === '/admin/feedback' || item.permission_key === 'feedback') {
      const fbPerm = activePermissions['/admin/feedback'] || activePermissions['feedback'];
      if (fbPerm !== 'none') return false;
    }

    // Whitelist các module Claim, Dashboard, Price, Crawl, Train không bao giờ bị chặn trừ khi gán 'none' rõ ràng
    const allowByDefaultRoutes = [
      '/admin/claim-dashboard',
      '/admin/defects',
      '/admin/claims',
      '/admin/prices',
      '/admin/lpn-crawler',
      '/admin/ai-ocr-train',
      '/admin/system-config'
    ];
    if (allowByDefaultRoutes.includes(item.route_path)) {
      if (perm === 'none') return true;
      return false;
    }

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

    // 1. Exact match with pathname (when item has no query)
    if (location.pathname === item.route_path) {
      // If current URL has a query string, verify whether another item matches the query exactly
      if (location.search) {
        let hasExactMatchWithQuery = false;
        for (const group of menuList) {
          const children = getGroupChildren(group);
          for (const child of children) {
            if (child.route_path === (location.pathname + location.search)) {
              hasExactMatchWithQuery = true;
              break;
            }
            if (child.children) {
              for (const sub of child.children) {
                if (sub.route_path === (location.pathname + location.search)) {
                  hasExactMatchWithQuery = true;
                  break;
                }
              }
            }
          }
          if (hasExactMatchWithQuery) break;
        }
        if (hasExactMatchWithQuery) return false;
      }
      return true;
    }

    // 2. Prefix match for nested child views (e.g. /admin/capa/create matches /admin/capa)
    if (
      item.route_path !== '/admin/dashboard' &&
      item.route_path !== '/admin/manufacture-dashboard' &&
      location.pathname.startsWith(item.route_path + '/')
    ) {
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
            if (child.children) {
              for (const sub of child.children) {
                if (location.pathname === sub.route_path || (location.pathname + location.search) === sub.route_path) {
                  hasExactMatchSibling = true;
                  break;
                }
              }
            }
          }
        }
        if (hasExactMatchSibling) break;
      }

      return !hasExactMatchSibling;
    }

    return false;
  };

  // Helper lay danh sach trang con cua group (tinh den ca truong hop ghi de Quản lý sản xuất)
  const getGroupChildren = (group) => {
    if (group.title === 'Quản lý sản xuất') {
      if (group.children && group.children.length > 0) {
        return group.children;
      }
      return [
        { id: 21, parent_id: 19, title: 'Lệnh sản xuất', route_path: '/admin/production-orders', icon: 'Handshake' },
        { id: 24, parent_id: 19, title: 'Quy trình - kế hoạch', route_path: '/admin/production-routing', icon: 'Handshake' },
        { id: 25, parent_id: 19, title: 'Danh sách bàn giao', route_path: '/admin/delivery-tracking', icon: 'Handshake' }
      ];
    }
    if (group.title === 'Quản lý KPI' || group.title === 'KPI') {
      if (group.children && group.children.length > 0) {
        return group.children;
      }
      return [
        { id: 102, parent_id: group.id, title: 'Danh sách & Sơ đồ nhân sự', route_path: '/admin/kpi/personnel', icon: 'Users' },
        { id: 103, parent_id: group.id, title: 'Hồ sơ chất lượng', route_path: '/admin/kpi/quality-profiles', icon: 'ShieldCheck' },
        { id: 104, parent_id: group.id, title: 'Danh sách vi phạm', route_path: '/admin/violations', icon: 'AlertTriangle' },
        { id: 105, parent_id: group.id, title: 'Danh mục mẫu Checklist', route_path: '/admin/kpi/checklist', icon: 'CheckSquare' },
        { id: 106, parent_id: group.id, title: 'Quy tắc cộng trừ điểm', route_path: '/admin/kpi/rules', icon: 'FileText' }
      ];
    }
    let list = group.children || [];
    if (group.title === 'Module chất lượng' || group.title === 'Quản lý chất lượng' || group.title === 'Quản lý Chất Lượng') {
      list = list.filter(item => item.route_path !== '/admin/quality-targets');
      
      // Lọc bỏ 3 item này khỏi list gốc để đưa lên đầu chuẩn theo ảnh thiết kế
      const rest = list.filter(item => 
        item.route_path !== '/admin/claim-dashboard' && 
        item.title !== 'Dashboard Thống Kê' &&
        item.route_path !== '/admin/defects' && 
        item.title !== 'Mã Lỗi' && 
        item.title !== 'Danh sách lỗi' &&
        item.route_path !== '/admin/claims' && 
        item.title !== 'Claim khách hàng'
      );

      list = [
        { id: 991, parent_id: group.id, title: 'Dashboard Thống Kê', route_path: '/admin/claim-dashboard', icon: 'LayoutDashboard' },
        { id: 992, parent_id: group.id, title: 'Mã Lỗi', route_path: '/admin/defects', icon: 'Slash' },
        { id: 993, parent_id: group.id, title: 'Claim khách hàng', route_path: '/admin/claims', icon: 'MessageCircle' },
        ...rest
      ];

      const hasTargetMenu = list.some(item => item.route_path === '/admin/kpi/dashboard');
      if (!hasTargetMenu) {
        list = [...list, { id: 101, parent_id: group.id, title: 'Mục tiêu Chất Lượng', route_path: '/admin/kpi/dashboard', icon: 'Target' }];
      } else {
        list = list.map(item => item.route_path === '/admin/kpi/dashboard' ? { ...item, title: 'Mục tiêu Chất Lượng', icon: 'Target' } : item);
      }

      const hasEmpMenu = list.some(item => item.route_path === '/admin/kpi/quality-employees');
      if (!hasEmpMenu) {
        list = [...list, { id: 107, parent_id: group.id, title: 'Danh sách nhân sự', route_path: '/admin/kpi/quality-employees', icon: 'UserCheck' }];
      } else {
        list = list.map(item => item.route_path === '/admin/kpi/quality-employees' ? { ...item, title: 'Danh sách nhân sự' } : item);
      }
    }
    if (group.title === 'Quản lý kinh doanh') {
      const rest = list.filter(item => item.route_path !== '/admin/prices' && item.title !== 'Quản lý giá tủ');
      list = [
        { id: 994, parent_id: group.id, title: 'Quản lý giá tủ', route_path: '/admin/prices', icon: 'Tag' },
        ...rest
      ];
    }
    if (group.title === 'Crawl & Tích hợp') {
      return [
        { id: 995, parent_id: group.id, title: 'Crawl dữ liệu LPN', route_path: '/admin/lpn-crawler', icon: 'Database' },
        { id: 996, parent_id: group.id, title: 'Train Hình ảnh', route_path: '/admin/ai-ocr-train', icon: 'Cpu' }
      ];
    }
    if (group.title === 'Hồ sơ ISO' || group.title === 'Hồ sơ chuẩn ISO' || group.title === 'Quản lý ISO') {
      // Dữ liệu 5 mục con hoàn toàn lấy động từ CSDL (system_sidebars)
      list = [...list].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
    }
    // Đảm bảo không có Quản Lý Góp Ý nằm bên trong bất kỳ group nào (vì đã chuyển lên cấp cao nhất)
    list = list.filter(item => item.route_path !== '/admin/feedback' && item.route_path !== '/admin/quick-reports');
    return list;
  };

  // Helper check xem group co child nao dang active ko (bao gom ca sub-children)
  const hasActiveChild = (group) => {
    if ((group.title === 'Hồ sơ ISO' || group.title === 'Hồ sơ chuẩn ISO' || group.title === 'Quản lý ISO') && (
      location.pathname.startsWith('/admin/iso-')
    )) {
      return true;
    }
    if (group.title === 'Quản lý hệ thống' && (
      location.pathname === '/admin/monitor' || 
      location.pathname === '/admin/monitor/'
    )) {
      return true;
    }
    if ((group.title === 'Module chất lượng' || group.title === 'Quản lý chất lượng' || group.title === 'Quản lý Chất Lượng') && (
      location.pathname === '/admin/quality' || 
      location.pathname === '/admin/quality/' ||
      location.pathname === '/admin/claim-dashboard' ||
      location.pathname === '/admin/claim-dashboard/' ||
      location.pathname === '/admin/defects' ||
      location.pathname === '/admin/defects/' ||
      location.pathname === '/admin/claims' ||
      location.pathname === '/admin/claims/' ||
      location.pathname === '/admin/kpi/dashboard' ||
      location.pathname === '/admin/kpi/dashboard/' ||
      location.pathname === '/admin/kpi/quality-employees' ||
      location.pathname === '/admin/kpi/quality-employees/'
    )) {
      return true;
    }
    if (group.title === 'Quản lý kinh doanh' && (
      location.pathname === '/admin/prices' ||
      location.pathname === '/admin/prices/'
    )) {
      return true;
    }
    if (group.title === 'Crawl & Tích hợp' && (
      location.pathname === '/admin/lpn-crawler' ||
      location.pathname === '/admin/lpn-crawler/' ||
      location.pathname === '/admin/ai-ocr-train' ||
      location.pathname === '/admin/ai-ocr-train/'
    )) {
      return true;
    }
    if ((group.title === 'Quản lý KPI' || group.title === 'KPI') && (
      (location.pathname.startsWith('/admin/kpi') && location.pathname !== '/admin/kpi/dashboard') ||
      location.pathname.startsWith('/admin/violations')
    )) {
      return true;
    }
    const children = getGroupChildren(group);
    return children.some(child => {
      if (child.children && child.children.length > 0) {
        return child.children.some(sub => checkIsActive(sub));
      }
      return checkIsActive(child);
    });
  };

  React.useEffect(() => {
    if (menuList.length === 0) return;

    let targetGroupId = null;
    const newSubGroups = {};

    // 1. Kiểm tra xem nhóm ĐANG MỞ có chứa trang active này không
    setExpandedGroups(prev => {
      for (const groupIdStr in prev) {
        if (prev[groupIdStr]) {
          const group = menuList.find(g => String(g.id) === String(groupIdStr));
          if (group && hasActiveChild(group)) {
            targetGroupId = group.id;
            break;
          }
        }
      }

      // 2. Nếu nhóm đang mở không chứa route active, tìm nhóm đầu tiên chứa route active
      if (targetGroupId === null) {
        for (const group of menuList) {
          if (hasActiveChild(group)) {
            targetGroupId = group.id;
            break;
          }
        }
      }

      // 3. Nếu tìm thấy nhóm active, chỉ mở nhóm đó
      if (targetGroupId !== null) {
        return { [targetGroupId]: true };
      }
      return prev;
    });

    // 4. Auto expand sub-group if any sub-child is active
    for (const group of menuList) {
      const children = getGroupChildren(group);
      for (const child of children) {
        if (child.children && child.children.length > 0) {
          if (child.children.some(sub => checkIsActive(sub))) {
            newSubGroups[child.id] = true;
          }
        }
      }
    }

    if (Object.keys(newSubGroups).length > 0) {
      setExpandedSubGroups(prev => ({ ...prev, ...newSubGroups }));
    }
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
            transition: 'background-color 0.15s ease, color 0.15s ease',
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
                let rawChildren = getGroupChildren(item);

                // Lọc các item con và sub-item con theo quyền
                const visibleChildren = rawChildren.map(child => {
                  if (child.children && child.children.length > 0) {
                    const validSubs = child.children.filter(sub => !isBlocked(sub));
                    if (validSubs.length === 0) return null;
                    return { ...child, children: validSubs };
                  }
                  if (isBlocked(child)) return null;
                  return child;
                }).filter(Boolean);

                if (visibleChildren.length === 0) return null;
                return { ...item, children: visibleChildren };
              }
            }).filter(Boolean).map(item => {
              if (!item.children || item.children.length === 0) {
                return renderDirectLink(item);
              } else {
                const isExpanded = !!expandedGroups[item.id];
                const isGroupActive = isExpanded && hasActiveChild(item);

                const isQualityGroup = item.id === 28 || 
                  item.title === 'Module chất lượng' || 
                  item.title === 'Quản lý chất lượng' || 
                  item.title === 'Quản lý Chất Lượng' ||
                  false;

                const handleHeaderClick = () => {
                  if (isQualityGroup) {
                    setExpandedGroups(prev => ({
                      ...prev,
                      [item.id]: true
                    }));
                    if (location.pathname === '/admin/quality' || location.pathname === '/admin/quality/') {
                      toggleGroup(item.id);
                    } else {
                      navigate('/admin/quality');
                      if (onClose) onClose();
                    }
                  } else if (item.route_path && item.route_path !== '#' && item.route_path !== 'None') {
                    if (location.pathname === item.route_path) {
                      toggleGroup(item.id);
                    } else {
                      setExpandedGroups(prev => ({
                        ...prev,
                        [item.id]: true
                      }));
                      navigate(item.route_path);
                      if (onClose) onClose();
                    }
                  } else {
                    toggleGroup(item.id);
                  }
                };

                return (
                  <div key={item.id} className="sidebar-group-container" style={{ marginBottom: '6px' }}>
                    <button
                      type="button"
                      onClick={handleHeaderClick}
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
                        transition: 'background-color 0.15s ease, color 0.15s ease',
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
                      <span
                        className="chevron-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(item.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          color: isGroupActive ? '#5D3B32' : '#A0A3A8',
                          padding: '4px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </span>
                    </button>
                    {isExpanded && (
                      <ul className="sidebar-group-children" style={{ listStyle: 'none', padding: '2px 0 6px 0', margin: 0 }}>
                        {item.children.map(child => {
                          if (child.children && child.children.length > 0) {
                            const isSubExpanded = !!expandedSubGroups[child.id];
                            const isAnySubActive = child.children.some(sub => checkIsActive(sub));

                            return (
                              <li key={child.id} className="nav-item" style={{ marginBottom: '2px' }}>
                                <div
                                  onClick={(e) => toggleSubGroup(child.id, e)}
                                  className={`nav-link-child ${isAnySubActive ? 'active' : ''}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 16px 10px 36px',
                                    color: isAnySubActive ? '#5D3B32' : '#6B7280',
                                    backgroundColor: isAnySubActive ? '#FAF6F0' : 'transparent',
                                    fontWeight: isAnySubActive ? '800' : '600',
                                    fontSize: '0.85rem',
                                    transition: 'background-color 0.15s ease, color 0.15s ease',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span className="nav-icon" style={{ marginRight: '10px', display: 'flex', alignItems: 'center', color: isAnySubActive ? '#5D3B32' : '#9CA3AF' }}>
                                      <DynamicIcon name={child.icon || 'BookOpen'} size={14} />
                                    </span>
                                    <span className="nav-text">{child.title}</span>
                                  </div>
                                  <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    transform: isSubExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                    color: isAnySubActive ? '#5D3B32' : '#9CA3AF'
                                  }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                  </span>
                                </div>

                                {isSubExpanded && (
                                  <ul style={{ listStyle: 'none', padding: '2px 0 4px 0', margin: 0 }}>
                                    {child.children.map(subChild => {
                                      const isSubActive = checkIsActive(subChild);
                                      return (
                                        <li key={subChild.id} style={{ marginBottom: '2px' }}>
                                          <Link
                                            to={subChild.route_path}
                                            onClick={handleLinkClick}
                                            title={subChild.title}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              padding: '7px 12px 7px 38px',
                                              textDecoration: 'none',
                                              color: isSubActive ? '#5D3B32' : '#64748B',
                                              backgroundColor: isSubActive ? '#F5EFE9' : 'transparent',
                                              fontWeight: isSubActive ? '800' : '500',
                                              fontSize: '0.82rem',
                                              transition: 'background-color 0.15s ease, color 0.15s ease',
                                              borderRadius: '6px',
                                              borderLeft: isSubActive ? '3px solid #7B5233' : '3px solid transparent'
                                            }}
                                          >
                                            <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center', color: isSubActive ? '#7B5233' : '#94A3B8' }}>
                                              <DynamicIcon name={subChild.icon || 'FileText'} size={13} />
                                            </span>
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {subChild.title}
                                            </span>
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </li>
                            );
                          }

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
                                  transition: 'background-color 0.15s ease, color 0.15s ease',
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

                <div style={{ fontSize: '9px', color: '#7B5233', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }} title={upload.message || ''}>
                    {upload.status === 'uploading' && (
                      <div style={{ width: '8px', height: '8px', border: '1.5px solid #A0301B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mgmtSpin 0.8s linear infinite', flexShrink: 0 }} />
                    )}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {upload.message || (upload.sheet ? `Sheet [${upload.sheet}]` : (upload.status === 'uploading' ? 'Đang xử lý...' : upload.status === 'completed' ? 'Hoàn thành' : 'Lỗi'))}
                    </span>
                  </div>
                  <span style={{ flexShrink: 0, color: '#A0301B', fontWeight: '800' }}>
                    {upload.processed !== undefined && upload.total
                      ? `${upload.processed}/${upload.total}`
                      : (upload.total_sheets && upload.sheet_index ? `${upload.sheet_index}/${upload.total_sheets} sheet` : '')}
                  </span>
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
