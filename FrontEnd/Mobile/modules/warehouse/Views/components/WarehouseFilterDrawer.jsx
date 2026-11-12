import React from 'react';
import { RotateCcw, Calendar, X } from 'lucide-react';
import { todayISO } from '../../constants/warehouseConstants';

/**
 * Hộp bộ lọc gọn 2 cột dùng chung cho các danh sách Kho Mobile (Kho, Trạng thái, Nguồn, Từ/Đến ngày).
 */
const WarehouseFilterDrawer = ({
  isOpen,
  warehouses = [],
  warehouseValueKey = 'name',
  warehouse = 'ALL',
  onWarehouseChange,
  statusOptions = [],
  status = 'ALL',
  onStatusChange,
  sourceOptions = null,
  sourceType = 'ALL',
  onSourceChange,
  fromDate = '',
  onFromDateChange,
  toDate = '',
  onToDateChange,
  activeCount = 0,
  onReset,
  onClose,
}) => {
  if (!isOpen) return null;

  const today = todayISO();
  const isTodaySelected = fromDate === today && toDate === today;

  const handleToggleToday = () => {
    if (isTodaySelected) {
      onFromDateChange('');
      onToDateChange('');
    } else {
      onFromDateChange(today);
      onToDateChange(today);
    }
  };

  return (
    <div className="mwh-filter-drawer">
      <div className="mwh-filter-head">
        <span className="mwh-filter-title">Bộ lọc</span>
        <div className="mwh-filter-actions">
          <button
            type="button"
            className={`mwh-filter-quick-btn ${isTodaySelected ? 'active' : ''}`}
            onClick={handleToggleToday}
            title="Lọc nhanh phiếu trong hôm nay"
          >
            <Calendar size={11} />
            <span>Hôm nay</span>
          </button>
          {activeCount > 0 && typeof onReset === 'function' && (
            <button type="button" className="mwh-filter-reset" onClick={onReset}>
              <RotateCcw size={11} />
              <span>Xóa ({activeCount})</span>
            </button>
          )}
          {typeof onClose === 'function' && (
            <button
              type="button"
              className="mwh-filter-close"
              onClick={onClose}
              aria-label="Đóng bộ lọc"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="mwh-field-row" style={{ gap: '8px' }}>
        <div className="mwh-field-group" style={{ marginBottom: 0 }}>
          <label className="mwh-label">Kho</label>
          <select
            className="mwh-select"
            value={warehouse}
            onChange={(e) => onWarehouseChange(e.target.value)}
          >
            <option value="ALL">Tất cả kho</option>
            {warehouses.map((w) => {
              const val = warehouseValueKey === 'code' ? w.code : w.name;
              return (
                <option key={w.code} value={val}>
                  {w.name}
                </option>
              );
            })}
          </select>
        </div>

        {Array.isArray(statusOptions) && statusOptions.length > 0 && (
          <div className="mwh-field-group" style={{ marginBottom: 0 }}>
            <label className="mwh-label">Trạng thái</label>
            <select
              className="mwh-select"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              {statusOptions.map((st) => (
                <option key={st.key} value={st.key}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {Array.isArray(sourceOptions) && sourceOptions.length > 0 && (
        <div className="mwh-field-group" style={{ marginBottom: 0 }}>
          <label className="mwh-label">Nguồn phát sinh</label>
          <select
            className="mwh-select"
            value={sourceType}
            onChange={(e) => onSourceChange(e.target.value)}
          >
            {sourceOptions.map((src) => (
              <option key={src.key} value={src.key}>
                {src.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mwh-field-row" style={{ gap: '8px' }}>
        <div className="mwh-field-group" style={{ marginBottom: 0 }}>
          <label className="mwh-label">Từ ngày</label>
          <input
            type="date"
            className="mwh-input"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
          />
        </div>
        <div className="mwh-field-group" style={{ marginBottom: 0 }}>
          <label className="mwh-label">Đến ngày</label>
          <input
            type="date"
            className="mwh-input"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default WarehouseFilterDrawer;
