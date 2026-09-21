import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type = 'info', message = '', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((type, message, duration) => {
    addToast(type, message, duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 420
      }}>
        {toasts.map(t => {
          let bg = '#FFFFFF';
          let border = '#E2D7CF';
          let textColor = '#2C1810';
          let IconComponent = Info;
          let iconColor = '#3B82F6';

          if (t.type === 'success') {
            bg = '#ECFDF5';
            border = '#A7F3D0';
            textColor = '#065F46';
            IconComponent = CheckCircle2;
            iconColor = '#10B981';
          } else if (t.type === 'warning') {
            bg = '#FFFBEB';
            border = '#FDE68A';
            textColor = '#92400E';
            IconComponent = AlertTriangle;
            iconColor = '#F59E0B';
          } else if (t.type === 'error') {
            bg = '#FEF2F2';
            border = '#FCA5A5';
            textColor = '#991B1B';
            IconComponent = XCircle;
            iconColor = '#EF4444';
          }

          return (
            <div
              key={t.id}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                color: textColor,
                fontSize: '0.88rem',
                fontWeight: 500,
                animation: 'toastIn 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconComponent size={20} color={iconColor} style={{ flexShrink: 0 }} />
                <span>{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                style={{ color: textColor, opacity: 0.6, padding: 2 }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { toast: (type, msg) => console.log(`[Toast ${type}] ${msg}`) };
  }
  return ctx;
};
