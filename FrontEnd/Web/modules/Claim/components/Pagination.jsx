import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Component Pagination hỗ trợ phân trang bảng.
 */
export const Pagination = ({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange
}) => {
  const getPaginationButtons = () => {
    const buttons = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) buttons.push(i);
    } else {
      buttons.push(1);
      if (currentPage > 3) buttons.push('...');
      const rangeStart = Math.max(2, currentPage - 1);
      const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) buttons.push(i);
      if (currentPage < totalPages - 2) buttons.push('...');
      buttons.push(totalPages);
    }
    return buttons;
  };

  const buttons = getPaginationButtons();

  return (
    <div className="admin-pagination-desktop desktop-only">
      <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
        Hiển thị <b>{Math.min(startIndex + 1, totalItems)}</b>–<b>{Math.min(endIndex, totalItems)}</b> trên <b>{totalItems}</b> kết quả
      </div>
      <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        <button
          className="page-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.5 : 1, color: '#7B5233' }}
        >
          <ChevronLeft size={14} />
        </button>
        {buttons.map((btn, idx) => (
          btn === '...' ? (
            <span key={`ellipsis-${idx}`} style={{ color: '#8D6E63', fontSize: '0.7rem', padding: '0 4px' }}>...</span>
          ) : (
            <button
              key={btn}
              className={`page-btn ${btn === currentPage ? 'active' : ''}`}
              onClick={() => onPageChange(btn)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #EADCC9',
                backgroundColor: btn === currentPage ? '#7B5233' : '#FAF6F0',
                color: btn === currentPage ? '#fff' : '#7B5233',
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
          className="page-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.5 : 1, color: '#7B5233' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
