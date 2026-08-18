import React from 'react'
import { X, CheckCircle2, XCircle, Clock, Download, ArrowRight, History } from 'lucide-react'

const RecentResultsModal = ({ isOpen, onClose, tickets = [], onApply }) => {
  if (!isOpen) return null

  // Ensure maximum 3 recent items
  const displayTickets = (tickets || []).slice(0, 3)

  return (
    <div className="pv2-sop-modal-backdrop" onClick={onClose}>
      <div className="pv2-sop-modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pv2-sop-modal-header" style={{ background: '#4a240e', color: '#ffffff' }}>
          <div className="pv2-sop-modal-title-group">
            <History size={18} style={{ color: '#fed7aa' }} />
            <h3 className="pv2-sop-modal-title" style={{ color: '#ffffff', fontSize: '14px' }}>
              Xuất kết quả gần nhất (Tối đa 3 lần)
            </h3>
          </div>
          <button
            type="button"
            className="pv2-sop-modal-close-btn"
            style={{ background: '#63391f', color: '#ffffff' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="pv2-sop-modal-body" style={{ padding: '12px 14px', gap: '12px' }}>
          {displayTickets.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b' }}>
              <Clock size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Chưa có lịch sử kiểm tra cho mã này</p>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Vui lòng chọn Mã Pallet hoặc PO đã có dữ liệu để xem kết quả gần nhất.</span>
            </div>
          ) : (
            displayTickets.map((t, idx) => {
              const isPass = t.result === 'pass' || t.conclusion === 'pass'
              const dateStr = t.created_at
                ? new Date(t.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                : 'Mới đây'

              return (
                <div
                  key={t.id || t.code || idx}
                  style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        Lần {idx + 1}
                      </span>
                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                        Phiếu: {t.code || t.id}
                      </strong>
                    </div>

                    {/* Result Badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: isPass ? '#f0fdf4' : '#fef2f2',
                        color: isPass ? '#166534' : '#991b1b',
                        border: `1px solid ${isPass ? '#bbf7d0' : '#fecaca'}`
                      }}
                    >
                      {isPass ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {isPass ? 'Đạt' : 'Không đạt'}
                    </span>
                  </div>

                  {/* Card Content Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '12px', color: '#475569' }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Thời gian:</span> {dateStr}
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Người lập:</span> {t.creator || t.creatorName || '—'}
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>SL Mẫu:</span> <strong>{t.sampleQty ?? t.sample_qty ?? '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>SL Lỗi:</span> <strong style={{ color: Number(t.errorQty || t.error_qty) > 0 ? '#dc2626' : '#166534' }}>{t.errorQty ?? t.error_qty ?? 0}</strong>
                    </div>
                  </div>

                  {/* Error Breakdown if any */}
                  {Array.isArray(t.errors) && t.errors.length > 0 && (
                    <div style={{ background: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '6px', padding: '6px 8px', fontSize: '11.5px', color: '#9f1239' }}>
                      <strong>Danh sách lỗi:</strong> {t.errors.map((e) => `${e.name || e.label || 'Lỗi'}: ${e.qty || 1}`).join(', ')}
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    type="button"
                    style={{
                      marginTop: '2px',
                      padding: '6px 12px',
                      background: '#faf6f1',
                      border: '1px solid #d4c8bd',
                      borderRadius: '6px',
                      color: '#4a240e',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => {
                      if (onApply) onApply(t)
                      onClose()
                    }}
                  >
                    <Download size={13} /> Tải dữ liệu phiếu này vào form hiện tại
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="pv2-sop-modal-footer">
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>* Hiển thị tối đa 3 kết quả kiểm tra mới nhất</span>
          <button type="button" className="pv2-sop-modal-btn-close" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecentResultsModal
