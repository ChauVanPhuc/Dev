import React from 'react';

export const ClaimCustomerPenaltyModal = ({
  editingMonthData,
  editValue,
  setEditValue,
  customerPenaltyFiles = {},
  isParsingPdf = false,
  onClose,
  onSave,
  onCreditNotePdfChange,
  showModal
}) => {
  if (!editingMonthData) return null;

  return (
    <div
      className="filter-modal-backdrop"
      style={{ zIndex: 3000 }}
      onClick={onClose}
    >
      <div
        className="filter-modal"
        style={{ width: 'min(90vw, 440px)', maxHeight: '85vh', borderRadius: '12px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="filter-modal-header" style={{ borderBottom: '1px solid #F0E6D8' }}>
          <div className="filter-modal-title-area">
            <h3 className="filter-modal-title" style={{ color: '#7B5233', fontWeight: '800' }}>
              Cập nhật phạt Khách hàng
            </h3>
          </div>
          <button
            className="filter-modal-close"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '20px 24px', backgroundColor: '#FCFAF8' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* ROW DETAILS (READ ONLY) */}
            <div style={{ 
              backgroundColor: '#FFFFFF', 
              border: '1px solid #F0E6D8', 
              borderRadius: '10px', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.88rem',
              boxShadow: '0 1px 3px rgba(123, 82, 51, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8D6E63', fontWeight: '600' }}>Tháng thống kê:</span>
                <span style={{ color: '#2D1A12', fontWeight: '800' }}>{editingMonthData.month}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F9F7F5', paddingTop: '8px' }}>
                <span style={{ color: '#8D6E63', fontWeight: '600' }}>Số lượng khiếu nại:</span>
                <span style={{ color: '#2D1A12', fontWeight: '800' }}>{editingMonthData.count} vụ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F9F7F5', paddingTop: '8px' }}>
                <span style={{ color: '#8D6E63', fontWeight: '600' }}>Tổng tiền phạt G7:</span>
                <span style={{ color: '#2D1A12', fontWeight: '800' }}>${editingMonthData.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* EDIT INPUT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '800', color: '#7B5233', margin: 0 }}>
                Tổng tiền phạt Khách hàng ($)
              </label>

              <input
                type="number"
                min="0"
                value={editValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setEditValue('');
                    return;
                  }
                  const numericVal = Number(val);
                  if (numericVal >= 0) {
                    setEditValue(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                placeholder="Nhập số tiền phạt của Khách hàng..."
                style={{
                  height: '40px',
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  padding: '0 12px',
                  fontSize: '0.95rem',
                  color: '#2D1A12',
                  fontWeight: '700',
                  outline: 'none',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.select()}
                autoFocus
              />
            </div>

            {/* PDF MANAGEMENT SECTION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '800', color: '#7B5233', margin: 0 }}>
                Chứng từ PDF ({editingMonthData.month})
              </label>

              {customerPenaltyFiles[editingMonthData.month] ? (
                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <span 
                      style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2D1A12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} 
                      title={customerPenaltyFiles[editingMonthData.month].fileName}
                    >
                      {customerPenaltyFiles[editingMonthData.month].fileName}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #F9F7F5', paddingTop: '8px' }}>
                    {/* Xem PDF button */}
                    <button
                      type="button"
                      onClick={() => {
                        const fileUrl = customerPenaltyFiles[editingMonthData.month]?.fileUrl;
                        if (!fileUrl) {
                          if (showModal) showModal('Thông báo', 'Không tìm thấy liên kết file PDF.', 'warning');
                          return;
                        }
                        const fullUrl = fileUrl.startsWith('http') ? fileUrl : `http://localhost:8000${fileUrl}`;
                        window.open(fullUrl, '_blank');
                      }}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: '1px solid #7B5233',
                        backgroundColor: '#FFFFFF',
                        color: '#7B5233',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFF8F0'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span>Xem PDF</span>
                    </button>

                    {/* Đổi PDF button */}
                    <label
                      htmlFor="modal-change-pdf-upload"
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#FAF6F0',
                        border: '1px solid #EADCC9',
                        color: '#7B5233',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        cursor: isParsingPdf ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: isParsingPdf ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => { if (!isParsingPdf) e.currentTarget.style.backgroundColor = '#F0E6D8'; }}
                      onMouseLeave={(e) => { if (!isParsingPdf) e.currentTarget.style.backgroundColor = '#FAF6F0'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                      </svg>
                      <span>{isParsingPdf ? 'Đang đọc...' : 'Đổi PDF'}</span>
                    </label>
                    <input
                      id="modal-change-pdf-upload"
                      type="file"
                      accept=".pdf"
                      style={{ display: 'none' }}
                      onChange={onCreditNotePdfChange}
                      disabled={isParsingPdf}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="modal-pdf-upload-input"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      backgroundColor: '#FAF6F0',
                      border: '1.5px dashed #EADCC9',
                      borderRadius: '8px',
                      color: '#7B5233',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: isParsingPdf ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: isParsingPdf ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => { if (!isParsingPdf) e.currentTarget.style.borderColor = '#7B5233'; }}
                    onMouseLeave={(e) => { if (!isParsingPdf) e.currentTarget.style.borderColor = '#EADCC9'; }}
                  >
                    {isParsingPdf ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                        <line x1="12" y1="2" x2="12" y2="6"></line>
                        <line x1="12" y1="18" x2="12" y2="22"></line>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                        <line x1="2" y1="12" x2="6" y2="12"></line>
                        <line x1="18" y1="12" x2="22" y2="12"></line>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="12" y2="12"></line>
                        <line x1="15" y1="15" x2="12" y2="12"></line>
                      </svg>
                    )}
                    <span>{isParsingPdf ? 'Đang trích xuất dữ liệu...' : 'Nhập từ file PDF'}</span>
                  </label>
                  <input
                    id="modal-pdf-upload-input"
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={onCreditNotePdfChange}
                    disabled={isParsingPdf}
                  />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* MODAL ACTIONS */}
        <div style={{ 
          padding: '14px 24px', 
          backgroundColor: '#FAF6F0', 
          borderTop: '1px solid #EADCC9',
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '10px' 
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #C4B5A5',
              backgroundColor: '#FFFFFF',
              color: '#5D4037',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5EFEB'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSave}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(123, 82, 51, 0.2)',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5D4037'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
          >
            Lưu lại
          </button>
        </div>
      </div>
    </div>
  );
};
