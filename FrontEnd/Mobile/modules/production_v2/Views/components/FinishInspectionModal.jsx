import { useState, useEffect, useRef } from 'react'
import { X, ShoppingCart, Loader2 } from 'lucide-react'

const isInvalidSpec = (spec) => {
  if (!spec) return true
  const str = String(spec).trim()
  if (!str) return true
  if (/^[\s*_\-—–.,/\\#]+$/.test(str)) return true
  if (/^0(?:\s*[*xX×]\s*0)*$/i.test(str)) return true
  const lower = str.toLowerCase()
  if (['tiêu chuẩn', 'quy cách tiêu chuẩn', 'quy cách thành phẩm', 'n/a', 'na', 'none', 'null', 'undefined', '—', '–'].includes(lower)) {
    return true
  }
  return false
}

const parseDimensionStringFromText = (text) => {
  if (!text) return null
  const str = String(text)
  const m3d = str.match(/(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm|\s*cm)?)/i)
  if (m3d) return m3d[1].replace(/\s*/g, '')
  const mHw = str.match(/(\b\d{4,5}\s*[-–—*xX×]\s*\d{3,4}(?:mm|cm)?\b)/i)
  if (mHw) return mHw[1].replace(/\s*/g, '')
  const m2d = str.match(/(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm|\s*cm)?)/i)
  if (m2d) return m2d[1].replace(/\s*/g, '')
  const mBolt = str.match(/([MØOD]?\d+(?:[.,]\d+)?\s*[*xX×-]\s*\d+(?:[.,]\d+)?(?:\s*mm)?)/i)
  if (mBolt) return mBolt[1].replace(/\s*/g, '')
  const mCode = str.match(/(\b[A-Z0-9]{2,6}\s*[-–—]\s*\d{2,4}(?:mm|cm)?\b)/i)
  if (mCode) return mCode[1].replace(/\s*/g, '')
  // 6. Single size with unit: e.g. 350mm, 50cm (chỉ chấp nhận mm hoặc cm, không match đơn vị 'm' để tránh nhầm các từ tiếng Việt như 'mặt', 'màu', 'mép')
  const mUnit = str.match(/(?:^|[^\p{L}\d])(\d+(?:[.,]\d+)?\s*(?:mm|cm))(?:$|[^\p{L}\d])/iu)
  if (mUnit) return mUnit[1].replace(/\s*/g, '')
  return null
}

const getEffectiveSpec = (specRaw, partName) => {
  // 1. Ưu tiên hàng đầu: Lấy quy cách thực tế đã có trong CSDL (specRaw)
  if (specRaw && !isInvalidSpec(specRaw)) {
    return String(specRaw).trim()
  }
  // 2. Dự phòng: Nếu CSDL không có hoặc invalid, mới trích xuất kích thước từ tên chi tiết (partName)
  const dimStr = parseDimensionStringFromText(partName)
  if (dimStr && !isInvalidSpec(dimStr)) return dimStr

  return 'Tiêu chuẩn'
}

const cleanCabinetTag = (tag, fallback = '') => {
  if (!tag) return fallback
  const str = String(tag).trim()
  const cleaned = str.replace(/^[A-Za-z0-9]+-\d+(?:-[A-Za-z0-9]+)?\s*\|\s*/i, '').trim()
  return cleaned || fallback
}

const FinishInspectionModal = ({ open, summary, palletCode, onConfirm, onClose, onCreatePallet, isReInspect = false }) => {
  const [confirmCheck, setConfirmCheck] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedAction, setSelectedAction] = useState('chap-nhan')
  const [modalNote, setModalNote] = useState('')
  const [actionError, setActionError] = useState('')

  const isTicketFailed = Boolean(summary?.isFailed || Number(summary?.errorQty) > 0 || summary?.result === 'fail')

  const [currentResult, setCurrentResult] = useState(() => {
    return isTicketFailed ? 'fail' : 'pass'
  })

  const prevOpenRef = useRef(false)

  useEffect(() => {
    // Chỉ khởi tạo lại dữ liệu modal khi modal chuyển từ đóng sang mở
    if (open && !prevOpenRef.current) {
      setConfirmCheck(isReInspect || Boolean(palletCode))
      if (!isReInspect && !palletCode && onCreatePallet) {
        handleCreatePalletClick()
      }
      const initialTicketResult = isTicketFailed ? 'fail' : 'pass'
      setCurrentResult(initialTicketResult)

      if (summary?.action === 'cach-ly') {
        setSelectedAction('cach-ly')
      } else if (initialTicketResult === 'pass') {
        setSelectedAction('chap-nhan')
      } else {
        setSelectedAction('tra-ve')
      }
      setModalNote(summary?.note || '')
      setActionError('')
    }
    prevOpenRef.current = open
  }, [open, isReInspect, palletCode, onCreatePallet, summary, isTicketFailed])

  // Cập nhật trạng thái confirmCheck khi mã pallet được tạo thành công
  useEffect(() => {
    if (open && palletCode) {
      setConfirmCheck(true)
    }
  }, [open, palletCode])

  const handleCreatePalletClick = async () => {
    if (onCreatePallet && !creating) {
      setCreating(true)
      try {
        await onCreatePallet()
        setConfirmCheck(true)
      } finally {
        setCreating(false)
      }
    }
  }

  const handleConfirmSubmit = () => {
    if (selectedAction === 'cach-ly' && (!modalNote || !modalNote.trim())) {
      setActionError('Vui lòng nhập lý do cách ly!')
      return
    }
    const computedResult = (selectedAction === 'tra-ve')
      ? 'fail'
      : currentResult
    onConfirm({
      ...summary,
      palletCode: palletCode || '',
      action: selectedAction,
      result: computedResult,
      note: modalNote.trim() ? modalNote.trim() : (summary?.note || ''),
      confirmed: isReInspect || confirmCheck
    })
  }

  if (!open) return null

  return (
    <div className="pv2-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div className="pv2-modal" style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '460px',
        borderRadius: '20px',
        padding: '20px 24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        position: 'relative',
        animation: 'modalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        boxSizing: 'border-box',
        maxHeight: 'calc(100dvh - 32px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes modalFadeIn {
            from { transform: scale(0.92); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}} />

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '800',
            color: '#1e293b'
          }}>
            CL09.2: Hoàn thành kiểm tra
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#334155',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Form Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box', overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
          
          {/* Row 1: PO + Kết quả */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                PO
              </label>
              <div
                title={summary?.poCode || ''}
                style={{
                  backgroundColor: '#e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: '#1e293b',
                  minHeight: '40px',
                  boxSizing: 'border-box',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: '20px'
                }}
              >
                {summary?.poCode || '—'}
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                Kết quả
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                height: '40px',
              }}>
                {selectedAction === 'cach-ly' ? (
                  <div style={{
                    display: 'inline-flex',
                    backgroundColor: '#f1f5f9',
                    padding: '3px',
                    borderRadius: '8px',
                    gap: '3px',
                    border: '1px solid #e2e8f0',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <button
                      type="button"
                      onClick={() => setCurrentResult('pass')}
                      style={{
                        flex: 1,
                        padding: '6px 6px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        border: 'none',
                        backgroundColor: currentResult === 'pass' ? '#10b981' : 'transparent',
                        color: currentResult === 'pass' ? '#ffffff' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: currentResult === 'pass' ? '0 1px 3px rgba(16, 185, 129, 0.3)' : 'none',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ✓ Đạt
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentResult('fail')}
                      style={{
                        flex: 1,
                        padding: '6px 6px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        border: 'none',
                        backgroundColor: currentResult === 'fail' ? '#ef4444' : 'transparent',
                        color: currentResult === 'fail' ? '#ffffff' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: currentResult === 'fail' ? '0 1px 3px rgba(239, 68, 68, 0.3)' : 'none',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ✕ K.đạt
                    </button>
                  </div>
                ) : (
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: currentResult === 'pass' ? '#15803d' : '#dc2626',
                    backgroundColor: currentResult === 'pass' ? '#dcfce7' : '#fee2e2',
                    border: currentResult === 'pass' ? '1px solid #86efac' : '1px solid #fca5a5',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    {currentResult === 'pass' ? '✓ Đạt' : '✕ Không đạt'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Row 1.5: Hành động xử lý (Chọn 1 trong 3: Chấp nhận, Cách Ly, Trả hàng) */}
          <div style={{
            backgroundColor: '#faf6f0',
            border: '1.5px solid #e8d7c3',
            borderRadius: '12px',
            padding: '12px 14px',
            boxSizing: 'border-box'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <label style={{ fontSize: '13px', fontWeight: '800', color: '#4a2810', textTransform: 'uppercase', letterSpacing: '0.3px', margin: 0 }}>
                Hành động xử lý <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span style={{ fontSize: '11.5px', color: '#8c6d58', fontWeight: '600' }}>(Chọn 1 trong 3)</span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px'
            }}>
              {/* Option 1: Chấp nhận (hoặc Chấp nhận / Tự xử lý khi có lỗi) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedAction('chap-nhan')
                  if (isTicketFailed) {
                    setCurrentResult('fail')
                  } else {
                    setCurrentResult('pass')
                  }
                  setActionError('')
                }}
                style={{
                  padding: '7px 4px',
                  borderRadius: '10px',
                  fontSize: isTicketFailed ? '12px' : '13px',
                  fontWeight: '700',
                  border: selectedAction === 'chap-nhan' || selectedAction === 'luu-kho' ? '2px solid #10b981' : '1.5px solid #d1d5db',
                  backgroundColor: selectedAction === 'chap-nhan' || selectedAction === 'luu-kho' ? '#ecfdf5' : '#ffffff',
                  color: selectedAction === 'chap-nhan' || selectedAction === 'luu-kho' ? '#047857' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedAction === 'chap-nhan' || selectedAction === 'luu-kho' ? '0 2px 6px rgba(16, 185, 129, 0.2)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  minHeight: '44px',
                  textAlign: 'center'
                }}
              >
                {(selectedAction === 'chap-nhan' || selectedAction === 'luu-kho') && <span style={{ fontSize: '14px' }}>✓</span>}
                {isTicketFailed ? (
                  <span style={{ lineHeight: '1.2' }}>
                    Chấp nhận<br />
                    <span style={{ fontSize: '10.5px', fontWeight: '600', opacity: 0.9 }}>/ Tự xử lý</span>
                  </span>
                ) : (
                  <span>Chấp nhận</span>
                )}
              </button>

              {/* Option 2: Cách Ly */}
              <button
                type="button"
                onClick={() => {
                  if (selectedAction === 'tra-ve') {
                    setCurrentResult('fail')
                  } else if (selectedAction === 'chap-nhan' || selectedAction === 'luu-kho') {
                    setCurrentResult(isTicketFailed ? 'fail' : 'pass')
                  }
                  setSelectedAction('cach-ly')
                  setActionError('')
                }}
                style={{
                  padding: '7px 4px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  border: selectedAction === 'cach-ly' ? '2px solid #f59e0b' : '1.5px solid #d1d5db',
                  backgroundColor: selectedAction === 'cach-ly' ? '#fffbeb' : '#ffffff',
                  color: selectedAction === 'cach-ly' ? '#b45309' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedAction === 'cach-ly' ? '0 2px 6px rgba(245, 158, 11, 0.2)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  minHeight: '44px'
                }}
              >
                {selectedAction === 'cach-ly' && <span style={{ fontSize: '14px' }}>⚠</span>}
                Cách Ly
              </button>

              {/* Option 3: Trả hàng */}
              <button
                type="button"
                onClick={() => {
                  setSelectedAction('tra-ve')
                  setCurrentResult('fail')
                  setActionError('')
                }}
                style={{
                  padding: '7px 4px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  border: selectedAction === 'tra-ve' ? '2px solid #ef4444' : '1.5px solid #d1d5db',
                  backgroundColor: selectedAction === 'tra-ve' ? '#fef2f2' : '#ffffff',
                  color: selectedAction === 'tra-ve' ? '#b91c1c' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedAction === 'tra-ve' ? '0 2px 6px rgba(239, 68, 68, 0.2)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  minHeight: '44px'
                }}
              >
                {selectedAction === 'tra-ve' && <span style={{ fontSize: '14px' }}>✕</span>}
                Trả hàng
              </button>
            </div>

            {/* Nếu chọn Chấp nhận khi phiếu có lỗi: hiển thị ô nhập phương án tự xử lý (tùy chọn) */}
            {selectedAction === 'chap-nhan' && isTicketFailed && (
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#047857', marginBottom: '4px' }}>
                  Phương án tự xử lý / Ghi chú
                </label>
                <input
                  type="text"
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Nhập phương án xử lý lỗi tại chỗ (nếu có)..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #10b981',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>
            )}

            {/* Nếu chọn Cách Ly: hiển thị ô nhập lý do */}
            {selectedAction === 'cach-ly' && (
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#b45309', marginBottom: '4px' }}>
                  Lý do cách ly <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={modalNote}
                  onChange={(e) => {
                    setModalNote(e.target.value)
                    if (e.target.value.trim()) setActionError('')
                  }}
                  placeholder="Nhập lý do cách ly, vị trí lưu kho tạm..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: actionError ? '1.5px solid #ef4444' : '1px solid #f59e0b',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                {actionError && (
                  <div style={{ color: '#ef4444', fontSize: '11.5px', fontWeight: '600', marginTop: '3px' }}>
                    {actionError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 2: Bảng Chi Tiết Linh Kiện & Quy Cách Kiểm Tra */}
          {(() => {
            let rawList = []
            if (summary?.partsDetails && Array.isArray(summary.partsDetails) && summary.partsDetails.length > 0) {
              rawList = summary.partsDetails
            } else if (summary?.parts_details && Array.isArray(summary.parts_details) && summary.parts_details.length > 0) {
              rawList = summary.parts_details
            } else if (summary?.product && summary.product !== '—') {
              rawList = [{
                part_name: summary.product,
                specification: summary.spec,
                cabinet: summary.cabinet || summary.product_label || summary.badge || ''
              }]
            }

            const partsList = []
            rawList.forEach((item) => {
              const pName = (item.part_name || item.name || item.product || '').trim()
              const pSpec = (item.specification || item.spec || '').trim()
              if (!pName || pName === '—') return

              const matched = getEffectiveSpec(pSpec, pName)
              const cab = cleanCabinetTag(item.cabinet || item.product_label || item.badge || item.product_sku || item.sku || summary?.cabinet || '')
              partsList.push({
                name: pName,
                spec: matched,
                cabinet: cab
              })
            })

            if (partsList.length === 0) {
              const fallbackName = summary?.product || '—'
              const fallbackSpec = getEffectiveSpec(summary?.spec, fallbackName)
              const fallbackCab = cleanCabinetTag(summary?.cabinet || summary?.product_label || summary?.badge || '')
              partsList.push({ name: fallbackName, spec: fallbackSpec, cabinet: fallbackCab })
            }

            return (
              <div style={{ width: '100%', boxSizing: 'border-box' }}>
                <div style={{
                  fontSize: '12px',
                  color: '#5C381E',
                  fontWeight: '800',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>DANH SÁCH CHI TIẾT LINH KIỆN & QUY CÁCH KIỂM TRA ({partsList.length})</span>
                </div>
                <div style={{
                  border: '1.5px solid #EADCC9',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  maxHeight: '170px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  <table style={{ width: '100%', minWidth: '380px', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
                        <th style={{ padding: '7px 8px', textAlign: 'center', color: '#7B5233', fontWeight: '800', fontSize: '11.5px', width: '32px' }}>STT</th>
                        <th style={{ padding: '7px 8px', textAlign: 'left', color: '#7B5233', fontWeight: '800', fontSize: '11.5px' }}>Tên Chi Tiết Linh Kiện</th>
                        <th style={{ padding: '7px 8px', textAlign: 'left', color: '#7B5233', fontWeight: '800', fontSize: '11.5px', whiteSpace: 'nowrap' }}>Tên tủ (SKU)</th>
                        <th style={{ padding: '7px 8px', textAlign: 'right', color: '#7B5233', fontWeight: '800', fontSize: '11.5px', whiteSpace: 'nowrap' }}>Quy Cách (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partsList.map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < partsList.length - 1 ? '1px solid #F3EBE1' : 'none' }}>
                          <td style={{ padding: '8px 8px', color: '#8D6E63', fontWeight: '600', width: '32px', textAlign: 'center', verticalAlign: 'middle' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '8px 8px', color: '#2D1A12', fontWeight: '700', verticalAlign: 'middle' }}>
                            {p.name}
                          </td>
                          <td style={{ padding: '8px 8px', verticalAlign: 'middle' }}>
                            {p.cabinet ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: '11px',
                                padding: '2px 7px',
                                borderRadius: '5px',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                fontWeight: '600',
                                border: '1px solid #bfdbfe',
                                whiteSpace: 'nowrap',
                                maxWidth: '160px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }} title={p.cabinet}>
                                {p.cabinet}
                              </span>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', verticalAlign: 'middle' }}>
                            <span style={{
                              backgroundColor: '#FAF6F0',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #EADCC9',
                              fontFamily: 'monospace, monospace',
                              fontWeight: '800',
                              color: '#7B5233',
                              fontSize: '12px',
                              display: 'inline-block'
                            }}>
                              {p.spec || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          {/* Row 3: SL Cần Kiểm (minmax) + SL mẫu (minmax) + Lỗi nếu có (minmax) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                SL Cần Kiểm
              </label>
              <div style={{
                backgroundColor: '#e2e8f0',
                borderRadius: '10px',
                padding: '10px 8px',
                fontSize: '13.5px',
                fontWeight: '600',
                color: '#1e293b',
                minHeight: '40px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {summary?.needQty ?? '—'}
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                SL mẫu
              </label>
              <div style={{
                backgroundColor: '#e2e8f0',
                borderRadius: '10px',
                padding: '10px 8px',
                fontSize: '13.5px',
                fontWeight: '600',
                color: '#1e293b',
                minHeight: '40px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {summary?.sampleQty ?? '—'}
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                Lỗi (nếu có)
              </label>
              <div style={{
                backgroundColor: '#e2e8f0',
                borderRadius: '10px',
                padding: '10px 8px',
                fontSize: '13.5px',
                fontWeight: '600',
                color: '#1e293b',
                minHeight: '40px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {summary?.errorQty ?? '0'}
              </div>
            </div>
          </div>

          {/* Pallet Confirmation Section (Chỉ hiển thị khi Kiểm tra lần đầu) */}
          {!isReInspect && (
            <div style={{ marginTop: '8px', width: '100%', boxSizing: 'border-box' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#0f172a',
                cursor: 'pointer',
                marginBottom: '12px'
              }}>
                <input
                  type="checkbox"
                  checked={confirmCheck}
                  onChange={(e) => setConfirmCheck(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#3b2314',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                />
                <span>Xác nhận hoàn thành kiểm tra cho mã Pallet:</span>
              </label>

              {/* Pallet Code Creation & Display Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <button
                  type="button"
                  onClick={handleCreatePalletClick}
                  disabled={creating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: creating ? '#64748b' : '#3b2314',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 10px rgba(59, 35, 20, 0.2)',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {creating ? (
                    <>
                      <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Đang tạo...
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={15} /> Tạo mã pallet
                    </>
                  )}
                </button>

                <div style={{
                  flex: 1,
                  padding: '8px 10px',
                  background: '#fbf5ed',
                  border: '1.5px dashed #d4a574',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 0
                }}>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '800',
                    color: '#2b1810',
                    letterSpacing: '0.3px',
                    textAlign: 'center',
                    wordBreak: 'break-word',
                    lineHeight: '1.2'
                  }}>
                    {palletCode || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '24px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1.5px solid #3b2314',
              backgroundColor: '#ffffff',
              color: '#3b2314',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={!isReInspect && !confirmCheck}
            onClick={handleConfirmSubmit}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#3b2314',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: '700',
              cursor: (isReInspect || confirmCheck) ? 'pointer' : 'not-allowed',
              opacity: (isReInspect || confirmCheck) ? 1 : 0.45,
              boxShadow: (isReInspect || confirmCheck) ? '0 4px 12px rgba(59, 35, 20, 0.3)' : 'none'
            }}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  )
}

export default FinishInspectionModal
