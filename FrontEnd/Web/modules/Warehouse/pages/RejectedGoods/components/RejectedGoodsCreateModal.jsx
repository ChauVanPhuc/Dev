import React, { useState, useMemo, useEffect } from 'react';
import { X, AlertTriangle, Info, Check } from 'lucide-react';
import warehouseDataService from '../../../services/warehouseData.service';
import {
  REJECTED_SOURCE_TYPES,
  REJECTED_RESOLUTIONS,
  DEFECT_CATEGORIES
} from '../../../types/rejectedGoods.types';
import { formatNumber } from '../../../types/goodsReceipt.types';
import { useWarehouseMeta } from '../../../hooks/useWarehouseMeta';

export const RejectedGoodsCreateModal = ({ isOpen, onClose, onSuccess }) => {
  // Form states (luôn khai báo hooks ở đầu Component)
  const { defectCategoryNames } = useWarehouseMeta();
  const activeDefectCats = defectCategoryNames.length > 0 ? defectCategoryNames : DEFECT_CATEGORIES;

  const [sourceType, setSourceType] = useState('QC_INCOMING');
  const [selectedVoucherNo, setSelectedVoucherNo] = useState('');
  const [selectedLineId, setSelectedLineId] = useState('');
  const [quantityMain, setQuantityMain] = useState('');
  const [defectCategory, setDefectCategory] = useState('');
  const [defectReason, setDefectReason] = useState('');
  const [resolution, setResolution] = useState('PENDING');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [createdDate, setCreatedDate] = useState(new Date().toISOString().split('T')[0]);
  const [createdBy, setCreatedBy] = useState('Kiểm soát viên chất lượng (KCS)');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [candidateVouchers, setCandidateVouchers] = useState([]);

  useEffect(() => {
    if (!defectCategory && activeDefectCats.length > 0) {
      setDefectCategory(activeDefectCats[0]);
    }
  }, [activeDefectCats, defectCategory]);

  // Lấy danh sách chứng từ ứng với nguồn phát sinh từ API
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const list = sourceType === 'QC_INCOMING'
          ? await warehouseDataService.getReceipts()
          : await warehouseDataService.getIssues();
        if (!cancelled) {
          setCandidateVouchers(Array.isArray(list) ? list.slice(0, 100) : []);
        }
      } catch (e) {
        console.error('[RejectedGoodsCreateModal] Lỗi tải danh sách chứng từ:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, sourceType]);

  // Tìm phiếu gốc đã chọn
  const originVoucher = useMemo(() => {
    if (!selectedVoucherNo) return null;
    return candidateVouchers.find((v) => v.voucher_no === selectedVoucherNo) || null;
  }, [candidateVouchers, selectedVoucherNo]);

  // Danh sách dòng hàng của phiếu gốc
  const candidateLines = useMemo(() => {
    if (!originVoucher) return [];
    const lines = originVoucher.items || originVoucher.lines;
    return Array.isArray(lines) ? lines : [];
  }, [originVoucher]);

  // Dòng hàng đã chọn
  const selectedLine = useMemo(() => {
    if (!selectedLineId) return null;
    return candidateLines.find((l) => String(l.line_id || l.id) === String(selectedLineId)) || null;
  }, [candidateLines, selectedLineId]);

  if (!isOpen) return null;

  // Đổi nguồn -> reset chọn phiếu và dòng
  const handleSourceTypeChange = (newSource) => {
    setSourceType(newSource);
    setSelectedVoucherNo('');
    setSelectedLineId('');
    setQuantityMain('');
    setErrorMsg('');
  };

  // Đổi phiếu gốc -> reset dòng
  const handleVoucherChange = (vNo) => {
    setSelectedVoucherNo(vNo);
    setSelectedLineId('');
    setQuantityMain('');
    setErrorMsg('');
  };

  // Đổi dòng hàng
  const handleLineChange = (lId) => {
    setSelectedLineId(lId);
    setErrorMsg('');
    const line = candidateLines.find((l) => (l.line_id || l.id) === lId);
    if (line) {
      // Gợi ý số lượng nhỏ hợp lý (vd 5% hoặc 1)
      const maxQty = Number(line.quantity_main || line.quantity || 0);
      const suggested = Math.min(maxQty, Math.max(1, Math.round(maxQty * 0.05)));
      setQuantityMain(suggested.toString());
    }
  };

  // Tính số lượng quy đổi tự động
  const convRate = selectedLine?.conversion_rate || 1;
  const quantityConv = quantityMain && !isNaN(quantityMain)
    ? Math.round(Number(quantityMain) * convRate * 100) / 100
    : 0;

  // Xử lý submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedVoucherNo) {
      setErrorMsg('Vui lòng chọn chứng từ gốc liên kết.');
      return;
    }

    if (!selectedLine) {
      setErrorMsg('Vui lòng chọn dòng vật tư từ chứng từ gốc.');
      return;
    }

    const qty = Number(quantityMain);
    const maxQty = Number(selectedLine.quantity_main || selectedLine.quantity || 0);

    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Số lượng hàng loại phải lớn hơn 0.');
      return;
    }

    if (qty > maxQty) {
      setErrorMsg(`Số lượng hàng loại (${qty}) không được vượt quá số lượng trên chứng từ gốc (${maxQty}).`);
      return;
    }

    if (!defectReason.trim()) {
      setErrorMsg('Vui lòng nhập mô tả chi tiết lý do lỗi / hư hỏng.');
      return;
    }

    setSubmitting(true);
    try {
      const timestamp = Date.now().toString().slice(-4);
      const prefix = sourceType === 'QC_INCOMING' ? 'BB-QC' : 'BB-TH';
      const voucherNo = `${prefix}-${createdDate.replace(/-/g, '')}-${timestamp}`;

      const payload = {
        voucher_no: voucherNo,
        created_date: createdDate,
        created_by: createdBy,
        source_type: sourceType,
        origin_voucher_no: selectedVoucherNo,
        origin_line_id: selectedLine.line_id || selectedLine.id,
        warehouse_name: originVoucher.warehouse_name || selectedLine.warehouse_name || 'Kho nguyên liệu chính',
        item_code: selectedLine.item_code,
        item_name: selectedLine.item_name,
        unit_main: selectedLine.unit_main,
        unit_conversion: selectedLine.unit_conversion || null,
        conversion_rate: convRate,
        quantity_main: qty,
        quantity_conv: quantityConv,
        defect_category: defectCategory,
        defect_reason: defectReason.trim(),
        resolution: resolution,
        resolution_notes: resolutionNotes.trim(),
        status: resolution === 'PENDING' ? 'PENDING' : 'RESOLVED',
        resolution_date: resolution !== 'PENDING' ? createdDate : null
      };

      const created = await warehouseDataService.createRejectedVoucher(payload);
      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err) {
      setErrorMsg('Lỗi khi lưu phiếu hàng loại: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rg-modal-overlay">
      <div className="rg-modal-card" style={{ maxWidth: 720 }}>
        {/* Header */}
        <div className="rg-modal-header">
          <h3>+ Lập phiếu ghi nhận hàng loại / hàng trả về</h3>
          <button type="button" className="rg-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="rg-modal-body">
          {errorMsg && (
            <div className="rg-callout-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Nguồn phát sinh & Ngày tạo */}
          <div className="rg-form-grid">
            <div className="rg-form-group">
              <label>
                Nguồn phát sinh <span className="required">*</span>
              </label>
              <select
                className="rg-form-select"
                value={sourceType}
                onChange={(e) => handleSourceTypeChange(e.target.value)}
              >
                <option value="QC_INCOMING">1. {REJECTED_SOURCE_TYPES.QC_INCOMING.label} (Không đạt nhập kho)</option>
                <option value="PROD_RETURN">2. {REJECTED_SOURCE_TYPES.PROD_RETURN.label} (Phát hiện từ SX)</option>
              </select>
            </div>

            <div className="rg-form-group">
              <label>
                Ngày phát sinh <span className="required">*</span>
              </label>
              <input
                type="date"
                className="rg-form-input"
                value={createdDate}
                onChange={(e) => setCreatedDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Callout giải thích nghiệp vụ */}
          <div className="rg-callout-info">
            <Info size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {sourceType === 'QC_INCOMING' ? (
              <span>
                <strong>Quy tắc QC đầu vào:</strong> Giữ nguyên SL trên phiếu nhập gốc. SL loại này sẽ trừ khỏi SL nhập khả dụng <em>(Nhập khả dụng = SL chứng từ − SL QC loại)</em>.
              </span>
            ) : (
              <span>
                <strong>Quy tắc Trả về sản xuất:</strong> Phiếu xuất gốc giữ nguyên. Hàng trả về lưu kho cách ly, <strong>không</strong> tự động cộng vào tồn khả dụng cho đến khi được duyệt tái sử dụng.
              </span>
            )}
          </div>

          {/* 2. Chọn chứng từ gốc & Dòng hàng */}
          <div className="rg-form-grid">
            <div className="rg-form-group">
              <label>
                {sourceType === 'QC_INCOMING' ? 'Phiếu nhập kho gốc (PNK)' : 'Phiếu xuất kho gốc (PXK)'}{' '}
                <span className="required">*</span>
              </label>
              <select
                className="rg-form-select"
                value={selectedVoucherNo}
                onChange={(e) => handleVoucherChange(e.target.value)}
                required
              >
                <option value="">-- Chọn chứng từ gốc --</option>
                {candidateVouchers.map((v) => (
                  <option key={v.id || v.voucher_no} value={v.voucher_no}>
                    {v.voucher_no} ({v.receipt_date || v.issue_date}) - {v.warehouse_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rg-form-group">
              <label>
                Dòng vật tư liên kết <span className="required">*</span>
              </label>
              <select
                className="rg-form-select"
                value={selectedLineId}
                onChange={(e) => handleLineChange(e.target.value)}
                disabled={!selectedVoucherNo}
                required
              >
                <option value="">-- Chọn vật tư trong phiếu --</option>
                {candidateLines.map((l) => (
                  <option key={l.line_id || l.id} value={l.line_id || l.id}>
                    [{l.item_code}] {l.item_name} - SL gốc: {formatNumber(l.quantity_main || l.quantity)} {l.unit_main}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Chi tiết vật tư & Nhập số lượng loại */}
          {selectedLine && (
            <div
              style={{
                background: '#FAF6F0',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid #EADCC9'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem', color: '#4B5563' }}>
                <div><strong>Mã VT:</strong> {selectedLine.item_code}</div>
                <div><strong>Kho:</strong> {originVoucher?.warehouse_name || 'Kho chính'}</div>
                <div><strong>Tên VT:</strong> {selectedLine.item_name}</div>
                <div><strong>SL gốc trên chứng từ:</strong> {formatNumber(selectedLine.quantity_main || selectedLine.quantity)} {selectedLine.unit_main}</div>
              </div>
            </div>
          )}

          <div className="rg-form-grid">
            <div className="rg-form-group">
              <label>
                Số lượng loại (ĐVC - {selectedLine?.unit_main || 'Đơn vị chính'}) <span className="required">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                max={selectedLine ? Number(selectedLine.quantity_main || selectedLine.quantity) : 999999}
                className="rg-form-input"
                placeholder="Nhập số lượng không đạt..."
                value={quantityMain}
                onChange={(e) => setQuantityMain(e.target.value)}
                required
              />
            </div>

            <div className="rg-form-group">
              <label>
                Số lượng quy đổi (ĐVCĐ - {selectedLine?.unit_conversion || 'ĐVCĐ'})
              </label>
              <input
                type="text"
                className="rg-form-input"
                value={quantityConv ? `${formatNumber(quantityConv)} ${selectedLine?.unit_conversion || ''}` : '—'}
                readOnly
              />
            </div>
          </div>

          {/* 4. Phân loại lỗi & Lý do lỗi */}
          <div className="rg-form-grid">
            <div className="rg-form-group">
              <label>
                Phân loại khuyết tật / Lỗi <span className="required">*</span>
              </label>
              <select
                className="rg-form-select"
                value={defectCategory}
                onChange={(e) => setDefectCategory(e.target.value)}
              >
                {activeDefectCats.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="rg-form-group">
              <label>Người lập biên bản</label>
              <input
                type="text"
                className="rg-form-input"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
              />
            </div>
          </div>

          <div className="rg-form-group full-width">
            <label>
              Mô tả chi tiết lý do lỗi / Tình trạng thực tế <span className="required">*</span>
            </label>
            <textarea
              className="rg-form-textarea"
              rows={2}
              placeholder="Ghi rõ vị trí lỗi, mức độ cong vênh, trầy xước, nứt nẻ hoặc biên bản giám định hiện trường..."
              value={defectReason}
              onChange={(e) => setDefectReason(e.target.value)}
              required
            />
          </div>

          {/* 5. Hướng xử lý ban đầu */}
          <div className="rg-form-grid">
            <div className="rg-form-group">
              <label>Quyết định xử lý ban đầu</label>
              <select
                className="rg-form-select"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                <option value="PENDING">{REJECTED_RESOLUTIONS.PENDING.label}</option>
                <option value="REUSE">{REJECTED_RESOLUTIONS.REUSE.label}</option>
                <option value="SCRAP">{REJECTED_RESOLUTIONS.SCRAP.label}</option>
                <option value="RETURN_VENDOR">{REJECTED_RESOLUTIONS.RETURN_VENDOR.label}</option>
              </select>
            </div>

            <div className="rg-form-group">
              <label>Ghi chú quyết định xử lý</label>
              <input
                type="text"
                className="rg-form-input"
                placeholder="Ghi chú hướng xử lý..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="rg-modal-footer">
            <button
              type="button"
              className="rg-btn rg-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="rg-btn rg-btn-primary"
              disabled={submitting}
            >
              <Check size={14} />
              <span>{submitting ? 'Đang lưu...' : 'Lưu phiếu hàng loại'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

