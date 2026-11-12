// GoodsReceiptDateRangeFilter.jsx - Bộ lọc khoảng ngày From – To chuẩn hóa không dùng preset
import React, { useRef, useEffect } from 'react';
import { Calendar, X, AlertCircle } from 'lucide-react';
import { formatDate } from '../../../types/goodsReceipt.types';

export const GoodsReceiptDateRangeFilter = ({
  dateRange = { fromDate: '', toDate: '' },
  setDateRange,
  setPage,
  isOpen,
  onToggle
}) => {
  const popoverRef = useRef(null);

  // Đóng khi click ngoài
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onToggle?.(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const { fromDate, toDate } = dateRange;
  const hasValue = Boolean(fromDate || toDate);
  const isInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  // Label hiển thị trên nút bấm
  const getButtonLabel = () => {
    if (fromDate && toDate) {
      return `${formatDate(fromDate)} – ${formatDate(toDate)}`;
    }
    if (fromDate) {
      return `Từ ${formatDate(fromDate)}`;
    }
    if (toDate) {
      return `Đến ${formatDate(toDate)}`;
    }
    return 'Thời gian: From – To';
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setDateRange({ fromDate: '', toDate: '' });
    if (setPage) setPage(1);
  };

  return (
    <div className="wh-filter-dropdown-wrapper" ref={popoverRef}>
      <button
        type="button"
        className={`wh-btn-filter-dropdown ${isOpen ? 'active' : ''} ${hasValue ? 'has-value' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.(!isOpen);
        }}
        title="Lọc theo khoảng thời gian From – To"
      >
        <Calendar size={13} style={{ color: isOpen || hasValue ? '#7B5233' : '#8D6E63' }} />
        <span>{getButtonLabel()}</span>
        {hasValue && (
          <span
            style={{
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.62rem',
              fontWeight: 'bold',
              lineHeight: 1
            }}
          >
            {fromDate && toDate ? 2 : 1}
          </span>
        )}
        <span className="dropdown-arrow">▾</span>
      </button>

      {isOpen && (
        <div
          className="wh-filter-dropdown-card"
          style={{
            width: '290px',
            padding: '12px 14px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              paddingBottom: '8px',
              borderBottom: '1px solid #EADCC9'
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#4A2E1B' }}>
              Khoảng thời gian (From – To)
            </span>
            {hasValue && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#DC2626',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: 0
                }}
              >
                <X size={12} />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Từ ngày (From Date) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  color: '#4A2E1B',
                  marginBottom: '4px'
                }}
              >
                Từ ngày (From)
              </label>
              <input
                type="date"
                value={fromDate || ''}
                onChange={(e) => {
                  setDateRange((prev) => ({ ...prev, fromDate: e.target.value }));
                  if (setPage) setPage(1);
                }}
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #D5C7B7',
                  fontSize: '0.8rem',
                  color: '#2D1A12',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Đến ngày (To Date) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  color: '#4A2E1B',
                  marginBottom: '4px'
                }}
              >
                Đến ngày (To)
              </label>
              <input
                type="date"
                value={toDate || ''}
                onChange={(e) => {
                  setDateRange((prev) => ({ ...prev, toDate: e.target.value }));
                  if (setPage) setPage(1);
                }}
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #D5C7B7',
                  fontSize: '0.8rem',
                  color: '#2D1A12',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {isInvalid && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#DC2626',
                  fontSize: '0.74rem',
                  backgroundColor: '#FEF2F2',
                  padding: '6px 8px',
                  borderRadius: '6px'
                }}
              >
                <AlertCircle size={14} />
                <span>Từ ngày không được lớn hơn Đến ngày</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoodsReceiptDateRangeFilter;
