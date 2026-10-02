import React, { useState, useMemo } from 'react'
import FormMultiSearchSelect from '@mobile/Shared/Views/components/form/FormMultiSearchSelect'
import { useInspectionFormBase } from '../Controllers/useInspectionFormBase'
import InspectionFormShell from './components/InspectionFormShell'
import ErrorTrendRow from './components/ErrorTrendRow'
import InspectionResultBanner from './components/InspectionResultBanner'
import { INSPECT_MODES } from '../constants'
import { Plus, AlertTriangle, CheckCircle2, ClipboardCheck } from 'lucide-react'

const CL09F_DailyInspectionView = () => {
  const formState = useInspectionFormBase(INSPECT_MODES.DAILY)

  const {
    readOnly,
    stage,
    setStage,
    handleStageChange,
    stageOptions,
    po,
    setPo,
    selectedPos,
    handleMultiPoChange,
    poOptions,
    handlePoSearch,
    product,
    setProduct,
    productOptions,
    selectedProducts,
    handleMultiProductChange,
    spec,
    setSpec,
    selectedSpecs,
    setSelectedSpecs,
    specOptions,
    handleMultiSpecChange,
    requiredQty,
    setRequiredQty,
    totalBatchQty,
    setTotalBatchQty,
    sampleQty,
    setSampleQty,
    recheckQty,
    setRecheckQty,
    result,
    setResult,
    note,
    setNote,
    errors,
    defectOptions,
    allDefectOptions,
    updateError,
    removeErrorRow,
    addErrorRow,
  } = formState

  const isComponentStage = stage && ['tạo phôi', 'phôi', 'định hình', 'lắp ráp'].some(s => stage.toLowerCase().includes(s))
  const isPackagingStage = stage && ['đóng gói', 'dong goi', 'bao bì', 'đóng thùng'].some(s => stage.toLowerCase().includes(s))
  const itemLabel = isPackagingStage ? 'Sản phẩm (Tủ)' : (isComponentStage ? 'Chi tiết' : 'Chi tiết / Sản phẩm')

  const hasStage = Boolean(stage)
  const hasPo = Boolean((selectedPos && selectedPos.length > 0) || po)
  const hasProduct = Boolean(product || (selectedProducts && selectedProducts.length > 0))
  const hasSpec = Boolean(spec || (selectedSpecs && selectedSpecs.length > 0))

  const isPoDisabled = readOnly || !hasStage
  const isProductDisabled = readOnly || !hasStage || !hasPo
  const isSpecDisabled = readOnly || !hasStage || !hasPo || !hasProduct
  const isSampleDisabled = readOnly || !hasStage || !hasPo || !hasProduct
  const isRecheckDisabled = readOnly || !hasStage || !hasPo || !hasProduct

  const poPlaceholder = !hasStage ? 'Chọn công đoạn trước' : 'Nhập hoặc chọn PO...'
  const productPlaceholder = !hasStage 
    ? 'Chọn công đoạn trước' 
    : (!hasPo ? 'Chọn PO trước' : `Chọn ${itemLabel.toLowerCase()}...`)
  const specPlaceholder = !hasStage 
    ? 'Chọn công đoạn trước' 
    : (!hasPo ? 'Chọn PO trước' : (!hasProduct ? `Chọn ${itemLabel.toLowerCase()} trước` : 'Chọn quy cách...'))

  const safeProductOptions = useMemo(() => {
    return Array.isArray(productOptions) ? productOptions.filter((o) => Boolean(o && o.value)) : []
  }, [productOptions])

  const safeSpecOptions = useMemo(() => {
    return Array.isArray(specOptions) ? specOptions.filter((o) => Boolean(o && o.value)) : []
  }, [specOptions])

  // Đảm bảo options của PO không bị trùng lặp
  const safePoOptions = useMemo(() => {
    if (!Array.isArray(poOptions)) return []
    const seen = new Set()
    return poOptions.filter((opt) => {
      const val = typeof opt === 'string' ? opt : opt?.value
      if (!val || seen.has(val)) return false
      seen.add(val)
      return true
    })
  }, [poOptions])

  // Tính toán tổng số lỗi và tỷ lệ lỗi realtime
  const totalDefects = useMemo(() => {
    if (!Array.isArray(errors)) return 0
    return errors.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
  }, [errors])

  const totalInspected = Number(sampleQty) || 0

  const defectRate = useMemo(() => {
    if (totalInspected <= 0 || totalDefects <= 0) return 0
    return ((totalDefects / totalInspected) * 100).toFixed(1)
  }, [totalDefects, totalInspected])

  // Lấy các ID lỗi đã được chọn ở các dòng
  const selectedDefectIds = useMemo(() => {
    if (!Array.isArray(errors)) return []
    return errors.map((e) => e.defectId || e.defect_id || (e.code ? e.code : null)).filter(Boolean)
  }, [errors])

  // Đảm bảo luôn có ít nhất 1 dòng lỗi sẵn sàng như các trang khác
  const safeErrors = useMemo(() => {
    return Array.isArray(errors) && errors.length > 0 ? errors : [{ id: 1, name: '', qty: 0 }]
  }, [errors])

  return (
    <InspectionFormShell
      title="Ghi nhận lỗi hằng ngày"
      subTitle="CL09.6: Phiếu ghi nhận lỗi hằng ngày"
      formState={formState}
    >
      {({ renderImageUploadArea, isFormFilled }) => (
        <>
          {/* Hàng 1: Mã PO (cho phép chọn nhiều PO) */}
          <div className="pv2-field-row" style={{ marginTop: '4px' }}>
            <div className="pv2-field" style={{ width: '100%' }}>
              <label>Mã PO <span className="pv2-req">*</span></label>
              <FormMultiSearchSelect
                values={selectedPos || []}
                options={safePoOptions}
                onChange={handleMultiPoChange}
                disabled={isPoDisabled}
                placeholder={poPlaceholder}
                itemType="PO"
                required
                allowCustomInput={false}
                onSearch={handlePoSearch}
              />
            </div>
          </div>

          {/* Hàng 2: Chi tiết / Sản phẩm & Quy cách */}
          <div className="pv2-field-row pv2-field-row--2col" style={{ marginTop: '8px' }}>
            <div className="pv2-field">
              <label>{itemLabel} <span className="pv2-req">*</span></label>
              <FormMultiSearchSelect
                values={selectedProducts || []}
                options={safeProductOptions}
                onChange={handleMultiProductChange}
                placeholder={productPlaceholder}
                itemType={itemLabel.toLowerCase()}
                required
                disabled={isProductDisabled}
              />
            </div>
            <div className="pv2-field">
              <label>Quy cách <span className="pv2-req">*</span></label>
              <FormMultiSearchSelect
                values={selectedSpecs || []}
                options={safeSpecOptions}
                onChange={handleMultiSpecChange}
                placeholder={specPlaceholder}
                itemType="quy cách"
                required
                disabled={isSpecDisabled}
              />
            </div>
          </div>

          {/* Hàng 3: Số lượng sản xuất & Số lượng cần kiểm tra */}
          <div className="pv2-field-row pv2-field-row--2col" style={{ marginTop: '8px' }}>
            <div className="pv2-field">
              <label>Số lượng sản xuất</label>
              <input
                type="text"
                className="pv2-input pv2-input--disabled"
                value={totalBatchQty !== '' && totalBatchQty !== null && totalBatchQty !== undefined ? totalBatchQty : '—'}
                disabled
                readOnly
                placeholder="—"
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #EADCC9',
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'not-allowed',
                }}
              />
            </div>
            <div className="pv2-field">
              <label>Số lượng cần kiểm tra <span className="pv2-req">*</span></label>
              <input
                type="number"
                min="1"
                className={`pv2-input ${isSampleDisabled ? 'pv2-input--disabled' : ''}`}
                value={sampleQty || ''}
                onChange={(e) => {
                  setSampleQty(e.target.value)
                  if (setRequiredQty) setRequiredQty(e.target.value)
                }}
                placeholder={totalBatchQty ? `VD: ${totalBatchQty}` : 'Nhập SL kiểm tra...'}
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

          {/* Hàng 3: Số lượng cần kiểm tra lại */}
          <div className="pv2-field-row" style={{ marginTop: '8px' }}>
            <div className="pv2-field">
              <label>Số lượng cần kiểm tra lại</label>
              <input
                type="number"
                min="0"
                className={`pv2-input ${isRecheckDisabled ? 'pv2-input--disabled' : ''}`}
                value={recheckQty || ''}
                onChange={(e) => setRecheckQty(e.target.value)}
                placeholder="VD: 10"
                disabled={isRecheckDisabled}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #EADCC9',
                  backgroundColor: isRecheckDisabled ? '#F8FAFC' : '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2D1A12',
                }}
              />
            </div>
          </div>

          {/* Tiến trình: Danh sách lỗi chỉ xuất hiện khi đã điền thông tin phiếu */}
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
                  Bước 2: Điền thông tin ghi nhận lỗi
                </span>
                <span style={{ color: '#78716c' }}>
                  Vui lòng chọn PO, Công đoạn và {itemLabel} để bắt đầu ghi nhận lỗi.
                </span>
              </div>
            </div>
          ) : (
            <div className="pv2-fade-in">
              {/* Banner Kết Quả & Tổng Số Lỗi (Chuẩn Ảnh 1) */}
              <InspectionResultBanner
                result={result}
                onResultChange={setResult}
                disabled={readOnly}
                totalDefects={totalDefects}
              />

              {/* Hình ảnh kiểm tra (dời lên trên lỗi như các phiếu khác) */}
              {renderImageUploadArea && renderImageUploadArea()}

              {/* Ghi chú */}
              {readOnly && note ? (
                <div style={{ marginTop: '14px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#4a240e', marginBottom: '4px', display: 'block' }}>
                    Ghi chú
                  </label>
                  <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', color: '#334155', fontSize: '13.5px', whiteSpace: 'pre-wrap' }}>
                    {note}
                  </div>
                </div>
              ) : null}

              {/* Danh Sách Lỗi (Đồng bộ chuẩn pv2-error-section theo các trang khác) */}
              <div className="pv2-error-section" style={{ marginTop: '14px' }}>
                <div className="pv2-section-title">Theo dõi xu hướng lỗi {stage ? `(${stage})` : ''}</div>
                <div className="pv2-error-table-header">
                  <span>Tên lỗi</span>
                  <span>SL Ghi nhận</span>
                </div>
                {safeErrors.map((row, idx) => (
                  <ErrorTrendRow
                    key={row.id || idx}
                    row={row}
                    onChange={(updatedRow) => updateError(idx, updatedRow)}
                    onRemove={safeErrors.length > 1 ? () => removeErrorRow(idx) : null}
                    disabled={readOnly}
                    defectOptions={defectOptions || []}
                    allDefectOptions={allDefectOptions || []}
                    selectedDefectIds={safeErrors
                      .filter((_, i) => i !== idx)
                      .flatMap((e) => [e?.defectId, e?.defect_id, e?.code, e?.name])
                      .filter(Boolean)}
                  />
                ))}
                {!readOnly && (
                  <button
                    type="button"
                    className="pv2-btn-add-image-link"
                    onClick={addErrorRow}
                    style={{ marginTop: 6 }}
                  >
                    <Plus size={14} /> Ghi nhận lỗi khác
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </InspectionFormShell>
  )
}

export default CL09F_DailyInspectionView
