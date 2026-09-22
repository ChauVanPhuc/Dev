import React from 'react';
import { FormModal } from './Modal';
import { extractMultiplierFromPenalty, formatPenaltyValue, getFullImagePath } from '../utils/claimHelpers';

export const ClaimAddModal = ({
  isOpen,
  onClose,
  onSave,
  addDongHang, setAddDongHang,
  addLoaiClaim, setAddLoaiClaim,
  addMaThamChieu, setAddMaThamChieu,
  addTenSanPham, setAddTenSanPham,
  addMucPhat, setAddMucPhat,
  addGiaTriPhat, setAddGiaTriPhat,
  addHeSoPhat, setAddHeSoPhat,
  showAddSuggestions, setShowAddSuggestions,
  uniquePenaltyOptions = [],
  getAddTotalPenaltyPreview,
  addMaLoi, setAddMaLoi,
  addTenLoiKH, setAddTenLoiKH,
  showAddDefectSuggestions, setShowAddDefectSuggestions,
  showAddTenLoiKHSuggestions, setShowAddTenLoiKHSuggestions,
  uniqueCustomerDefectCodeOptions = [],
  uniqueCustomerDefectNameOptions = [],
  handleSelectDefectCode,
  handleSelectCustomerDefectName,
  defectCatalog = [],
  addMaLoiCty, setAddMaLoiCty,
  showAddG7CodeSuggestions, setShowAddG7CodeSuggestions,
  uniqueCompanyErrorCodeOptions = [],
  handleSelectG7Code,
  addTenLoiG7, setAddTenLoiG7,
  showAddG7NameSuggestions, setShowAddG7NameSuggestions,
  uniqueCompanyErrorNameOptions = [],
  handleSelectG7Name,
  addLpn, setAddLpn,
  addMaCont, setAddMaCont,
  addNgayXuat, setAddNgayXuat,
  addTrangThaiXuLy, setAddTrangThaiXuLy,
  addLinkCapa, setAddLinkCapa,
  addGhiChu, setAddGhiChu,
  addImages = [],
  addImageCaptions = [],
  addModalError,
  handleAddImageClick,
  handleEditAddImageClick,
  handleDeleteAddImageClick,
  onPreviewImage
}) => {
  const disabledFieldStyle = {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
    cursor: 'not-allowed',
    border: '1px solid #E5E7EB'
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSave}
      title="Đăng ký khiếu nại mới"
      width="min(95vw, 1150px)"
      cancelLabel="Hủy"
      confirmLabel="Lưu"
    >
      <div className="add-claim-layout-split">
        {/* Left Column: Form Inputs */}
        <div className="add-claim-form-col">
          {/* Row 1: Dòng hàng & Loại claim */}
          <div className="add-claim-row add-claim-grid-2">
            <div className="add-claim-field">
              <label className="add-claim-label">Dòng hàng</label>
              <select
                value={addDongHang}
                onChange={(e) => setAddDongHang(e.target.value)}
                className="add-claim-select"
              >
                <option value="Atlas">Atlas</option>
                <option value="Oak">Oak</option>
                <option value="Maple">Maple</option>
                <option value="Pine">Pine</option>
              </select>
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Loại claim</label>
              <select
                value={addLoaiClaim}
                onChange={(e) => setAddLoaiClaim(e.target.value)}
                className="add-claim-select"
              >
                <option value="Khách nhắc nhở">Khách nhắc nhở</option>
                <option value="Đền bù">Đền bù</option>
                <option value="Trả hàng">Trả hàng</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          {/* Row 2: Mã tham chiếu & Tên mã sản phẩm */}
          <div className="add-claim-row add-claim-grid-2">
            <div className="add-claim-field">
              <label className="add-claim-label">Mã tham chiếu <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span></label>
              <input
                type="text"
                placeholder="Cabinet#..."
                value={addMaThamChieu}
                onChange={(e) => setAddMaThamChieu(e.target.value)}
                className="add-claim-input"
                required
              />
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Tên sản phẩm <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span></label>
              <input
                type="text"
                placeholder="Nhập tên sản phẩm..."
                value={addTenSanPham}
                onChange={(e) => setAddTenSanPham(e.target.value)}
                className="add-claim-input"
                required
              />
            </div>
          </div>

          {/* Row 3: Mức phạt + Giá trị phạt + (X phạt nếu chứa 'unit') + Tổng phạt */}
          {(() => {
            const isUnitPenalty = String(addGiaTriPhat || '').toLowerCase().includes('unit');
            return (
              <div className="add-claim-row" style={{ display: 'grid', gridTemplateColumns: isUnitPenalty ? '1fr 1fr 0.9fr 1.3fr' : '1fr 1fr 1.5fr', gap: '16px' }}>
                <div className="add-claim-field">
                  <label className="add-claim-label">Mức phạt</label>
                  <select
                    value={addMucPhat}
                    onChange={(e) => setAddMucPhat(e.target.value)}
                    className="add-claim-select"
                  >
                    <option value="Nhắc nhở">Nhắc nhở</option>
                    <option value="Phạt tiền">Phạt tiền</option>
                    <option value="Hủy đơn">Hủy đơn</option>
                  </select>
                </div>

                <div className="add-claim-field" style={{ position: 'relative' }}>
                  <label className="add-claim-label">Giá trị phạt</label>
                  <input
                    type="text"
                    placeholder="$0"
                    value={addGiaTriPhat}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setAddGiaTriPhat(newVal);
                      if (newVal.toLowerCase().includes('unit')) {
                        setAddHeSoPhat(extractMultiplierFromPenalty(newVal));
                      }
                    }}
                    className="add-claim-input"
                    onFocus={() => setShowAddSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAddSuggestions(false), 200)}
                  />
                  {showAddSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniquePenaltyOptions
                        .filter(opt => !addGiaTriPhat || opt.toLowerCase().includes(addGiaTriPhat.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setAddGiaTriPhat(opt);
                              if (opt.toLowerCase().includes('unit')) {
                                setAddHeSoPhat(extractMultiplierFromPenalty(opt));
                              }
                              setShowAddSuggestions(false);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                    </div>
                  )}
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
                      value={addHeSoPhat}
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
                        setAddHeSoPhat(val);
                        if (val && !isNaN(val) && parseFloat(val) >= 1 && String(addGiaTriPhat).match(/x\s*\d+/i)) {
                          setAddGiaTriPhat(String(addGiaTriPhat).replace(/x\s*\d+/i, `X${val}`));
                        }
                      }}
                      className="add-claim-input"
                      style={{ backgroundColor: '#FFFBEB', borderColor: '#F59E0B', color: '#B45309', fontWeight: '700', textAlign: 'center' }}
                    />
                  </div>
                )}

                <div className="add-claim-field">
                  <label className="add-claim-label">Tổng phạt</label>
                  <input
                    type="text"
                    value={formatPenaltyValue(getAddTotalPenaltyPreview())}
                    className="add-claim-input"
                    disabled
                    style={{ ...disabledFieldStyle, color: '#B91C1C', fontWeight: '600' }}
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
                value={addMaLoi}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddMaLoi(val);
                  setShowAddDefectSuggestions && setShowAddDefectSuggestions(true);
                  const match = (uniqueCustomerDefectCodeOptions || []).find(opt => opt.toLowerCase() === val.trim().toLowerCase());
                  if (match && handleSelectDefectCode) {
                    handleSelectDefectCode(match, false);
                  }
                }}
                onFocus={() => setShowAddDefectSuggestions && setShowAddDefectSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAddDefectSuggestions && setShowAddDefectSuggestions(false), 200)}
                className="add-claim-input"
              />
              {showAddDefectSuggestions && (
                <div className="custom-autocomplete-suggestions">
                  {(uniqueCustomerDefectCodeOptions || [])
                    .filter(opt => !addMaLoi || opt.toLowerCase().includes(addMaLoi.toLowerCase()))
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        className="custom-autocomplete-option"
                        onMouseDown={() => handleSelectDefectCode && handleSelectDefectCode(opt, false)}
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
                value={addTenLoiKH}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddTenLoiKH && setAddTenLoiKH(val);
                  setShowAddTenLoiKHSuggestions && setShowAddTenLoiKHSuggestions(true);
                  const match = (uniqueCustomerDefectNameOptions || []).find(opt => opt.toLowerCase() === val.trim().toLowerCase());
                  if (match && handleSelectCustomerDefectName) {
                    handleSelectCustomerDefectName(match, false);
                  }
                }}
                onFocus={() => setShowAddTenLoiKHSuggestions && setShowAddTenLoiKHSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAddTenLoiKHSuggestions && setShowAddTenLoiKHSuggestions(false), 200)}
                className="add-claim-input"
              />
              {showAddTenLoiKHSuggestions && (
                <div className="custom-autocomplete-suggestions">
                  {(uniqueCustomerDefectNameOptions || [])
                    .filter(opt => !addTenLoiKH || opt.toLowerCase().includes(addTenLoiKH.toLowerCase()))
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        className="custom-autocomplete-option"
                        onMouseDown={() => handleSelectCustomerDefectName && handleSelectCustomerDefectName(opt, false)}
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
                value={addMaLoiCty}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddMaLoiCty(val);
                  setShowAddG7CodeSuggestions(true);
                  const match = (uniqueCompanyErrorCodeOptions || []).find(opt => opt.toLowerCase() === val.trim().toLowerCase());
                  if (match && handleSelectG7Code) {
                    handleSelectG7Code(match, false);
                  }
                }}
                onFocus={() => setShowAddG7CodeSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAddG7CodeSuggestions(false), 200)}
                className="add-claim-input"
              />
              {showAddG7CodeSuggestions && (
                <div className="custom-autocomplete-suggestions">
                  {(uniqueCompanyErrorCodeOptions || [])
                    .filter(opt => !addMaLoiCty || opt.toLowerCase().includes(addMaLoiCty.toLowerCase()))
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        className="custom-autocomplete-option"
                        onMouseDown={() => handleSelectG7Code(opt, false)}
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
                value={addTenLoiG7}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddTenLoiG7(val);
                  setShowAddG7NameSuggestions(true);
                  const match = (uniqueCompanyErrorNameOptions || []).find(opt => opt.toLowerCase() === val.trim().toLowerCase());
                  if (match && handleSelectG7Name) {
                    handleSelectG7Name(match, false);
                  }
                }}
                onFocus={() => setShowAddG7NameSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAddG7NameSuggestions(false), 200)}
                className="add-claim-input"
              />
              {showAddG7NameSuggestions && (
                <div className="custom-autocomplete-suggestions">
                  {(uniqueCompanyErrorNameOptions || [])
                    .filter(opt => !addTenLoiG7 || opt.toLowerCase().includes(addTenLoiG7.toLowerCase()))
                    .map((opt, idx) => (
                      <div
                        key={idx}
                        className="custom-autocomplete-option"
                        onMouseDown={() => handleSelectG7Name(opt, false)}
                      >
                        {opt}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 4: LPN & Mã cont & Thời gian Claim */}
          <div className="add-claim-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '16px' }}>
            <div className="add-claim-field">
              <label className="add-claim-label">LPN</label>
              <input
                type="text"
                placeholder="Nhập LPN"
                value={addLpn}
                onChange={(e) => setAddLpn(e.target.value)}
                className="add-claim-input"
              />
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Mã cont</label>
              <input
                type="text"
                placeholder="Nhập cont"
                value={addMaCont}
                onChange={(e) => setAddMaCont(e.target.value)}
                className="add-claim-input"
              />
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Thời gian Claim <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span></label>
              <input
                type="date"
                value={addNgayXuat}
                onChange={(e) => setAddNgayXuat(e.target.value)}
                className="add-claim-input"
                required
              />
            </div>
          </div>

          {/* Row 5: Trạng thái xử lý & Link CAPA */}
          <div className="add-claim-row add-claim-grid-2">
            <div className="add-claim-field">
              <label className="add-claim-label">Trạng thái xử lý</label>
              <div className="add-claim-radio-group">
                {['Mới', 'Đang xem xét', 'Đã xử lý'].map((statusVal) => (
                  <label key={statusVal} className="add-claim-radio-label" style={{ whiteSpace: 'nowrap' }}>
                    <input
                      type="radio"
                      name="addTrangThaiXuLy"
                      value={statusVal}
                      checked={addTrangThaiXuLy === statusVal}
                      onChange={(e) => setAddTrangThaiXuLy(e.target.value)}
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
                value={addLinkCapa}
                onChange={(e) => setAddLinkCapa(e.target.value)}
                className="add-claim-input"
              />
            </div>
          </div>

          {/* Row 6: Ghi chú */}
          <div className="add-claim-row">
            <div className="add-claim-field full-width">
              <label className="add-claim-label">Ghi chú</label>
              <textarea
                placeholder="Ghi chú"
                value={addGhiChu}
                onChange={(e) => setAddGhiChu(e.target.value)}
                className="add-claim-textarea"
                rows="4"
              />
            </div>
          </div>

          {addModalError && (
            <div style={{
              color: '#DC2626',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              marginTop: '12px',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              padding: '8px 16px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{addModalError}</span>
            </div>
          )}
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
              <span>Ảnh minh chứng <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span> ({addImages.length})</span>
            </span>
            <button
              type="button"
              onClick={handleAddImageClick}
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
          </div>

          <div className="add-claim-image-scrollbox" style={{
            flex: 1,
            overflowY: addImages.length >= 4 ? 'auto' : 'hidden',
            paddingRight: '4px'
          }}>
            <div className="add-claim-image-card-list" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              height: addImages.length <= 3 ? '100%' : 'auto'
            }}>
              {addImages.length > 0 ? (
                addImages.map((path, index) => {
                  const num = addImages.length;
                  const cardStyle = num === 1
                    ? { flex: 1, height: '100%', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                    : num === 2
                      ? { flex: 1, height: 'calc(50% - 6px)', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                      : num === 3
                        ? { flex: 1, height: 'calc(33.33% - 8px)', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                        : { height: '180px', flexShrink: 0, position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' };

                  return (
                    <div key={index} className="add-claim-image-card-wrapper" style={cardStyle}>
                      <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px', zIndex: 10 }}>
                        <button
                          type="button"
                          title="Thay thế ảnh"
                          onClick={() => handleEditAddImageClick(index)}
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
                          onClick={() => handleDeleteAddImageClick(index)}
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

                      <img
                        src={getFullImagePath(path)}
                        alt={`Defect photo ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                        onClick={() => onPreviewImage(getFullImagePath(path))}
                        onError={(e) => {
                          e.target.style.display = 'none';
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
                        {addImageCaptions[index] || `Ảnh minh chứng ${index + 1}`}
                      </div>
                    </div>
                  );
                })
              ) : (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="add-claim-image-card-placeholder" onClick={handleAddImageClick}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </FormModal>
  );
};
