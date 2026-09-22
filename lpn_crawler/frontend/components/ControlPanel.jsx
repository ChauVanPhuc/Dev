import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, Trash2, List, LayoutGrid, Sparkles, X, RefreshCw, Play, Pause, Square, Maximize2, Eye } from 'lucide-react';
import { LpnFilterBar } from './LpnFilterBar';

export const ControlPanel = ({
  currentJob,
  progressData,
  isPaused = false,
  kpiStats = { total_containers: 0, total_sku_rows: 0, total_images: 0, total_missing_rows: 0 },
  pageSize = 15,
  onPageSizeChange = () => {},
  filters = {},
  onFilterChange = () => {},
  sortOption = '',
  onSortChange = () => {},
  viewMode = 'table',
  onViewModeChange = () => {},
  selectedItemIds = [],
  total = 0,
  onDeleteSelected = () => {},
  onStartCrawl = () => {},
  onPauseCrawl = () => {},
  onResumeCrawl = () => {},
  onStopCrawl = () => {},
  onExportExcel = () => {},
  onOpenLogs = () => {},
  onOpenMonitor = () => {},
  onOpenMissingRows = () => {},
  onOpenAiOcrScan = () => {},
  onSync = () => {},
  isSyncing = false,
  onStartSync = () => {},
  onStopSync = () => {},
  onOpenSyncMonitor = () => {}
}) => {
  const activePaused = isPaused || progressData?.current_status === 'PAUSED';

  const isTerminalStatus =
    currentJob?.status === 'failed' ||
    currentJob?.status === 'cancelled' ||
    currentJob?.status === 'completed' ||
    currentJob?.status === 'completed_with_errors' ||
    currentJob?.status === 'interrupted' ||
    currentJob?.status === 'auth_required' ||
    progressData?.current_status === 'FAILED' ||
    progressData?.current_status === 'COMPLETED' ||
    progressData?.current_status === 'CANCELLED';

  const isRunning = !isTerminalStatus && (
    currentJob?.status === 'running' ||
    currentJob?.status === 'pending' ||
    currentJob?.status === 'starting' ||
    progressData?.current_status === 'STARTING' ||
    progressData?.current_status === 'LOADING' ||
    progressData?.current_status === 'AUTHENTICATING' ||
    progressData?.current_status === 'OPENING' ||
    progressData?.current_status === 'CRAWLING'
  );

  const status = currentJob?.status || (isRunning ? 'starting' : 'idle');
  const percent = progressData?.percent || 0;

  // Dropdown states
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [isOtherDropdownOpen, setIsOtherDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isSyncDropdownOpen, setIsSyncDropdownOpen] = useState(false);

  // Debounced Quick Search State
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Keep searchInput in sync if filters.search is reset or modified externally
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  // Debounce 350ms for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((filters.search || '') !== searchInput) {
        onFilterChange('search', searchInput);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Close dropdowns on outside click (giống Claim pattern)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.lpn-sort-container')) {
        setShowSortDropdown(false);
      }
      if (!event.target.closest('.lpn-other-container')) {
        setIsOtherDropdownOpen(false);
      }
      if (!event.target.closest('.lpn-export-container')) {
        setIsExportDropdownOpen(false);
      }
      if (!event.target.closest('.lpn-sync-container')) {
        setIsSyncDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate all active filter count (including quick search)
  const allActiveFilters = Object.entries(filters).filter(
    ([k, v]) => !!v && typeof v === 'string' && v.trim() !== ''
  );
  const activeFiltersCount = allActiveFilters.length;

  const getStatusBadge = (st) => {
    switch (st) {
      case 'running':
      case 'pending':
      case 'starting':
        return (
          <span
            className={`lpn-status-badge ${activePaused ? 'status-warning' : 'status-running'}`}
            style={{
              cursor: 'pointer',
              backgroundColor: activePaused ? '#FEF3C7' : undefined,
              color: activePaused ? '#B45309' : undefined,
              border: activePaused ? '1px solid #F59E0B' : undefined
            }}
            onClick={onOpenMonitor}
            title="Bấm để mở cửa sổ giám sát tiến trình"
          >
            {st === 'pending' || st === 'starting' ? 'ĐANG KHỞI TẠO...' : activePaused ? 'TẠM DỪNG' : 'ĐANG CRAWL...'}
          </span>
        );
      case 'completed':
      case 'completed_with_errors':
        return <span className="lpn-status-badge status-completed">HOÀN TẤT</span>;
      case 'auth_required':
        return <span className="lpn-status-badge status-auth">CẦN XÁC MINH 2FA TRÊN CHROME</span>;
      case 'failed':
        return <span className="lpn-status-badge status-failed">THẤT BẠI</span>;
      case 'cancelled':
        return <span className="lpn-status-badge status-cancelled">ĐÃ HỦY</span>;
      default:
        return <span className="lpn-status-badge status-idle">SẴN SÀNG CRAWL</span>;
    }
  };

  const sortOptionsList = [
    { value: '', label: 'Mặc định (Date loading mới nhất)' },
    { value: 'date-asc', label: 'Date loading cũ nhất' },
    { value: 'cont-asc', label: 'Container: A → Z' },
    { value: 'cont-desc', label: 'Container: Z → A' },
    { value: 'sku-asc', label: 'Tên SKU: A → Z' },
    { value: 'sku-desc', label: 'Tên SKU: Z → A' },
    { value: 'batch-asc', label: 'Batch: A → Z' },
    { value: 'batch-desc', label: 'Batch: Z → A' }
  ];

  const stats7d = kpiStats?.recent_7days || kpiStats || {};
  const rangeText = stats7d.date_range_label ? `(${stats7d.date_range_label})` : '';
  const missingCount = Number(stats7d.total_missing_rows || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>

      {/* 1. BỘ 4 KPI THEO TRƯỢT 7 NGÀY GẦN NHẤT */}
      {(() => {
        return (
          <div className="lpn-metrics-row" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            {/* KPI 1: Số lượng Container (7 ngày gần nhất) */}
            <div className="lpn-summary-card">
              <div className="lpn-card-info">
                <span className="lpn-card-label">Số lượng Container</span>
                {rangeText && (
                  <span className="lpn-card-subtext" style={{ fontSize: '0.68rem', color: '#8D6E63', fontWeight: '600' }}>
                    {rangeText}
                  </span>
                )}
              </div>
              <span className="lpn-card-number">{Number(stats7d.total_containers || 0).toLocaleString()}</span>
            </div>

            {/* KPI 2: Số lượng Pallet/Box (7 ngày gần nhất) */}
            <div className="lpn-summary-card">
              <div className="lpn-card-info">
                <span className="lpn-card-label" style={{ color: '#0369A1' }}>Số lượng Pallet/Box</span>
                {rangeText && (
                  <span className="lpn-card-subtext" style={{ fontSize: '0.68rem', color: '#0284C7', fontWeight: '600' }}>
                    {rangeText}
                  </span>
                )}
              </div>
              <span className="lpn-card-number" style={{ color: '#0369A1' }}>
                {Number(stats7d.total_sku_rows || 0).toLocaleString()}
              </span>
            </div>

            {/* KPI 3: Số lượng ảnh (7 ngày gần nhất) */}
            <div className="lpn-summary-card">
              <div className="lpn-card-info">
                <span className="lpn-card-label" style={{ color: '#7B5233' }}>Số lượng ảnh</span>
                {rangeText && (
                  <span className="lpn-card-subtext" style={{ fontSize: '0.68rem', color: '#8D6E63', fontWeight: '600' }}>
                    {rangeText}
                  </span>
                )}
              </div>
              <span className="lpn-card-number" style={{ color: '#7B5233' }}>
                {Number(stats7d.total_images || 0).toLocaleString()}
              </span>
            </div>

            {/* KPI 4: Số lượng dòng thiếu (7 ngày gần nhất - CLICK ĐƯỢC) */}
            <div
              className="lpn-summary-card"
              onClick={() => onOpenMissingRows({
                startDate: stats7d.start_date || stats7d.start_date_iso,
                endDate: stats7d.end_date || stats7d.end_date_iso,
                dateRangeLabel: stats7d.date_range_label,
                isAllTime: false
              })}
              style={{
                cursor: 'pointer',
                backgroundColor: missingCount > 0 ? '#FEF2F2' : '#FFFFFF',
                border: `1.5px solid ${missingCount > 0 ? '#FCA5A5' : '#EADCC9'}`,
                transition: 'border-color 0.2s, box-shadow 0.2s',
                position: 'relative'
              }}
              title="Bấm để mở danh sách các dòng thiếu thông tin"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#EF4444';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = missingCount > 0 ? '#FCA5A5' : '#EADCC9';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(123, 82, 51, 0.04)';
              }}
            >
              <div className="lpn-card-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="lpn-card-label" style={{ color: '#DC2626', fontWeight: '800' }}>
                    Số lượng dòng thiếu
                  </span>
                  {missingCount > 0 && <AlertTriangle size={14} color="#DC2626" />}
                </div>
                {rangeText && (
                  <span className="lpn-card-subtext" style={{ fontSize: '0.68rem', color: '#DC2626', fontWeight: '600' }}>
                    {rangeText}
                  </span>
                )}
              </div>
              <span className="lpn-card-number" style={{ color: '#DC2626', fontWeight: '900' }}>
                {missingCount.toLocaleString()}
              </span>
            </div>
          </div>
        );
      })()}


      {/* 2. Progress Banner (Clickable to open Popup Monitor) - Chỉ hiển thị khi có Active Job đang chạy */}
      {isRunning && (
        <div className="lpn-progress-banner" style={{ cursor: 'pointer' }} onClick={onOpenMonitor} title="Bấm để bật popup xem tiến trình crawl">
          <div className="lpn-progress-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: '800', color: '#2D1A12' }}>Tiến Trình Crawl AppSheet</span>
              {getStatusBadge(status)}
              {progressData?.current_container && (
                <span style={{ color: '#7B5233', fontWeight: '600' }}>
                  Container: <strong>{progressData.current_container}</strong>
                </span>
              )}
            </div>
            <span style={{ fontWeight: '800', color: '#7B5233' }}>{percent}%</span>
          </div>

          <div className="lpn-progress-bar-bg">
            <div className="lpn-progress-bar-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {/* 3. TOOLBAR + INTEGRATED EXPANDABLE FILTER BAR */}
      <div
        className="mgmt-toolbar card"
        style={{
          margin: 0,
          flexShrink: 0,
          padding: isFilterBarOpen ? '6px 14px 8px 14px' : '6px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: isFilterBarOpen ? '6px' : '0',
          borderRadius: '10px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #EADCC9',
          boxSizing: 'border-box',
          transition: 'all 0.2s ease'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            height: '38px'
          }}
        >
        {/* Left Side: Search + Sort (A↓Z) + Filter (Funnel) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {/* Search Input Box */}
          <div className="search-wrapper" style={{ margin: 0, height: '36px', width: '320px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search nhanh Container, Factory, LPN, SKU..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onFilterChange('search', searchInput);
                }
              }}
            />
          </div>

          {/* Sort Button (A↓Z) */}
          <div className="lpn-sort-container" style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSortDropdown(!showSortDropdown);
                setIsOtherDropdownOpen(false);
                setIsExportDropdownOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: sortOption ? '#7B5233' : '#8D6E63',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '36px',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              title="Sắp xếp danh sách"
              onMouseEnter={(e) => (e.currentTarget.style.color = '#7B5233')}
              onMouseLeave={(e) => (e.currentTarget.style.color = sortOption ? '#7B5233' : '#8D6E63')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="15" y1="4" x2="15" y2="20" />
                <polyline points="11 16 15 20 19 16" />
                <text x="3" y="10" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="currentColor">A</text>
                <text x="3" y="20" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="currentColor">Z</text>
              </svg>
            </button>

            {showSortDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  left: 0,
                  zIndex: 1000,
                  background: '#fff',
                  border: '1px solid #EADCC9',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(123,82,51,0.12)',
                  padding: '6px 0',
                  minWidth: '200px',
                  animation: 'fadeIn 0.15s ease'
                }}
              >
                {sortOptionsList.map((item) => (
                  <div
                    key={item.value}
                    onClick={() => {
                      onSortChange(item.value);
                      setShowSortDropdown(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: sortOption === item.value ? '700' : '500',
                      color: sortOption === item.value ? '#7B5233' : '#5D4037',
                      backgroundColor: sortOption === item.value ? '#FAF6F0' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF6F0')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = sortOption === item.value ? '#FAF6F0' : 'transparent')}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filter Funnel Icon Button */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: isFilterBarOpen || activeFiltersCount > 0 ? '#7B5233' : '#8D6E63',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '36px',
                outline: 'none',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              title="Bộ lọc nâng cao"
              onMouseEnter={(e) => (e.currentTarget.style.color = '#7B5233')}
              onMouseLeave={(e) => (e.currentTarget.style.color = isFilterBarOpen || activeFiltersCount > 0 ? '#7B5233' : '#8D6E63')}
            >
              <Filter size={20} strokeWidth={2.5} />
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    backgroundColor: '#7B5233',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    fontWeight: 'bold'
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Switch Chế độ xem: Dạng Bảng vs Dạng Thẻ Container */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#FAF6F0',
              border: '1px solid #EADCC9',
              borderRadius: '8px',
              padding: '2px',
              height: '32px',
              marginLeft: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'table' ? '#4A2E1B' : 'transparent',
                color: viewMode === 'table' ? '#FFFFFF' : '#7B5233',
                fontWeight: viewMode === 'table' ? '700' : '600',
                fontSize: '0.76rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Chế độ xem Bảng dữ liệu chi tiết"
            >
              <List size={13} strokeWidth={2.5} />
              <span>Dạng Bảng</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('cards')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'cards' ? '#4A2E1B' : 'transparent',
                color: viewMode === 'cards' ? '#FFFFFF' : '#7B5233',
                fontWeight: viewMode === 'cards' ? '700' : '600',
                fontSize: '0.76rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Chế độ xem Thẻ Container (Hiển thị LPN & Ngày xếp hàng)"
            >
              <LayoutGrid size={13} strokeWidth={2.5} />
              <span>Thẻ Container</span>
            </button>
          </div>
        </div>

        {/* Right Side Actions: Khác, Xuất dữ liệu, + Bắt đầu Crawl */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>


          {/* Nút Khác (Dropdown) */}
          <div className="lpn-other-container" style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOtherDropdownOpen(!isOtherDropdownOpen);
                setIsExportDropdownOpen(false);
                setShowSortDropdown(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '34px',
                padding: '0 14px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                cursor: 'pointer',
                backgroundColor: '#4A2E1B',
                color: '#FFFFFF',
                border: 'none',
                transition: 'background-color 0.2s',
                boxShadow: 'none'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              </svg>
              <span>Khác</span>
              {isRunning && (
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: activePaused ? '#F59E0B' : '#10B981',
                    boxShadow: activePaused ? '0 0 5px #F59E0B' : '0 0 5px #10B981',
                    marginLeft: '2px'
                  }}
                  title={activePaused ? "Tiến trình crawl đang tạm dừng" : "Tiến trình crawl đang chạy"}
                />
              )}
            </button>
            {isOtherDropdownOpen && (
              <div
                className="actions-dropdown-menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(123, 82, 51, 0.12)',
                  minWidth: '240px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px 0',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  animation: 'slideDown 0.2s ease forwards',
                  transformOrigin: 'top right'
                }}
              >
                {/* Tiến trình Crawl */}
                {!isRunning ? (
                  <button
                    type="button"
                    className="import-dropdown-item"
                    onClick={() => {
                      setIsOtherDropdownOpen(false);
                      onStartCrawl();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      color: '#2D1A12',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Play size={14} strokeWidth={2.5} color="#2D1A12" />
                    <span>Bắt đầu Crawl</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="import-dropdown-item"
                      onClick={() => {
                        setIsOtherDropdownOpen(false);
                        if (activePaused) {
                          onResumeCrawl();
                        } else {
                          onPauseCrawl();
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        color: activePaused ? '#D97706' : '#B45309',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {activePaused ? (
                        <Play size={14} strokeWidth={2.5} color="#D97706" />
                      ) : (
                        <Pause size={14} strokeWidth={2.5} color="#B45309" />
                      )}
                      <span>{activePaused ? 'Tiếp tục Crawl' : 'Tạm dừng Crawl'}</span>
                    </button>
                    <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }}></div>
                    <button
                      type="button"
                      className="import-dropdown-item"
                      onClick={() => {
                        setIsOtherDropdownOpen(false);
                        onStopCrawl();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        color: '#DC2626',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Square size={14} strokeWidth={2.5} color="#DC2626" />
                      <span>Dừng hoàn toàn Crawl</span>
                    </button>
                  </>
                )}
                <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }}></div>
                <button
                  type="button"
                  className="import-dropdown-item"
                  onClick={() => {
                    setIsOtherDropdownOpen(false);
                    onOpenLogs();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: '#2D1A12',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <span>Nhật ký log</span>
                </button>
                <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }}></div>
                <button
                  type="button"
                  className="import-dropdown-item"
                  onClick={() => {
                    setIsOtherDropdownOpen(false);
                    onOpenMonitor();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: '#2D1A12',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span>Tiến trình live stream</span>
                </button>
                <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }}></div>
                <button
                  type="button"
                  className="import-dropdown-item"
                  onClick={() => {
                    setIsOtherDropdownOpen(false);
                    onOpenMissingRows({
                      startDate: stats7d.start_date || stats7d.start_date_iso,
                      endDate: stats7d.end_date || stats7d.end_date_iso,
                      dateRangeLabel: stats7d.date_range_label,
                      isAllTime: false
                    });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: '#2D1A12',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2v6h-6"></path>
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                      <path d="M3 22v-6h6"></path>
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                    </svg>
                    <span>Bổ sung dữ liệu thiếu</span>
                  </div>
                  {kpiStats.total_missing_rows > 0 && (
                    <span
                      style={{
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FCA5A5',
                        borderRadius: '10px',
                        padding: '1px 6px',
                        fontSize: '0.7rem',
                        fontWeight: '800',
                        flexShrink: 0
                      }}
                    >
                      {kpiStats.total_missing_rows}
                    </span>
                  )}
                </button>
                <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }}></div>
                <button
                  type="button"
                  className="import-dropdown-item"
                  onClick={() => {
                    setIsOtherDropdownOpen(false);
                    onOpenAiOcrScan();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: '#2D1A12',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                    <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                  </svg>
                  <span>Đọc ảnh bằng AI</span>
                </button>

                {selectedItemIds.length > 0 && (
                  <>
                    <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }}></div>
                    <button
                      type="button"
                      className="import-dropdown-item"
                      onClick={() => {
                        setIsOtherDropdownOpen(false);
                        onDeleteSelected();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        color: (total > 0 && selectedItemIds.length >= total) ? '#991B1B' : '#DC2626'
                      }}
                    >
                      {(total > 0 && selectedItemIds.length >= total)
                        ? <AlertTriangle size={14} color="#991B1B" />
                        : <Trash2 size={14} />}
                      <span>
                        {(total > 0 && selectedItemIds.length >= total)
                          ? `Xóa tất cả dữ liệu CSDL (${selectedItemIds.length}/${total})`
                          : `Xóa các mục đã chọn (${selectedItemIds.length})`}
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Nút Xuất dữ liệu (Dropdown) */}
          <div className="lpn-export-container" style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExportDropdownOpen(!isExportDropdownOpen);
                setIsOtherDropdownOpen(false);
                setShowSortDropdown(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '34px',
                padding: '0 14px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                cursor: 'pointer',
                backgroundColor: '#4A2E1B',
                color: '#FFFFFF',
                border: 'none',
                transition: 'background-color 0.2s',
                boxShadow: 'none'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Xuất dữ liệu</span>
            </button>
            {isExportDropdownOpen && (
              <div
                className="actions-dropdown-menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(123, 82, 51, 0.12)',
                  minWidth: '200px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px 0',
                  overflow: 'hidden',
                  animation: 'slideDown 0.2s ease forwards',
                  transformOrigin: 'top right'
                }}
              >
                <button
                  type="button"
                  className="import-dropdown-item"
                  onClick={() => {
                    setIsExportDropdownOpen(false);
                    onExportExcel();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: '#2D1A12'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>Xuất Excel (Có Ảnh)</span>
                </button>
              </div>
            )}
          </div>

          {/* Nút Đồng bộ (Sync) */}
          <div className="lpn-sync-container" style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={() => {
                if (isSyncing) {
                  setIsSyncDropdownOpen((prev) => !prev);
                } else {
                  if (onStartSync) onStartSync();
                  else onSync();
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 16px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                cursor: 'pointer',
                backgroundColor: isSyncing ? '#16A34A' : '#4A2E1B',
                color: '#FFFFFF',
                border: isSyncing ? '1px solid #15803D' : 'none',
                transition: 'all 0.2s ease',
                boxShadow: isSyncing ? '0 0 0 2px rgba(34, 197, 94, 0.35)' : 'none'
              }}
              title={isSyncing ? "Bấm để chọn: Dừng đồng bộ hoặc Mở popup giám sát" : "Bắt đầu Đồng bộ dữ liệu cào & bóc tách AI OCR thời gian thực"}
            >
              <RefreshCw
                size={14}
                strokeWidth={2.5}
                style={isSyncing ? { animation: 'spin 2s linear infinite' } : {}}
              />
              <span>{isSyncing ? 'Đang đồng bộ' : 'Đồng bộ'}</span>
            </button>

            {/* Menu Popover khi đang Đồng bộ - Cấu trúc và giao diện y chang menu 'Khác' */}
            {isSyncing && isSyncDropdownOpen && (
              <div
                className="actions-dropdown-menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(123, 82, 51, 0.12)',
                  minWidth: '240px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px 0',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  animation: 'slideDown 0.2s ease forwards',
                  transformOrigin: 'top right'
                }}
              >
                <button
                  type="button"
                  className="import-dropdown-item"
                  onClick={() => {
                    setIsSyncDropdownOpen(false);
                    onStopSync();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: '#DC2626',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Square size={14} strokeWidth={2.5} color="#DC2626" />
                  <span>Dừng đồng bộ</span>
                </button>

                <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }}></div>

                <button
                  type="button"
                  className="import-dropdown-item"
                  onClick={() => {
                    setIsSyncDropdownOpen(false);
                    onOpenSyncMonitor();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: '#2D1A12',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span>Tiến trình live stream</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. EXPANDABLE FILTER BAR — INTEGRATED DIRECTLY INSIDE TOOLBAR CARD */}
      {isFilterBarOpen && (
        <div style={{ width: '100%', paddingTop: '6px', borderTop: '1px solid #F0E6D8' }}>
          <LpnFilterBar
            isOpen={isFilterBarOpen}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            filters={filters}
            onFilterChange={onFilterChange}
            onResetFilters={() => onFilterChange('reset', null)}
          />
        </div>
      )}

      {/* 5. ACTIVE FILTER CHIPS BAR — ALWAYS VISIBLE WHENEVER ANY FILTER IS ACTIVE */}
      {allActiveFilters.length > 0 && (
        <div
          style={{
            width: '100%',
            paddingTop: '6px',
            marginTop: '2px',
            borderTop: '1px dashed #F0E6D8',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233' }}>Đang lọc:</span>
          {allActiveFilters.map(([key, val]) => {
            const labelMap = {
              search: 'Tìm kiếm',
              year: 'Năm',
              month: 'Tháng',
              startDate: 'Từ ngày',
              endDate: 'Đến ngày',
              container_number: 'Container',
              factory: 'Factory',
              operator_name: 'Operator',
              batch: 'Batch',
              lpn: 'LPN',
              sku: 'SKU'
            };
            return (
              <span
                key={key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#FAF6F0',
                  color: '#7B5233',
                  border: '1px solid #EADCC9',
                  borderRadius: '14px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  fontWeight: '600'
                }}
              >
                <span>{labelMap[key] || key}: {val}</span>
                <button
                  type="button"
                  onClick={() => onFilterChange(key, '')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#8D6E63',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1
                  }}
                  title="Xóa điều kiện này"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => onFilterChange('reset', null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#DC2626',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              padding: '2px 4px',
              textDecoration: 'underline'
            }}
          >
            Xóa tất cả lọc
          </button>
        </div>
      )}
    </div>
  </div>
);
};

