import React, { useState, useEffect, useMemo } from 'react';
import { X, Shield, CheckCircle2, Eye, Lock } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { buildPermissionGroupsFromSidebar } from '../User/utils/permissionUtils';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const PositionModal = ({ isOpen, onClose, modalMode, selectedPosition, allDepartments, onConfirm }) => {
  const modalMeta = useScreenMetadataCached('/admin/auth/positions/modal');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    role_ids: []
  });
  
  const [sidebarItems, setSidebarItems] = useState([]);
  const [screens, setScreens] = useState([]);
  const [defaultPermissions, setDefaultPermissions] = useState({});

  const dynamicWebGroups = useMemo(() => {
    return buildPermissionGroupsFromSidebar(sidebarItems, 'web', screens);
  }, [sidebarItems, screens]);

  const dynamicMobileGroups = useMemo(() => {
    return buildPermissionGroupsFromSidebar(sidebarItems, 'mobile', screens);
  }, [sidebarItems, screens]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: modalMode === 'edit' && selectedPosition ? selectedPosition.name : '',
        description: modalMode === 'edit' && selectedPosition ? (selectedPosition.description || '') : '',
        is_active: modalMode === 'edit' && selectedPosition ? selectedPosition.is_active : true,
        role_ids: modalMode === 'edit' && selectedPosition && selectedPosition.roles ? selectedPosition.roles.map(r => r.id) : []
      });

      const fetchScreens = async () => {
        try {
          const [sidebarRes, screensRes] = await Promise.all([
            api.get('/system/sidebar/all'),
            api.get('/screens')
          ]);
          setSidebarItems(sidebarRes || []);
          setScreens(screensRes || []);

          let parsed = {};
          if (modalMode === 'edit' && selectedPosition) {
            try {
              parsed = JSON.parse(selectedPosition.default_permissions || '{}');
            } catch (e) {
              parsed = {};
            }
          }

          const initialPerms = {};
          const webGroups = buildPermissionGroupsFromSidebar(sidebarRes || [], 'web', screensRes || []);
          const mobileGroups = buildPermissionGroupsFromSidebar(sidebarRes || [], 'mobile', screensRes || []);

          webGroups.forEach(group => {
            group.screens.forEach(scr => {
              initialPerms[scr.key] = parsed[scr.key] || 'write';
            });
          });
          mobileGroups.forEach(group => {
            group.screens.forEach(scr => {
              initialPerms[scr.key] = parsed[scr.key] || 'write';
            });
          });
          setDefaultPermissions(initialPerms);
        } catch (err) {
          console.error('Lỗi khi tải màn hình trong PositionModal:', err);
        }
      };
      fetchScreens();
    }
  }, [isOpen, modalMode, selectedPosition]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePermissionChange = (screenKey, value) => {
    setDefaultPermissions(prev => ({
      ...prev,
      [screenKey]: value
    }));
  };

  // Chọn nhanh cho toàn bộ màn hình trong 1 nhóm/module
  const handleGroupPermissionChange = (screensInGroup, value) => {
    setDefaultPermissions(prev => {
      const next = { ...prev };
      screensInGroup.forEach(scr => {
        next[scr.key] = value;
      });
      return next;
    });
  };

  // Chọn nhanh toàn cục cho tất cả các module
  const handleGlobalPermissionChange = (value) => {
    setDefaultPermissions(prev => {
      const next = { ...prev };
      [...dynamicWebGroups, ...dynamicMobileGroups].forEach(group => {
        group.screens.forEach(scr => {
          next[scr.key] = value;
        });
      });
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Vui lòng nhập tên chức vụ!');
    if (!formData.role_ids || formData.role_ids.length === 0) {
      return alert('Vui lòng chọn bộ phận trực thuộc!');
    }
    
    onConfirm({
      ...formData,
      default_permissions: JSON.stringify(defaultPermissions)
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '640px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #FAF0E6', backgroundColor: '#FAF6F0' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2D1A12', fontWeight: '800' }}>
            {modalMeta.screenCode ? `${modalMeta.screenCode}: ` : ''}
            {modalMeta.title || (modalMode === 'create' ? 'Tạo Chức vụ mới' : 'Chỉnh sửa Chức vụ')}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', color: '#7B5233', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, overflowY: 'auto' }}>
            
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7B5233' }}>Tên chức vụ *</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                placeholder="VD: NV QC, QC Lead, NV SX..."
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #EADCC9', outline: 'none', fontSize: '0.9rem' }}
                required
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7B5233' }}>Bộ phận trực thuộc *</label>
              <select
                name="role_ids"
                value={formData.role_ids && formData.role_ids.length > 0 ? formData.role_ids[0] : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    role_ids: val ? [parseInt(val, 10)] : []
                  }));
                }}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #EADCC9', outline: 'none', fontSize: '0.9rem', backgroundColor: '#fff', color: '#2D1A12' }}
                required
              >
                <option value="">-- Chọn Bộ phận --</option>
                {allDepartments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7B5233' }}>Mô tả chi tiết</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                placeholder="Nhập mô tả về chức vụ này..."
                rows="2"
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #EADCC9', outline: 'none', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {modalMode === 'edit' && (
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="is_active_pos_checkbox"
                  name="is_active" 
                  checked={formData.is_active} 
                  onChange={handleInputChange}
                  style={{ width: '16px', height: '16px', accentColor: '#7B5233' }}
                />
                <label htmlFor="is_active_pos_checkbox" style={{ fontSize: '0.9rem', fontWeight: '700', color: '#7B5233', cursor: 'pointer' }}>Đang sử dụng (Kích hoạt chức vụ này)</label>
              </div>
            )}

            {/* ── Cấu hình quyền mặc định của Chức vụ ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7B5233', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Shield size={16} /> Quyền mặc định của chức vụ
                </label>
                
                {/* Global Quick Action Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#7B5233', fontWeight: '600' }}>Tất cả:</span>
                  <button 
                    type="button" 
                    onClick={() => handleGlobalPermissionChange('write')}
                    style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #8ce99a', backgroundColor: '#ebfbee', color: '#2b8a3e', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    title="Gán tất cả thành Có quyền ghi"
                  >
                    <CheckCircle2 size={12} /> Ghi
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleGlobalPermissionChange('read')}
                    style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #ffe066', backgroundColor: '#fff9db', color: '#e67700', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    title="Gán tất cả thành Chỉ xem"
                  >
                    <Eye size={12} /> Xem
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleGlobalPermissionChange('none')}
                    style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #ffa8a8', backgroundColor: '#fff5f5', color: '#c92a2a', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    title="Khóa tất cả các chức năng"
                  >
                    <Lock size={12} /> Khóa
                  </button>
                </div>
              </div>

              <span style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', marginBottom: '2px' }}>
                Thiết lập quyền truy cập mặc định cho chức vụ này đối với từng chức năng.
              </span>

              <div style={{ 
                maxHeight: '250px', 
                overflowY: 'auto', 
                border: '1px solid #EADCC9', 
                borderRadius: '8px', 
                padding: '10px 12px', 
                backgroundColor: '#FAF8F6' 
              }}>
                {[...dynamicWebGroups, ...dynamicMobileGroups].map((group, groupIdx) => {
                  const isMobile = group.screens[0]?.key.startsWith('mobile_');
                  return (
                    <div key={`${group.title}-${isMobile ? 'mobile' : 'web'}-${groupIdx}`} style={{ marginBottom: '16px' }}>
                      {/* Group Header with Quick Select Dropdown */}
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #EADCC9', 
                        paddingBottom: '5px',
                        marginBottom: '8px',
                        backgroundColor: '#F5ECE1',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        <span style={{ 
                          fontSize: '0.82rem', 
                          fontWeight: '800', 
                          color: '#5C381E' 
                        }}>
                          {group.title} {isMobile ? '(Mobile)' : '(Web)'}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleGroupPermissionChange(group.screens, e.target.value);
                                e.target.value = "";
                              }
                            }}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #C4A482',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: '#FFF',
                              color: '#5C381E',
                              cursor: 'pointer',
                              outline: 'none',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                          >
                            <option value="" disabled>⚡ Chọn nhanh nhóm</option>
                            <option value="write">🟢 Cả nhóm: Có quyền ghi</option>
                            <option value="read">🟡 Cả nhóm: Chỉ xem</option>
                            <option value="none">🔴 Cả nhóm: Không được phép</option>
                          </select>
                        </div>
                      </div>

                      {/* Screen items */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '4px', paddingRight: '4px' }}>
                        {group.screens.map((scr) => (
                          <div key={scr.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                            <span style={{ fontSize: '0.8rem', color: '#444', fontWeight: '600' }}>
                              {scr.name}
                            </span>
                            <select
                              value={defaultPermissions[scr.key] || 'write'}
                              onChange={(e) => handlePermissionChange(scr.key, e.target.value)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #EADCC9',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                backgroundColor: '#fff',
                                color: '#2D1A12',
                                outline: 'none',
                                width: '130px'
                              }}
                            >
                              <option value="none">Không được phép</option>
                              <option value="read">Chỉ xem</option>
                              <option value="write">Có quyền ghi</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #FAF0E6', backgroundColor: '#FAF6F0' }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={onClose}
              style={{ height: '36px', padding: '0 15px', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ height: '36px', padding: '0 15px', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PositionModal;
