import React, { useState, useMemo } from 'react'
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
    po,
    setPo,
    handlePoChange,
    poOptions,
    handlePoSearch,
    palletCode,
    setPalletCode,
    palletOptions,
    product,
    productOptions,
    selectedProducts,
    handleMultiProductChange,
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

  const [targetType, setTargetType] = useState('po') // 'po' | 'pallet'

  const hasStage = Boolean(stage)
  const hasPo = Boolean(po)

  const poPlaceholder = !hasStage ? 'Chọn công đoạn trước' : 'Nhập hoặc chọn PO...'
  const productPlaceholder = !hasStage ? 'Chọn công đoạn trước' : (!hasPo ? 'Chọn PO trước' : 'Chọn sản phẩm / chi tiết...')

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
          {/* Lựa chọn 1 trong 2: Theo Mã PO hoặc Theo Mã Pallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px', padding: '4px 0' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#4a240e' }}>
              Kiểm tra theo:
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13.5px', fontWeight: targetType === 'po' ? '700' : '500', color: targetType === 'po' ? '#7B5233' : '#64748b' }}>
              <input
                type="radio"
                name="targetType"
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
                name="targetType"
                checked={targetType === 'pallet'}
                onChange={() => {
                  setTargetType('pallet')
                  setPo('')
                }}
                disabled={readOnly}
              />
              Mã Pallet
            </label>
          </div>

          {/* Hàng 1: (Mã PO HOẶC Mã Pallet) + Công đoạn */}
          <div className="pv2-field-row pv2-field-row--2col">
            {targetType === 'po' ? (
              <div className="pv2-field">
                <label>Mã PO <span className="pv2-req">*</span></label>
                <CustomSelect
                  value={po}
                  options={poOptions || []}
                  onChange={handlePoChange || setPo}
                  disabled={readOnly}
                  placeholder="Chọn hoặc nhập mã PO..."
                  allowCustomInput={true}
                  onSearch={handlePoSearch}
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

            <div className="pv2-field">
              <label>Công đoạn <span className="pv2-req">*</span></label>
              <CustomSelect
                value={stage}
                options={stageOptions || []}
                onChange={handleStageChange || setStage}
                disabled={readOnly}
                placeholder="Chọn công đoạn..."
              />
            </div>
          </div>

          {/* Hàng 2: Chi tiết / Sản phẩm + Số lượng mẫu kiểm tra */}
          <div className="pv2-field-row pv2-field-row--2col">
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

          {/* Hàng 3: Quy cách (Nhiều quy cách nếu chọn nhiều chi tiết) */}
          {selectedSpecs && selectedSpecs.length > 0 && (
            <div className="pv2-field" style={{ marginTop: '8px' }}>
              <label>Quy cách liên quan:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {selectedSpecs.map((sp, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      backgroundColor: '#FAF5EE',
                      border: '1px solid #EADCC9',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#7B5233',
                    }}
                  >
                    {sp}
                  </span>
                ))}
              </div>
            </div>
          )}

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
                  Vui lòng chọn PO/Pallet, Công đoạn, Sản phẩm và Số lượng mẫu để bắt đầu ghi nhận lỗi.
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
              <div style={{ marginTop: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#4a240e', marginBottom: '4px', display: 'block' }}>
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={note || ''}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={readOnly}
                  placeholder="Nhập ghi chú thêm về nguyên nhân lỗi hoặc lưu ý quy trình..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D6C7B8',
                    fontFamily: 'inherit',
                    fontSize: '13.5px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

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
