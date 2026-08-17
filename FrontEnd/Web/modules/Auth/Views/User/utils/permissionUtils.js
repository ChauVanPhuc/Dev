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
    "Phiếu kiểm tra": "ClipboardList",
    "Đánh giá & KPI": "TrendingUp",
    "Thiết bị": "Smartphone",
    "Báo cáo CAPA": "AlertTriangle",
    "Báo cáo công việc": "FileText"
  };
  const iconName = nameMap[title] || "Circle";
  return React.createElement(DynamicIcon, { name: iconName, size: 20 });
};

export const buildPermissionGroupsFromSidebar = (sidebarItems, platform, screens = []) => {
  if (!sidebarItems || sidebarItems.length === 0) return [];
  
  // Lọc ra các nhóm cha (parent_id là null) của platform tương ứng
  const roots = sidebarItems
    .filter(item => item.platform === (platform === 'web' ? 'Web' : 'Mobile') && !item.parent_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
  return roots.map((root) => {
    // Ưu tiên lấy children đã load sẵn từ API (tree structure),
    // fallback sang tìm kiếm trong flat array nếu không có
    let children = [];
    if (root.children && Array.isArray(root.children) && root.children.length > 0) {
      children = root.children
        .filter(item => item.is_active)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    } else {
      children = sidebarItems
        .filter(item => item.parent_id === root.id && item.is_active)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    // Nếu không có children nhưng bản thân root có route_path thì chính nó là màn hình đơn
    let itemsToMap = children;
    if (children.length === 0 && root.route_path && root.is_active !== false) {
      itemsToMap = [root];
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
      
      return {
        key: key,
        name: child.title,
        desc: child.route_path ? `Đường dẫn: ${child.route_path}` : 'Mục menu điều hướng'
      };
    });
    
    return {
      title: root.title,
      screens: mappedScreens,
      id: root.id,
      platform: platform === 'web' ? 'Web' : 'Mobile'
    };
  }).filter(group => group.screens.length > 0); // Lọc bỏ các nhóm rỗng không có màn hình
};
