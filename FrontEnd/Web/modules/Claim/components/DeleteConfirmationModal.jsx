import React, { useState } from 'react';

/**
 * DeleteConfirmationModal: Modal xác nhận xóa hàng loạt hoặc đơn lẻ
 * Có chức năng mở rộng/thu gọn chi tiết từng dòng cần xóa.
 */
export const DeleteConfirmationModal = ({
  isOpen,
  items = [],
  onClose,
  onConfirm,
  message,
  renderItemDetails
}) => {
  const [expandedItems, setExpandedItems] = useState({});

  if (!isOpen) return null;

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="filter-modal-backdrop" style={{ zIndex: 9998 }}>
      <div className="filter-modal" style={{ width: 'min(90vw, 680px)', maxWidth: '100%', borderRadius: '12px', border: '1.5px solid #A0301B', overflow: 'hidden' }}>
        <div className="filter-modal-header" style={{
          borderBottom: '1px solid #EADCC9',
          padding: '16px 20px',
          backgroundColor: '#FEF2F2'
        }}>
          <div className="filter-modal-title-area">
            <h3 className="filter-modal-title" style={{
              color: '#A0301B',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Xác nhận xóa đã chọn
            </h3>
          </div>
          <button className="filter-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="filter-modal-body" style={{ padding: '20px 24px', fontSize: '0.9rem', color: '#2D1A12', backgroundColor: '#FFFFFF', lineHeight: '1.5', display: 'block', overflow: 'hidden' }}>
          {message}
          <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden', border: '1px solid #EADCC9', borderRadius: '8px', marginTop: '12px', backgroundColor: '#FFFFFF' }}>
            {items.map((item, index) => {
              const isExpanded = !!expandedItems[index];
              return renderItemDetails(item, index, isExpanded, () => toggleExpand(index));
            })}
          </div>
        </div>
        <div className="filter-modal-footer" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#FAF6F0' }}>
          <button
            type="button"
            className="btn-modal-reset"
            onClick={onClose}
            style={{
              height: '36px',
              padding: '0 20px',
              borderRadius: '8px',
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn-modal-apply"
            onClick={onConfirm}
            style={{
              backgroundColor: '#A0301B',
              height: '36px',
              padding: '0 20px',
              borderRadius: '8px',
              border: 'none',
              color: '#FFFFFF',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Đồng ý xóa
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
