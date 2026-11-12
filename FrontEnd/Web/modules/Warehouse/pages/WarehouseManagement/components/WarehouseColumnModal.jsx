import React from 'react';
import { X, CheckSquare, RotateCcw, Columns } from 'lucide-react';
import { INVENTORY_COLUMN_GROUPS, DEFAULT_INVENTORY_VISIBLE_COLUMNS } from '../../../types/warehouseInventory.types';

/**
 * Modal cấu hình hiển thị nhóm cột và cột con cho Bảng 2 cấp Xuất - Nhập - Tồn
 * Hỗ trợ chọn tất cả, hoàn tác mặc định và bật/tắt theo từng nhóm
 */
export const WarehouseColumnModal = ({
  isOpen,
  onClose,
  visibleColumns = {},
  onToggleColumn,
  onToggleGroup,
  onShowAll,
  onResetDefault
}) => {
  if (!isOpen) return null;

  // Kiểm tra xem tất cả các cột đã được chọn chưa
  const allKeys = Object.keys(DEFAULT_INVENTORY_VISIBLE_COLUMNS);
  const isAllChecked = allKeys.every((k) => visibleColumns[k]);

  return (
    <div className="wh-modal-overlay" onClick={onClose}>
      <div className="wh-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="wh-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Columns size={18} color="#7B5233" />
            <h3>Tùy chỉnh cột hiển thị Bảng Xuất - Nhập - Tồn</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#8D6E63',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Modal */}
        <div className="wh-modal-body">
          <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#8D6E63' }}>
            Bật hoặc tắt các cột con bên dưới để tùy biến bảng báo cáo. Hệ thống tự động căn chỉnh tiêu đề 2 cấp và lưu cấu hình riêng cho bạn.
          </p>

          {/* Nhóm thao tác nhanh */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#FAF6F0',
              borderRadius: 6,
              marginBottom: 14,
              border: '1px solid #EADCC9'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={isAllChecked}
                onChange={() => (isAllChecked ? onResetDefault() : onShowAll())}
              />
              <span>Hiển thị tất cả các cột</span>
            </label>

            <button
              type="button"
              className="wh-btn"
              onClick={onResetDefault}
              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
            >
              <RotateCcw size={16} />
              <span>Khôi phục mặc định</span>
            </button>
          </div>

          {/* Danh sách từng nhóm cột */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {INVENTORY_COLUMN_GROUPS.map((group) => {
              if (group.isFixedGroup) {
                return (
                  <div
                    key={group.key}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#FBF9F7',
                      borderRadius: 6,
                      border: '1px solid #EADCC9'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#7B5233', marginBottom: 6 }}>
                      {group.label} (Cố định)
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      {group.columns.map((col) => (
                        <label
                          key={col.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.8rem',
                            color: '#8D6E63',
                            cursor: 'not-allowed'
                          }}
                        >
                          <input type="checkbox" checked disabled />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              }

              const groupCols = group.columns || [];
              const groupAllChecked = groupCols.every((c) => visibleColumns[c.key]);

              return (
                <div
                  key={group.key}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 6,
                    border: '1px solid #EADCC9'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                      borderBottom: '1px solid #FAF6F0',
                      paddingBottom: 4
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2D1A12' }}>
                      {group.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleGroup(group.key, !groupAllChecked)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.72rem',
                        color: '#7B5233',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {groupAllChecked ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                    {groupCols.map((col) => (
                      <label
                        key={col.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          color: '#2D1A12',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(visibleColumns[col.key])}
                          onChange={() => onToggleColumn(col.key)}
                        />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${col.label} - ${col.desc}`}>
                          <strong>{col.label}</strong> {col.desc ? `— ${col.desc}` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="wh-modal-footer">
          <button type="button" className="wh-btn wh-btn-primary" onClick={onClose}>
            Hoàn tất & Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarehouseColumnModal;
