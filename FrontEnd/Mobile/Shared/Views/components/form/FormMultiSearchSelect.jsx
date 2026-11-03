import { formatCabinetSeriesTag } from '@modules/production_v2/utils/cabinetSeriesMapper'
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, X, Lock } from 'lucide-react'

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
  disabled = false,
  lockedValues = [], // Mảng các ID/value không được phép bỏ chọn (cố định)
  lockedMessage = 'Quy cách duy nhất của chi tiết, không thể bỏ chọn',
  allowCustomInput = false, // Cho phép thêm mục tùy chọn khi tìm kiếm không có trong danh sách
  onSearch, // Hàm tìm kiếm trên Server khi người dùng nhập từ khóa
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [lockedHint, setLockedHint] = useState(null)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const searchTimerRef = useRef(null)

  // Cleanup timer tìm kiếm khi unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

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
        if (searchTerm) {
          setSearchTerm('')
          if (onSearch) onSearch('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [searchTerm, onSearch])

  // Focus vào ô tìm kiếm khi mở dropdown
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Lọc danh sách theo từ khóa tìm kiếm (hỗ trợ tìm kiếm thông minh 2 chiều: cả mã series mới và mã số cũ)
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options
    const s = searchTerm.toLowerCase().trim()
    const cleanSearch = s.replace(/[-\s_]/g, '')

    const matched = options.filter(opt => {
      const label = String(opt.label || '').toLowerCase()
      const rawSpec = String(opt.rawSpec || '').toLowerCase()
      const badge = String(opt.badge || '').toLowerCase()
      const rawBadge = String(opt.rawBadge || '').toLowerCase()
      const productLabel = String(opt.productLabel || opt.product_label || '').toLowerCase()
      const rawProductLabel = String(opt.rawProductLabel || '').toLowerCase()
      const valStr = String(opt.value || '').toLowerCase()

      // Khớp trực tiếp chuỗi
      if (
        label.includes(s) ||
        rawSpec.includes(s) ||
        badge.includes(s) ||
        rawBadge.includes(s) ||
        productLabel.includes(s) ||
        rawProductLabel.includes(s) ||
        valStr.includes(s)
      ) {
        return true
      }

      // Khớp bỏ qua dấu gạch nối và khoảng trắng (cho phép gõ nhanh ví dụ 'A60' hoặc '160')
      if (cleanSearch) {
        if (
          badge.replace(/[-\s_]/g, '').includes(cleanSearch) ||
          rawBadge.replace(/[-\s_]/g, '').includes(cleanSearch) ||
          productLabel.replace(/[-\s_]/g, '').includes(cleanSearch) ||
          rawProductLabel.replace(/[-\s_]/g, '').includes(cleanSearch) ||
          label.replace(/[-\s_]/g, '').includes(cleanSearch) ||
          rawSpec.replace(/[-\s_]/g, '').includes(cleanSearch)
        ) {
          return true
        }
      }

      return false
    })

    // Xếp hạng ưu tiên: bắt đầu bằng từ khóa tìm kiếm -> kết thúc bằng từ khóa -> vị trí khác
    return matched.sort((a, b) => {
      const aBadge = String(a.badge || '').toLowerCase()
      const bBadge = String(b.badge || '').toLowerCase()
      const aRawBadge = String(a.rawBadge || '').toLowerCase()
      const bRawBadge = String(b.rawBadge || '').toLowerCase()
      const aLabel = String(a.label || a.rawSpec || a.value || '').toLowerCase()
      const bLabel = String(b.label || b.rawSpec || b.value || '').toLowerCase()

      const aStarts = (aBadge.startsWith(s) || aRawBadge.startsWith(s) || aLabel.startsWith(s)) ? 1 : 0
      const bStarts = (bBadge.startsWith(s) || bRawBadge.startsWith(s) || bLabel.startsWith(s)) ? 1 : 0
      if (aStarts !== bStarts) return bStarts - aStarts

      const aEnds = (aBadge.endsWith(s) || aRawBadge.endsWith(s) || aLabel.endsWith(s)) ? 1 : 0
      const bEnds = (bBadge.endsWith(s) || bRawBadge.endsWith(s) || bLabel.endsWith(s)) ? 1 : 0
      if (aEnds !== bEnds) return bEnds - aEnds

      return aLabel.localeCompare(bLabel, undefined, { numeric: true, sensitivity: 'base' }) || aBadge.localeCompare(bBadge, undefined, { numeric: true, sensitivity: 'base' })
    })
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
      const item = matched[0]
      const base = String(item.label || item.rawSpec || values[0]).trim()
      if (item.badge && !base.includes(item.badge)) {
        return `${base} (${item.badge})`
      }
      return base
    }
    const fallbackVal = values[0] || placeholder
    return formatCabinetSeriesTag(fallbackVal, fallbackVal)
  }, [options, values, placeholder, itemType])

  const handleToggleOption = (val) => {
    if (disabled) return
    const valStr = val?.toString()
    const isChecked = values.includes(valStr)
    const isLocked = lockedValues.map(v => v?.toString()).includes(valStr) && isChecked

    if (isLocked) {
      setLockedHint(valStr)
      setTimeout(() => setLockedHint(null), 2500)
      return
    }

    let newValues
    if (isChecked) {
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

      {/* Ô hiển thị & nhập giá trị tìm kiếm trực tiếp (như Ảnh 2) */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true)
            if (inputRef.current) inputRef.current.focus()
          }
        }}
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
          cursor: disabled ? 'not-allowed' : 'text',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 2px rgba(92, 45, 14, 0.15)' : 'none',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                const val = e.target.value
                setSearchTerm(val)
                if (onSearch) {
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
                  searchTimerRef.current = setTimeout(() => {
                    onSearch(val)
                  }, 250)
                }
              }}
              placeholder={values.length > 0 ? selectedLabel : (placeholder || 'Nhập hoặc chọn...')}
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
                fontSize: '13px',
                color: values.length > 0 ? '#1e293b' : '#94a3b8',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
                lineHeight: '1.2'
              }}
            >
              {selectedLabel}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
          {isOpen && searchTerm ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSearchTerm('')
                if (onSearch) {
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
                  onSearch('')
                }
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
              }}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          ) : null}
          <ChevronDown
            size={15}
            color="#64748b"
            onClick={(e) => {
              e.stopPropagation()
              if (!disabled) {
                setIsOpen(!isOpen)
                if (!isOpen) {
                  setTimeout(() => inputRef.current?.focus(), 50)
                }
              }
            }}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
          />
        </div>
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

          {/* Danh sách Options */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {allowCustomInput && searchTerm.trim() && !options.some(o => String(o.value || '').toLowerCase() === searchTerm.trim().toLowerCase() || String(o.label || '').toLowerCase() === searchTerm.trim().toLowerCase()) && (
              <div
                onClick={() => {
                  const customVal = searchTerm.trim().toUpperCase()
                  if (!values.includes(customVal)) {
                    onChange([...values, customVal])
                  }
                  setSearchTerm('')
                }}
                style={{
                  padding: '9px 10px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  color: '#5c2d0e',
                  backgroundColor: '#FAF5EE',
                  cursor: 'pointer',
                  fontWeight: '700',
                  border: '1.5px dashed #C89D7C',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <span>+ Thêm {itemType ? itemType : 'mục'}: <strong>"{searchTerm.trim().toUpperCase()}"</strong></span>
                <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '800' }}>Nhấn để thêm</span>
              </div>
            )}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const optValStr = opt.value?.toString()
                const isChecked = values.includes(optValStr)
                const isLocked = lockedValues.map(v => v?.toString()).includes(optValStr) && isChecked
                const isShowHint = lockedHint === optValStr

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
                      cursor: isLocked ? 'default' : 'pointer',
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
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '4px' }}>
                      <span style={{ wordBreak: 'break-word', lineHeight: '1.35', fontWeight: isChecked ? '700' : '600' }}>
                        {opt.label}
                      </span>
                      {opt.badge ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '11px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            fontWeight: '600',
                            border: '1px solid #bfdbfe',
                            whiteSpace: 'nowrap',
                            maxWidth: '300px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} title={opt.badge}>
                            {opt.badge}
                          </span>
                        </div>
                      ) : isLocked ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            fontWeight: '700',
                            border: '1px solid #fde68a',
                            whiteSpace: 'nowrap'
                          }}>
                            <Lock size={10} /> Cố định
                          </span>
                        </div>
                      ) : null}
                      {isShowHint && !opt.badge && (
                        <span style={{ fontSize: '11px', color: '#b45309', marginTop: '3px', fontWeight: '600' }}>
                          {lockedMessage}
                        </span>
                      )}
                    </div>
                    
                    {/* Ô Checkbox bên phải */}
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: `1.5px solid ${isLocked ? '#b45309' : isChecked ? '#5c2d0e' : '#94a3b8'}`,
                      backgroundColor: isLocked ? '#92400e' : isChecked ? '#5c2d0e' : 'transparent',
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
