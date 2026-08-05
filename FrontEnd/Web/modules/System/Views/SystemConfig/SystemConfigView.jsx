import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import { hrService } from '@modules/auth/Models/hr.service';
import DepartmentModal from '@modules/auth/Views/Department/DepartmentModal';
import { 
  FileText, Plus, Edit2, Trash2, Search, ArrowUp, ArrowDown, Layout, Smartphone, 
  X, HelpCircle, Save, ChevronRight, CheckSquare, Square, RefreshCw, Layers, Briefcase, Users, Building2, Sliders
} from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import '@styles/components.css';

import * as Icons from 'lucide-react';

const DynamicIcon = ({ name, size = 16, ...props }) => {
  if (!name) return <HelpCircle size={size} {...props} />;
  const IconComponent = Icons[name];
  if (!IconComponent) return <HelpCircle size={size} {...props} />;
  return <IconComponent size={size} {...props} />;
};

export default function SystemConfigView() {
  const { setCustomTitle, setCustomSubtitle } = useOutletContext();
  const { toast } = useToast();

  // LEFT MENU SELECTION STATE
  // 'factory' | 'department' | 'position' | 'role' | 'sidebar'
  const [activeTab, setActiveTab] = useState('factory');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState([]);
  
  // MODAL STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);

  // --- FACTORY FORM STATES ---
  const [factoryCode, setFactoryCode] = useState('');
  const [factoryName, setFactoryName] = useState('');
  const [factoryType, setFactoryType] = useState('Nhà máy');
  const [factoryParentId, setFactoryParentId] = useState('');
  const [factoryDesc, setFactoryDesc] = useState('');

  // --- GENERAL DEPARTMENT/POSITION FORM STATES ---
  const [generalCode, setGeneralCode] = useState('');
  const [generalName, setGeneralName] = useState('');
  const [generalDesc, setGeneralDesc] = useState('');

  // --- SIDEBAR TREE STATES ---
  const [sidebarPlatform, setSidebarPlatform] = useState('Web'); // 'Web' or 'Mobile'
  const [collapsedGroupIds, setCollapsedGroupIds] = useState({});
  const [formTitle, setFormTitle] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formRoutePath, setFormRoutePath] = useState('');
  const [formIcon, setFormIcon] = useState('LayoutGrid');
  const [formPermissionKey, setFormPermissionKey] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const iconOptions = [
    'LayoutGrid', 'Settings', 'Users', 'ShieldCheck', 'Wrench', 'BarChart2',
    'Calendar', 'FileText', 'ShoppingCart', 'Sliders', 'Home', 'Box', 'Cpu',
    'Clock', 'Bell', 'QrCode', 'MessageSquare', 'Gamepad2', 'Smile', 'Grid',
    'Coins', 'Cookie', 'Network', 'User', 'Briefcase', 'Folder', 'File',
    'Layers', 'Truck', 'AlertTriangle', 'Slash', 'MessageCircle', 'CheckCircle',
    'Clipboard', 'List', 'MapPin', 'BookOpen', 'DollarSign', 'Tag', 'FilePlus'
  ];

  // Set page headers
  useEffect(() => {
    setCustomTitle('Cấu hình hệ thống');
    setCustomSubtitle('Thiết lập cấu trúc cơ cấu tổ chức và phân hệ menu hệ thống ERP');
  }, [setCustomTitle, setCustomSubtitle]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeof e.target.closest === 'function') {
        if (!e.target.closest('.action-menu') && !e.target.closest('.action-btn')) {
          setActionMenuId(null);
        }
      } else {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Data based on active Left Menu Tab
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'factory') {
        const res = await hrService.getFactoryStructures();
        setDataList(res || []);
      } else if (activeTab === 'department') {
        const res = await hrService.getDepartments();
        setDataList(res || []);
      } else if (activeTab === 'position') {
        const res = await hrService.getPositions();
        setDataList(res || []);
      } else if (activeTab === 'role') {
        const res = await api.get('/roles/?include_inactive=true');
        setDataList(res || []);
      } else if (activeTab === 'sidebar') {
        const res = await api.get('/system/sidebar/all');
        setDataList(res || []);
      }
    } catch (e) {
      console.error(e);
      toast('error', 'Lỗi khi tải danh sách cấu hình!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchQuery('');
    loadData();
  }, [activeTab]);

  // Clean data searching
  const filteredData = useMemo(() => {
    if (activeTab === 'sidebar') {
      return dataList.filter(m => m.platform === sidebarPlatform);
    }
    if (!searchQuery) return dataList;
    const query = searchQuery.toLowerCase();
    return dataList.filter(item => {
      if (activeTab === 'factory') {
        return (item.structure_name || '').toLowerCase().includes(query) ||
               (item.structure_code || '').toLowerCase().includes(query) ||
               (item.structure_type || '').toLowerCase().includes(query);
      }
      if (activeTab === 'department' || activeTab === 'position') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.code || '').toLowerCase().includes(query);
      }
      if (activeTab === 'role') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.description || '').toLowerCase().includes(query);
      }
      return false;
    });
  }, [dataList, searchQuery, activeTab, sidebarPlatform]);

  // Sidebar Tree collapse state toggle
  const toggleCollapse = (itemId) => {
    setCollapsedGroupIds(prev => ({
      ...prev,
      [itemId]: prev[itemId] === false ? true : false
    }));
  };

  // OPEN DIALOGS
  const handleOpenAddModal = () => {
    setSelectedItem(null);
    if (activeTab === 'factory') {
      setFactoryCode('');
      setFactoryName('');
      setFactoryType('Nhà máy');
      setFactoryParentId('');
      setFactoryDesc('');
    } else if (activeTab === 'department' || activeTab === 'position') {
      setGeneralCode('');
      setGeneralName('');
      setGeneralDesc('');
    } else if (activeTab === 'role') {
      // Handled separately via DepartmentModal
    } else if (activeTab === 'sidebar') {
      setFormTitle('');
      setFormParentId('');
      setFormRoutePath('');
      setFormIcon('LayoutGrid');
      setFormPermissionKey('');
      setFormIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setSelectedItem(item);
    if (activeTab === 'factory') {
      setFactoryCode(item.structure_code || '');
      setFactoryName(item.structure_name || '');
      setFactoryType(item.structure_type || 'Nhà máy');
      setFactoryParentId(item.parent_id ? String(item.parent_id) : '');
      setFactoryDesc(item.description || '');
    } else if (activeTab === 'department' || activeTab === 'position') {
      setGeneralCode(item.code || '');
      setGeneralName(item.name || '');
      setGeneralDesc(item.description || '');
    } else if (activeTab === 'role') {
      // Handled separately
    } else if (activeTab === 'sidebar') {
      setFormTitle(item.title || '');
      setFormParentId(item.parent_id ? String(item.parent_id) : '');
      setFormRoutePath(item.route_path || '');
      setFormIcon(item.icon || 'LayoutGrid');
      setFormPermissionKey(item.permission_key || '');
      setFormIsActive(item.is_active);
    }
    setIsModalOpen(true);
  };

  // CONFIRM SAVE
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      if (activeTab === 'factory') {
        const payload = {
          structure_code: factoryCode.trim(),
          structure_name: factoryName.trim(),
          structure_type: factoryType,
          parent_id: factoryParentId ? parseInt(factoryParentId) : null,
          description: factoryDesc.trim() || null
        };
        if (selectedItem) {
          if (selectedItem.id === null) {
            await hrService.upsertFactoryStructure(payload.structure_code, payload);
            toast('success', 'Đồng bộ cấu trúc nhà máy thành công!');
          } else {
            await hrService.updateFactoryStructure(selectedItem.id, payload);
            toast('success', 'Cập nhật cấu trúc nhà máy thành công!');
          }
        } else {
          await hrService.createFactoryStructure(payload);
          toast('success', 'Thêm mới cấu trúc nhà máy thành công!');
        }
      } else if (activeTab === 'department') {
        const payload = {
          code: generalCode.trim(),
          name: generalName.trim(),
          description: generalDesc.trim() || null
        };
        if (selectedItem) {
          await hrService.updateDepartment(selectedItem.id, payload);
          toast('success', 'Cập nhật phòng ban thành công!');
        } else {
          await hrService.createDepartment(payload);
          toast('success', 'Thêm mới phòng ban thành công!');
        }
      } else if (activeTab === 'position') {
        const payload = {
          code: generalCode.trim(),
          name: generalName.trim(),
          description: generalDesc.trim() || null
        };
        if (selectedItem) {
          await hrService.updatePosition(selectedItem.id, payload);
          toast('success', 'Cập nhật vị trí thành công!');
        } else {
          await hrService.createPosition(payload);
          toast('success', 'Thêm mới vị trí thành công!');
        }
      } else if (activeTab === 'sidebar') {
        const payload = {
          platform: sidebarPlatform,
          parent_id: formParentId ? parseInt(formParentId) : null,
          title: formTitle.trim(),
          route_path: formRoutePath.trim() || null,
          icon: formIcon || null,
          permission_key: formPermissionKey.trim() || null,
          screen_id: null,
          is_active: formIsActive
        };
        if (selectedItem) {
          await api.put(`/system/sidebar/${selectedItem.id}`, payload);
          toast('success', 'Cập nhật menu sidebar thành công!');
        } else {
          // Sort order calculation
          const siblings = formParentId 
            ? (dataList.find(m => m.id === parseInt(formParentId))?.children || [])
            : filteredData;
          payload.sort_order = siblings.length + 1;
          await api.post('/system/sidebar', payload);
          toast('success', 'Thêm mới menu sidebar thành công!');
        }
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Lưu cấu hình thất bại!');
    }
  };

  // HANDLE DELETE
  const handleOpenDeleteModal = (item) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      if (activeTab === 'factory') {
        await hrService.deleteFactoryStructure(deletingItem.id);
      } else if (activeTab === 'department') {
        await hrService.deleteDepartment(deletingItem.id);
      } else if (activeTab === 'position') {
        await hrService.deletePosition(deletingItem.id);
      } else if (activeTab === 'role') {
        await api.delete(`/roles/${deletingItem.id}`);
      } else if (activeTab === 'sidebar') {
        await api.delete(`/system/sidebar/${deletingItem.id}`);
      }
      toast('success', 'Xóa cấu hình thành công!');
      setIsDeleteModalOpen(false);
      setDeletingItem(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Không thể xóa cấu hình này!');
    }
  };

  const handleSyncFromBOM = async () => {
    setLoading(true);
    try {
      await hrService.syncFactoryStructuresFromBOM();
      toast('success', 'Cập nhật và đồng bộ cấu trúc nhà máy từ dữ liệu BOM thành công!');
      loadData();
    } catch (err) {
      console.error(err);
      toast('error', 'Cập nhật từ dữ liệu BOM thất bại!');
    } finally {
      setLoading(false);
    }
  };

  // SIDEBAR SPECIFIC: MOVE UP / DOWN
  const handleSidebarMove = async (item, direction) => {
    const siblings = item.parent_id
      ? (dataList.find(m => m.id === item.parent_id)?.children || [])
      : filteredData;

    const currentIndex = siblings.findIndex(s => s.id === item.id);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex + (direction === 'up' ? -1 : 1);
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const targetItem = siblings[targetIndex];

    const updatedItems = [
      { id: item.id, parent_id: item.parent_id, sort_order: targetItem.sort_order },
      { id: targetItem.id, parent_id: targetItem.parent_id, sort_order: item.sort_order }
    ];

    try {
      await api.put('/system/sidebar/reorder', { items: updatedItems });
      toast('success', 'Đã sắp xếp lại thứ tự menu!');
      loadData();
    } catch (err) {
      toast('error', 'Sắp xếp menu thất bại!');
    }
  };

  // SIDEBAR TREE RENDERER
  const renderSidebarNode = (item, depth = 0) => {
    const isParent = item.children && item.children.length > 0;
    const paddingLeft = `${depth * 28 + 16}px`;
    const isCollapsed = depth === 0 && isParent && collapsedGroupIds[item.id] !== false;

    return (
      <React.Fragment key={item.id}>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px 12px ' + paddingLeft,
            borderBottom: '1px solid #F3F4F6',
            backgroundColor: !item.is_active ? '#F9FAFB' : '#FFFFFF',
            opacity: item.is_active ? 1 : 0.6
          }}
          className="menu-row-item"
        >
          <div 
            onClick={() => {
              if (depth === 0 && isParent) {
                toggleCollapse(item.id);
              }
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              flex: 1, 
              minWidth: 0,
              cursor: (depth === 0 && isParent) ? 'pointer' : 'default',
              userSelect: 'none'
            }}
          >
            {depth === 0 && isParent && (
              <span style={{ 
                color: '#9CA3AF', 
                display: 'flex', 
                alignItems: 'center',
                transition: 'transform 0.2s',
                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)'
              }}>
                <ChevronRight size={16} />
              </span>
            )}
            <span style={{ color: '#7B5233', display: 'flex', alignItems: 'center' }}>
              <DynamicIcon name={item.icon} size={depth === 0 ? 18 : 14} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ 
                fontWeight: depth === 0 ? 800 : 600, 
                color: depth === 0 ? '#1F2937' : '#4B5563',
                fontSize: depth === 0 ? '0.95rem' : '0.85rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {item.title}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.route_path || '---'} {item.permission_key ? `[Quyền: ${item.permission_key}]` : ''}
              </span>
            </div>
            {!item.is_active && (
              <span style={{
                fontSize: '0.65rem',
                backgroundColor: '#E5E7EB',
                color: '#6B7280',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 'bold',
                marginLeft: '8px'
              }}>
                Ẩn
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
            <button 
              onClick={() => handleSidebarMove(item, 'up')}
              style={{
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#4B5563'
              }}
              title="Di chuyển lên"
            >
              <ArrowUp size={14} />
            </button>
            <button 
              onClick={() => handleSidebarMove(item, 'down')}
              style={{
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#4B5563'
              }}
              title="Di chuyển xuống"
            >
              <ArrowDown size={14} />
            </button>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#E5E7EB', margin: '0 4px' }} />

            {depth === 0 && (
              <button 
                onClick={() => {
                  setSelectedItem(null);
                  setFormTitle('');
                  setFormParentId(String(item.id));
                  setFormRoutePath('');
                  setFormIcon('LayoutGrid');
                  setFormPermissionKey('');
                  setFormIsActive(true);
                  setIsModalOpen(true);
                }}
                style={{
                  border: '1px solid #7B5233',
                  backgroundColor: '#FAF6F0',
                  borderRadius: '6px',
                  padding: '0 8px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  color: '#7B5233',
                  fontWeight: 'bold',
                  fontSize: '0.75rem'
                }}
                title="Thêm mục con"
              >
                <Plus size={12} />
                <span>Mục con</span>
              </button>
            )}

            <button 
              onClick={() => handleOpenEditModal(item)}
              style={{
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#2563EB'
              }}
              title="Chỉnh sửa"
            >
              <Edit2 size={14} />
            </button>
            <button 
              onClick={() => handleOpenDeleteModal(item)}
              style={{
                border: '1px solid #FCA5A5',
                backgroundColor: '#FEF2F2',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#EF4444'
              }}
              title="Xóa mục"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {isParent && !isCollapsed && item.children.map(child => renderSidebarNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  // ROLE SPECIFIC HANDLERS
  const handleRoleConfirm = async (roleData) => {
    try {
      if (selectedItem) {
        // Edit Role
        await api.put(`/roles/${selectedItem.id}`, roleData);
        toast('success', `Đã cập nhật bộ phận "${roleData.name}" thành công!`);
      } else {
        // Create Role
        await api.post('/roles/', roleData);
        toast('success', `Đã tạo mới bộ phận "${roleData.name}" thành công!`);
      }
      setIsModalOpen(false);
      setSelectedItem(null);
      loadData();
    } catch (err) {
      toast('error', err.response?.data?.detail || 'Lưu bộ phận thất bại!');
    }
  };

  // FORMAT DATE HELPER
  const formatDate = (rawStr) => {
    if (!rawStr) return '---';
    try {
      const dt = new Date(rawStr);
      if (isNaN(dt.getTime())) return rawStr;
      const d = String(dt.getDate()).padStart(2, '0');
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const y = dt.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return rawStr;
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '20px', backgroundColor: '#F9FBFB', minHeight: '85vh' }}>
      
      {/* 2-Pane Master-Detail Flex Layout */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Left Pane (Master Navigation Menu) */}
        <div style={{
          width: '280px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          padding: '20px 16px'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '1.05rem',
            fontWeight: 800,
            color: '#7B5233',
            borderBottom: '2px dashed #F3F4F6',
            paddingBottom: '12px'
          }}>
            Thông tin cần cấu hình
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'factory', label: 'Nhà máy', icon: Building2 },
              { id: 'department', label: 'Phòng ban', icon: Users },
              { id: 'position', label: 'Vị trí', icon: Briefcase },
              { id: 'role', label: 'Bộ phận', icon: Layers },
              { id: 'sidebar', label: 'Phân hệ', icon: Sliders }
            ].map(tab => {
              const IconComp = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    width: '100%',
                    border: 'none',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                    color: isSelected ? '#7B5233' : '#4B5563',
                    fontWeight: isSelected ? '800' : '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <IconComp size={18} style={{ color: isSelected ? '#7B5233' : '#6B7280' }} />
                  <span style={{ fontSize: '0.85rem' }}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane (Detail Config Panel) */}
        <div style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          overflow: 'visible'
        }}>
          
          {/* Right Header & Search tool */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAF8F6',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#2D1A12', fontWeight: 800 }}>
                {activeTab === 'factory' && 'Danh mục Cấu trúc nhà máy'}
                {activeTab === 'department' && 'Danh mục Phòng ban Nhân sự'}
                {activeTab === 'position' && 'Danh mục Vị trí / Chức danh'}
                {activeTab === 'role' && 'Danh mục Bộ phận & Phân quyền mặc định'}
                {activeTab === 'sidebar' && 'Cấu hình Phân hệ & Cây Menu Sidebar'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>
                {activeTab === 'factory' && 'Quản lý sơ đồ các Nhà máy, Phân xưởng và Tổ sản xuất vật lý.'}
                {activeTab === 'department' && 'Quản lý các phòng ban hỗ trợ định danh nhân viên.'}
                {activeTab === 'position' && 'Thiết lập danh mục chức vụ công tác trong công ty.'}
                {activeTab === 'role' && 'Cấu hình các bộ phận chính và nhóm phân quyền màn hình tương ứng.'}
                {activeTab === 'sidebar' && 'Thiết lập lưu đồ menu điều hướng cho bản Web và Mobile.'}
              </p>
            </div>

            {/* General Actions & Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeTab === 'sidebar' ? (
                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#E5E7EB', padding: '2px', borderRadius: '8px' }}>
                  {['Web', 'Mobile'].map(plat => (
                    <button
                      key={plat}
                      onClick={() => setSidebarPlatform(plat)}
                      style={{
                        padding: '6px 14px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: sidebarPlatform === plat ? '#FFFFFF' : 'transparent',
                        color: sidebarPlatform === plat ? '#7B5233' : '#4B5563',
                        transition: 'all 0.2s'
                      }}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm nhanh..."
                    style={{
                      padding: '8px 12px 8px 36px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.85rem',
                      width: '200px',
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              <button
                onClick={loadData}
                style={{
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#4B5563'
                }}
                title="Tải lại dữ liệu"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Right Body Table / Tree */}
          <div style={{ padding: '20px' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#7B5233', fontWeight: 'bold' }}>
                Đang tải dữ liệu cấu hình...
              </div>
            ) : activeTab === 'sidebar' ? (
              // SIDEBAR TREE VIEW
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#FAF8F6',
                  borderBottom: '2px solid #E5E7EB',
                  fontWeight: 800,
                  color: '#374151',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ flex: 1 }}>CẤU TRÚC PHÂN HỆ MENU ({sidebarPlatform.toUpperCase()})</div>
                  <div style={{ width: '280px', textAlign: 'right' }}>THAO TÁC</div>
                </div>
                {filteredData.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                    Chưa có mục menu nào cho bản {sidebarPlatform}.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
                    {filteredData.map(menu => renderSidebarNode(menu, 0))}
                  </div>
                )}
              </div>
            ) : (
              // DEFAULT LIST TABLE (FACTORY, DEPT, POSITION, ROLE)
              <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#7B5233', color: '#FFFFFF' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', width: '60px' }}>STT</th>
                      {activeTab === 'factory' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên nhà máy / phân xưởng</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Phân loại</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mô tả</th>
                        </>
                      )}
                      {(activeTab === 'department' || activeTab === 'position') && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã viết tắt</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên danh mục</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Diễn giải chi tiết</th>
                        </>
                      )}
                      {activeTab === 'role' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên bộ phận</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mô tả nhiệm vụ</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Trạng thái</th>
                        </>
                      )}
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, width: '120px' }}>Ngày tạo</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, borderTopRightRadius: '8px', borderBottomRightRadius: '8px', width: '100px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '30px', textAlignment: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                          Không tìm thấy bản ghi cấu hình nào.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', position: 'relative', zIndex: actionMenuId === item.id ? 30 : 1 }}>
                          <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>{idx + 1}</td>
                          
                          {activeTab === 'factory' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>{item.structure_code}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>{item.structure_name}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span style={{
                                  backgroundColor: item.structure_type === 'Nhà máy' ? '#FAF6F0' : item.structure_type === 'Phân xưởng' ? '#E0F2FE' : '#DCFCE7',
                                  color: item.structure_type === 'Nhà máy' ? '#7B5233' : item.structure_type === 'Phân xưởng' ? '#0369A1' : '#15803D',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.structure_type}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>{item.description || '---'}</td>
                            </>
                          )}

                          {(activeTab === 'department' || activeTab === 'position') && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>{item.code}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>{item.name}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>{item.description || '---'}</td>
                            </>
                          )}

                          {activeTab === 'role' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>{item.name}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>{item.description || '---'}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span style={{
                                  backgroundColor: item.is_active ? '#DCFCE7' : '#F3F4F6',
                                  color: item.is_active ? '#15803D' : '#6B7280',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.is_active ? 'Đang sử dụng' : 'Dừng hoạt động'}
                                </span>
                              </td>
                            </>
                          )}

                          <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>
                            {formatDate(item.created_at)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', position: 'relative', zIndex: actionMenuId === item.id ? 40 : 1 }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                className="action-btn"
                                onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                              </button>
                              {actionMenuId === item.id && (
                                <div className="action-menu">
                                  <button className="action-menu-item" onClick={() => { setActionMenuId(null); handleOpenEditModal(item); }}>Chỉnh sửa</button>
                                  {!(activeTab === 'factory' && item.id === null) && (
                                    <button className="action-menu-item danger" onClick={() => { setActionMenuId(null); handleOpenDeleteModal(item); }}>Xóa bản ghi</button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add New Button Placed at the bottom left of the table/tree as in the mockup */}
            {!loading && (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
                <button
                  onClick={handleOpenAddModal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5ECE1'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                >
                  <Plus size={16} />
                  <span>Thêm mới</span>
                </button>

                {activeTab === 'factory' && (
                  <button
                    onClick={handleSyncFromBOM}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #7B5233',
                      backgroundColor: '#FFFFFF',
                      color: '#7B5233',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAF6F0'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                  >
                    <RefreshCw size={15} />
                    <span>Cập nhật từ BOM</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC MODALS FOR CONFIGURATION */}
      {isModalOpen && activeTab !== 'role' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '16px', width: '500px',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid #E5E7EB',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#FAF8F6'
            }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2D1A12' }}>
                {selectedItem ? 'Chỉnh sửa bản ghi cấu hình' : 'Thêm mới cấu hình'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* 1. FACTORY STRUCTURE MODAL FIELDS */}
                {activeTab === 'factory' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ VIẾT TẮT *</label>
                      <input
                        type="text"
                        value={factoryCode}
                        onChange={(e) => setFactoryCode(e.target.value)}
                        placeholder="Ví dụ: NM1, PX_SON, TO_QC"
                        disabled={selectedItem !== null}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #D1D5DB',
                          fontSize: '0.85rem',
                          outline: 'none',
                          backgroundColor: selectedItem !== null ? '#F3F4F6' : '#FFFFFF',
                          color: selectedItem !== null ? '#6B7280' : '#1F2937'
                        }}
                        required
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN CẤU TRÚC VẬT LÝ *</label>
                      <input
                        type="text"
                        value={factoryName}
                        onChange={(e) => setFactoryName(e.target.value)}
                        placeholder="Ví dụ: Nhà máy gỗ tự nhiên 1"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>PHÂN LOẠI CẤU TRÚC *</label>
                      <select
                        value={factoryType}
                        onChange={(e) => setFactoryType(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                        required
                      >
                        <option value="Nhà máy">Nhà máy (Factory)</option>
                        <option value="Phân xưởng">Phân xưởng (Workshop)</option>
                        <option value="Tổ sản xuất">Tổ sản xuất (Section)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>THUỘC CẤU TRÚC CHA (NẾU CÓ)</label>
                      <select
                        value={factoryParentId}
                        onChange={(e) => setFactoryParentId(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                      >
                        <option value="">-- Cấp cao nhất --</option>
                        {dataList
                          .filter(x => !selectedItem || x.id !== selectedItem.id) // Avoid self nested
                          .map(x => (
                            <option key={x.id} value={x.id}>{x.structure_name} ({x.structure_type})</option>
                          ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>DIỄN GIẢI CHI TIẾT</label>
                      <textarea
                        value={factoryDesc}
                        onChange={(e) => setFactoryDesc(e.target.value)}
                        placeholder="Nêu mô tả sơ bộ..."
                        rows="3"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}

                {/* 2. GENERAL DEPT & POSITION FIELDS */}
                {(activeTab === 'department' || activeTab === 'position') && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ VIẾT TẮT *</label>
                      <input
                        type="text"
                        value={generalCode}
                        onChange={(e) => setGeneralCode(e.target.value)}
                        placeholder="Ví dụ: HCNS, KHO, GD, TBP"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN DANH MỤC *</label>
                      <input
                        type="text"
                        value={generalName}
                        onChange={(e) => setGeneralName(e.target.value)}
                        placeholder={activeTab === 'department' ? 'Ví dụ: Phòng Kỹ Thuật' : 'Ví dụ: Quản Đốc'}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>DIỄN GIẢI CHI TIẾT</label>
                      <textarea
                        value={generalDesc}
                        onChange={(e) => setGeneralDesc(e.target.value)}
                        placeholder="Nhập mô tả cho danh mục..."
                        rows="3"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}

                {/* 3. SIDEBAR TREE CONFIG FIELDS */}
                {activeTab === 'sidebar' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TIÊU ĐỀ MENU *</label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Ví dụ: Quản lý sản xuất"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>THUỘC NHÓM MENU CHA</label>
                      <select
                        value={formParentId}
                        onChange={(e) => setFormParentId(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                      >
                        <option value="">-- Là nhóm Menu chính (Không có nhóm cha) --</option>
                        {filteredData
                          .filter(m => !selectedItem || m.id !== selectedItem.id) // Avoid self nesting
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.title}</option>
                          ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>ĐƯỜNG DẪN / ROUTE PATH</label>
                      <input
                        type="text"
                        value={formRoutePath}
                        onChange={(e) => setFormRoutePath(e.target.value)}
                        placeholder="Ví dụ: /admin/plan"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>KHÓA PHÂN QUYỀN (PERMISSION KEY)</label>
                      <input
                        type="text"
                        value={formPermissionKey}
                        onChange={(e) => setFormPermissionKey(e.target.value)}
                        placeholder="Ví dụ: users, plan, defects"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>

                    {/* Icons Grid selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>BIỂU TƯỢNG (ICON)</label>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px',
                        maxHeight: '110px', overflowY: 'auto', border: '1px solid #E5E7EB',
                        padding: '10px', borderRadius: '8px'
                      }}>
                        {iconOptions.map(iconName => (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setFormIcon(iconName)}
                            style={{
                              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: formIcon === iconName ? '2px solid #7B5233' : '1px solid #E5E7EB',
                              backgroundColor: formIcon === iconName ? '#FAF6F0' : '#FFFFFF',
                              borderRadius: '6px', cursor: 'pointer',
                              color: formIcon === iconName ? '#7B5233' : '#4B5563'
                            }}
                            title={iconName}
                          >
                            <DynamicIcon name={iconName} size={16} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setFormIsActive(!formIsActive)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: formIsActive ? '#7B5233' : '#9CA3AF' }}
                      >
                        {formIsActive ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                        Kích hoạt hiển thị trên Sidebar
                      </span>
                    </div>
                  </>
                )}

              </div>

              {/* Modal Footer */}
              <div style={{
                marginTop: '20px', display: 'flex', justifyContent: 'flex-end',
                gap: '10px', borderTop: '1px solid #F3F4F6', paddingTop: '14px'
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF', color: '#4B5563', cursor: 'pointer',
                    fontWeight: 'bold', fontSize: '0.8rem'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    backgroundColor: '#7B5233', color: '#FFFFFF', cursor: 'pointer',
                    fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Save size={14} />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* SPECIAL SHIELD MODAL FOR BỘ PHẬN (ROLES) */}
      {isModalOpen && activeTab === 'role' && (
        <DepartmentModal
          isOpen={isModalOpen}
          modalMode={selectedItem ? 'edit' : 'create'}
          selectedDepartment={selectedItem}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
          }}
          onConfirm={handleRoleConfirm}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteModalOpen && deletingItem && (
        <BeautifulConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Xóa cấu hình"
          message={`Bạn có chắc chắn muốn xóa bản ghi "${deletingItem.structure_name || deletingItem.name}"? Cảnh báo: Việc xóa bỏ có thể ảnh hưởng đến liên kết nhân sự hoặc quyền hạn liên quan.`}
          confirmText="Đồng ý xóa"
          cancelText="Hủy bỏ"
          type="danger"
        />
      )}

    </div>
  );
}
