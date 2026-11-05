import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Minus, Plus, Trash2, Search, ChevronDown, Sparkles, RotateCcw } from 'lucide-react'

const ErrorTrendRow = ({
  row,
  onChange,
  onRemove,
  disabled = false,
  defectOptions = [],
  allDefectOptions = [],
  selectedDefectIds = [],
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)
  const listContainerRef = useRef(null)
  const selectedItemRef = useRef(null)

  const [userCustomMode, setUserCustomMode] = useState(false)

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

  // Lọc bỏ lỗi đã chọn ở các dòng khác & Ưu tiên sắp xếp lỗi QA Track lên đầu (dành cho công đoạn hiện tại)
  const processedOptions = useMemo(() => {
    if (!defectOptions || defectOptions.length === 0) return []

    // 1. Lọc các lỗi đã chọn ở dòng khác
    let filtered = defectOptions.filter((opt) => {
      if (!selectedDefectIds || selectedDefectIds.length === 0) return true

      const optValStr = String(opt.value || opt.id)
      const optCodeStr = opt.code ? String(opt.code).toLowerCase().trim() : ''
      const optNameStr = opt.name ? String(opt.name).toLowerCase().trim() : ''

      const isUsedElsewhere = selectedDefectIds.some((used) => {
        const uStr = String(used).toLowerCase().trim()
        return (
          uStr === optValStr ||
          (optCodeStr && uStr === optCodeStr) ||
          (optNameStr && uStr === optNameStr)
        )
      })

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

  // Lọc theo tìm kiếm: NẾU GÕ TỪ KHÓA -> TÌM TRÊN TOÀN BỘ LỖI TRONG HỆ THỐNG (allDefectOptions)
  const filteredSearchOptions = useMemo(() => {
    if (!searchTerm.trim()) return processedOptions

    const term = searchTerm.toLowerCase().trim()
    const pool = allDefectOptions && allDefectOptions.length > 0 ? allDefectOptions : defectOptions

    // 1. Lọc bỏ các lỗi đã chọn ở dòng khác
    const available = pool.filter((opt) => {
      if (!selectedDefectIds || selectedDefectIds.length === 0) return true
      const optValStr = String(opt.value || opt.id)
      const optCodeStr = opt.code ? String(opt.code).toLowerCase().trim() : ''
      const optNameStr = opt.name ? String(opt.name).toLowerCase().trim() : ''

      return !selectedDefectIds.some((used) => {
        const uStr = String(used).toLowerCase().trim()
        return (
          uStr === optValStr ||
          (optCodeStr && uStr === optCodeStr) ||
          (optNameStr && uStr === optNameStr)
        )
      })
    })

    // 2. Tìm kiếm theo mã hoặc tên
    const matched = available.filter(
      (opt) =>
        (opt.code && opt.code.toLowerCase().includes(term)) ||
        (opt.name && opt.name.toLowerCase().includes(term))
    )

    // 3. Sắp xếp kết quả tìm kiếm: Khớp chính xác mã -> CTQ -> QA Track -> Alphabet
    return matched.sort((a, b) => {
      const aExact = a.code && a.code.toLowerCase().trim() === term ? 1 : 0
      const bExact = b.code && b.code.toLowerCase().trim() === term ? 1 : 0
      if (aExact !== bExact) return bExact - aExact

      const aRank = a.isCTQ ? 2 : (a.needs_tracking || a.qc_tracking || a.is_tracked_by_me || a.isQA ? 1 : 0)
      const bRank = b.isCTQ ? 2 : (b.needs_tracking || b.qc_tracking || b.is_tracked_by_me || b.isQA ? 1 : 0)
      if (aRank !== bRank) return bRank - aRank

      return (a.code || a.name || '').localeCompare(b.code || b.name || '')
    }).map((opt) => ({
      ...opt,
      isCTQ: Boolean(opt.isCTQ),
      isQA: Boolean(opt.needs_tracking || opt.qc_tracking || opt.is_tracked_by_me || opt.isQA)
    }))
  }, [processedOptions, allDefectOptions, defectOptions, selectedDefectIds, searchTerm])

  // Option đang được chọn hiện tại (luôn khớp với danh mục nếu có match)
  const currentSelectedOpt = useMemo(() => {
    if (userCustomMode || row.is_custom) return null
    const optsToSearch = allDefectOptions && allDefectOptions.length > 0 ? allDefectOptions : (processedOptions.length > 0 ? processedOptions : defectOptions)
    if (!optsToSearch || optsToSearch.length === 0) return null

    if (row.defectId) {
      const matchId = optsToSearch.find((opt) => String(opt.value || opt.id) === String(row.defectId))
      if (matchId) return matchId
    }
    if (row.code) {
      const matchCode = optsToSearch.find((opt) => opt.code === row.code)
      if (matchCode) return matchCode
    }
    if (row.name) {
      const matchName = optsToSearch.find((opt) => opt.name === row.name)
      if (matchName) return matchName
    }
    return null
  }, [row, processedOptions, allDefectOptions, defectOptions, userCustomMode])

  // Chế độ tự nhập lỗi khác ngoài hệ thống
  const isCustomMode = userCustomMode || Boolean(row.is_custom) || (!currentSelectedOpt && Boolean(row.name && row.name.trim() && !row.defectId))

  const handleSelectOption = (opt) => {
    setUserCustomMode(false)
    setIsOpen(false)
    setSearchTerm('')
    if (opt) {
      onChange &&
        onChange({
          ...row,
          defectId: opt.id || opt.value,
          code: opt.code || '',
          name: opt.name,
          is_custom: false,
          qty: row.qty && row.qty > 0 ? row.qty : 0,
        })
    }
  }

  const handleSwitchToCustom = (defaultName = '') => {
    setUserCustomMode(true)
    setIsOpen(false)
    const newName = defaultName || searchTerm.trim() || row.name || ''
    setSearchTerm('')
    onChange && onChange({ ...row, defectId: null, code: '', name: newName, is_custom: true })
  }

  const displayCode = currentSelectedOpt?.code || row.code || ''
  const displayName = currentSelectedOpt?.name || row.name || row.note || ''
  const isCTQ = Boolean(currentSelectedOpt?.isCTQ || row.isCTQ)
  const isQA = Boolean(currentSelectedOpt?.isQA || row.isQA || displayCode || (row.id && String(row.id).startsWith('auto_tracked')))
  const isMissingDefectName = !disabled && Number(row.qty) > 0 && !row.defectId && !row.code && !String(row.name || '').trim()

  return (
    <div
      className="pv2-error-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        width: '100%',
        position: 'relative',
      }}
      ref={dropdownRef}
    >
      {disabled ? (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: 36,
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            color: '#334155',
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayCode ? `[${displayCode}] ${displayName}` : displayName || (Number(row.qty) > 0 ? 'Lỗi ghi nhận' : '—')}
          </span>
          {isCustomMode ? (
            <span
              style={{
                backgroundColor: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fde68a',
                padding: '2px 6px',
                borderRadius: 999,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.2px',
                flexShrink: 0,
              }}
            >
              Tự nhập
            </span>
          ) : isCTQ ? (
            <span
              style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '2px 6px',
                borderRadius: 999,
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.2px',
                flexShrink: 0,
              }}
            >
              CTQ
            </span>
          ) : isQA ? (
            <span
              style={{
                backgroundColor: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fde68a',
                padding: '2px 6px',
                borderRadius: 999,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.2px',
                flexShrink: 0,
              }}
            >
              QA
            </span>
          ) : null}
        </div>
      ) : isCustomMode ? (
        /* Ô TỰ NHẬP LỖI KHÁC NGOÀI HỆ THỐNG */
        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: 36,
            backgroundColor: '#FFFDF9',
            border: '1.5px solid #d97706',
            borderRadius: 8,
            padding: '0 6px 0 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 1px 3px rgba(217, 119, 6, 0.08)',
          }}
        >
          <Sparkles size={14} style={{ color: '#d97706', flexShrink: 0 }} />
          <input
            type="text"
            value={row.name || ''}
            onChange={(e) => {
              onChange &&
                onChange({
                  ...row,
                  name: e.target.value,
                  defectId: null,
                  code: '',
                  is_custom: true,
                })
            }}
            placeholder="Nhập tên lỗi khác (chưa có trong HT)..."
            autoFocus={userCustomMode}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#451a03',
            }}
          />
          <button
            type="button"
            onClick={() => {
              setUserCustomMode(false)
              onChange &&
                onChange({
                  ...row,
                  name: '',
                  defectId: null,
                  code: '',
                  is_custom: false,
                })
            }}
            title="Quay lại chọn từ danh mục lỗi hệ thống"
            style={{
              border: 'none',
              background: '#fef3c7',
              color: '#92400e',
              borderRadius: 6,
              padding: '3px 7px',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              flexShrink: 0,
            }}
          >
            <RotateCcw size={10} /> Chọn DM
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {/* Ô Chọn thiết kế hiện đại (Combobox Box) */}
          <div
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            style={{
              height: 36,
              backgroundColor: '#ffffff',
              border: isMissingDefectName ? '1.5px solid #dc2626' : `1px solid ${isOpen ? '#b45309' : '#cbd5e1'}`,
              borderRadius: 8,
              padding: '0 8px 0 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
              cursor: 'pointer',
              boxShadow: isMissingDefectName ? '0 0 0 2px rgba(220, 38, 38, 0.15)' : (isOpen ? '0 0 0 2px rgba(180, 83, 9, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.02)'),
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', flex: 1, minWidth: 0 }}>
              {displayName ? (
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#1e293b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                    width: '100%',
                  }}
                >
                  {displayName}
                </span>
              ) : (
                isMissingDefectName ? (
                  <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>⚠ Chọn tên lỗi *</span>
                ) : (
                  <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Chọn lỗi</span>
                )
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {/* Badge CTQ hoặc QA */}
              {isCTQ ? (
                <span
                  style={{
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    padding: '2px 6px',
                    borderRadius: 999,
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: '0.2px',
                    flexShrink: 0,
                  }}
                >
                  CTQ
                </span>
              ) : isQA ? (
                <span
                  style={{
                    backgroundColor: '#fffbeb',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    padding: '2px 6px',
                    borderRadius: 999,
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.2px',
                    flexShrink: 0,
                  }}
                >
                  QA
                </span>
              ) : null}
              <ChevronDown
                size={14}
                style={{
                  color: '#64748b',
                  flexShrink: 0,
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
                width: 'min(330px, calc(100vw - 32px))',
                minWidth: '100%',
                zIndex: 9999,
                backgroundColor: '#ffffff',
                border: '1.5px solid #EADCC9',
                borderRadius: 10,
                boxShadow: '0 -8px 24px -4px rgba(74, 36, 14, 0.12), 0 -4px 8px -2px rgba(0, 0, 0, 0.06)',
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
                  backgroundColor: '#FAF5EE',
                  borderBottom: '1px solid #EADCC9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Search size={14} style={{ color: '#7B5233', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Tìm mã hoặc tên lỗi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  style={{
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    fontSize: 12.5,
                    width: '100%',
                    color: '#1e293b',
                  }}
                />
              </div>

              {/* Danh sách các Option */}
              <div ref={listContainerRef} style={{ overflowY: 'auto', flex: 1 }}>
                {filteredSearchOptions.length === 0 ? (
                  <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                      Không tìm thấy lỗi khớp trong hệ thống
                    </div>
                    {searchTerm.trim() && (
                      <button
                        type="button"
                        onClick={() => handleSwitchToCustom(searchTerm.trim())}
                        style={{
                          backgroundColor: '#fff7ed',
                          border: '1px solid #fdba74',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: '#b45309',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Sparkles size={13} /> Thêm lỗi "{searchTerm.trim()}" (Tự nhập)
                      </button>
                    )}
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
                          backgroundColor: isSelected ? '#FAF5EE' : '#ffffff',
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
                        {/* Bên Trái: Tên Lỗi trên 1 dòng gọn gàng (Bỏ mã lỗi) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 12.5,
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? '#7B5233' : '#334155',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {opt.name}
                          </span>
                        </div>

                        {/* Bên Phải: Badge CTQ / QA NỔI BẬT */}
                        {opt.isCTQ ? (
                          <span
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #f87171',
                              padding: '2px 7px',
                              borderRadius: 12,
                              fontSize: 9.5,
                              fontWeight: 800,
                              letterSpacing: '0.2px',
                              flexShrink: 0,
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
                              padding: '2px 7px',
                              borderRadius: 12,
                              fontSize: 9.5,
                              fontWeight: 700,
                              letterSpacing: '0.2px',
                              flexShrink: 0,
                            }}
                          >
                            QA
                          </span>
                        ) : null}
                      </div>
                    )
                  })
                )}

                {/* Nút tùy chọn nhập lỗi khác */}
                <div
                  onClick={() => handleSwitchToCustom()}
                  style={{
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    backgroundColor: '#FAF5EE',
                    borderTop: '1px dashed #EADCC9',
                    color: '#7B5233',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Sparkles size={14} style={{ color: '#7B5233' }} />
                  Ghi nhận lỗi khác (Tự nhập...)
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
          width: 86,
          flexShrink: 0,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
        }}
      >
        {!disabled && (
          <button
            type="button"
            className="pv2-stepper-btn"
            onClick={() => onChange && onChange({ ...row, qty: Math.max(0, (row.qty || 0) - 1) })}
            style={{
              width: 28,
              height: '100%',
              border: 'none',
              borderRight: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Minus size={13} />
          </button>
        )}
        <span
          className="pv2-stepper-val"
          style={{
            minWidth: 28,
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 13,
            color: Number(row.qty) > 0 ? '#b45309' : '#475569',
            padding: '0 2px',
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
              width: 28,
              height: '100%',
              border: 'none',
              borderLeft: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#b45309',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Nút xóa dòng */}
      {!disabled && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          style={{
            width: 32,
            height: 32,
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#ef4444',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          title="Xóa dòng lỗi này"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

export default ErrorTrendRow
