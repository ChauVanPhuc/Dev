import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { MotionConfig } from 'framer-motion'
import '../assets/theme.css'
import '../assets/common.css'
import '../styles/index.css'

// Tự động xử lý khi chunk lazy-loaded bị lỗi do server vừa deploy phiên bản mới
window.addEventListener('vite:preloadError', () => {
  // KHÔNG gọi event.preventDefault() để tránh Vite nuốt lỗi trả về undefined khiến React.lazy crash
  const reloadKey = 'sf_mobile_preload_auto_reload'
  const last = parseInt(sessionStorage.getItem(reloadKey) || '0', 10)
  const now = Date.now()
  if (now - last > 6000) {
    sessionStorage.setItem(reloadKey, now.toString())
    const targetUrl = window.location.origin + window.location.pathname + '?_v=' + now
    window.location.href = targetUrl
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="always">
      <App />
    </MotionConfig>
  </React.StrictMode>,
)
