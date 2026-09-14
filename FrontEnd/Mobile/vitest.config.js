import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './app/setupTests.js',
    include: [
      '**/*.{test,spec}.{js,jsx}',
      '__tests__/**/*.{test,spec}.{js,jsx}'
    ],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@mobile': path.resolve(__dirname, '.'),
      '@tests': path.resolve(__dirname, '../tests'),
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
    },
  },
})

