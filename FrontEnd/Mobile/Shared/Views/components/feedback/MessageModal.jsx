import React from 'react'
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'

/**
 * MessageModal Component
 * Thay thế cho alert() truyền thống, mang lại vẻ ngoài cao cấp (Premium UI).
 * Hỗ trợ các loại: success, error, warning, info.
 */
const MessageModal = ({ isOpen, type = 'info', title, message, onConfirm }) => {
  if (!isOpen) return null

  // Cấu hình theo từng loại thông báo
  const configs = {
    success: {
      icon: <CheckCircle2 size={40} color="#10b981" />,
      bgColor: '#f0fdf4',
      primaryColor: '#10b981'
    },
    error: {
      icon: <XCircle size={40} color="#ef4444" />,
      bgColor: '#fef2f2',
      primaryColor: '#ef4444'
    },
    warning: {
      icon: <AlertCircle size={40} color="#f59e0b" />,
      bgColor: '#fffbeb',
      primaryColor: '#f59e0b'
    },
    info: {
      icon: <Info size={40} color="#3b82f6" />,
      bgColor: '#eff6ff',
      primaryColor: '#3b82f6'
    }
  }

  const activeConfig = configs[type] || configs.info

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000, // Cao nhất
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      {/* Backdrop */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(10px)'
        }}
        onClick={onConfirm}
      />
      
      {/* Content */}
      <div 
        style={{
          position: 'relative',
          backgroundColor: '#fff',
          width: '100%',
          maxWidth: '320px',
          borderRadius: '30px',
          padding: '30px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'modalShow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes modalShow {
            from { transform: scale(0.8) translateY(20px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
        `}} />

        {/* Icon Container with subtle glow */}
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', backgroundColor: activeConfig.bgColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
          boxShadow: `0 10px 20px ${activeConfig.primaryColor}20`
        }}>
          {activeConfig.icon}
        </div>

        <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>
          {title}
        </h3>
        
        <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.6', marginBottom: '28px' }}>
          {message}
        </p>

        {/* Action Button */}
        <button 
          onClick={onConfirm}
          style={{
            width: '100%',
            backgroundColor: activeConfig.primaryColor,
            color: '#fff',
            border: 'none',
            borderRadius: '16px',
            padding: '14px',
            fontSize: '1rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: `0 8px 15px ${activeConfig.primaryColor}40`,
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          Đã hiểu
        </button>
      </div>
    </div>
  )
}

export default MessageModal
