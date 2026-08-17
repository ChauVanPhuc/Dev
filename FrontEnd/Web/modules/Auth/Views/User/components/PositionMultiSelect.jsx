import React, { useState, useRef, useEffect, useMemo } from 'react';

const PositionMultiSelect = ({
  positions = [],
  selectedIds = [],
  onChange,
  disabled = false,
  placeholder = '-- Chọn Vị Trí --',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize selectedIds to numbers for robust comparison
  const normalizedSelectedIds = useMemo(() => {
    if (!Array.isArray(selectedIds)) {
      if (selectedIds) return [Number(selectedIds)];
      return [];
    }
    return selectedIds.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
  }, [selectedIds]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Focus search input when dropdown opens
      if (searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Filter positions by search query
  const filteredPositions = useMemo(() => {
    if (!searchTerm.trim()) return positions;
    const term = searchTerm.toLowerCase();
    return positions.filter(p => 
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.code && p.code.toLowerCase().includes(term))
    );
  }, [positions, searchTerm]);

  // Toggle a single position selection
  const handleToggle = (posId) => {
    const numericId = Number(posId);
    let newIds = [];
    if (normalizedSelectedIds.includes(numericId)) {
      newIds = normalizedSelectedIds.filter(id => id !== numericId);
    } else {
      newIds = [...normalizedSelectedIds, numericId];
    }
    onChange(newIds);
  };

  // Remove a specific tag
  const handleRemoveTag = (e, posId) => {
    e.stopPropagation();
    const numericId = Number(posId);
    const newIds = normalizedSelectedIds.filter(id => id !== numericId);
    onChange(newIds);
  };

  // Select all filtered items
  const handleSelectAll = (e) => {
    e.stopPropagation();
    const allFilteredIds = filteredPositions.map(p => Number(p.id));
    const merged = Array.from(new Set([...normalizedSelectedIds, ...allFilteredIds]));
    onChange(merged);
  };

  // Deselect all filtered items
  const handleDeselectAll = (e) => {
    e.stopPropagation();
    const filteredIdSet = new Set(filteredPositions.map(p => Number(p.id)));
    const newIds = normalizedSelectedIds.filter(id => !filteredIdSet.has(id));
    onChange(newIds);
  };

  // Selected position objects
  const selectedObjects = useMemo(() => {
    return positions.filter(p => normalizedSelectedIds.includes(Number(p.id)));
  }, [positions, normalizedSelectedIds]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Hidden input for HTML5 required form validation if required */}
      {required && (
        <input
          type="text"
          value={normalizedSelectedIds.length > 0 ? 'selected' : ''}
          required={required}
          onChange={() => {}}
          style={{
            opacity: 0,
            width: 0,
            height: 0,
            position: 'absolute',
            pointerEvents: 'none'
          }}
          tabIndex={-1}
        />
      )}

      {/* Main Trigger Box */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(prev => !prev);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '42px',
          padding: '4px 10px',
          backgroundColor: disabled ? '#F3F4F6' : '#FFFFFF',
          border: isOpen ? '1.5px solid #7B5233' : '1px solid #D1D5DB',
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(123, 82, 51, 0.15)' : 'none',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          boxSizing: 'border-box'
        }}
      >
        {/* Selected Tags / Placeholder */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'center',
          flex: 1,
          marginRight: '8px'
        }}>
          {selectedObjects.length === 0 ? (
            <span style={{
              color: disabled ? '#9CA3AF' : '#9CA3AF',
              fontSize: '0.86rem'
            }}>
              {placeholder}
            </span>
          ) : (
            selectedObjects.map(pos => (
              <span
                key={pos.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#FAF6F0',
                  color: '#7B5233',
                  border: '1px solid #EADCC9',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}
              >
                {pos.name}
                {!disabled && (
                  <span
                    onClick={(e) => handleRemoveTag(e, pos.id)}
                    title={`Bỏ chọn ${pos.name}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: '#EADCC9',
                      color: '#7B5233',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginLeft: '2px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#7B5233';
                      e.currentTarget.style.color = '#FFFFFF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#EADCC9';
                      e.currentTarget.style.color = '#7B5233';
                    }}
                  >
                    ✕
                  </span>
                )}
              </span>
            ))
          )}
        </div>

        {/* Right indicator: Count badge + Arrow */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexShrink: 0
        }}>
          {normalizedSelectedIds.length > 0 && (
            <span style={{
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              borderRadius: '10px',
              padding: '1px 7px',
              fontSize: '0.72rem',
              fontWeight: 'bold'
            }}>
              {normalizedSelectedIds.length}
            </span>
          )}

          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7B5233"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {/* Dropdown Menu Popover */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1.5px solid #EADCC9',
            zIndex: 9999,
            padding: '8px',
            boxSizing: 'border-box'
          }}
        >
          {/* Search Box */}
          <div style={{
            position: 'relative',
            marginBottom: '8px'
          }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm kiếm vị trí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '6px 10px 6px 28px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9CA3AF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          {/* Quick Actions Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 6px 8px',
            borderBottom: '1px solid #F3F4F6',
            marginBottom: '6px',
            fontSize: '0.75rem'
          }}>
            <span style={{ color: '#6B7280', fontWeight: '500' }}>
              Hiển thị: {filteredPositions.length} vị trí
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7B5233',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: 0
                }}
              >
                Chọn tất cả
              </button>
              <span style={{ color: '#D1D5DB' }}>|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: 0
                }}
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* Position List */}
          <div style={{
            maxHeight: '220px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            {filteredPositions.length === 0 ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#9CA3AF',
                fontSize: '0.82rem'
              }}>
                Không tìm thấy vị trí phù hợp
              </div>
            ) : (
              filteredPositions.map(pos => {
                const isSelected = normalizedSelectedIds.includes(Number(pos.id));
                return (
                  <div
                    key={pos.id}
                    onClick={() => handleToggle(pos.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Custom Checkbox */}
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: isSelected ? '1.5px solid #7B5233' : '1.5px solid #D1D5DB',
                      backgroundColor: isSelected ? '#7B5233' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}>
                      {isSelected && (
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="1 4 3.5 6.5 9 1"></polyline>
                        </svg>
                      )}
                    </div>

                    {/* Position Label & Description/Code */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1
                    }}>
                      <span style={{
                        fontSize: '0.84rem',
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? '#7B5233' : '#1F2937'
                      }}>
                        {pos.name}
                      </span>
                      {pos.code && (
                        <span style={{
                          fontSize: '0.72rem',
                          color: '#9CA3AF'
                        }}>
                          Mã: {pos.code}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionMultiSelect;
