import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
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
      '@modules/system': path.resolve(__dirname, './Web/modules/System')
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    open: false,
    allowedHosts: true,
    watch: {
      usePolling: true
    },
    proxy: {
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8000',
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
