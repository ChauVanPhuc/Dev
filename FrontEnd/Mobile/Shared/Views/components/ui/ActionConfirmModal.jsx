/**
 * File: ActionConfirmModal.jsx
 * Thành phần xác nhận hành động với giao diện cao cấp.
 */
import React from 'react';
import { 
  CheckCircle2, 
  HelpCircle, 
  Trash2, 
  X, 
  Save, 
  AlertTriangle,
  RotateCcw,
  Check
} from 'lucide-react';

const ActionConfirmModal = ({ 
  isOpen, 
  onClose, 
  onAction, 
  title = 'Xác nhận', 
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?', 
  type = 'confirm', // 'confirm', 'save', 'delete', 'warning'
  confirmText,
  cancelText = 'Hủy'
}) => {
  
  // Cấu hình theo loại hành động
  const config = {
    confirm: {
      icon: <HelpCircle size={32} color="#4b301e" />,
      bgIcon: '#fcf8f1',
      btnColor: '#4b301e',
      btnText: confirmText || 'Xác nhận',
      shadow: '0 10px 20px rgba(75,48,30,0.2)'
    },
    save: {
      icon: <Save size={32} color="#15803d" />,
      bgIcon: '#f0fdf4',
      btnColor: '#15803d',
      btnText: confirmText || 'Lưu lại',
      shadow: '0 10px 20px rgba(21,128,61,0.2)'
    },
    delete: {
      icon: <Trash2 size={32} color="#b91c1c" />,
      bgIcon: '#fef2f2',
      btnColor: '#b91c1c',
      btnText: confirmText || 'Xóa bỏ',
      shadow: '0 10px 20px rgba(185,28,28,0.2)'
    },
    warning: {
      icon: <AlertTriangle size={32} color="#b45309" />,
      bgIcon: '#fffbeb',
      btnColor: '#b45309',
      btnText: confirmText || 'Đồng ý',
      shadow: '0 10px 20px rgba(180,83,9,0.2)'
    }
  };

  const currentConfig = config[type] || config.confirm;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)'
        }}
      />

      {/* Modal Content */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '360px',
          background: 'white',
          borderRadius: '32px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          padding: '32px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Icon Container */}
          <div 
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: currentConfig.bgIcon,
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}
          >
            {currentConfig.icon}
          </div>

          <h3 style={{
            fontSize: '22px',
            fontWeight: '800',
            color: '#2d231a',
            marginBottom: '8px',
            lineHeight: '1.2'
          }}>
            {title}
          </h3>
          <p style={{
            fontSize: '15px',
            color: '#7c6d5e',
            lineHeight: '1.6',
            marginBottom: '32px',
            padding: '0 8px'
          }}>
            {message}
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: '#f7f2eb',
                color: '#7c6d5e',
                fontWeight: '700',
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RotateCcw size={18} color="#4b3f35" />
              <span style={{ color: '#4b3f35' }}>{cancelText || 'Hủy'}</span>
            </button>
            <button
              onClick={() => {
                onAction && onAction();
                onClose();
              }}
              style={{
                flex: 1,
                padding: '14px 16px',
                borderRadius: '16px',
                backgroundColor: currentConfig.btnColor,
                color: 'white',
                fontWeight: '700',
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: currentConfig.shadow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <Check size={18} color="white" />
              <span>{currentConfig.btnText || 'Xác nhận'}</span>
            </button>
          </div>
        </div>

        {/* Close Button Top Right */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.05)',
            color: 'rgba(0,0,0,0.3)',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default ActionConfirmModal;
