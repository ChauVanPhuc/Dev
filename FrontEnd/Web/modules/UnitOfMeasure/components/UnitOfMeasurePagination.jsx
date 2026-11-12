import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const UnitOfMeasurePagination = ({
  page = 1,
  setPage,
  pageSize = 25,
  totalCount = 0,
  totalPages = 1,
  ordersLength = 0,
  itemLabel = 'đơn vị tính'
}) => {
  const safeTotal = totalCount || 0;
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, page), safeTotalPages);
  const rawStart = ordersLength > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const rawEnd = Math.min(safeCurrentPage * pageSize, safeTotal);

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

  return (
    <div className="exp-pagination-bar">
      <div className="exp-pagination-info">
        Hiển thị <b>{rawStart}</b>–<b>{rawEnd}</b> trên <b>{Number(safeTotal).toLocaleString('vi-VN')}</b> {itemLabel}
      </div>

      <div className="exp-pagination-controls">
        <button
          type="button"
          className="exp-page-btn"
          disabled={safeCurrentPage <= 1}
          onClick={() => setPage(Math.max(1, safeCurrentPage - 1))}
          title="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>

        {getPaginationButtons().map((btn, bIdx) => (
          btn === '...' ? (
            <span key={`ellipsis-${bIdx}`} style={{ color: '#8D6E63', fontSize: '0.75rem', padding: '0 4px' }}>
              ...
            </span>
          ) : (
            <button
              key={btn}
              type="button"
              className={`exp-page-btn ${btn === safeCurrentPage ? 'active' : ''}`}
              onClick={() => setPage(btn)}
            >
              {btn}
            </button>
          )
        ))}

        <button
          type="button"
          className="exp-page-btn"
          disabled={safeCurrentPage >= safeTotalPages}
          onClick={() => setPage(Math.min(safeTotalPages, safeCurrentPage + 1))}
          title="Trang sau"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default UnitOfMeasurePagination;

