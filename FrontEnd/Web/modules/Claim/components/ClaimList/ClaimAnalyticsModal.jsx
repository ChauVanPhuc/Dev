import React from 'react';

const ClaimAnalyticsModal = ({
  isOpen,
  onClose,
  analyticsViewTab,
  setAnalyticsViewTab,
  analyticsData,
  customerPenalties,
  setCustomerPenalties,
  editingMonthData,
  setEditingMonthData,
  editValue,
  setEditValue,
  showModal,
  handleCreditNotePdfChange,
  isParsingPdf,
  totalCountAll,
  totalG7AmountAll,
  totalCustomerAmountAll,
  filteredClaimsToDisplay
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="exception-modal-backdrop"
        style={{ zIndex: 2500 }}
        onClick={onClose}
      >
        <div
          className="exception-modal"
          style={{ width: 'min(95vw, 1024px)', animation: 'modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* MODAL HEADER */}
          <div className="exception-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid #F0E6D8' }}>
            <div className="exception-modal-title-area" style={{ flex: 1, paddingRight: '16px' }}>
              <h3 className="exception-modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                Thống kê khiếu nại theo tháng
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* VIEW SWITCH TAB CONTROLLER */}
              <div style={{ 
                display: 'inline-flex', 
                backgroundColor: '#FAF6F0', 
                padding: '3px', 
                borderRadius: '8px', 
                border: '1px solid #EADCC9' 
              }}>
                <button
                  type="button"
                  onClick={() => setAnalyticsViewTab('chart')}
                  style={{
                    padding: '5px 16px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: analyticsViewTab === 'chart' ? '#7B5233' : 'transparent',
                    color: analyticsViewTab === 'chart' ? '#FFFFFF' : '#7B5233',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                >
                  Biểu đồ
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsViewTab('table')}
                  style={{
                    padding: '5px 16px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: analyticsViewTab === 'table' ? '#7B5233' : 'transparent',
                    color: analyticsViewTab === 'table' ? '#FFFFFF' : '#7B5233',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                >
                  Bảng số liệu
                </button>
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
          </div>

          {/* MODAL BODY */}
          <div className="exception-modal-body" style={{ padding: '20px 24px', overflowY: 'auto' }}>
            {analyticsData.length === 0 ? (
              <div className="exception-empty-state">
                <span>Không có dữ liệu khiếu nại để thống kê</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* CHART VIEW */}
                {analyticsViewTab === 'chart' && (
                  <div style={{ 
                    border: '1px solid #F0E6D8', 
                    borderRadius: '12px', 
                    padding: '24px 20px 16px 20px', 
                    backgroundColor: '#FCFAF8',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
                      <h4 style={{ margin: 0, color: '#7B5233', fontSize: '0.95rem', fontWeight: 'bold' }}>
                        Biểu đồ xu hướng (Tối đa 12 tháng gần nhất)
                      </h4>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: '#8FA5B5', borderRadius: '3px' }}></div>
                          <span style={{ color: '#4B5563', fontWeight: '500' }}>Số lượng khiếu nại (vụ)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: '#8B6D58', borderRadius: '3px' }}></div>
                          <span style={{ color: '#4B5563', fontWeight: '500' }}>Tổng tiền phạt G7 ($)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: '#C25953', borderRadius: '3px' }}></div>
                          <span style={{ color: '#4B5563', fontWeight: '500' }}>Tổng tiền phạt Khách hàng ($)</span>
                        </div>
                      </div>
                    </div>

                    {/* BARS CONTAINER */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-around', 
                      alignItems: 'flex-end', 
                      height: '200px', 
                      paddingBottom: '8px',
                      borderBottom: '2px solid #EADCC9',
                      position: 'relative',
                      gap: '8px'
                    }}>
                      {analyticsData.map((d) => {
                        const maxAmountVal = Math.max(...analyticsData.map(m => Math.max(m.totalAmount, m.customerAmount)), 1);
                        const maxCountVal = Math.max(...analyticsData.map(m => m.count), 1);
                        
                        const countHeight = (d.count / maxCountVal) * 135;
                        const g7Height = (d.totalAmount / maxAmountVal) * 135;
                        const customerHeight = (d.customerAmount / maxAmountVal) * 135;
                        const formatCompact = (val) => val >= 1000 ? '$' + (val / 1000).toFixed(1).replace('.0', '') + 'k' : '$' + val;

                        return (
                          <div key={d.month} style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            flex: 1,
                            position: 'relative'
                          }}>
                            {/* Bars group with datalabels */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '170px' }}>
                              {/* Count Column Group */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#6B7C8A', whiteSpace: 'nowrap' }}>
                                  {d.count}
                                </span>
                                <div 
                                  className="analytics-bar count-bar"
                                  style={{ 
                                    width: '24px', 
                                    height: `${Math.max(countHeight, 4)}px`, 
                                    backgroundColor: '#8FA5B5', 
                                    borderRadius: '2px 2px 0 0',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.opacity = '0.9'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
                                  title={`Số lượng: ${d.count} vụ`}
                                >
                                </div>
                              </div>

                              {/* G7 Amount Column Group */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#6E5241', whiteSpace: 'nowrap' }}>
                                  {formatCompact(d.totalAmount)}
                                </span>
                                <div 
                                  className="analytics-bar g7-bar"
                                  style={{ 
                                    width: '24px', 
                                    height: `${Math.max(g7Height, 4)}px`, 
                                    backgroundColor: '#8B6D58', 
                                    borderRadius: '2px 2px 0 0',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.opacity = '0.9'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
                                  title={`Tổng tiền phạt G7: $${d.totalAmount.toLocaleString()}`}
                                >
                                </div>
                              </div>

                              {/* Customer Amount Column Group */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#9C413D', whiteSpace: 'nowrap' }}>
                                  {formatCompact(d.customerAmount)}
                                </span>
                                <div 
                                  className="analytics-bar customer-bar"
                                  style={{ 
                                    width: '24px', 
                                    height: `${Math.max(customerHeight, 4)}px`, 
                                    backgroundColor: '#C25953', 
                                    borderRadius: '2px 2px 0 0',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.opacity = '0.9'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
                                  title={`Tổng tiền phạt Khách hàng: $${d.customerAmount.toLocaleString()}`}
                                >
                                </div>
                              </div>
                            </div>

                            {/* X-axis label */}
                            <span style={{ 
                              marginTop: '8px', 
                              fontSize: '0.8rem', 
                              fontWeight: 'bold', 
                              color: '#5D4037',
                              whiteSpace: 'nowrap'
                            }}>
                              {d.month}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TABLE VIEW */}
                {analyticsViewTab === 'table' && (
                  <div style={{ overflowX: 'auto', border: '1px solid #F0E6D8', borderRadius: '12px' }}>
                    <table className="report-table exception-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9' }}>
                          <th style={{ padding: '12px 18px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Tháng</th>
                          <th style={{ padding: '12px 18px', textAlign: 'center', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Số lượng khiếu nại (vụ)</th>
                          <th style={{ padding: '12px 18px', textAlign: 'right', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Tổng tiền phạt G7</th>
                          <th style={{ padding: '12px 18px', textAlign: 'right', color: '#7B5233', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Tổng tiền phạt Khách hàng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.map((d, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F3EAE0' }} className="exception-table-row">
                            <td style={{ padding: '14px 18px', textAlign: 'center', fontWeight: '700', color: '#2D1A12', fontSize: '0.95rem' }}>
                              {d.month}
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'center', color: '#7B5233', fontWeight: '600', fontSize: '0.95rem' }}>
                              {d.count}
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right', color: '#2D1A12', fontWeight: '700', fontSize: '0.95rem' }}>
                              ${d.totalAmount.toLocaleString()}
                            </td>
                            <td style={{ 
                              padding: '14px 18px', 
                              textAlign: 'right', 
                              fontWeight: '700', 
                              color: (customerPenalties[d.month] || 0) > d.totalAmount ? '#DC2626' : '#2D1A12', 
                              fontSize: '0.95rem' 
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                <span>
                                  ${(customerPenalties[d.month] !== undefined ? customerPenalties[d.month] : 0).toLocaleString()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMonthData(d);
                                    setEditValue(customerPenalties[d.month] !== undefined ? customerPenalties[d.month] : 0);
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    color: '#7B5233',
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: '4px',
                                    transition: 'background-color 0.2s',
                                    outline: 'none'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF8F0'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  title="Chỉnh sửa tiền phạt Khách hàng"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ backgroundColor: '#FAF6F0', borderTop: '2px solid #EADCC9', fontWeight: '800' }}>
                          <td style={{ padding: '14px 18px', textAlign: 'center', color: '#7B5233', fontSize: '0.95rem', fontWeight: '800' }}>
                            TỔNG CỘNG
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'center', color: '#7B5233', fontSize: '0.95rem', fontWeight: '800' }}>
                            {totalCountAll}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right', color: '#2D1A12', fontSize: '0.95rem', fontWeight: '800' }}>
                            ${totalG7AmountAll.toLocaleString()}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right', color: '#2D1A12', fontSize: '0.95rem', fontWeight: '800' }}>
                            ${totalCustomerAmountAll.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="exception-modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: '500' }}>
              Số liệu tính trên {filteredClaimsToDisplay.length} khiếu nại đang có trong hệ thống
            </span>
          </div>
        </div>
      </div>

      {/* ============ EDIT CUSTOMER PENALTY MODAL ============ */}
      {editingMonthData && (
        <div
          className="filter-modal-backdrop"
          style={{ zIndex: 3000 }}
          onClick={() => setEditingMonthData(null)}
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
                onClick={() => setEditingMonthData(null)}
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
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <label style={{ fontSize: '0.85rem', fontWeight: '800', color: '#7B5233', margin: 0 }}>
                       Tổng tiền phạt Khách hàng ($)
                     </label>
                     
                     {/* Upload PDF button */}
                     <div style={{ position: 'relative' }}>
                       <input
                         type="file"
                         accept=".pdf"
                         id="credit-note-pdf-upload"
                         style={{ display: 'none' }}
                         onChange={handleCreditNotePdfChange}
                       />
                       <label
                         htmlFor="credit-note-pdf-upload"
                         style={{
                           display: 'inline-flex',
                           alignItems: 'center',
                           gap: '6px',
                           padding: '5px 10px',
                           borderRadius: '6px',
                           border: '1px dashed #7B5233',
                           backgroundColor: '#FFFFFF',
                           color: '#7B5233',
                           fontSize: '0.75rem',
                           fontWeight: 'bold',
                           cursor: 'pointer',
                           transition: 'all 0.2s ease',
                         }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.backgroundColor = '#FFF8F0';
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.backgroundColor = '#FFFFFF';
                         }}
                       >
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                           <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                           <polyline points="17 8 12 3 7 8"></polyline>
                           <line x1="12" y1="3" x2="12" y2="15"></line>
                         </svg>
                         {isParsingPdf ? 'Đang đọc PDF...' : 'Nhập từ file PDF'}
                       </label>
                     </div>
                   </div>

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
                       fontSize: '0.9rem',
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

              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="filter-modal-footer" style={{ borderTop: '1px solid #F0E6D8' }}>
              <button
                type="button"
                className="btn-modal-reset"
                onClick={() => setEditingMonthData(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-modal-apply"
                style={{ backgroundColor: '#7B5233' }}
                onClick={() => {
                  setCustomerPenalties(prev => ({
                    ...prev,
                    [editingMonthData.month]: Number(editValue) || 0
                  }));
                  setEditingMonthData(null);
                  showModal(
                    'Thành công',
                    `Đã lưu Tổng tiền phạt Khách hàng cho tháng ${editingMonthData.month} thành công!`,
                    'success'
                  );
                }}
              >
                Lưu lại
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default ClaimAnalyticsModal;
