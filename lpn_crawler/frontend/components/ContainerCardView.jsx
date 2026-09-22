import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateMDY } from '../utils/formatters';

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

// Hàm kiểm tra trạng thái Đạt hay Thiếu dữ liệu cụ thể
const getCardStatus = (card) => {
  const totImgs = Number(card.total_images || 0);
  const totItms = Number(card.total_items || 0);
  const skuCnt = Number(card.sku_count || 0);
  const lpnCnt = Number(card.lpn_count || 0);
  const noImg = Number(card.items_without_image || 0);
  const noSku = Number(card.items_without_sku || 0);
  const noLpn = Number(card.items_without_lpn || 0);

  const isImageMissing = totImgs < totItms || noImg > 0 || totImgs === 0;
  const isSkuMissing = skuCnt === 0 || noSku > 0;
  const isLpnMissing = lpnCnt === 0 || noLpn > 0;
  const isDateMissing = !card.date_loading || card.date_loading === '—' || card.date_loading === 'None';

  const missingList = [];

  // Thiếu ảnh (ghi rõ thiếu bao nhiêu ảnh)
  if (isImageMissing) {
    const diff = Math.max(noImg, totItms - totImgs, totImgs === 0 ? totItms : 1);
    missingList.push(`${diff > 0 ? diff + ' ' : ''}ảnh`);
  }

  // Thiếu SKU
  if (isSkuMissing) {
    missingList.push('SKU');
  }

  // Thiếu LPN
  if (isLpnMissing) {
    missingList.push('LPN');
  }

  // Thiếu Ngày
  if (isDateMissing) {
    missingList.push('ngày');
  }

  if (missingList.length > 0) {
    return {
      isValid: false,
      text: `Thiếu ${missingList.join(', ')}`
    };
  }
  return {
    isValid: true,
    text: 'Đạt'
  };
};

export const ContainerCardView = ({
  items = [],
  total = 0,
  page = 1,
  pageSize = 24,
  onPageChange = () => {},
  onSelectContainer = () => {},
  onSelectItem = () => {},
  loading = false
}) => {
  const effectivePageSize = (pageSize === Infinity || pageSize === 'all') ? (total || 100000) : (pageSize || 24);
  const totalPages = Math.ceil(total / effectivePageSize) || 1;
  const startIdx = total > 0 ? (page - 1) * effectivePageSize + 1 : 0;
  const endIdx = total > 0 ? Math.min(page * effectivePageSize, total) : 0;

  // Hover Popover State
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = (card, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let left = rect.right + 10;
    if (left + 290 > window.innerWidth) {
      left = Math.max(10, rect.left - 295);
    }
    let top = Math.max(10, Math.min(window.innerHeight - 330, rect.top - 5));

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverPos({ top, left });
      setHoveredCard(card);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredCard(null);
  };

  const getPageButtons = () => {
    const btns = [];
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      
      {/* Scrollable Container Grid Cards */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '2px 4px 10px 2px'
      }}>
        {loading && items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #EADCC9', color: '#7B5233' }}>
            <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '4px', color: '#4A2E1B' }}>Đang tải danh sách Container...</div>
            <div style={{ fontSize: '0.82rem', color: '#8D6E63' }}>Vui lòng chờ trong giây lát</div>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #EADCC9', color: '#8D6E63' }}>
            <div style={{ fontWeight: '700', fontSize: '1rem', color: '#4A2E1B', marginBottom: '4px' }}>Không tìm thấy dữ liệu Container</div>
            <div style={{ fontSize: '0.82rem' }}>Không có bản ghi nào phù hợp với điều kiện tìm kiếm.</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: '12px',
            alignItems: 'stretch'
          }}>
            {items.map((card) => {
              const imgUrl = resolveImgUrl(card.first_image);
              const formattedDate = card.date_loading || formatDateMDY(card.date_loading_raw) || card.date_loading_raw || '—';
              
              // Kiểm tra trạng thái chính xác
              const status = getCardStatus(card);
              const isMissing = !status.isValid;

              return (
                <div
                  key={card.container_id || card.container_number}
                  onClick={() => onSelectContainer ? onSelectContainer(card) : onSelectItem(card)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = isMissing ? '#DC2626' : '#7B5233';
                    e.currentTarget.style.boxShadow = isMissing ? '0 6px 16px rgba(220, 38, 38, 0.18)' : '0 6px 16px rgba(123, 82, 51, 0.12)';
                    handleMouseEnter(card, e);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = isMissing ? '#FCA5A5' : '#EADCC9';
                    e.currentTarget.style.boxShadow = isMissing ? '0 2px 8px rgba(220, 38, 38, 0.08)' : '0 2px 8px rgba(123, 82, 51, 0.05)';
                    handleMouseLeave();
                  }}
                  style={{
                    backgroundColor: isMissing ? '#FEF2F2' : '#FFFFFF',
                    border: isMissing ? '1.5px solid #FCA5A5' : '1px solid #EADCC9',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: isMissing ? '0 2px 8px rgba(220, 38, 38, 0.08)' : '0 2px 8px rgba(123, 82, 51, 0.05)'
                  }}
                >
                  {/* Top: Image Cover Layer */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '65%',
                    backgroundColor: isMissing ? '#FEE2E2' : '#FAF6F0',
                    overflow: 'hidden',
                    borderBottom: isMissing ? '1px solid #FECACA' : '1px solid #EADCC9'
                  }}>
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={card.container_number}
                        loading="lazy"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isMissing ? '#DC2626' : '#A89F91',
                        fontSize: '0.76rem',
                        fontWeight: '700',
                        letterSpacing: '0.5px'
                      }}>
                        {isMissing ? 'CHƯA CÓ ẢNH' : 'NO IMAGE'}
                      </div>
                    )}

                    {/* Top Right Factory Badge */}
                    {card.factory && card.factory !== '—' && (
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        backgroundColor: isMissing ? 'rgba(185, 28, 28, 0.92)' : 'rgba(74, 46, 27, 0.9)',
                        color: '#FFFFFF',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        letterSpacing: '0.2px',
                        backdropFilter: 'blur(2px)'
                      }}>
                        {card.factory}
                      </div>
                    )}

                    {/* Bottom Left Image Count Badge */}
                    <div style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      backgroundColor: isMissing && (Number(card.total_images || 0) < Number(card.total_items || 0) || Number(card.total_images || 0) === 0)
                        ? 'rgba(220, 38, 38, 0.92)'
                        : 'rgba(123, 82, 51, 0.9)',
                      color: '#FFFFFF',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {Number(card.total_images || 0).toLocaleString()} ảnh
                    </div>
                  </div>

                  {/* Bottom: Text Information Content */}
                  <div style={{
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    backgroundColor: isMissing ? '#FEF2F2' : '#FFFFFF',
                    flex: 1,
                    justifyContent: 'space-between'
                  }}>
                    {/* Row 1: Container Number + Status Tag (Đạt hoặc Thiếu ...) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      <span style={{
                        fontWeight: '800',
                        fontSize: '0.86rem',
                        color: isMissing ? '#991B1B' : '#2D1A12',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        letterSpacing: '0.2px'
                      }} title={card.container_number}>
                        {card.container_number}
                      </span>

                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: '800',
                        color: isMissing ? '#B91C1C' : '#15803D',
                        backgroundColor: isMissing ? '#FEE2E2' : '#F0FDF4',
                        border: `1px solid ${isMissing ? '#FCA5A5' : '#BBF7D0'}`,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        whiteSpace: 'nowrap'
                      }}>
                        {status.text}
                      </span>
                    </div>

                    {/* Row 2: LPN • Pallet/Box • Ảnh (Hiển thị đầy đủ, không bị khuất) */}
                    <div style={{
                      fontSize: '0.71rem',
                      color: isMissing ? '#991B1B' : '#7B5233',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{ color: (Number(card.lpn_count || 0) === 0 || Number(card.items_without_lpn || 0) > 0) ? '#DC2626' : undefined }}>
                        {Number(card.lpn_count || 0).toLocaleString()} LPN
                      </span>
                      <span style={{ color: isMissing ? '#FCA5A5' : '#D7CCC8', fontSize: '0.65rem' }}>&bull;</span>
                      <span>{Number(card.total_items || 0).toLocaleString()} Pallet/Box</span>
                      <span style={{ color: isMissing ? '#FCA5A5' : '#D7CCC8', fontSize: '0.65rem' }}>&bull;</span>
                      <span style={{ color: (Number(card.total_images || 0) < Number(card.total_items || 0) || Number(card.items_without_image || 0) > 0 || Number(card.total_images || 0) === 0) ? '#DC2626' : undefined }}>
                        {Number(card.total_images || 0).toLocaleString()} ảnh
                      </span>
                    </div>

                    {/* Row 3: Date loading */}
                    <div style={{
                      fontSize: '0.73rem',
                      color: isMissing ? '#B91C1C' : '#6D4C41',
                      fontWeight: '600'
                    }}>
                      {formattedDate}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Hover Info Table Popover */}
      {hoveredCard && (() => {
        const hoverStatus = getCardStatus(hoveredCard);
        return (
          <div
            style={{
              position: 'fixed',
              top: `${hoverPos.top}px`,
              left: `${hoverPos.left}px`,
              zIndex: 1300,
              width: '280px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #7B5233',
              borderRadius: '10px',
              boxShadow: '0 12px 32px rgba(74, 46, 27, 0.22)',
              padding: '12px 14px',
              pointerEvents: 'none',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #EADCC9', paddingBottom: '6px' }}>
              <span style={{ fontWeight: '900', fontSize: '0.92rem', color: '#2D1A12' }}>
                {hoveredCard.container_number}
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: '800',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: !hoverStatus.isValid ? '#FEF2F2' : '#F0FDF4',
                color: !hoverStatus.isValid ? '#B91C1C' : '#15803D',
                border: `1px solid ${!hoverStatus.isValid ? '#FECACA' : '#BBF7D0'}`
              }}>
                {hoverStatus.text}
              </span>
            </div>

            <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#8D6E63', padding: '3px 0' }}>Nhà máy:</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#2D1A12' }}>{hoveredCard.factory || '—'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#8D6E63', padding: '3px 0' }}>Ngày xếp:</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#2D1A12' }}>{hoveredCard.date_loading || '—'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#8D6E63', padding: '3px 0' }}>Thời gian:</td>
                  <td style={{ textAlign: 'right', fontWeight: '600', color: '#5D4037' }}>{hoveredCard.timestamp_raw || '—'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#8D6E63', padding: '3px 0' }}>Người thao tác:</td>
                  <td style={{ textAlign: 'right', fontWeight: '600', color: '#5D4037' }}>{hoveredCard.operator_name || '—'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#8D6E63', padding: '3px 0' }}>Số lượng LPN:</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#7B5233' }}>{Number(hoveredCard.lpn_count || 0).toLocaleString()} LPN</td>
                </tr>
                <tr>
                  <td style={{ color: '#8D6E63', padding: '3px 0' }}>Số lượng SKU:</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#7B5233' }}>{Number(hoveredCard.sku_count || 0).toLocaleString()} SKU</td>
                </tr>
                <tr>
                  <td style={{ color: '#8D6E63', padding: '3px 0' }}>Tổng Pallet/Box:</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#2D1A12' }}>{Number(hoveredCard.total_items || 0).toLocaleString()} Pallet/Box</td>
                </tr>
                <tr>
                  <td style={{ color: '#8D6E63', padding: '3px 0' }}>Tổng hình ảnh:</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#2D1A12' }}>{Number(hoveredCard.total_images || 0).toLocaleString()} ảnh</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #EADCC9', fontSize: '0.7rem', color: '#7B5233', textAlign: 'center', fontWeight: '600' }}>
              Bấm vào thẻ để xem toàn bộ Pallet/Box
            </div>
          </div>
        );
      })()}

      {/* Pagination Footer */}
      <div
        className="lpn-pagination-container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px',
          backgroundColor: '#FAF6F0',
          border: '1px solid #EADCC9',
          borderRadius: '10px',
          flexShrink: 0
        }}
      >
        <div className="lpn-pagination-info" style={{ fontSize: '0.82rem', color: '#8D6E63', fontWeight: '600' }}>
          Hiển thị <b style={{ color: '#4A2E1B' }}>{startIdx.toLocaleString()}</b>–<b style={{ color: '#4A2E1B' }}>{endIdx.toLocaleString()}</b> trên <b style={{ color: '#4A2E1B' }}>{total.toLocaleString()}</b> Container
        </div>

        <div className="lpn-pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="lpn-page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            title="Trang trước"
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #EADCC9',
              background: page <= 1 ? '#F5EFE6' : '#FFFFFF',
              color: page <= 1 ? '#D7CCC8' : '#7B5233',
              cursor: page <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {getPageButtons().map((b, i) =>
            b === '...' ? (
              <span key={`dots-${i}`} className="lpn-page-dots" style={{ padding: '0 4px', color: '#8D6E63' }}>
                ...
              </span>
            ) : (
              <button
                key={b}
                className={`lpn-page-btn ${page === b ? 'active' : ''}`}
                onClick={() => onPageChange(b)}
                style={{
                  minWidth: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: page === b ? '#7B5233' : '#EADCC9',
                  background: page === b ? '#7B5233' : '#FFFFFF',
                  color: page === b ? '#FFFFFF' : '#5D4037',
                  fontWeight: page === b ? '800' : '600',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {b}
              </button>
            )
          )}

          <button
            className="lpn-page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            title="Trang sau"
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #EADCC9',
              background: page >= totalPages ? '#F5EFE6' : '#FFFFFF',
              color: page >= totalPages ? '#D7CCC8' : '#7B5233',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

    </div>
  );
};
