import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import net from 'net'

// Tự động kiểm tra xem Canvas Editor dev server (port 1000) có đang chạy không
let isCanvasEditorRunning = false;
const checkCanvasEditorPort = () => {
  const sock = new net.Socket();
  sock.setTimeout(350);
  sock.on('connect', () => {
    isCanvasEditorRunning = true;
    sock.destroy();
  });
  sock.on('error', () => {
    isCanvasEditorRunning = false;
    sock.destroy();
  });
  sock.on('timeout', () => {
    isCanvasEditorRunning = false;
    sock.destroy();
  });
  try {
    sock.connect(1000, '127.0.0.1');
  } catch (e) {
    isCanvasEditorRunning = false;
  }
};
setInterval(checkCanvasEditorPort, 2000);
checkCanvasEditorPort();

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
      '@/shared': path.resolve(__dirname, '../Claim/FrontEnd/src/shared'),
      '@hufe921/canvas-editor': 'C:/Tool/WS/canvas-editor/dist/canvas-editor.js',
      '@hufe921/canvas-editor-plugin-docx': 'C:/Tool/WS/canvas-editor/node_modules/@hufe921/canvas-editor-plugin-docx/dist/docx.js'
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    open: false,
    allowedHosts: true,
    watch: {
      usePolling: true,
      interval: 800
    },
    fs: {
      strict: false,
      allow: [
        path.resolve(__dirname, '..'),
        'C:/Tool/WS/canvas-editor'
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
      },
      '/canvas-editor': {
        target: 'http://127.0.0.1:1000',
        changeOrigin: true,
        ws: true,
        bypass: (req) => {
          if (!isCanvasEditorRunning) {
            // Dev server port 1000 không chạy -> Bỏ qua proxy để Vite tự phục vụ file tĩnh từ public/canvas-editor
            return req.url;
          }
        },
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (err && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
              try {
                if (res && typeof res.writeHead === 'function' && !res.headersSent) {
                  const urlPath = req.url ? req.url.split('?')[0] : '';
                  const relPath = urlPath.replace(/^\/canvas-editor\/?/, '');
                  const safeRelPath = relPath ? relPath.replace(/\.\./g, '') : 'index.html';
                  const filePath = path.resolve(__dirname, 'public/canvas-editor', safeRelPath);
                  const targetFile = (fs.existsSync(filePath) && fs.statSync(filePath).isFile())
                    ? filePath
                    : path.resolve(__dirname, 'public/canvas-editor/index.html');

                  if (fs.existsSync(targetFile)) {
                    const ext = path.extname(targetFile).toLowerCase();
                    const mimeTypes = {
                      '.html': 'text/html; charset=utf-8',
                      '.js': 'application/javascript; charset=utf-8',
                      '.css': 'text/css; charset=utf-8',
                      '.json': 'application/json; charset=utf-8',
                      '.png': 'image/png',
                      '.jpg': 'image/jpeg',
                      '.jpeg': 'image/jpeg',
                      '.svg': 'image/svg+xml',
                      '.ico': 'image/x-icon',
                      '.gz': 'application/gzip',
                      '.woff': 'font/woff',
                      '.woff2': 'font/woff2',
                      '.ttf': 'font/ttf'
                    };
                    const contentType = mimeTypes[ext] || 'application/octet-stream';
                    res.writeHead(200, { 'Content-Type': contentType });
                    fs.createReadStream(targetFile).pipe(res);
                    return;
                  }
                  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                  res.end('Canvas Editor static file not found');
                }
              } catch (fallbackErr) {
                console.error('[Canvas Editor Fallback Error]', fallbackErr);
                if (res && !res.headersSent) {
                  res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                  res.end('Canvas Editor Fallback Error');
                }
              }
            }
          });
        }
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
      },
      '/canvas-editor': {
        target: 'http://127.0.0.1:1000',
        changeOrigin: true,
        ws: true
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
