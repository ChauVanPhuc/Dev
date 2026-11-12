import React, { useState } from 'react';
import { X, CheckCircle2, AlertOctagon, Printer, ArrowRight, ShieldCheck, Trash2 } from 'lucide-react';
import warehouseDataService from '../../../services/warehouseData.service';
import { ChannelBadge, MobileImagesGallery } from '../../../components/WarehouseMobileSyncBadge';
import {
  REJECTED_SOURCE_TYPES,
  REJECTED_STATUSES,
  REJECTED_RESOLUTIONS
} from '../../../types/rejectedGoods.types';
import { formatDate, formatNumber } from '../../../types/goodsReceipt.types';

export const RejectedGoodsDetailModal = ({
  voucher,
  isOpen,
  onClose,
  onUpdated,
  onOpenOriginVoucher
}) => {
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionChoice, setResolutionChoice] = useState('REUSE');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionDate, setResolutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !voucher) return null;

  const isPending = voucher.status === 'PENDING';
  const isResolved = voucher.status === 'RESOLVED';
  const isCancelled = voucher.status === 'CANCELLED';

  // Thực hiện phê duyệt thẩm định
  const handleExecuteResolve = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);
    try {
      const updated = await warehouseDataService.resolveRejectedVoucher(
        voucher.id,
        resolutionChoice,
        resolutionNotes,
        resolutionDate
      );
      if (onUpdated) onUpdated(updated);
      setIsResolving(false);
    } catch (err) {
      setErrorMsg('Lỗi khi lưu quyết định thẩm định: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Hủy phiếu
  const handleCancelVoucher = async () => {
    const reason = window.prompt('Nhập lý do hủy phiếu hàng loại này:', 'Lập sai thông tin kiểm định');
    if (reason === null) return;
    setSaving(true);
    try {
      const updated = await warehouseDataService.cancelRejectedVoucher(voucher.id, reason);
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err) {
      alert('Lỗi khi hủy phiếu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rg-modal-overlay">
      <div className="rg-modal-card" style={{ maxWidth: 660 }}>
        {/* Header */}
        <div className="rg-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3>Chi tiết phiếu hàng loại: {voucher.voucher_no}</h3>
            <ChannelBadge channel={voucher.created_channel} imageCount={(voucher.images || []).length} />
            {isPending && <span className="rg-status-badge pending">Chờ xử lý</span>}
            {isResolved && <span className="rg-status-badge resolved">Đã xử lý</span>}
            {isCancelled && <span className="rg-status-badge cancelled">Đã hủy</span>}
          </div>
          <button type="button" className="rg-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="rg-modal-body">
          {errorMsg && (
            <div className="rg-callout-warning">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Thông tin chung */}
          <div
            style={{
              background: '#FAF6F0',
              border: '1px solid #EADCC9',
              borderRadius: 8,
              padding: '12px 14px'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px 16px',
                fontSize: '0.8125rem'
              }}
            >
              <div>
                <span style={{ color: '#8D6E63', fontWeight: 500 }}>Mã biên bản: </span>
                <strong style={{ color: '#2D1A12' }}>{voucher.voucher_no}</strong>
              </div>
              <div>
                <span style={{ color: '#8D6E63', fontWeight: 500 }}>Ngày phát sinh: </span>
                <strong style={{ color: '#2D1A12' }}>{formatDate(voucher.created_date)}</strong>
              </div>
              <div>
                <span style={{ color: '#8D6E63', fontWeight: 500 }}>Nguồn phát sinh: </span>
                {voucher.source_type === 'QC_INCOMING' ? (
                  <span className="wh-badge-source-qc">QC đầu vào</span>
                ) : (
                  <span className="wh-badge-source-prod">Sản xuất trả về</span>
                )}
              </div>
              <div>
                <span style={{ color: '#8D6E63', fontWeight: 500 }}>Chứng từ gốc liên kết: </span>
                {voucher.origin_voucher_no ? (
                  <button
                    type="button"
                    className="rg-voucher-link"
                    onClick={() => onOpenOriginVoucher && onOpenOriginVoucher(voucher.origin_voucher_no)}
                    title={`Mở chứng từ gốc ${voucher.origin_voucher_no}`}
                  >
                    {voucher.origin_voucher_no}
                  </button>
                ) : (
                  <span style={{ color: '#8D6E63' }}>—</span>
                )}
              </div>
              <div>
                <span style={{ color: '#8D6E63', fontWeight: 500 }}>Kho lưu trữ: </span>
                <strong style={{ color: '#2D1A12' }}>{voucher.warehouse_name}</strong>
              </div>
              <div>
                <span style={{ color: '#8D6E63', fontWeight: 500 }}>Người lập: </span>
                <strong style={{ color: '#2D1A12' }}>{voucher.created_by || 'Nhân viên kiểm định'}</strong>
              </div>
            </div>
          </div>

          {/* 2. Chi tiết vật tư & Số lượng loại */}
          <div
            style={{
              border: '1px solid #EADCC9',
              borderRadius: 8,
              padding: '12px 14px'
            }}
          >
            <h4
              style={{
                margin: '0 0 10px 0',
                fontSize: '0.875rem',
                color: '#7B5233',
                fontWeight: 600
              }}
            >
              Vật tư &amp; Khối lượng không đạt
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px 16px',
                fontSize: '0.8125rem'
              }}
            >
              <div>
                <span style={{ color: '#8D6E63' }}>Mã vật tư: </span>
                <strong style={{ color: '#2D1A12' }}>{voucher.item_code}</strong>
              </div>
              <div>
                <span style={{ color: '#8D6E63' }}>Tên vật tư: </span>
                <strong style={{ color: '#2D1A12' }}>{voucher.item_name}</strong>
              </div>
              <div>
                <span style={{ color: '#8D6E63' }}>Số lượng loại (ĐVC): </span>
                <span style={{ fontWeight: 700, color: '#B45309', fontSize: '0.95rem' }}>
                  {formatNumber(voucher.quantity_main)} {voucher.unit_main}
                </span>
              </div>
              <div>
                <span style={{ color: '#8D6E63' }}>Số lượng quy đổi (ĐVCĐ): </span>
                <span style={{ color: '#4B5563' }}>
                  {voucher.quantity_conv !== null && voucher.quantity_conv !== undefined
                    ? `${formatNumber(voucher.quantity_conv)} ${voucher.unit_conversion || ''}`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Phân loại lỗi & Lý do */}
          <div
            style={{
              border: '1px solid #EADCC9',
              borderRadius: 8,
              padding: '12px 14px'
            }}
          >
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '0.875rem',
                color: '#7B5233',
                fontWeight: 600
              }}
            >
              Mô tả khuyết tật &amp; Tình trạng
            </h4>
            <div style={{ fontSize: '0.8125rem', marginBottom: 6 }}>
              <span style={{ color: '#8D6E63' }}>Phân loại khuyết tật: </span>
              <strong style={{ color: '#2D1A12' }}>{voucher.defect_category || 'Khác'}</strong>
            </div>
            <div
              style={{
                background: '#FAF6F0',
                padding: '8px 10px',
                borderRadius: 6,
                color: '#334155',
                fontSize: '0.8125rem',
                lineHeight: 1.45
              }}
            >
              {voucher.defect_reason || 'Không có mô tả chi tiết.'}
            </div>
            {(voucher.department_name || voucher.returned_by) && (
              <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 6 }}>
                Bộ phận trả: <strong>{voucher.department_name || '—'}</strong> • Người trả: <strong>{voucher.returned_by || '—'}</strong>
              </div>
            )}
            <MobileImagesGallery images={voucher.images} title="Ảnh hiện trạng hàng trả về từ Mobile" />
          </div>

          {/* 4. Trạng thái & Kết quả xử lý thẩm định */}
          <div
            style={{
              border: '1px solid #EADCC9',
              borderRadius: 8,
              padding: '12px 14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#7B5233',
                  fontWeight: 600
                }}
              >
                Quyết định xử lý thẩm định
              </h4>
              {isPending && !isResolving && (
                <button
                  type="button"
                  className="rg-btn rg-btn-primary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => setIsResolving(true)}
                >
                  <ShieldCheck size={13} />
                  <span>Xử lý thẩm định ngay</span>
                </button>
              )}
            </div>

            {isResolving ? (
              <form onSubmit={handleExecuteResolve} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="rg-callout-info">
                  <strong>Hội đồng kiểm định:</strong> Lựa chọn quyết định xử lý chính thức cho lô hàng loại này.
                </div>

                <div className="rg-form-grid">
                  <div className="rg-form-group">
                    <label>Hướng xử lý <span className="required">*</span></label>
                    <select
                      className="rg-form-select"
                      value={resolutionChoice}
                      onChange={(e) => setResolutionChoice(e.target.value)}
                    >
                      <option value="REUSE">{REJECTED_RESOLUTIONS.REUSE.label} (Chuyển về kho khả dụng)</option>
                      <option value="SCRAP">{REJECTED_RESOLUTIONS.SCRAP.label} (Thanh lý phế liệu/tiêu hủy)</option>
                      <option value="RETURN_VENDOR">{REJECTED_RESOLUTIONS.RETURN_VENDOR.label} (Xuất trả nhà cung cấp)</option>
                    </select>
                  </div>

                  <div className="rg-form-group">
                    <label>Ngày phê duyệt <span className="required">*</span></label>
                    <input
                      type="date"
                      className="rg-form-input"
                      value={resolutionDate}
                      onChange={(e) => setResolutionDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="rg-form-group">
                  <label>Ghi chú / Quyết định của hội đồng</label>
                  <textarea
                    className="rg-form-textarea"
                    rows={2}
                    placeholder="Ghi rõ số biên bản cuộc họp, căn cứ phê duyệt hoặc điều kiện tái sử dụng..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </div>

                {resolutionChoice === 'REUSE' && (
                  <div className="rg-callout-info" style={{ fontSize: '0.75rem' }}>
                    * Khi phê duyệt tái sử dụng, hệ thống sẽ ghi nhận chứng từ điều chuyển hợp lệ để nhập lại <strong>+{formatNumber(voucher.quantity_main)} {voucher.unit_main}</strong> vào tồn kho khả dụng.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className="rg-btn rg-btn-secondary"
                    onClick={() => setIsResolving(false)}
                    disabled={saving}
                  >
                    Hủy thao tác
                  </button>
                  <button
                    type="submit"
                    className="rg-btn rg-btn-primary"
                    disabled={saving}
                  >
                    <CheckCircle2 size={14} />
                    <span>{saving ? 'Đang lưu...' : 'Xác nhận xử lý'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: '#8D6E63' }}>Kết quả thẩm định: </span>
                  {voucher.resolution === 'REUSE' ? (
                    <span className="rg-res-badge reuse">Phê duyệt tái sử dụng</span>
                  ) : voucher.resolution === 'SCRAP' ? (
                    <span className="rg-res-badge scrap">Xuất hủy</span>
                  ) : voucher.resolution === 'RETURN_VENDOR' ? (
                    <span className="rg-res-badge return_vendor">Trả nhà cung cấp</span>
                  ) : (
                    <span className="rg-res-badge pending">Chưa có quyết định chính thức (Chờ thẩm định)</span>
                  )}
                </div>

                {voucher.resolution_date && (
                  <div>
                    <span style={{ color: '#8D6E63' }}>Ngày phê duyệt: </span>
                    <strong style={{ color: '#2D1A12' }}>{formatDate(voucher.resolution_date)}</strong>
                  </div>
                )}

                {voucher.resolution_notes && (
                  <div>
                    <span style={{ color: '#8D6E63' }}>Ghi chú xử lý: </span>
                    <span style={{ color: '#334155', fontStyle: 'italic' }}>{voucher.resolution_notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="rg-modal-footer">
          {isPending && (
            <button
              type="button"
              className="rg-btn rg-btn-secondary"
              style={{ color: '#DC2626', borderColor: '#FECACA', marginRight: 'auto' }}
              onClick={handleCancelVoucher}
              disabled={saving}
              title="Hủy bỏ phiếu ghi nhận này"
            >
              <Trash2 size={14} />
              <span>Hủy phiếu</span>
            </button>
          )}

          <button
            type="button"
            className="rg-btn rg-btn-secondary"
            onClick={() => window.print()}
            title="In biên bản giám định hàng loại"
          >
            <Printer size={14} />
            <span>In biên bản</span>
          </button>

          <button
            type="button"
            className="rg-btn rg-btn-primary"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

