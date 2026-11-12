import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, RotateCcw, Calendar, Layers, AlertCircle, ShieldAlert, X, Download } from 'lucide-react';

export const TIME_PRESETS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'today', label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'this_week', label: 'Tuần này' },
  { key: 'last_week', label: 'Tuần trước' },
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'this_year', label: 'Năm nay' },
  { key: 'custom', label: 'Tùy chọn' }
];

export const DashboardToolbar = ({
  searchQuery = '',
  setSearchQuery,
  preset = 'all',
  setPreset,
  startDate = '',
  setStartDate,
  endDate = '',
  setEndDate,
  selectedStage = '',
  setSelectedStage,
  stagesList = [],
  selectedCategory = '',
  setSelectedCategory,
  categoriesList = [],
  selectedAql = 'all',
  setSelectedAql,
  resetAllFilters,
  hasActiveFilter = false,
  lastUpdatedTime = '',
  onExportClick
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');

  // Đồng bộ search query từ props khi thay đổi bên ngoài
  useEffect(() => {
    setLocalSearch(searchQuery || '');
  }, [searchQuery]);

  // Debounce tìm kiếm (280ms) để không gây lag giật biểu đồ
  useEffect(() => {
    const timer = setTimeout(() => {
      if (setSearchQuery) {
        setSearchQuery(localSearch);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // Đếm số lượng tiêu chí lọc nâng cao đang áp dụng
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (preset && preset !== 'all') count++;
    if (selectedStage && selectedStage !== 'all') count++;
    if (selectedCategory && selectedCategory !== 'all') count++;
    if (selectedAql && selectedAql !== 'all') count++;
    return count;
  }, [preset, selectedStage, selectedCategory, selectedAql]);

  return (
    <div
      data-toolbar="true"
      data-no-export="true"
      className="no-export dashboard-toolbar-container"
      style={{ display: 'flex', flexDirection: 'column', width: '100%', flexShrink: 0 }}
    >
      {/* ── THANH CÔNG CỤ CHÍNH CHUẨN G7 / ĐỒNG BỘ ĐƠN HÀNG XUẤT KHẨU ── */}
      <div className="exp-toolbar" data-toolbar="true" data-no-export="true">
        {/* Bên trái: Ô tìm kiếm + Nút bật/tắt Bộ lọc */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
          {/* Ô tìm kiếm */}
          <div className="exp-search-box filter">
            <Search size={15} color="#7B5233" />
            <input
              type="text"
              placeholder="Tìm mã lỗi, tên lỗi, công đoạn..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button
                type="button"
                className="page-btn"
                onClick={() => {
                  setLocalSearch('');
                  if (setSearchQuery) setSearchQuery('');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#8D6E63' }}
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Nút bật/tắt Bộ lọc nâng cao */}
          <button
            type="button"
            className={`exp-btn-icon page-btn ${isFilterOpen || activeFiltersCount > 0 ? 'active' : ''}`}
            onClick={() => setIsFilterOpen((prev) => !prev)}
            title="Bộ lọc nâng cao"
          >
            <Filter size={15} />
            {activeFiltersCount > 0 && <span className="exp-badge-count">{activeFiltersCount}</span>}
          </button>
        </div>

        {/* Bên phải: Nút Xuất Dashboard */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {lastUpdatedTime && (
            <span style={{ fontSize: '0.67rem', color: '#A8A29E', fontWeight: '500', whiteSpace: 'nowrap' }}>
              {lastUpdatedTime}
            </span>
          )}

          {onExportClick && (
            <button
              type="button"
              className="exp-btn-brown page-btn"
              onClick={onExportClick}
              title="Xuất báo cáo Dashboard (PNG/PDF)"
            >
              <Download size={14} />
              <span>Xuất Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* ── VÙNG BỘ LỌC MỞ RỘNG (COLLAPSIBLE FILTER BAR) ── */}
      {isFilterOpen && (
        <div className="exp-filter-inline-bar filter">
          {/* 1. Lựa chọn thời gian (Presets) */}
          <div className="exp-filter-item">
            <span className="exp-filter-item-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Calendar size={12} />
              Thời gian:
            </span>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className={`exp-filter-select ${preset && preset !== 'all' ? 'has-value' : ''}`}
            >
              {TIME_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2 & 3. Từ ngày - Đến ngày */}
          <div className="exp-filter-item">
            <span className="exp-filter-item-label">Từ</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={preset === 'all'}
              className="exp-filter-input exp-filter-date-input"
              style={{ cursor: preset === 'all' ? 'not-allowed' : 'pointer' }}
            />
            <span className="exp-filter-item-label">Đến</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={preset === 'all'}
              className="exp-filter-input exp-filter-date-input"
              style={{ cursor: preset === 'all' ? 'not-allowed' : 'pointer' }}
            />
          </div>

          {/* 4. Công đoạn */}
          <div className="exp-filter-item">
            <span className="exp-filter-item-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Layers size={12} />
              Công đoạn:
            </span>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className={`exp-filter-select ${selectedStage && selectedStage !== 'all' ? 'has-value' : ''}`}
              style={{ minWidth: '110px' }}
            >
              <option value="">Tất cả công đoạn</option>
              {stagesList.map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Nhóm lỗi */}
          <div className="exp-filter-item">
            <span className="exp-filter-item-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <AlertCircle size={12} />
              Nhóm lỗi:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`exp-filter-select ${selectedCategory && selectedCategory !== 'all' ? 'has-value' : ''}`}
              style={{ minWidth: '110px' }}
            >
              <option value="">Tất cả nhóm lỗi</option>
              {categoriesList.map((cat) => (
                <option key={cat.code || cat.name} value={cat.code || cat.name}>
                  {cat.name || cat.code}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Mức AQL */}
          <div className="exp-filter-item">
            <span className="exp-filter-item-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ShieldAlert size={12} />
              AQL:
            </span>
            <select
              value={selectedAql}
              onChange={(e) => setSelectedAql(e.target.value)}
              className={`exp-filter-select ${selectedAql !== 'all' ? 'has-value' : ''}`}
              style={{ minWidth: '85px' }}
            >
              <option value="all">Tất cả</option>
              <option value="Minor">Minor</option>
              <option value="Major">Major</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* 7. Nút Đặt lại bộ lọc */}
          <button
            type="button"
            onClick={resetAllFilters}
            className="exp-btn-reset page-btn"
            title="Đặt lại toàn bộ bộ lọc về mặc định"
          >
            <RotateCcw size={12} />
            <span>Đặt lại</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardToolbar;
