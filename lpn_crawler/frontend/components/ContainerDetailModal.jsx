import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';

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

// Component từng thẻ kiện hàng Pallet/Box bên trong Container
const ContainerItemCard = ({ itm, idx, onSelectItemDetail, allItems }) => {
  const [imgError, setImgError] = useState(false);
  const firstImg = itm.first_image || (itm.images && itm.images.length > 0 ? itm.images[0] : null);
  const imgUrl = resolveImgUrl(firstImg);
  const imgCount = itm.images_count || (itm.images ? itm.images.length : 0);

  // Kiểm tra mã LPN
  const hasLpn = Boolean(
    itm.lpn &&
    String(itm.lpn).trim() !== '' &&
    String(itm.lpn).trim() !== 'None' &&
    String(itm.lpn).trim() !== '0' &&
    String(itm.lpn).trim() !== '—'
  );

  // Kiểm tra mã SKU
  const hasSku = Boolean(
    itm.sku &&
    String(itm.sku).trim() !== '' &&
    String(itm.sku).trim() !== 'None' &&
    String(itm.sku).trim() !== '0' &&
    String(itm.sku).trim() !== '—'
  );

  // Kiểm tra hình ảnh (thiếu nếu không có URL ảnh, không có ảnh trong danh sách, hoặc load ảnh bị lỗi 404/hỏng)
  const isImageMissing = !imgUrl || imgCount === 0 || imgError;
  const isLpnMissing = !hasLpn;
  const isSkuMissing = !hasSku;

  // Thẻ bị thiếu nếu vi phạm ít nhất 1 trong 3 điều kiện: Thiếu LPN, Thiếu SKU, hoặc Thiếu Hình Ảnh
  const isMissing = isImageMissing || isLpnMissing || isSkuMissing;

  const missingReasons = [];
  if (isLpnMissing) missingReasons.push('LPN');
  if (isSkuMissing) missingReasons.push('SKU');
  if (isImageMissing) missingReasons.push('ảnh');

  return (
    <div
      onClick={() => onSelectItemDetail(itm, allItems)}
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
        boxShadow: isMissing ? '0 2px 6px rgba(220, 38, 38, 0.08)' : '0 2px 6px rgba(123, 82, 51, 0.05)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = isMissing ? '#DC2626' : '#7B5233';
        e.currentTarget.style.boxShadow = isMissing ? '0 6px 16px rgba(220, 38, 38, 0.2)' : '0 6px 16px rgba(123, 82, 51, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = isMissing ? '#FCA5A5' : '#EADCC9';
        e.currentTarget.style.boxShadow = isMissing ? '0 2px 6px rgba(220, 38, 38, 0.08)' : '0 2px 6px rgba(123, 82, 51, 0.05)';
      }}
    >
      {/* Top: Item Image Layer */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '70%',
          backgroundColor: isMissing ? '#FEE2E2' : '#FAF6F0',
          overflow: 'hidden',
          borderBottom: isMissing ? '1px solid #FECACA' : '1px solid #EADCC9'
        }}
      >
        {imgUrl && !imgError ? (
          <img
            src={imgUrl}
            alt={itm.suffix_key || itm.lpn}
            loading="lazy"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={() => {
              setImgError(true);
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              color: isMissing ? '#DC2626' : '#A89F91',
              fontSize: '0.72rem',
              fontWeight: '700',
              letterSpacing: '0.5px'
            }}
          >
            <span>CHƯA CÓ ẢNH</span>
          </div>
        )}

        {/* Suffix badge (Pallet 1, Box 1A) */}
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            backgroundColor: isMissing ? 'rgba(185, 28, 28, 0.92)' : 'rgba(74, 46, 27, 0.9)',
            color: '#FFFFFF',
            fontSize: '0.66rem',
            fontWeight: '700',
            padding: '2px 6px',
            borderRadius: '4px',
            backdropFilter: 'blur(2px)'
          }}
        >
          {itm.suffix_key || itm.record_type || `Kiện #${idx + 1}`}
        </div>

        {/* Image count / missing badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '6px',
            right: '6px',
            backgroundColor: isImageMissing ? 'rgba(220, 38, 38, 0.92)' : 'rgba(123, 82, 51, 0.9)',
            color: '#FFFFFF',
            fontSize: '0.66rem',
            fontWeight: '700',
            padding: '2px 6px',
            borderRadius: '4px'
          }}
        >
          {isImageMissing ? 'Thiếu ảnh' : `${imgCount} ảnh`}
        </div>
      </div>

      {/* Bottom: Item Text Information */}
      <div
        style={{
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          backgroundColor: isMissing ? '#FEF2F2' : '#FFFFFF',
          flex: 1,
          justifyContent: 'space-between'
        }}
      >
        {/* LPN */}
        <div style={{ fontSize: '0.78rem', color: isLpnMissing ? '#DC2626' : '#7B5233', fontWeight: '800', fontFamily: 'monospace' }}>
          {hasLpn ? itm.lpn : <span style={{ color: '#DC2626', fontStyle: 'italic' }}>(Thiếu LPN)</span>}
        </div>

        {/* SKU */}
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: '700',
            color: isSkuMissing ? '#DC2626' : '#2D1A12',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          title={itm.sku}
        >
          {hasSku ? itm.sku : <span style={{ color: '#DC2626', fontStyle: 'italic' }}>(Thiếu SKU)</span>}
        </div>

        {/* Batch & Missing Reason / Index */}
        <div
          style={{
            fontSize: '0.72rem',
            color: isMissing ? '#991B1B' : '#6D4C41',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '0.68rem', fontWeight: isMissing ? '700' : '500' }}>
            {isMissing ? (
              <span style={{ color: '#B91C1C', fontWeight: '700' }}>Thiếu: {missingReasons.join(', ')}</span>
            ) : (
              itm.batch_resolved || itm.batch_original || '—'
            )}
          </span>
          <span style={{ color: isMissing ? '#DC2626' : '#8D6E63', fontSize: '0.68rem', fontWeight: '700' }}>#{idx + 1}</span>
        </div>
      </div>
    </div>
  );
};

export const ContainerDetailModal = ({
  containerData,
  onSelectItemDetail = () => {},
  onClose = () => {}
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!containerData) return null;

  const items = containerData.items || [];

  // Filter items by search inside container
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (itm) =>
        (itm.lpn && String(itm.lpn).toLowerCase().includes(q)) ||
        (itm.sku && String(itm.sku).toLowerCase().includes(q)) ||
        (itm.suffix_key && String(itm.suffix_key).toLowerCase().includes(q)) ||
        (itm.batch_resolved && String(itm.batch_resolved).toLowerCase().includes(q)) ||
        (itm.batch_original && String(itm.batch_original).toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  return (
    <div
      className="lpn-container-detail-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(25, 15, 10, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px'
      }}
      onClick={onClose}
    >
      <div
        className="lpn-container-detail-dialog"
        style={{
          backgroundColor: '#FAF6F0',
          border: '1px solid #EADCC9',
          borderRadius: '12px',
          width: 'min(98vw, 1200px)',
          maxWidth: '98vw',
          height: 'min(94vh, 900px)',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Unified Clean Header */}
        <div
          className="lpn-container-detail-header"
          style={{
            padding: '10px 16px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            flexShrink: 0
          }}
        >
          {/* Left: Container Number, Factory, Date Loading & Summary text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.10rem', fontWeight: '800', color: '#2D1A12', letterSpacing: '0.2px' }}>
                {containerData.container_number}
              </span>
              {containerData.factory && containerData.factory !== '—' && (
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '5px',
                    fontSize: '0.70rem',
                    fontWeight: '700',
                    backgroundColor: '#4A2E1B',
                    color: '#FFFFFF'
                  }}
                >
                  {containerData.factory}
                </span>
              )}
            </div>

            <div style={{ height: '14px', width: '1px', backgroundColor: '#EADCC9' }} />

            <div style={{ fontSize: '0.78rem', color: '#5D4037', fontWeight: '700' }}>
              {containerData.date_loading}
            </div>

            <div style={{ height: '14px', width: '1px', backgroundColor: '#EADCC9' }} />

            <div style={{ fontSize: '0.78rem', color: '#7B5233' }}>
              <b>{Number(containerData.lpn_count || 0).toLocaleString()}</b> LPN &bull; <b>{Number(containerData.sku_count || 0).toLocaleString()}</b> SKU &bull; <b>{items.length.toLocaleString()}</b> Pallet ({Number(containerData.total_images || 0).toLocaleString()} ảnh)
            </div>
          </div>

          {/* Right: Search Box + Close button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px', justifyContent: 'flex-end' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FAF6F0',
                border: '1px solid #EADCC9',
                borderRadius: '7px',
                padding: '0 8px',
                flex: '1 1 140px',
                maxWidth: '240px',
                height: '32px'
              }}
            >
              <Search size={14} style={{ color: '#8D6E63', marginRight: '6px' }} />
              <input
                type="text"
                placeholder="Tìm nhanh LPN, SKU, Pallet/Box..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.8rem',
                  color: '#2D1A12',
                  backgroundColor: 'transparent'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#8D6E63',
                    padding: '2px'
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                color: '#7B5233',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#EADCC9';
                e.currentTarget.style.color = '#2D1A12';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = '#7B5233';
              }}
              title="Đóng cửa sổ"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* 2. Modal Body: Grid of Pallet / Box Cards by LPN */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 18px'
          }}
        >
          {filteredItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #EADCC9',
                color: '#8D6E63'
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#4A2E1B', marginBottom: '4px' }}>
                Không tìm thấy Pallet/Box nào
              </div>
              <div style={{ fontSize: '0.82rem' }}>
                Thử tìm kiếm với từ khóa khác (Mã LPN, SKU, hoặc Vị trí Pallet/Box).
              </div>
            </div>
          ) : (
            <div
              className="lpn-container-detail-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
                gap: '12px',
                alignItems: 'stretch'
              }}
            >
              {filteredItems.map((itm, idx) => (
                <ContainerItemCard
                  key={itm.id || idx}
                  itm={itm}
                  idx={idx}
                  onSelectItemDetail={onSelectItemDetail}
                  allItems={items}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
