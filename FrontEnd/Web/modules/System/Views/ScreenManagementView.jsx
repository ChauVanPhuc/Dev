import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { screenService } from '@modules/System/Models/screen.service';
import { Search, Filter, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { useScreen } from '@shared/context/ScreenContext';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';

const ScreenManagement = () => {
  const navigate = useNavigate();
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [editingScreen, setEditingScreen] = useState(null);
  const [formData, setEditingFormData] = useState({ current_code: '', title: '', subtitle: '' });
  const { toast } = useToast();
  const [actionMenuId, setActionMenuId] = useState(null);
  const [sortBy, setSortBy] = useState('current_code');
  const [sortDir, setSortDir] = useState('asc');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [customizationFilter, setCustomizationFilter] = useState('all');
  const { refreshScreens } = useScreen();

  useEffect(() => {
    const handleOutsideClick = (e) => {
      setActionMenuId(null);
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterPanel(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortPanel(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const showToast = (message, type = 'success') => {
    toast(type, message);
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

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    const rows = filteredScreens;
    const header = ['Mã màn hình', 'Mã mặc định', 'Tiêu đề', 'Nền tảng', 'Đường dẫn', 'Phụ đề'];
    const csvContent = [
      header.join(','),
      ...rows.map(s => [
        `"${s.current_code || ''}"`,
        `"${s.default_code || ''}"`,
        `"${(s.title || '').replace(/"/g, '""')}"`,
        `"${s.platform || ''}"`,
        `"${s.route_path || ''}"`,
        `"${(s.subtitle || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_sach_man_hinh_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Xuất dữ liệu thành công!');
  };

  const filteredScreens = useMemo(() => {
    let result = screens.filter(screen => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        screen.title?.toLowerCase().includes(q) ||
        screen.route_path?.toLowerCase().includes(q) ||
        screen.current_code?.toLowerCase().includes(q) ||
        screen.default_code?.toLowerCase().includes(q);
      return matchesSearch;
    });

    if (platformFilter) {
      result = result.filter(s => s.platform === platformFilter);
    }

    if (customizationFilter !== 'all') {
      result = result.filter(s => {
        const isModified = s.current_code !== s.default_code || s.title !== s.default_title || (s.subtitle !== s.default_subtitle);
        return customizationFilter === 'modified' ? isModified : !isModified;
      });
    }

    result = [...result].sort((a, b) => {
      let av = (a[sortBy] || '').toString().toLowerCase();
      let bv = (b[sortBy] || '').toString().toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [screens, searchQuery, platformFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredScreens.length / pageSize);
  const paginatedScreens = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredScreens.slice(startIndex, startIndex + pageSize);
  }, [filteredScreens, currentPage, pageSize]);

  return (
    <>
      <div className="mgmt-container screen-management-container">
      <div className="mgmt-main">


        {/* Toolbar */}
        <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
          searchPlaceholder="Tìm theo mã, tiêu đề, đường dẫn..."
          showSort={true}
          sortOptions={[
            { label: 'Sắp xếp: Mặc định', value: 'current_code' },
            { label: 'Tiêu đề (A-Z)', value: 'title' },
            { label: 'Nền tảng', value: 'platform' },
            { label: 'Đường dẫn', value: 'route_path' },
          ]}
          sortValue={sortBy}
          onSortChange={(val) => { setSortBy(val); setCurrentPage(1); }}
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={(platformFilter ? 1 : 0) + (customizationFilter !== 'all' ? 1 : 0)}
          onExport={handleExportCSV}
          hasWritePermission={true}
        />

        {/* INLINE EXPANDABLE FILTER BAR */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar">
            {/* Lọc nền tảng */}
            <div className="filter-field-group">
              <label className="filter-field-label">Nền tảng</label>
              <select
                value={platformFilter}
                onChange={(e) => { setPlatformFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="">Tất cả nền tảng</option>
                <option value="Web">Web</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>

            {/* Trạng thái tuỳ chỉnh */}
            <div className="filter-field-group">
              <label className="filter-field-label">Trạng thái tuỳ chỉnh</label>
              <select
                value={customizationFilter}
                onChange={(e) => { setCustomizationFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">Tất cả</option>
                <option value="modified">Đã sửa đổi</option>
                <option value="unmodified">Chưa sửa đổi</option>
              </select>
            </div>

            {/* Hiển thị số dòng */}
            <div className="filter-field-group">
              <label className="filter-field-label">Hiển thị số dòng</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>
          </div>
        )}

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
                          style={{
                            position: 'relative',
                            zIndex: actionMenuId === screen.id ? 30 : 1
                          }}
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
                          <td style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === screen.id ? 40 : 1 }}>
                            <button
                              className="action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === screen.id ? null : screen.id);
                              }}
                            ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                            {actionMenuId === screen.id && (
                              <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%' }}>
                                <button
                                  className="action-menu-item"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    handleEditClick(screen);
                                  }}
                                >
                                  Chỉnh sửa
                                </button>
                                {isModified && (
                                  <button
                                    className="action-menu-item warn"
                                    onClick={() => {
                                      setActionMenuId(null);
                                      handleReset(screen);
                                    }}
                                  >
                                    Khôi phục mặc định
                                  </button>
                                )}
                              </div>
                            )}
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
                <button type="button" className="btn btn-secondary" onClick={() => setEditingScreen(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ScreenManagement;
