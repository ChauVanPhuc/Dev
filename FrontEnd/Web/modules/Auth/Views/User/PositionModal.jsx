import React, { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import api from '@webShared/Services/api.service';

const PositionModal = ({ isOpen, onClose, modalMode, selectedPosition, allDepartments, onConfirm }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    role_ids: []
  });
  
  const [screensList, setScreensList] = useState([]);
  const [defaultPermissions, setDefaultPermissions] = useState({});

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
          
          const list = [];
          const seen = new Set();
          
          const addScreen = (scr) => {
            const key = scr.permission_key || (scr.screen && scr.screen.current_code) || scr.route_path;
            if (key && !seen.has(key)) {
              seen.add(key);
              list.push({ key, name: scr.title || (scr.screen && scr.screen.name) || key });
            }
          };

          (sidebarRes || []).forEach(item => {
            if (item.children && item.children.length > 0) {
              item.children.forEach(child => addScreen(child));
            } else {
              addScreen(item);
            }
          });

          (screensRes || []).forEach(scr => {
            const key = scr.current_code;
            if (key && !seen.has(key)) {
              seen.add(key);
              list.push({ key, name: scr.name || key });
            }
          });

          setScreensList(list);

          let parsed = {};
          if (modalMode === 'edit' && selectedPosition) {
            try {
              parsed = JSON.parse(selectedPosition.default_permissions || '{}');
            } catch (e) {
              parsed = {};
            }
          }

          const initialPerms = {};
          list.forEach(scr => {
            initialPerms[scr.key] = parsed[scr.key] || 'write';
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
      <div className="card" style={{ width: '100%', maxWidth: '600px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #FAF0E6', backgroundColor: '#FAF6F0' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2D1A12', fontWeight: '800' }}>
            {modalMode === 'create' ? 'AD3.5.1: Tạo Chức vụ mới' : 'Chỉnh sửa Chức vụ'}
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
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7B5233', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} /> Quyền mặc định của chức vụ
              </label>
              <span style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', marginBottom: '4px' }}>
                Thiết lập quyền truy cập mặc định cho chức vụ này đối với từng chức năng.
              </span>

              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid #EADCC9', 
                borderRadius: '8px', 
                padding: '8px 12px', 
                backgroundColor: '#FAF8F6' 
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {screensList.map((scr) => (
                    <div key={scr.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: '#444', fontWeight: '600' }}>
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
