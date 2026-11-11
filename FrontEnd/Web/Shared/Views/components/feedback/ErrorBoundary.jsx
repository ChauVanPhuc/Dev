import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isReloading: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleHardReload = () => {
    try {
      this.setState({ isReloading: true });
      sessionStorage.clear();
      localStorage.removeItem('vite_cache_timestamp');
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
      }
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
    const targetUrl = window.location.origin + window.location.pathname + '?_v=' + Date.now();
    window.location.href = targetUrl;
  };

  handleGoHome = () => {
    window.location.href = window.location.origin + '/admin/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const msg = this.state.error?.message || String(this.state.error || '');
      const stack = this.state.error?.stack || '';
      const isChunkError = /import.*module.*script.*failed|failed.*dynamically.*imported.*module|loading.*chunk|_result\.default|reading ['"]default['"]|evaluating '.*\.default'/i.test(msg);

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#FAF7F2',
          color: '#4A240E',
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
          }}>
            <AlertTriangle size={32} color="#DC2626" />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#991B1B' }}>
            {isChunkError ? 'Hệ thống vừa cập nhật phiên bản mới' : 'Đã xảy ra lỗi khi tải giao diện'}
          </h2>

          <p style={{ fontSize: '13px', color: '#7B5233', margin: '0 0 14px 0', maxWidth: '420px', lineHeight: 1.5 }}>
            {isChunkError
              ? 'Ứng dụng đã có phiên bản cập nhật mới trên hệ thống. Vui lòng bấm nút bên dưới để đồng bộ dữ liệu mới nhất.'
              : 'Giao diện gặp sự cố hiển thị. Vui lòng bấm nút bên dưới để tải lại hoặc liên hệ IT.'}
          </p>

          {/* Technical error display */}
          {msg && (
            <div style={{
              margin: '0 0 16px 0',
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#991B1B',
              fontFamily: 'monospace',
              textAlign: 'left',
              maxWidth: '600px',
              width: '90%',
              wordBreak: 'break-all',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>{msg}</div>
              {stack && <div style={{ fontSize: '10px', color: '#7F1D1D', whiteSpace: 'pre-wrap' }}>{stack.slice(0, 500)}</div>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleHardReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#7B5233',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(123, 82, 51, 0.25)'
              }}
            >
              <RotateCcw size={16} />
              <span>{this.state.isReloading ? 'Đang chuyển trang...' : 'Tải lại trang'}</span>
            </button>

            <button
              type="button"
              onClick={this.handleGoHome}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#FFFFFF',
                color: '#7B5233',
                border: '1.5px solid #EADCC9',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Home size={16} />
              <span>Về Trang chủ</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

