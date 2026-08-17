import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

const EMPTY_OPTIONS = [];

/**
 * SearchableSelect Component
 * Ô chọn thông minh hỗ trợ tìm kiếm trực tiếp (Combobox), gọi API động, badge CTQ / QA Track và nhập mã tự do.
 */
const SearchableSelect = ({
  label,
  value,
  onChange,
  onSearch,
  options = EMPTY_OPTIONS,
  placeholder = "Chọn hoặc tìm...",
  readOnly = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Tìm option tương ứng với value đang chọn
  const selectedOption = options.find(opt => String(opt.value) === String(value) || (opt.id && String(opt.id) === String(value)));
  const displayValue = selectedOption ? (selectedOption.code ? `[${selectedOption.code}] ${selectedOption.name || selectedOption.label}` : (selectedOption.name || selectedOption.label)) : (value || '');

  // Khi component mount hoặc value thay đổi, đồng bộ searchTerm (nếu không đang mở)
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(displayValue);
    }
  }, [displayValue, isOpen]);

  // Gọi callback onSearch khi searchTerm thay đổi
  useEffect(() => {
    if (onSearch && isOpen && searchTerm) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        onSearch(searchTerm);
      }, 250);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm, isOpen, onSearch]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lọc danh sách dựa trên searchTerm
  const cleanSearch = (searchTerm || '').trim().toLowerCase();
  const filteredOptions = options.filter(opt => {
    const label = opt?.label || '';
    const val = opt?.value || '';
    const code = opt?.code || '';
    const name = opt?.name || '';
    return label.toLowerCase().includes(cleanSearch) ||
      String(val).toLowerCase().includes(cleanSearch) ||
      code.toLowerCase().includes(cleanSearch) ||
      name.toLowerCase().includes(cleanSearch);
  });

  const exactMatch = options.some(opt => 
    (opt?.label || '').toLowerCase() === cleanSearch || 
    String(opt?.value || '').toLowerCase() === cleanSearch ||
    (opt?.code && opt.code.toLowerCase() === cleanSearch) ||
    (opt?.name && opt.name.toLowerCase() === cleanSearch)
  );

  const handleSelect = (opt) => {
    onChange({ target: { value: opt.value ?? opt.id } });
    setSearchTerm(opt.code ? `[${opt.code}] ${opt.name || opt.label}` : (opt.name || opt.label));
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (!readOnly) {
      setIsOpen(true);
      setSearchTerm(''); // Xóa để hiện toàn bộ list khi bắt đầu gõ
      if (onSearch) {
        onSearch('');
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = (searchTerm || '').trim();
      if (!trimmed) return;

      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      } else {
        handleSelect({ label: trimmed, value: trimmed });
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isSelectedQA = selectedOption?.isQA || selectedOption?.needs_tracking || selectedOption?.qc_tracking || selectedOption?.is_tracked_by_me;
  const isSelectedCTQ = selectedOption?.isCTQ;

  return (
    <div ref={wrapperRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {label && (
        <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569', marginBottom: '2px', display: 'flex', alignItems: 'center' }}>
          {label} {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          readOnly={readOnly}
          value={(isOpen ? searchTerm : displayValue) ?? ''}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            height: '36px',
            padding: `0 ${!isOpen && (isSelectedCTQ || isSelectedQA) ? '96px' : '36px'} 0 12px`,
            borderRadius: '8px',
            border: `1px solid ${isOpen ? '#7B5233' : isSelectedCTQ ? '#f87171' : isSelectedQA ? '#fdba74' : '#cbd5e1'}`,
            fontSize: '0.88rem',
            backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
            color: '#1e293b',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: isOpen ? '0 0 0 3px rgba(123, 82, 51, 0.12)' : 'none'
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {/* Badge QA Track / CTQ in Selected State */}
          {!isOpen && isSelectedCTQ ? (
            <span
              style={{
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #f87171',
                padding: '2px 7px',
                borderRadius: '10px',
                fontSize: '9px',
                fontWeight: 800,
                letterSpacing: '0.3px',
                boxShadow: '0 1px 2px rgba(185, 28, 28, 0.15)',
                whiteSpace: 'nowrap'
              }}
            >
              CTQ
            </span>
          ) : !isOpen && isSelectedQA ? (
            <span
              style={{
                backgroundColor: '#fff7ed',
                color: '#c2410c',
                border: '1px solid #fdba74',
                padding: '2px 7px',
                borderRadius: '10px',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap'
              }}
            >
              QA Track
            </span>
          ) : null}

          <div 
            onClick={() => {
              if (!readOnly) {
                if (isOpen && searchTerm.trim()) {
                  handleSelect({ label: searchTerm.trim(), value: searchTerm.trim() });
                } else {
                  setIsOpen(!isOpen);
                }
              }
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer',
              padding: '2px'
            }}
          >
            {isOpen ? <Search size={15} color="#7B5233" /> : <ChevronDown size={15} color="#64748b" />}
          </div>
        </div>
      </div>

      {isOpen && !readOnly && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          maxHeight: '240px',
          overflowY: 'auto',
          animation: 'slideIn 0.2s ease-out'
        }}>
          {/* Tuỳ chọn gõ trực tiếp nếu người dùng nhập mã chưa có trong options */}
          {cleanSearch && !exactMatch && (
            <div
              onClick={() => handleSelect({ label: searchTerm.trim(), value: searchTerm.trim() })}
              style={{
                padding: '9px 12px',
                fontSize: '0.85rem',
                color: '#7B5233',
                backgroundColor: '#fdf8f4',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f5ede6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#fdf8f4'}
            >
              <span>🔍</span> Chọn nhập: <strong>"{searchTerm.trim()}"</strong>
            </div>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => {
              const isSelected = String(opt.value) === String(value) || (opt.id && String(opt.id) === String(value));
              const isOptionQA = Boolean(opt.isQA || opt.needs_tracking || opt.qc_tracking || opt.is_tracked_by_me);
              const isOptionCTQ = Boolean(opt.isCTQ);

              return (
                <div
                  key={opt.value || opt.id || index}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: '9px 12px',
                    fontSize: '0.88rem',
                    color: isSelected ? '#4B301E' : '#334155',
                    backgroundColor: isSelected ? '#fdf8f4' : 'transparent',
                    cursor: 'pointer',
                    borderBottom: index === filteredOptions.length - 1 ? 'none' : '1px solid #f8fafc',
                    transition: 'background 0.15s ease',
                    fontWeight: isSelected ? '700' : '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Left: Code & Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                    {opt.code ? (
                      <strong style={{ color: '#4B301E', flexShrink: 0 }}>[{opt.code}]</strong>
                    ) : null}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.name || opt.label}
                    </span>
                  </div>

                  {/* Right: Badge CTQ / QA Track */}
                  {isOptionCTQ ? (
                    <span
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #f87171',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.4px',
                        flexShrink: 0,
                        boxShadow: '0 1px 2px rgba(185, 28, 28, 0.15)'
                      }}
                    >
                      CTQ
                    </span>
                  ) : isOptionQA ? (
                    <span
                      style={{
                        backgroundColor: '#fff7ed',
                        color: '#c2410c',
                        border: '1px solid #fdba74',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        flexShrink: 0
                      }}
                    >
                      QA Track
                    </span>
                  ) : opt.badge ? (
                    <span
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: 600,
                        flexShrink: 0
                      }}
                    >
                      {opt.badge}
                    </span>
                  ) : null}
                </div>
              );
            })
          ) : (
            !cleanSearch && (
              <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                Không có dữ liệu
              </div>
            )
          )}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SearchableSelect;
