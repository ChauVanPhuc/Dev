import React from 'react';
import { X } from 'lucide-react';

export const ConfirmDialogModal = ({
  isOpen,
  type = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  title = 'Xác Nhận Thao Tác',
  message = '',
  confirmText = 'Xác Nhận',
  cancelText = 'Hủy Bỏ',
  onConfirm = () => {},
  onCancel = () => {},
  loading = false
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          titleColor: '#991B1B',
          confirmBtnBg: '#DC2626',
          alertBoxBg: '#FEF2F2',
          alertBoxBorder: '#FECACA',
          textColor: '#991B1B'
        };
      case 'warning':
        return {
          titleColor: '#92400E',
          confirmBtnBg: '#D97706',
          alertBoxBg: '#FFFBEB',
          alertBoxBorder: '#FDE68A',
          textColor: '#92400E'
        };
      case 'success':
        return {
          titleColor: '#065F46',
          confirmBtnBg: '#059669',
          alertBoxBg: '#ECFDF5',
          alertBoxBorder: '#A7F3D0',
          textColor: '#065F46'
        };
      default:
        return {
          titleColor: '#075985',
          confirmBtnBg: '#0284C7',
          alertBoxBg: '#F0F9FF',
          alertBoxBorder: '#BAE6FD',
          textColor: '#075985'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          width: 'min(94vw, 460px)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
          border: '1px solid #EADCC9',
          animation: 'modalScaleUp 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Clean, no icon box) */}
        <div
          style={{
            padding: '16px 20px 14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #F0E6D8',
            backgroundColor: '#FFFDFB'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#4E3629' }}>
            {title}
          </h3>

          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              lineHeight: 1,
              color: '#8D6E63',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Đóng"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '18px 20px', fontSize: '0.86rem', color: '#2D1A12', lineHeight: '1.55' }}>
          {message && (
            <div
              style={{
                backgroundColor: styles.alertBoxBg,
                border: `1px solid ${styles.alertBoxBorder}`,
                borderRadius: '8px',
                padding: '14px 16px',
                fontSize: '0.85rem',
                color: styles.textColor,
                fontWeight: '600',
                wordBreak: 'break-word'
              }}
            >
              {message}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#FAF6F0',
            borderTop: '1px solid #EADCC9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          {cancelText && (
            <button
              type="button"
              className="btn-claim-action btn-claim-secondary"
              onClick={onCancel}
              disabled={loading}
              style={{
                height: '34px',
                padding: '0 16px',
                fontSize: '0.82rem',
                fontWeight: '700',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D5C7B7',
                color: '#4E3629'
              }}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            className="btn-claim-action btn-claim-primary"
            onClick={onConfirm}
            disabled={loading}
            style={{
              height: '34px',
              padding: '0 18px',
              fontSize: '0.82rem',
              fontWeight: '700',
              backgroundColor: styles.confirmBtnBg,
              borderColor: styles.confirmBtnBg,
              color: '#FFFFFF',
              boxShadow: `0 2px 8px ${styles.confirmBtnBg}30`
            }}
          >
            {loading ? 'Đang Xử Lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
