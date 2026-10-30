import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { MotionConfig } from 'framer-motion'
import '../assets/theme.css'
import '../assets/common.css'
import '../styles/index.css'

// Tự động xử lý khi chunk lazy-loaded bị lỗi do server vừa deploy phiên bản mới
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const reloadKey = 'sf_mobile_preload_auto_reload'
  const last = parseInt(sessionStorage.getItem(reloadKey) || '0', 10)
  const now = Date.now()
  if (now - last > 8000) {
    sessionStorage.setItem(reloadKey, now.toString())
    const url = new URL(window.location.href)
    url.searchParams.set('_v', now.toString())
    window.location.replace(url.toString())
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="always">
      <App />
    </MotionConfig>
  </React.StrictMode>,
)
