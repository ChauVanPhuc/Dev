import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Check, X, Search, Shield, ChevronDown, Layers } from 'lucide-react';
import api from '@webShared/Services/api.service';
import '@styles/components.css';

const SCREEN_GROUPS = [
  {
    title: 'Quản lý hệ thống',
    screens: [
      { key: 'users', name: 'Quản lý tài khoản' },
      { key: 'quality-records', name: 'Quản lý hồ sơ' },
      { key: 'screens', name: 'Quản lý màn hình' },
      { key: 'logs', name: 'Quản lý lỗi hệ thống' },
      { key: 'feedback', name: 'Quản lý góp ý' },
      { key: 'data', name: 'Backup data' },
      { key: 'bugs', name: 'Quản lý Bug' },
      { key: 'monitor', name: 'Giám sát hệ thống' }
    ]
  },
  {
    title: 'Module sản xuất',
    screens: [
      { key: 'plan', name: 'Kế hoạch sản xuất' },
      { key: 'delivery-tracking', name: 'Kế hoạch bàn giao' },
      { key: 'exception-deliveries', name: 'Phiếu ngoại lệ' },
      { key: 'home', name: 'Trang chủ sản xuất' },
      { key: 'backup-qrs', name: 'Quản lý mã QR' }
    ]
  },
  {
    title: 'Module chất lượng',
    screens: [
      { key: 'defects', name: 'Danh sách lỗi' },
      { key: 'claim', name: 'Claim khách hàng' },
      { key: 'reports', name: 'Báo cáo kiểm tra' },
      { key: 'handovers', name: 'Danh sách bàn giao' },
      { key: 'hotspots', name: 'Điểm nóng cần chú ý' }
    ]
  },
  {
    title: 'Module kỹ thuật',
    screens: [
      { key: 'products', name: 'BOM sản phẩm' },
      { key: 'equipment', name: 'Thiết bị - máy móc' }
    ]
  },
  {
    title: 'Module kinh doanh',
    screens: [
      { key: 'shipments', name: 'Thời gian xuất cont' },
      { key: 'prices', name: 'Quản lý giá tủ' },
      { key: 'purchase-requisitions', name: 'Đơn đặt mua' },
      { key: 'purchase-order-items', name: 'Đơn mua hàng' }
    ]
  },
  {
    title: 'Khác',
    screens: [
      { key: 'kpi', name: 'Quản lý KPI' }
    ]
  }
];

const ALL_SCREENS = SCREEN_GROUPS.flatMap(g => g.screens.map(s => s.key));

const DepartmentManagement = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setCustomTitle = outletContext?.setCustomTitle;
  const setCustomSubtitle = outletContext?.setCustomSubtitle;
  const setCustomScreenCode = outletContext?.setCustomScreenCode;

  // Cập nhật tiêu đề trang lên Layout Header
  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Quản lý bộ phận');
    if (setCustomSubtitle) setCustomSubtitle('Danh sách bộ phận trong hệ thống và phân quyền mặc định.');
    if (setCustomScreenCode) setCustomScreenCode('AD3.4');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Kiểm tra quyền ghi
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const loggedInUserIsAdmin = loggedInUser.role_name === 'IT' || loggedInUser.role_name === 'BGD' || loggedInUser.username === 'admin';
  let activePermissions = {};
  try {
    activePermissions = JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
  } catch (e) {
    console.error('Failed to parse screen permissions:', e);
  }
  const hasWritePermission = loggedInUserIsAdmin || activePermissions['users'] !== 'read';

  // State dữ liệu
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [confirmDeleteData, setConfirmDeleteData] = useState(null);
  const [showExtraMenu, setShowExtraMenu] = useState(false);
  const extraMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (extraMenuRef.current && !extraMenuRef.current.contains(e.target)) {
        setShowExtraMenu(false);
      }
      if (!e.target.closest('.action-menu') && !e.target.closest('.action-btn')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  
  // State lưu trữ quyền mặc định đang cấu hình trong modal
  const [defaultPermissions, setDefaultPermissions] = useState({});

  // Tải danh sách bộ phận (roles)
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Gọi API roles với include_inactive=true để hiển thị đầy đủ
      const rolesData = await api.get('/roles/?include_inactive=true');
      setDepartments(rolesData);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu bộ phận:', err);
      setError('Không thể kết nối tới máy chủ. Vui lòng tải lại trang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Tìm kiếm cục bộ
  const filteredDepartments = departments.filter(dept => 
    dept.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    dept.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mở Modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
    
    // Mặc định cho tất cả các màn hình là 'write'
    const initialPerms = {};
    ALL_SCREENS.forEach(screenKey => {
      initialPerms[screenKey] = 'write';
    });
    setDefaultPermissions(initialPerms);
    
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setFormData({
      name: dept.name,
      description: dept.description || '',
      is_active: dept.is_active
    });
    
    // Parse default permissions từ DB
    let parsed = {};
    try {
      parsed = JSON.parse(dept.default_permissions || '{}');
    } catch (e) {
      parsed = {};
    }
    
    const initialPerms = {};
    ALL_SCREENS.forEach(screenKey => {
      initialPerms[screenKey] = parsed[screenKey] || 'write';
    });
    setDefaultPermissions(initialPerms);
    
    setSelectedDeptId(dept.id);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Thay đổi input form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Thay đổi dropdown quyền mặc định cho từng screen
  const handlePermissionChange = (screenKey, value) => {
    setDefaultPermissions(prev => ({
      ...prev,
      [screenKey]: value
    }));
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Vui lòng nhập tên bộ phận!');
    
    setError(null);
    const dataToSend = {
      ...formData,
      default_permissions: JSON.stringify(defaultPermissions)
    };
    
    try {
      if (modalMode === 'create') {
        await api.post('/roles/', dataToSend);
      } else {
        await api.put(`/roles/${selectedDeptId}`, dataToSend);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Lỗi khi lưu bộ phận:', err);
      setError(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu thông tin.');
    }
  };

  // Dừng hoạt động (Soft delete)
  const handleDelete = (dept) => {
    setConfirmDeleteData(dept);
  };

  return (
    <div style={{ width: '100%', paddingBottom: '40px' }}>
      {/* ── Thanh công cụ (Toolbar) ── */}
      <div className="mgmt-toolbar card" style={{ marginBottom: '20px' }}>
        {/* Nhóm bộ lọc bên trái */}
        <div className="toolbar-left" style={{ flex: 1 }}>
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Tìm kiếm bộ phận..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Nhóm hành động bên phải */}
        <div className="toolbar-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }} ref={extraMenuRef}>
            <button
              onClick={() => setShowExtraMenu(p => !p)}
              style={{
                height: '36px',
                padding: '0 16px',
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                backgroundColor: '#7B5233',
                color: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 2px 5px rgba(123, 82, 51, 0.15)'
              }}
            >
              <Layers size={14} />
              <span className="btn-text-desktop">Khác</span>
              <span className="btn-text-mobile">Khác</span>
            </button>
            {showExtraMenu && (
              <div className="dropdown-panel" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                zIndex: 1000,
                width: '180px',
                marginTop: '6px'
              }}>
                <p className="dropdown-title">Quản lý nâng cao</p>
                <button
                  className="dropdown-item"
                  onClick={() => { navigate('/admin/users'); setShowExtraMenu(false); }}
                >
                  Tài khoản
                </button>
                <button
                  className="dropdown-item selected"
                  onClick={() => { navigate('/admin/users/departments'); setShowExtraMenu(false); }}
                  style={{ fontWeight: '800' }}
                >
                  Bộ phận
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => { navigate('/admin/users/positions'); setShowExtraMenu(false); }}
                >
                  Chức vụ
                </button>
              </div>
            )}
          </div>

          {hasWritePermission && (
            <button 
              className="btn btn-primary"
              onClick={openCreateModal}
              style={{
                height: '36px',
                padding: '0 15px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={16} /> Tạo bộ phận mới
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 20px', backgroundColor: '#FEE2E2', borderLeft: '4px solid #EF4444', color: '#B91C1C', borderRadius: '8px', marginBottom: '20px', fontWeight: '500', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* ── Bảng Giao diện Bộ phận ── */}
      <div className="mgmt-table card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #EADCC9' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7B5233', fontWeight: '600' }}>Đang tải dữ liệu...</div>
        ) : filteredDepartments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Không tìm thấy bộ phận nào phù hợp.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EADCC9', backgroundColor: '#FAF6F0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#7B5233', width: '80px' }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#7B5233', width: '200px' }}>Tên bộ phận</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#7B5233' }}>Mô tả</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#7B5233', width: '250px' }}>Chức vụ trực thuộc</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#7B5233', width: '150px' }}>Trạng thái</th>
                  {hasWritePermission && <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#7B5233', width: '120px' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept, index) => (
                  <tr 
                    key={dept.id} 
                    style={{ 
                      borderBottom: '1px solid #FAF0E6', 
                      transition: 'background-color 0.2s',
                      position: 'relative',
                      zIndex: actionMenuId === dept.id ? 30 : 1
                    }}
                  >
                    <td style={{ padding: '14px 16px', color: '#888', fontWeight: '600' }}>#{dept.id}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#2D1A12' }}>{dept.name}</td>
                    <td style={{ padding: '14px 16px', color: '#666', fontSize: '0.85rem' }}>{dept.description || '-'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {dept.permissions && dept.permissions.length > 0 ? (
                          dept.permissions.map(p => (
                            <span 
                              key={p.id} 
                              style={{ 
                                background: '#FAF6F0', 
                                color: '#7B5233', 
                                border: '1px solid #EADCC9', 
                                padding: '2px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem',
                                fontWeight: '500'
                              }}
                            >
                              {p.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#C0C0C0', fontSize: '0.8rem', fontStyle: 'italic' }}>Chưa thiết lập</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          backgroundColor: dept.is_active ? '#ECFDF5' : '#FEF2F2',
                          color: dept.is_active ? '#10B981' : '#EF4444',
                          border: `1px solid ${dept.is_active ? '#A7F3D0' : '#FCA5A5'}`
                        }}
                      >
                        {dept.is_active ? 'Đang sử dụng' : 'Dừng hoạt động'}
                      </span>
                    </td>
                    {hasWritePermission && (
                      (() => {
                        const isLastRows = index >= filteredDepartments.length - 2 && filteredDepartments.length > 2;
                        return (
                          <td style={{ position: 'relative', padding: '14px 16px', textAlign: 'center', zIndex: actionMenuId === dept.id ? 40 : 1 }}>
                            <button
                              type="button"
                              className="action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === dept.id ? null : dept.id);
                              }}
                            ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                            {actionMenuId === dept.id && (
                              <div className="action-menu" style={{ 
                                right: '50%', 
                                transform: 'translateX(50%)', 
                                top: isLastRows ? 'auto' : '80%', 
                                bottom: isLastRows ? '80%' : 'auto',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                zIndex: 1000
                              }}>
                                <button 
                                  type="button"
                                  className="action-menu-item" 
                                  onClick={() => {
                                    setActionMenuId(null);
                                    openEditModal(dept);
                                  }}
                                >
                                  Chỉnh sửa
                                </button>
                                {dept.is_active && (
                                  <button 
                                    type="button"
                                    className="action-menu-item danger" 
                                    onClick={() => {
                                      setActionMenuId(null);
                                      handleDelete(dept);
                                    }}
                                  >
                                    Dừng hoạt động
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })()
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Thêm/Sửa Bộ phận ── */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #FAF0E6', backgroundColor: '#FAF6F0' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2D1A12', fontWeight: '800' }}>
                {modalMode === 'create' ? 'Tạo Bộ phận mới' : 'Chỉnh sửa Bộ phận'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', color: '#7B5233', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '50%' }}>
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
                    {SCREEN_GROUPS.map((group) => (
                      <div key={group.title} style={{ marginBottom: '15px' }}>
                        <div style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: '800', 
                          color: '#7B5233', 
                          borderBottom: '1px solid #EADCC9', 
                          paddingBottom: '4px',
                          marginBottom: '8px'
                        }}>
                          {group.title}
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
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #FAF0E6', backgroundColor: '#FAF6F0' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setIsModalOpen(false)}
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
      )}

      {confirmDeleteData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #FAF0E6', backgroundColor: '#FAF6F0' }}>
              <h4 style={{ margin: 0, color: '#7B5233', fontSize: '1.05rem', fontWeight: '800' }}>Xác nhận dừng hoạt động</h4>
              <button 
                type="button" 
                onClick={() => setConfirmDeleteData(null)} 
                style={{ border: 'none', background: 'none', color: '#8C7B72', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div style={{ fontSize: '0.88rem', color: '#5D4037', fontWeight: '600', lineHeight: '1.4' }}>
                  Bạn có chắc chắn muốn dừng hoạt động bộ phận <strong>"{confirmDeleteData.name}"</strong> không?
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #FAF0E6', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#FAF6F0' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setConfirmDeleteData(null)}
                style={{ height: '36px', padding: '0 15px', borderRadius: '8px', fontSize: '0.85rem' }}
              >
                Hủy bỏ
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ height: '36px', padding: '0 15px', borderRadius: '8px', fontSize: '0.85rem', backgroundColor: '#DC2626', borderColor: '#DC2626' }}
                onClick={async () => {
                  const dept = confirmDeleteData;
                  setConfirmDeleteData(null);
                  setError(null);
                  try {
                    await api.delete(`/roles/${dept.id}`);
                    fetchData();
                  } catch (err) {
                    console.error('Lỗi khi dừng sử dụng bộ phận:', err);
                    setError(err.response?.data?.detail || 'Không thể thay đổi trạng thái hoạt động.');
                  }
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
