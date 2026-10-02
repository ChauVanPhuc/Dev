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
  onSearch,
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
  const searchTimerRef = useRef(null)
  const userSelectedRef = useRef(false)

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  // Lấy nhãn hiển thị của Option đang chọn
  const selectedOption = options.find((opt) => String(opt.value) === String(value))
  const displayLabel = selectedOption
    ? selectedOption.label
    : (value ? String(value) : (inputValue || placeholder || (options[0]?.label || 'Chọn...')))

  // Đồng bộ inputValue khi prop `value` thay đổi từ bên ngoài (Dành cho allowCustomInput)
  useEffect(() => {
    if (selectedOption && selectedOption.value !== '' && selectedOption.value !== null && selectedOption.value !== undefined) {
      const labelStr = String(selectedOption.label || selectedOption.value || '')
      const dashIndex = labelStr.indexOf(' - ')
      const codePart = dashIndex !== -1 ? labelStr.substring(0, dashIndex).toUpperCase() : String(selectedOption.value || labelStr).toUpperCase()
      setInputValue(codePart)
    } else if (value !== undefined && value !== null && value !== '') {
      const valStr = String(value)
      const dashIndex = valStr.indexOf(' - ')
      const codePart = dashIndex !== -1 ? valStr.substring(0, dashIndex).toUpperCase() : valStr.toUpperCase()
      setInputValue(codePart)
    } else if (!value) {
      if (document.activeElement !== inputRef.current) {
        setInputValue('')
      }
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

  // Lọc danh sách theo từ khóa nhập (tự động bỏ option rỗng khi allowCustomInput)
  const availableOptions = allowCustomInput
    ? options.filter((opt) => opt.value !== '' && opt.value !== null && opt.value !== undefined)
    : options

  const filteredOptions = allowCustomInput && inputValue && !onSearch
    ? availableOptions
        .filter((opt) => {
          const term = inputValue.toLowerCase().trim()
          const labelStr = String(opt.label || '').toLowerCase()
          return labelStr.includes(term)
        })
        .sort((a, b) => {
          const term = inputValue.toLowerCase().trim()
          const aStr = String(a.label || '').toLowerCase()
          const bStr = String(b.label || '').toLowerCase()
          const aStarts = aStr.startsWith(term) ? 1 : 0
          const bStarts = bStr.startsWith(term) ? 1 : 0
          if (aStarts !== bStarts) return bStarts - aStarts
          const aEnds = aStr.endsWith(term) ? 1 : 0
          const bEnds = bStr.endsWith(term) ? 1 : 0
          if (aEnds !== bEnds) return bEnds - aEnds
          return aStr.localeCompare(bStr)
        })
    : availableOptions

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase()
    setInputValue(val)
    userSelectedRef.current = false
    if (!isOpen) setIsOpen(true)
    
    // Nếu KHÔNG có onSearch (custom input tự do thuần túy), truyền trực tiếp giá trị vào onChange
    if (onChange && !onSearch) {
      onChange(val)
    }

    // Nếu CÓ onSearch, từ khóa nhập chỉ dùng để tìm kiếm trên Server, không lưu tạm vào form
    if (onSearch) {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => {
        onSearch(val)
      }, 250)
    }
  }

  const handleOptionSelect = (opt) => {
    if (!opt || opt.value === '') return
    userSelectedRef.current = true
    const labelStr = String(opt.label || opt.value || '')
    const dashIndex = labelStr.indexOf(' - ')
    const codePart = dashIndex !== -1 ? labelStr.substring(0, dashIndex).toUpperCase() : String(opt.value || labelStr).toUpperCase()
    
    setInputValue(codePart)
    setIsOpen(false)
    if (onChange) {
      onChange(opt.value || codePart)
    }
  }

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const validOpts = options.filter((opt) => opt.value && opt.value !== '')
      if (validOpts.length > 0) {
        handleOptionSelect(validOpts[0])
      }
    }
  }

  const handleInputBlur = () => {
    // Chỉ xử lý khi có onSearch
    if (!onSearch) return

    // Chờ một khoảng thời gian ngắn để nếu người dùng vừa bấm vào 1 mục trên dropdown,
    // sự kiện click của mục đó (handleOptionSelect) sẽ chạy trước
    setTimeout(() => {
      // 1. Nếu người dùng đã bấm chọn mục rồi -> BỎ QUA (không đổi)
      if (userSelectedRef.current) {
        userSelectedRef.current = false
        return
      }

      // 2. Nếu người dùng chưa chọn mà trong ô có từ khóa tìm kiếm:
      if (inputValue && inputValue.trim()) {
        const validOpts = options.filter((opt) => opt.value && opt.value !== '')
        if (validOpts.length === 1) {
          // Có 1 cái thì chọn luôn cái đó
          handleOptionSelect(validOpts[0])
        } else if (validOpts.length > 1) {
          // Có nhiều cái thì chọn cái đầu
          handleOptionSelect(validOpts[0])
        } else {
          // Không có kết quả nào
          setInputValue('')
          if (onChange) onChange('')
        }
      } else {
        // Ô nhập trống
        if (onChange) onChange('')
      }
      setIsOpen(false)
    }, 180)
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
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
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
                  if (onSearch) onSearch('')
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
                onMouseDown={(e) => e.preventDefault()}
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
              {onSearch ? 'Không tìm thấy mã PO phù hợp' : 'Không tìm thấy (bấm ngoài để giữ giá trị đã nhập)'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
