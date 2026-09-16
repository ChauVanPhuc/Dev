import React, { useMemo } from 'react'
import { Plus, ClipboardCheck, History } from 'lucide-react'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import FormMultiSearchSelect from '@mobile/Shared/Views/components/form/FormMultiSearchSelect'
import InspectionStepsTable from './InspectionStepsTable'
import ErrorTrendRow from './ErrorTrendRow'
import RecentResultsModal from './RecentResultsModal'
import { INSPECT_MODES } from '../../constants'

const FirstSampleReInspectForm = ({ formState, renderImageUploadArea }) => {
  const {
    readOnly,
    mode,
    modeOptions,
    handleModeChange,
    palletCode,
    palletOptions,
    handlePalletSelect,
    stage,
    setStage,
    stageOptions,
    po,
    setPo,
    poOptions,
    handlePoSearch,
    result,
    setResult,
    action,
    setAction,
    product,
    productOptions,
    handleProductChange,
    spec,
    setSpec,
    specOptions,
    totalBatchQty,
    requiredQty,
    setRequiredQty,
    displayRequiredQty,
    sampleQty,
    setSampleQty,
    errorQty,
    setErrorQty,
    steps,
    handleStepResultChange,
    note,
    setNote,
    errors,
    defectOptions,
    allDefectOptions,
    updateError,
    removeErrorRow,
    addErrorRow,
    isIncomingStage,
    selectedProducts,
    selectedSpecs,
    lockedSpecs,
    handleMultiProductChange,
    handleMultiSpecChange,
    samplingRule,
    partHistoryTickets,
    isPartHistoryModalOpen,
    setIsPartHistoryModalOpen,
    totalInspectedSoFar,
  } = formState

  const isReInspect = mode === INSPECT_MODES.RE_INSPECT
  const hasStage = Boolean(stage)
  const hasPo = Boolean(po)
  const hasProduct = Boolean(product || (selectedProducts && selectedProducts.length > 0))
  const hasSpec = Boolean(spec || (selectedSpecs && selectedSpecs.length > 0))

  const isPoDisabled = readOnly || isReInspect || !hasStage
  const isProductDisabled = readOnly || isReInspect || !hasStage || !hasPo
  const isSpecDisabled = readOnly || isReInspect || !hasStage || !hasPo || !hasProduct
  const isQtyDisabled = readOnly || isReInspect || !hasStage || !hasPo || !hasProduct || !hasSpec
  const isSampleQtyDisabled = readOnly || !hasStage || !hasPo || !hasProduct || !hasSpec

  const isIncoming = Boolean(
    isIncomingStage ||
    (stage && (
      stage.toLowerCase().includes('nhập kho') ||
      stage.toLowerCase().includes('nhap kho') ||
      stage.toLowerCase().includes('đầu vào') ||
      stage.toLowerCase().includes('dau vao')
    ))
  )

  const totalQtyLabel = isIncoming ? 'Tổng số lượng' : 'Số lượng sản xuất'
  const requiredQtyLabel = isIncoming ? 'SL Cần Kiểm' : 'Số lượng kiểm tra'

  const isComponentStage = stage && ['tạo phôi', 'phôi', 'định hình', 'lắp ráp'].some(s => stage.toLowerCase().includes(s))
  const isFinishedStage = stage && ['sơn', 'đóng gói', 'bao bì', 'lưu kho'].some(s => stage.toLowerCase().includes(s))
  const isPackagingStage = stage && ['đóng gói', 'dong goi', 'bao bì', 'đóng thùng'].some(s => stage.toLowerCase().includes(s))
  const itemLabel = isPackagingStage ? 'Sản phẩm (Tủ)' : (isComponentStage ? 'Chi tiết' : (isFinishedStage ? 'Sản phẩm' : 'Chi tiết / Sản phẩm'))

  const poPlaceholder = !hasStage ? 'Chọn công đoạn trước' : 'Nhập hoặc chọn PO...'
  const productPlaceholder = !hasStage ? 'Chọn công đoạn trước' : (!hasPo ? 'Chọn PO trước' : `Chọn ${itemLabel.toLowerCase()}...`)
  const specPlaceholder = !hasStage ? 'Chọn công đoạn trước' : (!hasPo ? 'Chọn PO trước' : (!hasProduct ? `Chọn ${itemLabel.toLowerCase()} trước` : 'Chọn quy cách...'))
  const requiredQtyPlaceholder = !hasStage
    ? 'Chọn công đoạn trước'
    : (!hasPo
      ? 'Chọn PO trước'
      : (!hasProduct
        ? `Chọn ${itemLabel.toLowerCase()} trước`
        : (!hasSpec
          ? 'Chọn quy cách trước...'
          : (isIncoming ? 'Nhập SL giao đợt này...' : 'Nhập SL kiểm tra đợt này...'))))

  const hasSampleQty = Boolean(sampleQty || requiredQty)
  const isFormFilled = readOnly || (hasPo && hasProduct && hasSpec && hasSampleQty)

  const totalBatchDisplay = useMemo(() => {
    if (!hasSpec && !readOnly) return ''
    if (!totalBatchQty) return readOnly ? (requiredQty || '') : ''
    return `${totalInspectedSoFar || 0}/${totalBatchQty}`
  }, [hasSpec, readOnly, totalBatchQty, totalInspectedSoFar, requiredQty])

  return (
    <>
      <div className="pv2-field-row pv2-field-row--2col">
        <div className="pv2-field">
          <label>Chọn PO <span className="pv2-req">*</span></label>
          <CustomSelect
            value={po}
            options={poOptions}
            onChange={setPo}
            disabled={isPoDisabled}
            placeholder={poPlaceholder}
            allowCustomInput={true}
            onSearch={handlePoSearch}
          />
        </div>
        <div className="pv2-field">
          <label>Kết quả <span className="pv2-req">*</span></label>
          <div className="pv2-radio-group">
            <label className="pv2-radio-label">
              <input type="radio" name="res" checked={result === 'pass'} onChange={() => setResult('pass')} disabled={readOnly} /> Đạt
            </label>
            <label className="pv2-radio-label">
              <input type="radio" name="res" checked={result === 'fail'} onChange={() => setResult('fail')} disabled={readOnly} /> Không đạt
            </label>
          </div>
        </div>
      </div>

      <div className="pv2-field-row pv2-field-row--2col">
        <div className="pv2-field">
          <label>{itemLabel} <span className="pv2-req">*</span></label>
          <FormMultiSearchSelect
            values={selectedProducts}
            options={productOptions.filter((o) => Boolean(o.value))}
            onChange={handleMultiProductChange}
            placeholder={productPlaceholder}
            itemType={itemLabel ? itemLabel.toLowerCase() : 'mục'}
            required
            disabled={isProductDisabled}
          />
        </div>
        <div className="pv2-field">
          <label>Quy cách <span className="pv2-req">*</span></label>
          <FormMultiSearchSelect
            values={selectedSpecs}
            options={specOptions.filter((o) => Boolean(o.value))}
            onChange={handleMultiSpecChange}
            placeholder={specPlaceholder}
            itemType="quy cách"
            disabled={isSpecDisabled}
          />
        </div>
      </div>

      {/* Lịch sử kiểm tra của chi tiết này nếu đã từng tạo phiếu */}
      {hasProduct && partHistoryTickets && partHistoryTickets.length > 0 && (
        <div
          className="pv2-fade-in"
          style={{
            marginTop: 4,
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12.5px', color: '#92400E' }}>
            <History size={16} style={{ color: '#B45309', flexShrink: 0 }} />
            <span>
              Chi tiết này đã có <strong>{partHistoryTickets.length} phiếu</strong> kiểm tra
              {totalInspectedSoFar > 0 && (
                <> • Đã kiểm: <strong>{totalInspectedSoFar}</strong>{totalBatchQty ? ` / ${totalBatchQty}` : ''}</>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPartHistoryModalOpen(true)}
            style={{
              backgroundColor: '#B45309',
              color: '#FFF',
              border: 'none',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Xem lịch sử
          </button>
        </div>
      )}

      {/* Hàng 1: Tổng số lượng / Số lượng sản xuất & SL Cần Kiểm / Số lượng kiểm tra */}
      <div className="pv2-field-row pv2-field-row--2col">
        <div className="pv2-field">
          <label>{totalQtyLabel}</label>
          <input
            type="text"
            className="pv2-input pv2-input--disabled"
            value={totalBatchDisplay}
            disabled
            readOnly
            placeholder="—"
          />
        </div>
        <div className="pv2-field">
          <label>{requiredQtyLabel} <span className="pv2-req">*</span></label>
          <input
            type="number"
            min="1"
            className={`pv2-input ${isQtyDisabled ? 'pv2-input--disabled' : ''}`}
            value={requiredQty}
            onChange={(e) => setRequiredQty(e.target.value)}
            placeholder={requiredQtyPlaceholder}
            disabled={isQtyDisabled}
          />
        </div>
      </div>

      {/* Hàng 2: SL Mẫu (AQL tính toán theo SL Cần Kiểm) & Lỗi (nếu có) */}
      <div className="pv2-field-row pv2-field-row--2col">
        <div className="pv2-field">
          <label>SL mẫu <span className="pv2-req">*</span></label>
          <input
            type="number"
            min="1"
            max={requiredQty || samplingRule?.sample_size || undefined}
            className={`pv2-input ${isSampleQtyDisabled ? 'pv2-input--disabled' : ''}`}
            value={sampleQty}
            onChange={(e) => setSampleQty(e.target.value)}
            placeholder={!hasSpec ? '—' : (mode === INSPECT_MODES.FIRST_SAMPLE ? '5' : (samplingRule?.sample_size ? String(samplingRule.sample_size) : ''))}
            disabled={isSampleQtyDisabled}
          />
        </div>
        <div className="pv2-field">
          <label>Lỗi (nếu có)</label>
          <input type="number" className="pv2-input pv2-input--disabled" value={errorQty} onChange={(e) => setErrorQty(e.target.value)} disabled />
        </div>
      </div>

      {/* Tiến trình: Hướng dẫn và Lỗi chỉ hiển thị sau khi hoàn tất thông tin cơ bản của phiếu */}
      {!isFormFilled && !readOnly ? (
        <div
          className="pv2-fade-in"
          style={{
            marginTop: 16,
            padding: '16px 18px',
            borderRadius: 12,
            backgroundColor: '#FAF5EE',
            border: '1.5px dashed #EADCC9',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#7B5233'
          }}
        >
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            backgroundColor: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#b45309',
            flexShrink: 0,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: '1px solid #EADCC9'
          }}>
            <ClipboardCheck size={20} />
          </div>
          <div style={{ fontSize: 13, lineHeight: '1.45' }}>
            <span style={{ fontWeight: 800, display: 'block', color: '#4a240e', marginBottom: 2 }}>
              Bước 2: Điền thông tin phiếu kiểm tra
            </span>
            <span style={{ color: '#78716c' }}>
              {!hasPo
                ? 'Vui lòng chọn PO để tiếp tục.'
                : !hasProduct
                ? `Vui lòng chọn ${itemLabel}.`
                : !hasSampleQty
                ? 'Vui lòng nhập Số lượng mẫu cần kiểm tra.'
                : 'Hoàn tất các thông tin trên để mở Hướng dẫn kiểm tra và Ghi nhận lỗi.'}
            </span>
          </div>
        </div>
      ) : (
        <div className="pv2-fade-in" style={{ marginTop: 16 }}>
          <div className="pv2-section-title">Hướng dẫn kiểm tra</div>
          <InspectionStepsTable steps={steps} onStepChange={handleStepResultChange} sampleQty={sampleQty} disabled={readOnly} />

          {renderImageUploadArea && renderImageUploadArea()}

          <div className="pv2-field">
            <label>Ghi chú</label>
            <textarea
              className={`pv2-textarea ${readOnly ? 'pv2-input--disabled' : ''}`}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readOnly}
              placeholder="Nhập ghi chú kiểm tra (nếu có)..."
            />
          </div>

          <div className="pv2-error-section">
            <div className="pv2-section-title">Theo dõi xu hướng lỗi</div>
            <div className="pv2-error-table-header">
              <span>Tên lỗi</span>
              <span>SL Ghi nhận</span>
            </div>
            {errors.map((row, idx) => (
              <ErrorTrendRow
                key={row.id}
                row={row}
                defectOptions={defectOptions}
                allDefectOptions={allDefectOptions}
                selectedDefectIds={errors
                  .filter((_, i) => i !== idx)
                  .flatMap((e) => [e.defectId, e.code, e.name])
                  .filter(Boolean)}
                onChange={(r) => updateError(idx, r)}
                onRemove={errors.length > 1 ? () => removeErrorRow(idx) : null}
                disabled={readOnly}
              />
            ))}
            {!readOnly && (
              <button type="button" className="pv2-btn-add-image-link" onClick={addErrorRow} style={{ marginTop: 6 }}>
                <Plus size={14} /> Ghi nhận lỗi khác
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Lịch sử kiểm tra của chi tiết */}
      <RecentResultsModal
        isOpen={isPartHistoryModalOpen}
        onClose={() => setIsPartHistoryModalOpen(false)}
        tickets={partHistoryTickets}
        title={`Lịch sử kiểm tra: ${product || 'Chi tiết'}`}
        emptyMessage="Chưa có phiếu kiểm tra nào trước đây cho chi tiết này"
        maxItems={50}
        showApply={false}
      />
    </>
  )
}

export default FirstSampleReInspectForm
