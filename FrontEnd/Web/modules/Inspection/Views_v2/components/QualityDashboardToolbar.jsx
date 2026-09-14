import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, FileText, ArrowUpDown, X, Image as ImageIcon, FileCode, ChevronDown, Loader2 } from 'lucide-react';
import { TimeFilterDropdown, TimeFilterChips } from '@webShared/Views/components/ui/TimeFilterDropdown';

/**
 * QualityDashboardToolbar
 * Thanh toolbar chuẩn ERP với Bộ lọc Thời gian Popover & Menu Xuất dữ liệu (Ảnh / PDF)
 * Giao diện White Card đồng bộ toàn hệ thống SmartFlow G7.
 */
export const QualityDashboardToolbar = ({
  searchQuery = '',
  setSearchQuery,
  selectedMonth = '',
  setSelectedMonth,
  selectedYear = '',
  setSelectedYear,
  startDate = '',
  setStartDate,
  endDate = '',
  setEndDate,
  selectedFactory = 'all',
  setSelectedFactory,
  selectedLine = 'all',
  setSelectedLine,
  selectedDept = 'all',
  setSelectedDept,
  selectedBrand = 'all',
  setSelectedBrand,
  availableFilters = null,
  onExportImage,
  onExportPDF,
  isExporting = false,
  exportType = ''
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Tính số lượng bộ lọc đang active
  const activeFilterCount = [
    selectedFactory !== 'all',
    selectedBrand !== 'all',
    Boolean(selectedMonth),
    Boolean(selectedYear),
    Boolean(startDate),
    Boolean(endDate)
  ].filter(Boolean).length;

  // Đóng dropdown xuất khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className="erp-dashboard-toolbar"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4DDD5',
        borderRadius: '8px',
        padding: '6px 12px',
        marginBottom: '4px',
        boxShadow: '0 1px 3px rgba(91, 57, 36, 0.04)',
        position: 'relative',
        zIndex: 500,
        overflow: 'visible',
        flexShrink: 0
      }}
    >
      {/* Hàng 1: Thanh tìm kiếm + Sort + Filter + Nút Xuất dữ liệu */}
      <div className="erp-toolbar-row1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Ô tìm kiếm dạng viên thuốc (Pill search) */}
          <div className="erp-search-wrapper" style={{ position: 'relative', width: '280px', height: '32px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo tên, mã SKU, Cont..."
              value={searchQuery}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              className="erp-search-input"
              style={{
                width: '100%',
                height: '32px',
                fontSize: '0.8rem',
                paddingLeft: '34px',
                paddingRight: searchQuery ? '30px' : '12px',
                borderRadius: '20px',
                border: '1px solid #E4DDD5',
                background: '#FFFDFC',
                color: '#302820',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <X
                size={13}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => setSearchQuery && setSearchQuery('')}
              />
            )}
          </div>

          {/* Nút icon Sort */}
          <button
            type="button"
            className="erp-btn-icon"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #E4DDD5',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#5B3924'
            }}
            title="Sắp xếp"
          >
            <ArrowUpDown size={14} />
          </button>

          {/* Nút icon Lọc kèm Badge số lượng (Chuẩn ảnh 2) */}
          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            style={{
              height: '32px',
              padding: '0 10px',
              borderRadius: '8px',
              border: showFilters || activeFilterCount > 0 ? '1.5px solid #5B3924' : '1px solid #E4DDD5',
              background: showFilters || activeFilterCount > 0 ? '#FAF6F0' : '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: '#5B3924',
              position: 'relative',
              fontWeight: '600',
              fontSize: '0.78rem'
            }}
            title={showFilters ? 'Ẩn bộ lọc' : 'Mở bộ lọc chi tiết'}
          >
            <Filter size={14} color="#5B3924" />
            {activeFilterCount > 0 && (
              <span
                style={{
                  background: '#5B3924',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Nút Xuất dữ liệu (Walnut Brown Button chuẩn ERP) */}
        <div style={{ position: 'relative' }} ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => !isExporting && setShowExportMenu(prev => !prev)}
            disabled={isExporting}
            style={{
              height: '32px',
              padding: '0 14px',
              fontSize: '0.8rem',
              fontWeight: '600',
              borderRadius: '6px',
              background: '#5B3924',
              color: '#FFFDFC',
              border: 'none',
              gap: '6px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.8 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(91, 57, 36, 0.2)'
            }}
            title="Nhấn để chọn xuất Ảnh hoặc PDF"
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileText size={14} />
            )}
            <span>
              {isExporting
                ? (exportType === 'pdf' ? 'Đang xuất PDF...' : 'Đang xuất ảnh...')
                : 'Xuất dữ liệu'}
            </span>
            <ChevronDown size={12} style={{ marginLeft: '2px' }} />
          </button>

          {/* Menu lựa chọn dạng xuất */}
          {showExportMenu && (
            <div style={{
              position: 'absolute',
              top: '36px',
              right: 0,
              zIndex: 9999,
              background: '#FFFFFF',
              border: '1.5px solid #E4DDD5',
              borderRadius: '6px',
              boxShadow: '0 8px 24px rgba(91, 57, 36, 0.18)',
              width: '185px',
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              {/* Lựa chọn 1: Xuất hình ảnh PNG */}
              <button
                type="button"
                onClick={() => {
                  setShowExportMenu(false);
                  if (onExportImage) onExportImage();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '7px 10px',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  color: '#302820',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FAF6F0'; e.currentTarget.style.color = '#5B3924'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#302820'; }}
              >
                <ImageIcon size={14} color="#5B3924" />
                <span>Xuất hình ảnh (PNG)</span>
              </button>

              {/* Lựa chọn 2: Xuất tài liệu PDF */}
              <button
                type="button"
                onClick={() => {
                  setShowExportMenu(false);
                  if (onExportPDF) onExportPDF();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '7px 10px',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  color: '#302820',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FAF6F0'; e.currentTarget.style.color = '#5B3924'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#302820'; }}
              >
                <FileText size={14} color="#70452D" />
                <span>Xuất tài liệu (PDF)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hàng 2: Hiện khi nhấn nút Lọc */}
      {showFilters && (
        <div
          className="erp-toolbar-row2"
          style={{
            height: 'auto',
            paddingTop: '8px',
            paddingBottom: '4px',
            borderTop: '1px solid #F0EAE1',
            marginTop: '6px',
            position: 'relative',
            zIndex: 500,
            overflow: 'visible'
          }}
        >
          <div className="erp-filter-chips" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* 1. Bộ lọc Thời gian dạng Popover Dropdown */}
            <TimeFilterDropdown
              year={selectedYear ? String(selectedYear) : ''}
              setYear={setSelectedYear ? (y) => setSelectedYear(y ? parseInt(y) : '') : undefined}
              month={selectedMonth ? String(selectedMonth) : ''}
              setMonth={setSelectedMonth ? (m) => setSelectedMonth(m ? parseInt(m) : '') : undefined}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              availableYears={availableFilters?.years ? availableFilters.years.map(String) : ['2026']}
              availableMonths={availableFilters?.months ? availableFilters.months : null}
              showChipsInline={false}
            />

            {/* 2. Nhà máy */}
            <div className="erp-chip" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', height: '30px', background: '#FAF6F0', padding: '0 8px', borderRadius: '6px', border: '1px solid #E4DDD5' }}>
              <span style={{ fontWeight: '700', color: '#5B3924' }}>Nhà máy:</span>
              <select
                value={selectedFactory}
                onChange={(e) => setSelectedFactory && setSelectedFactory(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', color: '#302820', outline: 'none' }}
              >
                <option value="all">Tất cả</option>
                <option value="NM1">NM1</option>
                <option value="NM2">NM2</option>
              </select>
            </div>

            {/* 3. Dòng hàng */}
            <div className="erp-chip" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', height: '30px', background: '#FAF6F0', padding: '0 8px', borderRadius: '6px', border: '1px solid #E4DDD5' }}>
              <span style={{ fontWeight: '700', color: '#5B3924' }}>Dòng hàng:</span>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand && setSelectedBrand(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', color: '#302820', outline: 'none' }}
              >
                <option value="all">Tất cả</option>
                <option value="vanity">Vanity</option>
                <option value="furniture">Furniture</option>
              </select>
            </div>

            {/* 4. Khung ĐÃ CHỌN đặt ở ngoài cùng bên phải */}
            <TimeFilterChips
              year={selectedYear ? String(selectedYear) : ''}
              setYear={setSelectedYear ? (y) => setSelectedYear(y ? parseInt(y) : '') : undefined}
              month={selectedMonth ? String(selectedMonth) : ''}
              setMonth={setSelectedMonth ? (m) => setSelectedMonth(m ? parseInt(m) : '') : undefined}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              extraChips={[
                selectedFactory !== 'all' ? { label: `Nhà máy: ${selectedFactory}`, onRemove: () => setSelectedFactory && setSelectedFactory('all') } : null,
                selectedBrand !== 'all' ? { label: `Dòng hàng: ${selectedBrand}`, onRemove: () => setSelectedBrand && setSelectedBrand('all') } : null
              ].filter(Boolean)}
              onClearAll={() => {
                if (setSelectedYear) setSelectedYear('');
                if (setSelectedMonth) setSelectedMonth('');
                if (setStartDate) setStartDate('');
                if (setEndDate) setEndDate('');
                if (setSelectedFactory) setSelectedFactory('all');
                if (setSelectedBrand) setSelectedBrand('all');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityDashboardToolbar;
