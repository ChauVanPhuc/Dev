import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * CustomSelect Component (Premium Version)
 * Dropdown tùy chỉnh cao cấp, chống tràn layout trên thiết bị di động,
 * tự động cuộn đến mục đang được chọn khi mở dropdown.
 */
const CustomSelect = ({ value, options = [], onChange, style, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const listContainerRef = useRef(null)
  const selectedItemRef = useRef(null)

  // Đóng dropdown khi nhấn ra ngoài (hỗ trợ cả touch và click)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Tự động cuộn đến mục đang chọn khi mở dropdown
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => {
        if (listContainerRef.current && selectedItemRef.current) {
          const container = listContainerRef.current
          const selected = selectedItemRef.current
          const targetScroll = selected.offsetTop - (container.clientHeight / 2) + (selected.clientHeight / 2)
          container.scrollTop = Math.max(0, targetScroll)
        }
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [isOpen, value])

  const selectedOption = options.find(opt => String(opt.value) === String(value))
    || (value !== undefined && value !== null && value !== '' ? { value, label: value } : options[0])

  return (
    <div 
      ref={dropdownRef}
      style={{ 
        position: 'relative', 
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box'
      }}
    >
      {/* Nút bấm hiển thị giá trị hiện tại */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          height: '42px',
          minHeight: '42px',
          boxSizing: 'border-box',
          backgroundColor: disabled ? '#e2ded9' : '#ffffff',
          border: '1.5px solid #a3998e',
          borderRadius: '10px',
          cursor: disabled ? 'default' : 'pointer',
          fontSize: '13.5px',
          color: disabled ? '#666666' : '#1e293b',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          boxShadow: isOpen ? '0 0 0 2px rgba(92, 45, 14, 0.15)' : 'none',
          borderColor: isOpen ? '#4a240e' : '#a3998e',
          minWidth: 0,
          width: '100%',
          ...style 
        }}
      >
        <span style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          fontWeight: '600',
          flex: '1 1 auto',
          minWidth: 0,
          fontSize: '13px'
        }}>
          {selectedOption ? selectedOption.label : 'Chọn...'}
        </span>
        {!disabled && (
          <ChevronDown 
            size={16} 
            style={{ 
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              color: '#64748b',
              flexShrink: 0,
              marginLeft: '6px'
            }} 
          />
        )}
      </div>

      {/* Danh sách các lựa chọn (Options Menu) */}
      {isOpen && (
        <div 
          ref={listContainerRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1050,
            maxHeight: '250px',
            overflowY: 'auto',
            border: '1.5px solid #c8beb2',
            padding: '4px',
            boxSizing: 'border-box'
          }}
        >
          {options.map((option, idx) => {
            const isSelected = String(option.value) === String(value)
            return (
              <div
                key={`${option.value}_${idx}`}
                ref={isSelected ? selectedItemRef : null}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                style={{
                  padding: '9px 10px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  lineHeight: '1.35',
                  color: isSelected ? '#5c2d0e' : '#334155',
                  backgroundColor: isSelected ? '#fdf2e9' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: isSelected ? '700' : '500',
                  transition: 'background-color 0.15s ease',
                  wordBreak: 'break-word',
                  borderBottom: idx < options.length - 1 ? '1px solid #f8fafc' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {option.label}
              </div>
            )
          })}
          {options.length === 0 && (
            <div style={{ padding: '10px', textAlign: 'center', color: '#9ca3af', fontSize: '12.5px' }}>
              Không có dữ liệu
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
