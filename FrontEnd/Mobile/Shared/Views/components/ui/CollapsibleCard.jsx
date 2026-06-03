import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

/**
 * CollapsibleCard Component
 * Thẻ nội dung có thể đóng/mở, tích hợp thanh tiến độ ở tiêu đề.
 */
const CollapsibleCard = ({ title, progress, children, defaultOpen = false, extra, stickyHeader = false, stickyTopOffset = 0 }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Cập nhật trạng thái khi prop defaultOpen thay đổi từ bên ngoài
  useEffect(() => {
    setIsOpen(defaultOpen)
  }, [defaultOpen])

  return (
    <div 
      style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: isOpen ? '0 10px 15px -3px rgba(0, 0, 0, 0.05)' : '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
        marginBottom: '8px',
        border: '1px solid #f3f4f6',
        transition: 'boxShadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), backgroundColor 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Header của thẻ - Chứa Title, Progress và Nút đóng/mở */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '18px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '15px',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isOpen ? '#fcfaf9' : '#fff',
          position: stickyHeader ? 'sticky' : 'relative',
          top: stickyHeader ? stickyTopOffset : undefined,
          zIndex: stickyHeader ? 20 : 1,
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          borderBottomLeftRadius: isOpen ? '0px' : '16px',
          borderBottomRightRadius: isOpen ? '0px' : '16px',
          boxShadow: (stickyHeader && isOpen) ? '0 4px 6px -4px rgba(0,0,0,0.05)' : 'none'
        }}
      >
        <span style={{ 
          fontSize: '1rem', 
          fontWeight: '900', 
          color: '#1f2937', 
          whiteSpace: 'nowrap',
          zIndex: 1
        }}>
          {title}
        </span>

        {extra && (
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.9rem',
            color: '#7c5438',
            fontWeight: '800',
            backgroundColor: '#fdf3ea',
            padding: '4px 14px',
            borderRadius: '10px',
            border: '1px solid #f9dcc5',
            boxShadow: '0 2px 4px rgba(124, 84, 56, 0.05)',
            whiteSpace: 'nowrap'
          }}>
            {extra}
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', zIndex: 1 }}>
          {/* Thanh trạng thái tiến độ (Chỉ hiện khi có truyền prop progress) */}
          {progress !== undefined && (
            <div style={{ display: 'flex', width: '120px', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  height: '100%', 
                  width: `${Math.min(100, Math.max(0, progress))}%`, 
                  backgroundColor: progress >= 100 ? 'var(--status-success)' : 'var(--accent-color)',
                  borderRadius: '3px',
                  transition: 'width 0.5s ease'
                }} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: progress >= 100 ? '#22c55e' : '#64748b' }}>
                {Math.round(progress)}%
              </span>
            </div>
          )}
          
          <div style={{ color: isOpen ? 'var(--primary-color)' : '#9ca3af', display: 'flex' }}>
            {isOpen ? <ChevronUp size={22} strokeWidth={3} /> : <ChevronDown size={22} strokeWidth={3} />}
          </div>
        </div>
      </div>

      {/* Nội dung bên trong khi mở rộng */}
      {isOpen && (
        <div 
          style={{ 
            padding: '4px 12px 16px 12px',
            borderTop: '1px solid #f3f4f6',
            backgroundColor: '#ffffff',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px'
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default CollapsibleCard
