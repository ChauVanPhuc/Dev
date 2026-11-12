import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEARS = Array.from({ length: 5 }, (_, idx) => String(CURRENT_YEAR - idx));

/**
 * DateTimeFilterPopover
 * Component bộ lọc thời gian chuẩn hóa dùng chung toàn hệ thống ERP G7.
 * Bố cục popover dạng lưới 2 cột × 2 hàng:
 *   - Hàng 1: Năm | Tháng
 *   - Hàng 2: Từ ngày | Đến ngày
 */
export const DateTimeFilterPopover = ({
  value = { year: '', month: '', fromDate: '', toDate: '' },
  onChange,
  years = DEFAULT_YEARS,
  buttonLabel = 'Thời gian',
  isOpen: propIsOpen,
  onToggle: propOnToggle,
  align = 'left',
  containerStyle = {}
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const containerRef = useRef(null);

  const isControlled = propIsOpen !== undefined;
  const isOpen = isControlled ? propIsOpen : internalIsOpen;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isControlled) {
      if (propOnToggle) propOnToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  // Đóng khi nhấp chuột ra ngoài (chỉ cho uncontrolled)
  useEffect(() => {
    if (isControlled) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setInternalIsOpen(false);
      }
    };
    if (internalIsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [internalIsOpen, isControlled]);

  const year = value?.year || '';
  const month = value?.month || '';
  const fromDate = value?.fromDate || '';
  const toDate = value?.toDate || '';

  const activeCount = useMemo(() => {
    let count = 0;
    if (year) count++;
    if (month) count++;
    if (fromDate) count++;
    if (toDate) count++;
    return count;
  }, [year, month, fromDate, toDate]);

  const hasValue = activeCount > 0;

  const isDateRangeInvalid = useMemo(() => {
    if (fromDate && toDate) {
      return fromDate > toDate;
    }
    return false;
  }, [fromDate, toDate]);

  const triggerChange = (updatedFields) => {
    if (onChange) {
      const nextValue = {
        year,
        month,
        fromDate,
        toDate,
        ...updatedFields
      };
      onChange(nextValue);
    }
  };

  const handleYearChange = (newYear) => {
    triggerChange({ year: newYear, fromDate: '', toDate: '' });
  };

  const handleMonthChange = (newMonth) => {
    const effectiveYear = newMonth ? (year || String(CURRENT_YEAR)) : year;
    triggerChange({ year: effectiveYear, month: newMonth, fromDate: '', toDate: '' });
  };

  const handleFromDateChange = (newFromDate) => {
    triggerChange({ fromDate: newFromDate, month: '' });
  };

  const handleToDateChange = (newToDate) => {
    triggerChange({ toDate: newToDate, month: '' });
  };

  const inputStyle = {
    width: '100%',
    height: '32px',
    padding: '0 8px',
    borderRadius: '6px',
    border: '1px solid #D5C7B7',
    fontSize: '0.8rem',
    color: '#2D1A12',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.76rem',
    fontWeight: '700',
    color: '#4A2E1B',
    marginBottom: '4px',
    lineHeight: '1.2'
  };

  return (
    <div
      ref={containerRef}
      className="exp-filter-dropdown-wrapper bom-filter-dropdown-wrapper filter-dropdown-wrapper"
      style={{ position: 'relative', display: 'inline-block', ...containerStyle }}
    >
      <button
        type="button"
        className={`exp-btn-filter-dropdown bom-btn-filter-dropdown btn-filter-dropdown page-btn ${isOpen ? 'active' : ''} ${hasValue ? 'has-value' : ''}`}
        onClick={handleToggle}
        title="Nhấp để mở bộ lọc Thời gian (Năm, Tháng, Từ ngày, Đến ngày)"
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
          backgroundColor: isOpen || hasValue ? '#F5EBE1' : '#FFFFFF',
          border: isOpen || hasValue ? '1px solid #7B5233' : '1px solid #C4B5A5',
          color: '#2D1A12',
          boxSizing: 'border-box',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <Calendar size={13} style={{ color: isOpen || hasValue ? '#7B5233' : '#8D6E63' }} />
        <span>{buttonLabel}</span>
        {activeCount > 0 && (
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
            {activeCount}
          </span>
        )}
        <span
          className="dropdown-arrow bom-filter-arrow"
          style={{
            fontSize: '0.7rem',
            marginLeft: '1px',
            color: isOpen || hasValue ? '#7B5233' : '#8D6E63'
          }}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          className="exp-filter-dropdown-card bom-filter-dropdown-card filter-dropdown-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            width: '350px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EADCC9',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(123, 82, 51, 0.15)',
            zIndex: 1100,
            padding: '14px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '10px 14px',
            boxSizing: 'border-box'
          }}
        >
          <div>
            <label style={labelStyle}>Năm</label>
            <select
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              style={inputStyle}
            >
              <option value="">Tất cả</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Tháng</label>
            <select
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              style={inputStyle}
            >
              <option value="">{year ? 'Tất cả' : 'Chọn năm trước'}</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={String(m)}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
              style={inputStyle}
            />
          </div>

          {isDateRangeInvalid && (
            <div
              style={{
                color: '#DC2626',
                fontSize: '0.72rem',
                fontWeight: '600',
                gridColumn: '1 / -1',
                paddingTop: '2px'
              }}
            >
              Từ ngày không được lớn hơn Đến ngày.
            </div>
          )}

          {hasValue && (
            <div
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '6px',
                borderTop: '1px solid #F5EDE4',
                marginTop: '2px'
              }}
            >
              <span style={{ fontSize: '0.72rem', color: '#7B5233', fontWeight: 600 }}>
                Đang lọc: {activeCount} điều kiện
              </span>
              <button
                type="button"
                className="page-btn"
                onClick={() => {
                  if (onChange) {
                    onChange({ year: '', month: '', fromDate: '', toDate: '' });
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#DC2626',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Xóa tất cả điều kiện thời gian"
              >
                Xóa điều kiện
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DateTimeFilterPopover;
