import React from 'react';
import * as Icons from 'lucide-react';

const DynamicIcon = ({ name, size = 18, ...props }) => {
  const IconComponent = Icons[name] || Icons.Circle;
  return React.createElement(IconComponent, { size, ...props });
};

export const getGroupIcon = (title) => {
  const nameMap = {
    "Quản lý hệ thống": "Settings",
    "Nhân sự": "Users",
    "Quản lý nhân sự": "Users",
    "Module sản xuất": "Cpu",
    "Quản lý sản xuất": "Cpu",
    "Module chất lượng": "ShieldCheck",
    "Quản lý chất lượng": "ShieldCheck",
    "Module kỹ thuật": "Wrench",
    "Quản lý kỹ thuật": "Wrench",
    "Module bảo trì - máy móc": "Wrench",
    "Bảo trì - cơ sở hạ tầng": "Wrench",
    "Module kinh doanh": "Briefcase",
    "Quản lý kinh doanh": "Briefcase",
    "Quản lý KPI": "BarChart2",
    "KPI": "BarChart2",
    "Bàn giao & In ấn": "Printer",
    "Kế hoạch & Sản xuất": "Calendar",
    "Thông tin sản xuất": "Cpu",
    "QC & Chất lượng": "ShieldCheck",
    "QC & Kiểm tra chất lượng": "ShieldCheck",
    "Khởi tạo phiếu": "FolderPlus",
    "Lập báo cáo": "FileBarChart",
    "Phiếu kiểm tra": "ClipboardList",
    "Đánh giá & KPI": "TrendingUp",
    "Thiết bị": "Smartphone",
    "Báo cáo CAPA": "AlertTriangle",
    "Báo cáo vi phạm": "AlertTriangle",
    "Đánh giá nhân sự": "Award",
    "Xác nhận phiếu kiểm tra": "ShieldCheck",
    "Crawl & Tích hợp": "Globe",
    "Báo cáo công việc": "FileText"
  };
  const iconName = nameMap[title] || "Circle";
  return React.createElement(DynamicIcon, { name: iconName, size: 20 });
};

export const buildPermissionGroupsFromSidebar = (sidebarItems, platform, screens = []) => {
  if (!sidebarItems || sidebarItems.length === 0) return [];
  
  const targetPlatform = platform === 'web' ? 'Web' : 'Mobile';

  // 1. Lọc ra các nhóm cha (parent_id là null) của platform tương ứng
  const roots = sidebarItems
    .filter(item => item.platform === targetPlatform && !item.parent_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const addedKeys = new Set();

  // Hàm đệ quy làm phẳng (flatten) tất cả các menu con cấp 2, 3...
  const flattenChildren = (parentItem, prefixTitle = '') => {
    let result = [];
    let children = [];

    if (parentItem.children && Array.isArray(parentItem.children) && parentItem.children.length > 0) {
      children = parentItem.children
        .filter(item => item.is_active !== false)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    } else {
      children = sidebarItems
        .filter(item => item.parent_id === parentItem.id && item.is_active !== false)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    if (children.length > 0) {
      for (const child of children) {
        const fullTitle = prefixTitle ? `${prefixTitle} > ${child.title}` : child.title;
        const subItems = flattenChildren(child, fullTitle);
        if (subItems.length > 0) {
          result.push(...subItems);
        } else {
          result.push({
            ...child,
            displayName: fullTitle
          });
        }
      }
    } else if (parentItem.route_path && parentItem.route_path !== '#' && parentItem.is_active !== false) {
      result.push({
        ...parentItem,
        displayName: prefixTitle || parentItem.title
      });
    }

    return result;
  };
    
  // 2. Tạo danh sách các nhóm từ Sidebar
  const groups = roots.map((root) => {
    const rawItems = flattenChildren(root);
    let itemsToMap = rawItems;
    if (itemsToMap.length === 0 && root.route_path && root.route_path !== '#' && root.is_active !== false) {
      itemsToMap = [{ ...root, displayName: root.title }];
    }
      
    const mappedScreens = itemsToMap.map(child => {
      // Xác định key phân quyền duy nhất cho từng màn hình
      let key = child.route_path;
      if (!key && child.screen_id && screens.length > 0) {
        const scr = screens.find(s => s.id === child.screen_id);
        if (scr) {
          key = scr.current_code || scr.default_code;
        }
      }
      if (!key) {
        key = child.permission_key || `sb_${child.id}`;
      }

      addedKeys.add(key);
      
      return {
        key: key,
        name: child.displayName || child.title,
        desc: child.route_path && child.route_path !== '#' ? `Đường dẫn: ${child.route_path}` : 'Mục menu điều hướng'
      };
    });
    
    return {
      title: root.title,
      screens: mappedScreens,
      id: root.id,
      platform: targetPlatform
    };
  }).filter(group => group.screens.length > 0);

  // 3. Tích hợp các màn hình chức năng chi tiết ("những trang khác") từ CSDL /screens
  if (screens && screens.length > 0) {
    const candidateScreens = screens.filter(s =>
      s.is_active !== false &&
      s.platform === targetPlatform &&
      s.route_path &&
      s.route_path !== '/login' &&
      !addedKeys.has(s.route_path)
    );

    candidateScreens.forEach(scr => {
      const route = scr.route_path.toLowerCase();
      let targetGroupName = null;

      if (targetPlatform === 'Web') {
        if (route.startsWith('/admin/users') || route.startsWith('/admin/screens') || route.startsWith('/admin/monitor') || route.startsWith('/admin/system') || route.startsWith('/admin/sidebar') || route.startsWith('/admin/data') || route.startsWith('/admin/backup-qrs')) {
          targetGroupName = 'Quản lý hệ thống';
        } else if (route.startsWith('/admin/hr') || route.startsWith('/admin/employees')) {
          targetGroupName = 'Quản lý nhân sự';
        } else if (route.startsWith('/admin/iso')) {
          targetGroupName = 'Hồ sơ ISO';
        } else if (route.startsWith('/admin/plan') || route.startsWith('/admin/production') || route.startsWith('/admin/delivery') || route.startsWith('/admin/handovers') || route.startsWith('/admin/progress') || route.startsWith('/admin/exception-deliveries')) {
          targetGroupName = 'Quản lý sản xuất';
        } else if (route.startsWith('/admin/quality') || route.startsWith('/admin/reports') || route.startsWith('/admin/defects') || route.startsWith('/admin/capa') || route.startsWith('/admin/claims') || route.startsWith('/admin/claim-dashboard') || route.startsWith('/admin/hotspots') || route.includes('-guides')) {
          targetGroupName = 'Quản lý chất lượng';
        } else if (route.startsWith('/admin/orders') || route.startsWith('/admin/customers') || route.startsWith('/admin/prices') || route.startsWith('/admin/shipments') || route.startsWith('/admin/purchase')) {
          targetGroupName = 'Quản lý kinh doanh';
        } else if (route.startsWith('/admin/products') || route.startsWith('/admin/material-boms') || route.startsWith('/admin/technical') || route.startsWith('/admin/paint-colors') || route.startsWith('/admin/product-details')) {
          targetGroupName = 'Quản lý kỹ thuật';
        } else if (route.startsWith('/admin/machines') || route.startsWith('/admin/equipment') || route.startsWith('/admin/maintenance')) {
          targetGroupName = 'Bảo trì - cơ sở hạ tầng';
        } else if (route.startsWith('/admin/kpi') || route.startsWith('/admin/violations')) {
          targetGroupName = 'Quản lý KPI';
        } else if (route.startsWith('/admin/feedback') || route.startsWith('/admin/quick-reports')) {
          targetGroupName = 'Quản Lý Góp Ý';
        } else if (route.startsWith('/admin/lpn-crawler') || route.startsWith('/admin/ai-ocr-train')) {
          targetGroupName = 'Crawl & Tích hợp';
        }
      } else {
        if (route.startsWith('/production_v2') || route.startsWith('/pallet') || route.startsWith('/cabinet')) {
          targetGroupName = 'Khởi tạo phiếu';
        } else if (route.startsWith('/production') || route.startsWith('/plan')) {
          targetGroupName = 'Thông tin sản xuất';
        } else if (route.startsWith('/capa') || route.startsWith('/quick-report')) {
          targetGroupName = 'Lập báo cáo';
        } else if (route.startsWith('/inspection') || route.startsWith('/ctq-sos') || route.startsWith('/warnings') || route.startsWith('/quality') || route.startsWith('/logs') || route.startsWith('/input-inspection')) {
          targetGroupName = 'QC & Kiểm tra chất lượng';
        } else if (route.startsWith('/delivery') || route.startsWith('/thermal-print') || route.startsWith('/equipment')) {
          targetGroupName = 'Bàn giao & In ấn';
        } else if (route.startsWith('/kpi') || route.startsWith('/awards') || route.startsWith('/staff-evaluation')) {
          targetGroupName = 'Đánh giá & KPI';
        }
      }

      if (targetGroupName) {
        let grp = groups.find(g => g.title === targetGroupName);
        if (!grp) {
          grp = {
            title: targetGroupName,
            screens: [],
            id: `auto_${targetGroupName}`,
            platform: targetPlatform
          };
          groups.push(grp);
        }
        grp.screens.push({
          key: scr.route_path,
          name: `${scr.title} (${scr.default_code || scr.current_code || 'Chi tiết'})`,
          desc: `Màn hình chi tiết / chức năng con: ${scr.route_path}`
        });
        addedKeys.add(scr.route_path);
      }
    });
  }

  return groups;
};
