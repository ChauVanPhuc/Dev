import React from 'react'

/**
 * Component FormInput (Ô nhập liệu chung)
 * Tái sử dụng cho toàn bộ các Form trong ứng dụng.
 * Hỗ trợ các trường hợp Edit (nhập được) và ReadOnly (không nhập được).
 */
const FormInput = ({
  label,
  value,
  onChange,
  type = 'text',
  readOnly = false,
  placeholder,
  inputStyle = {},
  labelStyle = {},
  required = false,
  labelRight
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

  const baseInputStyle = {
    width: '100%',
    height: '34px',
    padding: '0 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    // Nếu là ReadOnly, tự động đổi màu nền sang xám mờ để người dùng nhận diện không được sửa
    backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
    color: readOnly ? '#94a3b8' : '#1e293b',
    cursor: readOnly ? 'not-allowed' : 'text',
    ...inputStyle
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {label && (
        <div style={{ ...baseLabelStyle, justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
            {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
          </span>
          {labelRight && <div style={{ flexShrink: 0, marginLeft: '8px' }}>{labelRight}</div>}
        </div>
      )}
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        style={baseInputStyle}
      />
    </div>
  )
}

export default FormInput
