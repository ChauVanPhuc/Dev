import React from 'react'
import { AlertTriangle, RotateCcw, Home, RefreshCw } from 'lucide-react'

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

    // Tự động nhận diện lỗi chunk/module import thất bại do phiên bản mới được deploy
    const msg = error?.message || ''
    const isChunkError = /import.*module.*script.*failed|failed.*dynamically.*imported.*module|loading.*chunk/i.test(msg)
    
    if (isChunkError) {
      const reloadKey = 'sf_mobile_chunk_auto_reload'
      const last = parseInt(sessionStorage.getItem(reloadKey) || '0', 10)
      const now = Date.now()
      // Nếu chưa tự động reload trong 10 giây qua, tự kích hoạt tải lại với cache-busting
      if (now - last > 10000) {
        sessionStorage.setItem(reloadKey, now.toString())
        this.setState({ isReloading: true })
        setTimeout(() => {
          this.handleHardReload()
        }, 300)
      }
    }
  }

  handleHardReload = () => {
    try {
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(key => caches.delete(key)))
      }
      localStorage.removeItem('vite_cache_timestamp')
    } catch (e) {
      console.warn('Cache clear error:', e)
    }

    const url = new URL(window.location.href)
    url.searchParams.set('_v', Date.now().toString())
    window.location.replace(url.toString())
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const msg = this.state.error?.message || ''
      const isChunkError = /import.*module.*script.*failed|failed.*dynamically.*imported.*module|loading.*chunk/i.test(msg)

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

          <p style={{ fontSize: '13px', color: '#7B5233', margin: '0 0 20px 0', maxWidth: '340px', lineHeight: 1.5 }}>
            {isChunkError
              ? 'Ứng dụng đã có phiên bản cập nhật trên máy chủ hoặc đường truyền 4G bị gián đoạn khi tải tài nguyên. Vui lòng bấm nút bên dưới để đồng bộ bản mới nhất.'
              : (msg || 'Hệ thống gặp sự cố không mong muốn. Vui lòng tải lại trang hoặc kiểm tra kết nối mạng.')}
          </p>

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
              <span>{this.state.isReloading ? 'Đang cập nhật...' : 'Cập nhật bản mới & Tải lại'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.origin + '/pallet-check')
                url.searchParams.set('_v', Date.now().toString())
                window.location.replace(url.toString())
              }}
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

          {isChunkError && (
            <p style={{ marginTop: '20px', fontSize: '11px', color: '#94A3B8', maxWidth: '300px', lineHeight: 1.4 }}>
              Mẹo: Nếu bạn đang mở từ ứng dụng Màn hình chính (PWA), hãy vuốt tắt hẳn ứng dụng từ màn hình đa nhiệm rồi mở lại.
            </p>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
