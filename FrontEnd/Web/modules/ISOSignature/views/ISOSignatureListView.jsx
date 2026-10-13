import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  Eye,
  ShieldCheck,
  PenTool,
  CheckCircle2,
  MoreVertical,
  CheckSquare,
  Square
} from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import '@webShared/Views/components/layout/PageToolbar.css';
import '@styles/components.css';

import isoSignatureService from '../services/isoSignature.service';
import SignatureStatsCards from '../components/SignatureStatsCards';
import SignatureModal from '../components/SignatureModal';
import SignatureDetailModal from '../components/SignatureDetailModal';
import SignaturePagination from '../components/SignaturePagination';
import { DEPARTMENTS } from '../utils/signatureUtils';
import '../styles/isoSignature.css';

export const ISOSignatureListView = () => {
  const outletContext = useOutletContext() || {};
  const setCustomTitle = outletContext.setCustomTitle || (() => {});
  const setCustomSubtitle = outletContext.setCustomSubtitle || (() => {});
  const setCustomScreenCode = outletContext.setCustomScreenCode || (() => {});

  const { toast } = useToast();

  // Dữ liệu chính
  const [signatures, setSignatures] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    handwritten_image_count: 0,
    handwritten_draw_count: 0,
    digital_count: 0,
    active_count: 0,
    inactive_count: 0
  });
  const [loading, setLoading] = useState(false);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'handwritten' | 'digital'
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOption, setSortOption] = useState('name-asc');
  const [activeKpiKey, setActiveKpiKey] = useState('all');

  // Lựa chọn dòng (Checkbox)
  const [selectedIds, setSelectedIds] = useState([]);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [editModal, setEditModal] = useState({
    show: false,
    mode: 'create', // 'create' | 'edit'
    item: null,
    loading: false
  });

  const [detailModal, setDetailModal] = useState({
    show: false,
    item: null
  });

  const [actionMenuId, setActionMenuId] = useState(null);

  // Đóng dropdown 3 chấm khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.sig-action-dropdown-wrapper')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Thiết lập tiêu đề màn hình
  useEffect(() => {
    setCustomTitle('Quản lý Chữ ký');
    setCustomSubtitle('Quản lý chữ ký tay và chứng thư số điện tử phục vụ phê duyệt chuẩn ISO');
    setCustomScreenCode('ISO-SIGNATURES');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Tải thống kê
  const fetchStats = useCallback(async () => {
    try {
      const res = await isoSignatureService.getStats();
      if (res) setStats(res);
    } catch (err) {
      console.error('Lỗi khi tải thống kê chữ ký:', err);
    }
  }, []);

  // Tải danh sách chữ ký
  const fetchSignatures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await isoSignatureService.getSignatures({
        keyword: searchTerm.trim() || undefined,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        is_active: statusFilter !== 'all' ? statusFilter : undefined
      });
      setSignatures(Array.isArray(res) ? res : []);
      setSelectedIds([]);
    } catch (err) {
      console.error('Lỗi tải danh sách chữ ký:', err);
      toast('error', 'Không thể tải danh sách chữ ký!');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, departmentFilter, statusFilter, toast]);

  useEffect(() => {
    fetchStats();
    fetchSignatures();
  }, [fetchStats, fetchSignatures]);

  // Xử lý click thẻ KPI để lọc nhanh
  const handleKpiCardClick = (card) => {
    if (card.key === activeKpiKey && card.key !== 'all') {
      setActiveKpiKey('all');
      setCategoryFilter('all');
      setStatusFilter('all');
    } else {
      setActiveKpiKey(card.key);
      if (card.type === 'all') {
        setCategoryFilter('all');
        setStatusFilter('all');
      } else if (card.type === 'signature_category') {
        setCategoryFilter(card.filterValue);
        setStatusFilter('all');
      } else if (card.type === 'is_active') {
        setStatusFilter(card.filterValue);
        setCategoryFilter('all');
      }
    }
    setCurrentPage(1);
  };

  // Lọc và sắp xếp phía Client
  const filteredSignatures = useMemo(() => {
    let result = [...signatures];

    // Lọc theo từ khóa tìm kiếm
    if (searchTerm.trim()) {
      const kw = searchTerm.trim().toLowerCase();
      result = result.filter(
        (item) =>
          (item.full_name || '').toLowerCase().includes(kw) ||
          (item.user_code || '').toLowerCase().includes(kw) ||
          (item.position || '').toLowerCase().includes(kw) ||
          (item.department || '').toLowerCase().includes(kw) ||
          (item.digital_cert_provider || '').toLowerCase().includes(kw)
      );
    }

    // Lọc theo nhóm chữ ký: 'handwritten' | 'digital'
    if (categoryFilter === 'handwritten') {
      result = result.filter((i) => Boolean(i.signature_data || i.image_path));
    } else if (categoryFilter === 'digital') {
      result = result.filter((i) => Boolean(i.digital_cert_provider || i.digital_serial_no));
    }

    // Lọc phòng ban
    if (departmentFilter !== 'all') {
      result = result.filter((item) => item.department === departmentFilter);
    }

    // Lọc trạng thái
    if (statusFilter !== 'all') {
      const wantActive = statusFilter === 'active';
      result = result.filter((item) => item.is_active === wantActive);
    }

    // Sắp xếp
    result.sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return (a.full_name || '').localeCompare(b.full_name || '', 'vi');
        case 'name-desc':
          return (b.full_name || '').localeCompare(a.full_name || '', 'vi');
        case 'code-asc':
          return (a.user_code || '').localeCompare(b.user_code || '', 'vi');
        case 'code-desc':
          return (b.user_code || '').localeCompare(a.user_code || '', 'vi');
        case 'time-desc':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'time-asc':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [signatures, searchTerm, categoryFilter, departmentFilter, statusFilter, sortOption]);

  // Phân trang
  const totalItems = filteredSignatures.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedSignatures = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSignatures.slice(start, start + pageSize);
  }, [filteredSignatures, currentPage, pageSize]);

  // Đếm số lượng bộ lọc đang kích hoạt
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'all') count++;
    if (departmentFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    return count;
  }, [categoryFilter, departmentFilter, statusFilter]);

  // Reset tất cả bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setActiveKpiKey('all');
    setCurrentPage(1);
    toast('info', 'Đã đặt lại các bộ lọc về mặc định');
  };

  // Chọn dòng Checkbox
  const isAllPageSelected =
    paginatedSignatures.length > 0 &&
    paginatedSignatures.every((i) => selectedIds.includes(i.id));

  const handleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = paginatedSignatures.map((i) => i.id);
      setSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedSignatures.map((i) => i.id);
      const newSelected = Array.from(new Set([...selectedIds, ...pageIds]));
      setSelectedIds(newSelected);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Mở modal Thêm mới
  const handleOpenCreateModal = () => {
    setEditModal({
      show: true,
      mode: 'create',
      item: null,
      loading: false
    });
  };

  // Mở modal Chỉnh sửa
  const handleOpenEditModal = (item) => {
    setEditModal({
      show: true,
      mode: 'edit',
      item,
      loading: false
    });
  };

  // Lưu tạo mới hoặc cập nhật chữ ký
  const handleSaveSignature = async (payload) => {
    setEditModal((prev) => ({ ...prev, loading: true }));
    try {
      if (editModal.mode === 'create') {
        await isoSignatureService.createSignature(payload);
        toast('success', 'Thêm mới chữ ký thành công!');
      } else {
        await isoSignatureService.updateSignature(editModal.item.id, payload);
        toast('success', 'Cập nhật chữ ký thành công!');
      }
      setEditModal({ show: false, mode: 'create', item: null, loading: false });
      fetchStats();
      fetchSignatures();
    } catch (err) {
      console.error('Lỗi khi lưu chữ ký:', err);
      toast('error', err.response?.data?.detail || 'Không thể lưu chữ ký!');
      setEditModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Bật/tắt trạng thái (Active / Inactive)
  const handleToggleStatus = async (id, targetStatus) => {
    try {
      await isoSignatureService.toggleStatus(id, targetStatus);
      toast(
        'success',
        targetStatus ? 'Đã kích hoạt sử dụng chữ ký!' : 'Đã tạm khóa chữ ký!'
      );
      if (detailModal.show && detailModal.item?.id === id) {
        setDetailModal((prev) => ({
          ...prev,
          item: { ...prev.item, is_active: targetStatus }
        }));
      }
      fetchStats();
      fetchSignatures();
    } catch (err) {
      toast('error', 'Có lỗi khi cập nhật trạng thái chữ ký!');
    }
  };

  // Chuyển đổi loại chữ ký sử dụng: Tay <-> Điện tử
  const handleToggleUsageType = async (item) => {
    const isDigital = item.signature_type === 'DIGITAL';
    const newType = isDigital ? 'HANDWRITTEN_IMAGE' : 'DIGITAL';
    const label = isDigital ? 'Chữ ký tay' : 'Chữ ký điện tử (CA)';
    try {
      await isoSignatureService.updateSignature(item.id, { signature_type: newType });
      toast('success', `Đã chuyển loại chữ ký của '${item.full_name}' sang ${label}!`);
      fetchSignatures();
      fetchStats();
    } catch (err) {
      console.error('Lỗi khi đổi loại chữ ký:', err);
      toast('error', err.response?.data?.detail || `Lỗi chuyển loại chữ ký: ${err.message}`);
    }
  };

  // Xóa chữ ký
  const handleDeleteSignature = async (item) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chữ ký của "${item.full_name}"?`)) return;

    try {
      await isoSignatureService.deleteSignature(item.id);
      toast('success', 'Đã xóa chữ ký thành công!');
      if (detailModal.show && detailModal.item?.id === item.id) {
        setDetailModal({ show: false, item: null });
      }
      fetchStats();
      fetchSignatures();
    } catch (err) {
      toast('error', 'Không thể xóa chữ ký!');
    }
  };

  // Thao tác hàng loạt
  const handleBatchToggleStatus = async (targetActive) => {
    if (selectedIds.length === 0) return;
    const actionText = targetActive ? 'kích hoạt' : 'tạm khóa';
    if (!window.confirm(`Bạn có chắc muốn ${actionText} ${selectedIds.length} chữ ký đã chọn?`)) return;

    try {
      for (const id of selectedIds) {
        const item = signatures.find((x) => x.id === id);
        if (item && item.is_active !== targetActive) {
          await isoSignatureService.toggleStatus(id, targetActive);
        }
      }
      toast('success', `Đã ${actionText} thành công các chữ ký đã chọn!`);
      setSelectedIds([]);
      fetchStats();
      fetchSignatures();
    } catch (err) {
      toast('error', 'Có lỗi khi xử lý thao tác hàng loạt!');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} chữ ký đã chọn?`)) return;

    try {
      for (const id of selectedIds) {
        await isoSignatureService.deleteSignature(id);
      }
      toast('success', `Đã xóa thành công ${selectedIds.length} chữ ký!`);
      setSelectedIds([]);
      fetchStats();
      fetchSignatures();
    } catch (err) {
      toast('error', 'Có lỗi khi xóa chữ ký hàng loạt!');
    }
  };

  return (
    <div className="sig-container">
      {/* 1. KHỐI THẺ KPI STATS (NẰM TRÊN CÙNG) */}
      <SignatureStatsCards
        stats={stats}
        activeFilter={activeKpiKey}
        onSelectFilter={handleKpiCardClick}
      />

      {/* 2. THANH CÔNG CỤ TOOLBAR (ĐẶT DƯỚI CÁC THẺ KPI) */}
      <PageToolbar
        searchValue={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm kiếm theo họ tên, mã nhân viên, chức vụ, phòng ban..."
        showSort={true}
        sortOptions={[
          { value: 'name-asc', label: 'Họ tên: A → Z' },
          { value: 'name-desc', label: 'Họ tên: Z → A' },
          { value: 'code-asc', label: 'Mã nhân viên: A → Z' },
          { value: 'code-desc', label: 'Mã nhân viên: Z → A' },
          { value: 'time-desc', label: 'Mới tạo nhất' },
          { value: 'time-asc', label: 'Cũ nhất' }
        ]}
        sortValue={sortOption}
        onSortChange={(val) => setSortOption(val)}
        showFilter={true}
        isFilterOpen={isFilterOpen}
        onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
        onCreate={handleOpenCreateModal}
        createLabel="Thêm chữ ký mới"
      />

      {/* 3. THANH BỘ LỌC CHI TIẾT KHI MỞ TOGGLE */}
      {isFilterOpen && (
        <div className="sig-filter-panel">
          <div className="sig-filter-row">
            {/* Phân loại mẫu chữ ký */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8D6E63' }}>MẪU CHỮ KÝ</span>
              <select
                className="iso-filter-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setActiveKpiKey(e.target.value === 'all' ? 'all' : `type_${e.target.value}`);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả mẫu</option>
                <option value="handwritten">Có chữ ký tay</option>
                <option value="digital">Có chữ ký điện tử / CA</option>
              </select>
            </div>

            {/* Phòng ban */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8D6E63' }}>PHÒNG BAN</span>
              <select
                className="iso-filter-select"
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả phòng ban</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            {/* Trạng thái hoạt động */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8D6E63' }}>TRẠNG THÁI</span>
              <select
                className="iso-filter-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setActiveKpiKey(e.target.value === 'all' ? 'all' : `status_${e.target.value}`);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm khóa</option>
              </select>
            </div>

            {/* Nút đặt lại */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                className="iso-btn iso-btn-outline"
                onClick={handleResetFilters}
                style={{ alignSelf: 'flex-end', fontSize: '0.75rem', padding: '6px 12px', background: '#FFFFFF' }}
              >
                Đặt lại ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. THANH THAO TÁC HÀNG LOẠT (NẾU CÓ DÒNG ĐƯỢC CHỌN) */}
      {selectedIds.length > 0 && (
        <div className="sig-batch-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400E' }}>
            Đang chọn {selectedIds.length} nhân sự
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="iso-btn iso-btn-outline"
              onClick={() => handleBatchToggleStatus(true)}
              style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#166534', borderColor: '#BBF7D0', background: '#FFFFFF' }}
            >
              <Unlock size={13} style={{ marginRight: '4px' }} />
              Kích hoạt
            </button>
            <button
              type="button"
              className="iso-btn iso-btn-outline"
              onClick={() => handleBatchToggleStatus(false)}
              style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#B45309', borderColor: '#FDE68A', background: '#FFFFFF' }}
            >
              <Lock size={13} style={{ marginRight: '4px' }} />
              Tạm khóa
            </button>
            <button
              type="button"
              className="iso-btn iso-btn-outline"
              onClick={handleBatchDelete}
              style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#DC2626', borderColor: '#FECACA', background: '#FFFFFF' }}
            >
              <Trash2 size={13} style={{ marginRight: '4px' }} />
              Xóa đã chọn
            </button>
          </div>
        </div>
      )}

      {/* 5. BẢNG DANH SÁCH CHỮ KÝ - 9 CỘT TINH GỌN CHUẨN ERP */}
      <div className="sig-table-wrapper" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #EADCC9', overflow: 'hidden' }}>
        <div className="sig-table-scroll" style={{ flex: '1 1 auto', overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
          <table className="sig-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', margin: 0 }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9' }}>
                <th style={{ width: '38px', textAlign: 'center', padding: '8px 4px' }}>
                  <button
                    type="button"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                    onClick={handleSelectAllPage}
                  >
                    {isAllPageSelected ? (
                      <CheckSquare size={16} color="#7B5233" />
                    ) : (
                      <Square size={16} color="#94A3B8" />
                    )}
                  </button>
                </th>
                <th style={{ width: '50px', textAlign: 'center', padding: '8px 6px', fontSize: '0.72rem', fontWeight: 700, color: '#7B5233' }}>STT</th>
                <th style={{ padding: '8px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', minWidth: '140px' }}>NHÂN SỰ</th>
                <th style={{ padding: '8px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', minWidth: '110px' }}>MÃ NHÂN VIÊN</th>
                <th style={{ padding: '8px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', minWidth: '95px' }}>PHÒNG BAN</th>
                <th style={{ padding: '8px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', minWidth: '140px' }}>CHỨC VỤ</th>
                <th style={{ padding: '8px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', minWidth: '170px' }}>BẢN MẪU CHỮ KÝ</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', minWidth: '135px' }}>LOẠI SỬ DỤNG</th>
                <th style={{ textAlign: 'center', padding: '8px 8px', fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', minWidth: '105px' }}>TRẠNG THÁI</th>
                <th style={{ width: '50px', textAlign: 'center', padding: '8px 4px', fontSize: '0.72rem', fontWeight: 700, color: '#7B5233' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#7B5233', fontWeight: 600 }}>
                      <RefreshCw size={18} className="spin-animation" />
                      <span>Đang tải danh sách chữ ký ISO...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedSignatures.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#94A3B8' }}>
                      <PenTool size={36} color="#CBD5E1" />
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#64748B' }}>
                        Không tìm thấy chữ ký nào phù hợp
                      </div>
                      <div style={{ fontSize: '0.78rem' }}>
                        Thử điều chỉnh lại bộ lọc hoặc bấm "Thêm chữ ký mới" ở thanh công cụ.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSignatures.map((item, index) => {
                  const isSelected = selectedIds.includes(item.id);
                  const hasHandwritten = Boolean(item.signature_data || item.image_path);
                  const hasDigital = Boolean(item.digital_cert_provider || item.digital_serial_no);

                  return (
                    <tr key={item.id} className={isSelected ? 'selected' : ''} style={{ borderBottom: '1px solid #F3EDE4' }}>
                      {/* 1. Checkbox */}
                      <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                        <button
                          type="button"
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                          onClick={() => handleSelectRow(item.id)}
                        >
                          {isSelected ? (
                            <CheckSquare size={16} color="#7B5233" />
                          ) : (
                            <Square size={16} color="#CBD5E1" />
                          )}
                        </button>
                      </td>

                      {/* 2. STT */}
                      <td style={{ textAlign: 'center', color: '#8D6E63', fontWeight: 600, fontSize: '0.8rem' }}>
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>

                      {/* 3. Nhân sự (Chỉ để tên, không emoji, không mã) */}
                      <td style={{ padding: '6px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.85rem' }}>
                          {item.full_name}
                        </div>
                      </td>

                      {/* 4. Mã nhân viên (Tách cột riêng) */}
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4B5563' }}>
                          {item.user_code || '---'}
                        </span>
                      </td>

                      {/* 5. Phòng ban */}
                      <td style={{ padding: '6px 10px' }}>
                        <span className="iso-dept-badge">{item.department || '---'}</span>
                      </td>

                      {/* 6. Chức vụ */}
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{ fontSize: '0.82rem', color: '#374151' }}>
                          {item.position || '---'}
                        </span>
                      </td>

                      {/* 7. Bản mẫu chữ ký (2 cái: 1 là Tay, 2 là Điện tử) */}
                      <td style={{ padding: '6px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {/* 1. Chữ ký tay */}
                          {hasHandwritten ? (
                            <div
                              className="sig-thumb-preview"
                              onClick={() => setDetailModal({ show: true, item })}
                              title="Xem mẫu chữ ký tay"
                              style={{ width: '64px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <img
                                src={item.signature_data || item.image_path}
                                alt="Chữ ký tay"
                                className="sig-thumb-img"
                              />
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>Tay: Chưa có</span>
                          )}

                          {/* 2. Chữ ký điện tử */}
                          {hasDigital ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: '#7B5233',
                                backgroundColor: '#FAF6F0',
                                border: '1px solid #EADCC9',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              onClick={() => setDetailModal({ show: true, item })}
                              title={`Chứng thư số ${item.digital_cert_provider}`}
                            >
                              <ShieldCheck size={12} color="#7B5233" />
                              {item.digital_cert_provider?.split(' ')[0] || 'CA'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>ĐT: Chưa có</span>
                          )}
                        </div>
                      </td>

                      {/* 8. Loại chữ ký sử dụng: Tay hay ĐT */}
                      <td style={{ textAlign: 'center', padding: '6px 10px' }}>
                        {item.signature_type === 'DIGITAL' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleUsageType(item)}
                            title="Đang dùng Chữ ký điện tử (CA). Bấm để chuyển sang Chữ ký tay"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FDE68A',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <ShieldCheck size={12} color="#B45309" />
                            Chữ ký điện tử
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleUsageType(item)}
                            title="Đang dùng Chữ ký tay. Bấm để chuyển sang Chữ ký điện tử"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              backgroundColor: '#F8F4EE',
                              color: '#7B5233',
                              border: '1px solid #EADCC9',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <PenTool size={12} color="#7B5233" />
                            Chữ ký tay
                          </button>
                        )}
                      </td>

                      {/* 9. Trạng thái */}
                      <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: item.is_active ? '#DCFCE7' : '#FEE2E2',
                            color: item.is_active ? '#166534' : '#991B1B',
                            border: `1px solid ${item.is_active ? '#BBF7D0' : '#FECACA'}`
                          }}
                        >
                          {item.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>

                      {/* 9. Thao tác - Nút 3 chấm không có khung background (như bên Hồ sơ ký duyệt) */}
                      <td style={{ textAlign: 'center', padding: '4px' }}>
                        <div className="sig-action-dropdown-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuId(actionMenuId === item.id ? null : item.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '6px',
                              margin: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#8D6E63',
                              borderRadius: '4px'
                            }}
                            title="Tùy chọn thao tác"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {actionMenuId === item.id && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: index >= paginatedSignatures.length - 2 && paginatedSignatures.length > 2 ? 'auto' : '100%',
                                bottom: index >= paginatedSignatures.length - 2 && paginatedSignatures.length > 2 ? '100%' : 'auto',
                                zIndex: 1000,
                                background: '#FFFFFF',
                                border: '1px solid #EADCC9',
                                borderRadius: '8px',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                padding: '4px 0',
                                minWidth: '150px',
                                display: 'flex',
                                flexDirection: 'column',
                                textAlign: 'left'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                style={{
                                  padding: '7px 12px',
                                  fontSize: '0.8rem',
                                  border: 'none',
                                  background: 'transparent',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#2D1A12'
                                }}
                                onClick={() => {
                                  setActionMenuId(null);
                                  setDetailModal({ show: true, item });
                                }}
                              >
                                <Eye size={14} color="#7B5233" />
                                Xem chi tiết
                              </button>

                              <button
                                type="button"
                                style={{
                                  padding: '7px 12px',
                                  fontSize: '0.8rem',
                                  border: 'none',
                                  background: 'transparent',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#2D1A12'
                                }}
                                onClick={() => {
                                  setActionMenuId(null);
                                  handleOpenEditModal(item);
                                }}
                              >
                                <Edit3 size={14} color="#2563EB" />
                                Chỉnh sửa
                              </button>

                              <button
                                type="button"
                                style={{
                                  padding: '7px 12px',
                                  fontSize: '0.8rem',
                                  border: 'none',
                                  background: 'transparent',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: item.is_active ? '#B45309' : '#166534'
                                }}
                                onClick={() => {
                                  setActionMenuId(null);
                                  handleToggleStatus(item.id, !item.is_active);
                                }}
                              >
                                {item.is_active ? (
                                  <>
                                    <Lock size={14} color="#B45309" /> Tạm khóa
                                  </>
                                ) : (
                                  <>
                                    <Unlock size={14} color="#166534" /> Kích hoạt
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                style={{
                                  padding: '7px 12px',
                                  fontSize: '0.8rem',
                                  border: 'none',
                                  background: 'transparent',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#7B5233'
                                }}
                                onClick={() => {
                                  setActionMenuId(null);
                                  handleToggleUsageType(item);
                                }}
                              >
                                {item.signature_type === 'DIGITAL' ? (
                                  <>
                                    <PenTool size={14} color="#7B5233" /> Đổi sang Chữ ký tay
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck size={14} color="#B45309" /> Đổi sang Chữ ký điện tử
                                  </>
                                )}
                              </button>

                              <div style={{ height: '1px', background: '#F3EDE4', margin: '4px 0' }} />

                              <button
                                type="button"
                                style={{
                                  padding: '7px 12px',
                                  fontSize: '0.8rem',
                                  border: 'none',
                                  background: 'transparent',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#DC2626'
                                }}
                                onClick={() => {
                                  setActionMenuId(null);
                                  handleDeleteSignature(item);
                                }}
                              >
                                <Trash2 size={14} color="#DC2626" />
                                Xóa chữ ký
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. PHÂN TRANG */}
        <div style={{ padding: '8px 14px', borderTop: '1px solid #EADCC9', background: '#FAF6F0' }}>
          <SignaturePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* MODAL THÊM MỚI / CHỈNH SỬA */}
      <SignatureModal
        show={editModal.show}
        mode={editModal.mode}
        initialData={editModal.item}
        loading={editModal.loading}
        onClose={() => setEditModal({ show: false, mode: 'create', item: null, loading: false })}
        onSubmit={handleSaveSignature}
      />

      {/* MODAL XEM CHI TIẾT */}
      <SignatureDetailModal
        show={detailModal.show}
        signature={detailModal.item}
        onClose={() => setDetailModal({ show: false, item: null })}
        onEdit={(item) => handleOpenEditModal(item)}
        onToggleStatus={(id, status) => handleToggleStatus(id, status)}
        onDelete={(item) => handleDeleteSignature(item)}
      />
    </div>
  );
};

export default ISOSignatureListView;
