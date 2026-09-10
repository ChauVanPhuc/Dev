import React from 'react';

/**
 * Component Table chuẩn hóa cấu trúc bảng ERP.
 * Hỗ trợ trạng thái Loading và Trạng thái dữ liệu trống (Empty).
 */
export const Table = ({
  loading,
  isEmpty,
  emptyMessage = 'Không tìm thấy dữ liệu phù hợp.',
  headers = [],
  children
}) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', flex: 1, minHeight: '200px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #7B5233', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', margin: 0 }}>
        <thead>
          <tr style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9' }}>
            {headers.map((header, idx) => {
              if (header.isCheckbox) {
                return (
                  <th key={idx} className="checkbox-col" style={{ width: '60px', textAlign: 'center', padding: '8px 10px', backgroundColor: '#FAF6F0' }}>
                    {header.label}
                  </th>
                );
              }
              return (
                <th key={idx} className={header.className} style={{ padding: '8px 12px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', backgroundColor: '#FAF6F0', ...header.style }}>
                  {header.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody style={{ flex: 1 }}>
          {isEmpty ? (
            <tr>
              <td colSpan={Math.max(1, headers.length)} style={{ padding: '80px 20px', textAlign: 'center', backgroundColor: '#FFFDFB' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <p style={{ color: '#64748B', fontWeight: '500', fontSize: '1rem', margin: 0 }}>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
