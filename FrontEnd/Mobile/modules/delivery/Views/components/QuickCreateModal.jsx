import { X } from 'lucide-react'

/**
 * QuickCreateModal Component
 * Modal dạng Bottom Sheet để tạo nhanh Kế hoạch bàn giao / Tiếp nhận.
 */
const QuickCreateModal = ({ onClose }) => {
  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center'
      }}
    >
      {/* Background overlay mờ */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          transition: 'opacity 0.3s'
        }}
      />
      
      {/* Modal Content (nhô lên từ dưới) */}
      <div 
        style={{
          position: 'relative',
          backgroundColor: '#fff',
          width: '100%',
          maxWidth: '500px',
          maxHeight: 'calc(100dvh - 32px)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          padding: '24px 20px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}} />

        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
            Tạo mới nhanh
          </h3>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              display: 'flex', padding: '6px', borderRadius: '50%', backgroundColor: '#f1f5f9' 
            }}
          >
            <X size={20} color="#64748b" strokeWidth={2.5} />
          </button>
        </div>

        {/* Nội dung form (Ví dụ) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Loại phiếu</label>
            <select style={{ 
              padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', 
              fontSize: '1rem', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '500' 
            }}>
              <option value="handover">Phiếu bàn giao</option>
              <option value="receive">Phiếu tiếp nhận</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Mã đơn hàng liên quan</label>
            <input 
              type="text" 
              placeholder="VD: DH-2026-..." 
              style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: '500' }} 
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Ghi chú thêm</label>
            <textarea 
              rows={3} 
              placeholder="Nhập nội dung..." 
              style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', fontFamily: 'inherit', resize: 'none' }} 
            />
          </div>
        </div>

        {/* Nút tác vụ */}
        <button 
          onClick={onClose}
          style={{
            marginTop: '10px',
            backgroundColor: 'var(--primary-color)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(160, 28, 28, 0.3)'
          }}
        >
          Xác nhận tạo
        </button>
      </div>
    </div>
  )
}

export default QuickCreateModal
