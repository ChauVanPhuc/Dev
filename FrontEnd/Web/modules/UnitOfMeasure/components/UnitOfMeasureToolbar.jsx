// UnitOfMeasureToolbar.jsx - Thanh công cụ Quản lý đơn vị tính đồng bộ chuẩn Design System Đơn hàng xuất khẩu
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  Filter,
  Plus, 
  Upload, 
  Download, 
  X
} from 'lucide-react';

export const UnitOfMeasureToolbar = ({
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
  openCreateModal,
  openImportModal,
  handleExportExcel
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef(null);

  // Đóng dropdown sort khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="exp-toolbar">
      {/* Left Side: Ô tìm kiếm + Nút sắp xếp + Nút bật/tắt bộ lọc */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '320px' }}>
        {/* Ô tìm kiếm */}
        <div className="exp-search-box">
          <Search size={16} color="#7B5233" />
          <input 
            type="text" 
            placeholder="Tìm theo tên hoặc ký hiệu đơn vị tính..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button 
              type="button" 
              onClick={() => { setSearch(''); setPage(1); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#8D6E63' }}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Nút sắp xếp và Dropdown */}
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
                className="exp-dropdown-item"
                onClick={() => { setSortBy('id'); setSortDir('asc'); setIsSortOpen(false); }}
              >
                Thứ tự mặc định hệ thống
              </button>
              <button 
                type="button"
                className="exp-dropdown-item"
                onClick={() => { setSortBy('code'); setSortDir('asc'); setIsSortOpen(false); }}
              >
                Tên đơn vị tính (A → Z)
              </button>
              <button 
                type="button"
                className="exp-dropdown-item"
                onClick={() => { setSortBy('code'); setSortDir('desc'); setIsSortOpen(false); }}
              >
                Tên đơn vị tính (Z → A)
              </button>
              <button 
                type="button"
                className="exp-dropdown-item"
                onClick={() => { setSortBy('precision'); setSortDir('desc'); setIsSortOpen(false); }}
              >
                Độ chính xác cao nhất
              </button>
              <button 
                type="button"
                className="exp-dropdown-item"
                onClick={() => { setSortBy('precision'); setSortDir('asc'); setIsSortOpen(false); }}
              >
                Độ chính xác thấp nhất
              </button>
            </div>
          )}
        </div>

        {/* Nút bật/tắt bộ lọc nâng cao (Filter) */}
        <button 
          type="button"
          className={`exp-btn-icon ${isFilterOpen || activeFiltersCount > 0 ? 'active' : ''}`}
          onClick={() => setIsFilterOpen && setIsFilterOpen(!isFilterOpen)}
          title="Bộ lọc nâng cao"
        >
          <Filter size={16} />
          {activeFiltersCount > 0 && <span className="exp-badge-count">{activeFiltersCount}</span>}
        </button>
      </div>

      {/* Right Side: Các nút Nhập Excel, Xuất Excel, Thêm mới */}
      <div className="exp-actions-right">
        {/* Nút Nhập Excel */}
        <button 
          type="button"
          className="exp-btn-brown"
          onClick={openImportModal}
          title="Nhập danh sách đơn vị tính từ Excel"
        >
          <Upload size={16} />
          <span>Nhập Excel</span>
        </button>

        {/* Nút Xuất Excel */}
        <button 
          type="button"
          className="exp-btn-brown"
          onClick={() => handleExportExcel('filtered')}
          title="Xuất danh sách đơn vị tính ra Excel"
        >
          <Download size={16} />
          <span>Xuất Excel</span>
        </button>

        {/* Nút Thêm mới */}
        <button 
          type="button"
          className="exp-btn-brown"
          onClick={openCreateModal}
          title="Thêm mới đơn vị tính"
        >
          <Plus size={16} />
          <span>Thêm mới</span>
        </button>
      </div>
    </div>
  );
};

export default UnitOfMeasureToolbar;
