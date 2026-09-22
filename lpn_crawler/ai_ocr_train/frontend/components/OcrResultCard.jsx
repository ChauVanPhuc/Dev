import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Clock, Hash, Tag, ChevronDown, ChevronUp, FileText, QrCode } from 'lucide-react';

export const OcrResultCard = ({
  result = null,
  metaInfo = null
}) => {
  const [showRawTokens, setShowRawTokens] = useState(false);

  if (!result) {
    return (
      <div className="ai-ocr-card" style={{ minHeight: '180px', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#8D6E63', fontSize: '0.85rem', margin: 0 }}>
          Chưa có kết quả phân tích. Nhấn <strong>"Chạy Phân Tích AI OCR"</strong> để xem kết quả.
        </p>
      </div>
    );
  }

  const extracted = result.extracted || {};
  const timeMetrics = result.time_metrics || {};
  const rawOcr = result.raw_ocr || {};
  const tokens = rawOcr.tokens || [];

  const getConfidenceBadgeClass = (conf) => {
    if (conf >= 0.9) return 'ai-badge-success';
    if (conf >= 0.7) return 'ai-badge-warning';
    return 'ai-badge-info';
  };

  return (
    <div className="ai-ocr-card">
      <div className="ai-ocr-card-header">
        <div className="ai-ocr-card-title">
          <CheckCircle2 size={18} color="#047857" />
          <span>Kết Quả Nhận Diện AI (LPN & SKU)</span>
        </div>
        {extracted.overall_confidence > 0 && (
          <span className={`ai-badge ${getConfidenceBadgeClass(extracted.overall_confidence)}`}>
            Độ tin cậy: {(extracted.overall_confidence * 100).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Hero Field Cards: LPN & SKU */}
      <div className="ai-result-hero">
        {/* LPN Card */}
        <div className="ai-field-card highlight">
          <div className="ai-field-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Hash size={13} color="#7B5233" />
              MÃ LPN PALLET
            </span>
            {extracted.lpn_source && extracted.lpn_source !== 'None' && (
              <span className={`ai-badge ${extracted.lpn_confidence === 1.0 ? 'ai-badge-info' : 'ai-badge-success'}`}>
                {extracted.lpn_source}
              </span>
            )}
          </div>
          <div className="ai-field-value" style={{ color: extracted.lpn ? '#2D1A12' : '#9CA3AF' }}>
            {extracted.lpn || '— Chưa đọc được —'}
          </div>
          {extracted.lpn && (
            <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700' }}>
              Tin cậy: {(extracted.lpn_confidence * 100).toFixed(1)}%
            </span>
          )}
        </div>

        {/* SKU Card */}
        <div className="ai-field-card highlight">
          <div className="ai-field-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tag size={13} color="#7B5233" />
              MÃ SKU SẢN PHẨM
            </span>
            {extracted.sku_source && extracted.sku_source !== 'None' && (
              <span className={`ai-badge ${extracted.sku_confidence === 1.0 ? 'ai-badge-info' : 'ai-badge-success'}`}>
                {extracted.sku_source}
              </span>
            )}
          </div>
          <div className="ai-field-value" style={{ color: extracted.sku ? '#2D1A12' : '#9CA3AF' }}>
            {extracted.sku || '— Chưa đọc được —'}
          </div>
          {extracted.sku && (
            <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700' }}>
              Tin cậy: {(extracted.sku_confidence * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Batch & Additional metadata if present */}
      {(extracted.batch || metaInfo?.container_number) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {extracted.batch && (
            <div className="ai-field-card">
              <div className="ai-field-label">MÃ BATCH LÔ HÀNG</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#4A2E1B' }}>
                {extracted.batch}
              </div>
            </div>
          )}
          {metaInfo?.container_number && (
            <div className="ai-field-card">
              <div className="ai-field-label">SỐ CONTAINER NGUỒN</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#7B5233' }}>
                {metaInfo.container_number}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Time Metrics Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#8D6E63', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={13} />
          THỜI GIAN XỬ LÝ THEO TỪNG BƯỚC (ms)
        </span>
        <div className="ai-timing-grid">
          <div className="ai-timing-item">
            <span className="ai-timing-label">Cắt ROI & Xoay</span>
            <span className="ai-timing-val">
              {((timeMetrics.detection_ms || 0) + (timeMetrics.orientation_ms || 0)).toFixed(0)} ms
            </span>
          </div>
          <div className="ai-timing-item">
            <span className="ai-timing-label">Tiền Xử Lý</span>
            <span className="ai-timing-val">{timeMetrics.preprocessing_ms || 0} ms</span>
          </div>
          <div className="ai-timing-item">
            <span className="ai-timing-label">Barcode / QR</span>
            <span className="ai-timing-val">{timeMetrics.barcode_ms || 0} ms</span>
          </div>
          <div className="ai-timing-item">
            <span className="ai-timing-label">EasyOCR (GPU)</span>
            <span className="ai-timing-val">{timeMetrics.ocr_ms || 0} ms</span>
          </div>
          <div className="ai-timing-item">
            <span className="ai-timing-label">Bóc Tách Rule</span>
            <span className="ai-timing-val">{timeMetrics.parsing_ms || 0} ms</span>
          </div>
          <div className="ai-timing-item" style={{ backgroundColor: '#FAF6F0', borderRadius: '4px' }}>
            <span className="ai-timing-label" style={{ color: '#7B5233', fontWeight: '700' }}>TỔNG CỘNG</span>
            <span className="ai-timing-val" style={{ color: '#047857' }}>{timeMetrics.total_ms || 0} ms</span>
          </div>
        </div>
      </div>

      {/* Raw OCR Text List Dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          type="button"
          onClick={() => setShowRawTokens(!showRawTokens)}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.76rem',
            fontWeight: '700',
            color: '#7B5233'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileText size={14} />
            Danh Sách Từ OCR Nhận Diện ({tokens.length} từ)
          </span>
          {showRawTokens ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showRawTokens && (
          <div className="ai-tokens-container">
            {tokens.length === 0 ? (
              <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>Không tìm thấy từ ngữ nào trên ảnh.</span>
            ) : (
              tokens.map((tok, idx) => (
                <div key={idx} className="ai-token-chip" title={`Confidence: ${(tok.confidence * 100).toFixed(1)}%`}>
                  <span>{tok.text}</span>
                  <span style={{ fontSize: '0.65rem', color: '#8D6E63', fontWeight: 'bold' }}>
                    {(tok.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
