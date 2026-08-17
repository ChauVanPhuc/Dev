import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

const BeautifulConfirmModal = ({ visible, isOpen, onCancel, onClose, onConfirm, title, message, type = 'warning', confirmText = 'Xác nhận', cancelText = 'Hủy' }) => {
  const isVisible = visible ?? isOpen;
  const handleCancel = onCancel || onClose;
  const resolvedType = type === 'danger' ? 'error' : type;
  if (!isVisible) return null;

  const getIcon = () => {
    switch (resolvedType) {
      case 'warning': return <AlertTriangle size={48} color="#f59e0b" />;
      case 'success': return <CheckCircle size={48} color="#10b981" />;
      case 'error': return <AlertCircle size={48} color="#ef4444" />;
      default: return <Info size={48} color="#3b82f6" />;
    }
  };

  const getHeaderColor = () => {
    switch (resolvedType) {
      case 'warning': return '#f59e0b';
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.3s ease-out',
      overflowY: 'auto',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '450px',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        textAlign: 'center'
      }}>
        <button
          onClick={handleCancel}
          style={{
            position: 'absolute',
            top: '20px', right: '20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
          onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
        >
          <X size={18} />
        </button>

        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            padding: '20px',
            borderRadius: '20px',
            backgroundColor: `${getHeaderColor()}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {getIcon()}
          </div>
        </div>

        <h3 style={{
          fontSize: '20px',
          fontWeight: '800',
          color: '#1e293b',
          marginBottom: '12px',
          margin: 0
        }}>
          {title}
        </h3>

        <p
          className="custom-modal-content"
          style={{
            fontSize: '15px',
            color: '#64748b',
            lineHeight: '1.6',
            marginBottom: '28px',
            whiteSpace: 'pre-line',
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '0 10px',
            textAlign: 'center'
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: 'none',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1.5,
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: getHeaderColor(),
              color: 'white',
              border: 'none',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: `0 8px 15px -3px ${getHeaderColor()}40`,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default BeautifulConfirmModal;
