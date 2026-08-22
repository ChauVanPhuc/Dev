import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import FormMultiSearchSelect from '@mobile/Shared/Views/components/form/FormMultiSearchSelect'
import { useInspectionFormBase } from '../Controllers/useInspectionFormBase'
import InspectionFormShell from './components/InspectionFormShell'
import InspectionStepsTable from './components/InspectionStepsTable'
import ErrorTrendRow from './components/ErrorTrendRow'
import { INSPECT_MODES } from '../constants'

const CL09C_ParameterView = () => {
  const formState = useInspectionFormBase(INSPECT_MODES.PARAMETER)

  const {
    readOnly,
    mode,
    modeOptions,
    handleModeChange,
    palletCode,
    setPalletCode,
    handlePalletSelect,
    parameter,
    setParameter,
    parameterOptions,
    paramStage,
    handleParamStageChange,
    stageOptions,
    paramPo,
    handleParamPoChange,
    poOptions,
    paramProduct,
    handleParamProductChange,
    productOptions,
    paramSample,
    setParamSample,
    paramPass,
    setParamPass,
    paramFail,
    setParamFail,
    guideVisible,
    setGuideVisible,
    steps,
    handleStepResultChange,
    result,
    setResult,
    note,
    setNote,
    errors,
    defectOptions,
    updateError,
    removeErrorRow,
    addErrorRow,
    isIncomingStage,
    selectedProducts,
    handleMultiProductChange,
    samplingRule,
  } = formState

  const hasStage = Boolean(paramStage)
  const hasPo = Boolean(paramPo)
  const hasProduct = Boolean(paramProduct || (selectedProducts && selectedProducts.length > 0))

  const isPoDisabled = readOnly || !hasStage
  const isProductDisabled = readOnly || !hasStage || !hasPo
  const isSampleDisabled = readOnly || !hasStage || !hasPo || !hasProduct

  const poPlaceholder = !hasStage ? 'Chọn công đoạn trước' : 'Nhập hoặc chọn PO...'
  const productPlaceholder = !hasStage ? 'Chọn công đoạn trước' : (!hasPo ? 'Chọn PO trước' : 'Chọn sản phẩm...')

  return (
    <InspectionFormShell
      title="Kiểm tra thông số"
      subTitle="CL09.3: Phiếu kiểm tra thông số"
      formState={formState}
    >
      {({ renderImageUploadArea }) => (
        <>
          <div className="pv2-field-row pv2-field-row--2col">
            <div className="pv2-field">
              <label>Chọn thông số <span className="pv2-req">*</span></label>
              <CustomSelect
                value={parameter}
                options={parameterOptions}
                onChange={setParameter}
                disabled={readOnly}
              />
            </div>
            <div className="pv2-field">
              <label>Công đoạn <span className="pv2-req">*</span></label>
              <CustomSelect
                value={paramStage}
                options={stageOptions}
                onChange={handleParamStageChange}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="pv2-field-row pv2-field-row--2col">
            <div className="pv2-field">
              <label>PO <span className="pv2-req">*</span></label>
              <CustomSelect
                value={paramPo}
                options={poOptions}
                onChange={handleParamPoChange}
                disabled={isPoDisabled}
                placeholder={poPlaceholder}
                allowCustomInput={true}
              />
            </div>
            <div className="pv2-field">
              <label>Sản phẩm <span className="pv2-req">*</span></label>
              {isIncomingStage ? (
                <FormMultiSearchSelect
                  values={selectedProducts}
                  options={productOptions.filter((o) => Boolean(o.value))}
                  onChange={handleMultiProductChange}
                  placeholder={productPlaceholder}
                  required
                  disabled={isProductDisabled}
                />
              ) : (
                <CustomSelect
                  value={paramProduct}
                  options={productOptions}
                  onChange={handleParamProductChange}
                  disabled={isProductDisabled}
                  placeholder={productPlaceholder}
                />
              )}
            </div>
          </div>

          <div className="pv2-field-row pv2-field-row--3col">
            <div className="pv2-field">
              <label>SL mẫu <span className="pv2-req">*</span></label>
              <input
                type="number"
                min="1"
                max={samplingRule?.sample_size || requiredQty || undefined}
                className={`pv2-input ${isSampleDisabled ? 'pv2-input--disabled' : ''}`}
                value={paramSample}
                onChange={(e) => setParamSample(e.target.value)}
                placeholder={samplingRule?.sample_size ? String(samplingRule.sample_size) : '0'}
                disabled={isSampleDisabled}
              />
            </div>
            <div className="pv2-field">
              <label>SL đạt</label>
              <input type="number" className="pv2-input pv2-input--disabled" value={paramPass} onChange={(e) => setParamPass(e.target.value)} disabled />
            </div>
            <div className="pv2-field">
              <label>SL không đạt</label>
              <input type="number" className="pv2-input pv2-input--disabled" value={paramFail} onChange={(e) => setParamFail(e.target.value)} disabled />
            </div>
          </div>

          {samplingRule && (
            <div style={{
              margin: '4px 0 12px 0',
              padding: '6px 12px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#92400E',
              fontWeight: '600'
            }}>
              <span>📏 Mốc AQL ({samplingRule.sample_rate_desc})</span>
              <span>Nặng ≤ <strong>{samplingRule.major_ac}</strong> | Nhẹ ≤ <strong>{samplingRule.minor_ac}</strong></span>
            </div>
          )}

          <button type="button" className="pv2-btn-dark-pill" onClick={() => setGuideVisible((v) => !v)}>
            👁 Xem hướng dẫn kiểm tra
          </button>

          {guideVisible && <InspectionStepsTable steps={steps} onStepChange={handleStepResultChange} sampleQty={paramSample} disabled={readOnly} />}

          {renderImageUploadArea()}

          <div className="pv2-field">
            <label>Kết quả <span className="pv2-req">*</span></label>
            <div className="pv2-radio-group">
              <label className="pv2-radio-label">
                <input type="radio" name="res_param" checked={result === 'pass'} onChange={() => setResult('pass')} disabled={readOnly} /> Đạt
              </label>
              <label className="pv2-radio-label">
                <input type="radio" name="res_param" checked={result === 'fail'} onChange={() => setResult('fail')} disabled={readOnly} /> Không đạt
              </label>
            </div>
          </div>

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
      )}
    </InspectionFormShell>
  )
}

export default CL09C_ParameterView
