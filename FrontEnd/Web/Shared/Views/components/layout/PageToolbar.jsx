import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Plus, RefreshCw } from 'lucide-react';
import './PageToolbar.css';

/**
 * PageToolbar - Component toolbar chuẩn dùng chung cho tất cả trang list/management.
 * Lấy chuẩn thiết kế từ ClaimListView toolbar.
 *
 * Props:
 * ─── Search ───
 * @param {string}   searchValue        - Giá trị ô search
 * @param {function} onSearchChange     - Callback khi thay đổi search (nhận value string)
 * @param {string}   searchPlaceholder  - Placeholder cho ô search (default: "Tìm kiếm nhanh...")
 *
 * ─── Sort (optional) ───
 * @param {boolean}  showSort           - Hiển thị nút sort A↓Z
 * @param {Array}    sortOptions        - Mảng { value, label } cho sort dropdown
 * @param {string}   sortValue          - Giá trị sort hiện tại
 * @param {function} onSortChange       - Callback khi chọn sort option
 *
 * ─── Filter toggle (optional) ───
 * @param {boolean}  showFilter         - Hiển thị nút filter funnel
 * @param {boolean}  isFilterOpen       - Trạng thái mở/đóng filter bar
 * @param {function} onFilterToggle     - Callback toggle filter bar
 * @param {number}   activeFiltersCount - Số filter đang active (hiện badge)
 *
 * ─── Action Buttons (right side, all optional) ───
 * @param {function} onSync             - Handler cho nút "Đồng bộ từ BOM" trực tiếp
 * @param {boolean}  isSyncing          - Trạng thái đang đồng bộ
 * @param {string}   syncLabel          - Label tuỳ chỉnh cho nút sync (default: "Đồng bộ từ BOM")
 * @param {Array}    extraActions       - Mảng items cho nút "Khác" dropdown: { label, icon, onClick, badge?, color?, divider? }
 * @param {Array}    importActions      - Mảng items cho nút "Nhập dữ liệu" dropdown: { label, icon, onClick }
 * @param {function} onExport           - Handler cho nút "Xuất dữ liệu"
 * @param {boolean}  isExporting        - Trạng thái đang xuất
 * @param {string}   exportLabel        - Label tuỳ chỉnh cho nút export (default: "Xuất dữ liệu")
 * @param {function} onCreate           - Handler cho nút "+ Tạo mới"
 * @param {string}   createLabel        - Label tuỳ chỉnh cho nút create (default: "Tạo mới")
 *
 * ─── Permission ───
 * @param {boolean}  hasWritePermission - Kiểm soát hiển thị nút cần quyền write
 *
 * ─── Extra ───
 * @param {React.ReactNode} children   - Nội dung bổ sung (ví dụ: hidden file inputs)
 */
const PageToolbar = ({
  // Search
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm nhanh...',

  // Sort
  showSort = false,
  sortOptions = [],
  sortValue = '',
  onSortChange,

  // Filter
  showFilter = false,
  isFilterOpen = false,
  onFilterToggle,
  activeFiltersCount = 0,

  // Action buttons
  onSync,
  isSyncing = false,
  syncLabel = 'Đồng bộ từ BOM',
  extraActions = [],
  importActions = [],
  createActions = [],
  onExport,
  isExporting = false,
  exportLabel = 'Xuất dữ liệu',
  onCreate,
  createLabel = 'Tạo mới',

  // Permission
  hasWritePermission = true,

  // Extra content (e.g., hidden file inputs)
  children
}) => {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isOtherDropdownOpen, setIsOtherDropdownOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);

  const sortDropdownRef = useRef(null);
  const otherDropdownRef = useRef(null);
  const importDropdownRef = useRef(null);
  const createDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
      if (otherDropdownRef.current && !otherDropdownRef.current.contains(e.target)) {
        setIsOtherDropdownOpen(false);
      }
      if (importDropdownRef.current && !importDropdownRef.current.contains(e.target)) {
        setIsImportDropdownOpen(false);
      }
      if (createDropdownRef.current && !createDropdownRef.current.contains(e.target)) {
        setIsCreateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine which action buttons to show
  const visibleExtraActions = (Array.isArray(extraActions) ? extraActions : []).filter(a => !a.requireWrite || hasWritePermission);
  const showOtherBtn = visibleExtraActions.length > 0;
  const visibleImportActions = (Array.isArray(importActions) ? importActions : []).filter(a => !a.requireWrite || hasWritePermission);
  const showImportBtn = visibleImportActions.length > 0;
  const showExportBtn = !!onExport;
  const showCreateBtn = (!!onCreate || (Array.isArray(createActions) && createActions.length > 0)) && hasWritePermission;

  return (
    <div className="page-toolbar">
      {/* ═══ LEFT SIDE: Search + Sort + Filter ═══ */}
      <div className="page-toolbar__left">
        {/* Search Input */}
        {onSearchChange && (
          <div className="page-toolbar__search">
            <Search size={16} className="page-toolbar__search-icon" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="page-toolbar__search-input"
            />
          </div>
        )}

        {/* Sort Button A↓Z */}
        {showSort && sortOptions.length > 0 && (
          <div className="page-toolbar__sort-wrapper" ref={sortDropdownRef}>
            <button
              type="button"
              className={`page-toolbar__icon-btn ${sortValue ? 'active' : ''}`}
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              title="Sắp xếp danh sách"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="15" y1="4" x2="15" y2="20" />
                <polyline points="11 16 15 20 19 16" />
                <text x="3" y="10" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="currentColor">A</text>
                <text x="3" y="20" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="currentColor">Z</text>
              </svg>
            </button>
            {showSortDropdown && (
              <div className="page-toolbar__sort-dropdown">
                {sortOptions.map(item => (
                  <div
                    key={item.value}
                    className={`page-toolbar__sort-item ${sortValue === item.value ? 'active' : ''}`}
                    onClick={() => { onSortChange(item.value); setShowSortDropdown(false); }}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filter Funnel Icon */}
        {showFilter && (
          <div className="page-toolbar__filter-wrapper">
            <button
              type="button"
              className={`page-toolbar__icon-btn ${isFilterOpen || activeFiltersCount > 0 ? 'active' : ''}`}
              onClick={onFilterToggle}
              title="Bộ lọc nâng cao"
            >
              <Filter size={20} strokeWidth={2.5} />
              {activeFiltersCount > 0 && (
                <span className="page-toolbar__filter-badge">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ═══ RIGHT SIDE: Đồng bộ + Khác + Nhập + Xuất + Tạo mới ═══ */}
      <div className="page-toolbar__right">
        {/* 0. NÚT TỰ ĐỘNG ĐỒNG BỘ BOM */}
        {onSync && (
          <button
            type="button"
            className="page-toolbar__action-btn page-toolbar__sync-btn"
            onClick={onSync}
            disabled={isSyncing}
            title="Tự động đồng bộ và nạp chính xác toàn bộ dữ liệu từ Master BOM"
            style={{
              backgroundColor: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid #334155',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '0 14px',
              height: '34px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: isSyncing ? 'wait' : 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)'
            }}
          >
            <RefreshCw
              size={14}
              strokeWidth={2.5}
              style={{
                animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                color: isSyncing ? '#38BDF8' : '#38BDF8'
              }}
            />
            <span>{isSyncing ? 'Đang đọc full BOM...' : (syncLabel || 'Đồng bộ từ BOM')}</span>
          </button>
        )}

        {/* 1. NÚT KHÁC (Dropdown) */}
        {showOtherBtn && (
          <div className="page-toolbar__dropdown-container" ref={otherDropdownRef}>
            <button
              type="button"
              className="page-toolbar__action-btn"
              onClick={(e) => { e.stopPropagation(); setIsOtherDropdownOpen(!isOtherDropdownOpen); setIsImportDropdownOpen(false); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              </svg>
              <span>Khác</span>
            </button>
            {isOtherDropdownOpen && (
              <div className="page-toolbar__dropdown-menu">
                {visibleExtraActions.map((action, idx) => (
                  <React.Fragment key={idx}>
                    {action.divider && idx > 0 && <div className="page-toolbar__dropdown-divider" />}
                    <button
                      type="button"
                      className="page-toolbar__dropdown-item"
                      onClick={() => { setIsOtherDropdownOpen(false); action.onClick(); }}
                      style={action.color ? { color: action.color } : undefined}
                    >
                      <div className="page-toolbar__dropdown-item-left">
                        {action.icon}
                        <span>{action.label}</span>
                      </div>
                      {action.badge > 0 && (
                        <span
                          className="page-toolbar__dropdown-badge"
                          style={action.badgeColor ? { backgroundColor: action.badgeColor } : undefined}
                        >
                          {action.badge}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. NÚT NHẬP DỮ LIỆU (Dropdown) */}
        {showImportBtn && (
          <div className="page-toolbar__dropdown-container" ref={importDropdownRef}>
            <button
              type="button"
              className="page-toolbar__action-btn"
              onClick={(e) => { e.stopPropagation(); setIsImportDropdownOpen(!isImportDropdownOpen); setIsOtherDropdownOpen(false); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Nhập dữ liệu</span>
            </button>
            {isImportDropdownOpen && (
              <div className="page-toolbar__dropdown-menu">
                {visibleImportActions.map((action, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <div className="page-toolbar__dropdown-divider" />}
                    <button
                      type="button"
                      className="page-toolbar__dropdown-item"
                      onClick={() => { setIsImportDropdownOpen(false); action.onClick(); }}
                    >
                      <div className="page-toolbar__dropdown-item-left">
                        {action.icon}
                        <span>{action.label}</span>
                      </div>
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. NÚT XUẤT DỮ LIỆU */}
        {showExportBtn && (
          <button
            type="button"
            className="page-toolbar__action-btn"
            onClick={onExport}
            disabled={isExporting}
            style={isExporting ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>{isExporting ? 'Đang xuất...' : exportLabel}</span>
          </button>
        )}

        {/* 4. NÚT TẠO MỚI */}
        {showCreateBtn && (
          createActions.length > 0 ? (
            <div className="page-toolbar__dropdown-container" ref={createDropdownRef}>
              <button
                type="button"
                className="page-toolbar__action-btn"
                onClick={(e) => { e.stopPropagation(); setIsCreateDropdownOpen(!isCreateDropdownOpen); setIsImportDropdownOpen(false); setIsOtherDropdownOpen(false); }}
              >
                <Plus size={14} strokeWidth={3} />
                <span>{createLabel}</span>
              </button>
              {isCreateDropdownOpen && (
                <div className="page-toolbar__dropdown-menu" style={{ right: 0, left: 'auto' }}>
                  {createActions.map((action, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <div className="page-toolbar__dropdown-divider" />}
                      <button
                        type="button"
                        className="page-toolbar__dropdown-item"
                        onClick={() => { setIsCreateDropdownOpen(false); action.onClick(); }}
                      >
                        <div className="page-toolbar__dropdown-item-left">
                          {action.icon}
                          <span>{action.label}</span>
                        </div>
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="page-toolbar__action-btn"
              onClick={onCreate}
            >
              <Plus size={14} strokeWidth={3} />
              <span>{createLabel}</span>
            </button>
          )
        )}
      </div>

      {/* Hidden file inputs and other extra content */}
      {children}
    </div>
  );
};

export default PageToolbar;
