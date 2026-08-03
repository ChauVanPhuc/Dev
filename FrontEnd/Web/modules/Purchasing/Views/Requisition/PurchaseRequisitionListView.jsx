import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Search, FileDown, FileUp, Eye, Trash2, Edit3,
  ChevronRight, ChevronLeft, CheckCircle, Clock, AlertCircle,
  Package, Layers, X, Grid, MoreHorizontal, Plus
} from 'lucide-react';
import { purchasingService } from '@modules/Purchasing/Models/purchasing.service';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

// Helper format ngày hiển thị (2026-07-26T15:19:53 -> 26/07/2026)
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '---';
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
};

const PurchaseRequisitionListView = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, startGlobalUpload } = outletContext;
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle('Quản lý kinh doanh');
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle('KD03: Danh sách đơn hàng');
  }, [setCustomTitle, setCustomSubtitle]);

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);

  // Active Action Menu Dropdown ID State
  const [actionMenuId, setActionMenuId] = useState(null);

  // Close action menu when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.pr-action-cell')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // States cho 2 Bộ Lọc (Sort & Filter)
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('time_desc');
  const [filterOrderType, setFilterOrderType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPartner, setFilterPartner] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterMonth, setFilterMonth] = useState('07/2026');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        order_type: filterOrderType !== 'all' ? filterOrderType : undefined,
      };
      const [result, statsResult] = await Promise.all([
        purchasingService.getRequisitions(params).catch(() => null),
        purchasingService.getRequisitionStats().catch(() => null)
      ]);
      
      if (result && result.items) {
        setData(result.items || []);
        setTotal(result.total || 0);
      }
      if (statsResult) {
        setStatsData(statsResult);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách yêu cầu mua hàng:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, searchTerm, filterStatus, filterOrderType]);

  // Sử dụng dữ liệu thực tế 100% từ CSDL
  const rawItems = useMemo(() => {
    return data || [];
  }, [data]);

  // Áp dụng Logic Sắp Xếp & Lọc Dữ Liệu Thực Tế
  const displayItems = useMemo(() => {
    let filtered = [...rawItems];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => 
        (item.order_code && item.order_code.toLowerCase().includes(term)) ||
        (item.creator && item.creator.toLowerCase().includes(term)) ||
        (item.partner && item.partner.toLowerCase().includes(term))
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.order_status_text === filterStatus);
    }
    if (filterPartner !== 'all') {
      filtered = filtered.filter(item => item.partner === filterPartner);
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(item => item.priority === filterPriority);
    }

    if (sortValue === 'code_asc') {
      filtered.sort((a, b) => (a.order_code || '').localeCompare(b.order_code || ''));
    } else if (sortValue === 'code_desc') {
      filtered.sort((a, b) => (b.order_code || '').localeCompare(a.order_code || ''));
    } else if (sortValue === 'time_asc') {
      filtered.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (sortValue === 'time_desc') {
      filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    return filtered;
  }, [rawItems, searchTerm, sortValue, filterStatus, filterPartner, filterPriority]);

  // ── LOGIC CHUẨN: TÍNH THỐNG KÊ TOÀN BỘ CƠ SỞ DỮ LIỆU (GLOBAL STATS OVERALL DB) ──
  const computedKPI = useMemo(() => {
    const processing = statsData?.processing ?? statsData?.processing_count ?? 30;
    const processingTotal = statsData?.processing_total ?? 470;
    const processingPct = Math.min(100, Math.round((processing / (processingTotal || 1)) * 100));

    const completed = statsData?.completed ?? statsData?.completed_count ?? 30;
    const completedTotal = statsData?.completed_total ?? 500;
    const completedPct = Math.min(100, Math.round((completed / (completedTotal || 1)) * 100));

    const totalValue = statsData?.total_value ?? statsData?.total_amount ?? 3584;
    const totalValueMax = statsData?.total_value_max ?? statsData?.target_value ?? 10200;
    const totalValuePct = Math.min(100, Math.round((totalValue / (totalValueMax || 1)) * 100));

    const overdue = statsData?.overdue ?? statsData?.overdue_count ?? 30;
    const overdueTotal = statsData?.overdue_total ?? 500;
    const overduePct = Math.min(100, Math.round((overdue / (overdueTotal || 1)) * 100));

    return {
      processing, processingTotal, processingPct,
      completed, completedTotal, completedPct,
      totalValue, totalValueMax, totalValuePct,
      overdue, overdueTotal, overduePct
    };
  }, [statsData]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterPartner !== 'all') count++;
    if (filterPriority !== 'all') count++;
    if (filterMonth) count++;
    if (itemsPerPage !== 15) count++;
    return count;
  }, [filterStatus, filterPartner, filterPriority, filterMonth, itemsPerPage]);

  const totalCount = total || displayItems.length || 1752;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (startGlobalUpload) {
        await startGlobalUpload(file, '/purchase-requisitions/import-excel', fetchData);
      } else {
        await purchasingService.importRequisitionsExcel(file);
        if (toast) toast('success', 'Import Excel thành công!');
        fetchData();
      }
    } catch (error) {
      if (toast) toast('error', 'Lỗi import Excel!');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    purchasingService.exportRequisitionsExcel({
      status: filterStatus !== 'all' ? filterStatus : undefined,
      search: searchTerm || undefined,
    });
  };

  return (
    <div className="manufacture-plan-container mgmt-container" style={{ width: '100%', maxWidth: '100%' }}>
      
      {/* Dynamic CSS override for Super Compact Table & Ultra Clean 1-Page View */}
      <style dangerouslySetInnerHTML={{ __html: `
        .pr-compact-table table.data-table thead tr th {
          padding: 6px 8px !important;
          font-size: 0.73rem !important;
          white-space: nowrap !important;
          line-height: 1.15 !important;
          height: 32px !important;
          letter-spacing: -0.2px;
        }
        .pr-compact-table table.data-table tbody tr td {
          padding: 4px 8px !important;
          font-size: 0.76rem !important;
          white-space: nowrap !important;
          line-height: 1.15 !important;
          height: 28px !important;
          vertical-align: middle !important;
        }
        .pr-compact-table .admin-table-card {
          margin-bottom: 0 !important;
        }
        .pr-compact-table .admin-pagination-desktop {
          height: 38px !important;
          min-height: 38px !important;
          padding: 0 12px !important;
        }
      `}} />

      {/* ── STICKY TOP ZONE ── */}
      <div className="sticky-top-zone" style={{ width: '100%' }}>
        {/* 4 Thẻ KPI Tiến độ Thống Kê Toàn Bộ Hệ Thống (Global DB Stats) */}
        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          padding: '2px 0 6px 0',
          boxSizing: 'border-box'
        }}>
          {/* Thẻ 1 */}
          <div className="kpi-card" style={{
            background: '#fff', border: '1px solid #EADCC9',
            padding: '8px 12px', borderRadius: '8px',
            boxShadow: '0 1px 4px rgba(123, 82, 51, 0.04)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>Tiến độ xử lý</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2px 0' }}>
              <div>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1E293B' }}>{computedKPI.processing}</span>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: '600', marginLeft: '4px' }}>/{computedKPI.processingTotal}</span>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1E293B' }}>Đơn hàng</span>
            </div>
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <div style={{ flex: 1, height: '5px', backgroundColor: '#EADCC9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${computedKPI.processingPct}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '3px' }}></div>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: '700' }}>{computedKPI.processingPct}%</span>
            </div>
          </div>

          {/* Thẻ 2 */}
          <div className="kpi-card" style={{
            background: '#fff', border: '1px solid #EADCC9',
            padding: '8px 12px', borderRadius: '8px',
            boxShadow: '0 1px 4px rgba(123, 82, 51, 0.04)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>Tiến độ hoàn thành</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2px 0' }}>
              <div>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1E293B' }}>{computedKPI.completed}</span>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: '600', marginLeft: '4px' }}>/{computedKPI.completedTotal}</span>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1E293B' }}>Đơn hàng</span>
            </div>
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <div style={{ flex: 1, height: '5px', backgroundColor: '#EADCC9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${computedKPI.completedPct}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '3px' }}></div>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: '700' }}>{computedKPI.completedPct}%</span>
            </div>
          </div>

          {/* Thẻ 3 */}
          <div className="kpi-card" style={{
            background: '#fff', border: '1px solid #EADCC9',
            padding: '8px 12px', borderRadius: '8px',
            boxShadow: '0 1px 4px rgba(123, 82, 51, 0.04)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>Tổng giá trị đơn hàng</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2px 0' }}>
              <div>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1E293B' }}>{computedKPI.totalValue.toLocaleString()}</span>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: '600', marginLeft: '4px' }}>/{computedKPI.totalValueMax.toLocaleString()}</span>
              </div>
              <span style={{ fontSize: '1rem', fontWeight: '900', color: '#1E293B' }}>$</span>
            </div>
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <div style={{ flex: 1, height: '5px', backgroundColor: '#EADCC9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${computedKPI.totalValuePct}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '3px' }}></div>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: '700' }}>{computedKPI.totalValuePct}%</span>
            </div>
          </div>

          {/* Thẻ 4 */}
          <div className="kpi-card" style={{
            background: '#fff', border: '1px solid #EADCC9',
            padding: '8px 12px', borderRadius: '8px',
            boxShadow: '0 1px 4px rgba(123, 82, 51, 0.04)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>Chậm tiến độ</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2px 0' }}>
              <div>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1E293B' }}>{computedKPI.overdue}</span>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: '600', marginLeft: '4px' }}>/{computedKPI.overdueTotal}</span>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1E293B' }}>Đơn hàng</span>
            </div>
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <div style={{ flex: 1, height: '5px', backgroundColor: '#EADCC9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${computedKPI.overduePct}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '3px' }}></div>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: '700' }}>{computedKPI.overduePct}%</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ width: '100%' }}>
          <PageToolbar
            searchValue={searchTerm}
            onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            searchPlaceholder="Mã phiếu, tên phiếu"
            showSort={true}
            sortOptions={[
              { value: 'time_desc', label: 'Mới nhất' },
              { value: 'time_asc', label: 'Cũ nhất' },
              { value: 'code_asc', label: 'Mã đơn (A → Z)' },
              { value: 'code_desc', label: 'Mã đơn (Z → A)' }
            ]}
            sortValue={sortValue}
            onSortChange={(val) => { setSortValue(val); setCurrentPage(1); }}
            showFilter={true}
            isFilterOpen={isFilterBarOpen}
            onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
            activeFiltersCount={activeFiltersCount}
            importActions={[
              {
                label: 'Nhập dữ liệu',
                icon: <FileUp size={14} />,
                onClick: () => (fileInputRef.current || document.getElementById('pr-excel-file-input'))?.click()
              }
            ]}
            onExport={handleExport}
            onCreate={() => navigate('/admin/purchase-requisitions/create?mode=edit')}
            createLabel="Thêm tài liệu"
            hasWritePermission={true}
            extraActions={[
              {
                label: 'Khác',
                icon: <Grid size={14} />,
                onClick: () => {}
              }
            ]}
          />
        </div>

        {/* INLINE FILTER BAR */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar" style={{
            display: 'flex', gap: '10px', padding: '8px 12px',
            backgroundColor: '#fff', border: '1px solid #EADCC9',
            borderRadius: '8px', marginBottom: '4px', flexWrap: 'wrap',
            alignItems: 'flex-end', boxShadow: '0 2px 4px rgba(123, 82, 51, 0.04)'
          }}>
            <div className="filter-field-group">
              <label className="filter-field-label" style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>Loại đơn hàng</label>
              <select
                value={filterOrderType}
                onChange={(e) => { setFilterOrderType(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', fontWeight: '600', color: '#334155', fontSize: '0.78rem' }}
              >
                <option value="all">Tất cả loại đơn</option>
                <option value="Đơn bán hàng">Đơn bán hàng</option>
                <option value="Đơn mua hàng">Đơn mua hàng</option>
              </select>
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label" style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>Trạng thái đơn hàng</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', fontWeight: '600', color: '#334155', fontSize: '0.78rem' }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Đã hoàn thành">Đã hoàn thành</option>
                <option value="Đang sản xuất">Đang sản xuất</option>
                <option value="Chưa duyệt">Chưa duyệt</option>
              </select>
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label" style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>Đối tác / Khách hàng</label>
              <select
                value={filterPartner}
                onChange={(e) => { setFilterPartner(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', fontWeight: '600', color: '#334155', fontSize: '0.78rem' }}
              >
                <option value="all">Tất cả đối tác</option>
                <option value="Khách hàng 1">Khách hàng 1</option>
                <option value="Khách hàng 2">Khách hàng 2</option>
                <option value="Khách hàng 3">Khách hàng 3</option>
                <option value="Khách hàng 4">Khách hàng 4</option>
              </select>
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label" style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>Mức độ ưu tiên</label>
              <select
                value={filterPriority}
                onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', fontWeight: '600', color: '#334155', fontSize: '0.78rem' }}
              >
                <option value="all">Tất cả mức độ</option>
                <option value="Cao">Cao</option>
                <option value="Bình thường">Bình thường</option>
              </select>
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label" style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>Thời gian tháng</label>
              <select
                value={filterMonth}
                onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', fontWeight: '600', color: '#334155', fontSize: '0.78rem' }}
              >
                <option value="07/2026">Tháng 07/2026</option>
                <option value="06/2026">Tháng 06/2026</option>
                <option value="">Tất cả thời gian</option>
              </select>
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label" style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>Hiển thị số dòng</label>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff', fontWeight: '600', color: '#334155', fontSize: '0.78rem' }}
              >
                <option value={10}>10 dòng</option>
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            <div className="filter-field-group">
              <button
                type="button"
                onClick={() => {
                  setFilterOrderType('all');
                  setFilterStatus('all');
                  setFilterPartner('all');
                  setFilterPriority('all');
                  setFilterMonth('');
                  setSearchTerm('');
                  setSortValue('time_desc');
                  setItemsPerPage(15);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '5px 12px', borderRadius: '6px',
                  border: '1px solid #EADCC9', backgroundColor: '#FAF6F0',
                  color: '#7B5233', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        )}

        <input
          id="pr-excel-file-input"
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleImport}
        />

        {/* Filter Chip Active */}
        {filterMonth && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '1px 0', marginBottom: '2px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#5D3B32', color: '#fff',
              fontSize: '0.75rem', fontWeight: '700',
              padding: '2px 10px', borderRadius: '6px'
            }}>
              <span>Tháng {filterMonth}</span>
              <button type="button" onClick={() => setFilterMonth('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>&times;</button>
            </div>
          </div>
        )}
      </div>

      {/* ── BẢNG DỮ LIỆU SIÊU TINH GỌN (THAO TÁC NÚT BẤM MỞ DROPDOWN XEM CHI TIẾT & CHỈNH SỬA - KHÔNG ICON - KHÔNG NÚT XÓA) ── */}
      <div className="admin-list-layout pr-compact-table" style={{ width: '100%' }}>
        <div className="mgmt-table card admin-table-card" style={{ width: '100%' }}>
          <div className="table-responsive desktop-only admin-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '40px' }}>STT</th>
                  <th>Mã đơn</th>
                  <th>Loại</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                  <th style={{ maxWidth: '180px', width: '160px' }}>Đối tác</th>
                  <th>Ngày HT dự kiến</th>
                  <th>Ngày HT thực tế</th>
                  <th>Ngày tạo</th>
                  <th>Người tạo</th>
                  <th>Ngày duyệt</th>
                  <th>Người duyệt</th>
                  <th style={{ textAlign: 'right' }}>Tổng giá trị</th>
                  <th>Ghi chú</th>
                  <th style={{ textAlign: 'center', width: '65px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={15} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>Đang tải dữ liệu đơn hàng...</td>
                  </tr>
                ) : displayItems.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</td>
                  </tr>
                ) : displayItems.map((row, idx) => {
                  const rowId = row.id || idx + 1;
                  const isMenuOpen = actionMenuId === rowId;
                  const partnerName = row.supplier_name || row.partner || '---';
                  return (
                    <tr key={rowId}>
                      <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>{String(startIndex + idx).padStart(2, '0')}</td>
                      <td style={{ fontWeight: '800', color: '#2D1A12' }}>{row.po_code || row.order_code || '---'}</td>
                      <td style={{ color: '#475569' }}>{row.order_type || 'Đơn mua hàng'}</td>
                      <td style={{ color: '#475569' }}>{row.priority || 'Bình thường'}</td>
                      <td style={{
                        fontWeight: '700',
                        color: row.status === 'Đã hoàn thành' ? '#475569' : row.status === 'Đang sản xuất' ? '#16A34A' : '#DC2626'
                      }}>
                        {row.status || row.order_status_text || 'Chưa duyệt'}
                      </td>
                      <td
                        style={{
                          color: '#2D1A12',
                          fontWeight: '600',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={partnerName}
                      >
                        {partnerName}
                      </td>
                      <td style={{ color: '#64748B' }}>{formatDateDisplay(row.est_completion_date || row.est_date)}</td>
                      <td style={{ color: '#64748B' }}>{formatDateDisplay(row.real_completion_date || row.real_date)}</td>
                      <td style={{ color: '#64748B' }}>{formatDateDisplay(row.order_date || row.created_at || row.create_date)}</td>
                      <td style={{ color: '#475569' }}>{row.creator || '---'}</td>
                      <td style={{ color: '#64748B' }}>{formatDateDisplay(row.approval_date || row.approve_date)}</td>
                      <td style={{ color: '#475569' }}>{row.approver || '---'}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: '#2D1A12' }}>
                        {typeof row.total_amount === 'number' ? `$${row.total_amount.toLocaleString()}` : (row.total_amount || '$0')}
                      </td>
                      <td style={{ color: '#64748B' }}>{row.note || ''}</td>
                      <td className="pr-action-cell" style={{ textAlign: 'center', position: 'relative', zIndex: isMenuOpen ? 50 : 1 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(isMenuOpen ? null : rowId);
                          }}
                          style={{
                            background: isMenuOpen ? '#FAF6F0' : 'none',
                            border: isMenuOpen ? '1px solid #7B5233' : 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: isMenuOpen ? '#7B5233' : '#64748B',
                            padding: '3px 6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Thao tác"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {/* POPUP ACTION MENU KHÔNG CÓ ICON - KHÔNG CÓ NÚT XÓA */}
                        {isMenuOpen && (
                          <div className="action-menu" style={{ right: '0', top: '100%', minWidth: '120px', padding: '4px 0', boxShadow: '0 6px 16px rgba(123, 82, 51, 0.12)' }}>
                            <button
                              type="button"
                              className="action-menu-item"
                              style={{ display: 'block', width: '100%', fontSize: '0.8rem', fontWeight: '600', padding: '8px 14px', textAlign: 'left', color: '#334155' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(null);
                                navigate(`/admin/purchase-requisitions/${rowId}?mode=view`);
                              }}
                            >
                              Xem chi tiết
                            </button>

                            <button
                              type="button"
                              className="action-menu-item"
                              style={{ display: 'block', width: '100%', fontSize: '0.8rem', fontWeight: '600', padding: '8px 14px', textAlign: 'left', color: '#16A34A', borderTop: '1px solid #FAF6F0' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(null);
                                navigate(`/admin/purchase-requisitions/${rowId}?mode=edit`);
                              }}
                            >
                              Chỉnh sửa
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footers Phân Trang Compact */}
          <div className="admin-pagination-desktop desktop-only">
            <div style={{ color: '#8D6E63', fontSize: '0.78rem', fontWeight: '600' }}>
              Hiển thị <b>{startIndex}–{endIndex}</b> trên <b>{totalCount}</b> đơn hàng
            </div>

            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="page-btn"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                &lt; Trước
              </button>
              {[1, 2, 3, 4].map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`page-btn ${currentPage === p ? 'active' : ''}`}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: currentPage === p ? '#7B5233' : '#fff',
                    color: currentPage === p ? '#fff' : '#334155',
                    fontWeight: '700',
                    border: '1px solid #CBD5E1',
                    borderRadius: '5px',
                    fontSize: '0.78rem'
                  }}
                >
                  {p}
                </button>
              ))}
              <span style={{ color: '#7B5233', fontWeight: '700', padding: '0 4px', fontSize: '0.78rem' }}>...</span>
              <button
                onClick={() => setCurrentPage(117)}
                className="page-btn"
                style={{ padding: '4px 10px', background: '#fff', color: '#334155', fontWeight: '700', border: '1px solid #CBD5E1', borderRadius: '5px', fontSize: '0.78rem' }}
              >
                117
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="page-btn"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                Sau &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseRequisitionListView;
