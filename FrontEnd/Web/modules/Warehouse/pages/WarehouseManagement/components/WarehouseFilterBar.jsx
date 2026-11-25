// WarehouseFilterBar.jsx - Thanh bộ lọc mở rộng dạng ngang cho phân hệ Quản lý kho (XNT)
// Chuẩn hóa theo thiết kế module Đơn hàng xuất khẩu (ExportOrderFilterBar)
import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { DateTimeFilterPopover } from '@webShared/Views/components/common/DateTimeFilterPopover';
import {
  WAREHOUSE_TABS,
  ITEM_CATEGORIES,
  UNIT_OPTIONS,
  STOCK_STATUS_OPTIONS
} from '../../../types/warehouseInventory.types';
import { useWarehouseMeta } from '../../../hooks/useWarehouseMeta';

export const WarehouseFilterBar = ({
  pageSize = 15,
  setPageSize,
  setPage,
  timeFilter = { year: '', month: '', fromDate: '', toDate: '' },
  setTimeFilter,
  selectedWarehouse = 'ALL',
  setSelectedWarehouse,
  categoryFilter = 'ALL',
  setCategoryFilter,
  unitMainFilter = 'ALL',
  setUnitMainFilter,
  stockStatusFilter = 'ALL',
  setStockStatusFilter,
  activeFiltersCount = 0,
  resetAllFilters
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const { warehouseTabs } = useWarehouseMeta();

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.exp-filter-dropdown-wrapper')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeWhTabs = warehouseTabs.length > 1 ? warehouseTabs : (Array.isArray(WAREHOUSE_TABS) ? WAREHOUSE_TABS : []);
  const safeCategories = Array.isArray(ITEM_CATEGORIES) ? ITEM_CATEGORIES : [];
  const safeUnits = Array.isArray(UNIT_OPTIONS) ? UNIT_OPTIONS : [];
  const safeStatuses = Array.isArray(STOCK_STATUS_OPTIONS) ? STOCK_STATUS_OPTIONS : [];

  const currentWh = safeWhTabs.find((w) => w?.code === selectedWarehouse);
  const currentCat = safeCategories.find((c) => c?.value === categoryFilter);
  const currentStatus = safeStatuses.find((s) => s?.value === stockStatusFilter);
  const currentUnitObj = safeUnits.find((u) => (typeof u === 'object' ? u?.value === unitMainFilter : u === unitMainFilter));

  return (
    <div className="exp-filter-inline-bar" style={{ marginBottom: '8px' }}>
      {/* 1. Hiển thị số dòng */}
      <div className="exp-filter-dropdown-wrapper">
        <button
          type="button"
          className={`exp-btn-filter-dropdown ${activeDropdown === 'pagesize' ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'pagesize' ? null : 'pagesize');
          }}
          title="Chọn số lượng dòng hiển thị trên mỗi trang"
        >
          <span>Hiển thị: {pageSize} dòng</span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'pagesize' && (
          <div className="exp-filter-dropdown-card" style={{ width: '160px' }}>
            {[10, 15, 25, 50, 100, 300].map((size) => (
              <button
                key={size}
                type="button"
                className={`exp-filter-dropdown-option ${pageSize === size ? 'selected' : ''}`}
                onClick={() => {
                  if (setPageSize) setPageSize(size);
                  if (setPage) setPage(1);
                  setActiveDropdown(null);
                }}
              >
                {size} dòng / trang
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Lọc thời gian chuẩn hóa dùng chung (Năm, Tháng, Từ ngày, Đến ngày) */}
      <DateTimeFilterPopover
        value={timeFilter || { year: '', month: '', fromDate: '', toDate: '' }}
        onChange={(nextTime) => {
          if (setTimeFilter) setTimeFilter(nextTime);
          if (setPage) setPage(1);
        }}
        isOpen={activeDropdown === 'time'}
        onToggle={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')}
        years={['2026', '2025', '2024', '2023', '2022']}
      />

      {/* 3. Lọc Kho (đồng bộ 100% với các Tab kho) */}
      <div className="exp-filter-dropdown-wrapper">
        <button
          type="button"
          className={`exp-btn-filter-dropdown ${activeDropdown === 'warehouse' ? 'active' : ''} ${
            selectedWarehouse && selectedWarehouse !== 'ALL' ? 'has-value' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'warehouse' ? null : 'warehouse');
          }}
          title="Lọc theo kho lưu trữ"
        >
          <span>Kho: {currentWh ? currentWh.name : 'Tất cả các kho'}</span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'warehouse' && (
          <div className="exp-filter-dropdown-card" style={{ width: '220px' }}>
            <div className="exp-filter-options-list">
              {safeWhTabs.map((w) => (
                <button
                  key={w.code}
                  type="button"
                  className={`exp-filter-dropdown-option ${
                    selectedWarehouse === w.code ? 'selected' : ''
                  }`}
                  onClick={() => {
                    if (setSelectedWarehouse) setSelectedWarehouse(w.code);
                    if (setPage) setPage(1);
                    setActiveDropdown(null);
                  }}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Lọc Nhóm vật tư / hàng hóa */}
      <div className="exp-filter-dropdown-wrapper">
        <button
          type="button"
          className={`exp-btn-filter-dropdown ${activeDropdown === 'category' ? 'active' : ''} ${
            categoryFilter && categoryFilter !== 'ALL' ? 'has-value' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'category' ? null : 'category');
          }}
          title="Lọc theo nhóm vật tư"
        >
          <span>Nhóm: {currentCat && categoryFilter !== 'ALL' ? currentCat.label : 'Tất cả nhóm'}</span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'category' && (
          <div className="exp-filter-dropdown-card" style={{ width: '220px' }}>
            <div className="exp-filter-options-list">
              {safeCategories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  className={`exp-filter-dropdown-option ${
                    categoryFilter === cat.value ? 'selected' : ''
                  }`}
                  onClick={() => {
                    if (setCategoryFilter) setCategoryFilter(cat.value);
                    if (setPage) setPage(1);
                    setActiveDropdown(null);
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Lọc Đơn vị tính chính */}
      <div className="exp-filter-dropdown-wrapper">
        <button
          type="button"
          className={`exp-btn-filter-dropdown ${activeDropdown === 'unit' ? 'active' : ''} ${
            unitMainFilter && unitMainFilter !== 'ALL' ? 'has-value' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'unit' ? null : 'unit');
          }}
          title="Lọc theo đơn vị tính chính"
        >
          <span>
            ĐVT:{' '}
            {unitMainFilter && unitMainFilter !== 'ALL'
              ? currentUnitObj?.label || unitMainFilter
              : 'Tất cả ĐVT'}
          </span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'unit' && (
          <div className="exp-filter-dropdown-card" style={{ width: '180px' }}>
            <div className="exp-filter-options-list">
              <button
                type="button"
                className={`exp-filter-dropdown-option ${unitMainFilter === 'ALL' ? 'selected' : ''}`}
                onClick={() => {
                  if (setUnitMainFilter) setUnitMainFilter('ALL');
                  if (setPage) setPage(1);
                  setActiveDropdown(null);
                }}
              >
                Tất cả ĐVT
              </button>
              {safeUnits
                .filter((u) => (typeof u === 'object' ? u.value !== 'ALL' : u !== 'ALL'))
                .map((u) => {
                  const val = typeof u === 'object' ? u.value : u;
                  const label = typeof u === 'object' ? u.label : u;
                  return (
                    <button
                      key={val}
                      type="button"
                      className={`exp-filter-dropdown-option ${unitMainFilter === val ? 'selected' : ''}`}
                      onClick={() => {
                        if (setUnitMainFilter) setUnitMainFilter(val);
                        if (setPage) setPage(1);
                        setActiveDropdown(null);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* 6. Lọc Trạng thái tồn kho */}
      <div className="exp-filter-dropdown-wrapper">
        <button
          type="button"
          className={`exp-btn-filter-dropdown ${activeDropdown === 'stockStatus' ? 'active' : ''} ${
            stockStatusFilter && stockStatusFilter !== 'ALL' ? 'has-value' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'stockStatus' ? null : 'stockStatus');
          }}
          title="Lọc theo tình trạng tồn kho"
        >
          <span>
            Trạng thái:{' '}
            {currentStatus && stockStatusFilter !== 'ALL'
              ? currentStatus.label
              : 'Tất cả trạng thái'}
          </span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'stockStatus' && (
          <div className="exp-filter-dropdown-card" style={{ width: '200px' }}>
            <div className="exp-filter-options-list">
              {safeStatuses.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  className={`exp-filter-dropdown-option ${
                    stockStatusFilter === st.value ? 'selected' : ''
                  }`}
                  onClick={() => {
                    if (setStockStatusFilter) setStockStatusFilter(st.value);
                    if (setPage) setPage(1);
                    setActiveDropdown(null);
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 7. Nút Đặt lại toàn bộ bộ lọc */}
      {activeFiltersCount > 0 && (
        <button
          type="button"
          className="exp-btn-reset-filters"
          onClick={() => {
            if (resetAllFilters) resetAllFilters();
            setActiveDropdown(null);
          }}
          title="Xóa toàn bộ các điều kiện lọc đang chọn"
        >
          <RotateCcw size={13} />
          <span>Đặt lại</span>
        </button>
      )}
    </div>
  );
};

export default WarehouseFilterBar;
