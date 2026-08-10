import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// Đọc version từ package.json để nhúng vào JS bundle lúc build
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@mobile': path.resolve(__dirname, '.'),
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
      'axios': path.resolve(__dirname, '../node_modules/axios'),
      'zustand': path.resolve(__dirname, '../node_modules/zustand'),
      '@capacitor/core': path.resolve(__dirname, '../node_modules/@capacitor/core'),
      '@capacitor/push-notifications': path.resolve(__dirname, '../node_modules/@capacitor/push-notifications'),
    },
  },
  server: {
    port: 3000,
    open: false,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8000',
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
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {}
    }
  },
  // Nhúng version vào bundle - đảm bảo luôn đồng bộ với package.json
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
