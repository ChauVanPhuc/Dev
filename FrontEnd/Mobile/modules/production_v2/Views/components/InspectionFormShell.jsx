import React from 'react'
import { X, ArrowLeft, CheckCircle2, Download, ImagePlus, CheckSquare, Layers, ClipboardCheck, Camera, Plus, RotateCcw, Loader2 } from 'lucide-react'
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

const InspectionFormShell = ({ title, subTitle, formState, children, showLastResultButton = false, embedded = false }) => {
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
    retryImage,
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

  const currentStage = formState.stage || formState.paramStage || ''

  // Bước 1: Đã chọn công đoạn / pallet chưa (chế độ kiểm tra quy trình bỏ qua công đoạn)
  const isStageReady = readOnly || Boolean(
    formState.mode === INSPECT_MODES.PROCESS
      ? true
      : formState.mode === INSPECT_MODES.RE_INSPECT
      ? formState.palletCode
      : currentStage
  )

  // Bước 2: Đã điền các trường chính của form chưa
  const hasPoSelected = Boolean(formState.po || formState.paramPo || formState.palletCode || (formState.selectedPos && formState.selectedPos.length > 0))
  const hasProductSelected = Boolean(formState.product || formState.paramProduct || (formState.selectedProducts && formState.selectedProducts.length > 0))
  const hasQtySelected = Boolean(formState.requiredQty || formState.sampleQty || formState.paramSample)

  const isFormFilled = readOnly || Boolean(
    formState.mode === INSPECT_MODES.PROCESS
      ? formState.process
      : formState.mode === INSPECT_MODES.QA
      ? formState.staff
      : formState.mode === INSPECT_MODES.DAILY
      ? (hasPoSelected && hasProductSelected && hasQtySelected)
      : formState.mode === INSPECT_MODES.PARAMETER
      ? (hasPoSelected && hasProductSelected && hasQtySelected)
      : (hasPoSelected && hasProductSelected && hasQtySelected)
  )

  const renderImageUploadArea = () => (
    <div style={{
      marginTop: 14,
      marginBottom: 14,
      padding: '12px 14px',
      backgroundColor: '#FAF7F2',
      borderRadius: '12px',
      border: '1px solid #EADBCE'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: images.length > 0 ? 10 : 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Camera size={16} color="#7B5233" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4A240E' }}>
            Hình ảnh kiểm tra {!readOnly && <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: 11 }}>(tùy chọn)</span>}
          </span>
        </div>
        {images.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {images.some((img) => img && typeof img === 'object' && img.status === 'error') && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#DC2626',
                backgroundColor: '#FEE2E2',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                ⚠ Lỗi mạng tải ảnh (chạm ảnh để thử lại)
              </span>
            )}
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#15803D',
              backgroundColor: '#DCFCE7',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              ✓ Đã chọn {images.length} ảnh
            </span>
          </div>
        )}
      </div>

      {!readOnly && (
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImagePick} />
      )}

      {/* Grid hiển thị ảnh và nút thêm ảnh */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {images.map((item, i) => {
          const isObj = item && typeof item === 'object'
          const src = isObj ? (item.url || item.serverUrl) : item
          const status = isObj ? (item.status || 'success') : 'success'
          const imgId = isObj ? (item.id || i) : i
          const progress = isObj ? (item.progress || 0) : 100

          return (
            <div
              key={imgId}
              style={{
                position: 'relative',
                width: 64,
                height: 64,
                borderRadius: 8,
                overflow: 'hidden',
                border: status === 'error' ? '2px solid #EF4444' : '1.5px solid #EADBCE',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                cursor: 'pointer',
                flexShrink: 0
              }}
              onClick={() => {
                if (status === 'error' && retryImage) {
                  retryImage(imgId)
                } else {
                  setPreviewImage(getFullImageUrl(src))
                }
              }}
            >
              <img
                src={getFullImageUrl(src)}
                alt="Ảnh kiểm tra"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: status === 'uploading' ? 0.6 : (status === 'error' ? 0.45 : 1)
                }}
                onError={(e) => {
                  e.target.onerror = null
                  e.target.style.display = 'none'
                  if (e.target.parentElement) {
                    e.target.parentElement.style.display = 'none'
                  }
                }}
              />

              {/* Overlay trạng thái: Đang tải lên */}
              {status === 'uploading' && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  gap: 2
                }}>
                  <Loader2 size={16} className="pv2-spin" color="#FFF" />
                  <span style={{ fontSize: 9, fontWeight: 700 }}>
                    {progress > 0 ? `${progress}%` : 'Tải lên...'}
                  </span>
                </div>
              )}

              {/* Overlay trạng thái: Lỗi mạng (chạm để thử lại) */}
              {status === 'error' && (
                <div
                  title="Tải lỗi do mạng yếu. Chạm để thử lại"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(239, 68, 68, 0.55)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    gap: 2,
                    padding: 2
                  }}
                >
                  <RotateCcw size={16} strokeWidth={2.5} color="#FFF" />
                  <span style={{ fontSize: 8.5, fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>
                    Thử lại
                  </span>
                </div>
              )}

              {/* Badge thành công góc dưới */}
              {status === 'success' && !readOnly && (
                <div style={{
                  position: 'absolute',
                  bottom: 2,
                  left: 2,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: '#16A34A',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8.5,
                  fontWeight: 900
                }}>
                  ✓
                </div>
              )}

              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(imgId) }}
                  title="Xóa ảnh"
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )
        })}

        {!readOnly && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              width: images.length > 0 ? 64 : '100%',
              height: images.length > 0 ? 64 : 44,
              borderRadius: 8,
              border: '1.5px dashed #C89D7C',
              backgroundColor: '#FFF',
              display: 'flex',
              flexDirection: images.length > 0 ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: images.length > 0 ? 3 : 8,
              cursor: 'pointer',
              color: '#7B5233',
              fontSize: images.length > 0 ? 10.5 : 13,
              fontWeight: 700,
              transition: 'all 0.15s',
              padding: '4px 8px'
            }}
          >
            {images.length > 0 ? (
              <>
                <Camera size={16} color="#7B5233" strokeWidth={2.5} />
                <span>Chụp thêm</span>
              </>
            ) : (
              <>
                <Camera size={17} color="#7B5233" />
                <span>Chạm để chụp ảnh kiểm tra</span>
              </>
            )}
          </button>
        )}
      </div>

      {readOnly && images.length === 0 && (
        <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
          Không có hình ảnh đính kèm cho phiếu này.
        </div>
      )}
    </div>
  )

  const content = (
    <>
      <div className="pv2-page pv2-page--form" style={embedded ? { paddingTop: 4 } : {}}>

        {/* Step Indicator — Chỉ hiển thị khi tạo mới để hướng dẫn người dùng nhập liệu từng bước */}
        {!readOnly && formState.mode !== INSPECT_MODES.PROCESS && (
          <div style={{
            maxWidth: '480px',
            margin: '0 auto 12px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            boxShadow: '0 2px 6px rgba(123, 82, 51, 0.04)',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Step 1: Công đoạn */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '12px',
              fontWeight: 700,
              color: isStageReady ? '#15803d' : '#7B5233'
            }}>
              <span style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: isStageReady ? '#DCFCE7' : '#7B5233',
                color: isStageReady ? '#15803D' : '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 800
              }}>
                {isStageReady ? '✓' : '1'}
              </span>
              <span>{formState.mode === INSPECT_MODES.RE_INSPECT ? 'Pallet / Mã KT' : 'Công đoạn'}</span>
            </div>

            <div style={{
              flex: 1,
              height: 2,
              backgroundColor: isStageReady ? '#86EFAC' : '#E2E8F0',
              margin: '0 8px'
            }} />

            {/* Step 2: Điền form */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '12px',
              fontWeight: 700,
              color: isFormFilled ? '#15803d' : (isStageReady ? '#7B5233' : '#94A3B8')
            }}>
              <span style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: isFormFilled ? '#DCFCE7' : (isStageReady ? '#7B5233' : '#F1F5F9'),
                color: isFormFilled ? '#15803D' : (isStageReady ? '#FFFFFF' : '#94A3B8'),
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 800
              }}>
                {isFormFilled ? '✓' : '2'}
              </span>
              <span>PO</span>
            </div>


            <div style={{
              flex: 1,
              height: 2,
              backgroundColor: isFormFilled ? '#86EFAC' : '#E2E8F0',
              margin: '0 8px'
            }} />

            {/* Step 3: Hướng dẫn & Lỗi */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '12px',
              fontWeight: 700,
              color: isFormFilled ? '#7B5233' : '#94A3B8'
            }}>
              <span style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: isFormFilled ? '#7B5233' : '#F1F5F9',
                color: isFormFilled ? '#FFFFFF' : '#94A3B8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 800
              }}>
                3
              </span>
              <span>Hướng dẫn & Lỗi</span>
            </div>
          </div>
        )}

        {/* Top Dropdowns Row (Outside Card) */}
        {!readOnly && (
          <div style={{ maxWidth: '480px', margin: '0 auto 12px auto' }}>
            <div className={formState.mode === INSPECT_MODES.PROCESS ? 'pv2-field-row' : 'pv2-field-row pv2-field-row--2col'}>
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
                    Mã pallet / Mã kiểm tra <span className="pv2-req">*</span>
                  </label>
                  <CustomSelect
                    value={formState.palletCode}
                    options={formState.palletOptions || []}
                    onChange={formState.handlePalletSelect}
                    disabled={readOnly}
                    placeholder="Chọn/Nhập mã pallet hoặc mã kiểm tra..."
                    allowCustomInput={true}
                  />
                </div>
              ) : formState.mode === INSPECT_MODES.PROCESS ? null : (
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

        {/* Chưa chọn công đoạn: Hiển thị hướng dẫn bước 1 */}
        {!isStageReady && !readOnly ? (
          <div
            className="pv2-fade-in"
            style={{
              maxWidth: '480px',
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px dashed #D6C7B8',
              padding: '40px 24px',
              textAlign: 'center',
              boxShadow: '0 2px 10px rgba(123, 82, 51, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              boxSizing: 'border-box'
            }}
          >
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#FAF5EE',
              color: '#7B5233',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #EADCC9'
            }}>
              <CheckSquare size={28} />
            </div>
            <div>
              <div style={{ fontSize: '15.5px', fontWeight: '800', color: '#4a240e', marginBottom: '6px' }}>
                {formState.mode === INSPECT_MODES.RE_INSPECT
                  ? 'Bước 1: Chọn hoặc nhập Mã pallet / Mã kiểm tra'
                  : 'Bước 1: Chọn Công đoạn kiểm tra'}
              </div>
              <div style={{ fontSize: '13.5px', color: '#78716c', lineHeight: '1.5', maxWidth: '320px', margin: '0 auto' }}>
                {formState.mode === INSPECT_MODES.RE_INSPECT
                  ? 'Vui lòng chọn hoặc nhập mã pallet hoặc mã phiếu kiểm tra ở phía trên để hệ thống tự động tải phiếu.'
                  : 'Vui lòng chọn công đoạn kiểm tra ở phía trên để bắt đầu mở biểu mẫu phiếu.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="pv2-form-card pv2-fade-in">
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
                {readOnly && currentStage && (
                  <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#78523b', fontWeight: '600', marginTop: '3px' }}>
                    Công đoạn: <span style={{ fontWeight: '700', color: '#4a240e', fontStyle: 'normal' }}>{currentStage}</span>
                  </div>
                )}
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
              {(() => {
                if (typeof children === 'function') {
                  return children({ renderImageUploadArea, isStageReady, isFormFilled })
                }
                if (Array.isArray(children)) {
                  return children.map((child, idx) =>
                    typeof child === 'function'
                      ? <React.Fragment key={idx}>{child({ renderImageUploadArea, isStageReady, isFormFilled })}</React.Fragment>
                      : child
                  )
                }
                return children
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Cố định neo cuối màn hình (Fixed Bottom Action Bar) */}
      <div className="pv2-fixed-bottom-actions">
        {readOnly ? (
          <>
            <button
              type="button"
              className="pv2-btn-cancel"
              onClick={() => navigate(ROUTES.INSPECTION_LIST)}
              style={{ width: '100%', flex: 1 }}
            >
              <ArrowLeft size={17} />
              <span className="pv2-btn-label">
                <span className="pv2-btn-text-full">Quay lại danh sách</span>
                <span className="pv2-btn-text-short">Quay lại</span>
              </span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="pv2-btn-cancel" onClick={() => formState.handleCancelOrBack()}>
              <X size={17} />
              <span className="pv2-btn-label">Hủy bỏ</span>
            </button>
            {isStageReady && (
              <button
                type="button"
                className="pv2-btn-submit"
                onClick={handleSubmit}
                disabled={submitting || !isFormFilled}
                style={{
                  opacity: !isFormFilled ? 0.65 : 1,
                  cursor: !isFormFilled ? 'not-allowed' : 'pointer'
                }}
              >
                <CheckCircle2 size={17} />
                <span className="pv2-btn-label">
                  {submitting ? 'Đang lưu...' : 'Xác nhận'}
                </span>
              </button>
            )}
          </>
        )}
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
        showDontRemind={confirmConfig.showDontRemind}
        dontRemindText={confirmConfig.dontRemindText}
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
    </>
  )

  if (embedded) {
    return content
  }

  return (
    <Layout>
      <PageHeader
        title={readOnly ? 'Chi tiết phiếu' : (title || 'Khởi tạo phiếu')}
        subTitle={readOnly ? `CL09: ${ticketCode}` : (subTitle || 'CL09: Tạo phiếu kiểm tra')}
        showBack={true}
        onBackClick={() => formState.handleCancelOrBack()}
      />
      {content}
    </Layout>
  )
}

export default InspectionFormShell
