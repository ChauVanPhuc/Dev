import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';

/**
 * TimeFilterChips
 * Thanh hiển thị các điều kiện lọc đã chọn (được đặt ở ngoài cùng thanh công cụ)
 * - Tự động ẩn dải ngày 1 đến 31 khi đã chọn Năm + Tháng (vì đã ngầm hiểu là cả tháng)
 * - Hiển thị nút "Xóa tất cả" màu đỏ gạch chân
 */
export const TimeFilterChips = ({
  year = '',
  setYear,
  month = '',
  setMonth,
  startDate = '',
  setStartDate,
  endDate = '',
  setEndDate,
  extraChips = [],
  onClearAll,
  onFilterChange
}) => {
  // Kiểm tra xem dải ngày có phải là toàn bộ tháng chuẩn không
  const isStandardMonthDates = useMemo(() => {
    if (!year || !month) return false;
    const mNum = parseInt(month);
    const lastDay = new Date(parseInt(year), mNum, 0).getDate();
    const stdStart = `${year}-${String(mNum).padStart(2, '0')}-01`;
    const stdEnd = `${year}-${String(mNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return startDate === stdStart && endDate === stdEnd;
  }, [year, month, startDate, endDate]);

  // Kiểm tra xem dải ngày có phải là toàn bộ năm chuẩn không
  const isStandardYearDates = useMemo(() => {
    if (!year || month) return false;
    const stdStart = `${year}-01-01`;
    const stdEnd = `${year}-12-31`;
    return startDate === stdStart && endDate === stdEnd;
  }, [year, month, startDate, endDate]);

  // Chỉ hiển thị Từ ngày / Đến ngày khi người dùng tùy chỉnh dải ngày riêng
  const showCustomStartDate = startDate && !isStandardMonthDates && !isStandardYearDates;
  const showCustomEndDate = endDate && !isStandardMonthDates && !isStandardYearDates;

  const hasAnyFilter = Boolean(
    year || month || showCustomStartDate || showCustomEndDate || (extraChips && extraChips.length > 0)
  );

  if (!hasAnyFilter) return null;

  const handleRemoveYear = () => {
    if (setYear) setYear('');
    if (setMonth) setMonth('');
    if (setStartDate) setStartDate('');
    if (setEndDate) setEndDate('');
    if (onFilterChange) onFilterChange({ year: '', month: '', startDate: '', endDate: '' });
  };

  const handleRemoveMonth = () => {
    if (setMonth) setMonth('');
    let newStart = '';
    let newEnd = '';
    if (year) {
      newStart = `${year}-01-01`;
      newEnd = `${year}-12-31`;
    }
    if (setStartDate) setStartDate(newStart);
    if (setEndDate) setEndDate(newEnd);
    if (onFilterChange) onFilterChange({ year, month: '', startDate: newStart, endDate: newEnd });
  };

  const handleRemoveStartDate = () => {
    if (setStartDate) setStartDate('');
    if (onFilterChange) onFilterChange({ year, month, startDate: '', endDate });
  };

  const handleRemoveEndDate = () => {
    if (setEndDate) setEndDate('');
    if (onFilterChange) onFilterChange({ year, month, startDate, endDate: '' });
  };

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
      return;
    }
    if (setYear) setYear('');
    if (setMonth) setMonth('');
    if (setStartDate) setStartDate('');
    if (setEndDate) setEndDate('');
    if (onFilterChange) onFilterChange({ year: '', month: '', startDate: '', endDate: '' });
  };

  return (
    <div
      className="filter-chips-wrapper"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        border: '1.5px dashed #EADCC9',
        borderRadius: '8px',
        padding: '2px 8px',
        backgroundColor: '#FFFFFF',
        minHeight: '30px',
        boxSizing: 'border-box',
        flexWrap: 'wrap'
      }}
    >
      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#8D6E63', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
        Đã chọn:
      </span>

      {/* Chip Năm */}
      {year && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FAF6F0',
            color: '#7B5233',
            fontSize: '0.72rem',
            fontWeight: '700',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #EADCC9',
            height: '22px',
            boxSizing: 'border-box',
            whiteSpace: 'nowrap'
          }}
        >
          <span>Năm: {year}</span>
          <button
            type="button"
            onClick={handleRemoveYear}
            style={{
              background: 'none',
              border: 'none',
              color: '#A0301B',
              cursor: 'pointer',
              fontSize: '0.85rem',
              lineHeight: 1,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              fontWeight: '900',
              marginLeft: '2px'
            }}
            title="Xóa lọc Năm"
          >
            &times;
          </button>
        </div>
      )}

      {/* Chip Tháng */}
      {month && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FAF6F0',
            color: '#7B5233',
            fontSize: '0.72rem',
            fontWeight: '700',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #EADCC9',
            height: '22px',
            boxSizing: 'border-box',
            whiteSpace: 'nowrap'
          }}
        >
          <span>Tháng: Tháng {month}</span>
          <button
            type="button"
            onClick={handleRemoveMonth}
            style={{
              background: 'none',
              border: 'none',
              color: '#A0301B',
              cursor: 'pointer',
              fontSize: '0.85rem',
              lineHeight: 1,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              fontWeight: '900',
              marginLeft: '2px'
            }}
            title="Xóa lọc Tháng"
          >
            &times;
          </button>
        </div>
      )}

      {/* Chip Từ ngày tùy chỉnh */}
      {showCustomStartDate && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FAF6F0',
            color: '#7B5233',
            fontSize: '0.72rem',
            fontWeight: '700',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #EADCC9',
            height: '22px',
            boxSizing: 'border-box',
            whiteSpace: 'nowrap'
          }}
        >
          <span>Từ: {startDate}</span>
          <button
            type="button"
            onClick={handleRemoveStartDate}
            style={{
              background: 'none',
              border: 'none',
              color: '#A0301B',
              cursor: 'pointer',
              fontSize: '0.85rem',
              lineHeight: 1,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              fontWeight: '900',
              marginLeft: '2px'
            }}
            title="Xóa lọc Từ ngày"
          >
            &times;
          </button>
        </div>
      )}

      {/* Chip Đến ngày tùy chỉnh */}
      {showCustomEndDate && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FAF6F0',
            color: '#7B5233',
            fontSize: '0.72rem',
            fontWeight: '700',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #EADCC9',
            height: '22px',
            boxSizing: 'border-box',
            whiteSpace: 'nowrap'
          }}
        >
          <span>Đến: {endDate}</span>
          <button
            type="button"
            onClick={handleRemoveEndDate}
            style={{
              background: 'none',
              border: 'none',
              color: '#A0301B',
              cursor: 'pointer',
              fontSize: '0.85rem',
              lineHeight: 1,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              fontWeight: '900',
              marginLeft: '2px'
            }}
            title="Xóa lọc Đến ngày"
          >
            &times;
          </button>
        </div>
      )}

      {/* Các Chip bổ sung (Nhà máy, Dòng hàng, Công đoạn,...) */}
      {extraChips &&
        extraChips.map((chip, idx) => (
          <div
            key={idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#FAF6F0',
              color: '#7B5233',
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #EADCC9',
              height: '22px',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{chip.label}</span>
            <button
              type="button"
              onClick={chip.onRemove}
              style={{
                background: 'none',
                border: 'none',
                color: '#A0301B',
                cursor: 'pointer',
                fontSize: '0.85rem',
                lineHeight: 1,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                fontWeight: '900',
                marginLeft: '2px'
              }}
              title={`Xóa ${chip.label}`}
            >
              &times;
            </button>
          </div>
        ))}

      {/* Nút Xóa tất cả màu đỏ gạch chân */}
      <button
        type="button"
        onClick={handleClearAll}
        style={{
          background: 'none',
          border: 'none',
          color: '#DC2626',
          cursor: 'pointer',
          fontSize: '0.76rem',
          fontWeight: 'bold',
          textDecoration: 'underline',
          padding: '0 4px',
          display: 'inline-flex',
          alignItems: 'center',
          whiteSpace: 'nowrap'
        }}
        title="Xóa tất cả bộ lọc để xem toàn bộ dữ liệu (All)"
      >
        Xóa tất cả
      </button>
    </div>
  );
};

/**
 * TimeFilterDropdown
 * Component nút bấm mở Popover Portal Dropdown lọc thời gian (Năm, Tháng, Từ ngày, Đến ngày)
 * - Giao diện đồng bộ hoàn toàn với các chip Nhà máy, Dòng hàng (.erp-chip)
 * - Popover portal gắn vào document.body, có nút "Về tháng hiện tại"
 */
export const TimeFilterDropdown = ({
  year = '',
  setYear,
  month = '',
  setMonth,
  startDate = '',
  setStartDate,
  endDate = '',
  setEndDate,
  availableYears = ['2026', '2025', '2024', '2023'],
  availableMonths = null,
  onFilterChange,
  showChipsInline = false,
  showAllTimeOption = false,
  showAllTimeChecked = false,
  setShowAllTimeChecked
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const cardRef = useRef(null);

  // Kiểm tra dải ngày chuẩn tháng / năm
  const isStandardMonthDates = useMemo(() => {
    if (!year || !month) return false;
    const mNum = parseInt(month);
    const lastDay = new Date(parseInt(year), mNum, 0).getDate();
    const stdStart = `${year}-${String(mNum).padStart(2, '0')}-01`;
    const stdEnd = `${year}-${String(mNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return startDate === stdStart && endDate === stdEnd;
  }, [year, month, startDate, endDate]);

  const isStandardYearDates = useMemo(() => {
    if (!year || month) return false;
    const stdStart = `${year}-01-01`;
    const stdEnd = `${year}-12-31`;
    return startDate === stdStart && endDate === stdEnd;
  }, [year, month, startDate, endDate]);

  // Đếm số lượng điều kiện lọc thông minh (không tính trùng dải ngày cả tháng)
  const activeCount = useMemo(() => {
    let count = 0;
    if (year) count++;
    if (month) count++;
    if (startDate && !isStandardMonthDates && !isStandardYearDates) count++;
    if (endDate && !isStandardMonthDates && !isStandardYearDates) count++;
    return count;
  }, [year, month, startDate, endDate, isStandardMonthDates, isStandardYearDates]);

  // Tính toán tọa độ hiển thị của Dropdown Card theo vị trí của Button
  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = 360;
      const leftPos = Math.max(10, Math.min(rect.left, window.innerWidth - popupWidth - 15));
      setCoords({
        top: rect.bottom + 6,
        left: leftPos
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        cardRef.current && !cardRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleYearChange = (val) => {
    if (setYear) setYear(val);
    if (!val) {
      if (setMonth) setMonth('');
      if (setStartDate) setStartDate('');
      if (setEndDate) setEndDate('');
      if (onFilterChange) onFilterChange({ year: '', month: '', startDate: '', endDate: '' });
      return;
    }

    let newStart = startDate;
    let newEnd = endDate;
    if (month) {
      const mNum = parseInt(month);
      const lastDay = new Date(parseInt(val), mNum, 0).getDate();
      newStart = `${val}-${String(mNum).padStart(2, '0')}-01`;
      newEnd = `${val}-${String(mNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      newStart = `${val}-01-01`;
      newEnd = `${val}-12-31`;
    }

    if (setStartDate) setStartDate(newStart);
    if (setEndDate) setEndDate(newEnd);
    if (onFilterChange) onFilterChange({ year: val, month, startDate: newStart, endDate: newEnd });
  };

  const handleMonthChange = (val) => {
    if (setMonth) setMonth(val);
    const effectiveYear = year || new Date().getFullYear().toString();
    if (!year && val && setYear) setYear(effectiveYear);

    if (!val) {
      if (year) {
        const newStart = `${year}-01-01`;
        const newEnd = `${year}-12-31`;
        if (setStartDate) setStartDate(newStart);
        if (setEndDate) setEndDate(newEnd);
        if (onFilterChange) onFilterChange({ year, month: '', startDate: newStart, endDate: newEnd });
      }
      return;
    }

    const mNum = parseInt(val);
    const lastDay = new Date(parseInt(effectiveYear), mNum, 0).getDate();
    const newStart = `${effectiveYear}-${String(mNum).padStart(2, '0')}-01`;
    const newEnd = `${effectiveYear}-${String(mNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    if (setStartDate) setStartDate(newStart);
    if (setEndDate) setEndDate(newEnd);
    if (onFilterChange) onFilterChange({ year: effectiveYear, month: val, startDate: newStart, endDate: newEnd });
  };

  const handleStartDateChange = (val) => {
    if (setStartDate) setStartDate(val);
    if (onFilterChange) onFilterChange({ year, month, startDate: val, endDate });
  };

  const handleEndDateChange = (val) => {
    if (setEndDate) setEndDate(val);
    if (onFilterChange) onFilterChange({ year, month, startDate, endDate: val });
  };

  // Nút hành động: Về tháng năm hiện tại
  const handleResetToCurrent = () => {
    const now = new Date();
    const curY = now.getFullYear().toString();
    const curM = (now.getMonth() + 1).toString();
    const lastD = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const curStart = `${curY}-${curM.padStart(2, '0')}-01`;
    const curEnd = `${curY}-${curM.padStart(2, '0')}-${String(lastD).padStart(2, '0')}`;

    if (setYear) setYear(curY);
    if (setMonth) setMonth(curM);
    if (setStartDate) setStartDate(curStart);
    if (setEndDate) setEndDate(curEnd);
    if (onFilterChange) onFilterChange({ year: curY, month: curM, startDate: curStart, endDate: curEnd });
  };

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return String(year) === String(now.getFullYear()) && String(month) === String(now.getMonth() + 1);
  }, [year, month]);

  return (
    <div className="filter-dropdown-container" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      {/* 1. Nút bấm Mở bộ lọc Thời gian - Giao diện chuẩn như Nhà máy / Dòng hàng */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
        <button
          ref={buttonRef}
          type="button"
          className="erp-chip btn-filter-dropdown"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(prev => !prev);
          }}
          style={{
            height: '30px',
            padding: '0 8px',
            borderRadius: '6px',
            border: isOpen ? '1px solid #94A3B8' : '1px solid #E2E8F0',
            backgroundColor: isOpen ? '#F8FAFC' : '#FFFFFF',
            color: '#1E293B',
            fontSize: '0.68rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box'
          }}
          title="Nhấn để mở bộ lọc Thời gian (Năm, Tháng, Từ ngày, Đến ngày)"
        >
          <Calendar size={13} strokeWidth={2} style={{ color: '#64748B' }} />
          <span style={{ fontWeight: '700', color: '#64748B' }}>Thời gian</span>
          {activeCount > 0 && (
            <span
              style={{
                backgroundColor: '#475569',
                color: '#FFFFFF',
                fontSize: '0.65rem',
                fontWeight: '800',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1
              }}
            >
              {activeCount}
            </span>
          )}
          <span className="dropdown-arrow" style={{ fontSize: '0.65rem', color: '#64748B', marginLeft: '1px' }}>
            {isOpen ? '▴' : '▾'}
          </span>
        </button>

        {/* 2. Popover Dropdown Portal gắn vào document.body */}
        {isOpen &&
          createPortal(
            <div
              ref={cardRef}
              className="filter-dropdown-card grid-2col"
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 99999999,
                width: '360px',
                padding: '16px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cột 1: Năm */}
              <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="filter-field-label" style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                  Năm
                </label>
                <select
                  value={year || ''}
                  onChange={(e) => handleYearChange(e.target.value)}
                  style={{
                    height: '32px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.78rem',
                    color: '#1E293B',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Tất cả</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cột 2: Tháng */}
              <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="filter-field-label" style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                  Tháng
                </label>
                <select
                  value={month || ''}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  style={{
                    height: '32px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.78rem',
                    color: '#1E293B',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">Tất cả</option>
                  {[...Array(12)].map((_, i) => {
                    const mNum = i + 1;
                    const hasData = !availableMonths || availableMonths.length === 0 || availableMonths.map(Number).includes(mNum);
                    return (
                      <option key={mNum} value={mNum} disabled={!hasData} style={{ color: hasData ? '#1E293B' : '#94A3B8' }}>
                        Tháng {mNum} {!hasData ? ' (Không có dữ liệu)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Cột 3: Từ ngày */}
              <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="filter-field-label" style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={startDate || ''}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  style={{
                    height: '32px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.78rem',
                    color: '#1E293B',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Cột 4: Đến ngày */}
              <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="filter-field-label" style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={endDate || ''}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  style={{
                    height: '32px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.78rem',
                    color: '#1E293B',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Tùy chọn mở rộng: Hiển thị tổng cộng */}
              {showAllTimeOption && (
                <div
                  style={{
                    gridColumn: 'span 2',
                    marginTop: '2px',
                    borderTop: '1px dashed #E2E8F0',
                    paddingTop: '8px'
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      color: '#475569',
                      fontWeight: '700'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showAllTimeChecked}
                      onChange={(e) => setShowAllTimeChecked && setShowAllTimeChecked(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Hiển thị tổng cộng tất cả các tháng
                  </label>
                </div>
              )}

              {/* Footer: Chỉ giữ lại nút Về tháng hiện tại (Đã bỏ nút Xóa tất cả bên trong) */}
              <div
                style={{
                  gridColumn: 'span 2',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  marginTop: '4px',
                  borderTop: '1px dashed #E2E8F0',
                  paddingTop: '10px'
                }}
              >
                <button
                  type="button"
                  onClick={handleResetToCurrent}
                  disabled={isCurrentMonth}
                  style={{
                    background: isCurrentMonth ? '#F8FAFC' : '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    color: isCurrentMonth ? '#94A3B8' : '#334155',
                    fontWeight: '700',
                    fontSize: '0.76rem',
                    padding: '6px 14px',
                    cursor: isCurrentMonth ? 'default' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Đặt về tháng hiện tại (T${new Date().getMonth() + 1}/${new Date().getFullYear()})`}
                >
                  Về tháng hiện tại (T{new Date().getMonth() + 1}/{new Date().getFullYear()})
                </button>
              </div>
            </div>,
            document.body
          )}
      </div>

      {/* 3. Render Chips nếu truyền showChipsInline */}
      {showChipsInline && (
        <TimeFilterChips
          year={year}
          setYear={setYear}
          month={month}
          setMonth={setMonth}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          onFilterChange={onFilterChange}
        />
      )}
    </div>
  );
};

export default TimeFilterDropdown;
