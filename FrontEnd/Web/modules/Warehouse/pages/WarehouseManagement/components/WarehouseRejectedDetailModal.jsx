import React from 'react';
import { X, ExternalLink, AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';
import { formatDateVN, formatNumber } from '../../../types/warehouseInventory.types';
import { REJECTED_SOURCE_TYPES, REJECTED_STATUSES, REJECTED_RESOLUTIONS } from '../../../types/rejectedGoods.types';

/**
 * WarehouseRejectedDetailModal.jsx
 * Popup xem chi tiết phiếu Hàng loại / Hàng trả về
 * Chuẩn Design System SmartFlow ERP (Nâu - Kem - Trắng)
 */
const WarehouseRejectedDetailModal = ({
  isOpen,
  onClose,
  voucher,
  onOpenReceipt,
  onOpenIssue
}) => {
  if (!isOpen || !voucher) return null;

  const srcCfg = REJECTED_SOURCE_TYPES[voucher.source_type] || { label: voucher.source_type || '—' };
  const stCfg = REJECTED_STATUSES[voucher.status] || { label: voucher.status || '—', color: '#666', bgColor: '#EEE' };
  const resCfg = REJECTED_RESOLUTIONS[voucher.resolution] || { label: voucher.resolution || 'Chờ thẩm định', color: '#B45309', bgColor: '#FEF3C7' };

  const handleOpenOrigin = () => {
    if (!voucher.origin_voucher_no) return;
    if (voucher.origin_voucher_no.startsWith('PNK')) {
      if (onOpenReceipt) onOpenReceipt(voucher.origin_voucher_no, voucher.origin_voucher_id);
    } else {
      if (onOpenIssue) onOpenIssue(voucher.origin_voucher_no, voucher.origin_voucher_id);
    }
  };

  return (
    <div className="wh-mat-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="wh-material-dialog-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '760px',
          maxWidth: '92vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 12px 36px rgba(45, 26, 18, 0.25)',
          border: '1px solid #D5C7B7',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#FAF6F0',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '6px',
                backgroundColor: '#7B5233',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#2D1A12' }}>
                  Chi tiết phiếu hàng loại: {voucher.voucher_no}
                </h3>
                {voucher.is_demo && (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      border: '1px solid #FCD34D'
                    }}
                  >
                    Bản ghi Demo kiểm thử
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#7B5233', marginTop: 2 }}>
                Ngày lập: {formatDateVN(voucher.created_date)} | Kho: {voucher.warehouse_name}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="wh-mat-close-btn"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#8D6E63',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
            title="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {voucher.is_demo && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '6px',
                marginBottom: 16,
                fontSize: '0.82rem',
                color: '#92400E',
                lineHeight: 1.5
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Bản ghi kiểm thử có kiểm soát:</strong> Chứng từ này được sinh độc lập để kiểm thử hiển thị và đối chiếu quy trình nghiệp vụ. Trạng thái phiếu là <em>Chờ xử lý</em> và không làm thay đổi số dư tồn kho khả dụng thực tế.
              </div>
            </div>
          )}

          {/* Grid thông tin chính */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px 20px',
              backgroundColor: '#FAF8F5',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #EADCC9'
            }}
          >
            {/* Cột 1 */}
            <div>
              <span style={{ fontSize: '0.78rem', color: '#8D6E63', display: 'block', marginBottom: 2 }}>
                Mã chứng từ hàng loại
              </span>
              <span style={{ fontWeight: 700, color: '#7B5233', fontSize: '0.95rem' }}>
                {voucher.voucher_no}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: '#8D6E63', display: 'block', marginBottom: 2 }}>
                Ngày phát sinh
              </span>
              <span style={{ fontWeight: 600, color: '#2D1A12', fontSize: '0.9rem' }}>
                {formatDateVN(voucher.created_date)}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: '#8D6E63', display: 'block', marginBottom: 2 }}>
                Nguồn phát sinh
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: voucher.source_type === 'QC_INCOMING' ? '#EFF6FF' : '#FEF3C7',
                  color: voucher.source_type === 'QC_INCOMING' ? '#1D4ED8' : '#B45309',
                  border: voucher.source_type === 'QC_INCOMING' ? '1px solid #BFDBFE' : '1px solid #FDE68A'
                }}
              >
                {srcCfg.label}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: '#8D6E63', display: 'block', marginBottom: 2 }}>
                Chứng từ gốc liên kết
              </span>
              {voucher.origin_voucher_no ? (
                <button
                  type="button"
                  onClick={handleOpenOrigin}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#1D4ED8',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.88rem'
                  }}
                  title={`Bấm xem chứng từ gốc ${voucher.origin_voucher_no}`}
                >
                  <span>{voucher.origin_voucher_no}</span>
                  <ExternalLink size={13} />
                </button>
              ) : (
                <span style={{ color: '#8D6E63' }}>—</span>
              )}
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: '#8D6E63', display: 'block', marginBottom: 2 }}>
                Kho lưu trữ
              </span>
              <span style={{ fontWeight: 600, color: '#2D1A12', fontSize: '0.88rem' }}>
                {voucher.warehouse_name}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: '#8D6E63', display: 'block', marginBottom: 2 }}>
                Trạng thái chứng từ
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: stCfg.bgColor,
                  color: stCfg.color
                }}
              >
                {stCfg.label}
              </span>
            </div>
          </div>

          {/* Khối thông tin vật tư & Số lượng loại */}
          <div
            style={{
              marginTop: 16,
              padding: '16px',
              backgroundColor: '#FFFFFF',
              borderRadius: '6px',
              border: '1px solid #EADCC9'
            }}
          >
            <h4
              style={{
                margin: '0 0 12px 0',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#5D4037',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Thông tin vật tư &amp; Định lượng loại
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#8D6E63', display: 'block', marginBottom: 2 }}>
                  Mã &amp; Tên vật tư
                </span>
                <div style={{ fontWeight: 700, color: '#2D1A12', fontSize: '0.9rem' }}>
                  {voucher.item_code}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#4B5563', marginTop: 2 }}>
                  {voucher.item_name}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: '#8D6E63', display: 'block', marginBottom: 2 }}>
                  Số lượng loại (ĐVC)
                </span>
                <div style={{ fontWeight: 700, color: '#B45309', fontSize: '1.05rem' }}>
                  {formatNumber(voucher.quantity_main)} <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{voucher.unit_main}</span>
                </div>
                {voucher.origin_quantity && (
                  <div style={{ fontSize: '0.75rem', color: '#8D6E63', marginTop: 2 }}>
                    (Phiếu gốc: {formatNumber(voucher.origin_quantity)} {voucher.unit_main})
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: '#8D6E63', display: 'block', marginBottom: 2 }}>
                  Số lượng loại (ĐVCĐ)
                </span>
                <div style={{ fontWeight: 600, color: '#5D4037', fontSize: '0.95rem' }}>
                  {voucher.quantity_conv ? `${formatNumber(voucher.quantity_conv)} ${voucher.unit_conversion || ''}` : '—'}
                </div>
                {voucher.conversion_rate && (
                  <div style={{ fontSize: '0.75rem', color: '#8D6E63', marginTop: 2 }}>
                    Tỷ lệ: 1 {voucher.unit_main} = {voucher.conversion_rate} {voucher.unit_conversion}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Khối lý do lỗi & Phương án xử lý */}
          <div
            style={{
              marginTop: 16,
              padding: '16px',
              backgroundColor: '#FAF8F5',
              borderRadius: '6px',
              border: '1px solid #EADCC9',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16
            }}
          >
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: '#5D4037' }}>
                Lý do phát sinh hàng loại
              </h4>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2D1A12' }}>
                Nhóm lỗi: {voucher.defect_category || 'Lỗi quy cách / chất lượng'}
              </div>
              <div
                style={{
                  fontSize: '0.82rem',
                  color: '#4B5563',
                  marginTop: 4,
                  padding: '8px 10px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '4px',
                  border: '1px solid #F0E6D8',
                  minHeight: 48
                }}
              >
                {voucher.defect_reason || 'Không có mô tả chi tiết'}
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: '#5D4037' }}>
                Phương án xử lý
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: resCfg.bgColor,
                    color: resCfg.color
                  }}
                >
                  {resCfg.label}
                </span>
                {voucher.resolution_date && (
                  <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                    (Ngày: {formatDateVN(voucher.resolution_date)})
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: '0.82rem',
                  color: '#4B5563',
                  padding: '8px 10px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '4px',
                  border: '1px solid #F0E6D8',
                  minHeight: 48
                }}
              >
                {voucher.resolution_notes || 'Chưa có ghi chú xử lý'}
              </div>
            </div>
          </div>

          {/* Người lập & Người phụ trách */}
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: '#8D6E63',
              padding: '0 4px'
            }}
          >
            <span>Người lập: <strong>{voucher.created_by || 'Bộ phận QC'}</strong></span>
            <span>Người thẩm định: <strong>{voucher.handler_name || 'Chưa phân công'}</strong></span>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#FAF6F0',
            borderTop: '1px solid #EADCC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            {voucher.origin_voucher_no && (
              <button
                type="button"
                onClick={handleOpenOrigin}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #C7D2FE',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#1D4ED8',
                  cursor: 'pointer'
                }}
              >
                <ExternalLink size={14} />
                <span>Xem chứng từ gốc ({voucher.origin_voucher_no})</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 18px',
              backgroundColor: '#7B5233',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarehouseRejectedDetailModal;

