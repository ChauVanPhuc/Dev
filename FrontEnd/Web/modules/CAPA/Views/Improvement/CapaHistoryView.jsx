import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Trash2, Edit2, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import '@styles/components.css';

const StatusBadge = ({ value }) => {
  let bg = '#F1F5F9';
  let color = '#475569';
  let border = '#cbd5e1';

  if (value === 'Đang theo dõi') { bg = '#FEE2E2'; color = '#DC2626'; border = '#fca5a5'; }
  else if (value === 'Vừa tạo') { bg = '#E2E8F0'; color = '#475569'; border = '#cbd5e1'; }
  else if (value === 'Đang xử lý') { bg = '#FEF3C7'; color = '#D97706'; border = '#fde68a'; }
  else if (value === 'Đạt (đóng CAPA)') { bg = '#DCFCE7'; color = '#15803D'; border = '#86efac'; }

  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 9px',
      borderRadius: '6px',
      fontSize: '0.76rem',
      fontWeight: '700',
      backgroundColor: bg,
      color: color,
      border: `1px solid ${border}`,
      whiteSpace: 'nowrap'
    }}>
      {value || 'Đang theo dõi'}
    </span>
  );
};

const UrgencyBadge = ({ value }) => {
  let color = '#475569';
  if (value === 'Khẩn cấp') color = '#dc2626';
  else if (value === 'Nghiêm trọng') color = '#c2410c';
  else if (value === 'Bình thường') color = '#d97706';
  else if (value === 'Nhẹ') color = '#15803d';

  return (
    <span style={{ fontWeight: '700', color: color, fontSize: '0.76rem' }}>
      {value || 'Bình thường'}
    </span>
  );
};

const CapaHistoryView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/capa');

  // Permissions
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const loggedInUserIsAdmin = loggedInUser.role_name === 'IT' || loggedInUser.role_name === 'BGD' || loggedInUser.username === 'admin';
  let activePermissions = {};
  try {
    activePermissions = JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
  } catch (e) {
    console.error('Failed to parse screen permissions:', e);
  }
  const hasWritePermission = loggedInUserIsAdmin || activePermissions['capa'] !== 'read';

  // Data states
  const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'history'
  const [capas, setCapas] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [trackingCount, setTrackingCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  // Action Menu Dropdown State
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  // Modals & Toast
  const { toast } = useToast();
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', type: 'delete', onConfirm: null });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-btn') && !e.target.closest('.action-menu')) {
        setActiveActionMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title || 'Báo cáo CAPA');
    if (setCustomSubtitle) setCustomSubtitle(subtitle || 'CL10.1: Quản lý Báo cáo CAPA');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || 'CL10.1');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);

  useEffect(() => {
    fetchCapas();
  }, [activeTab, page, pageSize, searchQuery]);

  const fetchCapas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((page - 1) * pageSize),
        limit: String(pageSize),
        tab_status: activeTab
      });
      if (searchQuery) params.set('search', searchQuery);

      const data = await api.get(`/capas/?${params.toString()}`);
      setCapas(data.items || []);
      setTotalItems(data.total || 0);
      setTrackingCount(data.tracking_count || 0);
      setHistoryCount(data.history_count || 0);
    } catch (err) {
      console.error(err);
      toast('error', 'Không thể tải danh sách CAPA.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigate('/admin/capa/create');
  };

  const handleEdit = (item) => {
    navigate(`/admin/capa/edit/${item.id}`);
  };

  const handleDelete = (item) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa CAPA',
      message: `Bạn có chắc chắn muốn xóa báo cáo CAPA "${item.code}" không? Hành động này không thể hoàn tác.`,
      type: 'delete',
      onConfirm: async () => {
        try {
          await api.delete(`/capas/${item.id}`);
          toast('success', 'Đã xóa báo cáo CAPA thành công.');
          fetchCapas();
        } catch (err) {
          console.error(err);
          toast('error', 'Xóa báo cáo CAPA thất bại.');
        }
      }
    });
  };

  const handleExport = () => {
    toast('info', 'Tính năng xuất Excel CAPA đang được xử lý...');
  };

  const filteredCapas = capas.filter(item => {
    if (urgencyFilter !== 'all') {
      if (item.urgency !== urgencyFilter) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="mgmt-container">
      <div className="mgmt-main">
        {/* Standard Page Toolbar */}
        <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
          searchPlaceholder="Tìm mã CAPA, người xử lý, mô tả..."
          isFilterActive={isFilterBarOpen}
          onToggleFilter={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={urgencyFilter !== 'all' ? 1 : 0}
          onExport={handleExport}
          onCreate={hasWritePermission ? handleCreate : undefined}
          createLabel="Thêm mới"
          hasWritePermission={hasWritePermission}
        />

        {/* Tab Switcher: CAPA đang theo dõi vs Lịch sử CAPA */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '14px',
          paddingLeft: '4px'
        }}>
          <button
            onClick={() => { setActiveTab('tracking'); setPage(1); }}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'tracking' ? '800' : '600',
              color: activeTab === 'tracking' ? '#7B5233' : '#64748b',
              borderBottom: activeTab === 'tracking' ? '3px solid #7B5233' : 'none',
              marginBottom: '-2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            CAPA đang theo dõi
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: activeTab === 'tracking' ? '#7B5233' : '#cbd5e1',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 'bold'
            }}>
              {trackingCount}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('history'); setPage(1); }}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'history' ? '800' : '600',
              color: activeTab === 'history' ? '#7B5233' : '#64748b',
              borderBottom: activeTab === 'history' ? '3px solid #7B5233' : 'none',
              marginBottom: '-2px',
              cursor: 'pointer'
            }}
          >
            Lịch sử CAPA ({historyCount})
          </button>
        </div>

        {/* Inline Expandable Filter Bar */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar" style={{ marginBottom: '14px' }}>
            <div className="filter-field-group">
              <label className="filter-field-label">Mức độ sự cố</label>
              <select
                value={urgencyFilter}
                onChange={(e) => { setUrgencyFilter(e.target.value); setPage(1); }}
              >
                <option value="all">Tất cả mức độ</option>
                <option value="Khẩn cấp">Khẩn cấp</option>
                <option value="Nghiêm trọng">Nghiêm trọng</option>
                <option value="Bình thường">Bình thường</option>
                <option value="Nhẹ">Nhẹ</option>
              </select>
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label">Hiển thị số dòng</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
              >
                <option value={10}>10 dòng</option>
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>
          </div>
        )}

        {/* Main Table Layout */}
        <div className="admin-list-layout">
          <div className="mgmt-table card admin-table-card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#7B5233', fontWeight: '600' }}>Đang tải danh sách CAPA...</div>
            ) : filteredCapas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Không có báo cáo CAPA nào.</div>
            ) : (
              <div className="table-responsive desktop-only admin-table-scroll" style={{ width: '100%', overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '80px', whiteSpace: 'nowrap', fontSize: '0.74rem', padding: '8px 6px' }}>MÃ PHIẾU</th>
                      <th style={{ width: '110px', whiteSpace: 'nowrap', fontSize: '0.74rem', padding: '8px 6px' }}>THỜI GIAN</th>
                      <th style={{ width: '110px', whiteSpace: 'nowrap', fontSize: '0.74rem', padding: '8px 6px' }}>NGƯỜI KHỞI TẠO</th>
                      <th style={{ width: '110px', whiteSpace: 'nowrap', fontSize: '0.74rem', padding: '8px 6px' }}>NGƯỜI XỬ LÝ</th>
                      <th style={{ width: '85px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.74rem', padding: '8px 6px' }}>MỨC ĐỘ</th>
                      <th style={{ width: '100px', whiteSpace: 'nowrap', fontSize: '0.74rem', padding: '8px 6px' }}>PHẠM VI</th>
                      <th style={{ minWidth: '160px', whiteSpace: 'nowrap', fontSize: '0.74rem', padding: '8px 6px' }}>MÔ TẢ SỰ CỐ</th>
                      <th style={{ width: '110px', whiteSpace: 'nowrap', fontSize: '0.74rem', padding: '8px 6px' }}>NGƯỜI ĐÁNH GIÁ</th>
                      <th style={{ width: '115px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.74rem', padding: '8px 6px' }}>TRẠNG THÁI</th>
                      <th style={{ width: '70px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.74rem', padding: '8px 6px' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCapas.map(item => (
                      <tr key={item.id} onClick={() => handleEdit(item)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: '800', color: '#7B5233', fontSize: '0.76rem', whiteSpace: 'nowrap', padding: '8px 6px' }}>{item.code || '—'}</td>
                        <td style={{ fontSize: '0.74rem', whiteSpace: 'nowrap', padding: '8px 6px', color: '#475569' }}>{item.created_at_time || '—'}</td>
                        <td style={{ fontWeight: '600', fontSize: '0.76rem', whiteSpace: 'nowrap', padding: '8px 6px', color: '#334155' }}>{item.creator_name || '—'}</td>
                        <td style={{ fontWeight: '600', fontSize: '0.76rem', whiteSpace: 'nowrap', padding: '8px 6px', color: '#1e293b' }}>{item.handler_name || '—'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '8px 6px' }}><UrgencyBadge value={item.urgency} /></td>
                        <td style={{ fontSize: '0.76rem', whiteSpace: 'nowrap', padding: '8px 6px', color: '#334155' }}>{item.scope || '—'}</td>
                        <td style={{ fontSize: '0.76rem', whiteSpace: 'nowrap', padding: '8px 6px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', color: '#475569' }} title={item.issue_description}>{item.issue_description || '—'}</td>
                        <td style={{ fontSize: '0.76rem', whiteSpace: 'nowrap', padding: '8px 6px', color: '#334155' }}>{item.evaluator_name || '—'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '8px 6px' }}><StatusBadge value={item.ticket_status} /></td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '8px 6px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id);
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: '6px',
                              cursor: 'pointer',
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#7B5233',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <MoreVertical size={16} style={{ pointerEvents: 'none' }} />
                          </button>

                          {activeActionMenuId === item.id && (
                            <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%', opacity: 1, animation: 'none' }}>
                              <button
                                className="action-menu-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMenuId(null);
                                  handleEdit(item);
                                }}
                              >
                                Chỉnh sửa
                              </button>
                              <button
                                className="action-menu-item danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMenuId(null);
                                  handleDelete(item);
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Standard Pagination Desktop */}
          <div className="admin-pagination-desktop desktop-only">
            <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
              Hiển thị <b>{totalItems > 0 ? (page - 1) * pageSize + 1 : 0}</b> - <b>{Math.min(page * pageSize, totalItems)}</b> trên <b>{totalItems}</b> kết quả
            </div>
            {totalPages > 1 && (
              <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <button
                  className="page-btn"
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={`page-btn ${page === p ? 'active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="page-btn"
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {confirmModal.show && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e293b' }}>{confirmModal.title}</h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#475569' }}>Hủy bỏ</button>
              <button onClick={async () => { setConfirmModal(prev => ({ ...prev, show: false })); if (confirmModal.onConfirm) await confirmModal.onConfirm(); }} style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#fff', backgroundColor: confirmModal.type === 'delete' ? '#ef4444' : '#7B5233' }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Hide Horizontal Scrollbar */}
      <style>{`
        .admin-table-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .admin-table-scroll::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>
    </div>
  );
};

export default CapaHistoryView;
