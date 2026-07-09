import React from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Reusable Button component
 * Sử dụng các class từ common.css
 */
const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  loading = false, 
  disabled = false,
  type = 'button',
  className = ''
}) => {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={20} />
      ) : (
        children
      )}
    </button>
  )
}

export default Button
