import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Check, X, Search, Shield, ChevronDown, Layers, FileDown, ChevronLeft, ChevronRight, FolderTree, Briefcase } from 'lucide-react';
import api from '@webShared/Services/api.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import DepartmentModal from './DepartmentModal';
import '@styles/components.css';

const DepartmentManagement = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setCustomTitle = outletContext?.setCustomTitle;
  const setCustomSubtitle = outletContext?.setCustomSubtitle;
  const setCustomScreenCode = outletContext?.setCustomScreenCode;

  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/users/departments');

  // Cập nhật tiêu đề trang lên Layout Header
  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Kiểm tra quyền ghi
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const loggedInUserIsAdmin = loggedInUser.role_name === 'IT' || loggedInUser.role_name === 'BGD' || loggedInUser.username === 'admin';
  let activePermissions = {};
  try {
    activePermissions = JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
  } catch (e) {
    console.error('Failed to parse screen permissions:', e);
  }
  const hasWritePermission = loggedInUserIsAdmin || activePermissions['users'] !== 'read';

  // State dữ liệu
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [confirmDeleteData, setConfirmDeleteData] = useState(null);
  const [showExtraMenu, setShowExtraMenu] = useState(false);
  const extraMenuRef = useRef(null);

  // States đồng bộ phân trang & bộ lọc
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  // Xuất file Excel đồng bộ
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const ExcelJSImport = await import('exceljs');
      const ExcelJS = ExcelJSImport.default || ExcelJSImport;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Danh sách bộ phận');

      sheet.mergeCells(1, 1, 1, 4);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = 'DANH SÁCH BỘ PHẬN TRONG HỆ THỐNG';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7B5233' } };
      sheet.getRow(1).height = 40;

      const headers = ['ID', 'Tên bộ phận', 'Mô tả', 'Trạng thái'];
      sheet.addRow(headers);
      const headerRow = sheet.getRow(2);
      headerRow.height = 26;
      headerRow.eachCell(cell => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7B5233' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      filteredDepartments.forEach(dept => {
        sheet.addRow([
          dept.id,
          dept.name,
          dept.description || '',
          dept.is_active ? 'Đang sử dụng' : 'Dừng hoạt động'
        ]);
      });

      sheet.columns = [
        { width: 10 },
        { width: 25 },
        { width: 40 },
        { width: 18 }
      ];

      for (let r = 3; r <= filteredDepartments.length + 2; r++) {
        sheet.getRow(r).height = 20;
        for (let c = 1; c <= 4; c++) {
          const cell = sheet.getCell(r, c);
          cell.font = { name: 'Arial', size: 9 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'EADCC9' } },
            bottom: { style: 'thin', color: { argb: 'EADCC9' } },
            left: { style: 'thin', color: { argb: 'EADCC9' } },
            right: { style: 'thin', color: { argb: 'EADCC9' } }
          };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Danh_Sach_Bo_Phan_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi khi xuất excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (extraMenuRef.current && !extraMenuRef.current.contains(e.target)) {
        setShowExtraMenu(false);
      }
      if (!e.target.closest('.action-menu') && !e.target.closest('.action-btn')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedDept, setSelectedDept] = useState(null);

  // Tải danh sách bộ phận (roles)
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Gọi API roles với include_inactive=true để hiển thị đầy đủ
      const rolesData = await api.get('/roles/?include_inactive=true');
      setDepartments(rolesData);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu bộ phận:', err);
      setError('Không thể kết nối tới máy chủ. Vui lòng tải lại trang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lọc và Tìm kiếm cục bộ
  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = (dept.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && dept.is_active) ||
      (statusFilter === 'inactive' && !dept.is_active);
    return matchesSearch && matchesStatus;
  });

  const paginatedDepartments = filteredDepartments.slice((page - 1) * pageSize, page * pageSize);

  // Mở Modal
  const openCreateModal = () => {
    setSelectedDept(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setSelectedDept(dept);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Dừng hoạt động (Soft delete)
  const handleDelete = (dept) => {
    setConfirmDeleteData(dept);
  };

  return (
    <div className="mgmt-container">
      <div className="mgmt-main">
        {/* ── Thanh công cụ (Toolbar) ── */}
        <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
          searchPlaceholder="Tìm kiếm bộ phận..."
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={statusFilter !== 'all' ? 1 : 0}
          extraActions={[
            {
              label: 'Tài khoản',
              icon: <FolderTree size={14} />, // FolderTree or similar as placeholder
              onClick: () => navigate('/admin/users')
            },
          ]}
          onExport={handleExportExcel}
          isExporting={isExporting}
          onCreate={hasWritePermission ? openCreateModal : undefined}
          createLabel="Tạo bộ phận mới"
          hasWritePermission={hasWritePermission}
        />

        {/* INLINE EXPANDABLE FILTER BAR */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar">
            {/* Lọc Trạng thái */}
            <div className="filter-field-group">
              <label className="filter-field-label">Trạng thái hoạt động</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang sử dụng</option>
                <option value="inactive">Dừng hoạt động</option>
              </select>
            </div>

            {/* Hiển thị số dòng */}
            <div className="filter-field-group">
              <label className="filter-field-label">Hiển thị số dòng</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 20px', backgroundColor: '#FEE2E2', borderLeft: '4px solid #EF4444', color: '#B91C1C', borderRadius: '8px', marginBottom: '20px', fontWeight: '500', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <div className="admin-list-layout">
          <div className="mgmt-table card admin-table-card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#7B5233', fontWeight: '600' }}>Đang tải dữ liệu...</div>
            ) : filteredDepartments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Không tìm thấy bộ phận nào phù hợp.</div>
            ) : (
              <div className="table-responsive desktop-only admin-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên bộ phận</th>
                      <th>Mô tả</th>
                      <th>Chức vụ trực thuộc</th>
                      <th style={{ textAlign: 'center' }}>Trạng thái</th>
                      {hasWritePermission && <th style={{ textAlign: 'center' }}>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDepartments.map((dept) => (
                      <tr key={dept.id}>
                        <td style={{ fontWeight: '600', color: '#888' }}>#{dept.id}</td>
                        <td style={{ fontWeight: '700', color: '#2D1A12' }}>{dept.name}</td>
                        <td>{dept.description || '-'}</td>
                        <td>
                          {dept.permissions && dept.permissions.length > 0 ? dept.permissions.map(p => (
                            <span key={p.id} className="badge bg-beige-light text-beige-dark" style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', border: '1px solid #EADCC9', marginRight: '4px' }}>{p.name}</span>
                          )) : '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`status-badge ${dept.is_active ? 'active' : 'inactive'}`}>
                            {dept.is_active ? 'Đang sử dụng' : 'Dừng hoạt động'}
                          </span>
                        </td>
                        {hasWritePermission && (
                          <td style={{ textAlign: 'center', position: 'relative' }}>
                            {(() => {
                              const isLastRows = filteredDepartments.indexOf(dept) >= filteredDepartments.length - 2;
                              return (
                                <>
                                  <button
                                    type="button"
                                    className="action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionMenuId(actionMenuId === dept.id ? null : dept.id);
                                    }}
                                  ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg></button>
                                  {actionMenuId === dept.id && (
                                    <div className="action-menu" style={{
                                      right: '50%',
                                      transform: 'translateX(50%)',
                                      top: isLastRows ? 'auto' : '80%',
                                      bottom: isLastRows ? '80%' : 'auto',
                                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                      zIndex: 1000
                                    }}>
                                      <button
                                        type="button"
                                        className="action-menu-item"
                                        onClick={() => {
                                          setActionMenuId(null);
                                          openEditModal(dept);
                                        }}
                                      >
                                        Chỉnh sửa
                                      </button>
                                      {dept.is_active && (
                                        <button
                                          type="button"
                                          className="action-menu-item danger"
                                          onClick={() => {
                                            setActionMenuId(null);
                                            handleDelete(dept);
                                          }}
                                        >
                                          Dừng hoạt động
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Thanh phân trang đồng bộ */}
            <div className="admin-pagination-desktop desktop-only">
              <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                Hiển thị <b>{paginatedDepartments.length}</b> trên <b>{filteredDepartments.length}</b> bộ phận
              </div>
              {(() => {
                const totalPages = Math.ceil(filteredDepartments.length / pageSize);
                return totalPages > 1 ? (
                  <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button
                      className="page-btn"
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`page-btn ${page === p ? 'active' : ''}`}
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
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* ── Modal Thêm/Sửa Bộ phận ── */}
        <DepartmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          modalMode={modalMode}
          selectedDepartment={selectedDept}
          onConfirm={async (data) => {
            setError(null);
            try {
              if (modalMode === 'create') {
                await api.post('/roles/', data);
              } else {
                await api.put(`/roles/${selectedDept.id}`, data);
              }
              setIsModalOpen(false);
              fetchData();
            } catch (err) {
              console.error('Lỗi khi lưu bộ phận:', err);
              setError(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu thông tin.');
            }
          }}
        />

        {confirmDeleteData && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '420px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #FAF0E6', backgroundColor: '#FAF6F0' }}>
                <h4 style={{ margin: 0, color: '#7B5233', fontSize: '1.05rem', fontWeight: '800' }}>Xác nhận dừng hoạt động</h4>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteData(null)}
                  style={{ border: 'none', background: 'none', color: '#8C7B72', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#5D4037', fontWeight: '600', lineHeight: '1.4' }}>
                    Bạn có chắc chắn muốn dừng hoạt động bộ phận <strong>"{confirmDeleteData.name}"</strong> không?
                  </div>
                </div>
              </div>
              <div style={{ padding: '14px 20px', borderTop: '1px solid #FAF0E6', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#FAF6F0' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setConfirmDeleteData(null)}
                  style={{ height: '36px', padding: '0 15px', borderRadius: '8px', fontSize: '0.85rem' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ height: '36px', padding: '0 15px', borderRadius: '8px', fontSize: '0.85rem', backgroundColor: '#DC2626', borderColor: '#DC2626' }}
                  onClick={async () => {
                    const dept = confirmDeleteData;
                    setConfirmDeleteData(null);
                    setError(null);
                    try {
                      await api.delete(`/roles/${dept.id}`);
                      fetchData();
                    } catch (err) {
                      console.error('Lỗi khi dừng sử dụng bộ phận:', err);
                      setError(err.response?.data?.detail || 'Không thể thay đổi trạng thái hoạt động.');
                    }
                  }}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentManagement;
