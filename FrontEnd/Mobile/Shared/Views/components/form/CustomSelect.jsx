import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

/**
 * CustomSelect Component (Premium Version)
 * Dropdown tùy chỉnh cao cấp, chống tràn layout trên thiết bị di động,
 * tự động cuộn đến mục đang được chọn khi mở dropdown.
 */
const CustomSelect = ({
  value,
  options = [],
  onChange,
  style,
  disabled = false,
  placeholder,
  allowCustomInput = false, // Mặc định là dropdown thuần (chỉ chọn), ngoại trừ khi truyền true (như Mã Pallet)
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const dropdownRef = useRef(null)
  const listContainerRef = useRef(null)
  const selectedItemRef = useRef(null)
  const inputRef = useRef(null)

  // Lấy nhãn hiển thị của Option đang chọn
  const selectedOption = options.find((opt) => String(opt.value) === String(value))
  const displayLabel = selectedOption
    ? selectedOption.label
    : inputValue || placeholder || (options[0]?.label || 'Chọn...')

  // Đồng bộ inputValue khi prop `value` thay đổi từ bên ngoài (Dành cho allowCustomInput)
  useEffect(() => {
    if (selectedOption) {
      const labelStr = String(selectedOption.label || selectedOption.value || '')
      const dashIndex = labelStr.indexOf(' - ')
      const codePart = dashIndex !== -1 ? labelStr.substring(0, dashIndex).toUpperCase() : String(selectedOption.value || labelStr).toUpperCase()
      setInputValue(codePart)
    } else if (value !== undefined && value !== null && value !== '') {
      const valStr = String(value)
      const dashIndex = valStr.indexOf(' - ')
      const codePart = dashIndex !== -1 ? valStr.substring(0, dashIndex).toUpperCase() : valStr.toUpperCase()
      setInputValue(codePart)
    } else {
      setInputValue('')
    }
  }, [value, options, selectedOption])

  // Kiểm tra vị trí để căn phải nếu ở gần mép phải màn hình
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      if (rect.right > window.innerWidth / 2) {
        setAlignRight(true)
      } else {
        setAlignRight(false)
      }
    }
  }, [isOpen])

  // Đóng dropdown khi nhấn ra ngoài
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
          const targetScroll = selected.offsetTop - container.clientHeight / 2 + selected.clientHeight / 2
          container.scrollTop = Math.max(0, targetScroll)
        }
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [isOpen, value])

  // Lọc danh sách theo từ khóa nhập
  const filteredOptions = allowCustomInput && inputValue
    ? options.filter((opt) => {
        const term = inputValue.toLowerCase().trim()
        const labelStr = String(opt.label || '').toLowerCase()
        const valStr = String(opt.value || '').toLowerCase()
        return labelStr.includes(term) || valStr.includes(term)
      })
    : options

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase()
    setInputValue(val)
    if (!isOpen) setIsOpen(true)
    if (onChange) {
      onChange(val)
    }
  }

  const handleOptionSelect = (opt) => {
    const labelStr = String(opt.label || opt.value || '')
    const dashIndex = labelStr.indexOf(' - ')
    const codePart = dashIndex !== -1 ? labelStr.substring(0, dashIndex).toUpperCase() : String(opt.value || labelStr).toUpperCase()
    
    setInputValue(codePart)
    setIsOpen(false)
    if (onChange) {
      onChange(opt.value || codePart)
    }
  }

  const renderOptionContent = (option, isSelected) => {
    const labelStr = String(option.label || option.value || '')
    const dashIndex = labelStr.indexOf(' - ')

    if (dashIndex !== -1) {
      const codePart = labelStr.substring(0, dashIndex).toUpperCase()
      const detailPart = labelStr.substring(dashIndex + 3)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontWeight: '800', color: isSelected ? '#5c2d0e' : '#1e293b', fontSize: '13px', letterSpacing: '0.2px' }}>
            {codePart}
          </span>
          <span style={{ fontSize: '11.5px', color: isSelected ? '#78350f' : '#64748b', lineHeight: '1.35' }}>
            {detailPart}
          </span>
        </div>
      )
    }

    return (
      <span style={{ fontWeight: isSelected ? '700' : '600', color: isSelected ? '#5c2d0e' : '#1e293b' }}>
        {labelStr}
      </span>
    )
  }

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Nút/Input hiển thị giá trị hiện tại */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev)
            if (allowCustomInput && inputRef.current) {
              inputRef.current.focus()
            }
          }
        }}
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
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '13.5px',
          color: disabled ? '#666666' : '#1e293b',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          boxShadow: isOpen ? '0 0 0 2px rgba(92, 45, 14, 0.15)' : 'none',
          borderColor: isOpen ? '#4a240e' : '#a3998e',
          minWidth: 0,
          width: '100%',
          ...style,
        }}
      >
        {allowCustomInput ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => !disabled && setIsOpen(true)}
            placeholder={placeholder || 'Nhập hoặc chọn...'}
            disabled={disabled}
            style={{
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '13px',
              fontWeight: '600',
              color: disabled ? '#666666' : '#1e293b',
              cursor: disabled ? 'not-allowed' : 'text',
              width: '100%',
              padding: 0,
            }}
          />
        ) : (
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: '600',
              flex: '1 1 auto',
              minWidth: 0,
              fontSize: '13px',
              color: selectedOption || inputValue ? '#1e293b' : '#94a3b8',
            }}
          >
            {displayLabel}
          </span>
        )}
        {!disabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
            {allowCustomInput && Boolean(inputValue) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setInputValue('')
                  if (onChange) onChange('')
                  if (inputRef.current) inputRef.current.focus()
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  borderRadius: '50%',
                  transition: 'color 0.15s ease, background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444'
                  e.currentTarget.style.backgroundColor = '#fee2e2'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                title="Xóa nhanh"
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown
              size={16}
              style={{
                transition: 'transform 0.2s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                color: '#64748b',
                flexShrink: 0,
              }}
            />
          </div>
        )}
      </div>

      {/* Danh sách các lựa chọn (Options Menu) */}
      {isOpen && (
        <div
          ref={listContainerRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: alignRight ? 'auto' : 0,
            right: alignRight ? 0 : 'auto',
            minWidth: '100%',
            width: 'max-content',
            maxWidth: 'min(340px, calc(100vw - 28px))',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.12)',
            zIndex: 9999,
            maxHeight: '260px',
            overflowY: 'auto',
            border: '1.5px solid #c8beb2',
            padding: '4px',
            boxSizing: 'border-box',
          }}
        >
          {filteredOptions.map((option, idx) => {
            const isSelected = String(option.value) === String(value)
            return (
              <div
                key={`${option.value}_${idx}`}
                ref={isSelected ? selectedItemRef : null}
                onClick={() => handleOptionSelect(option)}
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
                  borderBottom: idx < filteredOptions.length - 1 ? '1px solid #f8fafc' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {renderOptionContent(option, isSelected)}
              </div>
            )
          })}
          {filteredOptions.length === 0 && (
            <div style={{ padding: '10px', textAlign: 'center', color: '#9ca3af', fontSize: '12.5px' }}>
              Không tìm thấy (bấm ngoài để giữ giá trị đã nhập)
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
