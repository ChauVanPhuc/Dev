import React, { useState, useMemo, useEffect } from 'react'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import FormMultiSearchSelect from '@mobile/Shared/Views/components/form/FormMultiSearchSelect'
import { useInspectionFormBase } from '../Controllers/useInspectionFormBase'
import InspectionFormShell from './components/InspectionFormShell'
import ErrorTrendRow from './components/ErrorTrendRow'
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
    handlePoChange,
    poOptions,
    handlePoSearch,
    product,
    productOptions,
    selectedProducts,
    selectedSpecs,
    specOptions,
    handleMultiProductChange,
    handleMultiSpecChange,
    sampleQty,
    setSampleQty,
    note,
    setNote,
    errors,
    defectOptions,
    allDefectOptions,
    updateError,
    removeErrorRow,
    addErrorRow,
  } = formState

  // Đảm bảo chế độ ghi nhận lỗi hằng ngày (DAILY) luôn có SL mẫu mặc định là 100 nếu chưa nhập
  useEffect(() => {
    if (!readOnly && (sampleQty === '' || sampleQty === null || sampleQty === undefined)) {
      setSampleQty('100')
    }
  }, [readOnly, sampleQty, setSampleQty])

  const hasStage = Boolean(stage)
  const hasPo = Boolean(po)
  const hasProduct = Boolean(product || (selectedProducts && selectedProducts.length > 0))

  const isPoDisabled = readOnly || !hasStage
  const isProductDisabled = readOnly || !hasStage || !hasPo
  const isSpecDisabled = readOnly || !hasStage || !hasPo || !hasProduct
  const isSampleDisabled = readOnly || !hasStage || !hasPo || !hasProduct

  const poPlaceholder = !hasStage ? 'Chọn công đoạn trước' : 'Nhập hoặc chọn PO...'
  const productPlaceholder = !hasStage 
    ? 'Chọn công đoạn trước' 
    : (!hasPo ? 'Chọn PO trước' : 'Chọn sản phẩm / chi tiết...')
  const specPlaceholder = !hasStage 
    ? 'Chọn công đoạn trước' 
    : (!hasPo ? 'Chọn PO trước' : (!hasProduct ? 'Chọn chi tiết trước' : 'Chọn quy cách...'))

  const safeProductOptions = Array.isArray(productOptions) ? productOptions.filter((o) => Boolean(o && o.value)) : []
  const safeSpecOptions = Array.isArray(specOptions) ? specOptions.filter((o) => Boolean(o && o.value)) : []

  // Tự động tính toán tổng số lỗi & tỷ lệ lỗi %
  const totalDefects = useMemo(() => {
    if (!Array.isArray(errors)) return 0
    return errors.reduce((sum, e) => sum + (Number(e.qty) || 0), 0)
  }, [errors])

  const totalInspected = Number(sampleQty) > 0 ? Number(sampleQty) : 100
  const defectRate = useMemo(() => {
    if (totalInspected <= 0) return '0.00'
    return ((totalDefects / totalInspected) * 100).toFixed(2)
  }, [totalDefects, totalInspected])

  // Lấy các ID lỗi đã được chọn ở các dòng
  const selectedDefectIds = useMemo(() => {
    if (!Array.isArray(errors)) return []
    return errors.map((e) => e.defectId || e.defect_id || (e.code ? e.code : null)).filter(Boolean)
  }, [errors])

  return (
    <InspectionFormShell
      title="Ghi nhận lỗi hằng ngày"
      subTitle="CL09.6: Phiếu ghi nhận lỗi hằng ngày"
      formState={formState}
    >
      {({ renderImageUploadArea, isFormFilled }) => (
        <>
          {/* Hàng 1: Mã PO + Số lượng mẫu kiểm tra */}
          <div className="pv2-field-row pv2-field-row--2col">
            <div className="pv2-field">
              <label>Mã PO <span className="pv2-req">*</span></label>
              <CustomSelect
                value={po}
                options={poOptions || []}
                onChange={handlePoChange || setPo}
                disabled={isPoDisabled}
                placeholder={poPlaceholder}
                allowCustomInput={true}
                onSearch={handlePoSearch}
              />
            </div>

            <div className="pv2-field">
              <label>SL mẫu kiểm tra <span className="pv2-req">*</span></label>
              <input
                type="number"
                min="1"
                className={`pv2-input ${isSampleDisabled ? 'pv2-input--disabled' : ''}`}
                value={sampleQty || ''}
                onChange={(e) => setSampleQty(e.target.value)}
                placeholder="VD: 100"
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

          {/* Hàng 2: Chi tiết / Sản phẩm & Quy cách (2 cột) */}
          <div className="pv2-field-row pv2-field-row--2col" style={{ marginTop: '8px' }}>
            <div className="pv2-field">
              <label>Chi tiết / Sản phẩm <span className="pv2-req">*</span></label>
              <FormMultiSearchSelect
                values={selectedProducts || []}
                options={safeProductOptions}
                onChange={handleMultiProductChange}
                placeholder={productPlaceholder}
                itemType="sản phẩm"
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
                disabled={isSpecDisabled}
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
                  Vui lòng chọn PO, Công đoạn, Sản phẩm và Số lượng mẫu để bắt đầu ghi nhận lỗi.
                </span>
              </div>
            </div>
          ) : (
            <div className="pv2-fade-in">
              {/* Banner Thống Kê Tổng Số Lỗi & Tỷ Lệ Lỗi Realtime */}
              <div
                style={{
                  marginTop: '12px',
                  marginBottom: '14px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: Number(defectRate) > 0 ? '#FFFBEB' : '#F0FDF4',
                  border: `1.5px solid ${Number(defectRate) > 0 ? '#FDE68A' : '#BBF7D0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {Number(defectRate) > 0 ? (
                    <AlertTriangle size={18} style={{ color: '#D97706' }} />
                  ) : (
                    <CheckCircle2 size={18} style={{ color: '#16A34A' }} />
                  )}
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                      Kết quả:
                    </span>{' '}
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: '800',
                        color: Number(defectRate) > 0 ? '#DC2626' : '#16A34A',
                      }}
                    >
                      {Number(defectRate) > 0 ? `Không đạt (${totalDefects} lỗi)` : 'Đạt chuẩn (0 lỗi)'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12.5px', color: '#475569' }}>
                    Tổng lỗi: <strong style={{ color: '#DC2626' }}>{totalDefects}</strong>/{totalInspected}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: Number(defectRate) > 0 ? '#FEF3C7' : '#DCFCE7',
                      color: Number(defectRate) > 0 ? '#B45309' : '#15803D',
                      border: `1px solid ${Number(defectRate) > 0 ? '#FCD34D' : '#86EFAC'}`,
                    }}
                  >
                    Tỷ lệ lỗi: {defectRate}%
                  </span>
                </div>
              </div>

              {/* Danh Sách Chọn Lỗi Theo Công Đoạn */}
              <div style={{ marginTop: '14px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <label style={{ fontSize: '13.5px', fontWeight: '800', color: '#4a240e' }}>
                    Danh sách lỗi công đoạn {stage ? `(${stage})` : ''}
                  </label>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={addErrorRow}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#FAF5EE',
                        border: '1.5px solid #7B5233',
                        color: '#7B5233',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Plus size={14} /> Thêm loại lỗi
                    </button>
                  )}
                </div>

                {Array.isArray(errors) && errors.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {errors.map((row, idx) => (
                      <ErrorTrendRow
                        key={row.id || idx}
                        row={row}
                        onChange={(updatedRow) => updateError(idx, updatedRow)}
                        onRemove={() => removeErrorRow(idx)}
                        disabled={readOnly}
                        defectOptions={defectOptions || []}
                        allDefectOptions={allDefectOptions || []}
                        selectedDefectIds={errors
                          .filter((_, i) => i !== idx)
                          .flatMap((e) => [e?.defectId, e?.defect_id, e?.code, e?.name])
                          .filter(Boolean)}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '14px',
                      textAlign: 'center',
                      backgroundColor: '#FAF6F0',
                      borderRadius: '8px',
                      border: '1px dashed #EADCC9',
                      color: '#7B5233',
                      fontSize: '13px',
                    }}
                  >
                    Chưa có lỗi nào được ghi nhận cho công đoạn này.
                  </div>
                )}
              </div>

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

              <div style={{ marginTop: '14px' }}>
                {renderImageUploadArea()}
              </div>
            </div>
          )}
        </>
      )}
    </InspectionFormShell>
  )
}

export default CL09F_DailyInspectionView
