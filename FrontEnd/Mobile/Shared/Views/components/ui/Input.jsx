import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Reusable Input component
 * Hỗ trợ label, icon ẩn/hiện mật khẩu và các class từ common.css
 */
const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  name,
  error,
  isPassword = false,
  ...props // Nhận các thuộc tính khác như autoCapitalize, autoCorrect...
}) => {
  const [showPassword, setShowPassword] = useState(false)

  const togglePassword = () => {
    setShowPassword(!showPassword)
  }

  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="input-group animate-fade-in">
      {label && <label className="input-label">{label}</label>}
      <div className="input-field-wrapper">
        <input
          type={inputType}
          className="input-field"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          name={name}
          {...props} // Truyền toàn bộ thuộc tính props còn lại vào input
        />
        {isPassword && (
          <div className="input-icon" onClick={togglePassword} style={{ cursor: 'pointer' }}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </div>
        )}
      </div>
      {error && <span style={{ color: 'var(--status-error)', fontSize: '0.8rem' }}>{error}</span>}
    </div>
  )
}

export default Input
