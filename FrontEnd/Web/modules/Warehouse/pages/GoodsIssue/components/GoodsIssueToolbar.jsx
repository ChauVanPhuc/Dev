// GoodsIssueToolbar.jsx - Thanh công cụ danh sách Xuất kho
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ArrowUpDown,
  Filter,
  Columns,
  MoreHorizontal,
  Trash2,
  Upload,
  Download,
  Plus,
  X,
  RefreshCw
} from 'lucide-react';
import { GOODS_ISSUE_COLUMNS } from '../../../types/goodsIssue.types';

export const GoodsIssueToolbar = ({
  search = '',
  setSearch,
  setPage,
  sortBy,
  setSortBy,
  sortDir,
  setSortDir,
  isFilterOpen,
  setIsFilterOpen,
  activeFiltersCount = 0,
  visibleColumns = {},
  setVisibleColumns,
  handleToggleColumn,
  handleShowAllColumns,
  handleResetDefaultColumns,
  isColumnsMenuOpen,
  setIsColumnsMenuOpen,
  selectedIds = [],
  handleDeleteSelected,
  openUploadModal,
  handleExportExcel,
  openCreateModal,
  onSyncData
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isOtherOpen, setIsOtherOpen] = useState(false);

  const sortRef = useRef(null);
  const otherRef = useRef(null);
  const columnsRef = useRef(null);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
      if (otherRef.current && !otherRef.current.contains(e.target)) {
        setIsOtherOpen(false);
      }
      if (columnsRef.current && !columnsRef.current.contains(e.target)) {
        setIsColumnsMenuOpen?.(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsColumnsMenuOpen]);

  const sortOptions = [
    { key: 'created_at', label: 'Ngày tạo (Mới nhất - Cũ nhất)', dir: 'desc' },
    { key: 'created_at', label: 'Ngày tạo (Cũ nhất - Mới nhất)', dir: 'asc' },
    { key: 'issue_date', label: 'Ngày xuất kho (Mới nhất)', dir: 'desc' },
    { key: 'issue_date', label: 'Ngày xuất kho (Cũ nhất)', dir: 'asc' },
    { key: 'voucher_no', label: 'Mã phiếu (A - Z)', dir: 'asc' },
    { key: 'voucher_no', label: 'Mã phiếu (Z - A)', dir: 'desc' }
  ];

  return (
    <div className="wh-toolbar">
      {/* Phía trái: Tìm kiếm + Sắp xếp + Lọc + Cột hiển thị */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '320px' }}>
        {/* Ô tìm kiếm */}
        <div className="wh-search-box">
          <Search size={16} color="#7B5233" />
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, tên kho, mã/tên khách, người bàn giao..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                color: '#8D6E63'
              }}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Sắp xếp */}
        <div className="wh-dropdown-container" ref={sortRef}>
          <button
            type="button"
            className={`wh-btn-icon ${isSortOpen ? 'active' : ''}`}
            onClick={() => setIsSortOpen(!isSortOpen)}
            title="Sắp xếp danh sách"
          >
            <ArrowUpDown size={16} />
          </button>
          {isSortOpen && (
            <div className="wh-dropdown-menu" style={{ left: 0, right: 'auto', minWidth: '240px' }}>
              <div
                style={{
                  padding: '6px 14px',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  color: '#8D6E63',
                  textTransform: 'uppercase'
                }}
              >
                Tiêu chí sắp xếp
              </div>
              {sortOptions.map((opt, i) => {
                const isSelected = sortBy === opt.key && sortDir === opt.dir;
                return (
                  <button
                    key={i}
                    type="button"
                    className="wh-dropdown-item"
                    style={{
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? '#7B5233' : '#2D1A12',
                      backgroundColor: isSelected ? '#FAF6F0' : 'transparent'
                    }}
                    onClick={() => {
                      setSortBy(opt.key);
                      setSortDir(opt.dir);
                      setIsSortOpen(false);
                    }}
                  >
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Nút Ẩn/Hiện Bộ lọc */}
        <button
          type="button"
          className={`wh-btn-icon ${isFilterOpen ? 'active' : ''}`}
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          title="Bật/Tắt bộ lọc nâng cao"
        >
          <Filter size={16} />
          {activeFiltersCount > 0 && <span className="wh-badge-count">{activeFiltersCount}</span>}
        </button>

        {/* Dropdown Cột hiển thị */}
        <div className="wh-dropdown-container" ref={columnsRef}>
          <button
            type="button"
            className={`wh-btn-icon ${isColumnsMenuOpen ? 'active' : ''}`}
            onClick={() => setIsColumnsMenuOpen?.(!isColumnsMenuOpen)}
            title="Tùy chọn cột hiển thị"
          >
            <Columns size={16} />
          </button>
          {isColumnsMenuOpen && (
            <div className="wh-columns-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="wh-columns-dropdown-header">
                <span>Cột hiển thị</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowAllColumns?.();
                    }}
                    title="Hiển thị tất cả các cột"
                  >
                    Bật tất cả
                  </button>
                  <span style={{ color: '#D5C7B7' }}>|</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetDefaultColumns?.();
                    }}
                    title="Khôi phục cột mặc định"
                  >
                    Mặc định
                  </button>
                </div>
              </div>

              {GOODS_ISSUE_COLUMNS.filter((col) => col.key !== 'actions').map((col) => {
                const isChecked = Boolean(visibleColumns[col.key]);
                const isCore = Boolean(col.isCore);
                return (
                  <div
                    key={col.key}
                    className="wh-column-option"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCore) return;
                      handleToggleColumn?.(col.key);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isCore}
                      readOnly
                      style={{
                        cursor: isCore ? 'default' : 'pointer',
                        pointerEvents: 'none',
                        accentColor: '#7B5233',
                        width: '14px',
                        height: '14px',
                        margin: 0
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: isCore ? '#64748B' : '#334155',
                        fontWeight: isCore ? '600' : '400'
                      }}
                    >
                      {col.label} {isCore ? '(Cố định)' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Phía phải: Các nút hành động (Khác, Nhập Excel, Xuất Excel, + Thêm mới) */}
      <div className="wh-actions-right">
        {/* Nút Khác */}
        <div className="wh-dropdown-container" ref={otherRef}>
          <button
            type="button"
            className="wh-btn-brown"
            onClick={() => setIsOtherOpen(!isOtherOpen)}
            title="Tùy chọn thao tác khác"
          >
            <MoreHorizontal size={16} />
            <span>Khác</span>
          </button>
          {isOtherOpen && (
            <div className="wh-dropdown-menu">
              <button
                type="button"
                className="wh-dropdown-item"
                onClick={() => {
                  setIsOtherOpen(false);
                  onSyncData?.();
                }}
              >
                <RefreshCw size={15} color="#7B5233" />
                <span style={{ fontWeight: '600', color: '#7B5233' }}>Đồng bộ dữ liệu xuất kho</span>
              </button>
              {selectedIds && selectedIds.length > 0 && (
                <button
                  type="button"
                  className="wh-dropdown-item"
                  style={{ color: '#DC2626' }}
                  onClick={() => {
                    setIsOtherOpen(false);
                    handleDeleteSelected?.();
                  }}
                >
                  <Trash2 size={15} />
                  <span>Xóa các phiếu đã chọn ({selectedIds.length})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Nút Nhập Excel */}
        <button
          type="button"
          className="wh-btn-brown"
          onClick={openUploadModal}
          title="Nhập danh sách phiếu xuất kho từ tệp Excel"
        >
          <Upload size={16} />
          <span>Nhập Excel</span>
        </button>

        {/* Nút Xuất Excel */}
        <button
          type="button"
          className="wh-btn-brown"
          onClick={handleExportExcel}
          title="Xuất dữ liệu phiếu xuất kho ra tệp Excel"
        >
          <Download size={16} />
          <span>Xuất Excel</span>
        </button>

        {/* Nút Thêm mới */}
        <button
          type="button"
          className="wh-btn-primary"
          onClick={openCreateModal}
          title="Tạo phiếu xuất kho mới"
        >
          <Plus size={16} />
          <span>Thêm mới</span>
        </button>
      </div>
    </div>
  );
};

export default GoodsIssueToolbar;
