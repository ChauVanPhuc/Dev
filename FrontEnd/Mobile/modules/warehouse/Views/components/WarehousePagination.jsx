import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumberVN } from '../../constants/warehouseConstants';

/**
 * Component phân trang tinh gọn, chuẩn Gold Design cho Kho Mobile
 * Mặc định 15 dòng/trang, hiển thị thanh đơn ngang sang trọng
 */
const WarehousePagination = ({
  page = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
}) => {
  if (totalCount === 0 && totalPages <= 1) return null;

  return (
    <div className="mwh-pagination-bar">
      <button
        type="button"
        className="mwh-page-nav-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft size={16} />
        <span>Trước</span>
      </button>

      <div className="mwh-page-center">
        <div className="mwh-page-indicator">
          Trang <strong>{page}</strong> / {totalPages || 1}
        </div>
        <div className="mwh-page-subtext">
          Tổng <strong>{formatNumberVN(totalCount)}</strong> phiếu
        </div>
      </div>

      <button
        type="button"
        className="mwh-page-nav-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Trang sau"
      >
        <span>Sau</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default WarehousePagination;
