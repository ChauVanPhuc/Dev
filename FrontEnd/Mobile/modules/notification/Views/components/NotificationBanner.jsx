import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, ChevronRight } from 'lucide-react'
import useUiStore from '@shared/store/uiStore'

/**
 * NotificationBanner Component
 * Thanh thông báo nhỏ hiện lên ở đỉnh App khi có tin mới.
 */
const NotificationBanner = () => {
  const { showBanner, bannerMessage, setShowBanner, toggleNotification } = useUiStore()

  // Tự động đóng banner sau 6 giây bằng useEffect để tránh rò rỉ bộ nhớ và tranh chấp timeout
  useEffect(() => {
    let timer;
    if (showBanner) {
      timer = setTimeout(() => {
        setShowBanner(false)
      }, 6000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [showBanner])

  const handleAction = () => {
    setShowBanner(false)
    toggleNotification() // Mở sidebar thông báo
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 15, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: '10px',
            right: '10px',
            zIndex: 9999,
          }}
        >
          <div 
            onClick={handleAction}
            style={{
              background: 'linear-gradient(90deg, #78523b 0%, #a87b5c 100%)',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: '16px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}
          >
            <div style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              padding: '8px', 
              borderRadius: '12px' 
            }}>
              <Bell size={20} className="animate-push-notification" />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', opacity: 0.8, marginBottom: '2px', textTransform: 'uppercase' }}>
                Thông báo mới
              </div>
              <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: '500', lineHeight: '1.2' }}>
                {bannerMessage}
              </p>
            </div>

            <ChevronRight size={20} style={{ opacity: 0.6 }} />

            <button 
              onClick={(e) => {
                e.stopPropagation()
                setShowBanner(false)
              }}
              style={{ background: 'none', border: 'none', color: '#fff', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default NotificationBanner
