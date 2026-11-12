// GoodsReceiptTable.jsx - Bảng danh sách Phiếu Nhập Kho chuẩn 16 cột
import React, { useState } from 'react';
import { MoreVertical, Eye, Edit, Trash2, Package, Printer } from 'lucide-react';
import {
  GOODS_RECEIPT_COLUMNS,
  RECEIPT_STATUSES,
  formatDate,
  formatNumber,
  formatCurrencyVND
} from '../../../types/goodsReceipt.types';
import GoodsReceiptPagination from './GoodsReceiptPagination';
import { ChannelBadge } from '../../../components/WarehouseMobileSyncBadge';

const renderReceiptStatusBadge = (statusKey) => {
  const cfg = RECEIPT_STATUSES[statusKey] || {
    label: statusKey || 'Chưa xác định',
    bg: '#F3F4F6',
    color: '#4B5563',
    border: '#E5E7EB'
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {cfg.label}
    </span>
  );
};

export const GoodsReceiptTable = ({
  receipts = [],
  loading = false,
  totalCount = 0,
  totalPages = 1,
  page = 1,
  setPage,
  pageSize = 25,
  sortBy = 'created_at',
  setSortBy,
  sortDir = 'desc',
  setSortDir,
  selectedIds = [],
  setSelectedIds,
  visibleColumns = {},
  onOpenDetailModal,
  onDeleteReceipt
}) => {
  const [actionMenuId, setActionMenuId] = useState(null);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(receipts.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Tính số cột thực tế hiển thị
  const activeColumns = GOODS_RECEIPT_COLUMNS.filter(
    (col) => visibleColumns[col.key] && col.key !== 'actions'
  );
  // Checkbox (1) + STT (1) + activeColumns + Actions (1)
  const totalColSpan = 2 + activeColumns.length + (visibleColumns['actions'] ? 1 : 0);

  return (
    <div className="wh-table-card">
      <div className="wh-table-scroll">
        <table className="wh-table">
          <thead>
            <tr>
              {/* 1. Checkbox chọn dòng */}
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={receipts.length > 0 && selectedIds.length === receipts.length}
                  onChange={handleSelectAll}
                  style={{ accentColor: '#7B5233', cursor: 'pointer' }}
                />
              </th>

              {/* 2. STT */}
              <th style={{ width: '45px', textAlign: 'center' }}>STT</th>

              {/* 3 - 15. Các cột dữ liệu theo cấu hình cột */}
              {activeColumns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, textAlign: col.align }}
                  onClick={() => {
                    if (sortBy === col.key) {
                      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy(col.key);
                      setSortDir('asc');
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{col.label}</span>
                    {sortBy === col.key && (
                      <span style={{ fontSize: '0.7rem' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              ))}

              {/* 16. Cột Thao tác */}
              {visibleColumns['actions'] && (
                <th style={{ width: '65px', textAlign: 'center' }}>Thao tác</th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={totalColSpan} style={{ textAlign: 'center', padding: '40px', color: '#8D6E63' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span>Đang nạp dữ liệu phiếu nhập kho...</span>
                  </div>
                </td>
              </tr>
            ) : receipts.length === 0 ? (
              <tr>
                <td colSpan={totalColSpan} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                  Không tìm thấy phiếu nhập kho nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              receipts.map((rec, idx) => {
                const isSelected = selectedIds.includes(rec.id);
                const rowStt = (page - 1) * pageSize + idx + 1;

                return (
                  <React.Fragment key={rec.id}>
                    <tr className={isSelected ? 'selected' : ''}>
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(rec.id)}
                          style={{ accentColor: '#7B5233', cursor: 'pointer' }}
                        />
                      </td>

                      {/* STT */}
                      <td style={{ textAlign: 'center', color: '#8D6E63', fontWeight: '500' }}>
                        {rowStt}
                      </td>

                      {/* Mã phiếu */}
                      {visibleColumns['voucher_no'] && (
                        <td style={{ textAlign: 'left' }}>
                          <button
                            type="button"
                            onClick={() => onOpenDetailModal?.(rec, false)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              fontWeight: '700',
                              color: '#7B5233',
                              textDecoration: 'underline'
                            }}
                            title="Xem chi tiết phiếu nhập kho"
                          >
                            {rec.voucher_no}
                          </button>
                          <ChannelBadge channel={rec.created_channel} imageCount={(rec.images || []).length} />
                        </td>
                      )}

                      {/* Tên kho */}
                      {visibleColumns['warehouse_name'] && (
                        <td style={{ textAlign: 'left', fontWeight: '600', color: '#1F2937' }}>
                          {rec.warehouse_name}
                        </td>
                      )}

                      {/* Ngày nhập kho */}
                      {visibleColumns['receipt_date'] && (
                        <td style={{ textAlign: 'center', color: '#4B5563' }}>
                          {formatDate(rec.receipt_date)}
                        </td>
                      )}

                      {/* Người bàn giao */}
                      {visibleColumns['deliverer_name'] && (
                        <td style={{ textAlign: 'left', color: '#1F2937' }}>
                          {rec.deliverer_name || '—'}
                        </td>
                      )}

                      {/* Mã khách */}
                      {visibleColumns['customer_code'] && (
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              backgroundColor: '#FAF6F0',
                              color: '#7B5233',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            {rec.customer_code || '—'}
                          </span>
                        </td>
                      )}

                      {/* Tên khách */}
                      {visibleColumns['customer_name'] && (
                        <td style={{ textAlign: 'left', color: '#1F2937', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rec.customer_name || '—'}
                        </td>
                      )}

                      {/* Bộ phận */}
                      {visibleColumns['department_name'] && (
                        <td style={{ textAlign: 'left', color: '#4B5563' }}>
                          {rec.department_name || '—'}
                        </td>
                      )}

                      {/* Nội dung */}
                      {visibleColumns['content'] && (
                        <td style={{ textAlign: 'left', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rec.content}>
                          {rec.content || '—'}
                        </td>
                      )}

                      {/* Loại phiếu */}
                      {visibleColumns['receipt_type'] && (
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              backgroundColor: '#F3F4F6',
                              color: '#374151',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: '500'
                            }}
                          >
                            {rec.receipt_type}
                          </span>
                        </td>
                      )}

                      {/* Trạng thái */}
                      {visibleColumns['status'] && (
                        <td style={{ textAlign: 'center' }}>
                          {renderReceiptStatusBadge(rec.status)}
                        </td>
                      )}

                      {/* CTGS */}
                      {visibleColumns['ctgs'] && (
                        <td style={{ textAlign: 'center', color: '#4B5563', fontFamily: 'monospace' }}>
                          {rec.ctgs || '—'}
                        </td>
                      )}

                      {/* Ngày tạo */}
                      {visibleColumns['created_at'] && (
                        <td style={{ textAlign: 'center', color: '#6B7280' }}>
                          {formatDate(rec.created_at)}
                        </td>
                      )}

                      {/* Người tạo */}
                      {visibleColumns['created_by'] && (
                        <td style={{ textAlign: 'left', color: '#4B5563' }}>
                          {rec.created_by || '—'}
                        </td>
                      )}

                      {/* 16. Thao tác: Dấu 3 chấm, KHÔNG bo khung, KHÔNG background, KHÔNG làm nút riêng */}
                      {visibleColumns['actions'] && (
                        <td
                          style={{ textAlign: 'center', position: 'relative' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              type="button"
                              className={`wh-action-btn ${actionMenuId === rec.id ? 'active' : ''}`}
                              title="Thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === rec.id ? null : rec.id);
                              }}
                            >
                              <MoreVertical size={17} />
                            </button>

                            {actionMenuId === rec.id && (
                              <div
                                className={`wh-action-menu ${idx >= receipts.length - 2 ? 'drop-up' : ''}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="wh-action-menu-item"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    onOpenDetailModal?.(rec, false);
                                  }}
                                >
                                  <Eye size={14} color="#7B5233" />
                                  <span>Xem chi tiết</span>
                                </button>

                                <button
                                  type="button"
                                  className="wh-action-menu-item"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    onOpenDetailModal?.(rec, true);
                                  }}
                                >
                                  <Edit size={14} color="#0284C7" />
                                  <span>Chỉnh sửa</span>
                                </button>

                                <button
                                  type="button"
                                  className="wh-action-menu-item"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    window.print();
                                  }}
                                >
                                  <Printer size={14} color="#4B5563" />
                                  <span>In phiếu</span>
                                </button>

                                <button
                                  type="button"
                                  className="wh-action-menu-item danger"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    onDeleteReceipt?.(rec.id);
                                  }}
                                >
                                  <Trash2 size={14} color="#DC2626" />
                                  <span>Xóa phiếu</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang đồng bộ */}
      <GoodsReceiptPagination
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        itemsLength={receipts.length}
      />
    </div>
  );
};

export default GoodsReceiptTable;
