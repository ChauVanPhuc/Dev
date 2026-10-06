import React, { useEffect, useState } from 'react';

export const ClaimFilterBar = ({
  isOpen = false,
  isFilterBarOpen = false,
  activeDropdown = null,
  setActiveDropdown = () => {},
  rowsPerPage = 15,
  setRowsPerPage = () => {},
  setCurrentPage = () => {},
  editYear = '',
  setEditYear = () => {},
  editMonth = '',
  setEditMonth = () => {},
  editStartDate = '',
  setEditStartDate = () => {},
  editEndDate = '',
  setEditEndDate = () => {},
  editKpiShowAllTime = false,
  setEditKpiShowAllTime = () => {},
  handleYearChange,
  onYearChange,
  handleMonthChange,
  onMonthChange,
  handleStartDateChange,
  onStartDateChange,
  handleEndDateChange,
  onEndDateChange,
  isDateFilterValid = true,
  editStatus = '',
  setEditStatus = () => {},
  editSku = '',
  setEditSku = () => {},
  showSkuSuggestions: propShowSku,
  setShowSkuSuggestions: propSetShowSku,
  uniqueSkuOptions = [],
  skuSuggestions = [],
  editDefectCode = '',
  setEditDefectCode = () => {},
  showDefectCodeSuggestions: propShowDefectCode,
  setShowDefectCodeSuggestions: propSetShowDefectCode,
  uniqueDefectCodeOptions = [],
  defectCodeSuggestions = [],
  editCompanyErrorCode = '',
  setEditCompanyErrorCode = () => {},
  showCompanyErrorCodeSuggestions: propShowCompanyErrorCode,
  setShowCompanyErrorCodeSuggestions: propSetShowCompanyErrorCode,
  uniqueCompanyErrorCodeOptions = [],
  companyErrorCodeSuggestions = [],
  editCompanyErrorName = '',
  setEditCompanyErrorName = () => {},
  showCompanyErrorNameSuggestions: propShowCompanyErrorName,
  setShowCompanyErrorNameSuggestions: propSetShowCompanyErrorName,
  uniqueCompanyErrorNameOptions = [],
  companyErrorNameSuggestions = [],
  editPenalty = '',
  setEditPenalty = () => {},
  showPenaltySuggestions: propShowPenalty,
  setShowPenaltySuggestions: propSetShowPenalty,
  uniquePenaltyOptions = [],
  penaltySuggestions = [],
  editPenaltyTotal = '',
  setEditPenaltyTotal = () => {},
  showPenaltyTotalSuggestions: propShowPenaltyTotal,
  setShowPenaltyTotalSuggestions: propSetShowPenaltyTotal,
  uniquePenaltyTotalOptions = [],
  penaltyTotalSuggestions = [],
  editClaimItem = '',
  setEditClaimItem = () => {},
  showClaimItemSuggestions: propShowClaimItem,
  setShowClaimItemSuggestions: propSetShowClaimItem,
  uniqueClaimItemOptions = [],
  claimItemSuggestions = [],
  editContainer = '',
  setEditContainer = () => {},
  showContainerSuggestions: propShowContainer,
  setShowContainerSuggestions: propSetShowContainer,
  uniqueContainerOptions = [],
  containerSuggestions = [],
  editLpn = '',
  setEditLpn = () => {},
  showLpnSuggestions: propShowLpn,
  setShowLpnSuggestions: propSetShowLpn,
  uniqueLpnOptions = [],
  lpnSuggestions = [],
  appliedFilters = {},
  onRemoveFilterKey,
  removeFilterKey,
  onClearAllFilters,
  clearAllFilters
}) => {
  const [localShowSku, setLocalShowSku] = useState(false);
  const [localShowDefectCode, setLocalShowDefectCode] = useState(false);
  const [localShowCompanyErrorCode, setLocalShowCompanyErrorCode] = useState(false);
  const [localShowCompanyErrorName, setLocalShowCompanyErrorName] = useState(false);
  const [localShowClaimItem, setLocalShowClaimItem] = useState(false);
  const [localShowContainer, setLocalShowContainer] = useState(false);
  const [localShowLpn, setLocalShowLpn] = useState(false);

  // Click outside listener to close active dropdowns
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeDropdown && !e.target.closest('.filter-dropdown-wrapper')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [activeDropdown, setActiveDropdown]);

  const showSkuSuggestions = propShowSku !== undefined ? propShowSku : localShowSku;
  const setShowSkuSuggestions = propSetShowSku || setLocalShowSku;

  const showDefectCodeSuggestions = propShowDefectCode !== undefined ? propShowDefectCode : localShowDefectCode;
  const setShowDefectCodeSuggestions = propSetShowDefectCode || setLocalShowDefectCode;

  const showCompanyErrorCodeSuggestions = propShowCompanyErrorCode !== undefined ? propShowCompanyErrorCode : localShowCompanyErrorCode;
  const setShowCompanyErrorCodeSuggestions = propSetShowCompanyErrorCode || setLocalShowCompanyErrorCode;

  const showCompanyErrorNameSuggestions = propShowCompanyErrorName !== undefined ? propShowCompanyErrorName : localShowCompanyErrorName;
  const setShowCompanyErrorNameSuggestions = propSetShowCompanyErrorName || setLocalShowCompanyErrorName;

  const showClaimItemSuggestions = propShowClaimItem !== undefined ? propShowClaimItem : localShowClaimItem;
  const setShowClaimItemSuggestions = propSetShowClaimItem || setLocalShowClaimItem;

  const showContainerSuggestions = propShowContainer !== undefined ? propShowContainer : localShowContainer;
  const setShowContainerSuggestions = propSetShowContainer || setLocalShowContainer;

  const showLpnSuggestions = propShowLpn !== undefined ? propShowLpn : localShowLpn;
  const setShowLpnSuggestions = propSetShowLpn || setLocalShowLpn;

  const visible = isOpen || isFilterBarOpen;
  if (!visible) return null;

  const onYear = onYearChange || handleYearChange || setEditYear;
  const onMonth = onMonthChange || handleMonthChange || setEditMonth;
  const onStart = onStartDateChange || handleStartDateChange || setEditStartDate;
  const onEnd = onEndDateChange || handleEndDateChange || setEditEndDate;
  const handleRemove = onRemoveFilterKey || removeFilterKey || (() => {});
  const handleClear = onClearAllFilters || clearAllFilters || (() => {});

  const skus = (Array.isArray(skuSuggestions) && skuSuggestions.length > 0) ? skuSuggestions : ((Array.isArray(uniqueSkuOptions) && uniqueSkuOptions.length > 0) ? uniqueSkuOptions : []);
  const defectCodes = (Array.isArray(defectCodeSuggestions) && defectCodeSuggestions.length > 0) ? defectCodeSuggestions : ((Array.isArray(uniqueDefectCodeOptions) && uniqueDefectCodeOptions.length > 0) ? uniqueDefectCodeOptions : []);
  const companyErrorCodes = (Array.isArray(companyErrorCodeSuggestions) && companyErrorCodeSuggestions.length > 0) ? companyErrorCodeSuggestions : ((Array.isArray(uniqueCompanyErrorCodeOptions) && uniqueCompanyErrorCodeOptions.length > 0) ? uniqueCompanyErrorCodeOptions : []);
  const companyErrorNames = (Array.isArray(companyErrorNameSuggestions) && companyErrorNameSuggestions.length > 0) ? companyErrorNameSuggestions : ((Array.isArray(uniqueCompanyErrorNameOptions) && uniqueCompanyErrorNameOptions.length > 0) ? uniqueCompanyErrorNameOptions : []);
  const containers = (Array.isArray(containerSuggestions) && containerSuggestions.length > 0) ? containerSuggestions : ((Array.isArray(uniqueContainerOptions) && uniqueContainerOptions.length > 0) ? uniqueContainerOptions : []);
  const lpns = (Array.isArray(lpnSuggestions) && lpnSuggestions.length > 0) ? lpnSuggestions : ((Array.isArray(uniqueLpnOptions) && uniqueLpnOptions.length > 0) ? uniqueLpnOptions : []);

  const timeFilterCount = ['year', 'month', 'startDate', 'endDate'].filter(k => !!appliedFilters[k]).length;
  const claimFilterCount = ['status', 'sku', 'defectCode', 'companyErrorCode', 'companyErrorName', 'penalty', 'penaltyTotal'].filter(k => !!appliedFilters[k]).length;
  const transportFilterCount = ['claimItem', 'container', 'lpn'].filter(k => !!appliedFilters[k] && appliedFilters[k] !== 'Cabinet#' && appliedFilters[k] !== 'Cabinet #').length;
  const totalActiveFilters = timeFilterCount + claimFilterCount + transportFilterCount;


  // Reusable input styling for perfect symmetry and crisp alignment
  const inputStyle = {
    width: '100%',
    height: '34px',
    padding: '0 10px',
    borderRadius: '6px',
    border: '1px solid #D5C7B7',
    fontSize: '0.82rem',
    color: '#2D1A12',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: '4px',
    lineHeight: '1.2'
  };

  const panelCardStyle = (width = '360px') => ({
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    width,
    backgroundColor: '#FFFFFF',
    border: '1px solid #EADCC9',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(123, 82, 51, 0.12)',
    zIndex: 1000,
    padding: '14px 16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px 14px',
    boxSizing: 'border-box'
  });

  const autocompletePopupStyle = {
    position: 'absolute',
    top: 'calc(100% + 2px)',
    left: 0,
    right: 0,
    zIndex: 1100,
    backgroundColor: '#FFFFFF',
    border: '1px solid #EADCC9',
    borderRadius: '6px',
    boxShadow: '0 6px 18px rgba(123, 82, 51, 0.12)',
    maxHeight: '140px',
    overflowY: 'auto',
    padding: '4px 0',
    boxSizing: 'border-box'
  };

  return (
    <div className="filter-inline-bar" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 8px',
      backgroundColor: '#FAF6F0',
      borderRadius: '8px',
      border: '1px solid #EADCC9',
      flexWrap: 'wrap',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      {/* CATEGORY 0: HIỂN THỊ SỐ DÒNG */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          type="button"
          className={`btn-filter-dropdown ${activeDropdown === 'rows' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'rows' ? null : 'rows'); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '28px',
            padding: '0 10px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            backgroundColor: activeDropdown === 'rows' ? '#EADCC9' : '#FFFFFF',
            border: '1px solid #C4B5A5',
            color: '#2D1A12',
            boxSizing: 'border-box'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="9"></line>
            <line x1="9" y1="13" x2="15" y2="13"></line>
            <line x1="9" y1="17" x2="13" y2="17"></line>
          </svg>
          <span>Hiển thị: {rowsPerPage === Infinity ? 'Tất cả' : `${rowsPerPage} dòng`}</span>
          <span className="dropdown-arrow" style={{ fontSize: '0.7rem' }}>▾</span>
        </button>
        {activeDropdown === 'rows' && (
          <div 
            className="filter-dropdown-card" 
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
              boxShadow: '0 10px 25px rgba(123, 82, 51, 0.12)',
              zIndex: 1000,
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {[10, 15, 20, 50, 100, 'all'].map((opt) => {
              const label = opt === 'all' ? 'Tất cả' : `${opt} dòng`;
              const isSelected = opt === 'all' ? rowsPerPage === Infinity : rowsPerPage === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setRowsPerPage(opt === 'all' ? Infinity : opt);
                    setCurrentPage(1);
                    setActiveDropdown(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 14px',
                    border: 'none',
                    background: isSelected ? '#FAF6F0' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '0.82rem',
                    color: isSelected ? '#7B5233' : '#2D1A12',
                    transition: 'background-color 0.15s',
                    boxSizing: 'border-box'
                  }}
                >
                  <span>{label}</span>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: '#7B5233' }}>
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CATEGORY 1: THỜI GIAN */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          type="button"
          className={`btn-filter-dropdown ${activeDropdown === 'time' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'time' ? null : 'time'); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '32px',
            padding: '0 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            backgroundColor: activeDropdown === 'time' ? '#EADCC9' : '#FFFFFF',
            border: '1px solid #C4B5A5',
            color: '#2D1A12',
            boxSizing: 'border-box'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Thời gian</span>
          {timeFilterCount > 0 && (
            <span style={{
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              borderRadius: '50%',
              width: '15px',
              height: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.62rem',
              fontWeight: 'bold'
            }}>
              {timeFilterCount}
            </span>
          )}
          <span className="dropdown-arrow" style={{ fontSize: '0.7rem' }}>▾</span>
        </button>
        {activeDropdown === 'time' && (
          <div 
            className="filter-dropdown-card" 
            style={panelCardStyle('360px')} 
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <label style={labelStyle}>Năm</label>
              <select 
                value={editYear} 
                onChange={(e) => onYear(e.target.value)}
                style={inputStyle}
              >
                <option value="">Tất cả</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tháng</label>
              <select 
                value={editMonth} 
                onChange={(e) => onMonth(e.target.value)} 
                disabled={!editYear}
                style={inputStyle}
              >
                <option value="">{editYear ? 'Tất cả' : 'Chọn năm trước'}</option>
                <option value="Tháng 1">Tháng 1</option>
                <option value="Tháng 2">Tháng 2</option>
                <option value="Tháng 3">Tháng 3</option>
                <option value="Tháng 4">Tháng 4</option>
                <option value="Tháng 5">Tháng 5</option>
                <option value="Tháng 6">Tháng 6</option>
                <option value="Tháng 7">Tháng 7</option>
                <option value="Tháng 8">Tháng 8</option>
                <option value="Tháng 9">Tháng 9</option>
                <option value="Tháng 10">Tháng 10</option>
                <option value="Tháng 11">Tháng 11</option>
                <option value="Tháng 12">Tháng 12</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Từ ngày</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => onStart(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Đến ngày</label>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => onEnd(e.target.value)}
                style={inputStyle}
              />
            </div>
            {!isDateFilterValid && (
              <div style={{ color: '#DC2626', fontSize: '0.72rem', fontWeight: '600', gridColumn: '1 / -1' }}>
                Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.
              </div>
            )}
          </div>
        )}
      </div>

      {/* CATEGORY 2: THÔNG TIN CLAIM */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          type="button"
          className={`btn-filter-dropdown ${activeDropdown === 'claim' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'claim' ? null : 'claim'); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '32px',
            padding: '0 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            backgroundColor: activeDropdown === 'claim' ? '#EADCC9' : '#FFFFFF',
            border: '1px solid #C4B5A5',
            color: '#2D1A12',
            boxSizing: 'border-box'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <span>Thông tin claim</span>
          {claimFilterCount > 0 && (
            <span style={{
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              borderRadius: '50%',
              width: '15px',
              height: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.62rem',
              fontWeight: 'bold'
            }}>
              {claimFilterCount}
            </span>
          )}
          <span className="dropdown-arrow" style={{ fontSize: '0.7rem' }}>▾</span>
        </button>
        {activeDropdown === 'claim' && (
          <div 
            className="filter-dropdown-card" 
            style={panelCardStyle('380px')} 
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <label style={labelStyle}>Trạng thái</label>
              <select 
                value={editStatus} 
                onChange={(e) => setEditStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="">Tất cả</option>
                <option value="Mới">Mới</option>
                <option value="Đang xem xét">Đang xem xét</option>
                <option value="Đã xử lý">Đã xử lý</option>
              </select>
            </div>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Tên SKU / SP</label>
              <input
                type="text"
                placeholder="Tên sản phẩm..."
                value={editSku}
                onChange={(e) => setEditSku(e.target.value)}
                onFocus={() => setShowSkuSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSkuSuggestions(false), 200)}
                style={inputStyle}
              />
              {showSkuSuggestions && skus.length > 0 && (
                <div style={autocompletePopupStyle}>
                  {skus
                    .filter(opt => !editSku || opt.toLowerCase().includes(editSku.toLowerCase()))
                    .slice(0, 15)
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => { setEditSku(opt); setShowSkuSuggestions(false); }}
                        style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', color: '#2D1A12' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Mã lỗi KH</label>
              <input
                type="text"
                placeholder="Mã lỗi KH..."
                value={editDefectCode}
                onChange={(e) => setEditDefectCode(e.target.value)}
                onFocus={() => setShowDefectCodeSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDefectCodeSuggestions(false), 200)}
                style={inputStyle}
              />
              {showDefectCodeSuggestions && defectCodes.length > 0 && (
                <div style={autocompletePopupStyle}>
                  {defectCodes
                    .filter(opt => !editDefectCode || opt.toLowerCase().includes(editDefectCode.toLowerCase()))
                    .slice(0, 15)
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => { setEditDefectCode(opt); setShowDefectCodeSuggestions(false); }}
                        style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', color: '#2D1A12' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Mã lỗi G7</label>
              <input
                type="text"
                placeholder="Mã lỗi G7..."
                value={editCompanyErrorCode}
                onChange={(e) => setEditCompanyErrorCode(e.target.value)}
                onFocus={() => setShowCompanyErrorCodeSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCompanyErrorCodeSuggestions(false), 200)}
                style={inputStyle}
              />
              {showCompanyErrorCodeSuggestions && companyErrorCodes.length > 0 && (
                <div style={autocompletePopupStyle}>
                  {companyErrorCodes
                    .filter(opt => !editCompanyErrorCode || opt.toLowerCase().includes(editCompanyErrorCode.toLowerCase()))
                    .slice(0, 15)
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => { setEditCompanyErrorCode(opt); setShowCompanyErrorCodeSuggestions(false); }}
                        style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', color: '#2D1A12' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative', gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Tên lỗi G7</label>
              <input
                type="text"
                placeholder="Tên lỗi G7..."
                value={editCompanyErrorName}
                onChange={(e) => setEditCompanyErrorName(e.target.value)}
                onFocus={() => setShowCompanyErrorNameSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCompanyErrorNameSuggestions(false), 200)}
                style={inputStyle}
              />
              {showCompanyErrorNameSuggestions && companyErrorNames.length > 0 && (
                <div style={autocompletePopupStyle}>
                  {companyErrorNames
                    .filter(opt => !editCompanyErrorName || opt.toLowerCase().includes(editCompanyErrorName.toLowerCase()))
                    .slice(0, 15)
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => { setEditCompanyErrorName(opt); setShowCompanyErrorNameSuggestions(false); }}
                        style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', color: '#2D1A12' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CATEGORY 3: THAM CHIẾU & VẬN CHUYỂN */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          type="button"
          className={`btn-filter-dropdown ${activeDropdown === 'transport' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'transport' ? null : 'transport'); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '32px',
            padding: '0 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            backgroundColor: activeDropdown === 'transport' ? '#EADCC9' : '#FFFFFF',
            border: '1px solid #C4B5A5',
            color: '#2D1A12',
            boxSizing: 'border-box'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Vận chuyển & Tham chiếu</span>
          {transportFilterCount > 0 && (
            <span style={{
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              borderRadius: '50%',
              width: '15px',
              height: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.62rem',
              fontWeight: 'bold'
            }}>
              {transportFilterCount}
            </span>
          )}
          <span className="dropdown-arrow" style={{ fontSize: '0.7rem' }}>▾</span>
        </button>
        {activeDropdown === 'transport' && (
          <div 
            className="filter-dropdown-card" 
            style={panelCardStyle('360px')} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Container</label>
              <input
                type="text"
                placeholder="WHSU..."
                value={editContainer}
                onChange={(e) => setEditContainer(e.target.value)}
                onFocus={() => setShowContainerSuggestions(true)}
                onBlur={() => setTimeout(() => setShowContainerSuggestions(false), 200)}
                style={inputStyle}
              />
              {showContainerSuggestions && containers.length > 0 && (
                <div style={autocompletePopupStyle}>
                  {containers
                    .filter(opt => !editContainer || opt.toLowerCase().includes(editContainer.toLowerCase()))
                    .slice(0, 15)
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => { setEditContainer(opt); setShowContainerSuggestions(false); }}
                        style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', color: '#2D1A12' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>LPN</label>
              <input
                type="text"
                placeholder="Mã LPN..."
                value={editLpn}
                onChange={(e) => setEditLpn(e.target.value)}
                onFocus={() => setShowLpnSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLpnSuggestions(false), 200)}
                style={inputStyle}
              />
              {showLpnSuggestions && lpns.length > 0 && (
                <div style={autocompletePopupStyle}>
                  {lpns
                    .filter(opt => !editLpn || opt.toLowerCase().includes(editLpn.toLowerCase()))
                    .slice(0, 15)
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => { setEditLpn(opt); setShowLpnSuggestions(false); }}
                        style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', color: '#2D1A12' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Active applied filter chips container */}
      {totalActiveFilters > 0 && (
        <div
          className="filter-chips-wrapper"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px dashed #D5C7B7',
            borderRadius: '6px',
            padding: '2px 8px',
            backgroundColor: '#FFFFFF',
            minHeight: '28px',
            boxSizing: 'border-box',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233' }}>Đã chọn:</span>
          {Object.entries(appliedFilters).map(([key, value]) => {
            if (!value) return null;
            if (key === 'claimItem' && (value === 'Cabinet#' || value === 'Cabinet #')) return null;
            if (key === 'kpiShowAllTime') return null;
            let displayLabel = '';

            if (key === 'year') displayLabel = `Năm: ${value}`;
            else if (key === 'month') displayLabel = `Tháng: ${value}`;
            else if (key === 'startDate') displayLabel = `Từ: ${value}`;
            else if (key === 'endDate') displayLabel = `Đến: ${value}`;
            else if (key === 'status') displayLabel = `Trạng thái: ${value}`;
            else if (key === 'sku') displayLabel = `Tên SP: ${value}`;
            else if (key === 'claimItem') displayLabel = `Mã tham chiếu: ${value}`;
            else if (key === 'defectCode') displayLabel = `Mã lỗi KH: ${value}`;
            else if (key === 'companyErrorCode') displayLabel = `Mã lỗi G7: ${value}`;
            else if (key === 'companyErrorName') displayLabel = `Tên lỗi G7: ${value}`;
            else if (key === 'container') displayLabel = `Container: ${value}`;
            else if (key === 'lpn') displayLabel = `LPN: ${value}`;
            else if (key === 'penalty') displayLabel = `Giá trị phạt: ${value}`;
            else if (key === 'penaltyTotal') displayLabel = `Tổng phạt: ${value}`;
            else displayLabel = `${key}: ${value}`;

            return (
              <span
                key={key}
                className="filter-chip"
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
                <span>{displayLabel}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(key)}
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
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#DC2626',
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '2px 4px',
              textDecoration: 'underline'
            }}
          >
            Xóa tất cả
          </button>
        </div>
      )}
    </div>
  );
};

export default ClaimFilterBar;
