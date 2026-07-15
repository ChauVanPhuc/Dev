import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { MotionConfig } from 'framer-motion'
import '../assets/theme.css'
import '../assets/common.css'
import '../styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="always">
      <App />
    </MotionConfig>
  </React.StrictMode>,
)
