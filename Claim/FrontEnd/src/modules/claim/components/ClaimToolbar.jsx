import React, { useEffect } from 'react';
import { Search, Filter } from 'lucide-react';

export const ClaimToolbar = ({
  quickSearch = '',
  setQuickSearch = () => {},
  sortOption = '',
  setSortOption = () => {},
  showSortDropdown = false,
  setShowSortDropdown = () => {},
  isFilterBarOpen = false,
  setIsFilterBarOpen = () => {},
  activeFiltersCount = 0,
  appliedFiltersCount = 0,
  hasWritePermission = true,
  claims = [],
  paginatedClaims = [],
  currentPageCount,
  totalCount,
  totalFilteredCount,
  selectedClaimIds = [],
  exceptionCount = 0,
  isOtherDropdownOpen = false,
  setIsOtherDropdownOpen = () => {},
  isImportDropdownOpen = false,
  setIsImportDropdownOpen = () => {},
  isExportDropdownOpen = false,
  setIsExportDropdownOpen = () => {},
  isExporting = false,
  onProcessSelectedClaim,
  onStartBatchProcessing,
  onOpenPdfFolderModal,
  onOpenPdfFolder,
  onOpenExceptionModal,
  onOpenExceptions,
  onDeleteSelectedClaims,
  onDeleteSelected,
  onTriggerPdfUpload,
  onTriggerFolderUpload,
  onExportExcel,
  onOpenAddNewClaim
}) => {
  const effectiveFilterCount = activeFiltersCount || appliedFiltersCount || 0;
  const handleProcessClaim = onProcessSelectedClaim || onStartBatchProcessing;
  const handleOpenPdf = onOpenPdfFolderModal || onOpenPdfFolder;
  const handleOpenExc = onOpenExceptionModal || onOpenExceptions;
  const handleDeleteSelected = onDeleteSelectedClaims || onDeleteSelected;

  // Click outside listener for all dropdowns in Toolbar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.import-dropdown-container')) {
        setIsImportDropdownOpen(false);
      }
      if (!event.target.closest('.other-dropdown-container')) {
        setIsOtherDropdownOpen(false);
      }
      if (!event.target.closest('.export-dropdown-container')) {
        setIsExportDropdownOpen(false);
      }
      if (!event.target.closest('.sort-dropdown-container')) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsImportDropdownOpen, setIsOtherDropdownOpen, setIsExportDropdownOpen, setShowSortDropdown]);

  return (
    <div className="mgmt-toolbar card" style={{ 
      marginBottom: isFilterBarOpen ? '6px' : '10px', 
      flexShrink: 0, 
      padding: '6px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: '10px',
      backgroundColor: '#FFFFFF',
      border: '1px solid #EADCC9',
      height: '52px',
      boxSizing: 'border-box'
    }}>
      {/* Left Side: Search + A↓Z + Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        {/* 1. Search Input Box */}
        <div className="search-wrapper" style={{ margin: 0, height: '36px', width: '320px' }}>
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search nhanh SKU, Cont, LPN..." 
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
          />
        </div>

        {/* 2. Sort Button A↓Z */}
        <div className="sort-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSortDropdown(!showSortDropdown);
              setIsOtherDropdownOpen(false);
              setIsImportDropdownOpen(false);
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
            onMouseEnter={(e) => e.currentTarget.style.color = '#7B5233'}
            onMouseLeave={(e) => e.currentTarget.style.color = sortOption ? '#7B5233' : '#8D6E63'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="15" y1="4" x2="15" y2="20" />
              <polyline points="11 16 15 20 19 16" />
              <text x="3" y="10" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="currentColor">A</text>
              <text x="3" y="20" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="currentColor">Z</text>
            </svg>
          </button>
          {showSortDropdown && (
            <div style={{
              position: 'absolute', top: '40px', left: 0, zIndex: 100,
              background: '#fff', border: '1px solid #EADCC9', borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(123,82,51,0.12)', padding: '6px 0',
              minWidth: '200px', animation: 'fadeIn 0.15s ease'
            }}>
              {[
                { value: '', label: 'Mặc định' },
                { value: 'name-asc', label: 'Tên SKU: A → Z' },
                { value: 'name-desc', label: 'Tên SKU: Z → A' },
                { value: 'time-desc', label: 'Thời gian: Mới nhất' },
                { value: 'time-asc', label: 'Thời gian: Cũ nhất' },
                { value: 'code-asc', label: 'Mã Claim: A → Z' },
                { value: 'code-desc', label: 'Mã Claim: Z → A' }
              ].map(item => (
                <div
                  key={item.value}
                  onClick={() => { setSortOption(item.value); setShowSortDropdown(false); }}
                  style={{
                    padding: '8px 16px', cursor: 'pointer', fontSize: '0.82rem',
                    fontWeight: sortOption === item.value ? '700' : '500',
                    color: sortOption === item.value ? '#7B5233' : '#5D4037',
                    backgroundColor: sortOption === item.value ? '#FAF6F0' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = sortOption === item.value ? '#FAF6F0' : 'transparent'}
                >
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Filter Funnel Icon Button */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: isFilterBarOpen || effectiveFilterCount > 0 ? '#7B5233' : '#8D6E63',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '36px',
              outline: 'none',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            title="Bộ lọc nâng cao"
            onMouseEnter={(e) => e.currentTarget.style.color = '#7B5233'}
            onMouseLeave={(e) => e.currentTarget.style.color = isFilterBarOpen || effectiveFilterCount > 0 ? '#7B5233' : '#8D6E63'}
          >
            <Filter size={20} strokeWidth={2.5} />
            {effectiveFilterCount > 0 && (
              <span style={{
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
              }}>
                {effectiveFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Right Side Actions: Khác, Nhập dữ liệu, Xuất dữ liệu, + Tạo mới */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        
        {/* 4. NÚT KHÁC (Dropdown) */}
        <div className="other-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsOtherDropdownOpen(!isOtherDropdownOpen); 
              setIsImportDropdownOpen(false); 
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
              {hasWritePermission && (
                <button
                  type="button"
                  className="import-dropdown-item"
                  onClick={() => { setIsOtherDropdownOpen(false); handleProcessClaim && handleProcessClaim(); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#2D1A12' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 11 12 14 22 4"></polyline>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    <span>Xử lý khiếu nại</span>
                  </div>
                  {claims.filter(c => c.status === 'Mới' || c.status === 'Đang xem xét').length > 0 && (
                    <span style={{
                      backgroundColor: '#7B5233',
                      color: '#FFFFFF',
                      borderRadius: '10px',
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      marginLeft: '8px'
                    }}>
                      {claims.filter(c => c.status === 'Mới' || c.status === 'Đang xem xét').length}
                    </span>
                  )}
                </button>
              )}
              
              <button
                type="button"
                className="import-dropdown-item"
                onClick={() => { setIsOtherDropdownOpen(false); handleOpenPdf && handleOpenPdf(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#2D1A12' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7B5233" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Thư mục PDF</span>
              </button>

              <button
                type="button"
                className="import-dropdown-item"
                onClick={() => { setIsOtherDropdownOpen(false); handleOpenExc && handleOpenExc(); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: exceptionCount > 0 ? '#C2410C' : '#2D1A12' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span>Ngoại lệ</span>
                </div>
                {exceptionCount > 0 && (
                  <span style={{
                    backgroundColor: '#C2410C',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    {exceptionCount}
                  </span>
                )}
              </button>
              
              {hasWritePermission && selectedClaimIds.length > 0 && (
                <button
                  type="button"
                  className="import-dropdown-item"
                  onClick={() => { setIsOtherDropdownOpen(false); handleDeleteSelected && handleDeleteSelected(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#DC2626' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Xóa các mục đã chọn ({selectedClaimIds.length})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 5. NÚT NHẬP DỮ LIỆU (Dropdown) */}
        <div className="import-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsImportDropdownOpen(!isImportDropdownOpen); 
              setIsOtherDropdownOpen(false); 
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Nhập dữ liệu</span>
          </button>
          {isImportDropdownOpen && (
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
                minWidth: '180px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                padding: '6px 0',
                overflow: 'hidden',
                animation: 'slideDown 0.2s ease forwards',
                transformOrigin: 'top right'
              }}
            >
              {hasWritePermission && (
                <>
                  <button
                    type="button"
                    className="import-dropdown-item"
                    onClick={() => { setIsImportDropdownOpen(false); onTriggerPdfUpload && onTriggerPdfUpload(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#2D1A12' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span>Nhập file PDF</span>
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }}></div>
                  <button
                    type="button"
                    className="import-dropdown-item"
                    onClick={() => { setIsImportDropdownOpen(false); onTriggerFolderUpload && onTriggerFolderUpload(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#2D1A12' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>Nhập thư mục</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 6. NÚT XUẤT DỮ LIỆU (Dropdown) */}
        <div className="export-dropdown-container" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsExportDropdownOpen(!isExportDropdownOpen); 
              setIsImportDropdownOpen(false); 
              setIsOtherDropdownOpen(false);
              setShowSortDropdown(false);
            }}
            disabled={isExporting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '34px',
              padding: '0 14px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '0.82rem',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              backgroundColor: '#4A2E1B',
              color: '#FFFFFF',
              border: 'none',
              transition: 'background-color 0.2s',
              boxShadow: 'none',
              opacity: isExporting ? 0.7 : 1
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>{isExporting ? 'Đang xuất...' : 'Xuất dữ liệu'}</span>
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
                minWidth: '180px',
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
                onClick={() => { setIsExportDropdownOpen(false); onExportExcel && onExportExcel('current'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#2D1A12' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span>Xuất trang hiện tại ({currentPageCount !== undefined ? currentPageCount : (paginatedClaims && paginatedClaims.length > 0 ? paginatedClaims.length : (claims.length > 0 ? Math.min(claims.length, 15) : 0))})</span>
              </button>
              <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }}></div>
              <button
                type="button"
                className="import-dropdown-item"
                onClick={() => { setIsExportDropdownOpen(false); onExportExcel && onExportExcel('all'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#2D1A12' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                  <line x1="15" y1="3" x2="15" y2="21"></line>
                </svg>
                <span>Xuất tất cả ({totalCount !== undefined ? totalCount : (totalFilteredCount !== undefined ? totalFilteredCount : claims.length)})</span>
              </button>
            </div>
          )}
        </div>

        {/* 7. NÚT TẠO MỚI */}
        {hasWritePermission && (
          <button
            type="button"
            onClick={onOpenAddNewClaim}
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
              backgroundColor: '#4A2E1B',
              color: '#FFFFFF',
              border: 'none',
              transition: 'background-color 0.2s',
              boxShadow: 'none'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Tạo mới</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ClaimToolbar;
