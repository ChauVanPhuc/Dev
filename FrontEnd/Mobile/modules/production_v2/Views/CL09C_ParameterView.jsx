import React, { useState } from 'react'
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
    parameter,
    setParameter,
    parameterOptions,
    paramStage,
    stage,
    paramPo,
    setParamPo,
    handleParamPoChange,
    poOptions,
    palletCode,
    setPalletCode,
    palletOptions,
    handlePalletSelect,
    paramProduct,
    setParamProduct,
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
    requiredQty,
  } = formState

  const [targetType, setTargetType] = useState('po') // 'po' | 'pallet'

  const currentStage = paramStage || stage
  const hasStage = Boolean(currentStage)
  const hasPo = Boolean(paramPo)
  const hasProduct = Boolean(paramProduct || (selectedProducts && selectedProducts.length > 0))

  const isPoDisabled = readOnly || !hasStage
  const isProductDisabled = readOnly || !hasStage || (targetType === 'po' && !hasPo)
  const isSampleDisabled = readOnly || !hasStage || (targetType === 'po' && (!hasPo || !hasProduct))

  const poPlaceholder = !hasStage ? 'Chọn công đoạn trước' : 'Nhập hoặc chọn PO...'
  const productPlaceholder = !hasStage ? 'Chọn công đoạn trước' : (targetType === 'po' && !hasPo ? 'Chọn PO trước' : 'Chọn sản phẩm...')

  const safeProductOptions = Array.isArray(productOptions) ? productOptions.filter((o) => Boolean(o && o.value)) : []
  const safeErrors = Array.isArray(errors) ? errors : []
  const safeSelectedDefectIds = safeErrors.map((e) => e?.defectId || e?.defect_id || e?.code || e?.id).filter(Boolean)

  return (
    <InspectionFormShell
      title="Kiểm tra thông số"
      subTitle="CL09.3: Phiếu kiểm tra thông số"
      formState={formState}
    >
      {({ renderImageUploadArea }) => (
        <>
          {/* Lựa chọn 1 trong 2: Theo Mã PO hoặc Theo Mã Pallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px', padding: '4px 0' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#4a240e' }}>
              Kiểm tra theo:
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13.5px', fontWeight: targetType === 'po' ? '700' : '500', color: targetType === 'po' ? '#7B5233' : '#64748b' }}>
              <input
                type="radio"
                name="paramTargetType"
                checked={targetType === 'po'}
                onChange={() => {
                  setTargetType('po')
                  setPalletCode('')
                }}
                disabled={readOnly}
              />
              Mã PO
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13.5px', fontWeight: targetType === 'pallet' ? '700' : '500', color: targetType === 'pallet' ? '#7B5233' : '#64748b' }}>
              <input
                type="radio"
                name="paramTargetType"
                checked={targetType === 'pallet'}
                onChange={() => {
                  setTargetType('pallet')
                  setParamPo('')
                }}
                disabled={readOnly}
              />
              Mã Pallet
            </label>
          </div>

          {/* Hàng 1: Chọn thông số & (Mã PO HOẶC Mã Pallet) */}
          <div className="pv2-field-row pv2-field-row--2col">
            <div className="pv2-field">
              <label>Chọn thông số <span className="pv2-req">*</span></label>
              <CustomSelect
                value={parameter}
                options={parameterOptions || []}
                onChange={setParameter}
                disabled={readOnly}
              />
            </div>

            {targetType === 'po' ? (
              <div className="pv2-field">
                <label>Mã PO <span className="pv2-req">*</span></label>
                <CustomSelect
                  value={paramPo}
                  options={poOptions || []}
                  onChange={handleParamPoChange || setParamPo}
                  disabled={isPoDisabled}
                  placeholder={poPlaceholder}
                  allowCustomInput={true}
                />
              </div>
            ) : (
              <div className="pv2-field">
                <label>Mã Pallet <span className="pv2-req">*</span></label>
                <CustomSelect
                  value={palletCode}
                  options={palletOptions || []}
                  onChange={handlePalletSelect || setPalletCode}
                  disabled={readOnly}
                  placeholder="Chọn hoặc nhập mã Pallet..."
                  allowCustomInput={true}
                />
              </div>
            )}
          </div>

          {/* Hàng 2: Chi tiết / Sản phẩm & Số lượng mẫu */}
          <div className="pv2-field-row pv2-field-row--2col">
            <div className="pv2-field">
              <label>Sản phẩm <span className="pv2-req">*</span></label>
              {isIncomingStage ? (
                <FormMultiSearchSelect
                  values={selectedProducts || []}
                  options={safeProductOptions}
                  onChange={handleMultiProductChange}
                  placeholder={productPlaceholder}
                  required
                  disabled={isProductDisabled}
                />
              ) : (
                <CustomSelect
                  value={paramProduct}
                  options={safeProductOptions}
                  onChange={handleParamProductChange || setParamProduct}
                  disabled={isProductDisabled}
                  placeholder={productPlaceholder}
                />
              )}
            </div>

            <div className="pv2-field">
              <label>SL mẫu kiểm tra <span className="pv2-req">*</span></label>
              <input
                type="number"
                min="1"
                max={samplingRule?.sample_size || requiredQty || undefined}
                className={`pv2-input ${isSampleDisabled ? 'pv2-input--disabled' : ''}`}
                value={paramSample || ''}
                onChange={(e) => setParamSample(e.target.value)}
                placeholder={samplingRule?.sample_size ? String(samplingRule.sample_size) : 'VD: 50'}
                disabled={isSampleDisabled}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #EADCC9',
                  backgroundColor: isSampleDisabled ? '#F8FAFC' : '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2D1A12',
                }}
              />
            </div>
          </div>

          {/* Hàng 3: SL Đạt & SL Không đạt */}
          <div className="pv2-field-row pv2-field-row--2col" style={{ marginTop: '4px' }}>
            <div className="pv2-field">
              <label>SL đạt</label>
              <input type="number" className="pv2-input pv2-input--disabled" value={paramPass || ''} onChange={(e) => setParamPass && setParamPass(e.target.value)} disabled />
            </div>
            <div className="pv2-field">
              <label>SL không đạt</label>
              <input type="number" className="pv2-input pv2-input--disabled" value={paramFail || ''} onChange={(e) => setParamFail && setParamFail(e.target.value)} disabled />
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

          <button type="button" className="pv2-btn-dark-pill" onClick={() => setGuideVisible((v) => !v)} style={{ marginTop: '8px' }}>
            👁 Xem hướng dẫn kiểm tra
          </button>

          {guideVisible && (
            <InspectionStepsTable
              steps={steps || []}
              onStepChange={handleStepResultChange}
              sampleQty={paramSample}
              disabled={readOnly}
            />
          )}

          {renderImageUploadArea && renderImageUploadArea()}

          <div className="pv2-field" style={{ marginTop: '12px' }}>
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
              rows={2}
              value={note || ''}
              onChange={(e) => setNote(e.target.value)}
              disabled={readOnly}
              placeholder="Nhập ghi chú kết quả đo thông số..."
            />
          </div>

          <div className="pv2-error-section" style={{ marginTop: '12px' }}>
            <div className="pv2-section-title">Theo dõi xu hướng lỗi</div>
            <div className="pv2-error-table-header">
              <span>Tên lỗi</span>
              <span>SL Ghi nhận</span>
            </div>
            {safeErrors.map((row, idx) => (
              <ErrorTrendRow
                key={row?.id || idx}
                row={row}
                defectOptions={defectOptions || []}
                selectedDefectIds={safeSelectedDefectIds}
                onChange={(r) => updateError(idx, r)}
                onRemove={safeErrors.length > 1 ? () => removeErrorRow(idx) : null}
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
