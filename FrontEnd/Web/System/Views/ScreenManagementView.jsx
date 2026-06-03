import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { screenService } from '@web/System/Models/screen.service';
import { useScreen } from '@shared/context/ScreenContext';
import '@web/styles/Admin/ScreenManagement.css';

const ScreenManagement = () => {
  const navigate = useNavigate();
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [editingScreen, setEditingScreen] = useState(null);
  const [formData, setEditingFormData] = useState({ current_code: '', title: '', subtitle: '' });
  const [toast, setToast] = useState(null);
  const { refreshScreens } = useScreen();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchScreens = async () => {
    try {
      setLoading(true);
      const data = await screenService.getScreens();
      setScreens(data || []);
    } catch (error) {
      showToast('Không thể tải cấu hình màn hình!', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreens();
  }, []);

  const handleEditClick = (screen) => {
    setEditingScreen(screen);
    setEditingFormData({
      current_code: screen.current_code,
      title: screen.title,
      subtitle: screen.subtitle || ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.current_code || !formData.title) {
      showToast('Vui lòng điền đầy đủ Mã màn hình và Tiêu đề!', 'error');
      return;
    }

    try {
      await screenService.updateScreen(editingScreen.id, formData);
      showToast('Cập nhật cấu hình màn hình thành công!');
      setEditingScreen(null);
      fetchScreens();
      refreshScreens(); // Refresh context
    } catch (error) {
      showToast('Cập nhật thất bại, vui lòng thử lại!', 'error');
    }
  };

  const handleReset = async (screen) => {
    if (window.confirm(`Bạn có chắc chắn muốn đặt lại mã màn hình của "${screen.title}" về mặc định (${screen.default_code})?`)) {
      try {
        await screenService.resetScreen(screen.id);
        showToast('Đã đặt lại mã màn hình về mặc định!');
        fetchScreens();
        refreshScreens(); // Refresh context
      } catch (error) {
        showToast('Đặt lại thất bại!', 'error');
      }
    }
  };

  const filteredScreens = screens.filter(screen => {
    const matchesSearch = 
      screen.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.route_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.current_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.default_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlatform = platformFilter === 'All' || screen.platform === platformFilter;
    
    return matchesSearch && matchesPlatform;
  });

  return (
    <div className="screen-management-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span>
            <span className="toast-text">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="mgmt-toolbar card">
        <div className="toolbar-left">
          <div className="search-wrapper">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input 
              type="text" 
              placeholder="Tìm kiếm theo mã, tiêu đề, đường dẫn..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="toolbar-right">
          <div className="platform-tabs">
            <button 
              className={`tab-btn ${platformFilter === 'All' ? 'active' : ''}`}
              onClick={() => setPlatformFilter('All')}
            >
              Tất cả
            </button>
            <button 
              className={`tab-btn ${platformFilter === 'Web' ? 'active' : ''}`}
              onClick={() => setPlatformFilter('Web')}
            >
              Web Portal
            </button>
            <button 
              className={`tab-btn ${platformFilter === 'Mobile' ? 'active' : ''}`}
              onClick={() => setPlatformFilter('Mobile')}
            >
              Mobile App
            </button>
          </div>
        </div>
      </div>

      {/* Bảng dữ liệu cấu hình */}
      <div className="table-card">
        {loading ? (
          <div className="loading-spinner">Đang tải cấu hình màn hình...</div>
        ) : filteredScreens.length === 0 ? (
          <div className="empty-state">Không tìm thấy màn hình nào phù hợp</div>
        ) : (
          <div className="table-wrapper">
            <table className="screens-table">
              <thead>
                <tr>
                  <th>Nền tảng</th>
                  <th>Mã mặc định</th>
                  <th>Mã hiện tại</th>
                  <th>Tiêu đề hiển thị</th>
                  <th>Phụ đề mô tả</th>
                  <th>Đường dẫn Route</th>
                  <th style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredScreens.map((screen) => {
                  const isModified = screen.current_code !== screen.default_code;
                  return (
                    <tr 
                      key={screen.id}
                      onClick={(e) => {
                        if (e.target.closest('.actions-cell') || e.target.closest('button')) return;
                        navigate(`/admin/screens/${screen.id}`);
                      }}
                      className="clickable-row"
                    >
                      <td>
                        <span className={`platform-badge ${screen.platform}`}>
                          {screen.platform === 'Web' ? '🖥️ Web' : '📱 Mobile'}
                        </span>
                      </td>
                      <td className="code-text font-mono">{screen.default_code}</td>
                      <td className="code-text font-mono">
                        <span className={isModified ? 'modified-code' : 'normal-code'}>
                          {screen.current_code}
                        </span>
                      </td>
                      <td className="title-text font-semibold">{screen.title}</td>
                      <td className="subtitle-text text-gray-500">{screen.subtitle || '-'}</td>
                      <td className="route-text font-mono text-xs">{screen.route_path}</td>
                      <td>
                        <div className="actions-cell">
                          <button 
                            className="btn-edit"
                            onClick={() => handleEditClick(screen)}
                            title="Chỉnh sửa cấu hình"
                          >
                            Sửa
                          </button>
                          {isModified && (
                            <button 
                              className="btn-reset"
                              onClick={() => handleReset(screen)}
                              title="Khôi phục mã mặc định"
                            >
                              Khôi phục
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Chỉnh sửa cấu hình */}
      {editingScreen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Chỉnh sửa màn hình: {editingScreen.title}</h3>
              <button className="btn-close" onClick={() => setEditingScreen(null)}>×</button>
            </div>
            <form onSubmit={handleUpdate} className="modal-form">
              <div className="form-group">
                <label>Nền tảng / Route</label>
                <input 
                  type="text" 
                  value={`${editingScreen.platform} · ${editingScreen.route_path}`}
                  disabled 
                  className="form-control disabled-input"
                />
              </div>
              <div className="form-group">
                <label>Mã màn hình mặc định</label>
                <input 
                  type="text" 
                  value={editingScreen.default_code}
                  disabled 
                  className="form-control disabled-input font-mono"
                />
              </div>
              <div className="form-group">
                <label className="required">Mã màn hình hiển thị mới</label>
                <input 
                  type="text" 
                  name="current_code"
                  value={formData.current_code}
                  onChange={handleInputChange}
                  className="form-control font-mono"
                  required
                />
              </div>
              <div className="form-group">
                <label className="required">Tiêu đề hiển thị (Tiếng Việt)</label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phụ đề mô tả</label>
                <textarea 
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleInputChange}
                  className="form-control"
                  rows="3"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingScreen(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenManagement;
