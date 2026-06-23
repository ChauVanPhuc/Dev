import React from 'react';

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
    <div className="report-footer">
      <div>
        Hiển thị {Math.min(startIndex + 1, totalItems)}–{Math.min(endIndex, totalItems)} trên {totalItems} kết quả
      </div>
      <div className="pagination-group">
        <button
          className="pag-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          style={{ opacity: currentPage <= 1 ? 0.35 : 1, cursor: currentPage <= 1 ? 'default' : 'pointer' }}
        >
          &lt;
        </button>
        {buttons.map((btn, idx) => (
          btn === '...' ? (
            <span key={`ellipsis-${idx}`} className="pag-btn" style={{ cursor: 'default' }}>…</span>
          ) : (
            <button
              key={btn}
              className={`pag-btn ${btn === currentPage ? 'active' : ''}`}
              onClick={() => onPageChange(btn)}
            >
              {btn}
            </button>
          )
        ))}
        <button
          className="pag-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          style={{ opacity: currentPage >= totalPages ? 0.35 : 1, cursor: currentPage >= totalPages ? 'default' : 'pointer' }}
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
