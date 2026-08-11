import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Minus, Plus, Trash2, Search, ChevronDown, Sparkles } from 'lucide-react'

const ErrorTrendRow = ({
  row,
  onChange,
  onRemove,
  disabled = false,
  defectOptions = [],
  selectedDefectIds = [],
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)
  const listContainerRef = useRef(null)
  const selectedItemRef = useRef(null)

  const [isCustomMode, setIsCustomMode] = useState(() => {
    if (!row.name) return false
    if (!defectOptions || defectOptions.length === 0) return true
    const found = defectOptions.some(
      (opt) => opt.code === row.code || opt.name === row.name || String(opt.value) === String(row.defectId)
    )
    return !found
  })

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

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
  }, [isOpen, row.defectId, row.code])

  // Lọc bỏ lỗi đã chọn ở các dòng khác & Ưu tiên sắp xếp lỗi QA Track lên đầu
  const processedOptions = useMemo(() => {
    if (!defectOptions || defectOptions.length === 0) return []

    // 1. Lọc các lỗi đã chọn ở dòng khác
    const filtered = defectOptions.filter((opt) => {
      if (!selectedDefectIds || selectedDefectIds.length === 0) return true

      const optValStr = String(opt.value || opt.id)
      const optCodeStr = opt.code ? String(opt.code) : ''

      const isCurrentRowDefect =
        (row.defectId && String(row.defectId) === optValStr) ||
        (row.code && String(row.code) === optCodeStr) ||
        (row.name && String(row.name) === String(opt.name))

      if (isCurrentRowDefect) return true

      const isUsedElsewhere = selectedDefectIds.some(
        (usedId) => String(usedId) === optValStr || (optCodeStr && String(usedId) === optCodeStr)
      )

      return !isUsedElsewhere
    })

    // 2. Sắp xếp:
    // Rank 2: Lỗi CTQ (isCTQ) -> Lên VỊ TRÍ CAO NHẤT (trên cùng của danh sách)
    // Rank 1: Lỗi QA Track (needs_tracking / qc_tracking / is_tracked_by_me / isQA)
    // Rank 0: Lỗi thông thường
    const sorted = [...filtered].sort((a, b) => {
      const aRank = a.isCTQ ? 2 : (a.needs_tracking || a.qc_tracking || a.is_tracked_by_me || a.isQA ? 1 : 0)
      const bRank = b.isCTQ ? 2 : (b.needs_tracking || b.qc_tracking || b.is_tracked_by_me || b.isQA ? 1 : 0)
      if (aRank !== bRank) return bRank - aRank
      return (a.code || a.name || '').localeCompare(b.code || b.name || '')
    })

    return sorted.map((opt) => {
      const isCTQ = Boolean(opt.isCTQ)
      const isQA = Boolean(opt.needs_tracking || opt.qc_tracking || opt.is_tracked_by_me || opt.isQA)
      return {
        ...opt,
        isCTQ,
        isQA,
      }
    })
  }, [defectOptions, selectedDefectIds, row])

  // Lọc theo tìm kiếm trong dropdown
  const filteredSearchOptions = useMemo(() => {
    if (!searchTerm.trim()) return processedOptions
    const term = searchTerm.toLowerCase().trim()
    return processedOptions.filter(
      (opt) =>
        (opt.code && opt.code.toLowerCase().includes(term)) ||
        (opt.name && opt.name.toLowerCase().includes(term))
    )
  }, [processedOptions, searchTerm])

  // Option đang được chọn hiện tại
  const currentSelectedOpt = useMemo(() => {
    if (isCustomMode) return null
    if (row.defectId) {
      const matchId = processedOptions.find((opt) => String(opt.value) === String(row.defectId) || String(opt.id) === String(row.defectId))
      if (matchId) return matchId
    }
    if (row.code) {
      const matchCode = processedOptions.find((opt) => opt.code === row.code)
      if (matchCode) return matchCode
    }
    if (row.name) {
      const matchName = processedOptions.find((opt) => opt.name === row.name)
      if (matchName) return matchName
    }
    return null
  }, [row, processedOptions, isCustomMode])

  const handleSelectOption = (opt) => {
    setIsCustomMode(false)
    setIsOpen(false)
    setSearchTerm('')
    if (opt) {
      onChange &&
        onChange({
          ...row,
          defectId: opt.id || opt.value,
          code: opt.code || '',
          name: opt.name,
        })
    }
  }

  const handleSwitchToCustom = () => {
    setIsCustomMode(true)
    setIsOpen(false)
    setSearchTerm('')
    onChange && onChange({ ...row, defectId: null, code: '', name: row.name || '' })
  }

  return (
    <div
      className="pv2-error-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        position: 'relative',
      }}
      ref={dropdownRef}
    >
      {disabled ? (
        <div
          style={{
            flex: 1,
            height: 38,
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            color: '#334155',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span>{row.code ? `[${row.code}] ${row.name}` : row.name}</span>
          {currentSelectedOpt?.isQA && (
            <span
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.3px',
              }}
            >
              QA Track
            </span>
          )}
        </div>
      ) : isCustomMode ? (
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          <input
            type="text"
            className="pv2-input pv2-error-name"
            placeholder="Nhập tên lỗi khác..."
            value={row.name}
            onChange={(e) => onChange && onChange({ ...row, name: e.target.value, code: '', defectId: null })}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 8,
              borderColor: '#cbd5e1',
              padding: '0 12px',
              fontSize: 13,
            }}
          />
          {defectOptions && defectOptions.length > 0 && (
            <button
              type="button"
              className="pv2-btn-secondary"
              onClick={() => setIsCustomMode(false)}
              style={{
                height: 38,
                padding: '0 10px',
                fontSize: 12,
                whiteSpace: 'nowrap',
                borderRadius: 8,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Danh mục
            </button>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Ô Chọn thiết kế hiện đại (Combobox Box) */}
          <div
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            style={{
              height: 38,
              backgroundColor: '#ffffff',
              border: `1.5px solid ${isOpen ? '#7B5233' : currentSelectedOpt?.isQA ? '#fca5a5' : '#cbd5e1'}`,
              borderRadius: 8,
              padding: '0 10px 0 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              cursor: 'pointer',
              boxShadow: isOpen ? '0 0 0 3px rgba(123, 82, 51, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', flex: 1 }}>
              {currentSelectedOpt ? (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1e293b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentSelectedOpt.code ? (
                    <strong style={{ color: '#4B301E', marginRight: 4 }}>[{currentSelectedOpt.code}]</strong>
                  ) : null}
                  {currentSelectedOpt.name}
                </span>
              ) : row.name ? (
                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{row.name}</span>
              ) : (
                <span style={{ fontSize: 13, color: '#94a3b8' }}>-- Chọn loại lỗi từ danh mục --</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Badge CTQ hoặc QA Track NẰM BÊN PHẢI */}
              {currentSelectedOpt?.isCTQ ? (
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #f87171',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.4px',
                    boxShadow: '0 1px 2px rgba(185, 28, 28, 0.15)',
                  }}
                >
                  CTQ
                </span>
              ) : currentSelectedOpt?.isQA ? (
                <span
                  style={{
                    backgroundColor: '#fff7ed',
                    color: '#c2410c',
                    border: '1px solid #fdba74',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.4px',
                  }}
                >
                  QA Track
                </span>
              ) : null}
              <ChevronDown
                size={16}
                style={{
                  color: isOpen ? '#7B5233' : '#64748b',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </div>
          </div>

          {/* Popover / Dropdown Menu mở HƯỚNG LÊN TRÊN */}
          {isOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 9999,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.15), 0 -8px 10px -6px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                maxHeight: 280,
              }}
            >
              {/* Ô Tìm kiếm trực tiếp */}
              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: '#fafafa',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Search size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Gõ mã hoặc tên lỗi để tìm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  style={{
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    fontSize: 12,
                    width: '100%',
                    color: '#1e293b',
                  }}
                />
              </div>

              {/* Danh sách các Option */}
              <div ref={listContainerRef} style={{ overflowY: 'auto', flex: 1 }}>
                {filteredSearchOptions.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                    Không tìm thấy lỗi khớp
                  </div>
                ) : (
                  filteredSearchOptions.map((opt) => {
                    const isSelected =
                      (row.defectId && String(row.defectId) === String(opt.value || opt.id)) ||
                      (row.code && String(row.code) === String(opt.code))

                    return (
                      <div
                        key={opt.value || opt.id}
                        ref={isSelected ? selectedItemRef : null}
                        onClick={() => handleSelectOption(opt)}
                        style={{
                          padding: '9px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#fdf8f4' : '#ffffff',
                          borderBottom: '1px solid #f8fafc',
                          transition: 'background-color 0.12s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff'
                        }}
                      >
                        {/* Bên Trái: [Mã] Tên Lỗi */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', flex: 1 }}>
                          <span style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#4B301E' : '#334155' }}>
                            {opt.code ? <strong style={{ color: '#4B301E', marginRight: 4 }}>[{opt.code}]</strong> : null}
                            {opt.name}
                          </span>
                        </div>

                        {/* Bên Phải: Badge CTQ / QA Track NỔI BẬT */}
                        {opt.isCTQ ? (
                          <span
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #f87171',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: '0.4px',
                              flexShrink: 0,
                              boxShadow: '0 1px 2px rgba(185, 28, 28, 0.15)',
                            }}
                          >
                            CTQ
                          </span>
                        ) : opt.isQA ? (
                          <span
                            style={{
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fdba74',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: '0.3px',
                              flexShrink: 0,
                            }}
                          >
                            QA Track
                          </span>
                        ) : null}
                      </div>
                    )
                  })
                )}

                {/* Nút tùy chọn nhập lỗi khác */}
                <div
                  onClick={handleSwitchToCustom}
                  style={{
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    backgroundColor: '#faf5f0',
                    borderTop: '1px dashed #cbd5e1',
                    color: '#7B5233',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Sparkles size={14} style={{ color: '#7B5233' }} />
                  + Ghi nhận lỗi khác (Tự nhập...)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stepper cho Số lượng ghi nhận */}
      <div
        className="pv2-stepper"
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {!disabled && (
          <button
            type="button"
            className="pv2-stepper-btn"
            onClick={() => onChange && onChange({ ...row, qty: Math.max(0, (row.qty || 0) - 1) })}
            style={{
              width: 32,
              height: '100%',
              border: 'none',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <Minus size={14} />
          </button>
        )}
        <span
          className="pv2-stepper-val"
          style={{
            minWidth: 32,
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 13,
            color: '#1e293b',
            padding: '0 4px',
          }}
        >
          {row.qty || 0}
        </span>
        {!disabled && (
          <button
            type="button"
            className="pv2-stepper-btn"
            onClick={() => onChange && onChange({ ...row, qty: (row.qty || 0) + 1 })}
            style={{
              width: 32,
              height: '100%',
              border: 'none',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Nút xóa dòng */}
      {!disabled && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: 'none',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 6,
          }}
          title="Xóa dòng lỗi này"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  )
}

export default ErrorTrendRow
