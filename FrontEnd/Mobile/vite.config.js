import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// Đọc version từ package.json để nhúng vào JS bundle lúc build
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@mobile': path.resolve(__dirname, '.'),
      '@modules/System': path.resolve(__dirname, '../Web/modules/System'),
      '@modules/system': path.resolve(__dirname, '../Web/modules/System'),
      '@modules/Inspection': path.resolve(__dirname, '../Web/modules/Inspection'),
      '@modules/KPI': path.resolve(__dirname, '../Web/modules/KPI'),
      '@modules': path.resolve(__dirname, './modules'),
      '@modules/auth': path.resolve(__dirname, './modules/auth'),
      '@modules/capa': path.resolve(__dirname, './modules/capa'),
      '@modules/delivery': path.resolve(__dirname, './modules/delivery'),
      '@modules/equipment': path.resolve(__dirname, './modules/equipment'),
      '@modules/inspection': path.resolve(__dirname, './modules/inspection'),
      '@modules/kpi': path.resolve(__dirname, './modules/kpi'),
      '@modules/notification': path.resolve(__dirname, './modules/notification'),
      '@modules/production': path.resolve(__dirname, './modules/production'),
      '@modules/production_v2': path.resolve(__dirname, './modules/production_v2'),
      '@modules/report': path.resolve(__dirname, './modules/report'),
      '@modules/warehouse': path.resolve(__dirname, './modules/warehouse'),
      'axios': path.resolve(__dirname, '../node_modules/axios'),
      '@capacitor/core': path.resolve(__dirname, '../node_modules/@capacitor/core'),
      '@capacitor/push-notifications': path.resolve(__dirname, '../node_modules/@capacitor/push-notifications'),
      'exceljs': path.resolve(__dirname, '../node_modules/exceljs'),
      '@webShared': path.resolve(__dirname, '../Web/Shared'),
      '@styles': path.resolve(__dirname, '../Web/Shared/styles'),
      '@webModules': path.resolve(__dirname, '../Web/modules'),
    },
  },
  server: {
    port: 3000,
    open: false,
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
    },
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '..')
      ]
    }
  },
  preview: {
    port: 3000,
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
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx') || id.includes('exceljs')) {
              return 'vendor-excel';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('html5-qrcode') || id.includes('qrcode.react')) {
              return 'vendor-qr';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  // Nhúng version vào bundle - đảm bảo luôn đồng bộ với package.json
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
