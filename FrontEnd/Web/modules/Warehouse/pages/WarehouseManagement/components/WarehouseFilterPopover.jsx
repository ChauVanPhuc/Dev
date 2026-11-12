// WarehouseFilterPopover.jsx - Popup bộ lọc Quản lý kho mở khi nhấn icon Filter trên thanh công cụ
import React, { useRef, useEffect } from 'react';
import { RotateCcw, Check, X } from 'lucide-react';
import {
  WAREHOUSE_TABS,
  ITEM_CATEGORIES,
  UNIT_OPTIONS,
  UNIT_CONV_OPTIONS,
  STOCK_STATUS_OPTIONS
} from '../../../types/warehouseInventory.types';
import { useWarehouseMeta } from '../../../hooks/useWarehouseMeta';

export const WarehouseFilterPopover = ({
  isOpen,
  onClose,
  selectedWarehouse,
  setSelectedWarehouse,
  categoryFilter,
  setCategoryFilter,
  unitMainFilter,
  setUnitMainFilter,
  unitConvFilter,
  setUnitConvFilter,
  unitFilter,
  setUnitFilter,
  stockStatusFilter,
  setStockStatusFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  resetAllFilters,
  activeFiltersCount = 0
}) => {
  const { warehouseTabs } = useWarehouseMeta();
  const activeWhTabs = warehouseTabs.length > 1 ? warehouseTabs : WAREHOUSE_TABS;
  const activeUnitMain = unitMainFilter !== undefined ? unitMainFilter : unitFilter;
  const handleSetUnitMain = setUnitMainFilter || setUnitFilter;
  const popoverRef = useRef(null);

  // Đóng khi click ngoài popup
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        // Đảm bảo không đóng nếu click vào nút icon filter
        if (!e.target.closest('#wh-filter-btn')) {
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="wh-filter-popover"
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        width: '320px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #EADCC9',
        borderRadius: '8px',
        boxShadow: '0 12px 30px rgba(123, 82, 51, 0.18)',
        zIndex: 1100,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F5EDE4', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#2D1A12' }}>Bộ lọc quản lý kho</span>
          {activeFiltersCount > 0 && (
            <span
              style={{
                backgroundColor: '#7B5233',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '0.68rem',
                fontWeight: 700
              }}
            >
              {activeFiltersCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            color: '#8D6E63'
          }}
          title="Đóng popup"
        >
          <X size={16} />
        </button>
      </div>

      {/* Trường 1: Kho */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', textTransform: 'uppercase' }}>
          Kho lưu trữ
        </label>
        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          style={{
            height: '32px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid #EADCC9',
            backgroundColor: '#FFFFFF',
            color: '#2D1A12',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        >
          {activeWhTabs.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {/* Trường 2: Nhóm vật tư */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', textTransform: 'uppercase' }}>
          Nhóm vật tư / hàng hóa
        </label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            height: '32px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid #EADCC9',
            backgroundColor: '#FFFFFF',
            color: '#2D1A12',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        >
          {ITEM_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Trường 3: Đơn vị tính chính (ĐVC) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', textTransform: 'uppercase' }}>
          Đơn vị tính chính (ĐVC)
        </label>
        <select
          value={activeUnitMain || 'ALL'}
          onChange={(e) => handleSetUnitMain && handleSetUnitMain(e.target.value)}
          style={{
            height: '32px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid #EADCC9',
            backgroundColor: '#FFFFFF',
            color: '#2D1A12',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        >
          {UNIT_OPTIONS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      {/* Trường 3b: Đơn vị chuyển đổi (ĐVCĐ) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', textTransform: 'uppercase' }}>
          Đơn vị chuyển đổi (ĐVCĐ)
        </label>
        <select
          value={unitConvFilter || 'ALL'}
          onChange={(e) => setUnitConvFilter && setUnitConvFilter(e.target.value)}
          style={{
            height: '32px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid #EADCC9',
            backgroundColor: '#FFFFFF',
            color: '#2D1A12',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        >
          {UNIT_CONV_OPTIONS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      {/* Trường 4: Tình trạng tồn kho */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', textTransform: 'uppercase' }}>
          Tình trạng tồn kho
        </label>
        <select
          value={stockStatusFilter}
          onChange={(e) => setStockStatusFilter(e.target.value)}
          style={{
            height: '32px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid #EADCC9',
            backgroundColor: '#FFFFFF',
            color: '#2D1A12',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        >
          {STOCK_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Trường 5: Thời gian từ ngày – đến ngày */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', textTransform: 'uppercase' }}>
          Khoảng thời gian phát sinh
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <div>
            <span style={{ fontSize: '0.68rem', color: '#8D6E63' }}>Từ ngày:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                width: '100%',
                height: '30px',
                padding: '0 6px',
                borderRadius: '6px',
                border: '1px solid #EADCC9',
                fontSize: '0.75rem',
                color: '#2D1A12',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', color: '#8D6E63' }}>Đến ngày:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: '100%',
                height: '30px',
                padding: '0 6px',
                borderRadius: '6px',
                border: '1px solid #EADCC9',
                fontSize: '0.75rem',
                color: '#2D1A12',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer hành động: Xóa bộ lọc & Đóng */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #F5EDE4',
          paddingTop: '10px',
          marginTop: '4px'
        }}
      >
        <button
          type="button"
          onClick={() => {
            resetAllFilters();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: '#DC2626',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '4px 6px'
          }}
        >
          <RotateCcw size={16} />
          <span>Đặt lại</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#4A2E1B',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            height: '30px',
            padding: '0 14px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Check size={16} />
          <span>Áp dụng</span>
        </button>
      </div>
    </div>
  );
};

export default WarehouseFilterPopover;
