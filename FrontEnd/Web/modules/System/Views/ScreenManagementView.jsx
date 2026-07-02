import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { screenService } from '@modules/System/Models/screen.service';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useScreen } from '@shared/context/ScreenContext';
import '@styles/components.css';

const ScreenManagement = () => {
  const navigate = useNavigate();
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
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

  const totalPages = Math.ceil(filteredScreens.length / pageSize);
  const paginatedScreens = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredScreens.slice(startIndex, startIndex + pageSize);
  }, [filteredScreens, currentPage, pageSize]);

  return (
    <>
      <div className="mgmt-container screen-management-container">
      <div className="mgmt-main">
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
        <div className="qr-toolbar card-shadow" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '10px 15px', 
            background: '#fff', 
            borderRadius: '12px',
            border: '1px solid #EADCC9',
            marginBottom: '20px'
        }}>
          <div className="qr-controls" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
             {/* Row 1: Platform Tabs + Page Size */}
             <div className="qr-mobile-row">
                <div className="platform-tabs" style={{ 
                  display: 'flex', 
                  gap: '4px', 
                  background: '#FAF6F0', 
                  padding: '4px', 
                  borderRadius: '10px',
                  border: '1px solid #EADCC9'
                }}>
                  <button 
                    className={`tab-btn ${platformFilter === 'All' ? 'active' : ''}`}
                    onClick={() => setPlatformFilter('All')}
                    style={{ 
                      height: '28px', 
                      padding: '0 15px',
                      fontSize: '0.75rem', 
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: platformFilter === 'All' ? '700' : '600',
                      backgroundColor: platformFilter === 'All' ? '#7B5233' : 'transparent',
                      color: platformFilter === 'All' ? '#FFF' : '#7B5233',
                      transition: 'all 0.2s'
                    }}
                  >
                    Tất cả
                  </button>
                  <button 
                    className={`tab-btn ${platformFilter === 'Web' ? 'active' : ''}`}
                    onClick={() => setPlatformFilter('Web')}
                    style={{ 
                      height: '28px', 
                      padding: '0 15px',
                      fontSize: '0.75rem', 
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: platformFilter === 'Web' ? '700' : '600',
                      backgroundColor: platformFilter === 'Web' ? '#7B5233' : 'transparent',
                      color: platformFilter === 'Web' ? '#FFF' : '#7B5233',
                      transition: 'all 0.2s'
                    }}
                  >
                    Web
                  </button>
                  <button 
                    className={`tab-btn ${platformFilter === 'Mobile' ? 'active' : ''}`}
                    onClick={() => setPlatformFilter('Mobile')}
                    style={{ 
                      height: '28px', 
                      padding: '0 15px',
                      fontSize: '0.75rem', 
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: platformFilter === 'Mobile' ? '700' : '600',
                      backgroundColor: platformFilter === 'Mobile' ? '#7B5233' : 'transparent',
                      color: platformFilter === 'Mobile' ? '#FFF' : '#7B5233',
                      transition: 'all 0.2s'
                    }}
                  >
                    Mobile
                  </button>
                </div>

                <select 
                    value={pageSize} 
                    onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                    className="page-size-select"
                    style={{ 
                      height: '36px', 
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #EADCC9',
                      backgroundColor: '#FAF6F0',
                      color: '#7B5233',
                      fontWeight: '700',
                      fontSize: '0.8rem'
                    }}
                >
                    <option value={15}>15 dòng</option>
                    <option value={30}>30 dòng</option>
                    <option value={50}>50 dòng</option>
                    <option value={100}>100 dòng</option>
                </select>
             </div>

             <div className="desktop-only" style={{ width: '1px', height: '20px', backgroundColor: '#EADCC9' }}></div>

             {/* Row 2: Search Input */}
             <div className="qr-mobile-row" style={{ flex: 1 }}>
                <div className="qr-search-wrapper" style={{ flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', color: '#7B5233', pointerEvents: 'none' }} />
                  <input 
                    type="text" 
                    placeholder="Tìm theo mã, tiêu đề, đường dẫn..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ 
                      height: '36px', 
                      paddingLeft: '36px',
                      borderRadius: '10px',
                      border: '1px solid #EADCC9',
                      backgroundColor: '#FAF6F0',
                      width: '100%',
                      fontSize: '0.85rem',
                      color: '#7B5233',
                      fontWeight: '700',
                      outline: 'none'
                    }}
                  />
                </div>
             </div>
          </div>
        </div>

        {/* Bảng dữ liệu cấu hình */}
        <div className="admin-list-layout">
          <div className="mgmt-table admin-table-card card-shadow" style={{ 
            background: '#fff', 
            border: '1px solid #EADCC9'
          }}>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <span>Đang tải cấu hình màn hình...</span>
              </div>
            ) : filteredScreens.length === 0 ? (
              <div className="empty-state" style={{ padding: 40, textAlign: 'center', color: '#888' }}>Không tìm thấy màn hình nào phù hợp</div>
            ) : (
              <>
                {/* Giao diện Desktop */}
                <div className="table-responsive desktop-only admin-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nền tảng</th>
                      <th>Mã mặc định</th>
                      <th>Mã hiện tại</th>
                      <th>Tiêu đề hiển thị</th>
                      <th>Phụ đề mô tả</th>
                      <th>Đường dẫn Route</th>
                      <th style={{ textAlign: 'center', width: '150px' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedScreens.map((screen) => {
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
                          <td className="font-semibold">{screen.title}</td>
                          <td style={{ color: '#666' }}>{screen.subtitle || '-'}</td>
                          <td className="font-mono" style={{ fontSize: '0.8rem' }}>{screen.route_path}</td>
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

              {/* Giao diện Mobile */}
              <div className="mobile-only mgmt-cards-container">
                {paginatedScreens.map((screen) => {
                  const isModified = screen.current_code !== screen.default_code;
                  return (
                    <div 
                      key={screen.id} 
                      className="mgmt-card"
                      onClick={(e) => {
                        if (e.target.closest('.mgmt-card-actions') || e.target.closest('button')) return;
                        navigate(`/admin/screens/${screen.id}`);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="mgmt-card-main">
                        <div className="mgmt-card-avatar">
                          {screen.platform === 'Web' ? '🖥️' : '📱'}
                        </div>
                        <div className="mgmt-card-details">
                          <div className="mgmt-card-title-row">
                            <h4 className="mgmt-card-title">{screen.title}</h4>
                            <span className={`platform-badge ${screen.platform}`}>
                              {screen.platform}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: '#666', margin: '4px 0', lineHeight: '1.4' }}>
                            {screen.subtitle || 'Không có mô tả phụ'}
                          </p>
                          <div className="mgmt-card-meta-chips">
                            <span className="mgmt-card-chip font-mono" style={{ fontSize: '0.7rem' }}>
                              {screen.route_path}
                            </span>
                            {isModified && (
                              <span className="mgmt-card-chip warning font-semibold" style={{ fontSize: '0.7rem' }}>
                                Đã sửa
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mgmt-card-actions">
                          <button 
                            className="action-icon-btn"
                            onClick={() => handleEditClick(screen)}
                            title="Sửa"
                            style={{ border: '1px solid #EADCC9' }}
                          >
                            ✏️
                          </button>
                          {isModified && (
                            <button 
                              className="action-icon-btn delete"
                              onClick={() => handleReset(screen)}
                              title="Khôi phục"
                            >
                              🔄
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mgmt-card-footer">
                        <div className="mgmt-card-footer-left font-mono" style={{ fontSize: '0.8rem' }}>
                          Mã: <span className={isModified ? 'modified-code' : 'normal-code'}>{screen.current_code}</span>
                        </div>
                        <div className="mgmt-card-footer-right font-mono" style={{ fontSize: '0.75rem', color: '#999' }}>
                          Mặc định: {screen.default_code}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
                {/* Phân trang - Desktop */}
                {totalPages > 1 && (
                  <div className="admin-pagination-desktop desktop-only">
                      <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                          Hiển thị <b>{paginatedScreens.length}</b> trên <b>{filteredScreens.length}</b> kết quả
                      </div>
                      
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                            className="page-btn"
                          >
                            &lt; Trước
                          </button>
                          {(() => {
                            const pages = [];
                            const delta = 2;
                            for (let i = 1; i <= totalPages; i++) {
                              if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                                pages.push(i);
                              } else if (pages[pages.length - 1] !== '...') {
                                pages.push('...');
                              }
                            }
                            return pages.map((p, idx) => {
                              if (p === '...') {
                                return (
                                  <span key={`ell-${idx}`} style={{ padding: '0 8px', color: '#7B5233', fontWeight: '700' }}>
                                    ...
                                  </span>
                                );
                              }
                              return (
                                <button
                                  key={p}
                                  className={`page-btn ${currentPage === p ? 'active' : ''}`}
                                  onClick={() => setCurrentPage(p)}
                                >
                                  {p}
                                </button>
                              );
                            });
                          })()}
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

        {/* Phân trang - Mobile Sticky */}
        {totalPages > 1 && (
          <div className="pagination-mobile-sticky mobile-only">
              <button className="page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                  <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {currentPage} / {totalPages || 1}</span>
              <button className="page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages <= 1}>
                  <ChevronRight size={16} />
              </button>
          </div>
        )}
      </div>
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
    </>
  );
};

export default ScreenManagement;
