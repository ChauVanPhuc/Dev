import React, { useState, useEffect, useMemo } from 'react';
import { X, Shield } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { buildPermissionGroupsFromSidebar } from '../User/utils/permissionUtils';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const DepartmentModal = ({ isOpen, onClose, modalMode, selectedDepartment, onConfirm }) => {
  const modalMeta = useScreenMetadataCached('/admin/auth/departments/modal');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
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
        name: modalMode === 'edit' && selectedDepartment ? selectedDepartment.name : '',
        description: modalMode === 'edit' && selectedDepartment ? (selectedDepartment.description || '') : '',
        is_active: modalMode === 'edit' && selectedDepartment ? selectedDepartment.is_active : true
      });

      const fetchData = async () => {
        try {
          const [sidebarRes, screensRes] = await Promise.all([
            api.get('/system/sidebar/all'),
            api.get('/screens')
          ]);
          setSidebarItems(sidebarRes || []);
          setScreens(screensRes || []);

          let parsed = {};
          if (modalMode === 'edit' && selectedDepartment) {
            try {
              parsed = JSON.parse(selectedDepartment.default_permissions || '{}');
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
          console.error('Lỗi khi tải dữ liệu trong DepartmentModal:', err);
        }
      };
      fetchData();
    }
  }, [isOpen, modalMode, selectedDepartment]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Vui lòng nhập tên bộ phận!');

    onConfirm({
      ...formData,
      default_permissions: JSON.stringify(defaultPermissions)
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #FAF0E6', backgroundColor: '#FAF6F0' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2D1A12', fontWeight: '800' }}>
            {modalMeta.screenCode ? `${modalMeta.screenCode}: ` : ''}
            {modalMeta.title || (modalMode === 'create' ? 'Tạo Bộ phận mới' : 'Chỉnh sửa Bộ phận')}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', color: '#7B5233', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, overflowY: 'auto' }}>
            
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7B5233' }}>Tên bộ phận *</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                placeholder="VD: QC, Sản xuất, IT, BGD..."
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #EADCC9', outline: 'none', fontSize: '0.9rem' }}
                required
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7B5233' }}>Mô tả chi tiết</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                placeholder="Nhập mô tả bộ phận..."
                rows="2"
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #EADCC9', outline: 'none', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {modalMode === 'edit' && (
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="is_active_checkbox"
                  name="is_active" 
                  checked={formData.is_active} 
                  onChange={handleInputChange}
                  style={{ width: '16px', height: '16px', accentColor: '#7B5233' }}
                />
                <label htmlFor="is_active_checkbox" style={{ fontSize: '0.9rem', fontWeight: '700', color: '#7B5233', cursor: 'pointer' }}>Đang sử dụng (Kích hoạt bộ phận này)</label>
              </div>
            )}

            {/* ── Cấu hình quyền mặc định của Bộ phận ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7B5233', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} /> Quyền mặc định của bộ phận
              </label>
              <span style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', marginBottom: '4px' }}>
                Thiết lập quyền truy cập cơ sở cho bộ phận này đối với từng chức năng.
              </span>

              <div style={{ 
                maxHeight: '230px', 
                overflowY: 'auto', 
                border: '1px solid #EADCC9', 
                borderRadius: '8px', 
                padding: '8px 12px', 
                backgroundColor: '#FAF8F6' 
              }}>
                {[...dynamicWebGroups, ...dynamicMobileGroups].map((group, groupIdx) => {
                  const isMobile = group.screens[0]?.key.startsWith('mobile_');
                  return (
                    <div key={`${group.title}-${isMobile ? 'mobile' : 'web'}-${groupIdx}`} style={{ marginBottom: '15px' }}>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: '800', 
                        color: '#7B5233', 
                        borderBottom: '1px solid #EADCC9', 
                        paddingBottom: '4px',
                        marginBottom: '8px'
                      }}>
                        {group.title} {isMobile ? '(Mobile)' : '(Web)'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {group.screens.map((scr) => (
                          <div key={scr.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

export default DepartmentModal;
