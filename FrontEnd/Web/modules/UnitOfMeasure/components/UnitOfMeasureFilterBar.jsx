// UnitOfMeasureFilterBar.jsx - Thanh bộ lọc inline đồng bộ chuẩn ExportOrderFilterBar
import React, { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';

export const UnitOfMeasureFilterBar = ({
  pageSize = 25,
  setPageSize,
  setPage,
  statusFilter = 'ALL',
  setStatusFilter,
  activeFiltersCount = 0,
  resetAllFilters,
  activeDropdown,
  setActiveDropdown
}) => {
  const dropdownRef = useRef(null);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setActiveDropdown]);

  const getStatusLabel = () => {
    if (statusFilter === 'ACTIVE') return 'Đang hoạt động';
    if (statusFilter === 'INACTIVE') return 'Ngừng hoạt động';
    return 'Tất cả trạng thái';
  };

  return (
    <div className="exp-filter-inline-bar" ref={dropdownRef}>
      {/* Dropdown Số dòng hiển thị */}
      <div className="exp-filter-dropdown-wrapper">
        <button
          type="button"
          className={`exp-btn-filter-dropdown ${activeDropdown === 'pagesize' ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'pagesize' ? null : 'pagesize');
          }}
        >
          <span>Hiển thị: {pageSize} dòng</span>
          <span className="dropdown-arrow">▾</span>
        </button>

        {activeDropdown === 'pagesize' && (
          <div className="exp-filter-dropdown-card" style={{ width: '160px' }}>
            {[15, 25, 50, 100].map((size) => (
              <button
                key={size}
                type="button"
                className={`exp-filter-dropdown-option ${pageSize === size ? 'selected' : ''}`}
                onClick={() => {
                  setPageSize(size);
                  setPage(1);
                  setActiveDropdown(null);
                }}
              >
                {size} dòng / trang
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dropdown Lọc trạng thái */}
      <div className="exp-filter-dropdown-wrapper">
        <button
          type="button"
          className={`exp-btn-filter-dropdown ${activeDropdown === 'status' ? 'active' : ''} ${statusFilter !== 'ALL' ? 'has-value' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'status' ? null : 'status');
          }}
        >
          <span>Trạng thái{statusFilter !== 'ALL' ? `: ${getStatusLabel()}` : ''}</span>
          <span className="dropdown-arrow">▾</span>
        </button>

        {activeDropdown === 'status' && (
          <div className="exp-filter-dropdown-card" style={{ width: '190px' }}>
            <button
              type="button"
              className={`exp-filter-dropdown-option ${statusFilter === 'ALL' ? 'selected' : ''}`}
              onClick={() => {
                setStatusFilter('ALL');
                setPage(1);
                setActiveDropdown(null);
              }}
            >
              Tất cả trạng thái
            </button>
            <button
              type="button"
              className={`exp-filter-dropdown-option ${statusFilter === 'ACTIVE' ? 'selected' : ''}`}
              onClick={() => {
                setStatusFilter('ACTIVE');
                setPage(1);
                setActiveDropdown(null);
              }}
            >
              Đang hoạt động
            </button>
            <button
              type="button"
              className={`exp-filter-dropdown-option ${statusFilter === 'INACTIVE' ? 'selected' : ''}`}
              onClick={() => {
                setStatusFilter('INACTIVE');
                setPage(1);
                setActiveDropdown(null);
              }}
            >
              Ngừng hoạt động
            </button>
          </div>
        )}
      </div>

      {/* Nút xóa bộ lọc */}
      {activeFiltersCount > 0 && (
        <button
          type="button"
          className="exp-btn-reset-filters"
          onClick={resetAllFilters}
          title="Đặt lại toàn bộ bộ lọc"
        >
          <RotateCcw size={13} />
          <span>Xóa bộ lọc ({activeFiltersCount})</span>
        </button>
      )}
    </div>
  );
};

export default UnitOfMeasureFilterBar;
