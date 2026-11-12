// GoodsIssueFilterBar.jsx - Thanh bộ lọc inline cho danh sách Xuất kho
import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import GoodsIssueDateRangeFilter from './GoodsIssueDateRangeFilter';
import {
  WAREHOUSE_OPTIONS,
  ISSUE_TYPES,
  ISSUE_STATUSES,
  DEPARTMENT_OPTIONS
} from '../../../types/goodsIssue.types';
import { useWarehouseMeta } from '../../../hooks/useWarehouseMeta';

export const GoodsIssueFilterBar = ({
  pageSize = 25,
  setPageSize,
  setPage,
  activeDropdown,
  setActiveDropdown,
  warehouseFilter = '',
  setWarehouseFilter,
  issueTypeFilter = '',
  setIssueTypeFilter,
  statusFilter = '',
  setStatusFilter,
  departmentFilter = '',
  setDepartmentFilter,
  createdByFilter = '',
  setCreatedByFilter,
  customerFilter = '',
  setCustomerFilter,
  dateRange = { fromDate: '', toDate: '' },
  setDateRange,
  activeFiltersCount = 0,
  resetAllFilters
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const {
    warehouseNames,
    departmentNames,
    customers: customerList,
    accountNames: createdByList,
    issueTypes: dbIssueTypes,
  } = useWarehouseMeta();

  const activeWarehouses = warehouseNames.length > 0 ? warehouseNames : WAREHOUSE_OPTIONS;
  const activeIssueTypes = dbIssueTypes.length > 0 ? dbIssueTypes : ISSUE_TYPES;
  const activeDepartments = departmentNames.length > 0 ? departmentNames : DEPARTMENT_OPTIONS;

  return (
    <div className="wh-filter-inline-bar">
      {/* 1. Số dòng hiển thị (Page size) */}
      <div className="wh-filter-dropdown-wrapper">
        <button
          type="button"
          className={`wh-btn-filter-dropdown ${activeDropdown === 'pagesize' ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'pagesize' ? null : 'pagesize');
          }}
        >
          <span>Hiển thị: {pageSize} dòng</span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'pagesize' && (
          <div className="wh-filter-dropdown-card" style={{ width: '160px' }}>
            {[15, 25, 50, 100, 300].map((size) => (
              <button
                key={size}
                type="button"
                className={`wh-filter-dropdown-option ${pageSize === size ? 'selected' : ''}`}
                onClick={() => {
                  setPageSize(size);
                  setPage(1);
                  setActiveDropdown(null);
                }}
              >
                {size} dòng / trang
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Khoảng thời gian Ngày xuất kho From – To (Không preset) */}
      <GoodsIssueDateRangeFilter
        dateRange={dateRange}
        setDateRange={setDateRange}
        setPage={setPage}
        isOpen={activeDropdown === 'time'}
        onToggle={(open) => setActiveDropdown(open ? 'time' : null)}
      />

      {/* 3. Lọc Kho */}
      <div className="wh-filter-dropdown-wrapper">
        <button
          type="button"
          className={`wh-btn-filter-dropdown ${activeDropdown === 'warehouse' ? 'active' : ''} ${warehouseFilter ? 'has-value' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'warehouse' ? null : 'warehouse');
          }}
        >
          <span>Kho{warehouseFilter ? `: ${warehouseFilter.split('(')[0]}` : ''}</span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'warehouse' && (
          <div className="wh-filter-dropdown-card" style={{ width: '250px' }}>
            <button
              type="button"
              className={`wh-filter-dropdown-option ${!warehouseFilter ? 'selected' : ''}`}
              onClick={() => {
                setWarehouseFilter('');
                setPage(1);
                setActiveDropdown(null);
              }}
            >
              Tất cả các kho
            </button>
            {activeWarehouses.map((wh) => (
              <button
                key={wh}
                type="button"
                className={`wh-filter-dropdown-option ${warehouseFilter === wh ? 'selected' : ''}`}
                onClick={() => {
                  setWarehouseFilter(wh);
                  setPage(1);
                  setActiveDropdown(null);
                }}
              >
                {wh}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Lọc Loại phiếu */}
      <div className="wh-filter-dropdown-wrapper">
        <button
          type="button"
          className={`wh-btn-filter-dropdown ${activeDropdown === 'type' ? 'active' : ''} ${issueTypeFilter ? 'has-value' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'type' ? null : 'type');
          }}
        >
          <span>Loại phiếu{issueTypeFilter ? `: ${issueTypeFilter}` : ''}</span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'type' && (
          <div className="wh-filter-dropdown-card" style={{ width: '230px' }}>
            <button
              type="button"
              className={`wh-filter-dropdown-option ${!issueTypeFilter ? 'selected' : ''}`}
              onClick={() => {
                setIssueTypeFilter('');
                setPage(1);
                setActiveDropdown(null);
              }}
            >
              Tất cả loại phiếu
            </button>
            {activeIssueTypes.map((t) => (
              <button
                key={t}
                type="button"
                className={`wh-filter-dropdown-option ${issueTypeFilter === t ? 'selected' : ''}`}
                onClick={() => {
                  setIssueTypeFilter(t);
                  setPage(1);
                  setActiveDropdown(null);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. Lọc Trạng thái */}
      <div className="wh-filter-dropdown-wrapper">
        <button
          type="button"
          className={`wh-btn-filter-dropdown ${activeDropdown === 'status' ? 'active' : ''} ${statusFilter ? 'has-value' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'status' ? null : 'status');
          }}
        >
          <span>
            Trạng thái{statusFilter ? `: ${ISSUE_STATUSES[statusFilter]?.label || statusFilter}` : ''}
          </span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'status' && (
          <div className="wh-filter-dropdown-card" style={{ width: '190px' }}>
            <button
              type="button"
              className={`wh-filter-dropdown-option ${!statusFilter ? 'selected' : ''}`}
              onClick={() => {
                setStatusFilter('');
                setPage(1);
                setActiveDropdown(null);
              }}
            >
              Tất cả trạng thái
            </button>
            {Object.values(ISSUE_STATUSES).map((st) => (
              <button
                key={st.key}
                type="button"
                className={`wh-filter-dropdown-option ${statusFilter === st.key ? 'selected' : ''}`}
                onClick={() => {
                  setStatusFilter(st.key);
                  setPage(1);
                  setActiveDropdown(null);
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 6. Lọc Bộ phận */}
      <div className="wh-filter-dropdown-wrapper">
        <button
          type="button"
          className={`wh-btn-filter-dropdown ${activeDropdown === 'dept' ? 'active' : ''} ${departmentFilter ? 'has-value' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'dept' ? null : 'dept');
          }}
        >
          <span>Bộ phận{departmentFilter ? `: ${departmentFilter}` : ''}</span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'dept' && (
          <div className="wh-filter-dropdown-card" style={{ width: '230px' }}>
            <button
              type="button"
              className={`wh-filter-dropdown-option ${!departmentFilter ? 'selected' : ''}`}
              onClick={() => {
                setDepartmentFilter('');
                setPage(1);
                setActiveDropdown(null);
              }}
            >
              Tất cả bộ phận
            </button>
            {activeDepartments.map((dept) => (
              <button
                key={dept}
                type="button"
                className={`wh-filter-dropdown-option ${departmentFilter === dept ? 'selected' : ''}`}
                onClick={() => {
                  setDepartmentFilter(dept);
                  setPage(1);
                  setActiveDropdown(null);
                }}
              >
                {dept}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 7. Lọc Khách hàng / Đối tác */}
      <div className="wh-filter-dropdown-wrapper">
        <button
          type="button"
          className={`wh-btn-filter-dropdown ${activeDropdown === 'customer' ? 'active' : ''} ${customerFilter ? 'has-value' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'customer' ? null : 'customer');
          }}
        >
          <span>Khách hàng{customerFilter ? `: ${customerFilter}` : ''}</span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'customer' && (() => {
          const term = customerSearch.trim().toLowerCase();
          const filtered = customerList.filter(
            (c) =>
              !term ||
              c.name.toLowerCase().includes(term) ||
              c.code.toLowerCase().includes(term)
          );
          return (
            <div className="wh-filter-dropdown-card" style={{ width: '280px' }}>
              <div style={{ padding: '6px 8px', borderBottom: '1px solid #EADCC9' }}>
                <input
                  type="text"
                  placeholder="Tìm khách hàng / đối tác..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: '4px',
                    border: '1px solid #D5C7B7',
                    fontSize: '0.8rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <button
                  type="button"
                  className={`wh-filter-dropdown-option ${!customerFilter ? 'selected' : ''}`}
                  onClick={() => {
                    setCustomerFilter('');
                    setPage(1);
                    setActiveDropdown(null);
                    setCustomerSearch('');
                  }}
                >
                  Tất cả khách hàng
                </button>
                {filtered.map((c, idx) => (
                  <button
                    key={`${c.id || c.code || idx}_${c.name}`}
                    type="button"
                    className={`wh-filter-dropdown-option ${customerFilter === c.name ? 'selected' : ''}`}
                    onClick={() => {
                      setCustomerFilter(c.name);
                      setPage(1);
                      setActiveDropdown(null);
                      setCustomerSearch('');
                    }}
                  >
                    {c.code ? `[${c.code}] ${c.name}` : c.name}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding: '10px 12px', fontSize: '0.78rem', color: '#9CA3AF' }}>
                    Không tìm thấy khách hàng / đối tác phù hợp
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 8. Lọc Người tạo */}
      <div className="wh-filter-dropdown-wrapper">
        <button
          type="button"
          className={`wh-btn-filter-dropdown ${activeDropdown === 'creator' ? 'active' : ''} ${createdByFilter ? 'has-value' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'creator' ? null : 'creator');
          }}
        >
          <span>Người tạo{createdByFilter ? `: ${createdByFilter}` : ''}</span>
          <span className="dropdown-arrow">▾</span>
        </button>
        {activeDropdown === 'creator' && (
          <div className="wh-filter-dropdown-card" style={{ width: '190px' }}>
            <button
              type="button"
              className={`wh-filter-dropdown-option ${!createdByFilter ? 'selected' : ''}`}
              onClick={() => {
                setCreatedByFilter('');
                setPage(1);
                setActiveDropdown(null);
              }}
            >
              Tất cả người tạo
            </button>
            {createdByList.map((usr) => (
              <button
                key={usr}
                type="button"
                className={`wh-filter-dropdown-option ${createdByFilter === usr ? 'selected' : ''}`}
                onClick={() => {
                  setCreatedByFilter(usr);
                  setPage(1);
                  setActiveDropdown(null);
                }}
              >
                {usr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 9. Nút Đặt lại bộ lọc */}
      {activeFiltersCount > 0 && (
        <button
          type="button"
          onClick={resetAllFilters}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            height: '32px',
            padding: '0 10px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: '600',
            cursor: 'pointer',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            transition: 'all 0.15s ease'
          }}
          title="Xóa tất cả các bộ lọc đang kích hoạt"
        >
          <RotateCcw size={13} />
          <span>Đặt lại ({activeFiltersCount})</span>
        </button>
      )}
    </div>
  );
};

export default GoodsIssueFilterBar;
