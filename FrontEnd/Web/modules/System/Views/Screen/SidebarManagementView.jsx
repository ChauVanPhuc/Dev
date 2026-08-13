import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import {
  Plus, Edit2, Trash2, ArrowUp, ArrowDown, Layout, Smartphone, Check,
  X, HelpCircle, Save, Settings, ChevronRight, CheckSquare, Square
} from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import * as Icons from 'lucide-react';

const DynamicIcon = ({ name, size = 16, ...props }) => {
  if (!name) return <HelpCircle size={size} {...props} />;
  const IconComponent = Icons[name];
  if (!IconComponent) return <HelpCircle size={size} {...props} />;
  return <IconComponent size={size} {...props} />;
};

const DURATION = 300;

export default function SidebarManagementView() {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { toast } = useToast();

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/sidebar');

  const [activeTab, setActiveTab] = useState('Web'); // 'Web' or 'Mobile'
  const [menus, setMenus] = useState([]);

  const [collapsedGroupIds, setCollapsedGroupIds] = useState({});

  const toggleCollapse = (itemId) => {
    setCollapsedGroupIds(prev => ({
      ...prev,
      [itemId]: prev[itemId] === false ? true : false
    }));
  };

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formRoutePath, setFormRoutePath] = useState('');
  const [formIcon, setFormIcon] = useState('LayoutGrid');
  const [formPermissionKey, setFormPermissionKey] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);


  // Available standard icons for selection
  const iconOptions = [
    'LayoutGrid', 'Settings', 'Users', 'ShieldCheck', 'Wrench', 'BarChart2',
    'Calendar', 'FileText', 'ShoppingCart', 'Sliders', 'Home', 'Box', 'Cpu',
    'Clock', 'Bell', 'QrCode', 'MessageSquare', 'Gamepad2', 'Smile', 'Grid',
    'Coins', 'Cookie', 'Network', 'User', 'Briefcase', 'Folder', 'File',
    'Layers', 'Truck', 'AlertTriangle', 'Slash', 'MessageCircle', 'CheckCircle',
    'Clipboard', 'List', 'MapPin', 'BookOpen', 'DollarSign', 'Tag', 'FilePlus'
  ];

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const sidebarData = await api.get('/system/sidebar/all');
      setMenus(sidebarData || []);
    } catch (e) {
      toast('error', 'Không thể tải dữ liệu sidebar!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);



  // Filter menus based on active tab
  const filteredMenus = menus.filter(m => m.platform === activeTab);

  const openAddModal = (parentId = null) => {
    setSelectedItem(null);
    setFormTitle('');
    setFormParentId(parentId ? String(parentId) : '');
    setFormRoutePath('');
    setFormIcon('LayoutGrid');
    setFormPermissionKey('');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormTitle(item.title || '');
    setFormParentId(item.parent_id ? String(item.parent_id) : '');
    setFormRoutePath(item.route_path || '');
    setFormIcon(item.icon || 'LayoutGrid');
    setFormPermissionKey(item.permission_key || '');
    setFormIsActive(item.is_active);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast('warning', 'Vui lòng nhập tiêu đề menu!');
      return;
    }

    const payload = {
      platform: activeTab,
      parent_id: formParentId ? parseInt(formParentId) : null,
      title: formTitle.trim(),
      route_path: formRoutePath.trim() || null,
      icon: formIcon || null,
      permission_key: formPermissionKey.trim() || null,
      screen_id: null,
      is_active: formIsActive
    };

    try {
      if (selectedItem) {
        // Edit mode
        await api.put(`/system/sidebar/${selectedItem.id}`, payload);
        toast('success', `Đã cập nhật mục "${formTitle}" thành công!`);
      } else {
        // Add mode
        // Determine sorting order at end of group
        const siblings = formParentId
          ? (menus.find(m => m.id === parseInt(formParentId))?.children || [])
          : filteredMenus;
        payload.sort_order = siblings.length + 1;

        await api.post('/system/sidebar', payload);
        toast('success', `Đã thêm mới mục "${formTitle}" thành công!`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast('error', 'Lưu menu thất bại, vui lòng kiểm tra lại!');
    }
  };

  const confirmDelete = (item) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await api.delete(`/system/sidebar/${deletingItem.id}`);
      toast('success', `Đã xóa mục "${deletingItem.title}" thành công!`);
      setIsDeleteModalOpen(false);
      setDeletingItem(null);
      loadData();
    } catch (err) {
      toast('error', 'Không thể xóa mục menu này!');
    }
  };

  const handleMove = async (item, direction) => {
    // Find siblings
    const siblings = item.parent_id
      ? (menus.find(m => m.id === item.parent_id)?.children || [])
      : filteredMenus;

    const currentIndex = siblings.findIndex(s => s.id === item.id);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex + (direction === 'up' ? -1 : 1);
    if (targetIndex < 0 || targetIndex >= siblings.length) return; // Out of bounds

    const targetItem = siblings[targetIndex];

    // Swap sort_order
    const updatedItems = [
      { id: item.id, parent_id: item.parent_id, sort_order: targetItem.sort_order },
      { id: targetItem.id, parent_id: targetItem.parent_id, sort_order: item.sort_order }
    ];

    try {
      await api.put('/system/sidebar/reorder', { items: updatedItems });
      toast('success', 'Đã thay đổi thứ tự sắp xếp!');
      loadData();
    } catch (err) {
      toast('error', 'Sắp xếp menu thất bại!');
    }
  };

  // Render tree layout recursively
  const renderMenuNode = (item, depth = 0) => {
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
            transition: 'background-color 0.2s',
            opacity: item.is_active ? 1 : 0.6
          }}
          className="menu-row-item"
        >
          {/* Menu core metadata */}
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
            {/* Sorting buttons */}
            <button
              onClick={() => handleMove(item, 'up')}
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
              onClick={() => handleMove(item, 'down')}
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
                onClick={() => openAddModal(item.id)}
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
              onClick={() => openEditModal(item)}
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
              onClick={() => confirmDelete(item)}
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

        {/* Render children nodes if exists and expanded */}
        {isParent && !isCollapsed && item.children.map(child => renderMenuNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="sidebar-management-container" style={{ fontFamily: 'Inter, sans-serif', padding: '20px', backgroundColor: '#F9FBFB', minHeight: '100%', boxSizing: 'border-box' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .dashboard-content:has(.sidebar-management-container) {
          overflow-y: auto !important;
        }
        .dashboard-content:has(.sidebar-management-container) > div {
          height: auto !important;
          min-height: 100% !important;
          overflow-y: visible !important;
          flex: none !important;
        }
      `}} />

      {/* Platform tab selector - Sticky toolbar */}
      <div style={{
        position: 'sticky',
        top: '-20px',
        backgroundColor: '#F9FBFB',
        zIndex: 90,
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid #E5E7EB',
        paddingBottom: '12px',
        paddingTop: '12px',
        marginTop: '-20px'
      }}>
        <button
          onClick={() => setActiveTab('Web')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: activeTab === 'Web' ? 'none' : '1px solid #E5E7EB',
            backgroundColor: activeTab === 'Web' ? '#7B5233' : '#FFFFFF',
            color: activeTab === 'Web' ? '#FFFFFF' : '#4B5563',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Layout size={16} />
          <span>Vận hành trên Web</span>
        </button>
        <button
          onClick={() => setActiveTab('Mobile')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: activeTab === 'Mobile' ? 'none' : '1px solid #E5E7EB',
            backgroundColor: activeTab === 'Mobile' ? '#7B5233' : '#FFFFFF',
            color: activeTab === 'Mobile' ? '#FFFFFF' : '#4B5563',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Smartphone size={16} />
          <span>Vận hành trên Mobile</span>
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => openAddModal(null)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
          }}
        >
          <Plus size={16} />
          <span>Thêm nhóm menu chính</span>
        </button>
      </div>

      {/* Main card panel */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden'
      }}>
        {/* Table header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: '#FAF8F6',
          borderBottom: '2px solid #E5E7EB',
          fontWeight: 800,
          color: '#374151',
          fontSize: '0.85rem'
        }}>
          <div style={{ flex: 1 }}>CẤU TRÚC DANH MỤC SIDEBAR ({activeTab.toUpperCase()})</div>
          <div style={{ width: '280px', textAlign: 'right' }}>THAO TÁC</div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#7B5233', fontWeight: 'bold' }}>
            Đang tải dữ liệu cấu trúc menu...
          </div>
        ) : filteredMenus.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>
            Chưa có mục menu nào được tạo cho bản {activeTab}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredMenus.map(menu => renderMenuNode(menu, 0))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FAF8F6'
            }}>
              <h3 style={{ margin: 0, color: '#2D1A12', fontWeight: 800, fontSize: '1.1rem' }}>
                {selectedItem ? `Chỉnh sửa mục: "${selectedItem.title}"` : 'Thêm mục menu mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4B5563' }}>TIÊU ĐỀ MENU *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: Kế hoạch sản xuất"
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                {/* Parent Group */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4B5563' }}>THUỘC NHÓM MENU CHA</label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <option value="">-- Là nhóm Menu chính (Không có nhóm cha) --</option>
                    {filteredMenus
                      .filter(m => !selectedItem || m.id !== selectedItem.id) // Avoid self nesting
                      .map(m => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                  </select>
                </div>


                {/* Route path */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4B5563' }}>ĐƯỜNG DẪN / ROUTE PATH</label>
                  <input
                    type="text"
                    value={formRoutePath}
                    onChange={(e) => setFormRoutePath(e.target.value)}
                    placeholder="Ví dụ: /admin/plan"
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Icons Grid selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4B5563' }}>BIỂU TƯỢNG (ICON)</label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '8px',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    border: '1px solid #E5E7EB',
                    padding: '10px',
                    borderRadius: '8px'
                  }}>
                    {iconOptions.map(iconName => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setFormIcon(iconName)}
                        style={{
                          aspectRatio: '1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: formIcon === iconName ? '2px solid #7B5233' : '1px solid #E5E7EB',
                          backgroundColor: formIcon === iconName ? '#FAF6F0' : '#FFFFFF',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: formIcon === iconName ? '#7B5233' : '#4B5563'
                        }}
                        title={iconName}
                      >
                        <DynamicIcon name={iconName} size={18} />
                      </button>
                    ))}
                  </div>
                </div>


                {/* Active Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setFormIsActive(!formIsActive)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      color: formIsActive ? '#7B5233' : '#9CA3AF'
                    }}
                  >
                    {formIsActive ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                    Kích hoạt hiển thị trên Sidebar
                  </span>
                </div>

              </div>

              {/* Modal footer */}
              <div style={{
                marginTop: '24px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                borderTop: '1px solid #F3F4F6',
                paddingTop: '16px'
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#4B5563',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#7B5233',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={16} />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingItem && (
        <BeautifulConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Xóa mục menu"
          message={`Bạn có chắc chắn muốn xóa mục menu "${deletingItem.title}"? Cảnh báo: Nếu là nhóm menu cha, toàn bộ mục menu con bên trong cũng sẽ bị xóa bỏ.`}
          confirmText="Đồng ý xóa"
          cancelText="Hủy bỏ"
          type="danger"
        />
      )}

    </div>
  );
}
