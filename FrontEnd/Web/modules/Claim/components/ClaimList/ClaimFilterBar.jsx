import React from 'react';

const ClaimFilterBar = ({
  isOpen,
  activeDropdown,
  setActiveDropdown,
  appliedFilters,
  editYear,
  setEditYear,
  editMonth,
  setEditMonth,
  editStartDate,
  setEditStartDate,
  editEndDate,
  setEditEndDate,
  editStatus,
  setEditStatus,
  editSku,
  setEditSku,
  editClaimItem,
  setEditClaimItem,
  editDefectCode,
  setEditDefectCode,
  editCompanyErrorCode,
  setEditCompanyErrorCode,
  editContainer,
  setEditContainer,
  editLpn,
  setEditLpn,
  editPenalty,
  setEditPenalty,
  editPenaltyTotal,
  setEditPenaltyTotal,
  showSkuSuggestions,
  setShowSkuSuggestions,
  showClaimItemSuggestions,
  setShowClaimItemSuggestions,
  showDefectCodeSuggestions,
  setShowDefectCodeSuggestions,
  showCompanyErrorCodeSuggestions,
  setShowCompanyErrorCodeSuggestions,
  showPenaltySuggestions,
  setShowPenaltySuggestions,
  uniqueSkuOptions,
  uniqueClaimItemOptions,
  uniqueDefectCodeOptions,
  uniqueCompanyErrorCodeOptions,
  uniquePenaltyOptions,
  uniqueCompanyErrorNameOptions,
  activeFiltersCount,
  applyFilters,
  clearAllFilters,
  removeFilterKey
}) => {
  if (!isOpen) return null;

  return (
  <div className="filter-inline-bar">
    {/* CATEGORY 0: HIỂN THỊ SỐ DÒNG */}
    <div className="filter-dropdown-wrapper">
      <button
        type="button"
        className={`btn-filter-dropdown ${activeDropdown === 'rows' ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'rows' ? null : 'rows'); }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="9"></line>
          <line x1="9" y1="13" x2="15" y2="13"></line>
          <line x1="9" y1="17" x2="13" y2="17"></line>
        </svg>
        <span>Hiển thị: {rowsPerPage === Infinity ? 'Tất cả' : `${rowsPerPage} dòng`}</span>
        <span className="dropdown-arrow">▾</span>
      </button>
      {activeDropdown === 'rows' && (
        <div 
          className="filter-dropdown-card" 
          style={{ 
            width: '160px', 
            padding: '4px 0', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EADCC9',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(123, 82, 51, 0.12)',
            zIndex: 1000
          }}
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
                  padding: '8px 16px',
                  border: 'none',
                  background: isSelected ? '#FAF6F0' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  color: isSelected ? '#7B5233' : '#2D1A12',
                  transition: 'background-color 0.2s'
                }}
                className="import-dropdown-item"
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
    <div className="filter-dropdown-wrapper">
      <button
        type="button"
        className={`btn-filter-dropdown ${activeDropdown === 'time' ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'time' ? null : 'time'); }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>Thời gian</span>
        {['year', 'month', 'startDate', 'endDate'].filter(k => appliedFilters[k]).length > 0 && (
          <span className="filter-active-badge">
            {['year', 'month', 'startDate', 'endDate'].filter(k => appliedFilters[k]).length}
          </span>
        )}
        <span className="dropdown-arrow">▾</span>
      </button>
      {activeDropdown === 'time' && (
        <div className="filter-dropdown-card grid-2col" style={{ width: '360px' }} onClick={(e) => e.stopPropagation()}>
          <div className="filter-field-group">
            <label className="filter-field-label">Năm</label>
            <select value={editYear} onChange={(e) => handleYearChange(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
          <div className="filter-field-group">
            <label className="filter-field-label">Tháng</label>
            <select value={editMonth} onChange={(e) => handleMonthChange(e.target.value)} disabled={!editYear}>
              <option value="">{editYear ? 'Tất cả' : 'Chọn năm'}</option>
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
          <div className="filter-field-group">
            <label className="filter-field-label">Từ ngày</label>
            <input
              type="date"
              value={editStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="filter-dropdown-input"
            />
          </div>
          <div className="filter-field-group">
            <label className="filter-field-label">Đến ngày</label>
            <input
              type="date"
              value={editEndDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="filter-dropdown-input"
            />
          </div>
          <div className="filter-field-group" style={{ gridColumn: 'span 2', marginTop: '8px', borderTop: '1px dashed #EADCC9', paddingTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#7B5233', fontWeight: 'bold' }}>
              <input 
                type="checkbox" 
                checked={editKpiShowAllTime} 
                onChange={(e) => setEditKpiShowAllTime(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              Hiển thị tổng cộng tất cả các tháng (Thẻ KPI)
            </label>
          </div>
          {!isDateFilterValid() && (
            <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '2px', fontWeight: '600', gridColumn: 'span 2' }}>
              Ngày tạo claim phải nằm trong tháng/năm đã chọn.
            </div>
          )}
        </div>
      )}
    </div>

    {/* CATEGORY 2: THÔNG TIN CLAIM */}
    <div className="filter-dropdown-wrapper">
      <button
        type="button"
        className={`btn-filter-dropdown ${activeDropdown === 'claim' ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'claim' ? null : 'claim'); }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <span>Thông tin claim</span>
        {['status', 'sku', 'defectCode', 'companyErrorCode', 'penalty', 'penaltyTotal'].filter(k => appliedFilters[k]).length > 0 && (
          <span className="filter-active-badge">
            {['status', 'sku', 'defectCode', 'companyErrorCode', 'penalty', 'penaltyTotal'].filter(k => appliedFilters[k]).length}
          </span>
        )}
        <span className="dropdown-arrow">▾</span>
      </button>
      {activeDropdown === 'claim' && (
        <div className="filter-dropdown-card grid-2col" style={{ width: '360px' }} onClick={(e) => e.stopPropagation()}>
          <div className="filter-field-group">
            <label className="filter-field-label">Trạng thái</label>
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="Mới">Mới</option>
              <option value="Đang xem xét">Đang xem xét</option>
              <option value="Đã xử lý">Đã xử lý</option>
            </select>
          </div>
          <div className="filter-field-group" style={{ position: 'relative' }}>
            <label className="filter-field-label">Tên sản phẩm</label>
            <input
              type="text"
              placeholder="Tên sản phẩm..."
              value={editSku}
              onChange={(e) => setEditSku(e.target.value)}
              className="filter-dropdown-input"
              onFocus={() => setShowSkuSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSkuSuggestions(false), 200)}
            />
            {showSkuSuggestions && (
              <div className="custom-autocomplete-suggestions">
                {uniqueSkuOptions
                  .filter(opt => !editSku || opt.toLowerCase().includes(editSku.toLowerCase()))
                  .map((opt, idx) => (
                    <div
                      key={idx}
                      className="custom-autocomplete-option"
                      onMouseDown={() => {
                        setEditSku(opt);
                        setShowSkuSuggestions(false);
                      }}
                    >
                      {opt}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="filter-field-group" style={{ position: 'relative' }}>
            <label className="filter-field-label">Mã lỗi KH</label>
            <input
              type="text"
              placeholder="Mã lỗi KH..."
              value={editDefectCode}
              onChange={(e) => setEditDefectCode(e.target.value)}
              className="filter-dropdown-input"
              onFocus={() => setShowDefectCodeSuggestions(true)}
              onBlur={() => setTimeout(() => setShowDefectCodeSuggestions(false), 200)}
            />
            {showDefectCodeSuggestions && (
              <div className="custom-autocomplete-suggestions">
                {uniqueDefectCodeOptions
                  .filter(opt => !editDefectCode || opt.toLowerCase().includes(editDefectCode.toLowerCase()))
                  .map((opt, idx) => (
                    <div
                      key={idx}
                      className="custom-autocomplete-option"
                      onMouseDown={() => {
                        setEditDefectCode(opt);
                        setShowDefectCodeSuggestions(false);
                      }}
                    >
                      {opt}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="filter-field-group" style={{ position: 'relative' }}>
            <label className="filter-field-label">Mã lỗi G7</label>
            <input
              type="text"
              placeholder="Mã lỗi G7..."
              value={editCompanyErrorCode}
              onChange={(e) => setEditCompanyErrorCode(e.target.value)}
              className="filter-dropdown-input"
              onFocus={() => setShowCompanyErrorCodeSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCompanyErrorCodeSuggestions(false), 200)}
            />
            {showCompanyErrorCodeSuggestions && (
              <div className="custom-autocomplete-suggestions">
                {uniqueCompanyErrorCodeOptions
                  .filter(opt => !editCompanyErrorCode || opt.toLowerCase().includes(editCompanyErrorCode.toLowerCase()))
                  .map((opt, idx) => (
                    <div
                      key={idx}
                      className="custom-autocomplete-option"
                      onMouseDown={() => {
                        setEditCompanyErrorCode(opt);
                        setShowCompanyErrorCodeSuggestions(false);
                      }}
                    >
                      {opt}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="filter-field-group" style={{ position: 'relative' }}>
            <label className="filter-field-label">Giá trị phạt</label>
            <input
              type="text"
              placeholder="Giá trị phạt..."
              value={editPenalty}
              onChange={(e) => setEditPenalty(e.target.value)}
              className="filter-dropdown-input"
              onFocus={() => setShowPenaltySuggestions(true)}
              onBlur={() => setTimeout(() => setShowPenaltySuggestions(false), 200)}
            />
            {showPenaltySuggestions && (
              <div className="custom-autocomplete-suggestions">
                {uniquePenaltyOptions
                  .filter(opt => !editPenalty || opt.toLowerCase().includes(editPenalty.toLowerCase()))
                  .map((opt, idx) => (
                    <div
                      key={idx}
                      className="custom-autocomplete-option"
                      onMouseDown={() => {
                        setEditPenalty(opt);
                        setShowPenaltySuggestions(false);
                      }}
                    >
                      {opt}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="filter-field-group" style={{ position: 'relative' }}>
            <label className="filter-field-label">Tổng tiền phạt</label>
            <input
              type="text"
              placeholder="Tổng tiền phạt..."
              value={editPenaltyTotal}
              onChange={(e) => setEditPenaltyTotal(e.target.value)}
              className="filter-dropdown-input"
              onFocus={() => setShowPenaltyTotalSuggestions(true)}
              onBlur={() => setTimeout(() => setShowPenaltyTotalSuggestions(false), 200)}
            />
            {showPenaltyTotalSuggestions && (
              <div className="custom-autocomplete-suggestions">
                {uniquePenaltyTotalOptions
                  .filter(opt => !editPenaltyTotal || opt.toLowerCase().includes(editPenaltyTotal.toLowerCase()))
                  .map((opt, idx) => (
                    <div
                      key={idx}
                      className="custom-autocomplete-option"
                      onMouseDown={() => {
                        setEditPenaltyTotal(opt);
                        setShowPenaltyTotalSuggestions(false);
                      }}
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
    <div className="filter-dropdown-wrapper">
      <button
        type="button"
        className={`btn-filter-dropdown ${activeDropdown === 'transport' ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'transport' ? null : 'transport'); }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Vận chuyển & Tham chiếu</span>
        {['claimItem', 'container', 'lpn'].filter(k => {
          const val = appliedFilters[k];
          if (!val) return false;
          if (k === 'claimItem' && (val === 'Cabinet#' || val === 'Cabinet #')) return false;
          return true;
        }).length > 0 && (
          <span className="filter-active-badge">
            {['claimItem', 'container', 'lpn'].filter(k => {
              const val = appliedFilters[k];
              if (!val) return false;
              if (k === 'claimItem' && (val === 'Cabinet#' || val === 'Cabinet #')) return false;
              return true;
            }).length}
          </span>
        )}
        <span className="dropdown-arrow">▾</span>
      </button>
      {activeDropdown === 'transport' && (
        <div className="filter-dropdown-card grid-2col" style={{ width: '360px' }} onClick={(e) => e.stopPropagation()}>
          <div className="filter-field-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
            <label className="filter-field-label">Claim item</label>
            <input
              type="text"
              placeholder="Cabinet#1..."
              value={editClaimItem}
              onChange={(e) => setEditClaimItem(e.target.value)}
              className="filter-dropdown-input"
              onFocus={() => setShowClaimItemSuggestions(true)}
              onBlur={() => setTimeout(() => setShowClaimItemSuggestions(false), 200)}
            />
            {showClaimItemSuggestions && (
              <div className="custom-autocomplete-suggestions">
                {uniqueClaimItemOptions
                  .filter(opt => !editClaimItem || opt.toLowerCase().includes(editClaimItem.toLowerCase()))
                  .map((opt, idx) => (
                    <div
                      key={idx}
                      className="custom-autocomplete-option"
                      onMouseDown={() => {
                        setEditClaimItem(opt);
                        setShowClaimItemSuggestions(false);
                      }}
                    >
                      {opt}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="filter-field-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
            <label className="filter-field-label">Container</label>
            <input
              type="text"
              placeholder="WHSU..."
              value={editContainer}
              onChange={(e) => setEditContainer(e.target.value)}
              className="filter-dropdown-input"
              onFocus={() => setShowContainerSuggestions(true)}
              onBlur={() => setTimeout(() => setShowContainerSuggestions(false), 200)}
            />
            {showContainerSuggestions && (
              <div className="custom-autocomplete-suggestions">
                {uniqueContainerOptions
                  .filter(opt => !editContainer || opt.toLowerCase().includes(editContainer.toLowerCase()))
                  .map((opt, idx) => (
                    <div
                      key={idx}
                      className="custom-autocomplete-option"
                      onMouseDown={() => {
                        setEditContainer(opt);
                        setShowContainerSuggestions(false);
                      }}
                    >
                      {opt}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="filter-field-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
            <label className="filter-field-label">LPN</label>
            <input
              type="text"
              placeholder="Mã LPN..."
              value={editLpn}
              onChange={(e) => setEditLpn(e.target.value)}
              className="filter-dropdown-input"
              onFocus={() => setShowLpnSuggestions(true)}
              onBlur={() => setTimeout(() => setShowLpnSuggestions(false), 200)}
            />
            {showLpnSuggestions && (
              <div className="custom-autocomplete-suggestions">
                {uniqueLpnOptions
                  .filter(opt => !editLpn || opt.toLowerCase().includes(editLpn.toLowerCase()))
                  .map((opt, idx) => (
                    <div
                      key={idx}
                      className="custom-autocomplete-option"
                      onMouseDown={() => {
                        setEditLpn(opt);
                        setShowLpnSuggestions(false);
                      }}
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

    {/* Active applied filter chips container with a border wrapper */}
    {activeFiltersCount > 0 && (
      <div
        className="filter-chips-wrapper"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1.5px dashed #EADCC9',
          borderRadius: '8px',
          padding: '4px 10px',
          backgroundColor: '#FFFFFF',
          minHeight: '34px',
          boxSizing: 'border-box',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#8D6E63', display: 'flex', alignItems: 'center' }}>Đã chọn:</span>
        {Object.entries(appliedFilters).map(([key, value]) => {
          if (!value) return null;
          if (key === 'claimItem' && (value === 'Cabinet#' || value === 'Cabinet #')) return null;
          let displayLabel = '';

          if (key === 'year') displayLabel = `Năm: ${value}`;
          else if (key === 'month') displayLabel = `Tháng: ${value}`;
          else if (key === 'startDate') displayLabel = `Từ ngày: ${value}`;
          else if (key === 'endDate') displayLabel = `Đến ngày: ${value}`;
          else if (key === 'status') displayLabel = `Trạng thái: ${value}`;
          else if (key === 'sku') displayLabel = `Tên sản phẩm: ${value}`;
          else if (key === 'claimItem') displayLabel = `Mã tham chiếu: ${value}`;
          else if (key === 'defectCode') displayLabel = `Mã lỗi KH: ${value}`;
          else if (key === 'companyErrorCode') displayLabel = `Mã lỗi G7: ${value}`;
          else if (key === 'container') displayLabel = `Container: ${value}`;
          else if (key === 'lpn') displayLabel = `LPN: ${value}`;
          else return null;

          return (
            <div
              key={key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FAF6F0',
                color: '#7B5233',
                fontSize: '0.78rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #EADCC9',
                height: '24px',
                boxSizing: 'border-box'
              }}
            >
              <span>{displayLabel}</span>
              <button
                type="button"
                onClick={() => removeFilterKey(key)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#A0301B',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontWeight: '900',
                  marginLeft: '2px'
                }}
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    )}

    {/* Reset filter button if any filter is active */}
    {activeFiltersCount > 0 && (
      <button
        type="button"
        onClick={clearAllFilters}
        style={{
          marginLeft: 'auto',
          background: 'none',
          border: 'none',
          color: '#A0301B',
          cursor: 'pointer',
          fontSize: '0.82rem',
          fontWeight: 'bold',
          textDecoration: 'underline',
          padding: '0 12px',
          height: '34px',
          display: 'inline-flex',
          alignItems: 'center'
        }}
      >
        Xóa bộ lọc
      </button>
    )}
  </div>

  );
};

export default ClaimFilterBar;
