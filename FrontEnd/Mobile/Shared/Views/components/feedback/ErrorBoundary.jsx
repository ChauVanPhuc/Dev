import React from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, isReloading: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleHardReload = () => {
    try {
      this.setState({ isReloading: true })
      // Dọn dẹp cờ cooldown để trang mới không bị chặn
      sessionStorage.clear()
      localStorage.removeItem('vite_cache_timestamp')

      // Dọn cache chạy ngầm (fire-and-forget), tuyệt đối KHÔNG await để tránh treo trên iOS Safari
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {})
      }
    } catch (e) {
      console.warn('Storage clear error:', e)
    }

    // Điều hướng cứng ngay lập tức bằng window.location.href kèm tham số thời gian mới
    const targetUrl = window.location.origin + window.location.pathname + '?_v=' + Date.now()
    window.location.href = targetUrl
  }

  handleGoToPallet = () => {
    try {
      sessionStorage.clear()
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {})
      }
    } catch (e) {}

    window.location.href = window.location.origin + '/pallet-check?_v=' + Date.now()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const msg = this.state.error?.message || String(this.state.error || '')
      const isChunkError = /import.*module.*script.*failed|failed.*dynamically.*imported.*module|loading.*chunk|_result\.default|reading ['"]default['"]|evaluating '.*\.default'/i.test(msg)

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
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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

          <p style={{ fontSize: '13px', color: '#7B5233', margin: '0 0 14px 0', maxWidth: '340px', lineHeight: 1.5 }}>
            {isChunkError
              ? 'Ứng dụng đã có phiên bản cập nhật mới trên hệ thống. Vui lòng bấm nút bên dưới để đồng bộ dữ liệu mới nhất.'
              : 'Hệ thống gặp sự cố khi tải trang. Vui lòng bấm nút bên dưới để tải lại.'}
          </p>

          {/* Hiển thị chi tiết lỗi kỹ thuật để chẩn đoán nhanh */}
          {msg && (
            <div style={{
              margin: '0 0 16px 0',
              padding: '8px 12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#991B1B',
              fontFamily: 'monospace',
              textAlign: 'left',
              maxWidth: '300px',
              wordBreak: 'break-all',
              maxHeight: '60px',
              overflowY: 'auto'
            }}>
              {msg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
            <button
              type="button"
              onClick={this.handleHardReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 18px',
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
              <span>{this.state.isReloading ? 'Đang chuyển trang...' : 'Cập nhật bản mới & Tải lại'}</span>
            </button>

            <button
              type="button"
              onClick={this.handleGoToPallet}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: '#FFFFFF',
                color: '#7B5233',
                border: '1.5px solid #EADCC9',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Home size={15} />
              <span>Về Kiểm tra Pallet</span>
            </button>
          </div>

          <p style={{ marginTop: '20px', fontSize: '11px', color: '#94A3B8', maxWidth: '300px', lineHeight: 1.4 }}>
            Mẹo: Nếu mở từ Màn hình chính (PWA), bạn cũng có thể vuốt tắt hẳn ứng dụng từ màn hình đa nhiệm rồi mở lại.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
