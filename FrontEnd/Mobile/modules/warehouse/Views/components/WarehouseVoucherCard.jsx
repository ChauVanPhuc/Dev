import React from 'react';
import { Calendar, Warehouse, User, Layers, Smartphone, Monitor, Camera } from 'lucide-react';
import { formatDateVN, formatNumberVN } from '../../constants/warehouseConstants';

/**
 * Thẻ hiển thị tóm tắt 1 chứng từ Kho (Nhập kho / Bàn giao / Trả về) trên Mobile.
 */
const WarehouseVoucherCard = ({
  voucherNo,
  badge,
  createdChannel = 'Web',
  warehouseName,
  dateValue,
  primaryPersonLabel,
  primaryPerson,
  secondaryMetaLabel,
  secondaryMeta,
  typeLabel,
  totalLabel,
  totalValue,
  unitLabel,
  imageCount = 0,
  note,
  onClick,
}) => {
  const isMobile = String(createdChannel || '').toLowerCase() === 'mobile';

  return (
    <div className="mwh-card mwh-card--clickable" onClick={onClick}>
      <div className="mwh-card-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="mwh-voucher-code">{voucherNo}</span>
            <span className={`mwh-channel-badge ${isMobile ? '' : 'mwh-channel-badge--web'}`}>
              {isMobile ? <Smartphone size={10} /> : <Monitor size={10} />}
              {isMobile ? 'Mobile' : 'Web'}
            </span>
            {imageCount > 0 && (
              <span className="mwh-channel-badge" style={{ background: '#fdf2f8', color: '#be185d', borderColor: '#fbcfe8' }}>
                <Camera size={10} /> {imageCount}
              </span>
            )}
          </div>
          {typeLabel && (
            <span style={{ fontSize: '11.5px', color: '#7b6456', fontWeight: 600 }}>{typeLabel}</span>
          )}
        </div>

        <span
          className="mwh-badge"
          style={{
            backgroundColor: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border || 'transparent'}`,
          }}
        >
          {badge.label}
        </span>
      </div>

      <div className="mwh-meta-grid">
        <div className="mwh-meta-item">
          <Warehouse size={13} color="#7b5233" style={{ flexShrink: 0 }} />
          <span className="mwh-meta-text" title={warehouseName}>{warehouseName || '—'}</span>
        </div>
        <div className="mwh-meta-item">
          <Calendar size={13} color="#7b5233" style={{ flexShrink: 0 }} />
          <span className="mwh-meta-text">{formatDateVN(dateValue)}</span>
        </div>
        {primaryPerson && (
          <div className="mwh-meta-item">
            <User size={13} color="#7b5233" style={{ flexShrink: 0 }} />
            <span className="mwh-meta-text" title={primaryPerson}>
              {primaryPersonLabel ? `${primaryPersonLabel}: ` : ''}{primaryPerson}
            </span>
          </div>
        )}
        {secondaryMeta && (
          <div className="mwh-meta-item">
            <Layers size={13} color="#7b5233" style={{ flexShrink: 0 }} />
            <span className="mwh-meta-text" title={secondaryMeta}>
              {secondaryMetaLabel ? `${secondaryMetaLabel}: ` : ''}{secondaryMeta}
            </span>
          </div>
        )}
      </div>

      {note && (
        <div style={{ fontSize: '12px', color: '#6b7280', background: '#faf7f2', padding: '5px 8px', borderRadius: '6px' }}>
          {note}
        </div>
      )}

      <div className="mwh-card-footer">
        <span>{totalLabel || 'Tổng số lượng'}</span>
        <strong style={{ color: '#422918', fontSize: '13.5px' }}>
          {formatNumberVN(totalValue)} {unitLabel || ''}
        </strong>
      </div>
    </div>
  );
};

export default WarehouseVoucherCard;

