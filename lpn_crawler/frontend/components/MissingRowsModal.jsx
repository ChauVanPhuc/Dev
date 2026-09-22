import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, AlertTriangle, Play, Tag, Image, Layers } from 'lucide-react';
import { lpnCrawlerApi } from '../services/api';

export const MissingRowsModal = ({
  isOpen,
  onClose,
  onSelectItem,
  onStartCrawl,
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
    missing_image: 0
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState(null);

  // Scope hiển thị: true = chỉ trong khoảng hiển thị, false = toàn bộ database
  const [useDateRange, setUseDateRange] = useState(!isAllTime && (!!startDate || !!endDate));

  useEffect(() => {
    if (isOpen) {
      setUseDateRange(!isAllTime && (!!startDate || !!endDate));
      setPage(1);
    }
  }, [isOpen, startDate, endDate, isAllTime]);

  useEffect(() => {
    if (isOpen) {
      fetchMissingRows();
    }
  }, [isOpen, page, search, filterType, useDateRange]);

  const fetchMissingRows = async () => {
    setLoading(true);
    try {
      const params = {
        search,
        missing_type: filterType === 'all' ? undefined : filterType,
        page,
        page_size: pageSize
      };
      if (useDateRange) {
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
      console.error(e);
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
    } catch (e) {
      setRetryMessage('Lỗi khi tải lại dữ liệu thiếu.');
      setTimeout(() => setRetryMessage(null), 4000);
    } finally {
      setRetrying(false);
    }
  };

  const renderMissingBadge = (field, idx) => {
    const fLower = (field || '').toLowerCase();
    let bg = '#FEE2E2';
    let border = '#FCA5A5';
    let color = '#991B1B';

    if (fLower.includes('hình ảnh') || fLower.includes('picture') || fLower.includes('image')) {
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
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          width: 'min(96vw, 1260px)',
          height: '88vh',
          maxHeight: '900px',
          minHeight: '560px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          border: '1px solid #EADCC9',
          animation: 'modalScaleUp 0.18s ease-out forwards',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #EADCC9',
            backgroundColor: '#FFFDFB',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#4E3629' }}>
                  Danh Sách Thiếu Dữ Liệu
                </h2>
                {(startDate || endDate || dateRangeLabel) && (
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: useDateRange ? '#FEF2F2' : '#F1F5F9',
                      color: useDateRange ? '#DC2626' : '#64748B',
                      border: `1px solid ${useDateRange ? '#FCA5A5' : '#CBD5E1'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {useDateRange ? `Khoảng: ${dateRangeLabel || `${startDate} - ${endDate}`}` : 'Toàn bộ database'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#8D6E63', marginTop: '2px' }}>
                {useDateRange 
                  ? `Chỉ hiển thị dòng thiếu trong khoảng thời gian đang hiển thị (${dateRangeLabel || `${startDate} - ${endDate}`})` 
                  : 'Đang hiển thị toàn bộ dòng thiếu trong database'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Toggle Khoảng thời gian vs Toàn bộ */}
            {(startDate || endDate || dateRangeLabel) && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#F5EBE1',
                  borderRadius: '8px',
                  padding: '3px',
                  gap: '2px',
                  border: '1px solid #E2D3C2'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!useDateRange) {
                      setUseDateRange(true);
                      setPage(1);
                    }
                  }}
                  style={{
                    border: 'none',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: useDateRange ? '#FFFFFF' : 'transparent',
                    color: useDateRange ? '#DC2626' : '#785A46',
                    boxShadow: useDateRange ? '0 1px 4px rgba(220, 38, 38, 0.15)' : 'none'
                  }}
                  title="Chỉ hiển thị dòng thiếu trong khoảng thời gian KPI"
                >
                  📅 Theo khoảng ({dateRangeLabel || 'Gần nhất'})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (useDateRange) {
                      setUseDateRange(false);
                      setPage(1);
                    }
                  }}
                  style={{
                    border: 'none',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: !useDateRange ? '#FFFFFF' : 'transparent',
                    color: !useDateRange ? '#4E3629' : '#785A46',
                    boxShadow: !useDateRange ? '0 1px 4px rgba(78, 54, 41, 0.15)' : 'none'
                  }}
                  title="Xem tất cả dòng thiếu trong toàn bộ database"
                >
                  Toàn bộ
                </button>
              </div>
            )}

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
          style={{
            padding: '12px 24px',
            backgroundColor: '#FAF6F0',
            borderBottom: '1px solid #EADCC9',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '12px',
            flexShrink: 0
          }}
        >
          {/* Card 1: Tổng dòng thiếu */}
          <div
            onClick={() => { setFilterType('all'); setPage(1); }}
            style={{
              backgroundColor: filterType === 'all' ? '#FEF2F2' : '#FFFFFF',
              border: `1.5px solid ${filterType === 'all' ? '#DC2626' : '#EADCC9'}`,
              borderRadius: '8px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: filterType === 'all' ? '0 2px 8px rgba(220, 38, 38, 0.12)' : 'none'
            }}
            title="Bấm để lọc tất cả các dòng thiếu"
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase' }}>
                Tổng dòng thiếu
              </div>
              {useDateRange && dateRangeLabel && (
                <div style={{ fontSize: '0.65rem', color: '#DC2626', fontWeight: '600', marginTop: '2px' }}>
                  ({dateRangeLabel})
                </div>
              )}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#DC2626', lineHeight: 1 }}>
              {(summary.total_missing !== undefined ? summary.total_missing : total).toLocaleString()}
            </div>
          </div>

          {/* Card 2: Thiếu LPN */}
          <div
            onClick={() => { setFilterType('lpn'); setPage(1); }}
            style={{
              backgroundColor: filterType === 'lpn' ? '#EFF6FF' : '#FFFFFF',
              border: `1.5px solid ${filterType === 'lpn' ? '#2563EB' : '#EADCC9'}`,
              borderRadius: '8px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: filterType === 'lpn' ? '0 2px 8px rgba(37, 99, 235, 0.12)' : 'none'
            }}
            title="Bấm để lọc các dòng thiếu mã LPN"
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase' }}>
              Thiếu mã LPN
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1E40AF', lineHeight: 1 }}>
              {(summary.missing_lpn || 0).toLocaleString()}
            </div>
          </div>

          {/* Card 3: Thiếu SKU */}
          <div
            onClick={() => { setFilterType('sku'); setPage(1); }}
            style={{
              backgroundColor: filterType === 'sku' ? '#F3E8FF' : '#FFFFFF',
              border: `1.5px solid ${filterType === 'sku' ? '#7C3AED' : '#EADCC9'}`,
              borderRadius: '8px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: filterType === 'sku' ? '0 2px 8px rgba(124, 58, 237, 0.12)' : 'none'
            }}
            title="Bấm để lọc các dòng thiếu mã SKU"
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase' }}>
              Thiếu mã SKU
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#6B21A8', lineHeight: 1 }}>
              {(summary.missing_sku || 0).toLocaleString()}
            </div>
          </div>

          {/* Card 4: Thiếu Hình Ảnh */}
          <div
            onClick={() => { setFilterType('image'); setPage(1); }}
            style={{
              backgroundColor: filterType === 'image' ? '#FEF3C7' : '#FFFFFF',
              border: `1.5px solid ${filterType === 'image' ? '#D97706' : '#EADCC9'}`,
              borderRadius: '8px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: filterType === 'image' ? '0 2px 8px rgba(217, 119, 6, 0.12)' : 'none'
            }}
            title="Bấm để lọc các dòng thiếu hình ảnh"
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase' }}>
              Thiếu Hình Ảnh
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#92400E', lineHeight: 1 }}>
              {(summary.missing_image || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* 2. Search & Filter Toolbar */}
        <div
          style={{
            padding: '10px 24px',
            borderBottom: '1px solid #EADCC9',
            backgroundColor: '#FAF6F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '320px' }}>
            <div className="search-wrapper" style={{ margin: 0, height: '34px', width: '280px' }}>
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

            {/* Filter Dropdown theo Loại Thông Tin Thiếu (Không có icon) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  padding: '0 12px',
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
                <option value="all">Tất Cả Các Trường Thiếu</option>
                <option value="image">Thiếu Hình Ảnh (Picture)</option>
                <option value="sku">Thiếu SKU Pallet</option>
                <option value="lpn">Thiếu LPN Pallet</option>
                <option value="date">Thiếu Ngày (Date loading)</option>
                <option value="timestamp">Thiếu Giờ (Timestamp)</option>
                <option value="container">Thiếu Số Container</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Nút Bổ sung dữ liệu thiếu */}
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

        {/* 3. Table Scroll Area */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0, backgroundColor: '#FFFFFF', position: 'relative' }}>
          {/* Subtle loading overlay khi đổi filter/trang mà đã có dữ liệu */}
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
                Đang lọc dữ liệu...
              </div>
            </div>
          )}

          <table
            className="lpn-table-claim"
            style={{
              width: '100%',
              minWidth: '950px',
              borderCollapse: 'collapse',
              fontSize: '0.84rem'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#FAF6F0' }}>
                <th style={{ width: '45px', textAlign: 'center', paddingLeft: '24px' }}>STT</th>
                <th style={{ minWidth: '150px' }}>Container number</th>
                <th style={{ minWidth: '160px' }}>Timestamp</th>
                <th style={{ minWidth: '140px' }}>Batch Pallet</th>
                <th style={{ minWidth: '140px' }}>LPN Pallet</th>
                <th style={{ minWidth: '150px' }}>SKU Pallet</th>
                <th style={{ minWidth: '240px', paddingRight: '24px', color: '#DC2626' }}>Missing fields</th>
              </tr>
            </thead>

            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '100px 20px', color: '#8D6E63' }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#4A2E1B', marginBottom: '4px' }}>
                      Đang tải danh sách thiếu dữ liệu...
                    </div>
                    <div style={{ fontSize: '0.82rem' }}>Vui lòng chờ trong giây lát</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '100px 20px', color: '#059669', fontWeight: '700' }}>
                    Không có dòng dữ liệu nào bị thiếu thông tin phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => (
                  <tr
                    key={row.item_id || idx}
                    className="claim-row-clickable"
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid #F0E6D8',
                      transition: 'background-color 0.15s'
                    }}
                    onClick={() => {
                      if (onSelectItem) {
                        onSelectItem(row.item_id);
                      }
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
                        row.lpn
                      )}
                    </td>
                    <td style={{ fontWeight: '700', color: '#2D1A12' }}>
                      {row.sku === '—' || !row.sku ? (
                        <span style={{ color: '#DC2626' }}>—</span>
                      ) : (
                        row.sku
                      )}
                    </td>

                    {/* Cột Missing fields (không icon) */}
                    <td style={{ paddingRight: '24px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {row.missing_fields && row.missing_fields.map((mf, mfIdx) => renderMissingBadge(mf, mfIdx))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Footer with Numbered Pagination */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #EADCC9',
            backgroundColor: '#FFFDFB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: '0.82rem', color: '#8D6E63', fontWeight: '600' }}>
            Hiển thị <b>{startIdx}</b>–<b>{endIdx}</b> trên <b>{total}</b> dòng thiếu dữ liệu
          </div>

          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
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
      </div>
    </div>
  );
};
