import React, { useState, useMemo, useEffect } from 'react'
import { Plus, ScanLine } from 'lucide-react'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import FormMultiSearchSelect from '@mobile/Shared/Views/components/form/FormMultiSearchSelect'
import QRScanner from '@mobile/Shared/Views/components/media/QRScanner'
import { useInspectionFormBase } from '../Controllers/useInspectionFormBase'
import InspectionFormShell from './components/InspectionFormShell'
import InspectionStepsTable from './components/InspectionStepsTable'
import ErrorTrendRow from './components/ErrorTrendRow'
import InspectionResultBanner from './components/InspectionResultBanner'
import { INSPECT_MODES } from '../constants'
import { groupSpecOptionsByColor } from '../utils/cabinetSeriesMapper'

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
    handlePoSearch,
    palletCode,
    setPalletCode,
    palletOptions,
    handlePalletSelect,
    paramProduct,
    setParamProduct,
    handleParamProductChange,
    productOptions,
    totalBatchQty,
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
    action,
    setAction,
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
    handleMultiProductChange,
    spec,
    isPaintThickness,
    setSpec,
    specOptions,
    selectedSpecs,
    handleMultiSpecChange,
    samplingRule,
    requiredQty,
  } = formState

  const [targetType, setTargetType] = useState('po') // 'po' | 'pallet'
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false)

  // Đồng bộ loại đối tượng kiểm tra (PO hay Pallet) khi xem phiếu chi tiết
  useEffect(() => {
    if (formState.ticket) {
      const t = formState.ticket
      if (t.targetType) {
        setTargetType(t.targetType)
      } else if ((t.palletCode || t.pallet_code) && !t.po && !t.paramPo && !t.batch_no) {
        setTargetType('pallet')
      } else {
        setTargetType('po')
      }
    }
  }, [formState.ticket])

  const handleInFormPalletScan = (scanned) => {
    setIsQrScannerOpen(false)
    if (!scanned) return
    const trimmed = String(scanned).trim()
    if (handlePalletSelect) {
      handlePalletSelect(trimmed)
    } else {
      setPalletCode(trimmed)
    }
  }

  const currentStage = paramStage || stage
  const hasStage = Boolean(currentStage)
  const hasPo = Boolean(paramPo)
  const hasProduct = Boolean(paramProduct || (selectedProducts && selectedProducts.length > 0))
  const hasSpec = Boolean(spec || (selectedSpecs && selectedSpecs.length > 0))

  const isPoDisabled = readOnly || !hasStage
  const isProductDisabled = readOnly || !hasStage || (targetType === 'po' && !hasPo)
  const isSpecDisabled = readOnly || isProductDisabled || !hasProduct
  const isSampleDisabled = readOnly || !hasStage || (targetType === 'po' && (!hasPo || !hasProduct))

  const poPlaceholder = !hasStage ? 'Chọn công đoạn trước' : 'Nhập hoặc chọn PO...'
  const productPlaceholder = !hasStage ? 'Chọn công đoạn trước' : (targetType === 'po' && !hasPo ? 'Chọn PO trước' : 'Chọn sản phẩm...')
  const specPlaceholder = !hasStage
    ? 'Chọn công đoạn trước'
    : (targetType === 'po' && !hasPo
      ? 'Chọn PO trước'
      : (!hasProduct ? 'Chọn chi tiết trước' : 'Chọn quy cách...'))

  const safeProductOptions = Array.isArray(productOptions) ? productOptions.filter((o) => Boolean(o && o.value)) : []
  const safeSpecOptions = useMemo(() => {
    let opts = Array.isArray(specOptions) ? specOptions.filter((o) => Boolean(o && o.value)) : []
    if (spec && !opts.some((o) => o.value === spec || o.label === spec || o.rawSpec === spec)) {
      opts = [{ value: spec, label: spec, rawSpec: spec }, ...opts]
    }
    return opts
  }, [specOptions, spec])
  // Gom quy cách theo màu (đoạn cuối mã tủ). selectedSpecs vẫn là key các dòng gốc.
  const colorGroupOptions = useMemo(() => (isPaintThickness ? groupSpecOptionsByColor(safeSpecOptions) : []), [safeSpecOptions, isPaintThickness])
  const colorGroupValues = useMemo(() => {
    const selected = new Set((selectedSpecs || []).map(String))
    return colorGroupOptions
      .filter((g) => g.memberValues.length > 0 && g.memberValues.every((v) => selected.has(v)))
      .map((g) => g.value)
  }, [colorGroupOptions, selectedSpecs])
  const handleColorGroupChange = (groupVals) => {
    const keys = colorGroupOptions
      .filter((g) => groupVals.includes(g.value))
      .flatMap((g) => g.memberValues)
    handleMultiSpecChange(keys)
  }
  const safeErrors = Array.isArray(errors) ? errors : []
  const safeSelectedDefectIds = safeErrors.map((e) => e?.defectId || e?.defect_id || (e?.code ? e?.code : null)).filter(Boolean)
  const totalDefects = useMemo(() => safeErrors.reduce((sum, item) => sum + (Number(item.qty) || 0), 0), [safeErrors])

  return (
    <>
      <InspectionFormShell
        title="Kiểm tra thông số"
        subTitle="CL09.3: Phiếu kiểm tra thông số"
        formState={formState}
      >
        {({ renderImageUploadArea, isFormFilled }) => (
        <>
          {/* Lựa chọn 1 trong 2: Theo Mã PO hoặc Theo Mã Pallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px', padding: '4px 0' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#4a240e' }}>
              Kiểm tra theo:
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: readOnly ? 'default' : 'pointer', fontSize: '13.5px', fontWeight: targetType === 'po' ? '700' : '500', color: targetType === 'po' ? '#7B5233' : '#64748b' }}>
              <input
                type="radio"
                name="paramTargetType"
                checked={targetType === 'po'}
                onChange={() => {
                  setTargetType('po')
                  setPalletCode('')
                }}
                disabled={readOnly}
                style={{ accentColor: '#7B5233', width: '16px', height: '16px', cursor: readOnly ? 'default' : 'pointer' }}
              />
              Mã PO
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: readOnly ? 'default' : 'pointer', fontSize: '13.5px', fontWeight: targetType === 'pallet' ? '700' : '500', color: targetType === 'pallet' ? '#7B5233' : '#64748b' }}>
              <input
                type="radio"
                name="paramTargetType"
                checked={targetType === 'pallet'}
                onChange={() => {
                  setTargetType('pallet')
                  setParamPo('')
                }}
                disabled={readOnly}
                style={{ accentColor: '#7B5233', width: '16px', height: '16px', cursor: readOnly ? 'default' : 'pointer' }}
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
                  onSearch={handlePoSearch}
                />
              </div>
            ) : (
              <div className="pv2-field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ margin: 0 }}>Mã Pallet <span className="pv2-req">*</span></label>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setIsQrScannerOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--primary-color, #78523b)',
                        background: 'rgba(120, 82, 59, 0.08)',
                        border: '1px solid rgba(120, 82, 59, 0.2)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        cursor: 'pointer'
                      }}
                    >
                      <ScanLine size={13} /> Quét mã QR
                    </button>
                  )}
                </div>
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

          {/* Hàng 2: Chi tiết / Sản phẩm & Quy cách */}
          <div className="pv2-field-row pv2-field-row--2col" style={{ marginTop: '4px' }}>
            <div className="pv2-field">
              <label>Chi tiết / Sản phẩm <span className="pv2-req">*</span></label>
              {isIncomingStage ? (
                <FormMultiSearchSelect
                  values={selectedProducts || []}
                  options={safeProductOptions}
                  onChange={handleMultiProductChange}
                  placeholder={productPlaceholder}
                  itemType="sản phẩm"
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
                  allowCustomInput={true}
                />
              )}
            </div>
            <div className="pv2-field">
              <label>Quy cách <span className="pv2-req">*</span></label>
              {isPaintThickness ? (
                <FormMultiSearchSelect
                  values={colorGroupValues}
                  options={colorGroupOptions}
                  onChange={handleColorGroupChange}
                  placeholder={specPlaceholder}
                  itemType="màu"
                  required
                  disabled={isSpecDisabled}
                />
              ) : (
                <FormMultiSearchSelect
                  values={selectedSpecs?.length > 0 ? selectedSpecs : (spec ? [spec] : [])}
                  options={safeSpecOptions}
                  onChange={handleMultiSpecChange}
                  placeholder={specPlaceholder}
                  itemType="quy cách"
                  required
                  disabled={isSpecDisabled}
                  allowCustomInput={true}
                />
              )}
            </div>
          </div>

          {/* Hàng: Số lượng sản xuất & Số lượng cần kiểm tra */}
          <div className="pv2-field-row pv2-field-row--2col" style={{ marginTop: '8px' }}>
            <div className="pv2-field">
              <label>Số lượng sản xuất</label>
              <input
                type="text"
                className="pv2-input pv2-input--disabled"
                value={totalBatchQty || requiredQty || paramSample || '—'}
                disabled
                readOnly
                placeholder="—"
              />
            </div>
            <div className="pv2-field">
              <label>Số lượng cần kiểm tra <span className="pv2-req">*</span></label>
              <input
                type="number"
                min="1"
                className={`pv2-input ${isSampleDisabled ? 'pv2-input--disabled' : ''}`}
                value={paramSample || ''}
                onChange={(e) => setParamSample && setParamSample(e.target.value)}
                placeholder={totalBatchQty ? `VD: ${totalBatchQty}` : 'Nhập SL kiểm tra...'}
                disabled={isSampleDisabled}
              />
            </div>
          </div>

          {/* Hàng 3: SL không đạt */}
          <div className="pv2-field-row" style={{ marginTop: '4px' }}>
            <div className="pv2-field">
              <label>SL không đạt</label>
              <input type="number" className="pv2-input pv2-input--disabled" value={paramFail || ''} onChange={(e) => setParamFail && setParamFail(e.target.value)} disabled />
            </div>
          </div>

          {/* Hướng dẫn kiểm tra - luôn hiển thị ngay khi chọn thông số */}
          <div className="pv2-fade-in" style={{ marginTop: 16 }}>
            <div className="pv2-section-title">Hướng dẫn kiểm tra</div>
            <InspectionStepsTable
              steps={steps || []}
              onStepChange={handleStepResultChange}
              sampleQty={paramSample}
              disabled={readOnly}
              mode="parameter"
            />
          </div>

          {/* Phần kết quả / ghi chú / lỗi - chỉ hiện khi đã điền đủ thông tin */}
          {(isFormFilled || readOnly) && (
            <div className="pv2-fade-in" style={{ marginTop: 16 }}>
              {renderImageUploadArea && renderImageUploadArea()}

              <InspectionResultBanner
                result={result}
                onResultChange={setResult}
                disabled={readOnly}
                totalDefects={totalDefects}
              />

              {readOnly && note ? (
                <div className="pv2-field">
                  <label>Ghi chú</label>
                  <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', color: '#334155', fontSize: '13.5px', whiteSpace: 'pre-wrap' }}>
                    {note}
                  </div>
                </div>
              ) : null}

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
                    allDefectOptions={allDefectOptions || []}
                    selectedDefectIds={safeErrors
                      .filter((_, i) => i !== idx)
                      .flatMap((e) => [e?.defectId, e?.defect_id, e?.code, e?.name])
                      .filter(Boolean)}
                    onChange={(r) => updateError(idx, r)}
                    onRemove={safeErrors.length > 1 ? () => removeErrorRow(idx) : null}
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
      )}
      </InspectionFormShell>
      <QRScanner
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onResult={handleInFormPalletScan}
      />
    </>
  )
}

export default CL09C_ParameterView
