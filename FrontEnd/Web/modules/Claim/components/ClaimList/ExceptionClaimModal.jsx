import React from 'react';

const ExceptionClaimModal = ({
  isOpen,
  onClose,
  exceptionData,
  exceptionActiveTab,
  setExceptionActiveTab,
  expandedExceptionItems,
  setExpandedExceptionItems,
  exceptionActionMenuId,
  setExceptionActionMenuId,
  handleStartExceptionProcessing,
  normalizePenaltyValue,
  formatPenaltyValue,
  calculateTotalPenalty,
  getFullImagePath,
  setPreviewImage,
  filteredClaimsToDisplay
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
      >
        {/* MODAL HEADER */}
        <div className="exception-modal-header">
          <div className="exception-modal-title-area">
            <h3 className="exception-modal-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Danh sách ngoại lệ
            </h3>
            <p className="exception-modal-subtitle">
              Tổng cộng {exceptionData.totalCount} claim có ngoại lệ cần kiểm tra
            </p>
          </div>
          <button
            className="exception-modal-close"
            onClick={onClose}
            title="Đóng"
          >
            &times;
          </button>
        </div>

        {/* TAB BAR */}
        <div className="exception-tabs-bar">
          <button
            type="button"
            className={`exception-tab-btn ${exceptionActiveTab === 'claim' ? 'active' : ''}`}
            onClick={() => setExceptionActiveTab('claim')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Thông tin Claim
            {exceptionData.claimInfo.length > 0 && (
              <span className="exception-tab-count">{exceptionData.claimInfo.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`exception-tab-btn ${exceptionActiveTab === 'transport' ? 'active' : ''}`}
            onClick={() => setExceptionActiveTab('transport')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
            Vận chuyển tham chiếu
            {exceptionData.transport.length > 0 && (
              <span className="exception-tab-count">{exceptionData.transport.length}</span>
            )}
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="exception-modal-body" style={{ padding: '0 24px 20px 24px' }}>
          {/* TAB: THÔNG TIN CLAIM */}
          {exceptionActiveTab === 'claim' && (
            <div className="exception-tab-content">
              {exceptionData.claimInfo.length === 0 ? (
                <div className="exception-empty-state">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>Không có ngoại lệ nào về thông tin claim</span>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: '16px', border: '1px solid #F0E6D8', borderRadius: '12px' }}>
                  <table className="report-table exception-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9' }}>
                        <th style={{ padding: '12px 20px', textAlign: 'left', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Mã tham chiếu</th>
                        <th style={{ padding: '12px 20px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '180px', whiteSpace: 'nowrap' }}>Thời gian Claim</th>
                        <th style={{ padding: '12px 20px', textAlign: 'left', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '280px', whiteSpace: 'nowrap' }}>Nguyên nhân</th>
                        <th style={{ padding: '12px 20px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '90px', whiteSpace: 'nowrap' }}>Thao tác</th>
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
                                        setExceptionActionMenuId(null);
                                        handleStartExceptionProcessing(item.claim);
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
                                    {/* Chi tiết bảng */}
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
                                          <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontWeight: '700', fontSize: '0.88rem', borderBottom: 'none' }}>{formatPenaltyValue(calculateTotalPenalty(item.claim))}</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    {/* Khu vực xem ảnh minh chứng đối chiếu */}
                                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '4px' }}>
                                      {/* Cột ảnh dòng hiện tại */}
                                      <div style={{ flex: '1', minWidth: '250px' }}>
                                        {item.claim.image_paths && item.claim.image_paths.length > 0 ? (
                                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {item.claim.image_paths.map((imgUrl, imgIdx) => (
                                              <div key={imgIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <img
                                                  src={getFullImagePath(imgUrl)}
                                                  alt="Dòng hiện tại"
                                                  style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #EADCC9', cursor: 'zoom-in' }}
                                                  onClick={() => setPreviewImage(getFullImagePath(imgUrl))}
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

                                      {/* Cột ảnh dòng đối ứng bị trùng 100% */}
                                      {item.exceptions.some(ex => ex.type === 'duplicate_claim' && ex.duplicates && ex.duplicates.length > 0) && (
                                        <div style={{ flex: '1', minWidth: '250px', borderLeft: '1.5px dashed #FECACA', paddingLeft: '20px' }}>
                                          {item.exceptions.filter(ex => ex.type === 'duplicate_claim').map((ex, exIdx) => (
                                            <div key={exIdx}>
                                              {ex.duplicates.map((dupClaim, dupIdx) => (
                                                <div key={dupIdx} style={{ marginBottom: '10px' }}>
                                                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#DC2626', display: 'block', marginBottom: '6px' }}>
                                                    ⚠️ Ảnh minh chứng (Dòng đối ứng bị trùng STT {dupClaim.stt}):
                                                  </span>
                                                  {dupClaim.image_paths && dupClaim.image_paths.length > 0 ? (
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                      {dupClaim.image_paths.map((imgUrl, imgIdx) => (
                                                        <div key={imgIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                          <img
                                                            src={getFullImagePath(imgUrl)}
                                                            alt="Dòng đối ứng"
                                                            style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #FECACA', cursor: 'zoom-in' }}
                                                            onClick={() => setPreviewImage(getFullImagePath(imgUrl))}
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

          {/* TAB: VẬN CHUYỂN THAM CHIẾU */}
          {exceptionActiveTab === 'transport' && (
            <div className="exception-tab-content">
              {exceptionData.transport.length === 0 ? (
                <div className="exception-empty-state">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>Không có ngoại lệ nào về vận chuyển</span>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: '16px', border: '1px solid #F0E6D8', borderRadius: '12px' }}>
                  <table className="report-table exception-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9' }}>
                        <th style={{ padding: '12px 20px', textAlign: 'left', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Mã tham chiếu</th>
                        <th style={{ padding: '12px 20px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '180px', whiteSpace: 'nowrap' }}>Thời gian Claim</th>
                        <th style={{ padding: '12px 20px', textAlign: 'left', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '280px', whiteSpace: 'nowrap' }}>Nguyên nhân</th>
                        <th style={{ padding: '12px 20px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '90px', whiteSpace: 'nowrap' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exceptionData.transport.map((item, idx) => {
                        const expandKey = `transport_${idx}`;
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
                                        setExceptionActionMenuId(null);
                                        handleStartExceptionProcessing(item.claim);
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
                                  <table className="exception-sub-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #FECACA', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                                    <thead>
                                      <tr style={{ backgroundColor: '#FEF2F2', borderBottom: '1.5px solid #FECACA' }}>
                                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Mã tham chiếu</th>
                                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B', borderRight: '1px solid #FECACA' }}>LPN</th>
                                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Container</th>
                                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B' }}>Thời gian</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#2D1A12', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.claim_code || 'N/A'}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontFamily: 'monospace', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.lpn || 'N/A'}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontFamily: 'monospace', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.cont || item.claim.container_no || 'N/A'}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontSize: '0.85rem', borderBottom: 'none' }}>{item.claim.date || item.claim.period || 'N/A'}</td>
                                      </tr>
                                    </tbody>
                                  </table>
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
        </div>

        {/* MODAL FOOTER */}
        <div className="exception-modal-footer">
          <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
            Dữ liệu dựa trên {filteredClaimsToDisplay.length} claim đang hiển thị
          </span>
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{ height: '38px', padding: '0 24px', borderRadius: '8px' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExceptionClaimModal;
