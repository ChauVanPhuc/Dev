import React, { useMemo } from 'react';
import { FormModal } from './Modal';
import { extractMultiplierFromPenalty, formatPenaltyValue, getFullImagePath } from '../utils/claimHelpers';
import claimService from '../services/claim.service';

export const ClaimProcessModal = ({
  activeDetailClaim,
  setActiveDetailClaim,
  modalMode,
  setModalMode,
  exceptionNavMode,
  setExceptionNavMode,
  exceptionNavClaims = [],
  setExceptionNavClaims,
  claims = [],
  setClaims,
  navList = [],
  processDongHang, setProcessDongHang,
  processLoaiClaim, setProcessLoaiClaim,
  processMaThamChieu, setProcessMaThamChieu,
  processTenSanPham, setProcessTenSanPham,
  processMucPhat, setProcessMucPhat,
  processGiaTriPhat, setProcessGiaTriPhat,
  processHeSoPhat, setProcessHeSoPhat,
  getProcessTotalPenaltyPreview,
  processMaLoi, setProcessMaLoi,
  showProcessDefectCodeSuggestions, setShowProcessDefectCodeSuggestions,
  uniqueCustomerDefectCodeOptions = [],
  handleSelectDefectCode,
  processTenLoiKH, setProcessTenLoiKH,
  showProcessTenLoiKHSuggestions, setShowProcessTenLoiKHSuggestions,
  uniqueCustomerDefectNameOptions = [],
  handleSelectCustomerDefectName,
  processMaLoiCty, setProcessMaLoiCty,
  showProcessG7CodeSuggestions, setShowProcessG7CodeSuggestions,
  uniqueCompanyErrorCodeOptions = [],
  handleSelectG7Code,
  processTenLoiG7, setProcessTenLoiG7,
  showProcessG7NameSuggestions, setShowProcessG7NameSuggestions,
  uniqueCompanyErrorNameOptions = [],
  handleSelectG7Name,
  processLpn, setProcessLpn,
  processMaCont, setProcessMaCont,
  processNgayXuat, setProcessNgayXuat,
  processTrangThaiXuLy, setProcessTrangThaiXuLy,
  processLinkCapa, setProcessLinkCapa,
  processGhiChu, setProcessGhiChu,
  processImages = [],
  processImageCaptions = [],
  onSaveProcessClaim,
  handleProcessAddImageClick,
  handleEditProcessImageClick,
  handleDeleteProcessImageClick,
  handlePrevClaim,
  handleNextClaim,
  onPreviewImage
}) => {
  const [failedImages, setFailedImages] = React.useState({});

  React.useEffect(() => {
    setFailedImages({});
  }, [activeDetailClaim?.id, activeDetailClaim?.claim_code]);

  const exceptionProcessedCount = useMemo(() => {
    if (!exceptionNavMode) return 0;
    return exceptionNavClaims.filter(navClaim => {
      const currentClaim = claims.find(c => c.id === navClaim.id);
      return currentClaim && (currentClaim.status === 'Đang xem xét' || currentClaim.status === 'Đã xử lý');
    }).length;
  }, [exceptionNavClaims, claims, exceptionNavMode]);

  if (!activeDetailClaim) return null;

  const disabledFieldStyle = {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
    cursor: 'not-allowed',
    border: '1px solid #E5E7EB'
  };

  const currentClaimIndex = activeDetailClaim ? navList.findIndex(c => c.id === activeDetailClaim.id) : -1;
  const hasPrevClaim = currentClaimIndex > 0;
  const hasNextClaim = currentClaimIndex !== -1 && currentClaimIndex < navList.length - 1;

  const processModalTitle = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ margin: 0 }}>{modalMode === 'edit' || modalMode === 'process' ? 'Xử lý khiếu nại' : 'Chi tiết khiếu nại'}</span>
        {activeDetailClaim && (
          <div style={{
            fontSize: '0.85rem',
            fontWeight: 'bold',
            backgroundColor: processTrangThaiXuLy === 'Đã xử lý' ? '#ECFDF5' : processTrangThaiXuLy === 'Đang xem xét' ? '#FFFBEB' : '#FAF6F0',
            border: `1.5px solid ${processTrangThaiXuLy === 'Đã xử lý' ? '#A7F3D0' : processTrangThaiXuLy === 'Đang xem xét' ? '#FDE68A' : '#D7CCC8'}`,
            color: processTrangThaiXuLy === 'Đã xử lý' ? '#059669' : processTrangThaiXuLy === 'Đang xem xét' ? '#D97706' : '#8D6E63',
            padding: '6px 12px',
            borderRadius: '6px',
            display: 'inline-block'
          }}>
            {activeDetailClaim.claim_code} · {activeDetailClaim.product_name || activeDetailClaim.sku} · Thời gian Claim: {activeDetailClaim.date || activeDetailClaim.period}
          </div>
        )}
      </div>
    </div>
  );

  const claimNavFooterActions = (
    <div className={`modal-footer-nav-group ${exceptionNavMode ? 'force-show' : ''}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button
        title="Khiếu nại trước"
        type="button"
        onClick={handlePrevClaim}
        disabled={!hasPrevClaim}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid #D7CCC8',
          backgroundColor: '#FFFFFF',
          color: '#7B5233',
          fontWeight: '600',
          fontSize: '0.85rem',
          cursor: hasPrevClaim ? 'pointer' : 'not-allowed',
          opacity: hasPrevClaim ? 1 : 0.4,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (hasPrevClaim) {
            e.currentTarget.style.backgroundColor = '#FAF6F0';
            e.currentTarget.style.borderColor = '#7B5233';
          }
        }}
        onMouseLeave={(e) => {
          if (hasPrevClaim) {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#D7CCC8';
          }
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span>Trước đó</span>
      </button>
      {exceptionNavMode && (
        <span style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          color: exceptionProcessedCount === exceptionNavClaims.length && exceptionNavClaims.length > 0 ? '#059669' : '#D97706',
          backgroundColor: exceptionProcessedCount === exceptionNavClaims.length && exceptionNavClaims.length > 0 ? '#ECFDF5' : '#FFFBEB',
          border: `1.5px solid ${exceptionProcessedCount === exceptionNavClaims.length && exceptionNavClaims.length > 0 ? '#A7F3D0' : '#FDE68A'}`,
          padding: '3px 10px',
          borderRadius: '12px',
          whiteSpace: 'nowrap'
        }}>
          Đã xử lý ngoại lệ: {exceptionProcessedCount}/{exceptionNavClaims.length}
        </span>
      )}
      <span style={{
        fontSize: '0.85rem',
        fontWeight: '700',
        color: '#5D4037',
        minWidth: '40px',
        textAlign: 'center',
        userSelect: 'none'
      }}>
        {currentClaimIndex !== -1 ? `${currentClaimIndex + 1}/${navList.length}` : '—'}
      </span>
      <button
        title="Khiếu nại tiếp theo"
        type="button"
        onClick={handleNextClaim}
        disabled={!hasNextClaim}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid #D7CCC8',
          backgroundColor: '#FFFFFF',
          color: '#7B5233',
          fontWeight: '600',
          fontSize: '0.85rem',
          cursor: hasNextClaim ? 'pointer' : 'not-allowed',
          opacity: hasNextClaim ? 1 : 0.4,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (hasNextClaim) {
            e.currentTarget.style.backgroundColor = '#FAF6F0';
            e.currentTarget.style.borderColor = '#7B5233';
          }
        }}
        onMouseLeave={(e) => {
          if (hasNextClaim) {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#D7CCC8';
          }
        }}
      >
        <span>Tiếp theo</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );

  const claimNavLeftSideAction = (
    <button
      className="modal-side-nav-btn left"
      title="Khiếu nại trước"
      type="button"
      onClick={handlePrevClaim}
      disabled={!hasPrevClaim}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
  );

  const claimNavRightSideAction = (
    <button
      className="modal-side-nav-btn right"
      title="Khiếu nại tiếp theo"
      type="button"
      onClick={handleNextClaim}
      disabled={!hasNextClaim}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  );

  return (
    <FormModal
      isOpen={!!activeDetailClaim}
      onClose={() => { setActiveDetailClaim(null); setExceptionNavMode(false); setExceptionNavClaims([]); }}
      onSubmit={onSaveProcessClaim}
      title={processModalTitle}
      width="min(95vw, 1150px)"
      cancelLabel={modalMode === 'view' ? null : "Hủy"}
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

          {/* Row 3: Mức phạt + Giá trị phạt + (X phạt nếu có 'unit') + Tổng phạt */}
          {(() => {
            const isUnitPenalty = String(processGiaTriPhat || '').toLowerCase().includes('unit');
            return (
              <div className="add-claim-row" style={{ display: 'grid', gridTemplateColumns: isUnitPenalty ? '1fr 1fr 0.9fr 1.3fr' : '1fr 1fr 1.5fr', gap: '16px' }}>
                <div className="add-claim-field">
                  <label className="add-claim-label">Mức phạt</label>
                  <select
                    value={processMucPhat}
                    onChange={(e) => setProcessMucPhat(e.target.value)}
                    className="add-claim-select"
                    disabled={modalMode === 'view'}
                    style={modalMode === 'view' ? disabledFieldStyle : undefined}
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
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setProcessGiaTriPhat(newVal);
                      if (newVal.toLowerCase().includes('unit')) {
                        setProcessHeSoPhat(extractMultiplierFromPenalty(newVal));
                      }
                    }}
                    className="add-claim-input"
                    disabled={modalMode === 'view'}
                    style={modalMode === 'view' ? disabledFieldStyle : undefined}
                  />
                </div>

                {isUnitPenalty && (
                  <div className="add-claim-field">
                    <label className="add-claim-label" style={{ color: '#B45309', fontWeight: 'bold' }}>X phạt</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      placeholder="1"
                      value={processHeSoPhat}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val !== '') {
                          const parsed = parseFloat(val);
                          if (parsed < 1) val = '1';
                          if (parsed > 100) val = '100';
                        }
                        setProcessHeSoPhat(val);
                        if (val && !isNaN(val) && parseFloat(val) >= 1 && String(processGiaTriPhat).match(/x\s*\d+/i)) {
                          setProcessGiaTriPhat(String(processGiaTriPhat).replace(/x\s*\d+/i, `X${val}`));
                        }
                      }}
                      className="add-claim-input"
                      disabled={modalMode === 'view'}
                      style={modalMode === 'view'
                        ? { ...disabledFieldStyle, backgroundColor: '#FFFBEB', color: '#B45309', fontWeight: '700', textAlign: 'center', borderColor: '#FDE68A' }
                        : { backgroundColor: '#FFFBEB', borderColor: '#F59E0B', color: '#B45309', fontWeight: '700', textAlign: 'center' }
                      }
                    />
                  </div>
                )}

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
            );
          })()}

          {/* Row 4: Mã lỗi KH + Tên lỗi KH + Mã lỗi G7 + Tên lỗi G7 */}
          <div className="add-claim-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1.5fr', gap: '16px' }}>
            {/* 1. Mã lỗi KH */}
            <div className="add-claim-field" style={{ position: 'relative' }}>
              <label className="add-claim-label">Mã lỗi KH</label>
              <input
                type="text"
                placeholder="Mã lỗi KH..."
                value={processMaLoi}
                onChange={(e) => {
                  const val = e.target.value;
                  setProcessMaLoi(val);
                  setShowProcessDefectCodeSuggestions && setShowProcessDefectCodeSuggestions(true);
                  const match = (uniqueCustomerDefectCodeOptions || []).find(opt => opt.toLowerCase() === val.trim().toLowerCase());
                  if (match && handleSelectDefectCode) {
                    handleSelectDefectCode(match, true);
                  }
                }}
                onFocus={() => setShowProcessDefectCodeSuggestions && setShowProcessDefectCodeSuggestions(true)}
                onBlur={() => setTimeout(() => setShowProcessDefectCodeSuggestions && setShowProcessDefectCodeSuggestions(false), 200)}
                className="add-claim-input"
                disabled={modalMode !== 'edit'}
                style={modalMode !== 'edit' ? disabledFieldStyle : {}}
              />
              {modalMode === 'edit' && showProcessDefectCodeSuggestions && (
                <div className="custom-autocomplete-suggestions">
                  {(uniqueCustomerDefectCodeOptions || [])
                    .filter(opt => !processMaLoi || opt.toLowerCase().includes(processMaLoi.toLowerCase()))
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        className="custom-autocomplete-option"
                        onMouseDown={() => handleSelectDefectCode && handleSelectDefectCode(opt, true)}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 2. Tên lỗi KH */}
            <div className="add-claim-field" style={{ position: 'relative' }}>
              <label className="add-claim-label">Tên lỗi KH</label>
              <input
                type="text"
                placeholder="Tên lỗi KH..."
                value={processTenLoiKH}
                onChange={(e) => {
                  const val = e.target.value;
                  setProcessTenLoiKH && setProcessTenLoiKH(val);
                  setShowProcessTenLoiKHSuggestions && setShowProcessTenLoiKHSuggestions(true);
                  const match = (uniqueCustomerDefectNameOptions || []).find(opt => opt.toLowerCase() === val.trim().toLowerCase());
                  if (match && handleSelectCustomerDefectName) {
                    handleSelectCustomerDefectName(match, true);
                  }
                }}
                onFocus={() => setShowProcessTenLoiKHSuggestions && setShowProcessTenLoiKHSuggestions(true)}
                onBlur={() => setTimeout(() => setShowProcessTenLoiKHSuggestions && setShowProcessTenLoiKHSuggestions(false), 200)}
                className="add-claim-input"
                disabled={modalMode !== 'edit'}
                style={modalMode !== 'edit' ? disabledFieldStyle : {}}
              />
              {modalMode === 'edit' && showProcessTenLoiKHSuggestions && (
                <div className="custom-autocomplete-suggestions">
                  {(uniqueCustomerDefectNameOptions || [])
                    .filter(opt => !processTenLoiKH || opt.toLowerCase().includes(processTenLoiKH.toLowerCase()))
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        className="custom-autocomplete-option"
                        onMouseDown={() => handleSelectCustomerDefectName && handleSelectCustomerDefectName(opt, true)}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 3. Mã lỗi G7 */}
            <div className="add-claim-field" style={{ position: 'relative' }}>
              <label className="add-claim-label">Mã lỗi G7</label>
              <input
                type="text"
                placeholder="Mã lỗi G7..."
                value={processMaLoiCty}
                onChange={(e) => {
                  const val = e.target.value;
                  setProcessMaLoiCty(val);
                  setShowProcessG7CodeSuggestions(true);
                  const match = (uniqueCompanyErrorCodeOptions || []).find(opt => opt.toLowerCase() === val.trim().toLowerCase());
                  if (match && handleSelectG7Code) {
                    handleSelectG7Code(match, true);
                  }
                }}
                onFocus={() => setShowProcessG7CodeSuggestions(true)}
                onBlur={() => setTimeout(() => setShowProcessG7CodeSuggestions(false), 200)}
                className="add-claim-input"
                disabled={modalMode !== 'edit'}
                style={modalMode !== 'edit' ? disabledFieldStyle : {}}
              />
              {modalMode === 'edit' && showProcessG7CodeSuggestions && (
                <div className="custom-autocomplete-suggestions">
                  {(uniqueCompanyErrorCodeOptions || [])
                    .filter(opt => !processMaLoiCty || opt.toLowerCase().includes(processMaLoiCty.toLowerCase()))
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        className="custom-autocomplete-option"
                        onMouseDown={() => handleSelectG7Code(opt, true)}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 4. Tên lỗi G7 */}
            <div className="add-claim-field" style={{ position: 'relative' }}>
              <label className="add-claim-label">Tên lỗi G7</label>
              <input
                type="text"
                placeholder="Tên lỗi G7..."
                value={processTenLoiG7}
                onChange={(e) => {
                  const val = e.target.value;
                  setProcessTenLoiG7(val);
                  setShowProcessG7NameSuggestions(true);
                  const match = (uniqueCompanyErrorNameOptions || []).find(opt => opt.toLowerCase() === val.trim().toLowerCase());
                  if (match && handleSelectG7Name) {
                    handleSelectG7Name(match, true);
                  }
                }}
                onFocus={() => setShowProcessG7NameSuggestions(true)}
                onBlur={() => setTimeout(() => setShowProcessG7NameSuggestions(false), 200)}
                className="add-claim-input"
                disabled={modalMode !== 'edit'}
                style={modalMode !== 'edit' ? disabledFieldStyle : {}}
              />
              {modalMode === 'edit' && showProcessG7NameSuggestions && (
                <div className="custom-autocomplete-suggestions">
                  {(uniqueCompanyErrorNameOptions || [])
                    .filter(opt => !processTenLoiG7 || opt.toLowerCase().includes(processTenLoiG7.toLowerCase()))
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        className="custom-autocomplete-option"
                        onMouseDown={() => handleSelectG7Name(opt, true)}
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
              <span>Ảnh minh chứng ({processImages.length})</span>
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

                  const imgUrl = getFullImagePath(path);
                  const isImageError = !!failedImages[imgUrl];

                  return (
                    <div key={`${activeDetailClaim?.id || 'claim'}_${index}_${path}`} className="add-claim-image-card-wrapper" style={cardStyle}>
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
                      {isImageError ? (
                        <div style={{ padding: '20px', fontSize: '0.8rem', color: '#8D6E63', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          Không tải được ảnh
                        </div>
                      ) : (
                        <img
                          src={imgUrl}
                          alt={`Defect photo ${index + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                          onClick={() => onPreviewImage(imgUrl)}
                          onError={() => {
                            setFailedImages(prev => ({ ...prev, [imgUrl]: true }));
                          }}
                        />
                      )}

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
