import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
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
    result,
    setResult,
    product,
    productOptions,
    handleProductChange,
    spec,
    setSpec,
    specOptions,
    requiredQty,
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
    updateError,
    removeErrorRow,
    addErrorRow,
  } = formState

  const isReInspect = mode === INSPECT_MODES.RE_INSPECT

  return (
    <>


      <div className="pv2-field-row pv2-field-row--2col">
        <div className="pv2-field">
          <label>Chọn PO <span className="pv2-req">*</span></label>
          <CustomSelect
            value={po}
            options={poOptions}
            onChange={setPo}
            disabled={readOnly || isReInspect}
            placeholder="—"
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
          <label>Sản phẩm <span className="pv2-req">*</span></label>
          <CustomSelect
            value={product}
            options={productOptions}
            onChange={handleProductChange}
            disabled={readOnly || isReInspect}
            placeholder="—"
          />
        </div>
        <div className="pv2-field">
          <label>Quy cách</label>
          <CustomSelect
            value={spec}
            options={specOptions}
            onChange={setSpec}
            disabled={readOnly || isReInspect}
            placeholder="—"
          />
        </div>
      </div>

      <div className="pv2-field-row pv2-field-row--3col">
        <div className="pv2-field">
          <label>SL Cần Kiểm</label>
          <input type="text" className="pv2-input pv2-input--disabled" readOnly disabled value={requiredQty} placeholder="" />
        </div>
        <div className="pv2-field">
          <label>SL mẫu <span className="pv2-req">*</span></label>
          <input
            type="number"
            className={`pv2-input ${readOnly ? 'pv2-input--disabled' : ''}`}
            value={sampleQty}
            onChange={(e) => setSampleQty(e.target.value)}
            placeholder={requiredQty ? String(Math.max(1, Math.ceil(Number(requiredQty) * 0.05))) : ''}
            disabled={readOnly}
          />
        </div>
        <div className="pv2-field">
          <label>Lỗi (nếu có)</label>
          <input type="number" className="pv2-input pv2-input--disabled" value={errorQty} onChange={(e) => setErrorQty(e.target.value)} disabled />
        </div>
      </div>

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
            selectedDefectIds={errors.map((e) => e.defectId || e.code).filter(Boolean)}
            onChange={(r) => updateError(idx, r)}
            onRemove={errors.length > 1 ? () => removeErrorRow(idx) : null}
            disabled={readOnly}
          />
        ))}
        {!readOnly && (
          <button type="button" className="pv2-btn-add-image-link" onClick={addErrorRow} style={{ marginTop: 6 }}>
            <span className="pv2-plus-icon">+</span> Ghi nhận lỗi khác
          </button>
        )}
      </div>
    </>
  )
}

export default FirstSampleReInspectForm
