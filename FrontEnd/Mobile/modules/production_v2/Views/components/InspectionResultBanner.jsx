import React from 'react'
import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'

/**
 * InspectionResultBanner - Component hiển thị khối Kết quả & Tổng số lỗi ghi nhận
 * Chuẩn phong cách Ảnh 1: Segmented buttons [✓ Đạt] [✕ K.đạt] với viền, nền và icon tự động đổi theo trạng thái.
 */
const InspectionResultBanner = ({
  result = 'pass',
  onResultChange,
  disabled = false,
  totalDefects = null,
  showDefectCount = true,
  label = 'Kết quả:',
  options = null,
  style = {}
}) => {
  const isFail = result === 'fail'
  const isExcellent = result === 'excellent'

  const bannerBg = isFail ? '#FFFBEB' : (isExcellent ? '#F5F3FF' : '#F0FDF4')
  const bannerBorder = isFail ? '#FDE68A' : (isExcellent ? '#DDD6FE' : '#BBF7D0')

  const defaultOptions = [
    { value: 'pass', label: '✓ Đạt', activeBg: '#10b981', activeColor: '#ffffff' },
    { value: 'fail', label: '✕ K.đạt', activeBg: '#ef4444', activeColor: '#ffffff' }
  ]
  const currentOptions = options || defaultOptions

  return (
    <div
      style={{
        marginTop: '12px',
        marginBottom: '14px',
        padding: '10px 14px',
        borderRadius: '8px',
        backgroundColor: bannerBg,
        border: `1.5px solid ${bannerBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isFail ? (
          <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0 }} />
        ) : isExcellent ? (
          <Sparkles size={18} style={{ color: '#7C3AED', flexShrink: 0 }} />
        ) : (
          <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
            {label}
          </span>
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#f1f5f9',
              padding: '2px',
              borderRadius: '6px',
              gap: '2px',
              border: '1px solid #cbd5e1'
            }}
          >
            {currentOptions.map((opt) => {
              const isActive = result === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !disabled && onResultChange && onResultChange(opt.value)}
                  disabled={disabled}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: 'none',
                    backgroundColor: isActive ? (opt.activeBg || '#10b981') : 'transparent',
                    color: isActive ? (opt.activeColor || '#ffffff') : '#64748b',
                    cursor: disabled ? 'default' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {showDefectCount && totalDefects !== null && totalDefects !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#475569' }}>
            Tổng số lỗi ghi nhận:{' '}
            <strong style={{ color: '#DC2626', fontSize: '14px' }}>
              {totalDefects}
            </strong>
          </span>
        </div>
      )}
    </div>
  )
}

export default InspectionResultBanner
