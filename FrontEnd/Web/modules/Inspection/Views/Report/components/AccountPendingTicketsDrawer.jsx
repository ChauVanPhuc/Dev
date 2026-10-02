import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Clock,
  Package,
  ArrowLeft,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${mins} | ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const AccountPendingTicketsDrawer = ({
  isOpen,
  onClose,
  account,
  onSelectTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState('all'); // 'all' | 'pass' | 'fail' | 'tra-ve'
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Bắt phím Escape để đóng màn hình nếu không có popup con nào đang mở
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        const modalOnTop = document.querySelector('.modal-overlay');
        if (!modalOnTop) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset trang khi lọc hoặc tìm kiếm thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterResult, pageSize]);

  const filteredTasks = useMemo(() => {
    if (!account || !Array.isArray(account.tasks)) return [];
    let list = account.tasks;

    if (filterResult === 'pending') {
      list = list.filter(t => !t.is_confirmed);
    } else if (filterResult === 'confirmed') {
      list = list.filter(t => t.is_confirmed === true);
    } else if (filterResult === 'pass') {
      list = list.filter(t => t.result === 'pass' || t.result === 'Đạt' || t.result === 'excellent');
    } else if (filterResult === 'fail') {
      list = list.filter(t => t.result === 'fail' || t.result === 'Không đạt');
    } else if (filterResult === 'tra-ve') {
      list = list.filter(t => t.action === 'tra-ve');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        (t.ticket_code && t.ticket_code.toLowerCase().includes(q)) ||
        (t.batch_no && t.batch_no.toLowerCase().includes(q)) ||
        (t.part_name && t.part_name.toLowerCase().includes(q)) ||
        (t.specification && t.specification.toLowerCase().includes(q)) ||
        (t.stage && t.stage.toLowerCase().includes(q))
      );
    }

    return list;
  }, [account, searchQuery, filterResult]);

  const totalTasks = filteredTasks.length;
  const totalPages = Math.ceil(totalTasks / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedTasks = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, safeCurrentPage, pageSize]);

  const renderPageNumbers = () => {
    const pages = [];
    const delta = 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages.map((p, idx) => {
      if (p === '...') {
        return (
          <span key={`ell-${idx}`} style={{ padding: '0 4px', color: '#8D6E63', fontWeight: '700' }}>
            ...
          </span>
        );
      }
      return (
        <button
          key={p}
          type="button"
          className={`page-btn ${safeCurrentPage === p ? 'active' : ''}`}
          onClick={() => setCurrentPage(p)}
          style={{
            minWidth: '28px',
            height: '28px',
            borderRadius: '6px',
            fontWeight: '700',
            fontSize: '0.8rem',
            cursor: 'pointer',
            border: safeCurrentPage === p ? '1px solid #7B5233' : '1px solid #EADCC9',
            backgroundColor: safeCurrentPage === p ? '#7B5233' : '#FFFFFF',
            color: safeCurrentPage === p ? '#FFFFFF' : '#7B5233',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {p}
        </button>
      );
    });
  };

  if (!isOpen || !account) return null;

  return (
    <>
      {/* Màn hình Full bên trong dashboard-content */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#F8F5F1',
          zIndex: 90,
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: "'Outfit', 'Inter', sans-serif",
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.99); }
            to { opacity: 1; transform: scale(1); }
          }
          .ticket-desktop-view {
            display: flex !important;
            flex-direction: column;
            flex: 1 1 0%;
            min-height: 0;
            height: 100%;
            overflow: hidden;
          }
          .ticket-mobile-view {
            display: none !important;
          }
          .ticket-table-row:hover {
            background-color: #FAF4EE !important;
          }
          .pagination-mobile-sticky {
            display: none !important;
          }
          @media (max-width: 768px) {
            .pagination-mobile-sticky {
              display: flex !important;
              position: sticky !important;
              bottom: 12px !important;
              margin: 10px auto 4px auto !important;
              max-width: fit-content !important;
              background: rgba(255, 255, 255, 0.96) !important;
              backdrop-filter: blur(10px) !important;
              -webkit-backdrop-filter: blur(10px) !important;
              border: 1px solid #EADCC9 !important;
              border-radius: 100px !important;
              box-shadow: 0 4px 20px rgba(123, 82, 51, 0.18) !important;
              padding: 6px 16px !important;
              justify-content: center !important;
              align-items: center !important;
              gap: 14px !important;
              z-index: 999 !important;
              width: auto !important;
            }
            .pagination-mobile-sticky .page-btn {
              min-width: 28px;
              height: 28px;
              border-radius: 50%;
              border: 1px solid #EADCC9;
              background-color: #FAF5EE;
              color: #7B5233;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            }
            .pagination-mobile-sticky .page-btn:disabled {
              opacity: 0.35;
              cursor: not-allowed;
            }
            .ticket-desktop-view {
              display: none !important;
            }
            .ticket-mobile-view {
              display: flex !important;
              flex-direction: column;
              gap: 8px;
              overflow-y: auto;
              padding: 10px 12px;
              flex: 1 1 0%;
            }
            .account-full-header {
              padding: 8px 12px !important;
              gap: 6px !important;
              flex-direction: column !important;
              align-items: stretch !important;
            }
            .account-header-top-row {
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              width: 100% !important;
              gap: 8px !important;
            }
            .account-kpi-chips-row {
              display: flex !important;
              align-items: center !important;
              gap: 6px !important;
              width: 100% !important;
              flex-wrap: nowrap !important;
              overflow-x: auto !important;
            }
            .account-controls-bar {
              padding: 8px 12px !important;
              gap: 6px !important;
              flex-direction: column !important;
              align-items: stretch !important;
            }
            .account-search-wrap {
              max-width: 100% !important;
              flex: 1 1 auto !important;
            }
            .account-search-input {
              height: 32px !important;
              font-size: 0.78rem !important;
            }
            .account-filter-scroll-row {
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              gap: 6px !important;
              width: 100% !important;
              overflow-x: auto !important;
              padding-bottom: 2px !important;
            }
            .account-filter-pills {
              display: flex !important;
              gap: 4px !important;
              flex-shrink: 0 !important;
            }
            .account-filter-pill-btn {
              padding: 4px 8px !important;
              font-size: 0.74rem !important;
              border-radius: 5px !important;
              white-space: nowrap !important;
            }
            .account-pagesize-wrap {
              display: flex !important;
              align-items: center !important;
              gap: 4px !important;
              flex-shrink: 0 !important;
            }
            .account-pagesize-select {
              height: 28px !important;
              font-size: 0.74rem !important;
              padding: 0 4px !important;
            }
            .account-footer-bar {
              flex-direction: column !important;
              align-items: center !important;
              padding: 8px 12px !important;
              gap: 6px !important;
            }
            .mobile-only {
              display: flex !important;
            }
            .desktop-only {
              display: none !important;
            }
          }
          @media (min-width: 769px) {
            .mobile-only {
              display: none !important;
            }
            .desktop-only {
              display: flex !important;
            }
          }
        `}</style>

        {/* 1. Header Toàn màn hình */}
        <div className="account-full-header" style={{
          padding: '12px 20px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #EADCC9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexShrink: 0,
          boxShadow: '0 1px 4px rgba(45, 26, 18, 0.04)'
        }}>
          {/* Cụm Nút Back & Thông tin kiểm tra viên */}
          <div className="account-header-top-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  borderRadius: '7px',
                  border: '1px solid #D6C7B2',
                  backgroundColor: '#FAF5EE',
                  color: '#7B5233',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#7B5233';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FAF5EE';
                  e.currentTarget.style.color = '#7B5233';
                }}
                title="Quay lại danh sách kiểm tra viên"
              >
                <ArrowLeft size={15} />
                <span>Quay lại</span>
              </button>

              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#F5ECE2',
                color: '#7B5233',
                border: '1px solid #E4D3C0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                fontWeight: '800',
                flexShrink: 0
              }}>
                {account.name.charAt(0).toUpperCase()}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '800', color: '#2D1A12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {account.name}
                  </h3>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    backgroundColor: '#FAF0E6',
                    color: '#7B5233',
                    border: '1px solid #EADCC9',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    Kiểm tra viên
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#78716C', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Công đoạn: <strong>{account.stagesList && account.stagesList.length > 0 ? account.stagesList.join(', ') : 'Tất cả'}</strong>
                </div>
              </div>
            </div>

            {/* Nút X trên Mobile nằm góc phải hàng 1 */}
            <button
              type="button"
              onClick={onClose}
              className="mobile-only"
              style={{
                background: '#FFFFFF',
                border: '1px solid #EADCC9',
                borderRadius: '6px',
                width: '30px',
                height: '30px',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5D3B32',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Đóng (Esc)"
            >
              <X size={16} />
            </button>
          </div>

          {/* Dải chỉ số KPI nhanh dạng viên thuốc */}
          <div className="account-kpi-chips-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <div style={{
              padding: '3px 10px',
              borderRadius: '6px',
              backgroundColor: (account.pendingCount || 0) > 0 ? '#FEF3C7' : '#F1F5F9',
              border: `1px solid ${(account.pendingCount || 0) > 0 ? '#FDE68A' : '#E2E8F0'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.72rem', color: (account.pendingCount || 0) > 0 ? '#B45309' : '#64748B', fontWeight: '600' }}>Chờ duyệt:</span>
              <strong style={{ fontSize: '0.84rem', color: (account.pendingCount || 0) > 0 ? '#B45309' : '#1E293B' }}>{account.pendingCount || 0}</strong>
            </div>

            <div style={{
              padding: '3px 10px',
              borderRadius: '6px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: '600' }}>Tổng phiếu:</span>
              <strong style={{ fontSize: '0.84rem', color: '#1D4ED8' }}>{account.total}</strong>
            </div>

            <div style={{
              padding: '3px 10px',
              borderRadius: '6px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '600' }}>Đạt:</span>
              <strong style={{ fontSize: '0.84rem', color: '#15803D' }}>{account.passCount}</strong>
            </div>

            <div style={{
              padding: '3px 10px',
              borderRadius: '6px',
              backgroundColor: account.failCount > 0 ? '#FEF2F2' : '#FFFFFF',
              border: `1px solid ${account.failCount > 0 ? '#FECACA' : '#EADCC9'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.72rem', color: account.failCount > 0 ? '#B91C1C' : '#78716C', fontWeight: '600' }}>Tỷ lệ lỗi:</span>
              <strong style={{ fontSize: '0.84rem', color: account.failCount > 0 ? '#DC2626' : '#15803D' }}>
                {account.defectRate}%
              </strong>
            </div>

            {/* Nút X trên Desktop */}
            <button
              type="button"
              onClick={onClose}
              className="desktop-only"
              style={{
                background: '#FFFFFF',
                border: '1px solid #EADCC9',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5D3B32',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginLeft: '4px',
                flexShrink: 0
              }}
              title="Đóng (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* 2. Controls Bar: Search & Filter Tabs */}
        <div className="account-controls-bar" style={{
          padding: '10px 20px',
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid #EADCC9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          flexShrink: 0
        }}>
          {/* Search Input */}
          <div className="account-search-wrap" style={{ position: 'relative', flex: '1 1 240px', maxWidth: '420px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              className="account-search-input"
              placeholder="Tìm mã phiếu, PO, sản phẩm, quy cách..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '32px',
                padding: '0 10px 0 30px',
                borderRadius: '6px',
                border: '1px solid #D5C7B7',
                fontSize: '0.8rem',
                color: '#1E293B',
                outline: 'none',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Right Group: Filter Pills & Page Size Selector */}
          <div className="account-filter-scroll-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filter Pills */}
            <div className="account-filter-pills" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="account-filter-pill-btn"
                onClick={() => setFilterResult('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: filterResult === 'all' ? '#7B5233' : '#D5C7B7',
                  backgroundColor: filterResult === 'all' ? '#7B5233' : '#FFFFFF',
                  color: filterResult === 'all' ? '#FFFFFF' : '#6F4E37',
                  transition: 'all 0.15s ease'
                }}
              >
                Tất cả ({account.total})
              </button>
              <button
                type="button"
                className="account-filter-pill-btn"
                onClick={() => setFilterResult('pending')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: filterResult === 'pending' ? '#D97706' : '#D5C7B7',
                  backgroundColor: filterResult === 'pending' ? '#D97706' : '#FFFFFF',
                  color: filterResult === 'pending' ? '#FFFFFF' : '#D97706',
                  transition: 'all 0.15s ease'
                }}
              >
                Chờ duyệt ({account.pendingCount || 0})
              </button>
              <button
                type="button"
                className="account-filter-pill-btn"
                onClick={() => setFilterResult('confirmed')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: filterResult === 'confirmed' ? '#2563EB' : '#D5C7B7',
                  backgroundColor: filterResult === 'confirmed' ? '#2563EB' : '#FFFFFF',
                  color: filterResult === 'confirmed' ? '#FFFFFF' : '#2563EB',
                  transition: 'all 0.15s ease'
                }}
              >
                Đã duyệt ({account.confirmedCount || 0})
              </button>
              <button
                type="button"
                className="account-filter-pill-btn"
                onClick={() => setFilterResult('pass')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: filterResult === 'pass' ? '#15803D' : '#D5C7B7',
                  backgroundColor: filterResult === 'pass' ? '#15803D' : '#FFFFFF',
                  color: filterResult === 'pass' ? '#FFFFFF' : '#15803D',
                  transition: 'all 0.15s ease'
                }}
              >
                Đạt ({account.passCount})
              </button>
              <button
                type="button"
                className="account-filter-pill-btn"
                onClick={() => setFilterResult('fail')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: filterResult === 'fail' ? '#DC2626' : '#D5C7B7',
                  backgroundColor: filterResult === 'fail' ? '#DC2626' : '#FFFFFF',
                  color: filterResult === 'fail' ? '#FFFFFF' : '#DC2626',
                  transition: 'all 0.15s ease'
                }}
              >
                Lỗi ({account.failCount})
              </button>
              {account.returnCount > 0 && (
                <button
                  type="button"
                  className="account-filter-pill-btn"
                  onClick={() => setFilterResult('tra-ve')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    border: '1px solid',
                    cursor: 'pointer',
                    borderColor: filterResult === 'tra-ve' ? '#D97706' : '#D5C7B7',
                    backgroundColor: filterResult === 'tra-ve' ? '#D97706' : '#FFFFFF',
                    color: filterResult === 'tra-ve' ? '#FFFFFF' : '#D97706',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Trả về ({account.returnCount})
                </button>
              )}
            </div>

            {/* Divider (desktop only) */}
            <div className="desktop-only" style={{ width: '1px', height: '20px', backgroundColor: '#EADCC9' }} />

            {/* Page Size Selector nằm trong bộ lọc */}
            <div className="account-pagesize-wrap" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '0.75rem', color: '#78716C', fontWeight: '600', whiteSpace: 'nowrap' }}>Hiển thị:</span>
              <select
                value={pageSize}
                className="account-pagesize-select"
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{
                  height: '28px',
                  padding: '0 6px',
                  borderRadius: '6px',
                  border: '1px solid #D6C7B2',
                  backgroundColor: '#FFFFFF',
                  color: '#7B5233',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Task List Workspace — Toàn màn hình dạng TABLE */}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflow: 'hidden', padding: '14px 20px', display: 'flex', flexDirection: 'column' }}>
          {filteredTasks.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EADCC9',
              textAlign: 'center',
              padding: '60px 16px',
              color: '#94A3B8'
            }}>
              <Package size={44} style={{ opacity: 0.35, marginBottom: '10px' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.96rem', fontWeight: '700', color: '#64748B' }}>
                Không tìm thấy phiếu kiểm tra nào phù hợp
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94A3B8' }}>
                Vui lòng thử đổi từ khóa tìm kiếm hoặc bấm tab "Tất cả".
              </p>
            </div>
          ) : (
            <>
              {/* 3A. DESKTOP VIEW: BẢNG DỮ LIỆU CHUẨN */}
              <div className="mgmt-table card admin-table-card ticket-desktop-view" style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #EADCC9',
                boxShadow: '0 1px 4px rgba(45, 26, 18, 0.04)',
              }}>
                <div className="table-responsive admin-table-scroll" style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#FAF5EE' }}>
                      <tr style={{ borderBottom: '1px solid #EADCC9' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'center', width: '50px', color: '#7B5233', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>STT</th>
                        <th style={{ padding: '10px 12px', minWidth: '130px', color: '#7B5233', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>Mã phiếu</th>
                        <th style={{ padding: '10px 12px', minWidth: '110px', color: '#7B5233', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>PO / Đơn hàng</th>
                        <th style={{ padding: '10px 14px', minWidth: '220px', color: '#7B5233', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>Sản phẩm / Quy cách</th>
                        <th style={{ padding: '10px 12px', minWidth: '110px', color: '#7B5233', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>Công đoạn</th>
                        <th style={{ padding: '10px 12px', minWidth: '140px', color: '#7B5233', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>Thời gian ghi nhận</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', minWidth: '120px', color: '#7B5233', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>Kết quả & Lỗi</th>
                        <th style={{ padding: '10px 10px', textAlign: 'center', minWidth: '100px', color: '#7B5233', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>Xử lý</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', minWidth: '120px', color: '#7B5233', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTasks.map((t, idx) => {
                        const stt = (safeCurrentPage - 1) * pageSize + idx + 1;
                        const isPass = t.result === 'pass' || t.result === 'Đạt' || t.result === 'excellent';
                        const isReturn = t.action === 'tra-ve';
                        const isQuarantine = t.action === 'cach-ly';

                        return (
                          <tr
                            key={t.id}
                            className="ticket-table-row"
                            onClick={() => onSelectTask && onSelectTask(t)}
                            style={{
                              cursor: 'pointer',
                              borderBottom: '1px solid #F3EDE6',
                              transition: 'background-color 0.12s ease'
                            }}
                          >
                            {/* 1. STT */}
                            <td style={{ padding: '10px 8px', textAlign: 'center', color: '#8C827A', fontWeight: '600', fontSize: '0.8rem' }}>
                              {stt}
                            </td>

                            {/* 2. Mã phiếu & Phân loại & Trạng thái */}
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    fontSize: '0.88rem',
                                    fontWeight: '800',
                                    color: '#4A240E',
                                    letterSpacing: '0.2px'
                                  }}>
                                    #{t.ticket_code || t.id}
                                  </span>
                                  {t.is_confirmed ? (
                                    <span style={{
                                      fontSize: '0.65rem',
                                      fontWeight: '700',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      backgroundColor: '#DCFCE7',
                                      color: '#15803D',
                                      border: '1px solid #BBF7D0'
                                    }}>
                                      Đã duyệt
                                    </span>
                                  ) : (
                                    <span style={{
                                      fontSize: '0.65rem',
                                      fontWeight: '700',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      backgroundColor: '#FEF3C7',
                                      color: '#B45309',
                                      border: '1px solid #FDE68A'
                                    }}>
                                      Chờ duyệt
                                    </span>
                                  )}
                                </div>
                                {t.category && (
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: '600',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    backgroundColor: '#FAF5EE',
                                    color: '#7B5233',
                                    border: '1px solid #EADCC9',
                                    display: 'inline-block',
                                    width: 'fit-content'
                                  }}>
                                    {t.category}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 3. PO / Lô */}
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                fontWeight: '700',
                                fontSize: '0.84rem',
                                color: '#1E293B',
                                backgroundColor: '#F1F5F9',
                                padding: '3px 8px',
                                borderRadius: '4px'
                              }}>
                                {t.batch_no || '—'}
                              </span>
                            </td>

                            {/* 4. Sản phẩm & Quy cách */}
                            <td style={{ padding: '10px 14px' }}>
                              <div>
                                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#2D1A12' }}>
                                  {t.part_name || 'Chi tiết kiểm tra'}
                                </div>
                                {t.specification && (
                                  <div style={{ fontSize: '0.74rem', color: '#78716C', marginTop: '2px' }}>
                                    QC: <span>{t.specification}</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 5. Công đoạn */}
                            <td style={{ padding: '10px 12px' }}>
                              {t.stage ? (
                                <span style={{
                                  fontSize: '0.74rem',
                                  fontWeight: '600',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  backgroundColor: '#FAF5EE',
                                  color: '#7B5233',
                                  border: '1px solid #EADCC9',
                                  display: 'inline-block'
                                }}>
                                  {t.stage}
                                </span>
                              ) : (
                                <span style={{ color: '#A8A29E', fontSize: '0.75rem' }}>—</span>
                              )}
                            </td>

                            {/* 6. Thời gian ghi nhận */}
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontSize: '0.76rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} style={{ opacity: 0.7, flexShrink: 0 }} />
                                <span>{formatDateTime(t.recorded_date || t.completion_date)}</span>
                              </div>
                            </td>

                            {/* 7. Kết quả & Lỗi */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                <span style={{
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: isPass ? '#DCFCE7' : '#FEE2E2',
                                  color: isPass ? '#15803D' : '#DC2626',
                                }}>
                                  {isPass ? '✓ Đạt' : '✗ Không đạt'}
                                </span>
                                {Number(t.error_qty) > 0 && (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    color: '#DC2626',
                                    fontWeight: '700',
                                    backgroundColor: '#FEF2F2',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    border: '1px solid #FECACA'
                                  }}>
                                    {t.error_qty} lỗi
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 8. Xử lý */}
                            <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                              {isReturn ? (
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#FFFBEB',
                                  color: '#B45309',
                                  border: '1px solid #FDE68A'
                                }}>
                                  Trả về
                                </span>
                              ) : isQuarantine ? (
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#FEF3C7',
                                  color: '#92400E',
                                  border: '1px solid #FCD34D'
                                }}>
                                  Cách ly
                                </span>
                              ) : (
                                <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>—</span>
                              )}
                            </td>

                            {/* 9. Thao tác */}
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectTask) onSelectTask(t);
                                }}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  border: t.is_confirmed ? '1px solid #D6C7B2' : 'none',
                                  backgroundColor: t.is_confirmed ? '#FAF5EE' : '#7B5233',
                                  color: t.is_confirmed ? '#7B5233' : '#FFFFFF',
                                  fontSize: '0.76rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  boxShadow: t.is_confirmed ? 'none' : '0 1px 3px rgba(123, 82, 51, 0.2)',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.is_confirmed ? '#F0E6D8' : '#5D3B32'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.is_confirmed ? '#FAF5EE' : '#7B5233'}
                              >
                                <Eye size={12} />
                                <span>{t.is_confirmed ? 'Xem chi tiết' : 'Xem & Duyệt'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3B. MOBILE VIEW: DẠNG CARDS */}
              <div className="ticket-mobile-view">
                {paginatedTasks.map((t) => {
                  const isPass = t.result === 'pass' || t.result === 'Đạt' || t.result === 'excellent';
                  const isReturn = t.action === 'tra-ve';
                  const isQuarantine = t.action === 'cach-ly';

                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask && onSelectTask(t)}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '10px',
                        border: '1px solid #EADCC9',
                        boxShadow: '0 1px 3px rgba(45, 26, 18, 0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '800', color: '#4A240E', fontSize: '0.92rem' }}>
                            #{t.ticket_code || t.id}
                          </span>
                          {t.is_confirmed ? (
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: '700',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D'
                            }}>
                              Đã duyệt
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: '700',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: '#FEF3C7',
                              color: '#B45309'
                            }}>
                              Chờ duyệt
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: '#8C827A', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={11} />
                          <span>{formatDateTime(t.recorded_date || t.completion_date)}</span>
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#FAF7F2', padding: '6px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <div>PO: <strong>{t.batch_no || '—'}</strong> | Công đoạn: <strong>{t.stage || '—'}</strong></div>
                        <div style={{ fontWeight: '600', marginTop: '2px' }}>{t.part_name || 'Chi tiết'}</div>
                        {t.specification && <div style={{ fontSize: '0.72rem', color: '#78716C' }}>QC: {t.specification}</div>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: isPass ? '#DCFCE7' : '#FEE2E2',
                          color: isPass ? '#15803D' : '#DC2626',
                        }}>
                          {isPass ? '✓ Đạt' : '✗ Không đạt'}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectTask) onSelectTask(t);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: t.is_confirmed ? '1px solid #D6C7B2' : 'none',
                            backgroundColor: t.is_confirmed ? '#FAF5EE' : '#7B5233',
                            color: t.is_confirmed ? '#7B5233' : '#FFFFFF',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={12} /> {t.is_confirmed ? 'Xem chi tiết' : 'Xem & Duyệt'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Mobile Sticky Floating Pagination Bar — Giống hệt Ảnh 3 */}
                {totalPages > 1 && (
                  <div className="pagination-mobile-sticky mobile-only">
                    <button
                      type="button"
                      className="page-btn"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={safeCurrentPage === 1}
                      aria-label="Trang trước"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontWeight: '700', fontSize: '0.86rem', color: '#7B5233', whiteSpace: 'nowrap' }}>
                      Trang {safeCurrentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="page-btn"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={safeCurrentPage >= totalPages}
                      aria-label="Trang sau"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 4. Footer Bar với Phân Trang (Desktop Only) */}
        <div className="account-footer-bar desktop-only" style={{
          padding: '10px 20px',
          borderTop: '1px solid #EADCC9',
          backgroundColor: '#FAF6F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          flexShrink: 0
        }}>
          {/* Thông tin số lượng */}
          <span style={{ fontSize: '0.8rem', color: '#7B5233', fontWeight: '600' }}>
            Hiển thị <b>{totalTasks > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0} - {Math.min(safeCurrentPage * pageSize, totalTasks)}</b> trên tổng <b>{totalTasks}</b> phiếu tồn đọng của <b>{account.name}</b>
          </span>

          {/* Phân trang (Pagination) */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                style={{
                  minWidth: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid #EADCC9',
                  backgroundColor: '#FFFFFF',
                  color: safeCurrentPage === 1 ? '#D1D5DB' : '#7B5233',
                  cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>

              {renderPageNumbers()}

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={safeCurrentPage === totalPages}
                style={{
                  minWidth: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid #EADCC9',
                  backgroundColor: '#FFFFFF',
                  color: safeCurrentPage === totalPages ? '#D1D5DB' : '#7B5233',
                  cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AccountPendingTicketsDrawer;

