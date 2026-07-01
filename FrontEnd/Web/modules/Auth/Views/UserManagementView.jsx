import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Filter, FileDown, Search, Plus, FolderTree, Briefcase } from 'lucide-react';
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
    title: 'Quản lý KPI',
    screens: [
      { key: 'kpi-checklist', name: 'Checklist công việc' },
      { key: 'kpi-list', name: 'Danh sách KPI' },
      { key: 'kpi-rules', name: 'Quy tắc cộng trừ điểm' },
      { key: 'kpi-feedback', name: 'Phản hồi và nhận xét' }
    ]
  }
];

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

  // Phân quyền
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const loggedInUserIsAdmin = loggedInUser.role_name === 'IT' || loggedInUser.role_name === 'BGD' || loggedInUser.username === 'admin';

  let activePermissions = {};
  try {
    activePermissions = JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
  } catch (e) {
    console.error('Failed to parse screen permissions in UserManagement:', e);
  }

  const hasWritePermission = loggedInUserIsAdmin || activePermissions['users'] !== 'read';

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

  // ─── State chế độ xem & phân quyền ──────────────────────────────────────────
  const [viewMode, setViewMode] = useState('account_info'); // 'account_info' | 'permissions'
  const [showViewModePanel, setShowViewModePanel] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});
  const [permsLoading, setPermsLoading] = useState(false);

  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const viewModeRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterPanel(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortPanel(false);
      if (viewModeRef.current && !viewModeRef.current.contains(e.target)) setShowViewModePanel(false);

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

  // Tải chi tiết phân quyền của toàn bộ user trên trang hiện tại khi ở chế độ Phân quyền
  useEffect(() => {
    const fetchAllPermissions = async () => {
      if (viewMode !== 'permissions' || users.length === 0) return;
      setPermsLoading(true);
      try {
        const promises = users.map(async (user) => {
          try {
            const res = await api.get(`/accounts/${user.id}/permissions?resolved=true`);
            return { userId: user.id, permissions: res.permissions || {} };
          } catch (e) {
            console.error(`Lỗi tải quyền cho user ${user.id}:`, e);
            return { userId: user.id, permissions: {} };
          }
        });
        const results = await Promise.all(promises);
        const permMap = {};
        results.forEach(item => {
          const userPerms = {};
          SCREEN_GROUPS.forEach(group => {
            group.screens.forEach(scr => {
              userPerms[scr.key] = item.permissions[scr.key] || 'write';
            });
          });
          permMap[item.userId] = userPerms;
        });
        setUserPermissions(permMap);
      } catch (err) {
        console.error('Lỗi khi tải hàng loạt phân quyền:', err);
      } finally {
        setPermsLoading(false);
      }
    };

    fetchAllPermissions();
  }, [users, viewMode]);

  // Hàm tính toán quyền cho nhóm cha dựa trên con
  const getGroupPermissionStateForUser = (userId, group) => {
    const userPerms = userPermissions[userId];
    if (!userPerms) return 'write';
    const childVals = group.screens.map(s => userPerms[s.key] || 'write');
    const uniqueVals = Array.from(new Set(childVals));
    if (uniqueVals.length >= 2) {
      return 'write'; // Trạng thái hỗn hợp mặc định về Điều chỉnh (write)
    }
    return uniqueVals[0] || 'write';
  };

  // Hàm thay đổi nhanh quyền cả nhóm
  const handleGroupPermissionChangeForUser = async (user, groupIdx, value) => {
    const currentPerms = { ...(userPermissions[user.id] || {}) };
    const group = SCREEN_GROUPS[groupIdx];

    // Gán đồng loạt quyền cho các con
    group.screens.forEach(s => {
      currentPerms[s.key] = value;
    });

    // Cập nhật UI tạm thời
    setUserPermissions(prev => ({
      ...prev,
      [user.id]: currentPerms
    }));

    // Gửi yêu cầu lưu lên server
    try {
      await api.put(`/accounts/${user.id}/permissions`, {
        permissions: currentPerms
      });
      // Nếu chỉnh sửa cho chính mình, đồng bộ localStorage
      if (user.username === loggedInUser.username) {
        localStorage.setItem('smartflow_active_permissions', JSON.stringify(currentPerms));
      }
    } catch (e) {
      console.error(`Lỗi cập nhật quyền cho user ${user.id}:`, e);
      alert('Đã xảy ra lỗi khi lưu cấu hình phân quyền.');
    }
  };

  // Trả về class màu sắc tương ứng với trạng thái
  const getMatrixDropdownClass = (val) => {
    if (val === 'none') return 'matrix-none';
    if (val === 'read') return 'matrix-read';
    return 'matrix-write';
  };

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
      case 'Đang sử dụng': return { color: '#2E7D32', fontWeight: 'bold' };
      case 'Dừng hoạt động': return { color: '#D32F2F', fontWeight: 'bold' };
      case 'Đang chờ xóa': return { color: '#ED6C02', fontWeight: 'bold' };
      default: return { color: '#757575' };
    }
  };

  // Xử lý hành động từ menu thao tác
  const handleAction = (action, user) => {
    setActionMenuId(null);
    if (action === 'edit') navigate(`/admin/users/edit/${user.id}`);
    if (action === 'permissions') navigate(`/admin/users/edit/${user.id}`);
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

        {/* ── Thanh công cụ (Toolbar) ── */}
        <div className="mgmt-toolbar card" style={{ marginBottom: '20px' }}>

          {/* Nhóm bộ lọc bên trái */}
          <div className="toolbar-left">
            {/* Ô tìm kiếm */}
            <div className="search-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Nhập tên hoặc mã nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Nút Lọc + Dropdown Panel */}
            <div className="dropdown-wrapper" ref={filterRef}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Filter size={14} color="#7B5233" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
                <button
                  className={`icon-btn-minimal ${showFilterPanel || statusFilter ? 'active' : ''}`}
                  style={{
                    padding: '0 10px 0 30px',
                    height: '36px',
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
            <div className="dropdown-wrapper" ref={sortRef}>
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
                  color: '#7B5233',
                  display: 'flex',
                  alignItems: 'center'
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
                    { label: 'Số ĐT', value: 'phone' },
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

            {/* Chọn số dòng hiển thị */}
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

            {/* Bộ chuyển đổi chế độ xem */}
            <div className="dropdown-wrapper view-mode-selector-wrapper" ref={viewModeRef}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  className={`icon-btn-minimal ${showViewModePanel ? 'active' : ''} view-mode-selector-btn`}
                  style={{
                    width: '185px',
                    padding: '0 30px 0 15px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #EADCC9',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    position: 'relative',
                    textAlign: 'left'
                  }}
                  onClick={() => { setShowViewModePanel(p => !p); setShowFilterPanel(false); setShowSortPanel(false); }}
                >
                  {viewMode === 'account_info' ? 'Thông tin tài khoản' : 'Phân quyền'}
                  <span style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.6rem',
                    color: '#7B5233'
                  }}>▼</span>
                </button>
              </div>
              {showViewModePanel && (
                <div className="dropdown-panel" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, width: '185px' }}>
                  <p className="dropdown-title">Chế độ xem</p>
                  <button
                    className={`dropdown-item ${viewMode === 'account_info' ? 'selected' : ''}`}
                    onClick={() => { setViewMode('account_info'); setShowViewModePanel(false); }}
                  >
                    Thông tin tài khoản
                  </button>
                  <button
                    className={`dropdown-item ${viewMode === 'permissions' ? 'selected' : ''}`}
                    onClick={() => { setViewMode('permissions'); setShowViewModePanel(false); }}
                  >
                    Phân quyền
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Nhóm hành động bên phải */}
          <div className="toolbar-right">
            {/* Nút Tạo mới */}
            {hasWritePermission && (
              <>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate('/admin/users/departments')}
                  style={{
                    height: '36px',
                    padding: '0 15px',
                    whiteSpace: 'nowrap',
                    borderRadius: '8px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid #EADCC9',
                    backgroundColor: '#fff',
                    color: '#7B5233',
                    fontSize: '0.85rem'
                  }}
                >
                  <FolderTree size={16} />
                  <span className="btn-text-desktop">Bộ phận</span>
                  <span className="btn-text-mobile">Bộ phận</span>
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate('/admin/users/positions')}
                  style={{
                    height: '36px',
                    padding: '0 15px',
                    whiteSpace: 'nowrap',
                    borderRadius: '8px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid #EADCC9',
                    backgroundColor: '#fff',
                    color: '#7B5233',
                    fontSize: '0.85rem'
                  }}
                >
                  <Briefcase size={16} />
                  <span className="btn-text-desktop">Chức vụ</span>
                  <span className="btn-text-mobile">Chức vụ</span>
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/admin/users/create')}
                  style={{
                    height: '36px',
                    padding: '0 20px',
                    whiteSpace: 'nowrap',
                    borderRadius: '8px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Plus size={16} />
                  <span className="btn-text-desktop">Tạo mới</span>
                  <span className="btn-text-mobile">Tạo mới</span>
                </button>
              </>
            )}

            {/* Nút Xuất dữ liệu */}
            <button
              className="btn btn-outline"
              style={{
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
              }}
            >
              <FileDown size={16} />
              <span className="btn-text-desktop">Xuất dữ liệu</span>
              <span className="btn-text-mobile">Xuất</span>
            </button>
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
                        <th>Phân loại</th>
                        {viewMode === 'account_info' ? (
                          <>
                            <th>Bộ phận</th>
                            <th>Chức vụ</th>
                            <th>Công đoạn / Quyền hạn</th>
                            <th>Username</th>
                            <th onClick={() => handleSort('phone')} style={{ cursor: 'pointer' }}>
                              Số ĐT <SortIcon column="phone" />
                            </th>
                            <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                              Trạng thái <SortIcon column="status" />
                            </th>
                            {hasWritePermission && <th>Thao tác</th>}
                          </>
                        ) : (
                          <>
                            {SCREEN_GROUPS.map((group) => (
                              <th key={group.title} style={{ width: '225px', minWidth: '200px' }}>
                                {group.title}
                              </th>
                            ))}
                            {hasWritePermission && <th style={{ width: '120px', minWidth: '100px', textAlign: 'center' }}>Thao tác</th>}
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="animate-card-entrance"
                          style={{
                            position: 'relative',
                            zIndex: actionMenuId === user.id ? 30 : 1
                          }}
                        >
                          <td>{user.employee_id}</td>
                          <td className="font-bold">{user.full_name}</td>
                          <td>{user.role_name === 'IT' || user.role_name === 'BGD' ? 'Hành chính' : 'Sản xuất'}</td>
                          {viewMode === 'account_info' ? (
                            <>
                              <td>{user.role_name || '-'}</td>
                              <td>{user.permission_name || '-'}</td>
                              <td>{user.permission_level ? <span style={{ fontWeight: '500', color: '#7B5233' }}>{user.permission_level}</span> : renderStages(user.stage_name)}</td>
                              <td>{user.username}</td>
                              <td>{user.phone || '-'}</td>
                              <td style={getStatusStyle(user.status)}>{user.status}</td>
                              {hasWritePermission && (
                                <td style={{ position: 'relative', zIndex: actionMenuId === user.id ? 40 : 1 }}>
                                  <button
                                    className="action-btn"
                                    onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                                  >•••</button>
                                  {actionMenuId === user.id && (
                                    <div className="action-menu">
                                      <button className="action-menu-item" onClick={() => handleAction('edit', user)}>✏️ Chỉnh sửa</button>
                                      <button className="action-menu-item" onClick={() => handleAction('permissions', user)}>🔑 Phân quyền</button>
                                      <button className="action-menu-item warn" onClick={() => handleAction('suspend', user)}>⏸ Đình chỉ</button>
                                      <button className="action-menu-item danger" onClick={() => handleAction('delete', user)}>🗑 Xóa</button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </>
                          ) : (
                            <>
                              {SCREEN_GROUPS.map((group, groupIdx) => {
                                const userPerms = userPermissions[user.id];
                                if (!userPerms || permsLoading) {
                                  return (
                                    <td key={group.title}>
                                      <select className="matrix-select-dropdown matrix-loading" disabled>
                                        <option>Đang tải...</option>
                                      </select>
                                    </td>
                                  );
                                }
                                const groupVal = getGroupPermissionStateForUser(user.id, group);
                                return (
                                  <td key={group.title}>
                                    <select
                                      value={groupVal}
                                      onChange={(e) => handleGroupPermissionChangeForUser(user, groupIdx, e.target.value)}
                                      className={`matrix-select-dropdown ${getMatrixDropdownClass(groupVal)}`}
                                      disabled={!hasWritePermission}
                                      style={!hasWritePermission ? { cursor: 'not-allowed', opacity: 0.8 } : {}}
                                    >
                                      <option value="none">Không được phép</option>
                                      <option value="read">Truy cập</option>
                                      <option value="write">Điều chỉnh</option>
                                    </select>
                                  </td>
                                );
                              })}
                              {hasWritePermission && (
                                <td style={{ position: 'relative', zIndex: actionMenuId === user.id ? 40 : 1, textAlign: 'center' }}>
                                  <button
                                    className="action-btn"
                                    onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                                  >•••</button>
                                  {actionMenuId === user.id && (
                                    <div className="action-menu">
                                      <button className="action-menu-item" onClick={() => handleAction('edit', user)}>✏️ Chỉnh sửa</button>
                                      <button className="action-menu-item" onClick={() => handleAction('permissions', user)}>🔑 Phân quyền</button>
                                      <button className="action-menu-item warn" onClick={() => handleAction('suspend', user)}>⏸ Đình chỉ</button>
                                      <button className="action-menu-item danger" onClick={() => handleAction('delete', user)}>🗑 Xóa</button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </>
                          )}
                        </tr>
                      ))}
                      {users.length === 0 && !loading && (
                        <tr>
                          <td colSpan={viewMode === 'account_info' ? (hasWritePermission ? 9 : 8) : (hasWritePermission ? 3 + SCREEN_GROUPS.length + 1 : 3 + SCREEN_GROUPS.length)} style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
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
                      {viewMode === 'account_info' ? (
                        <>
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
                            {hasWritePermission && (
                              <div className="mgmt-card-actions">
                                <button
                                  className="action-btn"
                                  onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                                >•••</button>
                                {actionMenuId === user.id && (
                                  <div className="action-menu">
                                    <button className="action-menu-item" onClick={() => handleAction('edit', user)}>✏️ Chỉnh sửa</button>
                                    <button className="action-menu-item" onClick={() => handleAction('permissions', user)}>🔑 Phân quyền</button>
                                    <button className="action-menu-item warn" onClick={() => handleAction('suspend', user)}>⏸ Đình chỉ</button>
                                    <button className="action-menu-item danger" onClick={() => handleAction('delete', user)}>🗑 Xóa</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="mgmt-card-footer">
                            <div className="mgmt-card-footer-left font-semibold">{user.role_name}</div>
                            <span className="status-dot-badge" style={getStatusStyle(user.status)}>
                              <span className="dot" style={{ backgroundColor: getStatusStyle(user.status).color }}></span>
                              {user.status}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #EADCC9', paddingBottom: '8px', position: 'relative' }}>
                            <div>
                              <h4 className="mgmt-card-title" style={{ margin: 0, fontSize: '1rem' }}>{user.full_name}</h4>
                              <span className="mgmt-card-subtitle" style={{ fontSize: '0.8rem', color: '#888' }}>#{user.employee_id} • {user.role_name === 'IT' || user.role_name === 'BGD' ? 'Hành chính' : 'Sản xuất'}</span>
                            </div>
                            {hasWritePermission && (
                              <div className="mgmt-card-actions" style={{ position: 'relative', zIndex: actionMenuId === user.id ? 110 : 2 }}>
                                <button
                                  className="action-btn"
                                  onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                                >•••</button>
                                {actionMenuId === user.id && (
                                  <div className="action-menu" style={{ right: 0, top: '100%' }}>
                                    <button className="action-menu-item" onClick={() => handleAction('edit', user)}>✏️ Chỉnh sửa</button>
                                    <button className="action-menu-item" onClick={() => handleAction('permissions', user)}>🔑 Phân quyền</button>
                                    <button className="action-menu-item warn" onClick={() => handleAction('suspend', user)}>⏸ Đình chỉ</button>
                                    <button className="action-menu-item danger" onClick={() => handleAction('delete', user)}>🗑 Xóa</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {SCREEN_GROUPS.map((group, groupIdx) => {
                              const userPerms = userPermissions[user.id];
                              if (!userPerms || permsLoading) {
                                return (
                                  <div key={group.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>{group.title}</span>
                                    <select className="matrix-select-dropdown matrix-loading" disabled style={{ width: '140px' }}>
                                      <option>Đang tải...</option>
                                    </select>
                                  </div>
                                );
                              }
                              const groupVal = getGroupPermissionStateForUser(user.id, group);
                              return (
                                <div key={group.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>{group.title}</span>
                                  <select
                                    value={groupVal}
                                    onChange={(e) => handleGroupPermissionChangeForUser(user, groupIdx, e.target.value)}
                                    className={`matrix-select-dropdown ${getMatrixDropdownClass(groupVal)}`}
                                    disabled={!hasWritePermission}
                                    style={{
                                      width: '140px',
                                      ...(!hasWritePermission ? { cursor: 'not-allowed', opacity: 0.8 } : {})
                                    }}
                                  >
                                    <option value="none">Không được phép</option>
                                    <option value="read">Truy cập</option>
                                    <option value="write">Điều chỉnh</option>
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
      <style>{`
        .matrix-select-dropdown {
          width: 100%;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          border: 1px solid transparent;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237B5233' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 12px;
          padding-right: 28px;
        }
        .matrix-none {
          background-color: #FEF2F2 !important;
          border-color: #FECACA !important;
          color: #991B1B !important;
        }
        .matrix-read {
          background-color: #EFF6FF !important;
          border-color: #BFDBFE !important;
          color: #1E40AF !important;
        }
        .matrix-write {
          background-color: #ECFDF5 !important;
          border-color: #A7F3D0 !important;
          color: #065F46 !important;
        }
        .matrix-loading {
          background-color: #F3F4F6 !important;
          border-color: #E5E7EB !important;
          color: #6B7280 !important;
          cursor: not-allowed;
        }
        .matrix-select-dropdown option {
          background-color: #fff !important;
          color: #333 !important;
        }
        .view-mode-selector-btn:hover {
          background-color: #F5EFEB !important;
        }
        @media (max-width: 768px) {
          .toolbar-left {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .toolbar-left .search-wrapper {
            width: 100% !important;
            flex: none !important;
            min-width: 100% !important;
          }
          .view-mode-selector-wrapper {
            width: 100% !important;
            flex: none !important;
          }
          .view-mode-selector-wrapper .view-mode-selector-btn {
            width: 100% !important;
            min-width: 100% !important;
          }
          .view-mode-selector-wrapper .dropdown-panel {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default UserManagement;

