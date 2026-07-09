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
    },
  },
})
