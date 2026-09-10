import React, { useState } from 'react';
import { Search, Filter, FileText, ArrowUpDown, X } from 'lucide-react';
import { TimeFilterDropdown, TimeFilterChips } from '@webShared/Views/components/ui/TimeFilterDropdown';

/**
 * DashboardToolbar
 * Thanh toolbar chuẩn ERP với Bộ lọc Thời gian Popover (Năm, Tháng, Từ ngày, Đến ngày)
 */
export const DashboardToolbar = ({
  searchQuery = '',
  setSearchQuery,
  selectedMonth = 9,
  setSelectedMonth,
  selectedYear = 2026,
  setSelectedYear,
  startDate = '',
  setStartDate,
  endDate = '',
  setEndDate,
  selectedStage = '',
  setSelectedStage,
  selectedCategory = '',
  setSelectedCategory,
  selectedAql = 'all',
  setSelectedAql,
  stagesList = [],
  categoriesList = [],
  activeCrossFilter = null,
  clearCrossFilter,
  hasActiveFilter = false,
  onExport
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const handleExportCSV = () => {
    if (onExport) {
      onExport();
    } else {
      alert('Đang xuất dữ liệu phân tích lỗi chất lượng...');
    }
  };

  return (
    <div
      className="erp-dashboard-toolbar"
      style={{
        marginBottom: '0px',
        padding: '3px 8px',
        borderRadius: '6px',
        position: 'relative',
        zIndex: 500,
        overflow: 'visible'
      }}
    >
      {/* Hàng 1: Thanh tìm kiếm + Sort + Filter + Nút Xuất dữ liệu */}
      <div className="erp-toolbar-row1" style={{ height: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Ô tìm kiếm dạng viên thuốc (Pill search) */}
          <div className="erp-search-wrapper" style={{ width: '260px', height: '25px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search nhanh mã lỗi, tên lỗi, vị trí..."
              value={searchQuery}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              className="erp-search-input"
              style={{ height: '25px', fontSize: '0.73rem', paddingLeft: '28px' }}
            />
            {searchQuery && (
              <X
                size={12}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => setSearchQuery && setSearchQuery('')}
              />
            )}
          </div>

          {/* Nút icon Sort */}
          <button className="erp-btn-icon" style={{ width: '25px', height: '25px' }} title="Sắp xếp">
            <ArrowUpDown size={12} />
          </button>

          {/* Nút icon Lọc */}
          <button
            onClick={() => setShowFilters(prev => !prev)}
            className={`erp-btn-icon ${showFilters || hasActiveFilter ? 'active' : ''}`}
            title={showFilters ? 'Ẩn bộ lọc' : 'Mở bộ lọc chi tiết'}
            style={{ width: '25px', height: '25px' }}
          >
            <Filter size={12} />
          </button>
        </div>

        {/* Nút Xuất dữ liệu */}
        <div>
          <button onClick={handleExportCSV} className="erp-btn-export" style={{ height: '25px', padding: '0 10px', fontSize: '0.72rem', gap: '5px' }}>
            <FileText size={12} />
            <span>Xuất dữ liệu</span>
          </button>
        </div>
      </div>

      {/* Hàng 2: Chỉ hiển thị KHI NHẤN VÀO ICON LỌC */}
      {(showFilters || hasActiveFilter) && (
        <div className="erp-toolbar-row2" style={{ height: 'auto', paddingTop: '6px', paddingBottom: '4px', position: 'relative', zIndex: 500, overflow: 'visible' }}>
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
              showChipsInline={false}
            />

            {/* 2. Chip: Công đoạn */}
            <div className={`erp-chip ${activeCrossFilter?.type === 'stage' ? 'active' : ''}`} style={{ gap: '4px', height: '30px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Công đoạn:</span>
              <select
                value={selectedStage || (activeCrossFilter?.type === 'stage' ? activeCrossFilter.value : '')}
                onChange={(e) => setSelectedStage && setSelectedStage(e.target.value)}
                style={{ cursor: 'pointer', border: 'none', background: 'transparent', fontSize: '0.68rem', fontWeight: '600' }}
              >
                <option value="">Tất cả</option>
                {stagesList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 3. Chip: Nhóm lỗi */}
            <div className={`erp-chip ${activeCrossFilter?.type === 'category' ? 'active' : ''}`} style={{ gap: '4px', height: '30px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Nhóm lỗi:</span>
              <select
                value={selectedCategory || (activeCrossFilter?.type === 'category' ? activeCrossFilter.value : '')}
                onChange={(e) => setSelectedCategory && setSelectedCategory(e.target.value)}
                style={{ cursor: 'pointer', border: 'none', background: 'transparent', fontSize: '0.68rem', fontWeight: '600' }}
              >
                <option value="">Tất cả</option>
                {categoriesList.map(c => <option key={c.code || c} value={c.code || c}>{c.name || c}</option>)}
              </select>
            </div>

            {/* 4. Chip: Mức AQL */}
            <div className="erp-chip" style={{ gap: '4px', height: '30px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Mức AQL:</span>
              <select
                value={selectedAql}
                onChange={(e) => setSelectedAql && setSelectedAql(e.target.value)}
                style={{ cursor: 'pointer', border: 'none', background: 'transparent', fontSize: '0.68rem', fontWeight: '600' }}
              >
                <option value="all">Tất cả</option>
                <option value="Critical">Critical</option>
                <option value="Major">Major</option>
                <option value="Minor">Minor</option>
              </select>
            </div>

            {/* 5. Khung ĐÃ CHỌN đặt ở ngoài cùng */}
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
                selectedStage ? { label: `Công đoạn: ${selectedStage}`, onRemove: () => setSelectedStage && setSelectedStage('') } : null,
                selectedCategory ? { label: `Nhóm lỗi: ${categoriesList.find(c => (c.code || c) === selectedCategory)?.name || selectedCategory}`, onRemove: () => setSelectedCategory && setSelectedCategory('') } : null,
                selectedAql !== 'all' ? { label: `AQL: ${selectedAql}`, onRemove: () => setSelectedAql && setSelectedAql('all') } : null
              ].filter(Boolean)}
              onClearAll={() => {
                if (setSelectedYear) setSelectedYear('');
                if (setSelectedMonth) setSelectedMonth('');
                if (setStartDate) setStartDate('');
                if (setEndDate) setEndDate('');
                if (setSelectedStage) setSelectedStage('');
                if (setSelectedCategory) setSelectedCategory('');
                if (setSelectedAql) setSelectedAql('all');
                if (clearCrossFilter) clearCrossFilter();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardToolbar;

