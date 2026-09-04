import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const QualityAttendancePopup = ({
  isOpen,
  type = 'success', // 'success' | 'warning' | 'error' | 'confirm'
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  onConfirm,
  onCancel,
  onClose
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={36} style={{ color: '#166534' }} />;
      case 'warning':
      case 'confirm':
        return <AlertTriangle size={36} style={{ color: '#D97706' }} />;
      case 'error':
        return <AlertTriangle size={36} style={{ color: '#DC2626' }} />;
      default:
        return <Info size={36} style={{ color: '#7B5233' }} />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'error':
        return '#991B1B';
      default:
        return '#3D2B1F'; // Project Gold Espresso
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '440px', width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.1)',
        border: '1px solid #EADCC9', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', backgroundColor: getHeaderBg(), color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {title || (type === 'confirm' ? 'Xác nhận thao tác' : 'Thông báo hệ thống')}
          </h4>
          <button onClick={onClose || onCancel} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '2px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#2D1A12', fontWeight: 700, lineHeight: 1.5 }}>
            {message}
          </p>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '12px 20px', backgroundColor: '#FAF6F0', borderTop: '1px solid #EADCC9', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {(type === 'confirm' || onCancel) && (
            <button
              onClick={onCancel || onClose}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', color: '#374151', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              {cancelText}
            </button>
          )}

          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              if (onClose) onClose();
            }}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              backgroundColor: type === 'error' ? '#DC2626' : '#3D2B1F',
              color: '#FFFFFF', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QualityAttendancePopup;
