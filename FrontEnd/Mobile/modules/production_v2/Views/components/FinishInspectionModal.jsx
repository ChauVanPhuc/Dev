import { useState, useEffect } from 'react'
import { X, ShoppingCart, Loader2 } from 'lucide-react'

const FinishInspectionModal = ({ open, summary, palletCode, onConfirm, onClose, onCreatePallet, isReInspect = false }) => {
  const [confirmCheck, setConfirmCheck] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (open) {
      setConfirmCheck(isReInspect || Boolean(palletCode))
      if (!isReInspect && !palletCode && onCreatePallet) {
        handleCreatePalletClick()
      }
    }
  }, [open, palletCode, isReInspect])

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
          
          {/* Row 1: PO (minmax) + Kết quả (minmax) */}
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
                gap: '12px',
                height: '40px',
                flexWrap: 'nowrap'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13.5px', fontWeight: '700', color: '#1e293b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input
                    type="radio"
                    name="modal_result"
                    checked={summary?.result === 'pass'}
                    readOnly
                    style={{ accentColor: '#3b2314', width: '16px', height: '16px' }}
                  />
                  Đạt
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13.5px', fontWeight: '700', color: '#1e293b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input
                    type="radio"
                    name="modal_result"
                    checked={summary?.result === 'fail'}
                    readOnly
                    style={{ accentColor: '#3b2314', width: '16px', height: '16px' }}
                  />
                  Không đạt
                </label>
              </div>
            </div>
          </div>

          {/* Row 2: Sản phẩm (minmax) + Quy cách (minmax) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                Sản phẩm
              </label>
              <div
                title={summary?.product || ''}
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
                {summary?.product || '—'}
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                Quy cách
              </label>
              <div
                title={summary?.spec || ''}
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
                {summary?.spec || '—'}
              </div>
            </div>
          </div>

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
                gap: '12px',
                padding: '0 4px',
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
                    gap: '8px',
                    backgroundColor: creating ? '#64748b' : '#3b2314',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 10px rgba(59, 35, 20, 0.25)',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {creating ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang tạo...
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={16} /> Tạo mã pallet
                    </>
                  )}
                </button>

                <span style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  color: '#2b1810',
                  letterSpacing: '0.5px',
                  textAlign: 'right',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {palletCode || 'DA7819'}
                </span>
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
            onClick={() => onConfirm({ ...summary, palletCode: palletCode || '', confirmed: isReInspect || confirmCheck })}
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
