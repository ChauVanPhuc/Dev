import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

const EMPTY_OPTIONS = [];

/**
 * SearchableSelect Component
 * Một ô chọn cao cấp cho phép tìm kiếm trực tiếp bên trong (Combobox).
 * Đặc biệt hữu ích cho danh sách dài như mã PO (1000+ mục).
 */
const SearchableSelect = ({
  label,
  value,
  onChange,
  options = EMPTY_OPTIONS,
  placeholder = "Chọn hoặc tìm...",
  readOnly = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Tìm label tương ứng với value đang chọn
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  // Khi component mount hoặc value thay đổi, đồng bộ searchTerm (nếu không đang mở)
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(displayValue);
    }
  }, [displayValue, isOpen]);

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
  const filteredOptions = options.filter(opt => {
    const label = opt?.label || '';
    const search = searchTerm || '';
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = (opt) => {
    onChange({ target: { value: opt.value } });
    setSearchTerm(opt.label);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (!readOnly) {
      setIsOpen(true);
      setSearchTerm(''); // Xóa để hiện toàn bộ list khi bắt đầu gõ
    }
  };

  return (
    <div ref={wrapperRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {label && (
        <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569', marginBottom: '2px', display: 'flex', alignItems: 'center' }}>
          {label} {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          readOnly={readOnly}
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          style={{
            width: '100%',
            height: '34px',
            padding: '0 35px 0 12px',
            borderRadius: '8px',
            border: `1px solid ${isOpen ? '#3b82f6' : '#cbd5e1'}`,
            fontSize: '0.9rem',
            backgroundColor: readOnly ? '#f8fafc' : '#ffffff',
            color: '#1e293b',
            outline: 'none',
            transition: 'borderColor 0.2s, boxShadow 0.2s',
            boxShadow: isOpen ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none'
          }}
        />
        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          {isOpen ? <Search size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
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
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto',
          animation: 'slideIn 0.2s ease-out'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => (
              <div
                key={index}
                onClick={() => handleSelect(opt)}
                style={{
                  padding: '10px 12px',
                  fontSize: '0.9rem',
                  color: opt.value === value ? '#2563eb' : '#334155',
                  backgroundColor: opt.value === value ? '#eff6ff' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: index === filteredOptions.length - 1 ? 'none' : '1px solid #f1f5f9',
                  transition: 'background 0.2s',
                  fontWeight: opt.value === value ? '600' : '400'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.target.style.backgroundColor = opt.value === value ? '#eff6ff' : 'transparent'}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              Không tìm thấy kết quả
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SearchableSelect;
