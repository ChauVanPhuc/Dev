import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ActivityFeed from '@web/Dashboard/Views/components/ActivityFeed';
import api from '@web/Shared/Services/api.service';

import '@web/styles/Admin/UserManagement.css';

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

  const pageSize = 10;
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

  useEffect(() => { fetchUsers(); }, [page, debouncedSearch, statusFilter, sortBy, sortDir]);

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
    <div className="user-mgmt-container">
      {/* ── Phần nội dung chính ── */}
      <div className="user-mgmt-main">

        {/* ── Thanh công cụ ── */}
        <div className="mgmt-toolbar card">
          <div className="toolbar-left">
            {/* Ô tìm kiếm */}
            <div className="search-wrapper">
              <span className="search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Nhập tên hoặc mã nhân viên"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Nút Lọc + Dropdown Panel */}
            <div className="dropdown-wrapper" ref={filterRef}>
              <button
                className={`icon-btn-minimal ${showFilterPanel || statusFilter ? 'active' : ''}`}
                title="Lọc theo trạng thái"
                onClick={() => { setShowFilterPanel(p => !p); setShowSortPanel(false); }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                {statusFilter && <span className="filter-indicator" />}
              </button>
              {showFilterPanel && (
                <div className="dropdown-panel">
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
            <div className="dropdown-wrapper" ref={sortRef}>
              <button
                className={`icon-btn-minimal ${showSortPanel ? 'active' : ''}`}
                title="Sắp xếp"
                onClick={() => { setShowSortPanel(p => !p); setShowFilterPanel(false); }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"></path>
                </svg>
              </button>
              {showSortPanel && (
                <div className="dropdown-panel">
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

            {/* Dropdown hiển thị theo */}
            <div className="display-filter">
              <span className="filter-label">Hiển thị theo</span>
              <select className="filter-select">
                <option>Thông tin tài khoản</option>
                <option>Thông tin cá nhân</option>
              </select>
            </div>
          </div>

          <div className="toolbar-right">
            <button className="btn btn-primary" onClick={() => navigate('/admin/users/create')}>Tạo mới</button>
            <button className="btn btn-outline">Xuất dữ liệu</button>
          </div>
        </div>

        {/* ── Bảng dữ liệu ── */}
        <div className="mgmt-table card">
          {loading ? (
            <div className="loading-state">Đang tải dữ liệu...</div>
          ) : (
            <>
              {/* Bảng Desktop */}
              <div className="table-responsive desktop-only">
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
                      <tr key={user.id}>
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
                    {[...Array(Math.max(0, pageSize - users.length))].map((_, i) => (
                      <tr key={`empty-${i}`} className="empty-row">
                        <td colSpan="9" style={{ position: 'relative' }}>
                          {users.length === 0 && i === 0 && !loading && (
                            <div className="no-data-text">Không tìm thấy dữ liệu</div>
                          )}
                          &nbsp;
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Thẻ Mobile */}
              <div className="mobile-only user-cards-container">
                {users.length === 0 && !loading && <div className="no-data-text-mobile">Không tìm thấy dữ liệu</div>}
                {users.map((user) => (
                  <div key={user.id} className="user-card">
                    <div className="user-card-main">
                      <div className="user-avatar">{user.full_name?.charAt(0) || 'U'}</div>
                      <div className="user-details">
                        <div className="user-name-row">
                          <h4 className="card-full-name">{user.full_name}</h4>
                          <span className="card-emp-id">#{user.employee_id}</span>
                        </div>
                        <div className="user-meta-chips">
                          <span className="meta-chip">{user.role_name === 'IT' || user.role_name === 'BGD' ? 'Hành chính' : 'Sản xuất'}</span>
                          <span className="meta-chip secondary" title={user.stage_name}>
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
                      <div className="card-actions-minimal" style={{ position: 'relative' }}>
                        <button
                          className="action-btn"
                          onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                        >•••</button>
                        {actionMenuId === user.id && (
                          <div className="action-menu" style={{ right: 0, left: 'auto' }}>
                            <button className="action-menu-item" onClick={() => handleAction('edit', user)}>✏️ Chỉnh sửa</button>
                            <button className="action-menu-item warn" onClick={() => handleAction('suspend', user)}>⏸ Đình chỉ</button>
                            <button className="action-menu-item danger" onClick={() => handleAction('delete', user)}>🗑 Xóa</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="user-card-footer">
                      <div className="card-role-text">{user.role_name}</div>
                      <span className="status-dot-badge" style={getStatusStyle(user.status)}>
                        <span className="dot" style={{ backgroundColor: getStatusStyle(user.status).color }}></span>
                        {user.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Phân trang */}
              <div className="pagination">
                <span className="pagination-info">
                  {total === 0 ? 'Không có kết quả' : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / ${total} kết quả`}
                </span>
                <div className="pagination-controls">
                  <button disabled={page === 1} onClick={() => setPage(page - 1)} className="page-btn">&lt; Trước</button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                      onClick={() => setPage(i + 1)}
                    >{i + 1}</button>
                  ))}
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="page-btn">Sau &gt;</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Feed hoạt động ── */}
      <div className="user-mgmt-aside">
        <ActivityFeed />
      </div>
    </div>
  );
};

export default UserManagement;
