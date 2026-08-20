import React from 'react'

/**
 * DataTable Component
 * Bảng dữ liệu phong cách Mobile ERP với tiêu đề màu nâu.
 */
const DataTable = ({ columns, data, onRowClick, stickyHeader = false, stickyTopOffset = 0 }) => {
  return (
    <div style={{ 
      width: '100%', 
      overflowX: stickyHeader ? 'visible' : 'auto', 
      borderRadius: '8px', 
      border: '1px solid #e5e7eb' 
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'clamp(0.7rem, 2.4vw, 0.85rem)' }}>
        <thead>
          <tr style={{ backgroundColor: '#78523b' }}>
            {columns.map((col, index) => (
              <th 
                key={index}
                style={{
                  padding: 'clamp(6px, 1.8vw, 8px) clamp(2px, 1vw, 4px)',
                  color: '#ffffff',
                  fontWeight: '700',
                  textAlign: 'center',
                  borderRight: index < columns.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  position: stickyHeader ? 'sticky' : 'static',
                  top: stickyHeader ? stickyTopOffset : undefined,
                  zIndex: stickyHeader ? 15 : undefined,
                  backgroundColor: '#78523b',
                  fontSize: 'clamp(0.68rem, 2.2vw, 0.8rem)',
                  wordBreak: 'break-word',
                  whiteSpace: col.nowrap ? 'nowrap' : 'normal'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                onClick={() => onRowClick && onRowClick(row)}
                style={{ 
                  backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#fcfaf9',
                  borderBottom: rowIndex < data.length - 1 ? '1px solid #e5e7eb' : 'none',
                  cursor: onRowClick ? 'pointer' : 'default'
                }}
                onMouseEnter={(e) => onRowClick && (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                onMouseLeave={(e) => onRowClick && (e.currentTarget.style.backgroundColor = rowIndex % 2 === 0 ? '#ffffff' : '#fcfaf9')}
              >
                {columns.map((col, colIndex) => (
                  <td 
                    key={colIndex}
                    style={{
                      padding: 'clamp(8px, 2.2vw, 10px) clamp(2px, 1vw, 4px)',
                      color: '#374151',
                      textAlign: 'center',
                      borderRight: colIndex < columns.length - 1 ? '1px solid #e5e7eb' : 'none',
                      fontWeight: colIndex === 0 ? '600' : '400',
                      wordBreak: 'break-word',
                      whiteSpace: col.nowrap ? 'nowrap' : 'normal',
                      fontSize: 'clamp(0.68rem, 2.2vw, 0.8rem)'
                    }}
                  >
                    {col.render ? (
                      col.render(row, rowIndex)
                    ) : col.key === 'status' ? (
                      <span style={{
                        backgroundColor: 
                          row[col.key] === 'Đang làm' || row[col.key] === 'Chờ Kiểm Tra' || row[col.key] === 'Chờ QC Kiểm Tra' ? '#dbeafe' : 
                          row[col.key] === 'Chờ giao' || row[col.key] === 'Chờ Nhận Hàng' ? '#fef9c3' : 
                          row[col.key] === 'Đã HT' || row[col.key] === 'Hoàn thành' || row[col.key] === 'Hoàn Thành QC' ? '#dcfce7' : '#f3f4f6',
                        color: 
                          row[col.key] === 'Đang làm' || row[col.key] === 'Chờ Kiểm Tra' || row[col.key] === 'Chờ QC Kiểm Tra' ? '#1e40af' : 
                          row[col.key] === 'Chờ giao' || row[col.key] === 'Chờ Nhận Hàng' ? '#854d0e' : 
                          row[col.key] === 'Đã HT' || row[col.key] === 'Hoàn thành' || row[col.key] === 'Hoàn Thành QC' ? '#166534' : '#4b5563',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        whiteSpace: 'nowrap'
                      }}>
                        {row[col.key]}
                      </span>
                    ) : (
                      row[col.key]
                    )}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.82rem' }}>
                Không có chi tiết trong công đoạn này
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
