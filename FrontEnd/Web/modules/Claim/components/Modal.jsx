import React from 'react';

/**
 * FilterModal: Bộ lọc nâng cao.
 */
export const FilterModal = ({
  isOpen,
  onClose,
  onSubmit,
  onReset,
  resetLabel = 'Reset bộ lọc',
  applyLabel = 'Áp dụng',
  style = { maxWidth: '500px' },
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="filter-modal-backdrop" onClick={onClose}>
      <div className="filter-modal" style={style} onClick={(e) => e.stopPropagation()}>
        <div className="filter-modal-header" style={{ padding: '14px 20px' }}>
          <div className="filter-modal-title-area">
            <h3 className="filter-modal-title" style={{ fontSize: '1.05rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              Bộ lọc
            </h3>
          </div>
          <button className="filter-modal-close" onClick={onClose} type="button">&times;</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="filter-modal-body" style={{ gridTemplateColumns: '1fr', padding: '20px', gap: '16px' }}>
            <div className="filter-card-section" style={{ gap: '16px' }}>
              {children}
            </div>
          </div>

          <div className="filter-modal-footer">
            <button 
              type="button" 
              className="btn-modal-reset" 
              onClick={onReset}
            >
              {resetLabel}
            </button>
            <button 
              type="submit" 
              className="btn-modal-apply"
            >
              {applyLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * FormModal: Modal Thêm mới hoặc Chỉnh sửa biểu mẫu.
 */
export const FormModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  width = 'min(95vw, 600px)',
  bodyStyle = { padding: '20px' },
  actionsStyle = { borderTop: '1px solid #E5E7EB', padding: '15px 24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', backgroundColor: '#FFFDFB', margin: 0 },
  cancelLabel = 'Hủy bỏ',
  confirmLabel = 'Xác nhận',
  leftFooterActions,
  leftSideAction,
  rightSideAction,
  headerActions,
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="add-claim-backdrop" onClick={onClose}>
      <div className="form-modal-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
        {leftSideAction}
        <form 
          onSubmit={(e) => { e.preventDefault(); onSubmit(e); }}
          className="add-claim-modal" 
          style={{ width }}
        >
          {/* Modal Header */}
          <div className="add-claim-header">
            <h2 className="add-claim-title">{title}</h2>
            <div className="add-claim-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {headerActions}
              <button
                className="add-claim-icon-btn"
                title="Đóng"
                type="button"
                onClick={onClose}
                style={{ fontSize: '1.6rem', padding: '0 6px', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="add-claim-body" style={bodyStyle}>
            {children}
          </div>

          {/* Modal Footer */}
          <div className="add-claim-actions-row" style={actionsStyle}>
            {leftFooterActions && (
              <div style={{ marginRight: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                {leftFooterActions}
              </div>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="add-claim-btn-cancel"
            >
              {cancelLabel}
            </button>
            {confirmLabel && (
              <button 
                type="submit"
                className="add-claim-btn-save"
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </form>
        {rightSideAction}
      </div>
    </div>
  );
};

/**
 * AlertModal: Hộp thoại hiển thị thông tin cảnh báo kết quả (xóa, cập nhật...).
 */
export const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  width = '420px'
}) => {
  if (!isOpen) return null;

  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div className="filter-modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="filter-modal" style={{ 
        width,
        maxWidth: '100%', 
        borderRadius: '12px', 
        border: '1.5px solid #EADCC9', 
        overflow: 'hidden' 
      }} onClick={(e) => e.stopPropagation()}>
        <div className="filter-modal-header" style={{
          borderBottom: '1px solid #EADCC9',
          padding: '16px 20px',
          backgroundColor: isSuccess ? '#ECFDF5' : isError ? '#FEF2F2' : '#FAF6F0'
        }}>
          <div className="filter-modal-title-area">
            <h3 className="filter-modal-title" style={{
              color: isSuccess ? '#10B981' : isError ? '#EF4444' : '#7B5233',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {isSuccess ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : isError ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              )}
              {title}
            </h3>
          </div>
          <button className="filter-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="filter-modal-body" style={{ padding: '20px 24px', fontSize: '0.9rem', color: '#2D1A12', backgroundColor: '#FFFFFF', lineHeight: '1.5', display: 'block', overflow: 'hidden' }}>
          {message}
        </div>
        <div className="filter-modal-footer" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#FAF6F0' }}>
          <button
            type="button"
            className="btn-modal-apply"
            style={{
              backgroundColor: isSuccess ? '#10B981' : isError ? '#EF4444' : '#2D1A12',
              height: '36px',
              padding: '0 20px',
              borderRadius: '8px',
              border: 'none',
              color: '#FFFFFF',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
