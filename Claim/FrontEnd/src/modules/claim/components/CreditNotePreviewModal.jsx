import React, { useState } from 'react';

export const CreditNotePreviewModal = ({
  isOpen,
  previewData,
  onClose,
  onConfirm,
  isSubmitting = false
}) => {
  if (!isOpen || !previewData) return null;

  const {
    credit_note_no = '',
    factory = 'VINA G7',
    date_issued = '',
    month = '',
    period = '',
    total_amount = 0,
    currency = 'USD',
    claims = [],
    filename = ''
  } = previewData;

  const displayMonth = month || period;

  return (
    <div
      className="filter-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(45, 26, 18, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3500,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="filter-modal"
        style={{
          width: 'min(92vw, 860px)',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          boxShadow: '0 20px 40px rgba(78, 54, 41, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #EADCC9'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#FAF6F0',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#7B5233',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#4E3629' }}>
                Xem trước dữ liệu Credit Note PDF
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#8D6E63' }}>
                Tệp: <strong style={{ color: '#4E3629' }}>{filename || 'Credit Note'}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              lineHeight: 1,
              color: '#8D6E63',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px'
            }}
          >
            &times;
          </button>
        </div>

        {/* METADATA SUMMARY CARDS */}
        <div style={{ padding: '16px 24px 8px 24px', backgroundColor: '#FFFFFF' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: '#FCFAF8',
              borderRadius: '10px',
              border: '1px solid #F0E6D8'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 600, textTransform: 'uppercase' }}>
                Số Credit Note
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#7B5233', marginTop: '2px' }}>
                {credit_note_no || '2026-15'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 600, textTransform: 'uppercase' }}>
                Tháng Claim
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2E7D32', marginTop: '2px' }}>
                {displayMonth || '09/2026'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 600, textTransform: 'uppercase' }}>
                Tổng tiền phạt ({currency})
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#C62828', marginTop: '2px' }}>
                ${total_amount ? total_amount.toLocaleString() : '3,764'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 600, textTransform: 'uppercase' }}>
                Số dòng khiếu nại
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#4E3629', marginTop: '2px' }}>
                {claims.length} dòng
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 600, textTransform: 'uppercase' }}>
                Ngày phát hành
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#5D4037', marginTop: '2px' }}>
                {date_issued || '10-05-2026'}
              </div>
            </div>
          </div>
        </div>

        {/* CLAIMS TABLE (INDEPENDENT SCROLL AREA) */}
        <div style={{ padding: '8px 24px 16px 24px', flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#5D4037' }}>
              Danh sách chi tiết khiếu nại ({claims.length} dòng đã trích xuất):
            </span>
            <span style={{ fontSize: '0.78rem', color: '#8D6E63', fontStyle: 'italic' }}>
              * LPN bảo toàn số 0 ở đầu · Tiền phạt tính theo tổng Credit Note
            </span>
          </div>

          <div
            style={{
              flex: '1 1 auto',
              maxHeight: '340px',
              overflowY: 'auto',
              border: '1px solid #EADCC9',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 10, borderBottom: '1px solid #EADCC9' }}>
                <tr>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#7B5233', fontWeight: 800, width: '45px' }}>STT</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800 }}>SKU / CLAIM</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800 }}>CONTAINER #</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800 }}>LPN</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #F5EFEB',
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FCFAF8'
                    }}
                  >
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#8D6E63', fontWeight: 700 }}>
                      {row.stt || idx + 1}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#2D1A12' }}>
                      {row.sku || row.product_name}
                    </td>
                    <td style={{ padding: '8px 12px', color: row.container_no ? '#4E3629' : '#BDBDBD', fontFamily: 'monospace' }}>
                      {row.container_no || '—'}
                    </td>
                    <td style={{ padding: '8px 12px', color: row.lpn ? '#2E7D32' : '#BDBDBD', fontWeight: 600, fontFamily: 'monospace' }}>
                      {row.lpn || '—'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#C62828', fontWeight: 600 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: row.action?.toLowerCase().includes('full') ? '#FFEBEE' : '#FFF3E0',
                          border: `1px solid ${row.action?.toLowerCase().includes('full') ? '#FFCDD2' : '#FFE082'}`
                        }}
                      >
                        {row.action || 'Pay'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#FAF6F0',
            borderTop: '1px solid #EADCC9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#7B5233' }}>
            Tổng tiền phạt: <strong style={{ color: '#C62828', fontSize: '0.95rem' }}>${total_amount?.toLocaleString()}</strong> sẽ được cập nhật cho kỳ <strong>{displayMonth}</strong>.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: '1px solid #C4B5A5',
                backgroundColor: '#FFFFFF',
                color: '#5D4037',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => onConfirm(previewData)}
              disabled={isSubmitting}
              style={{
                padding: '8px 22px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#7B5233',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(123, 82, 51, 0.25)',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  </svg>
                  <span>Đang lưu dữ liệu...</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Xác nhận nhập dữ liệu ({claims.length} dòng)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
