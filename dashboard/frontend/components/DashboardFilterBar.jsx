import React, { useState, useEffect, useRef } from 'react';

/**
 * Thanh Bộ Lọc Ngang Chuẩn Giao Diện Claim (Horizontal Filter Bar)
 * - Nằm ngang như bên Claim, gồm các nút Dropdown Pill:
 *   + [ 🗎 Thông tin claim ▾ ] (Trạng thái, Tên SKU/SP, Mã lỗi KH, Mã lỗi G7, Tên lỗi G7)
 *   + [ 🕒 Vận chuyển & Tham chiếu ▾ ] (Container, LPN)
 *   + [ 🏷 Phân loại & Chi phí ▾ ] (Khách hàng, Mức độ lỗi, Phân nhóm, Tiền phạt)
 *   + [ Switch Data Mẫu ] & [ Nút Đặt lại ]
 * - Đã BỎ mục "Thời gian phân tích" vì đã có trên Header.
 * - Click vào nút pill nào sẽ mở card popup ngay dưới nút đó. Click ra ngoài sẽ đóng.
 */
export default function DashboardFilterBar({
  isOpen,
  onClose,
  filters,
  filterOptions,
  onFilterChange,
  onReset,
  loading
}) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const barRef = useRef(null);

  // Đóng dropdown khi click ra ngoài thanh lọc
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const {
    status = '',
    sku = '',
    clientDefectCode = '',
    g7Code = '',
    g7Name = '',
    container = '',
    lpn = '',
    customer = 'ALL',
    severity = 'ALL',
    defectGroup = 'ALL',
    minPenalty = 0,
    maxPenalty = 50000,
    isMock = true
  } = filters;

  // Đếm số lượng bộ lọc đang active cho từng nhóm
  const claimFilterCount = [
    status,
    sku,
    clientDefectCode,
    g7Code,
    g7Name
  ].filter(Boolean).length;

  const transportFilterCount = [container, lpn].filter(Boolean).length;

  const isPenaltyFiltered = (minPenalty !== undefined && Number(minPenalty) > 0) ||
    (maxPenalty !== undefined && maxPenalty !== null && Number(maxPenalty) < 50000);

  const categoryFilterCount = [
    customer !== 'ALL' && customer,
    severity !== 'ALL' && severity,
    defectGroup !== 'ALL' && defectGroup,
    isPenaltyFiltered
  ].filter(Boolean).length;

  // Toggle dropdown
  const toggleDropdown = (name, e) => {
    e.stopPropagation();
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  // Common styling cho input & select trong popup card
  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: '4px',
    lineHeight: '1.2'
  };

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

  const panelCardStyle = (width = '360px') => ({
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    width,
    backgroundColor: '#FFFFFF',
    border: '1px solid #EADCC9',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(123, 82, 51, 0.14)',
    zIndex: 1000,
    padding: '14px 16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px 14px',
    boxSizing: 'border-box'
  });

  return (
    <div
      ref={barRef}
      className="dash-filter-horizontal-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: '#FAF6F0',
        borderRadius: '8px',
        border: '1px solid #EADCC9',
        marginBottom: 0,
        position: 'relative',
        boxSizing: 'border-box',
        boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
        flexWrap: 'wrap'
      }}
    >
      {/* CỤM CÁC NÚT BỘ LỌC BÊN TRÁI */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        
        {/* NÚT 1: THÔNG TIN CLAIM */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`dash-filter-pill-btn ${activeDropdown === 'claim' ? 'active' : ''}`}
            onClick={(e) => toggleDropdown('claim', e)}
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
              backgroundColor: activeDropdown === 'claim' ? '#EADCC9' : '#FFFFFF',
              border: '1px solid #C4B5A5',
              color: '#2D1A12',
              boxSizing: 'border-box'
            }}
          >
            {/* Icon Văn bản claim */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Thông tin claim</span>
            {claimFilterCount > 0 && (
              <span style={{
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
              }}>
                {claimFilterCount}
              </span>
            )}
            <span style={{ fontSize: '0.7rem' }}>▾</span>
          </button>

          {/* CARD POPUP THÔNG TIN CLAIM (Hình 3) */}
          {activeDropdown === 'claim' && (
            <div
              style={panelCardStyle('380px')}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <label style={labelStyle}>Trạng thái</label>
                <select
                  value={status}
                  onChange={(e) => onFilterChange('status', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Tất cả</option>
                  <option value="Mới tạo">Mới tạo</option>
                  <option value="Chờ xử lý">Chờ xử lý</option>
                  <option value="Đã giải quyết">Đã giải quyết</option>
                  <option value="Đã bồi thường">Đã bồi thường</option>
                  <option value="Đã đóng">Đã đóng</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Tên SKU / SP</label>
                <input
                  type="text"
                  placeholder="Tên sản phẩm..."
                  value={sku}
                  onChange={(e) => onFilterChange('sku', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Mã lỗi KH</label>
                <input
                  type="text"
                  placeholder="Mã lỗi KH..."
                  value={clientDefectCode}
                  onChange={(e) => onFilterChange('clientDefectCode', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Mã lỗi G7</label>
                <input
                  type="text"
                  placeholder="Mã lỗi G7..."
                  value={g7Code}
                  onChange={(e) => onFilterChange('g7Code', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Tên lỗi G7</label>
                <input
                  type="text"
                  placeholder="Tên lỗi G7..."
                  value={g7Name}
                  onChange={(e) => onFilterChange('g7Name', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        {/* NÚT 2: VẬN CHUYỂN & THAM CHIẾU */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`dash-filter-pill-btn ${activeDropdown === 'transport' ? 'active' : ''}`}
            onClick={(e) => toggleDropdown('transport', e)}
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
              backgroundColor: activeDropdown === 'transport' ? '#EADCC9' : '#FFFFFF',
              border: '1px solid #C4B5A5',
              color: '#2D1A12',
              boxSizing: 'border-box'
            }}
          >
            {/* Icon Đồng hồ / Tham chiếu */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Vận chuyển & Tham chiếu</span>
            {transportFilterCount > 0 && (
              <span style={{
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
              }}>
                {transportFilterCount}
              </span>
            )}
            <span style={{ fontSize: '0.7rem' }}>▾</span>
          </button>

          {/* CARD POPUP VẬN CHUYỂN & THAM CHIẾU (Hình 4) */}
          {activeDropdown === 'transport' && (
            <div
              style={panelCardStyle('320px')}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <label style={labelStyle}>Container</label>
                <input
                  type="text"
                  placeholder="WHSU..."
                  value={container}
                  onChange={(e) => onFilterChange('container', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>LPN</label>
                <input
                  type="text"
                  placeholder="Mã LPN..."
                  value={lpn}
                  onChange={(e) => onFilterChange('lpn', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        {/* NÚT 3: PHÂN LOẠI & CHI PHÍ */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`dash-filter-pill-btn ${activeDropdown === 'category' ? 'active' : ''}`}
            onClick={(e) => toggleDropdown('category', e)}
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
              backgroundColor: activeDropdown === 'category' ? '#EADCC9' : '#FFFFFF',
              border: '1px solid #C4B5A5',
              color: '#2D1A12',
              boxSizing: 'border-box'
            }}
          >
            {/* Icon Tag phân loại */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span>Phân loại & Chi phí</span>
            {categoryFilterCount > 0 && (
              <span style={{
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
              }}>
                {categoryFilterCount}
              </span>
            )}
            <span style={{ fontSize: '0.7rem' }}>▾</span>
          </button>

          {/* CARD POPUP PHÂN LOẠI & CHI PHÍ */}
          {activeDropdown === 'category' && (
            <div
              style={panelCardStyle('360px')}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <label style={labelStyle}>Khách hàng</label>
                <select
                  value={customer}
                  onChange={(e) => onFilterChange('customer', e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                >
                  {(filterOptions?.customers || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Mức độ nghiêm trọng</label>
                <select
                  value={severity}
                  onChange={(e) => onFilterChange('severity', e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                >
                  {(filterOptions?.severities || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Phân nhóm lỗi</label>
                <select
                  value={defectGroup}
                  onChange={(e) => onFilterChange('defectGroup', e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                >
                  <option value="ALL">Tất cả phân nhóm</option>
                  <option value="paint">Nước sơn</option>
                  <option value="visual">Ngoại quan</option>
                  <option value="structure">Kết cấu</option>
                  <option value="material">Vật liệu gỗ</option>
                  <option value="hardware">Bao bì & Phụ kiện</option>
                </select>
              </div>

              {/* THANH KÉO TRƯỢT KHOẢNG TIỀN PHẠT / CHI PHÍ (RANGE SLIDER) */}
              <div style={{ gridColumn: '1 / -1', marginTop: '6px', paddingTop: '8px', borderTop: '1px dashed #EADCC9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 0, fontSize: '0.76rem' }}>
                      Khoảng tiền phạt / Chi phí
                    </label>
                    <span style={{ fontSize: '0.68rem', color: '#8D6E63' }}>
                      Kéo 2 mốc để chọn độ dài khoảng tiền
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    color: (Number(minPenalty) === 0 && Number(maxPenalty) >= 50000) ? '#8D6E63' : '#C05621',
                    background: '#FAF6F0',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #EADCC9'
                  }}>
                    {Number(minPenalty) === 0 && Number(maxPenalty) >= 50000
                      ? 'Tất cả ($0 - $50,000+)'
                      : `$${Number(minPenalty).toLocaleString()} - ${Number(maxPenalty) >= 50000 ? '$50,000+' : `$${Number(maxPenalty).toLocaleString()}`}`}
                  </span>
                </div>

                {/* Dải trực quan thể hiện độ dài khoảng (Range Span Bar) */}
                <div style={{
                  position: 'relative',
                  height: '6px',
                  backgroundColor: '#EADCC9',
                  borderRadius: '3px',
                  marginBottom: '10px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${Math.min(100, Math.max(0, (minPenalty / 50000) * 100))}%`,
                      width: `${Math.min(100, Math.max(0, ((maxPenalty - minPenalty) / 50000) * 100))}%`,
                      height: '100%',
                      backgroundColor: '#7B5233',
                      borderRadius: '3px',
                      transition: 'left 0.1s, width 0.1s'
                    }}
                  />
                </div>

                {/* Thanh trượt Mốc Bắt Đầu (Từ $) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ minWidth: '28px', fontSize: '0.72rem', color: '#5D4037', fontWeight: '700' }}>
                    Từ:
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="500"
                    value={minPenalty}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), Number(maxPenalty));
                      onFilterChange('minPenalty', val);
                    }}
                    style={{
                      flex: 1,
                      accentColor: '#7B5233',
                      cursor: 'pointer',
                      height: '5px'
                    }}
                  />
                  <span style={{ minWidth: '60px', textAlign: 'right', fontSize: '0.76rem', fontWeight: '700', color: '#5D4037' }}>
                    ${Number(minPenalty).toLocaleString()}
                  </span>
                </div>

                {/* Thanh trượt Mốc Kết Thúc (Đến $) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ minWidth: '28px', fontSize: '0.72rem', color: '#5D4037', fontWeight: '700' }}>
                    Đến:
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="500"
                    value={maxPenalty}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), Number(minPenalty));
                      onFilterChange('maxPenalty', val);
                    }}
                    style={{
                      flex: 1,
                      accentColor: '#C05621',
                      cursor: 'pointer',
                      height: '5px'
                    }}
                  />
                  <span style={{ minWidth: '60px', textAlign: 'right', fontSize: '0.76rem', fontWeight: '700', color: '#C05621' }}>
                    {Number(maxPenalty) >= 50000 ? '$50,000+' : `$${Number(maxPenalty).toLocaleString()}`}
                  </span>
                </div>

                {/* Các nút bấm chọn nhanh khoảng tiền (Quick Range Presets) */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#8D6E63', marginRight: '4px' }}>Nhanh:</span>
                  {[
                    { label: 'Tất cả', min: 0, max: 50000 },
                    { label: '< $1,000', min: 0, max: 1000 },
                    { label: '$1k - $5k', min: 1000, max: 5000 },
                    { label: '$5k - $20k', min: 5000, max: 20000 },
                    { label: '> $20,000', min: 20000, max: 50000 }
                  ].map((preset, idx) => {
                    const isActive = Number(minPenalty) === preset.min && Number(maxPenalty) === preset.max;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onFilterChange('minPenalty', preset.min);
                          onFilterChange('maxPenalty', preset.max);
                        }}
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: isActive ? '700' : '500',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: `1px solid ${isActive ? '#7B5233' : '#D5C7B7'}`,
                          backgroundColor: isActive ? '#EADCC9' : '#FFFFFF',
                          color: isActive ? '#2D1A12' : '#5D4037',
                          cursor: 'pointer'
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CỤM ĐIỀU KHIỂN BÊN PHẢI (DATA MẪU & ĐẶT LẠI) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Toggle Dữ liệu mẫu (Demo) */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={isMock}
            onChange={(e) => onFilterChange('isMock', e.target.checked)}
            style={{ accentColor: '#7B5233', width: '15px', height: '15px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#5D4037' }}>
            Data mẫu
          </span>
        </label>

        {/* Nút Đặt lại bộ lọc */}
        <button
          type="button"
          onClick={onReset}
          style={{
            height: '30px',
            padding: '0 12px',
            borderRadius: '6px',
            border: '1px solid #D5C7B7',
            backgroundColor: '#FFFFFF',
            color: '#7B5233',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
          title="Xóa tất cả bộ lọc về mặc định"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <span>Đặt lại</span>
        </button>

        {/* Nút Đóng bộ lọc */}
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            color: '#8D6E63',
            fontSize: '18px',
            lineHeight: 1
          }}
          title="Tắt bộ lọc"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
