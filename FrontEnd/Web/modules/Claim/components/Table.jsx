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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px 0', flex: 1 }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #7B5233', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#FFFDFB', border: '1.5px dashed #E5E7EB', borderRadius: '16px', flex: 1 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p style={{ color: '#64748B', fontWeight: '500', fontSize: '1rem', margin: 0 }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="report-table-container">
      <table className="report-table">
        <thead>
          <tr>
            {headers.map((header, idx) => {
              if (header.isCheckbox) {
                return (
                  <th key={idx} className="checkbox-col">
                    {header.label}
                  </th>
                );
              }
              return (
                <th key={idx} className={header.className} style={header.style}>
                  {header.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
