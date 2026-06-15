import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ActivityFeed from '@modules/Dashboard/Views/components/ActivityFeed';
import { ChevronLeft, ChevronRight, Filter, FileDown, Search } from 'lucide-react';
import api from '@webShared/Services/api.service';

import '@styles/components.css';

/**
 * View: Trang Quản lý người dùng
 * Tính năng: Bảng danh sách, Phân trang, Tìm kiếm, Lọc trạng thái, Sắp xếp, Menu thao tác
 */
const renderStages = (stageName) => {
  if (!stageName) return '-';
  const stages = stageName.split(',').map(s => s.trim()).filter(Boolean);
  if (stages.length === 0) return '-';
  
  const limit = 2;
  const displayed = stages.slice(0, limit);
  const remaining = stages.slice(limit);
  
  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', maxWidth: 220 }}>
      {displayed.map((st, idx) => (
        <span
          key={idx}
          style={{
            background: '#FAF6F0',
            color: '#7B5233',
            border: '1px solid #EADCC9',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: '0.68rem',
            whiteSpace: 'nowrap',
            fontWeight: 500
          }}
        >
          {st}
        </span>
      ))}
      {remaining.length > 0 && (
        <span
          title={stages.join('\n')}
          style={{
            background: '#7B5233',
            color: '#FFF',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: '0.68rem',
            whiteSpace: 'nowrap',
            fontWeight: 'bold',
            cursor: 'help'
          }}
        >
          +{remaining.length}
        </span>
      )}
    </div>
  );
};

const UserManagement = () => {
  const navigate = useNavigate();

  // ─── State dữ liệu ───────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(false);

  // ─── State tìm kiếm & lọc ────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');      // '' = tất cả
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // ─── State sắp xếp ───────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [showSortPanel, setShowSortPanel] = useState(false);

  // ─── State menu thao tác ─────────────────────────────────────────────────────
  const [actionMenuId, setActionMenuId] = useState(null); // ID user đang mở menu

  const filterRef = useRef(null);
  const sortRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterPanel(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortPanel(false);
      
      // Chỉ đóng action menu khi click thực sự ra ngoài menu và ngoài nút bấm "..."
      if (!e.target.closest('.action-menu') && !e.target.closest('.action-btn')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce tìm kiếm 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch dữ liệu khi thay đổi bất kỳ tham số nào
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, size: pageSize, sort_by: sortBy, sort_dir: sortDir });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/accounts/?${params.toString()}`);
      setUsers(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Lỗi khi tải danh sách người dùng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, pageSize, debouncedSearch, statusFilter, sortBy, sortDir]);

  // Xử lý sắp xếp cột trong bảng Desktop
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Icon mũi tên sắp xếp
  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span style={{ color: '#CCC', marginLeft: 4 }}>↕</span>;
    return <span style={{ color: '#7B5233', marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // Màu sắc Trạng thái
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Đang sử dụng':  return { color: '#2E7D32', fontWeight: 'bold' };
      case 'Dừng hoạt động': return { color: '#D32F2F', fontWeight: 'bold' };
      case 'Đang chờ xóa': return { color: '#ED6C02', fontWeight: 'bold' };
      default: return { color: '#757575' };
    }
  };

  // Xử lý hành động từ menu thao tác
  const handleAction = (action, user) => {
    setActionMenuId(null);
    if (action === 'edit') navigate(`/admin/users/edit/${user.id}`);
    if (action === 'suspend') alert(`Tính năng "Đình chỉ" cho ${user.full_name} đang được phát triển.`);
    if (action === 'delete') {
      if (window.confirm(`Bạn có chắc muốn xóa tài khoản "${user.full_name}"?`)) {
        alert('Tính năng xóa đang được phát triển.');
      }
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="mgmt-container" style={{ paddingBottom: '80px' }}>
      {/* ── Phần nội dung chính ── */}
      <div className="mgmt-main">

        {/* ── Thanh công cụ ── */}
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
            {/* Row 1: Search */}
            <div className="qr-mobile-row">
              <div className="qr-search-wrapper" style={{ flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: '#7B5233', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Nhập tên hoặc mã nhân viên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 36px',
                    borderRadius: '10px',
                    border: '1px solid #EADCC9',
                    backgroundColor: '#FAF6F0',
                    fontSize: '0.85rem',
                    width: '100%',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    color: '#5D3B32',
                    fontWeight: '600',
                    height: '36px'
                  }}
                />
              </div>
            </div>

            <div className="desktop-only" style={{ width: '1px', height: '20px', backgroundColor: '#EADCC9' }}></div>

            {/* Row 2: Filter + Sort + Items Per Page */}
            <div className="qr-mobile-row">
              {/* Nút Lọc + Dropdown Panel */}
              <div className="dropdown-wrapper" ref={filterRef} style={{ position: 'relative', flex: 1 }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                   <Filter size={14} color="#7B5233" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
                   <button
                    className={`icon-btn-minimal ${showFilterPanel || statusFilter ? 'active' : ''}`}
                    style={{ 
                      padding: '0 10px 0 30px', 
                      height: '36px', 
                      width: '100%', 
                      justifyContent: 'flex-start',
                      borderRadius: '8px',
                      border: '1px solid #EADCC9',
                      backgroundColor: '#FAF6F0',
                      color: '#7B5233',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onClick={() => { setShowFilterPanel(p => !p); setShowSortPanel(false); }}
                  >
                    {statusFilter || 'Trạng thái'}
                    {statusFilter && <span className="filter-indicator" style={{ marginLeft: 'auto' }} />}
                  </button>
                </div>
                {showFilterPanel && (
                  <div className="dropdown-panel" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, width: '200px' }}>
                    <p className="dropdown-title">Lọc theo trạng thái</p>
                    {['', 'Đang sử dụng', 'Dừng hoạt động', 'Đang chờ xóa'].map(s => (
                      <button
                        key={s}
                        className={`dropdown-item ${statusFilter === s ? 'selected' : ''}`}
                        onClick={() => { setStatusFilter(s); setPage(1); setShowFilterPanel(false); }}
                      >
                        {s || 'Tất cả'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Nút Sắp xếp + Dropdown Panel */}
              <div className="dropdown-wrapper" ref={sortRef} style={{ position: 'relative' }}>
                <button
                  className={`icon-btn-minimal ${showSortPanel ? 'active' : ''}`}
                  title="Sắp xếp"
                  style={{ 
                    height: '36px', 
                    width: '40px', 
                    padding: 0, 
                    justifyContent: 'center',
                    borderRadius: '8px',
                    border: '1px solid #EADCC9',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233'
                  }}
                  onClick={() => { setShowSortPanel(p => !p); setShowFilterPanel(false); }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"></path>
                  </svg>
                </button>
                {showSortPanel && (
                  <div className="dropdown-panel" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1000, width: '200px' }}>
                    <p className="dropdown-title">Sắp xếp theo</p>
                    {[
                      { label: 'Mã nhân viên', value: 'employee_id' },
                      { label: 'Họ tên (A-Z)', value: 'full_name' },
                      { label: 'Ngày tạo', value: 'created_at' },
                      { label: 'Trạng thái', value: 'status' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        className={`dropdown-item ${sortBy === opt.value ? 'selected' : ''}`}
                        onClick={() => { setSortBy(opt.value); setSortDir('asc'); setPage(1); setShowSortPanel(false); }}
                      >
                        {opt.label} {sortBy === opt.value ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <select 
                  value={pageSize} 
                  onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                  className="page-size-select"
                  style={{ 
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #EADCC9',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    width: 'auto',
                    maxWidth: '100px'
                  }}
              >
                  <option value={15}>15 dòng</option>
                  <option value={30}>30 dòng</option>
                  <option value={50}>50 dòng</option>
                  <option value={100}>100 dòng</option>
              </select>
            </div>

            <div className="desktop-only" style={{ width: '1px', height: '20px', backgroundColor: '#EADCC9' }}></div>

            {/* Row 3: Action Buttons */}
            <div className="qr-mobile-row" style={{ width: '100%' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/admin/users/create')} 
                style={{ 
                  height: '36px', 
                  padding: '0 20px', 
                  whiteSpace: 'nowrap', 
                  borderRadius: '8px',
                  flex: 1,
                  fontWeight: '700'
                }}
              >
                Tạo mới
              </button>
              
              <button className="btn btn-outline desktop-only" style={{ 
                  height: '36px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '0 15px',
                  borderRadius: '8px',
                  border: '1px solid #EADCC9',
                  backgroundColor: '#fff',
                  color: '#7B5233',
                  fontWeight: '700',
                  fontSize: '0.85rem'
              }}>
                  <FileDown size={16} /> Xuất dữ liệu
              </button>

              <div className="mobile-only" style={{ display: 'contents' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ 
                    width: '40px', 
                    height: '36px', 
                    padding: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: '8px',
                    border: '1px solid #EADCC9',
                    backgroundColor: '#fff',
                    color: '#7B5233'
                  }}
                  title="Xuất dữ liệu"
                >
                  <FileDown size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bảng dữ liệu ── */}
        <div className="admin-list-layout">
          <div className="mgmt-table card admin-table-card">
            {loading ? (
              <div className="loading-state">Đang tải dữ liệu...</div>
            ) : (
              <>
                {/* Bảng Desktop */}
                <div className="table-responsive desktop-only admin-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('employee_id')} style={{ cursor: 'pointer' }}>
                        Mã NV <SortIcon column="employee_id" />
                      </th>
                      <th onClick={() => handleSort('full_name')} style={{ cursor: 'pointer' }}>
                        Tên <SortIcon column="full_name" />
                      </th>
                      <th>Bộ phận</th>
                      <th>Công đoạn</th>
                      <th>Username</th>
                      <th>Vai trò</th>
                      <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                        Ngày tạo <SortIcon column="created_at" />
                      </th>
                      <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                        Trạng thái <SortIcon column="status" />
                      </th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="animate-card-entrance">
                        <td>{user.employee_id}</td>
                        <td className="font-bold">{user.full_name}</td>
                        <td>{user.role_name === 'IT' || user.role_name === 'BGD' ? 'Hành chính' : 'Sản xuất'}</td>
                        <td>{renderStages(user.stage_name)}</td>
                        <td>{user.username}</td>
                        <td>{user.role_name}</td>
                        <td>{user.created_at}</td>
                        <td style={getStatusStyle(user.status)}>{user.status}</td>
                        <td style={{ position: 'relative' }}>
                          <button
                            className="action-btn"
                            onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                          >•••</button>
                          {actionMenuId === user.id && (
                            <div className="action-menu">
                              <button className="action-menu-item" onClick={() => handleAction('edit', user)}>✏️ Chỉnh sửa</button>
                              <button className="action-menu-item warn" onClick={() => handleAction('suspend', user)}>⏸ Đình chỉ</button>
                              <button className="action-menu-item danger" onClick={() => handleAction('delete', user)}>🗑 Xóa</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !loading && (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                          Không tìm thấy dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Thẻ Mobile */}
              <div className="mobile-only mgmt-cards-container">
                {users.length === 0 && !loading && <div className="no-data-text-mobile">Không tìm thấy dữ liệu</div>}
                {users.map((user) => (
                  <div key={user.id} className="mgmt-card animate-card-entrance" style={{ zIndex: actionMenuId === user.id ? 100 : 1 }}>
                    <div className="mgmt-card-main">
                      <div className="mgmt-card-avatar">{user.full_name?.charAt(0) || 'U'}</div>
                      <div className="mgmt-card-details">
                        <div className="mgmt-card-title-row">
                          <h4 className="mgmt-card-title">{user.full_name}</h4>
                          <span className="mgmt-card-subtitle">#{user.employee_id}</span>
                        </div>
                        <div className="mgmt-card-meta-chips">
                          <span className="mgmt-card-chip">{user.role_name === 'IT' || user.role_name === 'BGD' ? 'Hành chính' : 'Sản xuất'}</span>
                          <span className="mgmt-card-chip secondary" title={user.stage_name}>
                            {user.stage_name ? (
                              user.stage_name.split(',').length > 1 ? (
                                `${user.stage_name.split(',')[0].trim()} +${user.stage_name.split(',').length - 1}`
                              ) : (
                                user.stage_name
                              )
                            ) : (
                              'Chưa gán'
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="mgmt-card-actions">
                        <button
                          className="action-btn"
                          onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                        >•••</button>
                        {actionMenuId === user.id && (
                          <div className="action-menu">
                            <button className="action-menu-item" onClick={() => handleAction('edit', user)}>✏️ Chỉnh sửa</button>
                            <button className="action-menu-item warn" onClick={() => handleAction('suspend', user)}>⏸ Đình chỉ</button>
                            <button className="action-menu-item danger" onClick={() => handleAction('delete', user)}>🗑 Xóa</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mgmt-card-footer">
                      <div className="mgmt-card-footer-left font-semibold">{user.role_name}</div>
                      <span className="status-dot-badge" style={getStatusStyle(user.status)}>
                        <span className="dot" style={{ backgroundColor: getStatusStyle(user.status).color }}></span>
                        {user.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            {/* Phân trang - Desktop */}
            <div className="admin-pagination-desktop desktop-only">
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{users.length}</b> trên <b>{total}</b> người dùng
                </div>
                
                {totalPages > 1 && (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(page - 1)} 
                            className="page-btn"
                            style={{ padding: '8px 12px' }}
                        >
                            &lt; Trước
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                                onClick={() => setPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(page + 1)} 
                            className="page-btn"
                            style={{ padding: '8px 12px' }}
                        >
                            Sau &gt;
                        </button>
                    </div>
                )}
            </div>

            </>
          )}
          </div>
        </div>

        {/* Phân trang - Mobile Sticky */}
        {totalPages > 1 && (
          <div className="pagination-mobile-sticky mobile-only">
            <button className="page-btn" onClick={() => setPage(Math.max(page - 1, 1))} disabled={page === 1}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {page} / {totalPages || 1}</span>
            <button className="page-btn" onClick={() => setPage(Math.min(page + 1, totalPages))} disabled={page === totalPages || totalPages <= 1}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Feed hoạt động ── */}
      <div className="mgmt-aside">
        <ActivityFeed />
      </div>
    </div>
  );
};

export default UserManagement;

