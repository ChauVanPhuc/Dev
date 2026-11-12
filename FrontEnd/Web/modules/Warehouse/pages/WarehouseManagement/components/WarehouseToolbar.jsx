// WarehouseToolbar.jsx - Thanh công cụ Quản lý kho
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ArrowUpDown,
  Filter,
  Columns,
  MoreHorizontal,
  Upload,
  Download,
  FileSpreadsheet,
  Printer,
  X,
  RotateCcw
} from 'lucide-react';
import { warehouseDataService } from '../../../services/warehouseData.service';
import { INVENTORY_COLUMN_GROUPS } from '../../../types/warehouseInventory.types';

export const WarehouseToolbar = ({
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
  // Columns
  visibleColumns = {},
  onToggleColumn,
  onShowAllColumns,
  onResetDefaultColumns,
  onToggleAllColumns,
  onOpenColumnModal,
  // Actions
  onOpenImportModal,
  onExportExcel,
  toast
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [isOtherOpen, setIsOtherOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const sortRef = useRef(null);
  const columnsRef = useRef(null);
  const otherRef = useRef(null);
  const exportRef = useRef(null);

  // Đóng các dropdown khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
      if (columnsRef.current && !columnsRef.current.contains(e.target)) {
        setIsColumnsMenuOpen(false);
      }
      if (otherRef.current && !otherRef.current.contains(e.target)) {
        setIsOtherOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleActionNotice = (title) => {
    setIsOtherOpen(false);
    if (toast?.info) {
      toast.info(`Tính năng "${title}" đang được hoàn thiện kết nối với phân hệ Kế toán kho. Vui lòng sử dụng Xuất Excel để đối soát.`);
    } else {
      alert(`Tính năng "${title}" đang được hoàn thiện kết nối với phân hệ Kế toán kho. Vui lòng sử dụng Xuất Excel để đối soát.`);
    }
  };

  return (
    <div className="exp-toolbar">
      {/* Phía trái: Tìm kiếm + Sắp xếp + Lọc + Cột hiển thị */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '320px' }}>
        {/* 1. Ô tìm kiếm */}
        <div className="exp-search-box">
          <Search size={16} color="#7B5233" />
          <input
            type="text"
            placeholder="Tìm theo mã vật tư, tên vật tư/hàng hóa..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (setPage) setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                if (setPage) setPage(1);
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

        {/* 2. Sắp xếp Dropdown */}
        <div className="exp-dropdown-container exp-sort-container" ref={sortRef}>
          <button
            type="button"
            className={`exp-btn-icon ${isSortOpen ? 'active' : ''}`}
            onClick={() => setIsSortOpen(!isSortOpen)}
            title="Sắp xếp danh sách"
          >
            <ArrowUpDown size={16} />
          </button>
          {isSortOpen && (
            <div className="exp-dropdown-menu" style={{ left: 0, right: 'auto', minWidth: '220px' }}>
              <button
                type="button"
                className={`exp-dropdown-item ${sortBy === 'item_code' && sortDir === 'asc' ? 'active' : ''}`}
                onClick={() => {
                  setSortBy('item_code');
                  setSortDir('asc');
                  setIsSortOpen(false);
                }}
              >
                Theo Mã vật tư (A → Z)
              </button>
              <button
                type="button"
                className={`exp-dropdown-item ${sortBy === 'item_code' && sortDir === 'desc' ? 'active' : ''}`}
                onClick={() => {
                  setSortBy('item_code');
                  setSortDir('desc');
                  setIsSortOpen(false);
                }}
              >
                Theo Mã vật tư (Z → A)
              </button>
              <button
                type="button"
                className={`exp-dropdown-item ${sortBy === 'item_name' && sortDir === 'asc' ? 'active' : ''}`}
                onClick={() => {
                  setSortBy('item_name');
                  setSortDir('asc');
                  setIsSortOpen(false);
                }}
              >
                Theo Tên vật tư (A → Z)
              </button>
              <button
                type="button"
                className={`exp-dropdown-item ${sortBy === 'closing_main' && sortDir === 'desc' ? 'active' : ''}`}
                onClick={() => {
                  setSortBy('closing_main');
                  setSortDir('desc');
                  setIsSortOpen(false);
                }}
              >
                Tồn cuối kỳ (Cao nhất)
              </button>
              <button
                type="button"
                className={`exp-dropdown-item ${sortBy === 'closing_main' && sortDir === 'asc' ? 'active' : ''}`}
                onClick={() => {
                  setSortBy('closing_main');
                  setSortDir('asc');
                  setIsSortOpen(false);
                }}
              >
                Tồn cuối kỳ (Thấp nhất)
              </button>
              <button
                type="button"
                className={`exp-dropdown-item ${sortBy === 'inventory_days' && sortDir === 'desc' ? 'active' : ''}`}
                onClick={() => {
                  setSortBy('inventory_days');
                  setSortDir('desc');
                  setIsSortOpen(false);
                }}
              >
                Thời gian tồn kho lâu nhất
              </button>
            </div>
          )}
        </div>

        {/* 3. Nút bật/tắt Bộ lọc mở rộng dạng ngang */}
        <button
          id="wh-filter-btn"
          type="button"
          className={`exp-btn-icon ${isFilterOpen || activeFiltersCount > 0 ? 'active' : ''}`}
          onClick={() => setIsFilterOpen && setIsFilterOpen(!isFilterOpen)}
          title="Bộ lọc nâng cao"
        >
          <Filter size={16} />
          {activeFiltersCount > 0 && <span className="exp-badge-count">{activeFiltersCount}</span>}
        </button>

        {/* 4. Cột hiển thị (Column Visibility Control) */}
        <div className="exp-dropdown-container" style={{ position: 'relative' }} ref={columnsRef}>
          <button
            id="wh-columns-btn"
            type="button"
            className={`exp-btn-icon ${isColumnsMenuOpen ? 'active' : ''}`}
            onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)}
            title="Cột hiển thị bảng"
          >
            <Columns size={16} />
          </button>
          {isColumnsMenuOpen && (
            <div
              className="wh-columns-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="wh-columns-panel-header">
                <span className="wh-columns-panel-title">Cột hiển thị</span>
                <div className="wh-columns-panel-actions">
                  <button
                    type="button"
                    className="wh-columns-panel-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleAllColumns) {
                        onToggleAllColumns();
                      } else if (onShowAllColumns) {
                        onShowAllColumns();
                      }
                    }}
                    title="Bật hoặc tắt tất cả các cột tùy chọn"
                  >
                    Bật/tắt tất cả
                  </button>
                  <span className="wh-columns-panel-divider">|</span>
                  <button
                    type="button"
                    className="wh-columns-panel-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onResetDefaultColumns) onResetDefaultColumns();
                    }}
                    title="Khôi phục danh sách cột mặc định"
                  >
                    Mặc định
                  </button>
                  <span className="wh-columns-panel-divider">|</span>
                  <button
                    type="button"
                    className="wh-columns-panel-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        localStorage.removeItem('smartflow_wh_mgmt_col_widths_v1');
                        window.location.reload();
                      } catch (err) { }
                    }}
                    title="Khôi phục chiều rộng cột về ban đầu"
                  >
                    Cỡ mặc định
                  </button>
                </div>
              </div>

              {/* Danh sách các nhóm cột và cột con */}
              <div className="wh-columns-panel-body">
                {INVENTORY_COLUMN_GROUPS.map((group) => {
                  const groupTitle = group.label || group.name;
                  return (
                    <div key={group.key} className="wh-columns-group-block">
                      <div className="wh-columns-group-header">
                        {groupTitle}
                      </div>
                      {group.columns.map((col) => {
                        const isChecked = !!visibleColumns[col.key];
                        const isCore = !!col.isCore;
                        const fullTooltip = col.desc
                          ? `${col.label} (${col.desc})${isCore ? ' - Cố định' : ''}`
                          : `${col.label}${isCore ? ' - Cố định' : ''}`;

                        return (
                          <div
                            key={col.key}
                            className={`wh-columns-item-row ${isCore ? 'is-core' : ''}`}
                            title={fullTooltip}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCore) return;
                              if (onToggleColumn) onToggleColumn(col.key);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isCore}
                              readOnly
                              className="wh-columns-checkbox"
                            />
                            <div className="wh-columns-item-label">
                              <span className="wh-col-name">{col.label}</span>
                              {col.desc && (
                                <span className="wh-col-desc"> — {col.desc}</span>
                              )}
                              {isCore && (
                                <span className="wh-col-core-tag"> (Cố định)</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phía phải: Khác | Nhập Excel | Xuất Excel */}
      <div className="exp-actions-right">
        {/* Nút Khác */}
        <div className="exp-dropdown-container" ref={otherRef}>
          <button
            type="button"
            className="exp-btn-brown"
            onClick={() => setIsOtherOpen(!isOtherOpen)}
            title="Thao tác khác"
          >
            <MoreHorizontal size={16} />
            <span>Khác</span>
          </button>
          {isOtherOpen && (
            <div className="exp-dropdown-menu">
              <button
                type="button"
                className="exp-dropdown-item"
                onClick={() => handleActionNotice('In bảng tổng hợp XNT')}
              >
                <Printer size={16} color="#7B5233" />
                <span style={{ fontWeight: '600', color: '#2D1A12' }}>In bảng tổng hợp XNT</span>
              </button>
              <button
                type="button"
                className="exp-dropdown-item"
                onClick={() => handleActionNotice('In thẻ kho chi tiết')}
              >
                <FileSpreadsheet size={16} color="#7B5233" />
                <span>In thẻ kho chi tiết</span>
              </button>
              <button
                type="button"
                className="exp-dropdown-item"
                style={{ borderTop: '1px solid #F3E8DF', color: '#7B5233' }}
                onClick={async () => {
                  setIsOtherOpen(false);
                  try {
                    await warehouseDataService.syncFromDatabase();
                    if (toast?.success) {
                      toast.success('Đã đồng bộ dữ liệu thực tế từ Database!');
                    }
                  } catch (err) {
                    console.error('[WarehouseToolbar] Lỗi đồng bộ Database:', err);
                    if (toast?.error) {
                      toast.error('Không thể đồng bộ dữ liệu: ' + (err?.message || 'Lỗi kết nối'));
                    }
                  }
                }}
              >
                <RotateCcw size={16} color="#7B5233" />
                <span style={{ fontWeight: '600', color: '#7B5233' }}>Đồng bộ dữ liệu từ Database</span>
              </button>
            </div>
          )}
        </div>

        {/* Nút Nhập Excel */}
        <button
          type="button"
          className="exp-btn-brown"
          onClick={onOpenImportModal}
          title="Nhập dữ liệu vật tư / tồn kho từ Excel"
        >
          <Upload size={16} />
          <span>Nhập Excel</span>
        </button>

        {/* Nút Xuất Excel */}
        <div className="exp-dropdown-container" ref={exportRef}>
          <button
            type="button"
            className="exp-btn-brown"
            onClick={() => setIsExportOpen(!isExportOpen)}
            title="Xuất báo cáo XNT ra Excel"
          >
            <Download size={16} />
            <span>Xuất Excel</span>
          </button>
          {isExportOpen && (
            <div className="exp-dropdown-menu">
              <button
                type="button"
                className="exp-dropdown-item"
                onClick={() => {
                  setIsExportOpen(false);
                  if (onExportExcel) onExportExcel();
                }}
              >
                <Download size={16} />
                <span>Xuất toàn bộ danh sách Excel</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseToolbar;
