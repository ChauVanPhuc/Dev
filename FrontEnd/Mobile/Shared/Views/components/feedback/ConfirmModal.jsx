import React from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'

/**
 * ConfirmModal Component
 * Dùng để xác nhận hành động quan trọng (Xác nhận tạo phiếu).
 */
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Xác nhận', cancelText = 'Hủy' }) => {
  if (!isOpen) return null

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      {/* Overlay mờ */}
      <div 
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)'
        }}
      />
      
      {/* Nội dung Modal (Căn giữa màn hình) */}
      <div 
        style={{
          position: 'relative',
          backgroundColor: '#fff',
          width: '100%',
          maxWidth: '350px',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          textAlign: 'center',
          animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes popIn {
            from { transform: scale(0.85); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}} />

        {/* Icon cảnh báo */}
        <div style={{ 
          width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#fff7ed', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' 
        }}>
          <AlertTriangle size={30} color="#f97316" />
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
          {title}
        </h3>
        
        <div style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.5', marginBottom: '24px' }}>
          {message}
        </div>

        {/* Nút tác vụ */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', 
              backgroundColor: '#fff', color: '#64748b', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: '14px', border: 'none', 
              backgroundColor: 'var(--primary-color, #2b1810)', color: '#fff', fontWeight: '700', fontSize: '0.9rem', 
              cursor: 'pointer', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
