import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

import { formatDateMDY, formatTimestampVN } from '../utils/formatters';

export { formatDateMDY, formatTimestampVN };

export const DataTable = ({
  items = [],
  total = 0,
  page = 1,
  pageSize = 15,
  onPageChange = () => {},
  onSelectItem = () => {},
  selectedItemIds = [],
  onToggleSelectRow = () => {},
  onToggleSelectAll = () => {},
  loading = false
}) => {
  const effectivePageSize = (pageSize === Infinity || pageSize === 'all') ? (total || 100000) : (pageSize || 15);
  const totalPages = Math.ceil(total / effectivePageSize) || 1;
  const startIdx = total > 0 ? (page - 1) * effectivePageSize + 1 : 0;
  const endIdx = total > 0 ? Math.min(page * effectivePageSize, total) : 0;

  // State track menu ⋮ đang mở cho item nào
  const [actionMenuItemId, setActionMenuItemId] = useState(null);

  // Close dropdown khi click ngoài
  useEffect(() => {
    if (!actionMenuItemId) return;
    const handler = (e) => {
      if (!e.target.closest('.action-menu') && !e.target.closest('.action-btn')) {
        setActionMenuItemId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [actionMenuItemId]);

  const currentPageItemIds = items.map((r) => r.item_id).filter(Boolean);
  const isAllCurrentPageSelected =
    currentPageItemIds.length > 0 &&
    currentPageItemIds.every((id) => selectedItemIds.includes(id));

  const getPageButtons = () => {
    const btns = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) btns.push(i);
    } else {
      btns.push(1);
      if (page > 3) btns.push('...');
      const rStart = Math.max(2, page - 1);
      const rEnd = Math.min(totalPages - 1, page + 1);
      for (let i = rStart; i <= rEnd; i++) btns.push(i);
      if (page < totalPages - 2) btns.push('...');
      btns.push(totalPages);
    }
    return btns;
  };

  return (
    <div className="lpn-table-container">
      {/* Desktop Table View */}
      <div className="lpn-table-scroll lpn-desktop-only" style={{ overflowX: 'auto' }}>
        <table className="lpn-table-claim" style={{ minWidth: '1150px' }}>
          <thead>
            <tr>
              {/* Checkbox Column Header */}
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  className="checkbox-custom"
                  checked={isAllCurrentPageSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelectAll(currentPageItemIds);
                  }}
                  title="Chọn tất cả dòng trên trang này"
                />
              </th>
              <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
              <th style={{ minWidth: '140px' }}>Container number</th>
              <th style={{ minWidth: '120px' }}>Factory</th>
              <th style={{ minWidth: '110px' }}>Date loading</th>
              <th style={{ minWidth: '150px' }}>Timestamp</th>
              <th style={{ minWidth: '130px' }}>Operator name</th>
              <th style={{ minWidth: '140px' }}>LPN Pallet</th>
              <th style={{ minWidth: '140px' }}>SKU Pallet</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Có hình ảnh</th>
              <th style={{ textAlign: 'center', width: '80px' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: '#6B7280' }}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>
                  Chưa có bản ghi Pallet / Box nào.
                </td>
              </tr>
            ) : (
              items.map((row, idx) => {
                const isSelected = selectedItemIds.includes(row.item_id);
                const hasImage = Boolean((row.images_count > 0) || (row.images && row.images.length > 0));
                return (
                  <tr
                    key={row.item_id || idx}
                    className="claim-row-clickable"
                    style={{
                      position: 'relative',
                      zIndex: actionMenuItemId === row.item_id ? 30 : 1,
                      borderBottom: '1px solid #F3F4F6',
                      backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      if (
                        e.target.closest('.checkbox-col') ||
                        e.target.closest('.action-btn') ||
                        e.target.closest('.action-menu') ||
                        e.target.closest('td:last-child')
                      )
                        return;
                      if (onSelectItem) onSelectItem(row);
                    }}
                  >
                    {/* Checkbox Column */}
                    <td
                      className="checkbox-col"
                      style={{ textAlign: 'center', padding: '8px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="checkbox-custom"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleSelectRow(row.item_id);
                        }}
                      />
                    </td>

                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#8D6E63' }}>
                      {(page - 1) * effectivePageSize + idx + 1}
                    </td>
                    <td style={{ fontWeight: '800', color: '#7B5233' }}>
                      {row.container_number}
                    </td>
                    <td style={{ fontWeight: '700', color: '#2D1A12' }}>{row.factory || '—'}</td>
                    <td style={{ fontWeight: '700', color: '#2D1A12' }}>{formatDateMDY(row.date_loading || row.date_loading_raw)}</td>
                    <td style={{ fontWeight: '700', color: '#2D1A12' }}>{formatTimestampVN(row.timestamp_raw)}</td>
                    <td style={{ fontWeight: '700', color: '#2D1A12' }}>{row.operator_name || '—'}</td>
                    <td style={{ fontWeight: '700', color: '#2D1A12' }}>{row.lpn || '—'}</td>
                    <td style={{ fontWeight: '700', color: '#2D1A12' }}>{row.sku || '—'}</td>

                    {/* Cột Có hình ảnh */}
                    <td style={{ textAlign: 'center' }}>
                      {hasImage ? (
                        <span style={{
                          backgroundColor: '#ECFDF5',
                          color: '#047857',
                          border: '1px solid #A7F3D0',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Check size={12} strokeWidth={2.5} />
                          Có
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#F3F4F6',
                          color: '#9CA3AF',
                          border: '1px solid #E5E7EB',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: '600'
                        }}>
                          N/A
                        </span>
                      )}
                    </td>

                    {/* Cột Thao Tác — ⋮ menu dành cho action/edit */}
                    <td
                      style={{
                        textAlign: 'center',
                        position: 'relative',
                        zIndex: actionMenuItemId === row.item_id ? 40 : 1
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="action-btn"
                        title="Thao tác"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuItemId(actionMenuItemId === row.item_id ? null : row.item_id);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2"/>
                          <circle cx="12" cy="12" r="2"/>
                          <circle cx="12" cy="19" r="2"/>
                        </svg>
                      </button>

                      {actionMenuItemId === row.item_id && (
                        <div
                          className="action-menu"
                          style={{ right: '50%', transform: 'translateX(50%)', top: '80%', minWidth: '150px' }}
                        >
                          <button
                            type="button"
                            className="action-menu-item"
                            style={{ fontWeight: '600', color: '#7B5233' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuItemId(null);
                              if (onSelectItem) onSelectItem(row);
                            }}
                          >
                            Xem chi tiết LPN
                          </button>
                          <button
                            type="button"
                            className="action-menu-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuItemId(null);
                              alert(`Chỉnh sửa LPN ${row.record_type} ${row.suffix_key} — chức năng đang phát triển`);
                            }}
                          >
                            Chỉnh sửa chi tiết
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (Hiển thị mượt mà trên Mobile / Tablet) */}
      <div className="lpn-mobile-card-list lpn-mobile-only">
        {loading && items.length === 0 ? (
          <div className="lpn-mobile-empty">Đang tải danh sách Pallet / Box...</div>
        ) : items.length === 0 ? (
          <div className="lpn-mobile-empty">Chưa có bản ghi Pallet / Box nào.</div>
        ) : (
          items.map((row, idx) => {
            const isSelected = selectedItemIds.includes(row.item_id);
            const hasImage = Boolean((row.images_count > 0) || (row.images && row.images.length > 0));
            return (
              <div
                key={row.item_id || idx}
                className={`lpn-mobile-row-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectItem && onSelectItem(row)}
              >
                <div className="lpn-mobile-row-header">
                  <div className="lpn-mobile-row-title-box">
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => onToggleSelectRow(row.item_id)}
                    />
                    <span className="lpn-mobile-stt">#{(page - 1) * effectivePageSize + idx + 1}</span>
                    <span className="lpn-mobile-cont-num">{row.container_number}</span>
                    {row.factory && <span className="lpn-mobile-factory-badge">{row.factory}</span>}
                  </div>
                  <div className="lpn-mobile-row-right">
                    {hasImage ? (
                      <span className="lpn-img-badge-yes"><Check size={11} strokeWidth={2.5} /> Có ảnh</span>
                    ) : (
                      <span className="lpn-img-badge-no">N/A</span>
                    )}
                  </div>
                </div>

                <div className="lpn-mobile-row-grid">
                  <div className="lpn-mobile-row-cell">
                    <span className="lpn-cell-label">LPN:</span>
                    <span className="lpn-cell-val lpn-highlight">{row.lpn || '—'}</span>
                  </div>
                  <div className="lpn-mobile-row-cell">
                    <span className="lpn-cell-label">SKU:</span>
                    <span className="lpn-cell-val">{row.sku || '—'}</span>
                  </div>
                  <div className="lpn-mobile-row-cell">
                    <span className="lpn-cell-label">Ngày xếp:</span>
                    <span className="lpn-cell-val">{formatDateMDY(row.date_loading || row.date_loading_raw) || '—'}</span>
                  </div>
                  <div className="lpn-mobile-row-cell">
                    <span className="lpn-cell-label">Operator:</span>
                    <span className="lpn-cell-val">{row.operator_name || '—'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="lpn-pagination-container">
        <div style={{ color: '#8D6E63', fontWeight: '600' }}>
          Hiển thị <b>{startIdx.toLocaleString()}</b>–<b>{endIdx.toLocaleString()}</b> trên <b>{total.toLocaleString()}</b> kết quả Pallet / Box
        </div>

        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <button
            type="button"
            className="lpn-page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            title="Trang trước"
          >
            <ChevronLeft size={14} />
          </button>

          {getPageButtons().map((b, bIdx) => (
            b === '...' ? (
              <span key={`e-${bIdx}`} style={{ color: '#8D6E63', fontSize: '0.75rem', padding: '0 3px' }}>...</span>
            ) : (
              <button
                key={b}
                type="button"
                className={`lpn-page-btn ${b === page ? 'active' : ''}`}
                onClick={() => onPageChange(b)}
              >
                {b}
              </button>
            )
          ))}

          <button
            type="button"
            className="lpn-page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            title="Trang sau"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
