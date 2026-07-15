import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@styles/style.css'
import '@styles/components.css'
import '@styles/index.css'
import App from './App.jsx'
import { MotionConfig } from 'framer-motion'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="always">
      <App />
    </MotionConfig>
  </StrictMode>,
)
