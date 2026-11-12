import React, { useState, useEffect } from 'react';
import { X, Search, FileSpreadsheet } from 'lucide-react';

// Cửa sổ bảng thống kê chi tiết nguyên nhân lỗi
export const DetailedDefectTableModal = ({ isOpen = false, onClose, defectList = [], onDefectClick }) => {
  const [search, setSearch] = useState('');

  // Đóng modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = defectList.filter((d) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (d.defect_name && d.defect_name.toLowerCase().includes(s)) ||
      (d.defect_code && d.defect_code.toLowerCase().includes(s)) ||
      (d.category && d.category.toLowerCase().includes(s)) ||
      (d.category_name && d.category_name.toLowerCase().includes(s)) ||
      (d.aql_class && d.aql_class.toLowerCase().includes(s))
    );
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          width: '900px',
          maxWidth: '96vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          border: '1.5px solid #EADCC9',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tiêu đề cửa sổ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            backgroundColor: '#FAF8F5',
            borderBottom: '1.5px solid #EADCC9',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={18} style={{ color: '#5B3924' }} />
            <div style={{ fontSize: '0.90rem', fontWeight: '800', color: '#1E293B' }}>
              Bảng thống kê toàn bộ nguyên nhân lỗi
            </div>
          </div>

          <button
            type="button"
            className="page-btn"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            title="Đóng (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ô tìm kiếm */}
        <div className="filter" style={{ padding: '8px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Tìm mã lỗi, tên lỗi, mức AQL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: '30px',
                paddingLeft: '30px',
                paddingRight: '10px',
                border: '1px solid #D9C8B4',
                borderRadius: '6px',
                fontSize: '0.74rem',
                outline: 'none',
                background: '#FAF8F5'
              }}
            />
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '600' }}>
            Tổng số: <strong style={{ color: '#1E293B' }}>{filtered.length}</strong> nguyên nhân
          </span>
        </div>

        {/* Bảng dữ liệu */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 18px 12px 18px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem', marginTop: '8px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '1.5px solid #EADCC9' }}>
                <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Mã lỗi</th>
                <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Tên nguyên nhân</th>
                <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Nhóm lỗi</th>
                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Mức AQL</th>
                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Số lỗi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                    Không có nguyên nhân lỗi phù hợp
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr
                    key={item.defect_id || item.defect_code || idx}
                    onClick={() => {
                      if (onDefectClick) onDefectClick(item);
                      onClose();
                    }}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      transition: 'background-color 0.1s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAF8F5'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: '800', color: '#5B3924' }}>
                      {item.defect_code}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: '700', color: '#1E293B' }}>
                      {item.defect_name}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#64748B' }}>
                      {item.category_name || item.category}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          color: item.aql_class === 'Critical' ? '#B91C1C' : (item.aql_class === 'Major' ? '#C58A4B' : '#5B3924'),
                          backgroundColor: item.aql_class === 'Critical' ? '#FEF2F2' : (item.aql_class === 'Major' ? '#FFFBEB' : '#FAF8F5'),
                          border: `1px solid ${item.aql_class === 'Critical' ? '#FECACA' : '#EADCC9'}`,
                          borderRadius: '4px',
                          padding: '1px 6px'
                        }}
                      >
                        {item.aql_class}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '800', color: '#B91C1C' }}>
                      {item.count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DetailedDefectTableModal;

