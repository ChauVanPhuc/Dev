import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

/**
 * FormMultiSearchSelect - Component chọn nhiều kết hợp tìm kiếm (Multi-select Searchable Dropdown)
 * Hỗ trợ chọn nhiều sản phẩm / quy cách với ô tích chọn nằm bên phải.
 */
const FormMultiSearchSelect = ({
  label,
  values = [], // Mảng các ID/value đã chọn, ví dụ: ['12', '15']
  onChange,    // Nhận mảng các ID/value đã chọn sau khi click: (newValues) => {}
  options = [],
  placeholder = 'Chọn...',
  itemType = '', // 'chi tiết', 'sản phẩm', 'quy cách'
  required = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Kiểm tra vị trí để căn phải nếu ở gần mép phải màn hình
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      if (rect.right > window.innerWidth / 2) {
        setAlignRight(true)
      } else {
        setAlignRight(false)
      }
    }
  }, [isOpen])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
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

  // Focus vào ô tìm kiếm khi mở dropdown
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Lọc danh sách theo từ khóa tìm kiếm
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options
    const s = searchTerm.toLowerCase().trim()
    return options.filter(opt => 
      String(opt.label || '').toLowerCase().includes(s) || 
      String(opt.value || '').toLowerCase().includes(s)
    )
  }, [options, searchTerm])

  // Nhãn hiển thị khi thu gọn
  const selectedLabel = useMemo(() => {
    if (!values || values.length === 0) return placeholder
    const matched = options.filter(opt => values.includes(opt.value?.toString()))
    const count = matched.length > 0 ? matched.length : values.length
    if (count > 1) {
      const typeStr = itemType ? itemType.toLowerCase() : 'mục'
      return `Đã chọn ${count} ${typeStr}`
    }
    if (matched.length === 1) {
      return String(matched[0].label).split(' (')[0]
    }
    return values[0] || placeholder
  }, [options, values, placeholder, itemType])

  const handleToggleOption = (val) => {
    if (disabled) return
    const valStr = val?.toString()
    let newValues
    if (values.includes(valStr)) {
      newValues = values.filter(v => v !== valStr)
    } else {
      newValues = [...values, valStr]
    }
    onChange(newValues)
  }

  return (
    <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
      {label && (
        <label style={{ 
          fontSize: '0.8rem', 
          fontWeight: '800', 
          color: '#475569', 
          marginBottom: '4px', 
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%'
        }}>
          {label} {required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
        </label>
      )}

      {/* Ô hiển thị giá trị đã chọn */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          height: '42px',
          minHeight: '42px',
          padding: '0 10px',
          borderRadius: '10px',
          border: `1.5px solid ${isOpen ? '#4a240e' : '#a3998e'}`,
          backgroundColor: disabled ? '#e2ded9' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 2px rgba(92, 45, 14, 0.15)' : 'none',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ 
          fontSize: '13px', 
          color: values.length > 0 ? '#1e293b' : '#94a3b8', 
          fontWeight: '600',
          whiteSpace: 'nowrap', 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
          marginRight: '6px',
          lineHeight: '1.2'
        }}>
          {selectedLabel}
        </span>
        <ChevronDown size={16} color="#64748b" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: alignRight ? 'auto' : 0,
          right: alignRight ? 0 : 'auto',
          minWidth: '100%',
          width: 'max-content',
          maxWidth: 'min(360px, calc(100vw - 28px))',
          backgroundColor: '#fff',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.12)',
          border: '1.5px solid #c8beb2',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '280px',
          boxSizing: 'border-box'
        }}>
          {/* Ô Input tìm kiếm bên trong dropdown */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', flexShrink: 0 }}>
            <Search size={14} color="#64748b" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Gõ để tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
                color: '#1e293b'
              }}
            />
            {searchTerm && (
              <X size={14} color="#94a3b8" onClick={() => setSearchTerm('')} style={{ cursor: 'pointer' }} />
            )}
          </div>

          {/* Danh sách Options */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isChecked = values.includes(opt.value?.toString())
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleOption(opt.value)}
                    style={{
                      padding: '9px 10px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      color: isChecked ? '#5c2d0e' : '#334155',
                      backgroundColor: isChecked ? '#fdf2e9' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      fontWeight: isChecked ? '700' : '500',
                      borderBottom: idx < filteredOptions.length - 1 ? '1px solid #f8fafc' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                    onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.backgroundColor = '#f8fafc' }}
                    onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <span style={{ wordBreak: 'break-word', lineHeight: '1.35', flex: 1 }}>{opt.label}</span>
                    
                    {/* Ô Checkbox bên phải */}
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: `1.5px solid ${isChecked ? '#5c2d0e' : '#94a3b8'}`,
                      backgroundColor: isChecked ? '#5c2d0e' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.1s',
                      flexShrink: 0
                    }}>
                      {isChecked && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>}
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FormMultiSearchSelect
