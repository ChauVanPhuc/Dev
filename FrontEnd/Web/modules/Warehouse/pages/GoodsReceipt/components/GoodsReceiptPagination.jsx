// GoodsReceiptPagination.jsx - Phân trang danh sách Nhập kho
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '../../../types/goodsReceipt.types';

export const GoodsReceiptPagination = ({
  page = 1,
  setPage,
  pageSize = 25,
  totalCount = 0,
  totalPages = 1,
  itemsLength = 0
}) => {
  const startIdx = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = totalCount === 0 ? 0 : (page - 1) * pageSize + itemsLength;

  // Tính toán danh sách số trang hiển thị
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(page - 1);
        pages.push(page);
        pages.push(page + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="wh-pagination">
      <div className="wh-pagination-info">
        Đang hiển thị <strong>{formatNumber(startIdx)}</strong> – <strong>{formatNumber(endIdx)}</strong> trên tổng{' '}
        <strong>{formatNumber(totalCount)}</strong> bản ghi
      </div>

      <div className="wh-pagination-pages">
        <button
          type="button"
          className="wh-btn-page"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          title="Trang trước"
        >
          <ChevronLeft size={15} />
        </button>

        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: '0 4px',
                  color: '#8D6E63',
                  fontSize: '0.8rem',
                  userSelect: 'none'
                }}
              >
                ...
              </span>
            );
          }
          return (
            <button
              key={p}
              type="button"
              className={`wh-btn-page ${page === p ? 'active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          className="wh-btn-page"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          title="Trang sau"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default GoodsReceiptPagination;
