import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, RotateCw, AlertCircle, Info, AlertTriangle, FileText,
  ChevronLeft, ChevronRight, LayoutGrid, Check, Trash2, X,
  CheckCircle2, FastForward, RotateCcw, PlayCircle
} from 'lucide-react';
import { lpnCrawlerApi } from '../services/api';

export const LogModal = ({ jobId, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [logStats, setLogStats] = useState({
    total: 0,
    successCount: 0,
    skipCount: 0,
    recoveryCount: 0,
    infoCount: 0,
    actionCount: 0,
    warnCount: 0,
    errCount: 0,
    domCount: 0,
    otherCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isRowsDropdownOpen, setIsRowsDropdownOpen] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Debounce search text
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleWindowClick = () => setIsRowsDropdownOpen(false);
    if (isRowsDropdownOpen) {
      window.addEventListener('click', handleWindowClick);
    }
    return () => window.removeEventListener('click', handleWindowClick);
  }, [isRowsDropdownOpen]);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await lpnCrawlerApi.getLogs({
        jobId: jobId || null,
        page: page,
        pageSize: pageSize === Infinity ? 500 : pageSize,
        search: debouncedSearch,
        level: filterLevel
      });

      if (res && res.items) {
        setLogs(res.items);
        setTotalLogs(res.total || 0);
        setTotalPages(res.total_pages || 1);
        if (res.stats) {
          setLogStats({
            total: res.stats.total || 0,
            successCount: res.stats.success || 0,
            skipCount: res.stats.skip || 0,
            recoveryCount: res.stats.recovery || 0,
            infoCount: res.stats.info || 0,
            actionCount: res.stats.action || 0,
            warnCount: res.stats.warning || 0,
            errCount: res.stats.error || 0,
            domCount: res.stats.dom_changed || 0,
            otherCount: res.stats.other || 0
          });
        }
      } else if (Array.isArray(res)) {
        setLogs(res);
        setTotalLogs(res.length);
        setTotalPages(1);
      }
    } catch (e) {
      console.error('[LogModal] Fetch logs error:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(false);
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId, page, pageSize, filterLevel, debouncedSearch]);

  const handleClearLogs = () => {
    if (totalLogs === 0 && logStats.total === 0) {
      alert('Hiện tại chưa có bản ghi nhật ký log nào trong cơ sở dữ liệu.');
      return;
    }
    setShowClearConfirmModal(true);
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await lpnCrawlerApi.clearLogs(null);
      setLogs([]);
      setTotalLogs(0);
      setLogStats({
        total: 0,
        successCount: 0,
        skipCount: 0,
        recoveryCount: 0,
        infoCount: 0,
        actionCount: 0,
        warnCount: 0,
        errCount: 0,
        domCount: 0,
        otherCount: 0
      });
      setShowClearConfirmModal(false);
    } catch (e) {
      alert(e.message || 'Lỗi khi xóa nhật ký log');
    } finally {
      setIsClearing(false);
    }
  };

  const formatLogTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const cleanStr = String(dateStr).trim().replace('T', ' ');
      if (cleanStr.length >= 19) {
        return cleanStr.substring(0, 19);
      }
      return cleanStr;
    } catch (e) {}
    return String(dateStr).replace('T', ' ').substring(0, 19);
  };

  // Reset về trang 1 khi thay đổi điều kiện lọc
  useEffect(() => {
    setPage(1);
  }, [filterLevel, pageSize]);

  const isAll = pageSize === Infinity;
  const startIdx = totalLogs === 0 ? 0 : (page - 1) * (isAll ? totalLogs : pageSize) + 1;
  const endIdx = isAll ? totalLogs : Math.min(page * pageSize, totalLogs);

  const getPageButtons = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const getLevelBadge = (level) => {
    const lvl = (level || 'INFO').toUpperCase();
    switch (lvl) {
      case 'SUCCESS':
        return (
          <span
            style={{
              backgroundColor: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <CheckCircle2 size={12} />
            SUCCESS
          </span>
        );
      case 'SKIP':
        return (
          <span
            style={{
              backgroundColor: '#F0F9FF',
              color: '#0284C7',
              border: '1px solid #BAE6FD',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FastForward size={12} />
            SKIP
          </span>
        );
      case 'RECOVERY':
        return (
          <span
            style={{
              backgroundColor: '#EEF2FF',
              color: '#4F46E5',
              border: '1px solid #C7D2FE',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RotateCcw size={12} />
            RECOVERY
          </span>
        );
      case 'ACTION':
        return (
          <span
            style={{
              backgroundColor: '#FFFBEB',
              color: '#D97706',
              border: '1px solid #FDE68A',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <PlayCircle size={12} />
            ACTION
          </span>
        );
      case 'WARNING':
        return (
          <span
            style={{
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              border: '1px solid #FCD34D',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <AlertTriangle size={12} />
            WARNING
          </span>
        );
      case 'ERROR':
        return (
          <span
            style={{
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FCA5A5',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <AlertCircle size={12} />
            ERROR
          </span>
        );
      case 'DOM_CHANGED':
      case 'DOM_SELECTOR_CHANGED':
        return (
          <span
            style={{
              backgroundColor: '#FAF5FF',
              color: '#7E22CE',
              border: '1px solid #E9D5FF',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <LayoutGrid size={12} />
            DOM_CHANGED
          </span>
        );
      default:
        return (
          <span
            style={{
              backgroundColor: '#F1F5F9',
              color: '#475569',
              border: '1px solid #CBD5E1',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Info size={12} />
            INFO
          </span>
        );
    }
  };

  const pageSizeOptions = [10, 15, 20, 25, 50, 100, 'all'];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
          maxWidth: '1200px',
          width: 'min(96vw, 1200px)',
          height: '85vh',
          minHeight: '560px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          border: '1px solid #EADCC9',
          animation: 'modalScaleUp 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FFFDFB',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#FAF6F0',
                border: '1px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7B5233'
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#4E3629' }}>
                Tiến trình việc lấy dữ liệu (System Logs)
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                Tổng cộng <b>{logStats.total.toLocaleString()}</b> bản ghi nhật ký hệ thống
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.6rem',
              lineHeight: 1,
              color: '#4E3629',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            &times;
          </button>
        </div>

        {/* 2. Filter bar (Có Nút Hiển Thị Số Dòng chuẩn đẹp ở trên) */}
        <div
          style={{
            padding: '10px 24px',
            borderBottom: '1px solid #F0E6D8',
            backgroundColor: '#FAF6F0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Ô tìm kiếm */}
            <div className="search-wrapper" style={{ margin: 0, height: '34px', width: '260px' }}>
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Tìm nội dung / Container..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Bộ lọc mức độ */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={{
                height: '34px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #D5C7B7',
                fontSize: '0.82rem',
                color: '#2D1A12',
                backgroundColor: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="">Tất cả mức độ</option>
              <option value="SUCCESS">SUCCESS (Thành công)</option>
              <option value="SKIP">SKIP (Bỏ qua - Đã đủ)</option>
              <option value="RECOVERY">RECOVERY (Bù đắp dữ liệu)</option>
              <option value="INFO">INFO (Thông tin)</option>
              <option value="ACTION">ACTION (Thao tác / Sự kiện)</option>
              <option value="WARNING">WARNING (Cảnh báo)</option>
              <option value="ERROR">ERROR (Lỗi hệ thống)</option>
              <option value="DOM_CHANGED">DOM_CHANGED (Đổi giao diện)</option>
            </select>

            {/* Nút Chọn Hiển Thị Số Dòng Chuẩn Phong Cách Ngoài Web */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRowsDropdownOpen(!isRowsDropdownOpen);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '34px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: '1px solid #D5C7B7',
                  backgroundColor: '#FFFFFF',
                  color: '#2D1A12',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <LayoutGrid size={13} strokeWidth={2.5} />
                <span>Hiển thị: {isAll ? 'Tất cả' : `${pageSize} dòng`}</span>
                <span style={{ fontSize: '0.7rem' }}>▾</span>
              </button>

              {/* Menu Popup Chọn Số Dòng */}
              {isRowsDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    width: '150px',
                    padding: '4px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EADCC9',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(123, 82, 51, 0.15)',
                    zIndex: 1200,
                    boxSizing: 'border-box'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {pageSizeOptions.map((opt) => {
                    const label = opt === 'all' ? 'Tất cả' : `${opt} dòng`;
                    const isSelected = opt === 'all' ? isAll : pageSize === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setPageSize(opt === 'all' ? Infinity : opt);
                          setIsRowsDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '8px 14px',
                          border: 'none',
                          background: isSelected ? '#FAF6F0' : 'none',
                          color: isSelected ? '#7B5233' : '#4B5563',
                          fontWeight: isSelected ? '700' : '500',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = '#F9FAFB';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'none';
                        }}
                      >
                        <span>{label}</span>
                        {isSelected && <Check size={13} color="#7B5233" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleClearLogs}
              style={{
                height: '34px',
                padding: '0 12px',
                gap: '6px',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FEE2E2';
                e.currentTarget.style.borderColor = '#FCA5A5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FEF2F2';
                e.currentTarget.style.borderColor = '#FECACA';
              }}
              title="Xóa toàn bộ lịch sử log trong CSDL"
            >
              <Trash2 size={14} />
              <span>Xóa Log</span>
            </button>

            <button
              type="button"
              className="btn-claim-action btn-claim-secondary"
              onClick={() => fetchLogs(false)}
              style={{ height: '34px', padding: '0 12px', gap: '6px' }}
            >
              <RotateCw size={14} />
              <span>Làm Mới</span>
            </button>
          </div>
        </div>

        {/* 3. Log Table Body */}
        <div style={{ padding: 0, overflowY: 'auto', overflowX: 'hidden', flex: 1, backgroundColor: '#FFFFFF', minHeight: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6B7280' }}>
              Đang tải nhật ký hệ thống...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
              Không tìm thấy bản ghi log nào phù hợp.
            </div>
          ) : (
            <table className="lpn-table-claim" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0' }}>
                <tr style={{ borderBottom: '1px solid #EADCC9' }}>
                  <th style={{ width: '160px', paddingLeft: '24px', textAlign: 'left', backgroundColor: '#FAF6F0' }}>Thời Gian</th>
                  <th style={{ width: '110px', textAlign: 'center', backgroundColor: '#FAF6F0' }}>Mức Độ</th>
                  <th style={{ width: '150px', textAlign: 'left', backgroundColor: '#FAF6F0' }}>Container</th>
                  <th style={{ paddingRight: '24px', textAlign: 'left', backgroundColor: '#FAF6F0' }}>Nội Dung Chi Tiết</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log.id || idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td
                      style={{
                        paddingLeft: '24px',
                        color: '#6B7280',
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {formatLogTime(log.created_at)}
                    </td>
                    <td style={{ textAlign: 'center' }}>{getLevelBadge(log.level)}</td>
                    <td
                      style={{
                        fontWeight: '700',
                        color: '#4E3629',
                        fontSize: '0.82rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {log.container_number || '—'}
                    </td>
                    <td style={{ paddingRight: '24px', color: '#2D1A12', fontSize: '0.84rem', lineHeight: '1.4', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      <div>{log.message}</div>
                      {log.details && (
                        <div
                          style={{
                            marginTop: '4px',
                            fontSize: '0.75rem',
                            color: '#6B7280',
                            fontFamily: 'monospace',
                            backgroundColor: '#F9FAFB',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #E5E7EB',
                            wordBreak: 'break-all',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {log.details}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. Footer with Clean Pagination */}
        <div
          style={{
            padding: '10px 24px',
            borderTop: '1px solid #EADCC9',
            backgroundColor: '#FAF6F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: '0.82rem', color: '#7B5233', fontWeight: '600' }}>
            {isAll ? (
              <>Hiển thị tất cả <b>{totalLogs.toLocaleString()}</b> bản ghi log</>
            ) : (
              <>Hiển thị <b>{startIdx.toLocaleString()}</b>–<b>{endIdx.toLocaleString()}</b> trên <b>{totalLogs.toLocaleString()}</b> bản ghi log</>
            )}
          </div>

          {!isAll && totalPages > 1 && (
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                type="button"
                className="lpn-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Trang trước"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  border: '1px solid #D5C7B7',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7B5233',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.4 : 1
                }}
              >
                <ChevronLeft size={15} />
              </button>

              {getPageButtons().map((b, bIdx) =>
                b === '...' ? (
                  <span key={`e-${bIdx}`} style={{ color: '#8D6E63', fontSize: '0.75rem', padding: '0 4px' }}>
                    ...
                  </span>
                ) : (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setPage(b)}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '6px',
                      border: b === page ? '1px solid #7B5233' : '1px solid #D5C7B7',
                      backgroundColor: b === page ? '#7B5233' : '#FFFFFF',
                      color: b === page ? '#FFFFFF' : '#4E3629',
                      fontSize: '0.8rem',
                      fontWeight: b === page ? '800' : '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {b}
                  </button>
                )
              )}

              <button
                type="button"
                className="lpn-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="Trang sau"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  border: '1px solid #D5C7B7',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7B5233',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.4 : 1
                }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Custom Confirmation Dialog for Clearing Logs */}
        {showClearConfirmModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => !isClearing && setShowClearConfirmModal(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                width: 'min(94vw, 460px)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
                border: '1px solid #EADCC9',
                animation: 'modalScaleUp 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: '16px 20px 14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #F0E6D8',
                  backgroundColor: '#FFFDFB'
                }}
              >
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#4E3629' }}>
                  Xác Nhận Xóa Nhật Ký Hệ Thống
                </h3>

                <button
                  type="button"
                  onClick={() => !isClearing && setShowClearConfirmModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    lineHeight: 1,
                    color: '#8D6E63',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Đóng"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Body Content */}
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    fontSize: '0.85rem',
                    color: '#991B1B',
                    fontWeight: '600',
                    lineHeight: '1.5',
                    wordBreak: 'break-word'
                  }}
                >
                  Bạn có chắc chắn muốn xóa toàn bộ <b>{logStats.total.toLocaleString()}</b> dòng nhật ký hệ thống? Dữ liệu và lịch sử nhật ký sẽ bị xóa vĩnh viễn khỏi CSDL.
                </div>

                <div
                  style={{
                    backgroundColor: '#FAF6F0',
                    border: '1px solid #EADCC9',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '0.84rem',
                    color: '#2D1A12',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ fontWeight: '700', color: '#4E3629', borderBottom: '1px solid #EADCC9', paddingBottom: '5px', marginBottom: '2px' }}>
                    Chi tiết số lượng dòng theo loại:
                  </div>
                  {logStats.successCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>- SUCCESS (Thành công):</span>
                      <span style={{ fontWeight: '700' }}>{logStats.successCount.toLocaleString()} dòng</span>
                    </div>
                  )}
                  {logStats.skipCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>- SKIP (Bỏ qua - Đã đủ):</span>
                      <span style={{ fontWeight: '700' }}>{logStats.skipCount.toLocaleString()} dòng</span>
                    </div>
                  )}
                  {logStats.recoveryCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>- RECOVERY (Bù đắp dữ liệu):</span>
                      <span style={{ fontWeight: '700' }}>{logStats.recoveryCount.toLocaleString()} dòng</span>
                    </div>
                  )}
                  {logStats.infoCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>- INFO (Thông tin):</span>
                      <span style={{ fontWeight: '700' }}>{logStats.infoCount.toLocaleString()} dòng</span>
                    </div>
                  )}
                  {logStats.actionCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>- ACTION (Thao tác / Sự kiện):</span>
                      <span style={{ fontWeight: '700' }}>{logStats.actionCount.toLocaleString()} dòng</span>
                    </div>
                  )}
                  {logStats.warnCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>- WARNING (Cảnh báo):</span>
                      <span style={{ fontWeight: '700' }}>{logStats.warnCount.toLocaleString()} dòng</span>
                    </div>
                  )}
                  {logStats.errCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>- ERROR (Lỗi hệ thống):</span>
                      <span style={{ fontWeight: '700' }}>{logStats.errCount.toLocaleString()} dòng</span>
                    </div>
                  )}
                  {logStats.domCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>- DOM_CHANGED:</span>
                      <span style={{ fontWeight: '700' }}>{logStats.domCount.toLocaleString()} dòng</span>
                    </div>
                  )}
                  {logStats.otherCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>- Loại khác:</span>
                      <span style={{ fontWeight: '700' }}>{logStats.otherCount.toLocaleString()} dòng</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#FAF6F0',
                  borderTop: '1px solid #EADCC9',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px'
                }}
              >
                <button
                  type="button"
                  className="btn-claim-action btn-claim-secondary"
                  onClick={() => setShowClearConfirmModal(false)}
                  disabled={isClearing}
                  style={{
                    height: '34px',
                    padding: '0 16px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5C7B7',
                    color: '#4E3629'
                  }}
                >
                  Hủy Bỏ
                </button>

                <button
                  type="button"
                  className="btn-claim-action btn-claim-primary"
                  onClick={handleConfirmClear}
                  disabled={isClearing}
                  style={{
                    height: '34px',
                    padding: '0 18px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    backgroundColor: '#DC2626',
                    borderColor: '#DC2626',
                    color: '#FFFFFF'
                  }}
                >
                  {isClearing ? 'Đang xóa...' : `Xóa ${logStats.total.toLocaleString()} Dòng`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
