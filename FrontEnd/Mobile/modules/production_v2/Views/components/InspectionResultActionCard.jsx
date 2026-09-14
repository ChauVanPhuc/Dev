import React from 'react'

/**
 * InspectionResultActionCard
 * Khối chọn Kết quả kiểm tra, Hành động (Nhập kho / Cách ly / Trả hàng) và Ghi chú sản phẩm
 * theo chuẩn giao diện Production V2 Mobile.
 */
const InspectionResultActionCard = ({
  result = 'pass',
  onResultChange,
  action = 'luu-kho',
  onActionChange,
  note = '',
  onNoteChange,
  disabled = false,
  style = {}
}) => {
  const resultOptions = [
    { value: 'pass', label: 'Đạt' },
    { value: 'fail', label: 'Không đạt' }
  ]

  const actionOptions = [
    { value: 'luu-kho', label: 'Nhập kho' },
    { value: 'cach-ly', label: 'Cách ly' },
    { value: 'tra-ve', label: 'Trả hàng' }
  ]

  const handleSelectResult = (val) => {
    if (disabled || !onResultChange) return
    onResultChange(val)
  }

  const handleSelectAction = (val) => {
    if (disabled || !onActionChange) return
    onActionChange(val)
  }

  const isQuarantine = action === 'cach-ly'
  const isQuarantineEmpty = isQuarantine && (!note || !note.trim())

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        padding: '16px',
        border: '1px solid #e8e1d5',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        marginTop: '10px',
        marginBottom: '12px',
        ...style
      }}
    >
      {/* 1. Kết quả kiểm tra */}
      <div>
        <label
          style={{
            fontSize: '12.5px',
            fontWeight: '700',
            color: '#4b301e',
            display: 'block',
            marginBottom: '6px'
          }}
        >
          Kết quả kiểm tra:
        </label>
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            gap: '3px'
          }}
        >
          {resultOptions.map((opt) => {
            const isActive = result === opt.value
            return (
              <div
                key={opt.value}
                onClick={() => handleSelectResult(opt.value)}
                style={{
                  flex: 1,
                  padding: '9px 8px',
                  textAlign: 'center',
                  borderRadius: '6px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  backgroundColor: isActive ? '#5d3b32' : '#ffffff',
                  color: isActive ? '#ffffff' : '#4b301e',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: isActive ? '1px solid #5d3b32' : '1px solid #e2e8f0',
                  boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                  userSelect: 'none',
                  opacity: disabled && !isActive ? 0.6 : 1
                }}
              >
                {opt.label}
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Hành động */}
      <div>
        <label
          style={{
            fontSize: '12.5px',
            fontWeight: '700',
            color: '#4b301e',
            display: 'block',
            marginBottom: '6px'
          }}
        >
          Hành động:
        </label>
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            gap: '3px'
          }}
        >
          {actionOptions.map((opt) => {
            const isActive = action === opt.value
            return (
              <div
                key={opt.value}
                onClick={() => handleSelectAction(opt.value)}
                style={{
                  flex: 1,
                  padding: '9px 8px',
                  textAlign: 'center',
                  borderRadius: '6px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  backgroundColor: isActive ? '#5d3b32' : '#ffffff',
                  color: isActive ? '#ffffff' : '#4b301e',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: isActive ? '1px solid #5d3b32' : '1px solid #e2e8f0',
                  boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                  userSelect: 'none',
                  opacity: disabled && !isActive ? 0.6 : 1
                }}
              >
                {opt.label}
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Ghi chú sản phẩm */}
      <div>
        <label
          style={{
            fontSize: '12.5px',
            fontWeight: '700',
            color: '#4b301e',
            display: 'block',
            marginBottom: '5px'
          }}
        >
          Ghi chú sản phẩm{' '}
          {isQuarantine && (
            <span style={{ color: '#ef4444', fontWeight: '600' }}>
              (Bắt buộc khi cách ly) *
            </span>
          )}
        </label>
        <textarea
          rows={2}
          value={note || ''}
          onChange={(e) => onNoteChange && onNoteChange(e.target.value)}
          placeholder={
            isQuarantine
              ? 'Nhập rõ nguyên nhân cách ly (Bắt buộc)...'
              : 'Nhập ghi chú...'
          }
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: isQuarantineEmpty ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
            backgroundColor: disabled ? '#f8fafc' : '#ffffff',
            color: disabled ? '#64748b' : '#1e293b',
            fontSize: '13px',
            outline: 'none',
            resize: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s'
          }}
        />
      </div>
    </div>
  )
}

export default InspectionResultActionCard
