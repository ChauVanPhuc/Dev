import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

/**
 * FormSearchSelect - Component chọn liệu có chức năng tìm kiếm
 * Giao diện hiện đại, hỗ trợ lọc nhanh danh sách lớn.
 */
const FormSearchSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Chọn chi tiết...',
  readOnly = false,
  required = false,
  alignMenu = 'left'
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

  const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value])

  const handleSelect = (val) => {
    onChange({ target: { value: val } })
    setIsOpen(false)
    setSearchTerm('')
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
        onClick={() => !readOnly && setIsOpen(!isOpen)}
        style={{
          minHeight: '42px',
          height: 'auto',
          padding: '8px 12px',
          borderRadius: '10px',
          border: `1px solid ${isOpen ? 'var(--primary-color)' : '#cbd5e1'}`,
          backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: readOnly ? 'default' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(var(--primary-rgb), 0.1)' : 'none',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ 
          fontSize: '0.9rem', 
          color: selectedOption ? '#1e293b' : '#94a3b8', 
          whiteSpace: 'nowrap', 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
          marginRight: '8px',
          lineHeight: '1.2'
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} color="#64748b" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          ...(alignMenu === 'right' 
            ? { right: 0, left: 'auto', minWidth: '220px' } 
            : { left: 0, right: 0 }
          ),
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '350px'
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
              filteredOptions.map((opt, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    padding: '12px 16px',
                    fontSize: '0.9rem',
                    color: value === opt.value ? 'var(--primary-color)' : '#334155',
                    backgroundColor: value === opt.value ? '#f0f9ff' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    fontWeight: value === opt.value ? '600' : '400',
                    borderBottom: '1px solid #f8fafc'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = value === opt.value ? '#f0f9ff' : 'transparent'}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                Không tìm thấy chi tiết nào
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FormSearchSelect
