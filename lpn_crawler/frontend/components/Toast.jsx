import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const Toast = ({
  show,
  type = 'success', // 'success' | 'error' | 'warning' | 'info'
  message = '',
  onClose = () => {},
  duration = 4000
}) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show || !message) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          icon: <AlertCircle size={18} color="#DC2626" />,
          bg: '#FEF2F2',
          border: '#FCA5A5',
          text: '#991B1B'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={18} color="#D97706" />,
          bg: '#FEF3C7',
          border: '#FCD34D',
          text: '#92400E'
        };
      case 'info':
        return {
          icon: <Info size={18} color="#0284C7" />,
          bg: '#F0F9FF',
          border: '#BAE6FD',
          text: '#075985'
        };
      default:
        return {
          icon: <CheckCircle size={18} color="#059669" />,
          bg: '#ECFDF5',
          border: '#A7F3D0',
          text: '#065F46'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 2000,
        backgroundColor: styles.bg,
        border: `1.5px solid ${styles.border}`,
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '420px',
        animation: 'slideInRight 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
      }}
    >
      <div style={{ flexShrink: 0 }}>{styles.icon}</div>
      <div style={{ flex: 1, fontSize: '0.84rem', fontWeight: '700', color: styles.text }}>
        {message}
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: styles.text,
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          opacity: 0.7
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
};
