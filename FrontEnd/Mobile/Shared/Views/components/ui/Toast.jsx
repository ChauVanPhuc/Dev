/**
 * File: Toast.jsx
 * Tự động comment: File này thuộc mô hình dự án, phụ trách Toast.
 */
import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ 
  isVisible, 
  onClose, 
  message, 
  type = 'success', // 'success', 'error', 'info'
  duration = 3000 
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  /**
   * Hàm getIcon
   * Xử lý tác vụ, sự kiện tương ứng.
   */
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} color="#22c55e" />;
      case 'error': return <AlertCircle size={18} color="#ef4444" />;
      default: return <Info size={18} color="#3b82f6" />;
    }
  };

  /**
   * Hàm getBgColor
   * Xử lý tác vụ, sự kiện tương ứng.
   */
  const getBgColor = () => {
    switch (type) {
      case 'success': return '#f0fdf4';
      case 'error': return '#fef2f2';
      default: return '#eff6ff';
    }
  };

  /**
   * Hàm getBorderColor
   * Xử lý tác vụ, sự kiện tương ứng.
   */
  const getBorderColor = () => {
    switch (type) {
      case 'success': return '#dcfce7';
      case 'error': return '#fee2e2';
      default: return '#dbeafe';
    }
  };

  /**
   * Hàm getTextColor
   * Xử lý tác vụ, sự kiện tương ứng.
   */
  const getTextColor = () => {
    switch (type) {
      case 'success': return '#166534';
      case 'error': return '#991b1b';
      default: return '#1e40af';
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '32px',
      left: 0,
      right: 0,
      zIndex: 10000,
      display: 'flex',
      justifyContent: 'center',
      padding: '0 20px',
      pointerEvents: 'none'
    }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          background: getBgColor(),
          border: `1px solid ${getBorderColor()}`,
          borderRadius: '20px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
          minHeight: '56px',
          pointerEvents: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {getIcon()}
        </div>
        
        <div style={{ 
          flex: 1, 
          fontSize: '14px', 
          fontWeight: '700', 
          color: getTextColor(),
          lineHeight: '1.4' 
        }}>
          {message}
        </div>

        <button 
          onClick={onClose}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '4px',
            color: getTextColor(),
            opacity: 0.5,
            background: 'none',
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

export default Toast;
