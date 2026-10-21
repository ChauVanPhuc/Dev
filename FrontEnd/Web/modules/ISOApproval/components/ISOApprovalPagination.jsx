import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Component ISOApprovalPagination - Chuẩn phân trang SmartFlow (đồng bộ với module Claim).
 */
export const ISOApprovalPagination = ({
  currentPage = 1,
  totalPages = 1,
  startIndex: startIndexProp,
  endIndex: endIndexProp,
  totalItems = 0,
  rowsPerPage = 12,
  onPageChange
}) => {
  const safeTotal = typeof totalItems === 'number' && !isNaN(totalItems) ? totalItems : 0;
  const safeCurrentPage = Math.max(1, currentPage || 1);
  const safeTotalPages = Math.max(1, totalPages || 1);

  const safeRows = (typeof rowsPerPage === 'number' && isFinite(rowsPerPage) && rowsPerPage > 0) ? rowsPerPage : (safeTotal || 1);

  const rawStart = (startIndexProp != null && isFinite(startIndexProp)) ? startIndexProp + 1 : (safeCurrentPage - 1) * safeRows + 1;
  const rawEnd = (endIndexProp != null && isFinite(endIndexProp)) ? Math.min(endIndexProp, safeTotal) : Math.min(safeCurrentPage * safeRows, safeTotal);

  const start = safeTotal > 0 ? (isFinite(rawStart) ? rawStart : 1) : 0;
  const end = safeTotal > 0 ? (isFinite(rawEnd) && rawEnd > 0 ? rawEnd : safeTotal) : 0;

  const getPaginationButtons = () => {
    const buttons = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) buttons.push(i);
    } else {
      buttons.push(1);
      if (safeCurrentPage > 3) buttons.push('...');
      const rangeStart = Math.max(2, safeCurrentPage - 1);
      const rangeEnd = Math.min(safeTotalPages - 1, safeCurrentPage + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) buttons.push(i);
      if (safeCurrentPage < safeTotalPages - 2) buttons.push('...');
      buttons.push(safeTotalPages);
    }
    return buttons;
  };

  const buttons = getPaginationButtons();

  return (
    <div 
      className="admin-pagination-desktop desktop-only"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #EADCC9',
        flexShrink: 0,
        gap: '12px'
      }}
    >
      <div style={{ color: '#8D6E63', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
        Hiển thị <b>{start}</b>–<b>{end}</b> trên <b>{safeTotal}</b> kết quả
      </div>
      <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center', marginLeft: 'auto' }}>
        <button
          type="button"
          className="page-btn"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange && onPageChange(Math.max(1, safeCurrentPage - 1))}
          style={{ 
            padding: '6px 8px', 
            borderRadius: '8px', 
            border: '1px solid #EADCC9', 
            backgroundColor: '#FAF6F0', 
            cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer', 
            opacity: safeCurrentPage <= 1 ? 0.4 : 1, 
            color: '#7B5233',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>
        {buttons.map((btn, idx) => (
          btn === '...' ? (
            <span key={`ellipsis-${idx}`} style={{ color: '#8D6E63', fontSize: '0.75rem', padding: '0 4px' }}>...</span>
          ) : (
            <button
              key={btn}
              type="button"
              className={`page-btn ${btn === safeCurrentPage ? 'active' : ''}`}
              onClick={() => onPageChange && onPageChange(btn)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #EADCC9',
                backgroundColor: btn === safeCurrentPage ? '#7B5233' : '#FAF6F0',
                color: btn === safeCurrentPage ? '#fff' : '#7B5233',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {btn}
            </button>
          )
        ))}
        <button
          type="button"
          className="page-btn"
          disabled={safeCurrentPage >= safeTotalPages}
          onClick={() => onPageChange && onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
          style={{ 
            padding: '6px 8px', 
            borderRadius: '8px', 
            border: '1px solid #EADCC9', 
            backgroundColor: '#FAF6F0', 
            cursor: safeCurrentPage >= safeTotalPages ? 'not-allowed' : 'pointer', 
            opacity: safeCurrentPage >= safeTotalPages ? 0.4 : 1, 
            color: '#7B5233',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Trang sau"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default ISOApprovalPagination;
