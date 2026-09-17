import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Trash2, Edit2, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import '@styles/components.css';

const SeverityBadge = ({ value }) => {
  let bg = '#F1F5F9';
  let color = '#475569';

  if (value === 'Nghiêm trọng') { bg = '#FEE2E2'; color = '#DC2626'; }
  else if (value === 'Cao') { bg = '#FFEDD5'; color = '#C2410C'; }
  else if (value === 'Trung bình') { bg = '#FEF3C7'; color = '#D97706'; }
  else if (value === 'Nhẹ') { bg = '#DCFCE7'; color = '#15803D'; }

  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 9px',
      borderRadius: '6px',
      fontSize: '0.78rem',
      fontWeight: '700',
      backgroundColor: bg,
      color: color,
      whiteSpace: 'nowrap'
    }}>
      {value || 'Nhẹ'}
    </span>
  );
};

/**
 * ViolationHistoryView (HT08 — Lịch sử vi phạm)
 * Màn hình danh sách vi phạm. Khi nhấp Thêm mới / Chỉnh sửa sẽ chuyển sang trang riêng ViolationFormView (HT08.1).
 */
const ViolationHistoryView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/violations');

  // User permissions
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const loggedInUserIsAdmin = loggedInUser.role_name === 'IT' || loggedInUser.role_name === 'BGD' || loggedInUser.username === 'admin';
  let activePermissions = {};
  try {
    activePermissions = JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
  } catch (e) {
    console.error('Failed to parse screen permissions:', e);
  }
  const hasWritePermission = loggedInUserIsAdmin || activePermissions['violations'] !== 'read';

  // Data states
  const [violations, setViolations] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('all');

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
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  useEffect(() => {
    fetchViolations();
  }, [page, pageSize, searchQuery]);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((page - 1) * pageSize),
        limit: String(pageSize)
      });
      if (searchQuery) params.set('search', searchQuery);

      const data = await api.get(`/awards-discipline/?${params.toString()}`);
      setViolations(data.items || []);
      setTotalItems(data.total || 0);
    } catch (err) {
      console.error(err);
      toast('error', 'Không thể tải danh sách vi phạm.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigate('/admin/violations/create');
  };

  const handleEdit = (item) => {
    navigate(`/admin/violations/edit/${item.id}`);
  };

  const handleDelete = (item) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa vi phạm',
      message: `Bạn có chắc chắn muốn xóa bản ghi vi phạm của "${item.staff_name || item.employee_id}" không? Hành động này không thể hoàn tác.`,
      type: 'delete',
      onConfirm: async () => {
        try {
          await api.delete(`/awards-discipline/${item.id}`);
          toast('success', 'Đã xóa bản ghi vi phạm thành công.');
          fetchViolations();
        } catch (err) {
          console.error(err);
          toast('error', 'Xóa vi phạm thất bại.');
        }
      }
    });
  };

  const handleExport = () => {
    toast('info', 'Tính năng xuất Excel đang được xử lý...');
  };

  const filteredViolations = violations.filter(item => {
    if (severityFilter !== 'all') {
      const sev = item.severity || item.impact || '';
      if (sev !== severityFilter) return false;
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
          searchPlaceholder="Tìm mã quy tắc, tên nhân sự..."
          isFilterActive={isFilterBarOpen}
          onToggleFilter={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={severityFilter !== 'all' ? 1 : 0}
          onExport={handleExport}
          onCreate={hasWritePermission ? handleCreate : undefined}
          createLabel="Thêm mới"
          hasWritePermission={hasWritePermission}
        />

        {/* Inline Expandable Filter Bar */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar">
            <div className="filter-field-group">
              <label className="filter-field-label">Mức độ ảnh hưởng</label>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              >
                <option value="all">Tất cả mức độ</option>
                <option value="Nghiêm trọng">Nghiêm trọng</option>
                <option value="Cao">Cao</option>
                <option value="Trung bình">Trung bình</option>
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
              <div style={{ textAlign: 'center', padding: '40px', color: '#7B5233', fontWeight: '600' }}>Đang tải danh sách vi phạm...</div>
            ) : filteredViolations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Không có vi phạm nào.</div>
            ) : (
              <div className="table-responsive desktop-only admin-table-scroll" style={{ width: '100%', overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '65px', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>MÃ QT</th>
                      <th style={{ minWidth: '110px', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>TÊN QUY TẮC</th>
                      <th style={{ width: '80px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>MỨC ĐỘ</th>
                      <th style={{ width: '60px', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>MÃ NV</th>
                      <th style={{ width: '110px', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>TÊN NHÂN SỰ</th>
                      <th style={{ width: '65px', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>PHÒNG BAN</th>
                      <th style={{ width: '75px', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>VỊ TRÍ</th>
                      <th style={{ width: '55px', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>BỘ PHẬN</th>
                      <th style={{ width: '95px', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>THỜI GIAN</th>
                      <th style={{ width: '95px', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>NGƯỜI BÁO CÁO</th>
                      <th style={{ width: '90px', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>GHI CHÚ</th>
                      <th style={{ width: '65px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '8px 4px' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredViolations.map(item => (
                      <tr key={item.id} onClick={() => handleEdit(item)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.74rem', whiteSpace: 'nowrap', padding: '8px 4px' }}>{item.rule_code || '—'}</td>
                        <td style={{ fontWeight: '600', fontSize: '0.74rem', whiteSpace: 'nowrap', padding: '8px 4px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.rule_name || item.issue}>{item.rule_name || item.issue || '—'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '8px 2px' }}><SeverityBadge value={item.severity || item.impact} /></td>
                        <td style={{ fontSize: '0.74rem', whiteSpace: 'nowrap', padding: '8px 4px', color: '#475569' }}>{item.employee_id || '—'}</td>
                        <td style={{ fontWeight: '600', fontSize: '0.74rem', whiteSpace: 'nowrap', padding: '8px 4px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.staff_name}>{item.staff_name || '—'}</td>
                        <td style={{ fontSize: '0.74rem', whiteSpace: 'nowrap', padding: '8px 4px', color: '#334155' }}>{item.department || '—'}</td>
                        <td style={{ fontSize: '0.74rem', whiteSpace: 'nowrap', padding: '8px 4px', color: '#334155' }}>{item.position || '—'}</td>
                        <td style={{ fontSize: '0.74rem', whiteSpace: 'nowrap', padding: '8px 4px', color: '#334155' }}>{item.section || '—'}</td>
                        <td style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '8px 4px', color: '#475569' }}>{item.violation_time || item.date || '—'}</td>
                        <td style={{ fontSize: '0.74rem', whiteSpace: 'nowrap', padding: '8px 4px', color: '#334155', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.reporter_name || '—'}</td>
                        <td style={{ fontSize: '0.74rem', whiteSpace: 'nowrap', padding: '8px 4px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748b' }} title={item.note}>{item.note || '—'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '8px 2px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
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

export default ViolationHistoryView;
