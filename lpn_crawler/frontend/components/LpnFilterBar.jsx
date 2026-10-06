import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, FileText, Settings, LayoutGrid, X, Check } from 'lucide-react';
import { lpnCrawlerApi } from '../services/api';

export const LpnFilterBar = ({
  isOpen = false,
  pageSize = 15,
  onPageSizeChange = () => {},
  filters = {},
  onFilterChange = () => {},
  onResetFilters = () => {}
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    containers: [],
    factories: [],
    operators: [],
    batches: [],
    lpns: [],
    skus: []
  });

  // Tải danh sách gợi ý tự động (Distinct values) từ cơ sở dữ liệu
  const loadOptions = () => {
    lpnCrawlerApi.getFilterOptions().then((opts) => {
      if (opts && typeof opts === 'object') {
        setFilterOptions(opts);
      }
    });
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeDropdown && !e.target.closest('.filter-dropdown-wrapper')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  if (!isOpen) return null;

  // Filter counters
  const timeFilterCount = ['year', 'month', 'startDate', 'endDate'].filter(
    (k) => !!filters[k] && String(filters[k]).trim() !== ''
  ).length;

  const containerFilterCount = ['container_number', 'factory', 'operator_name'].filter(
    (k) => !!filters[k] && String(filters[k]).trim() !== ''
  ).length;

  const palletFilterCount = ['batch', 'sku', 'lpn'].filter(
    (k) => !!filters[k] && String(filters[k]).trim() !== ''
  ).length;

  const totalActiveFilters = timeFilterCount + containerFilterCount + palletFilterCount;

  // Input styles
  const inputStyle = {
    width: '100%',
    height: '32px',
    padding: '0 10px',
    borderRadius: '6px',
    border: '1px solid #D5C7B7',
    fontSize: '0.82rem',
    color: '#2D1A12',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: '4px',
    lineHeight: '1.2'
  };

  const panelCardStyle = (width = '360px') => ({
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    width,
    maxWidth: 'min(92vw, 380px)',
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
  });

  const getDropdownBtnStyle = (category) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    height: '28px',
    padding: '0 10px',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    backgroundColor: activeDropdown === category ? '#FAF6F0' : '#FFFFFF',
    border: '1px solid #D5C7B7',
    color: '#2D1A12',
    boxSizing: 'border-box',
    transition: 'all 0.15s ease'
  });

  const getBadgeStyle = () => ({
    backgroundColor: '#7B5233',
    color: '#FFFFFF',
    borderRadius: '50%',
    width: '15px',
    height: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.62rem',
    fontWeight: 'bold'
  });

  return (
    <div
      className="lpn-filter-inline-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: 0,
        margin: 0,
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none',
        flexWrap: 'wrap',
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. HIỂN THỊ SỐ DÒNG */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'rows' ? null : 'rows');
          }}
          style={getDropdownBtnStyle('rows')}
        >
          <LayoutGrid size={13} strokeWidth={2.5} />
          <span>Hiển thị: {pageSize === Infinity ? 'Tất cả' : `${pageSize} dòng`}</span>
          <span style={{ fontSize: '0.7rem' }}>▾</span>
        </button>

        {activeDropdown === 'rows' && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              width: '150px',
              padding: '4px 0',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#FFFFFF',
              border: '1px solid #EADCC9',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(123, 82, 51, 0.12)',
              zIndex: 1100,
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {[10, 15, 20, 50, 100, 'all'].map((opt) => {
              const label = opt === 'all' ? 'Tất cả' : `${opt} dòng`;
              const isSelected = opt === 'all' ? pageSize === Infinity : pageSize === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onPageSizeChange(opt === 'all' ? Infinity : opt);
                    setActiveDropdown(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 14px',
                    border: 'none',
                    background: isSelected ? '#FAF6F0' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '0.82rem',
                    color: isSelected ? '#7B5233' : '#2D1A12',
                    transition: 'background-color 0.15s',
                    boxSizing: 'border-box'
                  }}
                >
                  <span>{label}</span>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: '#7B5233' }}>
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. THỜI GIAN */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'time' ? null : 'time');
          }}
          style={getDropdownBtnStyle('time')}
        >
          <Calendar size={13} strokeWidth={2.5} />
          <span>Thời gian</span>
          {timeFilterCount > 0 && <span style={getBadgeStyle()}>{timeFilterCount}</span>}
          <span style={{ fontSize: '0.7rem' }}>▾</span>
        </button>

        {activeDropdown === 'time' && (
          <div style={panelCardStyle('360px')} onClick={(e) => e.stopPropagation()}>
            <div>
              <label style={labelStyle}>Năm</label>
              <select
                value={filters.year || ''}
                onChange={(e) => onFilterChange('year', e.target.value)}
                style={inputStyle}
              >
                <option value="">Tất cả</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tháng</label>
              <select
                value={filters.month || ''}
                onChange={(e) => onFilterChange('month', e.target.value)}
                disabled={!filters.year}
                style={inputStyle}
              >
                <option value="">{filters.year ? 'Tất cả' : 'Chọn năm trước'}</option>
                <option value="Tháng 1">Tháng 1</option>
                <option value="Tháng 2">Tháng 2</option>
                <option value="Tháng 3">Tháng 3</option>
                <option value="Tháng 4">Tháng 4</option>
                <option value="Tháng 5">Tháng 5</option>
                <option value="Tháng 6">Tháng 6</option>
                <option value="Tháng 7">Tháng 7</option>
                <option value="Tháng 8">Tháng 8</option>
                <option value="Tháng 9">Tháng 9</option>
                <option value="Tháng 10">Tháng 10</option>
                <option value="Tháng 11">Tháng 11</option>
                <option value="Tháng 12">Tháng 12</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Từ ngày</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onFilterChange('startDate', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Đến ngày</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onFilterChange('endDate', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. THÔNG TIN CONTAINER (GỢI Ý TỰ ĐỘNG THÔNG MINH) */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'container' ? null : 'container');
            loadOptions();
          }}
          style={getDropdownBtnStyle('container')}
        >
          <FileText size={13} strokeWidth={2.5} />
          <span>Thông tin container</span>
          {containerFilterCount > 0 && <span style={getBadgeStyle()}>{containerFilterCount}</span>}
          <span style={{ fontSize: '0.7rem' }}>▾</span>
        </button>

        {activeDropdown === 'container' && (
          <div style={panelCardStyle('360px')} onClick={(e) => e.stopPropagation()}>
            <FilterAutocompleteInput
              label="Container number"
              placeholder="MSDU, MSBU, WHSU..."
              value={filters.container_number || ''}
              onChange={(val) => onFilterChange('container_number', val)}
              options={filterOptions.containers || []}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              gridColumn="1 / -1"
            />
            <FilterAutocompleteInput
              label="Factory"
              placeholder="Vina G7..."
              value={filters.factory || ''}
              onChange={(val) => onFilterChange('factory', val)}
              options={filterOptions.factories || []}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
            />
            <FilterAutocompleteInput
              label="Operator name"
              placeholder="Tên người thao tác..."
              value={filters.operator_name || ''}
              onChange={(val) => onFilterChange('operator_name', val)}
              options={filterOptions.operators || []}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
            />
          </div>
        )}
      </div>

      {/* 4. THÔNG TIN KIỆN HÀNG (GỢI Ý TỰ ĐỘNG THÔNG MINH) */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'pallet' ? null : 'pallet');
            loadOptions();
          }}
          style={getDropdownBtnStyle('pallet')}
        >
          <Settings size={13} strokeWidth={2.5} />
          <span>Thông tin kiện hàng</span>
          {palletFilterCount > 0 && <span style={getBadgeStyle()}>{palletFilterCount}</span>}
          <span style={{ fontSize: '0.7rem' }}>▾</span>
        </button>

        {activeDropdown === 'pallet' && (
          <div style={panelCardStyle('360px')} onClick={(e) => e.stopPropagation()}>
            <FilterAutocompleteInput
              label="Batch Pallet"
              placeholder="APT 91-08..."
              value={filters.batch || ''}
              onChange={(val) => onFilterChange('batch', val)}
              options={filterOptions.batches || []}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
            />
            <FilterAutocompleteInput
              label="LPN Pallet"
              placeholder="060071597..."
              value={filters.lpn || ''}
              onChange={(val) => onFilterChange('lpn', val)}
              options={filterOptions.lpns || []}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
            />
            <FilterAutocompleteInput
              label="SKU Pallet"
              placeholder="2-36R-WHT, 2-36S-WHT..."
              value={filters.sku || ''}
              onChange={(val) => onFilterChange('sku', val)}
              options={filterOptions.skus || []}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              gridColumn="1 / -1"
            />
          </div>
        )}
      </div>

      {/* 5. ACTIVE APPLIED FILTER CHIPS CONTAINER (MATCHING CLAIM) */}
      {totalActiveFilters > 0 && (
        <div
          className="filter-chips-wrapper"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px dashed #D5C7B7',
            borderRadius: '6px',
            padding: '2px 8px',
            backgroundColor: '#FFFFFF',
            flexWrap: 'wrap',
            marginLeft: '4px'
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233' }}>Đang lọc:</span>

          {Object.entries(filters).map(([key, val]) => {
            if (!val || String(val).trim() === '') return null;

            const labelMap = {
              search: 'Tìm kiếm',
              year: 'Năm',
              month: 'Tháng',
              startDate: 'Từ ngày',
              endDate: 'Đến ngày',
              container_number: 'Container',
              factory: 'Factory',
              operator_name: 'Operator',
              batch: 'Batch',
              lpn: 'LPN',
              sku: 'SKU'
            };

            return (
              <span
                key={key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#FAF6F0',
                  color: '#7B5233',
                  border: '1px solid #EADCC9',
                  borderRadius: '14px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  fontWeight: '600'
                }}
              >
                <span>
                  {labelMap[key] || key}: {val}
                </span>
                <button
                  type="button"
                  onClick={() => onFilterChange(key, '')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#8D6E63',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1
                  }}
                  title="Xóa điều kiện này"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </span>
            );
          })}

          <button
            type="button"
            onClick={onResetFilters}
            style={{
              background: 'none',
              border: 'none',
              color: '#DC2626',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              padding: '2px 4px',
              textDecoration: 'underline'
            }}
          >
            Xóa tất cả
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * FilterAutocompleteInput: Input tìm kiếm thông minh có danh sách gợi ý tức thì khi gõ
 */
function FilterAutocompleteInput({ label, value, onChange, options = [], placeholder, inputStyle, labelStyle, gridColumn }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const filteredOptions = useMemo(() => {
    if (!Array.isArray(options) || options.length === 0) return [];
    if (!value || String(value).trim() === '') {
      return options.slice(0, 40);
    }
    const q = String(value).toLowerCase().trim();
    return options.filter((opt) => String(opt).toLowerCase().includes(q)).slice(0, 40);
  }, [options, value]);

  useEffect(() => {
    const handleDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', gridColumn: gridColumn || 'auto' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          style={inputStyle}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#8D6E63',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem'
            }}
            title="Xóa nội dung"
          >
            &times;
          </button>
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 3px)',
            left: 0,
            right: 0,
            maxHeight: '160px',
            overflowY: 'auto',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D5C7B7',
            borderRadius: '6px',
            boxShadow: '0 10px 25px rgba(123, 82, 51, 0.2)',
            zIndex: 1500,
            padding: '3px 0',
            boxSizing: 'border-box'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {filteredOptions.map((opt, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setIsOpen(false);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                color: opt === value ? '#7B5233' : '#2D1A12',
                fontWeight: opt === value ? '700' : '500',
                backgroundColor: opt === value ? '#FAF6F0' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF6F0')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = opt === value ? '#FAF6F0' : 'transparent')
              }
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
