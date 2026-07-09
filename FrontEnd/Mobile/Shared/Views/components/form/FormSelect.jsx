import React from 'react'

/**
 * Component FormSelect (Ô chọn liệu chung)
 * Dùng cho các dropdown cơ bản (native) như chọn chi tiết, cấu hình,...
 */
const FormSelect = ({
  label,
  value,
  onChange,
  options = [],
  readOnly = false,
  selectStyle = {},
  labelStyle = {},
  required = false
}) => {
  const baseLabelStyle = {
    fontSize: '0.8rem',
    fontWeight: '800',
    color: '#475569',
    marginBottom: '2px',
    minHeight: '24px',
    display: 'flex',
    alignItems: 'flex-end',
    ...labelStyle
  }

  const baseSelectStyle = {
    width: '100%',
    height: '34px',
    padding: '0 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
    color: readOnly ? '#94a3b8' : '#1e293b',
    // Vô hiệu hóa click/sửa nếu đang là chế độ ReadOnly
    pointerEvents: readOnly ? 'none' : 'auto', 
    ...selectStyle
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {label && (
        <div style={{ ...baseLabelStyle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', minWidth: 0 }}>
          {label} {required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
        </div>
      )}
      <select
        value={value ?? ''}
        onChange={onChange}
        disabled={readOnly}
        style={baseSelectStyle}
      >
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {options.length === 0 && <option value="">Không có dữ liệu</option>}
      </select>
    </div>
  )
}

export default FormSelect
