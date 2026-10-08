import React, { useState, useEffect, useRef } from 'react';

const resolveImgUrl = (img) => {
  if (!img) return '';
  if (typeof img === 'string') {
    if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://')) return img;
    return `/api/v1/lpn-crawler/images/view?path=${encodeURIComponent(img)}`;
  }
  if (img.id) {
    return `/api/v1/lpn-crawler/images/${img.id}/file`;
  }
  const rawPath = img.local_path || '';
  if (rawPath) {
    return `/api/v1/lpn-crawler/images/view?path=${encodeURIComponent(rawPath)}`;
  }
  return img.source_url || '';
};

export const ContainerTableView = ({
  items = [],
  total = 0,
  page = 1,
  pageSize = 15,
  onPageChange = () => {},
  onSelectContainer = () => {},
  onScanOcr = null,
  selectedContainerIds = [],
  onToggleSelectRow = () => {},
  onToggleSelectAll = () => {},
  loading = false
}) => {
  const effectivePageSize = (pageSize === Infinity || pageSize === 'all') ? (total || 100000) : (pageSize || 15);
  const totalPages = Math.ceil(total / effectivePageSize) || 1;
  const startIdx = total > 0 ? (page - 1) * effectivePageSize + 1 : 0;
  const endIdx = total > 0 ? Math.min(page * effectivePageSize, total) : 0;

  // Hover image preview state
  const [hoveredImg, setHoveredImg] = useState(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 0 });

  // Lightbox Modal cho ảnh container phóng to
  const [lightboxImg, setLightboxImg] = useState(null);

  const currentPageContainerIds = items.map((r) => r.container_id).filter(Boolean);
  const isAllCurrentPageSelected =
    currentPageContainerIds.length > 0 &&
    currentPageContainerIds.every((id) => selectedContainerIds.includes(id));

  const handleImageMouseEnter = (imgUrl, e) => {
    if (!imgUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let left = rect.right + 12;
    if (left + 260 > window.innerWidth) {
      left = Math.max(10, rect.left - 270);
    }
    let top = Math.max(10, Math.min(window.innerHeight - 270, rect.top - 20));
    setHoverPos({ top, left });
    setHoveredImg(imgUrl);
  };

  const handleImageMouseLeave = () => {
    setHoveredImg(null);
  };

  // Responsive Mobile state
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPageButtons = (forMobile = false) => {
    const btns = [];
    if (forMobile) {
      if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) btns.push(i);
      } else if (page <= 2) {
        btns.push(1, 2, '...', totalPages);
      } else if (page >= totalPages - 1) {
        btns.push(1, '...', totalPages - 1, totalPages);
      } else {
        btns.push(1, '...', page, '...', totalPages);
      }
      return btns;
    }

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) btns.push(i);
    } else {
      btns.push(1);
      if (page > 3) btns.push('...');
      const rStart = Math.max(2, page - 1);
      const rEnd = Math.min(totalPages - 1, page + 1);
      for (let i = rStart; i <= rEnd; i++) btns.push(i);
      if (page < totalPages - 2) btns.push('...');
      btns.push(totalPages);
    }
    return btns;
  };

  // Render Status Badge chuẩn mực theo tiêu chuẩn Đạt
  const renderStatusBadge = (row) => {
    const code = row.status_code;
    const label = row.status_label || (row.is_valid ? 'Đạt' : 'Chưa đạt');

    if (code === 'PASSED' || row.is_valid) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 9px',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: '700',
            backgroundColor: '#ECFDF5',
            color: '#059669',
            border: '1px solid #A7F3D0',
            whiteSpace: 'nowrap'
          }}
          title="Tất cả 100% ảnh trong Container đã qua quét AI OCR và đều khớp mã"
        >
          <span>{label}</span>
        </span>
      );
    }

    if (code === 'SCANNING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 9px',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: '600',
            backgroundColor: '#FFFBEB',
            color: '#D97706',
            border: '1px solid #FDE68A',
            whiteSpace: 'nowrap'
          }}
          title={`Đã quét ${row.ocr_scanned_count || 0}/${row.total_images || 0} ảnh. Hệ thống đang tiếp tục quét AI.`}
        >
          <span>{label}</span>
        </span>
      );
    }

    if (code === 'MISMATCH') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 9px',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: '700',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            border: '1px solid #FECACA',
            whiteSpace: 'nowrap'
          }}
          title={`Phát hiện ${row.ocr_mismatch_count || 1} ảnh có mã tem không khớp với dữ liệu AppSheet.`}
        >
          <span>{label}</span>
        </span>
      );
    }

    // Default: Thiếu dữ liệu hoặc Chưa có ảnh
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 9px',
          borderRadius: '9999px',
          fontSize: '0.74rem',
          fontWeight: '600',
          backgroundColor: '#FFF1F2',
          color: '#E11D48',
          border: '1px solid #FECDD3',
          whiteSpace: 'nowrap'
        }}
        title={label}
      >
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="lpn-table-container">
      {/* Desktop Table View */}
      <div className="lpn-table-scroll lpn-desktop-only" style={{ overflowX: 'auto' }}>
        <table className="lpn-table-claim" style={{ minWidth: '1200px' }}>
          <thead>
            <tr>
              {/* Checkbox Header */}
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  className="checkbox-custom"
                  checked={isAllCurrentPageSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelectAll(currentPageContainerIds);
                  }}
                  title="Chọn tất cả container trên trang này"
                />
              </th>
              <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Ảnh Container</th>
              <th style={{ minWidth: '150px' }}>Số Container</th>
              <th style={{ minWidth: '110px' }}>Nhà Máy</th>
              <th style={{ minWidth: '115px' }}>Ngày Loading</th>
              <th style={{ minWidth: '150px' }}>Timestamp</th>
              <th style={{ minWidth: '130px' }}>Người Thao Tác</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Số Kiện</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Số LPN</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Số Ảnh</th>
              <th style={{ minWidth: '140px', textAlign: 'center' }}>Trạng Thái</th>
              <th style={{ textAlign: 'center', width: '100px' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan="13" style={{ textAlign: 'center', padding: '36px', color: '#8D6E63' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <div className="lpn-spinner-sm" />
                    <span>Đang tải danh sách Container...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="13" style={{ textAlign: 'center', padding: '40px', color: '#8D6E63' }}>
                  Không có dữ liệu Container nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              items.map((row, idx) => {
                const isSelected = selectedContainerIds.includes(row.container_id);
                const stt = startIdx + idx;
                const imgUrl = resolveImgUrl(row.container_image || row.first_image);

                return (
                  <tr
                    key={row.container_id || `cont-${idx}`}
                    className={`lpn-row-interactive ${isSelected ? 'row-selected' : ''}`}
                    onClick={() => onSelectContainer(row)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Checkbox */}
                    <td
                      style={{ textAlign: 'center' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelectRow(row.container_id);
                      }}
                    >
                      <input
                        type="checkbox"
                        className="checkbox-custom"
                        checked={isSelected}
                        onChange={() => {}}
                      />
                    </td>

                    {/* STT */}
                    <td style={{ textAlign: 'center', color: '#8D6E63', fontWeight: '500' }}>
                      {stt}
                    </td>

                    {/* Ảnh Container */}
                    <td
                      style={{ textAlign: 'center', padding: '6px 8px' }}
                      onClick={(e) => {
                        if (imgUrl) {
                          e.stopPropagation();
                          setLightboxImg(imgUrl);
                        }
                      }}
                    >
                      {imgUrl ? (
                        <div
                          style={{
                            width: '58px',
                            height: '42px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '1px solid #EADCC9',
                            backgroundColor: '#FAF6F0',
                            margin: '0 auto',
                            position: 'relative',
                            cursor: 'zoom-in',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                          }}
                          onMouseEnter={(e) => handleImageMouseEnter(imgUrl, e)}
                          onMouseLeave={handleImageMouseLeave}
                        >
                          <img
                            src={imgUrl}
                            alt={row.container_number}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '58px',
                            height: '42px',
                            borderRadius: '6px',
                            border: '1px dashed #D7CCC8',
                            backgroundColor: '#F5EBE1',
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#A1887F'
                          }}
                          title="Chưa có ảnh"
                        >
                          <span style={{ fontSize: '0.64rem', color: '#8D6E63', fontWeight: '600' }}>No ảnh</span>
                        </div>
                      )}
                    </td>

                    {/* Container Number */}
                    <td style={{ fontWeight: '700', color: '#4A2E1B', letterSpacing: '0.3px' }}>
                      {row.container_number}
                    </td>

                    {/* Factory */}
                    <td style={{ color: '#4E342E', fontWeight: '600' }}>
                      {row.factory || '—'}
                    </td>

                    {/* Date Loading */}
                    <td style={{ color: '#5D4037' }}>
                      {row.date_loading || row.date_loading_raw || '—'}
                    </td>

                    {/* Timestamp */}
                    <td style={{ color: '#6D4C41', fontSize: '0.78rem' }}>
                      {row.timestamp_raw || '—'}
                    </td>

                    {/* Operator Name */}
                    <td style={{ color: '#4E342E' }}>
                      {row.operator_name || '—'}
                    </td>

                    {/* Số Kiện (Pallet/Box) */}
                    <td style={{ textAlign: 'center', fontWeight: '700', color: '#0369A1' }}>
                      {row.total_items || 0}
                    </td>

                    {/* Số LPN */}
                    <td style={{ textAlign: 'center', fontWeight: '700', color: '#15803D' }}>
                      {row.lpn_count || 0}
                    </td>

                    {/* Số Ảnh */}
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#7B5233' }}>
                      {row.total_images || 0}
                    </td>

                    {/* Trạng Thái Đạt/Chưa Đạt */}
                    <td style={{ textAlign: 'center' }}>
                      {renderStatusBadge(row)}
                    </td>

                    {/* Thao Tác */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectContainer(row);
                          }}
                          style={{
                            background: '#FAF6F0',
                            border: '1px solid #EADCC9',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#4A2E1B',
                            fontSize: '0.74rem',
                            fontWeight: '600',
                            transition: 'all 0.15s ease'
                          }}
                          title="Xem chi tiết các kiện hàng và ảnh trong container"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#4A2E1B';
                            e.currentTarget.style.color = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#4A2E1B';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FAF6F0';
                            e.currentTarget.style.color = '#4A2E1B';
                            e.currentTarget.style.borderColor = '#EADCC9';
                          }}
                        >
                          <span>Chi tiết</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (Hiển thị đẹp mắt, trực quan và dễ nhìn trên Mobile) */}
      <div className="lpn-mobile-card-list lpn-mobile-only" style={{ padding: '8px 10px 80px 10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading && items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#8D6E63', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #EADCC9' }}>
            <div className="lpn-spinner-sm" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '0.84rem' }}>Đang tải danh sách Container...</div>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#8D6E63', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #EADCC9', fontSize: '0.84rem' }}>
            Không có dữ liệu Container nào phù hợp với bộ lọc.
          </div>
        ) : (
          items.map((row, idx) => {
            const isSelected = selectedContainerIds.includes(row.container_id);
            const stt = startIdx + idx;
            const imgUrl = resolveImgUrl(row.container_image || row.first_image);

            return (
              <div
                key={row.container_id || `cont-m-${idx}`}
                onClick={() => onSelectContainer(row)}
                style={{
                  backgroundColor: isSelected ? '#FAF6F0' : '#FFFFFF',
                  border: isSelected ? '1.5px solid #7B5233' : '1px solid #EADCC9',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 2px 6px rgba(123, 82, 51, 0.05)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'border-color 0.15s, background-color 0.15s'
                }}
              >
                {/* Header Thẻ: STT + Số Container + Nhà máy + Badge Trạng thái */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={isSelected}
                      onChange={() => onToggleSelectRow(row.container_id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#8D6E63', fontWeight: '700' }}>#{stt}</span>
                    <span style={{ fontSize: '1.02rem', fontWeight: '800', color: '#2D1A12', letterSpacing: '0.2px' }}>
                      {row.container_number}
                    </span>
                    {row.factory && row.factory !== '—' && (
                      <span
                        style={{
                          backgroundColor: '#4A2E1B',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {row.factory}
                      </span>
                    )}
                  </div>

                  <div>{renderStatusBadge(row)}</div>
                </div>

                {/* Thân Thẻ: Ảnh bên trái + Thông tin chi tiết bên phải */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Ảnh Container */}
                  <div
                    style={{
                      width: '84px',
                      height: '62px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      backgroundColor: '#FAF6F0',
                      border: '1px solid #EADCC9',
                      flexShrink: 0,
                      position: 'relative'
                    }}
                    onClick={(e) => {
                      if (imgUrl) {
                        e.stopPropagation();
                        setLightboxImg(imgUrl);
                      }
                    }}
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={row.container_number}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.66rem', color: '#8D6E63', fontWeight: '600' }}>
                        No ảnh
                      </div>
                    )}
                  </div>

                  {/* Thông tin */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.76rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8D6E63', fontWeight: '500' }}>Ngày đóng:</span>
                      <span style={{ color: '#2D1A12', fontWeight: '700' }}>{row.date_loading || row.date_loading_raw || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8D6E63', fontWeight: '500' }}>Người thao tác:</span>
                      <span style={{ color: '#4E342E', fontWeight: '600' }}>{row.operator_name || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '2px', paddingTop: '4px', borderTop: '1px dashed #F0E6D8' }}>
                      <span style={{ color: '#0369A1', fontWeight: '700' }}>{row.total_items || 0} Kiện</span>
                      <span style={{ color: '#15803D', fontWeight: '700' }}>{row.lpn_count || 0} LPN</span>
                      <span style={{ color: '#7B5233', fontWeight: '700' }}>{row.total_images || 0} Ảnh</span>
                    </div>
                  </div>
                </div>

                {/* Nút Xem chi tiết to, dễ bấm */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectContainer(row);
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: '#FAF6F0',
                    border: '1px solid #EADCC9',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#4A2E1B',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  Xem chi tiết Container
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Image Preview on Hover */}
      {hoveredImg && (
        <div
          style={{
            position: 'fixed',
            top: `${hoverPos.top}px`,
            left: `${hoverPos.left}px`,
            zIndex: 9999,
            pointerEvents: 'none',
            backgroundColor: '#FFFFFF',
            padding: '4px',
            borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
            border: '2px solid #EADCC9',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <img
            src={hoveredImg}
            alt="Preview"
            style={{
              width: '240px',
              height: '180px',
              objectFit: 'cover',
              borderRadius: '8px',
              display: 'block'
            }}
          />
        </div>
      )}

      {/* Lightbox Modal Xem Ảnh Phóng To */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            padding: '24px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 48px rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}
          >
            <img
              src={lightboxImg}
              alt="Container Fullscreen"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                display: 'block'
              }}
            />
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="lpn-pagination-container">
        <div className="lpn-pagination-info">
          {isMobile ? (
            <div className="lpn-pagination-info-pill">
              <span className="lpn-pill-range">{startIdx}–{endIdx}</span>
              <span className="lpn-pill-sep">/</span>
              <span className="lpn-pill-total">{Number(total || 0).toLocaleString()}</span>
            </div>
          ) : (
            <span>
              Hiển thị <strong>{startIdx}</strong>–<strong>{endIdx}</strong> trong tổng số <strong>{Number(total || 0).toLocaleString()}</strong> Container
            </span>
          )}
        </div>

        <div className="lpn-pagination-controls">
          <button
            type="button"
            className="lpn-page-btn lpn-page-nav-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            title="Trang trước"
          >
            {isMobile ? '‹' : '‹ Trước'}
          </button>

          {getPageButtons(isMobile).map((btn, idx) => {
            if (btn === '...') {
              return (
                <span key={`dots-${idx}`} className="pagination-ellipsis">
                  …
                </span>
              );
            }
            return (
              <button
                key={`page-${btn}`}
                type="button"
                className={`lpn-page-btn ${page === btn ? 'active' : ''}`}
                onClick={() => onPageChange(btn)}
              >
                {btn}
              </button>
            );
          })}

          <button
            type="button"
            className="lpn-page-btn lpn-page-nav-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            title="Trang sau"
          >
            {isMobile ? '›' : 'Sau ›'}
          </button>
        </div>
      </div>
    </div>
  );
};
