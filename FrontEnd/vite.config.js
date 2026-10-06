import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'axios', 'recharts', 'xlsx', 'zustand'],
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@web': path.resolve(__dirname, './Web'),
      '@mobile': path.resolve(__dirname, './Mobile'),
      '@webShared': path.resolve(__dirname, './Web/Shared'),
      '@styles': path.resolve(__dirname, './Web/Shared/styles'),
      '@assets': path.resolve(__dirname, './Web/Shared/assets'),
      '@modules': path.resolve(__dirname, './Web/modules'),
      '@modules/auth': path.resolve(__dirname, './Web/modules/Auth'),
      '@modules/capa': path.resolve(__dirname, './Web/modules/CAPA'),
      '@modules/dashboard': path.resolve(__dirname, './Web/modules/Dashboard'),
      '@modules/delivery': path.resolve(__dirname, './Web/modules/Delivery'),
      '@modules/equipment': path.resolve(__dirname, './Web/modules/Equipment'),
      '@modules/inspection': path.resolve(__dirname, './Web/modules/Inspection'),
      '@modules/kpi': path.resolve(__dirname, './Web/modules/KPI'),
      '@modules/notification': path.resolve(__dirname, './Web/modules/Notification'),
      '@modules/order': path.resolve(__dirname, './Web/modules/Order'),
      '@modules/pallet': path.resolve(__dirname, './Web/modules/Pallet'),
      '@modules/plan': path.resolve(__dirname, './Web/modules/Plan'),
      '@modules/product': path.resolve(__dirname, './Web/modules/Product'),
      '@modules/production': path.resolve(__dirname, './Web/modules/Production'),
      '@modules/Production': path.resolve(__dirname, './Web/modules/Production'),
      '@modules/report': path.resolve(__dirname, './Web/modules/Report'),
      '@modules/system': path.resolve(__dirname, './Web/modules/System'),
      '@lpn': path.resolve(__dirname, '../lpn_crawler/frontend'),
      '@ai-ocr': path.resolve(__dirname, '../lpn_crawler/ai_ocr_train/frontend'),
      '@dashboard': path.resolve(__dirname, '../dashboard/frontend'),
      '@claim': path.resolve(__dirname, '../Claim/FrontEnd/src/modules/claim'),
      '@price': path.resolve(__dirname, '../Claim/FrontEnd/src/modules/price'),
      '@defect': path.resolve(__dirname, '../Claim/FrontEnd/src/modules/defect'),
      '@/modules/claim': path.resolve(__dirname, '../Claim/FrontEnd/src/modules/claim'),
      '@/modules/price': path.resolve(__dirname, '../Claim/FrontEnd/src/modules/price'),
      '@/modules': path.resolve(__dirname, '../Claim/FrontEnd/src/modules'),
      '@/shared': path.resolve(__dirname, '../Claim/FrontEnd/src/shared')
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    open: false,
    allowedHosts: true,
    hmr: false,
    watch: null,
    fs: {
      strict: false,
      allow: [
        path.resolve(__dirname, '..')
      ]
    },
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
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/static': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx') || id.includes('exceljs')) {
              return 'vendor-excel';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
