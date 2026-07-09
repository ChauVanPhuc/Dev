import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * CustomSelect Component (Premium Version)
 * Một dropdown tùy chỉnh hoàn toàn mang lại trải nghiệm mobile cao cấp.
 */
const CustomSelect = ({ value, options, onChange, style }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Đóng dropdown khi nhấn ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value) || options[0]

  return (
    <div 
      ref={dropdownRef}
      style={{ 
        position: 'relative', 
        width: '100%'
      }}
    >
      {/* Nút bấm hiển thị giá trị hiện tại */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          color: '#1e293b',
          transition: 'boxShadow 0.2s ease, borderColor 0.2s ease',
          boxShadow: isOpen ? '0 4px 12px rgba(0, 0, 0, 0.05)' : 'none',
          borderColor: isOpen ? 'var(--primary-color)' : '#e2e8f0',
          ...style 
        }}
      >
        <span style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          fontWeight: '700'
        }}>
          {selectedOption ? selectedOption.label : 'Chọn...'}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: '#64748b',
            flexShrink: 0,
            marginLeft: '8px'
          }} 
        />
      </div>

      {/* Danh sách các lựa chọn (Options Menu) */}
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '250px',
            overflowY: 'auto',
            border: '1px solid #f3f4f6',
            padding: '4px'
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                color: value === option.value ? 'var(--primary-color)' : '#4b5563',
                backgroundColor: value === option.value ? '#fdf2f2' : 'transparent',
                cursor: 'pointer',
                fontWeight: value === option.value ? '700' : '500',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) e.target.style.backgroundColor = '#f9fafb'
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) e.target.style.backgroundColor = 'transparent'
              }}
            >
              {option.label}
            </div>
          ))}
          {options.length === 0 && (
            <div style={{ padding: '10px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
              Không có dữ liệu
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
