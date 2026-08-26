import { X, ArrowLeft, CheckCircle2, Download } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import ConfirmErrorQtyModal from './ConfirmErrorQtyModal'
import FinishInspectionModal from './FinishInspectionModal'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal'
import { ROUTES, INSPECT_MODES } from '../../constants'
import { getFullImageUrl } from '@shared/services/api'
import RecentResultsModal from './RecentResultsModal'
import '../../styles/production_v2.css'

const InspectionFormShell = ({ title, subTitle, formState, children, showLastResultButton = false }) => {
  const {
    navigate,
    readOnly,
    ticketCode,
    displayCreator,
    displayTime,
    isDone,
    submitting,
    handleConfirmTicketClick,
    handleSubmit,
    images,
    removeImage,
    handleImagePick,
    fileRef,
    isFailedResult,
    previewImage,
    setPreviewImage,
    confirmErrModal,
    setConfirmErrModal,
    finishModal,
    setFinishModal,
    summary,
    palletCode,
    handleFinishConfirm,
    handleCreatePallet,
    confirmConfig,
    modalConfig,
    handleLoadLastResult,
    recentTickets,
    isRecentModalOpen,
    setIsRecentModalOpen,
    applyRecentTicket,
    setSampleQty,
    setErrorQty,
  } = formState

  const renderImageUploadArea = () => (
    <div className="pv2-upload-area" style={{ marginTop: 12 }}>
      <div className="pv2-upload-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!readOnly ? (
          <button
            type="button"
            className="pv2-btn-add-image-link"
            onClick={() => fileRef.current?.click()}
          >
            <span className="pv2-plus-icon">+</span> Thêm ảnh kiểm tra
          </button>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
            📸 Hình ảnh đính kèm ({images.length})
          </span>
        )}
        {!readOnly && images.length > 0 && (
          <span className="pv2-req-tag-ok">✓ Đã chọn {images.length} ảnh</span>
        )}
      </div>

      {!readOnly && (
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImagePick} />
      )}

      {images.length > 0 ? (
        <div className="pv2-image-preview-row" style={{ marginTop: 8 }}>
          {images.map((src, i) => (
            <div key={i} className="pv2-img-thumb" style={{ cursor: 'pointer' }} onClick={() => setPreviewImage(getFullImageUrl(src))}>
              <img src={getFullImageUrl(src)} alt="Ảnh kiểm tra" />
              {!readOnly && (
                <button type="button" className="pv2-img-remove" onClick={(e) => { e.stopPropagation(); removeImage(i) }} title="Xóa ảnh">
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        readOnly && (
          <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
            Không có hình ảnh đính kèm cho phiếu này.
          </div>
        )
      )}
    </div>
  )

  return (
    <Layout>
      <PageHeader
        title={readOnly ? 'Chi tiết phiếu' : (title || 'Khởi tạo phiếu')}
        subTitle={readOnly ? `CL09: ${ticketCode}` : (subTitle || 'CL09: Tạo phiếu kiểm tra')}
        showBack={true}
        onBackClick={() => formState.handleCancelOrBack()}
      />

      <div className="pv2-page pv2-page--form">
        {/* Top Dropdowns Row (Outside Card) */}
        {!readOnly && (
          <div style={{ maxWidth: '480px', margin: '0 auto 12px auto' }}>
            <div className="pv2-field-row pv2-field-row--2col">
              <div className="pv2-field">
                <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#4a240e', marginBottom: '4px', display: 'block' }}>
                  Chọn cách kiểm tra <span className="pv2-req">*</span>
                </label>
                <CustomSelect
                  value={formState.mode}
                  options={formState.modeOptions}
                  onChange={formState.handleModeChange}
                  disabled={readOnly}
                />
              </div>
              {formState.mode === INSPECT_MODES.RE_INSPECT ? (
                <div className="pv2-field">
                  <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#4a240e', marginBottom: '4px', display: 'block' }}>
                    Mã pallet <span className="pv2-req">*</span>
                  </label>
                  <CustomSelect
                    value={formState.palletCode}
                    options={formState.palletOptions || []}
                    onChange={formState.handlePalletSelect}
                    disabled={readOnly}
                    placeholder="Chọn/Nhập mã pallet"
                    allowCustomInput={true}
                  />
                </div>
              ) : (
                <div className="pv2-field">
                  <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#4a240e', marginBottom: '4px', display: 'block' }}>
                    Công đoạn <span className="pv2-req">*</span>
                  </label>
                  <CustomSelect
                    value={formState.stage || formState.paramStage}
                    options={formState.stageOptions}
                    onChange={formState.handleParamStageChange || formState.handleStageChange || formState.setStage}
                    disabled={readOnly}
                    placeholder="Chọn công đoạn..."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pv2-form-card">
          {readOnly && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              gap: 8
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#4a240e' }}>
                Thông Tin Phiếu
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 14,
                backgroundColor: isDone ? '#dcfce7' : '#ffedd5',
                color: isDone ? '#15803d' : '#c2410c',
                border: `1px solid ${isDone ? '#bbf7d0' : '#fed7aa'}`
              }}>
                {isDone ? '✓ Đã xong' : '⏳ Chờ xác nhận'}
              </span>
            </div>
          )}

          {/* Ticket Meta Header (Matching Image 1) */}
          <div className="pv2-ticket-meta" style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="pv2-ticket-info">
              <div className="pv2-ticket-id" style={{ fontSize: '22px', fontWeight: '800', fontStyle: 'italic', color: '#b45309', lineHeight: '1.2' }}>
                Phiếu: {ticketCode}
              </div>
              <div className="pv2-ticket-creator" style={{ fontSize: '12px', fontStyle: 'italic', color: '#b45309', fontWeight: '600', marginTop: '2px' }}>
                Được tạo bởi: {displayCreator} {displayTime && `• ${displayTime}`}
              </div>
            </div>
            {!readOnly && showLastResultButton && formState.mode !== INSPECT_MODES.RE_INSPECT && (
              <button
                type="button"
                className="pv2-btn-pallet-view"
                style={{
                  backgroundColor: '#4a240e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onClick={() => {
                  if (setIsRecentModalOpen) {
                    setIsRecentModalOpen(true)
                  } else if (handleLoadLastResult) {
                    handleLoadLastResult()
                  }
                }}
              >
                <Download size={14} /> Xuất kết quả gần nhất
              </button>
            )}
          </div>

          <div className="pv2-form">
            {typeof children === 'function' ? children({ renderImageUploadArea }) : children}

            {/* ACTION BUTTONS */}
            <div className="pv2-card-actions" style={{ marginTop: 18 }}>
              {readOnly ? (
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <button
                    type="button"
                    className="pv2-btn-cancel"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onClick={() => navigate(ROUTES.INSPECTION_LIST)}
                  >
                    <ArrowLeft size={16} /> Quay lại danh sách
                  </button>
                  {!isDone && (
                    <button
                      type="button"
                      className="pv2-btn-submit"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onClick={handleConfirmTicketClick}
                      disabled={submitting}
                    >
                      <CheckCircle2 size={16} /> {submitting ? 'Đang duyệt...' : 'Xác nhận duyệt'}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <button type="button" className="pv2-btn-cancel" onClick={() => formState.handleCancelOrBack()}>
                    Hủy bỏ
                  </button>
                  <button type="button" className="pv2-btn-submit" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Đang lưu...' : 'Xác nhận'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }} onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Xem ảnh lớn" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain' }} />
            <button
              type="button"
              style={{
                position: 'absolute',
                top: -14,
                right: -14,
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
              onClick={() => setPreviewImage(null)}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <ConfirmErrorQtyModal
        open={confirmErrModal}
        onConfirm={(data) => { setConfirmErrModal(false); setSampleQty(String(data.sampleQty)); setErrorQty(String(data.errorQty)) }}
        onClose={() => setConfirmErrModal(false)}
      />

      <FinishInspectionModal
        open={finishModal}
        summary={summary}
        palletCode={palletCode}
        onConfirm={handleFinishConfirm}
        onClose={() => setFinishModal(false)}
        onCreatePallet={handleCreatePallet}
        isReInspect={formState.mode !== INSPECT_MODES.FIRST_SAMPLE}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={confirmConfig.onCancel}
      />

      <MessageModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
      />

      <RecentResultsModal
        isOpen={isRecentModalOpen}
        onClose={() => setIsRecentModalOpen && setIsRecentModalOpen(false)}
        tickets={recentTickets}
        onApply={(t) => applyRecentTicket && applyRecentTicket(t)}
      />
    </Layout>
  )
}

export default InspectionFormShell
