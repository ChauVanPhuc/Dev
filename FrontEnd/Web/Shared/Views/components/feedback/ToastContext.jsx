import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    const fallback = (type, message) => console.log(`[Toast ${type}]: ${message}`);
    fallback.success = (msg) => console.log(`[Toast success]: ${msg}`);
    fallback.error = (msg) => console.log(`[Toast error]: ${msg}`);
    fallback.warning = (msg) => console.log(`[Toast warning]: ${msg}`);
    fallback.info = (msg) => console.log(`[Toast info]: ${msg}`);
    return { toast: fallback };
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type, message) => {
    let actualType = type;
    let actualMsg = message;
    if (message === undefined) {
      actualType = 'info';
      actualMsg = type;
    }
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, type: actualType, message: actualMsg }]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);
    return id;
  }, [removeToast]);

  showToast.success = useCallback((msg) => showToast('success', msg), [showToast]);
  showToast.error = useCallback((msg) => showToast('error', msg), [showToast]);
  showToast.warning = useCallback((msg) => showToast('warning', msg), [showToast]);
  showToast.info = useCallback((msg) => showToast('info', msg), [showToast]);

  // Toast icons mapping
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="#166534" />;
      case 'error':
        return <AlertCircle size={18} color="#991b1b" />;
      case 'warning':
        return <AlertTriangle size={18} color="#92400e" />;
      case 'info':
      default:
        return <Info size={18} color="#1e40af" />;
    }
  };

  // Toast styles mapping
  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          color: '#166534',
        };
      case 'error':
        return {
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
        };
      case 'warning':
        return {
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#92400e',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#eff6ff',
          border: '1px solid #93c5fd',
          color: '#1e40af',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ toast: showToast }}>
      {children}
      {/* Toast container: Fixed at bottom center */}
      <div
        style={{
          position: 'fixed',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none', // Allow clicking through the container empty space
          alignItems: 'center',
        }}
      >
        {toasts.map((t) => {
          const styles = getToastStyles(t.type);
          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto', // Re-enable clicks on toast card
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '9999px', // Rounded pill style as requested
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                minWidth: '280px',
                maxWidth: '480px',
                animation: 'toastFadeIn 0.3s ease-out forwards',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                fontWeight: '500',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease-in-out',
                ...styles,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getIcon(t.type)}
                <span>{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.6,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
              >
                <X size={14} color="currentColor" />
              </button>
            </div>
          );
        })}
      </div>
      {/* Dynamic Keyframes Injection */}
      <style>{`
        @keyframes toastFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
