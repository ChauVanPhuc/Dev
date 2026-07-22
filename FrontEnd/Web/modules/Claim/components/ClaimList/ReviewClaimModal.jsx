import React from 'react';

const ReviewClaimModal = ({
  isOpen,
  onClose,
  underReviewClaims,
  reviewPaginatedClaims,
  reviewStartIndex,
  mapCustomerDefectsToG7Name,
  formatPenaltyValue,
  calculateTotalPenalty,
  reviewActionMenuId,
  setReviewActionMenuId,
  setActiveDetailClaim,
  setModalMode,
  handleMarkClaimProcessed,
  reviewTotalPages,
  reviewCurrentPage,
  setReviewCurrentPage
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="exception-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="exception-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(95vw, 1100px)', height: 'min(90vh, 600px)', display: 'flex', flexDirection: 'column' }}
      >
        {/* MODAL HEADER */}
        <div className="exception-modal-header" style={{ background: 'linear-gradient(135deg, #FFFDFB 0%, #FFFBEB 100%)' }}>
          <div className="exception-modal-title-area">
            <h3 className="exception-modal-title" style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Danh sách khiếu nại đang xem xét
            </h3>
          </div>
          <button
            className="exception-modal-close"
            onClick={onClose}
            title="Đóng"
          >
            &times;
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="exception-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          {underReviewClaims.length === 0 ? (
            <div className="exception-empty-state" style={{ padding: '40px 0' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span style={{ marginTop: '12px', fontSize: '0.95rem', color: '#757575' }}>Không có khiếu nại nào đang xem xét</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #F0E6D8', borderRadius: '12px', flex: 1, minHeight: '300px' }}>
              <table className="report-table exception-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9' }}>
                    <th style={{ padding: '12px 20px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '60px' }}>STT</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mã tham chiếu</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mã lỗi KH</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tên lỗi G7</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Giá trị phạt</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng tiền</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '90px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewPaginatedClaims.map((item, idx) => {
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F3EAE0' }} className="exception-table-row">
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: 'var(--text-gray)' }}>{reviewStartIndex + idx + 1}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '700', color: '#2D1A12' }}>{item.claim_code || 'N/A'}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', color: '#5D4037' }}>{item.order_code || 'N/A'}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', color: '#5D4037' }}>{mapCustomerDefectsToG7Name(item.order_code) || item.company_error_name || ''}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', color: '#5D4037' }}>{item.penalty || 'N/A'}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '700', color: '#7B5233' }}>{formatPenaltyValue(calculateTotalPenalty(item))}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', position: 'relative' }} className="review-action-menu-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewActionMenuId(reviewActionMenuId === item.id ? null : item.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#7B5233',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="5" r="2"/>
                              <circle cx="12" cy="12" r="2"/>
                              <circle cx="12" cy="19" r="2"/>
                            </svg>
                          </button>
                          {reviewActionMenuId === item.id && (
                            <div
                              className="action-menu"
                              style={{
                                position: 'absolute',
                                right: '24px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #EADCC9',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(123, 82, 51, 0.15)',
                                padding: '4px',
                                zIndex: 1000,
                                minWidth: '130px',
                                display: 'flex',
                                flexDirection: 'column'
                              }}
                            >
                              <button
                                type="button"
                                className="action-menu-item"
                                onClick={() => {
                                  setReviewActionMenuId(null);
                                  setActiveDetailClaim(item);
                                  setModalMode('edit');
                                }}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  width: '100%',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  color: '#2D1A12',
                                  fontWeight: '600',
                                  borderRadius: '4px',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#FAF6F0'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                Xử lý khiếu nại
                              </button>
                              <button
                                type="button"
                                className="action-menu-item"
                                onClick={() => {
                                  setReviewActionMenuId(null);
                                  handleMarkClaimProcessed(item.id);
                                }}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  width: '100%',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  color: '#16A34A',
                                  fontWeight: '600',
                                  borderRadius: '4px',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#F0FDF4'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                Đã xử lý xong
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {underReviewClaims.length > 0 && reviewTotalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1.5px solid #F0E6D8'
            }}>
              <button
                type="button"
                onClick={() => setReviewCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={reviewCurrentPage === 1}
                style={{
                  border: '1px solid #EADCC9',
                  backgroundColor: '#FAF6F0',
                  cursor: reviewCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: reviewCurrentPage === 1 ? 0.5 : 1,
                  color: '#7B5233',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                &lt;
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233' }}>
                Trang {reviewCurrentPage} / {reviewTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setReviewCurrentPage(prev => Math.min(prev + 1, reviewTotalPages))}
                disabled={reviewCurrentPage >= reviewTotalPages}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  border: '1px solid #EADCC9',
                  backgroundColor: '#FAF6F0',
                  cursor: reviewCurrentPage >= reviewTotalPages ? 'not-allowed' : 'pointer',
                  opacity: reviewCurrentPage >= reviewTotalPages ? 0.5 : 1,
                  color: '#7B5233',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewClaimModal;
