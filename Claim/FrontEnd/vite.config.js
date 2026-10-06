import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, './node_modules/react-router-dom'),
      'lucide-react': path.resolve(__dirname, './node_modules/lucide-react'),
      'axios': path.resolve(__dirname, './node_modules/axios'),
      'recharts': path.resolve(__dirname, './node_modules/recharts'),
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@styles': path.resolve(__dirname, './src/shared/styles'),
      '@assets': path.resolve(__dirname, './src/shared/assets'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@lpn': path.resolve(__dirname, '../../lpn_crawler/frontend'),
      '@ai-ocr': path.resolve(__dirname, '../../lpn_crawler/ai_ocr_train/frontend'),
      '@dashboard': path.resolve(__dirname, '../../dashboard/frontend')
    }
  },
  server: {
    host: "0.0.0.0",
    port: 2222,
    open: false,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (err && err.code === 'ECONNREFUSED') {
              if (res && typeof res.writeHead === 'function' && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  error: 'Backend Starting Up',
                  message: 'Máy chủ Backend đang khởi động hoặc chưa sẵn sàng. Vui lòng thử lại sau vài giây.'
                }));
              }
            }
          });
        }
      },
      '/static': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (err && err.code === 'ECONNREFUSED') {
              if (res && typeof res.writeHead === 'function' && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'text/plain' });
                res.end('Backend server is starting up.');
              }
            }
          });
        }
      }
    }
  }
})
