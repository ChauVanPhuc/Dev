import React from 'react';
import { FormModal } from '../Modal';

const ClaimProcessModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  modalMode,
  setModalMode,
  exceptionNavMode,
  exceptionProcessedCount,
  exceptionNavClaims,
  claimNavFooterActions,
  claimNavLeftSideAction,
  claimNavRightSideAction,
  processDongHang,
  setProcessDongHang,
  processLoaiClaim,
  setProcessLoaiClaim,
  processMaThamChieu,
  setProcessMaThamChieu,
  processTenSanPham,
  setProcessTenSanPham,
  processMucPhat,
  setProcessMucPhat,
  processGiaTriPhat,
  setProcessGiaTriPhat,
  formatPenaltyValue,
  getProcessTotalPenaltyPreview,
  processMaLoi,
  setProcessMaLoi,
  processMaLoiCty,
  setProcessMaLoiCty,
  showProcessG7CodeSuggestions,
  setShowProcessG7CodeSuggestions,
  uniqueCompanyErrorCodeOptions,
  handleSelectG7Code,
  processTenLoiG7,
  setProcessTenLoiG7,
  showProcessG7NameSuggestions,
  setShowProcessG7NameSuggestions,
  uniqueCompanyErrorNameOptions,
  handleSelectG7Name,
  processLpn,
  setProcessLpn,
  processMaCont,
  setProcessMaCont,
  processNgayXuat,
  setProcessNgayXuat,
  processTrangThaiXuLy,
  setProcessTrangThaiXuLy,
  processLinkCapa,
  setProcessLinkCapa,
  processGhiChu,
  setProcessGhiChu,
  processImages,
  handleProcessAddImageClick,
  handleEditProcessImageClick,
  handleDeleteProcessImageClick,
  getFullImagePath,
  setPreviewImage,
  processImageCaptions,
  disabledFieldStyle,
  claimService,
  setClaims,
  activeDetailClaim,
  setActiveDetailClaim
}) => {
  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      title={title}
      width="min(95vw, 1150px)"
      cancelLabel="Hủy"
      confirmLabel={modalMode === 'view' ? null : "Lưu lại"}
      leftFooterActions={exceptionNavMode ? null : claimNavFooterActions}
      leftSideAction={claimNavLeftSideAction}
      rightSideAction={claimNavRightSideAction}
      headerActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {exceptionNavMode && (
            <span style={{
              fontSize: '0.8rem',
              fontWeight: '700',
              color: exceptionProcessedCount === exceptionNavClaims.length && exceptionNavClaims.length > 0 ? '#059669' : '#D97706',
              backgroundColor: exceptionProcessedCount === exceptionNavClaims.length && exceptionNavClaims.length > 0 ? '#ECFDF5' : '#FFFBEB',
              border: `1.5px solid ${exceptionProcessedCount === exceptionNavClaims.length && exceptionNavClaims.length > 0 ? '#A7F3D0' : '#FDE68A'}`,
              padding: '4px 10px',
              borderRadius: '12px',
              whiteSpace: 'nowrap'
            }}>
              Đã xử lý: {exceptionProcessedCount}/{exceptionNavClaims.length}
            </span>
          )}
          {modalMode === 'view' && (
            <button
              type="button"
              title="Xử lý khiếu nại"
              onClick={() => setModalMode('edit')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '4px 6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B5233" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          )}
        </div>
      }
    >
      <div className="add-claim-layout-split">
        {/* Left Column: Form Inputs */}
        <div className="add-claim-form-col">
          {/* Row 1: Dòng hàng & Loại claim */}
          <div className="add-claim-row add-claim-grid-2">
            <div className="add-claim-field">
              <label className="add-claim-label">Dòng hàng</label>
              <select
                value={processDongHang}
                onChange={(e) => setProcessDongHang(e.target.value)}
                className="add-claim-select"
                disabled
                style={disabledFieldStyle}
              >
                {['Atlas', 'Oak', 'Maple', 'Pine'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                {processDongHang && !['Atlas', 'Oak', 'Maple', 'Pine'].includes(processDongHang) && (
                   <option value={processDongHang}>{processDongHang}</option>
                )}
              </select>
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Loại claim</label>
              <select
                value={processLoaiClaim}
                onChange={(e) => setProcessLoaiClaim(e.target.value)}
                className="add-claim-select"
                disabled
                style={disabledFieldStyle}
              >
                {['Khách nhắc nhở', 'Đền bù', 'Trả hàng', 'Khác'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                {processLoaiClaim && !['Khách nhắc nhở', 'Đền bù', 'Trả hàng', 'Khác'].includes(processLoaiClaim) && (
                  <option value={processLoaiClaim}>{processLoaiClaim}</option>
                )}
              </select>
            </div>
          </div>

          {/* Row 2: Mã tham chiếu & Tên mã sản phẩm */}
          <div className="add-claim-row add-claim-grid-2">
            <div className="add-claim-field">
              <label className="add-claim-label">Mã tham chiếu</label>
              <input
                type="text"
                placeholder="Cabinet#3"
                value={processMaThamChieu}
                onChange={(e) => setProcessMaThamChieu(e.target.value)}
                className="add-claim-input"
                disabled
                style={disabledFieldStyle}
              />
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Tên sản phẩm</label>
              <input
                type="text"
                placeholder="Nhập tên sản phẩm..."
                value={processTenSanPham}
                onChange={(e) => setProcessTenSanPham(e.target.value)}
                className="add-claim-input"
                disabled
                style={disabledFieldStyle}
              />
            </div>
          </div>

          {/* Row 3: Mức phạt + Giá trị phạt + Tổng phạt */}
          <div className="add-claim-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '16px' }}>
            <div className="add-claim-field">
              <label className="add-claim-label">Mức phạt</label>
              <select
                value={processMucPhat}
                onChange={(e) => setProcessMucPhat(e.target.value)}
                className="add-claim-select"
                disabled
                style={disabledFieldStyle}
              >
                {['Nhắc nhở', 'Phạt tiền', 'Hủy đơn'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                {processMucPhat && !['Nhắc nhở', 'Phạt tiền', 'Hủy đơn'].includes(processMucPhat) && (
                  <option value={processMucPhat}>{processMucPhat}</option>
                )}
              </select>
            </div>
            <div className="add-claim-field" style={{ position: 'relative' }}>
              <label className="add-claim-label">Giá trị phạt</label>
              <input
                type="text"
                placeholder="$0"
                value={processGiaTriPhat}
                onChange={(e) => setProcessGiaTriPhat(e.target.value)}
                className="add-claim-input"
                disabled
                style={disabledFieldStyle}
              />
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Tổng phạt</label>
              <input
                type="text"
                value={formatPenaltyValue(getProcessTotalPenaltyPreview())}
                className="add-claim-input"
                disabled
                style={{ ...disabledFieldStyle, backgroundColor: '#F5F5F5', color: '#B91C1C', fontWeight: '600' }}
              />
            </div>
          </div>

          {/* Row 4: Mã lỗi KH + Mã lỗi G7 + Tên lỗi G7 */}
          <div className="add-claim-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '16px' }}>
            <div className="add-claim-field" style={{ position: 'relative' }}>
              <label className="add-claim-label">Mã lỗi KH</label>
              <input
                type="text"
                placeholder="Mã lỗi KH..."
                value={processMaLoi}
                onChange={(e) => setProcessMaLoi(e.target.value)}
                className="add-claim-input"
                disabled
                style={disabledFieldStyle}
              />
            </div>
            <div className="add-claim-field" style={{ position: 'relative' }}>
              <label className="add-claim-label">Mã lỗi G7</label>
              <input
                type="text"
                placeholder="Mã lỗi G7..."
                value={processMaLoiCty}
                onChange={(e) => {
                  setProcessMaLoiCty(e.target.value);
                  setShowProcessG7CodeSuggestions(true);
                }}
                onFocus={() => setShowProcessG7CodeSuggestions(true)}
                onBlur={() => setTimeout(() => setShowProcessG7CodeSuggestions(false), 200)}
                className="add-claim-input"
                disabled={modalMode !== 'edit'}
                style={modalMode !== 'edit' ? disabledFieldStyle : {}}
              />
              {modalMode === 'edit' && showProcessG7CodeSuggestions && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EADCC9',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    zIndex: 999,
                    marginTop: '4px'
                  }}
                >
                  {uniqueCompanyErrorCodeOptions
                    .filter(opt => !processMaLoiCty || opt.toLowerCase().includes(processMaLoiCty.toLowerCase()))
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        className="custom-autocomplete-option"
                        onMouseDown={() => handleSelectG7Code(opt, 'process')}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="add-claim-field" style={{ position: 'relative' }}>
              <label className="add-claim-label">Tên lỗi G7</label>
              <input
                type="text"
                placeholder="Tên lỗi G7..."
                value={processTenLoiG7}
                onChange={(e) => {
                  setProcessTenLoiG7(e.target.value);
                  setShowProcessG7NameSuggestions(true);
                }}
                onFocus={() => setShowProcessG7NameSuggestions(true)}
                onBlur={() => setTimeout(() => setShowProcessG7NameSuggestions(false), 200)}
                className="add-claim-input"
                disabled={modalMode !== 'edit'}
                style={modalMode !== 'edit' ? disabledFieldStyle : {}}
              />
              {modalMode === 'edit' && showProcessG7NameSuggestions && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EADCC9',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    zIndex: 999,
                    marginTop: '4px'
                  }}
                >
                  {uniqueCompanyErrorNameOptions
                    .filter(opt => !processTenLoiG7 || opt.toLowerCase().includes(processTenLoiG7.toLowerCase()))
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        className="custom-autocomplete-option"
                        onMouseDown={() => handleSelectG7Name(opt, 'process')}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 5: LPN & Mã cont & Thời gian Claim */}
          <div className="add-claim-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '16px' }}>
            <div className="add-claim-field">
              <label className="add-claim-label">LPN</label>
              <input
                type="text"
                placeholder="Nhập LPN"
                value={processLpn}
                onChange={(e) => setProcessLpn(e.target.value)}
                className="add-claim-input"
                disabled
                style={disabledFieldStyle}
              />
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Mã cont</label>
              <input
                type="text"
                placeholder="Nhập cont"
                value={processMaCont}
                onChange={(e) => setProcessMaCont(e.target.value)}
                className="add-claim-input"
                disabled
                style={disabledFieldStyle}
              />
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Thời gian Claim</label>
              <input
                type="text"
                value={processNgayXuat}
                onChange={(e) => setProcessNgayXuat(e.target.value)}
                className="add-claim-input"
                disabled
                style={disabledFieldStyle}
                placeholder="MM/YYYY"
              />
            </div>
          </div>

          {/* Row 5: Trạng thái xử lý & Link CAPA */}
          <div className="add-claim-row add-claim-grid-2">
            <div className="add-claim-field">
              <label className="add-claim-label">Trạng thái xử lý</label>
              <div className="add-claim-radio-group">
                {['Mới', 'Đang xem xét', 'Đã xử lý'].map((statusVal) => (
                  <label key={statusVal} className="add-claim-radio-label" style={{ whiteSpace: 'nowrap', color: modalMode === 'view' ? '#9E9E9E' : '#3E2723', cursor: modalMode === 'view' ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="radio"
                      name="processTrangThaiXuLy"
                      value={statusVal}
                      checked={processTrangThaiXuLy === statusVal}
                      disabled={modalMode === 'view'}
                      onChange={async (e) => {
                        if (modalMode === 'view') return;
                        const newStatus = e.target.value;
                        setProcessTrangThaiXuLy(newStatus);
                        if (activeDetailClaim) {
                          try {
                            await claimService.patchClaimStatus(activeDetailClaim.id, newStatus);
                            setClaims(prev => prev.map(c => c.id === activeDetailClaim.id ? { ...c, status: newStatus } : c));
                            setActiveDetailClaim(prev => prev ? { ...prev, status: newStatus } : prev);
                          } catch (err) {
                            console.error('Lỗi cập nhật trạng thái:', err);
                          }
                        }
                      }}
                      className="add-claim-radio-input"
                      data-status={statusVal}
                    />
                    <span className="custom-radio-circle"></span>
                    {statusVal}
                  </label>
                ))}
              </div>
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Link CAPA (nếu có)</label>
              <input
                type="text"
                placeholder="Ghi chú"
                value={processLinkCapa}
                onChange={(e) => setProcessLinkCapa(e.target.value)}
                className="add-claim-input"
                disabled
                style={disabledFieldStyle}
              />
            </div>
          </div>

          {/* Row 6: Ghi chú */}
          <div className="add-claim-row">
            <div className="add-claim-field full-width">
              <label className="add-claim-label">Ghi chú</label>
              <textarea
                placeholder="Ghi chú"
                value={processGhiChu}
                onChange={(e) => setProcessGhiChu(e.target.value)}
                className="add-claim-textarea"
                rows="4"
                disabled={modalMode === 'view'}
                style={modalMode === 'view' ? disabledFieldStyle : {}}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Claim Images */}
        <div className="add-claim-image-col">
          <div className="filter-section-header" style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1.5px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              Ảnh minh chứng ({processImages.length})
            </span>
            {modalMode === 'edit' && (
              <button
                type="button"
                onClick={handleProcessAddImageClick}
                style={{
                  background: '#FAF6F0',
                  border: '1px solid #EADCC9',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  color: '#7B5233',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                + Thêm ảnh
              </button>
            )}
          </div>

          <div className="add-claim-image-scrollbox" style={{
            flex: 1,
            overflowY: processImages.length >= 4 ? 'auto' : 'hidden',
            paddingRight: '4px'
          }}>
            <div className="add-claim-image-card-list" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              height: processImages.length <= 3 ? '100%' : 'auto'
            }}>
              {processImages.length > 0 ? (
                processImages.map((path, index) => {
                  const num = processImages.length;
                  const cardStyle = num === 1
                    ? { flex: 1, height: '100%', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                    : num === 2
                      ? { flex: 1, height: 'calc(50% - 6px)', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                      : num === 3
                        ? { flex: 1, height: 'calc(33.33% - 8px)', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                        : { height: '180px', flexShrink: 0, position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' };

                  return (
                    <div key={index} className="add-claim-image-card-wrapper" style={cardStyle}>
                      {modalMode === 'edit' && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px', zIndex: 10 }}>
                          <button
                            type="button"
                            title="Thay thế ảnh"
                            onClick={() => handleEditProcessImageClick(index)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid #EADCC9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#7B5233',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Xóa ảnh"
                            onClick={() => handleDeleteProcessImageClick(index)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid #FCA5A5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#EF4444',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      )}
                      <img
                        src={getFullImagePath(path)}
                        alt={`Defect photo ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                        onClick={() => setPreviewImage(getFullImagePath(path))}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentNode.innerHTML = `<div style="padding: 20px; font-size: 0.8rem; color: #8D6E63; font-weight: bold; text-align: center;">Không tải được ảnh</div>`;
                        }}
                      />

                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(45, 26, 18, 0.7)',
                        color: '#FFFFFF',
                        fontSize: '0.75rem',
                        padding: '6px 8px',
                        textAlign: 'center',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {processImageCaptions[index] || `Ảnh minh chứng ${index + 1}`}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="add-claim-image-card-placeholder" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', border: '1.5px dashed #D1D5DB', borderRadius: '6px', backgroundColor: '#FAF9F8' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '8px', fontWeight: '500' }}>Không có ảnh minh chứng</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FormModal>
  );
};

export default ClaimProcessModal;
