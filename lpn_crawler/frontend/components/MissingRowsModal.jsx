import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Check,
  X,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';
import { lpnCrawlerApi } from '../services/api';
import { DetailModal } from './DetailModal';

export const MissingRowsModal = ({
  isOpen,
  onClose,
  onSelectItem,
  onStartCrawl,
  onRefreshKpi,
  startDate = null,
  endDate = null,
  dateRangeLabel = null,
  isAllTime = false
}) => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    total_missing: 0,
    missing_lpn: 0,
    missing_sku: 0,
    missing_image: 0,
    mismatch_code: 0,
    unresolved_count: 0
  });

  // Tab: 'active' (Danh sách cần xử lý) | 'unresolved' (Danh sách không xử lý được)
  const [activeTab, setActiveTab] = useState('active');

  // Chế độ đọc: readAll = true (đọc toàn bộ database), readAll = false (tự động theo khoảng thời gian)
  const [readAll, setReadAll] = useState(Boolean(isAllTime) || (!startDate && !endDate));

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState(null);

  // Kiểm tra chi tiết trực tiếp khi bấm "Xử lý"
  const [inspectingItemDetail, setInspectingItemDetail] = useState(null);
  const [inspectingLoadingId, setInspectingLoadingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReadAll(Boolean(isAllTime) || (!startDate && !endDate));
      setActiveTab('active');
      setPage(1);
      setSearch('');
      setInspectingItemDetail(null);
      setInspectingLoadingId(null);
    }
  }, [isOpen, startDate, endDate, isAllTime]);

  useEffect(() => {
    if (isOpen) {
      fetchMissingRows();
    }
  }, [isOpen, page, search, filterType, readAll, activeTab]);

  const fetchMissingRows = async () => {
    setLoading(true);
    try {
      const params = {
        tab: activeTab,
        search,
        missing_type: filterType === 'all' ? undefined : filterType,
        page,
        page_size: pageSize
      };
      if (!readAll && (startDate || endDate)) {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      const res = await lpnCrawlerApi.getMissingRows(params);
      setItems(res.items || []);
      setTotal(res.total || 0);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (e) {
      console.error('Lỗi tải danh sách thiếu/lệch dữ liệu:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryMissing = async () => {
    if (onStartCrawl) {
      onClose();
      onStartCrawl(true, 'full');
      return;
    }
    setRetrying(true);
    setRetryMessage(null);
    try {
      const res = await lpnCrawlerApi.retryMissingData();
      if (res && res.message) {
        setRetryMessage(res.message);
        setTimeout(() => setRetryMessage(null), 4000);
      }
      await fetchMissingRows();
      if (onRefreshKpi) onRefreshKpi();
    } catch (e) {
      setRetryMessage('Lỗi khi tải lại dữ liệu thiếu.');
      setTimeout(() => setRetryMessage(null), 4000);
    } finally {
      setRetrying(false);
    }
  };

  // Mở thẳng giao diện kiểm tra chi tiết ảnh & AI OCR khi bấm "Xử lý"
  const handleOpenDetailInspect = async (row) => {
    const rowItemId = row.item_id || row.id;
    if (!rowItemId) return;
    setInspectingLoadingId(rowItemId);
    try {
      const detail = await lpnCrawlerApi.getItemDetail(rowItemId);
      if (detail) {
        setInspectingItemDetail(detail);
      } else {
        setInspectingItemDetail(row);
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết item:', err);
      setInspectingItemDetail(row);
    } finally {
      setInspectingLoadingId(null);
    }
  };

  // Khôi phục dòng từ "Không xử lý được" về danh sách "Cần xử lý"
  const handleUnresolveAction = async (item) => {
    setActionLoading(true);
    try {
      const res = await lpnCrawlerApi.unresolveItem(item.item_id);
      if (res && res.success) {
        setRetryMessage('Đã khôi phục dòng trở lại danh sách cần xử lý thành công.');
        setTimeout(() => setRetryMessage(null), 3500);
        await fetchMissingRows();
        if (onRefreshKpi) onRefreshKpi();
      } else {
        alert(res?.message || 'Lỗi khi khôi phục trạng thái.');
      }
    } catch (err) {
      alert('Lỗi: ' + (err.message || 'Không thể khôi phục'));
    } finally {
      setActionLoading(false);
    }
  };

  const renderMissingBadge = (field, idx) => {
    const fLower = (field || '').toLowerCase();
    let bg = '#FEE2E2';
    let border = '#FCA5A5';
    let color = '#991B1B';

    if (fLower.includes('sai mã') || fLower.includes('lệch') || fLower.includes('mismatch')) {
      bg = '#FEF2F2';
      border = '#F87171';
      color = '#B91C1C';
    } else if (fLower.includes('hình ảnh') || fLower.includes('picture') || fLower.includes('image')) {
      bg = '#FEF3C7';
      border = '#FCD34D';
      color = '#92400E';
    } else if (fLower.includes('sku')) {
      bg = '#F3E8FF';
      border = '#D8B4FE';
      color = '#6B21A8';
    } else if (fLower.includes('lpn')) {
      bg = '#EFF6FF';
      border = '#BFDBFE';
      color = '#1E40AF';
    } else if (fLower.includes('batch')) {
      bg = '#ECFDF5';
      border = '#A7F3D0';
      color = '#065F46';
    } else if (fLower.includes('date')) {
      bg = '#FFF7ED';
      border = '#FFEDD5';
      color = '#C2410C';
    } else if (fLower.includes('timestamp')) {
      bg = '#F1F5F9';
      border = '#CBD5E1';
      color = '#334155';
    } else if (fLower.includes('container')) {
      bg = '#FEF2F2';
      border = '#FECACA';
      color = '#991B1B';
    }

    return (
      <span
        key={idx}
        style={{
          backgroundColor: bg,
          border: `1px solid ${border}`,
          color: color,
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '0.74rem',
          fontWeight: '700',
          display: 'inline-block',
          whiteSpace: 'nowrap'
        }}
      >
        {field}
      </span>
    );
  };

  if (!isOpen) return null;

  const totalPages = Math.ceil(total / pageSize) || 1;
  const startIdx = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIdx = total > 0 ? Math.min(page * pageSize, total) : 0;

  const getPageButtons = () => {
    const btns = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) btns.push(i);
    } else {
      btns.push(1);
      if (page > 3) btns.push('...');
      const rStart = Math.max(2, page - 1);
      const rEnd = Math.min(totalPages - 1, page + 1);
      for (let i = rStart; i <= rEnd; i++) btns.push(i);
      if (page < totalPages - 2) btns.push('...');
      btns.push(totalPages);
    }
    return btns;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px'
      }}
      onClick={onClose}
    >
      <div
        className="lpn-missing-dialog"
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          width: 'min(98vw, 1300px)',
          maxWidth: '98vw',
          height: 'min(94vh, 900px)',
          maxHeight: '94vh',
          minHeight: '560px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          border: '1px solid #EADCC9',
          animation: 'modalScaleUp 0.18s ease-out forwards',
          overflow: 'hidden',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div
          style={{
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #EADCC9',
            backgroundColor: '#FFFDFB',
            flexWrap: 'wrap',
            gap: '8px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: activeTab === 'unresolved' ? '#F3F4F6' : '#FEF2F2',
                border: `1px solid ${activeTab === 'unresolved' ? '#D1D5DB' : '#FCA5A5'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeTab === 'unresolved' ? '#4B5563' : '#DC2626',
                flexShrink: 0
              }}
            >
              {activeTab === 'unresolved' ? <FileText size={16} /> : <AlertTriangle size={16} />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: '800', color: '#4E3629' }}>
                Danh Sách Thiếu / Lệch Dữ Liệu
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Bộ chuyển Tab: Cần xử lý vs Không xử lý được */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#F5EBE1',
                borderRadius: '8px',
                padding: '3px',
                gap: '3px',
                border: '1px solid #E2D3C2'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (activeTab !== 'active') {
                    setActiveTab('active');
                    setPage(1);
                  }
                }}
                style={{
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeTab === 'active' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'active' ? '#DC2626' : '#785A46',
                  boxShadow: activeTab === 'active' ? '0 1px 4px rgba(220, 38, 38, 0.15)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Cần xử lý</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeTab !== 'unresolved') {
                    setActiveTab('unresolved');
                    setPage(1);
                  }
                }}
                style={{
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeTab === 'unresolved' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'unresolved' ? '#1F2937' : '#785A46',
                  boxShadow: activeTab === 'unresolved' ? '0 1px 4px rgba(31, 41, 55, 0.15)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Không xử lý được</span>
                {summary.unresolved_count > 0 && (
                  <span
                    style={{
                      backgroundColor: activeTab === 'unresolved' ? '#DC2626' : '#E5E7EB',
                      color: activeTab === 'unresolved' ? '#FFFFFF' : '#374151',
                      borderRadius: '10px',
                      padding: '1px 6px',
                      fontSize: '0.7rem',
                      fontWeight: '800'
                    }}
                  >
                    {summary.unresolved_count}
                  </span>
                )}
              </button>
            </div>

            {/* Nút Đơn: Toàn bộ (Bấm thì đọc toàn bộ, không bấm thì tự động theo khoảng thời gian) */}
            <button
              type="button"
              onClick={() => {
                setReadAll((prev) => !prev);
                setPage(1);
              }}
              style={{
                border: readAll ? '1.5px solid #7B5233' : '1px solid #D5C7B7',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: readAll ? '#7B5233' : '#FFFFFF',
                color: readAll ? '#FFFFFF' : '#6B4423',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: readAll ? '0 2px 6px rgba(123, 82, 51, 0.25)' : 'none'
              }}
              title={
                readAll
                  ? 'Đang đọc toàn bộ database (Bấm để quay lại tự lọc theo khoảng)'
                  : 'Bấm để đọc toàn bộ database (không giới hạn theo khoảng ngày)'
              }
            >
              <span>Toàn bộ</span>
              {readAll && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    padding: '1px 5px',
                    borderRadius: '4px'
                  }}
                >
                  Bật
                </span>
              )}
            </button>

            {/* Nút Đóng Modal */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.6rem',
                lineHeight: 1,
                color: '#4E3629',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF6F0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              title="Đóng cửa sổ"
            >
              &times;
            </button>
          </div>
        </div>

        {/* 2. KPI Cards Row (Ngang) */}
        <div
          className="lpn-missing-kpi-grid"
          style={{
            padding: '10px 16px',
            backgroundColor: '#FAF6F0',
            borderBottom: '1px solid #EADCC9',
            display: 'grid',
            gridTemplateColumns: activeTab === 'unresolved' ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))',
            gap: '8px',
            flexShrink: 0
          }}
        >
          {/* Card 1: Tổng dòng thiếu / lệch mã */}
          <div
            onClick={() => {
              setFilterType('all');
              setPage(1);
            }}
            style={{
              backgroundColor: filterType === 'all' ? '#FEF2F2' : '#FFFFFF',
              border: `1.5px solid ${filterType === 'all' ? '#DC2626' : '#EADCC9'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: filterType === 'all' ? '0 2px 8px rgba(220, 38, 38, 0.12)' : 'none'
            }}
            title="Bấm để lọc tất cả các dòng thiếu hoặc sai mã"
          >
            <div>
              <div style={{ fontSize: '0.73rem', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase' }}>
                Tổng dòng thiếu / lệch mã
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#DC2626', lineHeight: 1 }}>
              {(activeTab === 'unresolved'
                ? summary.unresolved_count || total
                : summary.total_missing !== undefined
                ? summary.total_missing
                : total
              ).toLocaleString()}
            </div>
          </div>

          {activeTab === 'unresolved' ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #EADCC9',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>
                  Danh sách không xử lý được
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '2px' }}>
                  Các dòng đã được nhân viên ghi chú lý do không thể bổ sung/khắc phục
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#374151', lineHeight: 1 }}>
                {(summary.unresolved_count || total).toLocaleString()}
              </div>
            </div>
          ) : (
            <>
              {/* Card 2: Thiếu LPN */}
              <div
                onClick={() => {
                  setFilterType('lpn');
                  setPage(1);
                }}
                style={{
                  backgroundColor: filterType === 'lpn' ? '#EFF6FF' : '#FFFFFF',
                  border: `1.5px solid ${filterType === 'lpn' ? '#2563EB' : '#EADCC9'}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: filterType === 'lpn' ? '0 2px 8px rgba(37, 99, 235, 0.12)' : 'none'
                }}
                title="Bấm để lọc các dòng thiếu mã LPN"
              >
                <div style={{ fontSize: '0.73rem', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase' }}>
                  Thiếu mã LPN
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1E40AF', lineHeight: 1 }}>
                  {(summary.missing_lpn || 0).toLocaleString()}
                </div>
              </div>

              {/* Card 3: Thiếu SKU */}
              <div
                onClick={() => {
                  setFilterType('sku');
                  setPage(1);
                }}
                style={{
                  backgroundColor: filterType === 'sku' ? '#F3E8FF' : '#FFFFFF',
                  border: `1.5px solid ${filterType === 'sku' ? '#7C3AED' : '#EADCC9'}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: filterType === 'sku' ? '0 2px 8px rgba(124, 58, 237, 0.12)' : 'none'
                }}
                title="Bấm để lọc các dòng thiếu mã SKU"
              >
                <div style={{ fontSize: '0.73rem', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase' }}>
                  Thiếu mã SKU
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#6B21A8', lineHeight: 1 }}>
                  {(summary.missing_sku || 0).toLocaleString()}
                </div>
              </div>

              {/* Card 4: Thiếu Hình Ảnh */}
              <div
                onClick={() => {
                  setFilterType('image');
                  setPage(1);
                }}
                style={{
                  backgroundColor: filterType === 'image' ? '#FEF3C7' : '#FFFFFF',
                  border: `1.5px solid ${filterType === 'image' ? '#D97706' : '#EADCC9'}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: filterType === 'image' ? '0 2px 8px rgba(217, 119, 6, 0.12)' : 'none'
                }}
                title="Bấm để lọc các dòng thiếu hình ảnh"
              >
                <div style={{ fontSize: '0.73rem', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase' }}>
                  Thiếu Hình Ảnh
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#92400E', lineHeight: 1 }}>
                  {(summary.missing_image || 0).toLocaleString()}
                </div>
              </div>

              {/* Card 5: Sai / Lệch mã */}
              <div
                onClick={() => {
                  setFilterType('mismatch');
                  setPage(1);
                }}
                style={{
                  backgroundColor: filterType === 'mismatch' ? '#FFF1F2' : '#FFFFFF',
                  border: `1.5px solid ${filterType === 'mismatch' ? '#E11D48' : '#EADCC9'}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: filterType === 'mismatch' ? '0 2px 8px rgba(225, 29, 72, 0.12)' : 'none'
                }}
                title="Bấm để lọc các dòng quét phát hiện sai mã / lệch so với CSDL"
              >
                <div>
                  <div style={{ fontSize: '0.73rem', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase' }}>
                    Sai / Lệch mã
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#BE123C', fontWeight: '600', marginTop: '2px' }}>
                    (Lệch CSDL)
                  </div>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#BE123C', lineHeight: 1 }}>
                  {(summary.mismatch_code || 0).toLocaleString()}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3. Search & Filter Toolbar */}
        <div
          className="lpn-missing-toolbar"
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid #EADCC9',
            backgroundColor: '#FAF6F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            flexShrink: 0
          }}
        >
          <div className="lpn-missing-toolbar-filters" style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', flexWrap: 'wrap' }}>
            <div className="search-wrapper lpn-missing-search" style={{ margin: 0, height: '34px', flex: '1 1 200px' }}>
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Tìm Container, SKU, LPN..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Filter Dropdown theo Loại Thông Tin Thiếu */}
            <div className="lpn-missing-select-wrap" style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 1 auto' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#7B5233', whiteSpace: 'nowrap' }}>
                Lọc trường thiếu:
              </span>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
                style={{
                  height: '34px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #D5C7B7',
                  fontSize: '0.82rem',
                  color: '#2D1A12',
                  backgroundColor: '#FFFFFF',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Tất Cả (Thiếu & Sai Mã)</option>
                <option value="mismatch">Dòng Sai Mã / Lệch CSDL</option>
                <option value="image">Thiếu Hình Ảnh (Picture)</option>
                <option value="sku">Thiếu SKU Pallet</option>
                <option value="lpn">Thiếu LPN Pallet</option>
                <option value="date">Thiếu Ngày (Date loading)</option>
                <option value="timestamp">Thiếu Giờ (Timestamp)</option>
                <option value="container">Thiếu Số Container</option>
              </select>
            </div>
          </div>

          <div className="lpn-missing-toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Nút Bổ sung dữ liệu thiếu (chỉ hiện khi ở tab cần xử lý) */}
            {activeTab === 'active' && (
              <button
                type="button"
                className="btn-claim-action btn-claim-primary"
                onClick={handleRetryMissing}
                disabled={retrying}
                style={{
                  height: '34px',
                  padding: '0 14px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  gap: '6px'
                }}
                title="Tìm kiếm và bổ sung các hình ảnh hoặc trường thông tin còn thiếu"
              >
                <Play size={13} fill="currentColor" />
                <span>{retrying ? 'Đang Bổ Sung...' : 'Bổ Sung Dữ Liệu Thiếu'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Retry message toast notice */}
        {retryMessage && (
          <div
            style={{
              padding: '8px 24px',
              backgroundColor: '#ECFDF5',
              borderBottom: '1px solid #A7F3D0',
              color: '#065F46',
              fontSize: '0.82rem',
              fontWeight: '600',
              flexShrink: 0
            }}
          >
            {retryMessage}
          </div>
        )}

        {/* 4. Table Scroll Area */}
        <div
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
            backgroundColor: '#FFFFFF',
            position: 'relative'
          }}
        >
          {loading && items.length > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.55)',
                backdropFilter: 'blur(1px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20
              }}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid #EADCC9',
                  boxShadow: '0 4px 16px rgba(123, 82, 51, 0.12)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#7B5233'
                }}
              >
                Đang nạp dữ liệu...
              </div>
            </div>
          )}

          <table
            className="lpn-table-claim"
            style={{
              width: '100%',
              minWidth: '1000px',
              borderCollapse: 'collapse',
              fontSize: '0.84rem'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#FAF6F0' }}>
                <th style={{ width: '45px', textAlign: 'center', paddingLeft: '24px' }}>STT</th>
                <th style={{ minWidth: '140px' }}>Container number</th>
                <th style={{ minWidth: '150px' }}>Timestamp</th>
                <th style={{ minWidth: '130px' }}>Batch Pallet</th>
                <th style={{ minWidth: '140px' }}>LPN Pallet</th>
                <th style={{ minWidth: '140px' }}>SKU Pallet</th>
                <th style={{ minWidth: '220px', color: '#DC2626' }}>
                  {activeTab === 'unresolved' ? 'Vấn đề ghi nhận' : 'Missing fields'}
                </th>
                {activeTab === 'unresolved' && (
                  <th style={{ minWidth: '220px', color: '#4B5563' }}>Lý do không xử lý được</th>
                )}
                <th style={{ width: '130px', textAlign: 'center', paddingRight: '24px' }}>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === 'unresolved' ? 9 : 8}
                    style={{ textAlign: 'center', padding: '100px 20px', color: '#8D6E63' }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#4A2E1B', marginBottom: '4px' }}>
                      Đang tải danh sách {activeTab === 'unresolved' ? 'không xử lý được' : 'thiếu/lệch dữ liệu'}...
                    </div>
                    <div style={{ fontSize: '0.82rem' }}>Vui lòng chờ trong giây lát</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === 'unresolved' ? 9 : 8}
                    style={{ textAlign: 'center', padding: '100px 20px', color: '#059669', fontWeight: '700' }}
                  >
                    {activeTab === 'unresolved'
                      ? 'Chưa có dòng nào được đánh dấu là không xử lý được.'
                      : 'Tuyệt vời! Không có dòng dữ liệu nào bị thiếu thông tin hoặc sai mã.'}
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => (
                  <tr
                    key={row.item_id || idx}
                    className="claim-row-clickable"
                    style={{
                      borderBottom: '1px solid #F0E6D8',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#8D6E63', paddingLeft: '24px' }}>
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td style={{ fontWeight: '800', color: '#7B5233' }}>
                      {row.container_number || <span style={{ color: '#DC2626' }}>[Rỗng]</span>}
                    </td>
                    <td style={{ fontWeight: '700', color: '#2D1A12' }}>
                      {row.timestamp_raw === '—' || !row.timestamp_raw ? (
                        <span style={{ color: '#DC2626' }}>—</span>
                      ) : (
                        row.timestamp_raw
                      )}
                    </td>
                    <td style={{ fontWeight: '700', color: '#2D1A12' }}>
                      {row.batch_resolved === '—' || !row.batch_resolved ? (
                        <span style={{ color: '#DC2626' }}>—</span>
                      ) : (
                        row.batch_resolved
                      )}
                    </td>
                    <td style={{ fontWeight: '700', color: '#2D1A12' }}>
                      {row.lpn === '—' || !row.lpn ? (
                        <span style={{ color: '#DC2626' }}>—</span>
                      ) : (
                        <div>
                          <div>{row.lpn}</div>
                          {row.is_lpn_match === false && row.detected_lpn && (
                            <div
                              style={{
                                fontSize: '0.67rem',
                                color: '#DC2626',
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Đọc: {row.detected_lpn}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: '700', color: '#2D1A12' }}>
                      {row.sku === '—' || !row.sku ? (
                        <span style={{ color: '#DC2626' }}>—</span>
                      ) : (
                        <div>
                          <div>{row.sku}</div>
                          {row.is_sku_match === false && row.detected_sku && (
                            <div
                              style={{
                                fontSize: '0.67rem',
                                color: '#DC2626',
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Đọc: {row.detected_sku}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Cột Missing fields / Vấn đề ghi nhận */}
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {row.missing_fields &&
                          row.missing_fields.map((mf, mfIdx) => renderMissingBadge(mf, mfIdx))}
                      </div>
                    </td>

                    {/* Cột Lý do không xử lý được (khi ở Tab Unresolved) */}
                    {activeTab === 'unresolved' && (
                      <td>
                        <div
                          style={{
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#991B1B',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            maxWidth: '280px',
                            wordBreak: 'break-word'
                          }}
                        >
                          {row.resolution_note || '(Không có ghi chú)'}
                        </div>
                      </td>
                    )}

                    {/* Cột Thao tác */}
                    <td style={{ textAlign: 'center', paddingRight: '24px' }}>
                      {activeTab === 'active' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetailInspect(row);
                          }}
                          disabled={inspectingLoadingId === (row.item_id || row.id)}
                          style={{
                            border: '1px solid #7B5233',
                            backgroundColor: '#FFFBF7',
                            color: '#7B5233',
                            padding: '5px 14px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#7B5233';
                            e.currentTarget.style.color = '#FFFFFF';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FFFBF7';
                            e.currentTarget.style.color = '#7B5233';
                          }}
                          title="Bấm để mở giao diện kiểm tra chi tiết và xử lý dòng này"
                        >
                          {inspectingLoadingId === (row.item_id || row.id) ? 'Đang mở...' : 'Xử lý'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnresolveAction(row);
                          }}
                          disabled={actionLoading}
                          style={{
                            border: '1px solid #059669',
                            backgroundColor: '#ECFDF5',
                            color: '#065F46',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#059669';
                            e.currentTarget.style.color = '#FFFFFF';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ECFDF5';
                            e.currentTarget.style.color = '#065F46';
                          }}
                          title="Khôi phục dòng này về danh sách cần xử lý"
                        >
                          <RotateCcw size={13} />
                          Khôi phục
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Footer with Numbered Pagination */}
        <div
          className="lpn-missing-footer"
          style={{
            padding: '10px 20px',
            borderTop: '1px solid #EADCC9',
            backgroundColor: '#FAF6F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: '0.82rem', color: '#8D6E63', fontWeight: '600' }}>
            Hiển thị <b>{startIdx}</b>–<b>{endIdx}</b> trên <b>{total}</b> dòng{' '}
            {activeTab === 'unresolved' ? 'không xử lý được' : 'cần kiểm tra (thiếu / sai mã)'}
          </div>

          <div className="lpn-missing-footer-btns" style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="lpn-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              title="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>

            {getPageButtons().map((b, bIdx) =>
              b === '...' ? (
                <span key={`e-${bIdx}`} style={{ color: '#8D6E63', fontSize: '0.75rem', padding: '0 3px' }}>
                  ...
                </span>
              ) : (
                <button
                  key={b}
                  type="button"
                  className={`lpn-page-btn ${b === page ? 'active' : ''}`}
                  onClick={() => setPage(b)}
                >
                  {b}
                </button>
              )
            )}

            <button
              type="button"
              className="lpn-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              title="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* 6. GIAO DIỆN KIỂM TRA CHI TIẾT (MỞ TRỰC TIẾP KHI BẤM NÚT XỬ LÝ) */}
        {inspectingItemDetail && (
          <DetailModal
            item={inspectingItemDetail}
            itemsList={items}
            onNavigate={async (nextItem) => {
              if (nextItem) {
                const targetId = nextItem.item_id || nextItem.id;
                if (targetId) {
                  const detail = await lpnCrawlerApi.getItemDetail(targetId).catch(() => nextItem);
                  setInspectingItemDetail(detail || nextItem);
                } else {
                  setInspectingItemDetail(nextItem);
                }
              }
            }}
            onClose={() => setInspectingItemDetail(null)}
            onResolveSuccess={async (status) => {
              setInspectingItemDetail(null);
              await fetchMissingRows();
              if (onRefreshKpi) onRefreshKpi();
            }}
          />
        )}
      </div>
    </div>
  );
};
