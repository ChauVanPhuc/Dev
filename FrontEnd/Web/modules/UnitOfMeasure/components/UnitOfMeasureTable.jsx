// UnitOfMeasureTable.jsx - Bảng danh sách Quản lý đơn vị tính đồng bộ 100% với module Đơn hàng xuất khẩu
import React, { useState, useEffect } from 'react';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Ban, 
  CheckCircle 
} from 'lucide-react';
import { UNIT_COLUMNS } from '../types/unitOfMeasure.types';
import { UnitOfMeasurePagination } from './UnitOfMeasurePagination';

export const UnitOfMeasureTable = ({
  units = [],
  loading = false,
  totalCount = 0,
  totalPages = 1,
  page = 1,
  setPage,
  pageSize = 25,
  sortBy,
  setSortBy,
  sortDir,
  setSortDir,
  onEdit,
  onToggleStatus,
  onDelete
}) => {
  const [actionMenuId, setActionMenuId] = useState(null);

  // Đóng action menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.exp-action-td')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (columnKey) => {
    if (columnKey === 'stt' || columnKey === 'actions') return;
    if (sortBy === columnKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortDir('asc');
    }
  };

  // Render trạng thái theo đúng phong cách renderStatusBadge của Đơn hàng xuất khẩu
  const renderStatus = (status) => {
    const isActive = status === 'ACTIVE';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.72rem',
          fontWeight: '600',
          backgroundColor: isActive ? '#ECFDF5' : '#F3F4F6',
          color: isActive ? '#047857' : '#4B5563',
          border: `1px solid ${isActive ? '#A7F3D0' : '#E5E7EB'}`,
          whiteSpace: 'nowrap'
        }}
      >
        {isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
      </span>
    );
  };

  return (
    <div className="exp-table-card">
      <div className="exp-table-scroll">
        <table className="exp-table">
          <thead>
            <tr>
              {UNIT_COLUMNS.map((col) => {
                const isSortable = col.key !== 'stt' && col.key !== 'actions';
                return (
                  <th
                    key={col.key}
                    style={{ 
                      width: col.width, 
                      textAlign: col.align 
                    }}
                    onClick={() => isSortable && handleSort(col.key)}
                  >
                    <div 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        cursor: isSortable ? 'pointer' : 'default',
                        justifyContent: col.align === 'center' ? 'center' : (col.align === 'right' ? 'flex-end' : 'flex-start')
                      }}
                    >
                      <span>{col.label}</span>
                      {isSortable && sortBy === col.key && (
                        <span style={{ fontSize: '0.7rem' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td 
                  colSpan={UNIT_COLUMNS.length} 
                  style={{ textAlign: 'center', padding: '40px', color: '#8D6E63' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span>Đang tải danh sách đơn vị tính...</span>
                  </div>
                </td>
              </tr>
            ) : units.length === 0 ? (
              <tr>
                <td 
                  colSpan={UNIT_COLUMNS.length} 
                  style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}
                >
                  Không tìm thấy đơn vị tính nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              units.map((unit, idx) => {
                const rowStt = (page - 1) * pageSize + idx + 1;
                const isMenuOpen = actionMenuId === unit.id;
                const isNearBottom = idx >= units.length - 2;

                return (
                  <tr key={unit.id}>
                    {/* STT */}
                    <td style={{ textAlign: 'center', fontWeight: '500', color: '#6B7280' }}>
                      {rowStt}
                    </td>

                    {/* Tên đơn vị tính (Văn bản thông thường, không đóng badge / viền) */}
                    <td style={{ textAlign: 'left', fontWeight: '600', color: '#2D1A12' }}>
                      {unit.code}
                    </td>

                    {/* Tên đơn vị tính đầy đủ */}
                    <td style={{ textAlign: 'left', color: unit.full_name ? '#2D1A12' : '#9CA3AF' }}>
                      {unit.full_name || '—'}
                    </td>

                    {/* Độ chính xác (Số thông thường, không badge xám) */}
                    <td style={{ textAlign: 'center', color: '#2D1A12' }}>
                      {unit.precision !== undefined ? unit.precision : 0}
                    </td>

                    {/* Trạng thái */}
                    <td style={{ textAlign: 'center' }}>
                      {renderStatus(unit.status)}
                    </td>

                    {/* Thao tác (3 chấm không viền, menu chuẩn Đơn hàng xuất khẩu) */}
                    <td 
                      style={{ textAlign: 'center', position: 'relative', overflow: 'visible' }} 
                      className="exp-action-td"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          className={`exp-action-btn ${isMenuOpen ? 'active' : ''}`}
                          title="Thao tác"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(isMenuOpen ? null : unit.id);
                          }}
                        >
                          <MoreVertical size={18} />
                        </button>

                        {isMenuOpen && (
                          <div 
                            className={`exp-action-menu ${isNearBottom ? 'drop-up' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="exp-action-menu-item"
                              onClick={() => {
                                setActionMenuId(null);
                                onEdit(unit);
                              }}
                            >
                              <Edit size={14} color="#0284C7" />
                              <span>Chỉnh sửa</span>
                            </button>

                            <button
                              type="button"
                              className="exp-action-menu-item"
                              onClick={() => {
                                setActionMenuId(null);
                                onToggleStatus(unit);
                              }}
                            >
                              {unit.status === 'ACTIVE' ? (
                                <>
                                  <Ban size={14} color="#F59E0B" />
                                  <span>Ngừng hoạt động</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle size={14} color="#059669" />
                                  <span>Kích hoạt lại</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className="exp-action-menu-item danger"
                              onClick={() => {
                                setActionMenuId(null);
                                onDelete(unit);
                              }}
                            >
                              <Trash2 size={14} color="#DC2626" />
                              <span>Xóa đơn vị tính</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang chuẩn hóa từ component ExportOrderPagination */}
      <UnitOfMeasurePagination
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        ordersLength={units.length}
        itemLabel="đơn vị tính"
      />
    </div>
  );
};

export default UnitOfMeasureTable;
