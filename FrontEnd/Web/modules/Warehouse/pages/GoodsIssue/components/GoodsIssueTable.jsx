// GoodsIssueTable.jsx - Bảng danh sách Phiếu Xuất Kho chuẩn 16 cột
import React, { useState } from 'react';
import { MoreVertical, Eye, Edit, Trash2, Package, Printer } from 'lucide-react';
import {
  GOODS_ISSUE_COLUMNS,
  ISSUE_STATUSES,
  formatDate,
  formatNumber
} from '../../../types/goodsIssue.types';
import GoodsIssuePagination from './GoodsIssuePagination';
import { ChannelBadge } from '../../../components/WarehouseMobileSyncBadge';

const renderIssueStatusBadge = (statusKey) => {
  const cfg = ISSUE_STATUSES[statusKey] || {
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

export const GoodsIssueTable = ({
  issues = [],
  loading = false,
  totalCount = 0,
  totalPages = 1,
  page = 1,
  setPage,
  pageSize = 15,
  setPageSize,
  sortBy = 'created_at',
  setSortBy,
  sortDir = 'desc',
  setSortDir,
  selectedIds = [],
  setSelectedIds,
  visibleColumns = {},
  onOpenDetailModal,
  onDeleteIssue
}) => {
  const [actionMenuId, setActionMenuId] = useState(null);
  const [expandedRowIds, setExpandedRowIds] = useState({});

  const toggleRowExpand = (id) => {
    setExpandedRowIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(issues.map((r) => r.id));
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
  const activeColumns = GOODS_ISSUE_COLUMNS.filter(
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
                  checked={issues.length > 0 && selectedIds.length === issues.length}
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
                    <span>Đang nạp dữ liệu phiếu xuất kho...</span>
                  </div>
                </td>
              </tr>
            ) : issues.length === 0 ? (
              <tr>
                <td colSpan={totalColSpan} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                  Không tìm thấy phiếu xuất kho nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              issues.map((iss, idx) => {
                const isSelected = selectedIds.includes(iss.id);
                const isExpanded = Boolean(expandedRowIds[iss.id]);
                const rowStt = (page - 1) * pageSize + idx + 1;

                return (
                  <React.Fragment key={iss.id}>
                    <tr className={isSelected ? 'selected' : ''}>
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(iss.id)}
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
                            onClick={() => onOpenDetailModal?.(iss, false)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              fontWeight: '700',
                              color: '#7B5233',
                              textDecoration: 'underline'
                            }}
                            title="Xem chi tiết phiếu xuất kho"
                          >
                            {iss.voucher_no}
                          </button>
                          <ChannelBadge channel={iss.created_channel} imageCount={(iss.images || []).length} />
                        </td>
                      )}

                      {/* Tên kho */}
                      {visibleColumns['warehouse_name'] && (
                        <td style={{ textAlign: 'left', fontWeight: '600', color: '#1F2937' }}>
                          {iss.warehouse_name}
                        </td>
                      )}

                      {/* Ngày xuất kho */}
                      {visibleColumns['issue_date'] && (
                        <td style={{ textAlign: 'center', color: '#4B5563' }}>
                          {formatDate(iss.issue_date)}
                        </td>
                      )}

                      {/* Người bàn giao & Người nhận */}
                      {visibleColumns['deliverer_name'] && (
                        <td style={{ textAlign: 'left', color: '#1F2937' }}>
                          <div>{iss.deliverer_name || '—'}</div>
                          {iss.receiver_name && (
                            <div style={{ fontSize: '0.73rem', color: '#059669', fontWeight: 600 }}>
                              Nhận: {iss.receiver_name}
                            </div>
                          )}
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
                            {iss.customer_code || '—'}
                          </span>
                        </td>
                      )}

                      {/* Tên khách */}
                      {visibleColumns['customer_name'] && (
                        <td style={{ textAlign: 'left', color: '#1F2937', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {iss.customer_name || '—'}
                        </td>
                      )}

                      {/* Bộ phận */}
                      {visibleColumns['department_name'] && (
                        <td style={{ textAlign: 'left', color: '#4B5563' }}>
                          {iss.department_name || '—'}
                        </td>
                      )}

                      {/* Nội dung */}
                      {visibleColumns['content'] && (
                        <td style={{ textAlign: 'left', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={iss.content}>
                          {iss.content || '—'}
                        </td>
                      )}

                      {/* Loại phiếu */}
                      {visibleColumns['issue_type'] && (
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
                            {iss.issue_type}
                          </span>
                        </td>
                      )}

                      {/* Trạng thái */}
                      {visibleColumns['status'] && (
                        <td style={{ textAlign: 'center' }}>
                          {renderIssueStatusBadge(iss.status)}
                        </td>
                      )}

                      {/* CTGS */}
                      {visibleColumns['ctgs'] && (
                        <td style={{ textAlign: 'center', color: '#4B5563', fontFamily: 'monospace' }}>
                          {iss.ctgs || '—'}
                        </td>
                      )}

                      {/* Ngày tạo */}
                      {visibleColumns['created_at'] && (
                        <td style={{ textAlign: 'center', color: '#6B7280' }}>
                          {formatDate(iss.created_at)}
                        </td>
                      )}

                      {/* Người tạo */}
                      {visibleColumns['created_by'] && (
                        <td style={{ textAlign: 'left', color: '#4B5563' }}>
                          {iss.created_by || '—'}
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
                              className={`wh-action-btn ${actionMenuId === iss.id ? 'active' : ''}`}
                              title="Thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === iss.id ? null : iss.id);
                              }}
                            >
                              <MoreVertical size={17} />
                            </button>

                            {actionMenuId === iss.id && (
                              <div
                                className={`wh-action-menu ${idx >= issues.length - 2 ? 'drop-up' : ''}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="wh-action-menu-item"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    toggleRowExpand(iss.id);
                                  }}
                                >
                                  <Package size={14} color="#7B5233" />
                                  <span>{isExpanded ? 'Đóng dòng hàng' : 'Xem dòng hàng'}</span>
                                </button>

                                <button
                                  type="button"
                                  className="wh-action-menu-item"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    onOpenDetailModal?.(iss, false);
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
                                    onOpenDetailModal?.(iss, true);
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
                                    onDeleteIssue?.(iss.id);
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

                    {/* Dòng mở rộng chi tiết các mặt hàng trong phiếu xuất kho */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={totalColSpan} style={{ padding: 0 }}>
                          <div className="wh-subtable-wrapper">
                            <div className="wh-subtable-header">
                              <span>Chi tiết các dòng hàng thuộc phiếu {iss.voucher_no}</span>
                              <span style={{ fontWeight: 'normal', color: '#6B7280' }}>
                                Tổng SL xuất: <strong>{formatNumber(iss.total_quantity || 0)}</strong>
                              </span>
                            </div>

                            <table className="wh-subtable">
                              <thead>
                                <tr>
                                  <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                                  <th style={{ width: '130px', textAlign: 'left' }}>Mã hàng/vật tư</th>
                                  <th style={{ textAlign: 'left' }}>Tên hàng hóa / vật tư</th>
                                  <th style={{ width: '80px', textAlign: 'center' }}>ĐVT</th>
                                  <th style={{ width: '100px', textAlign: 'right' }}>Số lượng</th>
                                </tr>
                              </thead>
                              <tbody>
                                {iss.items && iss.items.length > 0 ? (
                                  iss.items.map((it, itemIdx) => (
                                    <tr key={it.id || itemIdx}>
                                      <td style={{ textAlign: 'center', color: '#8D6E63' }}>{itemIdx + 1}</td>
                                      <td style={{ textAlign: 'left', fontWeight: '600', color: '#7B5233' }}>
                                        {it.item_code}
                                      </td>
                                      <td style={{ textAlign: 'left' }}>{it.item_name}</td>
                                      <td style={{ textAlign: 'center' }}>{it.unit}</td>
                                      <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                        {formatNumber(it.quantity)}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '12px', color: '#9CA3AF' }}>
                                      Chưa có danh mục dòng hàng chi tiết.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang đồng bộ */}
      <GoodsIssuePagination
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        itemsLength={issues.length}
      />
    </div>
  );
};

export default GoodsIssueTable;
