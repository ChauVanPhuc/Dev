import React, { useState, useRef } from 'react';
import { 
  Search, Filter, Plus, Upload, Download, MoreHorizontal, MoreVertical,
  Trash2, Edit, Eye, X, ChevronLeft, ChevronRight,
  FileSpreadsheet, Folder, Columns, RotateCcw,
  FileText, Layers, CheckCircle2, ArrowUpDown
} from 'lucide-react';
import { 
  COLUMN_CONFIG, 
  renderClassificationBadge, 
  renderDocStatusBadge 
} from './isoMasterRecordUtils';

const DEPARTMENT_OPTIONS = [
  { code: 'HCNS', name: 'Hành chính Nhân sự' },
  { code: 'BGĐ', name: 'Ban Giám Đốc' },
  { code: 'KD', name: 'Kinh doanh' },
  { code: 'SX', name: 'Sản xuất' },
  { code: 'QC', name: 'Kiểm soát chất lượng (QC)' },
  { code: 'KHO', name: 'Kho vận' },
  { code: 'KT', name: 'Kế toán' },
  { code: 'KTH', name: 'Kỹ thuật' }
];

export const ISOMasterRecordTable = ({
  records = [],
  loading = false,
  totalCount = 0,
  totalPages = 1,
  page = 1,
  setPage,
  pageSize = 25,
  setPageSize,
  stats = {},
  // Filters
  search = '',
  setSearch,
  sortBy = 'id',
  setSortBy,
  sortDir = 'asc',
  setSortDir,
  selectedIds = [],
  setSelectedIds,
  classificationFilter = '',
  setClassificationFilter,
  groupFilter = '',
  setGroupFilter,
  codeFilter = '',
  setCodeFilter,
  deptFilter = '',
  setDeptFilter,
  statusFilter = '',
  setStatusFilter,
  paFilter = '',
  setPaFilter,
  docNameFilter = '',
  setDocNameFilter,
  editionFilter = '',
  setEditionFilter,
  managementDocFilter = '',
  setManagementDocFilter,
  notesFilter = '',
  setNotesFilter,
  resetAllFilters,
  activeFiltersCount = 0,
  filterOptions = {},
  activeDropdown,
  setActiveDropdown,
  // Columns
  visibleColumns = {},
  setVisibleColumns,
  handleToggleColumn,
  handleShowAllColumns,
  isColumnsMenuOpen,
  setIsColumnsMenuOpen,
  // Actions
  handleOpenDetailModal,
  openCreateModal,
  openUploadModal,
  handleExportExcel,
  handleSingleDelete,
  activeNoteModal,
  setActiveNoteModal,
  actionMenuId,
  setActionMenuId,
  isExportOpen,
  setIsExportOpen,
  isOtherOpen,
  setIsOtherOpen
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const exportDropdownRef = useRef(null);
  const otherDropdownRef = useRef(null);
  const columnsMenuRef = useRef(null);

  return (
    <div className="iso-master-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        .dashboard-content:has(.iso-master-container),
        .dashboard-content.allow-y-scroll:has(.iso-master-container) {
          height: calc(100dvh - 60px) !important;
          max-height: calc(100dvh - 60px) !important;
          min-height: 0 !important;
          padding: 8px 14px 8px 14px !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          box-sizing: border-box !important;
        }
        .dashboard-content:has(.iso-master-container) > div {
          height: 100% !important;
          max-height: 100% !important;
          min-height: 0 !important;
          flex: 1 1 auto !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }
        `
      }} />

      {/* STATS OVERVIEW CARDS (Always 1 single row) */}
      <div className="iso-stats-grid">
        <div className="iso-stat-card">
          <div className="iso-stat-info">
            <span className="iso-stat-title">Tổng mục Master List</span>
            <span className="iso-stat-value">{stats.total_all || totalCount || 0}</span>
          </div>
          <div className="iso-stat-icon" style={{ backgroundColor: '#FAF6F0', color: '#7B5233' }}>
            <FileSpreadsheet size={18} />
          </div>
        </div>

        <div className="iso-stat-card">
          <div className="iso-stat-info">
            <span className="iso-stat-title">Tài liệu quy định (TL)</span>
            <span className="iso-stat-value" style={{ color: '#1E40AF' }}>{stats.docs_count || 0}</span>
          </div>
          <div className="iso-stat-icon" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
            <FileText size={18} />
          </div>
        </div>

        <div className="iso-stat-card">
          <div className="iso-stat-info">
            <span className="iso-stat-title">Biểu mẫu áp dụng (BM)</span>
            <span className="iso-stat-value" style={{ color: '#B45309' }}>{stats.forms_count || 0}</span>
          </div>
          <div className="iso-stat-icon" style={{ backgroundColor: '#FFFBEB', color: '#B45309' }}>
            <Layers size={18} />
          </div>
        </div>

        <div className="iso-stat-card">
          <div className="iso-stat-info">
            <span className="iso-stat-title">Hồ sơ minh chứng (HS)</span>
            <span className="iso-stat-value" style={{ color: '#047857' }}>{stats.records_count || 0}</span>
          </div>
          <div className="iso-stat-icon" style={{ backgroundColor: '#ECFDF5', color: '#047857' }}>
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR MATCHING CLAIM */}
      <div className="iso-toolbar">
        {/* Left Side: Search + Sort + Filter + Cột hiển thị */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px' }}>
          <div className="iso-search-box">
            <Search size={16} color="#7B5233" />
            <input 
              type="text" 
              placeholder="Tìm theo Mã TL, Tên tài liệu, Phòng ban, Luật liên quan, Ghi chú..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button 
                type="button" 
                className="iso-search-clear-btn" 
                onClick={() => { setSearch(''); setPage(1); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#8D6E63' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="iso-dropdown-container" style={{ position: 'relative' }}>
            <button 
              type="button"
              className={`iso-btn-icon ${isSortOpen ? 'active' : ''}`}
              onClick={() => setIsSortOpen(!isSortOpen)}
              title="Sắp xếp danh sách"
            >
              <ArrowUpDown size={16} />
            </button>
            {isSortOpen && (
              <div className="iso-dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, backgroundColor: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 0', minWidth: 220 }}>
                <button 
                  type="button"
                  className="iso-dropdown-item"
                  onClick={() => { if (setSortBy) setSortBy('id'); if (setSortDir) setSortDir('asc'); setIsSortOpen(false); }}
                >
                  Theo thứ tự ID gốc (A→Z)
                </button>
                <button 
                  type="button"
                  className="iso-dropdown-item"
                  onClick={() => { if (setSortBy) setSortBy('suggested_doc_code'); if (setSortDir) setSortDir('asc'); setIsSortOpen(false); }}
                >
                  Theo Mã TL đề xuất (A→Z)
                </button>
                <button 
                  type="button"
                  className="iso-dropdown-item"
                  onClick={() => { if (setSortBy) setSortBy('document_name'); if (setSortDir) setSortDir('asc'); setIsSortOpen(false); }}
                >
                  Theo Tên tài liệu (A→Z)
                </button>
                <button 
                  type="button"
                  className="iso-dropdown-item"
                  onClick={() => { if (setSortBy) setSortBy('last_modified_date'); if (setSortDir) setSortDir('desc'); setIsSortOpen(false); }}
                >
                  Ngày cập nhật gần nhất
                </button>
              </div>
            )}
          </div>

          {/* Filter Toggle Button */}
          <button 
            type="button"
            className={`iso-btn-icon ${isFilterOpen || activeFiltersCount > 0 ? 'active' : ''}`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            title="Bộ lọc nâng cao"
          >
            <Filter size={16} />
            {activeFiltersCount > 0 && <span className="iso-badge-count">{activeFiltersCount}</span>}
          </button>

          {/* Cột hiển thị (Column Visibility Control) */}
          <div className="iso-dropdown-container" style={{ position: 'relative' }} ref={columnsMenuRef}>
            <button 
              type="button"
              className={`iso-btn-icon ${isColumnsMenuOpen ? 'active' : ''}`}
              onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)}
              title="Cột hiển thị danh sách"
            >
              <Columns size={16} />
            </button>
            {isColumnsMenuOpen && (
              <div 
                className="iso-columns-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="iso-columns-dropdown-header">
                  <span>Cột hiển thị</span>
                  <button 
                    type="button" 
                    style={{ background: 'none', border: 'none', color: '#7B5233', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (handleShowAllColumns) {
                        handleShowAllColumns();
                      } else {
                        const allOn = {
                          management_group: true,
                          code_of_conduct: true,
                          classification: true,
                          suggested_doc_code: true,
                          document_name: true,
                          department_in_charge: true,
                          edition: true,
                          issue_date: true,
                          last_modified_date: true,
                          management_doc: true,
                          source_status: true,
                          notes: true,
                          actions: true
                        };
                        setVisibleColumns(allOn);
                        try { localStorage.setItem('iso_master_visible_columns', JSON.stringify(allOn)); } catch (err) {}
                      }
                    }}
                  >
                    Bật tất cả
                  </button>
                </div>
                {COLUMN_CONFIG.map(col => {
                  const isChecked = !!visibleColumns[col.key];
                  const isCore = !!col.isCore;
                  return (
                    <div 
                      key={col.key} 
                      className="iso-column-option"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '7px 14px',
                        cursor: isCore ? 'default' : 'pointer',
                        userSelect: 'none',
                        opacity: isCore ? 0.75 : 1
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCore) return;
                        if (handleToggleColumn) {
                          handleToggleColumn(col.key);
                        } else {
                          const updated = { ...visibleColumns, [col.key]: !visibleColumns[col.key] };
                          setVisibleColumns(updated);
                          try { localStorage.setItem('iso_master_visible_columns', JSON.stringify(updated)); } catch (err) {}
                        }
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
                      <span style={{ fontSize: '0.8rem', color: isCore ? '#64748B' : '#334155', fontWeight: isCore ? '600' : '400' }}>
                        {col.label} {isCore ? '(Cố định)' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Actions (Khác, Nhập Excel, Xuất Excel, + Thêm hồ sơ) */}
        <div className="iso-actions-right">
          {/* 1. Nút Khác */}
          <div className="iso-dropdown-container" style={{ position: 'relative' }} ref={otherDropdownRef}>
            <button 
              type="button"
              className="iso-btn-brown"
              onClick={() => setIsOtherOpen(!isOtherOpen)}
            >
              <MoreHorizontal size={16} />
              <span>Khác</span>
            </button>
            {isOtherOpen && (
              <div className="iso-dropdown-menu">
                {selectedIds && selectedIds.length > 0 && (
                  <button 
                    type="button"
                    className="iso-dropdown-item"
                    style={{ color: '#DC2626' }}
                    onClick={() => {
                      setIsOtherOpen(false);
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Xóa các mục đã chọn ({selectedIds.length})</span>
                  </button>
                )}
                <button 
                  type="button"
                  className="iso-dropdown-item"
                  onClick={() => {
                    setIsOtherOpen(false);
                    setClassificationFilter('TÀI LIỆU');
                    setPage(1);
                  }}
                >
                  <FileText size={15} />
                  <span>Chỉ xem Tài liệu (TL)</span>
                </button>
                <button 
                  type="button"
                  className="iso-dropdown-item"
                  onClick={() => {
                    setIsOtherOpen(false);
                    setClassificationFilter('BIỂU MẪU');
                    setPage(1);
                  }}
                >
                  <Layers size={15} />
                  <span>Chỉ xem Biểu mẫu (BM)</span>
                </button>
                <button 
                  type="button"
                  className="iso-dropdown-item"
                  onClick={() => {
                    setIsOtherOpen(false);
                    setClassificationFilter('HỒ SƠ');
                    setPage(1);
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Chỉ xem Hồ sơ (HS)</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Nút Nhập Excel */}
          <button 
            type="button"
            className="iso-btn-brown"
            onClick={openUploadModal}
          >
            <Upload size={16} />
            <span>Nhập Excel</span>
          </button>

          {/* 3. Nút Xuất Excel */}
          <div className="iso-dropdown-container" style={{ position: 'relative' }} ref={exportDropdownRef}>
            <button 
              type="button"
              className="iso-btn-brown"
              onClick={() => setIsExportOpen(!isExportOpen)}
            >
              <Download size={16} />
              <span>Xuất Excel</span>
            </button>
            {isExportOpen && (
              <div className="iso-dropdown-menu">
                <button 
                  type="button"
                  className="iso-dropdown-item"
                  onClick={() => { setIsExportOpen(false); handleExportExcel('current'); }}
                >
                  <FileSpreadsheet size={15} />
                  <span>Xuất dữ liệu trang hiện tại</span>
                </button>
                <button 
                  type="button"
                  className="iso-dropdown-item"
                  onClick={() => { setIsExportOpen(false); handleExportExcel('all'); }}
                >
                  <Download size={15} />
                  <span>Xuất toàn bộ danh sách Excel</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Nút Thêm hồ sơ */}
          <button 
            type="button"
            className="iso-btn-brown"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            <span>Thêm hồ sơ</span>
          </button>
        </div>
      </div>

      {/* 3. INLINE FILTER BAR */}
      {(isFilterOpen || activeFiltersCount > 0) && (
        <div className="iso-filter-inline-bar">
          {/* CATEGORY 0: HIỂN THỊ SỐ DÒNG */}
          <div className="iso-filter-dropdown-wrapper">
            <button
              type="button"
              className={`iso-btn-filter-dropdown ${activeDropdown === 'pagesize' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'pagesize' ? null : 'pagesize'); }}
            >
              <span>Hiển thị: {pageSize} dòng</span>
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'pagesize' && (
              <div className="iso-filter-dropdown-card" style={{ width: '160px' }}>
                {[15, 25, 50, 100, 300].map(size => (
                  <button
                    key={size}
                    type="button"
                    className={`iso-filter-dropdown-option ${pageSize === size ? 'selected' : ''}`}
                    onClick={() => { setPageSize(size); setPage(1); setActiveDropdown(null); }}
                  >
                    {size} dòng / trang
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CATEGORY 1: PHÂN LOẠI */}
          <div className="iso-filter-dropdown-wrapper">
            <button
              type="button"
              className={`iso-btn-filter-dropdown ${activeDropdown === 'classification' ? 'active' : ''} ${classificationFilter ? 'has-value' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'classification' ? null : 'classification'); }}
            >
              <span>Phân loại{classificationFilter ? `: ${classificationFilter}` : ''}</span>
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'classification' && (
              <div className="iso-filter-dropdown-card" style={{ width: '200px' }}>
                <button
                  type="button"
                  className={`iso-filter-dropdown-option ${!classificationFilter ? 'selected' : ''}`}
                  onClick={() => { setClassificationFilter(''); setPage(1); setActiveDropdown(null); }}
                >
                  Tất cả phân loại
                </button>
                {(filterOptions.classifications || []).map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`iso-filter-dropdown-option ${classificationFilter === c ? 'selected' : ''}`}
                    onClick={() => { setClassificationFilter(c); setPage(1); setActiveDropdown(null); }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CATEGORY 2: NHÓM TL */}
          <div className="iso-filter-dropdown-wrapper">
            <button
              type="button"
              className={`iso-btn-filter-dropdown ${activeDropdown === 'group' ? 'active' : ''} ${groupFilter ? 'has-value' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'group' ? null : 'group'); }}
            >
              <span>Nhóm TL{groupFilter ? `: ${groupFilter}` : ''}</span>
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'group' && (
              <div className="iso-filter-dropdown-card" style={{ width: '250px', maxHeight: '260px', overflowY: 'auto' }}>
                <button
                  type="button"
                  className={`iso-filter-dropdown-option ${!groupFilter ? 'selected' : ''}`}
                  onClick={() => { setGroupFilter(''); setPage(1); setActiveDropdown(null); }}
                >
                  Tất cả nhóm tài liệu
                </button>
                {(filterOptions.groups || []).map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`iso-filter-dropdown-option ${groupFilter === g ? 'selected' : ''}`}
                    onClick={() => { setGroupFilter(g); setPage(1); setActiveDropdown(null); }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CATEGORY 3: MÃ TL ĐỀ XUẤT */}
          <div className="iso-filter-dropdown-wrapper">
            <button
              type="button"
              className={`iso-btn-filter-dropdown ${activeDropdown === 'code' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'code' ? null : 'code'); }}
            >
              <span>Mã TL đề xuất{codeFilter ? `: ${codeFilter}` : ''}</span>
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'code' && (
              <div className="iso-filter-dropdown-card" style={{ width: '240px', maxHeight: '280px', overflowY: 'auto' }}>
                <button
                  type="button"
                  className={`iso-filter-dropdown-option ${!codeFilter ? 'selected' : ''}`}
                  onClick={() => { setCodeFilter(''); setPage(1); setActiveDropdown(null); }}
                >
                  Tất cả Mã TL đề xuất
                </button>
                {(filterOptions.suggested_doc_codes || []).map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`iso-filter-dropdown-option ${codeFilter === c ? 'selected' : ''}`}
                    onClick={() => { setCodeFilter(c); setPage(1); setActiveDropdown(null); }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CATEGORY 4: PHÒNG BAN */}
          <div className="iso-filter-dropdown-wrapper">
            <button
              type="button"
              className={`iso-btn-filter-dropdown ${activeDropdown === 'dept' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'dept' ? null : 'dept'); }}
            >
              <span>Phòng ban{deptFilter ? `: ${deptFilter}` : ''}</span>
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'dept' && (
              <div className="iso-filter-dropdown-card" style={{ width: '250px', maxHeight: '280px', overflowY: 'auto' }}>
                <button
                  type="button"
                  className={`iso-filter-dropdown-option ${!deptFilter ? 'selected' : ''}`}
                  onClick={() => { setDeptFilter(''); setPage(1); setActiveDropdown(null); }}
                >
                  Tất cả phòng ban
                </button>
                {(filterOptions.departments && filterOptions.departments.length > 0 ? filterOptions.departments : DEPARTMENT_OPTIONS.map(d => d.name)).map(dept => (
                  <button
                    key={dept}
                    type="button"
                    className={`iso-filter-dropdown-option ${deptFilter === dept ? 'selected' : ''}`}
                    onClick={() => { setDeptFilter(dept); setPage(1); setActiveDropdown(null); }}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CATEGORY 5: TRẠNG THÁI */}
          <div className="iso-filter-dropdown-wrapper">
            <button
              type="button"
              className={`iso-btn-filter-dropdown ${activeDropdown === 'status' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'status' ? null : 'status'); }}
            >
              <span>Trạng thái{statusFilter ? `: ${statusFilter}` : ''}</span>
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'status' && (
              <div className="iso-filter-dropdown-card" style={{ width: '180px' }}>
                <button
                  type="button"
                  className={`iso-filter-dropdown-option ${!statusFilter ? 'selected' : ''}`}
                  onClick={() => { setStatusFilter(''); setPage(1); setActiveDropdown(null); }}
                >
                  Tất cả trạng thái
                </button>
                {['Nháp', 'Đang chỉnh'].map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`iso-filter-dropdown-option ${statusFilter === s ? 'selected' : ''}`}
                    onClick={() => { setStatusFilter(s); setPage(1); setActiveDropdown(null); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Filters */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              className="iso-btn-reset-filters"
              onClick={resetAllFilters}
              title="Đặt lại toàn bộ bộ lọc"
            >
              <RotateCcw size={13} />
              <span>Xóa bộ lọc ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Main Data Table */}
      <div className="iso-table-card">
        <div className="iso-table-scroll">
          <table className="iso-table">
            <thead>
              <tr>
                <th style={{ width: '42px', textAlign: 'center' }}>STT</th>
                {visibleColumns.management_group && <th style={{ width: '130px' }}>1. Nhóm tài liệu</th>}
                {visibleColumns.code_of_conduct && <th style={{ width: '150px' }}>2. Quy tắc (PA)</th>}
                {visibleColumns.classification && <th style={{ width: '110px' }}>3. Phân loại</th>}
                {visibleColumns.suggested_doc_code && <th style={{ width: '160px' }}>4. Mã TL đề xuất</th>}
                {visibleColumns.document_name && <th>5. Tên tài liệu</th>}
                {visibleColumns.department_in_charge && <th style={{ width: '130px' }}>6. Phòng ban</th>}
                {visibleColumns.edition && <th style={{ width: '90px', textAlign: 'center' }}>7. Lần ban hành</th>}
                {visibleColumns.issue_date && <th style={{ width: '105px', textAlign: 'center' }}>8. Ngày ban hành</th>}
                {visibleColumns.last_modified_date && <th style={{ width: '105px', textAlign: 'center' }}>9. Ngày hiệu chỉnh</th>}
                {visibleColumns.management_doc && <th style={{ width: '160px' }}>10. Luật liên quan</th>}
                {visibleColumns.source_status && <th style={{ width: '120px', textAlign: 'center' }}>11. Trạng thái</th>}
                {visibleColumns.notes && <th style={{ width: '150px' }}>12. Ghi chú</th>}
                {visibleColumns.actions && <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="iso-table-loading">
                    <div className="iso-spinner-box">
                      <div className="iso-spinner-large" />
                      <span>Đang tải danh sách hồ sơ ISO...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={14} className="iso-table-empty">
                    <Folder size={38} color="#CBD5E1" />
                    <div style={{ marginTop: '10px', fontWeight: '600', color: '#475569' }}>
                      Không tìm thấy hồ sơ nào phù hợp với bộ lọc
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((rec, idx) => {
                  const stt = (page - 1) * pageSize + idx + 1;
                  return (
                    <tr 
                      key={rec.group_key || rec.id || idx}
                      className="iso-table-row is-clickable"
                      onClick={() => handleOpenDetailModal(rec)}
                    >
                      <td style={{ textAlign: 'center', color: '#64748B' }}>{stt}</td>

                      {/* 1. Nhóm tài liệu quản lý (Hiển thị đơn, chính xác) */}
                      {visibleColumns.management_group && (
                        <td>{rec.management_group || '---'}</td>
                      )}

                      {/* 2. Quy tắc ứng xử (PA) */}
                      {visibleColumns.code_of_conduct && (
                        <td title={rec.code_of_conduct}>{rec.code_of_conduct || '---'}</td>
                      )}

                      {/* 3. Phân loại */}
                      {visibleColumns.classification && (
                        <td>{renderClassificationBadge(rec.classification)}</td>
                      )}

                      {/* 4. Mã TL đề xuất (Chỉ hiển thị duy nhất Mã TL đề xuất) */}
                      {visibleColumns.suggested_doc_code && (
                        <td>
                          {rec.is_empty_code || !rec.suggested_doc_code ? (
                            <span className="iso-empty-code-badge">Chưa có Mã TL đề xuất</span>
                          ) : (
                            <span className="iso-code-badge">{rec.suggested_doc_code}</span>
                          )}
                        </td>
                      )}

                      {/* 5. Tên tài liệu */}
                      {visibleColumns.document_name && (
                        <td style={{ color: '#1E293B', fontWeight: '500' }} title={rec.document_name}>
                          <div style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.document_name || '---'}
                          </div>
                        </td>
                      )}

                      {/* 6. Phòng ban */}
                      {visibleColumns.department_in_charge && (
                        <td title={rec.department_in_charge}>{rec.department_in_charge || '---'}</td>
                      )}

                      {/* 7. Lần ban hành */}
                      {visibleColumns.edition && (
                        <td style={{ textAlign: 'center' }}>{rec.edition || '---'}</td>
                      )}

                      {/* 8. Ngày ban hành */}
                      {visibleColumns.issue_date && (
                        <td style={{ textAlign: 'center', color: '#64748B' }}>{rec.issue_date || '---'}</td>
                      )}

                      {/* 9. Ngày hiệu chỉnh */}
                      {visibleColumns.last_modified_date && (
                        <td style={{ textAlign: 'center', color: '#64748B' }}>{rec.last_modified_date || '---'}</td>
                      )}

                      {/* 10. Luật liên quan */}
                      {visibleColumns.management_doc && (
                        <td title={rec.management_doc}>{rec.management_doc || '---'}</td>
                      )}

                      {/* 11. Trạng thái (CHỈ có Nháp hoặc Đang chỉnh, KHÔNG có trạng thái ký duyệt) */}
                      {visibleColumns.source_status && (
                        <td style={{ textAlign: 'center' }}>
                          {renderDocStatusBadge(rec.processing_status || rec.status || 'Nháp')}
                        </td>
                      )}

                      {/* 12. Ghi chú (Line-clamp gọn gàng) */}
                      {visibleColumns.notes && (
                        <td>
                          {rec.notes ? (
                            <div 
                              className="iso-note-cell-clamp"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveNoteModal(rec);
                              }}
                              title="Bấm để xem đầy đủ ghi chú"
                            >
                              {rec.notes}
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>---</span>
                          )}
                        </td>
                      )}

                      {/* 13. Thao tác - Menu ba chấm */}
                      {visibleColumns.actions && (
                        <td 
                          style={{ textAlign: 'center', position: 'relative', overflow: 'visible' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              type="button"
                              className={`iso-action-btn ${actionMenuId === rec.id ? 'active' : ''}`}
                              title="Thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === rec.id ? null : rec.id);
                              }}
                            >
                              <MoreVertical size={18} />
                            </button>

                            {actionMenuId === rec.id && (
                              <div 
                                className={`iso-action-menu ${idx >= records.length - 3 ? 'drop-up' : ''}`}
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  ...(idx >= records.length - 3 ? { bottom: 'calc(100% + 4px)', top: 'auto' } : { top: 'calc(100% + 4px)' }),
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #EADCC9',
                                  borderRadius: '8px',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.18)',
                                  minWidth: '130px',
                                  zIndex: 9999,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  padding: '4px 0'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="iso-action-menu-item"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    handleOpenDetailModal(rec, false);
                                  }}
                                >
                                  <Eye size={14} color="#7B5233" />
                                  <span>Xem</span>
                                </button>
                                <button
                                  type="button"
                                  className="iso-action-menu-item"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    handleOpenDetailModal(rec, true);
                                  }}
                                >
                                  <Edit size={14} color="#0284C7" />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  className="iso-action-menu-item danger"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    handleSingleDelete(rec);
                                  }}
                                >
                                  <Trash2 size={14} color="#DC2626" />
                                  <span>Xóa</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar - Khớp module Claim */}
        {(() => {
          const safeTotal = typeof totalCount === 'number' && !isNaN(totalCount) ? totalCount : 0;
          const safeCurrentPage = Math.max(1, page || 1);
          const safeTotalPages = Math.max(1, Math.ceil(safeTotal / pageSize) || totalPages || 1);
          const rawStart = safeTotal > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0;
          const rawEnd = safeTotal > 0 ? Math.min(safeCurrentPage * pageSize, safeTotal) : 0;

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

          const buttons = getPaginationButtons();

          return (
            <div 
              className="admin-pagination-desktop desktop-only"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                backgroundColor: '#FFFFFF',
                borderTop: '1px solid #EADCC9',
                flexShrink: 0,
                gap: '12px'
              }}
            >
              <div style={{ color: '#8D6E63', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                Hiển thị <b>{rawStart}</b>–<b>{rawEnd}</b> trên <b>{safeTotal}</b> kết quả
              </div>
              <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center', marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="page-btn"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setPage(Math.max(1, safeCurrentPage - 1))}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #EADCC9',
                    backgroundColor: '#FAF6F0',
                    cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: safeCurrentPage <= 1 ? 0.4 : 1,
                    color: '#7B5233',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Trang trước"
                >
                  <ChevronLeft size={14} />
                </button>
                {buttons.map((btn, bIdx) => (
                  btn === '...' ? (
                    <span key={`ellipsis-${bIdx}`} style={{ color: '#8D6E63', fontSize: '0.75rem', padding: '0 4px' }}>...</span>
                  ) : (
                    <button
                      key={btn}
                      type="button"
                      className={`page-btn ${btn === safeCurrentPage ? 'active' : ''}`}
                      onClick={() => setPage(btn)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #EADCC9',
                        backgroundColor: btn === safeCurrentPage ? '#7B5233' : '#FAF6F0',
                        color: btn === safeCurrentPage ? '#FFFFFF' : '#7B5233',
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
                  type="button"
                  className="page-btn"
                  disabled={safeCurrentPage >= safeTotalPages}
                  onClick={() => setPage(Math.min(safeTotalPages, safeCurrentPage + 1))}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #EADCC9',
                    backgroundColor: '#FAF6F0',
                    cursor: safeCurrentPage >= safeTotalPages ? 'not-allowed' : 'pointer',
                    opacity: safeCurrentPage >= safeTotalPages ? 0.4 : 1,
                    color: '#7B5233',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Trang sau"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Note modal if clicked */}
      {activeNoteModal && (
        <div className="iso-modal-overlay" onClick={() => setActiveNoteModal(null)}>
          <div className="iso-modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="iso-modal-header">
              <h3>Ghi chú đầy đủ</h3>
              <button type="button" onClick={() => setActiveNoteModal(null)}><X size={18} /></button>
            </div>
            <div className="iso-modal-body" style={{ padding: '16px', lineHeight: '1.6', color: '#1E293B', whiteSpace: 'pre-wrap' }}>
              {activeNoteModal.notes}
            </div>
            <div className="iso-modal-footer">
              <button type="button" className="iso-btn-outline" onClick={() => setActiveNoteModal(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ISOMasterRecordTable;
