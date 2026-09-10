import React from 'react';
import { normalizePenaltyValue, formatPenaltyValue, calculateTotalPenalty, getFullImagePath } from '../utils/claimHelpers';

export const ClaimExceptionModal = ({
  isOpen,
  onClose,
  exceptionData = { claimInfo: [], transport: [], totalCount: 0 },
  exceptionActiveTab = 'claimInfo',
  setExceptionActiveTab,
  expandedExceptionItems = {},
  setExpandedExceptionItems,
  exceptionActionMenuId,
  setExceptionActionMenuId,
  onStartExceptionProcessing,
  onPreviewImage,
  cabinetPrices = []
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="exception-modal-backdrop"
      style={{ zIndex: 2500 }}
      onClick={onClose}
    >
      <div
        className="exception-modal"
        style={{ width: 'min(95vw, 1024px)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="exception-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid #F0E6D8' }}>
          <div className="exception-modal-title-area">
            <h3 className="exception-modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>
              Phát hiện Khiếu nại Bất thường ({exceptionData.totalCount})
            </h3>
          </div>
          <button
            className="exception-modal-close"
            onClick={onClose}
            aria-label="Đóng"
            style={{ position: 'relative', top: 'auto', right: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}
          >
            &times;
          </button>
        </div>

        {/* EXCEPTION TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EADCC9', backgroundColor: '#FAF6F0', padding: '0 24px' }}>
          <button
            type="button"
            onClick={() => setExceptionActiveTab('claimInfo')}
            style={{
              padding: '12px 18px',
              border: 'none',
              borderBottom: exceptionActiveTab === 'claimInfo' ? '2.5px solid #7B5233' : '2.5px solid transparent',
              backgroundColor: 'transparent',
              fontWeight: '700',
              fontSize: '0.85rem',
              color: exceptionActiveTab === 'claimInfo' ? '#7B5233' : '#8D6E63',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Thông tin Claim</span>
            <span style={{
              backgroundColor: exceptionActiveTab === 'claimInfo' ? '#7B5233' : '#EADCC9',
              color: exceptionActiveTab === 'claimInfo' ? '#FFFFFF' : '#7B5233',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}>
              {exceptionData.claimInfo.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setExceptionActiveTab('transport')}
            style={{
              padding: '12px 18px',
              border: 'none',
              borderBottom: exceptionActiveTab === 'transport' ? '2.5px solid #7B5233' : '2.5px solid transparent',
              backgroundColor: 'transparent',
              fontWeight: '700',
              fontSize: '0.85rem',
              color: exceptionActiveTab === 'transport' ? '#7B5233' : '#8D6E63',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Vận chuyển & Tham chiếu</span>
            <span style={{
              backgroundColor: exceptionActiveTab === 'transport' ? '#7B5233' : '#EADCC9',
              color: exceptionActiveTab === 'transport' ? '#FFFFFF' : '#7B5233',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}>
              {exceptionData.transport.length}
            </span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="exception-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          {/* TAB: THÔNG TIN CLAIM */}
          {exceptionActiveTab === 'claimInfo' && (
            <div className="exception-tab-content">
              {exceptionData.claimInfo.length === 0 ? (
                <div className="exception-empty-state">
                  <span>Không phát hiện bất thường về thông tin khiếu nại</span>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #F0E6D8', borderRadius: '12px' }}>
                  <table className="report-table exception-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mã tham chiếu / Sản phẩm</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thời gian Claim</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dấu hiệu bất thường</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '80px' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exceptionData.claimInfo.map((item, idx) => {
                        const expandKey = `claim_${idx}`;
                        const isExpanded = !!expandedExceptionItems[expandKey];
                        const displayName = item.claim.product_name || item.claim.sku || 'N/A';
                        const claimDate = item.claim.date || item.claim.period || 'N/A';
                        const reasonText = item.exceptions.map(ex => ex.label).join(', ');

                        return (
                          <React.Fragment key={expandKey}>
                            <tr
                              onClick={() => setExpandedExceptionItems(prev => ({ ...prev, [expandKey]: !prev[expandKey] }))}
                              style={{ cursor: 'pointer', borderBottom: '1px solid #F3EAE0', backgroundColor: isExpanded ? '#FFF5F5' : 'transparent' }}
                              className="exception-table-row"
                            >
                              <td style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', color: '#2D1A12', fontSize: '0.95rem' }}>
                                {idx + 1}. {item.claim.claim_code || 'N/A'}
                                <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: 'normal', marginTop: '2px' }}>{displayName}</div>
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'center', color: '#5D4037', fontWeight: '600', fontSize: '0.95rem' }}>
                                {claimDate}
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'left' }}>
                                <span className="exception-severity-badge" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                                  {reasonText}
                                </span>
                              </td>
                              <td 
                                style={{ padding: '14px 16px', textAlign: 'center', position: 'relative' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  className="action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExceptionActionMenuId(exceptionActionMenuId === item.claim.id ? null : item.claim.id);
                                  }}
                                  style={{
                                    border: 'none',
                                    background: 'none',
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
                                {exceptionActionMenuId === item.claim.id && (
                                  <div 
                                    className="action-menu" 
                                    style={{ 
                                      position: 'absolute',
                                      right: '50%',
                                      transform: 'translateX(50%)',
                                      top: '80%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      zIndex: 100,
                                      minWidth: '130px',
                                      backgroundColor: '#FFFFFF',
                                      border: '1px solid #EADCC9',
                                      borderRadius: '6px',
                                      boxShadow: '0 4px 12px rgba(123, 82, 51, 0.15)',
                                      padding: '4px'
                                    }}
                                  >
                                    <button 
                                      className="action-menu-item" 
                                      onClick={() => {
                                        if (onStartExceptionProcessing) onStartExceptionProcessing(item.claim);
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
                                  </div>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr style={{ backgroundColor: '#FCFAF8' }}>
                                <td colSpan="4" style={{ padding: '16px 24px', borderBottom: '1px solid #F0E6D8' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <table className="exception-sub-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #FECACA', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                                      <thead>
                                        <tr style={{ backgroundColor: '#FEF2F2', borderBottom: '1.5px solid #FECACA' }}>
                                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Mã tham chiếu</th>
                                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Mã lỗi KH</th>
                                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Mã lỗi G7</th>
                                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Giá trị phạt</th>
                                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', color: '#991B1B' }}>Tổng tiền phạt</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#2D1A12', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.claim_code || 'N/A'}</td>
                                          <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.order_code || item.claim.defect_code || 'N/A'}</td>
                                          <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.company_error_code || 'N/A'}</td>
                                          <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{normalizePenaltyValue(item.claim.penalty || 'Không có')}</td>
                                          <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontWeight: '700', fontSize: '0.88rem', borderBottom: 'none' }}>{formatPenaltyValue(calculateTotalPenalty(item.claim, undefined, cabinetPrices))}</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    {/* Ảnh minh chứng */}
                                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '4px' }}>
                                      <div style={{ flex: '1', minWidth: '250px' }}>
                                        {item.claim.image_paths && item.claim.image_paths.length > 0 ? (
                                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {item.claim.image_paths.map((imgUrl, imgIdx) => (
                                              <div key={imgIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <img
                                                  src={getFullImagePath(imgUrl)}
                                                  alt="Dòng hiện tại"
                                                  style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #EADCC9', cursor: 'zoom-in' }}
                                                  onClick={() => onPreviewImage(getFullImagePath(imgUrl))}
                                                />
                                                <span style={{ fontSize: '0.7rem', color: '#8D6E63', marginTop: '2px' }}>
                                                  {item.claim.image_captions?.[imgIdx] || `Ảnh ${imgIdx + 1}`}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span style={{ fontSize: '0.8rem', color: '#9E9E9E', fontStyle: 'italic' }}>Không có hình ảnh</span>
                                        )}
                                      </div>

                                      {/* Trùng lặp 100% */}
                                      {item.exceptions.some(ex => ex.type === 'duplicate_claim' && ex.duplicates && ex.duplicates.length > 0) && (
                                        <div style={{ flex: '1', minWidth: '250px', borderLeft: '1.5px dashed #FECACA', paddingLeft: '20px' }}>
                                          {item.exceptions.filter(ex => ex.type === 'duplicate_claim').map((ex, exIdx) => (
                                            <div key={exIdx}>
                                              {ex.duplicates.map((dupClaim, dupIdx) => (
                                                <div key={dupIdx} style={{ marginBottom: '10px' }}>
                                                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#DC2626', display: 'block', marginBottom: '6px' }}>
                                                    ⚠️ Ảnh minh chứng (Dòng đối ứng bị trùng):
                                                  </span>
                                                  {dupClaim.image_paths && dupClaim.image_paths.length > 0 ? (
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                      {dupClaim.image_paths.map((imgUrl, imgIdx) => (
                                                        <div key={imgIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                          <img
                                                            src={getFullImagePath(imgUrl)}
                                                            alt="Dòng đối ứng"
                                                            style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #FECACA', cursor: 'zoom-in' }}
                                                            onClick={() => onPreviewImage(getFullImagePath(imgUrl))}
                                                          />
                                                          <span style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '2px' }}>
                                                            {dupClaim.image_captions?.[imgIdx] || `Ảnh ${imgIdx + 1}`}
                                                          </span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    <span style={{ fontSize: '0.8rem', color: '#9E9E9E', fontStyle: 'italic' }}>Không có hình ảnh</span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: VẬN CHUYỂN & THAM CHIẾU */}
          {exceptionActiveTab === 'transport' && (
            <div className="exception-tab-content">
              {exceptionData.transport.length === 0 ? (
                <div className="exception-empty-state">
                  <span>Không phát hiện bất thường về vận chuyển</span>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #F0E6D8', borderRadius: '12px' }}>
                  <table className="report-table exception-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mã tham chiếu / Sản phẩm</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thời gian Claim</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dấu hiệu bất thường</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '80px' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exceptionData.transport.map((item, idx) => {
                        const expandKey = `trans_${idx}`;
                        const isExpanded = !!expandedExceptionItems[expandKey];
                        const displayName = item.claim.product_name || item.claim.sku || 'N/A';
                        const claimDate = item.claim.date || item.claim.period || 'N/A';
                        const reasonText = item.exceptions.map(ex => ex.label).join(', ');

                        return (
                          <React.Fragment key={expandKey}>
                            <tr
                              onClick={() => setExpandedExceptionItems(prev => ({ ...prev, [expandKey]: !prev[expandKey] }))}
                              style={{ cursor: 'pointer', borderBottom: '1px solid #F3EAE0', backgroundColor: isExpanded ? '#FFF5F5' : 'transparent' }}
                              className="exception-table-row"
                            >
                              <td style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', color: '#2D1A12', fontSize: '0.95rem' }}>
                                {idx + 1}. {item.claim.claim_code || 'N/A'}
                                <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: 'normal', marginTop: '2px' }}>{displayName}</div>
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'center', color: '#5D4037', fontWeight: '600', fontSize: '0.95rem' }}>
                                {claimDate}
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'left' }}>
                                <span className="exception-severity-badge" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                                  {reasonText}
                                </span>
                              </td>
                              <td 
                                style={{ padding: '14px 16px', textAlign: 'center', position: 'relative' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  className="action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExceptionActionMenuId(exceptionActionMenuId === item.claim.id ? null : item.claim.id);
                                  }}
                                  style={{
                                    border: 'none',
                                    background: 'none',
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
                                {exceptionActionMenuId === item.claim.id && (
                                  <div 
                                    className="action-menu" 
                                    style={{ 
                                      position: 'absolute',
                                      right: '50%',
                                      transform: 'translateX(50%)',
                                      top: '80%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      zIndex: 100,
                                      minWidth: '130px',
                                      backgroundColor: '#FFFFFF',
                                      border: '1px solid #EADCC9',
                                      borderRadius: '6px',
                                      boxShadow: '0 4px 12px rgba(123, 82, 51, 0.15)',
                                      padding: '4px'
                                    }}
                                  >
                                    <button 
                                      className="action-menu-item" 
                                      onClick={() => {
                                        if (onStartExceptionProcessing) onStartExceptionProcessing(item.claim);
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
                                  </div>
                                )}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
