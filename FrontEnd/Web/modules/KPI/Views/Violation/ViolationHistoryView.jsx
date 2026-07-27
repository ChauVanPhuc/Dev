import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import '@styles/components.css';

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
  const [pageSize, setPageSize] = useState(15);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('all');

  // Modals & Toast
  const { toast } = useToast();
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', type: 'delete', onConfirm: null });

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || 'HT08: Danh sách nhân sự vi phạm');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    } else {
      if (setCustomTitle) setCustomTitle('Lịch sử vi phạm');
      if (setCustomSubtitle) setCustomSubtitle('HT08: Danh sách nhân sự vi phạm');
    }
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

  const handleEdit = (item) => {
    navigate(`/admin/violations/edit/${item.id}`);
  };

  const handleCreate = () => {
    navigate('/admin/violations/create');
  };

  const handleDelete = (item) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa vi phạm của "${item.staff_name}" (${item.rule_code || item.issue})?`,
      type: 'delete',
      onConfirm: async () => {
        try {
          await api.delete(`/awards-discipline/${item.id}`);
          toast('success', 'Xóa vi phạm thành công.');
          fetchViolations();
        } catch (err) {
          console.error(err);
          toast('error', 'Không thể xóa vi phạm.');
        }
      }
    });
  };

  const handleExport = async () => {
    try {
      window.open(`${api.defaults.baseURL}/awards-discipline/export`, '_blank');
      toast('success', 'Đang xuất dữ liệu...');
    } catch (err) {
      console.error(err);
      toast('error', 'Không thể xuất dữ liệu.');
    }
  };

  // Severity badge component matching design
  const SeverityBadge = ({ value }) => {
    if (!value) return <span>—</span>;
    const colors = {
      'Cao': { bg: '#fee2e2', color: '#ef4444' },
      'Nghiêm trọng': { bg: '#fee2e2', color: '#ef4444' },
      'Trung bình': { bg: '#fef3c7', color: '#d97706' },
      'Nhẹ': { bg: '#f1f5f9', color: '#64748b' },
      'Thấp': { bg: '#f1f5f9', color: '#64748b' }
    };
    const c = colors[value] || colors['Trung bình'];
    return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: c.bg, color: c.color }}>{value}</span>;
  };

  const filteredViolations = violations.filter(v => {
    if (severityFilter === 'all') return true;
    return (v.severity || v.impact) === severityFilter;
  });

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="mgmt-container">
      <div className="mgmt-main">
        {/* Page Toolbar component */}
        <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
          searchPlaceholder="Tìm kiếm..."
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
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
              <div className="table-responsive desktop-only admin-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '100px' }}>MÃ QUY TẮC</th>
                      <th>TÊN QUY TẮC</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>MỨC ĐỘ</th>
                      <th style={{ width: '100px' }}>MÃ NHÂN SỰ</th>
                      <th>TÊN NHÂN SỰ</th>
                      <th>PHÒNG BAN</th>
                      <th style={{ width: '90px' }}>VỊ TRÍ</th>
                      <th>BỘ PHẬN</th>
                      <th style={{ width: '140px' }}>THỜI GIAN VI PHẠM</th>
                      <th>NGƯỜI PHÁT HIỆN</th>
                      <th>GHI CHÚ</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredViolations.map(item => (
                      <tr key={item.id} onClick={() => handleEdit(item)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: '700', color: '#7B5233' }}>{item.rule_code || '—'}</td>
                        <td style={{ fontWeight: '600' }}>{item.rule_name || item.issue || '—'}</td>
                        <td style={{ textAlign: 'center' }}><SeverityBadge value={item.severity || item.impact} /></td>
                        <td>{item.employee_id || '—'}</td>
                        <td style={{ fontWeight: '600' }}>{item.staff_name || '—'}</td>
                        <td>{item.department || '—'}</td>
                        <td>{item.position || '—'}</td>
                        <td>{item.section || '—'}</td>
                        <td style={{ fontSize: '11px' }}>{item.violation_time || item.date || '—'}</td>
                        <td>{item.reporter_name || '—'}</td>
                        <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note || '—'}</td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button onClick={() => handleEdit(item)} style={{ display: 'flex', padding: '5px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#475569' }}><Edit2 size={12} /></button>
                            <button onClick={() => handleDelete(item)} style={{ display: 'flex', padding: '5px', borderRadius: '6px', border: 'none', background: '#fee2e2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Standard Pagination Desktop */}
          <div className="admin-pagination-desktop desktop-only" style={{ marginTop: '16px' }}>
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
    </div>
  );
};

export default ViolationHistoryView;
