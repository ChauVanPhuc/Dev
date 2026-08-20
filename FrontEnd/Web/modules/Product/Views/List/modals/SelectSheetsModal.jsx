import React, { useState, useMemo } from 'react';
import { X, CheckSquare, Square, FileSpreadsheet, Layers, Tag, Search, Check, AlertCircle, ArrowRight } from 'lucide-react';

const SelectSheetsModal = ({ file, sheets = [], onClose, onConfirm }) => {
  // Initialize with all valid sheets selected
  const [selectedSheets, setSelectedSheets] = useState(() => {
    return sheets.filter(s => s.is_valid !== false && (s.product_count > 0 || s.rows > 5)).map(s => s.name);
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Filter sheets by search term
  const filteredSheets = useMemo(() => {
    if (!searchTerm.trim()) return sheets;
    const term = searchTerm.toLowerCase().trim();
    return sheets.filter(s => {
      const nameMatch = (s.name || '').toLowerCase().includes(term);
      const descMatch = (s.description || '').toLowerCase().includes(term);
      const colorMatch = (s.color || '').toLowerCase().includes(term);
      const brandMatch = (s.brand || '').toLowerCase().includes(term);
      const prodMatch = (s.products || []).some(p => p.toLowerCase().includes(term));
      return nameMatch || descMatch || colorMatch || brandMatch || prodMatch;
    });
  }, [sheets, searchTerm]);

  const toggleSheet = (name) => {
    setSelectedSheets(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const selectAll = () => {
    setSelectedSheets(sheets.map(s => s.name));
  };

  const deselectAll = () => {
    setSelectedSheets([]);
  };

  const selectValidOnly = () => {
    setSelectedSheets(sheets.filter(s => s.product_count > 0).map(s => s.name));
  };

  // Calculate statistics
  const totalSelected = selectedSheets.length;
  const totalProdsSelected = useMemo(() => {
    return sheets
      .filter(s => selectedSheets.includes(s.name))
      .reduce((sum, s) => sum + (s.product_count || 0), 0);
  }, [sheets, selectedSheets]);

  const handleConfirm = () => {
    if (selectedSheets.length === 0) return;
    onConfirm(selectedSheets);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(45, 26, 18, 0.55)',
      backdropFilter: 'blur(4px)',
      zIndex: 2500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '860px',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(45, 26, 18, 0.25)',
        overflow: 'hidden',
        border: '1.5px solid #EADCC9',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1.5px solid #EADCC9',
          background: 'linear-gradient(135deg, #FAF6F0 0%, #FFFFFF 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              backgroundColor: '#432818', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2D1A12', margin: 0 }}>
                Tùy chọn Sheets để Import BOM
              </h3>
              <div style={{ fontSize: '0.82rem', color: '#795548', marginTop: '2px', fontWeight: '500' }}>
                File: <span style={{ fontWeight: '700', color: '#432818' }}>{file?.name || 'Excel BOM'}</span> • {sheets.length} sheets tìm thấy
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#FAF6F0', border: '1px solid #EADCC9',
              borderRadius: '8px', cursor: 'pointer',
              color: '#2D1A12', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '6px', transition: 'all 0.2s'
            }}
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div style={{
          padding: '12px 24px',
          backgroundColor: '#FCFAF7',
          borderBottom: '1px solid #EADCC9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* Quick buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={selectAll}
              style={{
                padding: '6px 12px', fontSize: '0.8rem', fontWeight: '700',
                backgroundColor: '#FFFFFF', border: '1px solid #D7CCC8',
                borderRadius: '6px', color: '#432818', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <CheckSquare size={14} /> Chọn tất cả ({sheets.length})
            </button>
            <button
              onClick={selectValidOnly}
              style={{
                padding: '6px 12px', fontSize: '0.8rem', fontWeight: '700',
                backgroundColor: '#FFFFFF', border: '1px solid #D7CCC8',
                borderRadius: '6px', color: '#2E7D32', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Layers size={14} /> Có sản phẩm
            </button>
            <button
              onClick={deselectAll}
              style={{
                padding: '6px 12px', fontSize: '0.8rem', fontWeight: '700',
                backgroundColor: '#FFFFFF', border: '1px solid #D7CCC8',
                borderRadius: '6px', color: '#C62828', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Square size={14} /> Bỏ chọn
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8D6E63' }} />
            <input
              type="text"
              placeholder="Lọc tên sheet, mã SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px 6px 30px',
                fontSize: '0.82rem', fontWeight: '600',
                border: '1px solid #D7CCC8', borderRadius: '6px',
                outline: 'none', backgroundColor: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Sheets List / Grid */}
        <div style={{
          padding: '16px 24px',
          overflowY: 'auto',
          maxHeight: '440px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {filteredSheets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8D6E63' }}>
              <AlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.6 }} />
              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Không tìm thấy sheet nào phù hợp từ khóa tìm kiếm.</div>
            </div>
          ) : (
            filteredSheets.map((sheet, idx) => {
              const isSelected = selectedSheets.includes(sheet.name);
              return (
                <div
                  key={idx}
                  onClick={() => toggleSheet(sheet.name)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: isSelected ? '1.5px solid #432818' : '1px solid #EADCC9',
                    backgroundColor: isSelected ? '#FAF6F0' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(67, 40, 24, 0.08)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div
                        style={{
                          width: '18px', height: '18px',
                          accentColor: '#432818', cursor: 'pointer'
                        }}
                      />
                      <div>
                        <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#2D1A12' }}>
                          {sheet.name}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#795548', marginLeft: '10px' }}>
                          ({sheet.rows} dòng)
                        </span>
                      </div>
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {sheet.brand && (
                        <span style={{
                          padding: '3px 8px', fontSize: '0.75rem', fontWeight: '700',
                          backgroundColor: '#EFEBE9', color: '#4E342E',
                          borderRadius: '4px'
                        }}>
                          {sheet.brand}
                        </span>
                      )}
                      {sheet.color && (
                        <span style={{
                          padding: '3px 8px', fontSize: '0.75rem', fontWeight: '700',
                          backgroundColor: '#FFF3E0', color: '#E65100',
                          borderRadius: '4px'
                        }}>
                          Màu {sheet.color}
                        </span>
                      )}
                      <span style={{
                        padding: '3px 8px', fontSize: '0.75rem', fontWeight: '700',
                        backgroundColor: sheet.product_count > 0 ? '#E8F5E9' : '#ECEFF1',
                        color: sheet.product_count > 0 ? '#2E7D32' : '#78909C',
                        borderRadius: '4px'
                      }}>
                        {sheet.product_count} Sản phẩm
                      </span>
                    </div>
                  </div>

                  {/* Product SKU Preview Tags */}
                  {sheet.products && sheet.products.length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      paddingLeft: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '5px'
                    }}>
                      <Tag size={12} style={{ color: '#8D6E63' }} />
                      {sheet.products.slice(0, 8).map((p, pIdx) => (
                        <span
                          key={pIdx}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            backgroundColor: '#ECEFF1',
                            color: '#37474F',
                            padding: '1px 6px',
                            borderRadius: '3px'
                          }}
                        >
                          {p}
                        </span>
                      ))}
                      {sheet.products.length > 8 && (
                        <span style={{ fontSize: '0.72rem', color: '#8D6E63', fontStyle: 'italic' }}>
                          +{sheet.products.length - 8} sản phẩm khác
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1.5px solid #EADCC9',
          backgroundColor: '#FAF6F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2D1A12' }}>
              Đã chọn: <span style={{ color: '#432818', fontSize: '1rem' }}>{totalSelected}</span> / {sheets.length} sheets
            </span>
            {totalProdsSelected > 0 && (
              <span style={{ fontSize: '0.82rem', color: '#2E7D32', marginLeft: '12px', fontWeight: '600' }}>
                (~{totalProdsSelected} sản phẩm mẫu)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #8D6E63',
                borderRadius: '8px',
                color: '#432818',
                fontWeight: '700',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={totalSelected === 0}
              style={{
                padding: '10px 24px',
                backgroundColor: totalSelected > 0 ? '#432818' : '#BCAAA4',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: '0.88rem',
                cursor: totalSelected > 0 ? 'pointer' : 'not-allowed',
                boxShadow: totalSelected > 0 ? '0 4px 12px rgba(67, 40, 24, 0.25)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowRight size={16} /> Bắt đầu Import ({totalSelected} sheets)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectSheetsModal;
