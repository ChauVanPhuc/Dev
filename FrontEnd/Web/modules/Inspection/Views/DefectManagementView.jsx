import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';
import '@styles/components.css';

/**
 * View: Quản lý danh mục lỗi kiểm tra chất lượng (CRUD)
 * Sử dụng chủ đề màu Coffee Luxury sang trọng, đồng bộ với ERP G7
 */
const DefectManagement = () => {
  // ─── Dữ liệu danh sách ──────────────────────────────────────
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ─── Lọc & Bộ lọc ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('all'); // all, visual, structure, material, tracking
  const [showInactive, setShowInactive] = useState(true); // hiển thị cả lỗi ngừng dùng

  // ─── Phân trang ─────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // ─── Quản lý Modals / Trạng thái Form ────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState(null); // null = tạo mới, object = chỉnh sửa
  const [formData, setFormData] = useState({
    name: '',
    category: 'visual',
    needs_tracking: false,
    is_active: true
  });
  
  // ─── Xác nhận Xóa ──────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null); // object cần xóa

  // ─── Trạng thái Toast thông báo ────────────────────────────
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Hiển thị thông báo nhanh
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Tải dữ liệu từ API
  const fetchDefects = async () => {
    setLoading(true);
    try {
      // Gọi endpoint lấy danh mục lỗi
      // API hỗ trợ include_inactive
      const data = await api.get(`/inspections/defect-types?include_inactive=${showInactive}`);
      if (Array.isArray(data)) {
        setDefects(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh mục lỗi:', err);
      showToast('Không thể tải danh sách lỗi từ hệ thống', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefects();
  }, [showInactive]);

  // Bộ lọc theo Tab và Ô tìm kiếm
  const filteredDefects = defects.filter(item => {
    // 1. Tìm kiếm theo tên
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Lọc theo Tab chuyên biệt
    let matchesTab = true;
    if (activeTab === 'visual') matchesTab = item.category === 'visual';
    else if (activeTab === 'structure') matchesTab = item.category === 'structure';
    else if (activeTab === 'material') matchesTab = item.category === 'material';
    else if (activeTab === 'tracking') matchesTab = item.needs_tracking === true;

    return matchesSearch && matchesTab;
  });

  // Tính toán phân trang
  const totalItems = filteredDefects.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDefects = filteredDefects.slice(startIndex, startIndex + pageSize);

  // Mở form thêm mới
  const handleOpenCreate = () => {
    setEditingDefect(null);
    setFormData({
      name: '',
      category: 'visual',
      needs_tracking: false,
      is_active: true
    });
    setIsFormOpen(true);
  };

  // Mở form chỉnh sửa
  const handleOpenEdit = (defect) => {
    setEditingDefect(defect);
    setFormData({
      name: defect.name,
      category: defect.category,
      needs_tracking: defect.needs_tracking,
      is_active: defect.is_active
    });
    setIsFormOpen(true);
  };

  // Thay đổi giá trị Form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Lưu Form (Tạo mới hoặc Cập nhật)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập tên lỗi', 'error');
      return;
    }

    try {
      if (editingDefect) {
        // Cập nhật lỗi (PUT)
        await api.put(`/inspections/defect-types/${editingDefect.id}`, formData);
        showToast('Cập nhật thông tin lỗi thành công');
      } else {
        // Tạo lỗi mới (POST)
        await api.post('/inspections/defect-types', formData);
        showToast('Thêm loại lỗi mới thành công');
      }
      setIsFormOpen(false);
      fetchDefects();
    } catch (err) {
      console.error('Lỗi khi lưu thông tin lỗi:', err);
      showToast(err.response?.data?.detail || 'Lưu thất bại. Vui lòng thử lại!', 'error');
    }
  };

  // Bật/tắt nhanh trạng thái Cần theo dõi (Inline Toggle)
  const handleToggleTracking = async (defect) => {
    try {
      await api.patch(`/inspections/defect-types/${defect.id}/toggle-tracking`);
      showToast(`Đã cập nhật trạng thái theo dõi cho lỗi "${defect.name}"`);
      // Update local state instantly to feel responsive
      setDefects(prev => prev.map(item => 
        item.id === defect.id ? { ...item, needs_tracking: !item.needs_tracking } : item
      ));
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái theo dõi:', err);
      showToast('Không thể cập nhật trạng thái theo dõi', 'error');
    }
  };

  // Yêu cầu xóa lỗi
  const handleDeleteRequest = (defect) => {
    setDeleteTarget(defect);
  };

  // Xác nhận Xóa mềm (Ngưng hoạt động)
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/inspections/defect-types/${deleteTarget.id}`);
      showToast(`Đã chuyển lỗi "${deleteTarget.name}" sang ngưng hoạt động`);
      setDeleteTarget(null);
      fetchDefects();
    } catch (err) {
      console.error('Lỗi khi xóa lỗi:', err);
      showToast('Xóa lỗi thất bại. Vui lòng thử lại!', 'error');
    }
  };

  // Mảng định nghĩa nhóm lỗi
  const categoryLabels = {
    visual: 'Ngoại quan',
    structure: 'Kết cấu',
    material: 'Nguyên liệu',
  };

  return (
    <div className="mgmt-container defect-mgmt-container">
      <div className="mgmt-main">
        {/* Toast Alert */}
        {toast.show && (
          <div className={`toast-alert ${toast.type}`}>
            <span className="toast-icon">{toast.type === 'success' ? '✓' : '✗'}</span>
            <span className="toast-text">{toast.message}</span>
          </div>
        )}

        {/* ── Thanh điều khiển chính (Gộp gọn gàng Toolbar + Tabs) ── */}
        <div className="mgmt-toolbar card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
            <div className="toolbar-left">
              {/* Ô tìm kiếm */}
              <div className="search-wrapper">
                <span className="search-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B5233" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên lỗi..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset page về 1 khi tìm kiếm
                  }}
                />
              </div>

              {/* Toggle hiển thị lỗi ngừng hoạt động */}
              <label className="checkbox-filter">
                <input 
                  type="checkbox" 
                  checked={showInactive} 
                  onChange={(e) => {
                    setShowInactive(e.target.checked);
                    setCurrentPage(1); // Reset page về 1
                  }} 
                />
                <span className="checkbox-text">Hiển thị lỗi đã ngưng kích hoạt</span>
              </label>
            </div>

            <div className="toolbar-right">
              <button className="btn btn-primary" onClick={handleOpenCreate}>
                + Thêm lỗi mới
              </button>
            </div>
          </div>

          {/* Bộ lọc Tabs nằm gọn gàng bên dưới */}
          <div className="tab-buttons-row" style={{ marginTop: 12, borderTop: '1px solid #FAF6F0', paddingTop: 12 }}>
            <div className="tab-buttons">
              {[
                { id: 'all', label: 'Tất cả danh mục' },
                { id: 'visual', label: 'Ngoại quan (Visual)' },
                { id: 'structure', label: 'Kết cấu (Structure)' },
                { id: 'material', label: 'Nguyên liệu (Material)' },
                { id: 'tracking', label: 'Đang theo dõi đặc biệt' },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1); // Reset page về 1
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bảng dữ liệu chính ── */}
        <div className="mgmt-table card">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <span>Đang tải danh sách lỗi...</span>
            </div>
          ) : (
            <>
              {/* Bảng Desktop */}
              <div className="table-responsive desktop-only">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px', textAlign: 'center' }}>ID</th>
                      <th>Tên lỗi</th>
                      <th style={{ width: '180px' }}>Phân nhóm</th>
                      <th style={{ width: '180px', textAlign: 'center' }}>Theo dõi đặc biệt</th>
                      <th style={{ width: '160px', textAlign: 'center' }}>Trạng thái</th>
                      <th style={{ width: '150px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDefects.length > 0 ? (
                      paginatedDefects.map((defect) => (
                        <tr key={defect.id} className={!defect.is_active ? 'inactive-row' : ''}>
                          <td style={{ textAlign: 'center', color: '#888', fontWeight: 'bold' }}>#{defect.id}</td>
                          <td className="font-bold defect-name-cell">{defect.name}</td>
                          <td>
                            <span className={`category-badge ${defect.category}`}>
                              {categoryLabels[defect.category] || defect.category}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <label className="switch">
                                <input
                                  type="checkbox"
                                  checked={defect.needs_tracking}
                                  onChange={() => handleToggleTracking(defect)}
                                  disabled={!defect.is_active}
                                />
                                <span className="slider round"></span>
                              </label>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {defect.is_active ? (
                              <span className="status-badge active">Đang sử dụng</span>
                            ) : (
                              <span className="status-badge inactive">Ngừng sử dụng</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="action-buttons-cell">
                              <button
                                className="action-icon-btn edit"
                                onClick={() => handleOpenEdit(defect)}
                                title="Chỉnh sửa thông tin"
                              >
                                ✏️
                              </button>
                              {defect.is_active && (
                                <button
                                  className="action-icon-btn delete"
                                  onClick={() => handleDeleteRequest(defect)}
                                  title="Ngưng kích hoạt"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '50px 20px', color: '#888' }}>
                           Không tìm thấy loại lỗi nào khớp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Giao diện Mobile */}
              <div className="mobile-only mgmt-cards-container">
                {paginatedDefects.length > 0 ? (
                  paginatedDefects.map((defect) => (
                    <div key={defect.id} className={`mgmt-card ${!defect.is_active ? 'inactive-row' : ''}`}>
                      <div className="mgmt-card-main">
                        <div className="mgmt-card-avatar">
                          #{defect.id}
                        </div>
                        <div className="mgmt-card-details">
                          <div className="mgmt-card-title-row">
                            <h4 className="mgmt-card-title defect-name-cell">{defect.name}</h4>
                          </div>
                          <div className="mgmt-card-meta-chips">
                            <span className={`category-badge ${defect.category}`}>
                              {categoryLabels[defect.category] || defect.category}
                            </span>
                            {defect.needs_tracking && (
                              <span className="mgmt-card-chip warning" style={{ fontSize: '0.7rem' }}>
                                ★ Theo dõi đặc biệt
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mgmt-card-actions">
                          <button 
                            className="action-icon-btn"
                            onClick={() => handleOpenEdit(defect)}
                            title="Sửa"
                            style={{ border: '1px solid #EADCC9' }}
                          >✏️</button>
                          {defect.is_active && (
                            <button 
                              className="action-icon-btn delete"
                              onClick={() => handleDeleteRequest(defect)}
                              title="Ngưng kích hoạt"
                            >🗑️</button>
                          )}
                        </div>
                      </div>
                      <div className="mgmt-card-footer">
                        <div className="mgmt-card-footer-left">
                          {defect.is_active ? (
                            <span className="status-badge active" style={{ fontSize: '0.75rem' }}>Đang sử dụng</span>
                          ) : (
                            <span className="status-badge inactive" style={{ fontSize: '0.75rem' }}>Ngừng sử dụng</span>
                          )}
                        </div>
                        <div className="mgmt-card-footer-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.75rem', color: '#666' }}>Theo dõi QC:</span>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={defect.needs_tracking}
                              onChange={() => handleToggleTracking(defect)}
                              disabled={!defect.is_active}
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data-text-mobile">
                    Không tìm thấy loại lỗi nào khớp với bộ lọc hiện tại.
                  </div>
                )}
              </div>

              {/* Phân trang dưới đáy bảng */}
              {totalItems > 0 && (
                <div className="pagination">
                  <span className="pagination-info">
                    Hiển thị {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)} / {totalItems} kết quả
                  </span>
                  <div className="pagination-controls">
                    <button 
                      disabled={currentPage === 1} 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                      className="page-btn"
                    >
                      &lt; Trước
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button 
                      disabled={currentPage >= totalPages} 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                      className="page-btn"
                    >
                      Sau &gt;
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── MODAL: THÊM MỚI / CHỈNH SỬA ── */}
      {isFormOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card">
            <div className="modal-header">
              <h3>{editingDefect ? '✏️ Cập nhật loại lỗi' : '✨ Thêm loại lỗi mới'}</h3>
              <button className="close-btn" onClick={() => setIsFormOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tên lỗi <span className="required">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Bề mặt xước, Cong vênh,..."
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Phân nhóm QC</label>
                  <select name="category" value={formData.category} onChange={handleInputChange}>
                    <option value="visual">Ngoại quan (Visual)</option>
                    <option value="structure">Kết cấu (Structure)</option>
                    <option value="material">Nguyên liệu (Material)</option>
                  </select>
                </div>

                <div className="form-group-checkbox">
                  <label className="switch">
                    <input
                      type="checkbox"
                      name="needs_tracking"
                      checked={formData.needs_tracking}
                      onChange={handleInputChange}
                    />
                    <span className="slider round"></span>
                  </label>
                  <div className="checkbox-info">
                    <span className="checkbox-title">Theo dõi đặc biệt</span>
                    <span className="checkbox-desc">Đánh dấu nếu đây là lỗi trọng yếu cần giám sát chặt chẽ trên biểu đồ và báo cáo.</span>
                  </div>
                </div>

                <div className="form-group-checkbox">
                  <label className="switch">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    <span className="slider round"></span>
                  </label>
                  <div className="checkbox-info">
                    <span className="checkbox-title">Trạng thái kích hoạt</span>
                    <span className="checkbox-desc">Bật để lỗi hiển thị trong danh mục khai báo QC trên Mobile.</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsFormOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDefect ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: XÁC NHẬN NGƯNG KÍCH HOẠT ── */}
      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>⚠️ Xác nhận ngưng hoạt động</h3>
              <button className="close-btn" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 0' }}>
              <p>Bạn có chắc chắn muốn ngưng sử dụng lỗi <strong>"{deleteTarget.name}"</strong> không?</p>
              <p style={{ color: '#D32F2F', fontSize: '0.85rem', marginTop: '10px' }}>
                * Lỗi này sẽ không xuất hiện trong các mục tạo QC mới trên Mobile nhưng dữ liệu lịch sử cũ vẫn được giữ nguyên.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>
                Hủy bỏ
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Ngưng sử dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectManagement;
