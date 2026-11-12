import React from 'react';
import { Search, X, RefreshCw, Download, Plus } from 'lucide-react';

export const RejectedGoodsToolbar = ({
  search = '',
  setSearch,
  onRefresh,
  onExportExcel,
  onCreate,
  loading = false
}) => {
  return (
    <div className="rg-toolbar">
      {/* Tìm kiếm đa năng */}
      <div className="rg-search-box">
        <Search size={16} className="rg-search-icon" />
        <input
          type="text"
          placeholder="Tìm theo mã phiếu, số CT gốc, mã VT, tên VT, lý do..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="rg-search-clear"
            onClick={() => setSearch('')}
            title="Xóa tìm kiếm"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Hành động Toolbar */}
      <div className="rg-toolbar-actions">
        <button
          type="button"
          className="rg-btn rg-btn-secondary"
          onClick={onRefresh}
          disabled={loading}
          title="Đồng bộ lại dữ liệu từ Database"
        >
          <RefreshCw size={14} className={loading ? 'wh-spin' : ''} />
          <span>Làm mới</span>
        </button>

        <button
          type="button"
          className="rg-btn rg-btn-secondary"
          onClick={onExportExcel}
          title="Xuất danh sách ra file Excel"
        >
          <Download size={14} />
          <span>Xuất Excel</span>
        </button>

        <button
          type="button"
          className="rg-btn rg-btn-primary"
          onClick={onCreate}
          title="Tạo mới phiếu hàng loại từ QC hoặc Trả về sản xuất"
        >
          <Plus size={15} />
          <span>+ Tạo phiếu hàng loại</span>
        </button>
      </div>
    </div>
  );
};

