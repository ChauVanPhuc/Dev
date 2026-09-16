import { Plus, ClipboardCheck } from 'lucide-react'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import FormMultiSearchSelect from '@mobile/Shared/Views/components/form/FormMultiSearchSelect'
import InspectionStepsTable from './InspectionStepsTable'
import ErrorTrendRow from './ErrorTrendRow'
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
    requiredQty,
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
  } = formState

  const isReInspect = mode === INSPECT_MODES.RE_INSPECT
  const hasStage = Boolean(stage)
  const hasPo = Boolean(po)
  const hasProduct = Boolean(product || (selectedProducts && selectedProducts.length > 0))

  const isPoDisabled = readOnly || isReInspect || !hasStage
  const isProductDisabled = readOnly || isReInspect || !hasStage || !hasPo
  const isSpecDisabled = readOnly || isReInspect || !hasStage || !hasPo || !hasProduct
  const isSampleQtyDisabled = readOnly || !hasStage || !hasPo || !hasProduct

  const isComponentStage = stage && ['tạo phôi', 'phôi', 'định hình', 'lắp ráp'].some(s => stage.toLowerCase().includes(s))
  const isFinishedStage = stage && ['sơn', 'đóng gói', 'bao bì', 'lưu kho'].some(s => stage.toLowerCase().includes(s))
  const isPackagingStage = stage && ['đóng gói', 'dong goi', 'bao bì', 'đóng thùng'].some(s => stage.toLowerCase().includes(s))
  const itemLabel = isPackagingStage ? 'Sản phẩm (Tủ)' : (isComponentStage ? 'Chi tiết' : (isFinishedStage ? 'Sản phẩm' : 'Chi tiết / Sản phẩm'))

  const poPlaceholder = !hasStage ? 'Chọn công đoạn trước' : 'Nhập hoặc chọn PO...'
  const productPlaceholder = !hasStage ? 'Chọn công đoạn trước' : (!hasPo ? 'Chọn PO trước' : `Chọn ${itemLabel.toLowerCase()}...`)
  const specPlaceholder = !hasStage ? 'Chọn công đoạn trước' : (!hasPo ? 'Chọn PO trước' : (!hasProduct ? `Chọn ${itemLabel.toLowerCase()} trước` : 'Chọn quy cách...'))

  const hasSampleQty = Boolean(sampleQty || requiredQty)
  const isFormFilled = readOnly || (hasPo && hasProduct && hasSampleQty)

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
            lockedValues={lockedSpecs}
            lockedMessage="Quy cách duy nhất của chi tiết, không thể bỏ chọn"
          />
        </div>
      </div>

      <div className="pv2-field-row pv2-field-row--3col">
        <div className="pv2-field">
          <label>SL Cần Kiểm</label>
          <input type="text" className="pv2-input pv2-input--disabled" readOnly disabled value={displayRequiredQty || requiredQty || ''} placeholder="" />
        </div>
        <div className="pv2-field">
          <label>SL mẫu <span className="pv2-req">*</span></label>
          <input
            type="number"
            min="1"
            max={requiredQty || samplingRule?.sample_size || undefined}
            className={`pv2-input ${isSampleQtyDisabled ? 'pv2-input--disabled' : ''}`}
            value={sampleQty}
            onChange={(e) => setSampleQty(e.target.value)}
            placeholder={samplingRule?.sample_size ? String(samplingRule.sample_size) : ''}
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
    </>
  )
}

export default FirstSampleReInspectForm
