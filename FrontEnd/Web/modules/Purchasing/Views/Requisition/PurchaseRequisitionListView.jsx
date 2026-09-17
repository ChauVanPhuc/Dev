import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Search, FileDown, FileUp, Eye, Trash2, Edit3,
  ChevronRight, ChevronLeft, ChevronDown, CheckCircle, Clock, AlertCircle,
  Package, Layers, X, Grid, MoreHorizontal, Plus
} from 'lucide-react';
import { purchasingService } from '@modules/Purchasing/Models/purchasing.service';
import '@styles/components.css';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
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

const parseDimensionsFromText = (text) => {
  if (!text) return null;
  const match = String(text).match(/(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const t = parseFloat(match[1]);
    const w = parseFloat(match[2]);
    const l = parseFloat(match[3]);
    if (t > 0 && w > 0 && l > 0) return { t, w, l };
  }
  return null;
};

const getM3PieceConversion = (item) => {
  if (!item) return null;
  const unitStr = (item.unit || '').toLowerCase();
  const isM3 = unitStr.includes('m3') || unitStr.includes('m³') || unitStr.includes('mét khối') || unitStr.includes('met khoi');
  if (!isM3) return null;

  if (item.converted_quantity && Number(item.converted_quantity) > 0) {
    return {
      pieces: Math.round(Number(item.converted_quantity)),
      unitLabel: item.converted_unit || 'cái'
    };
  }

  const dims = parseDimensionsFromText(item.item_name || item.name || item.item_code || item.code);
  const qty = Number(item.quantity || 0);
  if (dims && qty > 0) {
    const vSingle = (dims.t * dims.w * dims.l) / 1000000000;
    if (vSingle > 0) {
      return {
        pieces: Math.round(qty / vSingle),
        unitLabel: 'cái'
      };
    }
  }
  return null;
};

const highlightMatch = (text, term) => {
  if (!text || !term || !term.trim()) return text;
  const strText = String(text);
  const lowerText = strText.toLowerCase();
  const lowerTerm = term.toLowerCase().trim();
  const index = lowerText.indexOf(lowerTerm);
  if (index === -1) return strText;
  
  const before = strText.substring(0, index);
  const match = strText.substring(index, index + lowerTerm.length);
  const after = strText.substring(index + lowerTerm.length);
  
  return (
    <>
      {before}
      <mark style={{ backgroundColor: '#FEF08A', color: '#854D0E', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>
        {match}
      </mark>
      {after}
    </>
  );
};

const PurchaseRequisitionListView = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, startGlobalUpload } = outletContext;
  const { toast } = useToast() || {};
  const fileInputRef = useRef(null);

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/purchase-requisitions');

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle(title || 'Danh sách đơn hàng');
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle(subtitle || 'Quản lý đơn đặt mua & chi tiết mặt hàng');
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode(screenCode || 'KD03');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);

  // Expanded PO rows state
  const [expandedRows, setExpandedRows] = useState({});

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

  // States cho Bộ Lọc (Sort & Filter)
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('time_desc');
  const [filterOrderType, setFilterOrderType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPartner, setFilterPartner] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [importOrderType, setImportOrderType] = useState('Đơn mua hàng');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
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
        supplier_name: filterPartner !== 'all' ? filterPartner : undefined,
        month: filterMonth ? filterMonth : undefined,
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
      console.error('Lỗi tải danh sách đơn hàng:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, searchTerm, filterStatus, filterOrderType, filterPartner, filterMonth]);

  // Sử dụng dữ liệu thực tế 100% từ CSDL
  const rawItems = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  // Áp dụng Logic Sắp Xếp & Lọc Dữ Liệu
  const displayItems = useMemo(() => {
    let filtered = [...rawItems];

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => 
        (item.po_code && String(item.po_code).toLowerCase().includes(term)) ||
        (item.creator && String(item.creator).toLowerCase().includes(term)) ||
        (item.supplier_name && String(item.supplier_name).toLowerCase().includes(term)) ||
        (item.supplier_code && String(item.supplier_code).toLowerCase().includes(term)) ||
        (item.note && String(item.note).toLowerCase().includes(term)) ||
        (Array.isArray(item.items) && item.items.some(it => 
          (it.item_code && String(it.item_code).toLowerCase().includes(term)) ||
          (it.item_name && String(it.item_name).toLowerCase().includes(term)) ||
          (it.order_code && String(it.order_code).toLowerCase().includes(term))
        ))
      );
    }

    if (filterOrderType !== 'all') {
      filtered = filtered.filter(item => (item.order_type || 'Đơn mua hàng') === filterOrderType);
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    if (filterPartner !== 'all') {
      filtered = filtered.filter(item => (item.supplier_name || '').includes(filterPartner));
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(item => item.priority === filterPriority);
    }

    if (sortValue === 'code_asc') {
      filtered.sort((a, b) => String(a.po_code || '').localeCompare(String(b.po_code || '')));
    } else if (sortValue === 'code_desc') {
      filtered.sort((a, b) => String(b.po_code || '').localeCompare(String(a.po_code || '')));
    } else if (sortValue === 'time_asc') {
      filtered.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (sortValue === 'time_desc') {
      filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    return filtered;
  }, [rawItems, searchTerm, sortValue, filterOrderType, filterStatus, filterPartner, filterPriority]);

  // Tự động mở rộng chi tiết các đơn hàng khi tìm kiếm từ khóa
  useEffect(() => {
    if (searchTerm && searchTerm.trim()) {
      const autoExpanded = {};
      displayItems.forEach(r => { autoExpanded[r.id] = true; });
      setExpandedRows(autoExpanded);
    }
  }, [searchTerm, displayItems]);

  // ── LOGIC CHUẨN: TÍNH THỐNG KÊ TOÀN BỘ CƠ SỞ DỮ LIỆU (GLOBAL STATS OVERALL DB) ──
  const computedKPI = useMemo(() => {
    const processing = Number(statsData?.processing ?? statsData?.processing_count ?? 0);
    const processingTotal = Number(statsData?.processing_total ?? (total || 1));
    const processingPct = Math.min(100, Math.round((processing / (processingTotal || 1)) * 100));

    const completed = Number(statsData?.completed ?? statsData?.completed_count ?? 0);
    const completedTotal = Number(statsData?.completed_total ?? (total || 1));
    const completedPct = Math.min(100, Math.round((completed / (completedTotal || 1)) * 100));

    const totalValue = Number(statsData?.total_value ?? statsData?.total_amount ?? 0);
    const totalValueMax = Number(statsData?.total_value_max ?? statsData?.target_value ?? Math.max(1000000, totalValue * 1.2));
    const totalValuePct = Math.min(100, Math.round((totalValue / (totalValueMax || 1)) * 100));

    const overdue = Number(statsData?.overdue ?? statsData?.overdue_count ?? 0);
    const overdueTotal = Number(statsData?.overdue_total ?? (total || 1));
    const overduePct = Math.min(100, Math.round((overdue / (overdueTotal || 1)) * 100));

    return {
      processing, processingTotal, processingPct,
      completed, completedTotal, completedPct,
      totalValue, totalValueMax, totalValuePct,
      overdue, overdueTotal, overduePct
    };
  }, [statsData, total]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterOrderType !== 'all') count++;
    if (filterStatus !== 'all') count++;
    if (filterPartner !== 'all') count++;
    if (filterPriority !== 'all') count++;
    if (filterMonth) count++;
    if (itemsPerPage !== 15) count++;
    return count;
  }, [filterOrderType, filterStatus, filterPartner, filterPriority, filterMonth, itemsPerPage]);

  const totalCount = total || displayItems.length || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const startIndex = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;

  // Toggle row expand
  const toggleRowExpand = (rowId) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const isAllExpanded = displayItems.length > 0 && displayItems.every(r => expandedRows[r.id]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedRows({});
    } else {
      const next = {};
      displayItems.forEach(r => { next[r.id] = true; });
      setExpandedRows(next);
    }
  };

  const handleTriggerImport = (type) => {
    setImportOrderType(type);
    const input = fileInputRef.current || document.getElementById('pr-excel-file-input');
    if (input) {
      input.value = '';
      input.click();
    }
  };

  // NẠP DỮ LIỆU EXCEL (TỰ ĐỘNG GÁN LOẠI ĐƠN MUA HÀNG / ĐƠN BÁN HÀNG)
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetType = importOrderType || 'Đơn mua hàng';
    const endpoint = `/purchase-requisitions/import-excel?order_type=${encodeURIComponent(targetType)}`;
    try {
      if (startGlobalUpload) {
        await startGlobalUpload(file, endpoint, () => {
          fetchData();
        });
      } else {
        await purchasingService.importRequisitionsExcel(file);
        if (typeof toast === 'function') toast('success', `Import dữ liệu ${targetType} thành công!`);
        fetchData();
      }
    } catch (error) {
      if (typeof toast === 'function') toast('error', 'Lỗi import Excel: ' + (error?.response?.data?.detail || error.message));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportRequisitions = () => {
    purchasingService.exportRequisitionsExcel({
      status: filterStatus !== 'all' ? filterStatus : undefined,
      search: searchTerm || undefined,
    });
  };

  const handleExportItems = () => {
    purchasingService.exportOrderItemsExcel({
      status: filterStatus !== 'all' ? filterStatus : undefined,
      search: searchTerm || undefined,
    });
  };

  return (
    <div className="gold-layout">

      {/* Dynamic CSS override for Super Compact Table & Clean ERP View with Full Scroll Support */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 769px) {
          .pr-unified-container {
            height: calc(100vh - 68px) !important;
            max-height: calc(100vh - 68px) !important;
            min-height: 0 !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
          }
          .pr-unified-container .sticky-top-zone {
            flex-shrink: 0 !important;
            flex-grow: 0 !important;
            margin-bottom: 0 !important;
          }
          .pr-unified-container .admin-list-layout {
            flex: 1 1 0% !important;
            height: 100% !important;
            min-height: 0 !important;
            max-height: 100% !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .pr-unified-container .admin-table-card {
            flex: 1 1 0% !important;
            height: 100% !important;
            min-height: 0 !important;
            max-height: 100% !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            margin: 0 !important;
            border-radius: 8px !important;
          }
          .pr-unified-container .admin-table-scroll {
            flex: 1 1 0% !important;
            height: 100% !important;
            min-height: 0 !important;
            overflow-x: auto !important;
            overflow-y: auto !important;
            display: block !important;
            position: relative !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .pr-unified-container .admin-pagination-desktop {
            flex-shrink: 0 !important;
            flex-grow: 0 !important;
            height: 38px !important;
            min-height: 38px !important;
            max-height: 38px !important;
            padding: 0 12px !important;
            margin-top: auto !important;
            background: #FFFFFF !important;
            border-top: 1px solid #EADCC9 !important;
            z-index: 15 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
        }

        /* Custom Scrollbar */
        .pr-unified-container .admin-table-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .pr-unified-container .admin-table-scroll::-webkit-scrollbar-track {
          background: #FAF6F0;
          border-radius: 4px;
        }
        .pr-unified-container .admin-table-scroll::-webkit-scrollbar-thumb {
          background: #D7C4B2;
          border-radius: 4px;
        }
        .pr-unified-container .admin-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #A67C52;
        }

        /* Sticky Table Header */
        .pr-compact-table table.data-table thead tr th {
          padding: 6px 8px !important;
          font-size: 0.73rem !important;
          white-space: nowrap !important;
          line-height: 1.15 !important;
          height: 32px !important;
          letter-spacing: -0.2px;
          background-color: #FAF6F0 !important;
          color: #7B5233 !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 20 !important;
          border-bottom: 1px solid #EADCC9 !important;
          box-shadow: 0 1px 0 #EADCC9 !important;
        }
        .pr-compact-table table.data-table tbody tr td {
          padding: 4px 8px !important;
          font-size: 0.76rem !important;
          white-space: nowrap !important;
          line-height: 1.15 !important;
          height: 28px !important;
          vertical-align: middle !important;
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
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1E293B' }}>{(computedKPI.totalValue || 0).toLocaleString()}</span>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: '600', marginLeft: '4px' }}>/{(computedKPI.totalValueMax || 0).toLocaleString()}</span>
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
            searchPlaceholder="Tìm kiếm mã đơn, nhà cung cấp, mã mặt hàng, người tạo..."
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
                label: 'Nhập đơn Mua hàng',
                icon: <FileUp size={14} />,
                onClick: () => handleTriggerImport('Đơn mua hàng')
              },
              {
                label: 'Nhập đơn Bán hàng',
                icon: <FileUp size={14} />,
                onClick: () => handleTriggerImport('Đơn bán hàng')
              }
            ]}
            onExport={handleExportRequisitions}
            exportLabel="Xuất đơn hàng"
            onCreate={() => navigate('/admin/purchase-requisitions/create?mode=edit')}
            createLabel="Thêm tài liệu"
            hasWritePermission={true}
            extraActions={[
              {
                label: 'Xuất chi tiết mặt hàng (Excel)',
                icon: <FileDown size={14} />,
                onClick: handleExportItems
              },
              {
                label: isAllExpanded ? 'Thu gọn tất cả chi tiết' : 'Mở rộng tất cả chi tiết',
                icon: <Layers size={14} />,
                onClick: toggleExpandAll
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
                <option value="Đã duyệt">Đã duyệt</option>
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
                <option value="Atlas International">Atlas International (KH036)</option>
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
                <option value="">Tất cả thời gian</option>
                <option value="12/2025">KHSX 12/2025</option>
                <option value="01/2026">KHSX 01/2026</option>
                <option value="02/2026">KHSX 02/2026</option>
                <option value="04/2026">KHSX 04/2026</option>
                <option value="05/2026">KHSX 05/2026</option>
                <option value="PTDN">PTDN</option>
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

      {/* ── BẢNG DỮ LIỆU HỢP NHẤT: ĐƠN HÀNG TÍCH HỢP XEM NHANH CHI TIẾT MẶT HÀNG ── */}
      <div className="admin-list-layout pr-compact-table" style={{ width: '100%' }}>
        <div className="mgmt-table card admin-table-card" style={{ width: '100%' }}>
          <div className="table-responsive desktop-only admin-table-scroll">
            <table className="data-table" style={{ minWidth: '1350px', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '36px', minWidth: '36px' }}>
                    <button
                      type="button"
                      onClick={toggleExpandAll}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#7B5233', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0
                      }}
                      title={isAllExpanded ? "Thu gọn tất cả" : "Mở rộng tất cả chi tiết"}
                    >
                      {isAllExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                  </th>
                  <th style={{ textAlign: 'center', width: '38px', minWidth: '38px' }}>STT</th>
                  <th style={{ minWidth: '110px' }}>Mã đơn (PO)</th>
                  <th style={{ minWidth: '95px' }}>Loại</th>
                  <th style={{ minWidth: '85px' }}>Ưu tiên</th>
                  <th style={{ minWidth: '95px' }}>Trạng thái</th>
                  <th style={{ minWidth: '160px', maxWidth: '220px' }}>Đối tác</th>
                  <th style={{ textAlign: 'center', minWidth: '95px' }}>Ngày tạo</th>
                  <th style={{ minWidth: '100px' }}>Người tạo</th>
                  <th style={{ textAlign: 'right', minWidth: '115px' }}>Tổng giá trị</th>
                  <th style={{ textAlign: 'center', minWidth: '90px' }}>Chi tiết MH</th>
                  <th style={{ textAlign: 'center', minWidth: '65px', width: '65px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>Đang tải dữ liệu đơn hàng & chi tiết mặt hàng...</td>
                  </tr>
                ) : displayItems.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</td>
                  </tr>
                ) : displayItems.map((row, idx) => {
                  const rowId = row.id || idx + 1;
                  const isMenuOpen = actionMenuId === rowId;
                  const isExpanded = !!expandedRows[rowId];
                  const partnerName = row.supplier_name || row.partner || '---';
                  const itemCount = row.item_count || (Array.isArray(row.items) ? row.items.length : 0);

                  return (
                    <React.Fragment key={rowId}>
                      <tr 
                        style={{ 
                          backgroundColor: isExpanded ? '#FAF6F0' : 'transparent',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {/* Nút Toggle Expand Sub-table */}
                        <td style={{ textAlign: 'center', padding: '4px' }}>
                          <button
                            type="button"
                            onClick={() => toggleRowExpand(rowId)}
                            style={{
                              background: isExpanded ? '#7B5233' : '#F1E9DF',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: isExpanded ? '#FFFFFF' : '#7B5233',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '20px',
                              height: '20px',
                              padding: 0,
                              transition: 'all 0.15s ease'
                            }}
                            title={isExpanded ? "Thu gọn mặt hàng" : "Xem chi tiết mặt hàng"}
                          >
                            {isExpanded ? <ChevronDown size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
                          </button>
                        </td>

                        <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>
                          {String(startIndex + idx).padStart(2, '0')}
                        </td>
                        
                        <td style={{ fontWeight: '800', color: '#2D1A12' }}>
                          <span 
                            onClick={() => toggleRowExpand(rowId)} 
                            style={{ cursor: 'pointer' }}
                            title="Bấm để xem chi tiết mặt hàng"
                          >
                            {row.po_code || row.order_code || '---'}
                          </span>
                        </td>

                        <td>
                          {(row.order_type === 'Đơn bán hàng' || (row.order_type && row.order_type.includes('bán'))) ? (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: '#EEF2FF',
                              color: '#4F46E5',
                              border: '1px solid #C7D2FE',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}>
                              Đơn bán hàng
                            </span>
                          ) : (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: '#ECFDF5',
                              color: '#059669',
                              border: '1px solid #A7F3D0',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}>
                              Đơn mua hàng
                            </span>
                          )}
                        </td>
                        <td style={{ color: '#475569' }}>{row.priority || 'Bình thường'}</td>
                        
                        <td style={{
                          fontWeight: '700',
                          color: (row.status === 'Đã duyệt' || row.status === 'Đã hoàn thành') ? '#16A34A' : row.status === 'Đang sản xuất' ? '#2563EB' : '#DC2626'
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

                        <td style={{ textAlign: 'center', color: '#64748B' }}>{formatDateDisplay(row.order_date || row.created_at || row.create_date)}</td>
                        <td style={{ color: '#475569' }}>{row.creator || '---'}</td>
                        
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#2D1A12' }}>
                          {typeof row.total_amount === 'number' ? `$${row.total_amount.toLocaleString()}` : (row.total_amount || '$0')}
                        </td>

                        {/* Badge Số lượng mặt hàng */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggleRowExpand(rowId)}
                            style={{
                              border: '1px solid #EADCC9',
                              backgroundColor: isExpanded ? '#7B5233' : '#FAF6F0',
                              color: isExpanded ? '#FFFFFF' : '#7B5233',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Xem chi tiết các mặt hàng của đơn này"
                          >
                            <Layers size={11} />
                            <span>{itemCount} MH</span>
                          </button>
                        </td>
                        
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

                          {/* POPUP ACTION MENU */}
                          {isMenuOpen && (
                            <div className="action-menu" style={{ right: '0', top: '100%', minWidth: '130px', padding: '4px 0', boxShadow: '0 6px 16px rgba(123, 82, 51, 0.12)' }}>
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
                                style={{ display: 'block', width: '100%', fontSize: '0.8rem', fontWeight: '600', padding: '8px 14px', textAlign: 'left', color: '#7B5233', borderTop: '1px solid #FAF6F0' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenuId(null);
                                  toggleRowExpand(rowId);
                                }}
                              >
                                {isExpanded ? 'Ẩn mặt hàng' : 'Xem mặt hàng'}
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

                      {/* ── EXPANDED SUB-TABLE: CHI TIẾT CÁC MẶT HÀNG TRONG ĐƠN HÀNG ── */}
                      {isExpanded && (
                        <tr className="pr-expanded-subrow" style={{ backgroundColor: '#FAF8F6' }}>
                          <td colSpan={12} style={{ padding: '8px 14px 14px 14px', borderBottom: '2px solid #EADCC9' }}>
                            <div style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #EADCC9',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                            }}>
                              <div style={{
                                padding: '7px 12px',
                                backgroundColor: '#FAF6F0',
                                borderBottom: '1px solid #EADCC9',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#7B5233', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Layers size={14} />
                                  <span>Danh sách mặt hàng đơn <strong style={{ color: '#2D1A12' }}>{row.po_code}</strong> ({itemCount} mặt hàng)</span>
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#8D6E63', fontWeight: '600' }}>
                                  Đối tác: {partnerName}
                                </span>
                              </div>
                              
                              {(!Array.isArray(row.items) || row.items.length === 0) ? (
                                <div style={{ padding: '12px', textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem' }}>
                                  Chưa có chi tiết mặt hàng cho đơn này.
                                </div>
                              ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                  <thead>
                                    <tr style={{ backgroundColor: '#F8FAFC', color: '#475569', fontWeight: '700', borderBottom: '1px solid #E2E8F0' }}>
                                      <th style={{ padding: '6px 10px', textAlign: 'center', width: '35px' }}>#</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Mã mặt hàng</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Tên mặt hàng / Mô tả</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Mã đơn hàng</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>ĐVT</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Số lượng</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Đơn giá</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Thành tiền</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Ngày giao yêu cầu</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Trạng thái</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.items.map((it, itIdx) => {
                                      const termLower = (searchTerm || '').toLowerCase().trim();
                                      const isItemMatched = termLower && (
                                        (it.item_code && String(it.item_code).toLowerCase().includes(termLower)) ||
                                        (it.item_name && String(it.item_name).toLowerCase().includes(termLower)) ||
                                        (it.order_code && String(it.order_code).toLowerCase().includes(termLower))
                                      );
                                      return (
                                        <tr key={it.id || itIdx} style={{
                                          borderBottom: '1px solid #F1F5F9',
                                          backgroundColor: isItemMatched ? '#FEFCE8' : (itIdx % 2 === 0 ? '#FFFFFF' : '#FDFDFD'),
                                          transition: 'background-color 0.15s ease'
                                        }}>
                                          <td style={{ padding: '6px 10px', textAlign: 'center', color: '#94A3B8', fontWeight: '600' }}>{itIdx + 1}</td>
                                          <td style={{ padding: '6px 10px', fontWeight: '700', color: '#2D1A12' }}>{highlightMatch(it.item_code || '---', searchTerm)}</td>
                                          <td style={{ padding: '6px 10px', color: '#334155' }}>{highlightMatch(it.item_name || it.item_code || '---', searchTerm)}</td>
                                          <td style={{ padding: '6px 10px', color: '#64748B' }}>{highlightMatch(it.order_code || row.po_code || '---', searchTerm)}</td>
                                          <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748B' }}>{it.unit || 'Bộ'}</td>
                                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: '#2D1A12' }}>
                                            <div>{typeof it.quantity === 'number' ? it.quantity.toLocaleString() : (it.quantity || 0)}</div>
                                            {(() => {
                                              const conv = getM3PieceConversion(it);
                                              if (conv) {
                                                return (
                                                  <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '700', marginTop: '1px' }}>
                                                    (≈ {conv.pieces.toLocaleString()} {conv.unitLabel})
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </td>
                                          <td style={{ padding: '6px 10px', textAlign: 'right', color: '#475569' }}>
                                            {it.currency === 'USD' || it.subtotal_foreign ? `$${(Number(it.unit_price) || 0).toLocaleString()}` : `${(Number(it.unit_price) || 0).toLocaleString()}đ`}
                                          </td>
                                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: '#7B5233' }}>
                                            {it.currency === 'USD' || it.subtotal_foreign 
                                              ? `$${(Number(it.subtotal_foreign) || (Number(it.quantity || 0) * Number(it.unit_price || 0)) || 0).toLocaleString()}`
                                              : `${(Number(it.subtotal_vnd) || (Number(it.quantity || 0) * Number(it.unit_price || 0)) || 0).toLocaleString()}đ`
                                            }
                                          </td>
                                          <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748B' }}>
                                            {formatDateDisplay(it.requested_delivery_date || row.delivery_date)}
                                          </td>
                                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                            <span style={{
                                              fontSize: '0.7rem',
                                              fontWeight: '700',
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                              backgroundColor: (it.status === 'Đã duyệt' || it.status === 'Đã hoàn thành') ? '#ECFDF5' : '#FFFBEB',
                                              color: (it.status === 'Đã duyệt' || it.status === 'Đã hoàn thành') ? '#16A34A' : '#D97706'
                                            }}>
                                              {it.status || 'Chưa duyệt'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footers Phân Trang Compact Chuẩn Dynamic */}
          <div className="admin-pagination-desktop desktop-only">
            <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
              Hiển thị <b>{totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalCount)}</b> trên <b>{totalCount}</b> đơn hàng
            </div>

            <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="page-btn"
              >
                <ChevronLeft size={14} />
              </button>
              {(() => {
                if (totalPages <= 7) {
                  return Array.from({ length: totalPages }, (_, i) => i + 1);
                }
                const pages = [];
                const delta = 2;
                const left = currentPage - delta;
                const right = currentPage + delta + 1;
                let l;
                for (let i = 1; i <= totalPages; i++) {
                  if (i === 1 || i === totalPages || (i >= left && i < right)) {
                    pages.push(i);
                  }
                }
                const result = [];
                for (const p of pages) {
                  if (l) {
                    if (p - l === 2) {
                      result.push(l + 1);
                    } else if (p - l !== 1) {
                      result.push('...');
                    }
                  }
                  result.push(p);
                  l = p;
                }
                return result;
              })().map((p, idx) => (
                p === '...' ? (
                  <span key={`dots-${idx}`} style={{ color: '#8D6E63', fontWeight: '700', padding: '0 4px', fontSize: '0.78rem' }}>...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`page-btn ${currentPage === p ? 'active' : ''}`}
                  >
                    {p}
                  </button>
                )
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="page-btn"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseRequisitionListView;
