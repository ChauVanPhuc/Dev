import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

/**
 * FormMultiSearchSelect - Component chọn nhiều kết hợp tìm kiếm (Multi-select Searchable Dropdown)
 * Hỗ trợ chọn nhiều đơn hàng với ô tích chọn nằm bên phải.
 */
const FormMultiSearchSelect = ({
  label,
  values = [], // Mảng các ID đã chọn, ví dụ: ['12', '15']
  onChange,    // Nhận mảng các ID đã chọn sau khi click: (newValues) => {}
  options = [],
  placeholder = 'Chọn đơn hàng...',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus vào ô tìm kiếm khi mở dropdown
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 100)
    }
  }, [isOpen])

  // Lọc danh sách theo từ khóa tìm kiếm
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options
    const s = searchTerm.toLowerCase().trim()
    return options.filter(opt => 
      opt.label.toLowerCase().includes(s) || 
      opt.value.toString().toLowerCase().includes(s)
    )
  }, [options, searchTerm])

  // Nhãn hiển thị khi thu gọn
  const selectedLabel = useMemo(() => {
    if (!values || values.length === 0) return placeholder
    // Trích xuất nhãn PO rút gọn để tránh tràn chữ
    return options
      .filter(opt => values.includes(opt.value?.toString()))
      .map(opt => {
        // Chỉ lấy phần PO: APT-0070-07, bỏ bớt phần (Còn: 20)
        return opt.label.split(' (')[0]
      })
      .join(', ')
  }, [options, values, placeholder])

  const handleToggleOption = (val) => {
    const valStr = val?.toString()
    let newValues
    if (values.includes(valStr)) {
      // Đảm bảo không cho phép bỏ tích hết (phải giữ lại ít nhất 1 đơn hàng)
      if (values.length <= 1) {
        return // Không cho phép bỏ chọn nếu là cái cuối cùng
      }
      newValues = values.filter(v => v !== valStr)
    } else {
      newValues = [...values, valStr]
    }
    onChange(newValues)
  }

  return (
    <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0 }}>
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
        onClick={() => setIsOpen(!isOpen)}
        style={{
          minHeight: '42px',
          height: 'auto',
          padding: '8px 12px',
          borderRadius: '10px',
          border: `1px solid ${isOpen ? 'var(--primary-color, #3d2b1f)' : '#cbd5e1'}`,
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(61, 43, 31, 0.1)' : 'none',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ 
          fontSize: '0.9rem', 
          color: values.length > 0 ? '#1e293b' : '#94a3b8', 
          fontWeight: values.length > 0 ? '700' : '400',
          whiteSpace: 'nowrap', 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
          marginRight: '8px',
          lineHeight: '1.2'
        }}>
          {selectedLabel}
        </span>
        <ChevronDown size={18} color="#64748b" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '280px'
        }}>
          {/* Ô Input tìm kiếm bên trong dropdown */}
          <div style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc' }}>
            <Search size={16} color="#64748b" />
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
                fontSize: '0.9rem',
                color: '#1e293b'
              }}
            />
            {searchTerm && (
              <X size={16} color="#94a3b8" onClick={() => setSearchTerm('')} style={{ cursor: 'pointer' }} />
            )}
          </div>

          {/* Danh sách Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isChecked = values.includes(opt.value?.toString())
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleOption(opt.value)}
                    style={{
                      padding: '12px 16px',
                      fontSize: '0.9rem',
                      color: isChecked ? 'var(--primary-color, #3d2b1f)' : '#334155',
                      backgroundColor: isChecked ? '#fdf8f5' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                      fontWeight: isChecked ? '700' : '400',
                      borderBottom: '1px solid #f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isChecked ? '#fdf8f5' : '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isChecked ? '#fdf8f5' : 'transparent'}
                  >
                    <span>{opt.label}</span>
                    
                    {/* Ô Checkbox bên phải */}
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: `1.5px solid ${isChecked ? 'var(--primary-color, #3d2b1f)' : '#94a3b8'}`,
                      backgroundColor: isChecked ? 'var(--primary-color, #3d2b1f)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.1s'
                    }}>
                      {isChecked && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 'bold' }}>✓</span>}
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                Không tìm thấy đơn hàng nào
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FormMultiSearchSelect
