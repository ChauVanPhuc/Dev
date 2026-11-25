// WarehousePagination.jsx - Phân trang Quản lý kho
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '../../../types/warehouseInventory.types';

export const WarehousePagination = ({
  page = 1,
  setPage,
  pageSize = 15,
  setPageSize,
  totalCount = 0,
  totalPages = 1,
  itemsLength = 0
}) => {
  const safeTotal = totalCount || 0;
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, page), safeTotalPages);
  const rawStart = safeTotal > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0;
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div className="exp-pagination-info">
          Hiển thị <b>{rawStart}</b>–<b>{rawEnd}</b> trên tổng số <b>{formatNumber(safeTotal)}</b> vật tư
        </div>

        {setPageSize && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#8D6E63' }}>Hiển thị:</span>
            {[10, 15].map((size) => (
              <button
                key={size}
                type="button"
                className={`exp-page-btn ${pageSize === size ? 'active' : ''}`}
                onClick={() => {
                  setPageSize(size);
                  setPage(1);
                }}
                style={{
                  padding: '0 8px',
                  height: '26px',
                  fontSize: '0.75rem',
                  fontWeight: pageSize === size ? '700' : '500',
                  minWidth: 'unset',
                  cursor: 'pointer'
                }}
              >
                {size} dòng
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="exp-pagination-controls">
        <button
          type="button"
          className="exp-page-btn"
          disabled={safeCurrentPage <= 1}
          onClick={() => setPage(Math.max(1, safeCurrentPage - 1))}
          title="Trang trước"
        >
          <ChevronLeft size={16} />
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
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default WarehousePagination;
