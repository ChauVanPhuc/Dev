import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Check, X, Search, Shield } from 'lucide-react';
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

const PositionManagement = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setCustomTitle = outletContext?.setCustomTitle;
  const setCustomSubtitle = outletContext?.setCustomSubtitle;
  const setCustomScreenCode = outletContext?.setCustomScreenCode;

  // Cập nhật tiêu đề trang lên Layout Header
  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Quản lý chức vụ');
    if (setCustomSubtitle) setCustomSubtitle('Danh sách chức vụ trong hệ thống và phân quyền mặc định.');
    if (setCustomScreenCode) setCustomScreenCode('AD3.5');
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
  const [positions, setPositions] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedPosId, setSelectedPosId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    role_ids: []
  });
  
  // State lưu trữ quyền mặc định đang cấu hình trong modal
  const [defaultPermissions, setDefaultPermissions] = useState({});

  // Tải danh sách chức vụ (permissions) và bộ phận (roles)
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Gọi API permissions với include_inactive=true
      const permsData = await api.get('/permissions/?include_inactive=true');
      setPositions(permsData);

      // Gọi API roles (bộ phận)
      const rolesData = await api.get('/roles/');
      setAllDepartments(rolesData);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu chức vụ:', err);
      setError('Không thể kết nối tới máy chủ. Vui lòng tải lại trang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Tìm kiếm cục bộ
  const filteredPositions = positions.filter(pos => 
    pos.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    pos.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mở Modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
      role_ids: []
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

  const openEditModal = (pos) => {
    setFormData({
      name: pos.name,
      description: pos.description || '',
      is_active: pos.is_active,
      role_ids: pos.roles ? pos.roles.map(r => r.id) : []
    });
    
    // Parse default permissions từ DB
    let parsed = {};
    try {
      parsed = JSON.parse(pos.default_permissions || '{}');
    } catch (e) {
      parsed = {};
    }
    
    const initialPerms = {};
    ALL_SCREENS.forEach(screenKey => {
      initialPerms[screenKey] = parsed[screenKey] || 'write';
    });
    setDefaultPermissions(initialPerms);
    
    setSelectedPosId(pos.id);
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
    if (!formData.name.trim()) return alert('Vui lòng nhập tên chức vụ!');
    if (!formData.role_ids || formData.role_ids.length === 0) {
      return alert('Vui lòng chọn bộ phận trực thuộc!');
    }
    
    setError(null);
    const dataToSend = {
      ...formData,
      default_permissions: JSON.stringify(defaultPermissions)
    };
    
    try {
      if (modalMode === 'create') {
        await api.post('/permissions/', dataToSend);
      } else {
        await api.put(`/permissions/${selectedPosId}`, dataToSend);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Lỗi khi lưu chức vụ:', err);
      setError(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu thông tin.');
    }
  };

  // Dừng hoạt động (Soft delete)
  const handleDelete = async (pos) => {
    if (!window.confirm(`Bạn có chắc chắn muốn dừng hoạt động chức vụ "${pos.name}"?`)) return;
    setError(null);
    try {
      await api.delete(`/permissions/${pos.id}`);
      fetchData();
    } catch (err) {
      console.error('Lỗi khi dừng sử dụng chức vụ:', err);
      setError(err.response?.data?.detail || 'Không thể thay đổi trạng thái hoạt động.');
    }
  };

  return (
    <div style={{ width: '100%', paddingBottom: '40px' }}>
      {/* ── Tìm kiếm & Tạo mới ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div className="search-wrapper" style={{ width: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: '#A0A0A0' }} />
            <input 
              type="text" 
              placeholder="Tìm kiếm chức vụ..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 38px',
                borderRadius: '8px',
                border: '1px solid #EADCC9',
                outline: 'none',
                backgroundColor: '#FAF8F6',
                color: '#2D1A12',
                fontSize: '0.9rem'
              }}
            />
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
                fontSize: '0.85rem'
              }}
            >
              <Plus size={16} /> Tạo chức vụ mới
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 20px', backgroundColor: '#FEE2E2', borderLeft: '4px solid #EF4444', color: '#B91C1C', borderRadius: '8px', marginBottom: '20px', fontWeight: '500', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* ── Bảng Giao diện Chức vụ ── */}
      <div className="mgmt-table card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #EADCC9' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7B5233', fontWeight: '600' }}>Đang tải dữ liệu...</div>
        ) : filteredPositions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Không tìm thấy chức vụ nào phù hợp.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EADCC9', backgroundColor: '#FAF6F0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#7B5233', width: '80px' }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#7B5233', width: '200px' }}>Tên chức vụ</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#7B5233', width: '200px' }}>Bộ phận trực thuộc</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#7B5233' }}>Mô tả</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#7B5233', width: '150px' }}>Trạng thái</th>
                  {hasWritePermission && <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#7B5233', width: '120px' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map(pos => (
                  <tr key={pos.id} style={{ borderBottom: '1px solid #FAF0E6', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '14px 16px', color: '#888', fontWeight: '600' }}>#{pos.id}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#2D1A12' }}>{pos.name}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {pos.roles && pos.roles.length > 0 ? (
                          pos.roles.map(r => (
                            <span 
                              key={r.id} 
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
                              {r.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#C0C0C0', fontSize: '0.8rem', fontStyle: 'italic' }}>Chưa gán bộ phận</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#666', fontSize: '0.85rem' }}>{pos.description || '-'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          backgroundColor: pos.is_active ? '#ECFDF5' : '#FEF2F2',
                          color: pos.is_active ? '#10B981' : '#EF4444',
                          border: `1px solid ${pos.is_active ? '#A7F3D0' : '#FCA5A5'}`
                        }}
                      >
                        {pos.is_active ? 'Đang sử dụng' : 'Dừng hoạt động'}
                      </span>
                    </td>
                    {hasWritePermission && (
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                          <button 
                            onClick={() => openEditModal(pos)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#3B82F6',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              transition: 'background 0.2s'
                            }}
                            title="Sửa thông tin"
                          >
                            <Edit2 size={15} />
                          </button>
                          {pos.is_active && (
                            <button 
                              onClick={() => handleDelete(pos)}
                              style={{
                                border: 'none',
                                background: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                transition: 'background 0.2s'
                              }}
                              title="Dừng hoạt động"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Thêm/Sửa Chức vụ ── */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #FAF0E6', backgroundColor: '#FAF6F0' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2D1A12', fontWeight: '800' }}>
                {modalMode === 'create' ? 'Tạo Chức vụ mới' : 'Chỉnh sửa Chức vụ'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', color: '#7B5233', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '50%' }}>
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
                            <div key={scr.key} style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
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
    </div>
  );
};

export default PositionManagement;
